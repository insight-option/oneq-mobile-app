/* Demo users, bookings, subscriptions, gifts, loyalty, notifications and activity for the mock data mode. */
import type { ActivityLog, AppNotification, Booking, BookingStatus, Gift, LoyaltyAccount, PointsTransaction, Subscription, UserProfile } from '@/domain/types';
import { addDays, daysAgoIso, todayStr } from '@/lib/time';
import { createRng, bookingCode, giftCode, subscriptionCode } from '@/lib/ids';
import { COMPANIES, SERVICES, STAFF } from './companies';

export const DEMO = {
  adminPhone: '+97450000001',
  adminEmail: 'admin@oneq.qa',
  companyPhone: '+97450000002',
  customerPhone: '+97450000003',
  customerEmail: 'noura@oneq.qa',
  password: 'OneQ@2026',
  otp: '123456',
} as const;

const CUSTOMER_NAMES = ['جيمس ووكر', 'حمد المري', 'أسماء الهاجري', 'فهد الكواري', 'سعد العبيدلي', 'ناصر نصر', 'عبدالله العمادي', 'ناصر المهندي', 'فاطمة السليطي', 'راهول مينون', 'حسن صالح', 'مبارك نصر', 'ديفيد كيم', 'سارة الجابر', 'هند الكعبي'];

export const USERS: UserProfile[] = [
  { id: 'u_admin', role: 'admin', name: 'إدارة OneQ', phone: DEMO.adminPhone, email: DEMO.adminEmail, avatarUrl: null, language: 'ar', favorites: [], addresses: [], companyId: null, createdAt: daysAgoIso(200) },
  { id: 'u_company_jori', role: 'company', name: 'نورة الجوري', phone: DEMO.companyPhone, email: 'owner@jouri.qa', avatarUrl: null, language: 'ar', favorites: [], addresses: [], companyId: 'co_jouri', createdAt: daysAgoIso(150) },
  { id: 'u_company_new', role: 'company', name: 'روز الجديد', phone: '+97450000009', email: null, avatarUrl: null, language: 'ar', favorites: [], addresses: [], companyId: 'co_new_salon', createdAt: daysAgoIso(2) },
  {
    id: 'u_noura',
    role: 'customer',
    name: 'نورة الكواري',
    phone: DEMO.customerPhone,
    email: DEMO.customerEmail,
    avatarUrl: null,
    language: 'ar',
    favorites: ['co_jouri', 'co_lusail_ladies', 'co_derma_center'],
    addresses: [
      { id: 'addr_home', label: 'المنزل', area: 'alwaab', details: 'شارع الوعب، فيلا 12، البوابة الزرقاء', location: { lat: 25.262, lng: 51.452 } },
      { id: 'addr_work', label: 'العمل', area: 'westbay', details: 'برج التورنيدو، الطابق 18', location: { lat: 25.3215, lng: 51.5305 } },
    ],
    companyId: null,
    createdAt: daysAgoIso(90),
  },
  ...CUSTOMER_NAMES.map<UserProfile>((name, i) => ({
    id: `u_rev_${i}`,
    role: 'customer',
    name,
    phone: `+97455${String(100100 + i * 731).padStart(6, '0')}`,
    email: null,
    avatarUrl: null,
    language: 'ar',
    favorites: [],
    addresses: [],
    companyId: null,
    createdAt: daysAgoIso(30 + i * 5),
  })),
];

const svc = (companyId: string, idx = 0) => SERVICES.filter((s) => s.companyId === companyId)[idx];
const stf = (companyId: string, idx = 0) => STAFF.filter((s) => s.companyId === companyId)[idx];
const co = (id: string) => COMPANIES.find((c) => c.id === id)!;

