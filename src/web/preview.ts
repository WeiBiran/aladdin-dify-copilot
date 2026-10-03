import { randomBytes } from 'node:crypto';
import type { Locale } from '../core/i18n';

export interface DifyPreview {
  editorUrl: string;
  runtimeUrl?: string;
  published: boolean;
}
// A same-origin wrapper gives each remote page a narrowly scoped frame policy.
// Dify cookies remain in the browser; console credentials are never proxied.
export function previewPage(
  view: DifyPreview | undefined,
  kind: 'runtime' | 'editor',
  locale: Locale,
  error?: string,
) {
  const nonce = randomBytes(16).toString('hex');
  const t = (en: string, zh: string) => (locale === 'en' ? en : zh);
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
  let target: URL | undefined;
  try {
    const value = kind === 'runtime' ? view?.published && view.runtimeUrl : view?.editorUrl;
    if (value) {
      const candidate = new URL(value);
      if (
        ['http:', 'https:'].includes(candidate.protocol) &&
        !candidate.username &&
        !candidate.password
      )
        target = candidate;
    }
  } catch {
    /* Render a clear empty state instead of navigating to malformed input. */
  }
  const empty =
    error ??
    t(
      'The test app has no published web app yet. Use Manage to inspect its draft.',
      '测试应用还没有已发布的网页，切换“管理”查看草稿。',
    );
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; frame-src ${target ? escape(target.origin) : "'none'"}; base-uri 'none'; form-action 'none'"><style nonce="${nonce}">*{box-sizing:border-box}body{margin:0;font:12px/1.6 system-ui;color:#9ba3b3;background:#101216;height:100vh;display:flex;flex-direction:column}aside{padding:9px 14px;flex:none;border-bottom:1px solid #30343e;display:flex;gap:14px;align-items:center}aside span{flex:1}a{color:#a1a6ff;white-space:nowrap}iframe{border:0;width:100%;flex:1;background:#fff}.empty{margin:auto;padding:30px;text-align:center;max-width:480px}</style></head><body>${target ? `<aside><span>${escape(t('Blank page or sign-in blocked? Open Dify in a new window.', '页面空白或无法登录时，可以在新窗口打开 Dify。'))}</span><a href="${escape(target.href)}" target="_blank" rel="noopener noreferrer">${t('Open ↗', '打开 ↗')}</a></aside><iframe src="${escape(target.href)}" title="Dify ${kind}" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox"></iframe>` : `<p class="empty">${escape(empty)}</p>`}</body></html>`;
}
