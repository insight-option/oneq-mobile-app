import { defineFunction } from '@aws-amplify/backend';

/** DynamoDB stream consumer for Service/Product/Staff/Company: activity feed + customer/admin notifications. */
export const catalogStream = defineFunction({
  name: 'catalog-stream',
  entry: './handler.ts',
  resourceGroupName: 'data',
  runtime: 22,
  timeoutSeconds: 120,
  memoryMB: 1024,
});
