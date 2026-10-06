/**
 * App bootstrap: locale → RTL check → repository init → session restore → push registration.
 * Runs once from the root layout. Sets session.status to 'ready' when the app can route.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { I18nManager, Platform } from 'react-native';
import { repo } from '@/data';
import { reloadApp } from '@/i18n';
import { addResponseListener, registerForPushAsync } from '@/lib/notifications';
import { queryClient } from '@/lib/query';
import { useLocaleStore } from '@/store/locale';
import { useSessionStore } from '@/store/session';

export const ONBOARDED_KEY = 'oneq.onboarded.v1';
export const GUEST_KEY = 'oneq.guest.v1';
/** direction for which a one-time reload was already attempted ('rtl' | 'ltr') */
export const RTL_RELOAD_KEY = 'oneq.rtlReload.v1';

export const useBootstrap = () => {
  const started = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const session = useSessionStore.getState();
    (async () => {
      try {
        const lang = await useLocaleStore.getState().hydrate();
        const shouldBeRTL = lang === 'ar';
        if (I18nManager.isRTL !== shouldBeRTL && Platform.OS !== 'web') {
          // Persist the native direction. A full native restart applies it (expo-updates reload in release builds;
          // in development a JS reload is not enough, so we continue in the current direction and apply it on the next launch).
          I18nManager.allowRTL(shouldBeRTL);
          I18nManager.forceRTL(shouldBeRTL);
          // The "already tried" marker must survive the reload itself: a JS reload does not re-read the native flag
          // everywhere (Expo Go applies it only on its next process start), and a globalThis flag resets with the
          // JS context — that combination produced an endless reload loop.
          const wanted = shouldBeRTL ? 'rtl' : 'ltr';
          const tried = await AsyncStorage.getItem(RTL_RELOAD_KEY).catch(() => null);
          if (tried !== wanted && !__DEV__) {
            await AsyncStorage.setItem(RTL_RELOAD_KEY, wanted).catch(() => undefined);
            await reloadApp();
          }
        }
        await repo.init(lang);
        const [onboarded, guest] = await Promise.all([AsyncStorage.getItem(ONBOARDED_KEY), AsyncStorage.getItem(GUEST_KEY)]);
        session.setOnboarded(onboarded === '1');
        session.setGuest(guest === '1');
        const current = await repo.auth.getSession();
        session.setSession(current);
      } catch {
        session.setSession(null);
      } finally {
        useSessionStore.getState().setReady();
      }
    })();

    const offAuth = repo.auth.onAuthChange((s) => {
      useSessionStore.getState().setSession(s);
      if (!s) queryClient.clear();
    });
    const offNotif = addResponseListener((route) => {
      try {
        router.push(route as never);
      } catch {
        // ignore malformed routes
      }
    });
    return () => {
      offAuth();
      offNotif();
    };
  }, [router]);

  // Register for push whenever a session appears.
  const userId = useSessionStore((s) => s.session?.userId ?? null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const reg = await registerForPushAsync();
      if (!cancelled && reg.token) await repo.notifications.registerPushToken(reg.token, Platform.OS === 'ios' ? 'ios' : 'android');
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);
};

export const markOnboarded = async () => {
  useSessionStore.getState().setOnboarded(true);
  await AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => undefined);
};

export const continueAsGuest = async () => {
  useSessionStore.getState().setGuest(true);
  await AsyncStorage.setItem(GUEST_KEY, '1').catch(() => undefined);
};
