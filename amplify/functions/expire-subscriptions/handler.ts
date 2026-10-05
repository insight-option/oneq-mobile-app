import type { EventBridgeHandler } from 'aws-lambda';
import { env } from '$amplify/env/expire-subscriptions';
import { getClient, listAll } from '../shared/client';
import { notifyUser } from '../shared/notify';
import { addDays, todayStr } from '../shared/util';

/** Daily job: expire subscriptions past their end date (or fully used) and remind customers 3 days before. */
export const handler: EventBridgeHandler<'Scheduled Event', null, void> = async () => {
  const client = await getClient(env);
  const today = todayStr();
  const reminderDate = addDays(today, 3);
  const active = await listAll((nextToken) => client.models.ServiceSubscription.list({ filter: { status: { eq: 'ACTIVE' } }, limit: 500, nextToken: nextToken ?? undefined }));
  let expired = 0;
  for (const s of active) {
    const name = { ar: s.serviceName?.ar ?? '', en: s.serviceName?.en ?? s.serviceName?.ar ?? '' };
    if (s.endDate < today || s.usedSessions >= s.totalSessions) {
      await client.models.ServiceSubscription.update({ id: s.id, status: 'EXPIRED' });
      expired += 1;
      await notifyUser(client, s.customerId, { type: 'SUBSCRIPTION', title: { ar: 'انتهى اشتراكك', en: 'Your subscription ended' }, body: { ar: `${name.ar} — ${s.companyName.ar}. جدّد اشتراكك للاستمرار.`, en: `${name.en} — ${s.companyName.en}. Renew to keep going.` }, route: `/subscription/${s.id}` });
    } else if (s.endDate === reminderDate) {
      await notifyUser(client, s.customerId, { type: 'SUBSCRIPTION', title: { ar: 'اشتراكك ينتهي خلال 3 أيام', en: 'Your subscription ends in 3 days' }, body: { ar: `${name.ar} — ${s.companyName.ar}`, en: `${name.en} — ${s.companyName.en}` }, route: `/subscription/${s.id}` });
    }
  }
  console.log(`expire-subscriptions: ${active.length} active, ${expired} expired`);
};
