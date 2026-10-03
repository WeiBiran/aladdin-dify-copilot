import type { UiState } from './contracts';
import { setupChat } from './chat-client';
import { translate, type Locale } from '../core/i18n';
let locale: Locale = document.body.dataset.locale === 'en' ? 'en' : 'zh-CN';
const t = (text: string) => translate(text, locale);
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): any;
  setState(state: unknown): void;
};
const api = acquireVsCodeApi();
const page = document.body.dataset.page;
const pending = new Map<
  string,
  { resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
>();
let state: UiState | undefined;
let initialized = false;
const dirtySettings = new Set<string>();
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => el<HTMLInputElement>(id).value;
function message(id: string, text: string, error = false) {
  const e = el(id);
  if (e) {
    e.textContent = t(text);
    e.className = 'message ' + (error ? 'error' : 'success');
  }
}
function request(command: string, payload?: unknown): Promise<any> {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => {
        pending.delete(id);
        reject(new Error('操作仍未返回结果，请核对执行状态后重试。'));
      },
      ['startTask', 'resumeTask', 'sendChat'].includes(command) ? 130 * 60000 : 10 * 60000,
    );
    pending.set(id, { resolve, reject, timer });
    api.postMessage({ id, command, payload });
  });
}
async function action(
  container: HTMLElement | undefined,
  messageId: string,
  fn: () => Promise<unknown>,
  success?: string,
) {
  const buttons = container
    ? Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    : [];
  buttons.forEach((b) => (b.disabled = true));
  message(messageId, '处理中…');
  try {
    const r = await fn();
    message(messageId, success ?? '已保存');
    return r;
  } catch (e) {
    message(messageId, e instanceof Error ? e.message : String(e), true);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
    if (state) renderReadiness(state);
  }
}
function options(id: string, items: { value: string; label: string }[], selected = '') {
  const select = el<HTMLSelectElement>(id);
  select.replaceChildren();
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = t(item.label);
    select.append(option);
  }
  select.value = selected;
  if (select.selectedIndex < 0) select.selectedIndex = 0;
}
function renderReadiness(s: UiState) {
  if (page === 'task') return;
  {
    el('connection-status').textContent = t(s.connection ? '已保存' : '未配置');
    el('connection-status').classList.toggle('ready', Boolean(s.connection));
    el('model-status').textContent = t(s.model?.hasKey ? '已保存' : '未配置');
    el('model-status').classList.toggle('ready', Boolean(s.model?.hasKey));
    el('password-hint').textContent = t(
      s.connection?.hasPassword
        ? '已保存密码，留空可继续使用；填写新值会替换。'
        : '密码与会话保存在 VS Code 安全凭据存储中。',
    );
    el('key-hint').textContent = t(
      s.model?.hasKey ? '已保存密钥，同一供应商与地址留空可保留。' : '密钥仅保存在安全凭据存储中。',
    );
    el('capability-metrics').hidden = !s.capabilities;
    if (s.capabilities) {
      el('tool-count').textContent = String(s.capabilities.tools);
      el('model-count').textContent = String(s.capabilities.models);
      el('dataset-count').textContent = String(s.capabilities.datasets);
      el('sync-summary').textContent =
        `${locale === 'en' ? 'Last sync: ' : '上次同步：'}${new Date(s.capabilities.fetchedAt).toLocaleString()}${s.capabilities.complete ? ' · ' + t('信息完整') : ' · ' + s.capabilities.issues.join('; ')}`;
    }
    document
      .querySelectorAll<HTMLButtonElement>('form button')
      .forEach((b) => (b.disabled = s.busy));
  }
}
function updateProvider(defaults = false) {
  const p = value('model-provider');
  el('provider-id-field').hidden = p !== 'other';
  el('model-url-field').hidden = p === 'other';
  el<HTMLInputElement>('provider-id').required = p === 'other';
  el<HTMLInputElement>('model-url').required = p !== 'other';
  if (defaults) {
    el<HTMLInputElement>('model-url').value =
      p === 'deepseek'
        ? 'https://api.deepseek.com/v1'
        : p === 'openai'
          ? 'https://api.openai.com/v1'
          : '';
    el<HTMLInputElement>('model-id').value = '';
    el<HTMLInputElement>('model-key').value = '';
  }
}
function render(s: UiState) {
  state = s;
  locale = s.locale;
  if (page === 'task') {
    chatUi?.render(s);
    return;
  }
  {
    el<HTMLSelectElement>('ui-language').value = s.language;
    if (!initialized || !dirtySettings.has('connection-form')) {
      el<HTMLInputElement>('dify-url').value = s.connection?.baseUrl ?? '';
      el<HTMLSelectElement>('dify-version').value = s.connection?.version ?? '1.14.2';
      el<HTMLInputElement>('dify-email').value = s.connection?.email ?? '';
    }
    if (!initialized || !dirtySettings.has('model-form')) {
      const m = s.model;
      el<HTMLSelectElement>('model-provider').value =
        m && ['deepseek', 'openai', 'custom'].includes(m.provider)
          ? m.provider
          : m
            ? 'other'
            : 'deepseek';
      el<HTMLInputElement>('provider-id').value = m?.provider ?? '';
      el<HTMLInputElement>('model-url').value =
        m?.baseUrl ?? (m ? '' : 'https://api.deepseek.com/v1');
      el<HTMLInputElement>('model-id').value = m?.model ?? '';
      updateProvider();
    }
    if (!initialized || !dirtySettings.has('limits-form')) {
      el<HTMLInputElement>('max-repairs').value = String(s.limits.maxRepairs);
      el<HTMLInputElement>('timeout-minutes').value = String(s.limits.timeoutMinutes);
      el<HTMLInputElement>('generation-budget').value = String(s.limits.generationTokenBudget);
      el<HTMLInputElement>('dify-budget').value = String(s.limits.difyTokenBudget);
      el<HTMLInputElement>('opencode-path').value = s.limits.opencodePath;
      el<HTMLInputElement>('show-task-startup').checked = s.limits.showTaskOnStartup;
    }
    if (!dirtySettings.has('runtime-form'))
      options(
        'runtime-model',
        [
          { value: '', label: '让 Agent 根据需求选择' },
          ...s.runtimeModels.map((m) => ({
            value: JSON.stringify({ provider: m.provider, model: m.model }),
            label: m.model + ' · ' + m.provider,
          })),
        ],
        s.runtimeModel ? JSON.stringify(s.runtimeModel) : '',
      );
  }
  initialized = true;
  renderReadiness(s);
}
const chatUi = page === 'task' ? setupChat(request, api) : undefined;
window.addEventListener('message', (e) => {
  const m = e.data;
  if (m.type === 'response') {
    const p = pending.get(m.id);
    if (p) {
      clearTimeout(p.timer);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error)) : p.resolve(m.result);
    }
  } else if (m.type === 'state') render(m.state);
  else if (m.type === 'chat' && page === 'task') chatUi?.renderChat(m.chat);
  else if (m.type === 'activity' && page === 'task') chatUi?.activity(m.status);
});
document
  .querySelectorAll<HTMLButtonElement>('[data-command]')
  .forEach((b) =>
    b.addEventListener(
      'click',
      () =>
        void action(
          undefined,
          'global-message',
          () => request(b.dataset.command!),
          ['settings', 'selectFolder', 'showTask'].includes(b.dataset.command!) ? '' : '操作完成',
        ),
    ),
  );