const mk = (partial: Partial<Booking> & Pick<Booking, 'id' | 'customerId' | 'customerName' | 'customerPhone' | 'companyId' | 'date' | 'time' | 'status'>): Booking => {
  const company = co(partial.companyId);
  const service = partial.serviceId ? SERVICES.find((s) => s.id === partial.serviceId) : null;
  const price = partial.price ?? service?.offerPrice ?? service?.price ?? 0;
  const total = partial.total ?? price - (partial.discount ?? 0);
  return {
    code: bookingCode(),
    companyName: company.name,
    companyLogoUrl: company.logoUrl,
    kind: 'SERVICE',
    serviceName: service?.name ?? null,
    productId: null,
    productName: null,
    staffId: null,
    staffName: null,
    mode: company.serviceMode === 'HOME' ? 'HOME' : 'ONSITE',
    durationMin: service?.durationMin ?? 45,
    address: null,
    price,
    discount: 0,
    pointsUsed: 0,
    pointsEarned: Math.round(total) + 20,
    total,
    paymentMethod: 'CARD',
    paymentStatus: 'PAID',
    isGift: false,
    giftId: null,
    subscriptionId: null,
    notes: null,
    companyRated: false,
    staffRated: false,
    createdAt: daysAgoIso(1),
    updatedAt: daysAgoIso(1),
    ...partial,
  } as Booking;
};

const today = todayStr();
const n = { id: 'u_noura', name: 'نورة الكواري', phone: DEMO.customerPhone };

const NOURA_BOOKINGS: Booking[] = [
  mk({ id: 'bk_n1', customerId: n.id, customerName: n.name, customerPhone: n.phone, companyId: 'co_jouri', serviceId: svc('co_jouri', 0).id, staffId: stf('co_jouri', 0).id, staffName: stf('co_jouri', 0).name, date: addDays(today, -3), time: '17:00', status: 'COMPLETED', createdAt: daysAgoIso(5), updatedAt: daysAgoIso(3) }),
  mk({ id: 'bk_n2', customerId: n.id, customerName: n.name, customerPhone: n.phone, companyId: 'co_alnoor_eyes', serviceId: svc('co_alnoor_eyes', 0).id, staffId: stf('co_alnoor_eyes', 1).id, staffName: stf('co_alnoor_eyes', 1).name, date: addDays(today, -20), time: '11:00', status: 'COMPLETED', companyRated: true, staffRated: true, createdAt: daysAgoIso(24), updatedAt: daysAgoIso(20) }),
  mk({ id: 'bk_n3', customerId: n.id, customerName: n.name, customerPhone: n.phone, companyId: 'co_lusail_ladies', serviceId: svc('co_lusail_ladies', 1).id, staffId: stf('co_lusail_ladies', 1).id, staffName: stf('co_lusail_ladies', 1).name, date: addDays(today, 2), time: '18:30', status: 'CONFIRMED', createdAt: daysAgoIso(1), updatedAt: daysAgoIso(0, 5) }),
  mk({ id: 'bk_n4', customerId: n.id, customerName: n.name, customerPhone: n.phone, companyId: 'co_sparkle_clean', serviceId: svc('co_sparkle_clean', 0).id, mode: 'HOME', address: USERS[3].addresses[0], date: addDays(today, 1), time: '09:00', status: 'PENDING', paymentMethod: 'CASH', paymentStatus: 'ON_ARRIVAL', createdAt: daysAgoIso(0, 3), updatedAt: daysAgoIso(0, 3) }),
  mk({ id: 'bk_n5', customerId: n.id, customerName: n.name, customerPhone: n.phone, companyId: 'co_derma_center', serviceId: svc('co_derma_center', 2).id, staffId: stf('co_derma_center', 2).id, staffName: stf('co_derma_center', 2).name, date: today, time: '16:00', status: 'IN_PROGRESS', createdAt: daysAgoIso(2), updatedAt: daysAgoIso(0, 1) }),
  mk({ id: 'bk_n6', customerId: n.id, customerName: n.name, customerPhone: n.phone, companyId: 'co_smile_dental', serviceId: svc('co_smile_dental', 0).id, date: addDays(today, -10), time: '12:30', status: 'CANCELLED', paymentStatus: 'PENDING', createdAt: daysAgoIso(12), updatedAt: daysAgoIso(10) }),
];

