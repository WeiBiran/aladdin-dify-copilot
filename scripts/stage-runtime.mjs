import { copyFile, chmod, mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
const os =
  process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
const pkg = `opencode-${os}-${process.arch}`;
const name = process.platform === 'win32' ? 'opencode.exe' : 'opencode';
await mkdir('runtime', { recursive: true });
const temporary = path.join('runtime', name + '.' + process.pid + '.tmp');
await copyFile(path.join('node_modules', pkg, 'bin', name), temporary);
await chmod(temporary, 0o755);
await rename(temporary, path.join('runtime', name));
await writeFile('runtime/LICENSE.opencode', await readFile('node_modules/opencode-ai/LICENSE'));
console.log(`Staged ${pkg} 1.18.34`);
