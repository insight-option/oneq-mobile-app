import { defineFunction } from '@aws-amplify/backend';

/** lookupRecipient · sendGift · claimGift (WhatsApp Cloud API when /oneq/whatsapp/* SSM parameters exist) */
export const giftsFn = defineFunction({
  name: 'gifts',
  entry: './handler.ts',
  resourceGroupName: 'data',
  runtime: 22,
  timeoutSeconds: 30,
  memoryMB: 1024,
  environment: { WHATSAPP_SSM_PREFIX: '/oneq/whatsapp', APP_LINK: 'https://oneq.qa/app' },
});
