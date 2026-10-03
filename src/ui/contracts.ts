import { z } from 'zod';
import type { AppMode, ModelDescriptor } from '../core/types';
import { normalizeBaseUrl } from '../core/util';
import type { ChatSnapshot } from '../core/chat';
import type { Locale, LanguageSetting } from '../core/i18n';
const url = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((v) => {
    try {
      normalizeBaseUrl(v);
      return true;
    } catch {
      return false;
    }
  }, '请输入有效且不含凭据的 HTTP(S) 地址');
export const connectionForm = z.object({
  baseUrl: url,
  version: z.enum(['1.14.2', '1.17.1']),
  email: z.string().trim().email('请输入有效的登录邮箱').max(254),
  password: z.string().max(4096).default(''),
});
export const modelForm = z.object({
  provider: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9-]{0,99}$/, '供应商 ID 格式不正确'),
  baseUrl: url.optional(),
  model: z.string().trim().min(1, '请选择或填写模型 ID').max(200),
  apiKey: z.string().max(4096).default(''),
});
export const modelDiscoveryForm = modelForm.omit({ model: true });
export const limitForm = z.object({
  maxRepairs: z.number().int().min(0).max(20),
  timeoutMinutes: z.number().int().min(1).max(120),
  generationTokenBudget: z.number().int().min(1000).max(100_000_000),
  difyTokenBudget: z.number().int().min(1000).max(100_000_000),
  opencodePath: z.string().max(4096).default(''),
  showTaskOnStartup: z.boolean().default(true),
});
export const taskForm = z
  .object({
    name: z.string().trim().min(1, '请填写项目名称').max(100),
    mode: z.enum(['workflow', 'advanced-chat']),
    source: z.enum(['new', 'existing']),
    originalAppId: z.string().max(100).optional(),
    requirement: z.string().trim().min(1, '请描述你希望完成的任务').max(50_000),
    acceptance: z.string().trim().max(20_000).default(''),
    allowSideEffects: z.boolean().default(false),
  })
  .superRefine((v, c) => {
    if (v.source === 'existing' && !v.originalAppId)
      c.addIssue({ code: 'custom', path: ['originalAppId'], message: '请选择要改进的 Dify 应用' });
  });
export type TaskForm = z.infer<typeof taskForm>;
export interface UiState {
  locale: Locale;
  language: LanguageSetting;
  chat?: ChatSnapshot;
  workspace?: { name: string; path: string; trusted: boolean };
  connection?: {
    baseUrl: string;
    version: string;
    email: string;
    workspaceId: string;
    hasPassword: boolean;
  };
  model?: { provider: string; baseUrl?: string; model: string; hasKey: boolean };
  limits: z.infer<typeof limitForm>;
  runtimeModel?: { provider: string; model: string };
  runtimeModels: ModelDescriptor[];
  capabilities?: {
    tools: number;
    models: number;
    datasets: number;
    complete: boolean;
    fetchedAt: string;
    issues: string[];
  };
  task?: {
    name: string;
    mode: AppMode;
    source: 'new' | 'existing';
    originalAppId?: string;
    requirement: string;
    acceptance: string;
    allowSideEffects: boolean;
  };
  run?: { phase: string; round: number; error?: string; passed?: boolean };
  busy: boolean;
  taskRunning: boolean;
}
export type UiHandler = (command: string, payload?: unknown) => Promise<unknown>;
export const UI_COMMANDS = new Set([
  'pageReady',
  'saveLanguage',
  'getState',
  'settings',
  'showTask',
  'selectFolder',
  'connectForm',
  'selectWorkspace',
  'saveModel',
  'discoverModels',
  'saveLimits',
  'saveRuntime',
  'loadApps',
  'saveTask',
  'startTask',
  'resumeTask',
  'sendChat',
  'newChat',
  'sync',
  'cancel',
  'openDsl',
  'openReport',
  'diff',
  'promote',
]);
