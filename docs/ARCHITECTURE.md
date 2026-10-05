# OneQ — Architecture & Build Contract

This document is the single source of truth for building the OneQ mobile app. Every engineer/agent working on a slice of the app must follow it. Design details of the reference apps live in `docs/spec/*.md`; this file defines structure, contracts and rules.

## 1. Product summary

OneQ (وان كيو) is a premium Arabic-first (RTL) booking marketplace for Qatar: salons, gyms, clinics, home services, construction & design. One app binary, three workspaces selected by the Cognito group of the signed-in user:

| Workspace | Cognito group | Design reference | Entry |
|---|---|---|---|
| Customer (default, also guest) | `CUSTOMERS` (or no session = guest) | Link 1 — `docs/spec/REF1_CUSTOMER_APP.md` + boot/onboarding/login in `docs/spec/REF2_CUSTOMER_AND_BOOT.md` | `/(customer)/(tabs)` |
| Company (business owner) | `COMPANIES` | Link 2 owner workspace — `docs/spec/REF2_OWNER_WORKSPACE.md` | `/(company)/(tabs)` |
| Admin (OneQ operations) | `ADMINS` | Same design language as company workspace | `/(admin)/(tabs)` |

Brand: maroon `#5A0020` on cream/white, IBM Plex Sans Arabic (Arabic), Outfit (Latin + numbers), Playfair Display (Latin display/wordmark). Logo files in `assets/brand/`. Currency: QAR, shown as `ر.ق` (AR) / `QAR` (EN), always Latin digits.

## 2. Stack (installed, do not change versions without reason)

Expo SDK 57 (`expo@57.0.26`), React Native 0.86.3, React 19.2.3, Expo Router 57.0.24, Reanimated 4.5.1 + Worklets 0.10.1, Gesture Handler 2.32, Screens 4.26, Safe Area Context 5.7, expo-image, expo-font (config plugin), expo-splash-screen, expo-linear-gradient, expo-blur, expo-haptics, expo-location, react-native-maps 1.27, expo-notifications, expo-device, expo-image-picker, expo-secure-store, expo-localization, expo-updates, expo-sharing, expo-web-browser, expo-clipboard, expo-file-system, @shopify/flash-list 2.0, react-native-svg 15, lucide-react-native 1.52 (deep imports only), @tanstack/react-query 5, zustand 5, dayjs, aws-amplify 6.22 + @aws-amplify/react-native, async-storage, netinfo, react-native-get-random-values, react-native-url-polyfill, @aws-amplify/backend 1.25 (Gen 2).

Hermes + New Architecture are on by default in SDK 57. Expo Go is NOT supported (Amplify + maps + notifications need native modules): always use a development build (`npx expo run:android` / `run:ios`) or EAS.

TypeScript strict. Path alias `@/*` → `src/*`.

## 3. Directory layout

```
app.json                      Expo config (plugins: router, splash, fonts, notifications, location, picker, maps, localization)
src/app/                      Expo Router routes ONLY (screens are thin: compose features)
src/features/<domain>/        Screens' UI + hooks per domain (customer-home, catalog, booking, gifts, loyalty, map, orders, profile, auth, company-*, admin-*)
src/components/ui/            Design system primitives (see §5)
src/components/shared/        Composite components reused across workspaces (CompanyCard, PriceTag, RatingStars, StatusPill, EmptyState, Skeletons…)
src/theme/                    tokens.ts (colors, spacing, radii, shadows, typography), ThemeProvider + useTheme
src/i18n/                     ar.ts, en.ts, index.ts (t(), useI18n, formatMoney, formatDate, plural helpers)
src/domain/types.ts           ALL entity types (contract — see file)
src/data/repository.ts        Repository interfaces (contract — see file)
src/data/mock/                MockRepository + seed data (Doha) + persistence to AsyncStorage
src/data/amplify/             AmplifyRepository (AppSync/Cognito/S3 implementation of the same interfaces)
src/data/index.ts             `repo` singleton + mode selection (mock | amplify)
src/store/                    zustand stores: session (auth/role/guest/lang/onboarded), ui (toasts, sheets), booking draft, gift draft
src/lib/                      amplify.ts (configure), notifications.ts, location.ts, geo.ts (haversine, sorting), whatsapp.ts, storage.ts, analytics.ts, validators.ts, phone.ts (+974 normalisation)
src/assets/                   images, lottie-free SVG components (Logo, Monogram, BootGlyph)
amplify/                      Gen 2 backend: auth, data, storage, functions
docs/                         this file, specs, runbooks
```

