/**
 * OneQ domain model — the single contract shared by the UI, the mock repository and the Amplify repository.
 * Keep this file framework-free (no React / Amplify imports).
 */

export type Lang = 'ar' | 'en';
export type Role = 'guest' | 'customer' | 'company' | 'admin';

/** Bilingual text. Always provide both; fall back to `ar` when `en` is empty. */
export interface LocalizedText {
  ar: string;
  en: string;
}

export type ServiceMode = 'ONSITE' | 'HOME' | 'BOTH';
/** 0 = Sunday … 6 = Saturday (JS Date.getDay()). Qatar weeks are displayed starting Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** 'HH:mm' 24h */
export type TimeString = string;
/** 'YYYY-MM-DD' */
export type DateString = string;
/** ISO 8601 */
export type ISODateTime = string;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DayHours {
  open: boolean;
  from: TimeString;
  to: TimeString;
}
export type OpeningHours = Record<Weekday, DayHours>;

export interface DayAvailability {
  available: boolean;
  from: TimeString;
  to: TimeString;
}
export type WeeklyAvailability = Record<Weekday, DayAvailability>;

export type CompanyTag = 'featured' | 'premium' | 'insurance' | 'studentDiscount' | 'specialOffer' | 'new';

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  /** key of the icon map in src/components/ui/icons.ts */
  icon: string;
  /** accent color used for the icon bubble */
  color: string;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  /** gyms ask for gender audience before listing */
  requiresAudience?: boolean;
  subcategories: Subcategory[];
  companyCount?: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  slug: string;
  name: LocalizedText;
  icon: string;
  sortOrder: number;
}

export type Audience = 'men' | 'women' | 'mixed';

export interface Company {
  id: string;
  slug: string;
  categoryId: string;
  subcategoryIds: string[];
  name: LocalizedText;
  tagline?: LocalizedText | null;
  description: LocalizedText;
  logoUrl?: string | null;
  coverUrl?: string | null;
  galleryUrls: string[];
  /** area key, e.g. 'alsadd' — display via AREAS map in i18n */
  area: string;
  address: LocalizedText;
  location: GeoPoint;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  serviceMode: ServiceMode;
  offersSubscriptions: boolean;
  hasStaff: boolean;
  audience: Audience;
  openingHours: OpeningHours;
  amenities: string[];
  tags: CompanyTag[];
  acceptsInsurance?: string[];
  ratingAvg: number;
  ratingCount: number;
  bookingCount: number;
  staffCount: number;
  priceFrom?: number | null;
  isActive: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  /** Cognito sub of the owner account */
  ownerUserId?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  /** profile completion checklist */
  completion: {
    location: boolean;
    hours: boolean;
    catalog: boolean;
    media: boolean;
  };
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  /** computed client-side when a user location is known (km) */
  distanceKm?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: LocalizedText;
  /** 1 | 2 | 3 sessions per week */
  sessionsPerWeek: 1 | 2 | 3;
  durationWeeks: number;
  price: number;
  offerPrice?: number | null;
  features: LocalizedText[];
  isPopular?: boolean;
}

