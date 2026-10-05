/**
 * Seeds a deployed branch environment (the production user pool + API) — the counterpart of `npx ampx sandbox seed`,
 * which only targets personal sandboxes. Run it once after the first successful Amplify Hosting build:
 *
 *   npx ampx generate outputs --branch main --app-id <APP_ID> --profile <prod-profile>   # writes amplify_outputs.json
 *   AWS_PROFILE=<prod-profile> SEED_ADMIN_PASSWORD='<strong password>' npx tsx scripts/seed-env.mts
 *
 * 1. creates the platform admin through the Cognito admin API (no e-mail is sent; SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *    with a permanent password and membership of the ADMINS group — existing admins only get their password reset
 * 2. signs in as the admin, creates the admin's profile row when missing
 * 3. inserts the service categories + subcategories (idempotent, matched by slug)
 *
 * The AWS credentials are only used for the Cognito admin calls; everything else goes through the AppSync API exactly
 * like the app. Point AMPLIFY_OUTPUTS at another outputs file to seed a different environment.
 */
import { readFile } from 'node:fs/promises';
import { AdminAddUserToGroupCommand, AdminCreateUserCommand, AdminGetUserCommand, AdminSetUserPasswordCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession, signIn, signOut } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import { CATEGORIES } from '../src/data/mock/seed/categories';

const outputsPath = process.env.AMPLIFY_OUTPUTS ? new URL(process.env.AMPLIFY_OUTPUTS, `file://${process.cwd()}/`) : new URL('../amplify_outputs.json', import.meta.url);
const outputs = JSON.parse(await readFile(outputsPath, 'utf8')) as { auth: { user_pool_id: string; aws_region: string }; data: { url: string } } & Parameters<typeof Amplify.configure>[0];
Amplify.configure(outputs);
const client = generateClient<Schema>();
const cognito = new CognitoIdentityProviderClient({ region: outputs.auth.aws_region });

const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@oneq.qa').toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'OneQ@2026';
if (!process.env.SEED_ADMIN_PASSWORD) console.warn('SEED_ADMIN_PASSWORD not set — using the development default; set a strong password for production.');
console.log(`target: pool ${outputs.auth.user_pool_id} (${outputs.auth.aws_region}), api ${outputs.data.url}`);

/* ---------- 1. admin account ---------- */
const pool = outputs.auth.user_pool_id;
let adminExisted = true;
try {
  await cognito.send(new AdminGetUserCommand({ UserPoolId: pool, Username: adminEmail }));
} catch {
  adminExisted = false;
  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: pool,
      Username: adminEmail,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: adminEmail },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: 'إدارة OneQ' },
      ],
    }),
  );
}
await cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: pool, Username: adminEmail, Password: adminPassword, Permanent: true }));
await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: pool, Username: adminEmail, GroupName: 'ADMINS' }));
console.log(`admin ${adminExisted ? 'updated' : 'created'}: ${adminEmail} (group ADMINS)`);

/* ---------- 2. admin sign-in + profile ---------- */
await signOut().catch(() => undefined);
const { nextStep } = await signIn({ username: adminEmail, password: adminPassword });
if (nextStep.signInStep !== 'DONE') throw new Error(`admin sign-in step ${nextStep.signInStep}`);
const session = await fetchAuthSession();
const adminSub = String(session.tokens?.idToken?.payload.sub);
const profile = await client.models.UserProfile.get({ id: adminSub });
if (!profile.data) {
  const res = await client.models.UserProfile.create({ id: adminSub, owner: adminSub, role: 'admin', name: 'إدارة OneQ', phone: null, phoneKey: null, email: adminEmail, avatarUrl: null, language: 'ar', favorites: [], addresses: JSON.stringify([]), companyId: null });
  if (res.errors?.length) throw new Error(`admin profile failed: ${res.errors[0].message}`);
  console.log('admin profile created');
}

/* ---------- 3. categories ---------- */
const existing = await client.models.Category.list({ limit: 200 });
if (existing.errors?.length) throw new Error(`listing categories failed: ${existing.errors[0].message}`);
const bySlug = new Set((existing.data ?? []).map((c) => c.slug));
let created = 0;
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
  if (res.errors?.length) console.error(`category ${c.slug} failed: ${res.errors[0].message}`);
  else created += 1;
}
console.log(`categories: ${created} created, ${CATEGORIES.length - created} already present`);

await signOut();
console.log('seed complete');
