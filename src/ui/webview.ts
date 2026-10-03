import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { UI_COMMANDS, type UiHandler } from './contracts';
import { settingsMarkup, taskMarkup, styles } from './markup';
import { translateMarkup } from '../core/i18n';
import { interfaceLanguage } from './locale';
export function renderWebview(webview: vscode.Webview, uri: vscode.Uri, page: 'settings' | 'task') {
  const locale = interfaceLanguage();
  const nonce = randomBytes(16).toString('hex');
  const script = webview.asWebviewUri(vscode.Uri.joinPath(uri, 'dist', 'webview.js'));
  const markup = translateMarkup(page === 'settings' ? settingsMarkup : taskMarkup, locale);
  webview.html = `<!DOCTYPE html><html lang="${locale}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';"><title>Dify Copilot ${page === 'settings' ? (locale === 'en' ? 'Settings' : '设置') : 'Chat'}</title><style nonce="${nonce}">${styles}</style></head><body data-page="${page}" data-locale="${locale}">${markup}<script nonce="${nonce}" src="${script}"></script></body></html>`;
  return locale;
}
export function setupWebview(
  webview: vscode.Webview,
  uri: vscode.Uri,
  page: 'settings' | 'task',
  handle: UiHandler,
  onReady?: () => void,
) {
  webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(uri, 'dist')] };
  renderWebview(webview, uri, page);
  return webview.onDidReceiveMessage(async (m) => {
    if (
      typeof m?.command !== 'string' ||
      !UI_COMMANDS.has(m.command) ||
      typeof m.id !== 'string' ||
      m.id.length > 100
    )
      return;
    try {
      if (m.command === 'pageReady') {
        if (m.payload?.page !== page) throw new Error('页面类型不匹配');
        onReady?.();
        await webview.postMessage({ type: 'response', id: m.id, result: null });
        return;
      }
      const result = await handle(m.command, m.payload);
      await webview.postMessage({ type: 'response', id: m.id, result: result ?? null });
    } catch (e) {
      await webview.postMessage({
        type: 'response',
        id: m.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });
}
