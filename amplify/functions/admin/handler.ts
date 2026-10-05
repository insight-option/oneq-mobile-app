import type { AppSyncResolverEvent } from 'aws-lambda';
import { AdminAddUserToGroupCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { randomBytes } from 'node:crypto';
import { env } from '$amplify/env/admin';
import type { AdminCreateCompanyInput } from '../../../src/domain/types';
import { getClient, unwrap, type DataClient } from '../shared/client';
import { logActivity, notifyRole } from '../shared/notify';
import { ApiError, fieldNameOf, identityOf, jsonArg, newId, normalizePhone, toJson, type LocalizedText } from '../shared/util';

type Args = Record<string, unknown>;
type Event = AppSyncResolverEvent<Args>;

const cognito = new CognitoIdentityProviderClient();
const userPoolId = () => (env as unknown as Record<string, string>).AMPLIFY_AUTH_USERPOOL_ID;

const DEFAULT_HOURS = {
  0: { open: true, from: '09:00', to: '21:00' },
  1: { open: true, from: '09:00', to: '21:00' },
  2: { open: true, from: '09:00', to: '21:00' },
  3: { open: true, from: '09:00', to: '21:00' },
  4: { open: true, from: '09:00', to: '21:00' },
  5: { open: true, from: '14:00', to: '22:00' },
  6: { open: true, from: '09:00', to: '21:00' },
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');

/** Random permanent password so the owner account is CONFIRMED (owners sign in with SMS OTP, never with this). */
const randomPassword = () => {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*'];
  const bytes = randomBytes(24);
  let out = '';
  for (let i = 0; i < 24; i++) {
    const set = sets[i % sets.length];
    out += set[bytes[i] % set.length];
  }
  return out;
};

const requireAdmin = (event: Event) => {
  const id = identityOf(event);
  if (!id.sub || !id.isAdmin) throw new ApiError('FORBIDDEN');
  return id.sub;
};

/* ---------- adminCreateCompany ---------- */
const adminCreateCompany = async (client: DataClient, event: Event) => {
  const adminSub = requireAdmin(event);
  const input = jsonArg<AdminCreateCompanyInput>(event.arguments.input);
  const ownerPhone = normalizePhone(input.ownerPhone);
  if (!ownerPhone) throw new ApiError('INVALID_PHONE');
  if (!input.categoryId || !input.name?.ar || !input.area) throw new ApiError('INVALID_INPUT');
  const existing = await client.models.UserProfile.listUserProfilesByPhoneKey({ phoneKey: ownerPhone }, { limit: 1 });
  if (existing.data?.length) throw new ApiError('PHONE_EXISTS');

  let sub: string;
  try {
    const created = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId(),
        Username: ownerPhone,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'phone_number', Value: ownerPhone },
          { Name: 'phone_number_verified', Value: 'true' },
          { Name: 'name', Value: input.ownerName || input.name.ar },
          ...(input.ownerEmail ? [{ Name: 'email', Value: input.ownerEmail }, { Name: 'email_verified', Value: 'true' }] : []),
        ],
      }),
    );
    sub = created.User?.Attributes?.find((a) => a.Name === 'sub')?.Value ?? '';
  } catch (e) {
    if ((e as { name?: string }).name === 'UsernameExistsException') throw new ApiError('PHONE_EXISTS');
    throw e;
  }
  if (!sub) throw new ApiError('USER_CREATE_FAILED');
  await cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: userPoolId(), Username: ownerPhone, Password: randomPassword(), Permanent: true }));
  await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId(), Username: ownerPhone, GroupName: 'COMPANIES' }));

  const companyId = newId();
  const name: LocalizedText = { ar: input.name.ar, en: input.name.en || input.name.ar };
  const company = unwrap(
    await client.models.Company.create({
      id: companyId,
      slug: slugify(name.en) || companyId,
      categoryId: input.categoryId,
      subcategoryIds: input.subcategoryIds ?? [],
      name,
      tagline: null,
      description: { ar: input.description?.ar ?? '', en: input.description?.en || input.description?.ar || '' },
      logoUrl: input.logoUrl ?? null,
      coverUrl: null,
      galleryUrls: [],
      area: input.area,
      address: { ar: input.address?.ar ?? '', en: input.address?.en || input.address?.ar || '' },
      location: input.location,
      phone: normalizePhone(input.phone) ?? ownerPhone,
      whatsapp: input.whatsapp ? normalizePhone(input.whatsapp) : ownerPhone,
      email: input.ownerEmail ?? null,
      serviceMode: input.serviceMode,
      offersSubscriptions: input.offersSubscriptions,
      hasStaff: false,
      audience: input.audience,
      openingHours: toJson(DEFAULT_HOURS),
      amenities: [],
      tags: ['new'],
      acceptsInsurance: [],
      ratingAvg: 0,
      ratingCount: 0,
      bookingCount: 0,
      staffCount: 0,
      priceFrom: null,
      isActive: false,
      isVerified: false,
      isFeatured: false,
      ownerUserId: sub,
      ownerPhone,
      ownerEmail: input.ownerEmail ?? null,
      completion: toJson({ location: true, hours: true, catalog: false, media: Boolean(input.logoUrl) }),
      owner: sub,
    }),
    'company',
  );
  await client.models.UserProfile.create({ id: sub, owner: sub, role: 'company', name: input.ownerName || name.ar, phone: ownerPhone, phoneKey: ownerPhone, email: input.ownerEmail ?? null, avatarUrl: null, language: 'ar', favorites: [], addresses: toJson([]), companyId });
  const admin = (await client.models.UserProfile.get({ id: adminSub })).data;
  await logActivity(client, { actorId: adminSub, actorName: admin?.name ?? 'OneQ', companyId, companyName: name, action: 'COMPANY_CREATED', summary: { ar: `تم إنشاء شركة ${name.ar}`, en: `${name.en} created` } });
  return { company, ownerUsername: ownerPhone };
};

/* ---------- broadcastNotification ---------- */
const broadcastNotification = async (client: DataClient, event: Event) => {
  requireAdmin(event);
  const input = jsonArg<{ title: LocalizedText; body: LocalizedText; route?: string | null }>(event.arguments.input);
  if (!input.title?.ar || !input.body?.ar) throw new ApiError('INVALID_INPUT');
  await notifyRole(client, 'customer', { type: 'SYSTEM', title: { ar: input.title.ar, en: input.title.en || input.title.ar }, body: { ar: input.body.ar, en: input.body.en || input.body.ar }, route: input.route ?? null });
  return { ok: true };
};

export const handler = async (event: Event) => {
  const client = await getClient(env);
  const field = fieldNameOf(event);
  switch (field) {
    case 'adminCreateCompany':
      return adminCreateCompany(client, event);
    case 'broadcastNotification':
      return broadcastNotification(client, event);
    default:
      throw new ApiError('UNKNOWN_FIELD_' + field);
  }
};