/** Generated bookings for all companies over the last 60 days (+ a few upcoming) for dashboards & admin. */
const generated: Booking[] = (() => {
  const rng = createRng(4242);
  const out: Booking[] = [];
  const customers = USERS.filter((u) => u.role === 'customer' && u.id !== 'u_noura');
  const statusesPast: BookingStatus[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'];
  COMPANIES.filter((c) => c.isActive).forEach((c, ci) => {
    const services = SERVICES.filter((s) => s.companyId === c.id);
    if (!services.length) return;
    const staff = STAFF.filter((s) => s.companyId === c.id);
    const count = 6 + Math.floor(rng() * 10);
    for (let i = 0; i < count; i++) {
      const dayOffset = Math.floor(rng() * 60) - 55; // -55 .. +4
      const service = services[Math.floor(rng() * services.length)];
      const member = staff.length ? staff[Math.floor(rng() * staff.length)] : null;
      const cust = customers[Math.floor(rng() * customers.length)];
      const date = addDays(today, dayOffset);
      const isToday = dayOffset === 0;
      const status: BookingStatus = dayOffset < 0 ? statusesPast[Math.floor(rng() * statusesPast.length)] : isToday ? (rng() > 0.5 ? 'CONFIRMED' : 'IN_PROGRESS') : rng() > 0.3 ? 'CONFIRMED' : 'PENDING';
      const hour = 9 + Math.floor(rng() * 11);
      out.push(
        mk({
          id: `bk_g_${ci}_${i}`,
          customerId: cust.id,
          customerName: cust.name,
          customerPhone: cust.phone ?? '',
          companyId: c.id,
          serviceId: service.id,
          staffId: member?.id ?? null,
          staffName: member?.name ?? null,
          mode: c.serviceMode === 'HOME' ? 'HOME' : 'ONSITE',
          date,
          time: `${String(hour).padStart(2, '0')}:${rng() > 0.5 ? '00' : '30'}`,
          status,
          companyRated: status === 'COMPLETED' && rng() > 0.4,
          paymentMethod: rng() > 0.7 ? 'CASH' : 'CARD',
          paymentStatus: status === 'COMPLETED' ? 'PAID' : rng() > 0.7 ? 'ON_ARRIVAL' : 'PAID',
          createdAt: daysAgoIso(Math.max(0, -dayOffset + 2)),
          updatedAt: daysAgoIso(Math.max(0, -dayOffset)),
        }),
      );
    }
  });
  return out;
})();

export const BOOKINGS: Booking[] = [...NOURA_BOOKINGS, ...generated];

const planOf = (companyId: string, svcIdx: number, planIdx: number) => svc(companyId, svcIdx).subscriptionPlans[planIdx];

export const SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub_n1',
    code: subscriptionCode(),
    customerId: 'u_noura',
    customerName: n.name,
    companyId: 'co_lusail_ladies',
    companyName: co('co_lusail_ladies').name,
    companyLogoUrl: co('co_lusail_ladies').logoUrl,
    serviceId: svc('co_lusail_ladies', 1).id,
    serviceName: svc('co_lusail_ladies', 1).name,
    planId: planOf('co_lusail_ladies', 1, 1).id,
    planName: planOf('co_lusail_ladies', 1, 1).name,
    sessionsPerWeek: 2,
    startDate: addDays(today, -10),
    endDate: addDays(today, 74),
    totalSessions: 24,
    usedSessions: 3,
    price: planOf('co_lusail_ladies', 1, 1).offerPrice ?? planOf('co_lusail_ladies', 1, 1).price,
    status: 'ACTIVE',
    staffId: stf('co_lusail_ladies', 1).id,
    mode: 'ONSITE',
    createdAt: daysAgoIso(10),
  },
  {
    id: 'sub_n2',
    code: subscriptionCode(),
    customerId: 'u_noura',
    customerName: n.name,
    companyId: 'co_jouri',
    companyName: co('co_jouri').name,
    companyLogoUrl: co('co_jouri').logoUrl,
    serviceId: svc('co_jouri', 3).id,
    serviceName: svc('co_jouri', 3).name,
    planId: planOf('co_jouri', 3, 0).id,
    planName: planOf('co_jouri', 3, 0).name,
    sessionsPerWeek: 1,
    startDate: addDays(today, -48),
    endDate: addDays(today, -20),
    totalSessions: 4,
    usedSessions: 4,
    price: planOf('co_jouri', 3, 0).price,
    status: 'EXPIRED',
    staffId: null,
    mode: 'ONSITE',
    createdAt: daysAgoIso(48),
  },
  ...(() => {
    const rng = createRng(777);
    const out: Subscription[] = [];
    const customers = USERS.filter((u) => u.role === 'customer' && u.id !== 'u_noura');
    COMPANIES.filter((c) => c.offersSubscriptions && c.isActive).forEach((c, ci) => {
      const service = SERVICES.find((s) => s.companyId === c.id && s.allowSubscription);
      if (!service) return;
      const count = 3 + Math.floor(rng() * 5);
      for (let i = 0; i < count; i++) {
        const plan = service.subscriptionPlans[Math.floor(rng() * service.subscriptionPlans.length)];
        const cust = customers[Math.floor(rng() * customers.length)];
        const startOffset = -Math.floor(rng() * plan.durationWeeks * 7);
        const start = addDays(today, startOffset);
        const end = addDays(start, plan.durationWeeks * 7);
        const expired = end < today;
        const total = plan.durationWeeks * plan.sessionsPerWeek;
        out.push({
          id: `sub_g_${ci}_${i}`,
          code: subscriptionCode(),
          customerId: cust.id,
          customerName: cust.name,
          companyId: c.id,
          companyName: c.name,
          companyLogoUrl: c.logoUrl,
          serviceId: service.id,
          serviceName: service.name,
          planId: plan.id,
          planName: plan.name,
          sessionsPerWeek: plan.sessionsPerWeek,
          startDate: start,
          endDate: end,
          totalSessions: total,
          usedSessions: expired ? total : Math.min(total, Math.floor((-startOffset / 7) * plan.sessionsPerWeek)),
          price: plan.offerPrice ?? plan.price,
          status: expired ? 'EXPIRED' : 'ACTIVE',
          staffId: null,
          mode: 'ONSITE',
          createdAt: daysAgoIso(-startOffset),
        });
      }
    });
    return out;
  })(),
];

