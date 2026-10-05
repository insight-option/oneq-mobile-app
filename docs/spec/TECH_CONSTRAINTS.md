# OneQ — Technical Constraints Digest (verified against the installed stack)

Written 2026-10-05 for the OneQ rebuild (Expo SDK 57 / React Native 0.86 / Amplify Gen 2). Every claim below was checked against (a) the SDK 57 documentation saved locally, (b) fresh fetches of `docs.expo.dev/*.md` and `docs.amplify.aws/react-native/*`, or (c) the packages actually installed in `node_modules`. Nothing here is from memory. Where a statement is *team guidance* rather than documented behaviour it is marked **[GUIDANCE]**; where documentation was ambiguous it is listed in §10 "Open questions".

**Citation tags**

| Tag | Meaning |
| --- | --- |
| `[E:file.md]` | `scratchpad/docs/expo/<file>` (SDK 57 docs as Markdown) |
| `[E+:path]` | freshly fetched `https://docs.expo.dev/<path>.md` (saved under `scratchpad/docs/expo/extra/`) |
| `[A:file]` | Amplify Gen 2 React Native docs (text dumps in `scratchpad/docs/amplify/`, incl. `fetched_*.txt`) |
| `[NM:path]` | file inside `C:/Users/Musta/Desktop/oneQ-app/oneQ-app/node_modules/` |
| `[P:path]` | project file under `C:/Users/Musta/Desktop/oneQ-app/oneQ-app/` |
| `[EXT:…]` | library documentation that the Expo page explicitly delegates to (react-native-maps GitHub docs, FlashList docs) |

---

## 0. Installed stack and current project state

### 0.1 Exact installed versions (read from `node_modules/*/package.json`)