if (page === 'settings') {
  el('ui-language').addEventListener(
    'change',
    () =>
      void action(
        undefined,
        'global-message',
        () => request('saveLanguage', value('ui-language')),
        '',
      ),
  );
  document
    .querySelectorAll<HTMLFormElement>('form')
    .forEach((f) => f.addEventListener('input', () => dirtySettings.add(f.id)));
  el('model-provider').addEventListener('change', () => updateProvider(true));
  el<HTMLFormElement>('connection-form').addEventListener('submit', (e) => {
    e.preventDefault();
    void action(
      el('connection-form'),
      'connection-message',
      async () => {
        const r = await request('connectForm', {
          baseUrl: value('dify-url'),
          version: value('dify-version'),
          email: value('dify-email'),
          password: value('dify-password'),
        });
        el<HTMLInputElement>('dify-password').value = '';
        if (r.workspaces) {
          options(
            'dify-workspace',
            r.workspaces.map((w: any) => ({
              value: w.id,
              label: w.name + (w.current ? ' · 当前空间' : ''),
            })),
            r.workspaces.find((w: any) => w.current)?.id,
          );
          el('workspace-choice').hidden = false;
          message('connection-message', '登录成功，请选择工作空间后保存。');
        } else {
          el('workspace-choice').hidden = true;
          dirtySettings.delete('connection-form');
          render(await request('getState'));
        }
        return r;
      },
      '',
    ).then((r) => {
      if (r)
        message(
          'connection-message',
          (r as any).workspaces ? '登录成功，请选择工作空间后保存。' : '连接已保存，能力同步完成。',
        );
    });
  });
  el('confirm-workspace').addEventListener(
    'click',
    () =>
      void action(
        el('connection-form'),
        'connection-message',
        async () => {
          await request('selectWorkspace', { id: value('dify-workspace') });
          el('workspace-choice').hidden = true;
          dirtySettings.delete('connection-form');
          render(await request('getState'));
        },
        '连接已保存，能力同步完成。',
      ),
  );
  const modelPayload = () => ({
    provider: value('model-provider') === 'other' ? value('provider-id') : value('model-provider'),
    baseUrl: value('model-provider') === 'other' ? undefined : value('model-url'),
    model: value('model-id'),
    apiKey: value('model-key'),
  });
  el<HTMLFormElement>('model-form').addEventListener('submit', (e) => {
    e.preventDefault();
    void action(
      el('model-form'),
      'model-message',
      async () => {
        await request('saveModel', modelPayload());
        el<HTMLInputElement>('model-key').value = '';
        dirtySettings.delete('model-form');
        render(await request('getState'));
      },
      '生成模型已保存。',
    );
  });
  el('discover-models').addEventListener(
    'click',
    () =>
      void action(
        el('model-form'),
        'model-message',
        async () => {
          const payload = modelPayload();
          const { model, ...discovery } = payload;
          const r = await request('discoverModels', discovery);
          el('generation-models').replaceChildren();
          for (const id of r.models) {
            const o = document.createElement('option');
            o.value = id;
            el('generation-models').append(o);
          }
          if (r.models.length && !value('model-id'))
            el<HTMLInputElement>('model-id').value = r.models[0];
          message('model-message', `已读取 ${r.models.length} 个模型，可在生成模型输入框中选择。`);
          return r;
        },
        '',
      ).then((r) => {
        if (r)
          message(
            'model-message',
            `已读取 ${(r as any).models.length} 个模型，可在生成模型输入框中选择。`,
          );
      }),
  );
  el<HTMLFormElement>('runtime-form').addEventListener('submit', (e) => {
    e.preventDefault();
    void action(
      el('runtime-form'),
      'runtime-message',
      async () => {
        await request(
          'saveRuntime',
          value('runtime-model') ? JSON.parse(value('runtime-model')) : null,
        );
        dirtySettings.delete('runtime-form');
        render(await request('getState'));
      },
      '运行模型偏好已保存。',
    );
  });
  el<HTMLFormElement>('limits-form').addEventListener('submit', (e) => {
    e.preventDefault();
    void action(
      el('limits-form'),
      'limits-message',
      async () => {
        await request('saveLimits', {
          maxRepairs: Number(value('max-repairs')),
          timeoutMinutes: Number(value('timeout-minutes')),
          generationTokenBudget: Number(value('generation-budget')),
          difyTokenBudget: Number(value('dify-budget')),
          opencodePath: value('opencode-path'),
          showTaskOnStartup: el<HTMLInputElement>('show-task-startup').checked,
        });
        dirtySettings.delete('limits-form');
        render(await request('getState'));
      },
      '执行限制已保存。',
    );
  });
}
void request('getState')
  .then(async (state) => {
    render(state);
    await request('pageReady', { page });
  })
  .catch((e) => message('global-message', e.message, true));