export const GIFTS: Gift[] = [
  {
    id: 'gift_r1',
    code: giftCode(),
    senderId: 'u_rev_13',
    senderName: 'سارة الجابر',
    senderPhone: USERS.find((u) => u.id === 'u_rev_13')?.phone ?? '',
    recipientPhone: DEMO.customerPhone,
    recipientId: 'u_noura',
    recipientName: n.name,
    kind: 'POINTS',
    points: 200,
    message: 'كل عام وأنتِ بخير يا نورة 🎉',
    status: 'DELIVERED',
    channel: 'APP',
    createdAt: daysAgoIso(2, 4),
  },
  {
    id: 'gift_r2',
    code: giftCode(),
    senderId: 'u_rev_14',
    senderName: 'هند الكعبي',
    senderPhone: USERS.find((u) => u.id === 'u_rev_14')?.phone ?? '',
    recipientPhone: DEMO.customerPhone,
    recipientId: 'u_noura',
    recipientName: n.name,
    kind: 'SERVICE',
    companyId: 'co_jouri',
    companyName: co('co_jouri').name,
    serviceId: svc('co_jouri', 2).id,
    itemName: svc('co_jouri', 2).name,
    itemImageUrl: svc('co_jouri', 2).imageUrl,
    amount: svc('co_jouri', 2).price,
    message: 'استمتعي بيوم استرخاء تستحقينه ❤️',
    status: 'PENDING',
    channel: 'APP',
    createdAt: daysAgoIso(5),
  },
  {
    id: 'gift_s1',
    code: giftCode(),
    senderId: 'u_noura',
    senderName: n.name,
    senderPhone: DEMO.customerPhone,
    recipientPhone: '+97455667788',
    recipientId: null,
    recipientName: 'ريم',
    kind: 'SERVICE',
    companyId: 'co_pearl_spa',
    companyName: co('co_pearl_spa').name,
    serviceId: svc('co_pearl_spa', 0).id,
    itemName: svc('co_pearl_spa', 0).name,
    itemImageUrl: svc('co_pearl_spa', 0).imageUrl,
    amount: svc('co_pearl_spa', 0).price,
    message: 'هدية بسيطة من القلب 🎁',
    status: 'WHATSAPP_SENT',
    channel: 'WHATSAPP',
    createdAt: daysAgoIso(12),
  },
];

