import { it, expect } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, rm, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { OpenCodeEngine } from '../src/engine/opencode';
import { DifyBridge } from '../src/engine/bridge';
import { ProjectStore } from '../src/core/project';
import { snapshot } from './fixtures';
import type { DifyClient } from '../src/dify/client';
import { ChatJournal } from '../src/core/chat';

// Real pinned native OpenCode + real SDK + real MCP transport. The model is a
// local deterministic HTTP fixture; this is not DeepSeek or Dify acceptance.
it.skipIf(process.env.RUN_ENGINE_INTEGRATION !== '1').each(['fixture', 'deepseek'])(
  'executes an MCP tool through native OpenCode with %s provider',
  async (provider) => {
    const binary = path.resolve(
      'runtime',
      process.platform === 'win32' ? 'opencode.exe' : 'opencode',
    );
    await access(binary);
    const root = await mkdtemp(path.join(os.tmpdir(), 'dify-native-'));
    const store = new ProjectStore(root, path.join(root, 'private'));
    const spec = await store.initialize();
    spec.requirement = 'native integration marker';
    await store.writeSpec(spec);
    const client = {
      registry: { snapshot, search: () => [], detail: async () => snapshot.tools[0] },
      refresh: async () => snapshot,
    } as unknown as DifyClient;
    const signal = new AbortController().signal;
    const bridge = new DifyBridge(
      client,
      store,
      {
        signal: () => signal,
        frozenDigest: () => undefined,
        importDraft: async () => 'app',
        runTests: async () => ({}),
        publish: async () => {},
      },
      () => {},
    );
    let calls = 0;
    let sawToolResult = false;
    let sawTools = false;
    let leakedBuiltin = false;
    const modelServer = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      calls++;
      const tools = (body.tools ?? []) as { function: { name: string } }[];
      sawTools ||= tools.some((t) => t.function.name.includes('read_project'));
      leakedBuiltin ||= tools.some((t) => !t.function.name.startsWith('dify_'));
      sawToolResult ||= JSON.stringify(body.messages).includes('native integration marker');
      const selected = tools.find((t) => t.function.name.includes('read_project'))?.function.name;
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      const chunk = (delta: unknown, finish: unknown = null) =>
        res.write(
          'data: ' +
            JSON.stringify({
              id: 'fixture-' + calls,
              object: 'chat.completion.chunk',
              created: 1,
              model: 'fixture',
              choices: [{ index: 0, delta, finish_reason: finish }],
            }) +
            '\n\n',
        );
      if (calls === 1 && selected) {
        chunk({
          role: 'assistant',
          tool_calls: [
            {
              index: 0,
              id: 'call_1',
              type: 'function',
              function: { name: selected, arguments: '{}' },
            },
          ],
        });
        chunk({}, 'tool_calls');
      } else {
        chunk({ role: 'assistant', content: 'Native MCP integration completed.' });
        chunk({}, 'stop');
      }
      res.write(
        'data: ' +
          JSON.stringify({
            id: 'fixture',
            object: 'chat.completion.chunk',
            created: 1,
            model: 'fixture',
            choices: [],
            usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
          }) +
          '\n\n',
      );
      res.end('data: [DONE]\n\n');
    });
    await new Promise<void>((resolve) => modelServer.listen(0, '127.0.0.1', resolve));
    const port = (modelServer.address() as { port: number }).port;
    const events: string[] = [];
    const chat = new ChatJournal(path.join(root, 'private', 'chat.json'));
    let engine: OpenCodeEngine | undefined;
    try {
      await bridge.start();
      engine = new OpenCodeEngine({
        binary,
        directory: path.join(root, 'engine'),
        model: {
          provider,
          model: 'fixture',
          baseUrl: `http://127.0.0.1:${port}/v1`,
          apiKeyRef: 'test',
        },
        apiKey: 'fixture-key',
        mcpUrl: bridge.url,
        mcpToken: bridge.token,
        onEvent: (e) => {
          events.push(e.type);
          chat.engineEvent(e.data, engine?.sessionId);
        },
        onReply: (info, parts, session) => chat.reply(info, parts, session),
      });
      await engine.start();
      const answer = await engine.run('Call read_project and report completion.', signal);
      expect(answer).toContain('completed');
      expect(sawTools).toBe(true);
      expect(sawToolResult).toBe(true);
      expect(leakedBuiltin).toBe(false);
      expect(calls).toBeGreaterThanOrEqual(2);
      expect(engine.tokens).toBeGreaterThan(0);
      expect(
        chat
          .snapshot()
          .messages.filter((m) => m.kind === 'assistant')
          .map((m) => m.text)
          .join(''),
      ).toContain('Native MCP integration completed.');
      expect(
        chat.snapshot().messages.some((m) => m.kind === 'tool' && m.status === 'completed'),
      ).toBe(true);
      expect(chat.snapshot().messages.some((m) => m.text.includes('Call read_project'))).toBe(
        false,
      );
    } finally {
      await engine?.close();
      await bridge.close();
      await new Promise<void>((resolve) => {
        modelServer.close(() => resolve());
        modelServer.closeAllConnections();
      });
      await rm(root, { recursive: true, force: true });
    }
  },
  60000,
);
