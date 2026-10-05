import type { AppSyncIdentityCognito, AppSyncResolverEvent } from 'aws-lambda';
import { randomBytes, randomUUID } from 'node:crypto';

export interface LocalizedText {
  ar: string;
  en: string;
}

export const nowIso = () => new Date().toISOString();
/** Qatar is UTC+3 all year; calendar days are computed in local time. */
export const qatarNow = () => new Date(Date.now() + 3 * 60 * 60 * 1000);
export const todayStr = () => qatarNow().toISOString().slice(0, 10);
export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = (prefix: string, len = 5) => {
  const bytes = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}-${s}`;
};
export const newId = () => randomUUID();
export const bookingCode = () => code('OQ');
export const giftCode = () => code('GF');
export const subscriptionCode = () => code('SB');

/** Qatar numbers: 8 local digits (3,4,5,6,7 prefixes) → E.164 "+974XXXXXXXX". */
export const normalizePhone = (input: string): string | null => {
  const digits = input.replace(/[^\d]/g, '');
  const local = digits.startsWith('00974') ? digits.slice(5) : digits.startsWith('974') && digits.length === 11 ? digits.slice(3) : digits;
  if (!/^[34567]\d{7}$/.test(local)) return null;
  return `+974${local}`;
};
export const samePhone = (a?: string | null, b?: string | null) => Boolean(a && b && normalizePhone(a) === normalizePhone(b));
export const buildWhatsAppUrl = (phone: string, text: string) => `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`;

export const identityOf = (event: AppSyncResolverEvent<unknown>) => {
  const id = event.identity as AppSyncIdentityCognito | null | undefined;
  const sub = id && 'sub' in id ? id.sub : null;
  const groups = id && 'groups' in id ? id.groups ?? [] : [];
  return { sub, groups, isAdmin: groups.includes('ADMINS'), isCompany: groups.includes('COMPANIES') };
};

/** Amplify's function resolver puts typeName/fieldName at the top level of the Lambda payload (not under `info`). */
export const fieldNameOf = (event: AppSyncResolverEvent<unknown>): string => (event as unknown as { fieldName?: string }).fieldName ?? event.info?.fieldName ?? '';

export class ApiError extends Error {
  constructor(code: string) {
    super(code);
    this.name = 'ApiError';
  }
}
export const requireSub = (event: AppSyncResolverEvent<unknown>): string => {
  const { sub } = identityOf(event);
  if (!sub) throw new ApiError('UNAUTHENTICATED');
  return sub;
};

/** Parses the `input` JSON argument of a custom mutation (AppSync passes AWSJSON as a string). */
export const jsonArg = <T>(value: unknown): T => (typeof value === 'string' ? (JSON.parse(value) as T) : (value as T));
/** AWSJSON model fields must be written as JSON strings. */
export const toJson = (value: unknown): string => JSON.stringify(value ?? null);
/** AWSJSON model fields come back as strings (or already parsed values); always normalise. */
export const fromJson = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

export const loc = (t: LocalizedText | null | undefined, lang: 'ar' | 'en' = 'ar') => (t ? t[lang] || t.ar : '');

/** Loyalty tiers by lifetime points (mirrors src/data/mock). */
export const tierFor = (lifetime: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' => (lifetime >= 4000 ? 'PLATINUM' : lifetime >= 1500 ? 'GOLD' : lifetime >= 500 ? 'SILVER' : 'BRONZE');
export const nextTierAt = (tier: string): number | null => (tier === 'BRONZE' ? 500 : tier === 'SILVER' ? 1500 : tier === 'GOLD' ? 4000 : null);

export const POINTS_PER_QAR = 1;
export const COMPLETION_BONUS = 20;
export const POINTS_PER_10_QAR = 100;
export const MIN_GIFT_POINTS = 50;
export const REVIEW_BONUS = 30;
