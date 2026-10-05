import { defineFunction } from '@aws-amplify/backend';

/** adminCreateCompany (Cognito user + COMPANIES group + Company row) · broadcastNotification */
export const adminFn = defineFunction({
  name: 'admin',
  entry: './handler.ts',
  resourceGroupName: 'auth',
  runtime: 22,
  timeoutSeconds: 60,
  memoryMB: 1024,
});