export const LOYALTY: Record<string, LoyaltyAccount> = {
  u_noura: { customerId: 'u_noura', points: 640, lifetimePoints: 1140, tier: 'SILVER', nextTierAt: 1500, updatedAt: daysAgoIso(2) },
  ...Object.fromEntries(
    USERS.filter((u) => u.role === 'customer' && u.id !== 'u_noura').map((u, i) => {
      const lifetime = 50 + ((i * 173) % 2200);
      const tier = lifetime >= 4000 ? 'PLATINUM' : lifetime >= 1500 ? 'GOLD' : lifetime >= 500 ? 'SILVER' : 'BRONZE';
      return [u.id, { customerId: u.id, points: Math.round(lifetime * 0.6), lifetimePoints: lifetime, tier, nextTierAt: tier === 'PLATINUM' ? null : tier === 'GOLD' ? 4000 : tier === 'SILVER' ? 1500 : 500, updatedAt: daysAgoIso(i) } satisfies LoyaltyAccount];
    }),
  ),
};

export const POINTS: PointsTransaction[] = [
  { id: 'pt1', customerId: 'u_noura', delta: 50, type: 'WELCOME', note: { ar: 'مكافأة الترحيب', en: 'Welcome bonus' }, createdAt: daysAgoIso(90) },
  { id: 'pt2', customerId: 'u_noura', delta: 170, type: 'EARN_BOOKING', refId: 'bk_n2', note: { ar: 'كشف عيون شامل — مركز النور', en: 'Eye exam — Al Noor' }, createdAt: daysAgoIso(20) },
  { id: 'pt3', customerId: 'u_noura', delta: 390, type: 'EARN_BOOKING', refId: 'sub_n2', note: { ar: 'اشتراك العناية بالوجه — دار الجوري', en: 'Facial plan — Dar Al Jouri' }, createdAt: daysAgoIso(48) },
  { id: 'pt4', customerId: 'u_noura', delta: -200, type: 'REDEEM', refId: 'bk_n3', note: { ar: 'خصم على جلسة بيلاتس', en: 'Discount on pilates session' }, createdAt: daysAgoIso(1) },
  { id: 'pt5', customerId: 'u_noura', delta: 200, type: 'GIFT_RECEIVED', refId: 'gift_r1', note: { ar: 'هدية من سارة الجابر', en: 'Gift from Sara Al Jaber' }, createdAt: daysAgoIso(2, 4) },
  { id: 'pt6', customerId: 'u_noura', delta: 30, type: 'BONUS', note: { ar: 'مكافأة أول تقييم', en: 'First review bonus' }, createdAt: daysAgoIso(19) },
];

const notif = (id: string, type: AppNotification['type'], title: [string, string], body: [string, string], extra: Partial<AppNotification> = {}): AppNotification => ({
  id,
  userId: 'u_noura',
  audience: 'USER',
  type,
  title: { ar: title[0], en: title[1] },
  body: { ar: body[0], en: body[1] },
  imageUrl: null,
  route: null,
  data: null,
  read: false,
  createdAt: daysAgoIso(0, 2),
  ...extra,
});

