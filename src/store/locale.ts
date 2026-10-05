/**
 * Language / direction store. Arabic is the default. Persisted in AsyncStorage.
 * Changing the language flips RTL natively and reloads the app (see src/i18n/index.ts → setLanguage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Lang } from '@/domain/types';
import { DEFAULT_LANG, isRTL, LOCALE_STORAGE_KEY } from '@/lib/rtl';

export { DEFAULT_LANG, LOCALE_STORAGE_KEY };

interface LocaleState {
  lang: Lang;
  isRTL: boolean;
  hydrated: boolean;
  /** restore the persisted language; returns it */
  hydrate: () => Promise<Lang>;
  /** persist and update state only (callers handle I18nManager + reload) */
  setLang: (lang: Lang) => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  lang: DEFAULT_LANG,
  isRTL,
  hydrated: false,
  hydrate: async () => {
    try {
      const saved = (await AsyncStorage.getItem(LOCALE_STORAGE_KEY)) as Lang | null;
      const lang: Lang = saved === 'en' || saved === 'ar' ? saved : DEFAULT_LANG;
      set({ lang, isRTL, hydrated: true });
      return lang;
    } catch {
      set({ hydrated: true });
      return get().lang;
    }
  },
  setLang: async (lang) => {
    set({ lang });
    try {
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, lang);
    } catch {
      // ignore persistence failures
    }
  },
}));

export const getLang = (): Lang => useLocaleStore.getState().lang;
export const isArabic = (): boolean => useLocaleStore.getState().lang === 'ar';
