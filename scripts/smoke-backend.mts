/**
 * End-to-end smoke test against the deployed Amplify backend (run after `npx ampx sandbox` + `npx ampx sandbox seed`):
 *
 *   AWS_PROFILE=default npx tsx scripts/smoke-backend.mts
 *
 * It uses the deployer's AWS credentials only to create/reset test Cognito users (no SMS needed), then exercises the
 * API exactly like the app does: admin creates a company, the owner publishes a service, a customer books it,
 * the admin completes the booking, points are awarded, the customer rates it and sends a points gift.
 * Test accounts: admin@oneq.qa (seed), owner +97450000002, customer +97450000003 — all with password OneQ@2026.
 */
import { readFile } from 'node:fs/promises';
import { AdminAddUserToGroupCommand, AdminCreateUserCommand, AdminGetUserCommand, AdminSetUserPasswordCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession, signIn, signOut } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

const outputs = JSON.parse(await readFile(new URL('../amplify_outputs.json', import.meta.url), 'utf8')) as { auth: { user_pool_id: string; aws_region: string } } & Parameters<typeof Amplify.configure>[0];
Amplify.configure(outputs);
const client = generateClient<Schema>();
const cognito = new CognitoIdentityProviderClient({ region: outputs.auth.aws_region });
const POOL = outputs.auth.user_pool_id;
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'OneQ@2026';
const ADMIN = process.env.SEED_ADMIN_EMAIL ?? 'admin@oneq.qa';
const OWNER_PHONE = '+97450000002';
const CUSTOMER_PHONE = '+97450000003';

let failures = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 300)}` : ''}`);
  if (!ok) failures += 1;
};
const parse = <T>(v: unknown): T => (typeof v === 'string' ? (JSON.parse(v) as T) : (v as T));
const errorsOf = (res: { errors?: { message: string }[] | null }) => res.errors?.map((e) => e.message).join('; ');

/** Creates (or resets) a password user so the test can sign in without SMS. */
const ensurePasswordUser = async (username: string, attributes: { Name: string; Value: string }[], group?: string) => {
  try {
    await cognito.send(new AdminGetUserCommand({ UserPoolId: POOL, Username: username }));
  } catch {
    await cognito.send(new AdminCreateUserCommand({ UserPoolId: POOL, Username: username, MessageAction: 'SUPPRESS', UserAttributes: attributes }));
  }
  await cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: POOL, Username: username, Password: PASSWORD, Permanent: true }));
  if (group) await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: POOL, Username: username, GroupName: group }));
};
const login = async (username: string) => {
  await signOut().catch(() => undefined);
  const { nextStep } = await signIn({ username, password: PASSWORD });
  if (nextStep.signInStep !== 'DONE') throw new Error(`sign-in step ${nextStep.signInStep} for ${username}`);
  const session = await fetchAuthSession();
  return String(session.tokens?.idToken?.payload.sub);
};
const ensureProfile = async (sub: string, role: string, name: string, phone: string | null, companyId: string | null) => {
  const existing = await client.models.UserProfile.get({ id: sub });
  if (existing.data) return;
  const res = await client.models.UserProfile.create({ id: sub, owner: sub, role, name, phone, phoneKey: phone, email: null, avatarUrl: null, language: 'ar', favorites: [], addresses: JSON.stringify([]), companyId });
  check(`profile created for ${role}`, !res.errors?.length, errorsOf(res));
};

/* ---------- 1. admin: categories + company ---------- */
const adminSub = await login(ADMIN);
await ensureProfile(adminSub, 'admin', 'إدارة OneQ', null, null);
const categories = await client.models.Category.list({ limit: 100 });
check('admin lists seeded categories', (categories.data?.length ?? 0) >= 5, `${categories.data?.length} categories`);
const salon = categories.data?.find((c) => c.slug === 'salons') ?? categories.data?.[0];
if (!salon) throw new Error('no categories — run the seed first');