export const NOTIFICATIONS: AppNotification[] = [
  notif('nt1', 'BOOKING', ['حجزك قيد التنفيذ', 'Your booking is in progress'], ['بدأت جلسة تنظيف البشرة في مركز الجلدية التخصصي.', 'Your facial cleansing at Derma Specialist Center has started.'], { route: '/order/bk_n5', createdAt: daysAgoIso(0, 1) }),
  notif('nt2', 'BOOKING', ['قيّمي تجربتك في دار الجوري', 'Rate your Dar Al Jouri visit'], ['اكتملت جلسة قص وتصفيف الشعر مع ليان. شاركينا رأيك واكسبي 30 نقطة.', 'Your haircut with Layan is complete. Share your rating and earn 30 points.'], { route: '/order/bk_n1', createdAt: daysAgoIso(3) }),
  notif('nt3', 'GIFT', ['وصلتك هدية من هند الكعبي 🎁', 'You received a gift from Hind Al Kaabi 🎁'], ['حمام مغربي ملكي في دار الجوري للتجميل. استلميها من صفحة الهدايا.', 'Royal Moroccan bath at Dar Al Jouri. Claim it from your gifts page.'], { route: '/gift/gift_r2', createdAt: daysAgoIso(5) }),
  notif('nt4', 'POINTS', ['أضيفت 200 نقطة إلى رصيدك', '200 points added to your balance'], ['هدية نقاط من سارة الجابر.', 'A points gift from Sara Al Jaber.'], { route: '/loyalty', createdAt: daysAgoIso(2, 4), read: true }),
  notif('nt5', 'BOOKING', ['تم تأكيد حجزك', 'Booking confirmed'], ['جلسة بيلاتس ريفورمر مع ياسمين فاروق بعد غد الساعة 6:30 م.', 'Reformer pilates with Yasmin Farouk the day after tomorrow at 6:30 PM.'], { route: '/order/bk_n3', createdAt: daysAgoIso(1), read: true }),
  notif('nt6', 'SUBSCRIPTION', ['اشتراكك نشط', 'Your subscription is active'], ['باقتك المكثفة في نادي لوسيل ليديز بدأت. 24 جلسة بانتظارك.', 'Your intensive plan at Lusail Ladies has started. 24 sessions await.'], { route: '/subscription/sub_n1', createdAt: daysAgoIso(10), read: true }),
  notif('nt7', 'OFFER', ['عرض جديد من دار الجوري ✨', 'New offer from Dar Al Jouri ✨'], ['قص وتصفيف الشعر بـ 140 ر.ق بدلًا من 180 ر.ق لفترة محدودة.', 'Haircut & styling for QAR 140 instead of QAR 180, for a limited time.'], { userId: null, audience: 'CUSTOMERS', route: '/company/co_jouri', createdAt: daysAgoIso(1, 6) }),
  notif('nt8', 'OFFER', ['خصم 20% على تبييض الأسنان', '20% off teeth whitening'], ['عيادة الابتسامة: تبييض بالليزر بـ 690 ر.ق بدلًا من 900.', 'Smile Dental: laser whitening for QAR 690 instead of 900.'], { userId: null, audience: 'CUSTOMERS', route: '/company/co_smile_dental', createdAt: daysAgoIso(2, 8), read: true }),
  notif('nt9', 'NEW_SERVICE', ['خدمة جديدة في EMS الدوحة', 'New service at EMS Doha'], ['باقة تجربة 3 جلسات — احجزي الآن.', 'Trial pack of 3 sessions — book now.'], { userId: null, audience: 'CUSTOMERS', route: '/company/co_ems_doha', createdAt: daysAgoIso(4), read: true }),
  notif('nt10', 'SYSTEM', ['أهلًا بكِ في OneQ', 'Welcome to OneQ'], ['احجزي، اشتركي، وأهدي من تحبين. استخدمي 50 نقطة ترحيبية في أول حجز.', 'Book, subscribe and gift the people you love. Use your 50 welcome points on your first booking.'], { route: '/loyalty', createdAt: daysAgoIso(90), read: true }),
  // company notifications (Dar Al Jouri)
  notif('ntc1', 'BOOKING', ['حجز جديد من نورة الكواري', 'New booking from Noura Al Kuwari'], ['قص وتصفيف الشعر — ليان حداد، 17:00.', 'Haircut & styling — Layan Haddad, 17:00.'], { userId: 'co_jouri', audience: 'COMPANY', route: '/(company)/booking/bk_n1', createdAt: daysAgoIso(5) }),
  notif('ntc2', 'REVIEW', ['تقييم جديد ⭐ 5', 'New 5-star review'], ['خالد م.: "خدمة ممتازة وتعامل راقٍ".', 'Khalid M.: "Excellent service and a classy experience".'], { userId: 'co_jouri', audience: 'COMPANY', route: '/(company)/reviews', createdAt: daysAgoIso(1) }),
  // admin notifications
  notif('nta1', 'COMPANY', ['دار الجوري نشرت عرضًا جديدًا', 'Dar Al Jouri published a new offer'], ['قص وتصفيف الشعر: 180 → 140 ر.ق.', 'Haircut & styling: 180 → 140 QAR.'], { userId: null, audience: 'ADMINS', route: '/(admin)/company/co_jouri', createdAt: daysAgoIso(1, 6) }),
  notif('nta2', 'COMPANY', ['شركة جديدة بانتظار الإكمال', 'New company awaiting completion'], ['صالون روز الجديد — لم يكمل الملف التجاري بعد.', 'Rose New Salon has not completed its profile yet.'], { userId: null, audience: 'ADMINS', route: '/(admin)/company/co_new_salon', createdAt: daysAgoIso(2) }),
  notif('nta3', 'COMPANY', ['EMS الدوحة أضافت خدمة جديدة', 'EMS Doha added a new service'], ['باقة تجربة (3 جلسات) — 400 ر.ق.', 'Trial pack (3 sessions) — QAR 400.'], { userId: null, audience: 'ADMINS', route: '/(admin)/company/co_ems_doha', createdAt: daysAgoIso(4), read: true }),
];