## 4. Navigation map (Expo Router, `src/app`)

```
_layout.tsx                      Providers (GestureHandlerRootView, SafeAreaProvider, QueryClientProvider, ThemeProvider, I18nProvider, SessionProvider), font loading, splash hide, push listeners, Stack with Protected groups
index.tsx                        Boot screen (animated, replicates docs/reference/ref-splash.png) → routes to onboarding | (auth)/welcome | workspace
onboarding.tsx                   3 slides (first launch only) → welcome
(auth)/_layout.tsx               Stack (slide animations)
(auth)/welcome.tsx               Link-1 style splash: الدخول برقم الجوال / الدخول بالإيميل / المتابعة كضيف
(auth)/phone.tsx                 Phone entry (+974)
(auth)/otp.tsx                   6-digit code, resend timer, auto-submit
(auth)/email.tsx                 Email + password (ref-login design, segmented toggle to phone)
(auth)/signup.tsx                Name + phone (+ optional email/password)
(auth)/forgot.tsx                Reset password
(customer)/_layout.tsx           Stack; guests allowed everywhere here (actions gated by requireAuth())
(customer)/(tabs)/_layout.tsx    Custom tab bar: index(الرئيسية) · gifts(هدايا) · map(الخريطة) · orders(طلباتي) · profile(حسابي)
(customer)/(tabs)/index.tsx      Home
(customer)/(tabs)/gifts.tsx      Gifts hub (received / sent / send)
(customer)/(tabs)/map.tsx        Map + nearest list with category filter
(customer)/(tabs)/orders.tsx     Bookings + subscriptions (segmented)
(customer)/(tabs)/profile.tsx    Profile hub
(customer)/category/[id].tsx     Subcategory grid + company list (link-1 clinics page)
(customer)/companies.tsx         All companies list with sort chips (?categoryId&sub&sort&area)
(customer)/company/[id].tsx      Company details
(customer)/staff/[id].tsx        Staff profile (doctor/trainer/employee) with ratings
(customer)/booking/[companyId].tsx  Booking wizard (see §7.4)
(customer)/booking/success.tsx
(customer)/order/[id].tsx        Booking details + rate company/staff
(customer)/subscription/[id].tsx Subscription tracking
(customer)/gift/send.tsx         Gift wizard (points | service | product)
(customer)/gift/[id].tsx         Gift details / claim
(customer)/loyalty.tsx           Points, tier, history, redeem explanation
(customer)/search.tsx            Dynamic search (debounced, grouped results)
(customer)/notifications.tsx
(customer)/favorites.tsx
(customer)/settings.tsx · language.tsx · help.tsx · privacy.tsx · edit-profile.tsx · addresses.tsx
(company)/_layout.tsx            Protected: role === 'company'
(company)/(tabs)/_layout.tsx     index(الرئيسية) · bookings(الحجوزات) · catalog(الخدمات والمنتجات) · staff(الطاقم) · more(المزيد)
(company)/service/[id].tsx (new|id) · product/[id].tsx · staff/[id].tsx · offers.tsx · subscriptions.tsx · reviews.tsx · analytics.tsx · media.tsx · hours.tsx · location.tsx · profile.tsx · notifications.tsx · booking/[id].tsx
(admin)/_layout.tsx              Protected: role === 'admin'
(admin)/(tabs)/_layout.tsx       index(لوحة التحكم) · companies(الشركات) · bookings(الحجوزات) · categories(الفئات) · more(المزيد)
(admin)/company/[id].tsx (new|id) · category/[id].tsx (new|id) · performance.tsx · notifications.tsx · customers.tsx · booking/[id].tsx
+not-found.tsx
```

Guarding: root `_layout` uses `<Stack.Protected guard={role==='company'}>` for `(company)` and `guard={role==='admin'}` for `(admin)`. After sign-in, `session.landingRoute()` returns `/(admin)/(tabs)` | `/(company)/(tabs)` | `/(customer)/(tabs)` from the `cognito:groups` claim.

