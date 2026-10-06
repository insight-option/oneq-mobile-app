import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { EventSourceMapping, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { adminFn } from './functions/admin/resource';
import { bookingsFn } from './functions/bookings/resource';
import { catalogStream } from './functions/catalog-stream/resource';
import { expireSubscriptions } from './functions/expire-subscriptions/resource';
import { giftsFn } from './functions/gifts/resource';
import { storage } from './storage/resource';

const backend = defineBackend({ auth, data, storage, bookingsFn, giftsFn, adminFn, catalogStream, expireSubscriptions });

/* ---------- Catalogue change feed: Service / Product / Staff / Company table streams → catalog-stream ---------- */
const streamedTables = ['Service', 'Product', 'Staff', 'Company'] as const;
const firstTable = backend.data.resources.tables[streamedTables[0]];
const streamPolicy = new Policy(Stack.of(firstTable), 'CatalogStreamPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:ListStreams'],
      resources: ['*'],
    }),
  ],
});
backend.catalogStream.resources.lambda.role?.attachInlinePolicy(streamPolicy);
for (const name of streamedTables) {
  const table = backend.data.resources.tables[name];
  const mapping = new EventSourceMapping(Stack.of(table), `CatalogStream${name}Mapping`, {
    target: backend.catalogStream.resources.lambda,
    eventSourceArn: table.tableStreamArn,
    startingPosition: StartingPosition.LATEST,
    batchSize: 25,
    retryAttempts: 2,
  });
  mapping.node.addDependency(streamPolicy);
}

/* ---------- WhatsApp Cloud API credentials are read at runtime from SSM (/oneq/whatsapp/token, /oneq/whatsapp/phoneId) ---------- */
const giftsStack = Stack.of(backend.giftsFn.resources.lambda);
backend.giftsFn.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['ssm:GetParameter', 'ssm:GetParameters'],
    resources: [`arn:aws:ssm:${giftsStack.region}:${giftsStack.account}:parameter/oneq/*`],
  }),
);

/* ---------- Cognito: keep guest (identity pool unauthenticated) access for the public catalogue ---------- */
backend.auth.resources.cfnResources.cfnIdentityPool.allowUnauthenticatedIdentities = true;

/*
 * Cognito: pin the attribute schema with explicit data types. CloudFormation rejects any later update of a user pool
 * whose schema entries have no AttributeDataType ("Invalid AttributeDataType input"), which would block every future
 * auth-stack change. Keep this list in sync with `userAttributes` in auth/resource.ts.
 */
backend.auth.resources.cfnResources.cfnUserPool.schema = [
  { name: 'email', attributeDataType: 'String', mutable: true, required: false },
  { name: 'phone_number', attributeDataType: 'String', mutable: true, required: false },
  { name: 'name', attributeDataType: 'String', mutable: true, required: false },
];

/*
 * Cognito: invitation sent to company owners created from the admin workspace (AdminCreateUser with an e-mail, and
 * `adminResendInvitation`). `{username}` is the owner's phone number (the Cognito username) and `{####}` the temporary
 * password — which only exists when the admin function supplies one (see handler.ts: in a pool with OTP sign-in a user
 * created without a password is CONFIRMED and the placeholder is sent literally). Each placeholder appears exactly once,
 * in a credentials block shared by the Arabic and English text. Self sign-up must stay enabled (customers register
 * themselves).
 */
const INVITE_EMAIL_HTML = [
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;font-size:15px;line-height:1.7">',
  '<div style="background:#0f766e;color:#ffffff;padding:16px 24px;border-radius:14px 14px 0 0;font-size:22px;font-weight:bold;text-align:center;letter-spacing:.5px">OneQ</div>',
  '<div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 14px 14px;padding:22px 24px">',
  '<p dir="rtl" style="margin:0 0 10px;text-align:right">أهلاً بك في <b>OneQ</b> — تم إنشاء حساب شركتك. هذه بيانات الدخول:</p>',
  '<p dir="ltr" style="margin:0 0 18px;text-align:left;color:#4b5563;font-size:14px">Welcome to <b>OneQ</b> — your company account is ready. Your login details:</p>',
  '<table dir="ltr" role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f3f4f6;border-radius:12px">',
  '<tr><td style="padding:14px 18px 2px;color:#6b7280;font-size:13px;text-align:center">اسم المستخدم (رقم الجوال) · Username (phone number)</td></tr>',
  '<tr><td style="padding:0 18px 12px;font-size:20px;font-weight:bold;text-align:center;letter-spacing:.5px">{username}</td></tr>',
  '<tr><td style="padding:0 18px 2px;color:#6b7280;font-size:13px;text-align:center">كلمة المرور المؤقتة · Temporary password</td></tr>',
  '<tr><td style="padding:0 18px 16px;font-size:20px;font-weight:bold;text-align:center;font-family:Consolas,Menlo,monospace;letter-spacing:1px">{####}</td></tr>',
  '</table>',
  '<p dir="rtl" style="margin:18px 0 10px;text-align:right">في التطبيق اختر «كلمة المرور»، ثم أدخل رقم جوالك (اسم المستخدم أعلاه) وكلمة المرور المؤقتة واختر كلمة مرورك الجديدة. يمكنك أيضًا الدخول برقم جوالك عبر رمز التحقق. كلمة المرور المؤقتة صالحة لمدة 30 يومًا.</p>',
  '<p dir="ltr" style="margin:0;text-align:left;color:#4b5563;font-size:14px">In the app choose “Password”, enter your phone number (the username above) and this temporary password, then choose your new password. You can also sign in with your phone number and the SMS code. The temporary password is valid for 30 days.</p>',
  '</div>',
  '</div>',
].join('');

const cfnUserPool = backend.auth.resources.cfnResources.cfnUserPool;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: false,
  inviteMessageTemplate: {
    emailSubject: 'OneQ — بيانات دخول شركتك | Your OneQ company account',
    emailMessage: INVITE_EMAIL_HTML,
    smsMessage: 'OneQ: اسم المستخدم {username} وكلمة المرور المؤقتة {####}',
  },
};
// owners often open the invitation days later; the Cognito default (7 days) left them with an expired temporary password
cfnUserPool.addPropertyOverride('Policies.PasswordPolicy.TemporaryPasswordValidityDays', 30);
