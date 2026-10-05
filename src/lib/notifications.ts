/**
 * Push + local notifications (expo-notifications, SDK 57).
 * - registerForPushAsync(): permission → Android channel → Expo push token (needs EAS projectId) → returns token or null.
 * - presentLocal(): immediate local notification (used by the mock data mode to simulate pushes).
 * - addResponseListener(): route handling when the user taps a notification (payload.data.route).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const PUSH_CHANNEL_ID = 'default';

let handlerConfigured = false;

export const configureNotificationHandler = () => {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

export const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: 'OneQ',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#5A0020',
    // no `sound` key: expo-notifications treats any string (even 'default') as a bundled custom sound file on Android
  });
};

export const getProjectId = (): string | undefined => {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
};

export interface PushRegistration {
  token: string | null;
  granted: boolean;
  reason?: 'simulator' | 'denied' | 'no-project-id' | 'error';
}

/** Ask for permission and obtain an Expo push token. Never throws. */
export const registerForPushAsync = async (): Promise<PushRegistration> => {
  try {
    configureNotificationHandler();
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return { token: null, granted: false, reason: 'denied' };
    if (!Device.isDevice) return { token: null, granted: true, reason: 'simulator' };
    const projectId = getProjectId();
    if (!projectId) return { token: null, granted: true, reason: 'no-project-id' };
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data, granted: true };
  } catch {
    return { token: null, granted: false, reason: 'error' };
  }
};

/** Show a local notification right away (e.g. mock mode simulating a company offer push). */
export const presentLocal = async (input: { title: string; body: string; data?: Record<string, string> }) => {
  try {
    configureNotificationHandler();
    await ensureAndroidChannel();
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: { title: input.title, body: input.body, data: input.data ?? {}, sound: 'default' },
      trigger: null,
    });
  } catch {
    // ignore
  }
};

export type NotificationRouteHandler = (route: string, data: Record<string, unknown>) => void;

const extractRoute = (response: Notifications.NotificationResponse): { route: string | null; data: Record<string, unknown> } => {
  const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
  const route = typeof data.route === 'string' ? data.route : null;
  return { route, data };
};

/** Subscribe to taps on notifications (foreground, background and cold start). Returns an unsubscribe. */
export const addResponseListener = (onRoute: NotificationRouteHandler): (() => void) => {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const { route, data } = extractRoute(response);
    if (route) onRoute(route, data);
  });
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      const { route, data } = extractRoute(response);
      if (route) onRoute(route, data);
    })
    .catch(() => undefined);
  return () => sub.remove();
};

export const addReceivedListener = (cb: (n: Notifications.Notification) => void): (() => void) => {
  const sub = Notifications.addNotificationReceivedListener(cb);
  return () => sub.remove();
};

export const setBadgeCount = async (count: number) => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // ignore
  }
};