Guest gating: any customer action that needs identity (book, send gift, favorite, rate, redeem points, write address) calls `requireAuth()` from `src/store/session.ts`, which opens the **phone sign-in sheet** (bottom sheet: phone → OTP) and resolves `true` once signed in; the caller then continues the action. Browsing never requires auth.

## 5. Design system (`src/components/ui`)

Two palettes from one token file (`src/theme/tokens.ts`):
- `customer` palette (link 1): canvas `#FFFFFF`, section `#F8F9FA`, primary `#5A0020`, primary gradient `#5A0020→#7A1F3D`, pink tint `#FBE8ED`, ink `#1C263B`, muted `#6B7280`, line `#EEF0F3`, success `#16A34A`, warning `#F5A623` (stars), danger `#DC2626`, tag colors (featured `#1C263B`, studentDiscount `#9B59B6`, specialOffer `#FF6B35`, insurance `#16A34A`, open `#22C55E`).
- `workspace` palette (link 2): canvas `#F7F0EA`, surface `#FFFCF7`, sand `#F1E7DD`, sandDeep `#E8DACE`, line `#E7DBD1`, lineStrong `#D6C5B8`, primary `#5A0020`, primaryDark `#45001A`, primaryDeep `#2A000F`, primaryTint `#F3E6E6`, ink `#231A18`, charcoal `#151010`, muted `#6F625D`, faint `#A89C96`, gold `#9A4516`, goldTint `#F7E8DC`, success `#2F6B40` / `#E3EFE5`, danger `#A3302F` / `#F6E3E1`.
- Radii: xs 8, sm 12, input 14, md 16, card 20, media 24, sheet 28, pill 999. Spacing scale 4-based. Shadows: card `0 6 18 rgba(42,0,15,0.06)`, elevated `0 12 32 rgba(42,0,15,0.12)`.
- Typography (`fontFamily` names = file basenames registered by the expo-font plugin): Arabic UI `IBMPlexSansArabic-{Regular,Medium,SemiBold,Bold}`; numbers/Latin `Outfit-{Regular,Medium,SemiBold,Bold}`; display Latin `PlayfairDisplay-{SemiBold,Bold}`. `<Text>` wrapper picks the family by language + `variant` (display, h1 28/34, h2 22/28, h3 18/24, title 16/22, body 15/22, bodySm 13/18, caption 12/16, overline 11/14 uppercase-tracking for Latin), and `numeric` prop forces Outfit.

Primitives (all RTL-aware, themed via `useTheme()`): `Text`, `Screen` (safe area + background + optional maroon header), `Header` (title, back, right actions, link-1 rounded maroon header variant and workspace flat variant), `Button` (primary/secondary/outline/ghost/danger/soft; sizes sm/md/lg; loading; icon), `IconButton`, `Icon` (central map over lucide deep imports, e.g. `import House from 'lucide-react-native/icons/house'`), `Card`, `Chip` (selectable), `SegmentedControl`, `Input` (label, icon, error, RTL, secure, phone with +974 prefix), `Select` (sheet-based), `TextArea`, `Switch`, `Checkbox`, `Avatar` (image or initials), `Badge`/`Tag`, `StatusPill`, `RatingStars` (display + interactive), `PriceTag` (old price strike-through + new price + "يبدأ من"), `ProgressBar`, `RingProgress` (SVG), `Skeleton` (shimmer, Reanimated), `EmptyState`, `BottomSheet` (gesture, Reanimated; no third-party), `Toast` (store-driven), `Divider`, `ListRow`, `SectionHeader` (title + "عرض الكل"), `KpiCard`, `HeroStatCard` (dark maroon gradient card with sparkline), `LineChart`/`AreaChart`/`BarChart`/`DistributionBar` (react-native-svg, no chart lib), `TabBar` (customer: link-1 style with maroon active icon + label; workspace: cream bar with active pill), `OtpInput`, `DatePicker` (horizontal day strip) + `TimeSlots` grid, `MapPreview`, `ImageUploader`/`GalleryGrid`, `Stepper` (dots like link-1 booking header), `Carousel` (paging FlatList + Reanimated parallax + dots + autoplay).

