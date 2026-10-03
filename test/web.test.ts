import { request } from 'node:http';
import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm, readFile, writeFile, realpath, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startWebApplication } from '../src/web/server';
import { digest } from '../src/core/util';
import { JsonStore } from '../src/app/storage';
import type { SecretStore } from '../src/core/types';

class MemorySecrets implements SecretStore {
  values = new Map<string, string>();
  async get(key: string) {
    return this.values.get(key);
  }
  async store(key: string, value: string) {
    this.values.set(key, value);
  }
  async delete(key: string) {
    this.values.delete(key);
  }
}
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aladdin-web-'));
  const project = path.join(root, 'project');
  await mkdir(project);
  const secrets = new MemorySecrets();
  const app = await startWebApplication({
    projectPath: project,
    dataDir: path.join(root, 'private'),
    assetsPath: path.resolve('dist'),
    runtimePath: 'not-used',
    port: 0,
    secrets,
  });
  const launch = await fetch(app.url, { redirect: 'manual' });
  const cookie = launch.headers.get('set-cookie')!.split(';')[0]!;
  const post = (route: string, body: unknown, origin = app.origin) =>
    fetch(app.origin + route, {
      method: 'POST',
      headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const command = (command: string, payload?: unknown) =>
    post('/api/command', { command, payload });
  return {
    root,
    project,
    secrets,
    app,
    launch,
    cookie,
    post,
    command,
    async cleanup() {
      await app.close();
      await rm(root, { recursive: true, force: true });
    },
  };
}
describe('local browser application', () => {
  it('previews DSL and private reports while refusing symlinks outside the project', async () => {
    const f = await fixture();
    const controller = new AbortController();
    try {
      const project = await realpath(f.project);
      const privateRoot = path.join(f.root, 'private', 'projects', digest(project));
      await mkdir(privateRoot, { recursive: true });
      await writeFile(
        path.join(project, 'workflow.yml'),
        'app: {name: Candidate}\n# ' + 'x'.repeat(200000),
      );
      await writeFile(path.join(privateRoot, 'report.json'), '{"passed":true}');
      const stream = await fetch(f.app.origin + '/api/events', {
        headers: { cookie: f.cookie },
        signal: controller.signal,
      });
      const reader = stream.body!.getReader();
      let buffered = '';
      const decoder = new TextDecoder();
      async function nextEvent() {
        while (!buffered.includes('\n\n')) {
          const chunk = await reader.read();
          if (chunk.done) throw new Error('Event stream closed during review');
          buffered += decoder.decode(chunk.value, { stream: true });
        }
        const boundary = buffered.indexOf('\n\n');
        const event = buffered.slice(0, boundary);
        buffered = buffered.slice(boundary + 2);
        return event;
      }
      await nextEvent();
      expect((await f.command('openDsl')).status).toBe(200);
      const dsl = await nextEvent();
      expect(dsl).toContain('Candidate');
      expect((await f.command('openReport')).status).toBe(200);
      const report = await nextEvent();
      expect(report).toContain('report.json');
      if (process.platform !== 'win32') {
        await rm(path.join(project, 'workflow.yml'));
        await writeFile(path.join(f.root, 'outside.yml'), 'outside-private-content');
        await symlink(path.join(f.root, 'outside.yml'), path.join(project, 'workflow.yml'));
        expect((await f.command('openDsl')).status).toBe(400);
      }
      expect((await f.post('/api/confirmation', { id: 'unknown', allow: true })).status).toBe(409);
    } finally {
      controller.abort();
      await f.cleanup();
    }
  });

  it('requires the launch ticket, rejects reuse and cross-site commands, and strips the ticket', async () => {
    const f = await fixture();
    try {
      expect(f.launch.status).toBe(303);
      expect(f.launch.headers.get('location')).toBe('/');
      expect(f.launch.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Strict');
      expect((await fetch(f.app.origin + '/api/events')).status).toBe(401);
      expect((await fetch(f.app.url, { redirect: 'manual' })).status).toBe(401);
      expect(
        (
          await f.post(
            '/api/command',
            { command: 'saveLanguage', payload: 'en' },
            'https://untrusted.example',
          )
        ).status,
      ).toBe(400);
      const rebinding = await new Promise<number>((resolve, reject) => {
        const r = request(
          f.app.origin,
          { headers: { host: 'untrusted.example', cookie: f.cookie } },
          (response) => {
            response.resume();
            resolve(response.statusCode!);
          },
        );
        r.on('error', reject);
        r.end();
      });
      expect(rebinding).toBe(403);
      expect((await f.command('shell', { cmd: 'anything' })).status).toBe(400);
      const page = await fetch(f.app.origin, {
        headers: { cookie: f.cookie, 'accept-language': 'en-US' },
      });
      const html = await page.text();
      expect(page.status).toBe(200);
      expect(page.headers.get('referrer-policy')).toBe('no-referrer');
      expect(html).toContain("connect-src 'self'");
      expect(html).toContain('data-page="task"');
      expect(html).not.toContain(new URL(f.app.url).searchParams.get('ticket'));
    } finally {
      await f.cleanup();
    }
  });
  it('saves model keys only in the secret store and keeps public state and configuration clean', async () => {
    const f = await fixture();
    try {
      const key = 'test-model-secret-please-never-expose';
      const result = await f.command('saveModel', {
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        apiKey: key,
      });
      expect(result.status).toBe(200);
      expect([...f.secrets.values.values()]).toContain(key);
      const state = await (await f.command('getState')).json();
      expect(state.result.model.hasKey).toBe(true);
      expect(JSON.stringify(state)).not.toContain(key);
      expect(JSON.stringify(state)).not.toContain('apiKeyRef');
      const disk = await readFile(path.join(f.root, 'private', 'settings.json'), 'utf8');
      expect(disk).not.toContain(key);
      await f.command('saveLanguage', 'zh-CN');
      const page = await fetch(f.app.origin + '/settings', {
        headers: { cookie: f.cookie, 'accept-language': 'en' },
      });
      expect(await page.text()).toContain('data-locale="zh-CN"');
      const reopened = await new JsonStore(path.join(f.root, 'private', 'settings.json')).load();
      expect(reopened.get('config.language')).toBe('zh-CN');
    } finally {
      await f.cleanup();
    }
  });
  it('browses directories and creates an explicit project without exposing arbitrary files', async () => {
    const f = await fixture();
    try {
      const listing = await (await f.post('/api/folders', { path: f.root })).json();
      expect(listing.folders.some((d: { name: string }) => d.name === 'project')).toBe(true);
      expect((await f.post('/api/project', { path: f.root, create: '../escape' })).status).toBe(
        400,
      );
      expect((await f.post('/api/project', { path: f.root, create: 'Customer demo' })).status).toBe(
        200,
      );
      const state = await (await f.command('getState')).json();
      expect(state.result.workspace.name).toBe('Customer demo');
      expect(
        (
          await fetch(f.app.origin + '/api/file?path=/etc/passwd', {
            headers: { cookie: f.cookie },
          })
        ).status,
      ).toBe(404);
      const controller = new AbortController();
      const stream = await fetch(f.app.origin + '/api/events', {
        headers: { cookie: f.cookie },
        signal: controller.signal,
      });
      const reader = stream.body!.getReader();
      const chunk = await reader.read();
      expect(new TextDecoder().decode(chunk.value)).toContain('"type":"state"');
      controller.abort();
    } finally {
      await f.cleanup();
    }
  });
});
