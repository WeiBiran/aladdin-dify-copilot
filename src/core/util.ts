import { createHash } from 'node:crypto';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function stableJson(value: unknown): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, sort(x)]),
          )
        : v;
  return JSON.stringify(sort(value));
}
export const object = (v: unknown): Record<string, any> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {};
export const array = (v: unknown): any[] => (Array.isArray(v) ? v : []);
export const localized = (v: unknown): string =>
  typeof v === 'string' ? v : String(object(v).zh_Hans ?? object(v).en_US ?? '');
export function redact(text: string, secrets: string[] = []): string {
  let result = text;
  for (const secret of secrets.filter((s) => s.length > 3).sort((a, b) => b.length - a.length))
    result = result.split(secret).join('[REDACTED]');
  return result
    .replace(/\b(?:sk-|gho_|ghp_)[\w-]{8,}/g, '[REDACTED]')
    .replace(/(Bearer\s+)[\w.\-]+/gi, '$1[REDACTED]')
    .replace(
      /("?(?:password|api_key|access_token|refresh_token|csrf_token|original_headers)"?\s*[:=]\s*)"[^"\n]*"/gi,
      '$1"[REDACTED]"',
    );
}
export function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('Dify 地址必须是无凭据、无查询参数的 HTTP(S) 地址。');
  url.pathname = url.pathname.replace(/\/(?:console\/api|v1)\/?$/, '').replace(/\/$/, '');
  return url.toString().replace(/\/$/, '');
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public category: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new Error('任务已取消');
}
export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(done, ms);
    function done() {
      signal?.removeEventListener('abort', abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      reject(signal?.reason);
    }
    signal?.addEventListener('abort', abort, { once: true });
  });
}
