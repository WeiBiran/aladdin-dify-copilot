import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProjectStore } from '../src/core/project';
import { TaskController } from '../src/core/controller';
import { minimalDsl } from '../src/core/rules';
import { snapshot, goodRun } from './fixtures';
import { toolDsl } from './fixtures';
import type { DifyClient } from '../src/dify/client';
import { ApiError } from '../src/core/util';
const limits = {
  maxRepairs: 2,
  timeoutMinutes: 1,
  generationTokenBudget: 10000,
  difyTokenBudget: 10000,
};
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dify-test-'));
  const store = new ProjectStore(root, path.join(root, 'private'));
  await store.initialize();
  await store.saveDsl(minimalDsl('workflow'));
  await store.saveSuite({
    schemaVersion: 1,
    cases: [
      {
        name: 'test',
        inputs: { input: 'ok' },
        assertions: [{ op: 'equals', path: 'outputs.result', value: 'ok' }],
      },
    ],
  });
  const client = {
    registry: { snapshot: structuredClone(snapshot), queried: new Set(), detail: vi.fn() },
    refresh: vi.fn(async () => snapshot),
    dependencies: vi.fn(async () => []),
    importApp: vi.fn(async () => 'app'),
    exportApp: vi.fn(async () => minimalDsl('workflow')),
    run: vi.fn(async () => goodRun()),
    publish: vi.fn(),
    stopAll: vi.fn(),
    hasRedactedSecrets: vi.fn(() => false),
  } as unknown as DifyClient;
  const controller = new TaskController(store, client, limits, () => {});
  return { root, store, client, controller };
}
describe('supervisor guards (mock Dify)', () => {
  it('gives a follow-up a fresh repair round without changing its frozen tests or target', async () => {
    const s = await setup();
    try {
      await s.controller.begin();
      const original = s.controller.record!;
      original.round = 2;
      original.phase = 'complete';
      original.sessionId = 'existing-session';
      original.testAppId = 'existing-test-app';
      original.suiteDigest = await s.store.suiteDigest();
      await s.store.saveRecord(original);
      const followUp = new TaskController(s.store, s.client, limits, () => {});
      await followUp.begin(true, true);
      expect(followUp.record).toMatchObject({
        round: 0,
        phase: 'generating',
        sessionId: 'existing-session',
        testAppId: 'existing-test-app',
        suiteDigest: original.suiteDigest,
      });
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('persists an unknown test result and blocks silent retry on resume', async () => {
    const s = await setup();
    try {
      await s.controller.begin();
      s.controller.record!.suiteDigest = await s.store.suiteDigest();
      await s.controller.importDraft();
      vi.mocked(s.client.run).mockRejectedValue(
        new ApiError(409, 'ambiguous', 'unknown business write'),
      );
      await expect(s.controller.runTests()).rejects.toThrow('unknown');
      expect((await s.store.record())?.pendingTest).toBe(true);
      const resumed = new TaskController(s.store, s.client, limits, () => {});
      await resumed.begin(true);
      const engine = {
        tokens: 0,
        start: vi.fn(),
        run: vi.fn(async () => ''),
        cancel: vi.fn(),
        close: vi.fn(),
      };
      resumed.attach(engine);
      await expect(resumed.drive(true)).rejects.toThrow('未知');
      expect(engine.run).not.toHaveBeenCalled();
      expect(s.client.run).toHaveBeenCalledOnce();
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('requires retesting when a selected tool definition changes', async () => {
    const s = await setup();
    try {
      const spec = await s.store.spec();
      spec.allowSideEffects = true;
      await s.store.writeSpec(spec);
      await s.store.saveDsl(toolDsl());
      s.client.registry.queried.add(snapshot.tools[0]!.key);
      vi.mocked(s.client.exportApp).mockImplementation(async () => toolDsl());
      await s.controller.begin();
      s.controller.record!.suiteDigest = await s.store.suiteDigest();
      await s.controller.importDraft();
      await s.controller.runTests();
      s.client.registry.snapshot!.tools[0]!.parameters[0]!.description = 'changed contract';
      await expect(s.controller.publish()).rejects.toThrow('定义改变');
      expect(s.client.publish).not.toHaveBeenCalled();
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('stops when another writer edits the test draft', async () => {
    const s = await setup();
    try {
      await s.controller.begin();
      s.controller.record!.suiteDigest = await s.store.suiteDigest();
      await s.controller.importDraft();
      vi.mocked(s.client.exportApp).mockResolvedValue(minimalDsl('workflow', 'Edited'));
      await expect(s.controller.runTests()).rejects.toThrow('远端草稿');
      expect(s.client.run).not.toHaveBeenCalled();
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('feeds failed assertions into the same engine session and repairs', async () => {
    const s = await setup();
    try {
      await s.controller.begin();
      vi.mocked(s.client.run)
        .mockResolvedValueOnce({ ...goodRun(), outputs: { result: 'wrong' } })
        .mockResolvedValueOnce(goodRun());
      const engine = {
        tokens: 10,
        sessionId: 'session',
        start: vi.fn(),
        run: vi.fn(async (..._args: unknown[]) => ''),
        cancel: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(s.client.exportApp).mockImplementation(() => s.store.dsl());
      engine.run
        .mockImplementationOnce(async () => '')
        .mockImplementationOnce(async () => {
          await s.store.saveDsl(minimalDsl('workflow', 'Repaired'));
          return '';
        });
      s.controller.attach(engine);
      await s.controller.drive();
      expect(engine.run).toHaveBeenCalledTimes(2);
      expect(engine.run.mock.calls[1]![0]).toContain('断言失败');
      expect(s.client.importApp).toHaveBeenCalledTimes(2);
      expect((await s.store.record())?.round).toBe(1);
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('stops after two unchanged failures without publishing', async () => {
    const s = await setup();
    try {
      await s.controller.begin();
      vi.mocked(s.client.run).mockResolvedValue({ ...goodRun(), outputs: { result: 'wrong' } });
      const engine = {
        tokens: 10,
        sessionId: 'session',
        start: vi.fn(),
        run: vi.fn(async (..._args: unknown[]) => ''),
        cancel: vi.fn(),
        close: vi.fn(),
      };
      s.controller.attach(engine);
      await expect(s.controller.drive()).rejects.toThrow('连续两轮');
      expect(engine.run).toHaveBeenCalledTimes(2);
      expect(s.client.publish).not.toHaveBeenCalled();
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('requires explicit test side-effect scope before running business tools', async () => {
    const s = await setup();
    try {
      await s.store.saveDsl(toolDsl());
      s.client.registry.queried.add(snapshot.tools[0]!.key);
      vi.mocked(s.client.exportApp).mockImplementation(async () => toolDsl());
      await s.controller.begin();
      s.controller.record!.suiteDigest = await s.store.suiteDigest();
      await s.controller.importDraft();
      await expect(s.controller.runTests()).rejects.toThrow('授权');
      expect(s.client.run).not.toHaveBeenCalled();
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('runs real workflow pipeline and publishes tested digest', async () => {
    const s = await setup();
    try {
      await s.controller.begin();
      s.controller.attach({
        tokens: 10,
        sessionId: 'session',
        start: vi.fn(),
        run: vi.fn(async (..._args: unknown[]) => ''),
        cancel: vi.fn(),
        close: vi.fn(),
      });
      await s.controller.drive();
      expect(s.client.publish).toHaveBeenCalledOnce();
      expect((await s.store.record())?.phase).toBe('complete');
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('rejects changed DSL after passing test and freezes suite', async () => {
    const s = await setup();
    try {
      await s.controller.begin();
      s.controller.record!.suiteDigest = await s.store.suiteDigest();
      await s.controller.importDraft();
      await s.controller.runTests();
      await s.store.saveDsl(minimalDsl('workflow', 'Changed'));
      await expect(s.controller.publish()).rejects.toThrow('同一 DSL');
      await expect(
        s.store.saveSuite({ schemaVersion: 1, cases: [] }, s.controller.frozenDigest()),
      ).rejects.toThrow('冻结');
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('holds unknown import outcome for reconciliation and avoids retry', async () => {
    const s = await setup();
    try {
      await s.controller.begin();
      s.controller.record!.suiteDigest = await s.store.suiteDigest();
      vi.mocked(s.client.importApp).mockRejectedValue(new Error('connection lost'));
      await expect(s.controller.importDraft()).rejects.toThrow('connection lost');
      expect(s.controller.record?.pendingImportDigest).toBeTruthy();
      await expect(s.controller.importDraft()).rejects.toThrow('未知');
      expect(s.client.importApp).toHaveBeenCalledOnce();
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
  it('never promotes when original was concurrently edited', async () => {
    const s = await setup();
    try {
      const spec = await s.store.spec();
      spec.originalAppId = 'original';
      spec.originalDigest = 'old';
      await s.store.writeSpec(spec);
      await s.controller.begin();
      s.controller.record!.suiteDigest = await s.store.suiteDigest();
      await s.controller.importDraft();
      await s.controller.runTests();
      s.client.exportApp = vi.fn(async () => 'other content');
      await expect(s.controller.promote(async () => true)).rejects.toThrow('其他人');
      expect(s.client.publish).not.toHaveBeenCalled();
    } finally {
      await rm(s.root, { recursive: true, force: true });
    }
  });
});
