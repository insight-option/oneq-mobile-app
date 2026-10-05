import type { AppSyncResolverEvent } from 'aws-lambda';
import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { env } from '$amplify/env/gifts';
import type { SendGiftInput } from '../../../src/domain/types';
import { getClient, unwrap, type DataClient } from '../shared/client';
import { notifyUser } from '../shared/notify';
import { addPoints, getLoyalty } from '../shared/points';
import { ApiError, MIN_GIFT_POINTS, buildWhatsAppUrl, fieldNameOf, giftCode, jsonArg, newId, normalizePhone, nowIso, requireSub, samePhone, type LocalizedText } from '../shared/util';

type Args = Record<string, unknown>;
type Event = AppSyncResolverEvent<Args>;

const lt = (t: LocalizedText | null | undefined): LocalizedText => ({ ar: t?.ar ?? '', en: t?.en ?? t?.ar ?? '' });

const TEXT = {
  ar: { message: (sender: string, item: string, message: string, link: string) => `🎁 ${sender} أهداك ${item} عبر تطبيق OneQ!\n${message}\nحمّل التطبيق وسجّل برقم جوالك لاستلام هديتك: ${link}`, points: (n: number) => `${n} نقطة ولاء` },
  en: { message: (sender: string, item: string, message: string, link: string) => `🎁 ${sender} sent you ${item} on OneQ!\n${message}\nDownload the app and sign in with your phone number to claim your gift: ${link}`, points: (n: number) => `${n} loyalty points` },
};

/* ---------- WhatsApp Cloud API (optional; configured through SSM parameters) ---------- */
interface WhatsAppConfig {
  token: string;
  phoneId: string;
  template: string;
}
let whatsappConfig: WhatsAppConfig | null | undefined;
const ssm = new SSMClient();
const getWhatsAppConfig = async (): Promise<WhatsAppConfig | null> => {
  if (whatsappConfig !== undefined) return whatsappConfig;
  const prefix = env.WHATSAPP_SSM_PREFIX || '/oneq/whatsapp';
  try {
    const res = await ssm.send(new GetParametersCommand({ Names: [`${prefix}/token`, `${prefix}/phoneId`, `${prefix}/template`], WithDecryption: true }));
    const get = (name: string) => res.Parameters?.find((p) => p.Name === `${prefix}/${name}`)?.Value;
    const token = get('token');
    const phoneId = get('phoneId');
    whatsappConfig = token && phoneId ? { token, phoneId, template: get('template') || 'oneq_gift' } : null;
  } catch (e) {
    console.warn('whatsapp config unavailable', e);
    whatsappConfig = null;
  }
  return whatsappConfig;
};

/** Sends the approved `oneq_gift` template (sender, item, message, link). Returns false when not configured or rejected. */
const sendWhatsAppTemplate = async (to: string, lang: 'ar' | 'en', params: string[]): Promise<boolean> => {
  const cfg = await getWhatsAppConfig();
  if (!cfg) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${cfg.phoneId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/[^\d]/g, ''),
        type: 'template',
        template: { name: cfg.template, language: { code: lang }, components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] },
      }),
    });
    if (!res.ok) console.warn('whatsapp send failed', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.warn('whatsapp send error', e);
    return false;
  }
};

const findByPhone = async (client: DataClient, phone: string) => {
  const r = await client.models.UserProfile.listUserProfilesByPhoneKey({ phoneKey: phone }, { limit: 1 });
  return r.data?.[0] ?? null;
};

/* ---------- lookupRecipient ---------- */
const lookupRecipient = async (client: DataClient, event: Event) => {
  requireSub(event);
  const phone = normalizePhone(String(event.arguments.phone ?? ''));
  if (!phone) throw new ApiError('INVALID_PHONE');
  const u = await findByPhone(client, phone);
  return { phone, registered: Boolean(u), name: u?.name ?? null };
};

