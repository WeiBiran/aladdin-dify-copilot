import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('artifacts', { recursive: true });
const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, 'pack', '--pack-destination', 'artifacts'],
  { stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
