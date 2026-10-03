import type { CapabilitySnapshot, ToolDescriptor, SecretStore, DifyRun } from '../src/core/types';
import { minimalDsl } from '../src/core/rules';
import { parse, stringify } from 'yaml';
export const tool: ToolDescriptor = {
  key: JSON.stringify(['mcp', 'provider-1', 'customer_lookup']),
  kind: 'mcp',
  providerId: 'provider-1',
  name: 'customer_lookup',
  label: '客户查询',
  description: 'Find test customer',
  availability: 'ready',
  parameters: [
    { name: 'id', type: 'string', required: true, form: 'llm', description: 'customer id' },
  ],
  outputSchema: { type: 'object', properties: { credit: { type: 'number' } } },
  hasRuntimeParameters: false,
  source: 'fixture',
  fetchedAt: '2026-10-03',
};
export const snapshot: CapabilitySnapshot = {
  difyVersion: '1.17.1',
  connectionId: 'conn',
  workspaceId: 'workspace',
  fetchedAt: '2026-10-03',
  complete: true,
  tools: [tool],
  models: [{ provider: 'fixture/llm', model: 'test-model', type: 'llm', availability: 'ready' }],
  datasets: [],
  issues: [],
};
export function toolDsl() {
  const d = parse(minimalDsl('workflow'));
  d.workflow.graph.nodes.splice(1, 0, {
    id: 'lookup',
    type: 'custom',
    position: { x: 150, y: 0 },
    data: {
      type: 'tool',
      title: '客户查询',
      provider_type: 'mcp',
      provider_id: 'provider-1',
      tool_name: 'customer_lookup',
      tool_configurations: {},
      tool_parameters: { id: { type: 'variable', value: ['start', 'input'] } },
    },
  });
  d.workflow.graph.edges = [
    { id: 'a', source: 'start', target: 'lookup' },
    { id: 'b', source: 'lookup', target: 'finish' },
  ];
  return stringify(d);
}
export class MemorySecrets implements SecretStore {
  values = new Map<string, string>();
  async get(k: string) {
    return this.values.get(k);
  }
  async store(k: string, v: string) {
    this.values.set(k, v);
  }
  async delete(k: string) {
    this.values.delete(k);
  }
}
export const goodRun = (): DifyRun => ({
  status: 'succeeded',
  outputs: { result: 'ok' },
  answer: 'ok',
  elapsed: 0.1,
  tokens: 8,
  nodes: [{ id: 'lookup', type: 'tool', status: 'succeeded' }],
});