let company = (await client.models.UserProfile.listUserProfilesByPhoneKey({ phoneKey: OWNER_PHONE })).data?.[0]?.companyId ?? null;
if (!company) {
  const created = await client.mutations.adminCreateCompany({
    input: JSON.stringify({
      categoryId: salon.id,
      subcategoryIds: [],
      name: { ar: 'صالون الاختبار', en: 'Smoke Test Salon' },
      description: { ar: 'شركة اختبار', en: 'test company' },
      ownerName: 'مالك الاختبار',
      ownerPhone: OWNER_PHONE,
      ownerEmail: null,
      phone: OWNER_PHONE,
      whatsapp: OWNER_PHONE,
      area: 'alsadd',
      address: { ar: 'الدوحة', en: 'Doha' },
      location: { lat: 25.2825, lng: 51.5102 },
      serviceMode: 'BOTH',
      offersSubscriptions: true,
      audience: 'mixed',
      logoUrl: null,
    }),
  });
  check('adminCreateCompany', !created.errors?.length, errorsOf(created) ?? 'ok');
  company = parse<{ company: { id: string } }>(created.data)?.company?.id ?? null;
}
check('company id resolved', Boolean(company), company);
if (!company) throw new Error('company missing');
const activated = await client.models.Company.update({ id: company, isActive: true });
check('admin activates company', !activated.errors?.length, errorsOf(activated));

/* ---------- 2. owner: publish a service ---------- */
await ensurePasswordUser(OWNER_PHONE, [{ Name: 'phone_number', Value: OWNER_PHONE }, { Name: 'phone_number_verified', Value: 'true' }], 'COMPANIES');
const ownerSub = await login(OWNER_PHONE);
const mine = await client.models.Company.listCompaniesByOwner({ ownerUserId: ownerSub });
check('owner sees own company', mine.data?.[0]?.id === company, mine.data?.[0]?.id);
let service = (await client.models.Service.listServicesByCompany({ companyId: company })).data?.[0];
if (!service) {
  const created = await client.models.Service.create({
    companyId: company,
    name: { ar: 'قص شعر', en: 'Haircut' },
    description: { ar: 'قص وتصفيف', en: 'Cut and style' },
    price: 120,
    offerPrice: 90,
    isOffer: true,
    offerKey: 'OFFER',
    offerEndsAt: null,
    offerImageUrl: null,
    durationMin: 45,
    imageUrl: null,
    allowOneTime: true,
    allowSubscription: false,
    subscriptionPlans: JSON.stringify([]),
    requiresStaff: false,
    isActive: true,
    sortOrder: 1,
    bookingCount: 0,
  });
  check('owner creates service', !created.errors?.length, errorsOf(created));
  service = created.data ?? undefined;
}
if (!service) throw new Error('service missing');

/* ---------- 3. customer: time slots + booking ---------- */
await ensurePasswordUser(CUSTOMER_PHONE, [{ Name: 'phone_number', Value: CUSTOMER_PHONE }, { Name: 'phone_number_verified', Value: 'true' }, { Name: 'name', Value: 'عميل الاختبار' }], 'CUSTOMERS');
const customerSub = await login(CUSTOMER_PHONE);
await ensureProfile(customerSub, 'customer', 'عميل الاختبار', CUSTOMER_PHONE, null);
const date = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const slots = await client.queries.listTimeSlots({ companyId: company, date, durationMin: 45 });
const slotList = parse<{ time: string; available: boolean }[]>(slots.data) ?? [];
check('listTimeSlots returns slots', slotList.length > 0, `${slotList.length} slots (${errorsOf(slots) ?? 'no errors'})`);
const slot = slotList.find((s) => s.available)?.time ?? '10:00';
const placed = await client.mutations.placeBooking({ input: JSON.stringify({ companyId: company, kind: 'SERVICE', serviceId: service.id, mode: 'ONSITE', date, time: slot, paymentMethod: 'CARD', notes: 'smoke test' }) });
const booking = parse<{ booking: { id: string; total: number; pointsEarned: number; status: string } }>(placed.data)?.booking;
check('placeBooking', Boolean(booking?.id) && !placed.errors?.length, errorsOf(placed) ?? `total ${booking?.total}, +${booking?.pointsEarned} pts on completion`);
const myBookings = await client.models.Booking.listBookingsByCustomer({ customerId: customerSub });
check('customer reads own bookings', (myBookings.data?.length ?? 0) > 0, `${myBookings.data?.length}`);
const guestNotAllowed = await client.models.Booking.list({ authMode: 'identityPool' }).catch((e) => ({ data: [], errors: [{ message: String(e) }] }));
check('guest cannot list bookings', (guestNotAllowed.data?.length ?? 0) === 0);

