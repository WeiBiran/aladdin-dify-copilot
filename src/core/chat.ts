import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { object, redact } from './util';

export interface ChatEntry {
  id: string;
  kind: 'user' | 'assistant' | 'tool' | 'progress' | 'error' | 'result';
  text: string;
  createdAt: string;
  title?: string;
  status?: string;
}
export interface ChatSnapshot {
  id: string;
  hasTask: boolean;
  messages: ChatEntry[];
}
// Lives in extension storage, outside the project and Git. Engine prompt echoes
// and private reasoning are deliberately not copied into the conversation.
export class ChatJournal {
  private data: ChatSnapshot = { id: randomUUID(), hasTask: false, messages: [] };
  private roles = new Map<string, string>();
  private waiting = new Map<string, Record<string, any>[]>();
  private writes: Promise<void> = Promise.resolve();
  constructor(private readonly file: string) {}
  async load() {
    try {
      const value = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (typeof value.id === 'string' && Array.isArray(value.messages)) {
        this.data = {
          id: value.id,
          hasTask: value.hasTask === true,
          messages: value.messages.slice(-200),
        };
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    return this;
  }
  snapshot(): ChatSnapshot {
    return structuredClone(this.data);
  }
  newConversation() {
    this.data = { id: randomUUID(), hasTask: false, messages: [] };
    this.roles.clear();
    this.waiting.clear();
  }
  started() {
    this.data.hasTask = true;
  }
  add(kind: ChatEntry['kind'], text: string, title?: string, id: string = randomUUID()) {
    return this.upsert({
      id,
      kind,
      text: redact(text).slice(0, 50000),
      title,
      createdAt: new Date().toISOString(),
    });
  }
  private upsert(entry: ChatEntry) {
    const existing = this.data.messages.find((m) => m.id === entry.id);
    if (existing) Object.assign(existing, entry, { createdAt: existing.createdAt });
    else this.data.messages.push(entry);
    this.data.messages = this.data.messages.slice(-200);
    return entry.id;
  }
  progress(id: string, text: string) {
    this.add('progress', text, undefined, id);
  }
  engineEvent(event: unknown, sessionId: string | undefined): boolean {
    if (!sessionId) return false;
    const e = object(event),
      p = object(e.properties),
      info = object(p.info);
    if (e.type === 'message.updated' && info.sessionID === sessionId) {
      this.roles.set(info.id, info.role);
      const queued = this.waiting.get(info.id) ?? [];
      this.waiting.delete(info.id);
      return queued.reduce((changed, part) => this.part(part, sessionId) || changed, false);
    }
    if (e.type === 'message.part.updated') {
      const part = object(p.part);
      if (part.sessionID !== sessionId) return false;
      if (!this.roles.has(part.messageID)) {
        const pending = this.waiting.get(part.messageID) ?? [];
        pending.push(part);
        this.waiting.set(part.messageID, pending.slice(-100));
        return false;
      }
      return this.part(part, sessionId);
    }
    // Newer servers can deliver text deltas separately from part snapshots.
    if (
      e.type === 'message.part.delta' &&
      p.sessionID === sessionId &&
      p.field === 'text' &&
      this.roles.get(p.messageID) === 'assistant'
    ) {
      const id = sessionId + ':' + p.partID;
      const current = this.data.messages.find((m) => m.id === id);
      this.add('assistant', (current?.text ?? '') + String(p.delta ?? ''), undefined, id);
      return true;
    }
    return false;
  }
  // The prompt response supplies final parts even if the event stream reconnects.
  reply(info: unknown, parts: unknown[], sessionId: string) {
    const message = object(info);
    this.roles.set(message.id, 'assistant');
    for (const value of parts) this.part(object(value), sessionId);
  }
  private part(part: Record<string, any>, sessionId: string): boolean {
    if (part.sessionID !== sessionId || this.roles.get(part.messageID) !== 'assistant')
      return false;
    const id = sessionId + ':' + part.id;
    if (part.type === 'text' && !part.synthetic && !part.ignored) {
      this.add('assistant', String(part.text ?? ''), undefined, id);
      return true;
    }
    if (part.type === 'tool') {
      const state = object(part.state);
      this.upsert({
        id,
        kind: 'tool',
        title: String(part.tool ?? 'Dify 工具'),
        status: String(state.status ?? 'pending'),
        text:
          state.status === 'error'
            ? redact(String(state.error ?? '调用失败')).slice(0, 4000)
            : redact(String(state.title ?? '')),
        createdAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }
  flush(): Promise<void> {
    const snapshot = JSON.stringify(this.data);
    // Serialize atomic writes so a slower streaming save cannot replace a newer reply.
    this.writes = this.writes
      .catch(() => {})
      .then(async () => {
        await fs.mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
        const temp = this.file + '.' + randomUUID() + '.tmp';
        await fs.writeFile(temp, snapshot, { mode: 0o600 });
        await fs.rename(temp, this.file);
      });
    return this.writes;
  }
}
