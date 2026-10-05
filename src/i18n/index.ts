/**
 * i18n entry point. Arabic is the source dictionary; English mirrors it (missing keys fall back to Arabic).
 *   const { t, lang, localized, formatMoney } = useI18n();
 *   t('booking.plan.weeks', { n: 12 })
 */
import { useCallback, useMemo } from 'react';
import { DevSettings, I18nManager } from 'react-native';
import type { Lang, LocalizedText } from '@/domain/types';
import { useLocaleStore } from '@/store/locale';
import { ar, type TKey } from './ar';
import { en } from './en';
import * as fmt from './format';
import { areaName } from './areas';

export type { TKey } from './ar';
export { AREAS, AREA_KEYS, areaName } from './areas';
export {
  WEEK_ORDER,
  CURRENCY,
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelative,
  formatDistance,
  formatDuration,
  weekdayName,
  monthName,
  plural,
  daysUntil,
  latinDigits,
} from './format';

const dictionaries: Record<Lang, Record<string, string>> = { ar, en };

type Params = Record<string, string | number | undefined>;

const interpolate = (template: string, params?: Params): string => {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const v = params[key];
    return v === undefined || v === null ? '' : String(v);
  });
};

/** Translate with the given language. */
export const tFor = (lang: Lang, key: TKey, params?: Params): string => {
  const dict = dictionaries[lang];
  const value = dict[key] ?? dictionaries.ar[key] ?? key;
  return interpolate(value, params);
};

/** Translate with the current language (non-hook usage, e.g. inside stores or toasts). */
export const t = (key: TKey, params?: Params): string => tFor(useLocaleStore.getState().lang, key, params);

/** Pick the right side of a bilingual text. */
export const localizedFor = (lang: Lang, text: LocalizedText | string | null | undefined, fallback = ''): string => {
  if (!text) return fallback;
  if (typeof text === 'string') return text;
  const v = lang === 'ar' ? text.ar || text.en : text.en || text.ar;
  return v || fallback;
};

export const localized = (text: LocalizedText | string | null | undefined, fallback = ''): string =>
  localizedFor(useLocaleStore.getState().lang, text, fallback);

/**
 * Persist the language, flip native RTL when needed and reload.
 * Resolves `true` when a reload was triggered (the caller should not navigate afterwards).
 */
export const setLanguage = async (lang: Lang): Promise<boolean> => {
  await useLocaleStore.getState().setLang(lang);
  const shouldBeRTL = lang === 'ar';
  if (I18nManager.isRTL === shouldBeRTL) return false;
  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  await reloadApp();
  return true;
};

export const reloadApp = async (): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require('expo-updates') as typeof import('expo-updates');
    if (Updates.isEnabled) {
      await Updates.reloadAsync();
      return;
    }
  } catch {
    // expo-updates unavailable
  }
  if (__DEV__) {
    DevSettings.reload();
  }
};

export const useI18n = () => {
  const lang = useLocaleStore((s) => s.lang);
  const isRTL = I18nManager.isRTL;
  const tr = useCallback((key: TKey, params?: Params) => tFor(lang, key, params), [lang]);
  const loc = useCallback((text: LocalizedText | string | null | undefined, fallback = '') => localizedFor(lang, text, fallback), [lang]);
  return useMemo(
    () => ({
      lang,
      isRTL,
      t: tr,
      localized: loc,
      setLanguage,
      areaName: (key: string | null | undefined) => areaName(key, lang),
      formatMoney: (amount: number, opts?: { compact?: boolean; withoutCurrency?: boolean }) => fmt.formatMoney(amount, lang, opts),
      formatNumber: fmt.formatNumber,
      formatDate: (d: string | Date | number, pattern?: 'weekdayDay' | 'short' | 'long' | 'numeric') => fmt.formatDate(d, lang, pattern),
      formatDateTime: (date: string, time: string) => fmt.formatDateTime(date, time, lang),
      formatTime: (hhmm: string) => fmt.formatTime(hhmm, lang),
      formatRelative: (iso: string | Date) => fmt.formatRelative(iso, lang),
      formatDistance: (km: number) => fmt.formatDistance(km, lang),
      formatDuration: (min: number) => fmt.formatDuration(min, lang),
      weekdayName: (day: 0 | 1 | 2 | 3 | 4 | 5 | 6, short?: boolean) => fmt.weekdayName(day, lang, short),
      plural: (count: number, forms: fmt.PluralForms) => fmt.plural(count, forms, lang),
    }),
    [lang, isRTL, tr, loc],
  );
};

export type I18n = ReturnType<typeof useI18n>;