/* ---------- 4. admin completes it → points, then customer rates and gifts ---------- */
await login(ADMIN);
const confirmed = await client.mutations.updateBookingStatus({ bookingId: booking.id, status: 'CONFIRMED' });
check('admin confirms booking', !confirmed.errors?.length, errorsOf(confirmed));
const completed = await client.mutations.updateBookingStatus({ bookingId: booking.id, status: 'COMPLETED' });
check('admin completes booking', !completed.errors?.length, errorsOf(completed));
const activity = await client.models.ActivityLog.listActivityByFeed({ feed: 'ALL' }, { sortDirection: 'DESC', limit: 5 });
check('activity feed has entries (stream Lambda)', (activity.data?.length ?? 0) > 0, activity.data?.map((a) => a.action));

await login(CUSTOMER_PHONE);
const loyalty = await client.models.LoyaltyAccount.get({ id: customerSub });
check('points awarded on completion', (loyalty.data?.points ?? 0) >= (booking.pointsEarned ?? 1), `${loyalty.data?.points} points`);
const rated = await client.mutations.rateBooking({ input: JSON.stringify({ bookingId: booking.id, companyRating: 5, companyComment: 'ممتاز' }) });
check('rateBooking', !rated.errors?.length, errorsOf(rated));
const reviews = await client.models.Review.listReviewsByCompany({ companyId: company });
check('review stored', (reviews.data?.length ?? 0) > 0, `${reviews.data?.length}`);
const lookup = await client.queries.lookupRecipient({ phone: '+97455512345' });
check('lookupRecipient (unregistered)', parse<{ registered: boolean }>(lookup.data)?.registered === false, lookup.data);
const gift = await client.mutations.sendGift({ input: JSON.stringify({ kind: 'POINTS', recipientPhone: '+97455512345', points: 50, message: 'هدية اختبار' }) });
const giftOut = parse<{ gift: { status: string }; whatsappUrl?: string | null }>(gift.data);
check('sendGift (WhatsApp fallback)', !gift.errors?.length && giftOut?.gift?.status === 'WHATSAPP_SENT', errorsOf(gift) ?? giftOut?.whatsappUrl?.slice(0, 60));
const notifications = await client.models.Notification.listNotificationsByUser({ userId: customerSub }, { sortDirection: 'DESC', limit: 10 });
check('customer notifications written', (notifications.data?.length ?? 0) > 0, notifications.data?.map((n) => n.type));

/* ---------- 5. guest catalogue read ---------- */
await signOut();
const publicCompanies = await client.models.Company.list({ authMode: 'identityPool', limit: 50 });
check('guest reads companies', (publicCompanies.data?.length ?? 0) > 0, `${publicCompanies.data?.length} (${errorsOf(publicCompanies) ?? 'no errors'})`);
const publicOffers = await client.models.Service.listServiceOffers({ offerKey: 'OFFER' }, { authMode: 'identityPool' });
check('guest reads offers', (publicOffers.data?.length ?? 0) > 0, `${publicOffers.data?.length}`);

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
