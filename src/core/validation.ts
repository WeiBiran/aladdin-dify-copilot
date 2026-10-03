import { parseDocument } from 'yaml';
import type {
  CapabilitySnapshot,
  ValidationResult,
  ValidationIssue,
  AppMode,
  ToolDescriptor,
} from './types';
import { array, object } from './util';
import { SUPPORTED_NODES } from './rules';
import { versionContract } from '../dify/versions';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { RE2JS } from 're2js';
const schemaRegex = Object.assign(
  (pattern: string, flags: string) => {
    const re = RE2JS.compile(pattern, flags.includes('i') ? RE2JS.CASE_INSENSITIVE : 0);
    return { test: (s: string) => re.test(s) };
  },
  { code: 'schemaRegex' },
);
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
  code: { regExp: schemaRegex },
});
addFormats(ajv);
export function validateDsl(
  yaml: string,
  snapshot: CapabilitySnapshot,
  mode: AppMode,
  queried?: Set<string>,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const usedToolKeys: string[] = [];
  const add = (code: string, message: string, nodeId?: string) =>
    issues.push({ code, message, nodeId });
  const doc = parseDocument(yaml, { uniqueKeys: true });
  if (doc.errors.length)
    return {
      valid: false,
      issues: doc.errors.map((e) => ({ code: 'yaml', message: e.message })),
      usedToolKeys,
    };
  let raw: unknown;
  try {
    raw = doc.toJS({ maxAliasCount: 50 });
  } catch (e) {
    return { valid: false, issues: [{ code: 'yaml', message: String(e) }], usedToolKeys };
  }
  const d = object(raw),
    app = object(d.app),
    w = object(d.workflow),
    graph = object(w.graph);
  const nodes = array(graph.nodes),
    edges = array(graph.edges);
  const dslVersion = versionContract(snapshot.difyVersion).dslVersion;
  if (d.version !== dslVersion)
    add('version', `Dify ${snapshot.difyVersion} 的 DSL 必须使用 ${dslVersion}`);
  if (d.kind !== 'app') add('kind', 'kind 必须为 app');
  if (app.mode !== mode) add('mode', '应用类型与项目配置不一致');
  if (!nodes.length) add('graph', '工作流缺少节点');
  const ids = new Set<string>(),
    types = new Map<string, string>(),
    parents = new Map<string, string>();
  for (const n of nodes) {
    if (!n.id || ids.has(n.id)) add('id', '节点 ID 缺失或重复', n.id);
    ids.add(n.id);
    types.set(n.id, n.data?.type);
    if (n.parentId) parents.set(n.id, n.parentId);
  }
  if (nodes.filter((n) => n.data?.type === 'start').length !== 1)
    add('start', '必须有且只有一个开始节点');
  if (!nodes.some((n) => n.data?.type === (mode === 'workflow' ? 'end' : 'answer')))
    add('terminal', '缺少对应应用的终止节点');
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) add('edge', '连线引用不存在的节点');
    if (e.source === e.target) add('cycle', '不允许自连接');
  }
  const outgoing = new Map<string, string[]>();
  for (const e of edges) outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
  const reachable = new Set<string>();
  function reach(id: string) {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const next of outgoing.get(id) ?? []) reach(next);
    const data = object(nodes.find((n) => n.id === id)?.data);
    if (data.start_node_id) reach(data.start_node_id);
  }
  for (const n of nodes.filter((n) => n.data?.type === 'start')) reach(n.id);
  for (const n of nodes)
    if (!reachable.has(n.id)) add('unreachable', '节点不可从开始节点到达', n.id);
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) {
      add('cycle', '普通图连线中存在环；请使用 Dify 循环容器', id);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of outgoing.get(id) ?? []) visit(next);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  for (const n of nodes) {
    const data = object(n.data),
      type = String(data.type ?? '');
    if (!(SUPPORTED_NODES as readonly string[]).includes(type))
      add('unsupported', `未支持节点 ${type}，需要保留原定义并人工适配`, n.id);
    if (n.parentId && !ids.has(n.parentId)) add('parent', '容器不存在', n.id);
    if (type === 'llm') {
      const m = object(data.model);
      if (
        !snapshot.models.some(
          (x) => x.provider === m.provider && x.model === m.name && x.availability === 'ready',
        )
      )
        add('model', `模型 ${m.provider}/${m.name} 未在当前环境中配置`, n.id);
      if (!data.prompt_template && !data.memory) add('prompt', 'LLM 缺少提示词', n.id);
    }
    if (type === 'knowledge-retrieval')
      for (const id of array(data.dataset_ids))
        if (!snapshot.datasets.some((x) => x.id === id))
          add('dataset', `知识库 ${id} 不可见`, n.id);
    if (type === 'http-request') {
      const auth = object(data.authorization),
        config = object(auth.config);
      for (const [k, v] of Object.entries(config))
        if (
          !['type', 'header', 'header_name'].includes(k) &&
          typeof v === 'string' &&
          v &&
          !v.includes('{{#env.')
        )
          add('secret', 'HTTP 认证必须引用 Dify 秘密环境变量', n.id);
      if (
        typeof data.headers === 'string' &&
        data.headers
          .split('\n')
          .some(
            (line: string) =>
              /^\s*(authorization|x-api-key|api-key)\s*:/i.test(line) && !line.includes('{{#env.'),
          )
      )
        add('secret', 'HTTP 认证头不能包含明文凭据', n.id);
    }
    if (type === 'tool') {
      const t = snapshot.tools.find(
        (t) =>
          t.kind === data.provider_type &&
          t.providerId === data.provider_id &&
          t.name === data.tool_name,
      );
      if (!t) {
        add('tool', '工具标识不在当前实例中', n.id);
        continue;
      }
      usedToolKeys.push(t.key);
      if (queried && !queried.has(t.key)) add('tool-detail', '必须先查询工具完整定义', n.id);
      if (t.availability !== 'ready')
        add('configuration', `工具 ${t.name} 未配置或配置状态未知`, n.id);
      validateParams(t, data, n.id, add);
      if (t.pluginId && !array(d.dependencies).some((x) => JSON.stringify(x).includes(t.pluginId!)))
        add('dependency', `缺少插件依赖 ${t.pluginId}`, n.id);
    }
    if (['iteration', 'loop'].includes(type)) {
      if (
        !ids.has(data.start_node_id) ||
        parents.get(data.start_node_id) !== n.id ||
        types.get(data.start_node_id) !== `${type}-start`
      )
        add('container', '迭代/循环缺少正确归属的 start_node_id', n.id);
      if (
        type === 'iteration' &&
        (!array(data.iterator_selector).length || !array(data.output_selector).length)
      )
        add('container', '迭代缺少输入或输出选择器', n.id);
      if (type === 'loop' && (!Number.isInteger(data.loop_count) || data.loop_count < 1))
        add('container', '循环次数必须为正整数', n.id);
    }
    if (type === 'if-else') {
      const cases = array(data.cases);
      if (!cases.length) add('branch', '分支缺少 cases', n.id);
      const handles = new Set(['false', ...cases.map((c) => c.case_id)]);
      for (const e of edges.filter((e) => e.source === n.id))
        if (!handles.has(e.sourceHandle))
          add('branch', '分支连线必须使用真实 case_id / false 句柄', n.id);
      for (const c of cases)
        if (!array(c.conditions).length) add('branch', '分支缺少判断条件', n.id);
    }
    scanReferences(data, n.id, ids, parents, add);
  }
  for (const env of array(w.environment_variables))
    if (env.value_type === 'secret' && env.value) add('secret', 'DSL 不能包含秘密环境变量的值');
  if (/\bsk-[A-Za-z0-9_-]{10,}/.test(yaml)) add('secret', 'DSL 中包含疑似模型 API Key');
  return { valid: issues.length === 0, issues, usedToolKeys, document: d };
}
function validateParams(
  t: ToolDescriptor,
  data: Record<string, any>,
  nodeId: string,
  add: (c: string, m: string, n?: string) => void,
) {
  const params = { ...object(data.tool_configurations), ...object(data.tool_parameters) };
  for (const name of Object.keys(params))
    if (!t.parameters.some((p) => p.name === name))
      add('parameter', `工具没有参数 ${name}`, nodeId);
  for (const p of t.parameters) {
    const encoded = params[p.name];
    if (p.required && encoded === undefined && p.default === undefined)
      add('required', `缺少必填参数 ${p.name}`, nodeId);
    if (encoded === undefined) continue;
    const entry = object(encoded);
    if (entry.type === 'variable') {
      if (!array(entry.value).length) add('required', `变量参数 ${p.name} 缺少选择器`, nodeId);
      continue;
    }
    const v = entry.type ? entry.value : encoded;
    if (p.required && (v === null || v === undefined || v === ''))
      add('required', `必填参数 ${p.name} 不能是空值`, nodeId);
    if (p.type === 'secret-input' && v)
      add('secret', `秘密参数 ${p.name} 必须在 Dify 内配置，不能写入 DSL`, nodeId);
    if (p.type === 'dynamic-select' && !p.options?.length)
      add('dynamic', '动态参数选项尚未获得，不能猜测取值', nodeId);
    if (
      p.options?.length &&
      typeof v === 'string' &&
      !v.includes('{{#') &&
      !p.options.some((o) => (object(o).value ?? o) === v)
    )
      add('enum', `参数 ${p.name} 不在枚举中`, nodeId);
    if (p.type === 'number' && typeof v !== 'number' && !String(v).includes('{{#'))
      add('type', `参数 ${p.name} 应为 number`, nodeId);
    if (p.type === 'boolean' && typeof v !== 'boolean' && !String(v).includes('{{#'))
      add('type', `参数 ${p.name} 应为 boolean`, nodeId);
    if (p.type === 'object' && typeof v !== 'object' && !String(v).includes('{{#'))
      add('type', `参数 ${p.name} 应为 object`, nodeId);
    if (p.type === 'array' && !Array.isArray(v) && !String(v).includes('{{#'))
      add('type', `参数 ${p.name} 应为 array`, nodeId);
    if (p.schema && !JSON.stringify(v)?.includes('{{#')) {
      try {
        if (!ajv.validate(p.schema, v))
          add('schema', `参数 ${p.name} 不满足嵌套结构：${ajv.errorsText()}`, nodeId);
      } catch {
        add('schema', `参数 ${p.name} 的结构无法完整验证，请核对工具定义`, nodeId);
      }
    }
  }
}
function scanReferences(
  value: unknown,
  nodeId: string,
  ids: Set<string>,
  parents: Map<string, string>,
  add: (c: string, m: string, n?: string) => void,
  key = '',
) {
  const check = (ref: unknown[]) => {
    const target = String(ref[0] ?? '');
    if (!['sys', 'env', 'conversation'].includes(target) && !ids.has(target))
      add('reference', `引用不存在的节点 ${target}`, nodeId);
    if (
      parents.has(target) &&
      parents.get(target) !== parents.get(nodeId) &&
      target !== nodeId &&
      parents.get(target) !== nodeId
    )
      add('scope', `直接引用容器内部节点 ${target}；应引用容器输出`, nodeId);
  };
  if (typeof value === 'string') {
    for (const m of value.matchAll(/\{\{#([^.]+)\.([^#]+)#\}\}/g)) check([m[1], m[2]]);
  } else if (Array.isArray(value)) {
    if ((key.endsWith('selector') || key === 'value_selector') && typeof value[0] === 'string')
      check(value);
    else for (const v of value) scanReferences(v, nodeId, ids, parents, add, key);
  } else if (value && typeof value === 'object') {
    const v = object(value);
    if (v.type === 'variable' && Array.isArray(v.value)) check(v.value);
    for (const [k, x] of Object.entries(v)) scanReferences(x, nodeId, ids, parents, add, k);
  }
}
