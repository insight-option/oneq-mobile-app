import type { AppSyncResolverEvent } from 'aws-lambda';
import { AdminAddUserToGroupCommand, AdminCreateUserCommand, AdminDeleteUserCommand, AdminSetUserPasswordCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
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

  const ownerEmail = input.ownerEmail?.trim().toLowerCase() || null;
  let sub: string;
  try {
    // With an e-mail address Cognito sends the invitation itself (template in amplify/backend.ts): username + temporary
    // password; the app then forces a new password on the first e-mail login. Phone OTP login works either way.
    const created = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId(),
        Username: ownerPhone,
        ...(ownerEmail ? { DesiredDeliveryMediums: ['EMAIL'] } : { MessageAction: 'SUPPRESS' }),
        UserAttributes: [
          { Name: 'phone_number', Value: ownerPhone },
          { Name: 'phone_number_verified', Value: 'true' },
          { Name: 'name', Value: input.ownerName || input.name.ar },
          ...(ownerEmail ? [{ Name: 'email', Value: ownerEmail }, { Name: 'email_verified', Value: 'true' }] : []),
        ],
      }),
    );
    sub = created.User?.Attributes?.find((a) => a.Name === 'sub')?.Value ?? '';
  } catch (e) {
    if ((e as { name?: string }).name === 'UsernameExistsException') throw new ApiError('PHONE_EXISTS');
    throw e;
  }
  if (!sub) throw new ApiError('USER_CREATE_FAILED');
  // no e-mail → nobody receives the temporary password, so confirm the account with a random permanent one (OTP-only login)
  if (!ownerEmail) await cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: userPoolId(), Username: ownerPhone, Password: randomPassword(), Permanent: true }));
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

/* ---------- adminDeleteCompany ---------- */
interface PagedList<T> {
  data?: T[] | null;
  nextToken?: string | null;
}
type ListByCompany<T> = (args: { companyId: string }, opts?: { limit?: number; nextToken?: string | null }) => Promise<PagedList<T>>;

/** Deletes every row of a company-scoped model (services, products, staff…). */
const deleteAllByCompany = async <T extends { id: string }>(list: ListByCompany<T>, remove: (id: string) => Promise<unknown>, companyId: string): Promise<number> => {
  let token: string | null | undefined;
  let count = 0;
  do {
    const page = await list({ companyId }, { limit: 200, nextToken: token });
    for (const row of page.data ?? []) {
      await remove(row.id);
      count += 1;
    }
    token = page.nextToken;
  } while (token);
  return count;
};

const adminDeleteCompany = async (client: DataClient, event: Event) => {
  const adminSub = requireAdmin(event);
  const companyId = String(event.arguments.companyId ?? '');
  const company = (await client.models.Company.get({ id: companyId })).data;
  if (!company) throw new ApiError('NOT_FOUND');
  const m = client.models;
  // catalogue + staff go with the company; bookings and reviews stay as history (they carry the company name)
  await deleteAllByCompany(m.Service.listServicesByCompany as unknown as ListByCompany<{ id: string }>, (id) => m.Service.delete({ id }), companyId);
  await deleteAllByCompany(m.Product.listProductsByCompany as unknown as ListByCompany<{ id: string }>, (id) => m.Product.delete({ id }), companyId);
  await deleteAllByCompany(m.Staff.listStaffByCompany as unknown as ListByCompany<{ id: string }>, (id) => m.Staff.delete({ id }), companyId);
  await m.Company.delete({ id: companyId });
  // the owner account is removed so the phone number / e-mail can be used for a new company
  if (company.ownerUserId) await m.UserProfile.delete({ id: company.ownerUserId }).catch((e) => console.warn('owner profile delete', e));
  if (company.ownerPhone) {
    await cognito.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId(), Username: company.ownerPhone })).catch((e) => {
      if ((e as { name?: string }).name !== 'UserNotFoundException') console.warn('owner user delete', e);
    });
  }
  const admin = (await client.models.UserProfile.get({ id: adminSub })).data;
  const name: LocalizedText = { ar: company.name?.ar ?? '', en: company.name?.en ?? company.name?.ar ?? '' };
  await logActivity(client, { actorId: adminSub, actorName: admin?.name ?? 'OneQ', companyId, companyName: name, action: 'COMPANY_DELETED', summary: { ar: `تم حذف شركة ${name.ar}`, en: `${name.en} deleted` } });
  return { ok: true };
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
    case 'adminDeleteCompany':
      return adminDeleteCompany(client, event);
    default:
      throw new ApiError('UNKNOWN_FIELD_' + field);
  }
};
