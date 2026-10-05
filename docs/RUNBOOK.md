# OneQ — Runbook (build, backend, release)

This is the operational companion to `ARCHITECTURE.md`. Everything below was exercised on the development machine
(Windows 11, Node 24, Java 17, Android SDK, Expo SDK 57 dev client).

## 1. Data modes

| Mode | When | How |
| --- | --- | --- |
| `mock` | default while `amplify_outputs.json` is absent | seeded Doha data, persisted in AsyncStorage, OTP `123456`, demo accounts below |
| `amplify` | `amplify_outputs.json` exists (after `npx ampx sandbox`) or `EXPO_PUBLIC_DATA_MODE=amplify` | Cognito + AppSync + S3 through `src/data/amplify` |

Force a mode with `EXPO_PUBLIC_DATA_MODE=mock|amplify` in `.env` (see `.env.example`).

Demo accounts (mock mode): admin `+97450000001` / `admin@oneq.qa`, company owner `+97450000002`, customer `+97450000003` /
`noura@oneq.qa`; password `OneQ@2026`; OTP `123456`.

## 2. Local run (Android dev client)

```powershell
npm install --legacy-peer-deps
npx expo start                                  # Metro (keep CI unset: CI=1 disables file watching)
cd android; .\gradlew.bat assembleDebug -PreactNativeArchitectures=x86_64; cd ..   # emulator build (90 MB)
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d "oneq://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

Checks before every commit: `npx tsc --noEmit`, `npx expo lint`, `npx tsc -p amplify/tsconfig.json --noEmit`.

### Emulator: route Metro through `adb reverse`, not the NAT

On a stock emulator React Native defaults the dev-server host to `10.0.2.2:8081` (the emulator NAT alias) even when
the dev client was opened with a `127.0.0.1` URL. On this Windows host that NAT path silently corrupts large
responses — single bytes vanish at TCP segment boundaries once the dev bundle passes ~15 MB (the amplify-mode bundle
is ~15.7 MB) — and the dev client fails with `ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd`
on a black screen. Run `powershell -File scripts/emulator-metro-host.ps1` once per install: it sets `adb reverse`
and writes RN's `debug_http_host` preference (`127.0.0.1:8081`) into the app, after which bundles load through adb.
The preference survives `adb install -r`; a full uninstall clears it.

### Metro on Windows

- There is no native recursive watcher on Windows (Metro's `NativeWatcher` is macOS-only) and no Watchman, so Metro
  walks every directory on start. `metro.config.js` blocks `.amplify/`, `android/`, `ios/`, `scripts/`, `docs/` and
  `.expo/` (directory patterns, so the walker never descends); do not add large generated folders elsewhere in the
  project root. A start that logs `Failed to construct transformer: Error: Failed to start watch mode.` hit the
  240 s watcher limit — restart Metro when the machine is idle.
- `EXPO_PUBLIC_*` values come from the Metro **process environment** as well as `.env`. A shell that once exported
  `EXPO_PUBLIC_DATA_MODE=mock` bakes mock mode into every bundle it starts; the active mode is shown in
  Profile → Settings (data mode row).

### Google Maps on Android

The Android Maps SDK aborts the whole app when the manifest has no API key, so `app.config.js` always injects one
(`GOOGLE_MAPS_ANDROID_API_KEY` from `.env`, or the placeholder `MISSING_GOOGLE_MAPS_KEY`). With the placeholder the map
view renders but Google refuses to draw tiles, so the map tab and the company location picker stay blank: set a real key
(Maps SDK for Android enabled, restricted to `com.mastajazz.oneQapp` + the debug and Play SHA-1 fingerprints) and run
`npx expo prebuild --platform android` + a rebuild. iOS uses Apple Maps and needs no key.

## 3. Backend (Amplify Gen 2)

### 3.1 First deployment (personal sandbox)

```powershell
aws sso login --profile default                 # account 115246381405, region ap-south-1
npx ampx sandbox --once --profile default       # ~10 min the first time (CDK bootstrap + all stacks)
npx ampx sandbox seed --profile default         # admin account + categories (see amplify/seed/seed.ts)
```

`amplify_outputs.json` lands in the project root (git-ignored) and switches the app to amplify mode on the next Metro
bundle. Use `npx ampx sandbox --profile default` (without `--once`) while developing the backend: it watches `amplify/`
and hot-swaps Lambdas.

End-to-end check of the deployed API (creates/reset test users without SMS, books, completes, rates, gifts):
`AWS_PROFILE=default npx tsx scripts/smoke-backend.mts`.

Seed script variables: `SEED_ADMIN_EMAIL` (default `admin@oneq.qa`), `SEED_ADMIN_PASSWORD` (default `OneQ@2026`),
`SEED_COMPANY_OWNER_PHONE=+974XXXXXXXX` creates a demo company whose owner signs in with SMS OTP.

### 3.2 What is deployed

- **Auth** (`amplify/auth`): one user pool. Customers = phone + SMS OTP (passwordless, self sign-up). Company owners =
  created by an admin from the app (`adminCreateCompany` → Cognito user, group `COMPANIES`, permanent random password,
  phone verified → they sign in with SMS OTP). Admins = email + password in group `ADMINS` (seed script or Cognito
  console). The `postConfirmation` trigger adds self-signed-up users to `CUSTOMERS`, creates their profile + loyalty
  account (50 welcome points) and delivers WhatsApp gifts that were waiting for that phone number.
- **Data** (`amplify/data/resource.ts`): models mirroring `src/domain/types.ts`. Catalogue is public (guest + signed in),
  owners edit their own rows (`owner` = Cognito sub), admins can do everything. Money/points/notification logic lives in
  Lambda-backed operations: `placeBooking`, `updateBookingStatus`, `cancelSubscription`, `rateBooking`, `replyReview`,
  `listTimeSlots`, `lookupRecipient`, `sendGift`, `claimGift`, `adminCreateCompany`, `broadcastNotification`.
- **Functions**: `bookings`, `gifts`, `admin`, `post-confirmation`, `catalog-stream` (DynamoDB streams of Service /
  Product / Staff / Company → admin activity feed + customer notifications for new services, products and offers) and
  `expire-subscriptions` (daily). Push notifications go through the Expo Push API from `functions/shared/notify.ts`.
- **Storage**: bucket `oneqMedia`, everything under `public/`. Records store the S3 key; the app signs URLs on read
  (1 h) or prefixes `EXPO_PUBLIC_MEDIA_BASE_URL` when a CloudFront distribution is placed in front of the bucket.

### 3.3 SMS, WhatsApp, push, email

- **SMS (Cognito → SNS)**: new AWS accounts are in the SNS SMS sandbox — only verified destination numbers receive codes.
  Add test numbers in *SNS → Text messaging → Sandbox destination phone numbers*, then request production access and an
  origination identity for Qatar before launch.
- **WhatsApp gifts**: the `gifts` function reads `/oneq/whatsapp/token`, `/oneq/whatsapp/phoneId` and (optional)
  `/oneq/whatsapp/template` from SSM Parameter Store (`aws ssm put-parameter --name /oneq/whatsapp/token --type SecureString --value ...`).
  The approved Meta template (`oneq_gift`, Arabic + English) takes four body parameters: sender, item, message, link.
  Without the parameters the app falls back to opening WhatsApp with a prefilled message (`wa.me` link).
- **Push**: tokens are registered in `PushToken`; sending uses `https://exp.host/--/api/v2/push/send`. Set
  `EAS_PROJECT_ID` in `.env` (from `npx eas-cli init`) and upload the FCM V1 service account with `eas credentials`.