export const ACTIVITY: ActivityLog[] = [
  { id: 'act1', actorId: 'u_company_jori', actorName: 'دار الجوري للتجميل', companyId: 'co_jouri', companyName: co('co_jouri').name, action: 'OFFER_SET', summary: { ar: 'قص وتصفيف الشعر: 180 → 140 ر.ق', en: 'Haircut & styling: 180 → 140 QAR' }, createdAt: daysAgoIso(1, 6) },
  { id: 'act2', actorId: 'u_c_ems', actorName: 'EMS الدوحة', companyId: 'co_ems_doha', companyName: co('co_ems_doha').name, action: 'SERVICE_CREATED', summary: { ar: 'باقة تجربة (3 جلسات)', en: 'Trial pack (3 sessions)' }, createdAt: daysAgoIso(4) },
  { id: 'act3', actorId: 'u_c_smile', actorName: 'عيادة الابتسامة', companyId: 'co_smile_dental', companyName: co('co_smile_dental').name, action: 'OFFER_SET', summary: { ar: 'تبييض الأسنان بالليزر: 900 → 690 ر.ق', en: 'Laser whitening: 900 → 690 QAR' }, createdAt: daysAgoIso(2, 8) },
  { id: 'act4', actorId: 'u_admin', actorName: 'إدارة OneQ', companyId: 'co_new_salon', companyName: co('co_new_salon').name, action: 'COMPANY_CREATED', summary: { ar: 'تم إنشاء شركة صالون روز الجديد', en: 'Rose New Salon created' }, createdAt: daysAgoIso(2) },
  { id: 'act5', actorId: 'u_c_power', actorName: 'باور هاوس جيم', companyId: 'co_powerhouse', companyName: co('co_powerhouse').name, action: 'STAFF_CREATED', summary: { ar: 'إضافة المدرب دانيال كارتر', en: 'Added trainer Daniel Carter' }, createdAt: daysAgoIso(6) },
  { id: 'act6', actorId: 'u_c_derma', actorName: 'مركز الجلدية التخصصي', companyId: 'co_derma_center', companyName: co('co_derma_center').name, action: 'PROFILE_UPDATED', summary: { ar: 'تحديث ساعات العمل', en: 'Updated working hours' }, createdAt: daysAgoIso(7) },
  { id: 'act7', actorId: 'u_c_sparkle', actorName: 'سباركل للتنظيف', companyId: 'co_sparkle_clean', companyName: co('co_sparkle_clean').name, action: 'PRODUCT_UPDATED', summary: { ar: 'تحديث أسعار باقات التنظيف', en: 'Updated cleaning package prices' }, createdAt: daysAgoIso(9) },
  { id: 'act8', actorId: 'u_company_jori', actorName: 'دار الجوري للتجميل', companyId: 'co_jouri', companyName: co('co_jouri').name, action: 'SERVICE_UPDATED', summary: { ar: 'تعديل مدة الحمام المغربي الملكي', en: 'Updated Royal Moroccan bath duration' }, createdAt: daysAgoIso(11) },
];
