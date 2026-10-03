import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ChatJournal } from '../src/core/chat';
const session = 's1';
const info = (id: string, role = 'assistant', sessionID = session) => ({
  type: 'message.updated',
  properties: { info: { id, role, sessionID } },
});
const part = (fields: Record<string, unknown>) => ({
  type: 'message.part.updated',
  properties: {
    part: { id: 'p1', messageID: 'a1', sessionID: session, type: 'text', text: 'Hello', ...fields },
  },
});
describe('chat event journal', () => {
  it('merges streamed parts and the final reply without duplicating text or prompt echoes', () => {
    const chat = new ChatJournal('/unused/chat.json');
    chat.add('user', 'Build a flow');
    chat.engineEvent(info('u1', 'user'), session);
    chat.engineEvent(
      part({ messageID: 'u1', id: 'prompt', text: 'Internal harness instructions' }),
      session,
    );
    // A part may arrive before its message metadata.
    chat.engineEvent(part({ text: 'Hel' }), session);
    chat.engineEvent(info('a1'), session);
    chat.engineEvent(part({ text: 'Hello' }), session);
    chat.reply(
      { id: 'a1' },
      [{ id: 'p1', messageID: 'a1', sessionID: session, type: 'text', text: 'Hello' }],
      session,
    );
    expect(chat.snapshot().messages.map((m) => m.text)).toEqual(['Build a flow', 'Hello']);
    chat.engineEvent(part({ type: 'reasoning', text: 'Private reasoning' }), session);
    chat.engineEvent(part({ sessionID: 'other', text: 'Other project' }), session);
    expect(chat.snapshot().messages).toHaveLength(2);
  });
  it('updates a single tool card and redacts errors without exposing tool credentials', () => {
    const chat = new ChatJournal('/unused/chat.json');
    chat.engineEvent(info('a1'), session);
    for (const status of ['pending', 'running', 'error'])
      chat.engineEvent(
        part({
          type: 'tool',
          tool: 'dify_get_tool',
          state: { status, input: { password: 'secret' }, error: 'Bearer some-secret-token' },
        }),
        session,
      );
    expect(chat.snapshot().messages).toHaveLength(1);
    expect(chat.snapshot().messages[0]).toMatchObject({
      kind: 'tool',
      status: 'error',
      text: 'Bearer [REDACTED]',
    });
    expect(JSON.stringify(chat.snapshot())).not.toContain('password');
  });
  it('persists ordered writes and conversation identity outside the project', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'dify-chat-'));
    try {
      const file = path.join(root, 'private', 'chat.json');
      const chat = await new ChatJournal(file).load();
      chat.add('user', 'First');
      chat.started();
      const firstWrite = chat.flush();
      chat.add('assistant', 'Reply');
      const lastWrite = chat.flush();
      await Promise.all([firstWrite, lastWrite]);
      const restored = await new ChatJournal(file).load();
      expect(restored.snapshot()).toEqual(chat.snapshot());
      const originalId = restored.snapshot().id;
      restored.newConversation();
      await restored.flush();
      expect(restored.snapshot()).toMatchObject({ hasTask: false, messages: [] });
      expect(restored.snapshot().id).not.toBe(originalId);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
