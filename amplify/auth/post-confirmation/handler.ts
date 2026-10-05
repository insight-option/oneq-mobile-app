import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { AdminAddUserToGroupCommand, AdminListGroupsForUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { env } from '$amplify/env/post-confirmation';
import { getClient } from '../../functions/shared/client';
import { addPoints } from '../../functions/shared/points';
import { normalizePhone, nowIso, toJson } from '../../functions/shared/util';

const cognito = new CognitoIdentityProviderClient();

/**
 * Post-confirmation trigger (self sign-up only; admin-created company users never pass through here).
 * 1. add the user to CUSTOMERS unless they already belong to a group
 * 2. create UserProfile + LoyaltyAccount (welcome bonus)
 * 3. deliver gifts that were sent to this phone number over WhatsApp before the user registered
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') return event;
  const sub = event.request.userAttributes.sub;
  const phone = normalizePhone(event.request.userAttributes.phone_number ?? '') ?? null;
  const email = event.request.userAttributes.email ?? null;
  const name = event.request.userAttributes.name || event.request.userAttributes.email?.split('@')[0] || 'عميل OneQ';

  const groups = await cognito.send(new AdminListGroupsForUserCommand({ UserPoolId: event.userPoolId, Username: event.userName }));
  if (!groups.Groups?.length) {
    await cognito.send(new AdminAddUserToGroupCommand({ GroupName: env.GROUP_NAME, Username: event.userName, UserPoolId: event.userPoolId }));
  }

  const client = await getClient(env);
  const existing = await client.models.UserProfile.get({ id: sub });
  if (!existing.data) {
    const { errors } = await client.models.UserProfile.create({ id: sub, owner: sub, role: 'customer', name, phone, email, avatarUrl: null, language: 'ar', favorites: [], addresses: toJson([]), companyId: null, phoneKey: phone ?? undefined });
    if (errors?.length) console.error('profile create failed', JSON.stringify(errors));
    await addPoints(client, sub, Number(env.WELCOME_POINTS) || 50, 'WELCOME', { ar: 'مكافأة الترحيب', en: 'Welcome bonus' });
  }

  if (phone) {
    const pending = await client.models.Gift.listGiftsByRecipientPhone({ recipientPhone: phone });
    for (const g of pending.data ?? []) {
      if (g.recipientId) continue;
      const status = g.status === 'WHATSAPP_SENT' || g.status === 'PENDING' ? 'DELIVERED' : g.status;
      await client.models.Gift.update({ id: g.id, recipientId: sub, recipientName: name, status });
      if (g.kind === 'POINTS' && status === 'DELIVERED') {
        await addPoints(client, sub, g.points ?? 0, 'GIFT_RECEIVED', { ar: `هدية من ${g.senderName}`, en: `Gift from ${g.senderName}` }, g.id);
      }
    }
  }
  console.log('post-confirmation done', sub, nowIso());
  return event;
};
