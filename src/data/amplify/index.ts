/**
 * Amplify repository — AppSync (Data) + Cognito (Auth) + S3 (Storage) implementation of the OneQ contract.
 * Business rules that move money/points run in the Lambda handlers under amplify/functions; this file maps rows
 * to the domain model, applies read-side filters/sorts and keeps the guest/user auth modes straight.
 */
import { autoSignIn, confirmResetPassword, confirmSignIn, confirmSignUp, fetchAuthSession, resendSignUpCode, resetPassword, signIn, signOut as amplifySignOut, signUp } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { getUrl, uploadData } from 'aws-amplify/storage';
import { Hub } from 'aws-amplify/utils';
import dayjs from 'dayjs';
import type { Schema } from '../../../amplify/data/resource';
import type {
  ActivityLog,
  AdminStats,
  AppNotification,
  Audience,
  Booking,
  BookingStatus,
  Category,
  Company,
  CompanyFilter,
  CompanyPerformance,
  CompanyProfilePatch,
  CompanyStats,
  Gift,
  Lang,
  LocalizedText,
  LoyaltyAccount,
  Offer,
  PointsTransaction,
  Product,
  Review,
  SearchResults,
  Service,
  ServiceMode,
  SessionInfo,
  Staff,
  Subcategory,
  Subscription,
  TimeSlot,
  TrendPoint,
  UserProfile,
} from '@/domain/types';
import { amplifyInfo, configureAmplify } from '@/lib/amplify';
import { haversineKm } from '@/lib/geo';
import { presentLocal } from '@/lib/notifications';
import { normalizeQatarPhone } from '@/lib/phone';
import { fuzzyScoreMany, normalizeText, slugify } from '@/lib/text';
import { addDays, DEFAULT_HOURS, isOpenNow, todayStr } from '@/lib/time';
import type { OneQRepository } from '../repository';

/* ---------- row helpers ---------- */
type Row = Record<string, unknown>;
const s = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const sn = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const n = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const nn = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const b = (v: unknown, d = false): boolean => (typeof v === 'boolean' ? v : d);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => x != null) as T[]) : []);
const ltx = (v: unknown): LocalizedText => {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<LocalizedText>;
  return { ar: o.ar ?? '', en: o.en || o.ar || '' };
};
const ltxn = (v: unknown): LocalizedText | null => (v && typeof v === 'object' ? ltx(v) : null);
const json = <T>(v: unknown, d: T): T => {
  if (v == null) return d;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return d;
    }
  }
  return v as T;
};
const pt = (v: unknown) => {
  const o = (v && typeof v === 'object' ? v : {}) as { lat?: number; lng?: number };
  return { lat: n(o.lat, 25.2854), lng: n(o.lng, 51.531) };
};
/** AWSJSON fields are written as JSON strings. */
const jsonOut = (v: unknown): string => JSON.stringify(v ?? null);
const rowsOf = (res: { data?: unknown }): Row[] => (Array.isArray(res.data) ? (res.data as Row[]) : []);
const firstError = (res: { errors?: { message: string }[] | null }) => res.errors?.[0]?.message;
/** Data calls return errors instead of throwing; surface the first one as a plain Error code. */
const ok = <T extends { data?: unknown; errors?: { message: string }[] | null }>(res: T, context: string): T => {
  const msg = firstError(res);
  if (msg) throw new Error(toCode(msg, context));
  return res;
};
/** Lambda handlers throw `ApiError('CODE')`; AppSync wraps it as "CODE" or "... CODE" — keep the code when it looks like one. */
const toCode = (message: string, context: string) => {
  const m = message.match(/\b([A-Z][A-Z_]{3,})\b/);
  return m ? m[1] : `${context.toUpperCase()}_FAILED`;
};
const byDesc = (key: 'createdAt' | 'sentAt') => (a: Row, c: Row) => s(c[key]).localeCompare(s(a[key]));
const sortDesc = <T extends { createdAt: string }>(items: T[]) => [...items].sort((a, c) => c.createdAt.localeCompare(a.createdAt));

