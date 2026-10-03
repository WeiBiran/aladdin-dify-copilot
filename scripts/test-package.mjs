import { spawn } from 'node:child_process';
import { mkdtemp, rm, readdir, mkdir, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

const root = await mkdtemp(path.join(os.tmpdir(), 'aladdin-package-'));
let child;
async function run(args) {
  const process = spawn(
    globalThis.process.execPath,
    [globalThis.process.env.npm_execpath, ...args],
    { stdio: 'inherit' },
  );
  const [code] = await once(process, 'exit');
  if (code !== 0) throw new Error(`npm exited with ${code}`);
}
try {
  const packs = (await readdir('artifacts'))
    .filter((f) => f.startsWith('aladdin-dify-') && f.endsWith('.tgz'))
    .sort();
  if (!packs.length) throw new Error('Run npm run package first.');
  const pack = path.resolve('artifacts', packs.at(-1));
  // Ignore install scripts deliberately: the CLI resolves the native package directly.
  await run([
    'install',
    '--prefix',
    root,
    '--omit=dev',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    pack,
  ]);
  const project = path.join(root, 'business');
  await mkdir(project);
  const entry = path.join(root, 'node_modules', 'aladdin-dify', 'dist', 'cli.mjs');
  child = spawn(
    process.execPath,
    [entry, project, '--no-open', '--port', '0', '--data-dir', path.join(root, 'state')],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let output = '';
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Packaged server startup timed out: ' + output)),
      20000,
    );
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/\?ticket=[a-f0-9]+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('Server exited: ' + code + ' ' + output));
    });
  });
  const launch = await fetch(url, { redirect: 'manual' });
  if (launch.status !== 303) throw new Error('Launch ticket failed.');
  const cookie = launch.headers.get('set-cookie').split(';')[0];
  const origin = new URL(url).origin;
  for (const pathname of ['/', '/settings', '/browser.js', '/webview.js']) {
    const response = await fetch(origin + pathname, { headers: { cookie } });
    if (!response.ok) throw new Error('Packaged asset failed: ' + pathname);
    const content = await response.text();
    if (!content.length) throw new Error('Empty asset: ' + pathname);
  }
  const state = await fetch(origin + '/api/command', {
    method: 'POST',
    headers: { cookie, origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'getState' }),
  });
  const json = await state.json();
  if (json.result?.workspace?.path !== (await realpath(project)) || json.result?.busy !== false)
    throw new Error('Packaged state failed.');
  console.log(
    'Installed npm package: native runtime resolved, authenticated browser pages and API passed.',
  );
} finally {
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
    await exited;
    clearTimeout(timer);
  }
  await rm(root, { recursive: true, force: true });
}
