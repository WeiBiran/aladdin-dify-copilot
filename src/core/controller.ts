import { randomUUID } from 'node:crypto';
import type { AgentEngine, RunRecord, RunPhase, TestReport, AppMode } from './types';
import type { DifyClient } from '../dify/client';
import { ProjectStore } from './project';
import { digest, ApiError, throwIfAborted, stableJson } from './util';
import { validateDsl } from './validation';
import { executeSuite } from './testing';
import { environmentDigest } from './environment';
import { parse } from 'yaml';
import { array, object } from './util';
export interface RunLimits {
  maxRepairs: number;
  timeoutMinutes: number;
  generationTokenBudget: number;
  difyTokenBudget: number;
}
export class TaskController {
  record?: RunRecord;
  signal: AbortSignal;
  private aborter = new AbortController();
  private busy = false;
  private engine?: AgentEngine;
  private changeLock = false;
  constructor(
    readonly store: ProjectStore,
    readonly client: DifyClient,
    readonly limits: RunLimits,
    private notify: (record: RunRecord) => void,
  ) {
    this.signal = this.aborter.signal;
    this.client.onTask = async (appId, taskId) => {
      if (this.record) {
        this.record.knownTasks ??= [];
        if (!this.record.knownTasks.some((t) => t.taskId === taskId))
          this.record.knownTasks.push({ appId, taskId });
        await this.persist();
      }
    };
  }
  frozenDigest = () => this.record?.suiteDigest;
  async begin(resume = false, newTurn = false): Promise<void> {
    if (this.busy) throw new Error('项目已有运行中的任务');
    this.busy = true;
    this.aborter = new AbortController();
    this.signal = this.aborter.signal;
    const spec = await this.store.spec();
    this.record = resume ? await this.store.record() : undefined;
    if (!this.record)
      this.record = {
        id: randomUUID(),
        projectId: spec.id,
        phase: 'generating',
        round: 0,
        startedAt: new Date().toISOString(),
        generationTokens: 0,
        difyTokens: 0,
        testAppId: spec.testAppId,
        originalDigest: spec.originalDigest,
      };
    if (resume && this.record.projectId !== spec.id) throw new Error('恢复记录属于另一个项目');
    if (newTurn) {
      this.record.round = 0;
      this.record.phase = 'generating';
      this.record.error = undefined;
    }
    await this.persist();
  }
  attach(engine: AgentEngine) {
    this.engine = engine;
  }
  async drive(resume = false): Promise<void> {
    if (!this.record || !this.engine) throw new Error('任务未初始化');
    const timer = setTimeout(
      () => this.aborter.abort(new Error('任务超过时间预算')),
      this.limits.timeoutMinutes * 60000,
    );
    try {
      await this.client.refresh(this.signal);
      await this.store.snapshot(this.client.registry.snapshot!);
      const spec = await this.store.spec();
      if (this.record.knownTasks?.length) {
        this.client.rememberTasks(this.record.knownTasks);
        await this.client.stopAll();
        this.record.knownTasks = this.client.unfinishedTasks();
        await this.persist();
      }
      if (this.record.pendingTest || this.record.knownTasks?.length)
        throw new ApiError(
          409,
          'ambiguous',
          '上次测试结果未知，已尝试停止记录中的 Dify 任务。核对外部业务状态后，通过恢复任务的确认继续。',
        );
      if (this.record.pendingPromotion)
        throw new ApiError(
          409,
          'ambiguous',
          '原应用更新结果待核对。请使用更新原应用命令检查状态；恢复任务不会重复写入。',
        );
      if (this.record.pendingImportDigest) await this.reconcileImport();
      if (this.record.pendingPublishDigest) {
        await this.reconcilePublish();
        await this.phase('complete');
        return;
      }
      await this.engine.start();
      this.record.sessionId = this.engine.sessionId;
      await this.persist();
      let feedback = '';
      let previous = '';
      let repeated = 0;
      const initial = `用户需求：${spec.requirement}\n应用类型：${spec.mode}\nDify 运行模型偏好：${JSON.stringify(spec.runtimeModel ?? '自主选择真实可用模型')}\n测试应用：${spec.testAppId ?? '尚未创建'}\n${resume ? '恢复已有任务，读取项目和报告，保留冻结测试。' : '先查询真实能力，创建客观测试基线，再生成原生 DSL。使用 save_workflow/save_test_suite 保存后结束本轮；宿主会冻结测试并执行导入测试，然后把失败证据反馈给你。'}\n必须读取已选工具完整定义。使用 save_workflow 保存文件。缺少依赖请报告，不编造 ID。`;
      for (let round = this.record.round; round <= this.limits.maxRepairs; round++) {
        this.record.round = round;
        await this.phase(round ? 'repairing' : 'generating');
        this.checkLimits();
        const reply = await this.engine.run(
          round || feedback
            ? `${initial}\n验收失败证据：${feedback}\n请修复 workflow.yml；禁止弱化已冻结测试。`
            : initial,
          this.signal,
        );
        this.record.generationTokens = this.engine.tokens;
        await this.persist();
        this.checkLimits();
        try {
          const suite = await this.store.suite();
          const suiteDigest = digest(JSON.stringify(suite));
          if (this.record.suiteDigest && suiteDigest !== this.record.suiteDigest)
            throw new ApiError(409, 'baseline', '测试基线发生变化，请新建任务以重新验收');
          this.record.suiteDigest = suiteDigest;
          await this.persist();
          await this.phase('validating');
          await this.importDraft();
          await this.phase('testing');
          const report = await this.runTests();
          if (report.passed) {
            await this.phase('publishing');
            await this.publish();
            await this.phase('complete');
            return;
          }
          feedback = JSON.stringify(
            report.cases.map((c) => ({
              name: c.name,
              failures: c.failures,
              runs: c.runs.map((r) => ({
                status: r.status,
                error: r.error,
                nodes: r.nodes,
                outputs: r.outputs,
                answer: r.answer,
              })),
            })),
          );
        } catch (e) {
          if (this.signal.aborted) throw e;
          if (
            e instanceof ApiError &&
            [
              'authentication',
              'permission',
              'workspace',
              'baseline',
              'ambiguous',
              'configuration',
            ].includes(e.category)
          )
            throw e;
          feedback = String(e);
        }
        const signature = digest(feedback + '\n' + (await this.store.dsl().catch(() => '')));
        repeated = signature === previous ? repeated + 1 : 0;
        previous = signature;
        if (repeated >= 1) throw new Error('相同错误连续两轮未改善，停止自动修复');
      }
      throw new Error('达到最大修复轮数；请查看测试报告');
    } catch (e) {
      this.record.error = e instanceof Error ? e.message : String(e);
      await this.phase(
        this.signal.aborted
          ? 'cancelled'
          : e instanceof ApiError &&
              [
                'authentication',
                'permission',
                'workspace',
                'baseline',
                'ambiguous',
                'configuration',
              ].includes(e.category)
            ? 'needs-input'
            : 'failed',
      );
      throw e;
    } finally {
      clearTimeout(timer);
      this.busy = false;
      await this.engine?.close();
      await this.client.stopAll();
    }
  }
  async importDraft(): Promise<string> {
    return this.exclusive(async () => {
      this.checkLimits();
      if (!this.record?.suiteDigest) throw new Error('必须先冻结测试基线，才可导入');
      const spec = await this.store.spec(),
        yaml = await this.store.dsl();
      let v = validateDsl(
        yaml,
        this.client.registry.snapshot!,
        spec.mode,
        this.client.registry.queried,
      );
      if (!v.valid) throw new Error(JSON.stringify(v.issues));
      for (const key of v.usedToolKeys) await this.client.registry.detail(key, this.signal);
      v = validateDsl(
        yaml,
        this.client.registry.snapshot!,
        spec.mode,
        this.client.registry.queried,
      );
      if (!v.valid) throw new Error(JSON.stringify(v.issues));
      const candidate = digest(yaml);
      if (this.record.pendingImportDigest)
        throw new ApiError(409, 'ambiguous', '上次导入结果未知，必须先恢复核对');
      if (spec.testAppId && this.record.candidateDigest === candidate) {
        await this.checkRemoteDraft(spec.testAppId);
        return spec.testAppId;
      }
      this.record.pendingImportDigest = candidate;
      await this.persist();
      let id: string;
      try {
        id = await this.client.importApp(
          yaml,
          this.testName(spec.name),
          spec.testAppId,
          this.signal,
        );
      } catch (e) {
        if (e instanceof ApiError && e.status < 500) this.record.pendingImportDigest = undefined;
        await this.persist();
        throw e;
      }
      spec.testAppId = id;
      this.record.testAppId = id;
      this.record.candidateDigest = candidate;
      await this.store.writeSpec(spec);
      await this.persist();
      this.record.remoteDraftDigest = digest(await this.client.exportApp(id, this.signal));
      this.record.pendingImportDigest = undefined;
      await this.persist();
      const missing = await this.client.dependencies(id, this.signal);
      if (missing.length)
        throw new ApiError(409, 'configuration', `Dify 缺少依赖：${JSON.stringify(missing)}`);
      return id;
    });
  }
  async runTests(): Promise<TestReport> {
    return this.exclusive(async () => {
      this.checkLimits();
      const spec = await this.store.spec();
      if (!spec.testAppId || !this.record?.suiteDigest) throw new Error('必须导入候选并冻结测试');
      const yaml = await this.store.dsl();
      if (digest(yaml) !== this.record.candidateDigest)
        throw new Error('当前 DSL 尚未导入，不能测试');
      if ((await this.store.suiteDigest()) !== this.record.suiteDigest)
        throw new ApiError(409, 'baseline', '测试基线变化');
      await this.checkRemoteDraft(spec.testAppId);
      const v = validateDsl(yaml, this.client.registry.snapshot!, spec.mode);
      if (v.document) {
        const types = JSON.stringify(v.document);
        if (!spec.allowSideEffects && /"type":"(?:tool|http-request|code)"/.test(types))
          throw new ApiError(
            409,
            'configuration',
            '测试包含业务工具、HTTP 或代码节点，请在任务设置中授权对应测试范围后继续。',
          );
      }
      if (!v.valid) throw new Error(JSON.stringify(v.issues));
      const before = environmentDigest(yaml, this.client.registry.snapshot!);
      this.record.pendingTest = true;
      await this.persist();
      const report = await executeSuite(
        this.client,
        spec.testAppId,
        spec.mode,
        await this.store.suite(),
        yaml,
        this.signal,
        async (run) => {
          this.record!.difyTokens += run.tokens;
          await this.persist();
          this.checkLimits();
        },
      );
      report.environmentDigest = before;
      this.record.report = report;
      this.record.pendingTest = false;
      this.record.knownTasks = [];
      await this.store.report(report);
      await this.persist();
      return report;
    });
  }
  async publish(): Promise<void> {
    return this.exclusive(async () => {
      this.checkLimits();
      const spec = await this.store.spec();
      const yaml = await this.store.dsl(),
        hash = digest(yaml);
      const r = this.record?.report;
      if (
        !spec.testAppId ||
        !r?.passed ||
        r.testedDigest !== hash ||
        r.suiteDigest !== (await this.store.suiteDigest())
      )
        throw new Error('仅能发布通过冻结测试的同一 DSL');
      await this.checkRemoteDraft(spec.testAppId);
      await this.client.refresh(this.signal);
      for (const key of validateDsl(yaml, this.client.registry.snapshot!, spec.mode).usedToolKeys)
        await this.client.registry.detail(key, this.signal);
      if (!validateDsl(yaml, this.client.registry.snapshot!, spec.mode).valid)
        throw new Error('工具环境改变，请重新测试');
      if (r.environmentDigest !== environmentDigest(yaml, this.client.registry.snapshot!))
        throw new Error('已使用的工具、模型或知识库定义改变，请重新测试');
      if (this.record!.pendingPublishDigest)
        throw new ApiError(409, 'ambiguous', '上次发布结果未知，需要恢复核对');
      this.record!.pendingPublishDigest = hash;
      await this.persist();
      await this.client.publish(spec.testAppId, `Copilot ${hash.slice(0, 12)}`, this.signal);
      this.record!.pendingPublishDigest = undefined;
      await this.persist();
      await this.store.deployment({
        appId: spec.testAppId,
        digest: hash,
        suiteDigest: r.suiteDigest,
        publishedAt: new Date().toISOString(),
        projectId: spec.id,
        target: 'test',
      });
    });
  }
  async promote(confirm: () => Promise<boolean>): Promise<boolean> {
    const spec = await this.store.spec(),
      record = await this.store.record();
    if (!spec.originalAppId || !spec.originalDigest) throw new Error('当前项目没有原应用');
    const yaml = await this.store.dsl(),
      hash = digest(yaml);
    if (
      !record?.report?.passed ||
      record.report.testedDigest !== hash ||
      record.report.suiteDigest !== (await this.store.suiteDigest())
    )
      throw new Error('候选尚未通过测试');
    if (record.pendingPromotion) {
      const p = await this.client.published(spec.originalAppId);
      if (record.pendingPromotion.digest !== hash || !JSON.stringify(p).includes(hash.slice(0, 12)))
        throw new ApiError(
          409,
          'ambiguous',
          '上次原应用更新结果未知，请在 Dify 核对草稿与已发布版本。插件不会重复导入或发布。',
        );
      record.pendingPromotion = undefined;
      spec.originalDigest = digest(await this.client.exportApp(spec.originalAppId));
      await this.store.writeSpec(spec);
      await this.store.saveRecord(record);
      return true;
    }
    const remote = await this.client.exportApp(spec.originalAppId);
    if (digest(remote) !== spec.originalDigest)
      throw new ApiError(409, 'conflict', '原应用已被其他人修改，停止覆盖');
    if (!(await confirm())) return false;
    await this.client.refresh();
    for (const key of validateDsl(yaml, this.client.registry.snapshot!, spec.mode).usedToolKeys)
      await this.client.registry.detail(key);
    const originalWorkflow = object(object(parse(remote)).workflow);
    if (
      this.client.hasRedactedSecrets(spec.originalAppId) ||
      array(object(originalWorkflow.graph).nodes).some((n) => {
        const d = object(n.data);
        return this.client.registry.snapshot!.tools.some(
          (t) =>
            t.kind === d.provider_type &&
            t.providerId === d.provider_id &&
            t.name === d.tool_name &&
            t.parameters.some((p) => p.type === 'secret-input'),
        );
      })
    )
      throw new ApiError(
        409,
        'configuration',
        '原应用包含节点秘密配置，首版不能安全保留这些值。请在 Dify 手工合并此类应用，避免覆盖凭据。',
      );
    if (
      !validateDsl(yaml, this.client.registry.snapshot!, spec.mode).valid ||
      record.report.environmentDigest !== environmentDigest(yaml, this.client.registry.snapshot!)
    )
      throw new Error('环境依赖改变，请重新测试');
    if (digest(await this.client.exportApp(spec.originalAppId)) !== spec.originalDigest)
      throw new Error('确认期间原应用发生变化');
    await this.store.backup('original', remote);
    record.pendingPromotion = { appId: spec.originalAppId, digest: hash, stage: 'importing' };
    await this.store.saveRecord(record);
    await this.client.updateOriginalDraft(spec.originalAppId, yaml, spec.originalDigest);
    record.pendingPromotion.stage = 'publishing';
    await this.store.saveRecord(record);
    await this.client.publish(spec.originalAppId, `Copilot ${hash.slice(0, 12)}`);
    record.pendingPromotion = undefined;
    spec.originalDigest = digest(await this.client.exportApp(spec.originalAppId));
    await this.store.writeSpec(spec);
    await this.store.saveRecord(record);
    await this.store.deployment({
      appId: spec.originalAppId,
      digest: hash,
      suiteDigest: record.report.suiteDigest,
      publishedAt: new Date().toISOString(),
      projectId: spec.id,
      target: 'original',
    });
    return true;
  }
  async cancel() {
    this.aborter.abort(new Error('用户取消任务'));
    await Promise.allSettled([this.engine?.cancel(), this.client.stopAll()]);
  }
  async abandon() {
    this.busy = false;
    await this.engine?.close();
  }
  private checkLimits() {
    throwIfAborted(this.signal);
    if (
      (this.record?.generationTokens ?? 0) >= this.limits.generationTokenBudget ||
      (this.record?.difyTokens ?? 0) >= this.limits.difyTokenBudget
    )
      throw new ApiError(409, 'configuration', '已达到调用用量预算，不再开始新的调用');
  }
  private async exclusive<T>(fn: () => Promise<T>): Promise<T> {
    if (this.changeLock) throw new Error('已有 Dify 修改操作进行中');
    this.changeLock = true;
    try {
      return await fn();
    } finally {
      this.changeLock = false;
    }
  }
  private testName(name: string) {
    return `${name.slice(0, 35)} [Copilot ${this.record!.id.slice(0, 8)}]`;
  }
  private async checkRemoteDraft(appId: string) {
    if (
      !this.record?.remoteDraftDigest ||
      digest(await this.client.exportApp(appId, this.signal)) !== this.record.remoteDraftDigest
    )
      throw new ApiError(
        409,
        'ambiguous',
        '测试应用的远端草稿发生变化或尚未核对，请重新导入并验收',
      );
  }
  private async reconcileImport() {
    const spec = await this.store.spec();
    let appId = spec.testAppId;
    const yaml = await this.store.dsl();
    if (digest(yaml) !== this.record!.pendingImportDigest)
      throw new ApiError(409, 'ambiguous', '待核对的 DSL 已改变');
    if (!appId) {
      const matches = (await this.client.apps(this.signal)).filter(
        (a) => a.name === this.testName(spec.name),
      );
      if (matches.length !== 1)
        throw new ApiError(
          409,
          'ambiguous',
          '未知导入结果：无法唯一确定远端应用，请检查 Dify 后重新连接',
        );
      appId = matches[0]!.id;
    }
    const remote = await this.client.exportApp(appId, this.signal);
    if (
      stableJson(object(object(parse(remote)).workflow).graph) !==
      stableJson(object(object(parse(yaml)).workflow).graph)
    )
      throw new ApiError(409, 'ambiguous', '远端应用不匹配');
    spec.testAppId = appId;
    this.record!.testAppId = appId;
    this.record!.candidateDigest = digest(yaml);
    this.record!.remoteDraftDigest = digest(remote);
    this.record!.pendingImportDigest = undefined;
    await this.store.writeSpec(spec);
    await this.persist();
  }
  private async reconcilePublish() {
    const spec = await this.store.spec();
    if (!spec.testAppId) throw new ApiError(409, 'ambiguous', '缺少发布目标');
    if (digest(await this.store.dsl()) !== this.record!.pendingPublishDigest)
      throw new ApiError(409, 'ambiguous', '待核对发布对应的本地 DSL 已改变');
    await this.checkRemoteDraft(spec.testAppId);
    const p = await this.client.published(spec.testAppId, this.signal);
    if (!JSON.stringify(p).includes(this.record!.pendingPublishDigest!.slice(0, 12)))
      throw new ApiError(409, 'ambiguous', '未能确认上次发布状态，停止重复发布');
    this.record!.pendingPublishDigest = undefined;
    await this.persist();
    const yaml = await this.store.dsl();
    await this.store.deployment({
      appId: spec.testAppId,
      digest: digest(yaml),
      suiteDigest: this.record!.suiteDigest!,
      publishedAt: new Date().toISOString(),
      projectId: spec.id,
      target: 'test',
    });
  }
  private async phase(phase: RunPhase) {
    this.record!.phase = phase;
    await this.persist();
  }
  private async persist() {
    await this.store.saveRecord(this.record!);
    this.notify(this.record!);
  }
}
