import type { DataClient } from './client';
import { newId, nextTierAt, nowIso, tierFor, type LocalizedText } from './util';

export type PointsTxType = 'WELCOME' | 'EARN_BOOKING' | 'REDEEM' | 'GIFT_SENT' | 'GIFT_RECEIVED' | 'BONUS' | 'ADJUST';

/** Returns the loyalty account, creating an empty one on first use. */
export const getLoyalty = async (client: DataClient, customerId: string) => {
  const res = await client.models.LoyaltyAccount.get({ id: customerId });
  if (res.data) return res.data;
  const created = await client.models.LoyaltyAccount.create({ id: customerId, customerId, points: 0, lifetimePoints: 0, tier: 'BRONZE', nextTierAt: 500 });
  if (!created.data) throw new Error('LOYALTY_CREATE_FAILED');
  return created.data;
};

/** Applies a delta (never below zero) and records the transaction. Gifts received do not count towards tiers. */
export const addPoints = async (client: DataClient, customerId: string, delta: number, type: PointsTxType, note: LocalizedText, refId?: string | null) => {
  const acc = await getLoyalty(client, customerId);
  const points = Math.max(0, (acc.points ?? 0) + delta);
  const lifetime = (acc.lifetimePoints ?? 0) + (delta > 0 && type !== 'GIFT_RECEIVED' ? delta : 0);
  const tier = tierFor(lifetime);
  await client.models.LoyaltyAccount.update({ id: customerId, points, lifetimePoints: lifetime, tier, nextTierAt: nextTierAt(tier) });
  await client.models.PointsTransaction.create({ id: newId(), customerId, delta, type, refId: refId ?? null, note, sentAt: nowIso() });
  return points;
};
