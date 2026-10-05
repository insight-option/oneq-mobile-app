/**
 * Amplify bootstrap. `amplify_outputs.json` is produced by `npx ampx sandbox` / `ampx pipeline-deploy` and is
 * git-ignored; the app keeps running in mock mode when it is missing (see src/data/index.ts).
 */
import { Amplify } from 'aws-amplify';

export interface AmplifyOutputsInfo {
  bucketName?: string;
  region?: string;
}

let configured = false;
let info: AmplifyOutputsInfo = {};

export const configureAmplify = (): boolean => {
  if (configured) return true;
  try {
    const outputs = require('../../amplify_outputs.json') as Parameters<typeof Amplify.configure>[0] & { storage?: { bucket_name?: string; aws_region?: string } };
    Amplify.configure(outputs);
    info = { bucketName: outputs.storage?.bucket_name, region: outputs.storage?.aws_region };
    configured = true;
  } catch (e) {
    console.warn('[amplify] amplify_outputs.json not found — Amplify is not configured', e);
  }
  return configured;
};

export const amplifyInfo = (): AmplifyOutputsInfo => info;
export const isAmplifyConfigured = () => configured;