/* ---------- media: storage paths are stored in records and signed on read ---------- */
const MEDIA_BASE = (process.env.EXPO_PUBLIC_MEDIA_BASE_URL ?? '').replace(/\/$/, '');
const urlCache = new Map<string, { url: string; exp: number }>();
const resolveUrl = async (value: string | null | undefined): Promise<string | null> => {
  if (!value) return null;
  if (/^(https?:|data:|file:|content:)/i.test(value)) return value;
  if (MEDIA_BASE) return `${MEDIA_BASE}/${value}`;
  const hit = urlCache.get(value);
  if (hit && hit.exp > Date.now()) return hit.url;
  try {
    const { url, expiresAt } = await getUrl({ path: value, options: { expiresIn: 3600, validateObjectExistence: false } });
    const out = url.toString();
    urlCache.set(value, { url: out, exp: expiresAt.getTime() - 5 * 60 * 1000 });
    return out;
  } catch {
    return null;
  }
};
const resolveAll = async (values: unknown): Promise<string[]> => (await Promise.all(arr<string>(values).map((v) => resolveUrl(v)))).filter((v): v is string => Boolean(v));
/** Writes store the S3 key, never a signed/public URL of our own bucket. */
const toStoragePath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const { bucketName } = amplifyInfo();
  if (bucketName && value.includes(bucketName) && /^https?:/i.test(value)) {
    try {
      return decodeURIComponent(new URL(value).pathname.replace(/^\//, ''));
    } catch {
      return value;
    }
  }
  if (MEDIA_BASE && value.startsWith(`${MEDIA_BASE}/`)) return value.slice(MEDIA_BASE.length + 1);
  return value;
};
const toStoragePaths = (values: string[] | undefined) => (values ?? []).map((v) => toStoragePath(v)).filter((v): v is string => Boolean(v));

/* ---------- mappers ---------- */
const toSubcategory = (v: Row, categoryId: string): Subcategory => ({ id: s(v.id), categoryId, slug: s(v.slug), name: ltx(v.name), icon: s(v.icon, 'sparkles'), sortOrder: n(v.sortOrder) });
const toCategory = async (r: Row): Promise<Category> => ({
  id: s(r.id),
  slug: s(r.slug),
  name: ltx(r.name),
  description: ltx(r.description),
  icon: s(r.icon, 'sparkles'),
  color: s(r.color, '#5A0020'),
  imageUrl: await resolveUrl(sn(r.imageUrl)),
  sortOrder: n(r.sortOrder),
  isActive: b(r.isActive, true),
  requiresAudience: b(r.requiresAudience),
  subcategories: json<Row[]>(r.subcategories, []).map((v) => toSubcategory(v, s(r.id))),
  companyCount: nn(r.companyCount) ?? undefined,
});
const toCompany = async (r: Row): Promise<Company> => ({
  id: s(r.id),
  slug: s(r.slug),
  categoryId: s(r.categoryId),
  subcategoryIds: arr<string>(r.subcategoryIds),
  name: ltx(r.name),
  tagline: ltxn(r.tagline),
  description: ltx(r.description),
  logoUrl: await resolveUrl(sn(r.logoUrl)),
  coverUrl: await resolveUrl(sn(r.coverUrl)),
  galleryUrls: await resolveAll(r.galleryUrls),
  area: s(r.area),
  address: ltx(r.address),
  location: pt(r.location),
  phone: s(r.phone),
  whatsapp: sn(r.whatsapp),
  email: sn(r.email),
  serviceMode: s(r.serviceMode, 'ONSITE') as ServiceMode,
  offersSubscriptions: b(r.offersSubscriptions),
  hasStaff: b(r.hasStaff),
  audience: s(r.audience, 'mixed') as Audience,
  openingHours: json(r.openingHours, DEFAULT_HOURS),
  amenities: arr<string>(r.amenities),
  tags: arr(r.tags),
  acceptsInsurance: arr<string>(r.acceptsInsurance),
  ratingAvg: n(r.ratingAvg),
  ratingCount: n(r.ratingCount),
  bookingCount: n(r.bookingCount),
  staffCount: n(r.staffCount),
  priceFrom: nn(r.priceFrom),
  isActive: b(r.isActive),
  isVerified: b(r.isVerified),
  isFeatured: b(r.isFeatured),
  ownerUserId: sn(r.ownerUserId),
  ownerPhone: sn(r.ownerPhone),
  ownerEmail: sn(r.ownerEmail),
  completion: json(r.completion, { location: false, hours: false, catalog: false, media: false }),
  createdAt: s(r.createdAt),
  updatedAt: s(r.updatedAt),
});
const toService = async (r: Row): Promise<Service> => ({
  id: s(r.id),
  companyId: s(r.companyId),
  name: ltx(r.name),
  description: ltx(r.description),
  price: n(r.price),
  offerPrice: nn(r.offerPrice),
  isOffer: b(r.isOffer),
  offerEndsAt: sn(r.offerEndsAt),
  offerImageUrl: await resolveUrl(sn(r.offerImageUrl)),
  durationMin: n(r.durationMin, 45),
  imageUrl: await resolveUrl(sn(r.imageUrl)),
  allowOneTime: b(r.allowOneTime, true),
  allowSubscription: b(r.allowSubscription),
  subscriptionPlans: json(r.subscriptionPlans, []),
  requiresStaff: b(r.requiresStaff),
  isActive: b(r.isActive, true),
  sortOrder: n(r.sortOrder),
  bookingCount: n(r.bookingCount),
  createdAt: s(r.createdAt),
  updatedAt: s(r.updatedAt),
});
const toProduct = async (r: Row): Promise<Product> => ({
  id: s(r.id),
  companyId: s(r.companyId),
  name: ltx(r.name),
  description: ltx(r.description),
  price: n(r.price),
  offerPrice: nn(r.offerPrice),
  isOffer: b(r.isOffer),
  offerEndsAt: sn(r.offerEndsAt),
  imageUrls: await resolveAll(r.imageUrls),
  stock: nn(r.stock),
  isActive: b(r.isActive, true),
  salesCount: n(r.salesCount),
  createdAt: s(r.createdAt),
  updatedAt: s(r.updatedAt),
});
const toStaff = async (r: Row): Promise<Staff> => ({
  id: s(r.id),
  companyId: s(r.companyId),
  name: ltx(r.name),
  title: s(r.title, 'employee') as Staff['title'],
  bio: ltxn(r.bio),
  photoUrl: await resolveUrl(sn(r.photoUrl)),
  experienceYears: n(r.experienceYears),
  specialties: json<Row[]>(r.specialties, []).map(ltx),
  languages: arr<string>(r.languages),
  pricePerSession: nn(r.pricePerSession),
  isAvailable: b(r.isAvailable, true),
  availability: json(r.availability, {} as Staff['availability']),
  ratingAvg: n(r.ratingAvg),
  ratingCount: n(r.ratingCount),
  bookingCount: n(r.bookingCount),
  isActive: b(r.isActive, true),
  createdAt: s(r.createdAt),
  updatedAt: s(r.updatedAt),
});
const toBooking = async (r: Row): Promise<Booking> => ({
  id: s(r.id),
  code: s(r.code),
  customerId: s(r.customerId),
  customerName: s(r.customerName),
  customerPhone: s(r.customerPhone),
  companyId: s(r.companyId),
  companyName: ltx(r.companyName),
  companyLogoUrl: await resolveUrl(sn(r.companyLogoUrl)),
  kind: s(r.kind, 'SERVICE') as Booking['kind'],
  serviceId: sn(r.serviceId),
  serviceName: ltxn(r.serviceName),
  productId: sn(r.productId),
  productName: ltxn(r.productName),
  staffId: sn(r.staffId),
  staffName: ltxn(r.staffName),
  mode: s(r.mode, 'ONSITE') as Booking['mode'],
  date: s(r.date),
  time: s(r.time),
  durationMin: nn(r.durationMin),
  address: json(r.address, null),
  status: s(r.status, 'PENDING') as BookingStatus,
  price: n(r.price),
  discount: n(r.discount),
  pointsUsed: n(r.pointsUsed),
  pointsEarned: n(r.pointsEarned),
  total: n(r.total),
  paymentMethod: s(r.paymentMethod, 'CARD') as Booking['paymentMethod'],
  paymentStatus: s(r.paymentStatus, 'PAID') as Booking['paymentStatus'],
  isGift: b(r.isGift),
  giftId: sn(r.giftId),
  subscriptionId: sn(r.subscriptionId),
  notes: sn(r.notes),
  companyRated: b(r.companyRated),
  staffRated: b(r.staffRated),
  createdAt: s(r.createdAt),
  updatedAt: s(r.updatedAt),
});
const toSubscription = async (r: Row): Promise<Subscription> => ({
  id: s(r.id),
  code: s(r.code),
  customerId: s(r.customerId),
  customerName: s(r.customerName),
  companyId: s(r.companyId),
  companyName: ltx(r.companyName),
  companyLogoUrl: await resolveUrl(sn(r.companyLogoUrl)),
  serviceId: s(r.serviceId),
  serviceName: ltx(r.serviceName),
  planId: s(r.planId),
  planName: ltx(r.planName),
  sessionsPerWeek: n(r.sessionsPerWeek, 1),
  startDate: s(r.startDate),
  endDate: s(r.endDate),
  totalSessions: n(r.totalSessions),
  usedSessions: n(r.usedSessions),
  price: n(r.price),
  status: s(r.status, 'ACTIVE') as Subscription['status'],
  staffId: sn(r.staffId),
  mode: s(r.mode, 'ONSITE') as Subscription['mode'],
  createdAt: s(r.createdAt),
});
const toGift = async (r: Row): Promise<Gift> => ({
  id: s(r.id),
  code: s(r.code),
  senderId: s(r.senderId),
  senderName: s(r.senderName),
  senderPhone: s(r.senderPhone),
  recipientPhone: s(r.recipientPhone),
  recipientId: sn(r.recipientId),
  recipientName: sn(r.recipientName),
  kind: s(r.kind, 'POINTS') as Gift['kind'],
  points: nn(r.points),
  companyId: sn(r.companyId),
  companyName: ltxn(r.companyName),
  serviceId: sn(r.serviceId),
  productId: sn(r.productId),
  itemName: ltxn(r.itemName),
  itemImageUrl: await resolveUrl(sn(r.itemImageUrl)),
  amount: nn(r.amount),
  message: sn(r.message),
  status: s(r.status, 'PENDING') as Gift['status'],
  channel: s(r.channel, 'APP') as Gift['channel'],
  bookingId: sn(r.bookingId),
  createdAt: s(r.sentAt) || s(r.createdAt),
  claimedAt: sn(r.claimedAt),
});
const toLoyalty = (r: Row | null, customerId: string): LoyaltyAccount => ({
  customerId,
  points: n(r?.points),
  lifetimePoints: n(r?.lifetimePoints),
  tier: s(r?.tier, 'BRONZE') as LoyaltyAccount['tier'],
  nextTierAt: r ? nn(r.nextTierAt) : 500,
  updatedAt: s(r?.updatedAt),
});
const toPoints = (r: Row): PointsTransaction => ({ id: s(r.id), customerId: s(r.customerId), delta: n(r.delta), type: s(r.type, 'ADJUST') as PointsTransaction['type'], refId: sn(r.refId), note: ltx(r.note), createdAt: s(r.sentAt) || s(r.createdAt) });
const toReview = (r: Row): Review => ({ id: s(r.id), customerId: s(r.customerId), customerName: s(r.customerName), companyId: s(r.companyId), staffId: sn(r.staffId), bookingId: s(r.bookingId), rating: Math.min(5, Math.max(1, Math.round(n(r.rating, 5)))) as Review['rating'], comment: sn(r.comment), reply: json<Review['reply']>(r.reply, null), createdAt: s(r.sentAt) || s(r.createdAt) });
const toNotification = async (r: Row): Promise<AppNotification> => ({
  id: s(r.id),
  userId: sn(r.userId),
  audience: s(r.audience, 'USER') as AppNotification['audience'],
  type: s(r.type, 'SYSTEM') as AppNotification['type'],
  title: ltx(r.title),
  body: ltx(r.body),
  imageUrl: await resolveUrl(sn(r.imageUrl)),
  route: sn(r.route),
  data: json<Record<string, string> | null>(r.data, null),
  read: b(r.read),
  createdAt: s(r.sentAt) || s(r.createdAt),
});
const toProfile = async (r: Row): Promise<UserProfile> => ({
  id: s(r.id),
  role: (s(r.role, 'customer') as UserProfile['role']) || 'customer',
  name: s(r.name),
  phone: sn(r.phone),
  email: sn(r.email),
  avatarUrl: await resolveUrl(sn(r.avatarUrl)),
  language: (s(r.language, 'ar') === 'en' ? 'en' : 'ar') as Lang,
  favorites: arr<string>(r.favorites),
  addresses: json(r.addresses, []),
  companyId: sn(r.companyId),
  createdAt: s(r.createdAt),
});
const toActivity = (r: Row): ActivityLog => ({ id: s(r.id), actorId: s(r.actorId), actorName: s(r.actorName), companyId: sn(r.companyId), companyName: ltxn(r.companyName), action: s(r.action, 'PROFILE_UPDATED') as ActivityLog['action'], summary: ltx(r.summary), createdAt: s(r.sentAt) || s(r.createdAt) });

/* ---------- filters & stats (same rules as the mock repository) ---------- */
const applyFilter = (list: Company[], filter?: CompanyFilter): Company[] => {
  let out = list.filter((c) => (filter?.onlyActive === false ? true : c.isActive));
  if (filter?.categoryId) out = out.filter((c) => c.categoryId === filter.categoryId);
  if (filter?.subcategoryId) out = out.filter((c) => c.subcategoryIds.includes(filter.subcategoryId as string));
  if (filter?.area) out = out.filter((c) => c.area === filter.area);
  if (filter?.audience) out = out.filter((c) => c.audience === filter.audience || c.audience === 'mixed');
  if (filter?.serviceMode) out = out.filter((c) => c.serviceMode === filter.serviceMode || c.serviceMode === 'BOTH');
  if (filter?.openNow || filter?.sort === 'openNow') out = out.filter((c) => isOpenNow(c.openingHours));
  if (filter?.query) {
    const q = normalizeText(filter.query);
    out = out.filter((c) => fuzzyScoreMany([c.name.ar, c.name.en, c.tagline?.ar, c.tagline?.en, c.description.ar], q) > 0);
  }
  if (filter?.near) {
    const near = filter.near;
    out = out.map((c) => ({ ...c, distanceKm: Math.round(haversineKm(near, c.location) * 10) / 10 }));
    if (filter.radiusKm) out = out.filter((c) => (c.distanceKm ?? 0) <= (filter.radiusKm as number));
  }
  switch (filter?.sort) {
    case 'nearest':
      out.sort((a, c) => (a.distanceKm ?? 1e9) - (c.distanceKm ?? 1e9));
      break;
    case 'topRated':
      out.sort((a, c) => c.ratingAvg - a.ratingAvg || c.ratingCount - a.ratingCount);
      break;
    case 'cheapest':
      out.sort((a, c) => (a.priceFrom ?? 1e9) - (c.priceFrom ?? 1e9));
      break;
    case 'hasOffer':
      out = out.filter((c) => c.tags.includes('specialOffer')).concat(out.filter((c) => !c.tags.includes('specialOffer')));
      break;
    case 'mostBooked':
      out.sort((a, c) => c.bookingCount - a.bookingCount);
      break;
    case 'featured':
      out.sort((a, c) => Number(c.isFeatured) - Number(a.isFeatured) || c.ratingAvg - a.ratingAvg);
      break;
    default:
      out.sort((a, c) => Number(c.isFeatured) - Number(a.isFeatured) || c.bookingCount - a.bookingCount);
  }
  if (filter?.limit) out = out.slice(0, filter.limit);
  return out;
};
const monthSeries = (bookings: Booking[], count: number, pick: (bk: Booking) => number): TrendPoint[] =>
  Array.from({ length: count }).map((_, i) => {
    const m = dayjs().subtract(count - 1 - i, 'month');
    const inMonth = bookings.filter((bk) => bk.status !== 'CANCELLED' && dayjs(bk.date).isSame(m, 'month'));
    return { label: m.format('MMM'), value: inMonth.reduce((sum, bk) => sum + pick(bk), 0) };
  });
const pct = (a: number, c: number) => (c ? Math.round(((a - c) / c) * 100) : a ? 100 : 0);
const rangeStart = (range: 'today' | 'week' | 'month') => (range === 'today' ? dayjs() : range === 'week' ? dayjs().startOf('week') : dayjs().startOf('month')).format('YYYY-MM-DD');
const rangeEnd = (range: 'today' | 'week' | 'month') => (range === 'today' ? dayjs() : range === 'week' ? dayjs().endOf('week') : dayjs().endOf('month')).format('YYYY-MM-DD');
const randomPassword = () => {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*'];
  let out = '';
  for (let i = 0; i < 24; i++) {
    const set = sets[i % sets.length];
    out += set[Math.floor(Math.random() * set.length)];
  }
  return out;
};
const offerActive = (offerPrice: number | null | undefined, price: number, endsAt?: string | null) => typeof offerPrice === 'number' && offerPrice > 0 && offerPrice < price && (!endsAt || dayjs(endsAt).isAfter(dayjs()));

/* ---------- repository ---------- */
export const createAmplifyRepository = (): OneQRepository => {
  let lang: Lang = 'ar';
  let client: ReturnType<typeof generateClient<Schema>> | null = null;
  let session: SessionInfo | null = null;
  let myCompanyId: string | null = null;
  let companiesCache: { at: number; items: Company[] } | null = null;
  let pending: { kind: 'signin' } | { kind: 'signup'; username: string } | null = null;

  const api = () => {
    if (!client) {
      configureAmplify();
      client = generateClient<Schema>();
    }
    return client;
  };
  /** guest reads go through the identity pool, everything else through the user pool */
  const am = () => (session ? 'userPool' : 'identityPool') as 'userPool' | 'identityPool';
  const sub = (): string => {
    if (!session) throw new Error('UNAUTHENTICATED');
    return session.userId;
  };
  const listAll = async (fetch: (nextToken?: string) => Promise<{ data?: unknown; nextToken?: string | null; errors?: { message: string }[] | null }>, context: string): Promise<Row[]> => {
    const out: Row[] = [];
    let token: string | undefined;
    do {
      const page = ok(await fetch(token), context);
      out.push(...rowsOf(page));
      token = page.nextToken ?? undefined;
    } while (token);
    return out;
  };
  const parse = <T>(v: unknown): T => json<T>(v, v as T);

  /* ----- session ----- */
  const buildSession = async (): Promise<SessionInfo | null> => {
    const auth = await fetchAuthSession();
    const payload = auth.tokens?.idToken?.payload;
    if (!payload || typeof payload.sub !== 'string') return null;
    const groups = Array.isArray(payload['cognito:groups']) ? (payload['cognito:groups'] as string[]) : [];
    const role: SessionInfo['role'] = groups.includes('ADMINS') ? 'admin' : groups.includes('COMPANIES') ? 'company' : 'customer';
    const info: SessionInfo = { userId: payload.sub, role, name: typeof payload.name === 'string' ? payload.name : s(payload['cognito:username'], 'OneQ'), phone: sn(payload.phone_number), email: sn(payload.email), companyId: null, groups };
    session = info;
    if (role === 'company') {
      const res = await api().models.Company.listCompaniesByOwner({ ownerUserId: info.userId }, { authMode: 'userPool', limit: 1 });
      myCompanyId = s(rowsOf(res)[0]?.id) || null;
      info.companyId = myCompanyId;
    }
    return info;
  };
  /** Admins are created outside the app (console / seed script); make sure they have a profile row. */
  const ensureProfile = async (info: SessionInfo) => {
    const res = await api().models.UserProfile.get({ id: info.userId }, { authMode: 'userPool' });
    if (res.data) return;
    await api().models.UserProfile.create({ id: info.userId, owner: info.userId, role: info.role, name: info.name, phone: info.phone ?? null, phoneKey: info.phone ? normalizeQatarPhone(info.phone) : null, email: info.email ?? null, avatarUrl: null, language: lang, favorites: [], addresses: jsonOut([]), companyId: info.companyId ?? null }, { authMode: 'userPool' });
  };
  const finishSignIn = async (): Promise<SessionInfo> => {
    const info = await buildSession();
    if (!info) throw new Error('NO_SESSION');
    await ensureProfile(info).catch((e) => console.warn('ensureProfile', e));
    companiesCache = null;
    return info;
  };
  const smsSignIn = async (phone: string) => {
    const { nextStep } = await signIn({ username: phone, options: { authFlowType: 'USER_AUTH', preferredChallenge: 'SMS_OTP' } });
    if (nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION') {
      const second = await confirmSignIn({ challengeResponse: 'SMS_OTP' });
      return second.nextStep;
    }
    return nextStep;
  };

  /* ----- catalogue caches ----- */
  const allCompanies = async (): Promise<Company[]> => {
    if (companiesCache && Date.now() - companiesCache.at < 30_000) return companiesCache.items;
    const rows = await listAll((nextToken) => api().models.Company.list({ authMode: am(), limit: 500, nextToken }), 'companies');
    const items = await Promise.all(rows.map(toCompany));
    companiesCache = { at: Date.now(), items };
    return items;
  };
  const companyById = async (id: string): Promise<Company | null> => {
    const cached = companiesCache?.items.find((c) => c.id === id);
    if (cached) return cached;
    const res = ok(await api().models.Company.get({ id }, { authMode: am() }), 'company');
    return res.data ? toCompany(res.data as unknown as Row) : null;
  };
  const servicesOf = async (companyId: string) => Promise.all((await listAll((nextToken) => api().models.Service.listServicesByCompany({ companyId }, { authMode: am(), limit: 200, nextToken }), 'services')).map(toService));
  const productsOf = async (companyId: string) => Promise.all((await listAll((nextToken) => api().models.Product.listProductsByCompany({ companyId }, { authMode: am(), limit: 200, nextToken }), 'products')).map(toProduct));
  const staffOf = async (companyId: string) => Promise.all((await listAll((nextToken) => api().models.Staff.listStaffByCompany({ companyId }, { authMode: am(), limit: 200, nextToken }), 'staff')).map(toStaff));
  const companyBookings = async (companyId: string, from?: string, to?: string) => {
    const dateCond = from && to ? { between: [from, to] as [string, string] } : from ? { ge: from } : undefined;
    const rows = await listAll((nextToken) => api().models.Booking.listBookingsByCompany(dateCond ? { companyId, date: dateCond } : { companyId }, { authMode: 'userPool', limit: 500, nextToken }), 'bookings');
    return Promise.all(rows.map(toBooking));
  };
  const requireCompany = async (): Promise<Company> => {
    const id = myCompanyId ?? session?.companyId ?? null;
    if (!id) throw new Error('NO_COMPANY');
    const c = await companyById(id);
    if (!c) throw new Error('NO_COMPANY');
    return c;
  };
  const completionFor = async (c: Company, patch: CompanyProfilePatch) => {
    const merged = { ...c, ...patch };
    const [services, products] = await Promise.all([servicesOf(c.id), productsOf(c.id)]);
    return {
      location: Boolean(merged.area && merged.location),
      hours: Boolean(merged.openingHours && Object.values(merged.openingHours).some((d) => d.open)),
      catalog: services.some((x) => x.isActive) || products.some((x) => x.isActive),
      media: Boolean(merged.logoUrl || merged.coverUrl || (merged.galleryUrls ?? []).length),
    };
  };
  const refreshCatalogFlag = async (companyId: string) => {
    const c = await companyById(companyId);
    if (!c) return;
    const completion = await completionFor(c, {});
    if (JSON.stringify(completion) !== JSON.stringify(c.completion)) {
      await api().models.Company.update({ id: companyId, completion: jsonOut(completion) }, { authMode: 'userPool' });
      companiesCache = null;
    }
  };
  const myNotifications = async (): Promise<AppNotification[]> => {
    if (!session) return [];
    const rows = await listAll((nextToken) => api().models.Notification.listNotificationsByUser({ userId: sub() }, { authMode: 'userPool', sortDirection: 'DESC', limit: 100, nextToken }), 'notifications');
    return Promise.all(rows.sort(byDesc('sentAt')).map(toNotification));
  };
  const servicePatch = (input: Parameters<OneQRepository['company']['upsertService']>[0], companyId: string, existing?: Service) => {
    const price = input.price;
    const offer = offerActive(input.offerPrice, price, input.offerEndsAt);
    return {
      companyId,
      name: input.name,
      description: input.description,
      price,
      offerPrice: offer ? (input.offerPrice as number) : null,
      isOffer: offer,
      offerKey: offer ? 'OFFER' : null,
      offerEndsAt: offer ? (input.offerEndsAt ?? null) : null,
      offerImageUrl: toStoragePath(input.offerImageUrl),
      durationMin: input.durationMin,
      imageUrl: toStoragePath(input.imageUrl),
      allowOneTime: input.allowOneTime,
      allowSubscription: input.allowSubscription,
      subscriptionPlans: jsonOut(input.subscriptionPlans),
      requiresStaff: input.requiresStaff,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      bookingCount: existing?.bookingCount ?? 0,
    };
  };

  const repo: OneQRepository = {
    mode: 'amplify',
    async init(l) {
      lang = l;
      configureAmplify();
      try {
        await buildSession();
      } catch (e) {
        console.warn('[amplify] session restore failed', e);
        session = null;
      }
    },

    auth: {
      async getSession() {
        try {
          return await buildSession();
        } catch {
          return null;
        }
      },
      async signInWithPhone(phoneInput) {
        const phone = normalizeQatarPhone(phoneInput);
        if (!phone) throw new Error('INVALID_PHONE');
        try {
          const next = await smsSignIn(phone);
          if (next.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
            pending = { kind: 'signin' };
            return { step: 'OTP', destination: next.codeDeliveryDetails?.destination ?? phone };
          }
          if (next.signInStep === 'DONE') return { step: 'DONE', session: await finishSignIn() };
          throw new Error(`UNSUPPORTED_STEP_${next.signInStep}`);
        } catch (e) {
          const name = (e as { name?: string }).name;
          if (name === 'UserNotFoundException') return { step: 'SIGN_UP', phone };
          throw e;
        }
      },
      async signUpWithPhone({ phone: phoneInput, name, email }) {
        const phone = normalizeQatarPhone(phoneInput);
        if (!phone) throw new Error('INVALID_PHONE');
        if (!name.trim()) throw new Error('NAME_REQUIRED');
        const { nextStep } = await signUp({
          username: phone,
          password: randomPassword(),
          options: { userAttributes: { phone_number: phone, name: name.trim(), ...(email ? { email } : {}) }, autoSignIn: { authFlowType: 'USER_AUTH' } },
        });
        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
          pending = { kind: 'signup', username: phone };
          return { step: 'OTP', destination: nextStep.codeDeliveryDetails?.destination ?? phone };
        }
        if (nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
          await autoSignIn();
          return { step: 'DONE', session: await finishSignIn() };
        }
        return { step: 'DONE', session: await finishSignIn() };
      },
      async confirmOtp(code) {
        if (!pending) throw new Error('NO_PENDING_AUTH');
        if (pending.kind === 'signup') {
          const username = pending.username;
          const { nextStep } = await confirmSignUp({ username, confirmationCode: code });
          if (nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
            const auto = await autoSignIn();
            if (auto.nextStep.signInStep !== 'DONE') throw new Error(`UNSUPPORTED_STEP_${auto.nextStep.signInStep}`);
          } else if (normalizeQatarPhone(username)) {
            // auto sign-in unavailable: fall back to a fresh SMS OTP sign-in
            const next = await smsSignIn(username);
            pending = { kind: 'signin' };
            if (next.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') return { step: 'OTP', destination: next.codeDeliveryDetails?.destination ?? username };
          }
          pending = null;
          return { step: 'DONE', session: await finishSignIn() };
        }
        const { nextStep } = await confirmSignIn({ challengeResponse: code });
        if (nextStep.signInStep !== 'DONE') throw new Error(`UNSUPPORTED_STEP_${nextStep.signInStep}`);
        pending = null;
        return { step: 'DONE', session: await finishSignIn() };
      },
      async resendOtp() {
        if (pending?.kind === 'signup') await resendSignUpCode({ username: pending.username });
      },
      async signInWithEmail(email, password) {
        const { nextStep } = await signIn({ username: email.trim().toLowerCase(), password });
        if (nextStep.signInStep === 'DONE') return { step: 'DONE', session: await finishSignIn() };
        if (nextStep.signInStep === 'CONFIRM_SIGN_UP') throw new Error('USER_NOT_CONFIRMED');
        // users created in the Cognito console / with AdminCreateUser hold a temporary password until they set their own
        if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') return { step: 'NEW_PASSWORD', destination: email.trim().toLowerCase() };
        if (nextStep.signInStep === 'RESET_PASSWORD') throw new Error('RESET_PASSWORD');
        throw new Error(`UNSUPPORTED_STEP_${nextStep.signInStep}`);
      },
      async completeNewPassword(newPassword) {
        const { nextStep } = await confirmSignIn({ challengeResponse: newPassword });
        if (nextStep.signInStep === 'DONE') return { step: 'DONE', session: await finishSignIn() };
        throw new Error(`UNSUPPORTED_STEP_${nextStep.signInStep}`);
      },
      async signUpWithEmail({ email, password, name, phone: phoneInput }) {
        const phone = normalizeQatarPhone(phoneInput);
        if (!phone) throw new Error('INVALID_PHONE');
        const username = email.trim().toLowerCase();
        const { nextStep } = await signUp({ username, password, options: { userAttributes: { email: username, name: name.trim(), phone_number: phone }, autoSignIn: true } });
        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
          pending = { kind: 'signup', username };
          return { step: 'OTP', destination: nextStep.codeDeliveryDetails?.destination ?? username };
        }
        return { step: 'DONE', session: await finishSignIn() };
      },
      async requestPasswordReset(email) {
        const { nextStep } = await resetPassword({ username: email.trim().toLowerCase() });
        return { step: 'RESET_CODE', destination: nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE' ? (nextStep.codeDeliveryDetails?.destination ?? email) : email };
      },
      async confirmPasswordReset({ email, code, newPassword }) {
        await confirmResetPassword({ username: email.trim().toLowerCase(), confirmationCode: code, newPassword });
      },
      async signOut() {
        await amplifySignOut();
        session = null;
        myCompanyId = null;
        companiesCache = null;
      },
      onAuthChange(cb) {
        const stop = Hub.listen('auth', ({ payload }) => {
          if (payload.event === 'signedIn' || payload.event === 'signedOut' || payload.event === 'tokenRefresh_failure') {
            void buildSession()
              .catch(() => null)
              .then((info) => cb(info));
          }
        });
        return stop;
      },
    },

    catalog: {
      async listCategories() {
        const rows = await listAll((nextToken) => api().models.Category.list({ authMode: am(), limit: 100, nextToken }), 'categories');
        const items = await Promise.all(rows.map(toCategory));
        return items.filter((c) => c.isActive).sort((a, c) => a.sortOrder - c.sortOrder);
      },
      async getCategory(id) {
        const res = ok(await api().models.Category.get({ id }, { authMode: am() }), 'category');
        return res.data ? toCategory(res.data as unknown as Row) : null;
      },
      async listCompanies(filter) {
        return applyFilter(await allCompanies(), filter);
      },
      getCompany: (id) => companyById(id),
      listServices: (companyId) => servicesOf(companyId).then((items) => items.sort((a, c) => a.sortOrder - c.sortOrder)),
      async getService(id) {
        const res = ok(await api().models.Service.get({ id }, { authMode: am() }), 'service');
        return res.data ? toService(res.data as unknown as Row) : null;
      },
      listProducts: (companyId) => productsOf(companyId),
      async getProduct(id) {
        const res = ok(await api().models.Product.get({ id }, { authMode: am() }), 'product');
        return res.data ? toProduct(res.data as unknown as Row) : null;
      },
      listStaff: (companyId) => staffOf(companyId).then((items) => items.filter((x) => x.isActive)),
      async getStaff(id) {
        const res = ok(await api().models.Staff.get({ id }, { authMode: am() }), 'staff');
        return res.data ? toStaff(res.data as unknown as Row) : null;
      },
      async listOffers(limit) {
        const [serviceRows, productRows, companies] = await Promise.all([
          listAll((nextToken) => api().models.Service.listServiceOffers({ offerKey: 'OFFER' }, { authMode: am(), limit: 200, nextToken }), 'offers'),
          listAll((nextToken) => api().models.Product.listProductOffers({ offerKey: 'OFFER' }, { authMode: am(), limit: 200, nextToken }), 'offers'),
          allCompanies(),
        ]);
        const byId = new Map(companies.map((c) => [c.id, c]));
        const offers: Offer[] = [];
        for (const sv of await Promise.all(serviceRows.map(toService))) {
          const c = byId.get(sv.companyId);
          if (!c?.isActive || !sv.isActive || !offerActive(sv.offerPrice, sv.price, sv.offerEndsAt)) continue;
          offers.push({ id: `offer_${sv.id}`, companyId: c.id, companyName: c.name, companyLogoUrl: c.logoUrl, targetType: 'service', targetId: sv.id, title: sv.name, imageUrl: sv.offerImageUrl ?? sv.imageUrl ?? c.coverUrl, oldPrice: sv.price, newPrice: sv.offerPrice as number, endsAt: sv.offerEndsAt ?? null, createdAt: sv.updatedAt });
        }
        for (const p of await Promise.all(productRows.map(toProduct))) {
          const c = byId.get(p.companyId);
          if (!c?.isActive || !p.isActive || !offerActive(p.offerPrice, p.price, p.offerEndsAt)) continue;
          offers.push({ id: `offer_${p.id}`, companyId: c.id, companyName: c.name, companyLogoUrl: c.logoUrl, targetType: 'product', targetId: p.id, title: p.name, imageUrl: p.imageUrls[0] ?? c.coverUrl, oldPrice: p.price, newPrice: p.offerPrice as number, endsAt: p.offerEndsAt ?? null, createdAt: p.updatedAt });
        }
        const sorted = sortDesc(offers);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      async listFeatured(limit = 8) {
        return applyFilter((await allCompanies()).filter((c) => c.isFeatured), { sort: 'featured', limit });
      },
      async listTopRated(limit = 8) {
        return applyFilter((await allCompanies()).filter((c) => c.ratingCount > 0), { sort: 'topRated', limit });
      },
      async listPopular(limit = 8) {
        return applyFilter(await allCompanies(), { sort: 'mostBooked', limit });
      },
      async search(query, limit = 8) {
        const q = normalizeText(query);
        if (q.length < 2) return { companies: [], services: [], staff: [], subcategories: [] };
        const [companies, categories, serviceRows, staffRows] = await Promise.all([
          allCompanies(),
          repo.catalog.listCategories(),
          listAll((nextToken) => api().models.Service.list({ authMode: am(), limit: 500, nextToken }), 'services'),
          listAll((nextToken) => api().models.Staff.list({ authMode: am(), limit: 500, nextToken }), 'staff'),
        ]);
        const active = new Map(companies.filter((c) => c.isActive).map((c) => [c.id, c]));
        const score = <T>(items: T[], fields: (i: T) => (string | null | undefined)[]) =>
          items
            .map((i) => ({ i, sc: fuzzyScoreMany(fields(i), q) }))
            .filter((x) => x.sc > 0)
            .sort((a, c) => c.sc - a.sc)
            .slice(0, limit)
            .map((x) => x.i);
        const pick = (c: Company) => ({ id: c.id, name: c.name, logoUrl: c.logoUrl });
        const services = (await Promise.all(serviceRows.map(toService))).filter((x) => x.isActive && active.has(x.companyId));
        const staff = (await Promise.all(staffRows.map(toStaff))).filter((x) => x.isActive && active.has(x.companyId));
        const subs = categories.flatMap((c) => c.subcategories.map((sc) => ({ ...sc, category: { id: c.id, name: c.name } })));
        const results: SearchResults = {
          companies: score(Array.from(active.values()), (c) => [c.name.ar, c.name.en, c.tagline?.ar, c.tagline?.en, c.description.ar]),
          services: score(services, (x) => [x.name.ar, x.name.en, x.description.ar]).map((x) => ({ ...x, company: pick(active.get(x.companyId) as Company) })),
          staff: score(staff, (x) => [x.name.ar, x.name.en, ...x.specialties.map((sp) => sp.ar)]).map((x) => ({ ...x, company: pick(active.get(x.companyId) as Company) })),
          subcategories: score(subs, (x) => [x.name.ar, x.name.en]),
        };
        return results;
      },
      async listCompanyReviews(companyId) {
        const rows = await listAll((nextToken) => api().models.Review.listReviewsByCompany({ companyId }, { authMode: am(), sortDirection: 'DESC', limit: 200, nextToken }), 'reviews');
        return rows.map(toReview);
      },
      async listStaffReviews(staffId) {
        const rows = await listAll((nextToken) => api().models.Review.listReviewsByStaff({ staffId }, { authMode: am(), sortDirection: 'DESC', limit: 200, nextToken }), 'reviews');
        return rows.map(toReview);
      },
      async listTimeSlots({ companyId, date, staffId, durationMin }) {
        const res = ok(await api().queries.listTimeSlots({ companyId, date, staffId: staffId ?? undefined, durationMin: durationMin ?? undefined }, { authMode: am() }), 'timeslots');
        return parse<TimeSlot[]>(res.data) ?? [];
      },
    },

    bookings: {
      async createBooking(input) {
        const res = ok(await api().mutations.placeBooking({ input: JSON.stringify(input) }, { authMode: 'userPool' }), 'booking');
        const out = parse<{ booking: Row; subscription?: Row | null; gift?: Row | null; whatsappUrl?: string | null }>(res.data);
        companiesCache = null;
        return { booking: await toBooking(out.booking), subscription: out.subscription ? await toSubscription(out.subscription) : null, gift: out.gift ? await toGift(out.gift) : null, whatsappUrl: out.whatsappUrl ?? null };
      },
      async listMyBookings() {
        const rows = await listAll((nextToken) => api().models.Booking.listBookingsByCustomer({ customerId: sub() }, { authMode: 'userPool', sortDirection: 'DESC', limit: 200, nextToken }), 'bookings');
        return Promise.all(rows.map(toBooking));
      },
      async getBooking(id) {
        const res = ok(await api().models.Booking.get({ id }, { authMode: 'userPool' }), 'booking');
        return res.data ? toBooking(res.data as unknown as Row) : null;
      },
      async cancelBooking(id) {
        const res = ok(await api().mutations.updateBookingStatus({ bookingId: id, status: 'CANCELLED' }, { authMode: 'userPool' }), 'booking');
        return toBooking(parse<Row>(res.data));
      },
      async rateBooking(input) {
        const res = ok(await api().mutations.rateBooking({ input: JSON.stringify(input) }, { authMode: 'userPool' }), 'rating');
        companiesCache = null;
        return toBooking(parse<Row>(res.data));
      },
      async listMySubscriptions() {
        const rows = await listAll((nextToken) => api().models.ServiceSubscription.listSubscriptionsByCustomer({ customerId: sub() }, { authMode: 'userPool', limit: 200, nextToken }), 'subscriptions');
        return sortDesc(await Promise.all(rows.map(toSubscription)));
      },
      async getSubscription(id) {
        const res = ok(await api().models.ServiceSubscription.get({ id }, { authMode: 'userPool' }), 'subscription');
        return res.data ? toSubscription(res.data as unknown as Row) : null;
      },
      async cancelSubscription(id) {
        const res = ok(await api().mutations.cancelSubscription({ subscriptionId: id }, { authMode: 'userPool' }), 'subscription');
        return toSubscription(parse<Row>(res.data));
      },
      subscribeMine(cb) {
        if (!session) return () => undefined;
        const subscription = api()
          .models.Booking.observeQuery({ filter: { customerId: { eq: sub() } }, authMode: 'userPool' })
          .subscribe({
            next: ({ items }) => {
              void Promise.all((items as unknown as Row[]).map(toBooking)).then((list) => cb(sortDesc(list)));
            },
            error: (e) => console.warn('[amplify] bookings subscription', e),
          });
        return () => subscription.unsubscribe();
      },
    },

    gifts: {
      async lookupRecipient(phone) {
        const res = ok(await api().queries.lookupRecipient({ phone }, { authMode: 'userPool' }), 'lookup');
        return parse<{ phone: string; registered: boolean; name?: string | null }>(res.data);
      },
      async sendGift(input) {
        const res = ok(await api().mutations.sendGift({ input: JSON.stringify(input) }, { authMode: 'userPool' }), 'gift');
        const out = parse<{ gift: Row; channel: Gift['channel']; whatsappUrl?: string | null }>(res.data);
        return { gift: await toGift(out.gift), channel: out.channel, whatsappUrl: out.whatsappUrl ?? null };
      },
      async listReceived() {
        const phone = session?.phone ? normalizeQatarPhone(session.phone) : null;
        const [byId, byPhone] = await Promise.all([
          listAll((nextToken) => api().models.Gift.listGiftsByRecipient({ recipientId: sub() }, { authMode: 'userPool', limit: 200, nextToken }), 'gifts'),
          phone ? listAll((nextToken) => api().models.Gift.listGiftsByRecipientPhone({ recipientPhone: phone }, { authMode: 'userPool', limit: 200, nextToken }), 'gifts').catch(() => [] as Row[]) : Promise.resolve([] as Row[]),
        ]);
        const seen = new Set<string>();
        const rows = [...byId, ...byPhone].filter((r) => (seen.has(s(r.id)) ? false : (seen.add(s(r.id)), true)));
        return sortDesc(await Promise.all(rows.map(toGift)));
      },
      async listSent() {
        const rows = await listAll((nextToken) => api().models.Gift.listGiftsBySender({ senderId: sub() }, { authMode: 'userPool', limit: 200, nextToken }), 'gifts');
        return sortDesc(await Promise.all(rows.map(toGift)));
      },
      async getGift(id) {
        const res = ok(await api().models.Gift.get({ id }, { authMode: 'userPool' }), 'gift');
        return res.data ? toGift(res.data as unknown as Row) : null;
      },
      async claimGift(id) {
        const res = ok(await api().mutations.claimGift({ giftId: id }, { authMode: 'userPool' }), 'gift');
        return toGift(parse<Row>(res.data));
      },
    },

    loyalty: {
      async getAccount() {
        const id = sub();
        const res = ok(await api().models.LoyaltyAccount.get({ id }, { authMode: 'userPool' }), 'loyalty');
        return toLoyalty((res.data as unknown as Row | null) ?? null, id);
      },
      async listHistory() {
        const rows = await listAll((nextToken) => api().models.PointsTransaction.listPointsByCustomer({ customerId: sub() }, { authMode: 'userPool', sortDirection: 'DESC', limit: 200, nextToken }), 'points');
        return rows.map(toPoints);
      },
      transferPoints: ({ recipientPhone, points, message }) => repo.gifts.sendGift({ kind: 'POINTS', recipientPhone, points, message }),
    },

    notifications: {
      list: () => myNotifications(),
      async unreadCount() {
        return (await myNotifications()).filter((x) => !x.read).length;
      },
      async markRead(id) {
        ok(await api().models.Notification.update({ id, read: true }, { authMode: 'userPool' }), 'notification');
      },
      async markAllRead() {
        const unread = (await myNotifications()).filter((x) => !x.read);
        await Promise.all(unread.map((x) => api().models.Notification.update({ id: x.id, read: true }, { authMode: 'userPool' })));
      },
      async registerPushToken(token, platform) {
        if (!session) return;
        const userId = sub();
        const rows = await listAll((nextToken) => api().models.PushToken.listPushTokensByUserId({ userId }, { authMode: 'userPool', limit: 50, nextToken }), 'push');
        if (rows.some((r) => r.token === token)) return;
        await api().models.PushToken.create({ userId, token, platform }, { authMode: 'userPool' });
      },
      subscribe(cb) {
        if (!session) return () => undefined;
        const subscription = api()
          .models.Notification.onCreate({ filter: { userId: { eq: sub() } }, authMode: 'userPool' })
          .subscribe({
            next: (row) => {
              void toNotification(row as unknown as Row).then((item) => {
                cb(item);
                void presentLocal({ title: item.title[lang] || item.title.ar, body: item.body[lang] || item.body.ar, data: item.route ? { route: item.route } : undefined });
              });
            },
            error: (e) => console.warn('[amplify] notifications subscription', e),
          });
        return () => subscription.unsubscribe();
      },
    },

    profile: {
      async getMe() {
        if (!session) return null;
        const res = ok(await api().models.UserProfile.get({ id: sub() }, { authMode: 'userPool' }), 'profile');
        return res.data ? toProfile(res.data as unknown as Row) : null;
      },
      async updateMe(patch) {
        const res = ok(await api().models.UserProfile.update({ id: sub(), ...patch, addresses: patch.addresses === undefined ? undefined : jsonOut(patch.addresses), avatarUrl: patch.avatarUrl === undefined ? undefined : toStoragePath(patch.avatarUrl) }, { authMode: 'userPool' }), 'profile');
        if (patch.language) lang = patch.language;
        return toProfile(res.data as unknown as Row);
      },
      async listFavorites() {
        const me = await repo.profile.getMe();
        if (!me) return [];
        const companies = await allCompanies();
        return companies.filter((c) => me.favorites.includes(c.id));
      },
      async toggleFavorite(companyId) {
        const me = await repo.profile.getMe();
        if (!me) throw new Error('UNAUTHENTICATED');
        const has = me.favorites.includes(companyId);
        const favorites = has ? me.favorites.filter((x) => x !== companyId) : [...me.favorites, companyId];
        ok(await api().models.UserProfile.update({ id: me.id, favorites }, { authMode: 'userPool' }), 'profile');
        return !has;
      },
      async uploadImage(localUri, purpose) {
        const blob = await (await fetch(localUri)).blob();
        const type = blob.type || 'image/jpeg';
        const ext = (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        const owner = session?.userId ?? 'guest';
        const path = `public/${purpose}/${owner}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        await uploadData({ path, data: blob, options: { contentType: type } }).result;
        return (await resolveUrl(path)) ?? path;
      },
    },

    company: {
      async getMyCompany() {
        try {
          return await requireCompany();
        } catch {
          return null;
        }
      },
      async updateMyCompany(patch) {
        const c = await requireCompany();
        const completion = await completionFor(c, patch);
        if (patch.isActive && !Object.values(completion).every(Boolean)) throw new Error('PROFILE_INCOMPLETE');
        const res = ok(
          await api().models.Company.update(
            {
              id: c.id,
              ...patch,
              logoUrl: patch.logoUrl === undefined ? undefined : toStoragePath(patch.logoUrl),
              coverUrl: patch.coverUrl === undefined ? undefined : toStoragePath(patch.coverUrl),
              galleryUrls: patch.galleryUrls === undefined ? undefined : toStoragePaths(patch.galleryUrls),
              openingHours: patch.openingHours === undefined ? undefined : jsonOut(patch.openingHours),
              completion: jsonOut(completion),
            },
            { authMode: 'userPool' },
          ),
          'company',
        );
        companiesCache = null;
        return toCompany(res.data as unknown as Row);
      },
      async getStats(range) {
        const c = await requireCompany();
        const since = dayjs().subtract(13, 'month').startOf('month').format('YYYY-MM-DD');
        const [all, subRows, reviewRows, services] = await Promise.all([
          companyBookings(c.id, since),
          listAll((nextToken) => api().models.ServiceSubscription.listSubscriptionsByCompany({ companyId: c.id }, { authMode: 'userPool', limit: 500, nextToken }), 'subscriptions'),
          listAll((nextToken) => api().models.Review.listReviewsByCompany({ companyId: c.id }, { authMode: 'userPool', limit: 500, nextToken }), 'reviews'),
          servicesOf(c.id),
        ]);
        const valid = all.filter((bk) => bk.status !== 'CANCELLED');
        const today = todayStr();
        const monthStart = dayjs().startOf('month');
        const prevStart = dayjs().subtract(1, 'month').startOf('month');
        const inMonth = valid.filter((bk) => !dayjs(bk.date).isBefore(monthStart));
        const inPrev = valid.filter((bk) => !dayjs(bk.date).isBefore(prevStart) && dayjs(bk.date).isBefore(monthStart));
        const revenue = inMonth.reduce((sum, bk) => sum + bk.total, 0);
        const prevRevenue = inPrev.reduce((sum, bk) => sum + bk.total, 0);
        const newCustomers = new Set(inMonth.map((bk) => bk.customerId)).size;
        const prevCustomers = new Set(inPrev.map((bk) => bk.customerId)).size;
        const byService = new Map<string, number>();
        valid.forEach((bk) => byService.set(bk.serviceId ?? 'other', (byService.get(bk.serviceId ?? 'other') ?? 0) + 1));
        const totalByService = Array.from(byService.values()).reduce((sum, v) => sum + v, 0) || 1;
        const bookingsByService = Array.from(byService.entries())
          .map(([serviceId, count]) => ({ serviceId, name: services.find((x) => x.id === serviceId)?.name ?? { ar: 'أخرى', en: 'Other' }, count, pct: Math.round((count / totalByService) * 100) }))
          .sort((a, cc) => cc.count - a.count)
          .slice(0, 5);
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
        reviewRows.map(toReview).forEach((r) => {
          dist[r.rating] += 1;
        });
        const stats: CompanyStats = {
          companyId: c.id,
          range,
          revenue,
          revenueDeltaPct: pct(revenue, prevRevenue),
          bookingsToday: valid.filter((bk) => bk.date === today).length,
          bookingsInRange: inMonth.length,
          bookingsDeltaPct: pct(inMonth.length, inPrev.length),
          newCustomers,
          newCustomersDeltaPct: pct(newCustomers, prevCustomers),
          activeSubscriptions: subRows.filter((r) => r.status === 'ACTIVE').length,
          ratingAvg: c.ratingAvg,
          ratingCount: c.ratingCount,
          revenueSeries: monthSeries(valid, range === '6m' ? 6 : 12, (bk) => bk.total),
          bookingsByService,
          ratingDistribution: dist,
          pendingRatings: valid.filter((bk) => bk.status === 'COMPLETED' && !bk.companyRated).length,
        };
        return stats;
      },
      async listBookings({ range, kind, status }) {
        const c = await requireCompany();
        const list = await companyBookings(c.id, rangeStart(range), rangeEnd(range));
        return list.filter((bk) => (!kind || bk.kind === kind) && (!status || bk.status === status)).sort((a, cc) => `${a.date}${a.time}`.localeCompare(`${cc.date}${cc.time}`));
      },
      async updateBookingStatus(id, status) {
        const res = ok(await api().mutations.updateBookingStatus({ bookingId: id, status }, { authMode: 'userPool' }), 'booking');
        return toBooking(parse<Row>(res.data));
      },
      async upsertService(input) {
        const c = await requireCompany();
        const existing = input.id ? (await servicesOf(c.id)).find((x) => x.id === input.id) : undefined;
        const patch = servicePatch(input, c.id, existing);
        const res = input.id ? ok(await api().models.Service.update({ id: input.id, ...patch }, { authMode: 'userPool' }), 'service') : ok(await api().models.Service.create({ ...patch, owner: sub() }, { authMode: 'userPool' }), 'service');
        await refreshCatalogFlag(c.id);
        return toService(res.data as unknown as Row);
      },
      async deleteService(id) {
        ok(await api().models.Service.delete({ id }, { authMode: 'userPool' }), 'service');
        await refreshCatalogFlag((await requireCompany()).id);
      },
      async setServiceOffer(id, offer) {
        const res = ok(await api().models.Service.get({ id }, { authMode: 'userPool' }), 'service');
        if (!res.data) throw new Error('NOT_FOUND');
        const price = n((res.data as unknown as Row).price);
        if (offer && (offer.offerPrice <= 0 || offer.offerPrice >= price)) throw new Error('INVALID_OFFER');
        const updated = ok(
          await api().models.Service.update({ id, offerPrice: offer ? offer.offerPrice : null, offerEndsAt: offer?.endsAt ?? null, offerImageUrl: toStoragePath(offer?.imageUrl ?? null), isOffer: Boolean(offer), offerKey: offer ? 'OFFER' : null }, { authMode: 'userPool' }),
          'service',
        );
        return toService(updated.data as unknown as Row);
      },
      async upsertProduct(input) {
        const c = await requireCompany();
        const existing = input.id ? (await productsOf(c.id)).find((x) => x.id === input.id) : undefined;
        const offer = offerActive(input.offerPrice, input.price, input.offerEndsAt);
        const patch = { companyId: c.id, name: input.name, description: input.description, price: input.price, offerPrice: offer ? (input.offerPrice as number) : null, isOffer: offer, offerKey: offer ? 'OFFER' : null, offerEndsAt: offer ? (input.offerEndsAt ?? null) : null, imageUrls: toStoragePaths(input.imageUrls), stock: input.stock ?? null, isActive: input.isActive, salesCount: existing?.salesCount ?? 0 };
        const res = input.id ? ok(await api().models.Product.update({ id: input.id, ...patch }, { authMode: 'userPool' }), 'product') : ok(await api().models.Product.create({ ...patch, owner: sub() }, { authMode: 'userPool' }), 'product');
        await refreshCatalogFlag(c.id);
        return toProduct(res.data as unknown as Row);
      },
      async deleteProduct(id) {
        ok(await api().models.Product.delete({ id }, { authMode: 'userPool' }), 'product');
        await refreshCatalogFlag((await requireCompany()).id);
      },
      async setProductOffer(id, offer) {
        const res = ok(await api().models.Product.get({ id }, { authMode: 'userPool' }), 'product');
        if (!res.data) throw new Error('NOT_FOUND');
        const price = n((res.data as unknown as Row).price);
        if (offer && (offer.offerPrice <= 0 || offer.offerPrice >= price)) throw new Error('INVALID_OFFER');
        const updated = ok(await api().models.Product.update({ id, offerPrice: offer ? offer.offerPrice : null, offerEndsAt: offer?.endsAt ?? null, isOffer: Boolean(offer), offerKey: offer ? 'OFFER' : null }, { authMode: 'userPool' }), 'product');
        return toProduct(updated.data as unknown as Row);
      },
      async upsertStaff(input) {
        const c = await requireCompany();
        const current = await staffOf(c.id);
        const existing = input.id ? current.find((x) => x.id === input.id) : undefined;
        const patch = { companyId: c.id, name: input.name, title: input.title, bio: input.bio ?? null, photoUrl: toStoragePath(input.photoUrl), experienceYears: input.experienceYears, specialties: jsonOut(input.specialties), languages: input.languages ?? ['ar', 'en'], pricePerSession: input.pricePerSession ?? null, isAvailable: input.isAvailable, availability: jsonOut(input.availability), ratingAvg: existing?.ratingAvg ?? 0, ratingCount: existing?.ratingCount ?? 0, bookingCount: existing?.bookingCount ?? 0, isActive: input.isActive };
        const res = input.id ? ok(await api().models.Staff.update({ id: input.id, ...patch }, { authMode: 'userPool' }), 'staff') : ok(await api().models.Staff.create({ ...patch, owner: sub() }, { authMode: 'userPool' }), 'staff');
        const staffCount = current.filter((x) => x.isActive && x.id !== input.id).length + (input.isActive ? 1 : 0);
        await api().models.Company.update({ id: c.id, staffCount, hasStaff: staffCount > 0 ? true : c.hasStaff }, { authMode: 'userPool' });
        companiesCache = null;
        return toStaff(res.data as unknown as Row);
      },
      async deleteStaff(id) {
        const c = await requireCompany();
        ok(await api().models.Staff.delete({ id }, { authMode: 'userPool' }), 'staff');
        const remaining = (await staffOf(c.id)).filter((x) => x.isActive).length;
        await api().models.Company.update({ id: c.id, staffCount: remaining }, { authMode: 'userPool' });
        companiesCache = null;
      },
      async listSubscriptions() {
        const c = await requireCompany();
        const rows = await listAll((nextToken) => api().models.ServiceSubscription.listSubscriptionsByCompany({ companyId: c.id }, { authMode: 'userPool', limit: 500, nextToken }), 'subscriptions');
        return sortDesc(await Promise.all(rows.map(toSubscription)));
      },
      async listReviews() {
        const c = await requireCompany();
        return repo.catalog.listCompanyReviews(c.id);
      },
      async replyReview(id, text) {
        const res = ok(await api().mutations.replyReview({ reviewId: id, text }, { authMode: 'userPool' }), 'review');
        return toReview(parse<Row>(res.data));
      },
      listNotifications: () => myNotifications(),
    },

    admin: {
      async getStats(range) {
        const today = todayStr();
        const days = Array.from({ length: 14 }).map((_, i) => addDays(today, -(13 - i)));
        const [perDay, companies, customers, subRows, activityRows] = await Promise.all([
          Promise.all(days.map((date) => listAll((nextToken) => api().models.Booking.listBookingsByDate({ date }, { authMode: 'userPool', limit: 500, nextToken }), 'bookings'))),
          allCompanies(),
          listAll((nextToken) => api().models.UserProfile.listUserProfilesByRole({ role: 'customer' }, { authMode: 'userPool', limit: 1000, nextToken }), 'customers'),
          listAll((nextToken) => api().models.ServiceSubscription.list({ filter: { status: { eq: 'ACTIVE' } }, authMode: 'userPool', limit: 1000, nextToken }), 'subscriptions'),
          listAll((nextToken) => api().models.ActivityLog.listActivityByFeed({ feed: 'ALL' }, { authMode: 'userPool', sortDirection: 'DESC', limit: 8, nextToken }), 'activity'),
        ]).then(([perDay, companies, customers, subRows, activityRows]) => [perDay, companies, customers, subRows, activityRows.slice(0, 8)] as const);
        const todays = await Promise.all(perDay[13].filter((r) => r.status !== 'CANCELLED').map(toBooking));
        const byCompany = new Map<string, { count: number; revenue: number }>();
        todays.forEach((bk) => {
          const cur = byCompany.get(bk.companyId) ?? { count: 0, revenue: 0 };
          byCompany.set(bk.companyId, { count: cur.count + 1, revenue: cur.revenue + bk.total });
        });
        const nameOf = (id: string) => companies.find((c) => c.id === id)?.name ?? { ar: '', en: '' };
        const stats: AdminStats = {
          range,
          bookingsToday: todays.length,
          revenueToday: todays.reduce((sum, bk) => sum + bk.total, 0),
          activeCompanies: companies.filter((c) => c.isActive).length,
          pendingCompanies: companies.filter((c) => !c.isActive).length,
          customers: customers.length,
          activeSubscriptions: subRows.length,
          bookingsPerDay: days.map((d, i) => ({ label: dayjs(d).format('D/M'), value: perDay[i].filter((r) => r.status !== 'CANCELLED').length })),
          bookingsByCompanyToday: Array.from(byCompany.entries())
            .map(([companyId, v]) => ({ companyId, name: nameOf(companyId), count: v.count, revenue: v.revenue }))
            .sort((a, c) => c.count - a.count),
          topCompanies: [...companies]
            .filter((c) => c.isActive)
            .sort((a, c) => c.ratingAvg - a.ratingAvg || c.bookingCount - a.bookingCount)
            .slice(0, 5)
            .map((c) => ({ companyId: c.id, name: c.name, ratingAvg: c.ratingAvg, bookingCount: c.bookingCount })),
          recentActivity: activityRows.map(toActivity),
        };
        return stats;
      },
      async listCompanies(filter) {
        let list = applyFilter(await allCompanies(), { ...filter, onlyActive: false });
        if (filter?.status === 'active') list = list.filter((c) => c.isActive);
        if (filter?.status === 'inactive') list = list.filter((c) => !c.isActive && c.completion.catalog);
        if (filter?.status === 'pending') list = list.filter((c) => !c.isActive && !c.completion.catalog);
        return list;
      },
      async createCompany(input) {
        const res = ok(await api().mutations.adminCreateCompany({ input: JSON.stringify({ ...input, logoUrl: toStoragePath(input.logoUrl) }) }, { authMode: 'userPool' }), 'company');
        const out = parse<{ company: Row; ownerUsername: string }>(res.data);
        companiesCache = null;
        return { company: await toCompany(out.company), ownerUsername: out.ownerUsername };
      },
      async updateCompany(id, patch) {
        const res = ok(await api().models.Company.update({ id, ...patch, logoUrl: patch.logoUrl === undefined ? undefined : toStoragePath(patch.logoUrl), coverUrl: patch.coverUrl === undefined ? undefined : toStoragePath(patch.coverUrl), galleryUrls: patch.galleryUrls === undefined ? undefined : toStoragePaths(patch.galleryUrls), openingHours: patch.openingHours === undefined ? undefined : jsonOut(patch.openingHours) }, { authMode: 'userPool' }), 'company');
        companiesCache = null;
        return toCompany(res.data as unknown as Row);
      },
      async setCompanyActive(id, isActive) {
        const res = ok(await api().models.Company.update({ id, isActive }, { authMode: 'userPool' }), 'company');
        companiesCache = null;
        const c = await toCompany(res.data as unknown as Row);
        if (c.ownerUserId) {
          await api()
            .models.Notification.create({ userId: c.ownerUserId, owner: c.ownerUserId, audience: 'COMPANY', type: 'COMPANY', title: { ar: isActive ? 'تم تفعيل شركتك' : 'تم إيقاف شركتك مؤقتًا', en: isActive ? 'Your company is now live' : 'Your company was paused' }, body: { ar: isActive ? 'شركتك ظاهرة الآن للعملاء في OneQ.' : 'تواصل مع إدارة OneQ لمزيد من التفاصيل.', en: isActive ? 'Customers can now find you on OneQ.' : 'Contact OneQ for details.' }, read: false, sentAt: new Date().toISOString() }, { authMode: 'userPool' })
            .catch((e) => console.warn('notify owner', e));
        }
        return c;
      },
      async upsertCategory(input) {
        const subcategories = input.subcategories.map((sc, i) => ({ id: sc.id ?? `sub_${slugify(sc.name.en || sc.name.ar) || i + 1}_${Math.random().toString(36).slice(2, 6)}`, slug: sc.slug, name: sc.name, icon: sc.icon, sortOrder: sc.sortOrder ?? i + 1 }));
        const patch = { slug: input.slug || slugify(input.name.en || input.name.ar), name: input.name, description: input.description, icon: input.icon, color: input.color, imageUrl: toStoragePath(input.imageUrl), sortOrder: input.sortOrder, isActive: input.isActive, requiresAudience: Boolean(input.requiresAudience), subcategories: jsonOut(subcategories) };
        const res = input.id ? ok(await api().models.Category.update({ id: input.id, ...patch }, { authMode: 'userPool' }), 'category') : ok(await api().models.Category.create(patch, { authMode: 'userPool' }), 'category');
        return toCategory(res.data as unknown as Row);
      },
      async deleteCategory(id) {
        const used = await listAll((nextToken) => api().models.Company.listCompaniesByCategory({ categoryId: id }, { authMode: 'userPool', limit: 1, nextToken }), 'companies');
        if (used.length) throw new Error('CATEGORY_HAS_COMPANIES');
        ok(await api().models.Category.delete({ id }, { authMode: 'userPool' }), 'category');
      },
      async listBookingsByDay(date) {
        const rows = await listAll((nextToken) => api().models.Booking.listBookingsByDate({ date }, { authMode: 'userPool', limit: 500, nextToken }), 'bookings');
        return (await Promise.all(rows.map(toBooking))).sort((a, c) => a.time.localeCompare(c.time));
      },
      async listPerformance(range) {
        const months = range === '6m' ? 6 : range === '12m' ? 12 : 1;
        const since = dayjs().subtract(months, 'month').format('YYYY-MM-DD');
        const companies = (await allCompanies()).filter((c) => c.isActive);
        const rows: CompanyPerformance[] = await Promise.all(
          companies.map(async (c) => {
            const [bookings, subRows] = await Promise.all([companyBookings(c.id, since), listAll((nextToken) => api().models.ServiceSubscription.listSubscriptionsByCompany({ companyId: c.id }, { authMode: 'userPool', limit: 500, nextToken }), 'subscriptions')]);
            const valid = bookings.filter((bk) => bk.status !== 'CANCELLED');
            const byService = new Map<string, { name: LocalizedText; count: number }>();
            valid.forEach((bk) => {
              const key = bk.serviceId ?? bk.productId ?? 'other';
              const cur = byService.get(key) ?? { name: bk.serviceName ?? bk.productName ?? { ar: 'أخرى', en: 'Other' }, count: 0 };
              byService.set(key, { ...cur, count: cur.count + 1 });
            });
            return {
              companyId: c.id,
              name: c.name,
              categoryId: c.categoryId,
              bookings: valid.length,
              revenue: valid.reduce((sum, bk) => sum + bk.total, 0),
              ratingAvg: c.ratingAvg,
              ratingCount: c.ratingCount,
              activeSubscriptions: subRows.filter((r) => r.status === 'ACTIVE').length,
              trend: monthSeries(valid, Math.max(6, months), (bk) => bk.total),
              topServices: Array.from(byService.values())
                .sort((a, cc) => cc.count - a.count)
                .slice(0, 3),
            };
          }),
        );
        return rows.sort((a, c) => c.revenue - a.revenue);
      },
      async listActivity(limit = 30) {
        const rows = await listAll((nextToken) => api().models.ActivityLog.listActivityByFeed({ feed: 'ALL' }, { authMode: 'userPool', sortDirection: 'DESC', limit, nextToken }), 'activity');
        return rows.slice(0, limit).map(toActivity);
      },
      listNotifications: () => myNotifications(),
      async broadcast(input) {
        ok(await api().mutations.broadcastNotification({ input: JSON.stringify(input) }, { authMode: 'userPool' }), 'broadcast');
      },
      async listCustomers() {
        const rows = await listAll((nextToken) => api().models.UserProfile.listUserProfilesByRole({ role: 'customer' }, { authMode: 'userPool', limit: 500, nextToken }), 'customers');
        const profiles = await Promise.all(rows.map(toProfile));
        return Promise.all(
          profiles.map(async (p) => {
            const acc = await api().models.LoyaltyAccount.get({ id: p.id }, { authMode: 'userPool' });
            return { ...p, loyalty: acc.data ? toLoyalty(acc.data as unknown as Row, p.id) : undefined };
          }),
        );
      },
      async listCategories() {
        const [rows, companies] = await Promise.all([listAll((nextToken) => api().models.Category.list({ authMode: 'userPool', limit: 100, nextToken }), 'categories'), allCompanies()]);
        const items = await Promise.all(rows.map(toCategory));
        return items.map((c) => ({ ...c, companyCount: companies.filter((x) => x.categoryId === c.id).length })).sort((a, c) => a.sortOrder - c.sortOrder);
      },
    },
  };

  return repo;
};
