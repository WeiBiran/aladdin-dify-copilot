import type { JsonObject } from './types';
import { versionContract, type DifyVersion } from '../dify/versions';
// Structural data examples, derived from the pinned upstream default.ts files.
// Empty IDs/selectors are placeholders, not runnable nodes. Live import/run is
// required for each node before declaring a Dify version compatible.
export const NODE_TEMPLATES: Record<string, JsonObject> = {
  start: { variables: [] },
  end: { outputs: [] },
  answer: { answer: '', variables: [] },
  llm: {
    model: { provider: '', name: '', mode: 'chat', completion_params: { temperature: 0.7 } },
    prompt_template: [{ role: 'system', text: '' }],
    context: { enabled: false, variable_selector: [] },
    vision: { enabled: false },
  },
  tool: {
    provider_type: '',
    provider_id: '',
    tool_name: '',
    tool_node_version: '2',
    tool_parameters: {},
    tool_configurations: {},
  },
  'knowledge-retrieval': {
    query_variable_selector: [],
    query_attachment_selector: [],
    dataset_ids: [],
    retrieval_mode: 'multiple',
    multiple_retrieval_config: { top_k: 4, reranking_enable: false },
  },
  'http-request': {
    variables: [],
    method: 'get',
    url: '',
    authorization: { type: 'no-auth', config: null },
    headers: '',
    params: '',
    body: { type: 'none', data: [] },
    ssl_verify: true,
    timeout: { max_connect_timeout: 0, max_read_timeout: 0, max_write_timeout: 0 },
    retry_config: { retry_enabled: false, max_retries: 0, retry_interval: 100 },
  },
  'if-else': { cases: [{ case_id: 'true', logical_operator: 'and', conditions: [] }] },
  'template-transform': { template: '', variables: [] },
  code: { code_language: 'python3', code: '', variables: [], outputs: {} },
  assigner: { version: '2', items: [] },
  'variable-aggregator': { output_type: 'any', variables: [] },
  iteration: {
    start_node_id: '',
    iterator_selector: [],
    output_selector: [],
    is_parallel: false,
    parallel_nums: 10,
    error_handle_mode: 'terminated',
    flatten_output: true,
  },
  'iteration-start': {},
  loop: { start_node_id: '', break_conditions: [], loop_count: 10, logical_operator: 'and' },
  'loop-start': {},
  'loop-end': {},
};
export function nodeTemplate(type: string, version: DifyVersion = '1.17.1') {
  versionContract(version);
  const data = NODE_TEMPLATES[type];
  if (!data) throw new Error('该节点没有版本模板');
  return {
    data: { type, title: type, ...data },
    source: `https://github.com/langgenius/dify/tree/${version}/web/app/components/workflow/nodes`,
    verified: 'source-derived; live import/run pending',
    notes:
      type === 'http-request' ? 'Retry disabled to avoid duplicating external writes.' : undefined,
  };
}
