import { createRequire } from 'node:module';
import path from 'node:path';
import { existsSync } from 'node:fs';

export function runtimePath(): string {
  const require = createRequire(import.meta.url);
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const name = `opencode-${platform}-${process.arch}`;
  try {
    const root = path.dirname(require.resolve(name + '/package.json'));
    const binary = path.join(
      root,
      'bin',
      process.platform === 'win32' ? 'opencode.exe' : 'opencode',
    );
    if (existsSync(binary)) return binary;
  } catch {
    /* Optional runtime may be omitted by the installer. */
  }
  throw new Error(
    `OpenCode runtime for ${process.platform}/${process.arch} is missing. Reinstall without --omit=optional.`,
  );
}
