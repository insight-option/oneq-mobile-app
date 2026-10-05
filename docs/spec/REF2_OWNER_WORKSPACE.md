# REF2 — Owner (Company) Workspace Specification

Reference: gym-owner demo of reference app #2 — `https://main.d30el0e4q9in8c.amplifyapp.com/#/owner` (Arabic-first, RTL).
Recovered from: screenshot tiles (390×844 pt viewport @2x), innerText/button dumps, the design CSS (`index-jF9oYMZF.css`), and the minified React chunks (`OwnerShell`, `Dashboard`, `Members`, `Plans`, `Bookings`, `Trainers`, `Media`, `Reviews`, `Analytics`, `Form`, `PlanCard`, `ui`, `owner`, `format`, `index`).

This document is the single source of truth for the **COMPANY workspace** and the **ADMIN workspace** of the OneQ Expo app. Both must reproduce this design language exactly; pages that do not exist in the reference are mapped in §5 using only the components catalogued in §3.

## 0. Conventions used in this document

| Convention | Meaning |
|---|---|
| **pt** | CSS px of the reference = React-Native dp/pt. Tiles are 780 px wide = 390 pt, so pixel measurements in tiles were divided by 2. |
| Tailwind spacing | The reference uses `--spacing: 0.25rem`, so `h-11` = 44 pt, `p-4` = 16 pt, `gap-2.5` = 10 pt, `h-13` = 52 pt, `size-9` = 36 pt, `size-4.5` = 18 pt, `size-5.5` = 22 pt, `size-[1.125rem]` = 18 pt, `size-[1.2rem]` = 19 pt. |
| Font sizes | `text-[0.9375rem]` = 15 pt, `text-[0.8125rem]` = 13 pt, `text-[0.75rem]` = 12 pt, `text-[0.71875rem]` = 11.5 pt, `text-[0.6875rem]` = 11 pt, `text-sm` = 14 pt, `text-base` = 16 pt, `text-lg` = 18 pt, `text-xl` = 20 pt, `text-2xl` = 24 pt, `text-[1.0625rem]` = 17 pt. |
| Token names | `primary`, `cream`, `canvas`, `surface`, `sand`, `sand-deep`, `line`, `line-strong`, `ink`, `charcoal`, `muted`, `faint`, `gold`, `gold-tint`, `success`, `success-tint`, `danger`, `danger-tint`, `primary-tint`, `primary-dark`, `primary-deep` — hex values in §4. |
| `/NN` suffix | Opacity: `line/80` = line at 80 % alpha, `white/10` = white at 10 % alpha. |
| Start / End | Logical direction. In Arabic (RTL) **start = right, end = left**. Every layout below is written in logical terms. |
| Breakpoints | `sm` ≥ 640, `md` ≥ 768, `lg` ≥ 1024, `xl` ≥ 1280. Pages switch from phone list to desktop table at **900 px**. The sidebar rail exists only ≥ 768 px. On phones (our target) the shell is: top bar + drawer + scrolling content. |
| Status of a detail | Everything stated as fact was read from code or measured in tiles. Items marked **(not determinable)** could not be verified. |

---

## 1. Shell (`OwnerShell`)

### 1.1 Page frame

| Property | Value |
|---|---|
| Root | `min-h: 100dvh`, background **canvas `#FBF8F5`**, text **ink `#231A18`**. (`<body>`/`<html>` background is cream `#F7F0EA`; the owner shell overrides it with canvas.) |
| Content container | `<main>` centered, `max-width: 1480 pt`, padding `16 pt` sides (`sm` 24, `lg` 40), `padding-top 24 pt` (`lg` 32), `padding-bottom 96 pt` (so the FAB and the phone home indicator never cover the last card). |
| Safe areas | Top bar sits under the status bar via `--oq-safe-top` (`env(safe-area-inset-top)`); sheets/footers add `--oq-safe-bottom`. The viewport uses `viewport-fit=cover`; `theme-color #5A0020`; `color-scheme light` only (no dark mode). |
| Page transition | Each route's `<main>` fades/slides in: `opacity 0→1, translateY 6→0`, duration **0.24 s**, ease **cubic-bezier(.22,1,.36,1)**. First render of the shell has no animation. `window.scrollTo(0)` on every route change. |
| Scroll | Single vertical scroll of the whole page; top bar is `sticky top-0 z-30`; no horizontal page scroll (`overflow-x: hidden`). |
| Overlays z-order | top bar 30 · sidebar 40 · FAB 55 · drawer/modal 60 · toasts 70. |

### 1.2 Top bar (`<header>`)

Sticky, `height 64 pt` (`lg` 72), `border-bottom 1 pt line/70`, background **canvas at 85 % + backdrop-blur 12 px** (`bg-canvas/85 backdrop-blur-md`). Inner row: `max-width 1480`, side padding 16 pt, `gap 12 pt`, `align-items center`.

Order on a phone (start → end, i.e. right → left in Arabic):

| # | Element | Spec |
|---|---|---|
| 1 | **Menu button** | `IconButton` variant `ghost`, size `md` (44×44 pt, round, transparent, hover sand/80), icon lucide **`menu`** 20 pt strokeWidth 2, `margin-inline-start −8 pt` so the glyph aligns with the content edge. `aria-label`: **القائمة** / Menu. Opens the drawer (§1.3). |
| 2 | **Company avatar** | `GymLogo` size **32 pt**: circle, background cream, `ring 1 pt black/5`; if no logo image → initials **"PH"** on a diagonal gradient `#1D1415 → #3A2B2C`, font **Playfair Display 700**, color `#E9C9A6`, letter-spacing wide, font-size = 36 % of size (11.5 pt at 32), `dir=ltr`. |
| 3 | **Company name** | `font-weight 600`, 16 pt, ink, `truncate` in a `min-w-0 flex-1` box → renders **"باور هاوس…"** on 390 pt. Gap to avatar 10 pt. |
| 4 | **Demo badge** (`DemoBadge`) | Phone shows kind `demo` = **تجريبي** / Demo; ≥ sm shows kind `data` = **بيانات تجريبية** / Demo Data. Pill `height 28 pt`, `padding-x 12 pt`, `border-radius 999`, font 12 pt / 600, `gap 6 pt`, icon lucide **`flask-conical`** 14 pt strokeWidth 2.2. Tone `sand`: background sand `#F1E7DD`, text primary. |
| 5 | **Language toggle** (`LangToggle` size `sm`, tone `light`) | `role=radiogroup`, `dir=ltr` (always "عربي | EN" left-to-right). Track: `inline-flex`, `padding 4 pt`, `border-radius 999`, `border 1 pt line`, background surface, `shadow-soft`. Each option: `height 32 pt`, `min-width 40 pt`, `padding-x 10 pt`, 13 pt / 600, round. Active option: background **primary**, text **cream**; inactive: text muted (hover ink). "عربي" is set in IBM Plex Sans Arabic, "EN" in Outfit. Tap switches `lang` and flips `dir` of the whole app instantly (no reload). |
| 6 | Customer-mode switch (`ModeSwitch`) | Hidden below `xl`. Pill `h 40, px 16, 14 pt/600`, border line, bg surface, icon `smartphone` 18 pt, label **عرض تجربة العميل** / View Customer Demo. Not needed on phone. |
| 7 | Avatar 40 pt | Hidden below `sm`. |

Desktop only (≥ lg): elements 2–3 are replaced by a `Select` (width 208 pt) labelled **الفترة** (Date range) with options **آخر 30 يومًا · هذا الشهر · آخر 90 يومًا · آخر 12 شهرًا** (Last 30 days · This month · Last 90 days · Last 12 months). It is decorative (state only; no data is filtered). Omit on phone.

The end group has `margin-inline-start auto` and `gap 8 pt` (`sm` 12).

### 1.3 Side menu / drawer (`القائمة`)

On phones the menu is a **Drawer** (§3.17) with `side=start`, `width 300 pt`, `tone=burgundy`, `hideHeader` (the sidebar content carries its own header). It slides in from the start edge (**from the right in Arabic**) over a `rgb(21 16 16 / .45)` scrim, `0.3 s` ease-premium. Background: vertical gradient **primary-deep `#2A000F` → primary `#5A0020`** (the ≥768 rail uses `primary-deep → #3D0016 → primary`), text cream, `on-dark` focus rings in cream. ≥ 768 the same content is a fixed rail (272 pt, collapsible to 88 pt between 768–1023 with a `chevrons-left` toggle) — not needed on phone.

Sidebar content (`padding 16 pt sides, 24 pt top, 20 pt bottom`, column, full height):

| Block | Spec |
|---|---|
| Wordmark | OneQ SVG wordmark, width 84 pt, tone **cream**, inside a link to `/owner`, `padding-x 8 pt`. |
| Company card | `margin-top 28 pt`, `border-radius 16 pt`, background `white/7`, `ring 1 pt white/10`, `padding 12 pt`, row `gap 12 pt`: `GymLogo` 44 pt + column: **ناديك** (Your gym) 12 pt `cream/60`; company name 16 pt / 600, truncate. |
| Nav list | `margin-top 24 pt`, `flex 1`, items spaced 4 pt. Each item: `height 44 pt`, `border-radius 12 pt`, `padding-x 12 pt`, `gap 12 pt`, 15 pt / 500, icon 19 pt strokeWidth 1.9. **Active**: background cream, text primary, shadow `0 6px 18px −8px rgb(0 0 0/.45)`. **Inactive**: text `cream/78`, hover `white/8` + cream. |
| Grow card | `border-radius 16 pt`, `white/7` bg, `ring white/10`, `padding 16 pt`, link to `/why-oneq`: title row 16 pt/600 with `sparkles` icon 16 pt colored **`#F2C9A8`** — **انمُ مع OneQ** (Grow with OneQ); body 13 pt `cream/65` leading-relaxed — **شاهد كل ما يقدمه OneQ لناديك.** (See everything OneQ can do for your gym.). Margin-bottom 12 pt. |
| Mode switch | `ModeSwitch` tone `dark` (bg `white/10`, cream text, ring `white/15`), size sm, full width: `smartphone` icon + **عرض تجربة العميل**. |

Nav items (key · Arabic · English · route · lucide icon):

| Key | AR | EN | Route | Icon |
|---|---|---|---|---|
| dashboard | لوحة التحكم | Dashboard | `/owner` (exact) | `layout-dashboard` |
| analytics | التحليلات | Analytics | `/owner/analytics` | `chart-line` |
| members | الأعضاء | Members | `/owner/members` | `users` |
| plans | الاشتراكات | Membership Plans | `/owner/plans` | `credit-card` |
| media | صور النادي | Gym Media | `/owner/media` | `images` |
| trainers | المدربون | Trainers | `/owner/trainers` | `dumbbell` |
| bookings | الحجوزات | Bookings | `/owner/bookings` | `calendar-check` |
| reviews | التقييمات | Reviews | `/owner/reviews` | `star` |
| why | لماذا OneQ | Why OneQ | `/why-oneq` | `sparkles` — extra `margin-top 16 pt`, inactive text color `#F2C9A8` |

Unknown routes (`/owner/dashboard`, `/owner/profile`) render the 404 page (§2.9).

### 1.4 Floating action button (presenter)

`fixed`, `inset-inline-end 16 pt` (**bottom-left in Arabic**), `bottom 24 pt`, `z 55`. Button **44×44 pt**, round, background primary, text cream, icon lucide **`presentation`** 20 pt, `ring 1 pt white/10`, shadow **`shadow-cta`** (`0 12px 28px −10px rgb(90 0 32/.55)`), hover scale 1.05, active scale .95. `aria-label`: **فتح قائمة العرض التقديمي (Shift + P)**.

It opens (above itself, origin bottom-start) a dark card `width min(296 pt, 100vw − 32)`, `border-radius 20`, gradient primary-deep → primary, `padding 8`, `shadow-float`, animated `opacity 0→1, y 10→0, scale .97→1` in 0.2 s: title **العرض التقديمي** (type-display-s) + subtitle **انتقل مباشرة إلى أي جزء من العرض** 13 pt `cream/65`; two groups with `type-overline` headings (**تجربة العميل**, **لوحة النادي**) listing links (`h 44, rounded-xl, 15 pt/500`, active = bg cream text primary); footer with `LangToggle` tone dark and a **إعادة ضبط العرض** reset button (`rotate-ccw`), plus a `kbd` hint "Shift + P". This is a demo-presentation aid only. **For OneQ: do not ship it. Reserve the same FAB slot/style for a page-level primary action where needed (e.g. "+" on list pages) — see §5.**

### 1.5 Page title + subtitle pattern (`PageHeader`)

