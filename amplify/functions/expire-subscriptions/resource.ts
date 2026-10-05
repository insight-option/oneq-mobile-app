import { defineFunction } from '@aws-amplify/backend';

/** Daily: expires finished subscriptions and reminds customers 3 days before the end date. */
export const expireSubscriptions = defineFunction({
  name: 'expire-subscriptions',
  entry: './handler.ts',
  resourceGroupName: 'data',
  runtime: 22,
  timeoutSeconds: 300,
  memoryMB: 1024,
  schedule: 'every day',
});
