# Mock data mode

Runs when `EXPO_PUBLIC_DATA_MODE=mock` or when `amplify_outputs.json` is missing. Everything works offline; mutations persist to AsyncStorage (`oneq.mock.v1`). Bump `SEED_VERSION` in `state.ts` to reset persisted data after changing the seed.

| Account | Login | Lands in |
|---|---|---|
| Customer (نورة الكواري) | phone `+974 5000 0003` → OTP `123456`, or email `noura@oneq.qa` / `OneQ@2026` | Customer workspace (bookings, subscription, gifts, 640 points) |
| Company owner (دار الجوري للتجميل) | phone `+974 5000 0002` → OTP `123456` | Company workspace |
| Admin | phone `+974 5000 0001` → OTP `123456`, or email `admin@oneq.qa` / `OneQ@2026` | Admin workspace |
| Any other +974 number | phone → sign-up (name) → OTP `123456` | New customer with 50 welcome points |

Gifts sent to an unregistered number return a `wa.me` link (WhatsApp fallback). Points: 1 pt per QAR + 20 per completed booking; 100 pts = 10 QAR; tiers 0 / 500 / 1500 / 4000.
