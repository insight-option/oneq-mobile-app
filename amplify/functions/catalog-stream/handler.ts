import type { DynamoDBStreamHandler } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

type Image = Parameters<typeof unmarshall>[0];
import { env } from '$amplify/env/catalog-stream';
import { getClient, type DataClient } from '../shared/client';
import { logActivity, notifyRole, type ActivityAction, type NotifyInput } from '../shared/notify';
import type { LocalizedText } from '../shared/util';

type Table = 'Service' | 'Product' | 'Staff' | 'Company';
type Row = Record<string, unknown> & { id: string; companyId?: string; name?: LocalizedText };

/** Fields whose change is worth an activity entry / notification (counters and ratings are ignored). */
const TRACKED: Record<Table, string[]> = {
  Service: ['name', 'description', 'price', 'offerPrice', 'isOffer', 'offerEndsAt', 'imageUrl', 'isActive', 'allowSubscription', 'subscriptionPlans', 'durationMin', 'requiresStaff'],
  Product: ['name', 'description', 'price', 'offerPrice', 'isOffer', 'offerEndsAt', 'imageUrls', 'isActive', 'stock'],
  Staff: ['name', 'title', 'bio', 'photoUrl', 'specialties', 'isAvailable', 'availability', 'pricePerSession', 'isActive', 'experienceYears'],
  Company: ['name', 'tagline', 'description', 'logoUrl', 'coverUrl', 'galleryUrls', 'area', 'address', 'location', 'phone', 'whatsapp', 'email', 'serviceMode', 'offersSubscriptions', 'hasStaff', 'audience', 'openingHours', 'amenities', 'subcategoryIds', 'isActive'],
};

const tableOf = (arn?: string): Table | null => {
  const m = arn?.match(/table\/(Service|Product|Staff|Company)-/);
  return (m?.[1] as Table | undefined) ?? null;
};
const lt = (t: LocalizedText | null | undefined): LocalizedText => ({ ar: t?.ar ?? '', en: t?.en ?? t?.ar ?? '' });
const money = (n: unknown) => `${Math.round(Number(n) || 0)} ر.ق`;

interface Change {
  table: Table;
  eventName: string;
  row: Row;
  prev: Row | null;
  changed: string[];
}

