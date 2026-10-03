import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createApplication } from '../app/service';
import { JsonStore, KeyringSecretStore } from '../app/storage';
import type { ApplicationHost, ApplicationEvent } from '../app/host';
import type { SecretStore } from '../core/types';
import { digest, redact } from '../core/util';
import { resolveLanguage, type LanguageSetting } from '../core/i18n';
import { UI_COMMANDS } from '../ui/contracts';
import { browserPage } from './page';
import { ProjectStore } from '../core/project';
import { previewPage } from './preview';

type WebEvent =
  | ApplicationEvent
  | { type: 'navigate'; path: string }
  | { type: 'folder'; path: string }
  | {
      type: 'preview';
      title: string;
      projectPath: string;
      files: { label: string; content: string }[];
    }
  | { type: 'confirm'; id: string; message: string; label: string }
  | { type: 'published'; url: string };
export interface WebOptions {
  projectPath: string;
  dataDir: string;
  assetsPath: string;
  runtimePath: string;
  port?: number;
  secrets?: SecretStore;
  log?: (message: string) => void;
}
export async function startWebApplication(options: WebOptions) {
  await fs.mkdir(path.resolve(options.dataDir), { recursive: true, mode: 0o700 });
  const dataDir = await fs.realpath(path.resolve(options.dataDir));
  const settings = await new JsonStore(path.join(dataDir, 'settings.json')).load();
  let projectPath = await fs.realpath(path.resolve(options.projectPath));
  if (!(await fs.stat(projectPath)).isDirectory())
    throw new Error('Project path must be a directory.');
  const projectStore = (directory: string) =>
    new JsonStore(path.join(dataDir, 'project-settings', digest(directory) + '.json')).load();
  let projectState = await projectStore(projectPath);
  async function rememberProject(directory: string) {
    const registered = settings.get<string[]>('workbench.projects', [])!;
    await settings.update('workbench.projects', [
      directory,
      ...registered.filter((p) => p !== directory),
    ]);
  }
  await rememberProject(projectPath);
  async function projects() {
    return Promise.all(
      settings.get<string[]>('workbench.projects', [])!.map(async (directory) => {
        const s = new ProjectStore(directory, path.join(dataDir, 'projects', digest(directory)));
        const spec = await s.spec().catch(() => undefined);
        const missing = !(await fs.stat(directory).catch(() => undefined))?.isDirectory();
        return {
          path: directory,
          name: spec?.name ?? path.basename(directory),
          mode: spec?.mode,
          missing,
        };
      }),
    );
  }
  let browserLanguage = 'en';
  let projectChanging = false;
  let closing = false;
  const ticket = randomBytes(32).toString('hex');
  const session = randomBytes(32).toString('hex');
  const created = Date.now();
  let consumed = false;
  let origin = '';
  let cookieName = '';
  const streams = new Set<ServerResponse>();
  const confirmations = new Map<
    string,
    {
      event: Extract<WebEvent, { type: 'confirm' }>;
      resolve: (allow: boolean) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  let preview: Extract<WebEvent, { type: 'preview' }> | undefined;
  function emit(event: WebEvent) {
    const message = 'data: ' + JSON.stringify(event) + '\n\n';
    for (const stream of streams) {
      if (stream.destroyed || stream.writableLength > 4 * 1024 * 1024) {
        stream.destroy();
        streams.delete(stream);
      } else {
        stream.write(message);
      }
    }
  }
  const secrets = options.secrets ?? new KeyringSecretStore(dataDir);
  const host: ApplicationHost = {
    secrets,
    globalState: settings,
    projectState: {
      get: <T>(key: string, fallback?: T) => projectState.get<T>(key, fallback as T),
      update: (key, value) => projectState.update(key, value),
    },
    config: {
      get: <T>(key: string, fallback?: T) => settings.get<T>('config.' + key, fallback as T),
      update: (key, value) => settings.update('config.' + key, value),
    },
    storagePath: dataDir,
    runtimePath: options.runtimePath,
    locale: () =>
      resolveLanguage(settings.get<LanguageSetting>('config.language', 'auto'), browserLanguage),
    project: () => ({ path: projectPath, name: path.basename(projectPath), trusted: true }),
    projects,
    emit,
    log: (text) => options.log?.(redact(text)),
    showSettings: async () => emit({ type: 'navigate', path: '/settings' }),
    showChat: async () => emit({ type: 'navigate', path: '/' }),
    selectFolder: async () => emit({ type: 'folder', path: projectPath }),
    openFile: async (file) => {
      const content = await readPreview(file);
      const next = { label: path.basename(file), content };
      const files = preview?.files.length === 2 ? [...preview.files, next] : [next];
      preview = { type: 'preview', title: path.basename(file), projectPath, files };
      emit(preview);
    },
    showDiff: async (original, candidate, title) => {
      preview = {
        type: 'preview',
        projectPath,
        title,
        files: [
          { label: 'Original · ' + path.basename(original), content: await readPreview(original) },
          {
            label: 'Candidate · ' + path.basename(candidate),
            content: await readPreview(candidate),
          },
        ],
      };
      emit(preview);
    },
    confirm: async (message, label) => {
      const id = randomBytes(16).toString('hex');
      return new Promise<boolean>((resolve) => {
        const event = { type: 'confirm' as const, id, message, label };
        const timer = setTimeout(() => {
          confirmations.delete(id);
          resolve(false);
        }, 10 * 60_000);
        confirmations.set(id, { event, resolve, timer });
        emit(event);
      });
    },
    published: (url) => emit({ type: 'published', url }),
  };
  async function readPreview(file: string) {
    const real = await fs.realpath(file);
    const within = (root: string) => {
      const relative = path.relative(root, real);
      return (
        relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)
      );
    };
    if (!within(projectPath) && !within(dataDir))
      throw new Error('Preview is outside this project.');
    if ((await fs.stat(real)).size > 2_000_000) throw new Error('File is too large to preview.');
    return fs.readFile(real, 'utf8');
  }
  const application = createApplication(host);
  const json = (res: ServerResponse, code: number, data: unknown) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };
  async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
    if (req.headers.origin !== origin) throw new Error('Invalid request origin.');
    if (!req.headers['content-type']?.startsWith('application/json'))
      throw new Error('JSON is required.');
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 256_000) throw new Error('Request is too large.');
      chunks.push(chunk);
    }
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('Invalid request.');
    return parsed;
  }
  const server = createServer((req, res) => {
    void handle(req, res).catch((error) => {
      if (!res.headersSent)
        json(res, 400, {
          error: redact(error instanceof Error ? error.message : 'Request failed.'),
        });
      else res.end();
    });
  });
  async function handle(req: IncomingMessage, res: ServerResponse) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    if (req.headers.host !== new URL(origin).host)
      return json(res, 403, { error: 'Invalid host.' });
    const url = new URL(req.url ?? '/', origin);
    const authenticated = (req.headers.cookie ?? '')
      .split(';')
      .some((c) => c.trim() === cookieName + '=' + session);
    if (url.searchParams.has('ticket') && req.method === 'GET' && url.pathname === '/') {
      if (
        !authenticated &&
        (consumed || Date.now() - created > 5 * 60_000 || url.searchParams.get('ticket') !== ticket)
      )
        return json(res, 401, {
          error: 'Launch link expired. Restart aladdin-dify for a new link.',
        });
      consumed = true;
      res.setHeader('Set-Cookie', `${cookieName}=${session}; HttpOnly; SameSite=Strict; Path=/`);
      res.writeHead(303, { Location: '/' });
      return res.end();
    }
    if (!authenticated)
      return json(res, 401, { error: 'Open the launch URL printed in your terminal.' });
    if (closing) return json(res, 503, { error: 'Application is stopping.' });
    if (req.method === 'GET' && ['/', '/settings'].includes(url.pathname)) {
      browserLanguage = req.headers['accept-language']?.split(',')[0] ?? browserLanguage;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(
        browserPage(url.pathname === '/settings' ? 'settings' : 'task', host.locale()),
      );
    }
    if (req.method === 'GET' && ['/browser.js', '/webview.js'].includes(url.pathname)) {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return res.end(await fs.readFile(path.join(options.assetsPath, url.pathname.slice(1))));
    }
    if (req.method === 'GET' && url.pathname === '/preview') {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      let view;
      let error;
      try {
        view = await application.invoke('appPreview', {
          projectPath: url.searchParams.get('project') ?? projectPath,
        });
      } catch (e) {
        error = e instanceof Error ? e.message : 'Preview unavailable.';
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(
        previewPage(
          view as any,
          url.searchParams.get('view') === 'runtime' ? 'runtime' : 'editor',
          host.locale(),
          error,
        ),
      );
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      streams.add(res);
      req.once('close', () => streams.delete(res));
      const send = (event: WebEvent) => res.write('data: ' + JSON.stringify(event) + '\n\n');
      try {
        send({ type: 'state', state: await application.state() });
      } catch (error) {
        options.log?.(redact(String(error)));
      }
      if (preview) send(preview);
      for (const confirmation of confirmations.values()) send(confirmation.event);
      return;
    }
    if (req.method !== 'POST') return json(res, 404, { error: 'Not found.' });
    const payload = await body(req);
    if (url.pathname === '/api/command') {
      if (typeof payload.command !== 'string' || !UI_COMMANDS.has(payload.command))
        return json(res, 400, { error: 'Unknown command.' });
      if (projectChanging && !['getState', 'cancel'].includes(payload.command))
        return json(res, 409, { error: 'Project is changing.' });
      if (payload.command === 'pageReady') return json(res, 200, { result: true });
      try {
        json(res, 200, { result: await application.invoke(payload.command, payload.payload) });
      } catch (error) {
        json(res, 400, { error: error instanceof Error ? error.message : 'Command failed.' });
      }
      return;
    }
    if (url.pathname === '/api/folders') {
      const directory = await fs.realpath(
        typeof payload.path === 'string' ? payload.path : projectPath,
      );
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const folders = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => ({ name: e.name, path: path.join(directory, e.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return json(res, 200, {
        path: directory,
        parent: path.dirname(directory),
        folders,
        home: os.homedir(),
      });
    }
    if (url.pathname === '/api/project' || url.pathname === '/api/projects/create') {
      if (application.busy() || projectChanging)
        return json(res, 409, { error: 'Stop the current task before changing projects.' });
      projectChanging = true;
      try {
        if (url.pathname === '/api/projects/create') {
          const form = z
            .object({
              name: z.string().trim().min(1).max(100),
              mode: z.enum(['workflow', 'advanced-chat']),
            })
            .parse(payload);
          const managed = path.join(dataDir, 'agents');
          await fs.mkdir(managed, { recursive: true, mode: 0o700 });
          const selected = await fs.mkdtemp(path.join(managed, 'agent-'));
          const s = new ProjectStore(selected, path.join(dataDir, 'projects', digest(selected)));
          await s.initialize(form.name, form.mode);
          await rememberProject(selected);
          projectPath = selected;
          projectState = await projectStore(selected);
          preview = undefined;
          await application.refresh();
          return json(res, 200, { path: selected });
        }
        if (typeof payload.path !== 'string' || payload.path.length > 4096)
          throw new Error('Enter a directory path.');
        let selected = await fs.realpath(payload.path);
        if (payload.create !== undefined) {
          if (
            typeof payload.create !== 'string' ||
            !/^[^./\\][^/\\]{0,99}$/.test(payload.create) ||
            payload.create.includes('\0')
          )
            throw new Error('Enter a simple folder name.');
          selected = path.join(selected, payload.create);
          await fs.mkdir(selected, { mode: 0o700 });
          selected = await fs.realpath(selected);
        }
        if (!(await fs.stat(selected)).isDirectory()) throw new Error('Select a directory.');
        const next = await projectStore(selected);
        await rememberProject(selected);
        projectPath = selected;
        projectState = next;
        preview = undefined;
        await application.refresh();
        return json(res, 200, { path: selected });
      } finally {
        projectChanging = false;
      }
    }
    if (url.pathname === '/api/dismiss-preview') {
      preview = undefined;
      return json(res, 200, { result: true });
    }
    if (url.pathname === '/api/confirmation') {
      const pending = confirmations.get(String(payload.id));
      if (!pending || typeof payload.allow !== 'boolean')
        return json(res, 409, { error: 'Confirmation is no longer pending.' });
      confirmations.delete(String(payload.id));
      clearTimeout(pending.timer);
      pending.resolve(payload.allow);
      preview = undefined;
      return json(res, 200, { result: true });
    }
    json(res, 404, { error: 'Not found.' });
  }
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 8787, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const port = (server.address() as { port: number }).port;
  origin = `http://127.0.0.1:${port}`;
  cookieName = 'aladdin_' + port;
  const keepalive = setInterval(() => {
    for (const stream of streams) stream.write(': heartbeat\n\n');
  }, 15_000);
  keepalive.unref();
  let stopping: Promise<void> | undefined;
  return {
    origin,
    url: origin + '/?ticket=' + ticket,
    close() {
      if (stopping) return stopping;
      closing = true;
      stopping = (async () => {
        clearInterval(keepalive);
        for (const pending of confirmations.values()) {
          clearTimeout(pending.timer);
          pending.resolve(false);
        }
        confirmations.clear();
        for (const stream of streams) stream.end();
        streams.clear();
        const closed = new Promise<void>((resolve) => server.close(() => resolve()));
        await application.shutdown();
        server.closeAllConnections();
        await closed;
      })();
      return stopping;
    },
  };
}