export interface Service {
  id: string;
  companyId: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  offerPrice?: number | null;
  isOffer: boolean;
  offerEndsAt?: ISODateTime | null;
  offerImageUrl?: string | null;
  durationMin: number;
  imageUrl?: string | null;
  allowOneTime: boolean;
  allowSubscription: boolean;
  subscriptionPlans: SubscriptionPlan[];
  requiresStaff: boolean;
  isActive: boolean;
  sortOrder: number;
  bookingCount: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Product {
  id: string;
  companyId: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  offerPrice?: number | null;
  isOffer: boolean;
  offerEndsAt?: ISODateTime | null;
  imageUrls: string[];
  stock?: number | null;
  isActive: boolean;
  salesCount: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type StaffTitle = 'consultant' | 'specialist' | 'resident' | 'trainer' | 'employee' | 'engineer' | 'contractor' | 'doctor' | 'stylist';

export interface Staff {
  id: string;
  companyId: string;
  name: LocalizedText;
  title: StaffTitle;
  bio?: LocalizedText | null;
  photoUrl?: string | null;
  experienceYears: number;
  specialties: LocalizedText[];
  languages?: string[];
  pricePerSession?: number | null;
  isAvailable: boolean;
  availability: WeeklyAvailability;
  ratingAvg: number;
  ratingCount: number;
  bookingCount: number;
  isActive: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Derived view used by the home hero carousel and the offers rows. */
export interface Offer {
  id: string;
  companyId: string;
  companyName: LocalizedText;
  companyLogoUrl?: string | null;
  targetType: 'service' | 'product';
  targetId: string;
  title: LocalizedText;
  imageUrl?: string | null;
  oldPrice: number;
  newPrice: number;
  endsAt?: ISODateTime | null;
  createdAt: ISODateTime;
}

export type BookingKind = 'SERVICE' | 'PRODUCT' | 'SUBSCRIPTION';
export type BookingMode = 'ONSITE' | 'HOME';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CARD' | 'CASH' | 'POINTS' | 'BNPL';
export type PaymentStatus = 'PAID' | 'PENDING' | 'ON_ARRIVAL';

export interface SavedAddress {
  id: string;
  label: string;
  area: string;
  details: string;
  location?: GeoPoint | null;
}

export interface Booking {
  id: string;
  /** human code, e.g. OQ-4K7Z2 */
  code: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  companyId: string;
  companyName: LocalizedText;
  companyLogoUrl?: string | null;
  kind: BookingKind;
  serviceId?: string | null;
  serviceName?: LocalizedText | null;
  productId?: string | null;
  productName?: LocalizedText | null;
  staffId?: string | null;
  staffName?: LocalizedText | null;
  mode: BookingMode;
  date: DateString;
  time: TimeString;
  durationMin?: number | null;
  address?: SavedAddress | null;
  status: BookingStatus;
  price: number;
  discount: number;
  pointsUsed: number;
  pointsEarned: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  isGift: boolean;
  giftId?: string | null;
  subscriptionId?: string | null;
  notes?: string | null;
  companyRated: boolean;
  staffRated: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAUSED';

export interface Subscription {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  companyId: string;
  companyName: LocalizedText;
  companyLogoUrl?: string | null;
  serviceId: string;
  serviceName: LocalizedText;
  planId: string;
  planName: LocalizedText;
  sessionsPerWeek: number;
  startDate: DateString;
  endDate: DateString;
  totalSessions: number;
  usedSessions: number;
  price: number;
  status: SubscriptionStatus;
  staffId?: string | null;
  mode: BookingMode;
  createdAt: ISODateTime;
}

export type GiftKind = 'POINTS' | 'SERVICE' | 'PRODUCT';
export type GiftStatus = 'PENDING' | 'DELIVERED' | 'CLAIMED' | 'WHATSAPP_SENT' | 'EXPIRED' | 'CANCELLED';
export type GiftChannel = 'APP' | 'WHATSAPP';

export interface Gift {
  id: string;
  code: string;
  senderId: string;
  senderName: string;
  senderPhone: string;
  recipientPhone: string;
  recipientId?: string | null;
  recipientName?: string | null;
  kind: GiftKind;
  points?: number | null;
  companyId?: string | null;
  companyName?: LocalizedText | null;
  serviceId?: string | null;
  productId?: string | null;
  itemName?: LocalizedText | null;
  itemImageUrl?: string | null;
  amount?: number | null;
  message?: string | null;
  status: GiftStatus;
  channel: GiftChannel;
  bookingId?: string | null;
  createdAt: ISODateTime;
  claimedAt?: ISODateTime | null;
}

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface LoyaltyAccount {
  customerId: string;
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  nextTierAt: number | null;
  updatedAt: ISODateTime;
}

export type PointsTxType = 'WELCOME' | 'EARN_BOOKING' | 'REDEEM' | 'GIFT_SENT' | 'GIFT_RECEIVED' | 'BONUS' | 'ADJUST';

export interface PointsTransaction {
  id: string;
  customerId: string;
  delta: number;
  type: PointsTxType;
  refId?: string | null;
  note: LocalizedText;
  createdAt: ISODateTime;
}

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  companyId: string;
  staffId?: string | null;
  bookingId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string | null;
  reply?: { text: string; at: ISODateTime } | null;
  createdAt: ISODateTime;
}

export type NotificationType =
  | 'OFFER'
  | 'NEW_SERVICE'
  | 'NEW_PRODUCT'
  | 'CATALOG_UPDATED'
  | 'BOOKING'
  | 'GIFT'
  | 'POINTS'
  | 'SUBSCRIPTION'
  | 'REVIEW'
  | 'COMPANY'
  | 'SYSTEM';

export type NotificationAudience = 'USER' | 'CUSTOMERS' | 'ADMINS' | 'COMPANY';

export interface AppNotification {
  id: string;
  /** target user id when audience === 'USER' | 'COMPANY' */
  userId?: string | null;
  audience: NotificationAudience;
  type: NotificationType;
  title: LocalizedText;
  body: LocalizedText;
  imageUrl?: string | null;
  /** expo-router href to open on tap */
  route?: string | null;
  data?: Record<string, string> | null;
  read: boolean;
  createdAt: ISODateTime;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  updatedAt: ISODateTime;
}

export interface UserProfile {
  id: string;
  role: Exclude<Role, 'guest'>;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  language: Lang;
  favorites: string[];
  addresses: SavedAddress[];
  /** for company users */
  companyId?: string | null;
  createdAt: ISODateTime;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  companyId?: string | null;
  companyName?: LocalizedText | null;
  action: 'SERVICE_CREATED' | 'SERVICE_UPDATED' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'OFFER_SET' | 'OFFER_REMOVED' | 'STAFF_CREATED' | 'STAFF_UPDATED' | 'PROFILE_UPDATED' | 'COMPANY_CREATED' | 'COMPANY_DELETED' | 'INVITATION_RESENT' | 'CATEGORY_CREATED';
  summary: LocalizedText;
  createdAt: ISODateTime;
}

/* ---------- Aggregates ---------- */

export interface TrendPoint {
  label: string;
  value: number;
}

export interface CompanyStats {
  companyId: string;
  range: StatsRange;
  revenue: number;
  revenueDeltaPct: number;
  bookingsToday: number;
  bookingsInRange: number;
  bookingsDeltaPct: number;
  newCustomers: number;
  newCustomersDeltaPct: number;
  activeSubscriptions: number;
  ratingAvg: number;
  ratingCount: number;
  revenueSeries: TrendPoint[];
  bookingsByService: { serviceId: string; name: LocalizedText; count: number; pct: number }[];
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  pendingRatings: number;
}

export type StatsRange = 'today' | 'week' | 'month' | '6m' | '12m';

export interface AdminStats {
  range: StatsRange;
  bookingsToday: number;
  revenueToday: number;
  activeCompanies: number;
  pendingCompanies: number;
  customers: number;
  activeSubscriptions: number;
  bookingsPerDay: TrendPoint[];
  bookingsByCompanyToday: { companyId: string; name: LocalizedText; count: number; revenue: number }[];
  topCompanies: { companyId: string; name: LocalizedText; ratingAvg: number; bookingCount: number }[];
  recentActivity: ActivityLog[];
}

export interface CompanyPerformance {
  companyId: string;
  name: LocalizedText;
  categoryId: string;
  bookings: number;
  revenue: number;
  ratingAvg: number;
  ratingCount: number;
  activeSubscriptions: number;
  trend: TrendPoint[];
  topServices: { name: LocalizedText; count: number }[];
}

/* ---------- Filters & inputs ---------- */

export type CompanySort = 'nearest' | 'openNow' | 'topRated' | 'cheapest' | 'hasOffer' | 'mostBooked' | 'featured';

export interface CompanyFilter {
  categoryId?: string;
  subcategoryId?: string;
  area?: string;
  audience?: Audience;
  serviceMode?: ServiceMode;
  query?: string;
  sort?: CompanySort;
  openNow?: boolean;
  near?: GeoPoint;
  /** max distance in km when `near` is given */
  radiusKm?: number;
  onlyActive?: boolean;
  limit?: number;
}

export interface SearchResults {
  companies: Company[];
  services: (Service & { company: Pick<Company, 'id' | 'name' | 'logoUrl'> })[];
  staff: (Staff & { company: Pick<Company, 'id' | 'name' | 'logoUrl'> })[];
  subcategories: (Subcategory & { category: Pick<Category, 'id' | 'name'> })[];
}

export interface CreateBookingInput {
  companyId: string;
  kind: BookingKind;
  serviceId?: string;
  productId?: string;
  staffId?: string | null;
  mode: BookingMode;
  date: DateString;
  time: TimeString;
  address?: SavedAddress | null;
  paymentMethod: PaymentMethod;
  usePoints?: number;
  notes?: string;
  /** when set the booking is a gift for someone else */
  gift?: { recipientName: string; recipientPhone: string; message?: string } | null;
  /** when kind === 'SUBSCRIPTION' */
  planId?: string;
}

export interface CreateBookingResult {
  booking: Booking;
  subscription?: Subscription | null;
  gift?: Gift | null;
  /** present when the gift recipient is not registered — open it in WhatsApp */
  whatsappUrl?: string | null;
}

export interface RateBookingInput {
  bookingId: string;
  companyRating: 1 | 2 | 3 | 4 | 5;
  companyComment?: string;
  staffRating?: 1 | 2 | 3 | 4 | 5;
  staffComment?: string;
}

export interface SendGiftInput {
  kind: GiftKind;
  recipientPhone: string;
  recipientName?: string;
  message?: string;
  points?: number;
  companyId?: string;
  serviceId?: string;
  productId?: string;
  paymentMethod?: PaymentMethod;
}

export interface SendGiftResult {
  gift: Gift;
  channel: GiftChannel;
  whatsappUrl?: string | null;
}

export interface RecipientLookup {
  phone: string;
  registered: boolean;
  name?: string | null;
}

export interface TimeSlot {
  time: TimeString;
  available: boolean;
}

export interface SessionInfo {
  userId: string;
  role: Exclude<Role, 'guest'>;
  name: string;
  phone?: string | null;
  email?: string | null;
  companyId?: string | null;
  groups: string[];
}

export type AuthNextStep =
  | { step: 'OTP'; destination: string }
  | { step: 'SIGN_UP'; phone: string }
  | { step: 'DONE'; session: SessionInfo }
  | { step: 'RESET_CODE'; destination: string }
  /** account created with a temporary password (Cognito admin-created users): a permanent one must be set first */
  | { step: 'NEW_PASSWORD'; destination: string };

export interface UpsertServiceInput extends Omit<Service, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'bookingCount' | 'isOffer'> {
  id?: string;
}
export interface UpsertProductInput extends Omit<Product, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'salesCount' | 'isOffer'> {
  id?: string;
}
export interface UpsertStaffInput extends Omit<Staff, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'ratingAvg' | 'ratingCount' | 'bookingCount'> {
  id?: string;
}
export interface UpsertCategoryInput extends Omit<Category, 'id' | 'subcategories' | 'companyCount'> {
  id?: string;
  subcategories: (Omit<Subcategory, 'id' | 'categoryId'> & { id?: string })[];
}
export interface AdminCreateCompanyInput {
  categoryId: string;
  subcategoryIds: string[];
  name: LocalizedText;
  description: LocalizedText;
  ownerPhone: string;
  ownerEmail?: string | null;
  ownerName: string;
  area: string;
  address: LocalizedText;
  location: GeoPoint;
  serviceMode: ServiceMode;
  offersSubscriptions: boolean;
  audience: Audience;
  logoUrl?: string | null;
  phone: string;
  whatsapp?: string | null;
}

export type CompanyProfilePatch = Partial<
  Pick<
    Company,
    | 'name'
    | 'tagline'
    | 'description'
    | 'logoUrl'
    | 'coverUrl'
    | 'galleryUrls'
    | 'area'
    | 'address'
    | 'location'
    | 'phone'
    | 'whatsapp'
    | 'email'
    | 'ownerEmail'
    | 'serviceMode'
    | 'offersSubscriptions'
    | 'hasStaff'
    | 'audience'
    | 'openingHours'
    | 'amenities'
    | 'subcategoryIds'
    | 'acceptsInsurance'
    | 'isActive'
  >
>;

export interface Unsubscribe {
  (): void;
}