Used by every page except the dashboard:

```
<div mb-28pt (lg 32) column gap-16pt (lg row, items-end, space-between)>
  <div min-w-0>
    <row wrap gap-12pt> <h1 type-display-l (32 pt /700, lg 36 pt) ink>Title</h1> [DemoBadge kind=sample] </row>
    <p mt-6pt max-w-672pt 15 pt muted>Subtitle</p>
  </div>
  <div row wrap gap-10pt>…action buttons (shape=rounded size=sm)…</div>
</div>
```
On phones the action buttons wrap **below** the subtitle, aligned to the start, 10 pt gaps.

### 1.6 Toasts (`Toaster`, placement top)

`fixed inset-x-0 top: safe-top + 12 pt`, centered column, `gap 8`, `z 70`, `role=status aria-live=polite`. Toast: pill `border-radius 999`, background **charcoal/95 `#151010`**, cream text 15 pt / 500, `padding 10 pt 20 pt 10 pt 12 pt`, `gap 10`, `max-width 384`, `shadow-float`, `backdrop-blur`; leading icon lucide `circle-check` 20 pt — color **`#8FD19E`** for tone `success`, `cream/80` otherwise. Enter/exit: `opacity`, `y −12→0`, `scale .98→1`, 0.24 s ease-premium. At most **3** stacked; each auto-dismisses after **2.8 s**.

---

## 2. Pages

All pages live inside the shell; the first element is the page header (§1.5) except the dashboard, which has its own greeting header.

### 2.1 Dashboard — `/owner` (tiles 01-owner_1…4)

**Section order (top → bottom on phone):**

1. **Greeting header** (`margin-bottom 32 pt`)
   - Greeting line 18 pt muted: **صباح الخير،** before 12:00 / **مساء الخير،** 12:00–16:59 / **مساء الخير،** after (EN: Good morning, / Good afternoon, / Good evening,). Note AR uses the same string for afternoon and evening.
   - `h1` **Power House Gym** (company display name; EN name is shown even in AR in the reference) — `type-display-l` 32 pt / 700 ink (`lg` 40 pt), `margin-top 2 pt`.
   - Subtitle `margin-top 8 pt`, 15 pt muted: `{full date} · إليك أداء ناديك اليوم.` → **الأحد، 4 أكتوبر · إليك أداء ناديك اليوم.** (date format `full` = weekday long + day + month long, Latin digits; EN "Here's how your gym is doing today.").

2. **Quick actions** — `grid-cols-3 gap-10pt` (≥ sm: inline row). Each is a `Button` `shape=rounded size=sm`, but on phones overridden to **vertical**: `h auto`, `flex-col`, `gap 4 pt`, `padding-y 12 pt`, label **13 pt**, icon 18 pt on top. Measured tile: ~113×68 pt each, radius 12 pt.

   | Order | Label AR / EN | Variant | Icon | Action |
   |---|---|---|---|---|
   | 1 (start) | **إضافة خطة** / Add Plan | primary (bg primary, cream text) | `plus` | navigates `/owner/plans?new=1` → Plans page opens the "new plan" sheet |
   | 2 | **إضافة مدرب** / Add Trainer | secondary (surface, 1 pt line border) | `user-plus` | `/owner/trainers?new=1` → opens "new trainer" sheet |
   | 3 | **تحديث الصور** / Update Photos | secondary | `image-plus` | `/owner/media` |

3. **KPI grid** — `grid-cols-2 gap-12pt` (≥ sm gap 16; md 3 cols; xl 5 cols). Phone order: the **hero revenue card first, spanning 2 columns**, then four `StatCard`s 2×2:

   | Card | Label AR / EN | Value | Delta | Icon |
   |---|---|---|---|---|
   | Hero | **إيرادات الشهر** / Monthly revenue | `Price` 24,850 ر.ق (amount 32 pt, currency 13 pt, cream) | +12 % | `wallet` |
   | 1 | **إجمالي الأعضاء** / Total members | 127 | +7 % | `users` |
   | 2 | **الأعضاء النشطون** / Active members | 103 | +5 % | `user-round-check` |
   | 3 | **جدد هذا الشهر** / New this month | 38 | +18 % | `user-plus` |
   | 4 | **حجوزات المدربين** / Trainer bookings | 74 | +9 % | `calendar-check` |

   Delta caption on every card: **عن الشهر الماضي** / vs last month. Sparkline (12-month trend of that metric) appears only when the card is ≥ 256 pt wide → on phones only the hero shows it (bottom-end corner, 60×26). Full card spec in §3.1–3.2.

4. **Revenue chart card** (`Section`, `margin-top 16`) — title **الإيرادات** / Revenue (17 pt/600), subtitle **آخر 12 شهرًا** / Last 12 months (13 pt muted), header action link **عرض الكل** / View all (14 pt/600 primary) → `/owner/analytics`. Body: custom SVG area line chart, height **280 pt**, ticks `0 · 10k · 20k · 30k`, x labels every 3rd month on narrow widths (**يناير · أبريل · يوليو · أكتوبر**). Spec §3.10.

5. **Membership mix card** (`Section`) — title **توزيع الاشتراكات** / Membership mix, subtitle **127 عضو حسب الخطة** / 127 members by plan. Body: `StackedBar` (§3.11) then legend list (`margin-top 20`, rows 12 pt apart, 15 pt): swatch 12×12 radius 4 · label (flex 1, ink) · count (`type-num` 600 ink) · percent (width 48, end-aligned, muted):

   | Plan | Count | % | Color |
   |---|---|---|---|
   | شهر واحد / 1 month | 34 | 27 % | `#D9A0AB` |
   | 3 أشهر / 3 months | 46 | 36 % | `#B5586C` |
   | 6 أشهر / 6 months | 29 | 23 % | `#86243F` |
   | 12 شهرًا / 12 months | 18 | 14 % | `#5A0020` |

   Then the **insight callout** (§3.13): **خطة 3 أشهر هي الأكثر مبيعًا — 36% من الأعضاء.** / "3-month plans are your best seller — 36% of members."

6. **Latest bookings card** (`Section`, `margin-top 16`) — title **أحدث الحجوزات** / Latest bookings, action **عرض الكل** → `/owner/bookings`. Body: list `−margin-y 4`, rows separated by `1 pt line/80`, each `padding-y 12, gap 12`: `Avatar` 38 · (name 15 pt/500 ink truncate; meta 13 pt muted `جلسة · عمر المنصوري · اليوم` for trainer sessions or `3 أشهر · اليوم` for plans — relative date: **اليوم / أمس / قبل N أيام**) · end column (`items-end gap 4`): `Price` sm tone ink + `StatusPill` (**مؤكد**). Shows the 5 most recent.

7. **Expiring card** (`Section`) — title **تنتهي خلال 7 أيام** / Expiring in the next 7 days, subtitle pluralized count **20 اشتراكًا** (`expiringCount`: لا توجد اشتراكات / اشتراك واحد / اشتراكان / {n} اشتراكات / {n} اشتراكًا / {n} اشتراك). Rows (5 shown, sorted by days left asc): `Avatar` 38 · name 15 pt/500 · meta 13 pt `{plan} · ينتهي غدًا` — meta turns **danger `#A3302F` + weight 500** when ≤ 2 days left (`endsIn`: ينتهي اليوم / ينتهي غدًا / ينتهي بعد يومين / ينتهي بعد {n} أيام…) · end: `Button` variant **soft** (bg sand, text primary) `shape=rounded size=xs` (h 36, px 14, 14 pt), icon `bell-ring`, label **تذكير** / Remind → toast success **تم إرسال تذكير التجديد (تجريبي)** / Renewal reminder sent (demo). Measured chip ≈ 76×36 pt, radius 12.

8. **Latest reviews card** (`Section`) — title **أحدث التقييمات** / Latest reviews, action **عرض الكل** → `/owner/reviews`. Body: 3 items, `gap 12`, each a tinted tile: `border-radius 16`, background **canvas**, `padding 14`: header row (author 15 pt/600 ink `dir=auto`, `Stars` sm at the end — in RTL stars sit on the left) · text `margin-top 6`, 14 pt leading-relaxed `ink/80`, **2-line clamp**, `dir=auto lang=…` (English reviews render LTR left-aligned inside the RTL card) · if the gym has replied: `margin-top 8`, 12 pt/500 success with `sparkles` 14 pt: **رد من باور هاوس جيم** / Reply from Power House Gym.

Loading state: none visible (data is synchronous). Empty states: none on dashboard.

### 2.2 Members — `/owner/members` (tiles 03-owner_members_1…3)

1. **PageHeader** — title **الأعضاء** / Members; subtitle **127 عضو في باور هاوس جيم** / 127 members at Power House Gym; action `Button` secondary rounded sm, icon `download`: **تصدير** / Export → toast success **الملف جاهز (تجريبي)** / Export ready (demo). (No real file is produced.)

2. **List card** — `border-radius 20`, `border 1 pt line/80`, background **white**, `shadow-soft`.

   **Toolbar** (`padding 16`, ≥ sm 20; `border-bottom line/80`; column `gap 12`; ≥ lg row space-between):
   - **Search input**: `height 44`, `border-radius 12`, `border 1 pt line`, background **canvas**, `padding-inline-start 40 / end 12`, 15 pt, placeholder faint **ابحث عن عضو** / Search member; lucide `search` 18 pt muted at `start 14`. Focus: border primary, background white, ring `0 0 0 4px rgb(90 0 32 / .08)`. Searches name (AR+EN), phone, email with whitespace removed, case-insensitive. Type `search`.
   - **Status segmented control** (§3.6, size sm, horizontally scrollable, no scrollbar): options with live counts — **الكل 127 · نشط 103 · منتهي 18 · ملغى 6** (All · Active · Expired · Cancelled). Default **الكل**.
   - **Plan select** (§3.7, `sm:w-176pt`): **كل الخطط · شهر واحد · 3 أشهر · 6 أشهر · 12 شهرًا** (All plans · 1 month · 3 months · 6 months · 12 months). Default all.
   - Changing any filter resets to page 1.

   **Phone list** (< 900 px): `ul` rows divided by `1 pt line/70`. Each row is a `button` (`w-full`, `padding 16`, `gap 12`, `items-start`, hover canvas): `Avatar` **42** (sand bg, primary initials, e.g. **جو**) · column: row 1 name 16 pt/600 ink truncate + `StatusPill` at the end (**نشط** success); row 2 `margin-top 2`, 13 pt muted phone as `<bdi dir=ltr type-num>` **+974 6602 0111**; row 3 `margin-top 8`, 13 pt, space-between: `{plan} · {start dayMonth} → {end dayMonth}` in `ink/85` e.g. **شهر واحد · 4 أكتوبر → 2 نوفمبر**, and `Price` sm tone ink **299 ر.ق**. Tapping opens the member drawer.

   **Desktop table** (≥ 900): `min-width 820`, 15 pt; header `bg canvas/60`, `border-bottom line/80`, 13 pt/500 muted; sortable columns via `SortableTh` (§3.20): **الاسم · الهاتف · الخطة · تاريخ البداية · تاريخ الانتهاء · الحالة · المبلغ المدفوع** (Name · Phone · Plan · Start · End · Status · Paid). Name cell: Avatar 36 + name 500 + email 12 pt muted ltr. Rows hover canvas, `cursor pointer`, keyboard Enter/Space opens drawer. Default sort: start desc.

   **Footer** (`border-top line/80`, `padding 14 16`, ≥ sm 20; row space-between): range text `type-num` 13 pt muted **1–10 من 127** (`{from}–{to} من {total}` / `{from}–{to} of {total}`); pager: `[‹]  1 / 13  [›]` — square buttons **40×40**, `border-radius 12`, `border line`, white, chevron icons 18 pt (`chevron-left` = previous, `chevron-right` = next, both `flip-rtl`), disabled `opacity .4`; page label `type-num` 14 pt/500 `min-width 56` centered. Page size **10**.

   **Empty state**: `EmptyState` icon `search-x`, title **لا يوجد أعضاء مطابقون لبحثك** / No members match your search.

