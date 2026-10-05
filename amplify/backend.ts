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