const describe = (c: Change, company: Row): { action: ActivityAction; summary: LocalizedText; customers?: NotifyInput; admins: NotifyInput } | null => {
  const companyName = lt(company.name);
  const itemName = lt(c.row.name);
  const route = `/(customer)/company/${company.id}`;
  const adminRoute = `/(admin)/company/${company.id}`;
  const becameOffer = c.table !== 'Staff' && c.table !== 'Company' && c.eventName === 'MODIFY' && !c.prev?.isOffer && Boolean(c.row.isOffer);
  const lostOffer = c.table !== 'Staff' && c.table !== 'Company' && c.eventName === 'MODIFY' && Boolean(c.prev?.isOffer) && !c.row.isOffer;
  const live = Boolean(company.isActive) && c.row.isActive !== false;

  if (c.table === 'Company') {
    return { action: 'PROFILE_UPDATED', summary: { ar: `${companyName.ar} حدّثت ملفها التجاري`, en: `${companyName.en} updated its business profile` }, admins: { type: 'COMPANY', title: { ar: `تحديث ملف ${companyName.ar}`, en: `${companyName.en} profile updated` }, body: { ar: c.changed.join('، '), en: c.changed.join(', ') }, route: adminRoute } };
  }
  if (c.table === 'Staff') {
    const created = c.eventName === 'INSERT';
    return { action: created ? 'STAFF_CREATED' : 'STAFF_UPDATED', summary: created ? { ar: `${companyName.ar} أضافت ${itemName.ar} إلى الطاقم`, en: `${companyName.en} added ${itemName.en} to the team` } : { ar: `${companyName.ar} عدّلت بيانات ${itemName.ar}`, en: `${companyName.en} updated ${itemName.en}` }, admins: { type: 'CATALOG_UPDATED', title: { ar: created ? `موظف جديد في ${companyName.ar}` : `تعديل طاقم ${companyName.ar}`, en: created ? `New staff at ${companyName.en}` : `${companyName.en} staff updated` }, body: itemName, route: adminRoute } };
  }
  const isService = c.table === 'Service';
  if (c.eventName === 'INSERT') {
    const customers: NotifyInput | undefined = live
      ? { type: isService ? 'NEW_SERVICE' : 'NEW_PRODUCT', title: { ar: `${isService ? 'خدمة' : 'منتج'} جديد في ${companyName.ar}`, en: `New ${isService ? 'service' : 'product'} at ${companyName.en}` }, body: { ar: `${itemName.ar} بـ ${money(c.row.offerPrice ?? c.row.price)}`, en: `${itemName.en} for ${money(c.row.offerPrice ?? c.row.price)}` }, route, imageUrl: (c.row.imageUrl as string | undefined) ?? ((c.row.imageUrls as string[] | undefined)?.[0] ?? null) }
      : undefined;
    return { action: isService ? 'SERVICE_CREATED' : 'PRODUCT_CREATED', summary: { ar: `${companyName.ar} أضافت ${isService ? 'خدمة' : 'منتج'} ${itemName.ar}`, en: `${companyName.en} added ${itemName.en}` }, customers, admins: { type: 'CATALOG_UPDATED', title: { ar: `${isService ? 'خدمة' : 'منتج'} جديد: ${companyName.ar}`, en: `New ${isService ? 'service' : 'product'}: ${companyName.en}` }, body: itemName, route: adminRoute } };
  }
  if (becameOffer) {
    const customers: NotifyInput | undefined = live ? { type: 'OFFER', title: { ar: `عرض جديد من ${companyName.ar} 🔥`, en: `New offer from ${companyName.en} 🔥` }, body: { ar: `${itemName.ar} بـ ${money(c.row.offerPrice)} بدلاً من ${money(c.row.price)}`, en: `${itemName.en} for ${money(c.row.offerPrice)} instead of ${money(c.row.price)}` }, route, imageUrl: (c.row.offerImageUrl as string | undefined) ?? (c.row.imageUrl as string | undefined) ?? ((c.row.imageUrls as string[] | undefined)?.[0] ?? null) } : undefined;
    return { action: 'OFFER_SET', summary: { ar: `${companyName.ar} نشرت عرضًا على ${itemName.ar}`, en: `${companyName.en} published an offer on ${itemName.en}` }, customers, admins: { type: 'OFFER', title: { ar: `عرض جديد: ${companyName.ar}`, en: `New offer: ${companyName.en}` }, body: itemName, route: adminRoute } };
  }
  if (lostOffer) {
    return { action: 'OFFER_REMOVED', summary: { ar: `${companyName.ar} ألغت عرض ${itemName.ar}`, en: `${companyName.en} removed the offer on ${itemName.en}` }, admins: { type: 'CATALOG_UPDATED', title: { ar: `إلغاء عرض: ${companyName.ar}`, en: `Offer removed: ${companyName.en}` }, body: itemName, route: adminRoute } };
  }
  return { action: isService ? 'SERVICE_UPDATED' : 'PRODUCT_UPDATED', summary: { ar: `${companyName.ar} عدّلت ${itemName.ar}`, en: `${companyName.en} updated ${itemName.en}` }, admins: { type: 'CATALOG_UPDATED', title: { ar: `تعديل في ${companyName.ar}`, en: `${companyName.en} catalogue updated` }, body: { ar: `${itemName.ar}: ${c.changed.join('، ')}`, en: `${itemName.en}: ${c.changed.join(', ')}` }, route: adminRoute } };
};

const process = async (client: DataClient, c: Change) => {
  const companyId = c.table === 'Company' ? c.row.id : c.row.companyId;
  if (!companyId) return;
  const company = c.table === 'Company' ? c.row : ((await client.models.Company.get({ id: companyId })).data as unknown as Row | null);
  if (!company) return;
  const d = describe(c, company);
  if (!d) return;
  const actorId = (company.ownerUserId as string | undefined) ?? 'system';
  await logActivity(client, { actorId, actorName: lt(company.name).ar, companyId: company.id, companyName: lt(company.name), action: d.action, summary: d.summary });
  await notifyRole(client, 'admin', d.admins);
  if (d.customers) await notifyRole(client, 'customer', d.customers);
};

export const handler: DynamoDBStreamHandler = async (event) => {
  const client = await getClient(env);
  for (const record of event.Records) {
    try {
      const table = tableOf(record.eventSourceARN);
      if (!table || record.eventName === 'REMOVE' || !record.dynamodb?.NewImage) continue;
      const row = unmarshall(record.dynamodb.NewImage as Image) as Row;
      const prev = record.dynamodb.OldImage ? (unmarshall(record.dynamodb.OldImage as Image) as Row) : null;
      const changed = prev ? TRACKED[table].filter((k) => JSON.stringify(prev[k] ?? null) !== JSON.stringify(row[k] ?? null)) : TRACKED[table];
      if (record.eventName === 'MODIFY' && !changed.length) continue;
      if (table === 'Company' && record.eventName === 'INSERT') continue; // creation is logged by the admin function
      await process(client, { table, eventName: record.eventName ?? 'MODIFY', row, prev, changed });
    } catch (e) {
      console.error('catalog stream record failed', e);
    }
  }
  return { batchItemFailures: [] };
};
