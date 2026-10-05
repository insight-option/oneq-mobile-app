/**
 * Web build of src/lib/notifications.ts: expo-notifications has no web implementation, so push registration and
 * local notifications are no-ops here (in-app notifications still arrive through the API subscriptions).
 * Keep the exports in sync with the native module.
 */
export const PUSH_CHANNEL_ID = 'default';

export const configureNotificationHandler = (): void => undefined;

export const ensureAndroidChannel = async (): Promise<void> => undefined;

export const getProjectId = (): string | undefined => undefined;

export interface PushRegistration {
  token: string | null;
  granted: boolean;
  reason?: 'simulator' | 'denied' | 'no-project-id' | 'error' | 'unsupported';
}

export const registerForPushAsync = async (): Promise<PushRegistration> => ({ token: null, granted: false, reason: 'unsupported' });

export const presentLocal = async (_input: { title: string; body: string; data?: Record<string, string> }): Promise<void> => undefined;

export type NotificationRouteHandler = (route: string, data: Record<string, unknown>) => void;

export const addResponseListener = (_onRoute: NotificationRouteHandler): (() => void) => () => undefined;

export interface WebNotificationLike {
  request: { content: { title?: string | null; body?: string | null; data?: Record<string, unknown> } };
}

export const addReceivedListener = (_cb: (n: WebNotificationLike) => void): (() => void) => () => undefined;

export const setBadgeCount = async (_count: number): Promise<void> => undefined;
