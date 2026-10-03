import type { ProjectSpec, AppMode, DifyRun } from '../core/types';
import { DifyTransport } from './transport';
import { CapabilityRegistry } from './capabilities';
import { collectRun } from './sse';
import { array, object, ApiError, digest, normalizeBaseUrl } from '../core/util';
import { parse, stringify } from 'yaml';
import { createHash, createDecipheriv } from 'node:crypto';
import { versionContract } from './versions';
export class DifyClient {
  onTask?: (appId: string, taskId: string) => Promise<void>;
  private redactedApps = new Set<string>();
  hasRedactedSecrets(appId: string) {
    return this.redactedApps.has(appId);
  }
  readonly registry: CapabilityRegistry;
  private running = new Map<string, string>();
  constructor(readonly transport: DifyTransport) {
    this.registry = new CapabilityRegistry(transport);
  }
  async workspaces(
    signal?: AbortSignal,
  ): Promise<{ id: string; name: string; role: string; current: boolean }[]> {
    const r = await this.transport.json('/workspaces', 'GET', undefined, signal);
    return array(r.workspaces ?? r.data ?? r.items).map((x) => ({
      id: String(x.id),
      name: String(x.name),
      role: String(x.role ?? ''),
      current: x.current === true,
    }));
  }
  async selectWorkspace(id: string, signal?: AbortSignal) {
    await this.transport.json('/workspaces/switch', 'POST', { tenant_id: id }, signal);
    this.transport.profile.workspaceId = id;
    await this.assertWorkspace(signal);
  }
  async assertWorkspace(signal?: AbortSignal): Promise<void> {
    const r = await this.transport.json('/workspaces/current/summary', 'GET', undefined, signal);
    const id = r.id ?? object(r.tenant).id;
    if (this.transport.profile.workspaceId && id !== this.transport.profile.workspaceId)
      throw new ApiError(409, 'workspace', 'Dify 当前工作空间已改变，请重新连接。');
  }
  async refresh(signal?: AbortSignal) {
    await this.assertWorkspace(signal);
    return this.registry.refresh(signal);
  }
  async exportApp(appId: string, signal?: AbortSignal): Promise<string> {
    await this.assertWorkspace(signal);
    const r = await this.transport.json(
      `/apps/${encodeURIComponent(appId)}/export?include_secret=false`,
      'GET',
      undefined,
      signal,
    );
    if (typeof r.data !== 'string') throw new Error('Dify 导出未返回 DSL');
    const d = object(parse(r.data));
    const graphNodes = array(object(object(d.workflow).graph).nodes);
    this.redactedApps.delete(appId);
    if (graphNodes.some((n) => n.data?.type === 'tool')) {
      if (!this.registry.snapshot) await this.refresh(signal);
      for (const n of graphNodes.filter((n) => n.data?.type === 'tool')) {
        const data = object(n.data);
        const t = this.registry.snapshot!.tools.find(
          (t) =>
            t.kind === data.provider_type &&
            t.providerId === data.provider_id &&
            t.name === data.tool_name,
        );
        if (!t) throw new ApiError(409, 'configuration', '既有工具定义不可见，无法安全导出改造');
        const definition = await this.registry.detail(t.key, signal);
        for (const p of definition.parameters.filter((p) => p.type === 'secret-input')) {
          for (const key of ['tool_parameters', 'tool_configurations']) {
            const params = object(data[key]);
            const v = params[p.name];
            if (
              object(v).type !== 'variable' &&
              !(typeof v === 'string' && v.includes('{{#env.'))
            ) {
              if (v) this.redactedApps.add(appId);
              delete params[p.name];
            }
          }
        }
      }
      // IDs preserve a credential selection inside this workspace; values do
      // not leave Dify's credential system.
      const draft = await this.transport.json(
        `/apps/${encodeURIComponent(appId)}/workflows/draft`,
        'GET',
        undefined,
        signal,
      );
      for (const n of graphNodes.filter((n) => n.data?.type === 'tool')) {
        const source = array(object(draft.graph).nodes).find(
          (x) =>
            x.id === n.id &&
            x.data?.provider_id === n.data.provider_id &&
            x.data?.tool_name === n.data.tool_name,
        );
        if (source?.data?.credential_id) n.data.credential_id = source.data.credential_id;
      }
    }
    for (const n of graphNodes.filter((n) => n.data?.type === 'http-request')) {
      const data = object(n.data);
      const config = object(object(data.authorization).config);
      for (const [k, v] of Object.entries(config))
        if (
          !['type', 'header', 'header_name'].includes(k) &&
          typeof v === 'string' &&
          !v.includes('{{#env.')
        ) {
          if (v) this.redactedApps.add(appId);
          config[k] = '';
        }
      if (typeof data.headers === 'string')
        data.headers = data.headers
          .split('\n')
          .filter((line: string) => {
            const sensitive =
              /^\s*(authorization|x-api-key|api-key)\s*:/i.test(line) && !line.includes('{{#env.');
            if (sensitive) this.redactedApps.add(appId);
            return !sensitive;
          })
          .join('\n');
    }
    for (const n of array(object(object(d.workflow).graph).nodes)) {
      if (n.data?.type === 'knowledge-retrieval')
        n.data.dataset_ids = array(n.data.dataset_ids).map((id) => {
          if (/^[0-9a-f-]{36}$/i.test(String(id))) return id;
          try {
            const key = createHash('sha256').update(this.transport.profile.workspaceId).digest();
            const cipher = createDecipheriv('aes-256-cbc', key, key.subarray(0, 16));
            const value = Buffer.concat([
              cipher.update(Buffer.from(String(id), 'base64')),
              cipher.final(),
            ]).toString('utf8');
            if (/^[0-9a-f-]{36}$/i.test(value)) return value;
          } catch {}
          return id;
        });
    }
    return stringify(d);
  }
  async updateOriginalDraft(appId: string, yaml: string, expectedDigest: string): Promise<void> {
    await this.assertWorkspace();
    const route = `/apps/${encodeURIComponent(appId)}/workflows/draft`;
    const draft = await this.transport.json(route);
    if (typeof draft.hash !== 'string')
      throw new ApiError(409, 'version', 'Dify 没有返回草稿并发控制 hash');
    if (digest(await this.exportApp(appId)) !== expectedDigest)
      throw new ApiError(409, 'conflict', '原应用在更新前发生变化');
    const w = object(object(parse(yaml)).workflow);
    const env = array(w.environment_variables).filter((v) => v.value_type !== 'secret');
    const originalEnv = array(draft.environment_variables);
    const deleted = originalEnv
      .filter((v) => v.value_type !== 'secret' && !env.some((x) => x.id === v.id))
      .map((v) => v.id);
    const variables = versionContract(this.transport.profile.version).environmentPatch
      ? {
          environment_variable_patch: {
            environment_variables: env,
            deleted_environment_variable_ids: deleted,
          },
        }
      : {
          // 1.14.2 requires a full list. Its server normalizes this exact mask
          // to HIDDEN_VALUE and preserves the original secret by variable ID.
          // Send our known sentinel rather than copying any returned value.
          environment_variables: [
            ...env,
            ...originalEnv
              .filter((v) => v.value_type === 'secret')
              .map((v) => ({
                id: v.id,
                name: v.name,
                value_type: 'secret',
                value: '*'.repeat(20),
                description: v.description ?? '',
              })),
          ],
        };
    const result = await this.transport.json(route, 'POST', {
      graph: w.graph,
      features: w.features,
      hash: draft.hash,
      conversation_variables: array(w.conversation_variables),
      ...variables,
    });
    if (result.result !== 'success')
      throw new ApiError(409, 'conflict', 'Dify 未确认草稿更新，不能发布');
  }
  async apps(signal?: AbortSignal): Promise<{ id: string; name: string; mode: string }[]> {
    const all: { id: string; name: string; mode: string }[] = [];
    for (let p = 1; p <= 1000; p++) {
      const r = await this.transport.json(`/apps?page=${p}&limit=100`, 'GET', undefined, signal);
      all.push(
        ...array(r.data).map((x) => ({
          id: String(x.id),
          name: String(x.name),
          mode: String(x.mode),
        })),
      );
      if (!r.has_more) return all;
    }
    throw new Error('应用分页超限');
  }
  async importApp(
    yaml: string,
    name: string,
    appId?: string,
    signal?: AbortSignal,
  ): Promise<string> {
    await this.assertWorkspace(signal);
    const r = await this.transport.json(
      '/apps/imports',
      'POST',
      { mode: 'yaml-content', yaml_content: yaml, name, ...(appId ? { app_id: appId } : {}) },
      signal,
    );
    if (!['completed', 'completed-with-warnings'].includes(r.status))
      throw new ApiError(
        409,
        'import',
        `Dify 导入状态 ${r.status}：${String(r.error ?? '需要版本确认或修复')}。应用不会强制确认跨版本导入。`,
      );
    if (!r.app_id) throw new Error('导入未返回应用 ID');
    return String(r.app_id);
  }
  async dependencies(appId: string, signal?: AbortSignal): Promise<unknown[]> {
    const r = await this.transport.json(
      `/apps/imports/${encodeURIComponent(appId)}/check-dependencies`,
      'GET',
      undefined,
      signal,
    );
    return array(r.leaked_dependencies);
  }
  async defaultNodes(appId: string, signal?: AbortSignal) {
    return this.transport.json(
      `/apps/${encodeURIComponent(appId)}/workflows/default-workflow-block-configs`,
      'GET',
      undefined,
      signal,
    );
  }
  async run(
    appId: string,
    mode: AppMode,
    inputs: Record<string, unknown>,
    query?: string,
    conversationId?: string,
    signal?: AbortSignal,
  ): Promise<DifyRun> {
    await this.assertWorkspace(signal);
    const prefix = mode === 'advanced-chat' ? '/advanced-chat' : '';
    let response: Response;
    try {
      response = await this.transport.request(
        `/apps/${encodeURIComponent(appId)}${prefix}/workflows/draft/run`,
        'POST',
        {
          inputs,
          files: [],
          ...(mode === 'advanced-chat'
            ? { query: query ?? '', ...(conversationId ? { conversation_id: conversationId } : {}) }
            : {}),
        },
        signal,
      );
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new ApiError(
        409,
        'ambiguous',
        'Dify 测试请求结果未知，请先核对业务状态；不会自动重放。',
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ApiError(
        response.status,
        response.status >= 500
          ? 'ambiguous'
          : response.status === 429
            ? 'configuration'
            : response.status === 401
              ? 'authentication'
              : response.status === 403
                ? 'permission'
                : 'dify',
        `Dify 测试 HTTP ${response.status}`,
      );
    }
    try {
      const result = await collectRun(response, mode, signal, async (task) => {
        if (!this.running.has(task)) {
          this.running.set(task, appId);
          await this.onTask?.(appId, task);
        }
      });
      for (const [task, id] of this.running) if (id === appId) this.running.delete(task);
      return result;
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new ApiError(
        409,
        'ambiguous',
        'Dify 运行结果未知，可能已执行外部业务操作。请先核对运行日志和业务状态，应用不会自动重测。',
      );
    }
  }
  async stopAll(): Promise<void> {
    const tasks = [...this.running];
    await Promise.allSettled(
      tasks.map(async ([task, app]) => {
        await this.transport.json(
          `/apps/${app}/workflow-runs/tasks/${task}/stop`,
          'POST',
          {},
          AbortSignal.timeout(10000),
        );
        this.running.delete(task);
      }),
    );
  }
  rememberTasks(tasks: { appId: string; taskId: string }[]) {
    for (const t of tasks) this.running.set(t.taskId, t.appId);
  }
  unfinishedTasks() {
    return [...this.running].map(([taskId, appId]) => ({ taskId, appId }));
  }
  async publish(appId: string, comment: string, signal?: AbortSignal): Promise<void> {
    await this.assertWorkspace(signal);
    const r = await this.transport.json(
      `/apps/${encodeURIComponent(appId)}/workflows/publish`,
      'POST',
      {
        marked_name: 'Copilot ' + new Date().toISOString().slice(5, 16),
        marked_comment: comment.slice(0, 100),
      },
      signal,
    );
    if (r.result !== 'success') throw new Error('Dify 未确认发布成功');
  }
  async app(appId: string, signal?: AbortSignal) {
    return this.transport.json(`/apps/${encodeURIComponent(appId)}`, 'GET', undefined, signal);
  }
  async published(appId: string, signal?: AbortSignal) {
    return this.transport.json(
      `/apps/${encodeURIComponent(appId)}/workflows/publish`,
      'GET',
      undefined,
      signal,
    );
  }
  url(appId: string, mode: AppMode) {
    return `${this.transport.baseUrl}/app/${appId}/${mode === 'advanced-chat' ? 'workflow' : 'workflow'}`;
  }
  async preview(appId: string, mode: AppMode, signal = AbortSignal.timeout(15000)) {
    await this.assertWorkspace(signal);
    const app = await this.app(appId, signal);
    const site = object(app.site);
    const code = site.code ?? site.access_token;
    const base =
      typeof site.app_base_url === 'string' && site.app_base_url
        ? normalizeBaseUrl(site.app_base_url)
        : this.transport.baseUrl;
    return {
      editorUrl: this.url(appId, mode),
      runtimeUrl:
        app.enable_site === true && typeof code === 'string' && code
          ? `${base}/${mode === 'advanced-chat' ? 'chatbot' : 'workflow'}/${encodeURIComponent(code)}`
          : undefined,
      published: Boolean(app.workflow),
    };
  }
}
