import { build } from 'esbuild';
import { rm, chmod } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/web/cli.ts'],
  outfile: 'dist/cli.mjs',
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: { js: '#!/usr/bin/env node' },
});
await build({
  entryPoints: ['src/ui/client.ts'],
  outfile: 'dist/webview.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
});
await build({
  entryPoints: ['src/web/browser.ts'],
  outfile: 'dist/browser.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
});
await chmod('dist/cli.mjs', 0o755);
