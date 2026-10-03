import * as vscode from 'vscode';
import { setupWebview, renderWebview } from './webview';
import { interfaceLanguage } from './locale';
import type { UiHandler, UiState } from './contracts';
export class SettingsPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private ready = false;
  private locale = interfaceLanguage();
  get isReady() {
    return this.ready;
  }
  constructor(
    private uri: vscode.Uri,
    private handle: UiHandler,
  ) {}
  open() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'aladdinDify.settings',
      interfaceLanguage() === 'en' ? 'Dify Copilot · Settings' : 'Dify Copilot · 设置',
      vscode.ViewColumn.One,
      { retainContextWhenHidden: true },
    );
    this.panel = panel;
    this.locale = interfaceLanguage();
    const receiver = setupWebview(panel.webview, this.uri, 'settings', this.handle, () => {
      this.ready = true;
    });
    panel.onDidDispose(() => {
      receiver.dispose();
      this.panel = undefined;
      this.ready = false;
    });
  }
  update(state: UiState) {
    if (this.panel && state.locale !== this.locale) {
      this.ready = false;
      this.locale = renderWebview(this.panel.webview, this.uri, 'settings');
      this.panel.title = state.locale === 'en' ? 'Dify Copilot · Settings' : 'Dify Copilot · 设置';
    }
    void this.panel?.webview.postMessage({ type: 'state', state });
  }
  dispose() {
    this.panel?.dispose();
  }
}