| Package | Installed | Package | Installed |
| --- | --- | --- | --- |
| expo | 57.0.26 | expo-router | 57.0.24 |
| react-native | 0.86.3 | react | 19.2.3 |
| react-native-reanimated | 4.5.1 | react-native-worklets | 0.10.1 |
| react-native-gesture-handler | 2.32.0 | react-native-screens | 4.26.2 |
| react-native-safe-area-context | 5.7.0 | expo-image | 57.0.5 |
| react-native-maps | 1.27.2 | expo-notifications | 57.0.21 |
| @shopify/flash-list | 2.0.2 | lucide-react-native | 1.52.0 |
| react-native-svg | 15.15.4 | @tanstack/react-query | 5.104.1 |
| zustand | 5.0.15 | aws-amplify | 6.22.1 |
| @aws-amplify/react-native | 1.3.3 | @aws-amplify/backend | 1.25.1 |
| @aws-amplify/backend-cli | 1.10.0 | typescript | 5.9.3 |
| expo-splash-screen | 57.0.9 | expo-font | 57.0.4 |
| expo-localization | 57.0.2 | expo-location | 57.0.20 |
| expo-image-picker | 57.0.20 | expo-secure-store | 57.0.4 |
| expo-blur | 57.0.3 | expo-linear-gradient | 57.0.2 |
| expo-haptics | 57.0.3 | expo-updates | 57.0.24 |
| expo-constants | 57.0.20 | expo-linking | 57.0.11 |
| expo-system-ui | 57.0.4 | expo-status-bar | 57.0.1 |
| expo-file-system | 57.0.7 | expo-device | 57.0.2 |
| react-native-get-random-values | 1.11.0 | react-native-url-polyfill | 4.0.0 (project) / 3.x (Amplify's own dep) |
| @react-native-async-storage/async-storage | 2.2.0 | @react-native-community/netinfo | 12.0.1 |
| Node | v24.12.0 | aws-cdk-lib | ^2.268.0 (package.json) |

Not installed yet but required by the Amplify examples we need: `@aws-sdk/client-cognito-identity-provider` (only `@aws-sdk/credential-provider-cognito-identity` is present) `[NM:@aws-sdk]`. `@types/aws-lambda` is present transitively `[NM:@types/aws-lambda]`.

### 0.2 Current project state (what must change)

| Item | Current | Required |
| --- | --- | --- |
| `package.json` → `main` | `"index.ts"` (calls `registerRootComponent(App)`) `[P:package.json]`, `[P:index.ts]` | `"expo-router/entry"` (or a custom `index.js` that ends with `import 'expo-router/entry'`) `[E:router-installation.md]` |
| `App.tsx` | placeholder counter app `[P:App.tsx]` | delete; routes live in `src/app/` (`src/app` takes precedence over `app`) `[E+:router/reference/src-directory]` |
| `app.json` plugins | `expo-router, expo-status-bar, expo-image, expo-font, expo-splash-screen, expo-secure-store, expo-localization, expo-sharing, expo-web-browser` (all without options) `[P:app.json]` | see §1.2 |
| `app.json` `scheme`, `experiments.typedRoutes`, `ios.bundleIdentifier` | missing | required for deep links/typed routes/iOS builds `[E:router-installation.md]`, `[E:app-config.md]` |
| `android.adaptiveIcon.backgroundColor` | `#E6F4FE` | brand colour (e.g. `#5A0020`) |
| `amplify/auth/resource.ts` | `loginWith: { email: true }` only | §7.1 |
| `amplify/data/resource.ts` | `Todo` model, `allow.guest()`, default auth mode `identityPool` | §8 |
| `android/` | already generated (`newArchEnabled=true`, `hermesEnabled=true`, `edgeToEdgeEnabled=true`) `[P:android/gradle.properties]`; it is git-ignored `[P:.gitignore]` | regenerate with `npx expo prebuild --clean` after any app config / native dependency change `[E:dev-builds.md]` |
| `tsconfig.json` | `extends expo/tsconfig.base`, `strict` | add `paths` + `include` for typed routes (§1.5) |
| `assets/fonts` | 10 TTFs present (IBMPlexSansArabic ×4, Outfit ×4, PlayfairDisplay ×2) `[P:assets/fonts]` | reference in `expo-font` plugin (§1.3.2) |
| `assets/splash-icon.png`, `assets/notification-icon.png`, `assets/brand/*` | present | referenced in §1.2 |

---

## 1. App config (`app.json` → recommended `app.config.ts`) for SDK 57

### 1.1 Verified facts that shape the config

| Fact | Source |
| --- | --- |
| `scheme` must match `^[a-z][a-z0-9+.-]*$` (lowercase first letter). It is a build-time setting, no effect in Expo Go. Platform `ios.scheme`/`android.scheme` are merged with the top-level one. | `[E:app-config.md]` |
| **New Architecture is always on**: "SDK 55 and later run entirely on the New Architecture. The New Architecture is always enabled and cannot be disabled… setting `newArchEnabled` to `false` has no effect." Remove any `newArchEnabled` key. | `[E+:guides/new-architecture]`; generated `[P:android/gradle.properties]` has `newArchEnabled=true` |
| **Android edge-to-edge is the default**: "For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default"; `statusBarBackgroundColor`, `statusBarTranslucent`, `navigationBarColor` screen options are deprecated for that reason. "With edge-to-edge on Android, you will need to use safe areas to ensure that content does not overlap with system bars." Generated project has `edgeToEdgeEnabled=true`. | `[E:router-sdk.md]` (NativeStackNavigationOptions), `[E:app-config.md]`, `[E+:develop/user-interface/system-bars]`, `[P:android/gradle.properties]` |
| `orientation`: enum `default | portrait | landscape`. | `[E:app-config.md]` |
| `userInterfaceStyle`: `light | dark | automatic`; defaults to `light`; **requires `expo-system-ui` installed to work on Android** (installed: 57.0.4). Top-level `backgroundColor` requires `expo-system-ui` on iOS. | `[E:app-config.md]`, `[E+:versions/v57.0.0/sdk/system-ui]` |
| `android.softwareKeyboardLayoutMode`: `resize` (default) or `pan`. Expo recommends `pan` when a bottom tab bar is pushed up by the keyboard. | `[E:app-config.md]`, `[E+:guides/keyboard-handling]` |
| `android.predictiveBackGestureEnabled` default `false`. | `[E:app-config.md]` |
| `ios.deploymentTarget` format `"MAJOR.MINOR"` (e.g. `"16.4"`); the `expo-build-properties` `deploymentTarget` is deprecated in favour of this key (SDK 56+). | `[E:app-config.md]`, `[E+:versions/v57.0.0/sdk/build-properties]` |
| Android SDK Platform **36** (Android 16 "Baklava") is required to compile; `expo-build-properties` defaults `compileSdkVersion`/`targetSdkVersion` 36. Our emulator is `Medium_Phone_API_36.1`. | `[E+:get-started/set-up-your-environment]`, `[E+:versions/v57.0.0/sdk/build-properties]` |
| Config plugins only apply with prebuild / EAS Build (never in Expo Go). | `[E:app-config.md]` |
| `experiments.typedRoutes: true` enables statically typed `href`s (beta, off by default). | `[E:app-config.md]`, `[E+:router/reference/typed-routes]` |
| `ios.infoPlist` is an arbitrary dictionary merged into Info.plist; `android.permissions` adds permissions; `android.blockedPermissions` removes merged ones. | `[E:app-config.md]` |
| `ios.config.googleMapsApiKey` / `android.config.googleMaps.apiKey` exist in the schema, but the react-native-maps plugin options (`androidGoogleMapsApiKey`, `iosGoogleMapsApiKey`) are what the installed plugin reads. | `[E:app-config.md]`, `[NM:react-native-maps/plugin/build/android.js]` (writes `com.google.android.geo.API_KEY` meta-data), `[NM:react-native-maps/plugin/build/ios.js]` (writes `GMSApiKey`) |
| `locales` lets you provide per-locale Info.plist strings (permission prompts, `CFBundleDisplayName`) and Android `app_name`; requires `ios.infoPlist.CFBundleAllowMixedLocalizations: true`. | `[E:localization-guide.md]` |

### 1.2 Recommended `app.config.ts` (replace `app.json`)

Why TS and not JSON: the Google Maps key must come from the environment; `app.config.ts` can read `process.env.*` at config-evaluation time, which `app.json` cannot (`[E:app-config.md]` — "These properties can be passed to the top level object of app.config.js or app.config.ts"). Every key/option below exists in the SDK 57 schema or in the installed plugin.

```ts
// app.config.ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'OneQ',
  slug: 'oneQ-app',
  version: '1.0.0',
  scheme: 'oneq',                       // oneq://... deep links  [E:app-config.md]
  orientation: 'portrait',
  userInterfaceStyle: 'light',           // needs expo-system-ui on Android  [E:app-config.md]
  backgroundColor: '#F7F0EA',            // root view colour (cream); needs expo-system-ui on iOS
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'com.mastajazz.oneqapp',
    supportsTablet: false,
    deploymentTarget: '16.4',
    config: { usesNonExemptEncryption: false },   // ITSAppUsesNonExemptEncryption
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,      // required for `locales`  [E:localization-guide.md]
      // UIDesignRequiresCompatibility: true,     // optional iOS 26 Liquid-Glass opt-out (temporary, removed in iOS 27)  [E:router-stack.md]
    },
  },
  android: {
    package: 'com.mastajazz.oneQapp',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#5A0020',
    },
    softwareKeyboardLayoutMode: 'pan',  // avoid tab bar riding the keyboard  [E+:guides/keyboard-handling]
    predictiveBackGestureEnabled: false,
    permissions: [
      // Added automatically by libraries (location/camera/notifications); listed for clarity.
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.CAMERA',
      'android.permission.POST_NOTIFICATIONS',
    ],
    blockedPermissions: ['android.permission.RECORD_AUDIO'], // see expo-image-picker microphonePermission:false alternative
  },
  locales: {
    ar: './locales/ar.json',             // see §1.4
    en: './locales/en.json',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#5A0020',
        image: './assets/splash-icon.png',   // must be .png  [E:splash-guide.md]
        imageWidth: 200,                      // default 100  [E:splash-screen.md]
        resizeMode: 'contain',
        dark: { image: './assets/splash-icon.png', backgroundColor: '#5A0020' },
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/IBMPlexSansArabic-Regular.ttf',
          './assets/fonts/IBMPlexSansArabic-Medium.ttf',
          './assets/fonts/IBMPlexSansArabic-SemiBold.ttf',
          './assets/fonts/IBMPlexSansArabic-Bold.ttf',
          './assets/fonts/Outfit-Regular.ttf',
          './assets/fonts/Outfit-Medium.ttf',
          './assets/fonts/Outfit-SemiBold.ttf',
          './assets/fonts/Outfit-Bold.ttf',
          './assets/fonts/PlayfairDisplay-SemiBold.ttf',
          './assets/fonts/PlayfairDisplay-Bold.ttf',
        ],
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',  // 96x96 all-white PNG with transparency (Android)
        color: '#5A0020',                         // Android tint
        defaultChannel: 'default',                // Android FCM v1 default channel
        enableBackgroundRemoteNotifications: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'يستخدم OneQ موقعك لعرض أقرب الصالونات والعيادات والنوادي إليك.',
        locationAlwaysAndWhenInUsePermission: 'يستخدم OneQ موقعك لعرض أقرب الخدمات إليك.',
        isAndroidBackgroundLocationEnabled: false,
        isIosBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'يحتاج OneQ للوصول إلى صورك لرفع صورة الملف الشخصي وصور الخدمات.',
        cameraPermission: 'يحتاج OneQ للوصول إلى الكاميرا لتصوير صورة الملف الشخصي.',
        microphonePermission: false,          // blocks RECORD_AUDIO on Android  [E:imagepicker.md]
      },
    ],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '',
        // iosGoogleMapsApiKey: omit => Apple Maps on iOS (default provider)  [E:map-view.md]
      },
    ],
    [
      'expo-localization',
      {
        supportedLocales: { ios: ['ar', 'en'], android: ['ar', 'en'] },
        supportsRTL: true,
        forcesRTL: false,                     // Arabic-first with English toggle => do NOT force
      },
    ],
    ['expo-secure-store', { configureAndroidBackup: true }],
    'expo-image',
    'expo-system-ui',
    'expo-status-bar',
    'expo-web-browser',
    'expo-sharing',
    // Optional OTA updates (configured by `eas update:configure`):
    // 'expo-updates'  -> also sets updates.url + runtimeVersion (see §1.3.9)
  ],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID } }, // written by `eas init`; used for push tokens (§4)
});
```

> All `[string, options]` plugin shapes above were verified against the installed plugin `.d.ts`/`.js` files, not just the docs: `[NM:expo-notifications/plugin/build/withNotifications.d.ts]`, `[NM:expo-location/plugin/build/withLocation.js]`, `[NM:expo-image-picker/plugin/build/withImagePicker.js]`, `[NM:react-native-maps/plugin/build/{android,ios}.js]`, `[NM:expo-localization/plugin/build/withExpoLocalization.js]`, `[NM:expo-secure-store/plugin/build/withSecureStore.js]`, `[NM:expo-font/plugin/build/withFonts.js]`.

### 1.3 Plugin option reference (only options that exist in SDK 57)

#### 1.3.1 `expo-splash-screen` `[E:splash-screen.md]`, `[E:splash-guide.md]`

| Option | Default | Notes |
| --- | --- | --- |
| `backgroundColor` | `#ffffff` | hex string |
| `image` | – | **PNG only** ("If you use another image format, making a production build will fail"); recommended 1024×1024 transparent icon |
| `imageWidth` | `100` | width in pt the image is drawn at |
| `resizeMode` | `contain` | `contain | cover | native` |
| `dark` | – | `{ image, backgroundColor }` |
| `android` / `ios` | – | per-platform override objects (same keys) |
| `enableFullScreenImage_legacy` | `false` | iOS legacy full-screen image; will be removed |

Runtime API: `SplashScreen.preventAutoHideAsync()` **must be called at module scope (not inside a component)**; `SplashScreen.hide()` / `hideAsync()`; `SplashScreen.setOptions({ duration: 400 /*ms default*/, fade: true /* iOS only */ })`. Expo Go shows the app icon instead of the splash and dev builds don't reflect all plugin properties: **test the splash in a preview/production build only** `[E:splash-screen.md]`, `[E:splash-guide.md]`. Known issue: launching an Android *debug* build from a push notification often breaks the splash (release builds unaffected) `[E:notifications.md]`.

#### 1.3.2 `expo-font` — how to reference our fonts by family name `[E:font.md]`, `[E+:develop/user-interface/fonts]`

Rules from the docs:

* `fonts: string[]` (paths relative to project root): **on Android the file name (without extension) becomes the font family name; on iOS the family name is always read from the font file itself**. Expo therefore recommends naming each file after its **PostScript name** so the same `fontFamily` works on both platforms. Our files are already named by PostScript name (`IBMPlexSansArabic-Bold`, `Outfit-SemiBold`, `PlayfairDisplay-Bold`, …), so **Form A** below is the deterministic choice.
* Object form (`android.fonts[].fontFamily` + `fontDefinitions[{ path, weight, style }]`) embeds Android XML fonts so you can use `fontFamily: 'IBM Plex Sans Arabic'` + `fontWeight`. On iOS you then rely on the family name embedded in the file and `fontWeight` selection (the docs' Inter example renders `<Text style={{ fontFamily: 'Inter', fontWeight: '700' }}>` after listing `Inter-Bold.ttf` under `ios.fonts`).
* Config-plugin fonts **do not work in Expo Go** (dev build required); fonts are available immediately at startup — no `useFonts` needed. `useFonts` is the runtime fallback (works in Expo Go/web). Loading several files under one family via `useFonts([{ fontFamily, fontDefinitions }])` is **SDK 58+ only**.
* Variable fonts on Android/iOS are SDK 58+; we ship static TTFs (correct for 57).
* Supported formats: ttf/otf both platforms (woff/woff2 iOS only).

**Form A (recommended) — reference by PostScript name, no `fontWeight`:**

| Role | `fontFamily` value (identical on iOS and Android) |
| --- | --- |
| Arabic body regular / medium / semibold / bold | `IBMPlexSansArabic-Regular` / `IBMPlexSansArabic-Medium` / `IBMPlexSansArabic-SemiBold` / `IBMPlexSansArabic-Bold` |
| Latin UI (English toggle) | `Outfit-Regular` / `Outfit-Medium` / `Outfit-SemiBold` / `Outfit-Bold` |
| Display / brand headings | `PlayfairDisplay-SemiBold` / `PlayfairDisplay-Bold` |

Do **not** combine Form A with `fontWeight: '700'` — on Android the file name family has a single face and the OS would synthesize bold. Pick the face via the family name string.

**Form B (documented alternative) — one family + `fontWeight`:**

```json
["expo-font", {
  "android": { "fonts": [
    { "fontFamily": "IBM Plex Sans Arabic", "fontDefinitions": [
      { "path": "./assets/fonts/IBMPlexSansArabic-Regular.ttf",  "weight": 400 },
      { "path": "./assets/fonts/IBMPlexSansArabic-Medium.ttf",   "weight": 500 },
      { "path": "./assets/fonts/IBMPlexSansArabic-SemiBold.ttf", "weight": 600 },
      { "path": "./assets/fonts/IBMPlexSansArabic-Bold.ttf",     "weight": 700 } ] } ] },
  "ios": { "fonts": [
    "./assets/fonts/IBMPlexSansArabic-Regular.ttf", "./assets/fonts/IBMPlexSansArabic-Medium.ttf",
    "./assets/fonts/IBMPlexSansArabic-SemiBold.ttf", "./assets/fonts/IBMPlexSansArabic-Bold.ttf" ] }
}]
```
Usage: `<Text style={{ fontFamily: 'IBM Plex Sans Arabic', fontWeight: '600' }}>`. Verify the iOS family name with `Font.getLoadedFonts()` (`[E:font.md]`) before committing to Form B.

Verify at runtime: `import { getLoadedFonts } from 'expo-font'; console.log(getLoadedFonts())` lists every embedded family name `[E:font.md]`.

#### 1.3.3 `expo-notifications` `[E:notifications.md]`, `[NM:expo-notifications/plugin/build/withNotifications.d.ts]`

| Option | Platform | Default | Notes |
| --- | --- | --- | --- |
| `icon` | Android | – | local path; **96×96 all-white PNG with transparency** (follow Google design guidelines, otherwise it renders wrong) |
| `color` | Android | `#ffffff` | tint of the icon in the tray |
| `defaultChannel` | Android | – | default channel for FCM v1 notifications |
| `sounds` | both | – | array of `.wav` paths |
| `mode` | iOS | `development` | APNs entitlement environment; Xcode switches to production for archives |
| `enableBackgroundRemoteNotifications` | iOS | `false` | adds `remote-notification` to `UIBackgroundModes` |

#### 1.3.4 `expo-location` `[E:location.md]`, `[NM:expo-location/plugin/build/withLocation.js]`

| Option | Platform | Default |
| --- | --- | --- |
| `locationWhenInUsePermission` | iOS `NSLocationWhenInUseUsageDescription` | `"Allow $(PRODUCT_NAME) to use your location"` |
| `locationAlwaysAndWhenInUsePermission` | iOS `NSLocationAlwaysAndWhenInUseUsageDescription` | same |
| `locationAlwaysPermission` | iOS (deprecated) `NSLocationAlwaysUsageDescription` | same |
| `motionUsagePermission` | iOS `NSMotionUsageDescription` | `"Allow $(PRODUCT_NAME) to detect your current motion activity"` |
| `isIosBackgroundLocationEnabled` | iOS `UIBackgroundModes: location` | `false` |
| `isAndroidBackgroundLocationEnabled` | Android `ACCESS_BACKGROUND_LOCATION` | `false` |
| `isAndroidForegroundServiceEnabled` | Android `FOREGROUND_SERVICE(_LOCATION)` | follows background flag |
| `androidForegroundServiceIcon` | Android | falls back to notification icon |

`ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` are always added by the library (confirmed in the generated manifest `[P:android/app/src/main/AndroidManifest.xml]`). Background/foreground services require Play Store review and are not available in Expo Go.

#### 1.3.5 `expo-image-picker` `[E:imagepicker.md]`

| Option | Default | Notes |
| --- | --- | --- |
| `photosPermission` | `"Allow $(PRODUCT_NAME) to access your photos"` | iOS `NSPhotoLibraryUsageDescription` |
| `cameraPermission` | `"Allow $(PRODUCT_NAME) to access your camera"` | `false` blocks Android `CAMERA` |
| `microphonePermission` | `"Allow $(PRODUCT_NAME) to access your microphone"` | **`false` blocks Android `RECORD_AUDIO`** (the library adds it by default — the current generated manifest contains it) |
| `colors`, `dark.colors` | – | Android crop UI colours (`cropToolbarColor`, `cropToolbarIconColor`, `cropToolbarActionTextColor`, `cropBackButtonIconColor`, `cropBackgroundColor`) |

#### 1.3.6 `react-native-maps` `[E:map-view.md]`, `[EXT:react-native-maps docs/installation.md]`

Plugin requires react-native-maps ≥ 1.22 and Expo SDK ≥ 53 (we have 1.27.2 / 57). Options: `androidGoogleMapsApiKey` (writes `com.google.android.geo.API_KEY` meta-data), `iosGoogleMapsApiKey` (writes `GMSApiKey`, adds GoogleMaps pod + AppDelegate init). Expo's guide shows the key coming from a `.env` file and warns: "If EAS Build does not pick up the API key, make sure your project contains a `.easignore` file… must not exclude `.env`". Android restricted keys need `android.package` + SHA-1 (debug keystore SHA-1 from the EAS project Credentials page for dev builds; Play App Signing SHA-1 for store builds).

#### 1.3.7 `expo-localization` `[E:localization-guide.md]`, `[NM:expo-localization/plugin/build/withExpoLocalization.js]`

| Option | Effect (verified in plugin source) |
| --- | --- |
| `supportedLocales: string[] \| { ios, android }` | iOS `CFBundleLocalizations`; Android `locales_config.xml` + `resourceConfigurations` in groovy `build.gradle` (warns if build.gradle is not groovy) — enables per-app language in system settings |
| `supportsRTL: boolean` | iOS `ExpoLocalization_supportsRTL` Info.plist key; Android string resource `ExpoLocalization_supportsRTL` |
| `forcesRTL: boolean` | iOS `ExpoLocalization_forcesRTL`; Android string `ExpoLocalization_forcesRTL` |

Important nuance: the "RTL support" section of the guide is labelled "behaviour in **SDK 58 and later**. On previous versions, RTL support was enabled by default, except in Expo Go where it was disabled." The options themselves exist in the installed 57.0.2 plugin (and the already-generated `strings.xml` contains `ExpoLocalization_supportsRTL=true`, `ExpoLocalization_forcesRTL=false` `[P:android/app/src/main/res/values/strings.xml]`). Runtime RTL switching is covered in §9 (requires reload).

#### 1.3.8 `expo-secure-store` `[E:securestore.md]`

Options: `configureAndroidBackup` (default `true`), `faceIDPermission` (iOS `NSFaceIDUsageDescription`, default `"Allow $(PRODUCT_NAME) to access your Face ID biometric data."`). Limits: "Historically, some iOS releases refused values above roughly 2048 bytes" — keep tokens small; `requireAuthentication` is unsupported in Expo Go and needs a real device. (Amplify stores its own tokens in AsyncStorage via `@aws-amplify/react-native`; SecureStore is only needed for our own secrets.)

#### 1.3.9 `expo-updates` (optional) `[E+:versions/v57.0.0/sdk/updates]`, `[E:app-config.md]`

Required keys when used: `updates.url` (EAS Update URL) and `runtimeVersion` (`{ "policy": "appVersion" }` is the policy to use when every store build bumps `version`). Defaults: `updates.enabled true`, `checkAutomatically ON_LOAD`, `fallbackToCacheTimeout 0`. Most of the Updates API (incl. `reloadAsync`) **rejects in Expo Go and in development mode** — relevant for the RTL toggle (§9).

#### 1.3.10 Others

* `expo-image` plugin: only option `disableLibdav1d` (iOS AVIF decoder) `[E:image.md]`.
* `expo-system-ui`: applies `userInterfaceStyle` on Android (`expo_system_ui_user_interface_style` string) and `backgroundColor` on iOS `[E+:versions/v57.0.0/sdk/system-ui]`.
* `expo-status-bar` plugin: option `hidden` `[E+:versions/v57.0.0/sdk/status-bar]`; prefer the runtime `<StatusBar style="light" />` component `[E+:develop/user-interface/system-bars]`.
* `expo-router` plugin options (none needed): `root` (default `app`; `src/app` is auto-detected and **takes precedence**), `asyncRoutes`, `sitemap`, `partialRouteTypes`, `redirects`, `rewrites` `[E:router-sdk.md]`, `[E+:router/reference/src-directory]`.

### 1.4 `locales/ar.json` (iOS permission strings + Android app name) `[E:localization-guide.md]`

```json
{
  "ios": {
    "CFBundleDisplayName": "ون كيو",
    "NSLocationWhenInUseUsageDescription": "يستخدم OneQ موقعك لعرض أقرب الخدمات إليك.",
    "NSCameraUsageDescription": "يحتاج OneQ للوصول إلى الكاميرا لتصوير صورة الملف الشخصي.",
    "NSPhotoLibraryUsageDescription": "يحتاج OneQ للوصول إلى صورك لرفع الصور."
  },
  "android": { "app_name": "ون كيو" }
}
```
"Config plugins set the default value for iOS usage descriptions in Info.plist. To show a translated system permission message, add the matching usage-description key to the `ios` object in each locale file" `[E:localization-guide.md]`.

### 1.5 `package.json`, entry file, `tsconfig.json`

```json
// package.json
{ "main": "expo-router/entry" }
```
Custom entry (needed to initialise Amplify/polyfills before the root layout) `[E:router-installation.md]`:

```js
// index.js  (then set "main": "index.js")
import 'react-native-get-random-values';     // optional: Amplify loads these itself (§6.2)
import 'react-native-url-polyfill/auto';
import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json';
Amplify.configure(outputs);
// Register app entry through Expo Router — must be the LAST import.
import 'expo-router/entry';
```

```json
// tsconfig.json  [E:router-installation.md], [E+:router/reference/typed-routes]
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": { "strict": true, "paths": { "@/*": ["./src/*"] } },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```
`expo/tsconfig.base` already sets `resolveJsonModule: true`, `moduleResolution: bundler`, `customConditions: ["react-native"]` `[NM:expo/tsconfig.base.json]`, so `import outputs from './amplify_outputs.json'` type-checks. `expo-env.d.ts` and `.expo/` are generated and must stay git-ignored (`[P:.gitignore]` already ignores `expo-env.d.ts`, `.expo/`, `amplify_outputs*`).

### 1.6 Build/run rules on this Windows machine

* Dev build (needed for Amplify, config-plugin fonts, push, maps key): `npx expo install expo-dev-client` → `npx expo run:android` (uses the existing `android/` dir on later runs). Rebuild native only after adding native libs, changing app config, or upgrading SDK: `npx expo prebuild --clean` then `npx expo run:android` `[E:dev-builds.md]`.
* Windows toolchain from the docs: `choco install -y microsoft-openjdk17`; Android Studio with **Android SDK Platform 36**; `ANDROID_HOME` user env var (`%LOCALAPPDATA%\Android\Sdk`) and `%LOCALAPPDATA%\Android\Sdk\platform-tools` on `Path`; verify with `adb --version` in PowerShell `[E+:get-started/set-up-your-environment]`.
* Cache reset on Windows: `rm -rf node_modules`, `npm cache clean --force`, `npm install`, `del %localappdata%\Temp\haste-map-*`, `del %localappdata%\Temp\metro-cache`, `npx expo start --clear` `[E+:troubleshooting/clear-cache-windows]`.
* `npx expo-doctor` / `npx expo install --fix` / `npx tsc --noEmit` / `npx expo lint` before declaring work done `[P:AGENTS.md]`.

---

## 2. Expo Router 57.0.24 essentials

### 2.1 Entry, directory layout, notation `[E:router-installation.md]`, `[E+:router/basics/notation]`

| Notation | Meaning |
| --- | --- |
| `src/app/_layout.tsx` | root layout; rendered before every route (put providers here). `src/app` beats `app` if both exist |
| `index.tsx` | default route of a directory (`(tabs)/index.tsx` → `/`) |
| `[id].tsx`, `[...rest].tsx` | dynamic / catch-all segments; params via `useLocalSearchParams` |
| `(group)` | route group — no URL segment; `(a,b)` shared/array groups |
| `+not-found.tsx`, `+native-intent.tsx`, `+html.tsx` | special files |
| Reserved paths | e.g. `/assets` is reserved by Metro — avoid as a route name |

Dependencies required by the router (all installed): `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, `expo-status-bar` `[E:router-installation.md]`. A `babel.config.js` is not required; if one exists it must use `presets: ['babel-preset-expo']`.

### 2.2 Root layout skeleton (auth-gated, RTL-aware)

```tsx
// src/app/_layout.tsx
import { Stack, SplashScreen, LocaleProvider, ThemeProvider, DefaultTheme } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSession } from '@/features/auth/session';      // our zustand/Amplify Hub store
import { useAppLocale } from '@/i18n/locale';

SplashScreen.preventAutoHideAsync();                       // module scope  [E:splash-screen.md]

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#F7F0EA', primary: '#5A0020' } };

export const unstable_settings = { anchor: '(tabs)' };     // back destination for deep links  [E+:router/advanced/router-settings]

export default function RootLayout() {
  const { direction } = useAppLocale();                    // 'rtl' | 'ltr'
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={theme}>
            <LocaleProvider direction={direction}>
              <SplashController />
              <StatusBar style="light" />
              <RootNavigator />
            </LocaleProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function SplashController() {
  const { isLoading } = useSession();
  if (!isLoading) SplashScreen.hide();                     // [E+:router/advanced/authentication]
  return null;
}

function RootNavigator() {
  const { session, role } = useSession();                  // role from cognito:groups
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#F7F0EA' } }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="booking/[id]" />
        <Stack.Protected guard={role === 'COMPANIES' || role === 'ADMINS'}>
          <Stack.Screen name="(company)" />
        </Stack.Protected>
      </Stack.Protected>
      <Stack.Screen name="filters" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, sheetCornerRadius: 24 }} />
    </Stack>
  );
}
```
Sources: `ThemeProvider/DefaultTheme` to avoid white flashes `[E:router-stack.md]`; `LocaleProvider direction` updates headers/transitions/gestures at runtime `[E:localization-guide.md]`; exports verified in `[NM:expo-router/build/exports.d.ts]` (`SplashScreen`, `LocaleProvider`, `useRouter`, `router`, `useLocalSearchParams`, …). `GestureHandlerRootView` is required because RNGH throws in dev: "GestureDetector must be used as a descendant of GestureHandlerRootView" `[NM:react-native-gesture-handler/src/handlers/gestures/GestureDetector/index.tsx]`. `SafeAreaProvider` is provided by Expo Router (the docs say to add it yourself only when *not* using Expo Router) `[E+:develop/user-interface/safe-areas]`; adding it again at the root is harmless.

### 2.3 Stack (native stack, `react-native-screens`) options `[E:router-stack.md]`, `[E:router-sdk.md]`

Header options that matter when we **hide** the native header (`headerShown: false`) and draw our own: nothing else is needed; if a native header is used: `headerStyle.backgroundColor`, `headerTintColor`, `headerTitleStyle { fontFamily, fontSize, fontWeight, color }`, `headerTitleAlign` (Android only; iOS always center), `headerBackTitle`, `headerBackButtonDisplayMode: 'minimal'`, `headerTransparent` + `headerBlurEffect` (iOS), `headerShadowVisible`, `headerLargeTitleEnabled` (iOS), `header: () => <Custom/>` (disables native large title/search bar). Composition API (`<Stack.Title>`, `<Stack.Header>`, `<Stack.Toolbar>`) is alpha in SDK 55+ and present in 57 `[NM:expo-router/build/layouts/StackClient.d.ts]`.

| Screen option | Values / platform (SDK 57) |
| --- | --- |
| `animation` | `default`, `fade`, `fade_from_bottom`, `flip` (iOS, needs modal), `simple_push` (iOS), `slide_from_bottom`, `slide_from_right` / `slide_from_left` / `ios_from_right` / `ios_from_left` (**Android only**, iOS falls back to default), `none` |
| `animationDuration` | iOS; only for `slide_from_bottom`, `fade_from_bottom`, `fade`, `simple_push`; default 350–500 ms (docs disagree: stack guide says 350, SDK reference says 500) |
| `animationTypeForReplace` | `push` \| `pop` — use `pop` on logout replace |
| `presentation` | `card` (default), `modal`, `transparentModal`, `containedModal`, `containedTransparentModal`, `fullScreenModal`, `formSheet`, `pageSheet` |
| `gestureEnabled`, `fullScreenGestureEnabled`, `gestureDirection` | iOS swipe-to-dismiss; `fullScreenGestureEnabled` defaults `true` on iOS 26 |
| `contentStyle` | scene background (set cream to avoid white flashes) |
| `statusBarStyle` | `auto`/`inverted` iOS only; Android falls back to `light`; requires `UIViewControllerBasedStatusBarAppearance` |
| `statusBarBackgroundColor`, `statusBarTranslucent`, `navigationBarColor` | **deprecated** (edge-to-edge default on SDK 35+) |
| `freezeOnBlur` | exists in 57; **has no effect in SDK 58** (use `activityEnabled`) |
| `orientation` | per-screen orientation (`portrait`, …) |
| `getId` on `<Stack.Screen>` | push duplicates of a dynamic route (`getId={({ params }) => params.id}`) |

Form sheets (`presentation: 'formSheet'`) `[E:router-modals.md]`: `sheetAllowedDetents: number[] | 'fitToContents'` (ascending fractions; **Android max 3 detents**; `fitToContents` needs explicit content sizing — `flex: 1` does not work with it), `sheetInitialDetentIndex: number | 'last'`, `sheetGrabberVisible` (iOS), `sheetCornerRadius`, `sheetLargestUndimmedDetentIndex: number | 'none' | 'last'`, `sheetElevation` (Android), `sheetShouldOverflowTopInset` (Android), `unstable_sheetFooter` (Android, experimental). **Android limitation: native stack headers and nested stack navigators are not supported inside form sheet screens** — render titles/buttons inside the sheet content. Numeric detents + `flex: 1` work on iOS since SDK 55.

### 2.4 Protected routes (`Stack.Protected`) `[E:router-protected.md]`, `[NM:expo-router/build/views/Protected.d.ts]`

* Installed type: `ProtectedProps = { guard: boolean; children?: ReactNode }` — **no `redirectTo` in 57** (`redirectTo` is "Available in SDK 58 and later"). When a guard is false the router redirects to the navigator's **anchor route or the first available screen**; so order screens so the first unprotected screen is the desired fallback (e.g. `(auth)` group when logged out).
* A screen may be declared in **only one** `Protected`/group; nest `Protected` for hierarchical rules (`isLoggedIn` → `isAdmin`).
* When a guard flips true→false all history entries of those screens are removed and the user is redirected automatically.
* `Tabs.Protected` exists too (verified `[NM:expo-router/build/layouts/TabsClient.d.ts]`).
* Protection is client-side only; never treat it as authorization (Amplify auth rules are the authority).
* `redirect` / `initialParams` props on `Screen` still exist in 57 (`[E:router-sdk.md]` ScreenProps) but are **removed in SDK 58** → prefer `<Redirect href>` in route files `[E:router-migrate-57-58.md]`.

Auth pattern (SessionProvider + SplashScreenController + `router.replace('/')` after sign-in) `[E+:router/advanced/authentication]`.

### 2.5 Tabs — JavaScript tabs with a fully custom tab bar (recommended for OneQ)

* Import: **`import { Tabs } from 'expo-router/js-tabs'`**. The root re-export `Tabs` from `'expo-router'` is marked `@deprecated Use import { Tabs } from 'expo-router/js-tabs' instead` in the installed build `[NM:expo-router/build/exports.d.ts]`; the protected-routes doc also imports from `expo-router/js-tabs` `[E:router-protected.md]`. Entry file `expo-router/js-tabs.js` exists `[NM:expo-router/js-tabs.js]`.
* In SDK 56+ JS tabs are bundled with Expo Router (no `@react-navigation/bottom-tabs` import allowed in app code) `[E:router-tabs.md]`, `[E:router-sdk.md]`.
* Custom bar: the navigator accepts `tabBar?: (props: BottomTabBarProps) => React.ReactNode` where `BottomTabBarProps = { state: TabNavigationState; descriptors: BottomTabDescriptorMap; navigation: NavigationHelpers; insets: EdgeInsets }` `[NM:expo-router/build/react-navigation/bottom-tabs/types.d.ts]`.

```tsx
// src/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { OneQTabBar } from '@/components/navigation/OneQTabBar';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props: TabBarProps) => <OneQTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, tabBarStyle: { position: 'absolute' } }}>
      <Tabs.Screen name="index"    options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="explore"  options={{ title: 'استكشف' }} />
      <Tabs.Screen name="bookings" options={{ title: 'حجوزاتي' }} />
      <Tabs.Screen name="profile"  options={{ title: 'حسابي' }} />
      <Tabs.Screen name="hidden-route" options={{ href: null }} />   {/* exists, not in bar */}
    </Tabs>
  );
}
```
Inside `OneQTabBar`, iterate `state.routes`, read `descriptors[route.key].options` (`title`, `tabBarLabel`, `tabBarIcon`, `tabBarBadge`), call `navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })` then `navigation.navigate(route.name)`, and pad the bottom with `insets.bottom` (edge-to-edge). With an absolutely positioned bar "you also might need to add a bottom margin to your content… React Navigation won't do it automatically" `[E:router-tabs.md]`.

Useful tab options `[E:router-tabs.md]`: `href: null` (hide), `href: { pathname: '/[user]', params }` (dynamic tab), `tabBarActiveTintColor`, `tabBarInactiveTintColor`, `tabBarStyle`, `tabBarBackground` (e.g. `BlurView` + `position: 'absolute'`), `tabBarHideOnKeyboard`, `tabBarBadge`, `tabBarLabelStyle`, `tabBarIcon({ focused, color, size })`. Only one dynamic route per tab layout.

Alternatives: **NativeTabs** = `import { NativeTabs } from 'expo-router/unstable-native-tabs'` in SDK 54–57 (`expo-router/native-tabs` is SDK 58+) `[E:router-native-tabs.md]`, `[NM:expo-router/unstable-native-tabs.js]` — native look, limited styling (not our premium design); **headless tabs** `import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui'` — experimental, unstyled, `TabTrigger` needs `name` + `href`, `reset="always|onLongPress|never"`, `isFocused` forwarded to `asChild` children `[E+:router/advanced/custom-tabs]`.

