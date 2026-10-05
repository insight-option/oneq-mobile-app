import { defineStorage } from '@aws-amplify/backend';

/**
 * Media bucket. Everything lives under `public/` (company logos/covers/galleries, service & product images, staff
 * photos, customer avatars, category images) and is readable by everyone, writable by any signed-in account.
 * The client namespaces objects by purpose: public/companies/<companyId>/…, public/users/<sub>/…, public/categories/….
 * Group members do not inherit the `authenticated` rule, so every group is listed explicitly.
 */
export const storage = defineStorage({
  name: 'oneqMedia',
  access: (allow) => ({
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['ADMINS', 'COMPANIES', 'CUSTOMERS']).to(['read', 'write', 'delete']),
    ],
  }),
});
