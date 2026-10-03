import { build } from 'esbuild';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
await build({
  entryPoints: ['test/host.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/host-test.cjs',
  external: ['vscode'],
});
const tmp = await mkdtemp(path.join(os.tmpdir(), 'dify-vscode-'));
const project = path.join(tmp, 'project');
await mkdir(project);
const report = path.join(tmp, 'report.json');
if (process.env.DIFY_HOST_UNTRUSTED) {
  await mkdir(path.join(tmp, 'user', 'User'), { recursive: true });
  await writeFile(
    path.join(tmp, 'user', 'User', 'settings.json'),
    JSON.stringify({
      'security.workspace.trust.enabled': true,
      'security.workspace.trust.startupPrompt': 'never',
    }),
  );
}
const executable =
  process.env.VSCODE_EXECUTABLE ??
  (process.platform === 'darwin'
    ? '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
    : 'code');
let developmentPath = process.cwd();
if (process.env.DIFY_VSIX) {
  execFileSync(
    executable,
    [
      '--user-data-dir',
      path.join(tmp, 'user'),
      '--extensions-dir',
      path.join(tmp, 'extensions'),
      '--install-extension',
      path.resolve(process.env.DIFY_VSIX),
    ],
    { stdio: 'inherit' },
  );
  const installed = (await readdir(path.join(tmp, 'extensions'))).find((name) =>
    name.startsWith('aladdin.aladdin-dify-copilot-'),
  );
  if (!installed) throw new Error('Installed VSIX directory missing');
  developmentPath = path.join(tmp, 'extensions', installed);
  const binary = path.join(
    developmentPath,
    'runtime',
    process.platform === 'win32' ? 'opencode.exe' : 'opencode',
  );
  // VSIX archive permissions vary; match extension startup before executing.
  if (process.platform !== 'win32') await (await import('node:fs/promises')).chmod(binary, 0o755);
  const version = execFileSync(binary, ['--version'], { encoding: 'utf8' }).trim();
  if (version !== '1.18.34') throw new Error('Packaged OpenCode version mismatch');
}
const child = spawn(
  executable,
  [
    '--new-window',
    '--wait',
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-extensions',
    ...(process.env.DIFY_HOST_UNTRUSTED ? [] : ['--disable-workspace-trust']),
    '--user-data-dir',
    path.join(tmp, 'user'),
    '--extensions-dir',
    path.join(tmp, 'extensions'),
    '--extensionDevelopmentPath',
    developmentPath,
    '--extensionTestsPath',
    path.resolve('dist/host-test.cjs'),
    project,
  ],
  { stdio: 'inherit', env: { ...process.env, DIFY_HOST_REPORT: report } },
);
const timer = setTimeout(() => child.kill(), 45000);
const code = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', resolve);
});
clearTimeout(timer);
if (code !== 0) throw new Error(`VS Code host exit ${code}`);
console.log(
  process.env.DIFY_VSIX ? 'Installed VSIX host smoke test:' : 'Real VS Code source smoke test:',
  await readFile(report, 'utf8'),
);
