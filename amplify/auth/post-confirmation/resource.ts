import { defineFunction } from '@aws-amplify/backend';

/** Runs after a customer confirms sign-up: adds them to CUSTOMERS and creates their profile + loyalty account. */
export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  entry: './handler.ts',
  resourceGroupName: 'auth',
  runtime: 22,
  timeoutSeconds: 30,
  environment: { GROUP_NAME: 'CUSTOMERS', WELCOME_POINTS: '50' },
});
