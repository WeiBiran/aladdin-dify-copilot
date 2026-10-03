import type { Assertion, DifyRun, TestSuite, TestReport, CaseResult, AppMode } from './types';
import { digest } from './util';
import { RE2JS } from 're2js';
import type { DifyClient } from '../dify/client';
function at(root: unknown, path: string): unknown {
  return path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>(
      (v, k) =>
        v !== null && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined,
      root,
    );
}
export function assertRun(run: DifyRun, assertions: Assertion[]): string[] {
  const failures: string[] = [];
  if (run.status !== 'succeeded' || run.error) failures.push(run.error ?? `运行状态 ${run.status}`);
  const root = {
    outputs: run.outputs,
    answer: run.answer,
    elapsed: run.elapsed,
    tokens: run.tokens,
  };
  for (const a of assertions) {
    const v = at(root, a.path ?? '');
    let pass = false;
    switch (a.op) {
      case 'exists':
        pass = v !== undefined && v !== null;
        break;
      case 'equals':
        pass = JSON.stringify(v) === JSON.stringify(a.value);
        break;
      case 'contains':
        pass =
          typeof v === 'string'
            ? v.includes(String(a.value))
            : Array.isArray(v) && v.some((x) => JSON.stringify(x) === JSON.stringify(a.value));
        break;
      case 'type':
        pass =
          a.value === 'array'
            ? Array.isArray(v)
            : a.value === 'object'
              ? v !== null && typeof v === 'object' && !Array.isArray(v)
              : typeof v === a.value;
        break;
      case 'range':
        pass =
          typeof v === 'number' &&
          (a.min === undefined || v >= a.min) &&
          (a.max === undefined || v <= a.max);
        break;
      case 'matches':
        if (String(a.value).length > 200) throw new Error('正则断言超过 200 字符');
        pass = typeof v === 'string' && v.length <= 10000 && RE2JS.compile(String(a.value)).test(v);
        break;
      case 'node':
        pass = run.nodes.some(
          (n) =>
            (!a.nodeId || n.id === a.nodeId) &&
            (!a.nodeType || n.type === a.nodeType) &&
            n.status === 'succeeded',
        );
        break;
    }
    if (!pass) failures.push(`断言失败：${JSON.stringify(a)}`);
  }
  return failures;
}
export async function executeSuite(
  client: Pick<DifyClient, 'run'>,
  appId: string,
  mode: AppMode,
  suite: TestSuite,
  yaml: string,
  signal: AbortSignal,
  onRun?: (run: DifyRun) => Promise<void>,
): Promise<TestReport> {
  const cases: CaseResult[] = [];
  let tokens = 0;
  for (const test of suite.cases) {
    const runs: DifyRun[] = [];
    const failures: string[] = [];
    if (mode === 'workflow') {
      const run = await client.run(appId, mode, test.inputs, undefined, undefined, signal);
      runs.push(run);
      await onRun?.(run);
      failures.push(...assertRun(run, test.assertions));
    } else {
      const turns = test.turns ?? [{ query: test.query ?? '', assertions: test.assertions }];
      let conversationId: string | undefined;
      for (const [i, turn] of turns.entries()) {
        const run = await client.run(appId, mode, test.inputs, turn.query, conversationId, signal);
        runs.push(run);
        await onRun?.(run);
        conversationId = run.conversationId;
        if (!conversationId && turns.length > 1) throw new Error('Chatflow 未返回 conversation_id');
        failures.push(
          ...assertRun(run, [
            ...(turn.assertions ?? []),
            ...(i === turns.length - 1 ? test.assertions : []),
          ]).map((f) => `第 ${i + 1} 轮：${f}`),
        );
      }
    }
    tokens += runs.reduce((n, r) => n + r.tokens, 0);
    cases.push({ name: test.name, passed: failures.length === 0, failures, runs });
  }
  return {
    testedDigest: digest(yaml),
    suiteDigest: digest(JSON.stringify(suite)),
    passed: cases.every((c) => c.passed),
    cases,
    createdAt: new Date().toISOString(),
    tokens,
  };
}
