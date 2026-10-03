import type {
  ToolDescriptor,
  ToolKind,
  ToolParameter,
  CapabilitySnapshot,
  ModelDescriptor,
  Availability,
} from '../core/types';
import { array, object, localized, ApiError } from '../core/util';
import type { DifyTransport } from './transport';
const list = (r: Record<string, any>): any[] => array(r.items ?? r.data ?? r.providers);
function state(provider: Record<string, any>): Availability {
  return provider.is_team_authorization === true
    ? 'ready'
    : provider.is_team_authorization === false
      ? 'unconfigured'
      : 'unknown';
}
export function normalizeTools(
  kind: ToolKind,
  providers: unknown[],
  timestamp = new Date().toISOString(),
): ToolDescriptor[] {
  const result: ToolDescriptor[] = [];
  for (const raw of providers) {
    const p = object(raw);
    const providerId = String(p.id ?? p.name ?? '');
    if (!providerId) continue;
    for (const rawTool of array(p.tools)) {
      const t = object(rawTool),
        identity = object(t.identity);
      const name = String(t.name ?? identity.name ?? '');
      if (!name) continue;
      const parameters: ToolParameter[] = array(t.parameters).map((raw) => {
        const x = object(raw),
          secret = x.type === 'secret-input';
        return {
          name: String(x.name),
          type: String(x.type ?? 'string'),
          required: x.required === true,
          form: String(x.form ?? 'llm'),
          description: String(x.llm_description ?? localized(x.human_description)),
          ...(!secret && x.options !== undefined
            ? {
                options: array(x.options).map((o) =>
                  typeof o === 'object'
                    ? { value: object(o).value, label: localized(object(o).label) }
                    : o,
                ),
              }
            : {}),
          ...(!secret && x.default !== undefined ? { default: x.default } : {}),
          ...(x.input_schema ? { schema: object(x.input_schema) } : {}),
        };
      });
      const schema = object(t.output_schema);
      result.push({
        key: JSON.stringify([kind, providerId, name]),
        kind,
        providerId,
        name,
        label: localized(t.label ?? identity.label) || name,
        description: localized(t.description) || String(object(t.description).llm ?? ''),
        availability: state(p),
        parameters,
        ...(Object.keys(schema).length ? { outputSchema: schema } : {}),
        ...(p.plugin_unique_identifier ? { pluginId: String(p.plugin_unique_identifier) } : {}),
        hasRuntimeParameters: t.has_runtime_parameters === true,
        source: `Dify /tools/${kind}`,
        fetchedAt: timestamp,
      });
    }
  }
  return result;
}
export class CapabilityRegistry {
  snapshot?: CapabilitySnapshot;
  readonly queried = new Set<string>();
  constructor(private transport: DifyTransport) {}
  async refresh(signal?: AbortSignal): Promise<CapabilitySnapshot> {
    this.queried.clear();
    const s: CapabilitySnapshot = {
      difyVersion: this.transport.profile.version,
      connectionId: this.transport.profile.id,
      workspaceId: this.transport.profile.workspaceId,
      fetchedAt: new Date().toISOString(),
      complete: true,
      tools: [],
      models: [],
      datasets: [],
      issues: [],
    };
    const tasks: Promise<void>[] = (['builtin', 'api', 'workflow', 'mcp'] as ToolKind[]).map(
      async (kind) => {
        try {
          const r = await this.transport.json(
            `/workspaces/current/tools/${kind}`,
            'GET',
            undefined,
            signal,
          );
          s.tools.push(...normalizeTools(kind, list(r), s.fetchedAt));
        } catch (e) {
          this.issue(s, kind, e);
        }
      },
    );
    tasks.push(
      (async () => {
        try {
          const providers = list(
            await this.transport.json(
              '/workspaces/current/model-providers',
              'GET',
              undefined,
              signal,
            ),
          );
          for (const p of providers) {
            const id = String(p.provider ?? p.id ?? '');
            if (!id) continue;
            try {
              const r = await this.transport.json(
                `/workspaces/current/model-providers/${encodeURIComponent(id)}/models`,
                'GET',
                undefined,
                signal,
              );
              for (const m of list(r)) {
                s.models.push({
                  provider: id,
                  model: String(m.model ?? m.model_name ?? ''),
                  type: String(m.model_type ?? 'llm'),
                  availability:
                    m.status === 'active'
                      ? 'ready'
                      : m.status === 'no-configure'
                        ? 'unconfigured'
                        : 'unknown',
                } satisfies ModelDescriptor);
              }
            } catch (e) {
              this.issue(s, 'models:' + id, e);
            }
          }
        } catch (e) {
          this.issue(s, 'models', e);
        }
      })(),
    );
    tasks.push(
      (async () => {
        try {
          let page = 1;
          for (;;) {
            const r = await this.transport.json(
              `/datasets?page=${page}&limit=100`,
              'GET',
              undefined,
              signal,
            );
            for (const d of list(r))
              s.datasets.push({
                id: String(d.id),
                name: String(d.name ?? ''),
                description: String(d.description ?? ''),
                permission: String(d.permission ?? ''),
              });
            if (!r.has_more) break;
            if (++page > 1000) throw new Error('知识库分页超限');
          }
        } catch (e) {
          this.issue(s, 'datasets', e);
        }
      })(),
    );
    await Promise.all(tasks);
    s.complete = s.issues.length === 0;
    this.snapshot = s;
    return s;
  }
  search(query: string, limit = 20) {
    const q = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (this.snapshot?.tools ?? [])
      .map((t) => ({
        t,
        score: q.reduce(
          (n, w) => n + Number(`${t.name} ${t.label} ${t.description}`.toLowerCase().includes(w)),
          0,
        ),
      }))
      .filter((x) => !q.length || x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ t }) => ({
        key: t.key,
        label: t.label,
        description: t.description,
        availability: t.availability,
      }));
  }
  async detail(key: string, signal?: AbortSignal): Promise<ToolDescriptor> {
    let tool = this.snapshot?.tools.find((t) => t.key === key);
    if (!tool) throw new Error('工具不在当前能力快照中。');
    let route: string;
    if (tool.kind === 'builtin')
      route = `/workspaces/current/tool-provider/builtin/${encodeURIComponent(tool.providerId)}/tools`;
    else if (tool.kind === 'mcp')
      route = `/workspaces/current/tool-provider/mcp/tools/${encodeURIComponent(tool.providerId)}`;
    else
      route = `/workspaces/current/tool-provider/${tool.kind}/tools?provider=${encodeURIComponent(tool.providerId)}`;
    const r = await this.transport.json(route, 'GET', undefined, signal);
    const providers =
      tool.kind === 'mcp'
        ? [r]
        : [
            {
              id: tool.providerId,
              ...(tool.availability === 'unknown'
                ? {}
                : { is_team_authorization: tool.availability === 'ready' }),
              plugin_unique_identifier: tool.pluginId,
              tools: list(r),
            },
          ];
    const fresh = normalizeTools(tool.kind, providers).find((t) => t.key === key);
    if (!fresh) throw new Error(`工具 ${tool.name} 已被删除或无权读取。`);
    const i = this.snapshot!.tools.findIndex((t) => t.key === key);
    this.snapshot!.tools[i] = fresh;
    this.queried.add(key);
    return fresh;
  }
  private issue(s: CapabilitySnapshot, category: string, e: unknown) {
    s.issues.push({
      category,
      reason: e instanceof Error ? e.message : String(e),
      ...(e instanceof ApiError ? { status: e.status } : {}),
    });
  }
}
