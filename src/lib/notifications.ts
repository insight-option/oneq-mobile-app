/**
 * Push + local notifications (expo-notifications, SDK 57).
 * - registerForPushAsync(): permission → Android channel → Expo push token (needs EAS projectId) → returns token or null.
 * - presentLocal(): immediate local notification (used by the mock data mode to simulate pushes).
 * - addResponseListener(): route handling when the user taps a notification (payload.data.route).
 *
 * expo-notifications is loaded lazily: in Expo Go (SDK 53+) its Android push module no longer exists and merely
 * evaluating the package throws, which would take every route that imports this file down with it. Outside Expo Go
 * (development builds, release builds) the native module is always present.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type * as NotificationsModule from 'expo-notifications';

export const PUSH_CHANNEL_ID = 'default';

type NotificationsApi = typeof NotificationsModule;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let api: NotificationsApi | null | undefined;

/** The expo-notifications module, or null where it cannot run (Expo Go). */
const notifications = (): NotificationsApi | null => {
  if (api !== undefined) return api;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    api = isExpoGo ? null : (require('expo-notifications') as NotificationsApi);
  } catch {
    api = null;
  }
  return api;
};

let handlerConfigured = false;

export const configureNotificationHandler = () => {
  const N = notifications();
  if (!N || handlerConfigured) return;
  handlerConfigured = true;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

export const ensureAndroidChannel = async () => {
  const N = notifications();
  if (!N || Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: 'OneQ',
    importance: N.AndroidImportance.MAX,
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
  reason?: 'simulator' | 'denied' | 'no-project-id' | 'error' | 'unsupported';
}

/** Ask for permission and obtain an Expo push token. Never throws. */
export const registerForPushAsync = async (): Promise<PushRegistration> => {
  const N = notifications();
  if (!N) return { token: null, granted: false, reason: 'unsupported' };
  try {
    configureNotificationHandler();
    await ensureAndroidChannel();
    const current = await N.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const req = await N.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return { token: null, granted: false, reason: 'denied' };
    if (!Device.isDevice) return { token: null, granted: true, reason: 'simulator' };
    const projectId = getProjectId();
    if (!projectId) return { token: null, granted: true, reason: 'no-project-id' };
    const { data } = await N.getExpoPushTokenAsync({ projectId });
    return { token: data, granted: true };
  } catch {
    return { token: null, granted: false, reason: 'error' };
  }
};

/** Show a local notification right away (e.g. mock mode simulating a company offer push). */
export const presentLocal = async (input: { title: string; body: string; data?: Record<string, string> }) => {
  const N = notifications();
  if (!N) return;
  try {
    configureNotificationHandler();
    await ensureAndroidChannel();
    const perm = await N.getPermissionsAsync();
    if (perm.status !== 'granted') return;
    await N.scheduleNotificationAsync({
      content: { title: input.title, body: input.body, data: input.data ?? {}, sound: 'default' },
      trigger: null,
    });
  } catch {
    // ignore
  }
};

export type NotificationRouteHandler = (route: string, data: Record<string, unknown>) => void;

const extractRoute = (response: NotificationsModule.NotificationResponse): { route: string | null; data: Record<string, unknown> } => {
  const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
  const route = typeof data.route === 'string' ? data.route : null;
  return { route, data };
};

/** Subscribe to taps on notifications (foreground, background and cold start). Returns an unsubscribe. */
export const addResponseListener = (onRoute: NotificationRouteHandler): (() => void) => {
  const N = notifications();
  if (!N) return () => undefined;
  const sub = N.addNotificationResponseReceivedListener((response) => {
    const { route, data } = extractRoute(response);
    if (route) onRoute(route, data);
  });
  N.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      const { route, data } = extractRoute(response);
      if (route) onRoute(route, data);
    })
    .catch(() => undefined);
  return () => sub.remove();
};

export const addReceivedListener = (cb: (n: NotificationsModule.Notification) => void): (() => void) => {
  const N = notifications();
  if (!N) return () => undefined;
  const sub = N.addNotificationReceivedListener(cb);
  return () => sub.remove();
};

export const setBadgeCount = async (count: number) => {
  const N = notifications();
  if (!N) return;
  try {
    await N.setBadgeCountAsync(count);
  } catch {
    // ignore
  }
};
