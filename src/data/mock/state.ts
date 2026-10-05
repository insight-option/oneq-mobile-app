import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityLog, AppNotification, Booking, Category, Company, Gift, LoyaltyAccount, PointsTransaction, Product, PushToken, Review, Service, Staff, Subscription, UserProfile } from '@/domain/types';
import { CATEGORIES } from './seed/categories';
import { COMPANIES, PRODUCTS, REVIEWS, SERVICES, STAFF } from './seed/companies';
import { ACTIVITY, BOOKINGS, GIFTS, LOYALTY, NOTIFICATIONS, POINTS, SUBSCRIPTIONS, USERS } from './seed/users';

const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
export const SEED_VERSION = 7;
const STORAGE_KEY = 'oneq.mock.v1';
export const SESSION_KEY = 'oneq.mock.session';

export interface MockState {
  version: number;
  categories: Category[];
  companies: Company[];
  services: Service[];
  products: Product[];
  staff: Staff[];
  reviews: Review[];
  users: UserProfile[];
  bookings: Booking[];
  subscriptions: Subscription[];
  gifts: Gift[];
  loyalty: Record<string, LoyaltyAccount>;
  points: PointsTransaction[];
  notifications: AppNotification[];
  pushTokens: PushToken[];
  activity: ActivityLog[];
}

export const createInitialState = (): MockState => ({
  version: SEED_VERSION,
  categories: deepClone(CATEGORIES),
  companies: deepClone(COMPANIES),
  services: deepClone(SERVICES),
  products: deepClone(PRODUCTS),
  staff: deepClone(STAFF),
  reviews: deepClone(REVIEWS),
  users: deepClone(USERS),
  bookings: deepClone(BOOKINGS),
  subscriptions: deepClone(SUBSCRIPTIONS),
  gifts: deepClone(GIFTS),
  loyalty: deepClone(LOYALTY),
  points: deepClone(POINTS),
  notifications: deepClone(NOTIFICATIONS),
  pushTokens: [],
  activity: deepClone(ACTIVITY),
});

let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced persistence of the whole state (small enough for AsyncStorage). */
export const persistState = (state: MockState) => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, 600);
};

export const restoreState = async (): Promise<MockState | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockState;
    if (parsed.version !== SEED_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearPersistedState = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
};