3. **Member details drawer** (`Drawer` tone surface, side end, max-width 440, title **تفاصيل العضو** / Member details). Body `padding 0 24 32`:
   - Identity row `gap 16`: `Avatar` **64** tone **primary** (bg primary, cream initials) · name `type-display-s` 20 pt truncate · `StatusPill` size md `margin-top 6`.
   - `h3 type-overline` muted `margin-top 32`: **التواصل** / Contact → `dl` rows 15 pt `gap 12`: `phone` icon 16 pt primary + number (`type-num` ltr); `mail` icon + email (ltr).
   - `h3 type-overline`: **الاشتراك** / Membership → card `border-radius 20, border line, bg canvas, padding 16`: row (plan name 600 ink, `Price` sm primary) · progress track `margin-top 16, height 6, radius 999, bg sand-deep` with fill `primary` (or `faint` when not active) at `1 − daysLeft/durationDays` · dates row `margin-top 8`, 13 pt muted (start `medium` format … end).
   - 2-col grid `gap 12` of mini cards (`radius 20, border line, padding 16`): **الأيام المتبقية** / Days left → value 24 pt `font-num` 600 (or "—" when not active); **مرات الحضور** / Check-ins (with `scan-line` icon 14 pt) → visits count.
   - Buttons `margin-top 32`, grid `gap 10`: primary rounded md (h 48) icon `bell-ring` **إرسال تذكير بالتجديد** / Send renewal reminder → toast **تم إرسال تذكير التجديد (تجريبي)**; secondary rounded icon `phone` **اتصال** / Call → toast **اتصال — تجريبي**.

### 2.3 Plans — `/owner/plans` (tiles 04-owner_plans_1…3, 22-owner_plans_1…3)

1. **PageHeader** — title **خطط الاشتراك** / Membership Plans; subtitle **تظهر التعديلات فورًا في صفحة ناديك داخل تطبيق العميل.** / Changes appear instantly on your gym page in the customer app. Actions (wrap, 10 pt gap): secondary rounded sm icon `eye` **معاينة في التطبيق** / Preview in app (link `/app/gym/power-house`); primary rounded sm icon `plus` **إضافة خطة** / Add Plan (opens the plan sheet). Measured: ≈ 162×44 and 130×44 pt, radius 12.

2. **Plan grid** — `gap 16` (phone 1 col; md 2; xl 4). All plans including inactive ones are listed, sorted by months asc.

   **Plan card** (`article`, column): `border-radius 20`, background **white**, `padding 20`, `shadow-soft`, `border 1 pt line/80`. **Popular** plan: border `primary/40` + extra ring `0 0 0 1px rgb(90 0 32/.25)` (visible as a thin maroon outline on the "3 أشهر" card). **Inactive** plan: whole card `opacity .6`.
   - Header row (`items-start space-between gap 12`): column → `h2 type-display-s` 20 pt ink truncate (plan name **شهر واحد / 3 أشهر / 6 أشهر / 12 شهر**) + badges row `margin-top 8 gap 6`: `[Pill muted dot "غير نشط"]` if inactive, then the plan badge: popular → `Pill tone=solid` (bg primary, cream) with `crown` icon **الأكثر اختيارًا** / Most Popular; `badge=best` → `Pill gold` **أفضل قيمة** / Best Value; `save>0` → `Pill gold` **وفّر 28%** / Save 28%. End: **member-count chip** `type-num` 12 pt/500 muted, bg canvas, `padding 4 10`, radius 999: **34 عضوًا** (`members` plural: لا يوجد أعضاء / عضو واحد / عضوان / {n} أعضاء / {n} عضوًا / {n} عضو).
   - Price block `margin-top 20`: `Price` size **xl** tone primary → amount **40 pt** `type-num` 600 leading-none + currency **ر.ق** 14 pt 600 (`opacity .8`); if months > 1 a line `margin-top 6`, 13 pt muted **≈ 250 ر.ق / شهر** / ≈ QAR 250 / month (`round(price/months)`).
   - Benefits `ul` `margin-top 20, border-top 1 pt line/80, padding-top 16, gap 8, flex 1`: rows 14 pt `ink/85` with lucide `check` 14 pt **primary** strokeWidth 3 at the start.
   - Footer `margin-top 20, border-top line/80, padding-top 16`: `Toggle` row label **ظاهرة للعملاء** / Visible to customers (checked = active). Turning **on** saves immediately (toast **تم الحفظ (تجريبي)**); turning **off** opens the deactivate confirmation. Then `margin-top 16 grid-cols-2 gap 8`: `Button` secondary rounded **xs** icon `pencil` **تعديل** / Edit; `Button` ghost rounded xs icon `power`, text **danger** (hover bg danger-tint) **إيقاف** / Deactivate — when inactive it becomes variant **soft** **تفعيل** / Activate.

   Seed plans (price → save %, badge): 1 m 299 (—), 3 m 749 (16 %, popular), 6 m 1,299 (28 %, save), 12 m 2,199 (39 %, best). Benefits AR/EN: دخول كامل / Full gym access · أجهزة وتمارين / Equipment & training floor · غرف تبديل / Locker rooms · حصص مختارة / Selected classes · جلسة تقييم للجسم / Body assessment session · تجميد الاشتراك 14 يومًا / 14-day membership freeze · تذكرتا دخول لضيوفك / 2 guest passes · 4 جلسات تدريب شخصي / 4 personal training sessions.

3. **Deactivate confirmation** — `Modal variant=dialog size=sm` (centered, max-width 448): title **إيقاف هذه الخطة؟** / Deactivate this plan?; description **لن يتمكن العملاء من شراء «{plan}» حتى تعيد تفعيلها.** / Customers won't be able to buy "{plan}" until you activate it again.; footer end-aligned `gap 10`: ghost rounded sm **إلغاء** / Cancel · **danger** rounded sm **إيقاف** / Deactivate → sets inactive + toast **تم الحفظ (تجريبي)**.

4. **Plan form sheet** (`?new=1` opens it; tile 22-owner_plans_1 confirms it is a **bottom sheet** on phones: the page behind is blurred/dimmed, the sheet has a 40×4 handle, title at the start, close "×" at the end). `Modal variant=auto size=md`. Title **خطة جديدة** / New plan (or **تعديل الخطة** / Edit plan). Body `gap 20`:

   | Field | Type / props | Label AR / EN | Placeholder | Default | Validation (shown after first Save attempt) |
   |---|---|---|---|---|---|
   | name | `Input size=md` (h 44), autofocus | **اسم الخطة** / Plan name | — | "" | **أدخل اسم الخطة** / Enter a plan name |
   | months | `Input type=number min 1 max 24 inputMode numeric dir=ltr` (half width) | **المدة (بالأشهر)** / Duration (months) | — | **1** | **من 1 إلى 24 شهرًا** / 1–24 months |
   | price | `Input type=number min 1 dir=ltr` (half width) | **السعر (ر.ق)** / Price (QAR) | **749** | "" | **أدخل السعر** / Enter a price |
   | benefits | `Input` — Enter adds a chip | **المزايا** / Benefits | **أضف ميزة واضغط Enter** / Add a benefit and press Enter | [] | none |
   | popular | `Toggle` inside a card `radius 16, border line, padding 16` | **تمييزها كـ «الأكثر اختيارًا»** / Mark as "Most Popular"; description **تظهر مميزة للعملاء. خطة واحدة فقط يمكن أن تكون الأكثر اختيارًا.** / Highlighted for customers. Only one plan can be the most popular. | — | off | — |

   Benefit chips: `height 32`, radius 999, bg primary-tint, text primary 13 pt/500, `padding-start 12 / end 4`, trailing remove button 24×24 round (`x` 14 pt, hover `primary/10`), `aria-label` **حذف {benefit}**.
   Footer (`border-top line`, `padding 16 24`, + safe-bottom): ghost rounded sm **إلغاء** · primary rounded sm **حفظ** / Save. Save computes `save = round((1 − price/(299 × months)) × 100)` for months > 1, sets `badge: popular` if toggled (and un-popularizes other plans), keeps `active`, shows toast **تم الحفظ (تجريبي)** / Saved (demo), closes. Editing is single-language in the demo (the typed name is stored for the current language only).

### 2.4 Bookings — `/owner/bookings` (tiles 05-owner_bookings_1…3)

1. **PageHeader** — **الحجوزات** / Bookings; subtitle **مبيعات الاشتراكات وجلسات المدربين** / Membership sales and trainer sessions. No actions.
2. **List card** (white, radius 20, border line/80, shadow-soft).
   **Toolbar** (`padding 16`/20, `border-bottom line/80`, column `gap 12`; ≥ sm row):
   - Period `Segmented` sm (`layoutId booking-period`, label **الفترة**): **اليوم · هذا الأسبوع · هذا الشهر** (Today · This Week · This Month). Default **هذا الأسبوع** (≤ 6 days back; month = ≤ 29 days; today = day 0 or "fresh").
   - Type `Select` (`sm:w-176`): **كل الأنواع · اشتراك · مدرب** (All types · Membership · Trainer).
   - Summary line 15 pt/600 ink, `aria-live=polite`: **15 حجز · 6,875 ر.ق** (`{count} حجز · {amount}`; EN `{count} bookings · QAR 6,875`). Amount excludes cancelled bookings.

   **Phone rows** (< 900): `li padding 16`, divided `line/70`; fresh rows (a purchase made in the customer demo) get `bg gold-tint/40` and a `Pill solid` **جديد** / New next to the name. Row: `Avatar` **40** · column: row 1 name 16 pt/600 `dir=auto` + `Price` sm ink at the end (**220 ر.ق**); row 2 13 pt muted booking label — trainer: **جلسة · عمر المنصوري** (`Session · {trainer}`), membership: plan name **3 أشهر**; row 3 `margin-top 8`, wrap `gap 8`, 13 pt muted: **type pill** → trainer = `Pill tone=gold` icon `dumbbell` **مدرب**; membership = `Pill tone=primary` icon `id-card` **اشتراك**; then `StatusPill` (**مؤكد** primary · **مكتمل** success · **ملغى** muted); then date-time **4 أكتوبر · 6:00 ص** (`dayMonth` + `·` + 12-h time with Arabic ص/م, Latin digits).

   **Desktop table** (≥ 900): columns **العميل · الحجز · النوع · التاريخ · المبلغ (end) · الحالة**.

   **Empty**: `EmptyState` icon `calendar-x`, **لا توجد حجوزات في هذه الفترة** / No bookings in this period.

Seed row examples (today = 4 Oct): جيمس ووكر — جلسة · عمر المنصوري — مدرب — مؤكد — 220 — 4 أكتوبر · 6:00 ص; سعد العبيدلي — 3 أشهر — اشتراك — مؤكد — 749 — 4:00 م; ماجد حداد — ملغى — 3 أكتوبر · 7:00 م; حسن صالح — مكتمل.

### 2.5 Trainers — `/owner/trainers` (tiles 06-owner_trainers_1, 23-owner_trainers_1)

1. **PageHeader** — **المدربون** / Trainers; subtitle **المدربون المتاحون للحجز في باور هاوس جيم** / Coaches customers can book at Power House Gym; action primary rounded sm icon `plus` **إضافة مدرب** / Add Trainer (≈ 136×44 pt).
2. **List card** (white, radius 20, border line/80, shadow-soft). Only trainers assigned to this gym.

   **Phone rows** (< 900): `li padding 16` divided `line/70`; inactive → `opacity .6`. Row `gap 12 items-start`: **photo 52×52, radius 16** (`Img` with focal point 50 % 25 %; fallback `Avatar` with `rounded-2xl`) · column: name 16 pt/600 truncate + `StatusPill` (**نشط** / **غير نشط**) at the end; specialty 13 pt muted (**القوة واللياقة البدنية**, **بناء العضلات**…); `margin-top 8` row space-between 13 pt: `Price` sm ink with `per=session` → **220 ر.ق / جلسة**; **الحجوزات (هذا الشهر): 31** (label muted, number `type-num` 600 ink). Then `margin-top 12` actions row **end-aligned** `gap 6`: secondary rounded xs `pencil` **تعديل**; ghost rounded xs `power` **إيقاف** (danger; or **تفعيل** success-colored `text-success hover:bg-success-tint` when inactive).

   **Desktop table** columns: **الاسم** (photo 44 + name + `Rating` "4.9 · 86 تقييم" 13 pt) · **التخصص** · **سعر الجلسة** · **الحالة** · **الحجوزات (هذا الشهر)** · actions.

   Seed: عمر المنصوري (strength, 220, 31 bookings) · باولو رييس (muscle, 180, 18) · ليلى حسن (strength, 230, 25).

3. **Deactivate confirmation** `Modal dialog sm`: title **إيقاف {name}؟** / Deactivate {name}?; description **لن يظهر للحجوزات الجديدة حتى تعيد تفعيله.** / They won't appear for new bookings until you activate them again.; ghost **إلغاء** · danger **إيقاف**. Toast **تم حفظ المدرب (تجريبي)** / Trainer saved (demo).

