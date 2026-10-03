import { spawn, execFile } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createOpencodeClient } from '@opencode-ai/sdk';
import type { OpencodeClient } from '@opencode-ai/sdk';
import type { AgentEngine, EngineEvent, ModelProfile } from '../core/types';
import { object, redact, sleep, throwIfAborted } from '../core/util';
import { rulesFor } from '../core/rules';
import type { DifyVersion } from '../dify/versions';
const execute = promisify(execFile);
export const OPENCODE_VERSION = '1.18.34';
export class OpenCodeEngine implements AgentEngine {
  sessionId?: string;
  tokens = 0;
  private child?: ChildProcess;
  private client?: OpencodeClient;
  private eventAbort = new AbortController();
  private password = randomBytes(24).toString('hex');
  constructor(
    private options: {
      binary: string;
      directory: string;
      model: ModelProfile;
      apiKey: string;
      mcpUrl: string;
      mcpToken: string;
      onEvent: (event: EngineEvent) => void;
      onReply?: (info: unknown, parts: unknown[], sessionId: string) => void;
      sessionId?: string;
      difyVersion?: DifyVersion;
    },
  ) {
    this.sessionId = options.sessionId;
  }
  async start(): Promise<void> {
    const { binary, directory, model, apiKey, mcpUrl, mcpToken } = this.options;
    const version = (await execute(binary, ['--version'], { timeout: 15000 })).stdout.trim();
    if (version !== OPENCODE_VERSION)
      throw new Error(`OpenCode 必须为 ${OPENCODE_VERSION}，实际为 ${version}`);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    for (const d of ['config', 'data', 'cache', 'state'])
      await fs.mkdir(path.join(directory, d), { recursive: true, mode: 0o700 });
    const modelId = `${model.provider}/${model.model}`;
    const config = {
      model: modelId,
      small_model: modelId,
      share: 'disabled',
      autoupdate: false,
      plugin: [],
      instructions: [],
      snapshot: false,
      enabled_providers: [model.provider],
      provider: {
        [model.provider]: {
          ...(model.provider === 'deepseek'
            ? { npm: '@ai-sdk/deepseek', name: model.provider }
            : model.baseUrl
              ? { npm: '@ai-sdk/openai-compatible', name: model.provider }
              : {}),
          options: { apiKey, ...(model.baseUrl ? { baseURL: model.baseUrl } : {}) },
          models: {
            [model.model]: {
              name: model.model,
              tool_call: true,
              limit: { context: 128000, output: 8192 },
            },
          },
        },
      },
      mcp: {
        dify: {
          type: 'remote',
          url: mcpUrl,
          enabled: true,
          oauth: false,
          headers: { Authorization: `Bearer ${mcpToken}` },
          timeout: 120000,
        },
      },
      permission: { '*': 'deny', 'dify_*': 'allow' },
      tools: { '*': false, 'dify_*': true },
      agent: {
        dify: {
          mode: 'primary',
          description: 'Dify workflow engineer',
          prompt: rulesFor(this.options.difyVersion ?? '1.17.1'),
          steps: 80,
          permission: { '*': 'deny', 'dify_*': 'allow' },
        },
      },
    };
    const child = spawn(binary, ['serve', '--hostname', '127.0.0.1', '--port', '0'], {
      cwd: directory,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: path.join(directory, 'config'),
        XDG_DATA_HOME: path.join(directory, 'data'),
        XDG_CACHE_HOME: path.join(directory, 'cache'),
        XDG_STATE_HOME: path.join(directory, 'state'),
        OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
        OPENCODE_DISABLE_PROJECT_CONFIG: 'true',
        OPENCODE_DISABLE_CLAUDE_CODE: 'true',
        OPENCODE_DISABLE_AUTOUPDATE: 'true',
        OPENCODE_SERVER_PASSWORD: this.password,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    this.child = child;
    const url = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('OpenCode 启动超过 30 秒')), 30000);
      const consume = (data: Buffer) => {
        output += data.toString();
        if (output.length > 16000) output = output.slice(-16000);
        const m = output.match(/opencode server listening on (http:\/\/127\.0\.0\.1:\d+)/);
        if (m) {
          clearTimeout(timer);
          resolve(m[1]!);
        }
      };
      child.stdout!.on('data', consume);
      child.stderr!.on('data', consume);
      child.once('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(
          new Error(
            `OpenCode 提前退出 ${code}：${redact(output, [apiKey, mcpToken, this.password])}`,
          ),
        );
      });
    });
    this.client = createOpencodeClient({
      baseUrl: url,
      headers: {
        Authorization: 'Basic ' + Buffer.from('opencode:' + this.password).toString('base64'),
      },
    });
    // The CLI may print its address before the HTTP server finishes starting.
    // Only retry a read-only health check, never session creation or tool writes.
    const readinessDeadline = Date.now() + 15000;
    let ready = false;
    while (Date.now() < readinessDeadline && child.exitCode === null) {
      try {
        const response = await fetch(url + '/global/health', {
          headers: {
            Authorization: 'Basic ' + Buffer.from('opencode:' + this.password).toString('base64'),
          },
          signal: AbortSignal.timeout(2000),
        });
        const health = response.ok ? object(await response.json()) : {};
        if (health.healthy === true && health.version === OPENCODE_VERSION) {
          ready = true;
          break;
        }
      } catch {
        /* The process is still starting. */
      }
      await sleep(100);
    }
    if (!ready) throw new Error('OpenCode did not become healthy before session initialization');
    if (this.sessionId) {
      await this.client.session.get({ path: { id: this.sessionId }, throwOnError: true });
    } else {
      const r = await this.client.session.create({
        body: { title: 'Dify Copilot' },
        throwOnError: true,
      });
      this.sessionId = r.data!.id;
    }
    const status = await this.client.mcp.status({ throwOnError: true });
    if (object(status.data).dify?.status !== 'connected')
      throw new Error('OpenCode 未连接 Dify MCP 工具桥接');
    void this.events().catch((e) => {
      if (!this.eventAbort.signal.aborted)
        this.options.onEvent({ type: 'event-error', text: redact(String(e), [apiKey, mcpToken]) });
    });
  }
  private async events() {
    const response = await this.client!.event.subscribe({ signal: this.eventAbort.signal });
    for await (const e of response.stream) {
      this.options.onEvent({ type: e.type, data: e });
    }
  }
  async models() {
    if (!this.client) throw new Error('OpenCode 未启动');
    const r = await this.client.provider.list({ throwOnError: true });
    return r.data;
  }
  async run(prompt: string, signal: AbortSignal): Promise<string> {
    throwIfAborted(signal);
    if (!this.client || !this.sessionId) throw new Error('OpenCode 未启动');
    const abort = () => {
      void this.cancel();
    };
    signal.addEventListener('abort', abort, { once: true });
    try {
      const r = await this.client.session.prompt({
        path: { id: this.sessionId },
        body: {
          agent: 'dify',
          model: { providerID: this.options.model.provider, modelID: this.options.model.model },
          parts: [{ type: 'text', text: prompt }],
        },
        signal,
        throwOnError: true,
      });
      const data = r.data!;
      if (data.info.error)
        throw new Error(
          redact(JSON.stringify(data.info.error), [this.options.apiKey, this.options.mcpToken]),
        );
      this.options.onReply?.(data.info, data.parts, this.sessionId);
      const messages = await this.client.session.messages({
        path: { id: this.sessionId },
        throwOnError: true,
      });
      this.tokens = (messages.data ?? []).reduce((total, x) => {
        if (x.info.role !== 'assistant') return total;
        const t = x.info.tokens;
        return total + t.input + t.output + t.reasoning + t.cache.read + t.cache.write;
      }, 0);
      return data.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as { text: string }).text)
        .join('\n');
    } catch (e) {
      throw new Error(
        redact(e instanceof Error ? e.message : JSON.stringify(e), [
          this.options.apiKey,
          this.options.mcpToken,
          this.password,
        ]),
      );
    } finally {
      signal.removeEventListener('abort', abort);
    }
  }
  async cancel() {
    if (this.client && this.sessionId)
      await this.client.session
        .abort({ path: { id: this.sessionId }, signal: AbortSignal.timeout(5000) })
        .catch(() => {});
  }
  async close() {
    this.eventAbort.abort();
    await this.cancel();
    if (this.child && !this.child.killed) {
      this.child.kill();
      await sleep(200);
      if (this.child.exitCode === null) this.child.kill('SIGKILL');
    }
  }
}
