/**
 * Repository contract. Implemented by `src/data/mock` (seeded, offline) and `src/data/amplify` (AppSync/Cognito/S3).
 * UI code must only depend on these interfaces (import `repo` from `@/data`).
 */
import type {
  AdminCreateCompanyInput,
  AdminStats,
  AppNotification,
  AuthNextStep,
  Booking,
  BookingStatus,
  Category,
  Company,
  CompanyFilter,
  CompanyPerformance,
  CompanyProfilePatch,
  CompanyStats,
  CreateBookingInput,
  CreateBookingResult,
  DateString,
  Gift,
  LoyaltyAccount,
  Offer,
  PointsTransaction,
  Product,
  RateBookingInput,
  RecipientLookup,
  Review,
  SearchResults,
  SendGiftInput,
  SendGiftResult,
  Service,
  SessionInfo,
  Staff,
  StatsRange,
  Subscription,
  TimeSlot,
  Unsubscribe,
  UpsertCategoryInput,
  UpsertProductInput,
  UpsertServiceInput,
  UpsertStaffInput,
  UserProfile,
  ActivityLog,
  Lang,
} from '@/domain/types';

export interface AuthService {
  /** Current session or null (guest). Never throws. */
  getSession(): Promise<SessionInfo | null>;
  /** Phone sign-in. Returns OTP step for known phones, SIGN_UP for unknown ones. */
  signInWithPhone(phone: string): Promise<AuthNextStep>;
  /** Complete phone sign-up (name) then an OTP step follows. */
  signUpWithPhone(input: { phone: string; name: string; email?: string }): Promise<AuthNextStep>;
  confirmOtp(code: string): Promise<AuthNextStep>;
  resendOtp(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<AuthNextStep>;
  /** Finish a sign-in that returned NEW_PASSWORD (temporary password → permanent one). */
  completeNewPassword(newPassword: string): Promise<AuthNextStep>;
  signUpWithEmail(input: { email: string; password: string; name: string; phone: string }): Promise<AuthNextStep>;
  requestPasswordReset(email: string): Promise<AuthNextStep>;
  confirmPasswordReset(input: { email: string; code: string; newPassword: string }): Promise<void>;
  signOut(): Promise<void>;
  onAuthChange(cb: (session: SessionInfo | null) => void): Unsubscribe;
}

export interface CatalogRepo {
  listCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | null>;
  listCompanies(filter?: CompanyFilter): Promise<Company[]>;
  getCompany(id: string): Promise<Company | null>;
  listServices(companyId: string): Promise<Service[]>;
  getService(id: string): Promise<Service | null>;
  listProducts(companyId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  listStaff(companyId: string): Promise<Staff[]>;
  getStaff(id: string): Promise<Staff | null>;
  /** active offers, newest first */
  listOffers(limit?: number): Promise<Offer[]>;
  listFeatured(limit?: number): Promise<Company[]>;
  listTopRated(limit?: number): Promise<Company[]>;
  listPopular(limit?: number): Promise<Company[]>;
  search(query: string, limit?: number): Promise<SearchResults>;
  listCompanyReviews(companyId: string): Promise<Review[]>;
  listStaffReviews(staffId: string): Promise<Review[]>;
  /** available slots for a date, honouring opening hours, staff availability and existing bookings */
  listTimeSlots(input: { companyId: string; date: DateString; staffId?: string | null; durationMin?: number }): Promise<TimeSlot[]>;
}

export interface BookingRepo {
  createBooking(input: CreateBookingInput): Promise<CreateBookingResult>;
  listMyBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  cancelBooking(id: string): Promise<Booking>;
  rateBooking(input: RateBookingInput): Promise<Booking>;
  listMySubscriptions(): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | null>;
  cancelSubscription(id: string): Promise<Subscription>;
  subscribeMine(cb: (bookings: Booking[]) => void): Unsubscribe;
}

export interface GiftRepo {
  lookupRecipient(phone: string): Promise<RecipientLookup>;
  sendGift(input: SendGiftInput): Promise<SendGiftResult>;
  listReceived(): Promise<Gift[]>;
  listSent(): Promise<Gift[]>;
  getGift(id: string): Promise<Gift | null>;
  /** POINTS: credits the account; SERVICE/PRODUCT: returns the gift with status CLAIMED so the UI starts a booking draft */
  claimGift(id: string): Promise<Gift>;
}

export interface LoyaltyRepo {
  getAccount(): Promise<LoyaltyAccount>;
  listHistory(): Promise<PointsTransaction[]>;
  transferPoints(input: { recipientPhone: string; points: number; message?: string }): Promise<SendGiftResult>;
}

export interface NotificationRepo {
  list(): Promise<AppNotification[]>;
  unreadCount(): Promise<number>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void>;
  subscribe(cb: (n: AppNotification) => void): Unsubscribe;
}

export interface ProfileRepo {
  getMe(): Promise<UserProfile | null>;
  updateMe(patch: Partial<Pick<UserProfile, 'name' | 'email' | 'avatarUrl' | 'language' | 'addresses'>>): Promise<UserProfile>;
  listFavorites(): Promise<Company[]>;
  toggleFavorite(companyId: string): Promise<boolean>;
  uploadImage(localUri: string, purpose: 'avatar' | 'company' | 'staff' | 'service' | 'product' | 'category'): Promise<string>;
}

export interface CompanyWorkspaceRepo {
  getMyCompany(): Promise<Company | null>;
  updateMyCompany(patch: CompanyProfilePatch): Promise<Company>;
  getStats(range: StatsRange): Promise<CompanyStats>;
  listBookings(input: { range: 'today' | 'week' | 'month'; kind?: 'SERVICE' | 'PRODUCT' | 'SUBSCRIPTION'; status?: BookingStatus }): Promise<Booking[]>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking>;
  upsertService(input: UpsertServiceInput): Promise<Service>;
  deleteService(id: string): Promise<void>;
  setServiceOffer(id: string, offer: { offerPrice: number; endsAt?: string | null; imageUrl?: string | null } | null): Promise<Service>;
  upsertProduct(input: UpsertProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  setProductOffer(id: string, offer: { offerPrice: number; endsAt?: string | null } | null): Promise<Product>;
  upsertStaff(input: UpsertStaffInput): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;
  listSubscriptions(): Promise<Subscription[]>;
  listReviews(): Promise<Review[]>;
  replyReview(id: string, text: string): Promise<Review>;
  listNotifications(): Promise<AppNotification[]>;
}

export interface AdminRepo {
  getStats(range: StatsRange): Promise<AdminStats>;
  listCompanies(filter?: CompanyFilter & { status?: 'active' | 'inactive' | 'pending' }): Promise<Company[]>;
  createCompany(input: AdminCreateCompanyInput): Promise<{ company: Company; ownerUsername: string }>;
  updateCompany(id: string, patch: CompanyProfilePatch): Promise<Company>;
  setCompanyActive(id: string, isActive: boolean): Promise<Company>;
  /** Removes the company, its catalogue and the owner account (bookings are kept for history). */
  deleteCompany(id: string): Promise<void>;
  upsertCategory(input: UpsertCategoryInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  listBookingsByDay(date: DateString): Promise<Booking[]>;
  listPerformance(range: StatsRange): Promise<CompanyPerformance[]>;
  listActivity(limit?: number): Promise<ActivityLog[]>;
  listNotifications(): Promise<AppNotification[]>;
  broadcast(input: { title: { ar: string; en: string }; body: { ar: string; en: string }; route?: string }): Promise<void>;
  listCustomers(): Promise<(UserProfile & { loyalty?: LoyaltyAccount })[]>;
  /** all categories including inactive ones, with company counts */
  listCategories(): Promise<Category[]>;
}

export interface OneQRepository {
  readonly mode: 'mock' | 'amplify';
  auth: AuthService;
  catalog: CatalogRepo;
  bookings: BookingRepo;
  gifts: GiftRepo;
  loyalty: LoyaltyRepo;
  notifications: NotificationRepo;
  profile: ProfileRepo;
  company: CompanyWorkspaceRepo;
  admin: AdminRepo;
  /** called once at boot (restore persisted mock state, configure Amplify, etc.) */
  init(lang: Lang): Promise<void>;
}
