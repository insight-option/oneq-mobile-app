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

### First-launch direction (native RTL)

React Native stores the layout direction natively and applies a change only on the next process start, so an
Arabic-first app would render its very first launch left-to-right. `plugins/withNativeRtl.js` (registered in
`app.json`) enables RTL in `MainApplication.kt` / `AppDelegate.swift` before React starts — only while no preference
has been persisted yet — so the language switch in the app keeps control afterwards. Re-run `npx expo prebuild` after
changing it; verified by `adb shell pm clear com.mastajazz.oneQapp` + a fresh launch of the release APK.

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
  Exact steps: AWS console → **Amazon SNS** → *Text messaging (SMS)* → **Sandbox destination phone numbers** → *Add
  phone number* → enter the number in E.164 (`+974XXXXXXXX`), language *English* → *Add phone number* → type the
  verification code that arrives by SMS → status *Verified*. Do this in the region the user pool sends SMS from
  (Cognito → user pool → *Messaging* → *SMS* → "SNS region"; ap-south-1 here). Also raise *Text messaging → Account
  spend limit* above the default 1 USD/month when testing more than a handful of codes. Before launch, request
  production access (*Exit SMS sandbox*) and an origination identity for Qatar.
  Then: a customer simply signs in with that number in the app (self sign-up + 6-digit code); an admin with a phone
  number is created with `SEED_ADMIN_PHONE=+974XXXXXXXX npx tsx scripts/seed-env.mts` (verified phone, group ADMINS,
  signs in with the code) — or manually in Cognito: *Users → Create user*, phone number, "Mark phone number as
  verified", no invitation, then *Groups → ADMINS → Add user*, then `aws cognito-idp admin-set-user-password
  --permanent` so the account is CONFIRMED.
- **WhatsApp gifts**: the `gifts` function reads `/oneq/whatsapp/token`, `/oneq/whatsapp/phoneId` and (optional)
  `/oneq/whatsapp/template` from SSM Parameter Store (`aws ssm put-parameter --name /oneq/whatsapp/token --type SecureString --value ...`).
  The approved Meta template (`oneq_gift`, Arabic + English) takes four body parameters: sender, item, message, link.
  Without the parameters the app falls back to opening WhatsApp with a prefilled message (`wa.me` link).
- **Push**: tokens are registered in `PushToken`; sending uses `https://exp.host/--/api/v2/push/send`. Set
  `EAS_PROJECT_ID` in `.env` (from `npx eas-cli init`) and upload the FCM V1 service account with `eas credentials`.
- **Email**: Cognito's default sender works for the sandbox; configure SES (`senders.email` in `amplify/auth/resource.ts`)
  after SES production access (the default sender is capped at 50 e-mails/day).
- **Company invitations**: an owner created with an e-mail receives Cognito's invitation (template in
  `amplify/backend.ts`: username = phone number, temporary password valid 30 days). The admin function must pass a
  `TemporaryPassword`: in this pool (OTP sign-in enabled) `AdminCreateUser` without one creates a CONFIRMED user with
  no password and the e-mail shows a literal `{####}`. The owner signs in on the password screen with the **phone
  number** (Cognito only accepts the attribute a user was created with as sign-in name; the verified e-mail is not an
  alias) and the temporary password, then sets a permanent one. Lost e-mail, expired password or an owner created
  before this fix: admin workspace → company → *Resend invitation* (`adminResendInvitation`: fresh temporary password;
  for an owner who already set a password it works as an admin-side reset). The owner e-mail can be corrected in the
  company edit form before resending.

### 3.4 Production (Amplify Hosting, fullstack branch deployment)

The GitHub repo `insight-option/oneq-mobile-app` is connected to the Amplify app `oneq-mobile-app`
(app id `d3rw7vgtsyn0ne`, account `982468346762`, region ap-south-1, domain `oneq.qa`). Every push to `main` runs
`amplify.yml`:

