/* Seed companies for Doha. Built from compact specs so the dataset stays rich without a giant file. */
import type { Audience, Company, LocalizedText, Product, Review, Service, ServiceMode, Staff, StaffTitle, SubscriptionPlan, Weekday } from '@/domain/types';
import { daysAgoIso, makeAvailability, makeHours } from '@/lib/time';
import { createRng, hashString } from '@/lib/ids';

const U = (id: string, w = 1000) => `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;
const PIC = (seed: string, w = 1000, h = 700) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const IMG = {
  gym: [U('photo-1534438327276-14e5300c3a48'), U('photo-1571902943202-507ec2618e8f'), U('photo-1517836357463-d25dfeac3438'), U('photo-1558611848-73f7eb4001a1'), U('photo-1540497077202-7c8a3999166f'), U('photo-1574680096145-d05b474e2155')],
  salon: [U('photo-1560066984-138dadb4c035'), U('photo-1522337660859-02fbefca4702'), U('photo-1519415943484-9fa1873496d4'), U('photo-1487412947147-5cebf100ffc2'), U('photo-1596462502278-27bfdc403348'), U('photo-1562322140-8baeececf3df')],
  clinic: [U('photo-1519494026892-80bbd2d6fd0d'), U('photo-1538108149393-fbbd81895907'), U('photo-1579684385127-1ef15d508118'), U('photo-1576091160399-112ba8d25d1d'), U('photo-1551076805-e1869033e561'), U('photo-1606811841689-23dfddce3e95')],
  home: [U('photo-1581578731548-c64695cc6952'), U('photo-1527515637462-cff94eecc1ac'), U('photo-1563453392212-326f5e854473'), U('photo-1600585154340-be6161a56a0c'), U('photo-1584622650111-993a426fbf0a'), U('photo-1556911220-bff31c812dba')],
  construction: [U('photo-1503387762-592deb58ef4e'), U('photo-1504307651254-35680f356dfd'), U('photo-1541123437800-1bb1317badc2'), U('photo-1618220179428-22790b461013'), U('photo-1616486338812-3dadae4b4ace'), U('photo-1600607687920-4e2a09cf159d')],
  men: [U('photo-1612349317150-e413f6a5b16d', 600), U('photo-1500648767791-00dcc994a43e', 600), U('photo-1507003211169-0a1dd7228f2d', 600), U('photo-1506794778202-cad84cf45f1d', 600), U('photo-1567013127542-490d757e51fc', 600), U('photo-1552374196-c4e7ffc6e126', 600)],
  women: [U('photo-1559839734-2b71ea197ec2', 600), U('photo-1594824476967-48c8b964273f', 600), U('photo-1571019613454-1cb2f99b2d8b', 600), U('photo-1494790108377-be9c29b29330', 600), U('photo-1438761681033-6461ffad8d80', 600), U('photo-1544005313-94ddf0286df2', 600)],
};

type AreaKey = string;
const AREA_COORDS: Record<AreaKey, { lat: number; lng: number }> = {
  alsadd: { lat: 25.2867, lng: 51.509 },
  westbay: { lat: 25.322, lng: 51.53 },
  dafna: { lat: 25.318, lng: 51.524 },
  thepearl: { lat: 25.37, lng: 51.55 },
  lusail: { lat: 25.43, lng: 51.49 },
  alwakrah: { lat: 25.17, lng: 51.6 },
  alrayyan: { lat: 25.29, lng: 51.42 },
  alwaab: { lat: 25.26, lng: 51.45 },
  msheireb: { lat: 25.285, lng: 51.528 },
  madinatkhalifa: { lat: 25.31, lng: 51.47 },
  aziziyah: { lat: 25.253, lng: 51.471 },
  alsailiya: { lat: 25.24, lng: 51.4 },
  binmahmoud: { lat: 25.278, lng: 51.52 },
  alduhail: { lat: 25.345, lng: 51.473 },
  oldairport: { lat: 25.262, lng: 51.553 },
  alnasr: { lat: 25.28, lng: 51.5 },
};

interface ServiceSpec {
  ar: string;
  en: string;
  price: number;
  offer?: number;
  min?: number;
  sub?: boolean;
  staff?: boolean;
  desc?: LocalizedText;
}
interface ProductSpec {
  ar: string;
  en: string;
  price: number;
  offer?: number;
  stock?: number;
  img?: string;
}
interface StaffSpec {
  ar: string;
  en: string;
  title: StaffTitle;
  years: number;
  spec: [string, string][];
  gender: 'm' | 'f';
  price?: number;
  off?: Weekday[];
  rating?: number;
}
interface CompanySpec {
  id: string;
  cat: string;
  subs: string[];
  ar: string;
  en: string;
  tagline: [string, string];
  desc: [string, string];
  area: AreaKey;
  address: [string, string];
  phone: string;
  mode: ServiceMode;
  subscriptions?: boolean;
  audience?: Audience;
  hours?: { from: string; to: string; closed?: Weekday[] };
  imgs: string[];
  logo?: string;
  tags?: Company['tags'];
  amenities?: string[];
  insurance?: string[];
  rating: number;
  ratingCount: number;
  bookings: number;
  featured?: boolean;
  services: ServiceSpec[];
  products?: ProductSpec[];
  staff?: StaffSpec[];
  ownerPhone?: string;
  ownerUserId?: string;
  inactive?: boolean;
}

const plansFor = (price: number, baseId: string): SubscriptionPlan[] => [
  { id: `${baseId}_p1`, name: { ar: 'باقة أسبوعية', en: 'Weekly plan' }, sessionsPerWeek: 1, durationWeeks: 4, price: Math.round(price * 3.4), features: [{ ar: 'جلسة أسبوعيًا', en: 'One session a week' }, { ar: 'تذكير بالمواعيد', en: 'Appointment reminders' }] },
  { id: `${baseId}_p2`, name: { ar: 'باقة مكثفة', en: 'Intensive plan' }, sessionsPerWeek: 2, durationWeeks: 8, price: Math.round(price * 12.5), offerPrice: Math.round(price * 11), isPopular: true, features: [{ ar: 'جلستان أسبوعيًا', en: 'Two sessions a week' }, { ar: 'أولوية الحجز', en: 'Priority booking' }, { ar: 'تجميد لمدة أسبوع', en: 'Freeze for a week' }] },
  { id: `${baseId}_p3`, name: { ar: 'باقة احترافية', en: 'Pro plan' }, sessionsPerWeek: 3, durationWeeks: 12, price: Math.round(price * 26), features: [{ ar: '3 جلسات أسبوعيًا', en: 'Three sessions a week' }, { ar: 'متابعة شخصية', en: 'Personal follow-up' }, { ar: 'خصم 10% على المنتجات', en: '10% off products' }] },
];

const REVIEW_TEXTS: [string, string][] = [
  ['خدمة ممتازة وتعامل راقٍ، أنصح به بشدة.', 'Excellent service and a classy experience, highly recommended.'],
  ['المكان نظيف والمواعيد دقيقة. تجربة جميلة.', 'Clean place and punctual appointments. Lovely experience.'],
  ['الطاقم محترف جدًا وشرحوا كل شيء بالتفصيل.', 'Very professional team, they explained everything in detail.'],
  ['الأسعار مناسبة والجودة عالية.', 'Fair prices and high quality.'],
  ['تجربة جيدة لكن الانتظار كان أطول قليلًا من المتوقع.', 'Good experience but the wait was a bit longer than expected.'],
  ['أفضل مكان جربته في الدوحة حتى الآن.', 'Best place I have tried in Doha so far.'],
  ['حجزت عبر التطبيق والتفعيل كان فوري بدون أي أوراق.', 'Booked through the app and activation was instant, no paperwork.'],
  ['الخدمة المنزلية كانت في الوقت المحدد تمامًا.', 'The home service arrived exactly on time.'],
];
const REVIEWER_NAMES = ['خالد م.', 'نورة ك.', 'سارة الجابر', 'محمد الهاجري', 'ريم ع.', 'عبدالله س.', 'لطيفة م.', 'فهد ك.', 'حصة ن.', 'ناصر ح.', 'مريم ك.', 'سعد د.'];

const build = (spec: CompanySpec, index: number): { company: Company; services: Service[]; products: Product[]; staff: Staff[]; reviews: Review[] } => {
  const rng = createRng(hashString(spec.id));
  const coords = AREA_COORDS[spec.area] ?? AREA_COORDS.alsadd;
  const location = { lat: coords.lat + (rng() - 0.5) * 0.012, lng: coords.lng + (rng() - 0.5) * 0.012 };
  const hours = makeHours(spec.hours?.from ?? '09:00', spec.hours?.to ?? '22:00', spec.hours?.closed ?? []);
  const createdAt = daysAgoIso(120 + index * 7);
  const services: Service[] = spec.services.map((s, i) => ({
    id: `${spec.id}_s${i + 1}`,
    companyId: spec.id,
    name: { ar: s.ar, en: s.en },
    description: s.desc ?? { ar: `${s.ar} بأعلى معايير الجودة مع طاقم متخصص ومنتجات أصلية.`, en: `${s.en} with the highest quality standards, specialised staff and original products.` },
    price: s.price,
    offerPrice: s.offer ?? null,
    isOffer: typeof s.offer === 'number',
    offerEndsAt: typeof s.offer === 'number' ? daysAgoIso(-10 - i) : null,
    offerImageUrl: typeof s.offer === 'number' ? spec.imgs[(i + 1) % spec.imgs.length] : null,
    durationMin: s.min ?? 45,
    imageUrl: spec.imgs[(i + 2) % spec.imgs.length],
    allowOneTime: true,
    allowSubscription: Boolean(s.sub),
    subscriptionPlans: s.sub ? plansFor(s.price, `${spec.id}_s${i + 1}`) : [],
    requiresStaff: s.staff ?? Boolean(spec.staff?.length),
    isActive: true,
    sortOrder: i + 1,
    bookingCount: Math.round(20 + rng() * 180),
    createdAt,
    updatedAt: daysAgoIso(Math.round(rng() * 20)),
  }));
  const products: Product[] = (spec.products ?? []).map((p, i) => ({
    id: `${spec.id}_pr${i + 1}`,
    companyId: spec.id,
    name: { ar: p.ar, en: p.en },
    description: { ar: `${p.ar} أصلي ومعتمد من ${spec.ar}.`, en: `Original ${p.en} approved by ${spec.en}.` },
    price: p.price,
    offerPrice: p.offer ?? null,
    isOffer: typeof p.offer === 'number',
    offerEndsAt: typeof p.offer === 'number' ? daysAgoIso(-14) : null,
    imageUrls: [p.img ?? PIC(`${spec.id}-pr${i}`, 800, 800)],
    stock: p.stock ?? 25,
    isActive: true,
    salesCount: Math.round(rng() * 120),
    createdAt,
    updatedAt: createdAt,
  }));
  const staff: Staff[] = (spec.staff ?? []).map((s, i) => {
    const pool = s.gender === 'f' ? IMG.women : IMG.men;
    return {
      id: `${spec.id}_st${i + 1}`,
      companyId: spec.id,
      name: { ar: s.ar, en: s.en },
      title: s.title,
      bio: { ar: `${s.ar} — خبرة ${s.years} سنوات في ${s.spec.map((x) => x[0]).join(' و')}.`, en: `${s.en} — ${s.years} years of experience in ${s.spec.map((x) => x[1]).join(' and ')}.` },
      photoUrl: pool[(index + i) % pool.length],
      experienceYears: s.years,
      specialties: s.spec.map(([ar, en]) => ({ ar, en })),
      languages: ['ar', 'en'],
      pricePerSession: s.price ?? null,
      isAvailable: true,
      availability: makeAvailability('10:00', '20:00', s.off ?? [5]),
      ratingAvg: s.rating ?? Math.round((4.3 + rng() * 0.6) * 10) / 10,
      ratingCount: Math.round(10 + rng() * 120),
      bookingCount: Math.round(10 + rng() * 60),
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    };
  });
  const reviewCount = 3 + Math.round(rng() * 4);
  const reviews: Review[] = Array.from({ length: reviewCount }).map((_, i) => {
    const rating = (rng() > 0.2 ? 5 : rng() > 0.4 ? 4 : 3) as 3 | 4 | 5;
    const txt = REVIEW_TEXTS[(index + i) % REVIEW_TEXTS.length];
    return {
      id: `${spec.id}_rv${i + 1}`,
      customerId: `u_rev_${(index * 3 + i) % 15}`,
      customerName: REVIEWER_NAMES[(index * 2 + i) % REVIEWER_NAMES.length],
      companyId: spec.id,
      staffId: staff.length && i % 2 === 0 ? staff[i % staff.length].id : null,
      bookingId: `${spec.id}_bk_seed_${i}`,
      rating,
      comment: txt[0],
      reply: i === 0 ? { text: 'شكرًا لثقتكم، يسعدنا خدمتكم دائمًا.', at: daysAgoIso(1 + i) } : null,
      createdAt: daysAgoIso(1 + i * 4, i * 3),
    };
  });
  const priceFrom = Math.min(...[...services.map((s) => s.offerPrice ?? s.price), ...products.map((p) => p.offerPrice ?? p.price)].filter((n) => Number.isFinite(n)));
  const company: Company = {
    id: spec.id,
    slug: spec.id.replace('co_', ''),
    categoryId: spec.cat,
    subcategoryIds: spec.subs,
    name: { ar: spec.ar, en: spec.en },
    tagline: { ar: spec.tagline[0], en: spec.tagline[1] },
    description: { ar: spec.desc[0], en: spec.desc[1] },
    logoUrl: spec.logo ?? PIC(`${spec.id}-logo`, 300, 300),
    coverUrl: spec.imgs[0],
    galleryUrls: spec.imgs,
    area: spec.area,
    address: { ar: spec.address[0], en: spec.address[1] },
    location,
    phone: spec.phone,
    whatsapp: spec.phone,
    email: `info@${spec.id.replace('co_', '')}.qa`,
    serviceMode: spec.mode,
    offersSubscriptions: Boolean(spec.subscriptions),
    hasStaff: Boolean(spec.staff?.length),
    audience: spec.audience ?? 'mixed',
    openingHours: hours,
    amenities: spec.amenities ?? ['parking', 'wifi'],
    tags: spec.tags ?? [],
    acceptsInsurance: spec.insurance,
    ratingAvg: spec.rating,
    ratingCount: spec.ratingCount,
    bookingCount: spec.bookings,
    staffCount: staff.length,
    priceFrom: Number.isFinite(priceFrom) ? priceFrom : null,
    isActive: !spec.inactive,
    isVerified: spec.rating >= 4.5,
    isFeatured: Boolean(spec.featured),
    ownerUserId: spec.ownerUserId ?? null,
    ownerPhone: spec.ownerPhone ?? null,
    ownerEmail: null,
    completion: { location: true, hours: true, catalog: services.length + products.length > 0, media: Boolean(spec.imgs.length) },
    createdAt,
    updatedAt: daysAgoIso(Math.round(rng() * 10)),
  };
  if (spec.inactive) company.completion = { location: false, hours: false, catalog: false, media: false };
  return { company, services, products, staff, reviews };
};

const SPECS: CompanySpec[] = [
  // ---------- Salons ----------
  {
    id: 'co_jouri', cat: 'cat_salons', subs: ['sub_hair', 'sub_makeup', 'sub_facial', 'sub_moroccan', 'sub_nails'],
    ar: 'دار الجوري للتجميل', en: 'Dar Al Jouri Beauty', tagline: ['تجميل راقٍ في الصالون أو في منزلك', 'Premium beauty in-salon or at home'],
    desc: ['دار الجوري صالون تجميل نسائي راقٍ في السد يقدم خدمات الشعر والمكياج والعناية بالبشرة والحمام المغربي، مع فريق خبير يمكنه القدوم إلى منزلك.', 'Dar Al Jouri is a premium ladies salon in Al Sadd offering hair, makeup, skincare and Moroccan bath services, with an expert team that can come to your home.'],
    area: 'alsadd', address: ['الدوحة - شارع السد، مبنى 14', 'Doha - Al Sadd Street, Building 14'], phone: '+97444123456', mode: 'BOTH', subscriptions: true, audience: 'women',
    hours: { from: '10:00', to: '22:00', closed: [5] }, imgs: IMG.salon, tags: ['featured', 'specialOffer', 'premium'], amenities: ['parking', 'wifi', 'coffee', 'privateRooms'],
    rating: 4.9, ratingCount: 214, bookings: 1240, featured: true, ownerPhone: '+97450000002', ownerUserId: 'u_company_jori',
    services: [
      { ar: 'قص وتصفيف الشعر', en: 'Haircut & styling', price: 180, offer: 140, min: 60, sub: true },
      { ar: 'مكياج سهرة', en: 'Evening makeup', price: 350, min: 75 },
      { ar: 'حمام مغربي ملكي', en: 'Royal Moroccan bath', price: 260, min: 90, sub: true },
      { ar: 'عناية بالوجه بالكولاجين', en: 'Collagen facial', price: 220, offer: 180, min: 60, sub: true },
      { ar: 'مانيكير وباديكير', en: 'Manicure & pedicure', price: 120, min: 50 },
      { ar: 'صبغة شعر كاملة', en: 'Full hair colour', price: 420, min: 120 },
    ],
    products: [
      { ar: 'زيت أرغان للشعر', en: 'Argan hair oil', price: 95, offer: 75 },
      { ar: 'ماسك ترطيب الوجه', en: 'Hydrating face mask', price: 65 },
      { ar: 'طقم عناية بالأظافر', en: 'Nail care kit', price: 140 },
    ],
    staff: [
      { ar: 'ليان حداد', en: 'Layan Haddad', title: 'stylist', years: 9, spec: [['قص الشعر', 'Haircuts'], ['الصبغات', 'Colouring']], gender: 'f', price: 180, rating: 4.9 },
      { ar: 'مريم الخليل', en: 'Mariam Al Khalil', title: 'specialist', years: 7, spec: [['المكياج', 'Makeup'], ['الرموش', 'Lashes']], gender: 'f', price: 350, rating: 4.8 },
      { ar: 'هند عثمان', en: 'Hind Othman', title: 'specialist', years: 6, spec: [['العناية بالبشرة', 'Skincare'], ['الحمام المغربي', 'Moroccan bath']], gender: 'f', price: 220, off: [5, 6], rating: 4.7 },
      { ar: 'سارة يوسف', en: 'Sara Youssef', title: 'employee', years: 4, spec: [['الأظافر', 'Nails']], gender: 'f', price: 120, rating: 4.6 },
    ],
  },
  {
    id: 'co_pearl_spa', cat: 'cat_salons', subs: ['sub_massage', 'sub_facial', 'sub_moroccan'],
    ar: 'لؤلؤة سبا', en: 'Pearl Spa', tagline: ['استرخاء بإطلالة على البحر', 'Relaxation with a sea view'],
    desc: ['سبا فاخر في اللؤلؤة يقدم جلسات المساج والعناية بالوجه والحمام المغربي في أجواء هادئة.', 'A luxury spa in The Pearl offering massage, facials and Moroccan bath in a serene setting.'],
    area: 'thepearl', address: ['اللؤلؤة - بورتو أرابيا، المبنى 7', 'The Pearl - Porto Arabia, Building 7'], phone: '+97444556677', mode: 'ONSITE', subscriptions: true, audience: 'women',
    imgs: [IMG.salon[3], IMG.salon[2], IMG.salon[5], IMG.salon[1]], tags: ['premium', 'featured'], amenities: ['parking', 'valet', 'coffee', 'privateRooms', 'sauna'],
    rating: 4.8, ratingCount: 168, bookings: 860, featured: true,
    services: [
      { ar: 'مساج سويدي', en: 'Swedish massage', price: 320, min: 60, sub: true, staff: true },
      { ar: 'مساج بالأحجار الساخنة', en: 'Hot stone massage', price: 390, offer: 330, min: 75, staff: true },
      { ar: 'عناية بالوجه بالذهب', en: 'Gold facial', price: 450, min: 70 },
      { ar: 'حمام مغربي', en: 'Moroccan bath', price: 240, min: 60 },
    ],
    staff: [
      { ar: 'نادين رزق', en: 'Nadine Rizk', title: 'specialist', years: 10, spec: [['المساج العلاجي', 'Therapeutic massage']], gender: 'f', price: 320, rating: 4.9 },
      { ar: 'أمل فهمي', en: 'Amal Fahmy', title: 'specialist', years: 5, spec: [['العناية بالبشرة', 'Skincare']], gender: 'f', price: 300, rating: 4.7 },
    ],
  },
  {
    id: 'co_barber_king', cat: 'cat_salons', subs: ['sub_hair', 'sub_brows'],
    ar: 'صالون الملك للرجال', en: 'King Barber Lounge', tagline: ['حلاقة رجالية كلاسيكية', 'Classic men’s grooming'],
    desc: ['صالون رجالي في الخليج الغربي بخدمات الحلاقة والعناية باللحية، مع خيار الحلاقة في المنزل.', 'A men’s barber lounge in West Bay for haircuts and beard care, with an at-home option.'],
    area: 'westbay', address: ['الخليج الغربي - برج الفردان', 'West Bay - Al Fardan Tower'], phone: '+97444889900', mode: 'BOTH', audience: 'men',
    imgs: [IMG.salon[4], IMG.salon[0], IMG.salon[1]], tags: ['studentDiscount'], amenities: ['parking', 'wifi', 'coffee'],
    rating: 4.6, ratingCount: 302, bookings: 1980,
    services: [
      { ar: 'قص شعر رجالي', en: 'Men’s haircut', price: 80, min: 30, staff: true },
      { ar: 'حلاقة لحية بالموس', en: 'Straight razor shave', price: 60, min: 25, staff: true },
      { ar: 'قص + لحية + ماسك', en: 'Cut + beard + mask', price: 150, offer: 120, min: 55, staff: true },
    ],
    products: [{ ar: 'زيت لحية', en: 'Beard oil', price: 55 }, { ar: 'واكس شعر', en: 'Hair wax', price: 45, offer: 35 }],
    staff: [
      { ar: 'يوسف البنا', en: 'Youssef Al Banna', title: 'stylist', years: 12, spec: [['القصات الكلاسيكية', 'Classic cuts']], gender: 'm', price: 80, rating: 4.8 },
      { ar: 'كريم عزيز', en: 'Karim Aziz', title: 'stylist', years: 6, spec: [['الفيد', 'Fades'], ['اللحية', 'Beards']], gender: 'm', price: 80, rating: 4.5 },
      { ar: 'طارق سالم', en: 'Tarek Salem', title: 'employee', years: 3, spec: [['الحلاقة', 'Shaves']], gender: 'm', price: 60, off: [0], rating: 4.4 },
    ],
  },
  {
    id: 'co_lusail_lashes', cat: 'cat_salons', subs: ['sub_lashes', 'sub_brows', 'sub_nails'],
    ar: 'لوسيل لاش ستوديو', en: 'Lusail Lash Studio', tagline: ['رموش وحواجب بلمسة فنية', 'Lashes and brows with an artistic touch'],
    desc: ['استوديو متخصص في تركيب الرموش وتشكيل الحواجب والأظافر في لوسيل.', 'A studio specialised in lash extensions, brow shaping and nails in Lusail.'],
    area: 'lusail', address: ['لوسيل - مارينا، المبنى 3', 'Lusail - Marina, Building 3'], phone: '+97444778899', mode: 'ONSITE', audience: 'women',
    imgs: [IMG.salon[1], IMG.salon[5], IMG.salon[0]], tags: ['new'], rating: 4.7, ratingCount: 58, bookings: 240,
    services: [
      { ar: 'تركيب رموش كلاسيك', en: 'Classic lash extensions', price: 250, min: 90, staff: true },
      { ar: 'رفع الرموش', en: 'Lash lift', price: 180, offer: 150, min: 50, staff: true },
      { ar: 'تشكيل الحواجب', en: 'Brow shaping', price: 70, min: 25 },
      { ar: 'أظافر جل', en: 'Gel nails', price: 140, min: 60 },
    ],
    staff: [
      { ar: 'دانة المري', en: 'Dana Al Marri', title: 'specialist', years: 5, spec: [['الرموش', 'Lashes']], gender: 'f', price: 250, rating: 4.8 },
      { ar: 'ريم حسن', en: 'Reem Hassan', title: 'employee', years: 3, spec: [['الأظافر', 'Nails'], ['الحواجب', 'Brows']], gender: 'f', price: 140, rating: 4.6 },
    ],
  },
  // ---------- Gyms ----------
  {
    id: 'co_powerhouse', cat: 'cat_gyms', subs: ['sub_bodybuilding', 'sub_crossfit'],
    ar: 'باور هاوس جيم', en: 'Power House Gym', tagline: ['نادي القوة الأبرز في الدفنة', 'The leading strength club in Dafna'],
    desc: ['مساحة تدريب بحجم 2,400 م² تطل على الدفنة، بأجهزة احترافية ومنطقة مخصصة للتمارين الوظيفية وغرف استشفاء هادئة.', 'A 2,400 m² training floor overlooking Dafna with professional equipment, a functional zone and quiet recovery rooms.'],
    area: 'dafna', address: ['الدفنة - شارع الكورنيش', 'Dafna - Corniche Street'], phone: '+97444001122', mode: 'ONSITE', subscriptions: true, audience: 'men',
    hours: { from: '06:00', to: '23:59' }, imgs: IMG.gym, tags: ['featured', 'premium', 'studentDiscount'], amenities: ['parking', 'sauna', 'lockers', 'classes', 'cafe', 'wifi'],
    rating: 4.9, ratingCount: 128, bookings: 2140, featured: true,
    services: [
      { ar: 'اشتراك النادي', en: 'Club membership', price: 299, min: 60, sub: true, staff: false, desc: { ar: 'دخول كامل للأجهزة والصفوف وغرف التبديل.', en: 'Full access to equipment, classes and locker rooms.' } },
      { ar: 'جلسة تدريب شخصي', en: 'Personal training session', price: 220, offer: 190, min: 60, sub: true, staff: true },
      { ar: 'تقييم الجسم (InBody)', en: 'Body assessment (InBody)', price: 90, min: 30, staff: false },
      { ar: 'حصة كروس فيت', en: 'CrossFit class', price: 80, min: 50, staff: false },
    ],
    products: [{ ar: 'بروتين مصل اللبن 2 كجم', en: 'Whey protein 2 kg', price: 260, offer: 220 }, { ar: 'شيكر باور هاوس', en: 'Power House shaker', price: 40 }],
    staff: [
      { ar: 'عمر المنصوري', en: 'Omar Al Mansouri', title: 'trainer', years: 8, spec: [['القوة واللياقة', 'Strength & conditioning']], gender: 'm', price: 220, rating: 4.9 },
      { ar: 'باولو رييس', en: 'Paolo Reyes', title: 'trainer', years: 6, spec: [['بناء العضلات', 'Muscle building']], gender: 'm', price: 180, rating: 4.7 },
      { ar: 'دانيال كارتر', en: 'Daniel Carter', title: 'trainer', years: 10, spec: [['الملاكمة واللياقة', 'Boxing & fitness']], gender: 'm', price: 240, off: [5, 6], rating: 4.8 },
    ],
  },
  {
    id: 'co_lusail_ladies', cat: 'cat_gyms', subs: ['sub_pilates', 'sub_yoga', 'sub_bodybuilding'],
    ar: 'نادي لوسيل ليديز', en: 'Lusail Ladies Fitness', tagline: ['بيلاتس وقوة ومجتمع للسيدات', 'Pilates, strength and community for women'],
    desc: ['بيلاتس ريفورمر، ودوائر تمارين قوة، واستشارات تغذية في مساحة مشرقة ومرحبة مخصصة للسيدات في لوسيل.', 'Reformer pilates, strength circuits and nutrition advice in a bright, welcoming women-only space in Lusail.'],
    area: 'lusail', address: ['لوسيل - الحي التجاري، مبنى 21', 'Lusail - Commercial Boulevard, Building 21'], phone: '+97444334455', mode: 'ONSITE', subscriptions: true, audience: 'women',
    hours: { from: '07:00', to: '22:00', closed: [5] }, imgs: [IMG.gym[3], IMG.gym[5], IMG.gym[1], IMG.gym[2]], tags: ['featured', 'premium'], amenities: ['parking', 'lockers', 'classes', 'cafe', 'kids'],
    rating: 4.8, ratingCount: 96, bookings: 1120, featured: true,
    services: [
      { ar: 'عضوية النادي', en: 'Membership', price: 349, min: 60, sub: true, staff: false },
      { ar: 'بيلاتس ريفورمر (خاص)', en: 'Private reformer pilates', price: 230, min: 55, sub: true, staff: true },
      { ar: 'حصة يوغا جماعية', en: 'Group yoga class', price: 70, offer: 55, min: 60, staff: false },
      { ar: 'استشارة تغذية', en: 'Nutrition consultation', price: 150, min: 45, staff: true },
    ],
    staff: [
      { ar: 'ليلى حسن', en: 'Layla Hassan', title: 'trainer', years: 7, spec: [['القوة واللياقة', 'Strength & fitness']], gender: 'f', price: 230, rating: 4.9 },
      { ar: 'ياسمين فاروق', en: 'Yasmin Farouk', title: 'trainer', years: 5, spec: [['بيلاتس', 'Pilates'], ['اليوغا', 'Yoga']], gender: 'f', price: 230, rating: 4.8 },
      { ar: 'نور حكيم', en: 'Noor Hakim', title: 'specialist', years: 6, spec: [['التغذية', 'Nutrition']], gender: 'f', price: 150, off: [5, 6], rating: 4.7 },
    ],
  },
  {
    id: 'co_oxygen', cat: 'cat_gyms', subs: ['sub_swimming', 'sub_bodybuilding', 'sub_yoga'],
    ar: 'نادي أكسجين', en: 'Oxygen Club', tagline: ['نادٍ مشرق بجانب مارينا لوسيل', 'A bright club beside Lusail Marina'],
    desc: ['واجهات زجاجية كاملة، ومسبح بطول 25 مترًا، وجدول حصص ممتلئ من السبينينغ الصباحي إلى تمارين المرونة المسائية.', 'Floor-to-ceiling glass, a 25 m pool and a packed schedule from morning spinning to evening mobility.'],
    area: 'lusail', address: ['لوسيل - المارينا', 'Lusail - Marina'], phone: '+97444667788', mode: 'ONSITE', subscriptions: true, audience: 'mixed',
    hours: { from: '06:00', to: '23:00' }, imgs: [IMG.gym[1], IMG.gym[0], IMG.gym[4]], tags: ['premium'], amenities: ['parking', 'pool', 'sauna', 'lockers', 'classes'],
    rating: 4.7, ratingCount: 210, bookings: 1650,
    services: [
      { ar: 'عضوية شاملة', en: 'All-access membership', price: 399, offer: 349, min: 60, sub: true, staff: false },
      { ar: 'دروس سباحة خاصة', en: 'Private swimming lessons', price: 200, min: 45, sub: true, staff: true },
      { ar: 'حصة سبينينغ', en: 'Spinning class', price: 60, min: 45, staff: false },
    ],
    staff: [
      { ar: 'لوكاس فيبر', en: 'Lukas Weber', title: 'trainer', years: 9, spec: [['السباحة', 'Swimming'], ['الحركة والتأهيل', 'Mobility & rehab']], gender: 'm', price: 200, rating: 4.7 },
      { ar: 'إيلينا روسي', en: 'Elena Rossi', title: 'trainer', years: 4, spec: [['السبينينغ', 'Spinning']], gender: 'f', price: 150, rating: 4.6 },
    ],
  },
  {
    id: 'co_rayyan_strength', cat: 'cat_gyms', subs: ['sub_bodybuilding', 'sub_boxing', 'sub_martial'],
    ar: 'بيت الريان للقوة', en: 'Rayyan Strength House', tagline: ['حديد حقيقي بسعر عادل', 'Real iron at a fair price'],
    desc: ['نادي قوة بلا تعقيد: اثنا عشر منصة سكوات، ودمبلز حتى 60 كجم، ومجتمع ودود.', 'A no-nonsense strength gym: twelve squat racks, dumbbells up to 60 kg and a friendly community.'],
    area: 'alrayyan', address: ['الريان - شارع الوعب', 'Al Rayyan - Al Waab Street'], phone: '+97444990011', mode: 'ONSITE', subscriptions: true, audience: 'men',
    hours: { from: '05:30', to: '23:59' }, imgs: [IMG.gym[2], IMG.gym[4], IMG.gym[0]], tags: ['studentDiscount'], amenities: ['parking', 'lockers'],
    rating: 4.5, ratingCount: 84, bookings: 720,
    services: [
      { ar: 'عضوية شهرية', en: 'Monthly membership', price: 199, min: 60, sub: true, staff: false },
      { ar: 'جلسة ملاكمة خاصة', en: 'Private boxing session', price: 160, min: 60, sub: true, staff: true },
      { ar: 'تدريب شخصي', en: 'Personal training', price: 170, offer: 140, min: 60, staff: true },
    ],
    staff: [{ ar: 'سلطان الدوسري', en: 'Sultan Al Dosari', title: 'trainer', years: 11, spec: [['الملاكمة', 'Boxing'], ['القوة', 'Strength']], gender: 'm', price: 160, rating: 4.6 }],
  },
  {
    id: 'co_ems_doha', cat: 'cat_gyms', subs: ['sub_ems'],
    ar: 'EMS الدوحة', en: 'EMS Doha', tagline: ['20 دقيقة تعادل ساعتين', '20 minutes equal two hours'],
    desc: ['استوديو تدريب بالتحفيز الكهربائي مع إمكانية الجلسات المنزلية بأجهزة متنقلة.', 'An EMS training studio with mobile devices for at-home sessions.'],
    area: 'madinatkhalifa', address: ['مدينة خليفة - شارع الجامعة', 'Madinat Khalifa - University Street'], phone: '+97444112233', mode: 'BOTH', subscriptions: true, audience: 'mixed',
    imgs: [IMG.gym[5], IMG.gym[3]], tags: ['new', 'specialOffer'], rating: 4.6, ratingCount: 41, bookings: 310,
    services: [
      { ar: 'جلسة EMS', en: 'EMS session', price: 180, offer: 150, min: 25, sub: true, staff: true },
      { ar: 'باقة تجربة (3 جلسات)', en: 'Trial pack (3 sessions)', price: 400, min: 25, staff: true },
    ],
    staff: [{ ar: 'كريم حداد', en: 'Karim Haddad', title: 'trainer', years: 5, spec: [['التمارين الوظيفية', 'Functional training']], gender: 'm', price: 180, rating: 4.7 }, { ar: 'مها سليم', en: 'Maha Selim', title: 'trainer', years: 4, spec: [['EMS', 'EMS']], gender: 'f', price: 180, rating: 4.5 }],
  },
  // ---------- Clinics ----------
  {
    id: 'co_alnoor_eyes', cat: 'cat_clinics', subs: ['sub_eyes'],
    ar: 'مركز النور للعيون', en: 'Al Noor Eye Center', tagline: ['رواد طب وجراحة العيون في قطر', 'Leaders in eye care and surgery in Qatar'],
    desc: ['مركز النور للعيون هو مركز رائد في مجال طب وجراحة العيون في قطر، يقدم أحدث التقنيات في علاج أمراض العيون وجراحات الليزك وزراعة العدسات.', 'Al Noor Eye Center is a leading ophthalmology centre in Qatar offering the latest technology in eye treatment, LASIK and lens implants.'],
    area: 'alsadd', address: ['الدوحة - شارع السد', 'Doha - Al Sadd Street'], phone: '+97444445566', mode: 'ONSITE', audience: 'mixed',
    hours: { from: '09:00', to: '22:00', closed: [5] }, imgs: [IMG.clinic[0], IMG.clinic[1], IMG.clinic[3]], tags: ['featured', 'studentDiscount', 'specialOffer', 'insurance'], amenities: ['parking', 'wifi', 'pharmacy', 'lab'], insurance: ['قطر للتأمين', 'الخليج للتأمين', 'بما للتأمين', 'دوحة للتأمين'],
    rating: 4.8, ratingCount: 320, bookings: 4120, featured: true,
    services: [
      { ar: 'كشف عيون شامل', en: 'Comprehensive eye exam', price: 150, min: 30, staff: true },
      { ar: 'استشارة ليزك', en: 'LASIK consultation', price: 200, offer: 160, min: 30, staff: true },
      { ar: 'فحص الشبكية', en: 'Retina screening', price: 350, min: 40, staff: true },
      { ar: 'قياس النظر وتركيب العدسات', en: 'Vision test & lens fitting', price: 120, min: 25, staff: true },
    ],
    staff: [
      { ar: 'د. أحمد الهاجري', en: 'Dr. Ahmed Al Hajri', title: 'consultant', years: 18, spec: [['جراحة الليزك', 'LASIK surgery'], ['الشبكية', 'Retina']], gender: 'm', price: 200, rating: 4.9 },
      { ar: 'د. سارة الجابر', en: 'Dr. Sara Al Jaber', title: 'specialist', years: 11, spec: [['طب عيون الأطفال', 'Pediatric ophthalmology']], gender: 'f', price: 150, rating: 4.8 },
      { ar: 'د. محمد نصر', en: 'Dr. Mohammed Nasr', title: 'specialist', years: 9, spec: [['المياه البيضاء', 'Cataract']], gender: 'm', price: 150, rating: 4.7 },
      { ar: 'د. هالة سليم', en: 'Dr. Hala Selim', title: 'resident', years: 4, spec: [['الفحص العام', 'General exams']], gender: 'f', price: 120, off: [5, 6], rating: 4.6 },
      { ar: 'د. خالد عثمان', en: 'Dr. Khalid Othman', title: 'consultant', years: 15, spec: [['الجلوكوما', 'Glaucoma']], gender: 'm', price: 200, rating: 4.8 },
      { ar: 'د. ريم فارس', en: 'Dr. Reem Fares', title: 'specialist', years: 8, spec: [['العدسات اللاصقة', 'Contact lenses']], gender: 'f', price: 120, rating: 4.7 },
    ],
  },
  {
    id: 'co_smile_dental', cat: 'cat_clinics', subs: ['sub_dental'],
    ar: 'عيادة الابتسامة لطب الأسنان', en: 'Smile Dental Clinic', tagline: ['ابتسامة واثقة بأحدث التقنيات', 'A confident smile with the latest technology'],
    desc: ['عيادة أسنان في الوكرة تقدم التنظيف والتبييض والتقويم وزراعة الأسنان بأجهزة رقمية حديثة.', 'A dental clinic in Al Wakrah offering cleaning, whitening, orthodontics and implants with modern digital equipment.'],
    area: 'alwakrah', address: ['الوكرة - شارع الوكرة الرئيسي', 'Al Wakrah - Main Street'], phone: '+97444778800', mode: 'ONSITE', audience: 'mixed',
    hours: { from: '09:00', to: '21:00', closed: [5] }, imgs: [IMG.clinic[4], IMG.clinic[5], IMG.clinic[2]], tags: ['specialOffer', 'insurance'], insurance: ['قطر للتأمين', 'العربي للتأمين'], amenities: ['parking', 'wifi'],
    rating: 4.7, ratingCount: 250, bookings: 2890,
    services: [
      { ar: 'تنظيف الأسنان', en: 'Teeth cleaning', price: 200, min: 40, staff: true },
      { ar: 'تبييض الأسنان بالليزر', en: 'Laser whitening', price: 900, offer: 690, min: 60, staff: true },
      { ar: 'استشارة تقويم', en: 'Orthodontic consultation', price: 150, min: 30, staff: true },
      { ar: 'حشوة تجميلية', en: 'Cosmetic filling', price: 350, min: 45, staff: true },
    ],
    staff: [
      { ar: 'د. نورة الكواري', en: 'Dr. Noura Al Kuwari', title: 'consultant', years: 14, spec: [['التقويم', 'Orthodontics']], gender: 'f', price: 150, rating: 4.9 },
      { ar: 'د. عمر فاروق', en: 'Dr. Omar Farouk', title: 'specialist', years: 9, spec: [['زراعة الأسنان', 'Implants']], gender: 'm', price: 200, rating: 4.7 },
      { ar: 'د. لينا حمد', en: 'Dr. Lina Hamad', title: 'specialist', years: 6, spec: [['أسنان الأطفال', 'Pediatric dentistry']], gender: 'f', price: 150, rating: 4.8 },
      { ar: 'د. سامي راشد', en: 'Dr. Sami Rashed', title: 'resident', years: 3, spec: [['التنظيف', 'Cleaning']], gender: 'm', price: 120, rating: 4.5 },
    ],
  },
  {
    id: 'co_derma_center', cat: 'cat_clinics', subs: ['sub_derma', 'sub_beauty'],
    ar: 'مركز الجلدية التخصصي', en: 'Derma Specialist Center', tagline: ['بشرة صحية بإشراف خبراء', 'Healthy skin under expert care'],
    desc: ['مركز جلدية وتجميل في الخليج الغربي بأحدث أجهزة الليزر والعناية بالبشرة.', 'A dermatology and aesthetics centre in West Bay with the latest laser and skincare technology.'],
    area: 'westbay', address: ['الخليج الغربي - برج التورنيدو', 'West Bay - Tornado Tower'], phone: '+97444223344', mode: 'ONSITE', audience: 'mixed',
    hours: { from: '10:00', to: '21:00', closed: [5] }, imgs: [IMG.clinic[2], IMG.clinic[3], IMG.clinic[0]], tags: ['featured', 'specialOffer', 'insurance'], insurance: ['قطر للتأمين', 'الخليج للتأمين'], amenities: ['parking', 'valet', 'wifi'],
    rating: 4.9, ratingCount: 180, bookings: 1980, featured: true,
    services: [
      { ar: 'استشارة جلدية', en: 'Dermatology consultation', price: 250, offer: 200, min: 30, staff: true },
      { ar: 'جلسة ليزر إزالة الشعر', en: 'Laser hair removal session', price: 400, min: 45, sub: true, staff: true },
      { ar: 'تنظيف بشرة عميق', en: 'Deep facial cleansing', price: 300, min: 60, staff: true },
      { ar: 'حقن البوتوكس', en: 'Botox injection', price: 1200, min: 40, staff: true },
    ],
    staff: [
      { ar: 'د. فاطمة الشهواني', en: 'Dr. Fatima Al Shahwani', title: 'consultant', years: 16, spec: [['الجلدية', 'Dermatology'], ['الليزر', 'Laser']], gender: 'f', price: 250, rating: 4.9 },
      { ar: 'د. حسن العمادي', en: 'Dr. Hassan Al Emadi', title: 'specialist', years: 10, spec: [['التجميل', 'Aesthetics']], gender: 'm', price: 250, rating: 4.8 },
      { ar: 'د. آمنة نصر', en: 'Dr. Amna Nasr', title: 'specialist', years: 7, spec: [['العناية بالبشرة', 'Skincare']], gender: 'f', price: 200, rating: 4.8 },
      { ar: 'د. جاسم خليل', en: 'Dr. Jassim Khalil', title: 'resident', years: 3, spec: [['الاستشارات', 'Consultations']], gender: 'm', price: 150, rating: 4.6 },
      { ar: 'د. شيخة منصور', en: 'Dr. Sheikha Mansour', title: 'specialist', years: 8, spec: [['الليزر', 'Laser']], gender: 'f', price: 250, off: [5, 6], rating: 4.7 },
    ],
  },
  {
    id: 'co_heart_center', cat: 'cat_clinics', subs: ['sub_cardio', 'sub_internal'],
    ar: 'مركز القلب الطبي', en: 'Heart Medical Center', tagline: ['قلبك بين أيدٍ أمينة', 'Your heart in safe hands'],
    desc: ['مركز قلب وباطنية في مدينة خليفة بفريق استشاريين وأجهزة تخطيط وإيكو حديثة.', 'A cardiology and internal medicine centre in Madinat Khalifa with consultants and modern ECG/echo equipment.'],
    area: 'madinatkhalifa', address: ['مدينة خليفة - شارع الوحدة', 'Madinat Khalifa - Al Wahda Street'], phone: '+97444556600', mode: 'ONSITE', audience: 'mixed',
    hours: { from: '08:00', to: '20:00', closed: [5] }, imgs: [IMG.clinic[1], IMG.clinic[0], IMG.clinic[3]], tags: ['featured', 'specialOffer', 'insurance'], insurance: ['قطر للتأمين', 'قطر العامة للتأمين', 'دوحة للتأمين'], amenities: ['parking', 'lab', 'pharmacy'],
    rating: 4.8, ratingCount: 190, bookings: 1540, featured: true,
    services: [
      { ar: 'استشارة قلب', en: 'Cardiology consultation', price: 350, min: 30, staff: true },
      { ar: 'تخطيط قلب (ECG)', en: 'ECG', price: 150, min: 20, staff: false },
      { ar: 'إيكو القلب', en: 'Echocardiogram', price: 500, offer: 420, min: 40, staff: true },
      { ar: 'فحص باطنية شامل', en: 'Internal medicine check-up', price: 300, min: 30, staff: true },
    ],
    staff: [
      { ar: 'د. ناصر المهندي', en: 'Dr. Nasser Al Mohannadi', title: 'consultant', years: 20, spec: [['أمراض القلب', 'Cardiology']], gender: 'm', price: 350, rating: 4.9 },
      { ar: 'د. مريم النعيمي', en: 'Dr. Mariam Al Naimi', title: 'consultant', years: 15, spec: [['الباطنية', 'Internal medicine']], gender: 'f', price: 300, rating: 4.8 },
      { ar: 'د. راشد الخاطر', en: 'Dr. Rashid Al Khater', title: 'specialist', years: 9, spec: [['القسطرة', 'Catheterisation']], gender: 'm', price: 350, rating: 4.7 },
      { ar: 'د. عائشة الكعبي', en: 'Dr. Aisha Al Kaabi', title: 'specialist', years: 7, spec: [['ضغط الدم', 'Hypertension']], gender: 'f', price: 300, rating: 4.7 },
    ],
  },
  {
    id: 'co_physio_plus', cat: 'cat_clinics', subs: ['sub_physio', 'sub_ortho'],
    ar: 'مركز العلاج الطبيعي بلس', en: 'Physio Plus Center', tagline: ['تعافٍ أسرع في العيادة أو في منزلك', 'Faster recovery in clinic or at home'],
    desc: ['مركز علاج طبيعي وتأهيل في المريخ مع جلسات منزلية للحالات التي تحتاج ذلك.', 'A physiotherapy and rehabilitation centre in Al Muraikh with home sessions when needed.'],
    area: 'almuraikh', address: ['المريخ - شارع الفروسية', 'Al Muraikh - Al Furousiya Street'], phone: '+97444667700', mode: 'BOTH', subscriptions: true, audience: 'mixed',
    hours: { from: '08:00', to: '21:00', closed: [5] }, imgs: [IMG.clinic[3], IMG.gym[5], IMG.clinic[2]], tags: ['featured'], amenities: ['parking', 'wifi'],
    rating: 4.7, ratingCount: 160, bookings: 980, featured: true,
    services: [
      { ar: 'جلسة علاج طبيعي', en: 'Physiotherapy session', price: 180, min: 45, sub: true, staff: true },
      { ar: 'تأهيل ما بعد الإصابة', en: 'Post-injury rehabilitation', price: 220, offer: 190, min: 60, sub: true, staff: true },
      { ar: 'جلسة علاج يدوي', en: 'Manual therapy session', price: 200, min: 45, staff: true },
    ],
    staff: [
      { ar: 'د. ليلى حداد', en: 'Dr. Layla Haddad', title: 'specialist', years: 10, spec: [['العلاج الطبيعي', 'Physiotherapy'], ['إصابات الرياضيين', 'Sports injuries']], gender: 'f', price: 180, rating: 4.8 },
      { ar: 'أ. أرجون بيلاي', en: 'Arjun Pillai', title: 'specialist', years: 8, spec: [['العلاج اليدوي', 'Manual therapy']], gender: 'm', price: 200, rating: 4.7 },
      { ar: 'أ. سلمى عادل', en: 'Salma Adel', title: 'employee', years: 5, spec: [['التأهيل', 'Rehabilitation']], gender: 'f', price: 180, rating: 4.6 },
    ],
  },
  {
    id: 'co_shifa_labs', cat: 'cat_clinics', subs: ['sub_lab', 'sub_radiology'],
    ar: 'مختبرات الشفاء', en: 'Shifa Labs', tagline: ['نتائج دقيقة خلال 24 ساعة', 'Accurate results within 24 hours'],
    desc: ['مختبر طبي معتمد مع خدمة سحب العينات من المنزل في جميع أنحاء الدوحة.', 'An accredited medical lab with home sample collection across Doha.'],
    area: 'westbay', address: ['الخليج الغربي - شارع المجلس', 'West Bay - Al Majlis Street'], phone: '+97444889911', mode: 'BOTH', audience: 'mixed',
    hours: { from: '07:00', to: '22:00' }, imgs: [IMG.clinic[2], IMG.clinic[5]], tags: ['insurance'], insurance: ['قطر للتأمين', 'بما للتأمين'], rating: 4.5, ratingCount: 200, bookings: 3300,
    services: [
      { ar: 'فحص دم شامل', en: 'Complete blood test', price: 50, min: 15, staff: false },
      { ar: 'فحص فيتامين د', en: 'Vitamin D test', price: 120, min: 15, staff: false },
      { ar: 'باقة الفحص السنوي', en: 'Annual check-up package', price: 450, offer: 390, min: 30, staff: false },
    ],
  },
  {
    id: 'co_kids_clinic', cat: 'cat_clinics', subs: ['sub_pediatrics', 'sub_ent'],
    ar: 'عيادة براعم للأطفال', en: 'Baraem Kids Clinic', tagline: ['رعاية لطيفة لأطفالكم', 'Gentle care for your little ones'],
    desc: ['عيادة أطفال وأنف وأذن وحنجرة في الوعب بأجواء مريحة للأطفال.', 'A pediatrics and ENT clinic in Al Waab with a child-friendly atmosphere.'],
    area: 'alwaab', address: ['الوعب - شارع الوعب', 'Al Waab - Al Waab Street'], phone: '+97444990022', mode: 'ONSITE', audience: 'mixed',
    hours: { from: '09:00', to: '21:00', closed: [5] }, imgs: [IMG.clinic[0], IMG.clinic[1]], tags: ['insurance'], insurance: ['قطر للتأمين'], rating: 4.6, ratingCount: 110, bookings: 870,
    services: [
      { ar: 'كشف أطفال', en: 'Pediatric consultation', price: 180, min: 25, staff: true },
      { ar: 'تطعيمات', en: 'Vaccinations', price: 120, min: 15, staff: true },
      { ar: 'كشف أنف وأذن', en: 'ENT consultation', price: 200, offer: 170, min: 25, staff: true },
    ],
    staff: [
      { ar: 'د. هند الهاجري', en: 'Dr. Hind Al Hajri', title: 'consultant', years: 13, spec: [['طب الأطفال', 'Pediatrics']], gender: 'f', price: 180, rating: 4.8 },
      { ar: 'د. فيصل السليطي', en: 'Dr. Faisal Al Sulaiti', title: 'specialist', years: 9, spec: [['الأنف والأذن', 'ENT']], gender: 'm', price: 200, rating: 4.6 },
    ],
  },
  {
    id: 'co_nutri_life', cat: 'cat_clinics', subs: ['sub_nutrition'],
    ar: 'نيوتري لايف', en: 'NutriLife', tagline: ['خطة غذائية تناسبك', 'A nutrition plan made for you'],
    desc: ['عيادة تغذية في بن محمود مع متابعة أسبوعية عبر التطبيق وخطط للرياضيين.', 'A nutrition clinic in Bin Mahmoud with weekly follow-ups and athlete plans.'],
    area: 'binmahmoud', address: ['بن محمود - شارع المنتزه', 'Bin Mahmoud - Al Muntazah Street'], phone: '+97444332211', mode: 'BOTH', subscriptions: true, audience: 'mixed',
    imgs: [IMG.clinic[3], IMG.home[3]], tags: ['new'], rating: 4.6, ratingCount: 45, bookings: 260,
    services: [
      { ar: 'استشارة تغذية', en: 'Nutrition consultation', price: 200, min: 40, sub: true, staff: true },
      { ar: 'خطة غذائية شهرية', en: 'Monthly diet plan', price: 450, offer: 390, min: 45, sub: true, staff: true },
    ],
    staff: [{ ar: 'أ. منى عبدالله', en: 'Mona Abdullah', title: 'specialist', years: 8, spec: [['التغذية العلاجية', 'Clinical nutrition']], gender: 'f', price: 200, rating: 4.7 }],
  },
  // ---------- Home services ----------
  {
    id: 'co_sparkle_clean', cat: 'cat_home', subs: ['sub_house_cleaning', 'sub_deep', 'sub_sofa', 'sub_carpet'],
    ar: 'سباركل للتنظيف', en: 'Sparkle Cleaning', tagline: ['منزلك يلمع في ساعات', 'Your home shining within hours'],
    desc: ['شركة تنظيف منزلي محترفة تغطي الدوحة بالكامل بفرق مدربة ومعدات حديثة.', 'A professional home-cleaning company covering all of Doha with trained crews and modern equipment.'],
    area: 'aziziyah', address: ['العزيزية - شارع الفروسية', 'Al Aziziyah - Al Furousiya Street'], phone: '+97444778822', mode: 'HOME', subscriptions: true, audience: 'mixed',
    hours: { from: '07:00', to: '21:00' }, imgs: IMG.home, tags: ['featured', 'specialOffer'], amenities: [], rating: 4.7, ratingCount: 410, bookings: 5200, featured: true,
    services: [
      { ar: 'تنظيف منزل (4 ساعات)', en: 'Home cleaning (4 hours)', price: 160, offer: 130, min: 240, sub: true, staff: false },
      { ar: 'تنظيف عميق للشقة', en: 'Apartment deep cleaning', price: 450, min: 300, staff: false },
      { ar: 'تنظيف الكنب (3 مقاعد)', en: 'Sofa cleaning (3 seats)', price: 180, min: 60, staff: false },
      { ar: 'تنظيف السجاد (م²)', en: 'Carpet cleaning (per m²)', price: 15, min: 30, staff: false },
      { ar: 'خادمة بالساعة', en: 'Hourly helper', price: 45, min: 60, sub: true, staff: false },
    ],
  },
  {
    id: 'co_villa_care', cat: 'cat_home', subs: ['sub_villa_cleaning', 'sub_windows', 'sub_deep'],
    ar: 'فيلا كير', en: 'Villa Care', tagline: ['عناية كاملة بالفلل الكبيرة', 'Complete care for large villas'],
    desc: ['متخصصون في تنظيف الفلل والنوافذ الزجاجية والواجهات في اللؤلؤة ولوسيل.', 'Specialists in villa, glass and facade cleaning in The Pearl and Lusail.'],
    area: 'thepearl', address: ['اللؤلؤة - فيفا بحرية', 'The Pearl - Viva Bahriya'], phone: '+97444556611', mode: 'HOME', subscriptions: true, audience: 'mixed',
    imgs: [IMG.home[3], IMG.home[4], IMG.home[0]], tags: ['premium'], rating: 4.8, ratingCount: 95, bookings: 640,
    services: [
      { ar: 'تنظيف فيلا كامل', en: 'Full villa cleaning', price: 900, offer: 780, min: 480, sub: true, staff: false },
      { ar: 'تنظيف النوافذ والواجهات', en: 'Window & facade cleaning', price: 350, min: 180, staff: false },
    ],
  },
  {
    id: 'co_pest_shield', cat: 'cat_home', subs: ['sub_pest'],
    ar: 'درع لمكافحة الحشرات', en: 'Shield Pest Control', tagline: ['مكافحة آمنة ومضمونة', 'Safe, guaranteed pest control'],
    desc: ['شركة مكافحة حشرات معتمدة من البلدية بمواد آمنة للأطفال والحيوانات الأليفة.', 'A municipality-licensed pest control company using child- and pet-safe materials.'],
    area: 'alsailiya', address: ['السيلية - المنطقة الصناعية الجديدة', 'Al Sailiya - New Industrial Area'], phone: '+97444223300', mode: 'HOME', audience: 'mixed',
    imgs: [IMG.home[1], IMG.home[5]], tags: [], rating: 4.5, ratingCount: 130, bookings: 1100,
    services: [
      { ar: 'رش شامل للشقة', en: 'Full apartment treatment', price: 250, min: 60, staff: false },
      { ar: 'رش شامل للفيلا', en: 'Full villa treatment', price: 450, offer: 390, min: 90, staff: false },
      { ar: 'مكافحة بق الفراش', en: 'Bed bug treatment', price: 350, min: 90, staff: false },
    ],
  },
  {
    id: 'co_cool_ac', cat: 'cat_home', subs: ['sub_ac'],
    ar: 'كوول لصيانة المكيفات', en: 'Cool AC Services', tagline: ['برودة مضمونة طوال الصيف', 'Guaranteed cooling all summer'],
    desc: ['صيانة وتنظيف وتعبئة فريون لجميع أنواع المكيفات مع فنيين معتمدين.', 'Maintenance, cleaning and gas refills for all AC types with certified technicians.'],
    area: 'industrial', address: ['المنطقة الصناعية - شارع 24', 'Industrial Area - Street 24'], phone: '+97444990033', mode: 'HOME', subscriptions: true, audience: 'mixed',
    imgs: [IMG.home[5], IMG.home[2]], tags: ['specialOffer'], rating: 4.4, ratingCount: 210, bookings: 1800,
    services: [
      { ar: 'تنظيف مكيف سبليت', en: 'Split AC cleaning', price: 120, offer: 95, min: 45, sub: true, staff: false },
      { ar: 'تعبئة فريون', en: 'Gas refill', price: 180, min: 40, staff: false },
      { ar: 'عقد صيانة سنوي (4 زيارات)', en: 'Annual maintenance (4 visits)', price: 400, min: 45, staff: false },
    ],
  },
  {
    id: 'co_wash_me', cat: 'cat_home', subs: ['sub_carwash'],
    ar: 'واش مي لغسيل السيارات', en: 'WashMe Car Care', tagline: ['غسيل سيارتك أينما كنت', 'Car wash wherever you are'],
    desc: ['غسيل سيارات متنقل بالبخار يصلك إلى المنزل أو العمل.', 'Mobile steam car wash at your home or office.'],
    area: 'alduhail', address: ['الدحيل - شارع الدحيل', 'Al Duhail - Al Duhail Street'], phone: '+97444112200', mode: 'HOME', subscriptions: true, audience: 'mixed',
    imgs: [IMG.home[2], IMG.home[1]], tags: ['new', 'studentDiscount'], rating: 4.6, ratingCount: 88, bookings: 760,
    services: [
      { ar: 'غسيل خارجي وداخلي', en: 'Exterior & interior wash', price: 70, min: 40, sub: true, staff: false },
      { ar: 'تلميع وحماية', en: 'Polish & protection', price: 250, offer: 199, min: 120, staff: false },
    ],
  },
  {
    id: 'co_office_pro', cat: 'cat_home', subs: ['sub_office_cleaning', 'sub_hourly'],
    ar: 'أوفيس برو للتنظيف', en: 'Office Pro Cleaning', tagline: ['مكاتب نظيفة قبل بداية الدوام', 'Clean offices before the workday starts'],
    desc: ['خدمات تنظيف مكاتب ومجمعات تجارية بعقود يومية وأسبوعية.', 'Office and commercial cleaning with daily and weekly contracts.'],
    area: 'msheireb', address: ['مشيرب - قلب الدوحة', 'Msheireb - Heart of Doha'], phone: '+97444334400', mode: 'HOME', subscriptions: true, audience: 'mixed',
    imgs: [IMG.home[4], IMG.home[0]], tags: [], rating: 4.5, ratingCount: 60, bookings: 420,
    services: [
      { ar: 'تنظيف مكتب (حتى 100 م²)', en: 'Office cleaning (up to 100 m²)', price: 220, min: 120, sub: true, staff: false },
      { ar: 'عامل نظافة بالساعة', en: 'Hourly cleaner', price: 40, min: 60, sub: true, staff: false },
    ],
  },
  // ---------- Construction & design ----------
  {
    id: 'co_benaa', cat: 'cat_construction', subs: ['sub_building', 'sub_finishing', 'sub_painting'],
    ar: 'شركة بناء للمقاولات', en: 'Benaa Contracting', tagline: ['من الأساس إلى التشطيب', 'From foundation to finishing'],
    desc: ['شركة مقاولات عامة في الريان تنفذ الفلل والمباني السكنية مع فريق مهندسين ومقاولين معتمدين.', 'A general contracting company in Al Rayyan delivering villas and residential buildings with certified engineers and contractors.'],
    area: 'alrayyan', address: ['الريان - شارع الشافي', 'Al Rayyan - Al Shafi Street'], phone: '+97444556622', mode: 'ONSITE', audience: 'mixed',
    hours: { from: '08:00', to: '18:00', closed: [5] }, imgs: IMG.construction, tags: ['featured'], rating: 4.6, ratingCount: 72, bookings: 310, featured: true,
    services: [
      { ar: 'استشارة هندسية ومعاينة', en: 'Engineering consultation & site visit', price: 300, min: 60, staff: true },
      { ar: 'تشطيب شقة (م²)', en: 'Apartment finishing (per m²)', price: 220, min: 60, staff: true },
      { ar: 'دهان فيلا كامل', en: 'Full villa painting', price: 6500, offer: 5900, min: 120, staff: true },
    ],
    staff: [
      { ar: 'م. أحمد السليطي', en: 'Eng. Ahmed Al Sulaiti', title: 'engineer', years: 15, spec: [['الإشراف الهندسي', 'Engineering supervision']], gender: 'm', price: 300, rating: 4.8 },
      { ar: 'م. سعد العبيدلي', en: 'Eng. Saad Al Obaidly', title: 'engineer', years: 10, spec: [['التصميم الإنشائي', 'Structural design']], gender: 'm', price: 300, rating: 4.6 },
      { ar: 'مقاول راشد منصور', en: 'Contractor Rashid Mansour', title: 'contractor', years: 18, spec: [['التنفيذ', 'Execution']], gender: 'm', price: 250, rating: 4.5 },
    ],
  },
  {
    id: 'co_deco_studio', cat: 'cat_construction', subs: ['sub_interior', 'sub_decor', 'sub_lighting', 'sub_curtains'],
    ar: 'استوديو ديكو للتصميم', en: 'Deco Design Studio', tagline: ['تصميم داخلي بروح قطرية', 'Interior design with a Qatari soul'],
    desc: ['استوديو تصميم داخلي في مشيرب يقدم التصميم ثلاثي الأبعاد والإشراف على التنفيذ.', 'An interior design studio in Msheireb offering 3D design and execution supervision.'],
    area: 'msheireb', address: ['مشيرب - شارع الكهرباء', 'Msheireb - Al Kahraba Street'], phone: '+97444667711', mode: 'BOTH', audience: 'mixed',
    hours: { from: '09:00', to: '19:00', closed: [5] }, imgs: [IMG.construction[3], IMG.construction[4], IMG.construction[5], IMG.construction[2]], tags: ['featured', 'premium'], rating: 4.9, ratingCount: 54, bookings: 190, featured: true,
    services: [
      { ar: 'استشارة تصميم (زيارة منزلية)', en: 'Design consultation (home visit)', price: 500, offer: 400, min: 90, staff: true },
      { ar: 'تصميم غرفة ثلاثي الأبعاد', en: '3D room design', price: 1500, min: 120, staff: true },
      { ar: 'تصميم وتركيب الإضاءة', en: 'Lighting design & install', price: 2200, min: 180, staff: true },
    ],
    staff: [
      { ar: 'م. نورة المهندي', en: 'Eng. Noura Al Mohannadi', title: 'engineer', years: 12, spec: [['التصميم الداخلي', 'Interior design']], gender: 'f', price: 500, rating: 4.9 },
      { ar: 'م. ماركو بيانكي', en: 'Marco Bianchi', title: 'engineer', years: 9, spec: [['الإضاءة', 'Lighting']], gender: 'm', price: 500, rating: 4.8 },
    ],
  },
  {
    id: 'co_kitchens_q', cat: 'cat_construction', subs: ['sub_kitchens', 'sub_wardrobes', 'sub_furniture'],
    ar: 'مطابخ وخزائن قطر', en: 'Qatar Kitchens & Wardrobes', tagline: ['مطابخ ألمانية بصناعة محلية', 'German-style kitchens, locally made'],
    desc: ['مصنع مطابخ ودواليب في المنطقة الصناعية مع معرض وتركيب خلال 3 أسابيع.', 'A kitchen and wardrobe factory in the Industrial Area with a showroom and 3-week installation.'],
    area: 'industrial', address: ['المنطقة الصناعية - شارع 42', 'Industrial Area - Street 42'], phone: '+97444778833', mode: 'BOTH', audience: 'mixed',
    hours: { from: '08:00', to: '20:00', closed: [5] }, imgs: [IMG.construction[5], IMG.construction[1], IMG.construction[0]], tags: ['specialOffer'], rating: 4.5, ratingCount: 38, bookings: 140,
    services: [
      { ar: 'قياس وتصميم مطبخ', en: 'Kitchen measurement & design', price: 200, min: 60, staff: true },
      { ar: 'مطبخ متكامل (متر طولي)', en: 'Complete kitchen (per linear metre)', price: 1800, offer: 1550, min: 60, staff: false },
      { ar: 'دولاب ملابس (متر طولي)', en: 'Wardrobe (per linear metre)', price: 1200, min: 60, staff: false },
    ],
    products: [{ ar: 'كرسي بار خشبي', en: 'Wooden bar stool', price: 350, offer: 290 }, { ar: 'رف مطبخ معلق', en: 'Floating kitchen shelf', price: 180 }],
    staff: [{ ar: 'م. علي الشهواني', en: 'Eng. Ali Al Shahwani', title: 'engineer', years: 8, spec: [['تصميم المطابخ', 'Kitchen design']], gender: 'm', price: 200, rating: 4.6 }],
  },
  {
    id: 'co_green_gardens', cat: 'cat_construction', subs: ['sub_gardens', 'sub_flooring'],
    ar: 'الحدائق الخضراء', en: 'Green Gardens', tagline: ['حديقة أحلامك في منزلك', 'Your dream garden at home'],
    desc: ['تنسيق حدائق وعشب صناعي وأرضيات خارجية للفلل والمجمعات.', 'Landscaping, artificial grass and outdoor flooring for villas and compounds.'],
    area: 'alwakrah', address: ['الوكرة - شارع المطار الجديد', 'Al Wakrah - New Airport Road'], phone: '+97444990044', mode: 'HOME', audience: 'mixed',
    hours: { from: '07:00', to: '19:00', closed: [5] }, imgs: [IMG.construction[2], IMG.home[3]], tags: ['new'], rating: 4.4, ratingCount: 26, bookings: 90,
    services: [
      { ar: 'تنسيق حديقة (م²)', en: 'Garden landscaping (per m²)', price: 95, min: 60, staff: false },
      { ar: 'عشب صناعي (م²)', en: 'Artificial grass (per m²)', price: 60, offer: 49, min: 60, staff: false },
    ],
  },
  {
    id: 'co_new_salon', cat: 'cat_salons', subs: ['sub_hair'],
    ar: 'صالون روز الجديد', en: 'Rose New Salon', tagline: ['قيد الإعداد', 'Coming soon'],
    desc: ['صالون جديد قيد الإعداد.', 'A new salon being set up.'],
    area: 'alnasr', address: ['النصر', 'Al Nasr'], phone: '+97444000000', mode: 'ONSITE', audience: 'women',
    imgs: [], tags: [], rating: 0, ratingCount: 0, bookings: 0, inactive: true, services: [], ownerPhone: '+97450000009',
  },
];

const built = SPECS.map(build);

export const COMPANIES: Company[] = built.map((b) => b.company);
export const SERVICES: Service[] = built.flatMap((b) => b.services);
export const PRODUCTS: Product[] = built.flatMap((b) => b.products);
export const STAFF: Staff[] = built.flatMap((b) => b.staff);
export const REVIEWS: Review[] = built.flatMap((b) => b.reviews);