4. **Trainer form sheet** (`?new=1`; tile 23 confirms bottom sheet, `Modal variant=auto size=lg`). Title **مدرب جديد** / New trainer (or **تعديل المدرب** / Edit trainer). Body `gap 20`:

   | # | Field | Control | Label AR / EN | Default | Validation |
   |---|---|---|---|---|---|
   | 1 | photo | **Upload tile 96×96**, `radius 24`, `border 2 pt dashed line-strong`, bg canvas, icon `user-plus` 32 pt strokeWidth 1.6 muted (hover: border primary, dark `black/40` overlay with `camera` 24 pt). Beside it: label **الصورة** / Photo 14 pt/600 and `Button soft rounded xs` icon `camera` **رفع صورة** / Upload photo. Hidden `<input type=file accept=image/*>`. | — | — | — |
   | 2 | name | `Input md`, autofocus | **الاسم الكامل** / Full name | "" | **أدخل الاسم** / Enter a name |
   | 3 | specialty | `Select` | **التخصص** / Specialty — options: strength **القوة واللياقة البدنية** / Strength & Conditioning · muscle **بناء العضلات** / Muscle Building · weight-loss **خسارة الوزن** / Weight Loss · functional **التمارين الوظيفية** / Functional Training · hiit **تمارين HIIT** / HIIT · boxing **الملاكمة واللياقة** / Boxing & Conditioning · pilates **البيلاتس وتقوية الجذع** / Pilates & Core · yoga **اليوغا والمرونة** / Yoga & Mobility · rehab **الحركة والتأهيل** / Mobility & Rehab | strength | — |
   | 4 | price | `Input type=number min 1 dir=ltr` | **سعر الجلسة (ر.ق)** / Session price (QAR) | **200** | **أدخل السعر** / Enter a price |
   | 5 | bio | `Textarea rows=3` | **نبذة** / Bio | "" | — |
   | 6 | languages | `fieldset` legend 14 pt/600 **اللغات** / Languages; chip buttons `aria-pressed`, `height 36`, radius 999, `padding-x 14`, 13 pt/500, `border 1 pt`; selected = bg primary, cream, border primary; unselected = white, ink, border line (hover line-strong). Options: **العربية · الإنجليزية · الفرنسية · الهندية · الإيطالية · الألمانية · الفلبينية** (Arabic · English · French · Hindi · Italian · German · Filipino). | ar + en selected | — |
   | 7 | availability | `fieldset` card `radius 16, border line, padding 16`, legend **التوفر الأسبوعي** / Weekly availability: 7 weekday toggles (`height 40, min-width 48, radius 12, padding-x 8, 13 pt/600`; selected = border primary, bg primary-tint, text primary; unselected = border line, white, muted) labelled `weekdayShort` **الأحد · الاثنين · الثلاثاء · الأربعاء · الخميس · الجمعة · السبت**; `margin-top 16 grid-cols-2 gap 12`: `Select` **من** / From and **إلى** / To, options **05:00 … 22:00** hourly, `dir=ltr`; `margin-top 16` `Toggle` **يوميًا** / Every day (checked ⇔ all 7 days; turning it off selects Sun–Thu). | days [Sun, Mon, Tue, Wed, Thu, Sat] (Friday off), 06:00–21:00 | — |

   Footer: ghost **إلغاء** · primary **حفظ**. Save builds `{id, name, gender, specialty, years, rating, reviews, price, image, gyms, languages, certifications, bio, active, weekdays, from, to}`, toasts **تم حفظ المدرب (تجريبي)**, closes.

### 2.6 Media — `/owner/media` (tiles 07-owner_media_1…3)

1. **PageHeader** — **صور ملف النادي** / Gym Profile Photos; subtitle **حدّث حضور ناديك في ثوانٍ** / Update your gym's presence in seconds; action secondary rounded sm icon `rotate-ccw` **استعادة الصور الأصلية** / Restore original photos → resets cover/logo/gallery + toast **تمت استعادة الصور الأصلية** / Original photos restored.
2. **Layout** — `grid gap 20` (phone single column; xl two columns `[1fr 380 pt]` with a sticky preview aside). Phone order: cover card, logo card, gallery card, preview card.

3. **Cover card** (`Section` title **صورة الغلاف** / Cover photo; subtitle **صورة عرضية بدقة 1600 بكسل على الأقل** / Wide landscape photo, at least 1600 px): block `aspect 16:7`, `border-radius 24` (media radius), background charcoal, cover image; overlay gradient bottom `black/55` → transparent → top `black/10`; bottom overlay `inset-x 16 bottom 16`, wrap, `items-end space-between gap 12`: `GymLogo` 52 with `ring 2 pt white/80` + column (company EN name 16 pt/600 white; **الدفنة، الدوحة** / West Bay, Doha 13 pt `white/75`); `Button light rounded sm` icon `camera` **تغيير الغلاف** / Change Cover (bg cream, text primary). Hidden file input; on pick → object URL set + toast **تم التحديث (تجريبي)** / Updated (demo).

4. **Logo card** (`Section` **الشعار** / Logo; subtitle **صورة مربعة PNG أو JPG بدقة 512 بكسل على الأقل** / Square PNG or JPG, at least 512 px): row wrap `gap 20`: **dashed circle 112×112** (`border 2 pt dashed line-strong`, `padding 6`, hover border primary) containing `GymLogo` 100 (initials "PH" in Playfair 36 pt gold-beige on the dark gradient) with hover overlay `black/45` + `upload` icon; column `gap 8`: primary rounded sm icon `upload` **رفع الشعار** / Upload Logo; if a logo is set: ghost rounded sm icon `trash` text danger **حذف** / Remove.

5. **Gallery card** (`Section` **معرض الصور** / Gallery; subtitle **اسحب لإعادة الترتيب — الصور الأولى تظهر أولًا.** / Drag to reorder — the first photos show first.; header action primary rounded **xs** icon `image-plus` **إضافة صور** / Add Photos): grid `cols 2 gap 12` (sm 3, lg 4). Tile spec §3.15. Order shown in RTL: tile 1 at top-right, 2 at top-left, 3 right of row 2, etc. Last cell = dashed **add tile** (§3.14). Multi-file input `accept=image/*`; added photos append; toast **تم التحديث (تجريبي)**.
   Reorder: HTML5 drag (desktop) or the per-tile arrows; delete removes immediately (no confirmation).

6. **Customer preview card** (`aside`; phone: after the gallery): `border-radius 20, border line/80, bg canvas, padding 20`: overline **معاينة العميل** / Customer preview (`type-overline`, **gold**); **هكذا يظهر ناديك في OneQ** / How your gym appears on OneQ 16 pt/600; `margin-top 20` the customer **GymCard** (feature variant, max-width 340 centered — §3.21) showing cover, **بريميوم** glass pill, **4.9 ★** glass rating pill, name **باور هاوس جيم**, `map-pin` **الدفنة**, **يبدأ من** 12 pt/500 muted + `Price md per=month` **299 ر.ق / شهر**, CTA chip **استكشف النادي** (`arrow-up-right`); `margin-top 20` secondary rounded sm **block** **معاينة في التطبيق** / Preview in app; `margin-top 16` note 13 pt muted with `info` icon 16 pt: **تبقى الصور على هذا الجهاز ولا يتم رفع أي شيء (تجريبي).** / Photos stay on this device — nothing is uploaded (demo).

### 2.7 Reviews — `/owner/reviews` (tiles 08-owner_reviews_1…5)

1. **PageHeader** — **التقييمات** / Reviews; subtitle **ماذا يقول الأعضاء عن باور هاوس جيم** / What members say about Power House Gym. No actions.
2. **Layout** — `grid gap 20` (xl `[360 pt 1fr]`, summary column sticky `top 96`). Phone order: summary card, note card, reviews card.

3. **Summary card** (`Section` without title, body padding 20): label **متوسط التقييم** / Average rating 14 pt muted; `margin-top 8` row `items-end gap 12`: **4.9** in `font-num` **56 pt / 600 leading-none** ink; column (`padding-bottom 6`): `Stars` md (18 pt, gold) + **بناءً على 128 تقييم** / Based on 128 reviews 13 pt muted. Histogram `margin-top 24`, rows `gap 10`, 13 pt: star number (`type-num`, width 12, muted) · track `height 8, radius 999, bg sand, flex 1` with fill **gold `#9A4516`** width = `count / max` · count (`type-num` width 32, end-aligned, 500 ink). Values 5★ 116 · 4★ 9 · 3★ 2 · 2★ 1 · 1★ 0.

4. **Note card** — `row gap 12`, `radius 20, border line, bg canvas, padding 16`; `info` icon 20 pt primary; **لا يمكن تعديل تقييمات العملاء** / Customer ratings can't be edited (16 pt/600) + **يمكنك الرد بشكل علني، ويبقى التقييم والنص كما كتبه العميل تمامًا.** / You can reply publicly. Stars and text stay exactly as the customer wrote them. (13 pt muted).

5. **Reviews card** (`Section` title **أحدث التقييمات** / Recent reviews): `ul −margin-y 8` divided by `line/80`; each `li padding-y 20` → **ReviewCard** (§3.16). Relative dates from `Intl.RelativeTimeFormat(numeric:auto)`: **أمس · أول أمس · قبل 3 أيام · قبل 5 أيام · قبل 6 أيام · الأسبوع الماضي · قبل أسبوعين · قبل 3 أسابيع · قبل 4 أسابيع · الشهر الماضي** (< 7 days → days; < 30 → weeks; else months). English reviews render LTR within the RTL list (`dir=auto`).

   **Reply flow**: tap **رد** → inline `Textarea rows=3` (placeholder **اكتب ردًا عامًا…** / Write a public reply…, autofocus) + row `margin-top 10` end-aligned `gap 8`: ghost xs **إلغاء** · primary xs **نشر الرد** / Post reply (disabled while empty) → saves, toast success **تم نشر الرد (تجريبي)** / Reply posted (demo). Existing reply renders as a quoted block (§3.16) and the action becomes `pencil` **تعديل الرد** / Edit reply.

### 2.8 Analytics — `/owner/analytics` (tiles 09-owner_analytics_1…4)

1. **PageHeader** — title **التحليلات** / Analytics with inline `DemoBadge kind=sample` **بيانات تجريبية للعرض** / Demo / sample data; subtitle **أداء باور هاوس جيم خلال آخر 12 شهرًا** / Performance of Power House Gym over the last 12 months; action: `Segmented` sm **6 أشهر · 12 شهرًا** (default 12; `layoutId analytics-range`, label **الفترة**). Selecting 6 slices the last 6 months and shows every month label.

2. **Stat row** — `grid gap 16` (phone 1 col stacked; sm 3 cols). **MiniStat** card (§3.3):

   | Icon | Label | Value | Note |
   |---|---|---|---|
   | `crown` | **الخطة الأكثر شعبية** / Most popular plan | **3 أشهر** (20 pt/600) | **36%** |
   | `user-plus` | **أعضاء جدد** / New members | `Delta` **+18%** | **عن الشهر الماضي** / vs last month |
   | `trending-up` | **الإيراد** / Revenue | `Delta` **+12%** | **عن الشهر الماضي** |

3. **Chart grid** — `margin-top 16 gap 16` (xl 2 cols). Each chart is a `Section` card whose body holds a **256 pt** tall responsive chart (`dir=ltr` container) and, below it, the **عرض كجدول** / View as table toggle (§3.19). Recharts (line/area/bar) with shared styling (§3.10):

   | # | Title / subtitle | Chart | Axis |
   |---|---|---|---|
   | 1 | **نمو الأعضاء** / Membership growth — **إجمالي الأعضاء في نهاية كل شهر** / Total members at month end | Line, `members`, stroke primary 2 pt, no dots, active dot r 5 white stroke | Y domain 0–150, ticks 0/50/100/150, width 36 |
   | 2 | **اتجاه الإيرادات** / Revenue trend — **الإيراد الشهري بالريال القطري** / Monthly revenue in QAR | Area, `revenue`, gradient primary .14 → .01 | Y 0–30k, ticks 0/10k/20k/30k, width 44 |
   | 3 | **توزيع الاشتراكات** / Membership distribution — **الأعضاء الحاليون والسابقون حسب الخطة** / Active and past members by plan | **Donut** 200 pt, thickness 26 (§3.12) + legend list; hover highlights a segment (+6 pt stroke, others `opacity .45`) and the centre shows that segment's count/label | — |
   | 4 | **أعضاء جدد** / New members — **آخر 12 شهرًا** / Last 12 months | Bar, `newMembers`, fill primary, `maxBarSize 22`, top radius 4, `barCategoryGap 30 %`, hover cursor `rgb(90 0 32 / .04)` | Y auto (0–40), width 32 |

   X axis: month short names, every **other** label in 12-month mode (**نوفمبر · يناير · مارس · مايو · يوليو · سبتمبر**), reversed in RTL, tick 12 pt muted, no axis/tick lines, `dy 8`. Y axis on the **right** in RTL. Grid: horizontal only, stroke **`#EEE5DD`**. Tooltip §3.10. Note: in the headless captures the series paths had not painted yet (only grid/axes/labels appear) — the chart styling comes from code.

   Donut legend rows: `padding 10 12`, radius 12, hover/active bg canvas, 15 pt: swatch 12 radius 4 · label · count (600) · percent (width 44, 13 pt muted). Total row `border-top line, padding-top 12`: **الأعضاء** muted/500 · **127** 600.

