/**
 * Qatar phone helpers (+974, 8 local digits starting with 3/4/5/6/7) and WhatsApp deep links.
 * Framework-free.
 */
import { toLatinDigits } from '@/lib/text';

export const QATAR_COUNTRY_CODE = '+974';
export const QATAR_LOCAL_LENGTH = 8;
/** Mobile prefixes 3/5/6/7; 4 = landline. All are accepted for registration/lookup. */
const VALID_FIRST_DIGITS = new Set(['3', '4', '5', '6', '7']);

/**
 * Normalise any user-typed Qatari number to `+974XXXXXXXX`.
 * Accepts: `5000 0003`, `+974 5000 0003`, `00974-50000003`, `97450000003`, Arabic-Indic digits.
 * Returns null when the number cannot be a Qatari number.
 */
export function normalizeQatarPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digitsOnly = toLatinDigits(input).replace(/\D/g, '');
  if (!digitsOnly) return null;
  let local = digitsOnly;
  if (local.startsWith('00974')) local = local.slice(5);
  else if (local.startsWith('974') && local.length === 11) local = local.slice(3);
  if (local.length !== QATAR_LOCAL_LENGTH) return null;
  if (!VALID_FIRST_DIGITS.has(local[0])) return null;
  return `${QATAR_COUNTRY_CODE}${local}`;
}

export function isValidQatarPhone(input: string | null | undefined): boolean {
  return normalizeQatarPhone(input) !== null;
}

/** `+97450000003` → `50000003` */
export function localPart(phone: string): string {
  const normalized = normalizeQatarPhone(phone);
  return normalized ? normalized.slice(QATAR_COUNTRY_CODE.length) : toLatinDigits(phone).replace(/\D/g, '');
}

/** `+97450000003` → `97450000003` (wa.me / tel: friendly) */
export function phoneDigits(phone: string): string {
  const normalized = normalizeQatarPhone(phone);
  return (normalized ?? toLatinDigits(phone)).replace(/\D/g, '');
}

/** Display format `+974 5000 0003`. Unknown numbers are returned trimmed. */
export function formatPhone(input: string | null | undefined): string {
  if (!input) return '';
  const normalized = normalizeQatarPhone(input);
  if (!normalized) return input.trim();
  const local = normalized.slice(QATAR_COUNTRY_CODE.length);
  // LRE … PDF keep the "+974 5000 0001" run left-to-right when it sits inside Arabic (RTL) text
  return `‪${QATAR_COUNTRY_CODE} ${local.slice(0, 4)} ${local.slice(4)}‬`;
}

/** `+974 •••• 0003` for OTP destinations. */
export function maskPhone(input: string): string {
  const normalized = normalizeQatarPhone(input);
  if (!normalized) return input;
  const local = normalized.slice(QATAR_COUNTRY_CODE.length);
  return `${QATAR_COUNTRY_CODE} •••• ${local.slice(4)}`;
}

/** `https://wa.me/97450000003?text=...` — text is URL-encoded (Arabic safe). */
export function buildWhatsAppUrl(phone: string, text: string): string {
  const digits = phoneDigits(phone);
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}

/** `tel:+97450000003` */
export function buildTelUrl(phone: string): string {
  const normalized = normalizeQatarPhone(phone);
  return `tel:${normalized ?? toLatinDigits(phone).replace(/[^\d+]/g, '')}`;
}

/** Same number regardless of formatting. */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeQatarPhone(a);
  const nb = normalizeQatarPhone(b);
  return na !== null && na === nb;
}
