import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Lang, Weekday } from '@/domain/types';

dayjs.extend(relativeTime);

/** Saturday-first display order for Qatar. */
export const WEEK_ORDER: Weekday[] = [6, 0, 1, 2, 3, 4, 5];

const ARABIC_DIGITS = /[٠-٩]/g;
const toLatinDigits = (s: string) => s.replace(ARABIC_DIGITS, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const WEEKDAYS: Record<Lang, string[]> = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const WEEKDAYS_SHORT: Record<Lang, string[]> = {
  ar: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
const MONTHS: Record<Lang, string[]> = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const weekdayName = (day: Weekday, lang: Lang, short = false): string => (short ? WEEKDAYS_SHORT[lang][day] : WEEKDAYS[lang][day]);
export const monthName = (monthIndex: number, lang: Lang): string => MONTHS[lang][((monthIndex % 12) + 12) % 12];

export const formatNumber = (n: number, opts?: { maxFractionDigits?: number; compact?: boolean }): string => {
  if (!Number.isFinite(n)) return '0';
  if (opts?.compact && Math.abs(n) >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(v >= 100 ? 0 : 1).replace(/\.0$/, '')}k`;
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: opts?.maxFractionDigits ?? 0 }).format(n);
};

export const CURRENCY: Record<Lang, string> = { ar: 'ر.ق', en: 'QAR' };

export const formatMoney = (amount: number, lang: Lang, opts?: { compact?: boolean; withoutCurrency?: boolean }): string => {
  const num = formatNumber(amount, { maxFractionDigits: Number.isInteger(amount) ? 0 : 2, compact: opts?.compact });
  if (opts?.withoutCurrency) return num;
  return lang === 'ar' ? `${num} ${CURRENCY.ar}` : `${CURRENCY.en} ${num}`;
};

const toDayjs = (d: string | Date | number) => {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return dayjs(`${d}T12:00:00`);
  return dayjs(d);
};

/** formatDate('2026-10-05', 'ar') → "الأحد، 5 أكتوبر" ; pattern 'long' adds the year, 'short' → "5 أكتوبر" */
export const formatDate = (d: string | Date | number, lang: Lang, pattern: 'weekdayDay' | 'short' | 'long' | 'numeric' = 'weekdayDay'): string => {
  const dt = toDayjs(d);
  if (!dt.isValid()) return '';
  const day = dt.date();
  const month = monthName(dt.month(), lang);
  const wd = weekdayName(dt.day() as Weekday, lang);
  switch (pattern) {
    case 'short':
      return lang === 'ar' ? `${day} ${month}` : `${day} ${month}`;
    case 'long':
      return lang === 'ar' ? `${day} ${month} ${dt.year()}` : `${day} ${month} ${dt.year()}`;
    case 'numeric':
      return dt.format('YYYY-MM-DD');
    default:
      return lang === 'ar' ? `${wd}، ${day} ${month}` : `${wd}, ${day} ${month}`;
  }
};

/** formatTime('18:30','ar') → "6:30 م" */
export const formatTime = (hhmm: string, lang: Lang): string => {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? (lang === 'ar' ? 'م' : 'PM') : lang === 'ar' ? 'ص' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const formatDateTime = (date: string, time: string, lang: Lang): string => `${formatDate(date, lang)} · ${formatTime(time, lang)}`;

export const formatRelative = (iso: string | Date, lang: Lang): string => {
  const dt = dayjs(iso);
  if (!dt.isValid()) return '';
  const now = dayjs();
  const diffDays = now.startOf('day').diff(dt.startOf('day'), 'day');
  if (lang === 'ar') {
    if (diffDays === 0) {
      const mins = now.diff(dt, 'minute');
      if (mins < 1) return 'الآن';
      if (mins < 60) return `قبل ${mins} دقيقة`;
      const hrs = now.diff(dt, 'hour');
      return `قبل ${hrs} ${hrs === 1 ? 'ساعة' : hrs === 2 ? 'ساعتين' : hrs <= 10 ? 'ساعات' : 'ساعة'}`;
    }
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'أول أمس';
    if (diffDays < 7) return `قبل ${diffDays} أيام`;
    if (diffDays < 30) {
      const w = Math.floor(diffDays / 7);
      return w === 1 ? 'قبل أسبوع' : w === 2 ? 'قبل أسبوعين' : `قبل ${w} أسابيع`;
    }
    return formatDate(dt.toDate(), lang, 'short');
  }
  return toLatinDigits(dt.locale('en').fromNow());
};

/** days until a date (YYYY-MM-DD), floor, never negative */
export const daysUntil = (dateStr: string): number => Math.max(0, toDayjs(dateStr).startOf('day').diff(dayjs().startOf('day'), 'day'));

export const formatDistance = (km: number, lang: Lang): string => {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return lang === 'ar' ? `${Math.round(km * 1000)} م` : `${Math.round(km * 1000)} m`;
  const v = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return lang === 'ar' ? `${v} كم` : `${v} km`;
};

export const formatDuration = (min: number, lang: Lang): string => {
  if (min < 60) return lang === 'ar' ? `${min} دقيقة` : `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (lang === 'ar') return m ? `${h} س ${m} د` : `${h} ${h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : 'ساعات'}`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export interface PluralForms {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** Arabic-aware pluralisation. plural(3, { one: 'تقييم', two: 'تقييمان', few: 'تقييمات', other: 'تقييم' }) → 'تقييمات' */
export const plural = (count: number, forms: PluralForms, lang: Lang = 'ar'): string => {
  if (lang === 'en') return count === 1 ? forms.one : forms.other;
  if (count === 0) return forms.zero ?? forms.other;
  if (count === 1) return forms.one;
  if (count === 2) return forms.two ?? forms.other;
  if (count >= 3 && count <= 10) return forms.few ?? forms.other;
  return forms.many ?? forms.other;
};

export const latinDigits = toLatinDigits;