### 2.9 Not-found page (`/owner/dashboard`, `/owner/profile`, any unknown route)

Full-screen `main` (no shell): background **cream** with `stage-grain` (two faint radial glows `#5A0020 @7 %` top-start and `#B5561E @7 %` bottom-end + SVG fractal-noise grain), content centered, `max-width 384`, text-center:
OneQ wordmark 96 pt burgundy → **404** `type-num` **72 pt / 600**, color `primary/15`, `margin-top 40` → `h1 type-display-m` 24 pt **هذه الصفحة في يوم راحة** / This page is taking a rest day → 16 pt muted **الصفحة التي تبحث عنها غير موجودة.** / The page you're looking for doesn't exist. → `Button size=lg` (h 56, px 28, 17 pt) `elevated` (`shadow-cta`) icon `arrow-left` **العودة للرئيسية** / Back to Home → `/app/home` (for OneQ: workspace home).

---

## 3. Shared component catalog

### 3.1 KPI stat card (`StatCard`)

| Property | Light card | Hero (dark) card |
|---|---|---|
| Box | `min-height 168 pt`, column `space-between`, `padding 16` (sm 20), `border-radius 20`, `overflow hidden` | same |
| Surface | white, `border 1 pt line/80`, `shadow-soft` | gradient `to bottom-end` **primary → primary-deep**, text cream, `shadow-card`; decorative circle 160×160 `white/6` at `top −48, end −40` |
| Row 1 | label 14 pt/500 muted (start) · icon tile **36×36 radius 12** bg primary-tint, icon 17.6 pt primary (end) | label `cream/75` · tile `white/10`, icon cream |
| Value | `margin-top 16`, `font-num` **28 pt** (sm 32) / 600, `tracking-tight`, no wrap, ink | cream; the revenue hero uses `Price lg tone=cream` with amount forced to 32 pt + "ر.ق" 13 pt |
| Row 3 | `margin-top 14`, row `items-end space-between`: `Delta` pill + caption 12 pt muted; sparkline 60×26 at the end, only when card ≥ 256 pt wide | caption `cream/60`; `Delta inverted`; sparkline tone inverted |

### 3.2 Delta pill (`Delta`) and sparkline

- Delta: `inline-flex h 24, radius 999, padding-x 8, 13 pt/600, gap 4`, icon `trending-up`/`trending-down` 14 pt; value `+12%` as `<bdi dir=ltr type-num>`. Positive: bg success-tint `#E3EFE5`, text success `#2F6B40`; negative: bg danger-tint, text danger; inverted (on hero): bg `white/12`, text **`#BFE3C7`**. Optional trailing label 13 pt muted (`cream/60` inverted).
- Sparkline: SVG `width 112 height 36` default (KPI uses 60×26), padding 4, stroke **`#CDBFB5`** 2 pt round (inverted `rgb(247 240 234 / .55)`), area fill gradient primary `.14 → 0` (inverted cream), end dot r 4 fill primary stroke white 2 (inverted fill `#F7F0EA` stroke primary). **Mirrored horizontally in RTL** (`rtl:-scale-x-100`) so "latest" stays at the reading end.

### 3.3 Mini stat card (analytics)

`row items-center gap 16, radius 20, border line/80, white, padding 20, shadow-soft`: icon tile **48×48 radius 16** bg primary-tint, icon 22 pt primary · column: label 13 pt muted; `margin-top 4` row wrap `gap 8`: value **20 pt/600 ink** (or a `Delta` pill) + note 13 pt muted.

### 3.4 Section card + header with "عرض الكل"

`<section>` `min-w-0, radius 20, border 1 pt line/80, bg white, shadow-soft`. Header `padding 20 20 0` (sm 24 sides), row `items-start space-between gap 16`: `h2` **17 pt/600 ink** + optional subtitle `margin-top 2`, 13 pt muted; optional action at the end — the "view all" link is **عرض الكل** / View all, 14 pt/600 primary, hover underline, no chevron. Body `padding 16 20 20` (sm 24 sides). `padded=false` removes body padding (tables).

### 3.5 List row (bookings / expiring / members)

`row gap 12 items-center padding-y 12` (16 in standalone lists), separated by `1 pt line/80` (`line/70` in cards). Anatomy: `Avatar` 38–42 · `min-w-0 flex-1` column: primary text 15–16 pt/500–600 ink truncate; meta 13 pt muted · end column `items-end gap 4`: `Price sm tone=ink` and/or `StatusPill`, or an xs action button.

### 3.6 Segmented control (`Segmented`)

`role=radiogroup`, `inline-flex, radius 999, border 1 pt line, bg sand/70, padding 4`. Buttons `flex 1`, round, 600, no-wrap: size **md** `h 40 px 16 15 pt`, size **sm** `h 36 px 14 14 pt`. Selected button text **cream** over a shared animated pill (framer `layoutId`) bg **primary** with shadow `0 4px 12px −4px rgb(90 0 32/.5)`, tween **0.26 s** ease-premium; unselected text muted (hover ink). Optional 16 pt leading icon. Measured on phone: track 44 pt tall, selected pill 36 pt.

### 3.7 Dropdown select (`Select`)

Native `<select>` styled like an input: `h 44` (md) / 52 (lg), `padding-start 14, padding-end 40`, 15 pt, `radius 14`, `border 1 pt line` (hover line-strong), bg surface, `appearance none`, lucide `chevron-down` 16 pt muted absolutely at `end 14`. Focus: border primary + ring `0 0 0 4px rgb(90 0 32/.10)`. Optional label above (14 pt/600 ink, `gap 8`) and error below. **RN:** render as a pressable field opening a bottom sheet (`Modal variant=sheet`) list of options with a check mark.

### 3.8 Search input

See §2.2: `h 44, radius 12, border line, bg canvas, ps 40 pe 12, 15 pt`, search icon 18 pt muted at `start 14`, placeholder faint; focus border primary, bg white, ring 4 pt `rgb(90 0 32/.08)`.

### 3.9 Buttons (`Button`)

Base: `inline-flex center, 600, no-wrap`, transition 200 ms ease-premium on bg/border/color/transform/shadow, `active: scale .98` (disabled: none). `shape=pill` (default) → radius 999; `shape=rounded` → radius 12. `block` → full width. `elevated` → `shadow-cta`. `loading` → `loader-circle` spinning replaces the icon. Icons: `strokeWidth 2`; size lg 20 pt, xs 16 pt, else 18 pt; `iconEnd` supported (with `flip-rtl`).

| Size | Height | Padding-x | Font | Gap |
|---|---|---|---|---|
| lg | 56 | 28 | 17 pt | 10 |
| md (default) | 48 | 24 | 16 pt | 8 |
| sm | 44 | 18 | 15 pt | 8 |
| xs | 36 | 14 | 14 pt | 6 |

| Variant | Normal | Hover | Disabled |
|---|---|---|---|
| primary | bg primary, text cream | bg primary-dark | bg `primary/40` |
| secondary | bg surface, text ink, border 1 pt line | border line-strong, bg white | text faint |
| soft | bg sand, text primary | bg sand-deep | text faint |
| ghost | transparent, text ink (pages recolor to danger/success/primary) | bg `sand/80` | text faint |
| light | bg cream, text primary (on dark) | bg white | — |
| glass | `glass` (white 14 % + blur 14 px), white text, border `white/25` | bg `white/25` | — |
| dark | bg charcoal, white | bg black | — |
| danger | bg danger, white | brightness 110 % | — |
| outline-light | border `cream/40`, text cream | bg `cream/10` | — |

Owner pages use **rounded** shape for all actions; **pill** shape appears on the 404 button, chips and toggles.

### 3.10 Charts

**Custom SVG line/area (dashboard revenue)**: height 280; paddings top 14, bottom 30, axis 44 (y labels), inner 20; gridlines 1 pt **`#EEE5DD`**; tick labels 12 pt muted `#6F625D` (right side in RTL, `text-anchor start`); area gradient primary `.14 → .01`; line primary 2 pt round joins; data mirrored in RTL (latest month at the start/right); hover: vertical guide 1 pt line-strong, marker r 5 primary with 2 pt white stroke; tooltip (`min-width 128/144, radius 12, border line, bg white, padding 10 14, shadow-card, text-start`): label 12 pt/500 muted; value row `margin-top 4` 15 pt/600 ink with 10 pt round swatch and `type-num` value, e.g. "24,850 ر.ق".
**Recharts (analytics)**: `CartesianGrid vertical=false stroke #EEE5DD`; axes `tickLine=false axisLine=false tick {fill muted, 12}`; XAxis `dy 8`, `reversed` in RTL, `interval 1` for 12 months; YAxis `orientation right` in RTL; line/area stroke primary 2 pt, `activeDot r 5 stroke #fff strokeWidth 2`; area fill gradient id `an-rev`; bars primary, radius `[4,4,0,0]`, `maxBarSize 22`; tooltip cursor line stroke line-strong (bars: fill `rgb(90 0 32/.04)`); tooltip content identical to the custom one, value formats: `"{n} · الأعضاء"`, currency, `"+{n} · أعضاء جدد"`.

### 3.11 Stacked distribution bar + legend

Bar: `height 12`, full width, `gap 2 pt` between segments, outer radius 999 (first/last segment rounded on the outer sides), segment width = share %, colors by plan months `1 #D9A0AB · 3 #B5586C · 6 #86243F · 12 #5A0020`, `title="{label}: {count}"`, `role=img` with aria list. Legend: see §2.1 item 5.

### 3.12 Donut

SVG `size 200`, ring `thickness 26`, 2 pt gaps between arcs (butt caps), colors as above; centre: value **32 pt** `font-num`/600 ink + label 12 pt muted `max-width 96` (**الأعضاء** / Members); hover: hovered arc stroke 32, others opacity .45, centre shows hovered count + label; `transition 200 ms`.

### 3.13 Insight callout

`row items-start gap 8, radius 16, bg gold-tint/70 (#F7E8DC @70 %), padding 12`, 13 pt leading-relaxed ink; leading lucide **`crown`** 16 pt **gold `#9A4516`** (`margin-top 2`).

### 3.14 Dashed upload tiles

- Gallery add tile: `aspect 1:1, radius 16, border 2 pt dashed line-strong, column center gap 8, text muted`; icon `image-plus` 28 pt strokeWidth 1.6; label 13 pt/600 **إضافة صور**; hover: border primary, bg `primary-tint/30`, text primary.
- Trainer photo tile: 96×96, radius 24, same dashed style, icon `user-plus` 32 pt.
- Logo tile: circle 112, dashed, `padding 6`, contains the logo.

### 3.15 Gallery tile

`aspect 1:1, radius 16, overflow hidden, cursor grab` (dragging: source `opacity .4`; drop target `ring 2 pt primary` with 2 pt offset). Overlays: **index badge** `start 8 top 8`, 28×28 round, bg `black/55`, white 12 pt/600 `type-num` (1-based); **drag handle** `end 8 top 8`, 28×28 round `glass` (white 14 % + blur), `grip-vertical` 16 pt white; **bottom bar** `inset-x 8 bottom 8` (always visible on phones; hover-only ≥ sm): start group of two round **32×32** buttons bg `white/92`, `shadow-sm`, ink: `chevron-left` **تقديم** / Move earlier and `chevron-right` **تأخير** / Move later (`flip-rtl`, disabled `opacity .4` at the ends); end: same button with `trash` in **danger** (hover bg danger-tint) **حذف الصورة** / Remove photo. Image `alt`: **الصورة {n} من {total}**.

### 3.16 Review card (owner)

