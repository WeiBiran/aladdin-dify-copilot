import { describe, it, expect, vi } from 'vitest';
import { parse, stringify } from 'yaml';
import { minimalDsl, rulesFor } from '../src/core/rules';
import { validateDsl } from '../src/core/validation';
import { snapshot } from './fixtures';
import { DifyClient } from '../src/dify/client';
import type { DifyTransport } from '../src/dify/transport';
import { digest } from '../src/core/util';

describe('Dify 1.14.2 version differences (mock contracts)', () => {
  it('uses DSL 0.6.0 and rejects the 1.17.1 version on the company adapter', () => {
    const s = { ...snapshot, difyVersion: '1.14.2' as const };
    for (const mode of ['workflow', 'advanced-chat'] as const) {
      expect(validateDsl(minimalDsl(mode, 'Test', '1.14.2'), s, mode).valid).toBe(true);
      expect(validateDsl(minimalDsl(mode), s, mode).issues.some((i) => i.code === 'version')).toBe(
        true,
      );
    }
    expect(rulesFor('1.14.2')).toContain('0.6.0');
  });
  it('preserves legacy secret IDs using the upstream mask and full-list contract', async () => {
    const yaml = minimalDsl('workflow', 'Test', '1.14.2');
    const doc = parse(yaml);
    doc.workflow.environment_variables = [
      { id: 'public', name: 'region', value_type: 'string', value: 'new' },
    ];
    const json = vi.fn(async (route: string, method?: string, body?: any) => {
      if (route.endsWith('/summary')) return { id: 'workspace' };
      if (route.includes('/export')) return { data: yaml };
      if (method === 'POST') return { result: 'success' };
      return {
        hash: 'remote',
        environment_variables: [
          {
            id: 'secret',
            name: 'api_key',
            value_type: 'secret',
            value: 'returned-value-must-never-be-copied',
          },
          { id: 'old-public', name: 'old', value_type: 'string', value: 'remove' },
        ],
      };
    });
    const client = new DifyClient({
      profile: { workspaceId: 'workspace', version: '1.14.2' },
      json,
    } as unknown as DifyTransport);
    await client.updateOriginalDraft('app', stringify(doc), digest(await client.exportApp('app')));
    const payload = json.mock.calls.find((c) => c[1] === 'POST')![2];
    expect(payload.hash).toBe('remote');
    expect(payload.environment_variable_patch).toBeUndefined();
    expect(payload.environment_variables).toEqual([
      ...doc.workflow.environment_variables,
      {
        id: 'secret',
        name: 'api_key',
        value_type: 'secret',
        value: '*'.repeat(20),
        description: '',
      },
    ]);
    expect(JSON.stringify(payload)).not.toContain('returned-value-must-never-be-copied');
  });
});
