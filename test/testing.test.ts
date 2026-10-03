import { describe, it, expect, vi } from 'vitest';
import { collectRun } from '../src/dify/sse';
import { assertRun, executeSuite } from '../src/core/testing';
import { goodRun } from './fixtures';
function response(events: unknown[], fragment = false) {
  const data = events.map((e) => 'data: ' + JSON.stringify(e) + '\r\n\r\n').join('');
  const bytes = new TextEncoder().encode(data);
  return new Response(
    new ReadableStream({
      start(c) {
        if (fragment) for (let i = 0; i < bytes.length; i += 3) c.enqueue(bytes.slice(i, i + 3));
        else c.enqueue(bytes);
        c.close();
      },
    }),
  );
}
describe('real completion signals and assertions (SSE fixtures)', () => {
  it('bounds regex assertions with a linear-time engine', () => {
    const run = { ...goodRun(), answer: 'a'.repeat(9999) + '!' };
    expect(assertRun(run, [{ op: 'matches', path: 'answer', value: '(a+)+$' }])).toHaveLength(1);
    expect(
      assertRun({ ...goodRun(), answer: 'AB-123' }, [
        { op: 'matches', path: 'answer', value: '^[A-Z]+-[0-9]+$' },
      ]),
    ).toEqual([]);
  });
  it('preserves an error even if a subsequent finish event says succeeded', async () => {
    const r = await collectRun(
      response([
        { event: 'error', message: 'node failed' },
        { event: 'workflow_finished', data: { status: 'succeeded' } },
      ]),
      'workflow',
    );
    expect(assertRun(r, [])).toContain('node failed');
  });
  it('applies fixed case assertions even when the final chat turn has its own assertions', async () => {
    const run = vi.fn(async () => ({ ...goodRun(), conversationId: 'new' }));
    const report = await executeSuite(
      { run },
      'app',
      'advanced-chat',
      {
        schemaVersion: 1,
        cases: [
          {
            name: 'frozen case',
            inputs: {},
            turns: [{ query: 'x', assertions: [{ op: 'type', path: 'answer', value: 'string' }] }],
            assertions: [{ op: 'equals', path: 'answer', value: 'expected' }],
          },
        ],
      },
      'yaml',
      new AbortController().signal,
    );
    expect(report.passed).toBe(false);
  });
  it('handles byte-split UTF8 and requires workflow terminal', async () => {
    const r = await collectRun(
      response(
        [
          {
            event: 'node_finished',
            data: { node_id: 'lookup', node_type: 'tool', status: 'succeeded' },
          },
          {
            event: 'workflow_finished',
            data: { status: 'succeeded', outputs: { result: '中文' }, total_tokens: 2 },
          },
        ],
        true,
      ),
      'workflow',
    );
    expect(r.outputs.result).toBe('中文');
    expect(r.nodes[0]?.id).toBe('lookup');
    await expect(collectRun(response([{ event: 'workflow_started' }]), 'workflow')).rejects.toThrow(
      '终态',
    );
  });
  it('does not equate HTTP 200 with success', async () => {
    const r = await collectRun(
      response([
        { event: 'workflow_finished', data: { status: 'failed', error: 'bad arguments' } },
      ]),
      'workflow',
    );
    expect(assertRun(r, [])).toContain('bad arguments');
  });
  it('checks chat message end and assembles answer', async () => {
    const events = [
      { event: 'message', answer: 'hello ', conversation_id: 'conv' },
      { event: 'message', answer: 'world' },
      { event: 'workflow_finished', data: { status: 'succeeded' } },
      { event: 'message_end' },
    ];
    const r = await collectRun(response(events), 'advanced-chat');
    expect(r.answer).toBe('hello world');
    expect(r.conversationId).toBe('conv');
    await expect(collectRun(response(events.slice(0, -1)), 'advanced-chat')).rejects.toThrow(
      'message_end',
    );
  });
  it('keeps conversation per case and restarts it on a new DSL test', async () => {
    const run = vi.fn(
      async (_app: string, _mode: string, _inputs: unknown, _query: unknown, conv?: string) => ({
        ...goodRun(),
        conversationId: conv ?? 'new',
      }),
    );
    const suite = {
      schemaVersion: 1 as const,
      cases: [
        {
          name: 'a',
          inputs: {},
          turns: [{ query: 'first' }, { query: 'second' }],
          assertions: [{ op: 'contains' as const, path: 'answer', value: 'ok' }],
        },
        {
          name: 'b',
          inputs: {},
          query: 'isolated',
          assertions: [{ op: 'type' as const, path: 'answer', value: 'string' }],
        },
      ],
    };
    await executeSuite(
      { run },
      'app',
      'advanced-chat',
      suite,
      'yaml',
      new AbortController().signal,
    );
    expect(run.mock.calls.map((x) => x[4])).toEqual([undefined, 'new', undefined]);
    expect(assertRun(goodRun(), [{ op: 'node', nodeType: 'tool' }])).toEqual([]);
  });
});
