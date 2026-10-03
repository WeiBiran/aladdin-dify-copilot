import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
const target =
  process.platform === 'win32' ? 'win32-' + process.arch : process.platform + '-' + process.arch;
await mkdir('artifacts', { recursive: true });
execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/stage-runtime.mjs'], { stdio: 'inherit' });
execFileSync(
  process.execPath,
  [
    'node_modules/@vscode/vsce/vsce',
    'package',
    '--no-dependencies',
    '--allow-missing-repository',
    '--no-rewrite-relative-links',
    '--out',
    'artifacts/',
    '--target',
    target,
  ],
  { stdio: 'inherit' },
);
