import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type {
  ProjectSpec,
  TestSuite,
  RunRecord,
  CapabilitySnapshot,
  TestReport,
  DeploymentRecord,
} from './types';
import { digest } from './util';
const assertion = z
  .object({
    op: z.enum(['exists', 'equals', 'contains', 'type', 'range', 'matches', 'node']),
    path: z.string().optional(),
    value: z.unknown().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    nodeId: z.string().optional(),
    nodeType: z.string().optional(),
  })
  .superRefine((a, c) => {
    if (a.op === 'node' && !a.nodeId && !a.nodeType)
      c.addIssue({ code: 'custom', message: 'node 断言必须指定节点 ID 或类型' });
    if (a.op !== 'node' && !a.path) c.addIssue({ code: 'custom', message: '断言必须指定输出路径' });
    if (['equals', 'contains', 'type', 'matches'].includes(a.op) && a.value === undefined)
      c.addIssue({ code: 'custom', message: '断言缺少 value' });
    if (a.op === 'range' && a.min === undefined && a.max === undefined)
      c.addIssue({ code: 'custom', message: 'range 断言必须指定范围' });
  });
export const suiteSchema = z.object({
  schemaVersion: z.literal(1),
  cases: z
    .array(
      z.object({
        name: z.string().min(1),
        inputs: z.record(z.unknown()),
        query: z.string().optional(),
        turns: z
          .array(z.object({ query: z.string(), assertions: z.array(assertion).optional() }))
          .min(1)
          .max(20)
          .optional(),
        assertions: z.array(assertion).min(1),
      }),
    )
    .min(1)
    .max(30),
});
export class ProjectStore {
  readonly configPath: string;
  readonly dslPath: string;
  readonly testsPath: string;
  readonly reportPath: string;
  constructor(
    readonly root: string,
    readonly privateRoot: string,
  ) {
    this.configPath = path.join(root, 'dify.project.json');
    this.dslPath = path.join(root, 'workflow.yml');
    this.testsPath = path.join(root, 'tests.json');
    this.reportPath = path.join(privateRoot, 'report.json');
  }
  async initialize(
    name = 'Dify Project',
    mode: ProjectSpec['mode'] = 'workflow',
  ): Promise<ProjectSpec> {
    try {
      return await this.spec();
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    const spec: ProjectSpec = {
      schemaVersion: 1,
      id: randomUUID(),
      name,
      mode,
      requirement: '',
      allowSideEffects: false,
    };
    await this.writeSpec(spec);
    await fs
      .writeFile(
        path.join(this.root, 'requirements.md'),
        '# 需求\n\n请描述目标、输入、输出和验收条件。\n',
        { flag: 'wx' },
      )
      .catch((e) => {
        if (e.code !== 'EEXIST') throw e;
      });
    return spec;
  }
  async spec(): Promise<ProjectSpec> {
    const s = JSON.parse(await fs.readFile(this.configPath, 'utf8'));
    if (s.schemaVersion !== 1 || !s.id || !['workflow', 'advanced-chat'].includes(s.mode))
      throw new Error('无效的 dify.project.json');
    return s;
  }
  async writeSpec(spec: ProjectSpec): Promise<void> {
    await this.atomic(this.configPath, JSON.stringify(spec, null, 2));
  }
  async saveBrief(requirement: string, acceptance = ''): Promise<void> {
    const spec = await this.spec();
    spec.brief = { requirement, acceptance };
    spec.requirement = requirement + (acceptance ? '\n\n验收要求：\n' + acceptance : '');
    await this.writeSpec(spec);
    await this.atomic(
      path.join(this.root, 'requirements.md'),
      '# 需求\n\n' + requirement + (acceptance ? '\n\n## 验收要求\n\n' + acceptance : '') + '\n',
    );
  }
  async dsl(): Promise<string> {
    return fs.readFile(this.dslPath, 'utf8');
  }
  async saveDsl(yaml: string): Promise<void> {
    if (Buffer.byteLength(yaml) > 2_000_000) throw new Error('DSL 超过 2MB');
    await this.atomic(this.dslPath, yaml);
  }
  async suite(): Promise<TestSuite> {
    return suiteSchema.parse(JSON.parse(await fs.readFile(this.testsPath, 'utf8'))) as TestSuite;
  }
  async saveSuite(suite: unknown, frozenDigest?: string): Promise<void> {
    if (frozenDigest) throw new Error('测试基线已经冻结，Agent 不能修改。');
    const parsed = suiteSchema.parse(suite);
    await this.atomic(this.testsPath, JSON.stringify(parsed, null, 2));
  }
  async suiteDigest(): Promise<string> {
    return digest(JSON.stringify(await this.suite()));
  }
  async record(): Promise<RunRecord | undefined> {
    try {
      return JSON.parse(await fs.readFile(path.join(this.privateRoot, 'run.json'), 'utf8'));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw e;
    }
  }
  async saveRecord(record: RunRecord): Promise<void> {
    await this.privateWrite('run.json', record);
  }
  async snapshot(snapshot: CapabilitySnapshot): Promise<void> {
    await this.privateWrite('capabilities.json', snapshot);
  }
  async report(report: TestReport): Promise<void> {
    await this.privateWrite('report.json', report);
  }
  async deployment(record: DeploymentRecord): Promise<void> {
    await this.privateWrite('deployment.json', record);
  }
  async backup(name: 'original' | 'candidate', yaml: string): Promise<void> {
    await fs.mkdir(this.privateRoot, { recursive: true, mode: 0o700 });
    await this.atomic(path.join(this.privateRoot, name + '.yml'), yaml);
  }
  async original(): Promise<string> {
    return fs.readFile(path.join(this.privateRoot, 'original.yml'), 'utf8');
  }
  async privateWrite(name: string, value: unknown): Promise<void> {
    await fs.mkdir(this.privateRoot, { recursive: true, mode: 0o700 });
    await this.atomic(path.join(this.privateRoot, name), JSON.stringify(value, null, 2));
  }
  private async atomic(file: string, text: string): Promise<void> {
    const tmp = file + '.' + randomUUID() + '.tmp';
    await fs.writeFile(tmp, text, { mode: 0o600 });
    await fs.rename(tmp, file);
  }
}