### 2.6 Modals `[E:router-modals.md]`

`presentation: 'modal'` — Android slides on top (back button dismisses), iOS slides from bottom (swipe down). iOS modal hides the status bar → set `<StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />` inside the modal. Deep-linked modals need `unstable_settings.anchor` in the stack layout or the screen beneath is lost. For simple confirmations use RN `Modal`.

### 2.7 Navigation API `[E:router-sdk.md]`, `[E+:router/basics/navigation]`, `[E+:versions/v57.0.0/sdk/router/link]`, `[NM:expo-router/build/global-state/routing.d.ts]`

| `useRouter()` / `router` | Behaviour |
| --- | --- |
| `navigate(href)` | push or unwind to an existing route (recommended default) |
| `push(href)` | always push (dedupes identical screens unless `getId`) |
| `replace(href)` | replace current (use for post-login, with `animationTypeForReplace`) |
| `back()`, `canGoBack()` | history |
| `dismiss(count?)`, `dismissAll()`, `canDismiss()` | closest **stack** |
| `dismissTo(href)` | pop until href, else replace |
| `setParams(partial)` | update query params without navigating |
| `prefetch(href)` | preload screen |
| `push(href, { withAnchor: true })` | load the layout's anchor beneath |

Prefer `useRouter()` inside components (module-level `router` throws before first render; SDK 58 guidance) `[E:router-migrate-57-58.md]`. Navigate to **complete hrefs** (`/(tabs)/bookings/[id]` + params), never `navigation.navigate('(tabs)', { screen })`.

