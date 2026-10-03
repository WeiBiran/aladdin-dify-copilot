import { describe, it, expect } from 'vitest';
import { DifyTransport } from '../src/dify/transport';
import { MemorySecrets } from './fixtures';
import { normalizeBaseUrl } from '../src/core/util';
const profile = {
  id: 'x',
  workspaceId: 'w',
  baseUrl: 'https://dify.example/company/console/api',
  email: 'test@example.com',
  version: '1.17.1' as const,
};
describe('Dify 1.17.1 auth contract (mock HTTP)', () => {
  it('normalizes reverse proxy paths and rejects credential URLs', () => {
    expect(normalizeBaseUrl(profile.baseUrl)).toBe('https://dify.example/company');
    expect(() => normalizeBaseUrl('https://user:pass@example.com')).toThrow();
  });
  it('base64 encodes password, stores cookies in secret store, restores CSRF', async () => {
    let count = 0;
    const requests: RequestInit[] = [];
    const secrets = new MemorySecrets();
    const fetcher = (async (_url: unknown, init: RequestInit) => {
      requests.push(init);
      count++;
      const h = new Headers({ 'Content-Type': 'application/json' });
      if (count === 1) {
        h.append('Set-Cookie', '__Host-access_token=session; Secure; HttpOnly; Path=/');
        h.append('Set-Cookie', '__Host-csrf_token=csrf; Secure; Path=/');
        h.append('Set-Cookie', '__Host-refresh_token=refresh; Secure; HttpOnly; Path=/');
      }
      return new Response(JSON.stringify({ result: 'success' }), { headers: h });
    }) as typeof fetch;
    const t = new DifyTransport(profile, secrets, fetcher);
    await t.login('user', 'pässword');
    expect(JSON.parse(requests[0]!.body as string).password).toBe(
      Buffer.from('pässword').toString('base64'),
    );
    const restored = new DifyTransport(profile, secrets, fetcher);
    await restored.restore();
    await restored.json('/apps');
    expect((requests[1]!.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf');
    expect((requests[1]!.headers as Record<string, string>).Cookie).toContain(
      'access_token=session',
    );
  });
  it('refreshes once on unauthorized and never retries network mutation failure', async () => {
    let n = 0;
    const fetcher = (async (url: unknown) => {
      n++;
      if (String(url).endsWith('/refresh-token')) return Response.json({ result: 'success' });
      return Response.json(n === 1 ? { message: 'expired' } : { data: [] }, {
        status: n === 1 ? 401 : 200,
      });
    }) as typeof fetch;
    const t = new DifyTransport(profile, new MemorySecrets(), fetcher);
    await t.json('/apps');
    expect(n).toBe(3);
    let calls = 0;
    const broken = new DifyTransport(profile, new MemorySecrets(), (async () => {
      calls++;
      throw new Error('network');
    }) as typeof fetch);
    await expect(broken.json('/apps/imports', 'POST', {})).rejects.toThrow('network');
    expect(calls).toBe(1);
  });
});