`row items-start gap 12`: `Avatar` 42 (initials from author, e.g. **NA**, **خم**) · column `min-w-0 flex-1`: header wrap space-between (author 16 pt/600 ink `dir=auto`; relative date 13 pt muted) · `Stars` sm · text `margin-top 8` 15 pt leading-relaxed `ink/85` `dir=auto` · **reply block** (if any): `margin-top 12, radius 16, border-inline-start 2 pt primary, bg primary-tint/40, padding 14`: header 13 pt/600 primary with `GymLogo` 22 → **رد من باور هاوس جيم**; reply text `margin-top 6` 15 pt `ink/85` · action: `Button ghost rounded xs` text primary, `margin-inline-start −12, margin-top 8`, icon `message-square-reply` (or `pencil` when editing an existing reply) → **رد** / **تعديل الرد**.

### 3.17 Modal / bottom sheet (`Modal`) and Drawer

**Modal** — portal, `z 60`; backdrop `rgb(21 16 16 / .55)` + `blur 2 px`, fade 0.2 s; panel bg **surface**, `shadow-float`, focus-trapped, `Escape` closes, body scroll locked, autofocus on `[data-autofocus]`/first input. `variant=auto`: on phones a **bottom sheet** (`inset-x 0, bottom 0, max-height 92 %, top radii 28`) with a drag handle `40×4, radius 999, bg line-strong, margin-top 10`; ≥ 640 px a centered dialog (`inset-x 16, max-height 88dvh, radius 28`, max-width sm 448 / md 512 / lg 672). `variant=dialog` always centered (used for confirmations). Enter: `opacity 0→1, y 32→0` 0.28 s ease-premium; exit `y 24`. Header `padding 20 24 8`: title `type-display-s` 20 pt + optional description 15 pt muted; close `IconButton ghost sm` (`x`, 36×36) at the end with `margin-end −8`. Body `padding 8 24 24`, scrollable. Footer `border-top line, bg surface, padding 16 24 (16 + safe-bottom)`; buttons end-aligned (**appear on the left in Arabic**), `gap 10`.
**Drawer** — same backdrop at 45 %; `aside` full height, `width 100 %, max-width 440` (menu 300), `shadow-float`, slides from its side 0.3 s ease-premium; tone `surface` or `burgundy` (gradient primary-deep → primary, cream text); header `padding 20 24 12`: title `type-display-s` + close `IconButton` (ghost / glass).

### 3.18 Form primitives (`Field`, `Input`, `Textarea`, `Toggle`)

- **Field**: column `gap 8`; label 14 pt/600 ink; hint 13 pt muted; error 13 pt/500 danger (`role=alert`).
- **Input**: `w-full, radius 14, border 1 pt line (hover line-strong), bg surface, text ink, placeholder faint`; size lg `h 52 px 16 16 pt`; size md `h 44 px 14 15 pt`; focus `border primary + 0 0 0 4px rgb(90 0 32/.10)`; error → border danger. Icon variant: icon 20 pt muted at `start 16`, `padding-start 44`. Prefix variant (e.g. "+974"): prefix box `radius-start 14, bg sand, px 14, 600 type-num`, `dir=ltr` row.
- **Textarea**: `min-height 96, radius 14, border line, bg surface, padding 12 16, 15 pt leading-relaxed, resize vertical`, same focus.
- **Toggle**: row space-between `gap 16`: label 15 pt/600 ink (+ description 13 pt muted) · switch `h 28 w 48 padding 2 radius 999`, bg **primary** on / **sand-deep** off, knob 24 white with shadow `0 1px 3px rgb(0 0 0/.2)`, slides 20 pt (mirrored in RTL), 200 ms ease-premium; disabled `opacity .5`.

### 3.19 Table-toggle ("عرض كجدول")

Button 13 pt/600 primary hover underline **عرض كجدول** / View as table, `aria-expanded`; expands a `table` `margin-top 8`, 13 pt, rows divided by line: key (muted) · value (`type-num` 500 ink, end-aligned), `padding-y 6`.

### 3.20 Sortable table header

`th` 13 pt/500 muted `padding 12 16 text-start`; inner button `gap 4` with icon 14 pt: `chevrons-up-down` (inactive) / `arrow-up` (asc) / `arrow-down` (desc); active → ink. `aria-sort` set; `aria-label` **ترتيب حسب {col}**.

### 3.21 Customer gym card (preview)

Feature variant: image `aspect 4:3, radius 24` with top scrim (`scrim-t`); `glass` category pill top-start (**بريميوم**), glass rating pill top-end (`h 32, px 10, 14 pt/600 white`, star **`#F2B25C`** filled 14 pt + `type-num` value); body `padding-x 4, padding-top 16`: name `type-display-s` truncate; `map-pin` 16 pt + area 15 pt muted; `margin-top 16` row `items-end space-between`: (**يبدأ من** 12 pt/500 muted; `Price md per=month`) and CTA chip `h 40 radius 999 px 16 14 pt/600` bg primary cream (**استكشف النادي** + `arrow-up-right`).

### 3.22 Small primitives

