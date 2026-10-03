import * as vscode from 'vscode';
import { setupWebview, renderWebview } from './webview';
import { interfaceLanguage } from './locale';
import type { UiHandler, UiState } from './contracts';
import type { ChatSnapshot } from '../core/chat';
export class Sidebar implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private lines: string[] = [];
  private currentStatus = '等待任务';
  private ready = false;
  private locale = interfaceLanguage();
  get isResolved() {
    return Boolean(this.view);
  }
  get isReady() {
    return this.ready;
  }
  get isVisible() {
    return this.view?.visible === true;
  }
  constructor(
    private extensionUri: vscode.Uri,
    private command: UiHandler,
  ) {}
  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    this.ready = false;
    this.locale = interfaceLanguage();
    const receiver = setupWebview(view.webview, this.extensionUri, 'task', this.command, () => {
      this.ready = true;
    });
    view.onDidDispose(() => {
      receiver.dispose();
      this.view = undefined;
      this.ready = false;
    });
    this.emit();
  }
  update(state: UiState) {
    if (this.view && state.locale !== this.locale) {
      this.ready = false;
      this.locale = renderWebview(this.view.webview, this.extensionUri, 'task');
    }
    void this.view?.webview.postMessage({ type: 'state', state });
  }
  chat(chat: ChatSnapshot) {
    void this.view?.webview.postMessage({ type: 'chat', chat });
  }
  log(text: string) {
    this.lines.push(text);
    if (this.lines.length > 200) this.lines.shift();
    this.emit();
  }
  status(text: string) {
    this.currentStatus = text;
    this.emit();
  }
  private emit() {
    void this.view?.webview.postMessage({
      type: 'activity',
      status: this.currentStatus,
      lines: this.lines,
    });
  }
}
