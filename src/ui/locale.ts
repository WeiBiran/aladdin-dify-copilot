import * as vscode from 'vscode';
import { resolveLanguage, type LanguageSetting } from '../core/i18n';
export function interfaceLanguage() {
  return resolveLanguage(
    vscode.workspace.getConfiguration('aladdinDify').get<LanguageSetting>('language', 'auto'),
    vscode.env.language,
  );
}
