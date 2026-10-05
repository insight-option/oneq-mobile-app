/**
 * Verifies that package-lock.json satisfies `npm ci` exactly as Amplify Hosting / EAS run it — in a scratch
 * directory, so node_modules is untouched. Run it after any `npm install` / `npx expo install` before pushing:
 *
 *   npm run lock:check
 *
 * Background: the lock is generated with legacy-peer-deps (see .npmrc) and npm has twice dropped nested
 * exact-pinned entries (e.g. @opentelemetry/core@2.0.0 under @aws-amplify/data-construct) during later installs,
 * which only surfaces as "Missing … from lock file" in CI. `npm install --package-lock-only --legacy-peer-deps`
 * repairs it.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'oneq-lock-check-'));
try {
  for (const file of ['package.json', 'package-lock.json', '.npmrc']) {
    if (existsSync(join(root, file))) copyFileSync(join(root, file), join(dir, file));
  }
  // one command string (npm is a .cmd shim on Windows, which needs a shell; a string avoids Node's args+shell warning)
  const res = spawnSync(`npm ci --dry-run --ignore-scripts --no-audit --no-fund --cache "${join(dir, '.npm')}"`, { cwd: dir, encoding: 'utf8', shell: true });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  if (res.status !== 0) {
    console.error(out.split('\n').filter((l) => /Missing|EUSAGE|ERESOLVE|npm error/.test(l)).join('\n') || out);
    console.error('\npackage-lock.json is out of sync with package.json. Repair with:\n  npm install --package-lock-only --legacy-peer-deps\n');
    process.exit(1);
  }
  console.log('package-lock.json is in sync (npm ci dry run passed).');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
