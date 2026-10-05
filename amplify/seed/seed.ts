/**
 * Sandbox seed — run with `npx ampx sandbox seed` after `npx ampx sandbox` has produced amplify_outputs.json.
 *
 * 1. creates the platform admin (email + password, group ADMINS) — override with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * 2. inserts the service categories + subcategories used by the app (idempotent, matched by slug)
 * 3. optionally creates a demo company whose owner signs in by SMS OTP — set SEED_COMPANY_OWNER_PHONE=+974XXXXXXXX
 *    (while the AWS account is in the SNS SMS sandbox the number must be verified in the SNS console first)
 */
import { readFile } from 'node:fs/promises';
import { Amplify } from 'aws-amplify';
import { signOut } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { addToUserGroup, createAndSignUpUser, signInUser } from '@aws-amplify/seed';
import type { Schema } from '../data/resource';
import { CATEGORIES } from '../../src/data/mock/seed/categories';

const outputs = JSON.parse(await readFile(new URL('../../amplify_outputs.json', import.meta.url), 'utf8')) as Parameters<typeof Amplify.configure>[0];
Amplify.configure(outputs);
const client = generateClient<Schema>();

const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@oneq.qa').toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'OneQ@2026';

/* ---------- 1. admin account ---------- */
try {
  await createAndSignUpUser({ username: adminEmail, password: adminPassword, signInFlow: 'Password', signInAfterCreation: false, userAttributes: { email: adminEmail, name: 'إدارة OneQ' } });
  await addToUserGroup({ username: adminEmail }, 'ADMINS');
  console.log(`admin created: ${adminEmail}`);
} catch (e) {
  console.log(`admin not created (already exists?): ${(e as Error).message}`);
}
const signedIn = await signInUser({ username: adminEmail, password: adminPassword, signInFlow: 'Password' });
if (!signedIn) throw new Error('admin sign-in failed — check SEED_ADMIN_PASSWORD');

/* ---------- 2. categories ---------- */
const existing = await client.models.Category.list({ limit: 200 });
const bySlug = new Set((existing.data ?? []).map((c) => c.slug));
for (const c of CATEGORIES) {
  if (bySlug.has(c.slug)) continue;
  const res = await client.models.Category.create({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    color: c.color,
    imageUrl: c.imageUrl ?? null,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    requiresAudience: Boolean(c.requiresAudience),
    subcategories: JSON.stringify(c.subcategories.map((s) => ({ id: s.id, slug: s.slug, name: s.name, icon: s.icon, sortOrder: s.sortOrder }))),
  });
  if (res.errors?.length) console.error('category failed', c.slug, res.errors[0].message);
  else console.log(`category created: ${c.slug}`);
}

/* ---------- 3. optional demo company ---------- */
const ownerPhone = process.env.SEED_COMPANY_OWNER_PHONE;
if (ownerPhone) {
  const res = await client.mutations.adminCreateCompany({
    input: JSON.stringify({
      categoryId: 'cat_salons',
      subcategoryIds: ['sub_hair', 'sub_makeup'],
      name: { ar: 'دار الجوري للتجميل', en: 'Dar Al Jouri Beauty' },
      description: { ar: 'صالون تجميل نسائي راقٍ في السد يقدم خدمات الشعر والمكياج والعناية بالبشرة.', en: 'A premium ladies salon in Al Sadd offering hair, makeup and skincare.' },
      ownerName: 'نورة الجوري',
      ownerPhone,
      ownerEmail: null,
      phone: ownerPhone,
      whatsapp: ownerPhone,
      area: 'alsadd',
      address: { ar: 'الدوحة - شارع السد، مبنى 14', en: 'Doha - Al Sadd Street, Building 14' },
      location: { lat: 25.2825, lng: 51.5102 },
      serviceMode: 'BOTH',
      offersSubscriptions: true,
      audience: 'women',
      logoUrl: null,
    }),
  });
  if (res.errors?.length) console.error('demo company failed', res.errors[0].message);
  else console.log(`demo company created for ${ownerPhone}`);
}

await signOut();
console.log('seed complete');
