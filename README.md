# OneQ — حجوزات واشتراكات وهدايا في قطر

Arabic-first mobile app (Android + iOS, Expo SDK 57 / React Native 0.86) with three workspaces:

| Workspace | Who | Entry |
| --- | --- | --- |
| Customer | guests and customers (phone OTP) | home · gifts · map · my orders · profile |
| Company | business owners (phone OTP, account created by an admin) | dashboard · bookings · catalogue · staff · more |
| Admin | OneQ operations (email + password) | dashboard · companies · bookings · categories · more |

Highlights: bilingual (العربية / English, RTL), bookings and 1–3×/week subscriptions with live remaining time, home or
on-site services, staff with weekly availability and per-staff ratings, offers with struck-through prices, gifts by
phone number (in-app or WhatsApp), loyalty points (earn, redeem, transfer), nearest-first map with distance, reliable
in-app + push notifications, company analytics and an admin control panel.

## Quick start

```powershell
npm install --legacy-peer-deps
cp .env.example .env            # optional: GOOGLE_MAPS_ANDROID_API_KEY, EAS_PROJECT_ID, EXPO_PUBLIC_DATA_MODE
npx expo start                   # Metro
npx expo run:android             # dev client (or see docs/RUNBOOK.md for the gradle/adb loop)
```

Without a deployed backend the app runs on seeded demo data (`src/data/mock`): sign in with `+974 5000 0003`
(customer), `+974 5000 0002` (company owner) or `+974 5000 0001` / `admin@oneq.qa` (admin); OTP `123456`, password `OneQ@2026`.

## Backend

AWS Amplify Gen 2 (`amplify/`): Cognito (phone OTP + email/password, groups ADMINS / COMPANIES / CUSTOMERS), AppSync +
DynamoDB, S3, Lambda handlers for bookings, gifts, ratings, admin operations, catalogue change notifications and
subscription expiry. Deploy a sandbox with `npx ampx sandbox --once` + `npx ampx sandbox seed`; production deploys from Amplify Hosting on every push to `main` (`amplify.yml`: backend + the web build of the app on oneq.qa), seeded once with `scripts/seed-env.mts`. Details, SMS/WhatsApp/push
setup and release steps: `docs/RUNBOOK.md`. Architecture and functional spec: `docs/ARCHITECTURE.md`.

## Project layout

```
amplify/            backend definition (auth, data schema, storage, functions, seed)
src/app/            expo-router routes: (auth) · (customer) · (company) · (admin)
src/features/       screens by workspace (customer, company, admin, auth, boot, onboarding, shell)
src/components/     ui kit (tokens-driven) and shared product components
src/data/           repository contract, mock implementation, Amplify implementation, react-query hooks
src/domain/         framework-free domain types
src/i18n/           Arabic + English dictionaries, formatting, areas
src/lib/            location, notifications, time, phone, text, geo helpers
docs/               ARCHITECTURE.md · RUNBOOK.md · design references
```

## Quality gates

`npx tsc --noEmit` · `npx expo lint` · `npx tsc -p amplify/tsconfig.json --noEmit`
