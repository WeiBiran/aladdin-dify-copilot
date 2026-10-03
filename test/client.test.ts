import { describe, it, expect, vi } from 'vitest';
import { createHash, createCipheriv } from 'node:crypto';
import { parse, stringify } from 'yaml';
import { DifyClient } from '../src/dify/client';
import type { DifyTransport } from '../src/dify/transport';
import { minimalDsl } from '../src/core/rules';
import { ApiError, digest } from '../src/core/util';

describe('Dify source-derived adapter contracts (mock HTTP)', () => {
  it('excludes inline HTTP secrets from exported editable DSL and marks manual merge', async () => {
    const doc = parse(minimalDsl('workflow'));
    doc.workflow.graph.nodes[0].data = {
      type: 'http-request',
      authorization: {
        type: 'api-key',
        config: { type: 'bearer', api_key: 'real-looking-private-value' },
      },
      headers: 'Authorization: Bearer private-header\nContent-Type: application/json',
    };
    const client = new DifyClient({
      profile: { workspaceId: 'workspace', version: '1.17.1' },
      json: vi.fn(async (route: string) =>
        route.endsWith('/summary') ? { id: 'workspace' } : { data: stringify(doc) },
      ),
    } as unknown as DifyTransport);
    const yaml = await client.exportApp('app');
    expect(yaml).not.toContain('real-looking-private-value');
    expect(yaml).not.toContain('private-header');
    expect(yaml).toContain('Content-Type');
    expect(client.hasRedactedSecrets('app')).toBe(true);
  });
  it('decodes workspace-encrypted dataset IDs without making them model credentials', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const key = createHash('sha256').update('workspace').digest();
    const cipher = createCipheriv('aes-256-cbc', key, key.subarray(0, 16));
    const encoded = Buffer.concat([cipher.update(id), cipher.final()]).toString('base64');
    const doc = parse(minimalDsl('workflow'));
    doc.workflow.graph.nodes[0].data = { type: 'knowledge-retrieval', dataset_ids: [encoded] };
    const transport = {
      profile: { workspaceId: 'workspace', version: '1.17.1' },
      json: vi.fn(async (route: string) =>
        route.endsWith('/summary') ? { id: 'workspace' } : { data: stringify(doc) },
      ),
    } as unknown as DifyTransport;
    const result = parse(await new DifyClient(transport).exportApp('app'));
    expect(result.workflow.graph.nodes[0].data.dataset_ids).toEqual([id]);
  });
  it('uses server hash for original updates and preserves secret environment values', async () => {
    const yaml = minimalDsl('workflow');
    const doc = parse(yaml);
    doc.workflow.environment_variables = [
      { id: 'public', name: 'region', value_type: 'string', value: 'new' },
    ];
    const json = vi.fn(async (route: string, method?: string, body?: any) => {
      if (route.endsWith('/summary')) return { id: 'workspace' };
      if (route.includes('/export')) return { data: yaml };
      if (method === 'POST') return { result: 'success', hash: 'next' };
      return {
        hash: 'remote-hash',
        environment_variables: [
          { id: 'public', name: 'region', value_type: 'string', value: 'old' },
          { id: 'secret', name: 'key', value_type: 'secret', value: 'must-never-be-sent' },
        ],
      };
    });
    const client = new DifyClient({
      profile: { workspaceId: 'workspace', version: '1.17.1' },
      json,
    } as unknown as DifyTransport);
    const normalized = await client.exportApp('app');
    await client.updateOriginalDraft('app', stringify(doc), digest(normalized));
    const call = json.mock.calls.find((c) => c[1] === 'POST')!;
    expect(call[2].hash).toBe('remote-hash');
    expect(call[2].environment_variable_patch.environment_variables).toEqual(
      doc.workflow.environment_variables,
    );
    expect(JSON.stringify(call[2])).not.toContain('must-never-be-sent');
    expect(call[2].environment_variable_patch.deleted_environment_variable_ids).toEqual([]);
  });
  it('does not send an update after an observed original conflict', async () => {
    const json = vi.fn(async (route: string, method?: string) =>
      route.endsWith('/summary')
        ? { id: 'workspace' }
        : route.includes('/export')
          ? { data: minimalDsl('workflow', 'remote changed') }
          : { hash: 'remote-hash' },
    );
    const client = new DifyClient({
      profile: { workspaceId: 'workspace', version: '1.17.1' },
      json,
    } as unknown as DifyTransport);
    await expect(client.updateOriginalDraft('app', minimalDsl('workflow'), 'old')).rejects.toThrow(
      '变化',
    );
    expect(json.mock.calls.some((c) => c[1] === 'POST')).toBe(false);
  });
  it('classifies a lost draft run response as ambiguous instead of retryable DSL failure', async () => {
    const client = new DifyClient({
      profile: { workspaceId: 'workspace', version: '1.17.1' },
      json: vi.fn(async () => ({ id: 'workspace' })),
      request: vi.fn(async () => {
        throw new Error('lost after write');
      }),
    } as unknown as DifyTransport);
    await expect(client.run('app', 'workflow', {})).rejects.toMatchObject({
      category: 'ambiguous',
    });
  });
});
