/**
 * Layout direction, resolved once at startup.
 * - Native: `I18nManager.isRTL` (flipped by setLanguage + a native restart, see src/i18n/index.ts).
 * - Web: react-native-web's I18nManager is a stub whose isRTL is always false, so the direction comes from the
 *   persisted language (localStorage, read synchronously before the first render) and is mirrored on <html dir>
 *   so logical styles, flex rows and scrolling follow it. Switching the language on web reloads the page.
 */
import { I18nManager, Platform } from 'react-native';
import type { Lang } from '@/domain/types';

export const LOCALE_STORAGE_KEY = 'oneq.lang.v1';
export const DEFAULT_LANG: Lang = 'ar';

const readWebLang = (): Lang => {
  try {
    // AsyncStorage on web is a thin wrapper over localStorage with the same keys
    const saved = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
    return saved === 'en' ? 'en' : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

/** language known synchronously at startup (web only; native hydrates it from AsyncStorage) */
export const startupLang: Lang | null = Platform.OS === 'web' ? readWebLang() : null;

export const isRTL: boolean = Platform.OS === 'web' ? startupLang === 'ar' : I18nManager.isRTL;

/** web only: put the direction + language on the document (idempotent) */
export const applyWebDirection = (): void => {
  if (Platform.OS !== 'web') return;
  const doc = globalThis.document;
  if (!doc?.documentElement) return;
  doc.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  doc.documentElement.lang = isRTL ? 'ar' : 'en';
};

applyWebDirection();