- **backend** phase: `npm install --legacy-peer-deps` (deliberately not `npm ci`: `legacy-peer-deps=true` in
  `.npmrc` keeps peer dependencies such as `@aws-sdk/client-dynamodb` out of the lock, and npm repeatedly dropped
  the nested exact-pinned `@opentelemetry/*@2.0.0` entries under `@aws-amplify/data-construct` whenever a plain
  `npm install` ran against a node_modules tree that lacked them — `npm ci` then refuses with "Missing … from lock
  file" while `npm install` just repairs it). Keep the lock healthy anyway: after any `npm install` /
  `npx expo install`, run `npm run lock:check`; `npm install --package-lock-only --legacy-peer-deps` fixes a drifted
  lock. Then
  `npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID`. The app's service role must carry the
  `AmplifyBackendDeployFullAccess` policy (Amplify console → App settings → IAM roles); the first build also
  bootstraps CDK in the account.
- **frontend** phase: `npx expo export --platform web` — the same app compiled for the browser (Expo Router,
  `web.output: single`) and served on `oneq.qa`, baked with the branch's `amplify_outputs.json`. Because it is a
  single-page app, the hosting app needs one rewrite rule (Amplify console → Hosting → Rewrites and redirects):
  source `</^[^.]+$|\.(?!(css|gif|ico|jpg|jpeg|js|json|png|svg|txt|ttf|woff|woff2|map|webp)$)([^.]+$)/>`,
  target `/index.html`, type `200 (Rewrite)` — otherwise deep links such as `/company/<id>` return 404 on reload.

### 3.5 Web build notes

The browser build renders the phone layout in a centred 480 px column (`src/app/_layout.tsx`, `src/lib/layout.ts`).
Platform-specific files replace the native-only modules: `MapScreen.web.tsx` and `LocationPicker.web.tsx` use an
OpenStreetMap embed instead of react-native-maps, `notifications.web.ts` turns push into no-ops (in-app notifications
still arrive through the API subscriptions). RTL on web comes from `src/lib/rtl.ts` (react-native-web's I18nManager is
a stub): the persisted language sets `<html dir>` plus the root `View`'s `dir`, and switching the language reloads the
page. Brand fonts are loaded through `src/lib/webFonts.ts` (the expo-font plugin only embeds them natively).
Local check: `npx expo export --platform web --output-dir dist` then serve `dist/` (or `npx expo start --web`).

The branch backend can also be deployed from a developer machine (same operation the pipeline runs), which writes the
**production** `amplify_outputs.json` into the project root:

```powershell
$env:CI='1'; $env:AWS_PROFILE='oneq'; npx ampx pipeline-deploy --branch main --app-id d3rw7vgtsyn0ne
```

After the first successful build, from a machine with credentials for the **production** account:

```powershell
npx ampx generate outputs --branch main --app-id d3rw7vgtsyn0ne --profile <prod-profile>   # writes amplify_outputs.json
$env:SEED_ADMIN_PASSWORD = '<strong password>'; $env:AWS_PROFILE = '<prod-profile>'
npx tsx scripts/seed-env.mts                                                               # admin (group ADMINS) + categories
```

`scripts/seed-env.mts` is the branch equivalent of `npx ampx sandbox seed` (which only targets sandboxes): it creates
the admin through the Cognito admin API (no e-mail is sent), signs in as the admin and inserts the categories from
`src/data/mock/seed/categories.ts` (idempotent, matched by slug). Companies are then created from the admin
workspace. Release builds (§4) must use the `amplify_outputs.json` generated from the branch, not the sandbox one.

Cognito sign-in options are immutable: never change `loginWith` on a live pool (the sandbox would recreate it and drop
every user). GSI changes recreate tables in the sandbox — seed again afterwards. `backend.ts` pins the user-pool
attribute schema with explicit `attributeDataType`s: without them CloudFormation fails every later user-pool update
with "Invalid AttributeDataType input" (hit once during development; the sandbox was recreated).

## 4. Release builds (EAS)

`eas.json` defines three profiles: `development` (dev client APK), `preview` (installable APK, internal distribution)
and `production` (Play Store AAB, auto-incremented version). The Expo project id lives in `app.json`
(`extra.eas.projectId`); log in with the Expo account that owns that project first (`npx eas-cli@latest login`, or set
`EXPO_TOKEN` from expo.dev → Account settings → Access tokens for non-interactive use).

```powershell
npx eas-cli@latest build --platform android --profile preview       # APK for phones/testers
npx eas-cli@latest build --platform android --profile production    # AAB for Google Play
npx eas-cli@latest build --platform ios --profile production        # needs an Apple Developer account (interactive)
npx eas-cli@latest submit --platform android --profile production   # after the Play Console app exists
```

What the build uploads is governed by `.easignore` (mirror of `.gitignore` except `amplify_outputs.json`, which must
ship because the app reads its backend endpoints from it): put the **production branch's** outputs in the project root
before a release build (Amplify console → app → `main` → *Deployed backend resources* → *Download amplify_outputs.json*,
or `npx ampx generate outputs --branch main --app-id d3rw7vgtsyn0ne --profile <prod>`). Android native projects are
generated on EAS from `app.config.js` (`android/` is not uploaded), so `GOOGLE_MAPS_ANDROID_API_KEY` must be an EAS
environment variable (`eas env:create --scope project --name GOOGLE_MAPS_ANDROID_API_KEY --value …`) to get real map
tiles. Push notifications additionally need the FCM V1 service account uploaded with `eas credentials`.

Local alternative without EAS (debug-signed, for testing only):
`cd android; .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a` → `android/app/build/outputs/apk/release/app-release.apk`.

## 5. Known limits / hardening backlog

- Company owners can create catalogue rows for any `companyId` (owner rule only checks the row owner). Move
  service/product/staff writes behind a Lambda or add a `companyOwner` check before opening self-service sign-up to
  arbitrary companies.
- Broadcast and catalogue notifications fan out synchronously inside one Lambda; move to SQS when the customer base
  grows beyond a few thousand accounts.
- Analytics are computed client-side from bookings (fine for hundreds of bookings per company; add an aggregation
  table later).
- Payments are recorded as `PAID` / `ON_ARRIVAL` without a gateway; integrate a PSP in `placeBooking` when ready.
