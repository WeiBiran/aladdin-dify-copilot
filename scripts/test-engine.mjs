import { spawnSync } from 'node:child_process';
const r = spawnSync(
  process.execPath,
  ['node_modules/vitest/vitest.mjs', 'run', 'test/opencode.integration.test.ts'],
  { stdio: 'inherit', env: { ...process.env, RUN_ENGINE_INTEGRATION: '1' } },
);
process.exit(r.status ?? 1);