- **Email**: Cognito's default sender works for the sandbox; configure SES (`senders.email` in `amplify/auth/resource.ts`)
  after SES production access.

### 3.4 Production

```powershell
npx ampx pipeline-deploy --branch main --app-id <AMPLIFY_APP_ID>   # from Amplify Hosting CI, or:
npx ampx generate outputs --branch main --app-id <AMPLIFY_APP_ID>  # fetch outputs for a release build
```

Cognito sign-in options are immutable: never change `loginWith` on a live pool (the sandbox would recreate it and drop
every user). GSI changes recreate tables in the sandbox — seed again afterwards. `backend.ts` pins the user-pool
attribute schema with explicit `attributeDataType`s: without them CloudFormation fails every later user-pool update
with "Invalid AttributeDataType input" (hit once during development; the sandbox was recreated).

## 4. Release builds

```powershell
npx eas-cli build --platform android --profile production   # or: cd android; .\gradlew.bat bundleRelease
npx eas-cli build --platform ios --profile production
```

Keep `amplify_outputs.json`, `GOOGLE_MAPS_ANDROID_API_KEY` and `EAS_PROJECT_ID` available to the build (EAS environment
variables or a non-ignored `.easignore`).

## 5. Known limits / hardening backlog

- Company owners can create catalogue rows for any `companyId` (owner rule only checks the row owner). Move
  service/product/staff writes behind a Lambda or add a `companyOwner` check before opening self-service sign-up to
  arbitrary companies.
- Broadcast and catalogue notifications fan out synchronously inside one Lambda; move to SQS when the customer base
  grows beyond a few thousand accounts.
- Analytics are computed client-side from bookings (fine for hundreds of bookings per company; add an aggregation
  table later).
- Payments are recorded as `PAID` / `ON_ARRIVAL` without a gateway; integrate a PSP in `placeBooking` when ready.
