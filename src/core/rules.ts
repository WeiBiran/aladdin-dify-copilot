import { stringify } from 'yaml';
import { versionContract, type DifyVersion } from '../dify/versions';
export const SUPPORTED_NODES = [
  'start',
  'end',
  'answer',
  'llm',
  'tool',
  'knowledge-retrieval',
  'http-request',
  'if-else',
  'template-transform',
  'code',
  'assigner',
  'variable-aggregator',
  'iteration',
  'iteration-start',
  'loop',
  'loop-start',
  'loop-end',
] as const;
const SHARED_RULES = `Modes: workflow or advanced-chat.
Use only tools and model IDs discovered from this connected instance. Provider identity must exactly match, including plugin-qualified ID. Never use a display label as a provider ID.
Read full tool details before selecting it. Preserve parameter names/types/required/enums. form/schema parameters belong in tool_configurations; LLM parameters in tool_parameters with Dify {type: variable|mixed|constant, value: ...} encoding. Check actual dynamic options before supplying a dynamic_select value.
Unknown output_schema is NOT a license to invent fields: use documented generic text/json/files output, or a Dify probe through a candidate test draft. Tools execute in Dify; no tool credentials belong in DSL.
Nodes must have data.type/title, matching graph IDs, custom node/edge ReactFlow metadata and proper handles. Workflow terminates in end with outputs; Chatflow terminates in answer and uses sys.query and conversation variables. Tool/LLM data variable references use Dify selectors [node_id, field] and prompt references {{#node_id.field#}}. Loops are only represented by Dify loop/iteration container structure; no arbitrary cycles.
For complex nodes query server default node configs when a test app exists. Do not invent plugins, knowledge bases, external services or credentials. Missing dependencies need user action.
Use explicit test inputs and objective assertions; do not weaken test cases to get a pass. Generated code executes only inside Dify's code node sandbox. Include plugin unique identifiers in dependencies for used plugin tools.
Supported types: ${SUPPORTED_NODES.join(', ')}. Other nodes in existing apps must be preserved and flagged for unsupported modification.`;
export function rulesFor(version: DifyVersion): string {
  return `Dify self-hosted ${version}, app DSL version ${versionContract(version).dslVersion}. ${SHARED_RULES}`;
}
export function minimalDsl(
  mode: 'workflow' | 'advanced-chat',
  name = 'Example',
  version: DifyVersion = '1.17.1',
): string {
  const start = {
    id: 'start',
    type: 'custom',
    position: { x: 0, y: 0 },
    sourcePosition: 'right',
    targetPosition: 'left',
    data: {
      type: 'start',
      title: '开始',
      selected: false,
      variables: [
        {
          variable: 'input',
          label: '输入',
          type: 'text-input',
          required: true,
          max_length: 256,
          options: [],
        },
      ],
    },
  };
  const terminal =
    mode === 'workflow'
      ? {
          type: 'end',
          title: '结束',
          outputs: [{ variable: 'result', value_selector: ['start', 'input'] }],
        }
      : { type: 'answer', title: '回答', answer: '{{#sys.query#}}', variables: [] };
  return stringify({
    app: {
      name,
      mode,
      icon: '🤖',
      icon_background: '#E4FBCC',
      description: 'Dify Copilot project',
      use_icon_as_answer_icon: false,
    },
    kind: 'app',
    version: versionContract(version).dslVersion,
    dependencies: [],
    workflow: {
      conversation_variables: [],
      environment_variables: [],
      features: {
        file_upload: { enabled: false },
        opening_statement: '',
        suggested_questions: [],
        suggested_questions_after_answer: { enabled: false },
        speech_to_text: { enabled: false },
        text_to_speech: { enabled: false },
        retriever_resource: { enabled: true },
        sensitive_word_avoidance: { enabled: false },
      },
      graph: {
        nodes: [
          start,
          {
            id: 'finish',
            type: 'custom',
            position: { x: 300, y: 0 },
            sourcePosition: 'right',
            targetPosition: 'left',
            data: { ...terminal, selected: false },
          },
        ],
        edges: [
          {
            id: 'start-finish',
            type: 'custom',
            source: 'start',
            sourceHandle: 'source',
            target: 'finish',
            targetHandle: 'target',
            data: {
              sourceType: 'start',
              targetType: terminal.type,
              isInIteration: false,
              isInLoop: false,
            },
          },
        ],
      },
    },
  });
}
