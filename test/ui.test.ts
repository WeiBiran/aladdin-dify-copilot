import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { connectionForm, modelForm, limitForm, taskForm } from '../src/ui/contracts';
import { ProjectStore } from '../src/core/project';

describe('UI inputs and automatic project storage', () => {
  it('accepts a root or proxied console address and rejects embedded credentials', () => {
    const form = {
      baseUrl: 'https://dify.example.test/team/console/api',
      version: '1.14.2',
      email: 'developer@example.test',
      password: '',
    };
    expect(connectionForm.parse(form).baseUrl).toBe(form.baseUrl);
    for (const baseUrl of [
      'file:///tmp/project',
      'https://user:password@example.test',
      'https://example.test/?token=abc',
    ])
      expect(connectionForm.safeParse({ ...form, baseUrl }).success).toBe(false);
    expect(connectionForm.safeParse({ ...form, version: '1.99.0' }).success).toBe(false);
  });
  it('requires an explicit target for an existing app and keeps business acceptance separate', () => {
    const task = {
      name: 'Customer support',
      mode: 'advanced-chat',
      source: 'existing',
      requirement: 'Find evidence',
      acceptance: 'Cite every answer',
    };
    expect(taskForm.safeParse(task).success).toBe(false);
    expect(taskForm.parse({ ...task, originalAppId: 'app-123' }).acceptance).toBe(task.acceptance);
    expect(taskForm.safeParse({ ...task, source: 'new', requirement: '   ' }).success).toBe(false);
  });
  it('rejects unsupported provider syntax and execution bounds', () => {
    expect(
      modelForm.safeParse({ provider: '../custom', model: 'chat', apiKey: 'test' }).success,
    ).toBe(false);
    const limits = {
      maxRepairs: 5,
      timeoutMinutes: 30,
      generationTokenBudget: 100000,
      difyTokenBudget: 100000,
    };
    expect(limitForm.parse(limits).maxRepairs).toBe(5);
    for (const override of [
      { maxRepairs: 21 },
      { timeoutMinutes: 0 },
      { generationTokenBudget: 999 },
      { maxRepairs: 1.5 },
    ])
      expect(limitForm.safeParse({ ...limits, ...override }).success).toBe(false);
  });
  it('saves a complete agent requirement and generates Markdown from the form without manual edits', async () => {
    const temp = await mkdtemp(path.join(os.tmpdir(), 'dify-ui-'));
    try {
      const root = path.join(temp, 'project');
      await mkdir(root);
      const store = new ProjectStore(root, path.join(temp, 'private'));
      await store.initialize('Support', 'advanced-chat');
      await store.saveBrief('Ask for the model number.', 'Use context in the next turn.');
      const spec = await store.spec();
      expect(spec.requirement).toContain('Use context in the next turn.');
      expect(spec.brief).toEqual({
        requirement: 'Ask for the model number.',
        acceptance: 'Use context in the next turn.',
      });
      expect(await readFile(path.join(root, 'requirements.md'), 'utf8')).toContain('## 验收要求');
      await store.saveBrief('Updated requirement', '');
      expect((await store.spec()).requirement).toBe('Updated requirement');
      expect(await readFile(path.join(root, 'requirements.md'), 'utf8')).not.toContain(
        'Use context in the next turn.',
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
