/**
 * Mock repository — a complete offline implementation of the OneQ contract with seeded Doha data.
 * Demo accounts and the OTP live in ./seed/users.ts (DEMO) and README.md.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import type {
  ActivityLog,
  AdminStats,
  AppNotification,
  Booking,
  BookingStatus,
  Category,
  Company,
  CompanyFilter,
  CompanyPerformance,
  CompanyStats,
  CreateBookingResult,
  Gift,
  Lang,
  LocalizedText,
  LoyaltyAccount,
  LoyaltyTier,
  Offer,
  PointsTransaction,
  Product,
  SearchResults,
  SendGiftResult,
  Service,
  SessionInfo,
  Staff,
  Subscription,
  TimeSlot,
  TrendPoint,
  Unsubscribe,
  UserProfile,
} from '@/domain/types';
import type { OneQRepository } from '../repository';
import { id as makeId, bookingCode, giftCode, subscriptionCode, hashString } from '@/lib/ids';
import { buildWhatsAppUrl, normalizeQatarPhone, samePhone } from '@/lib/phone';
import { fuzzyScoreMany, normalizeText, slugify } from '@/lib/text';
import { haversineKm } from '@/lib/geo';
import { addDays, buildSlots, isOpenNow, nowIso, todayStr, weekdayOf, makeHours, DEFAULT_HOURS } from '@/lib/time';
import { tFor } from '@/i18n';
import { presentLocal } from '@/lib/notifications';
import { createInitialState, persistState, restoreState, SESSION_KEY, type MockState } from './state';
import { DEMO } from './seed/users';

const delay = (ms = 160 + Math.random() * 180) => new Promise<void>((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

type Listener<T> = (v: T) => void;
class Emitter<T> {
  private listeners = new Set<Listener<T>>();
  on(l: Listener<T>): Unsubscribe {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  emit(v: T) {
    this.listeners.forEach((l) => l(v));
  }
}

const POINTS_PER_QAR = 1;
const COMPLETION_BONUS = 20;
const POINTS_PER_10_QAR = 100;
const MIN_GIFT_POINTS = 50;

const tierFor = (lifetime: number): LoyaltyTier => (lifetime >= 4000 ? 'PLATINUM' : lifetime >= 1500 ? 'GOLD' : lifetime >= 500 ? 'SILVER' : 'BRONZE');
const nextTierAt = (tier: LoyaltyTier): number | null => (tier === 'BRONZE' ? 500 : tier === 'SILVER' ? 1500 : tier === 'GOLD' ? 4000 : null);

export const createMockRepository = (): OneQRepository => {
  let state: MockState = createInitialState();
  let lang: Lang = 'ar';
  let currentUserId: string | null = null;
  let pendingPhone: string | null = null;
  let pendingSignup: { phone: string; name: string; email?: string } | null = null;
  let pendingReset: string | null = null;
  const authEmitter = new Emitter<SessionInfo | null>();
  const bookingsEmitter = new Emitter<Booking[]>();
  const notificationsEmitter = new Emitter<AppNotification>();

  const save = () => persistState(state);
  const user = () => (currentUserId ? state.users.find((u) => u.id === currentUserId) ?? null : null);
  const requireUser = (): UserProfile => {
    const u = user();
    if (!u) throw new Error('UNAUTHENTICATED');
    return u;
  };
  const sessionOf = (u: UserProfile): SessionInfo => ({
    userId: u.id,
    role: u.role,
    name: u.name,
    phone: u.phone,
    email: u.email,
    companyId: u.companyId ?? null,
    groups: [u.role === 'admin' ? 'ADMINS' : u.role === 'company' ? 'COMPANIES' : 'CUSTOMERS'],
  });
  const companyOfUser = (): Company => {
    const u = requireUser();
    const c = state.companies.find((x) => x.id === u.companyId || x.ownerUserId === u.id);
    if (!c) throw new Error('NO_COMPANY');
    return c;
  };
  const companyById = (id: string) => state.companies.find((c) => c.id === id) ?? null;
  const loyaltyOf = (userId: string): LoyaltyAccount => {
    if (!state.loyalty[userId]) state.loyalty[userId] = { customerId: userId, points: 0, lifetimePoints: 0, tier: 'BRONZE', nextTierAt: 500, updatedAt: nowIso() };
    return state.loyalty[userId];
  };
  const addPoints = (userId: string, delta: number, type: PointsTransaction['type'], note: LocalizedText, refId?: string) => {
    const acc = loyaltyOf(userId);
    acc.points = Math.max(0, acc.points + delta);
    if (delta > 0 && type !== 'GIFT_RECEIVED') acc.lifetimePoints += delta;
    acc.tier = tierFor(acc.lifetimePoints);
    acc.nextTierAt = nextTierAt(acc.tier);
    acc.updatedAt = nowIso();
    state.points.unshift({ id: makeId('pt'), customerId: userId, delta, type, refId: refId ?? null, note, createdAt: nowIso() });
  };
  const pushNotification = (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & Partial<Pick<AppNotification, 'read' | 'createdAt'>>) => {
    const full: AppNotification = { id: makeId('nt'), read: false, createdAt: nowIso(), imageUrl: null, route: null, data: null, ...n };
    state.notifications.unshift(full);
    const me = user();
    const forMe = me && (full.audience === 'USER' ? full.userId === me.id : full.audience === 'CUSTOMERS' ? me.role === 'customer' : full.audience === 'ADMINS' ? me.role === 'admin' : full.audience === 'COMPANY' ? full.userId === me.companyId : false);
    if (forMe) {
      notificationsEmitter.emit(full);
      void presentLocal({ title: full.title[lang] || full.title.ar, body: full.body[lang] || full.body.ar, data: full.route ? { route: full.route } : undefined });
    }
    return full;
  };
  const logActivity = (action: ActivityLog['action'], company: Company | null, summary: LocalizedText) => {
    const u = user();
    state.activity.unshift({ id: makeId('act'), actorId: u?.id ?? 'system', actorName: u?.name ?? 'OneQ', companyId: company?.id ?? null, companyName: company?.name ?? null, action, summary, createdAt: nowIso() });
  };
  const recomputeCompany = (companyId: string) => {
    const c = companyById(companyId);
    if (!c) return;
    const services = state.services.filter((s) => s.companyId === companyId && s.isActive);
    const products = state.products.filter((p) => p.companyId === companyId && p.isActive);
    const prices = [...services.map((s) => s.offerPrice ?? s.price), ...products.map((p) => p.offerPrice ?? p.price)];
    c.priceFrom = prices.length ? Math.min(...prices) : null;
    c.staffCount = state.staff.filter((s) => s.companyId === companyId && s.isActive).length;
    c.hasStaff = c.staffCount > 0;
    const hasOffer = services.some((s) => s.isOffer) || products.some((p) => p.isOffer);
    c.tags = hasOffer ? Array.from(new Set([...c.tags, 'specialOffer' as const])) : c.tags.filter((t) => t !== 'specialOffer');
    c.completion = { location: Boolean(c.location && c.area), hours: Boolean(c.openingHours), catalog: services.length + products.length > 0, media: Boolean(c.logoUrl || c.coverUrl || c.galleryUrls.length) };
    c.updatedAt = nowIso();
  };
  const recomputeRatings = (companyId: string, staffId?: string | null) => {
    const c = companyById(companyId);
    if (c) {
      const rs = state.reviews.filter((r) => r.companyId === companyId);
      c.ratingCount = rs.length;
      c.ratingAvg = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0;
    }
    if (staffId) {
      const st = state.staff.find((s) => s.id === staffId);
      if (st) {
        const rs = state.reviews.filter((r) => r.staffId === staffId);
        st.ratingCount = rs.length;
        st.ratingAvg = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0;
      }
    }
  };
  const emitMyBookings = () => {
    const u = user();
    if (u && u.role === 'customer') bookingsEmitter.emit(clone(state.bookings.filter((b) => b.customerId === u.id).sort(byDateDesc)));
  };
  const byDateDesc = (a: Booking, b: Booking) => (b.date + b.time).localeCompare(a.date + a.time);
  const byCreatedDesc = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

  const offersFromState = (): Offer[] => {
    const now = nowIso();
    const out: Offer[] = [];
    state.services.forEach((s) => {
      if (!s.isOffer || !s.isActive || typeof s.offerPrice !== 'number' || (s.offerEndsAt && s.offerEndsAt < now)) return;
      const c = companyById(s.companyId);
      if (!c || !c.isActive) return;
      out.push({ id: `off_${s.id}`, companyId: c.id, companyName: c.name, companyLogoUrl: c.logoUrl, targetType: 'service', targetId: s.id, title: s.name, imageUrl: s.offerImageUrl ?? s.imageUrl ?? c.coverUrl, oldPrice: s.price, newPrice: s.offerPrice, endsAt: s.offerEndsAt ?? null, createdAt: s.updatedAt });
    });
    state.products.forEach((p) => {
      if (!p.isOffer || !p.isActive || typeof p.offerPrice !== 'number' || (p.offerEndsAt && p.offerEndsAt < now)) return;
      const c = companyById(p.companyId);
      if (!c || !c.isActive) return;
      out.push({ id: `off_${p.id}`, companyId: c.id, companyName: c.name, companyLogoUrl: c.logoUrl, targetType: 'product', targetId: p.id, title: p.name, imageUrl: p.imageUrls[0] ?? c.coverUrl, oldPrice: p.price, newPrice: p.offerPrice, endsAt: p.offerEndsAt ?? null, createdAt: p.updatedAt });
    });
    return out.sort(byCreatedDesc);
  };

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
      out = out.map((c) => ({ ...c, distanceKm: Math.round(haversineKm(filter.near as { lat: number; lng: number }, c.location) * 10) / 10 }));
      if (filter.radiusKm) out = out.filter((c) => (c.distanceKm ?? 0) <= (filter.radiusKm as number));
    }
    switch (filter?.sort) {
      case 'nearest':
        out.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
        break;
      case 'topRated':
        out.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
        break;
      case 'cheapest':
        out.sort((a, b) => (a.priceFrom ?? 1e9) - (b.priceFrom ?? 1e9));
        break;
      case 'hasOffer':
        out = out.filter((c) => c.tags.includes('specialOffer')).concat(out.filter((c) => !c.tags.includes('specialOffer')));
        break;
      case 'mostBooked':
        out.sort((a, b) => b.bookingCount - a.bookingCount);
        break;
      case 'featured':
        out.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.ratingAvg - a.ratingAvg);
        break;
      default:
        out.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.bookingCount - a.bookingCount);
    }
    if (filter?.limit) out = out.slice(0, filter.limit);
    return clone(out);
  };

  const monthLabels = (count: number): string[] => Array.from({ length: count }).map((_, i) => dayjs().subtract(count - 1 - i, 'month').format('MMM'));
  const monthSeries = (bookings: Booking[], count: number, pick: (b: Booking) => number): TrendPoint[] => {
    const labels = monthLabels(count);
    return labels.map((label, i) => {
      const m = dayjs().subtract(count - 1 - i, 'month');
      const inMonth = bookings.filter((b) => dayjs(b.date).isSame(m, 'month') && b.status !== 'CANCELLED');
      const synthetic = inMonth.length ? 0 : Math.round(3000 + ((hashString(label + i) % 120) / 120) * 9000);
      return { label, value: inMonth.length ? inMonth.reduce((s, b) => s + pick(b), 0) : synthetic };
    });
  };

  const repo: OneQRepository = {
    mode: 'mock',

    async init(l) {
      lang = l;
      const restored = await restoreState();
      if (restored) state = restored;
      try {
        const sessionRaw = await AsyncStorage.getItem(SESSION_KEY);
        if (sessionRaw) {
          const { userId } = JSON.parse(sessionRaw) as { userId: string };
          if (state.users.some((u) => u.id === userId)) currentUserId = userId;
        }
      } catch {
        currentUserId = null;
      }
      // expire subscriptions on boot
      const today = todayStr();
      state.subscriptions.forEach((s) => {
        if (s.status === 'ACTIVE' && s.endDate < today) s.status = 'EXPIRED';
      });
    },

    auth: {
      async getSession() {
        const u = user();
        return u ? sessionOf(u) : null;
      },
      async signInWithPhone(phoneInput) {
        await delay();
        const phone = normalizeQatarPhone(phoneInput);
        if (!phone) throw new Error('INVALID_PHONE');
        const existing = state.users.find((u) => samePhone(u.phone, phone));
        pendingPhone = phone;
        pendingSignup = null;
        if (!existing) return { step: 'SIGN_UP', phone };
        return { step: 'OTP', destination: phone };
      },
      async signUpWithPhone({ phone: phoneInput, name, email }) {
        await delay();
        const phone = normalizeQatarPhone(phoneInput);
        if (!phone) throw new Error('INVALID_PHONE');
        if (!name.trim()) throw new Error('NAME_REQUIRED');
        pendingPhone = phone;
        pendingSignup = { phone, name: name.trim(), email };
        return { step: 'OTP', destination: phone };
      },
      async confirmOtp(code) {
        await delay();
        if (!pendingPhone) throw new Error('NO_PENDING_AUTH');
        if (code !== DEMO.otp) throw new Error('INVALID_CODE');
        let u = state.users.find((x) => samePhone(x.phone, pendingPhone));
        if (!u) {
          const signup = pendingSignup ?? { phone: pendingPhone, name: 'عميل OneQ' };
          u = { id: makeId('u'), role: 'customer', name: signup.name, phone: signup.phone, email: signup.email ?? null, avatarUrl: null, language: lang, favorites: [], addresses: [], companyId: null, createdAt: nowIso() };
          state.users.push(u);
          addPoints(u.id, 50, 'WELCOME', { ar: 'مكافأة الترحيب', en: 'Welcome bonus' });
          // deliver pending WhatsApp gifts addressed to this phone
          state.gifts.filter((g) => samePhone(g.recipientPhone, u?.phone) && !g.recipientId).forEach((g) => {
            g.recipientId = u?.id ?? null;
            g.recipientName = u?.name ?? null;
            if (g.status === 'WHATSAPP_SENT' || g.status === 'PENDING') g.status = 'DELIVERED';
          });
        }
        currentUserId = u.id;
        pendingPhone = null;
        pendingSignup = null;
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.id }));
        save();
        const session = sessionOf(u);
        authEmitter.emit(session);
        return { step: 'DONE', session };
      },
      async resendOtp() {
        await delay(300);
      },
      async signInWithEmail(email, password) {
        await delay();
        const u = state.users.find((x) => x.email && x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u || password !== DEMO.password) throw new Error('INVALID_CREDENTIALS');
        currentUserId = u.id;
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.id }));
        const session = sessionOf(u);
        authEmitter.emit(session);
        return { step: 'DONE', session };
      },
      async completeNewPassword() {
        // demo accounts never hold a temporary password
        throw new Error('UNSUPPORTED_STEP_NEW_PASSWORD');
      },
      async signUpWithEmail({ email, password, name, phone: phoneInput }) {
        await delay();
        const phone = normalizeQatarPhone(phoneInput);
        if (!phone) throw new Error('INVALID_PHONE');
        if (password.length < 8) throw new Error('WEAK_PASSWORD');
        if (state.users.some((x) => x.email?.toLowerCase() === email.toLowerCase())) throw new Error('EMAIL_EXISTS');
        pendingPhone = phone;
        pendingSignup = { phone, name, email };
        return { step: 'OTP', destination: phone };
      },
      async requestPasswordReset(email) {
        await delay();
        const u = state.users.find((x) => x.email?.toLowerCase() === email.trim().toLowerCase());
        if (!u) throw new Error('USER_NOT_FOUND');
        pendingReset = u.id;
        return { step: 'RESET_CODE', destination: email };
      },
      async confirmPasswordReset({ code }) {
        await delay();
        if (!pendingReset || code !== DEMO.otp) throw new Error('INVALID_CODE');
        pendingReset = null;
      },
      async signOut() {
        currentUserId = null;
        await AsyncStorage.removeItem(SESSION_KEY);
        authEmitter.emit(null);
      },
      onAuthChange: (cb) => authEmitter.on(cb),
    },

    catalog: {
      async listCategories() {
        await delay(80);
        return clone(state.categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ ...c, companyCount: state.companies.filter((co) => co.categoryId === c.id && co.isActive).length })));
      },
      async getCategory(id) {
        await delay(60);
        const c = state.categories.find((x) => x.id === id);
        return c ? clone({ ...c, companyCount: state.companies.filter((co) => co.categoryId === c.id && co.isActive).length }) : null;
      },
      async listCompanies(filter) {
        await delay();
        return applyFilter(state.companies, filter);
      },
      async getCompany(id) {
        await delay(90);
        const c = companyById(id);
        return c ? clone(c) : null;
      },
      async listServices(companyId) {
        await delay(80);
        return clone(state.services.filter((s) => s.companyId === companyId && s.isActive).sort((a, b) => a.sortOrder - b.sortOrder));
      },
      async getService(id) {
        const s = state.services.find((x) => x.id === id);
        return s ? clone(s) : null;
      },
      async listProducts(companyId) {
        await delay(80);
        return clone(state.products.filter((p) => p.companyId === companyId && p.isActive));
      },
      async getProduct(id) {
        const p = state.products.find((x) => x.id === id);
        return p ? clone(p) : null;
      },
      async listStaff(companyId) {
        await delay(80);
        return clone(state.staff.filter((s) => s.companyId === companyId && s.isActive).sort((a, b) => b.ratingAvg - a.ratingAvg));
      },
      async getStaff(id) {
        const s = state.staff.find((x) => x.id === id);
        return s ? clone(s) : null;
      },
      async listOffers(limit) {
        await delay(100);
        const offers = offersFromState();
        return limit ? offers.slice(0, limit) : offers;
      },
      async listFeatured(limit = 8) {
        await delay(100);
        return applyFilter(state.companies.filter((c) => c.isFeatured), { sort: 'featured', limit });
      },
      async listTopRated(limit = 8) {
        await delay(100);
        return applyFilter(state.companies.filter((c) => c.ratingCount > 0), { sort: 'topRated', limit });
      },
      async listPopular(limit = 8) {
        await delay(100);
        return applyFilter(state.companies, { sort: 'mostBooked', limit });
      },
      async search(query, limit = 8) {
        await delay(120);
        const q = normalizeText(query);
        if (q.length < 2) return { companies: [], services: [], staff: [], subcategories: [] };
        const score = <T,>(items: T[], fields: (i: T) => (string | null | undefined)[]) =>
          items
            .map((i) => ({ i, s: fuzzyScoreMany(fields(i), q) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, limit)
            .map((x) => x.i);
        const companies = score(state.companies.filter((c) => c.isActive), (c) => [c.name.ar, c.name.en, c.tagline?.ar, c.tagline?.en, c.description.ar]);
        const pick = (c: Company) => ({ id: c.id, name: c.name, logoUrl: c.logoUrl });
        const services = score(state.services.filter((s) => s.isActive && companyById(s.companyId)?.isActive), (s) => [s.name.ar, s.name.en, s.description.ar]).map((s) => ({ ...s, company: pick(companyById(s.companyId) as Company) }));
        const staff = score(state.staff.filter((s) => s.isActive && companyById(s.companyId)?.isActive), (s) => [s.name.ar, s.name.en, ...s.specialties.map((x) => x.ar)]).map((s) => ({ ...s, company: pick(companyById(s.companyId) as Company) }));
        const subs = state.categories.flatMap((c) => c.subcategories.map((sub) => ({ ...sub, category: { id: c.id, name: c.name } })));
        const subcategories = score(subs, (s) => [s.name.ar, s.name.en]);
        return clone({ companies, services, staff, subcategories } as SearchResults);
      },
      async listCompanyReviews(companyId) {
        await delay(80);
        return clone(state.reviews.filter((r) => r.companyId === companyId).sort(byCreatedDesc));
      },
      async listStaffReviews(staffId) {
        await delay(80);
        return clone(state.reviews.filter((r) => r.staffId === staffId).sort(byCreatedDesc));
      },
      async listTimeSlots({ companyId, date, staffId, durationMin }) {
        await delay(90);
        const c = companyById(companyId);
        if (!c) return [];
        const wd = weekdayOf(date);
        const day = c.openingHours[wd];
        if (!day?.open) return [];
        const member = staffId ? state.staff.find((s) => s.id === staffId) : null;
        const window = member ? (member.availability[wd]?.available ? member.availability[wd] : null) : undefined;
        if (member && !window) return [];
        const step = durationMin && durationMin >= 60 ? 60 : 30;
        const slots = buildSlots(day.from, day.to, step, window ? { from: window.from, to: window.to } : null);
        const booked = new Set(state.bookings.filter((b) => b.companyId === companyId && b.date === date && b.status !== 'CANCELLED' && (!staffId || b.staffId === staffId)).map((b) => b.time));
        const isToday = date === todayStr();
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        return slots.map<TimeSlot>((time) => {
          const [h, m] = time.split(':').map(Number);
          const past = isToday && h * 60 + m <= nowMin + 30;
          return { time, available: !booked.has(time) && !past };
        });
      },
    },

    bookings: {
      async createBooking(input) {
        await delay(400);
        const u = requireUser();
        const c = companyById(input.companyId);
        if (!c) throw new Error('COMPANY_NOT_FOUND');
        const service = input.serviceId ? state.services.find((s) => s.id === input.serviceId) : null;
        const product = input.productId ? state.products.find((p) => p.id === input.productId) : null;
        if (!service && !product) throw new Error('ITEM_REQUIRED');
        const member = input.staffId ? state.staff.find((s) => s.id === input.staffId) : null;
        const plan = input.kind === 'SUBSCRIPTION' && service ? service.subscriptionPlans.find((p) => p.id === input.planId) : null;
        if (input.kind === 'SUBSCRIPTION' && !plan) throw new Error('PLAN_REQUIRED');
        if (input.mode === 'HOME' && !input.address) throw new Error('ADDRESS_REQUIRED');
        const base = plan ? plan.offerPrice ?? plan.price : service ? service.offerPrice ?? service.price : (product?.offerPrice ?? product?.price ?? 0);
        let pointsUsed = 0;
        let discount = 0;
        const acc = loyaltyOf(u.id);
        if (input.paymentMethod === 'POINTS') {
          const needed = Math.ceil(base / 10) * POINTS_PER_10_QAR;
          if (acc.points < needed) throw new Error('INSUFFICIENT_POINTS');
          pointsUsed = needed;
          discount = base;
        } else if (input.usePoints && input.usePoints > 0) {
          pointsUsed = Math.min(acc.points, Math.floor(input.usePoints / 100) * 100, Math.floor(base / 10) * 100);
          discount = (pointsUsed / POINTS_PER_10_QAR) * 10;
        }
        const total = Math.max(0, base - discount);
        const isGift = Boolean(input.gift?.recipientPhone);
        let gift: Gift | null = null;
        let whatsappUrl: string | null = null;
        const bookingId = makeId('bk');
        if (isGift && input.gift) {
          const recipientPhone = normalizeQatarPhone(input.gift.recipientPhone);
          if (!recipientPhone) throw new Error('INVALID_RECIPIENT');
          const recipient = state.users.find((x) => samePhone(x.phone, recipientPhone)) ?? null;
          gift = {
            id: makeId('gift'),
            code: giftCode(),
            senderId: u.id,
            senderName: u.name,
            senderPhone: u.phone ?? '',
            recipientPhone,
            recipientId: recipient?.id ?? null,
            recipientName: recipient?.name ?? input.gift.recipientName,
            kind: product ? 'PRODUCT' : 'SERVICE',
            companyId: c.id,
            companyName: c.name,
            serviceId: service?.id ?? null,
            productId: product?.id ?? null,
            itemName: service?.name ?? product?.name ?? null,
            itemImageUrl: service?.imageUrl ?? product?.imageUrls[0] ?? null,
            amount: total,
            message: input.gift.message ?? null,
            status: recipient ? 'DELIVERED' : 'WHATSAPP_SENT',
            channel: recipient ? 'APP' : 'WHATSAPP',
            bookingId,
            createdAt: nowIso(),
          };
          state.gifts.unshift(gift);
          if (recipient) {
            pushNotification({ userId: recipient.id, audience: 'USER', type: 'GIFT', title: { ar: `وصلتك هدية من ${u.name} 🎁`, en: `You received a gift from ${u.name} 🎁` }, body: { ar: `${service?.name.ar ?? product?.name.ar} في ${c.name.ar}. استلمها من صفحة الهدايا.`, en: `${service?.name.en ?? product?.name.en} at ${c.name.en}. Claim it from your gifts page.` }, route: `/gift/${gift.id}` });
          } else {
            const text = tFor(lang, 'gift.whatsapp.message', { sender: u.name, item: `${service?.name.ar ?? product?.name.ar ?? ''} (${c.name.ar})`, message: input.gift.message ?? '', link: 'https://oneq.qa/app' });
            whatsappUrl = buildWhatsAppUrl(recipientPhone, text);
          }
        }
        let subscription: Subscription | null = null;
        if (plan && service) {
          const start = input.date || todayStr();
          subscription = {
            id: makeId('sub'),
            code: subscriptionCode(),
            customerId: u.id,
            customerName: u.name,
            companyId: c.id,
            companyName: c.name,
            companyLogoUrl: c.logoUrl,
            serviceId: service.id,
            serviceName: service.name,
            planId: plan.id,
            planName: plan.name,
            sessionsPerWeek: plan.sessionsPerWeek,
            startDate: start,
            endDate: addDays(start, plan.durationWeeks * 7),
            totalSessions: plan.durationWeeks * plan.sessionsPerWeek,
            usedSessions: 0,
            price: total,
            status: 'ACTIVE',
            staffId: member?.id ?? null,
            mode: input.mode,
            createdAt: nowIso(),
          };
          state.subscriptions.unshift(subscription);
        }
        const booking: Booking = {
          id: bookingId,
          code: bookingCode(),
          customerId: u.id,
          customerName: u.name,
          customerPhone: u.phone ?? '',
          companyId: c.id,
          companyName: c.name,
          companyLogoUrl: c.logoUrl,
          kind: plan ? 'SUBSCRIPTION' : product ? 'PRODUCT' : 'SERVICE',
          serviceId: service?.id ?? null,
          serviceName: service?.name ?? null,
          productId: product?.id ?? null,
          productName: product?.name ?? null,
          staffId: member?.id ?? null,
          staffName: member?.name ?? null,
          mode: input.mode,
          date: input.date,
          time: input.time,
          durationMin: service?.durationMin ?? null,
          address: input.address ?? null,
          status: 'PENDING',
          price: base,
          discount,
          pointsUsed,
          pointsEarned: Math.round(total * POINTS_PER_QAR) + COMPLETION_BONUS,
          total,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentMethod === 'CASH' ? 'ON_ARRIVAL' : 'PAID',
          isGift,
          giftId: gift?.id ?? null,
          subscriptionId: subscription?.id ?? null,
          notes: input.notes ?? null,
          companyRated: false,
          staffRated: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        state.bookings.unshift(booking);
        if (pointsUsed > 0) addPoints(u.id, -pointsUsed, 'REDEEM', { ar: `خصم على ${service?.name.ar ?? product?.name.ar ?? 'الحجز'}`, en: `Discount on ${service?.name.en ?? product?.name.en ?? 'booking'}` }, booking.id);
        c.bookingCount += 1;
        if (service) service.bookingCount += 1;
        if (product) product.salesCount += 1;
        if (member) member.bookingCount += 1;
        pushNotification({ userId: c.id, audience: 'COMPANY', type: 'BOOKING', title: { ar: `حجز جديد من ${u.name}`, en: `New booking from ${u.name}` }, body: { ar: `${service?.name.ar ?? product?.name.ar} — ${input.date} ${input.time}`, en: `${service?.name.en ?? product?.name.en} — ${input.date} ${input.time}` }, route: `/(company)/booking/${booking.id}` });
        save();
        emitMyBookings();
        return clone({ booking, subscription, gift, whatsappUrl } satisfies CreateBookingResult);
      },
      async listMyBookings() {
        await delay(120);
        const u = requireUser();
        return clone(state.bookings.filter((b) => b.customerId === u.id).sort(byDateDesc));
      },
      async getBooking(id) {
        await delay(60);
        const b = state.bookings.find((x) => x.id === id);
        return b ? clone(b) : null;
      },
      async cancelBooking(id) {
        await delay();
        const b = state.bookings.find((x) => x.id === id);
        if (!b) throw new Error('NOT_FOUND');
        b.status = 'CANCELLED';
        b.updatedAt = nowIso();
        if (b.pointsUsed > 0) addPoints(b.customerId, b.pointsUsed, 'ADJUST', { ar: 'استرجاع نقاط حجز ملغي', en: 'Points refund for cancelled booking' }, b.id);
        pushNotification({ userId: b.companyId, audience: 'COMPANY', type: 'BOOKING', title: { ar: 'تم إلغاء حجز', en: 'Booking cancelled' }, body: { ar: `${b.customerName} ألغى الحجز ${b.code}`, en: `${b.customerName} cancelled booking ${b.code}` }, route: `/(company)/booking/${b.id}` });
        save();
        emitMyBookings();
        return clone(b);
      },
      async rateBooking(input) {
        await delay();
        const u = requireUser();
        const b = state.bookings.find((x) => x.id === input.bookingId);
        if (!b) throw new Error('NOT_FOUND');
        if (b.status !== 'COMPLETED') throw new Error('NOT_COMPLETED');
        state.reviews.unshift({ id: makeId('rv'), customerId: u.id, customerName: u.name, companyId: b.companyId, staffId: null, bookingId: b.id, rating: input.companyRating, comment: input.companyComment ?? null, reply: null, createdAt: nowIso() });
        b.companyRated = true;
        if (b.staffId && input.staffRating) {
          state.reviews.unshift({ id: makeId('rv'), customerId: u.id, customerName: u.name, companyId: b.companyId, staffId: b.staffId, bookingId: b.id, rating: input.staffRating, comment: input.staffComment ?? null, reply: null, createdAt: nowIso() });
          b.staffRated = true;
        }
        recomputeRatings(b.companyId, b.staffId);
        addPoints(u.id, 30, 'BONUS', { ar: 'مكافأة تقييم الخدمة', en: 'Review bonus' }, b.id);
        pushNotification({ userId: b.companyId, audience: 'COMPANY', type: 'REVIEW', title: { ar: `تقييم جديد ⭐ ${input.companyRating}`, en: `New ${input.companyRating}-star review` }, body: { ar: input.companyComment ?? '', en: input.companyComment ?? '' }, route: '/(company)/reviews' });
        b.updatedAt = nowIso();
        save();
        emitMyBookings();
        return clone(b);
      },
      async listMySubscriptions() {
        await delay(100);
        const u = requireUser();
        return clone(state.subscriptions.filter((s) => s.customerId === u.id).sort(byCreatedDesc));
      },
      async getSubscription(id) {
        const s = state.subscriptions.find((x) => x.id === id);
        return s ? clone(s) : null;
      },
      async cancelSubscription(id) {
        await delay();
        const s = state.subscriptions.find((x) => x.id === id);
        if (!s) throw new Error('NOT_FOUND');
        s.status = 'CANCELLED';
        save();
        return clone(s);
      },
      subscribeMine: (cb) => bookingsEmitter.on(cb),
    },

    gifts: {
      async lookupRecipient(phoneInput) {
        await delay(250);
        const phone = normalizeQatarPhone(phoneInput);
        if (!phone) throw new Error('INVALID_PHONE');
        const u = state.users.find((x) => samePhone(x.phone, phone));
        return { phone, registered: Boolean(u), name: u?.name ?? null };
      },
      async sendGift(input) {
        await delay(350);
        const u = requireUser();
        const recipientPhone = normalizeQatarPhone(input.recipientPhone);
        if (!recipientPhone) throw new Error('INVALID_RECIPIENT');
        if (samePhone(recipientPhone, u.phone)) throw new Error('SELF_GIFT');
        const recipient = state.users.find((x) => samePhone(x.phone, recipientPhone)) ?? null;
        const c = input.companyId ? companyById(input.companyId) : null;
        const service = input.serviceId ? state.services.find((s) => s.id === input.serviceId) : null;
        const product = input.productId ? state.products.find((p) => p.id === input.productId) : null;
        if (input.kind === 'POINTS') {
          const pts = input.points ?? 0;
          if (pts < MIN_GIFT_POINTS) throw new Error('MIN_POINTS');
          if (loyaltyOf(u.id).points < pts) throw new Error('INSUFFICIENT_POINTS');
          addPoints(u.id, -pts, 'GIFT_SENT', { ar: `هدية نقاط إلى ${recipient?.name ?? recipientPhone}`, en: `Points gift to ${recipient?.name ?? recipientPhone}` });
        } else if (!c || (!service && !product)) {
          throw new Error('ITEM_REQUIRED');
        }
        const gift: Gift = {
          id: makeId('gift'),
          code: giftCode(),
          senderId: u.id,
          senderName: u.name,
          senderPhone: u.phone ?? '',
          recipientPhone,
          recipientId: recipient?.id ?? null,
          recipientName: recipient?.name ?? input.recipientName ?? null,
          kind: input.kind,
          points: input.kind === 'POINTS' ? input.points ?? 0 : null,
          companyId: c?.id ?? null,
          companyName: c?.name ?? null,
          serviceId: service?.id ?? null,
          productId: product?.id ?? null,
          itemName: service?.name ?? product?.name ?? null,
          itemImageUrl: service?.imageUrl ?? product?.imageUrls[0] ?? null,
          amount: input.kind === 'POINTS' ? null : (service?.offerPrice ?? service?.price ?? product?.offerPrice ?? product?.price ?? 0),
          message: input.message ?? null,
          status: recipient ? (input.kind === 'POINTS' ? 'DELIVERED' : 'PENDING') : 'WHATSAPP_SENT',
          channel: recipient ? 'APP' : 'WHATSAPP',
          bookingId: null,
          createdAt: nowIso(),
        };
        state.gifts.unshift(gift);
        let whatsappUrl: string | null = null;
        if (recipient) {
          if (input.kind === 'POINTS') addPoints(recipient.id, gift.points ?? 0, 'GIFT_RECEIVED', { ar: `هدية من ${u.name}`, en: `Gift from ${u.name}` }, gift.id);
          pushNotification({ userId: recipient.id, audience: 'USER', type: 'GIFT', title: { ar: `وصلتك هدية من ${u.name} 🎁`, en: `You received a gift from ${u.name} 🎁` }, body: { ar: input.kind === 'POINTS' ? `${gift.points} نقطة ولاء أضيفت إلى رصيدك.` : `${gift.itemName?.ar ?? ''} في ${c?.name.ar ?? ''}. استلمها من صفحة الهدايا.`, en: input.kind === 'POINTS' ? `${gift.points} loyalty points were added to your balance.` : `${gift.itemName?.en ?? ''} at ${c?.name.en ?? ''}. Claim it from your gifts page.` }, route: `/gift/${gift.id}` });
        } else {
          const item = input.kind === 'POINTS' ? tFor(lang, 'gift.whatsapp.pointsItem', { points: gift.points ?? 0 }) : `${gift.itemName?.ar ?? ''} (${c?.name.ar ?? ''})`;
          whatsappUrl = buildWhatsAppUrl(recipientPhone, tFor(lang, 'gift.whatsapp.message', { sender: u.name, item, message: input.message ?? '', link: 'https://oneq.qa/app' }));
        }
        save();
        return clone({ gift, channel: gift.channel, whatsappUrl } satisfies SendGiftResult);
      },
      async listReceived() {
        await delay(100);
        const u = requireUser();
        return clone(state.gifts.filter((g) => g.recipientId === u.id || samePhone(g.recipientPhone, u.phone)).sort(byCreatedDesc));
      },
      async listSent() {
        await delay(100);
        const u = requireUser();
        return clone(state.gifts.filter((g) => g.senderId === u.id).sort(byCreatedDesc));
      },
      async getGift(id) {
        const g = state.gifts.find((x) => x.id === id);
        return g ? clone(g) : null;
      },
      async claimGift(id) {
        await delay();
        const u = requireUser();
        const g = state.gifts.find((x) => x.id === id);
        if (!g) throw new Error('NOT_FOUND');
        if (g.status === 'CLAIMED') return clone(g);
        if (g.kind === 'POINTS' && g.status !== 'DELIVERED') addPoints(u.id, g.points ?? 0, 'GIFT_RECEIVED', { ar: `هدية من ${g.senderName}`, en: `Gift from ${g.senderName}` }, g.id);
        g.status = 'CLAIMED';
        g.claimedAt = nowIso();
        g.recipientId = u.id;
        save();
        return clone(g);
      },
    },

    loyalty: {
      async getAccount() {
        await delay(60);
        return clone(loyaltyOf(requireUser().id));
      },
      async listHistory() {
        await delay(80);
        const u = requireUser();
        return clone(state.points.filter((p) => p.customerId === u.id).sort(byCreatedDesc));
      },
      async transferPoints({ recipientPhone, points, message }) {
        return repo.gifts.sendGift({ kind: 'POINTS', recipientPhone, points, message });
      },
    },

    notifications: {
      async list() {
        await delay(80);
        const u = user();
        if (!u) return [];
        return clone(
          state.notifications
            .filter((n) => (n.audience === 'USER' && n.userId === u.id) || (n.audience === 'CUSTOMERS' && u.role === 'customer') || (n.audience === 'ADMINS' && u.role === 'admin') || (n.audience === 'COMPANY' && n.userId === u.companyId))
            .sort(byCreatedDesc),
        );
      },
      async unreadCount() {
        const list = await repo.notifications.list();
        return list.filter((n) => !n.read).length;
      },
      async markRead(id) {
        const n = state.notifications.find((x) => x.id === id);
        if (n) n.read = true;
        save();
      },
      async markAllRead() {
        const list = await repo.notifications.list();
        const ids = new Set(list.map((n) => n.id));
        state.notifications.forEach((n) => {
          if (ids.has(n.id)) n.read = true;
        });
        save();
      },
      async registerPushToken(token, platform) {
        const u = user();
        if (!u) return;
        state.pushTokens = state.pushTokens.filter((t) => t.token !== token);
        state.pushTokens.push({ id: makeId('push'), userId: u.id, token, platform, updatedAt: nowIso() });
        save();
      },
      subscribe: (cb) => notificationsEmitter.on(cb),
    },

    profile: {
      async getMe() {
        const u = user();
        return u ? clone(u) : null;
      },
      async updateMe(patch) {
        await delay();
        const u = requireUser();
        Object.assign(u, patch);
        save();
        return clone(u);
      },
      async listFavorites() {
        await delay(80);
        const u = requireUser();
        return clone(state.companies.filter((c) => u.favorites.includes(c.id)));
      },
      async toggleFavorite(companyId) {
        const u = requireUser();
        const has = u.favorites.includes(companyId);
        u.favorites = has ? u.favorites.filter((id) => id !== companyId) : [...u.favorites, companyId];
        save();
        return !has;
      },
      async uploadImage(localUri) {
        await delay(300);
        return localUri;
      },
    },

    company: {
      async getMyCompany() {
        await delay(80);
        const u = user();
        if (!u) return null;
        const c = state.companies.find((x) => x.id === u.companyId || x.ownerUserId === u.id);
        return c ? clone(c) : null;
      },
      async updateMyCompany(patch) {
        await delay();
        const c = companyOfUser();
        Object.assign(c, patch);
        if (patch.openingHours === undefined && !c.openingHours) c.openingHours = makeHours('09:00', '22:00');
        recomputeCompany(c.id);
        if (patch.isActive && !(c.completion.location && c.completion.hours && c.completion.catalog)) {
          c.isActive = false;
          throw new Error('PROFILE_INCOMPLETE');
        }
        logActivity('PROFILE_UPDATED', c, { ar: 'تحديث الملف التجاري', en: 'Business profile updated' });
        pushNotification({ userId: null, audience: 'ADMINS', type: 'COMPANY', title: { ar: `${c.name.ar} حدّثت ملفها التجاري`, en: `${c.name.en} updated its profile` }, body: { ar: 'راجع التغييرات في لوحة الإدارة.', en: 'Review the changes in the admin panel.' }, route: `/(admin)/company/${c.id}` });
        save();
        return clone(c);
      },
      async getStats(range) {
        await delay(140);
        const c = companyOfUser();
        const all = state.bookings.filter((b) => b.companyId === c.id);
        const valid = all.filter((b) => b.status !== 'CANCELLED');
        const today = todayStr();
        const monthStart = dayjs().startOf('month');
        const prevStart = dayjs().subtract(1, 'month').startOf('month');
        const inMonth = valid.filter((b) => dayjs(b.date).isAfter(monthStart.subtract(1, 'day')));
        const inPrev = valid.filter((b) => dayjs(b.date).isAfter(prevStart.subtract(1, 'day')) && dayjs(b.date).isBefore(monthStart));
        const revenue = inMonth.reduce((s, b) => s + b.total, 0) || 24850;
        const prevRevenue = inPrev.reduce((s, b) => s + b.total, 0) || 22100;
        const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 12);
        const newCustomers = new Set(inMonth.map((b) => b.customerId)).size;
        const prevCustomers = new Set(inPrev.map((b) => b.customerId)).size;
        const months = range === '6m' ? 6 : 12;
        const byService = new Map<string, number>();
        valid.forEach((b) => byService.set(b.serviceId ?? 'other', (byService.get(b.serviceId ?? 'other') ?? 0) + 1));
        const totalByService = Array.from(byService.values()).reduce((s, v) => s + v, 0) || 1;
        const bookingsByService = Array.from(byService.entries())
          .map(([serviceId, count]) => ({ serviceId, name: state.services.find((s) => s.id === serviceId)?.name ?? { ar: 'أخرى', en: 'Other' }, count, pct: Math.round((count / totalByService) * 100) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        const reviews = state.reviews.filter((r) => r.companyId === c.id);
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
        reviews.forEach((r) => (dist[r.rating] += 1));
        const stats: CompanyStats = {
          companyId: c.id,
          range,
          revenue,
          revenueDeltaPct: pct(revenue, prevRevenue),
          bookingsToday: valid.filter((b) => b.date === today).length,
          bookingsInRange: inMonth.length,
          bookingsDeltaPct: pct(inMonth.length, inPrev.length),
          newCustomers,
          newCustomersDeltaPct: pct(newCustomers, prevCustomers),
          activeSubscriptions: state.subscriptions.filter((s) => s.companyId === c.id && s.status === 'ACTIVE').length,
          ratingAvg: c.ratingAvg,
          ratingCount: c.ratingCount,
          revenueSeries: monthSeries(valid, months, (b) => b.total),
          bookingsByService,
          ratingDistribution: dist,
          pendingRatings: all.filter((b) => b.status === 'COMPLETED' && !b.companyRated).length,
        };
        return clone(stats);
      },
      async listBookings({ range, kind, status }) {
        await delay(120);
        const c = companyOfUser();
        const start = range === 'today' ? dayjs().startOf('day') : range === 'week' ? dayjs().startOf('week') : dayjs().startOf('month');
        const end = range === 'today' ? dayjs().endOf('day') : range === 'week' ? dayjs().endOf('week') : dayjs().endOf('month');
        return clone(
          state.bookings
            .filter((b) => b.companyId === c.id && !dayjs(b.date).isBefore(start, 'day') && !dayjs(b.date).isAfter(end, 'day') && (!kind || b.kind === kind) && (!status || b.status === status))
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
        );
      },
      async updateBookingStatus(id, status) {
        await delay();
        const b = state.bookings.find((x) => x.id === id);
        if (!b) throw new Error('NOT_FOUND');
        const prev = b.status;
        b.status = status;
        b.updatedAt = nowIso();
        if (status === 'COMPLETED' && prev !== 'COMPLETED') {
          addPoints(b.customerId, b.pointsEarned, 'EARN_BOOKING', { ar: `${b.serviceName?.ar ?? b.productName?.ar ?? 'حجز'} — ${b.companyName.ar}`, en: `${b.serviceName?.en ?? b.productName?.en ?? 'Booking'} — ${b.companyName.en}` }, b.id);
          if (b.subscriptionId) {
            const s = state.subscriptions.find((x) => x.id === b.subscriptionId);
            if (s) s.usedSessions = Math.min(s.totalSessions, s.usedSessions + 1);
          }
          pushNotification({ userId: b.customerId, audience: 'USER', type: 'BOOKING', title: { ar: `قيّم تجربتك في ${b.companyName.ar}`, en: `Rate your visit to ${b.companyName.en}` }, body: { ar: `اكتمل حجزك وأُضيفت ${b.pointsEarned} نقطة إلى رصيدك.`, en: `Your booking is complete and ${b.pointsEarned} points were added.` }, route: `/order/${b.id}` });
        } else {
          const titles: Record<BookingStatus, [string, string]> = { PENDING: ['حجزك قيد التأكيد', 'Booking pending'], CONFIRMED: ['تم تأكيد حجزك', 'Booking confirmed'], IN_PROGRESS: ['حجزك قيد التنفيذ', 'Booking in progress'], COMPLETED: ['اكتمل حجزك', 'Booking completed'], CANCELLED: ['تم إلغاء حجزك', 'Booking cancelled'] };
          pushNotification({ userId: b.customerId, audience: 'USER', type: 'BOOKING', title: { ar: titles[status][0], en: titles[status][1] }, body: { ar: `${b.serviceName?.ar ?? b.productName?.ar ?? ''} — ${b.companyName.ar}`, en: `${b.serviceName?.en ?? b.productName?.en ?? ''} — ${b.companyName.en}` }, route: `/order/${b.id}` });
        }
        save();
        emitMyBookings();
        return clone(b);
      },
      async upsertService(input) {
        await delay();
        const c = companyOfUser();
        const existing = input.id ? state.services.find((s) => s.id === input.id && s.companyId === c.id) : null;
        const isNew = !existing;
        const record: Service = existing ? { ...existing, ...input, id: existing.id, companyId: c.id, isOffer: typeof input.offerPrice === 'number' && input.offerPrice < input.price, updatedAt: nowIso() } : { ...input, id: makeId('svc'), companyId: c.id, isOffer: typeof input.offerPrice === 'number' && input.offerPrice < input.price, bookingCount: 0, createdAt: nowIso(), updatedAt: nowIso() };
        if (existing) Object.assign(existing, record);
        else state.services.push(record);
        recomputeCompany(c.id);
        logActivity(isNew ? 'SERVICE_CREATED' : 'SERVICE_UPDATED', c, record.name);
        pushNotification({ userId: null, audience: 'ADMINS', type: 'COMPANY', title: { ar: `${c.name.ar} ${isNew ? 'أضافت خدمة جديدة' : 'عدّلت خدمة'}`, en: `${c.name.en} ${isNew ? 'added a new service' : 'updated a service'}` }, body: { ar: `${record.name.ar} — ${record.price} ر.ق`, en: `${record.name.en} — QAR ${record.price}` }, route: `/(admin)/company/${c.id}` });
        if (isNew && record.isActive) pushNotification({ userId: null, audience: 'CUSTOMERS', type: 'NEW_SERVICE', title: { ar: `خدمة جديدة في ${c.name.ar}`, en: `New service at ${c.name.en}` }, body: { ar: `${record.name.ar} — ${record.price} ر.ق. احجز الآن.`, en: `${record.name.en} — QAR ${record.price}. Book now.` }, route: `/company/${c.id}` });
        save();
        return clone(record);
      },
      async deleteService(id) {
        await delay();
        const c = companyOfUser();
        state.services = state.services.filter((s) => !(s.id === id && s.companyId === c.id));
        recomputeCompany(c.id);
        save();
      },
      async setServiceOffer(id, offer) {
        await delay();
        const c = companyOfUser();
        const s = state.services.find((x) => x.id === id && x.companyId === c.id);
        if (!s) throw new Error('NOT_FOUND');
        if (offer) {
          if (offer.offerPrice >= s.price) throw new Error('OFFER_INVALID');
          s.offerPrice = offer.offerPrice;
          s.isOffer = true;
          s.offerEndsAt = offer.endsAt ?? null;
          s.offerImageUrl = offer.imageUrl ?? s.offerImageUrl ?? null;
          logActivity('OFFER_SET', c, { ar: `${s.name.ar}: ${s.price} → ${offer.offerPrice} ر.ق`, en: `${s.name.en}: ${s.price} → ${offer.offerPrice} QAR` });
          pushNotification({ userId: null, audience: 'CUSTOMERS', type: 'OFFER', title: { ar: `عرض جديد من ${c.name.ar} ✨`, en: `New offer from ${c.name.en} ✨` }, body: { ar: `${s.name.ar} بـ ${offer.offerPrice} ر.ق بدلًا من ${s.price} ر.ق.`, en: `${s.name.en} for QAR ${offer.offerPrice} instead of QAR ${s.price}.` }, route: `/company/${c.id}`, imageUrl: s.offerImageUrl ?? null });
          pushNotification({ userId: null, audience: 'ADMINS', type: 'COMPANY', title: { ar: `${c.name.ar} نشرت عرضًا جديدًا`, en: `${c.name.en} published a new offer` }, body: { ar: `${s.name.ar}: ${s.price} → ${offer.offerPrice} ر.ق`, en: `${s.name.en}: ${s.price} → ${offer.offerPrice} QAR` }, route: `/(admin)/company/${c.id}` });
        } else {
          s.offerPrice = null;
          s.isOffer = false;
          s.offerEndsAt = null;
          logActivity('OFFER_REMOVED', c, s.name);
        }
        s.updatedAt = nowIso();
        recomputeCompany(c.id);
        save();
        return clone(s);
      },
      async upsertProduct(input) {
        await delay();
        const c = companyOfUser();
        const existing = input.id ? state.products.find((p) => p.id === input.id && p.companyId === c.id) : null;
        const isNew = !existing;
        const record: Product = existing ? { ...existing, ...input, id: existing.id, companyId: c.id, isOffer: typeof input.offerPrice === 'number' && input.offerPrice < input.price, updatedAt: nowIso() } : { ...input, id: makeId('prd'), companyId: c.id, isOffer: typeof input.offerPrice === 'number' && input.offerPrice < input.price, salesCount: 0, createdAt: nowIso(), updatedAt: nowIso() };
        if (existing) Object.assign(existing, record);
        else state.products.push(record);
        recomputeCompany(c.id);
        logActivity(isNew ? 'PRODUCT_CREATED' : 'PRODUCT_UPDATED', c, record.name);
        pushNotification({ userId: null, audience: 'ADMINS', type: 'COMPANY', title: { ar: `${c.name.ar} ${isNew ? 'أضافت منتجًا جديدًا' : 'عدّلت منتجًا'}`, en: `${c.name.en} ${isNew ? 'added a new product' : 'updated a product'}` }, body: { ar: `${record.name.ar} — ${record.price} ر.ق`, en: `${record.name.en} — QAR ${record.price}` }, route: `/(admin)/company/${c.id}` });
        if (isNew && record.isActive) pushNotification({ userId: null, audience: 'CUSTOMERS', type: 'NEW_PRODUCT', title: { ar: `منتج جديد في ${c.name.ar}`, en: `New product at ${c.name.en}` }, body: { ar: `${record.name.ar} — ${record.price} ر.ق.`, en: `${record.name.en} — QAR ${record.price}.` }, route: `/company/${c.id}` });
        save();
        return clone(record);
      },
      async deleteProduct(id) {
        await delay();
        const c = companyOfUser();
        state.products = state.products.filter((p) => !(p.id === id && p.companyId === c.id));
        recomputeCompany(c.id);
        save();
      },
      async setProductOffer(id, offer) {
        await delay();
        const c = companyOfUser();
        const p = state.products.find((x) => x.id === id && x.companyId === c.id);
        if (!p) throw new Error('NOT_FOUND');
        if (offer) {
          if (offer.offerPrice >= p.price) throw new Error('OFFER_INVALID');
          p.offerPrice = offer.offerPrice;
          p.isOffer = true;
          p.offerEndsAt = offer.endsAt ?? null;
          logActivity('OFFER_SET', c, { ar: `${p.name.ar}: ${p.price} → ${offer.offerPrice} ر.ق`, en: `${p.name.en}: ${p.price} → ${offer.offerPrice} QAR` });
          pushNotification({ userId: null, audience: 'CUSTOMERS', type: 'OFFER', title: { ar: `عرض جديد من ${c.name.ar} ✨`, en: `New offer from ${c.name.en} ✨` }, body: { ar: `${p.name.ar} بـ ${offer.offerPrice} ر.ق بدلًا من ${p.price} ر.ق.`, en: `${p.name.en} for QAR ${offer.offerPrice} instead of QAR ${p.price}.` }, route: `/company/${c.id}` });
        } else {
          p.offerPrice = null;
          p.isOffer = false;
          p.offerEndsAt = null;
          logActivity('OFFER_REMOVED', c, p.name);
        }
        p.updatedAt = nowIso();
        recomputeCompany(c.id);
        save();
        return clone(p);
      },
      async upsertStaff(input) {
        await delay();
        const c = companyOfUser();
        const existing = input.id ? state.staff.find((s) => s.id === input.id && s.companyId === c.id) : null;
        const isNew = !existing;
        const record: Staff = existing ? { ...existing, ...input, id: existing.id, companyId: c.id, updatedAt: nowIso() } : { ...input, id: makeId('stf'), companyId: c.id, ratingAvg: 0, ratingCount: 0, bookingCount: 0, createdAt: nowIso(), updatedAt: nowIso() };
        if (existing) Object.assign(existing, record);
        else state.staff.push(record);
        recomputeCompany(c.id);
        logActivity(isNew ? 'STAFF_CREATED' : 'STAFF_UPDATED', c, record.name);
        save();
        return clone(record);
      },
      async deleteStaff(id) {
        await delay();
        const c = companyOfUser();
        state.staff = state.staff.filter((s) => !(s.id === id && s.companyId === c.id));
        recomputeCompany(c.id);
        save();
      },
      async listSubscriptions() {
        await delay(100);
        const c = companyOfUser();
        return clone(state.subscriptions.filter((s) => s.companyId === c.id).sort((a, b) => a.endDate.localeCompare(b.endDate)));
      },
      async listReviews() {
        await delay(100);
        const c = companyOfUser();
        return clone(state.reviews.filter((r) => r.companyId === c.id).sort(byCreatedDesc));
      },
      async replyReview(id, text) {
        await delay();
        const r = state.reviews.find((x) => x.id === id);
        if (!r) throw new Error('NOT_FOUND');
        r.reply = { text, at: nowIso() };
        save();
        return clone(r);
      },
      async listNotifications() {
        return repo.notifications.list();
      },
    },

    admin: {
      async getStats(range) {
        await delay(150);
        const today = todayStr();
        const valid = state.bookings.filter((b) => b.status !== 'CANCELLED');
        const todays = valid.filter((b) => b.date === today);
        const bookingsPerDay: TrendPoint[] = Array.from({ length: 14 }).map((_, i) => {
          const d = addDays(today, -(13 - i));
          return { label: dayjs(d).format('D/M'), value: valid.filter((b) => b.date === d).length };
        });
        const byCompany = new Map<string, { count: number; revenue: number }>();
        todays.forEach((b) => {
          const cur = byCompany.get(b.companyId) ?? { count: 0, revenue: 0 };
          byCompany.set(b.companyId, { count: cur.count + 1, revenue: cur.revenue + b.total });
        });
        const stats: AdminStats = {
          range,
          bookingsToday: todays.length,
          revenueToday: todays.reduce((s, b) => s + b.total, 0),
          activeCompanies: state.companies.filter((c) => c.isActive).length,
          pendingCompanies: state.companies.filter((c) => !c.isActive).length,
          customers: state.users.filter((u) => u.role === 'customer').length,
          activeSubscriptions: state.subscriptions.filter((s) => s.status === 'ACTIVE').length,
          bookingsPerDay,
          bookingsByCompanyToday: Array.from(byCompany.entries())
            .map(([companyId, v]) => ({ companyId, name: companyById(companyId)?.name ?? { ar: '', en: '' }, count: v.count, revenue: v.revenue }))
            .sort((a, b) => b.count - a.count),
          topCompanies: [...state.companies].filter((c) => c.isActive).sort((a, b) => b.ratingAvg - a.ratingAvg || b.bookingCount - a.bookingCount).slice(0, 5).map((c) => ({ companyId: c.id, name: c.name, ratingAvg: c.ratingAvg, bookingCount: c.bookingCount })),
          recentActivity: state.activity.slice(0, 8),
        };
        return clone(stats);
      },
      async listCompanies(filter) {
        await delay(120);
        let list = applyFilter(state.companies, { ...filter, onlyActive: false });
        if (filter?.status === 'active') list = list.filter((c) => c.isActive);
        if (filter?.status === 'inactive') list = list.filter((c) => !c.isActive && c.completion.catalog);
        if (filter?.status === 'pending') list = list.filter((c) => !c.isActive && !c.completion.catalog);
        return list;
      },
      async createCompany(input) {
        await delay(400);
        requireUser();
        const ownerPhone = normalizeQatarPhone(input.ownerPhone);
        if (!ownerPhone) throw new Error('INVALID_PHONE');
        if (state.users.some((u) => samePhone(u.phone, ownerPhone))) throw new Error('PHONE_EXISTS');
        const id = makeId('co');
        const owner: UserProfile = { id: makeId('u'), role: 'company', name: input.ownerName, phone: ownerPhone, email: input.ownerEmail ?? null, avatarUrl: null, language: 'ar', favorites: [], addresses: [], companyId: id, createdAt: nowIso() };
        state.users.push(owner);
        const company: Company = {
          id,
          slug: slugify(input.name.en || input.name.ar) || id,
          categoryId: input.categoryId,
          subcategoryIds: input.subcategoryIds,
          name: input.name,
          tagline: null,
          description: input.description,
          logoUrl: input.logoUrl ?? null,
          coverUrl: null,
          galleryUrls: [],
          area: input.area,
          address: input.address,
          location: input.location,
          phone: input.phone,
          whatsapp: input.whatsapp ?? input.phone,
          email: input.ownerEmail ?? null,
          serviceMode: input.serviceMode,
          offersSubscriptions: input.offersSubscriptions,
          hasStaff: false,
          audience: input.audience,
          openingHours: DEFAULT_HOURS,
          amenities: [],
          tags: ['new'],
          ratingAvg: 0,
          ratingCount: 0,
          bookingCount: 0,
          staffCount: 0,
          priceFrom: null,
          isActive: false,
          isVerified: false,
          isFeatured: false,
          ownerUserId: owner.id,
          ownerPhone,
          ownerEmail: input.ownerEmail ?? null,
          completion: { location: true, hours: true, catalog: false, media: Boolean(input.logoUrl) },
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        state.companies.push(company);
        logActivity('COMPANY_CREATED', company, { ar: `تم إنشاء شركة ${company.name.ar}`, en: `${company.name.en} created` });
        save();
        return clone({ company, ownerUsername: ownerPhone });
      },
      async updateCompany(id, patch) {
        await delay();
        const c = companyById(id);
        if (!c) throw new Error('NOT_FOUND');
        Object.assign(c, patch);
        recomputeCompany(c.id);
        save();
        return clone(c);
      },
      async setCompanyActive(id, isActive) {
        await delay();
        const c = companyById(id);
        if (!c) throw new Error('NOT_FOUND');
        c.isActive = isActive;
        c.updatedAt = nowIso();
        pushNotification({ userId: c.id, audience: 'COMPANY', type: 'COMPANY', title: { ar: isActive ? 'تم تفعيل شركتك' : 'تم إيقاف شركتك مؤقتًا', en: isActive ? 'Your company is now live' : 'Your company was paused' }, body: { ar: isActive ? 'شركتك ظاهرة الآن للعملاء في OneQ.' : 'تواصل مع إدارة OneQ لمزيد من التفاصيل.', en: isActive ? 'Customers can now find you on OneQ.' : 'Contact OneQ for details.' } });
        save();
        return clone(c);
      },
      async upsertCategory(input) {
        await delay();
        const existing = input.id ? state.categories.find((c) => c.id === input.id) : null;
        const id = existing?.id ?? makeId('cat');
        const subcategories = input.subcategories.map((s, i) => ({ ...s, id: s.id ?? makeId('sub'), categoryId: id, sortOrder: s.sortOrder ?? i + 1 }));
        const record: Category = { ...input, id, slug: input.slug || slugify(input.name.en || input.name.ar) || id, subcategories };
        if (existing) Object.assign(existing, record);
        else {
          state.categories.push(record);
          logActivity('CATEGORY_CREATED', null, record.name);
        }
        save();
        return clone(record);
      },
      async deleteCategory(id) {
        await delay();
        if (state.companies.some((c) => c.categoryId === id)) throw new Error('CATEGORY_HAS_COMPANIES');
        state.categories = state.categories.filter((c) => c.id !== id);
        save();
      },
      async listBookingsByDay(date) {
        await delay(120);
        return clone(state.bookings.filter((b) => b.date === date).sort((a, b) => a.time.localeCompare(b.time)));
      },
      async listPerformance(range) {
        await delay(150);
        const months = range === '6m' ? 6 : range === '12m' ? 12 : 1;
        const since = dayjs().subtract(months, 'month');
        const rows: CompanyPerformance[] = state.companies
          .filter((c) => c.isActive)
          .map((c) => {
            const bs = state.bookings.filter((b) => b.companyId === c.id && b.status !== 'CANCELLED' && dayjs(b.date).isAfter(since));
            const byService = new Map<string, number>();
            bs.forEach((b) => byService.set(b.serviceId ?? 'other', (byService.get(b.serviceId ?? 'other') ?? 0) + 1));
            return {
              companyId: c.id,
              name: c.name,
              categoryId: c.categoryId,
              bookings: bs.length,
              revenue: bs.reduce((s, b) => s + b.total, 0),
              ratingAvg: c.ratingAvg,
              ratingCount: c.ratingCount,
              activeSubscriptions: state.subscriptions.filter((s) => s.companyId === c.id && s.status === 'ACTIVE').length,
              trend: monthSeries(bs, Math.max(6, months), (b) => b.total),
              topServices: Array.from(byService.entries())
                .map(([sid, count]) => ({ name: state.services.find((s) => s.id === sid)?.name ?? { ar: 'أخرى', en: 'Other' }, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3),
            };
          })
          .sort((a, b) => b.revenue - a.revenue);
        return clone(rows);
      },
      async listActivity(limit = 30) {
        await delay(80);
        return clone(state.activity.slice(0, limit));
      },
      async listNotifications() {
        return repo.notifications.list();
      },
      async broadcast({ title, body, route }) {
        await delay(300);
        pushNotification({ userId: null, audience: 'CUSTOMERS', type: 'SYSTEM', title, body, route: route ?? null });
        save();
      },
      async listCategories() {
        await delay(80);
        return clone([...state.categories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ ...c, companyCount: state.companies.filter((x) => x.categoryId === c.id).length })));
      },
      async listCustomers() {
        await delay(120);
        return clone(state.users.filter((u) => u.role === 'customer').map((u) => ({ ...u, loyalty: state.loyalty[u.id] })));
      },
    },
  };

  return repo;
};

export { DEMO } from './seed/users';
