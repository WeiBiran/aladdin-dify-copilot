import type { SecretStore } from '../core/types';
import type { Locale } from '../core/i18n';
import type { UiState } from '../ui/contracts';
import type { ChatSnapshot } from '../core/chat';

export interface StateStore {
  get<T>(key: string, fallback?: T): T | undefined;
  update(key: string, value: unknown, target?: unknown): Promise<void>;
}
export interface ConfigurationStore {
  get<T>(key: string, fallback: T): T;
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown, target?: unknown): Promise<void>;
}
export type ApplicationEvent =
  | { type: 'state'; state: UiState }
  | { type: 'chat'; chat: ChatSnapshot }
  | { type: 'activity'; status: string };
export interface ApplicationHost {
  secrets: SecretStore;
  globalState: StateStore;
  projectState: StateStore;
  config: ConfigurationStore;
  storagePath: string;
  runtimePath: string;
  locale(): Locale;
  project(): { name: string; path: string; trusted: boolean } | undefined;
  projects?(): Promise<NonNullable<UiState['projects']>>;
  emit(event: ApplicationEvent): void;
  log(message: string): void;
  showSettings(): Promise<void>;
  showChat(): Promise<void>;
  selectFolder(): Promise<void>;
  openFile(file: string): Promise<unknown>;
  showDiff(original: string, candidate: string, title: string): Promise<void>;
  confirm(message: string, confirmLabel: string): Promise<boolean>;
  published(url: string): void;
}
