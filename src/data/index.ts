/**
 * Repository singleton + data-mode selection.
 *  - EXPO_PUBLIC_DATA_MODE=mock     → seeded offline repository (default when no amplify_outputs.json)
 *  - EXPO_PUBLIC_DATA_MODE=amplify  → AppSync / Cognito / S3 (requires amplify_outputs.json from `npx ampx sandbox`)
 */
import type { OneQRepository } from './repository';

export type DataMode = 'mock' | 'amplify';

let outputsPresent = false;
try {
  // Metro resolves this statically; the file is git-ignored and only exists after a sandbox/deploy.
  // a partial/placeholder file (written by an interrupted deploy) must not switch the app to amplify mode
  const outputs = require('../../amplify_outputs.json') as { auth?: unknown; data?: unknown } | undefined;
  outputsPresent = Boolean(outputs && outputs.auth && outputs.data);
} catch {
  outputsPresent = false;
}

const envMode = process.env.EXPO_PUBLIC_DATA_MODE as DataMode | undefined;
export const DATA_MODE: DataMode = envMode === 'mock' || envMode === 'amplify' ? envMode : outputsPresent ? 'amplify' : 'mock';

/** kept on globalThis so a Fast Refresh re-evaluation of this module never creates a second, un-initialised repository */
const holder = globalThis as unknown as { __oneqRepo?: OneQRepository };

export const getRepo = (): OneQRepository => {
  if (holder.__oneqRepo) return holder.__oneqRepo;
  let created: OneQRepository;
  if (DATA_MODE === 'amplify' && outputsPresent) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAmplifyRepository } = require('./amplify') as typeof import('./amplify');
    created = createAmplifyRepository();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMockRepository } = require('./mock') as typeof import('./mock');
    created = createMockRepository();
  }
  holder.__oneqRepo = created;
  return created;
};

/** Convenience accessor: `repo.catalog.listCategories()` */
export const repo: OneQRepository = new Proxy({} as OneQRepository, {
  get(_target, prop: keyof OneQRepository) {
    return getRepo()[prop];
  },
});

export * from './repository';
export { queryKeys } from './keys';