| Component | Spec |
|---|---|
| **Avatar** (initials) | round, 600, `fontSize max(11, size × .36)`; tone sand (bg sand `#F1E7DD`, text primary) default; primary (bg primary, cream); cream. Initials = first letter of first + last word after stripping "Al-"/"ال" (e.g. "Hamad Al-Marri" → HM; "حمد المري" → **حم**), uppercase. |
| **Pill / Badge** | `inline-flex items-center gap 6, radius 999, 600, no-wrap`; sm `h 24 px 10 11.5 pt`; md `h 28 px 12 12 pt`; optional 6 pt dot (`bg currentColor`) and 14 pt icon strokeWidth 2.2. Tones: neutral (sand/ink) · primary (primary-tint/primary) · gold (gold-tint/gold) · success (success-tint/success) · danger (danger-tint/danger) · glass · cream (cream/primary) · solid (primary/cream) · muted (`#EFEAE6`/muted). |
| **StatusPill** | Pill with dot; map: active→success **نشط** · confirmed→primary **مؤكد** · completed→success **مكتمل** · upcoming→primary **قادم** · expired→danger **منتهي** · cancelled→muted **ملغى** · inactive→muted **غير نشط** · expiring→gold **ينتهي قريبًا** (EN Active · Confirmed · Completed · Upcoming · Expired · Cancelled · Inactive · Expiring). |
| **Price** | `inline-flex items-baseline gap 4`; amount `type-num` 600; currency **ر.ق** / QAR 600 `tracking-wide opacity .8`; AR order amount→currency inside `<bdi dir=rtl>`, EN "QAR 299"; sizes sm 16/11 pt · md 20/12 · lg 28/13 (leading-none) · xl 40/14; optional suffix **/ شهر** or **/ جلسة** (500, opacity .7); tones primary / ink / cream / white. Thousands separator "," always, Latin digits. |
| **Stars** | 5 × `star` icon `gap 2`; sm 14 pt, md 18 pt; filled `fill gold text gold`; empty `fill sand text sand-deep`; `role=img aria-label` **التقييم {r} من 5**. |
| **Rating (inline)** | star 16 pt gold + value `type-num` 600 ink + `·` faint + **{n} تقييم** muted 14 pt. |
| **IconButton** | round; md 44, sm 36, lg 48; icon 20 (sm 16); variants surface (bg surface, border line, shadow-soft) · ghost (hover sand/80) · glass · primary · soft · cream; `active: scale .95`. |
| **DemoBadge** | see §1.2 row 4; kinds demo **تجريبي**, data **بيانات تجريبية**, sample **بيانات تجريبية للعرض**. |
| **EmptyState** | column center `padding 48 24`: circle 64 bg sand with 28 pt primary icon (strokeWidth 1.8) · title `type-display-s` ink · body `margin-top 6` muted `max-width 320` · action `margin-top 20`. |
| **Skeleton** | `.skeleton` shimmer: gradient sand → `#F8F1EA` → sand, `background-size 200 %`, animation 1.4 s linear infinite. Use for list rows / cards while loading (the reference's data is local, so no loading screens were captured). |
| **GymLogo** | §1.2 row 2. |

---

## 4. Design tokens, typography, motion

### 4.1 Colors

| Token | Hex | Usage |
|---|---|---|
| primary | `#5A0020` | brand maroon: primary buttons, active segmented pill, chart lines, links, selected chips, sidebar gradient end |
| primary-dark | `#45001A` | primary button hover |
| primary-deep | `#2A000F` | sidebar/drawer/FAB-menu gradient start, hero KPI gradient end |
| primary-tint | `#F3E6E6` | icon tiles, primary pills, benefit chips, selected weekday, reply quote bg (40 %) |
| primary-soft | `#E9D3D5` | (defined, unused in owner) |
| cream | `#F7F0EA` | body bg, active sidebar item bg, text on dark, light buttons |
| canvas | `#FBF8F5` | owner page background, top bar (85 %), search bg, nested tiles, table header (60 %) |
| surface | `#FFFCF7` | inputs, selects, sheets, secondary buttons, lang-toggle track |
| sand | `#F1E7DD` | segmented track (70 %), avatars, soft buttons, demo badge, histogram track, empty-state circle |
| sand-deep | `#E8DACE` | toggle off, progress track, soft hover |
| line | `#E7DBD1` | all 1 pt borders / dividers (often at 70–80 %) |
| line-strong | `#D6C5B8` | hover borders, dashed upload borders, sheet handle, chart hover guide |
| ink | `#231A18` | primary text |
| charcoal | `#151010` | toasts (95 %), dark buttons, cover placeholder |
| muted | `#6F625D` | secondary text, labels, axis ticks |
| faint | `#A89C96` | placeholders, separators "·", inactive progress |
| gold | `#9A4516` | stars, histogram fill, gold pills text, crown, "معاينة العميل" overline |
| gold-tint | `#F7E8DC` | gold pills, insight callout (70 %), fresh booking rows (40 %) |
| success | `#2F6B40` | active/completed pills, positive deltas, reply indicator |
| success-tint | `#E3EFE5` | their backgrounds |
| danger | `#A3302F` | deactivate/remove actions, expiring-soon text, errors, danger button |
| danger-tint | `#F6E3E1` | danger pill bg / hover |
| muted-pill bg | `#EFEAE6` | cancelled/inactive pills |
| chart series | `#D9A0AB` · `#B5586C` · `#86243F` · `#5A0020` | 1 / 3 / 6 / 12-month plans |
| chart grid | `#EEE5DD` | gridlines |
| sparkline stroke | `#CDBFB5` | light sparkline |
| delta on dark | `#BFE3C7` | hero delta text |
| toast success icon | `#8FD19E` | |
| sidebar accent | `#F2C9A8` | "لماذا OneQ" item + grow-card icon |
| logo initials | `#E9C9A6` on `#1D1415 → #3A2B2C` | fallback company logo |
| glass rating star | `#F2B25C` | customer gym card |
| scrim | `rgb(21 16 16 / .55)` modal · `.45` drawer | overlays |

### 4.2 Radii, shadows, blur

| Token | Value |
|---|---|
| radius-input | 14 pt (inputs, selects, textareas) |
| radius-card | 20 pt (all cards, member mini-cards) |
| radius-media | 24 pt (cover image, customer card image, trainer photo tile) |
| radius-sheet | 28 pt (modals/sheets) |
| rounded-xl / 2xl / 3xl | 12 / 16 / 24 pt (rounded buttons & icon tiles / tiles & callouts / trainer photo) |
| pill | 999 |
| shadow-soft | `0 1px 2px rgb(35 26 24/.04), 0 8px 24px −14px rgb(35 26 24/.16)` — cards, secondary buttons |
| shadow-card | `0 10px 30px −12px rgb(90 0 32/.18)` — hero KPI, tooltips |
| shadow-cta | `0 12px 28px −10px rgb(90 0 32/.55)` — FAB, elevated buttons |
| shadow-float | `0 30px 80px −24px rgb(42 0 15/.42), 0 12px 24px −12px rgb(42 0 15/.18)` — sheets, drawers, toasts, presenter menu |
| glass | bg `rgb(255 255 255/.14)` + `backdrop-filter blur(14px) saturate(140%)` |
| glass-cream | bg `rgb(255 252 247/.86)` + `blur(18px) saturate(160%)` (status-bar backdrop, customer tab bar) |

### 4.3 Typography

Fonts: **IBM Plex Sans Arabic** 400/500/600/700 (body + display in Arabic), **Outfit** 400/500/600 (body + numerals in English; numerals also in Arabic via `type-num`), **Playfair Display** 700 (display in English, logo initials). `html[lang=ar]` sets both body and display to Plex Arabic. Body 16 pt / line-height 1.625, antialiased.

| Style | Size / weight / line-height / tracking | Used for |
|---|---|---|
| type-display-xl | 44 pt / 700 / 1.16 / −.015em | (customer hero) |
| type-display-l | 32 pt / 700 / 1.22 / −.01em (lg 36–40) | page titles, dashboard h1 |
| type-display-m | 24 pt / 700 / 1.3 / −.005em | 404 title |
| type-display-s | 20 pt / 700 / 1.35 | plan names, sheet titles, member name, review summary |
| type-overline | 12 pt / 600 / 1.35 / +.16em uppercase | section eyebrows (التواصل, معاينة العميل) |
| type-num | Outfit/Plex, `tabular-nums lining-nums` | every number, price, phone, date range, counters |
| card title | 17 pt / 600 | Section headers |
| body | 16 pt / 400 | names (500–600), inputs lg |
| body-s | 15 pt | inputs md, list primary text, subtitles, chips text |
| caption | 13 pt | meta, hints, errors (500), pills md (12), deltas |
| micro | 12 pt / 11.5 pt / 11 pt | overlines, tooltip labels, pill sm, currency sm |
| big numbers | 28/32 pt (KPI), 40 pt (plan price), 56 pt (avg rating), 72 pt (404) | `font-num` 600 leading-none |

Numbers are always **Latin digits** (`ar-QA-u-nu-latn`), thousands separated by "," ; currency string **ر.ق** after the amount in Arabic, **QAR** before it in English. Dates: `full` "الأحد، 4 أكتوبر", `dayMonth` "4 أكتوبر", `medium` "4 أكتوبر 2026", `monthShort` "أكتوبر", `weekdayShort` "الأحد"; times 12-hour "6:00 ص / 4:00 م".

### 4.4 Motion

| Element | Spec |
|---|---|
| Global ease | `cubic-bezier(.22, 1, .36, 1)` ("ease-premium"); default Tailwind transitions 150 ms. |
| Route change | main `opacity 0→1, y 6→0`, 0.24 s. |
| Buttons / icon buttons | 200 ms color/transform; press `scale .98` (icon buttons `.95`). |
| Segmented pill | shared-layout tween 0.26 s. |
| Toggle knob | 200 ms. |
| Modal / sheet | backdrop fade 0.2 s; panel 0.28 s (`y 32→0`); exit `y 24`. |
| Drawer | 0.3 s slide. |
| Toast | 0.24 s (`y ±12`, `scale .98`), auto-dismiss 2.8 s. |
| Presenter menu | 0.2 s (`y 10`, `scale .97`). |
| Donut / gallery tiles | 200 ms stroke/opacity/transform. |
| Keyframes | `oq-rise` (fade + 14 px rise), `oq-shimmer` (skeleton, 1.4 s). |
| Reduced motion | `prefers-reduced-motion` hook exists; honor it by disabling transforms. |

---

## 5. Mapping notes — pages OneQ needs that the reference lacks

Rules: reuse only §3 components; every page = `PageHeader` → white cards (`radius 20, border line/80, shadow-soft`) → lists/forms; add/edit always in a `Modal variant=auto` bottom sheet with ghost **إلغاء** + primary **حفظ** footer; destructive actions always via `Modal dialog sm` with a `danger` button; feedback via top toasts; counts in segmented labels; empty states via `EmptyState`.

### 5.1 Company workspace

| Page | Layout proposal (same components) |
|---|---|
| **Services & products** (الخدمات والمنتجات) | `PageHeader` title **الخدمات** + subtitle "تظهر التعديلات فورًا في صفحة شركتك"; actions: secondary `eye` **معاينة في التطبيق**, primary `plus` **إضافة خدمة**. Toolbar card: search (§3.8) + `Segmented` **الكل · خدمات · منتجات** + category `Select`. Rows as **plan cards** (§2.3) in a 1-col grid: name `type-display-s`, category `Pill neutral`, inactive `Pill muted dot`; **price block** = `Price xl primary` for the offer price and, when an offer exists, the original price **struck through** beside it in 20 pt `type-num` **faint** with `text-decoration: line-through`, plus a `Pill gold` **خصم 20%**; duration line 13 pt muted (**≈ 45 دقيقة**); benefits/description list with check icons; footer `Toggle` **ظاهرة للعملاء** + `تعديل` / `إيقاف`. Form fields: name AR/EN (two `Input md`), category `Select`, price (`Input number dir=ltr` with prefix **ر.ق**), offer price (optional, hint "اتركه فارغًا لعدم وجود عرض"), duration minutes, description `Textarea`, image upload tile (§3.14, 96×96), `Toggle` **متاح للحجز**. |
| **Staff availability per weekday** (مواعيد الموظفين) | Reuse the trainer form's availability fieldset (§2.5 row 7) inside each staff member's edit sheet: 7 weekday chips + **من / إلى** selects + **يوميًا** toggle; add a second row of chips per selected day only when a day differs (expandable "تخصيص لكل يوم" ghost xs link). Staff list page = Trainers page (photo 52 radius 16, name, role 13 pt muted, `StatusPill`, bookings this month, `تعديل` / `إيقاف`). |
| **Opening hours editor** (ساعات العمل) | A `Section` card **ساعات العمل** / Opening hours: 7 rows (`padding-y 12`, divided line/70): day name 15 pt/500 (flex 1) · `Toggle` (open/closed; closed shows `Pill muted` **مغلق**) · two `Select`s **من / إلى** (hourly 05:00–24:00, `dir=ltr`) in a `grid-cols-2 gap 12` under the day on phones. Header action: ghost xs **نسخ لكل الأيام**. Save = primary `block` button at the bottom; success toast **تم الحفظ**. |
| **Location picker** (الموقع) | `Section` **الموقع**: map preview block `aspect 16:9, radius 24` (media radius) with a centered primary pin and a `Button light rounded sm` icon `map-pin` **تحديد على الخريطة** overlaid bottom-end (same overlay pattern as the cover card §2.6); below it `Input lg` **العنوان** with `map-pin` icon, `Select` **المنطقة** (areas list: الدفنة · الريان · لوسيل · اللؤلؤة · الوعب · مشيرب · السد · الدوحة), `Input` **رابط خرائط جوجل** (ltr). Picking opens a full-screen `Modal variant=sheet` with the map and a footer **تأكيد الموقع**. |
| **Subscriptions** (الاشتراكات) | = Plans page (§2.3) for plan definitions + Members page (§2.2) for subscribers (status segmented **الكل · نشط · منتهي · ملغى**, plan select, 10-row pagination, member drawer with progress bar). Dashboard "تنتهي خلال 7 أيام" card with **تذكير** chips. |
| **Company dashboard** | Identical to §2.1 with labels: إجمالي العملاء · العملاء النشطون · جدد هذا الشهر · إيرادات الشهر (hero) · الحجوزات؛ quick actions: **إضافة خدمة** (primary, `plus`) · **إضافة موظف** (`user-plus`) · **تحديث الصور** (`image-plus`). |
| **Bookings** | §2.4 as-is; type pills: `gold` + `dumbbell`/`scissors`-style icon for service sessions, `primary` + `id-card` for subscriptions, add `Pill neutral` for products; add status `upcoming` (**قادم**, primary). Add a per-row ghost xs **تأكيد** / **إلغاء** when status is pending (use `Pill gold` **بانتظار التأكيد**). |

### 5.2 Admin workspace

Same shell: top bar with the **OneQ** wordmark instead of a company avatar, `DemoBadge` replaced by an **مشرف** / Admin `Pill solid`, drawer tone burgundy with nav: لوحة التحكم (`layout-dashboard`) · الفئات (`layers`) · الشركات (`building-2`) · الحجوزات (`calendar-check`) · الأداء (`chart-line`) · الإشعارات (`bell-ring`). Lucide names outside the reference set are proposals.

| Page | Layout proposal |
|---|---|
| **Categories** (الفئات) | `PageHeader` **الفئات** + primary `plus` **إضافة فئة**. Grid `cols 2 gap 12` of **MiniStat-style cards** (§3.3): icon tile 48 (category emoji/icon) · name 16 pt/600 · "{n} شركة" 13 pt muted · `StatusPill` active/inactive; tap → sheet with `Input` name AR / name EN, icon picker (chip row), `Toggle` **ظاهرة**, order (number). Reorder with the gallery arrow buttons pattern (§3.15). |
| **Companies** (الشركات) | Members page pattern: search + `Segmented` **الكل · نشطة · قيد المراجعة · موقوفة** + category `Select`; rows: `GymLogo` 42 · company name 600 + `StatusPill` · category · area 13 pt muted · end: `Rating` inline (4.9 · 128 تقييم). Tap → **Drawer** (§3.17) with identity row (logo 64, name `type-display-s`, status pill md), overline **التواصل** (phone/mail), overline **الأداء** mini cards (الحجوزات هذا الشهر / الإيراد), action buttons: primary **اعتماد** / secondary **إيقاف** (danger confirm dialog). Pagination footer identical. |
| **Bookings per day** (الحجوزات اليومية) | Bookings page (§2.4) with the period `Segmented` **اليوم · الأسبوع · الشهر** and a date strip: horizontal `snap-row` of day chips (`h 40 min-w 48 radius 12`, weekday short + day number, selected = primary-tint/primary border) above the list; summary line **{n} حجز · {amount}**; rows add the company name as the meta line and a `Pill neutral` with the category. Group headers per day = `type-overline` muted. |
| **Company performance** (أداء الشركات) | Analytics page (§2.8): stat row (`crown` **الشركة الأكثر حجزًا**, `user-plus` **شركات جديدة** delta, `trending-up` **الإيراد** delta); charts: line **نمو الحجوزات**, area **اتجاه الإيرادات**, donut **التوزيع حسب الفئة** (series colors from the 4-step maroon ramp, extend with `#C97A8A`, `#6E1A33` if more categories), bar **شركات جديدة**; plus a `Section` **أفضل الشركات** list rows (logo 38 · name · `Rating` · `Price sm` revenue) sorted desc with **عرض الكل**. Keep **عرض كجدول** under every chart. |
| **Notifications** (الإشعارات) | `PageHeader` **الإشعارات** + primary `plus` **إرسال إشعار**. Card list rows: icon tile 36 (bell-ring, primary-tint) · title 15 pt/500 · body 13 pt muted 2-line clamp · relative date 12 pt faint · `Pill` audience (**الكل / الشركات / العملاء**). Compose sheet: `Select` **الجمهور**, `Input` **العنوان**, `Textarea` **النص**, `Toggle` **إرسال الآن** (off → `Select` schedule date/time), footer ghost **إلغاء** · primary **إرسال** → toast **تم إرسال الإشعار**. Empty state icon `bell-ring` **لا توجد إشعارات بعد**. |

### 5.3 Behaviours to keep everywhere

- Deep link `?new=1` opens the create sheet and is immediately removed from the URL (replace).
- Toggling a visibility switch ON saves instantly; OFF asks for confirmation (dialog sm, danger button).
- Lists: phone = card list with `Avatar` rows; desktop (≥ 900) = table. OneQ is phone-only → implement the list variant only, keep the toolbar card above it.
- Pagination: 10 per page with `[‹] n / N [›]` square buttons + "1–10 من 127".
- All numbers Latin digits, tabular; currency after amount in Arabic.
- Toasts for every mutation; success tone uses the green check.

---

## 6. Dictionary — owner namespace (AR / EN)

| Key | AR | EN |
|---|---|---|
| common.menu | القائمة | Menu |
| common.demo / demoData / sampleData | تجريبي / بيانات تجريبية / بيانات تجريبية للعرض | Demo / Demo Data / Demo / sample data |
| common.viewAll / seeAll | عرض الكل | View all / See all |
| common.all | الكل | All |
| common.cancel / save / edit / remove / close / confirm / done / next / previous | إلغاء / حفظ / تعديل / حذف / إغلاق / تأكيد / تم / التالي / السابق | Cancel / Save / Edit / Remove / Close / Confirm / Done / Next / Previous |
| common.perMonth / perSession | / شهر · / جلسة | / month · / session |
| common.today / tomorrow | اليوم / غدًا | Today / Tomorrow |
| common.months_* | {{count}} شهر · شهر واحد · شهران · {{count}} أشهر · {{count}} شهرًا · {{count}} شهر | {{count}} month(s) |
| common.members_* | لا يوجد أعضاء · عضو واحد · عضوان · {{count}} أعضاء · {{count}} عضوًا · {{count}} عضو | {{count}} member(s) |
| common.reviews_* | لا توجد تقييمات · تقييم واحد · تقييمان · {{count}} تقييمات · {{count}} تقييم | {{count}} review(s) |
| common.viewCustomerDemo | عرض تجربة العميل | View Customer Demo |
| common.rating | التقييم {{rating}} من 5 | Rated {{rating}} out of 5 |
| common.gallery | الصورة {{n}} من {{total}} | Photo {{n}} of {{total}} |
| status.* | نشط · منتهي · ملغى · مؤكد · مكتمل · غير نشط · قادم · ينتهي قريبًا | Active · Expired · Cancelled · Confirmed · Completed · Inactive · Upcoming · Expiring |
| badges.popular / save / best | الأكثر اختيارًا / وفّر {{n}}% / أفضل قيمة | Most Popular / Save {{n}}% / Best Value |
| hours.daily | يوميًا | Every day |
| owner.managing | ناديك | Your gym |
| owner.gymArea | الدفنة، الدوحة | West Bay, Doha |
| owner.range.label / last30 / month / last90 / year | الفترة / آخر 30 يومًا / هذا الشهر / آخر 90 يومًا / آخر 12 شهرًا | Date range / Last 30 days / This month / Last 90 days / Last 12 months |
| owner.growTitle / growBody | انمُ مع OneQ / شاهد كل ما يقدمه OneQ لناديك. | Grow with OneQ / See everything OneQ can do for your gym. |
| owner.demoBanner | أنت تشاهد نادٍ تجريبيًا ببيانات للعرض فقط. | You're viewing a demo gym with sample data. |
| owner.nav.* | لوحة التحكم · التحليلات · الأعضاء · الاشتراكات · صور النادي · المدربون · الحجوزات · التقييمات · لماذا OneQ | Dashboard · Analytics · Members · Membership Plans · Gym Media · Trainers · Bookings · Reviews · Why OneQ |
| owner.dashboard.morning / afternoon / evening | صباح الخير، / مساء الخير، / مساء الخير، | Good morning, / Good afternoon, / Good evening, |
| owner.dashboard.subtitle | إليك أداء ناديك اليوم. | Here's how your gym is doing today. |
| owner.dashboard.kpi.* | إجمالي الأعضاء · الأعضاء النشطون · جدد هذا الشهر · إيرادات الشهر · حجوزات المدربين | Total members · Active members · New this month · Monthly revenue · Trainer bookings |
| owner.dashboard.vsLast | عن الشهر الماضي | vs last month |
| owner.dashboard.revenue / revenueSub | الإيرادات / آخر 12 شهرًا | Revenue / Last 12 months |
| owner.dashboard.mix / mixSub | توزيع الاشتراكات / {{count}} عضو حسب الخطة | Membership mix / {{count}} members by plan |
| owner.dashboard.latestBookings | أحدث الحجوزات | Latest bookings |
| owner.dashboard.expiring / expiringCount_* | تنتهي خلال 7 أيام / لا توجد اشتراكات · اشتراك واحد · اشتراكان · {{count}} اشتراكات · {{count}} اشتراكًا · {{count}} اشتراك | Expiring in the next 7 days / {{count}} membership(s) |
| owner.dashboard.remind / reminded | تذكير / تم إرسال تذكير التجديد (تجريبي) | Remind / Renewal reminder sent (demo) |
| owner.dashboard.latestReviews | أحدث التقييمات | Latest reviews |
| owner.dashboard.quickActions / addPlan / addTrainer / updatePhotos | إجراءات سريعة / إضافة خطة / إضافة مدرب / تحديث الصور | Quick actions / Add Plan / Add Trainer / Update Photos |
| owner.dashboard.insight | خطة 3 أشهر هي الأكثر مبيعًا — {{pct}}% من الأعضاء. | 3-month plans are your best seller — {{pct}}% of members. |
| owner.dashboard.endsIn_* / endsToday | ينتهي اليوم · ينتهي غدًا · ينتهي بعد يومين · ينتهي بعد {{count}} أيام · ينتهي بعد {{count}} يومًا · ينتهي بعد {{count}} يوم / ينتهي اليوم | ends in {{count}} day(s) / ends today |
| owner.analytics.* | التحليلات · أداء باور هاوس جيم خلال آخر 12 شهرًا · نمو الأعضاء · إجمالي الأعضاء في نهاية كل شهر · اتجاه الإيرادات · الإيراد الشهري بالريال القطري · توزيع الاشتراكات · الأعضاء الحاليون والسابقون حسب الخطة · الخطة الأكثر شعبية · أعضاء جدد · الإيراد · الأعضاء · حجوزات المدربين · عن الشهر الماضي | Analytics · Performance of Power House Gym over the last 12 months · Membership growth · Total members at month end · Revenue trend · Monthly revenue in QAR · Membership distribution · Active and past members by plan · Most popular plan · New members · Revenue · Members · Trainer bookings · vs last month |
| owner.showTable | عرض كجدول | View as table |
| owner.members.* | الأعضاء · {{count}} عضو في باور هاوس جيم · ابحث عن عضو · كل الحالات · كل الخطط · cols: الاسم/الهاتف/الخطة/تاريخ البداية/تاريخ الانتهاء/الحالة/المبلغ المدفوع · {{from}}–{{to}} من {{total}} · لا يوجد أعضاء مطابقون لبحثك · تفاصيل العضو · مرات الحضور · الأيام المتبقية · التواصل · الاشتراك · إرسال تذكير بالتجديد · اتصال · تصدير · الملف جاهز (تجريبي) · ترتيب حسب {{col}} | Members · {{count}} members at Power House Gym · Search member · All statuses · All plans · Name/Phone/Plan/Start/End/Status/Paid · {{from}}–{{to}} of {{total}} · No members match your search · Member details · Check-ins · Days left · Contact · Membership · Send renewal reminder · Call · Export · Export ready (demo) · Sort by {{col}} |
| owner.plans.* | خطط الاشتراك · تظهر التعديلات فورًا في صفحة ناديك داخل تطبيق العميل. · إضافة خطة · خطة جديدة · تعديل الخطة · إيقاف · تفعيل · إيقاف هذه الخطة؟ · لن يتمكن العملاء من شراء «{{plan}}» حتى تعيد تفعيلها. · اسم الخطة · المدة (بالأشهر) · السعر (ر.ق) · المزايا · أضف ميزة واضغط Enter · تمييزها كـ «الأكثر اختيارًا» · تظهر مميزة للعملاء. خطة واحدة فقط يمكن أن تكون الأكثر اختيارًا. · تم الحفظ (تجريبي) · ظاهرة للعملاء · ≈ {{price}} / شهر · معاينة في التطبيق · errors: أدخل اسم الخطة / من 1 إلى 24 شهرًا / أدخل السعر | Membership Plans · Changes appear instantly on your gym page in the customer app. · Add Plan · New plan · Edit plan · Deactivate · Activate · Deactivate this plan? · Customers won't be able to buy "{{plan}}" until you activate it again. · Plan name · Duration (months) · Price (QAR) · Benefits · Add a benefit and press Enter · Mark as "Most Popular" · Highlighted for customers. Only one plan can be the most popular. · Saved (demo) · Visible to customers · ≈ {{price}} / month · Preview in app · Enter a plan name / 1–24 months / Enter a price |
| owner.media.* | صور ملف النادي · حدّث حضور ناديك في ثوانٍ · الشعار · صورة مربعة PNG أو JPG بدقة 512 بكسل على الأقل · صورة الغلاف · صورة عرضية بدقة 1600 بكسل على الأقل · معرض الصور · اسحب لإعادة الترتيب — الصور الأولى تظهر أولًا. · رفع الشعار · تغيير الغلاف · إضافة صور · حذف الصورة · تقديم · تأخير · معاينة العميل · هكذا يظهر ناديك في OneQ · استعادة الصور الأصلية · تمت استعادة الصور الأصلية · تم التحديث (تجريبي) · تبقى الصور على هذا الجهاز ولا يتم رفع أي شيء (تجريبي). | Gym Profile Photos · Update your gym's presence in seconds · Logo · Square PNG or JPG, at least 512 px · Cover photo · Wide landscape photo, at least 1600 px · Gallery · Drag to reorder — the first photos show first. · Upload Logo · Change Cover · Add Photos · Remove photo · Move earlier · Move later · Customer preview · How your gym appears on OneQ · Restore original photos · Original photos restored · Updated (demo) · Photos stay on this device — nothing is uploaded (demo). |
| owner.trainers.* | المدربون · المدربون المتاحون للحجز في باور هاوس جيم · إضافة مدرب · مدرب جديد · تعديل المدرب · إيقاف · تفعيل · إيقاف {{name}}؟ · لن يظهر للحجوزات الجديدة حتى تعيد تفعيله. · cols: الاسم/التخصص/سعر الجلسة/الحالة/الحجوزات (هذا الشهر) · الصورة · رفع صورة · الاسم الكامل · التخصص · سعر الجلسة (ر.ق) · نبذة · اللغات · التوفر الأسبوعي · من · إلى · تم حفظ المدرب (تجريبي) · errors: أدخل الاسم / أدخل السعر | Trainers · Coaches customers can book at Power House Gym · Add Trainer · New trainer · Edit trainer · Deactivate · Activate · Deactivate {{name}}? · They won't appear for new bookings until you activate them again. · Name/Specialty/Session price/Status/Bookings (this month) · Photo · Upload photo · Full name · Specialty · Session price (QAR) · Bio · Languages · Weekly availability · From · To · Trainer saved (demo) · Enter a name / Enter a price |
| owner.bookings.* | الحجوزات · مبيعات الاشتراكات وجلسات المدربين · اليوم · هذا الأسبوع · هذا الشهر · كل الأنواع · type: اشتراك / مدرب · cols: العميل/الحجز/النوع/التاريخ/المبلغ/الحالة · {{count}} حجز · {{amount}} · لا توجد حجوزات في هذه الفترة · جلسة · {{trainer}} · جديد | Bookings · Membership sales and trainer sessions · Today · This Week · This Month · All types · Membership / Trainer · Customer/Booking/Type/Date/Amount/Status · {{count}} bookings · {{amount}} · No bookings in this period · Session · {{trainer}} · New |
| owner.reviews.* | التقييمات · ماذا يقول الأعضاء عن باور هاوس جيم · متوسط التقييم · بناءً على {{count}} تقييم · أحدث التقييمات · رد · تعديل الرد · اكتب ردًا عامًا… · نشر الرد · رد من باور هاوس جيم · تم نشر الرد (تجريبي) · لا يمكن تعديل تقييمات العملاء · يمكنك الرد بشكل علني، ويبقى التقييم والنص كما كتبه العميل تمامًا. | Reviews · What members say about Power House Gym · Average rating · Based on {{count}} reviews · Recent reviews · Reply · Edit reply · Write a public reply… · Post reply · Reply from Power House Gym · Reply posted (demo) · Customer ratings can't be edited · You can reply publicly. Stars and text stay exactly as the customer wrote them. |
| notFound.* | هذه الصفحة في يوم راحة · الصفحة التي تبحث عنها غير موجودة. · العودة للرئيسية | This page is taking a rest day · The page you're looking for doesn't exist. · Back to Home |
| presenter.open | فتح قائمة العرض التقديمي (Shift + P) | Open presentation menu (Shift + P) |

## 7. Seed / demo data reference (for fixtures)

- KPIs: totalMembers 127, activeMembers 103, newThisMonth 38, monthlyRevenue 24,850, trainerBookings 74; deltas +7 / +5 / +18 / +12 / +9 %.
- 12 months (oldest → newest) members / newMembers / revenue / bookings / active: 58/12/9,420/41/49 · 63/14/10,380/44/53 · 67/13/11,250/47/56 · 72/16/12,610/50/60 · 78/18/13,480/49/64 · 84/20/14,950/55/69 · 90/22/16,320/58/74 · 97/24/17,880/61/80 · 104/27/19,240/63/85 · 112/30/20,760/66/91 · 119/32/22,190/68/98 · 127/38/24,850/74/103.
- Distribution: 1 m 34 · 3 m 46 · 6 m 29 · 12 m 18. Ratings: avg 4.9, count 128, stars 5:116 4:9 3:2 2:1 1:0.
- Members: 127 records `{id, name{en,ar}, gender, phone "+974 NNNN NNNN", email, planMonths, startOffset, durationDays (30/90/182/365), status, paid, visits}`; 103 active, 18 expired, 6 cancelled.
- Bookings: 30 seeded `{customer, type membership|trainer, trainerId, planMonths, dayOffset, time "HH:MM", amount, status confirmed|completed|cancelled}`.
- Company: id `power-house`, short **PH**, name "Power House Gym" / "باور هاوس جيم", area west-bay (**الدفنة**), rating 4.9, 128 reviews, fromPrice 299, categories mixed/premium/pt.
