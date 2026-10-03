import { describe, it, expect, vi } from 'vitest';
import { normalizeTools, CapabilityRegistry } from '../src/dify/capabilities';
import { ApiError } from '../src/core/util';
import type { DifyTransport } from '../src/dify/transport';
describe('capability visibility (contract fixtures, not live Dify)', () => {
  it('retains nested schemas and real IDs but drops credentials', () => {
    const [t] = normalizeTools('mcp', [
      {
        id: 'qualified/provider',
        is_team_authorization: true,
        original_headers: { Authorization: 'SECRET' },
        tools: [
          {
            name: 'lookup',
            description: { zh_Hans: '查客户' },
            parameters: [
              {
                name: 'filter',
                type: 'object',
                required: true,
                form: 'llm',
                input_schema: {
                  type: 'object',
                  properties: { ids: { type: 'array', items: { type: 'string' } } },
                },
              },
            ],
            output_schema: { type: 'object' },
          },
        ],
      },
    ]);
    expect(t?.parameters[0]?.schema?.properties).toBeDefined();
    expect(t?.providerId).toBe('qualified/provider');
    expect(JSON.stringify(t)).not.toContain('SECRET');
  });
  it('does not treat permission failure as an empty complete catalog', async () => {
    const transport = {
      profile: { id: 'c', workspaceId: 'w', version: '1.17.1' },
      json: vi.fn(async (route: string) => {
        if (route.endsWith('/mcp')) throw new ApiError(403, 'permission', 'forbidden');
        return { data: [] };
      }),
    } as unknown as DifyTransport;
    const registry = new CapabilityRegistry(transport);
    const s = await registry.refresh();
    expect(s.complete).toBe(false);
    expect(s.issues).toContainEqual({ category: 'mcp', reason: 'forbidden', status: 403 });
  });
  it('isolates snapshot from connection/workspace changes and records detail reads', async () => {
    const p = { id: 'p', is_team_authorization: true, tools: [{ name: 'search', parameters: [] }] };
    const transport = {
      profile: { id: 'a', workspaceId: 'w', version: '1.17.1' },
      json: vi.fn(async (route: string) =>
        route.includes('builtin')
          ? route.endsWith('/tools')
            ? { items: p.tools }
            : { items: [p] }
          : { data: [] },
      ),
    } as unknown as DifyTransport;
    const registry = new CapabilityRegistry(transport);
    await registry.refresh();
    const key = registry.snapshot!.tools[0]!.key;
    await registry.detail(key);
    expect(registry.queried.has(key)).toBe(true);
    transport.profile.workspaceId = 'other';
    await registry.refresh();
    expect(registry.snapshot?.workspaceId).toBe('other');
    expect(registry.queried.size).toBe(0);
  });
});