`<Link>` props: `href` (string or `{ pathname, params }`), `asChild` (child must accept `onPress`), `push`, `replace`, `dismissTo`, `withAnchor`, `prefetch`, `relativeToDirectory`, `dangerouslySingular`. `<Redirect href />` replaces as soon as it mounts (use in `index.tsx` of a group). Reserved param names: `screen`, `params`, `initial`, `state` `[E+:router/reference/url-parameters]`.

```tsx
// src/app/(tabs)/bookings/[id].tsx
const { id, tab } = useLocalSearchParams<{ id: string; tab?: 'details' | 'receipt' }>();
// or fully typed from the route:
const { id } = useLocalSearchParams<'/(tabs)/bookings/[id]'>();
```
`useLocalSearchParams` updates only while the screen is focused (use it for data fetching); `useGlobalSearchParams` re-renders background screens. Catch-all params come back as `string[]`. Changing a route param re-mounts the component.

### 2.8 Deep links `[E+:router/basics/navigation]`, `[E:linking.md]`, `[E:app-config.md]`

Every route has a URL: `oneq://company/123`, `oneq://bookings/42`. `Linking.createURL('/company/123')` builds scheme URLs (scheme must be in app config; unstable in Expo Go). HTTPS universal links: `ios.associatedDomains: ["applinks:oneq.qa"]` and `android.intentFilters` with `autoVerify: true`. `unstable_settings.anchor` ("`initialRouteName` is deprecated. Use `anchor` instead") gives deep links a back button; **do not use `anchor` to choose the start screen** — the launch URL does. `+native-intent.tsx` with `redirectSystemPath({ path, initial })` rewrites third-party URLs. Notification taps: read `notification.request.content.data.url` and `router.push(url)` (§4.4).

### 2.9 Typed routes `[E+:router/reference/typed-routes]`

* Types are generated **when the dev server starts** (`npx expo start`), written to `expo-env.d.ts` + `.expo/types` (git-ignored, must stay in `tsconfig.include`). On CI run `npx expo customize tsconfig.json` to generate without a server.
* Dynamic routes must be object hrefs: `{ pathname: '/company/[id]', params: { id } }`; string `'/company/[id]'` is a type error; **relative paths are not typed** (use `useSegments()` to build absolute ones).
* `experiments.typedRoutes` must be `true` (beta).

### 2.10 Forward-compatibility (SDK 58 behaviours to adopt now) `[E:router-migrate-57-58.md]`

| Write code so that… | Because in SDK 58 |
| --- | --- |
| every tab is declared with `<Tabs.Screen name>` | navigators show only declared screens |
| no `redirect`/`initialParams`/`navigationKey` props | removed; use `<Redirect>` and param defaults |
| `unstable_settings.anchor`, never `initialRouteName` | prop removed |
| `useRouter()` not `useNavigation().navigate()` | state built from hrefs |
| no `freezeOnBlur` | no effect; `activityEnabled` replaces it |
| `expo-router/js-tabs` import | root `Tabs` deprecated already in 57 |

---

## 3. UI libraries

### 3.1 Reanimated 4.5.1 + Worklets 0.10.1 `[E:reanimated.md]`

Install via `npx expo install react-native-reanimated react-native-worklets`. "No additional configuration is required. Reanimated Babel plugin is automatically configured in `babel-preset-expo`" — confirmed: `babel-preset-expo` passes `reanimated`/`worklets` platform options `[NM:expo/node_modules/babel-preset-expo/build/index.js:141-142]`. Do **not** add `react-native-reanimated/plugin` manually. Reanimated is incompatible with "Remote JS Debugging" — use Hermes + the Hermes inspector (press `j`) `[E:reanimated.md]`, `[E+:guides/using-hermes]`. API: `useSharedValue`, `useAnimatedStyle`, `withTiming/withSpring`, `Animated.View`, layout animations `[EXT:Reanimated docs index]`.

### 3.2 Gesture Handler 2.32 `[E:gesture-handler.md]`

Expo delegates to the library docs; the installed source enforces: `GestureDetector` throws in dev unless rendered under `GestureHandlerRootView` (not on web) `[NM:react-native-gesture-handler/src/handlers/gestures/GestureDetector/index.tsx:92-95]`. Wrap the root layout once (§2.2).

### 3.3 FlashList 2.0.2 `[NM:@shopify/flash-list/README.md]`, `[EXT:FlashList "What's new in v2"]`, `[NM:@shopify/flash-list/dist/FlashListProps.d.ts]`

* v2 is **New Architecture only** and JS-only (no native deps) — fine for SDK 57.
* **No size estimates**: `estimatedItemSize`, `estimatedListSize`, `estimatedFirstItemOffset` are "No longer used" (deprecated) and are absent from the installed `FlashListProps.d.ts`. `overrideItemLayout` only sets `span`.
* New: `masonry` + `optimizeItemArrangement` (grids with varying heights), `onStartReached`/`onStartReachedThreshold`, `maintainVisibleContentPosition` (enabled by default; `startRenderingFromBottom` for chats), `useLayoutState`, `useRecyclingState(initial, deps)`, `useMappingHelper`, `LayoutCommitObserver`, RTL layout support, precise `scrollToIndex`.
* Avoid `padding` on `style`; use `contentContainerStyle`. Pair with `expo-image` `recyclingKey` (§3.4).

### 3.4 expo-image 57.0.5 `[E:image.md]`

| Prop | Default | Use |
| --- | --- | --- |
| `source` | – | URL string, `require()`, `{ uri, width, height, cacheKey, headers }`, array of sources (best fit chosen), `sf:` symbols (iOS) |
| `placeholder` | – | `{ blurhash }` or `{ thumbhash }` or image; blurhash default decode size 16×16 (set `width/height` small) |
| `placeholderContentFit` | `scale-down` | set equal to `contentFit` to avoid flicker |
| `contentFit` | `cover` | `cover | contain | fill | none | scale-down` |
| `contentPosition` | `center` | object-position equivalent |
| `transition` | – | number (ms, cross-dissolve) or `{ duration, effect, timing }`; **Android supports only `cross-dissolve`** |
| `cachePolicy` | `disk` | `none | disk | memory | memory-disk` |
| `recyclingKey` | `null` | reset view when recycled in FlashList — set to the item id |
| `priority` | `normal` | `low | normal | high` |
| `allowDownscaling` | `true` | keep on; large assets downscaled to view size |
| `blurRadius`, `tintColor` | – | not applied to placeholders |
| `onLoad/onError/onDisplay` | – | events |

Static helpers: `Image.prefetch(urls, 'memory-disk')`, `Image.clearDiskCache()`, `Image.generateBlurhashAsync(source, [4,3])`, `Image.generateThumbhashAsync`. Generate blurhashes server-side at upload time (Lambda with `sharp` + `blurhash`, components 1–9) and store on the record.

```tsx
<Image source={{ uri: coverUrl, cacheKey: coverPath }} placeholder={{ blurhash: item.coverBlurhash }}
       placeholderContentFit="cover" contentFit="cover" transition={200} recyclingKey={item.id}
       cachePolicy="memory-disk" style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 20 }} />
```

### 3.5 expo-linear-gradient `[E:linear-gradient.md]`

`<LinearGradient colors={['rgba(90,0,32,0.85)', 'transparent'] as const} start={{x:0,y:1}} end={{x:0,y:0}} locations={[0, 1]} />` — `colors` needs ≥2 entries typed `as const`; `locations` ascending 0–1; `dither` (Android, default true). RN's experimental `experimental_backgroundImage: 'linear-gradient(...)'` style is an alternative without the dependency.

### 3.6 expo-blur on Android `[E:blur-view.md]`

* Default `blurMethod='none'` on Android renders a **semi-transparent view, not a blur**. For a real blur wrap the content in `<BlurTargetView ref={targetRef}>` and pass `blurTarget={targetRef}` + `blurMethod="dimezisBlurView"` (or `"dimezisBlurViewSdk31Plus"` to blur only on Android 12+ and fall back to `none` on older devices for performance).
* `intensity` 1–100 (default 50; animatable with Reanimated); `blurReductionFactor` (Android, default 4) to match iOS look; `tint` `light | dark | default | extraLight | regular | prominent | system*Material*`.
* `borderRadius` is not applied directly — use `overflow: 'hidden'` on the BlurView.
* Render the `BlurView` **after** dynamic content (`FlatList`), otherwise it does not refresh.

### 3.7 lucide-react-native 1.52 `[NM:lucide-react-native/package.json]`, `[NM:lucide-react-native/dist/esm/icons/house.mjs]`, `[NM:lucide-react-native/dist/types/lucide-react-native.d.ts]`

* `exports`: `"."` (all icons), `"./icons"` (icons index), `"./icons/*"` → `./dist/esm/icons/*.mjs` (react-native/import conditions) with types `./dist/types/icons/*.d.ts`. `sideEffects: false`.
* Deep import form (one module per icon, default export): `import House from 'lucide-react-native/icons/house';` — the module exports `{ __iconData, House as default }`. Named import form: `import { House, Scissors, Dumbbell, Stethoscope } from 'lucide-react-native';`. 3,734 icon modules; aliases exist (e.g. `house` has alias `home`).
* Props: `LucideProps extends SvgProps` with `size?: string | number`, `color`, `strokeWidth`, `absoluteStrokeWidth?: boolean` (default 24 px / stroke 2). Requires `react-native-svg` ^12–^15 peer (installed 15.15.4) and React 16.5–19.

### 3.8 react-native-svg 15.15 `[E:svg.md]`

`import Svg, { Path, Circle, Rect } from 'react-native-svg'`; keep the `viewBox` for Android; convert brand SVGs with SVGR (`--native --typescript`).

### 3.9 Safe areas, system bars, edge-to-edge `[E:safe-area-context.md]`, `[E+:develop/user-interface/safe-areas]`, `[E+:develop/user-interface/system-bars]`

* Use `useSafeAreaInsets()` for custom headers/tab bars; `SafeAreaView` (`edges` prop) for simple screens. Insets are needed on Android because of edge-to-edge (status bar and gesture nav draw over content).
* Status bar: `<StatusBar style="light" />` from `expo-status-bar` on maroon surfaces, `"dark"` on cream. Android navigation bar styling via `expo-navigation-bar` (`NavigationBar.setStyle`) — note the docs warn the **Android 15 emulator has a bug** where these calls may have no effect `[E+:versions/v57.0.0/sdk/navigation-bar]`.
* `KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}`; with bottom tabs set `android.softwareKeyboardLayoutMode: 'pan'` or `tabBarHideOnKeyboard` `[E+:guides/keyboard-handling]`. For multi-field forms the docs recommend `react-native-keyboard-controller` (dev build required) — not installed.

### 3.10 Haptics / storage utilities

`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.{Light|Medium|Heavy|Rigid|Soft})`, `Haptics.notificationAsync(Haptics.NotificationFeedbackType.{Success|Warning|Error})`, `Haptics.selectionAsync()` `[E:haptics.md]`. SecureStore: `setItemAsync/getItemAsync/deleteItemAsync`, `keychainAccessible` default `WHEN_UNLOCKED` `[E:securestore.md]`. AsyncStorage/NetInfo are Amplify peer requirements `[A:quickstart.txt]`.

---

## 4. Notifications (expo-notifications 57.0.21)

### 4.1 Hard constraints

| Constraint | Source |
| --- | --- |
| "Push notifications (remote notifications)… unavailable in **Expo Go on Android** from SDK 53. A development build is required." Local notifications still work in Expo Go. | `[E:notifications.md]` |
| Works on physical devices, Android emulators **with Google Play services**, iOS simulators on Xcode 14+ (macOS 13+). | `[E:notifications.md]`, `[E:push-setup.md]` |
| Android 13+: the permission prompt **does not appear until at least one notification channel exists**; `setNotificationChannelAsync` must be called **before** `getExpoPushTokenAsync`/`getDevicePushTokenAsync`. | `[E:notifications.md]` |
| Android ≥ 8 requires a channel; without one Expo creates "Miscellaneous". `RECEIVE_BOOT_COMPLETED` is added automatically; `SCHEDULE_EXACT_ALARM` only for exact-time schedules. | `[E:notifications.md]` |
| iOS: no usage string needed; interpret `ios.status` (`NOT_DETERMINED | DENIED | AUTHORIZED | PROVISIONAL | EPHEMERAL`) rather than the root `status`. APNs entitlement is always `development` in the project; Xcode flips it for archives. | `[E:notifications.md]` |
| `projectId` = `Constants.expoConfig.extra.eas.projectId` (set by `eas init`); token attribution survives account renames. | `[E:push-setup.md]`, `[E:constants.md]` |
| Credentials: **Android FCM V1 service-account key** uploaded to EAS ("Add Android FCM V1 credentials" guide; `google-services.json` sender id must match), **iOS APNs key** generated by `eas build`/`eas credentials` (paid Apple developer account). | `[E:push-setup.md]`, `[E:push-sending.md]` (MismatchSenderId/InvalidCredentials) |
| Handler must answer within 3 s or the notification is dropped; default without handler = not shown in foreground. | `[E:notifications.md]` |

### 4.2 Registration flow (copy of the documented example, adapted) `[E:push-setup.md]`

```ts
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({            // module scope
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {   // BEFORE requesting token
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,              // 7
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5A0020',
    });
    await Notifications.setNotificationChannelAsync('bookings', { name: 'حجوزاتك', importance: Notifications.AndroidImportance.HIGH });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return undefined;
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) throw new Error('Project ID not found');       // run `eas init`
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;   // "ExponentPushToken[...]"
  } catch (e) { /* offline: retry later */ return undefined; }
}
```
Also subscribe `Notifications.addPushTokenListener(token => …)` to re-register rolled tokens, and persist the token on the user's `Device`/`Profile` record (Data) keyed by `userId`.

### 4.3 Listeners `[E:notifications.md]`

`addNotificationReceivedListener(cb)` (foreground receipt), `addNotificationResponseReceivedListener(cb)` (user tapped; `response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER`), `addNotificationsDroppedListener`, `useLastNotificationResponse()` (hook; `undefined` until known, `null` if none), `getLastNotificationResponse()`/`clearLastNotificationResponseAsync()`. Every listener returns an `EventSubscription` with `.remove()`.

