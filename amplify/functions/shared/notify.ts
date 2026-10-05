import type { DataClient } from './client';
import { listAll } from './client';
import { loc, newId, nowIso, toJson, type LocalizedText } from './util';

export type NotificationType = 'OFFER' | 'NEW_SERVICE' | 'NEW_PRODUCT' | 'CATALOG_UPDATED' | 'BOOKING' | 'GIFT' | 'POINTS' | 'SUBSCRIPTION' | 'REVIEW' | 'COMPANY' | 'SYSTEM';

export interface NotifyInput {
  type: NotificationType;
  title: LocalizedText;
  body: LocalizedText;
  route?: string | null;
  imageUrl?: string | null;
  data?: Record<string, string> | null;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Sends Expo push messages in chunks of 100 (fire-and-forget: push failures never fail the business operation). */
export const sendExpoPush = async (messages: { to: string; title: string; body: string; data?: Record<string, string> }[]) => {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ ...m, sound: 'default', channelId: 'default', priority: 'high' }));
    try {
      const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(chunk) });
      if (!res.ok) console.warn('expo push failed', res.status, await res.text());
    } catch (e) {
      console.warn('expo push error', e);
    }
  }
};

/** Stores an in-app notification for one user and pushes it to all of their devices. */
export const notifyUser = async (client: DataClient, userId: string, input: NotifyInput, audience: 'USER' | 'CUSTOMERS' | 'ADMINS' | 'COMPANY' = 'USER') => {
  await client.models.Notification.create({ id: newId(), userId, owner: userId, audience, type: input.type, title: input.title, body: input.body, route: input.route ?? null, imageUrl: input.imageUrl ?? null, data: toJson(input.data ?? null), read: false, sentAt: nowIso() });
  const [tokens, profile] = await Promise.all([listAll((nextToken) => client.models.PushToken.listPushTokensByUserId({ userId }, { nextToken: nextToken ?? undefined })), client.models.UserProfile.get({ id: userId })]);
  const lang = (profile.data?.language as 'ar' | 'en' | undefined) ?? 'ar';
  if (tokens.length) {
    await sendExpoPush(tokens.map((t) => ({ to: t.token, title: loc(input.title, lang), body: loc(input.body, lang), data: { ...(input.data ?? {}), ...(input.route ? { route: input.route } : {}) } })));
  }
};

/** Fan-out to every user of a role (customers / admins). Small platforms only; move to SQS when the base grows. */
export const notifyRole = async (client: DataClient, role: 'customer' | 'admin', input: NotifyInput) => {
  const profiles = await listAll((nextToken) => client.models.UserProfile.listUserProfilesByRole({ role }, { nextToken: nextToken ?? undefined, limit: 500 }));
  const audience = role === 'admin' ? 'ADMINS' : 'CUSTOMERS';
  for (let i = 0; i < profiles.length; i += 10) {
    await Promise.all(profiles.slice(i, i + 10).map((p) => notifyUser(client, p.id, input, audience).catch((e) => console.warn('notify failed', p.id, e))));
  }
};

/** Notifies the owner account of a company (company workspace inbox + push). */
export const notifyCompany = async (client: DataClient, company: { ownerUserId?: string | null }, input: NotifyInput) => {
  if (!company.ownerUserId) return;
  await notifyUser(client, company.ownerUserId, input, 'COMPANY');
};

export type ActivityAction = 'SERVICE_CREATED' | 'SERVICE_UPDATED' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'OFFER_SET' | 'OFFER_REMOVED' | 'STAFF_CREATED' | 'STAFF_UPDATED' | 'PROFILE_UPDATED' | 'COMPANY_CREATED' | 'CATEGORY_CREATED';

/** Appends to the admin activity feed (single partition "ALL", sorted by time). */
export const logActivity = async (client: DataClient, input: { actorId: string; actorName: string; companyId?: string | null; companyName?: LocalizedText | null; action: ActivityAction; summary: LocalizedText }) => {
  await client.models.ActivityLog.create({ id: newId(), feed: 'ALL', actorId: input.actorId, actorName: input.actorName, companyId: input.companyId ?? null, companyName: input.companyName ?? null, action: input.action, summary: input.summary, sentAt: nowIso() });
};