/* ---------- sendGift ---------- */
const sendGift = async (client: DataClient, event: Event) => {
  const sub = requireSub(event);
  const input = jsonArg<SendGiftInput>(event.arguments.input);
  const me = (await client.models.UserProfile.get({ id: sub })).data;
  if (!me) throw new ApiError('PROFILE_NOT_FOUND');
  const recipientPhone = normalizePhone(input.recipientPhone);
  if (!recipientPhone) throw new ApiError('INVALID_RECIPIENT');
  if (samePhone(recipientPhone, me.phone)) throw new ApiError('SELF_GIFT');
  const recipient = await findByPhone(client, recipientPhone);
  const company = input.companyId ? (await client.models.Company.get({ id: input.companyId })).data : null;
  const service = input.serviceId ? (await client.models.Service.get({ id: input.serviceId })).data : null;
  const product = input.productId ? (await client.models.Product.get({ id: input.productId })).data : null;
  const lang: 'ar' | 'en' = me.language === 'en' ? 'en' : 'ar';

  if (input.kind === 'POINTS') {
    const pts = Math.floor(input.points ?? 0);
    if (pts < MIN_GIFT_POINTS) throw new ApiError('MIN_POINTS');
    const acc = await getLoyalty(client, sub);
    if ((acc.points ?? 0) < pts) throw new ApiError('INSUFFICIENT_POINTS');
    await addPoints(client, sub, -pts, 'GIFT_SENT', { ar: `هدية نقاط إلى ${recipient?.name ?? recipientPhone}`, en: `Points gift to ${recipient?.name ?? recipientPhone}` });
  } else if (!company || (!service && !product)) {
    throw new ApiError('ITEM_REQUIRED');
  }

  const itemName = service ? lt(service.name) : product ? lt(product.name) : null;
  const companyName = company ? lt(company.name) : null;
  const points = input.kind === 'POINTS' ? Math.floor(input.points ?? 0) : null;
  const gift = unwrap(
    await client.models.Gift.create({
      id: newId(),
      code: giftCode(),
      senderId: sub,
      senderName: me.name,
      senderPhone: me.phone ?? '',
      recipientPhone,
      recipientId: recipient?.id ?? null,
      recipientName: recipient?.name ?? input.recipientName ?? null,
      kind: input.kind,
      points,
      companyId: company?.id ?? null,
      companyName,
      serviceId: service?.id ?? null,
      productId: product?.id ?? null,
      itemName,
      itemImageUrl: service?.imageUrl ?? product?.imageUrls?.[0] ?? null,
      amount: input.kind === 'POINTS' ? null : (service?.offerPrice ?? service?.price ?? product?.offerPrice ?? product?.price ?? 0),
      message: input.message ?? null,
      status: recipient ? (input.kind === 'POINTS' ? 'DELIVERED' : 'PENDING') : 'WHATSAPP_SENT',
      channel: recipient ? 'APP' : 'WHATSAPP',
      bookingId: null,
      sentAt: nowIso(),
      claimedAt: null,
    }),
    'gift',
  );

  let whatsappUrl: string | null = null;
  if (recipient) {
    if (input.kind === 'POINTS') await addPoints(client, recipient.id, points ?? 0, 'GIFT_RECEIVED', { ar: `هدية من ${me.name}`, en: `Gift from ${me.name}` }, gift.id);
    await notifyUser(client, recipient.id, {
      type: 'GIFT',
      title: { ar: `وصلتك هدية من ${me.name} 🎁`, en: `You received a gift from ${me.name} 🎁` },
      body: input.kind === 'POINTS' ? { ar: `${points} نقطة ولاء أضيفت إلى رصيدك.`, en: `${points} loyalty points were added to your balance.` } : { ar: `${itemName?.ar ?? ''} في ${companyName?.ar ?? ''}. استلمها من صفحة الهدايا.`, en: `${itemName?.en ?? ''} at ${companyName?.en ?? ''}. Claim it from your gifts page.` },
      route: `/gift/${gift.id}`,
    });
  } else {
    const item = input.kind === 'POINTS' ? TEXT[lang].points(points ?? 0) : `${itemName?.[lang] ?? ''} (${companyName?.[lang] ?? ''})`;
    const sent = await sendWhatsAppTemplate(recipientPhone, lang, [me.name, item, input.message?.trim() || '-', env.APP_LINK || 'https://oneq.qa/app']);
    if (!sent) whatsappUrl = buildWhatsAppUrl(recipientPhone, TEXT[lang].message(me.name, item, input.message ?? '', env.APP_LINK || 'https://oneq.qa/app'));
  }
  return { gift, channel: gift.channel, whatsappUrl };
};

/* ---------- claimGift ---------- */
const claimGift = async (client: DataClient, event: Event) => {
  const sub = requireSub(event);
  const me = (await client.models.UserProfile.get({ id: sub })).data;
  if (!me) throw new ApiError('PROFILE_NOT_FOUND');
  const g = (await client.models.Gift.get({ id: String(event.arguments.giftId) })).data;
  if (!g) throw new ApiError('NOT_FOUND');
  if (g.recipientId && g.recipientId !== sub) throw new ApiError('FORBIDDEN');
  if (!g.recipientId && !samePhone(g.recipientPhone, me.phone)) throw new ApiError('FORBIDDEN');
  if (g.status === 'CLAIMED') return g;
  if (g.kind === 'POINTS' && g.status !== 'DELIVERED') await addPoints(client, sub, g.points ?? 0, 'GIFT_RECEIVED', { ar: `هدية من ${g.senderName}`, en: `Gift from ${g.senderName}` }, g.id);
  return unwrap(await client.models.Gift.update({ id: g.id, status: 'CLAIMED', claimedAt: nowIso(), recipientId: sub, recipientName: me.name }), 'gift');
};

export const handler = async (event: Event) => {
  const client = await getClient(env);
  const field = fieldNameOf(event);
  switch (field) {
    case 'lookupRecipient':
      return lookupRecipient(client, event);
    case 'sendGift':
      return sendGift(client, event);
    case 'claimGift':
      return claimGift(client, event);
    default:
      throw new ApiError('UNKNOWN_FIELD_' + field);
  }
};