### 4.4 Deep link from a notification with Expo Router (documented pattern) `[E:notifications.md]`

```tsx
function useNotificationObserver() {
  useEffect(() => {
    const redirect = (n: Notifications.Notification) => {
      const url = n.request.content.data?.url;         // e.g. "/bookings/42"
      if (typeof url === 'string') router.push(url);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) redirect(last.notification);
    const sub = Notifications.addNotificationResponseReceivedListener(r => redirect(r.notification));
    return () => sub.remove();
  }, []);
}
```

### 4.5 Sending via Expo Push API (from a Lambda) `[E:push-sending.md]`

`POST https://exp.host/--/api/v2/push/send` with headers `accept: application/json`, `accept-encoding: gzip, deflate`, `content-type: application/json`; body = one message or an **array of ≤100 messages for the same project**; limits **600 notifications/s/project**, payload ≤ **4096 bytes**; optional `Authorization: Bearer <access token>` once "enhanced push security" is enabled. Use `expo-server-sdk-node` (chunking, gzip, backoff) or raw fetch.

| Field | Platform | Notes |
| --- | --- | --- |
| `to` | both | token or token array |
| `title`, `body`, `subtitle` (iOS) | both | |
| `data` | both | JSON ≤ ~4 KiB; we put `{ url: '/bookings/42', type: 'BOOKING_CONFIRMED' }` |
| `sound` | iOS | `'default'` or custom `.wav` name configured in plugin |
| `badge` | iOS | number |
| `channelId` | Android | must exist on device (e.g. `'bookings'`), else not displayed; null → "Default" channel auto-created |
| `priority` | both | `default | normal | high` (Android normal may be delayed in doze) |
| `ttl` / `expiration` | both | seconds / epoch |
| `collapseId`, `tag` (Android), `threadId` (iOS) | | grouping/replacement |
| `richContent: { image }` | both | Android out of the box; iOS needs a Notification Service Extension |
| `categoryId`, `interruptionLevel`, `mutableContent`, `contentAvailable` | | advanced |

Response = push **tickets** (`status: ok | error`, `id`); fetch **receipts** via `POST https://exp.host/--/api/v2/push/getReceipts` `{ ids: [...] }` (≤1000 ids) ~15 min later; receipts expire after 24 h. Handle `DeviceNotRegistered` (stop sending to that token), `MessageTooBig`, `MessageRateExceeded` (backoff), `MismatchSenderId`/`InvalidCredentials` (credentials), request errors `TOO_MANY_REQUESTS`, `PUSH_TOO_MANY_EXPERIENCE_IDS`, `PUSH_TOO_MANY_NOTIFICATIONS`.

---

## 5. Maps and location

### 5.1 react-native-maps 1.27.2 — provider rules `[E:map-view.md]`, `[EXT:react-native-maps docs/installation.md]`, `[NM:react-native-maps/src/ProviderConstants.ts]`

* `PROVIDER_DEFAULT = undefined` → **Apple Maps on iOS**, **Google Maps on Android (always)**; `PROVIDER_GOOGLE = 'google'` → Google on both (iOS then needs `iosGoogleMapsApiKey`, the GoogleMaps pod and iOS ≥ 14).
* **Android renders a blank map without a valid `com.google.android.geo.API_KEY`** (restricted to `android.package` + SHA-1). Expo Go needs no setup; store builds do.
* "If you are trying to mount the map with the GOOGLE_PROVIDER during runtime, but your build has been configured for the Apple Maps backend, a runtime exception will be raised" → keep `provider={undefined}` on iOS unless the iOS key is configured.
* Google Maps Platform needs a billing account.

### 5.2 `MapView` props we need `[EXT:react-native-maps docs/mapview.md]`

| Prop | Default | Notes |
| --- | --- | --- |
| `provider` | undefined | see above |
| `initialRegion` / `region` / `initialCamera` / `camera` | – | `region = { latitude, longitude, latitudeDelta, longitudeDelta }`; use `initialRegion` when not controlling the viewport |
| `mapType` | `standard` | `standard | none (not MapKit) | satellite | hybrid | terrain | mutedStandard (iOS) | satelliteFlyover/hybridFlyover (Apple)` |
| `customMapStyle` | – | Google JSON style array (premium muted palette) — Google provider only |
| `googleMapId` | – | cloud-based styling id (Google only) |
| `userInterfaceStyle` | system | `'light' | 'dark'` |
| `showsUserLocation` | false | **requires runtime location permission first, otherwise fails silently** |
| `showsMyLocationButton` | true | |
| `followsUserLocation` | false | Apple Maps only |
| `toolbarEnabled` | true | Android: hides "Navigate/Open in Maps" buttons when false |
| `showsCompass`, `rotateEnabled`, `pitchEnabled`, `loadingEnabled`, `moveOnMarkerPress` (Android) | | |
| `mapPadding` | – | keep markers clear of our floating UI |
| `minZoomLevel`/`maxZoomLevel` (0–20; deprecated on Apple → `cameraZoomRange`) | | |
| `onMapReady`, `onRegionChangeComplete(region, { isGesture })`, `onPress`, `onLongPress`, `onMarkerPress` | | `isGesture` Google only |

`Marker` `[EXT:docs/marker.md]`: `coordinate`, `title`/`description` (default callout when no `<Callout>` child), `image` (local resources only), `icon` (Google only), `pinColor`, `anchor` (default `(0.5, 1)`), `centerOffset`, `onPress({ coordinate, position })`, `onCalloutPress`, `draggable`, `zIndex`, `opacity`, `tracksViewChanges` (default **true**; **disable for many custom-view markers and call `redraw()` manually** — documented performance warning), `identifier`.

### 5.3 `UrlTile` overlay (verified from source) `[NM:react-native-maps/src/MapUrlTile.tsx]`, `[NM:react-native-maps/src/index.ts]`

Exports: `UrlTile` (alias `MapUrlTile`), `WMSTile`, `LocalTile`, `Polyline`, `Polygon`, `Circle`, `Heatmap`, `Callout`, `Geojson`, `MAP_TYPES`.

| `UrlTile` prop | iOS | Android | Notes |
| --- | --- | --- | --- |
| `urlTemplate` (required) | ✓ | ✓ | `https://tiles.example/{z}/{x}/{y}.png`; `file:///…/{z}/{x}/{y}.png` for local |
| `minimumZ`, `maximumZ` | ✓ | ✓ | zoom bounds |
| `maximumNativeZ` | Apple Maps only | ✓ | highest zoom server provides; auto-scaled above |
| `flipY` | ✓ | ✓ | TMS tiles |
| `tileSize` | Apple Maps only | ✓ | 256 default; 512 retina |
| `doubleTileSize` | ✗ | ✓ | |
| `opacity` | Apple Maps only | ✓ | 0–1 |
| `shouldReplaceMapContent` | Apple Maps only | ✗ | hide base map |
| `tileCachePath`, `tileCacheMaxAge`, `offlineMode` | Apple Maps only | ✓ | client manages cache |
| `zIndex` | | | layering |

Several props are **"Apple Maps only" on iOS** — if the design needs tile styling parity, prefer Google's `customMapStyle` on Android plus Apple's `mutedStandard` on iOS instead of tile overlays.

### 5.4 Location permission + position `[E:location.md]`

```ts
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();   // 'granted' | 'denied' | 'undetermined'
if (status !== 'granted') { /* show CTA; iOS: user must enable in Settings */ }
const quick = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });      // fast, may be null/stale
const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); // default Balanced
// fix.coords: { latitude, longitude, accuracy (m), altitude, heading, speed }, fix.timestamp (ms)
```

| `Location.Accuracy` | Value | Documented accuracy |
| --- | --- | --- |
| `Lowest` | 1 | ~3 km |
| `Low` | 2 | ~1 km |
| `Balanced` (default) | 3 | ~100 m — enough for "nearby salons" |
| `High` | 4 | ~10 m |
| `Highest` | 5 | best available |
| `BestForNavigation` | 6 | navigation apps |

Other options: `distanceInterval` (m), `timeInterval` (Android ms), `mayShowUserSettingsDialog` (Android). `getCurrentPositionAsync` "may take several seconds"; `hasServicesEnabledAsync()` checks the OS toggle. Emulator: enable **Settings → Location → Use location** and turn off "Improve Location Accuracy" if fixes don't arrive. Foreground/background *services* are not available in Expo Go for Android. `watchPositionAsync(options, cb)` returns a subscription with `remove()`.

### 5.5 Distance computation **[GUIDANCE — not from the docs; expo-location has no distance API]**

Haversine on the client for the "nearest" sort (Qatar is small; a planar approximation would also work but haversine is exact enough and cheap):

```ts
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
```
Store `location: { lat, lng }` (custom type, §8) on `Company`; pre-filter server-side by `city` via a secondary index, then sort by `haversineKm` in the app (DynamoDB has no geo queries; a geohash prefix field + `beginsWith` sort key is the documented-compatible way to narrow further).

---

## 6. Amplify (aws-amplify 6.22.1) inside Expo RN

### 6.1 Expo Go is not supported `[A:quickstart.txt]`

"Amplify now requires native modules not available through the Expo SDK. As a result, Expo Go is no longer supported." → `npx expo prebuild` + `npx expo run:android` (dev build). Node ≥ 18.17 required for the backend tooling (we have 24).

### 6.2 Dependencies and polyfills `[A:quickstart.txt]`, `[A:auth-setup.txt]`, `[NM:@aws-amplify/react-native/package.json]`, `[NM:@aws-amplify/core/dist/esm/utils/*/index.native.mjs]`

Documented install list: `aws-amplify`, `@aws-amplify/react-native`, `@react-native-community/netinfo`, `@react-native-async-storage/async-storage`, `react-native-safe-area-context`, `react-native-get-random-values`, `react-native-url-polyfill` (all present). `@aws-amplify/react-native` declares `react-native-get-random-values >= 1.8.0` as a peer dependency and depends on `react-native-url-polyfill ^3`.

Verified behaviour: Amplify's native entry points call `loadUrlPolyfill()` (= `require('react-native-url-polyfill/auto')`) and `loadGetRandomValues()` (= `require('react-native-get-random-values')`) **themselves** the first time `aws-amplify` is imported (`[NM:@aws-amplify/core/dist/esm/utils/amplifyUrl/index.native.mjs]`, `[NM:…/globalHelpers/index.native.mjs]`), throwing a "MissingPolyfill"-style error if the packages are absent. Explicit `import 'react-native-get-random-values'; import 'react-native-url-polyfill/auto';` at the very top of the custom entry (§1.5) is therefore optional but harmless and guarantees `crypto.getRandomValues`/`URL` exist before any of our own code runs. `Amplify.configure(outputs)` must run "as early as possible… A missing configuration or NoCredentials error is thrown if `Amplify.configure` has not been called before other Amplify JavaScript APIs" `[A:storage-setup.txt]`.

### 6.3 Data client `[A:fetched_build-a-backend_data_connect-to-API.txt]`, `[A:data-authz*.txt]`

```ts
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../amplify/data/resource';

export const guestClient = generateClient<Schema>({ authMode: 'identityPool' }); // allow.guest() rules
export const userClient  = generateClient<Schema>({ authMode: 'userPool' });     // owner/group/authenticated rules
// or per request:
await userClient.models.Booking.create(input, { authMode: 'userPool' });
```
`authMode` values (type `GraphQLAuthMode`): `'apiKey' | 'oidc' | 'userPool' | 'iam' | 'identityPool' | 'lambda' | 'none'` `[NM:@aws-amplify/core/dist/esm/singleton/API/types.d.ts]`. Rule → mode mapping: `publicApiKey→apiKey`, `guest→identityPool`, `owner/ownerDefinedIn/authenticated/group(s)→userPool`, `authenticated('identityPool')→identityPool`. Guest access is **enabled by default** in Gen 2 (identity pool unauthenticated role) `[A:fetched_…guest-access.txt]`. Errors are returned in `errors`, not thrown (`[A:data-mutate.txt]`).

Reads: `list({ filter, limit (default 100), nextToken, selectionSet, authMode })`, `get({ id }, { selectionSet })`, secondary-index queries `listCompanyByCityAndCategory({ city, category: { beginsWith } })`; cancel with `client.cancel(promise)`. Writes: `create/update/delete` (never send `createdAt/updatedAt`). Lazy relations: `const { data: services } = await company.services()`; eager: `selectionSet: ['id', 'services.*']` `[A:data-query.txt]`, `[A:data-relationships.txt]`.

