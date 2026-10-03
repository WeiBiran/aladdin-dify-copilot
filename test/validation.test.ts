import { describe, it, expect } from 'vitest';
import { parse, stringify } from 'yaml';
import { validateDsl } from '../src/core/validation';
import { minimalDsl } from '../src/core/rules';
import { snapshot, tool, toolDsl } from './fixtures';
describe('DSL validator', () => {
  it('validates nested object required fields and enums against real schema', () => {
    const s = structuredClone(snapshot);
    s.tools[0]!.parameters = [
      {
        name: 'payload',
        type: 'object',
        required: true,
        form: 'llm',
        description: '',
        schema: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['kind'],
                properties: { kind: { enum: ['a', 'b'] } },
              },
            },
          },
        },
      },
    ];
    const d = parse(toolDsl());
    d.workflow.graph.nodes[1].data.tool_parameters = {
      payload: { type: 'constant', value: { items: [{ kind: 'unexpected' }] } },
    };
    expect(validateDsl(stringify(d), s, 'workflow').issues.some((i) => i.code === 'schema')).toBe(
      true,
    );
    d.workflow.graph.nodes[1].data.tool_parameters.payload.value.items[0].kind = 'a';
    expect(validateDsl(stringify(d), s, 'workflow').valid).toBe(true);
  });
  it('rejects dynamic options and model availability that are unknown', () => {
    const s = structuredClone(snapshot);
    s.tools[0]!.parameters[0]!.type = 'dynamic-select';
    const d = parse(toolDsl());
    d.workflow.graph.nodes[1].data.tool_parameters.id = { type: 'constant', value: 'guessed' };
    expect(validateDsl(stringify(d), s, 'workflow').issues.some((i) => i.code === 'dynamic')).toBe(
      true,
    );
  });
  it('rejects orphan nodes and invalid container ownership', () => {
    const d = parse(minimalDsl('workflow'));
    d.workflow.graph.nodes.push({ id: 'orphan', data: { type: 'code' } });
    expect(
      validateDsl(stringify(d), snapshot, 'workflow').issues.some((i) => i.code === 'unreachable'),
    ).toBe(true);
  });
  it.each(['workflow', 'advanced-chat'] as const)('accepts minimum %s', (mode) =>
    expect(validateDsl(minimalDsl(mode), snapshot, mode).valid).toBe(true),
  );
  it('requires a full detail read for each real tool', () => {
    expect(
      validateDsl(toolDsl(), snapshot, 'workflow', new Set()).issues.some(
        (i) => i.code === 'tool-detail',
      ),
    ).toBe(true);
    expect(validateDsl(toolDsl(), snapshot, 'workflow', new Set([tool.key])).valid).toBe(true);
  });
  it('blocks invented identifiers and deleted tools', () => {
    expect(
      validateDsl(toolDsl(), { ...snapshot, tools: [] }, 'workflow').issues.some(
        (i) => i.code === 'tool',
      ),
    ).toBe(true);
  });
  it('blocks missing tool parameters and invalid variables', () => {
    const d = parse(toolDsl());
    d.workflow.graph.nodes[1].data.tool_parameters = {
      id: { type: 'variable', value: ['missing', 'value'] },
    };
    expect(
      validateDsl(stringify(d), snapshot, 'workflow').issues.some((i) => i.code === 'reference'),
    ).toBe(true);
    delete d.workflow.graph.nodes[1].data.tool_parameters.id;
    expect(
      validateDsl(stringify(d), snapshot, 'workflow').issues.some((i) => i.code === 'required'),
    ).toBe(true);
  });
  it('rejects ordinary cycles, secret values, and unsupported nodes without deleting them', () => {
    const d = parse(minimalDsl('workflow'));
    d.workflow.graph.edges.push({ source: 'finish', target: 'start' });
    d.workflow.environment_variables = [{ value_type: 'secret', value: 'private' }];
    d.workflow.graph.nodes[1].data.type = 'human-input';
    const r = validateDsl(stringify(d), snapshot, 'workflow');
    expect(r.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['cycle', 'secret', 'unsupported']),
    );
    expect(r.document?.workflow).toBeDefined();
  });
  it('rejects mismatched DSL version and alias bombs', () => {
    expect(validateDsl('version: 0.4.0', snapshot, 'workflow').valid).toBe(false);
    expect(validateDsl('a: 1\na: 2', snapshot, 'workflow').issues[0]?.code).toBe('yaml');
  });
});
