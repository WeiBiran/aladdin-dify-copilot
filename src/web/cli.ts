import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { startWebApplication } from './server';
import { runtimePath } from './runtime';

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
      port: { type: 'string', short: 'p' },
      'no-open': { type: 'boolean' },
      'data-dir': { type: 'string' },
    },
    allowPositionals: true,
  });
  if (values.help) {
    console.log(`Aladdin Dify — Wei Biran's FDE delivery toolkit (Beta)

Usage: aladdin-dify [project-directory] [options]

  --port, -p <port>   Local port (default: 8787; 0 selects a free port)
  --no-open          Print the launch link without opening a browser
  --data-dir <path>  Private state directory (default: ~/.aladdin-dify)
  --help, -h         Show this help

Dify and generation-model credentials are configured in the browser.
Node.js 22+ is required. OpenCode is installed with this package.
Stop with Ctrl+C to cancel running tasks and close the harness.`);
    return;
  }
  if (positionals.length > 1) throw new Error('Provide only one project directory.');
  const port = values.port === undefined ? 8787 : Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('Port must be an integer from 0 to 65535.');
  const app = await startWebApplication({
    projectPath: path.resolve(positionals[0] ?? process.cwd()),
    dataDir: path.resolve(values['data-dir'] ?? path.join(os.homedir(), '.aladdin-dify')),
    assetsPath: path.dirname(fileURLToPath(import.meta.url)),
    runtimePath: runtimePath(),
    port,
    log: (message) => console.log(message),
  });
  console.log(
    `\nAladdin Dify · Beta\nProject: ${path.resolve(positionals[0] ?? process.cwd())}\nOpen this private launch link:\n${app.url}\n\nKeep this terminal open. Press Ctrl+C to stop.\n`,
  );
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    void app
      .close()
      .then(() => {
        process.exitCode = 0;
      })
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  if (!values['no-open']) {
    const [command, args] =
      process.platform === 'darwin'
        ? ['open', [app.url]]
        : process.platform === 'win32'
          ? ['rundll32', ['url.dll,FileProtocolHandler', app.url]]
          : ['xdg-open', [app.url]];
    const child = spawn(command as string, args as string[], {
      stdio: 'ignore',
      detached: true,
      windowsHide: true,
    });
    child.once('error', () =>
      console.error('Browser could not be opened. Use the launch link above.'),
    );
    child.once('exit', (code) => {
      if (code) console.error('Browser could not be opened. Use the launch link above.');
    });
    child.unref();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