Real-time `[A:data-subscribe.txt]`: `client.models.Booking.observeQuery({ filter, selectionSet }).subscribe({ next: ({ items, isSynced }) => … })` (paginates everything, emits `isSynced` true when complete — use for the company's live booking board), `onCreate/onUpdate/onDelete({ filter })`; auth needs `read` or `listen`; mutations on related models do not trigger parent subscriptions ("touch" the parent); connection state via `Hub.listen('api', …)` with `CONNECTION_STATE_CHANGE` and `ConnectionState` from `aws-amplify/data` — refetch when going `Connecting → Connected`.

### 6.4 Storage from an `expo-image-picker` asset `[A:storage-upload.txt]`, `[A:storage-download.txt]`, `[NM:@aws-amplify/storage/dist/esm/types/inputs.d.ts]`

`uploadData({ path, data, options })` where `data: Blob | ArrayBufferView | ArrayBuffer | string` (verified type `StorageUploadDataPayload`). Documented RN-compatible ways to get bytes from a picker `uri`:

```ts
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
if (!result.canceled) {
  const asset = result.assets[0];                       // { uri, width, height, mimeType, fileName, fileSize }
  // Option A (Expo's with-aws-storage-upload example): fetch → blob
  const blob = await (await fetch(asset.uri)).blob();
  // Option B (expo-file-system 57: File implements Blob): new File(uri).arrayBuffer()
  const bytes = await new File(asset.uri).arrayBuffer();

  const task = uploadData({
    path: ({ identityId }) => `companies/${identityId}/cover-${Date.now()}.jpg`,  // {entity_id} rule (§8.4)
    data: blob,                                        // or bytes
    options: {
      contentType: asset.mimeType ?? 'image/jpeg',
      onProgress: ({ transferredBytes, totalBytes }) => totalBytes && setPct(Math.round(transferredBytes / totalBytes * 100)),
      metadata: { width: String(asset.width), height: String(asset.height) },
    },
  });
  const { path } = await task.result;                  // store `path` on the Data record
  const { url, expiresAt } = await getUrl({ path, options: { expiresIn: 3600, validateObjectExistence: false } });
}
await remove({ path: oldCoverPath });
```
Facts: multipart upload is automatic above 5 MB; uploads older than 1 h are cancelled (set an S3 lifecycle rule for incomplete multiparts); `getUrl` presigned URL default **900 s**, max **1 hour** ("dependent on the session"); `getUrl` does not check existence unless `validateObjectExistence: true`; `downloadData({ path }).result.body.blob()|text()|json()`; `isCancelError`, `task.pause()/resume()/cancel()`. `File.arrayBuffer()` verified in `[NM:expo-file-system/build/File.d.ts]` ("`class File … implements Blob`", "The constructor accepts an array of strings that are joined to create the file URI"). The `fetch(uri).blob()` pattern is from Expo's own AWS example (`https://github.com/expo/examples/tree/master/with-aws-storage-upload`, linked from `[E:imagepicker.md]`).

---

## 7. Amplify Auth flows for OneQ

### 7.1 Backend `defineAuth` — combined phone OTP + email/password + groups + triggers

Types verified in `[NM:@aws-amplify/auth-construct/lib/types.d.ts]` and `[NM:@aws-amplify/backend-auth/lib/factory.d.ts]`: `loginWith.email: true | EmailLoginSettings({ otpLogin?, verificationEmailStyle, verificationEmailBody, verificationEmailSubject, userInvitation })`, `loginWith.phone: true | { otpLogin?, verificationMessage }`, `loginWith.webAuthn`, `groups: string[]`, `triggers: Partial<Record<TriggerEvent, fn>>` with events `createAuthChallenge, customMessage, defineAuthChallenge, postAuthentication, postConfirmation, preAuthentication, preSignUp, preTokenGeneration, userMigration, verifyAuthChallengeResponse`, `access: (allow) => [allow.resource(fn).to([...])]`, `senders.email | senders.sms`, `userAttributes`, `accountRecovery`, `multifactor`, `passwordlessOptions.preferredChallenge`. "Enabling passwordless login via otpLogin automatically enables the ALLOW_USER_AUTH authentication flow in your Cognito App Client" (type doc comment). Docs show enabling several passwordless methods together `[A:auth-passwordless.txt]`.

```ts
// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';
import { adminCreateCompanyUser } from '../functions/admin-create-company-user/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,                       // email + password (PASSWORD_SRP) for companies/admins
    phone: { otpLogin: true },         // phone + password AND passwordless SMS OTP for customers
  },
  groups: ['ADMINS', 'COMPANIES', 'CUSTOMERS'],
  triggers: { postConfirmation },
  access: (allow) => [
    allow.resource(postConfirmation).to(['addUserToGroup']),
    allow.resource(adminCreateCompanyUser).to(['createUser', 'addUserToGroup', 'setUserPassword']),
  ],
  // Only after SES production access + verified sender:
  // senders: { email: { fromEmail: 'no-reply@oneq.qa', fromName: 'OneQ', replyTo: 'support@oneq.qa' } },
  // accountRecovery: 'EMAIL_ONLY',   // keyof cognito.AccountRecovery
});
```

**Cognito immutability — decide before the first `ampx sandbox` of the real pool** `[A:auth-attributes.txt "Before you build"]`: sign-in methods (username/email/phone) and required attributes **cannot be added or changed after initial configuration**; "Required attributes must have a value for all users once set"; verification methods cannot be removed. The construct's default is "email/phone will be added as required user attributes if they are included as login methods" (`userAttributes` doc comment, `[NM:auth-construct types]`), and with both email and phone as login options the **account verification channel and password-recovery channel is Email** (`[A:auth-signup.txt]`, `[A:fetched_…manage-passwords.txt]` tables: "email and phone → Email"). Consequence: with the combined config every sign-up must supply **both** `email` and `phone_number`, and the sign-up confirmation code goes to **email**, not SMS. If customers must register with a phone number only and confirm by SMS, use `loginWith: { phone: { otpLogin: true } }` only (email as an optional, non-login attribute) — see Open question Q1. The sandbox "drops and recreates the user pool" on unsupported modifications (all users lost) `[A:sandbox.txt]`.

Production messaging `[A:auth-production.txt]`: SES starts in **sandbox** (only verified recipients) → request production access (answer within 24 h) → verify sender → `senders.email.fromEmail`. SMS: **request an origination number**; while the account is in the SNS **SMS sandbox** add each destination phone number (Pinpoint console → SMS and voice → Destination phone numbers); check status in SNS console → Text messaging (SMS). `senders.sms` type is `UserPoolSnsOptions | CustomSmsSender` (CDK). **MFA and passwordless cannot be combined** for the same user `[A:auth-passwordless.txt]`.

### 7.2 Client flows (exact APIs + `nextStep` values, verified in `[NM:@aws-amplify/auth/dist/esm/types/models.d.ts]`)

| API | `nextStep` key | Values |
| --- | --- | --- |
| `signUp` | `signUpStep` | `CONFIRM_SIGN_UP`, `DONE`, `COMPLETE_AUTO_SIGN_IN` |
| `confirmSignUp` | `signUpStep` | same |
| `signIn` / `confirmSignIn` | `signInStep` | `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED`, `CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE`, `CONFIRM_SIGN_IN_WITH_TOTP_CODE`, `CONFIRM_SIGN_IN_WITH_SMS_CODE`, `CONFIRM_SIGN_IN_WITH_EMAIL_CODE`, `CONFIRM_SIGN_IN_WITH_PASSWORD`, `CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION`, `CONTINUE_SIGN_IN_WITH_MFA_SELECTION`, `CONTINUE_SIGN_IN_WITH_MFA_SETUP_SELECTION`, `CONTINUE_SIGN_IN_WITH_TOTP_SETUP`, `CONTINUE_SIGN_IN_WITH_EMAIL_SETUP`, `RESET_PASSWORD`, `CONFIRM_SIGN_UP`, `DONE` |
| `resetPassword` | `resetPasswordStep` | `CONFIRM_RESET_PASSWORD_WITH_CODE`, `DONE` |

`authFlowType`: `'USER_AUTH' | 'USER_SRP_AUTH' | 'CUSTOM_WITH_SRP' | 'CUSTOM_WITHOUT_SRP' | 'USER_PASSWORD_AUTH'`; `preferredChallenge` (`AuthFactorType`): `'WEB_AUTHN' | 'EMAIL_OTP' | 'SMS_OTP' | 'PASSWORD' | 'PASSWORD_SRP'` `[NM:@aws-amplify/auth/dist/esm/providers/cognito/types/models.d.ts]`. `signUp.password` is optional in the type (`password?: string` — "may be required depending on your Cognito User Pool configuration") `[NM:@aws-amplify/auth/dist/esm/types/inputs.d.ts]`.

**(a) Phone sign-up with SMS code + auto sign-in** `[A:auth-signup.txt]`

```ts
import { signUp, confirmSignUp, autoSignIn } from 'aws-amplify/auth';

const { nextStep } = await signUp({
  username: '+97455512345',                               // E.164
  // password: optional for passwordless pools; required if the pool enforces password policy for sign-up
  options: {
    userAttributes: { phone_number: '+97455512345', name: 'سارة' },
    autoSignIn: { authFlowType: 'USER_AUTH' },           // enables COMPLETE_AUTO_SIGN_IN
  },
});
if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
  console.log(nextStep.codeDeliveryDetails.deliveryMedium, nextStep.codeDeliveryDetails.destination); // 'SMS', '+***2345'
}
const { nextStep: c } = await confirmSignUp({ username: '+97455512345', confirmationCode: '123456' });
if (c.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
  const { nextStep: s } = await autoSignIn();
  if (s.signInStep === 'DONE') { /* signed in */ }
}
```

**(b) Passwordless SMS OTP sign-in** `[A:auth-signin.txt]`, `[A:fetched_…switching-authentication-flows.txt]`

```ts
import { signIn, confirmSignIn } from 'aws-amplify/auth';

const { nextStep } = await signIn({
  username: '+97455512345',
  options: { authFlowType: 'USER_AUTH', preferredChallenge: 'SMS_OTP' },
});
if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
  const { nextStep: done } = await confirmSignIn({ challengeResponse: '123456' });
  if (done.signInStep === 'DONE') { /* tokens stored */ }
}
if (nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION') {
  // preferred challenge unavailable for this user; nextStep.availableChallenges lists options
  await confirmSignIn({ challengeResponse: 'SMS_OTP' });
}
```
"You must call `confirmSignIn` in the same app session as you call `signIn`" `[A:auth-signin.txt]`.

**(c) Email + password (companies/admins)** `[A:auth-signin.txt]`

```ts
const { nextStep } = await signIn({
  username: 'owner@salon.qa', password,
  options: { authFlowType: 'USER_AUTH', preferredChallenge: 'PASSWORD_SRP' }, // or default USER_SRP_AUTH without options
});
switch (nextStep.signInStep) {
  case 'DONE': break;
  case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':   // admin-created user with temporary password
    await confirmSignIn({ challengeResponse: newPassword }); break;
  case 'CONFIRM_SIGN_UP': /* unconfirmed → confirmSignUp */ break;
  case 'RESET_PASSWORD': /* resetPassword */ break;
}
```

**(d) Reset / change password** `[A:fetched_…manage-passwords.txt]`

```ts
import { resetPassword, confirmResetPassword, updatePassword } from 'aws-amplify/auth';
const { nextStep } = await resetPassword({ username: 'owner@salon.qa' });
if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') { /* nextStep.codeDeliveryDetails.deliveryMedium */ }
await confirmResetPassword({ username: 'owner@salon.qa', confirmationCode: '123456', newPassword });
await updatePassword({ oldPassword, newPassword });   // signed-in user
```
Default password policy: min 8, upper+lower+number+symbol, temp password validity 3 days; override via `backend.auth.resources.cfnResources.cfnUserPool.policies.passwordPolicy` in `backend.ts`.

**(e) Session, roles, sign-out, events** `[A:auth-sessions.txt]`, `[A:data-authz-groups.txt]`, `[A:fetched_…tokens-and-credentials.txt]`, `[A:fetched_…sign-out.txt]`, `[A:fetched_…listen-to-auth-events.txt]`, `[NM:@aws-amplify/core/dist/esm/Hub/types/AuthTypes.d.ts]`

```ts
import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const session = await fetchAuthSession();                       // auto-refreshes; { forceRefresh: true } to force
const groups = (session.tokens?.idToken?.payload['cognito:groups'] as string[] | undefined) ?? [];
// docs read the claim from accessToken.payload; it is present on BOTH tokens ("cognito:groups" claim)
const role = groups.includes('ADMINS') ? 'ADMINS' : groups.includes('COMPANIES') ? 'COMPANIES' : 'CUSTOMERS';
const { username, userId /* sub */, signInDetails } = await getCurrentUser(); // throws when signed out
await signOut();                 // local; { global: true } revokes refresh tokens on all devices (access/ID tokens stay valid ≤1 h)

const stop = Hub.listen('auth', ({ payload }) => {
  switch (payload.event) {       // 'signedIn' | 'signedOut' | 'tokenRefresh' | 'tokenRefresh_failure' |
    case 'signedIn': case 'signedOut': case 'tokenRefresh': case 'tokenRefresh_failure': /* update zustand store */ break;
  }                              // 'signInWithRedirect' | 'signInWithRedirect_failure' | 'customOAuthState'
});
stop();                          // unsubscribe
```
Guests (not signed in) still get an identity-pool `identityId` from `fetchAuthSession()` — this is what `allow.guest()` and `{entity_id}` storage paths use.

### 7.3 Post-confirmation trigger → add to `CUSTOMERS` (full handler) `[A:fn-add-to-group.txt]`

```ts
// amplify/auth/post-confirmation/resource.ts
import { defineFunction } from '@aws-amplify/backend';
export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  environment: { GROUP_NAME: 'CUSTOMERS' },
  resourceGroupName: 'auth',
});
```
```ts
// amplify/auth/post-confirmation/handler.ts
import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { env } from '$amplify/env/post-confirmation';

const client = new CognitoIdentityProviderClient();

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const command = new AdminAddUserToGroupCommand({
    GroupName: env.GROUP_NAME,
    Username: event.userName,
    UserPoolId: event.userPoolId,
  });
  const response = await client.send(command);
  console.log('processed', response.$metadata.requestId);
  return event;
};
```
Install: `npm add --save-dev @aws-sdk/client-cognito-identity-provider @types/aws-lambda` (the Cognito client is **not** installed yet). The trigger "will not be triggered for federated sign-ins". To also create a `Profile` record, use `getAmplifyDataClientConfig(env)` + `generateClient<Schema>()` inside the handler with `.authorization(allow => [allow.resource(postConfirmation)])` on the schema `[A:fn-post-confirm.txt]`.

### 7.4 Admin creates a company account (`AdminCreateUser` from a function) `[A:fetched_…with-admin-actions.txt]`, `[A:fetched_…grant-access-to-auth-resources.txt]`

Access actions available (installed type): `manageUsers, manageGroupMembership, manageGroups, manageUserDevices, managePasswordRecovery, addUserToGroup, createUser (cognito-idp:AdminCreateUser — "create new users and send welcome messages via email or SMS"), deleteUser, deleteUserAttributes, disableUser, enableUser, forgetDevice, getDevice, getUser, listDevices, listGroupsForUser, removeUserFromGroup, resetUserPassword, setUserMfaPreference, setUserPassword, setUserSettings, updateDeviceStatus, updateUserAttributes` `[NM:@aws-amplify/backend-auth/lib/types.d.ts]`. Granting access injects `env.AMPLIFY_AUTH_USERPOOL_ID` into the function.

```ts
// amplify/functions/admin-create-company-user/resource.ts
import { defineFunction } from '@aws-amplify/backend';
export const adminCreateCompanyUser = defineFunction({ name: 'admin-create-company-user', resourceGroupName: 'auth' });
```
```ts
// amplify/data/resource.ts (excerpt) — only ADMINS may call it
adminCreateCompanyUser: a.mutation()
  .arguments({ email: a.email().required(), companyId: a.id().required(), temporaryPassword: a.string() })
  .returns(a.json())
  .authorization((allow) => [allow.group('ADMINS')])
  .handler(a.handler.function(adminCreateCompanyUser)),
```
```ts
// amplify/functions/admin-create-company-user/handler.ts
import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/admin-create-company-user';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient();
export const handler: Schema['adminCreateCompanyUser']['functionHandler'] = async (event) => {
  const { email, companyId, temporaryPassword } = event.arguments;
  const created = await client.send(new AdminCreateUserCommand({
    UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID,
    Username: email,
    TemporaryPassword: temporaryPassword ?? undefined,          // Cognito emails an invitation (SES limits apply)
    UserAttributes: [{ Name: 'email', Value: email }, { Name: 'email_verified', Value: 'true' }, { Name: 'custom:companyId', Value: companyId }],
    DesiredDeliveryMediums: ['EMAIL'],
  }));
  await client.send(new AdminAddUserToGroupCommand({ UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID, Username: email, GroupName: 'COMPANIES' }));
  return { sub: created.User?.Attributes?.find(a => a.Name === 'sub')?.Value };
};
```
(Custom attribute `custom:companyId` must be declared in `userAttributes` with the `custom:` prefix `[NM:auth-construct types UserAttributes]`.) The first sign-in of such a user returns `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED`. The invitation email template is customisable via `loginWith.email.userInvitation.{emailSubject, emailBody, smsMessage}`.

---

## 8. Amplify Data (Gen 2) patterns

### 8.1 Schema building blocks `[A:data-fields.txt]`, `[A:data-index.txt]`, `[A:data-relationships.txt]`, `[A:fetched_…identifiers.txt]`, `[A:data-authz*.txt]`

| Construct | Notes |
| --- | --- |
| Scalars | `a.id() a.string() a.integer() a.float() a.boolean() a.date() a.time() a.datetime() a.timestamp() a.email() a.json() a.phone() a.url() a.ipAddress()` |
| Modifiers | `.required()`, `.array()`, `.default(v)` (optional scalars only, not required/arrays/relations/custom types), field-level `.authorization()` |
| Enums | inline `a.enum([...])` or named + `a.ref('Name')`; client: `client.enums.BookingStatus.values()` |
| Custom types | inline `a.customType({...})` or named + `a.ref()`; no `.authorization()` on custom types |
| Identifiers | `.identifier(['field'])` / composite; default `id` auto-UUID |
| Secondary indexes | `.secondaryIndexes(index => [index('hashField').sortKeys(['f1']).queryField('listByX').name('GSI').projection('ALL'|'KEYS_ONLY'|'INCLUDE', [...])])` → client `listModelByHashFieldAndF1({ hashField, f1: { beginsWith|eq|gt|ge|lt|le|between } })`; hash key = strict equality only |
| Relationships | `a.hasMany('Child','parentId')` + `a.belongsTo('Parent','parentId')`; `hasOne` + `belongsTo`; many-to-many via join model; reference field type must match the identifier; required reference ⇒ relationship cannot be nulled |
| Timestamps | `createdAt`/`updatedAt` auto-managed |

Authorization strategies (rules are OR-ed; deny by default; field-level rules replace model-level ones) `[A:data-authz.txt]`:

| Rule | authMode | Notes |
| --- | --- | --- |
| `allow.publicApiKey()` | `apiKey` | key expires (`apiKeyAuthorizationMode.expiresInDays`) — avoid for production public reads |
| `allow.guest()` | `identityPool` | recommended public access (unauthenticated role) |
| `allow.authenticated()` | `userPool` (or `authenticated('identityPool')`) | any signed-in user |
| `allow.owner()` / `allow.ownerDefinedIn('field')` / `allow.ownersDefinedIn('field')` | `userPool` | owner field auto-filled with **`<sub>::<username>`**; authorizes against full value or `sub`/`username` separately; protect the owner field with a field-level rule to prevent reassignment |
| `allow.group('ADMINS')` / `allow.groups([...])` / `groupDefinedIn` / `groupsDefinedIn` | `userPool` | static/dynamic groups (dynamic: subscriptions limited to ≤5 single-group / ≤20 multi-group memberships) |
| `allow.resource(fn).to(['query','mutate','listen'])` | – | **schema-level only** (not per model) — grants a Lambda data access |
| `allow.custom()` | `lambda` | custom authorizer |
| `.to([...])` operations | | `create`, `read` (= get+list), `update`, `delete`, `get`, `list`, `listen` |

Dynamic rules (`owner*`, `group(s)DefinedIn`) are not allowed on custom queries/mutations (static rules only). IAM auth is always enabled for the console's data manager.

```ts
// amplify/data/resource.ts — OneQ core (illustrative, every construct above is documented)
import { type ClientSchema, a, defineData, defineFunction } from '@aws-amplify/backend';
import { postConfirmation } from '../auth/post-confirmation/resource';
import { adminCreateCompanyUser } from '../functions/admin-create-company-user/resource';
import { expireHolds } from '../functions/expire-holds/resource';

export const createBookingFn = defineFunction({ name: 'create-booking', entry: './create-booking/handler.ts', resourceGroupName: 'data' });

const schema = a.schema({
  Category: a.enum(['SALON', 'GYM', 'CLINIC', 'HOME_SERVICE']),
  BookingStatus: a.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  GeoPoint: a.customType({ lat: a.float().required(), lng: a.float().required() }),

  Company: a.model({
    nameAr: a.string().required(),
    nameEn: a.string().required(),
    category: a.ref('Category'),
    categoryKey: a.string().required(),           // GSI hash key (mirror of the enum value)
    city: a.string().required(),                  // 'Doha' | 'Al Rayyan' | ...
    location: a.ref('GeoPoint'),
    geohash: a.string(),                          // for beginsWith narrowing
    openingHours: a.json(),                       // { sat: [['09:00','21:00']], ... }
    tags: a.string().array(),
    coverPath: a.string(),                        // S3 path from uploadData
    coverBlurhash: a.string(),
    ratingAvg: a.float().default(0),
    ratingCount: a.integer().default(0),
    isActive: a.boolean().default(true),
    ownerSub: a.string().required(),              // used by ownerDefinedIn
    ownerId: a.string().required(),               // plain sub, for GSI queries (see Q3)
    services: a.hasMany('Service', 'companyId'),
    bookings: a.hasMany('Booking', 'companyId'),
  })
  .secondaryIndexes((index) => [
    index('categoryKey').sortKeys(['city']).queryField('listCompaniesByCategoryAndCity'),
    index('ownerId').queryField('listCompaniesByOwner'),
  ])
  .authorization((allow) => [
    allow.guest().to(['read']),
    allow.authenticated().to(['read']),
    allow.ownerDefinedIn('ownerSub').to(['read', 'update']),
    allow.group('ADMINS'),
  ]),

  Service: a.model({
    companyId: a.id().required(),
    company: a.belongsTo('Company', 'companyId'),
    nameAr: a.string().required(), nameEn: a.string().required(),
    priceQar: a.integer().required(), durationMin: a.integer().required(),
    isActive: a.boolean().default(true),
    ownerSub: a.string().required(),
  })
  .secondaryIndexes((index) => [index('companyId').queryField('listServicesByCompany')])
  .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.ownerDefinedIn('ownerSub'), allow.group('ADMINS')]),

  Booking: a.model({
    companyId: a.id().required(),
    company: a.belongsTo('Company', 'companyId'),
    serviceId: a.id().required(),
    customerSub: a.string().required(),           // owner (customer)
    companyOwnerSub: a.string().required(),       // owner (company) — second owner rule
    startsAt: a.datetime().required(),
    endsAt: a.datetime().required(),
    status: a.ref('BookingStatus'),
    statusKey: a.string().required(),
    notes: a.string(),
    priceQar: a.integer().required(),
  })
  .secondaryIndexes((index) => [
    index('companyId').sortKeys(['startsAt']).queryField('listBookingsByCompanyAndDate'),
    index('customerSub').sortKeys(['startsAt']).queryField('listBookingsByCustomer'),
  ])
  .authorization((allow) => [
    allow.ownerDefinedIn('customerSub').to(['read']),
    allow.ownerDefinedIn('companyOwnerSub').to(['read', 'update']),
    allow.group('ADMINS'),
  ]),

  // Custom mutation handled by a Lambda (slot validation, pricing, idempotency)
  createBooking: a.mutation()
    .arguments({ serviceId: a.id().required(), startsAt: a.datetime().required(), notes: a.string() })
    .returns(a.ref('Booking'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(createBookingFn)),

  adminCreateCompanyUser: a.mutation()
    .arguments({ email: a.email().required(), companyId: a.id().required(), temporaryPassword: a.string() })
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(adminCreateCompanyUser)),
})
// Function access is schema-level only:
.authorization((allow) => [
  allow.resource(createBookingFn).to(['query', 'mutate']),
  allow.resource(expireHolds).to(['query', 'mutate']),
  allow.resource(postConfirmation).to(['mutate']),
]);

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },  // 'iam'|'identityPool'|'userPool'|'oidc'|'apiKey'|'lambda'
});
```
`DefaultAuthorizationMode` values verified in `[NM:@aws-amplify/backend-data/lib/types.d.ts]`.

### 8.2 Function handler for the custom mutation `[A:data-custom-logic.txt]`, `[A:fetched_…grant-lambda-function-access-to-api.txt]`, `[A:fn-secrets.txt]`

```ts
// amplify/data/create-booking/handler.ts
import type { Schema } from '../resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/create-booking';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

export const handler: Schema['createBooking']['functionHandler'] = async (event) => {
  const { serviceId, startsAt, notes } = event.arguments;                 // typed from .arguments()
  const customerSub = (event.identity as { sub?: string } | undefined)?.sub; // Cognito identity on AppSync event
  const { data: service } = await client.models.Service.get({ id: serviceId });
  // ...validate slot via listBookingsByCompanyAndDate, compute endsAt...
  const { data: booking, errors } = await client.models.Booking.create({ /* ... */ });
  if (errors?.length) throw new Error(errors[0].message);
  return booking;                                                          // typed from .returns(a.ref('Booking'))
};
```
Rules: all handlers of one `.handler()` must be the same kind; `a.handler.function(fn).async()` for fire-and-forget (returns `EventInvocationResponse`, no `.returns()`); `a.handler.custom({ dataSource: a.ref('Model'), entry })` for AppSync JS resolvers (no cold start). The `$amplify/env/<name>` import is provided by `.amplify/generated/env/<name>.ts` and the `"$amplify/*": ["../.amplify/generated/*"]` path already present in `[P:amplify/tsconfig.json]`; the file is generated by `ampx sandbox`. Environment: `defineFunction({ environment: { KEY: 'value', SECRET: secret('NAME') } })`; create secrets with `npx ampx sandbox secret set NAME`; never put secrets in plain `environment`. Function defaults `[A:fetched_…configure-functions.txt]`: timeout **3 s** (`timeoutSeconds` up to 900), memory **512 MB** (`memoryMB` 128–10240), `runtime` Node version — installed type `NodeVersion = 18 | 20 | 22 | 24` (docs: "defaults to the oldest LTS supported by Lambda") → set `runtime: 22` explicitly; `resourceGroupName: 'auth' | 'data' | 'storage' | 'function' | custom` groups resources (used by the docs' DDB-stream and post-confirmation examples to avoid cross-stack cycles).

### 8.3 Scheduled function, DynamoDB stream, Cognito grants `[A:fn-schedule.txt]`, `[A:fn-ddb-stream.txt]`, `[A:fn-grant.txt]`

```ts
// amplify/functions/expire-holds/resource.ts
import { defineFunction } from '@aws-amplify/backend';
export const expireHolds = defineFunction({ name: 'expire-holds', schedule: 'every 5m', resourceGroupName: 'data' });
// schedule: 'every 1h' | 'every day' | 'every week' | cron '0 17 ? * 3 *' | array of both
// handler: import type { EventBridgeHandler } from 'aws-lambda'; export const handler: EventBridgeHandler<'Scheduled Event', null, void> = async (event) => {...}
```

```ts
// amplify/backend.ts — Booking table stream → notify-booking Lambda (copied from the docs, table renamed)
import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { Policy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { StartingPosition, EventSourceMapping } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { notifyBooking } from './functions/notify-booking/resource';   // defineFunction({ name: 'notify-booking', resourceGroupName: 'data' })

const backend = defineBackend({ auth, data, storage, notifyBooking });

const bookingTable = backend.data.resources.tables['Booking'];
const policy = new Policy(Stack.of(bookingTable), 'NotifyBookingStreamingPolicy', {
  statements: [new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:ListStreams'],
    resources: ['*'],
  })],
});
backend.notifyBooking.resources.lambda.role?.attachInlinePolicy(policy);

const mapping = new EventSourceMapping(Stack.of(bookingTable), 'NotifyBookingEventStreamMapping', {
  target: backend.notifyBooking.resources.lambda,
  eventSourceArn: bookingTable.tableStreamArn,
  startingPosition: StartingPosition.LATEST,
});
mapping.node.addDependency(policy);

// Other documented backend.ts hooks:
// backend.auth.resources.cfnResources.cfnUserPool.policies = { passwordPolicy: {...} }
// backend.auth.resources.cfnResources.cfnIdentityPool.allowUnauthenticatedIdentities = false  // disable guests
// backend.auth.resources.groups['ADMINS'].role  (IAM role per group)
// backend.someFn.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ['sns:Publish'], resources: [topic.topicArn] }))
```
Handler type: `DynamoDBStreamHandler` from `aws-lambda`; return `{ batchItemFailures: [] }`; `record.eventName === 'INSERT' | 'MODIFY' | 'REMOVE'`, `record.dynamodb?.NewImage` (DynamoDB JSON — unmarshall with `@aws-sdk/util-dynamodb`). This is where the Expo push call (§4.5) lives. Cognito admin permissions for functions are granted with `defineAuth({ access })` (§7.4) rather than raw IAM.

### 8.4 Storage access rules — public read + company-only write `[A:fetched_…storage_authorization.txt]`, `[A:storage-setup.txt]`, `[NM:@aws-amplify/backend-storage/lib/types.d.ts]`

```ts
// amplify/storage/resource.ts
import { defineStorage } from '@aws-amplify/backend';
import { createBookingFn } from '../data/resource';

export const storage = defineStorage({
  name: 'oneqMedia',
  access: (allow) => ({
    // Public catalogue media written only by company owners (per-identity folders) and admins
    'companies/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),   // uploader (identityId) owns the folder
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.groups(['COMPANIES', 'ADMINS']).to(['read']),         // group members do NOT inherit `authenticated`
    ],
    // Company media writable by the whole COMPANIES group (path convention: company-media/<companyId>/...)
    'company-media/*': [
      allow.groups(['COMPANIES']).to(['read', 'write', 'delete']),
      allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
    ],
    'avatars/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read']),
      allow.groups(['CUSTOMERS', 'COMPANIES', 'ADMINS']).to(['read']),
    ],
    'reports/*': [allow.resource(createBookingFn).to(['read', 'write'])],   // function access → env <name>_BUCKET_NAME
  }),
});
```
Documented rules that constrain the layout: paths must end with `/*` and must not start with `/`; **only one level of nesting** along a path (`media/*` and `media/albums/*` ok; not a third level); a wildcard path cannot conflict with an `{entity_id}` path (`media/*` + `media/{entity_id}/*` is invalid) and a path cannot be a prefix of another with `{entity_id}`; sub-path permissions **override** (do not inherit) parent permissions; `{entity_id}` is replaced by the **identity-pool identityId** on write and by `*` for guest/authenticated/group rules (so "write"/"delete" stay owner-scoped while "read" is public); **"When a user is part of a group, they are assigned the group role, which means permissions defined for the authenticated role will not apply"** — every group needs explicit rules; actions `read` = `get`+`list` (`getUrl, downloadData, list, getProperties`), `write` = `uploadData, copy`, `delete` = `remove`; `read` cannot be combined with `get`/`list`. Sandbox always deletes the bucket on `sandbox delete` (`keepOnDelete` applies to deployed branches only).

### 8.5 Sandbox / CLI `[A:fetched_reference_cli-commands.txt]`, `[A:sandbox.txt]`, `[A:fetched_start_account-setup.txt]`

| Command | Purpose |
| --- | --- |
| `npx ampx sandbox` | deploy personal stack `amplify-<app>-<whoami>-sandbox`, watch `amplify/`, hot-swap; writes `amplify_outputs.json` to cwd |
| `npx ampx sandbox --once` | single deployment, no watch (CI / scripts) |
| `npx ampx sandbox --outputs-out-dir <dir>` / `--outputs-format json` / `--outputs-version 1` | control outputs file location/format (keep at project root for Expo) |
| `npx ampx sandbox --profile <name>` / `AWS_PROFILE=<name>` / `AWS_REGION=me-south-1 npx ampx sandbox` | profile / region selection (region otherwise from the profile) |
| `npx ampx sandbox --identifier <name>` | several sandboxes per developer |
| `npx ampx sandbox --stream-function-logs --logs-filter notify` | tail Lambda logs |
| `npx ampx sandbox delete [-y]` | destroy the sandbox stack |
| `npx ampx sandbox secret set|get|list|remove NAME` | secrets for `secret('NAME')` |
| `npx ampx generate outputs --stack <name>` / `--app-id --branch` | outputs for another environment |
| `npx ampx pipeline-deploy --branch --app-id` | CI deploy |
| `npx ampx info` | diagnostics |

Account setup: configure an AWS profile (SSO via `aws configure sso` or keys) with the `AmplifyBackendDeployFullAccess` managed policy; first `ampx sandbox` in a region triggers **CDK bootstrap** (one-time, needs admin in the console). GSI changes in sandbox **drop and recreate the table** (data loss); unsupported Cognito changes recreate the user pool. Backend code must be ESM (`amplify/package.json` `{ "type": "module" }` — already present `[P:amplify/package.json]`).

---

## 9. Pitfalls checklist

| # | Pitfall | What to do | Source |
| --- | --- | --- | --- |
| 1 | `I18nManager.forceRTL()` only applies after a **restart**; `Updates.reloadAsync()` **rejects in Expo Go and dev builds**. | Language toggle: `I18nManager.allowRTL(rtl); I18nManager.forceRTL(rtl);` then `Updates.reloadAsync()` in release; in dev show "reload from the dev menu" and catch the rejection. Persist the choice (AsyncStorage) and apply before render. Also pass `direction` to `<LocaleProvider>` so navigation flips without restart. Expo Go resets RTL prefs. | `[E:localization-guide.md]`, `[E+:versions/v57.0.0/sdk/updates]`, `[NM:react-native/Libraries/ReactNative/I18nManager.js]` |
| 2 | `textAlign` default is physical left, not "start". | Always set `textAlign: 'left'` (maps to start in RTL) in the shared `Text` component; use `start/end`, `marginStart`, `paddingEnd`. | `[E:localization-guide.md]` |
| 3 | Arabic locales format digits as Arabic-Indic (`١٬٢٣٤٫٥`). | Use `Intl.NumberFormat('ar-QA', { numberingSystem: 'latn' })` or locale `'ar-QA-u-nu-latn'` (verified in Node ICU: `1,234.5`; `ar` date `05/10/2026`). Verify once on Hermes (Android) and iOS. **[GUIDANCE]** | Node ICU test (this session) |
| 4 | Android map is blank without a valid Google key / wrong SHA-1. | Configure `androidGoogleMapsApiKey`, restrict to `com.mastajazz.oneQapp` + debug & Play SHA-1s; rebuild (`prebuild --clean`). | `[E:map-view.md]` |
| 5 | `showsUserLocation` fails silently without runtime permission. | Request `Location.requestForegroundPermissionsAsync()` first. | `[EXT:mapview.md]` |
| 6 | FlashList v2 API: no `estimatedItemSize`; recycled rows show stale images. | Remove estimates; set `recyclingKey` on `expo-image`; use `useRecyclingState` for per-row state. | `[EXT:FlashList v2]`, `[E:image.md]` |
| 7 | Edge-to-edge on Android: content under status/nav bars. | `useSafeAreaInsets()` everywhere; keep `SafeAreaProvider`; never rely on `statusBarTranslucent`/`navigationBarColor` (deprecated). | `[E+:system-bars]`, `[E:router-sdk.md]` |
| 8 | Keyboard pushes the tab bar up (Android). | `softwareKeyboardLayoutMode: 'pan'` and/or `tabBarHideOnKeyboard: true`; `KeyboardAvoidingView behavior` `padding` on iOS, `undefined` on Android. | `[E+:keyboard-handling]` |
| 9 | Typed routes missing in CI / fresh clone. | Run `npx expo start` once or `npx expo customize tsconfig.json`; keep `.expo/types` + `expo-env.d.ts` in `include`. Relative hrefs are untyped. | `[E+:typed-routes]` |
| 10 | Large images / memory. | Keep `allowDownscaling` on, request sized URLs, `cachePolicy: 'memory-disk'` only for hero images, `Image.clearMemoryCache()` on memory warnings; blurhash placeholders. | `[E:image.md]` |
| 11 | Amplify in Expo Go crashes ("MissingPolyfill"/native modules). | Always use a dev build; `@aws-amplify/react-native` + polyfill packages must be installed. | `[A:quickstart.txt]`, `[NM:@aws-amplify/core native entries]` |
| 12 | `Amplify.configure` after first API call → `NoCredentials`. | Configure in the custom entry before `expo-router/entry`. | `[A:storage-setup.txt]` |
| 13 | Cognito sign-in options are immutable; email+phone login forces both attributes and email verification. | Decide the login model before the real deployment (Q1); test in a throwaway sandbox first. | `[A:auth-attributes.txt]`, `[A:auth-signup.txt]` |
| 14 | SNS SMS sandbox: codes only reach registered numbers; SES sandbox: emails only to verified addresses. | Register test numbers / verified emails for the sandbox; request production access + origination number before launch. | `[A:auth-production.txt]` |
| 15 | `confirmSignIn` must happen in the same app session as `signIn`. | Keep OTP entry in-app; do not restart between steps. | `[A:auth-signin.txt]` |
| 16 | Group members do not get `authenticated` storage permissions. | Add explicit `allow.groups([...])` rules to every path. | `[A:storage authorization]` |
| 17 | Owner field stores `sub::username`, hash-key queries need exact match. | Keep a separate plain `ownerId`/`customerSub` field for GSIs (Q3). | `[A:fetched_data_owner.txt]` |
| 18 | Sandbox GSI/user-pool changes recreate tables/pools (data loss). | Seed scripts; never share one sandbox; avoid renaming indexes casually. | `[A:sandbox.txt]` |
| 19 | Push: no channel ⇒ no Android 13 permission prompt / no token; Expo Go Android cannot receive remote push; emulator must have Google Play. | Create channels before token request; use dev build on `Medium_Phone_API_36.1` **with Play services image**. | `[E:notifications.md]` |
| 20 | Splash looks wrong in Expo Go/dev builds; Android debug launch from push breaks splash. | Judge splash only in preview/release (`npx expo run:android --variant release`). | `[E:splash-screen.md]`, `[E:notifications.md]` |
| 21 | `expo-blur` on Android is just a tinted view by default. | Use `BlurTargetView` + `blurMethod`; `overflow: 'hidden'` for radius; render after lists. | `[E:blur-view.md]` |
| 22 | `Stack.Protected` has no `redirectTo` in SDK 57; fallback = anchor/first screen. | Order screens so the intended fallback is first; keep `(auth)` group first when logged out. | `[E:router-protected.md]`, `[NM:Protected.d.ts]` |
| 23 | Root `Tabs` import deprecated. | `import { Tabs } from 'expo-router/js-tabs'`. | `[NM:expo-router/build/exports.d.ts]` |
| 24 | Windows: `ANDROID_HOME`/`platform-tools` not on PATH; stale Metro/haste caches in `%LOCALAPPDATA%\Temp`. | Follow §1.6; `npx expo start --clear`. Keep the project path short and ASCII-only and do not convert `android/gradlew`/`*.sh` to CRLF (Gradle wrapper scripts are POSIX). **[GUIDANCE — not in Expo docs]** | `[E+:set-up-your-environment]`, `[E+:clear-cache-windows]` |
| 25 | `.env` ignored by EAS Build → missing Maps key. | Add `.easignore` mirroring `.gitignore` but **not** excluding `.env`; or use EAS environment variables. | `[E:map-view.md]` |
| 26 | Android 15 emulator bug: `expo-navigation-bar` calls may do nothing. | Test nav-bar styling on a device / API 36 image. | `[E+:navigation-bar]` |
| 27 | `presentation: 'formSheet'` on Android: no native header/nested stack inside the sheet, max 3 detents. | Render sheet titles/actions in content; ≤3 detents. | `[E:router-modals.md]` |
| 28 | Reanimated with "Remote JS Debugging" breaks. | Use Hermes DevTools (`j` in the terminal). | `[E:reanimated.md]` |

---

## 10. Open questions (docs ambiguous or silent)

| # | Question | Why it matters / what we know |
| --- | --- | --- |
| Q1 | **Login model**: can `loginWith: { email: true, phone: { otpLogin: true } }` keep `email` optional for phone-only customers (`userAttributes: { email: { required: false } }`), and will sign-up confirmation then go to SMS? | Docs say email+phone ⇒ verification/recovery channel is **Email** and both attributes become required by default; overriding `required` for a login attribute is not documented. Validate in a disposable sandbox before committing (pools are immutable). Alternative: phone-only login with email as optional attribute, companies also signing in by phone, or two pools. |
| Q2 | Does `signUp` without `password` succeed when `email: true` (password auth) is also enabled on the pool? | Type allows `password?`; docs show password-less `signUp` only in the passwordless examples. |
| Q3 | Exact stored value/returned value of `ownerDefinedIn` fields when the client sets `ownerSub` explicitly to `sub` (not `sub::username`). | Docs: field is auto-populated as `<sub>::<username>`; authorization accepts `sub` or `username` separately and "return username". Safer to query via a separate plain `ownerId` field. |
| Q4 | Behaviour of `allow.entity('identity')` for users who belong to a group (group role replaces the authenticated role). | Docs state the group-role override only for the `authenticated` rule. Test uploads as a COMPANIES member to `companies/{entity_id}/*`. |
| Q5 | `expo-font` Form B on iOS: does `fontFamily: 'IBM Plex Sans Arabic'` + `fontWeight` select the Medium/SemiBold static faces? | Docs demonstrate it for Inter Bold; verify the actual family name with `getLoadedFonts()`. Form A avoids the question. |
| Q6 | Hermes `Intl` numbering-system support on Android for `numberingSystem: 'latn'`. | Verified on Node ICU only; Expo docs only say `Intl` is available with Hermes. |
| Q7 | `animationDuration` default: 350 ms (stack guide) vs 500 ms (SDK reference). | Set it explicitly where it matters. |
| Q8 | `presentation: 'formSheet'` on Android: SDK reference says "fallback to modal", modals guide (newer) says native bottom sheet with detents. | Follow the modals guide; confirm on the API 36 emulator. |
| Q9 | `useBottomTabBarHeight` import path in SDK 57 (docs mention it without a path). | Our custom tab bar makes it unnecessary (use a shared constant + `insets.bottom`). |
| Q10 | `senders.sms` (`UserPoolSnsOptions`) exact fields — the CDK type was not located in the installed `aws-cdk-lib` typings during this pass. | Consult the aws-cdk-lib `UserPool` docs when configuring an SNS external id / caller role; the docs' prescribed path is console origination-number setup. |
| Q11 | Push credentials in a non-EAS (local `expo run:android`) workflow. | Docs route credentials through EAS (`eas credentials`, FCM V1 upload); plan to `eas init` + upload FCM service-account key even if builds stay local. |
| Q12 | Edge-to-edge opt-out: no documented app-config key in SDK 57; generated `gradle.properties` has `edgeToEdgeEnabled=true`. | Design for edge-to-edge; do not attempt to disable. |
