import { CookieJar } from 'tough-cookie';
import type { SecretStore, ConnectionProfile } from '../core/types';
import { ApiError, normalizeBaseUrl, object, redact } from '../core/util';
export class DifyTransport {
  private jar = new CookieJar();
  private refreshing?: Promise<void>;
  readonly baseUrl: string;
  constructor(
    readonly profile: ConnectionProfile,
    private secrets: SecretStore,
    private fetcher: typeof fetch = fetch,
  ) {
    this.baseUrl = normalizeBaseUrl(profile.baseUrl);
  }
  private get key() {
    return `dify.session.${this.profile.id}`;
  }
  async restore(): Promise<void> {
    const saved = await this.secrets.get(this.key);
    if (saved) this.jar = CookieJar.deserializeSync(JSON.parse(saved));
  }
  async login(email: string, password: string, signal?: AbortSignal): Promise<void> {
    this.jar = new CookieJar();
    let response: Record<string, any>;
    try {
      response = await this.json(
        '/login',
        'POST',
        { email, password: Buffer.from(password, 'utf8').toString('base64'), remember_me: false },
        signal,
        false,
      );
    } catch (e) {
      const message = redact(e instanceof Error ? e.message : String(e), [
        password,
        Buffer.from(password, 'utf8').toString('base64'),
      ]);
      if (e instanceof ApiError) throw new ApiError(e.status, e.category, message);
      throw new Error(message);
    }
    if (response.result !== 'success')
      throw new ApiError(401, 'authentication', 'Dify 登录失败，请检查账号及工作空间。');
    const cookies = await this.jar.getCookies(this.baseUrl + '/console/api');
    if (!cookies.some((c) => c.key.endsWith('access_token')))
      throw new ApiError(
        401,
        'version',
        `Dify 未返回 ${this.profile.version} 会话 Cookie，请核实部署版本。`,
      );
  }
  async json(
    route: string,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal,
    retry = true,
  ): Promise<Record<string, any>> {
    const response = await this.request(route, method, body, signal, retry);
    if (response.status === 204) return {};
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(response.status, 'protocol', `Dify ${route} 未返回 JSON`);
    }
    if (!response.ok) {
      const d = object(data);
      throw new ApiError(
        response.status,
        response.status === 401
          ? 'authentication'
          : response.status === 403
            ? 'permission'
            : 'dify',
        redact(
          String(d.message ?? d.error ?? `Dify HTTP ${response.status}`),
          (await this.jar.getCookies(this.baseUrl + '/console/api')).map((c) => c.value),
        ),
      );
    }
    return Array.isArray(data) ? { items: data } : object(data);
  }
  async request(
    route: string,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal,
    retry = true,
  ): Promise<Response> {
    if (!route.startsWith('/') || route.startsWith('//')) throw new Error('Invalid Dify route');
    const url = this.baseUrl + '/console/api' + route;
    const cookies = await this.jar.getCookies(url);
    const csrf = cookies.find((c) => c.key.endsWith('csrf_token'))?.value;
    const response = await this.fetcher(url, {
      method,
      headers: {
        Accept: route.endsWith('/run') ? 'text/event-stream' : 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        Cookie: await this.jar.getCookieString(url),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        Origin: new URL(this.baseUrl).origin,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(120000)])
        : AbortSignal.timeout(120000),
      redirect: 'error',
    });
    for (const cookie of response.headers.getSetCookie()) await this.jar.setCookie(cookie, url);
    await this.secrets.store(this.key, JSON.stringify(await this.jar.serialize()));
    if (response.status === 401 && retry && route !== '/refresh-token' && route !== '/login') {
      await response.body?.cancel();
      if (!this.refreshing)
        this.refreshing = this.json('/refresh-token', 'POST', {}, signal, false)
          .then((r) => {
            if (r.result !== 'success')
              throw new ApiError(401, 'authentication', '会话刷新失败，请重新登录');
          })
          .finally(() => {
            this.refreshing = undefined;
          });
      await this.refreshing;
      return this.request(route, method, body, signal, false);
    }
    return response;
  }
}
