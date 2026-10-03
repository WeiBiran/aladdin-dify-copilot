import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const dirs = execFileSync(npm, ['ls', '--omit=dev', '--all', '--parseable'], {
  encoding: 'utf8',
})
  .trim()
  .split(/\r?\n/)
  .slice(1);
let out =
  '# Third-party license notices\n\nThis project uses MIT. The following notices cover installed production dependencies. OpenCode and its native platform packages use their upstream MIT license and are installed through npm; their license files stay in those packages. Node templates follow pinned Dify interfaces and default structures; they do not include the Dify server implementation.\n\n本项目采用 MIT。以下保留生产依赖许可；OpenCode 和原生平台包通过 npm 安装，完整 MIT 许可保留在各自包中。节点模板根据固定版本接口整理，不包含 Dify 服务端实现。\n';
const seen = new Set();
for (const dir of dirs) {
  const p = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  const key = p.name + '@' + p.version;
  if (seen.has(key)) continue;
  seen.add(key);
  out += `\n## ${key}\n\nLicense: ${typeof p.license === 'string' ? p.license : JSON.stringify(p.license)}\n\n`;
  let found = false;
  for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'LICENCE']) {
    try {
      out +=
        '```text\n' +
        (await readFile(path.join(dir, name), 'utf8'))
          .split(/\r?\n/)
          .map((line) => line.trimEnd())
          .join('\n')
          .trim() +
        '\n```\n';
      found = true;
      break;
    } catch {}
  }
  if (!found) out += `Upstream package: https://www.npmjs.com/package/${p.name}\n`;
}
await writeFile('THIRD_PARTY_NOTICES.md', out);
console.log(`Preserved ${seen.size} production dependency notices`);
