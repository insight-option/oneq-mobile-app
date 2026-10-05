import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';
import { adminFn } from '../functions/admin/resource';

/**
 * One Cognito user pool for the three workspaces:
 * - customers: phone number + SMS OTP (passwordless, `USER_AUTH` flow with `SMS_OTP`), self sign-up
 * - companies: created by an admin (phone number is the username); they sign in with SMS OTP as well
 * - admins: email + password (created in the Cognito console or with `scripts/seed`), group ADMINS
 *
 * Groups decide the landing workspace (`cognito:groups` claim): ADMINS → admin, COMPANIES → company, else customer.
 * Sign-in options are immutable once the pool exists — change them only on a fresh sandbox.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    phone: {
      otpLogin: true,
      verificationMessage: (code) => `رمز الدخول إلى OneQ: ${code()} — OneQ sign-in code`,
    },
  },
  userAttributes: {
    email: { required: false, mutable: true },
    phoneNumber: { required: false, mutable: true },
    fullname: { required: false, mutable: true },
  },
  groups: ['ADMINS', 'COMPANIES', 'CUSTOMERS'],
  triggers: { postConfirmation },
  access: (allow) => [
    allow.resource(postConfirmation).to(['addUserToGroup', 'listGroupsForUser']),
    allow.resource(adminFn).to(['createUser', 'addUserToGroup', 'setUserPassword', 'getUser', 'updateUserAttributes', 'listGroupsForUser']),
  ],
});