Icons: `src/components/ui/icons.ts` exports a typed map name→component using deep imports (`lucide-react-native/icons/<kebab>`), never `import { X } from 'lucide-react-native'` (bundles 1500+ icons).

## 6. Data layer

`src/domain/types.ts` and `src/data/repository.ts` are contracts (read them). Two implementations:
- **MockRepository** (`src/data/mock`): in-memory seeded dataset for Doha (≥5 categories with subcategories, ≥24 companies with real coordinates/areas, services, products, staff with weekly availability, offers, reviews, bookings, subscriptions, gifts, notifications, loyalty), persisted mutations to AsyncStorage (key `oneq.mock.v1`), simulated latency 120–350 ms, OTP always `123456`, demo accounts: admin `admin@oneq.qa` / `OneQ@2026` or phone `+97450000001`; company `+97450000002` (owns "دار الجوري للتجميل"); customer `+97450000003` (name نورة). Any other phone creates a new customer on OTP.
- **AmplifyRepository** (`src/data/amplify`): same interfaces over `generateClient<Schema>()`, Cognito auth APIs, S3 storage, custom mutations.

Mode selection (`src/data/index.ts`): `EXPO_PUBLIC_DATA_MODE` = `mock` | `amplify`; default `amplify` when `amplify_outputs.json` exists, else `mock`. The app must be fully usable in mock mode (that is how it is QA'd on the emulator today).

Caching: TanStack Query with `staleTime: 60s`, `gcTime: 24h`, persisted to AsyncStorage (`@tanstack/query-async-storage-persister` — add if missing), query keys in `src/data/keys.ts`. Mutations use optimistic updates for favorites, notification read-state, booking cancel. Real-time: `repo.notifications.subscribe` / `repo.bookings.subscribeMine` (Amplify: AppSync subscriptions; mock: event emitter).

## 7. Functional specification (what must work)

### 7.1 Boot & onboarding
1. Native splash (expo-splash-screen, maroon, cream monogram) → animated boot screen (`index.tsx`): radial maroon gradient, pulsing concentric rings, Q-check glyph, "OneQ" wordmark, tagline «احجز. اشترك. أهدِ.», subtitle «حجوزات النوادي والعيادات والصالونات في قطر», shimmer loader «جار التحميل», footer «© 2026 OneQ · Doha, Qatar». Minimum 1.2 s, maximum until session + fonts + first queries are ready.
2. First launch → onboarding (3 slides: bookings / subscriptions / gifts) with skip; persisted `onboarded`.
3. Then `(auth)/welcome` unless a session exists → landing by role. Guests go straight to customer tabs.

### 7.2 Authentication
- Phone: `+974` default country, 8-digit validation, OTP via Cognito SMS (USER_AUTH / SMS_OTP). Unknown phone → sign-up (name) then OTP. 6-digit OTP input with paste + auto-submit, 60 s resend timer.
- Email: email + password (PASSWORD_SRP), forgot/reset flow. Sign-up by email also collects phone (required for gifts).
- Role landing from `cognito:groups`. Company accounts are created by admins; customers self-register; admins are seeded.
- Guest: "المتابعة كضيف" → customer tabs with guest banner; gated actions open the phone sheet.
- Session persisted by Amplify; `Hub` listener keeps `session` store in sync; sign-out clears query cache.

### 7.3 Customer workspace (link 1 design)
- **Home**: maroon rounded header (location «الدوحة» selector, greeting «مرحباً، {name|ضيف}», bell with unread dot, search bar) → **hero carousel** (auto-advance 4 s, parallax, dots): source = active offers; if none → top-rated companies; if none → popular companies; each slide shows image, company logo chip, title, old/new price when offer, CTA. → «الخدمات» category grid (3 columns, icon bubble + label) → «مميز ✨» featured horizontal cards → «عروض» offers row → «الأقرب إليك» (if location) → «الأكثر رواجاً». Pull-to-refresh, skeletons.
- **Company card** (link 1): image with tag chips (مميز / خصم طلاب / عرض خاص / تأمين), «مفتوح/مغلق» pill, name, rating + count, subcategory chip, area, staff count, «يبدأ من {price}», «احجز الآن» button, favorite heart; service mode badge «خدمة منزلية» / «خدمة محلية» / «منزلي + محلي».
- **Category page**: subcategory grid («الكل» selected maroon) + sort chips (الأقرب إليّ · مفتوح الآن · الأعلى تقييماً · الأقل سعراً · يوجد خصم · الأكثر حجزاً) + result count + list. Gyms category first asks «رجال / نساء».
- **Search**: debounced (250 ms) across companies, services, staff, subcategories; recent searches; popular chips; grouped results with counts; highlights.
- **Company details**: cover gallery, back/favorite/share, name + rating pill, subcategory, address, open-now with today hours, staff count, action row (اتصال / الخريطة / واتساب), service mode card (home / on-site), «عن المكان», «ساعات العمل» (7 days, today highlighted), «الخدمات» list with PriceTag (offers show struck old price + «عرض» badge), «المنتجات» grid, «الطاقم» horizontal (photo, title, experience, rating, availability today), «باقات الاشتراك» (if `offersSubscriptions`), «الخصومات والعروض», «التقييمات والآراء» (avg, distribution, list), sticky bottom CTA «حجز موعد» (+ «اشترك الآن» when subscriptions).
- **Staff profile**: photo, title, experience, specialties, weekly availability strip (السبت…الجمعة with available/unavailable), rating + reviews, «احجز مع {name}».
- **Booking wizard** (link-1 header with step dots): 1 service (or product) → 2 mode (if company BOTH: «اذهب إلى المكان» / «الموظف يأتيك للمنزل» + address) → 3 type («طلب لمرة واحدة» / «اشتراك» with plans 1–3×/week, duration, price) → 4 staff (optional; «أي موظف متاح») → 5 date (next 14 days strip respecting opening hours + staff availability) & time slots → 6 gift toggle «اهدِ هذه الخدمة لشخص آخر» (recipient name + phone) → 7 summary (price, points earned preview, use points toggle) → 8 payment (بطاقة / نقداً عند الوصول / بالنقاط / قسّط على 4) → success (code, add to calendar, track). Guests are prompted for phone at step 1 CTA.
- **Orders tab**: segmented «الحجوزات» / «الاشتراكات». Booking cards with status timeline (قيد التأكيد → مؤكد → جارٍ → مكتمل / ملغي), company, service, staff, date/time, price, actions (إلغاء, إعادة الحجز, قيّم). Subscription cards: dark card with ring progress «{n} يومًا متبقية», bar «{used} من {total} جلسة», start/end dates, sessions/week, status; real-time countdown; auto-expire.
- **Rating**: after `COMPLETED`, prompt to rate company (1–5 + comment) and staff (if any). Updates company/staff averages.
- **Gifts tab (هدايا)**: hero card «أهدِ من تحب», segmented «استلمت» / «أرسلت»; send flow: choose kind (نقاط / خدمة / منتج) → pick company/service/product → recipient phone (+974, contact-like formatting) → lookup: registered ⇒ «سيصل الهدية داخل التطبيق» else ⇒ «سيُرسل عبر واتساب»; message; confirm → if WhatsApp path, open `wa.me/<phone>?text=` with Arabic message that names the sender («{sender} أهداك … عبر OneQ»). Received gifts: claim → creates booking draft (service/product) or credits points.
- **Loyalty**: welcome 50 pts; +1 pt per 1 QAR + 20 per completed booking; tiers برونزي 0 / فضي 500 / ذهبي 1500 / بلاتيني 4000; 100 pts = 10 QAR; redeem at payment (fully free when points cover price); transfer points to a phone (min 50). Profile shows balance card, tier progress, history.
- **Map tab**: react-native-maps (Google on Android via `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; when the key is missing on Android use `UrlTile` CARTO light tiles so the map still renders), user location (permission flow with denial fallback = Doha center 25.2854, 51.5310), category filter chips, custom maroon markers with logo, bottom sheet list sorted by haversine distance showing «{d} كم · {area}», tap → company. «الأقرب إليّ» everywhere uses the same geo helper.
- **Profile tab**: maroon header (avatar/initials, name, phone, «وضع الضيف» + «تسجيل الدخول» for guests), stats (حجوزات / مفضلات / مراجعات), loyalty card, menu (الملف الشخصي، حجوزاتي، المفضلة، الإشعارات، نقاطي، العناوين، اللغة، الإعدادات، مركز المساعدة، سياسة الخصوصية، تسجيل الخروج).
- **Notifications**: list grouped by day, unread dots, deep-link on tap; push registration on sign-in.

### 7.4 Company workspace (link 2 owner design, cream)
- Shell: top bar (menu, company avatar + name, status badge «نشط/غير مكتمل», AR/EN toggle), tabs, FAB «إضافة» on catalog.
- **Dashboard**: greeting + date, quick actions (إضافة خدمة / إضافة موظف / تحديث الصور), hero revenue card (month revenue, delta, sparkline), KPI grid (حجوزات اليوم, حجوزات الشهر, عملاء جدد, الاشتراكات النشطة, متوسط التقييم), revenue chart 12 months, bookings-by-service distribution, latest bookings list, subscriptions expiring within 7 days, pending ratings.
- **Bookings**: segmented اليوم / هذا الأسبوع / هذا الشهر + type filter (خدمات / منتجات / اشتراكات) + status; rows with avatar initials, customer, service, staff, date/time, amount, status pill; detail sheet to confirm / start / complete / cancel; completing triggers points + rating request.
- **Catalog**: tabs الخدمات / المنتجات / العروض. Service form: name ar/en, description, price, duration, image, allowSubscription + plans editor, requiresStaff, active toggle. Product form: name, description, price, images, stock. «تحويل إلى عرض»: set offer price (< price) + optional end date → old price shows struck-through everywhere, customers get a notification. Remove offer.
- **Staff**: cards (photo, title, experience, price/session, bookings this month, rating, active toggle) + form: name, title (استشاري/أخصائي/مدرب/موظف…), bio, photo upload, experience years, specialties, weekly availability editor (per day on/off + from/to), isAvailable switch.
- **More**: الملف التجاري (name, description, phone, WhatsApp, email, category/subcategories, service mode محلي/منزلي/كلاهما, offersSubscriptions), الموقع (map picker + area select), ساعات العمل (7-day editor), الصور (cover/logo/gallery with reorder/delete), الاشتراكات (active subscribers list), التقييمات (avg, distribution, list, reply), التحليلات (period toggle, insights, growth charts), الإشعارات, تسجيل الخروج.
- Company must complete profile (location + hours + at least one service or product) before `isActive` can be true; dashboard shows a completion checklist.

### 7.5 Admin workspace (same design language)
- **Dashboard**: KPIs (حجوزات اليوم, إيرادات اليوم, شركات نشطة, عملاء, اشتراكات نشطة), bookings-per-day chart (14 days), bookings-by-company today list, top companies by rating/bookings, latest activity feed (company added/modified service/product/offer), pending company profiles.
- **Companies**: search + category filter + status; list; create company (category, subcategory, name ar/en, owner phone +974, owner email, area, location picker, service mode, description, logo) → creates Company + company account (Cognito user in `COMPANIES`); edit; activate/deactivate; view performance (bookings, revenue, rating trend, top services).
- **Categories**: list with counts; create/edit (name ar/en, slug, icon from icon map, color, image, description, subcategories editor, sort order, active).
- **Bookings**: by day (date strip) grouped by company, status filters, detail.
- **Customers**: list + loyalty balances (read-only) — nice to have.
- **Notifications**: admin feed of company changes (service/product/offer/staff created or modified) with deep links; broadcast a notification to all customers (title/body) — admin tool.

### 7.6 Notifications (reliability requirements)
- In-app `Notification` records are the source of truth (list, badge count, read state); push is a delivery channel on top.
- Triggers: company creates/updates service, product, offer → customers (all) + admins; booking status changes → customer + company; gift received/points received → recipient; subscription expiring in 3 days / expired → customer; new review → company; new company profile completed → admins.
- Push: `expo-notifications` token registered per user/device (`PushToken`), Expo Push API from Lambda (Amplify) or local notifications (mock). Android channel `default` created before token request. Tapping opens the deep link in `data.route`.

## 8. Backend (Amplify Gen 2) — `amplify/`
- `auth/resource.ts`: `loginWith: { email: true, phone: { otpLogin: true } }`, `userAttributes: { phoneNumber: { required: false }, email: { required: false }, fullname }`, `groups: ['ADMINS','COMPANIES','CUSTOMERS']`, triggers `postConfirmation` (add to CUSTOMERS, create UserProfile + LoyaltyAccount with welcome points). SMS via SNS (sandbox note), email via Cognito default (SES for production).
- `data/resource.ts`: models mirroring `src/domain/types.ts` (Category, Subcategory, Company, Service, Product, Staff, Booking, Subscription, Gift, LoyaltyAccount, PointsTransaction, Review, Notification, PushToken, UserProfile, ActivityLog) with secondary indexes (companyId, customerId, categoryId, date, status, recipientPhone, offerStatus) and auth rules: public read for catalog (`allow.guest().to(['read'])`, `allow.authenticated().to(['read'])`), owner/company write via `allow.ownerDefinedIn('ownerSub')` / `allow.group('COMPANIES')` scoped in Lambda where needed, `allow.group('ADMINS')` full. Custom mutations (Lambda handlers): `sendGift`, `claimGift`, `transferPoints`, `createBookingSecure` (price validation + points), `completeBooking` (award points, notify), `adminCreateCompany` (adminCreateUser + addUserToGroup COMPANIES + Company record), `setOffer` (writes offer + notifies), `registerPushToken`, `broadcastNotification`. DynamoDB streams on Service/Product → `notifyCatalogChange`. Scheduled `expireSubscriptions` daily.
- `storage/resource.ts`: bucket `oneqMedia`, paths `public/companies/{companyId}/*` (read: guest+auth; write: authenticated — validated by prefix in client + Lambda), `public/categories/*` (admins), `public/users/{identity}/*`.
- WhatsApp: `sendGift` uses Meta WhatsApp Cloud API when secrets `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` are configured (template `oneq_gift`), otherwise returns `whatsappUrl` for the client fallback.
- Push: Lambda `sendPush` posts to `https://exp.host/--/api/v2/push/send` in chunks of 100.

## 9. Performance rules (non-negotiable)
- All lists ≥ 10 items: `FlashList`; rows `React.memo`, stable keys, no inline arrow functions in render-critical props, `StyleSheet.create`.
- Images: `expo-image` with `cachePolicy="memory-disk"`, `transition={180}`, `placeholder` (blurhash or themed tint), `recyclingKey`, explicit sizes; never RN `Image`.
- Animations only on the UI thread (Reanimated/worklets); gestures via gesture-handler; haptics on primary actions.
- Prefetch: home prefetches categories/companies; company page prefetches services/staff; images prefetched for carousel.
- Skeletons for every async surface; optimistic UI for favorites/read states; debounce search; memoize selectors; avoid context churn (zustand selectors).
- Startup: fonts via config plugin (no runtime load), boot screen overlaps data warm-up, no blocking network before first paint. Keep the JS bundle lean (deep icon imports, no moment/lodash).
- RTL: use `start/end` (`marginStart`, `paddingEnd`, `textAlign: 'left'` is forbidden — use `'start'`/`I18nManager.isRTL`), flip chevrons by direction, never hardcode `row-reverse`.

## 10. i18n & formatting
- Arabic default + English. `t('key')` from `src/i18n`; all UI strings via keys (no literals in components). Language switch persists then `I18nManager.forceRTL(lang==='ar')` + reload (`Updates.reloadAsync()`; in dev `DevSettings.reload()`).
- Numbers/currency/dates: Latin digits always (`en-US` numbering), currency `150 ر.ق` / `QAR 150`, dates via dayjs with `ar` locale labels but Latin digits, relative times («قبل 3 أيام»).

## 11. Quality gates
`npx tsc --noEmit` clean · `npx expo lint` clean · app boots in mock mode on the Android emulator with zero red-box errors · every route in §4 reachable · no console errors on main flows (boot, guest browse, phone OTP login, booking, gift, map, orders, company CRUD, admin CRUD).

## 12. User-side deployment steps (documented in README)
AWS SSO login → `npx ampx sandbox --profile <p>` (region recommendation me-central-1) → Google Maps Android key → EAS credentials (FCM V1 service account, APNs key) → SNS SMS production access + Qatar (+974) spend limit → SES identity for email OTP (optional) → WhatsApp Cloud API token/phone id secrets.
