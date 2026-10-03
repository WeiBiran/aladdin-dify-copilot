import type { UiState, TaskForm } from './contracts';
import type { ChatSnapshot, ChatEntry } from '../core/chat';
import { translate, type Locale } from '../core/i18n';
interface WebviewState {
  getState(): any;
  setState(value: unknown): void;
}
export function setupChat(
  request: (command: string, payload?: unknown) => Promise<any>,
  api: WebviewState,
) {
  let locale: Locale = document.body.dataset.locale === 'en' ? 'en' : 'zh-CN';
  const t = (text: string) => translate(text, locale);
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const value = (id: string) => el<HTMLInputElement>(id).value;
  let state: UiState | undefined;
  let conversation: ChatSnapshot | undefined;
  let workspacePath: string | undefined;
  let sending = false;
  let initialized = false;
  const nodes = new Map<string, HTMLElement>();
  const input = el<HTMLTextAreaElement>('chat-input');
  const scroll = el('chat-scroll');
  const transcript = el('chat-transcript');
  function draft() {
    api.setState({ workspacePath, chatId: conversation?.id, input: input.value, task: task() });
  }
  function task(): TaskForm {
    return {
      name: value('task-name').trim() || state?.workspace?.name || 'Dify Project',
      mode: value('task-mode') as TaskForm['mode'],
      source: value('task-source') as TaskForm['source'],
      originalAppId: value('original-app') || undefined,
      requirement: input.value.trim(),
      acceptance: value('task-acceptance'),
      allowSideEffects: el<HTMLInputElement>('allow-side-effects').checked,
    };
  }
  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(160, Math.max(49, input.scrollHeight)) + 'px';
  }
  function notice(text: string, error = false) {
    const e = el('global-message');
    e.textContent = t(text);
    e.classList.toggle('error', error);
  }
  async function command(name: string, payload?: unknown) {
    try {
      notice('');
      return await request(name, payload);
    } catch (e) {
      notice(e instanceof Error ? e.message : String(e), true);
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
  }
  // A small, safe Markdown subset. No model-generated HTML or scripts execute.
  function richText(target: HTMLElement, text: string) {
    target.replaceChildren();
    const pieces = text.split(/```[^\n]*\n([\s\S]*?)```/g);
    pieces.forEach((piece, i) => {
      if (i % 2) {
        const pre = document.createElement('pre'),
          code = document.createElement('code');
        code.textContent = piece;
        pre.append(code);
        target.append(pre);
      } else {
        for (const token of piece.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g)) {
          if (token.startsWith('`') && token.endsWith('`')) {
            const code = document.createElement('code');
            code.textContent = token.slice(1, -1);
            target.append(code);
          } else if (token.startsWith('**') && token.endsWith('**')) {
            const strong = document.createElement('strong');
            strong.textContent = token.slice(2, -2);
            target.append(strong);
          } else target.append(document.createTextNode(token));
        }
      }
    });
  }
  const toolLabels: Record<string, string> = {
    search_tools: '查找可用工具',
    get_tool: '读取工具定义',
    read_project: '读取项目',
    refresh_capabilities: '同步 Dify 能力',
    save_workflow: '保存工作流',
    save_test_suite: '建立测试基线',
    validate_workflow: '校验工作流',
    import_workflow: '导入测试应用',
    run_tests: '运行测试',
    publish_workflow: '发布测试应用',
  };
  function entryNode(m: ChatEntry): HTMLElement {
    let node = nodes.get(m.id);
    if (!node) {
      node = document.createElement('article');
      node.dataset.id = m.id;
      nodes.set(m.id, node);
    }
    const fingerprint = JSON.stringify(m);
    if (node.dataset.fingerprint === fingerprint) return node;
    node.dataset.fingerprint = fingerprint;
    const open = node.querySelector('details')?.open;
    node.className = 'chat-entry ' + m.kind;
    node.replaceChildren();
    if (m.kind === 'tool') {
      const details = document.createElement('details'),
        summary = document.createElement('summary'),
        indicator = document.createElement('span'),
        title = document.createElement('span'),
        status = document.createElement('span');
      indicator.className = 'tool-indicator ' + m.status;
      indicator.textContent = m.status === 'completed' ? '✓' : m.status === 'error' ? '!' : '◌';
      const key = (m.title ?? '').replace(/^dify_/, '');
      title.className = 'tool-name';
      title.textContent = t(toolLabels[key] ?? key);
      title.title = m.title ?? '';
      status.className = 'tool-status';
      status.textContent = t(
        (
          { pending: '等待', running: '调用中', completed: '完成', error: '失败' } as Record<
            string,
            string
          >
        )[m.status ?? ''] ?? '',
      );
      summary.append(indicator, title, status);
      details.append(summary);
      const body = document.createElement('div');
      body.className = 'tool-detail';
      body.textContent = m.title + (m.text ? '\n' + m.text : '');
      details.append(body);
      details.open = open ?? m.status === 'error';
      node.append(details);
    } else if (m.kind === 'progress') {
      const mark = document.createElement('span');
      mark.className = 'phase-icon';
      mark.textContent = '·';
      node.append(mark, document.createTextNode(t(m.text)));
    } else {
      const label = document.createElement('div');
      label.className = 'entry-label';
      label.textContent = t(
        m.kind === 'user'
          ? '你'
          : m.kind === 'error'
            ? '需要处理'
            : m.kind === 'result'
              ? '✓ 测试通过'
              : '✧ Dify Agent',
      );
      const body = document.createElement('div');
      body.className = 'entry-body';
      richText(body, ['progress', 'error', 'result'].includes(m.kind) ? t(m.text) : m.text);
      node.append(label, body);
      if (m.kind === 'result') {
        const actions = document.createElement('div');
        actions.className = 'result-actions';
        const items = [
          ['openDsl', '查看 DSL'],
          ['openReport', '测试报告'],
          ...(state?.task?.source === 'existing'
            ? [
                ['diff', '查看差异'],
                ['promote', '更新原应用'],
              ]
            : []),
        ];
        for (const [name, title] of items) {
          const button = document.createElement('button');
          button.textContent = t(title!);
          button.addEventListener('click', () => void command(name!));
          actions.append(button);
        }
        node.append(actions);
      }
    }
    return node;
  }
  function renderChat(chat: ChatSnapshot) {
    const atBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 90;
    const changed = conversation?.id !== chat.id;
    if (changed) {
      nodes.clear();
      transcript.replaceChildren();
      if (initialized) {
        input.value = '';
        resizeInput();
      }
    }
    conversation = chat;
    el('chat-welcome').hidden = chat.messages.length > 0;
    const present = new Set(chat.messages.map((m) => m.id));
    for (const [id, node] of nodes)
      if (!present.has(id)) {
        node.remove();
        nodes.delete(id);
      }
    for (const m of chat.messages) {
      const node = entryNode(m);
      if (!node.parentNode) transcript.append(node);
    }
    const first = chat.messages.find((m) => m.kind === 'user');
    el('chat-title').textContent = first
      ? first.text.slice(0, 35).replace(/\n/g, ' ')
      : t('新对话');
    if (atBottom || changed) scroll.scrollTop = scroll.scrollHeight;
    if (state) readiness();
  }
  function readiness() {
    const s = state!;
    const busy = s.busy || sending;
    const ready = Boolean(s.workspace?.trusted && s.model?.hasKey && s.connection);
    el<HTMLButtonElement>('send-chat').disabled = busy || !ready || !input.value.trim();
    el('send-chat').hidden = s.taskRunning || sending;
    el('stop-chat').hidden = !s.taskRunning && !sending;
    el<HTMLButtonElement>('stop-chat').disabled = !s.taskRunning;
    el<HTMLButtonElement>('new-chat').disabled = busy;
    input.disabled = busy;
    input.placeholder = t(
      conversation?.hasTask ? '继续补充要求或提出修改…' : '描述你想构建的工作流…',
    );
    el('chat-model').textContent = s.model?.model ?? t('选择模型');
    el('chat-model').title = s.model
      ? `${s.model.provider} / ${s.model.model} · ${t('在设置页更换')}`
      : t('配置生成模型');
    el('folder-name').textContent = s.workspace?.name ?? t('打开目录');
    el('folder-name').title = s.workspace?.path ?? '';
    el('chat-environment').textContent = t(
      s.capabilities
        ? `${s.capabilities.tools} 个工具${s.capabilities.complete ? '' : ' · 待处理'}`
        : s.connection
          ? 'Dify 已配置'
          : 'Dify 未连接',
    );
    el('chat-scope').textContent = t(s.task?.allowSideEffects ? '已授权测试范围' : '限定工具权限');
    el('welcome-setup').hidden = ready;
    el('chat-notice').textContent = t(
      !s.workspace
        ? '打开一个项目目录，开始构建。'
        : !s.workspace.trusted
          ? '目录处于受限模式，信任后可运行 Agent。'
          : !s.connection || !s.model?.hasKey
            ? '在设置页连接 Dify 并配置生成模型。'
            : '',
    );
    const locked = busy || conversation?.hasTask === true;
    for (const id of [
      'task-name',
      'task-mode',
      'task-source',
      'original-app',
      'task-acceptance',
      'allow-side-effects',
      'load-apps',
    ])
      el<HTMLInputElement>(id).disabled = locked;
    el('options-note').textContent = t(
      locked
        ? '当前任务目标和验收基线已固定。修改要求请直接发送消息；更换目标请新建对话。'
        : '首次发送时固定任务目标；后续通过对话补充修改要求。',
    );
    const recoverable =
      conversation?.hasTask &&
      !busy &&
      s.run &&
      ['cancelled', 'failed', 'needs-input'].includes(s.run.phase);
    el('chat-working').hidden = !(s.taskRunning || sending || recoverable);
    el('chat-working').classList.toggle('recoverable', Boolean(recoverable));
    el('resume-chat').hidden = !recoverable;
    if (recoverable) el('chat-status').textContent = t('任务已停止，可补充要求或恢复');
    else if (s.taskRunning || sending)
      el('chat-status').textContent = t(
        (
          {
            generating: 'Agent 正在生成…',
            validating: '校验 DSL…',
            importing: '导入测试应用…',
            testing: '运行测试…',
            repairing: 'Agent 正在修复…',
            publishing: '发布测试应用…',
          } as Record<string, string>
        )[s.run?.phase ?? ''] ?? 'Agent 正在准备…',
      );
  }
  function render(s: UiState) {
    const changed = workspacePath !== s.workspace?.path;
    state = s;
    locale = s.locale;
    workspacePath = s.workspace?.path;
    if (!initialized || changed) {
      const saved = api.getState();
      const matches = saved?.workspacePath === workspacePath && saved?.chatId === s.chat?.id;
      const t = matches ? saved.task : s.task;
      el<HTMLInputElement>('task-name').value = t?.name ?? s.workspace?.name ?? '';
      el<HTMLSelectElement>('task-mode').value = t?.mode ?? 'workflow';
      el<HTMLSelectElement>('task-source').value = t?.source ?? 'new';
      el<HTMLTextAreaElement>('task-acceptance').value = t?.acceptance ?? '';
      el<HTMLInputElement>('allow-side-effects').checked = t?.allowSideEffects ?? false;
      if (t?.originalAppId)
        options(
          'original-app',
          [{ value: t.originalAppId, label: '已选应用 · ' + t.originalAppId }],
          t.originalAppId,
        );
      el('existing-app-field').hidden = value('task-source') !== 'existing';
      input.value = matches ? (saved.input ?? '') : '';
      resizeInput();
    }
    if (s.chat) renderChat(s.chat);
    initialized = true;
    readiness();
  }
  function toggleOptions() {
    el('chat-options').hidden = !el('chat-options').hidden;
  }
  for (const id of ['toggle-options', 'add-context'])
    el(id).addEventListener('click', toggleOptions);
  el('close-options').addEventListener('click', () => (el('chat-options').hidden = true));
  el('task-source').addEventListener('change', () => {
    el('existing-app-field').hidden = value('task-source') !== 'existing';
    draft();
  });
  el('task-mode').addEventListener('change', draft);
  el('chat-options').addEventListener('input', draft);
  el('chat-options').addEventListener('change', draft);
  input.addEventListener('input', () => {
    resizeInput();
    draft();
    if (state) readiness();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (!el<HTMLButtonElement>('send-chat').disabled)
        el<HTMLFormElement>('chat-form').requestSubmit();
    }
  });
  document.querySelectorAll<HTMLButtonElement>('[data-suggestion]').forEach((button) =>
    button.addEventListener('click', () => {
      input.value = button.dataset.suggestion!;
      if (!conversation?.hasTask) el<HTMLSelectElement>('task-mode').value = button.dataset.mode!;
      resizeInput();
      draft();
      readiness();
      input.focus();
    }),
  );
  el('load-apps').addEventListener(
    'click',
    () =>
      void command('loadApps').then((r) => {
        if (!r) return;
        options('original-app', [
          { value: '', label: '请选择应用' },
          ...r.apps.map((a: any) => ({
            value: a.id,
            label: a.name + ' · ' + (a.mode === 'workflow' ? 'Workflow' : 'Chatflow'),
          })),
        ]);
        el<HTMLSelectElement>('original-app').onchange = () => {
          const app = r.apps.find((a: any) => a.id === value('original-app'));
          if (app) {
            el<HTMLInputElement>('task-name').value = app.name;
            el<HTMLSelectElement>('task-mode').value = app.mode;
          }
          draft();
        };
      }),
  );
  el('new-chat').addEventListener(
    'click',
    () =>
      void command('newChat').then(() => {
        el('chat-options').hidden = true;
        draft();
        input.focus();
      }),
  );
  el('stop-chat').addEventListener('click', () => void command('cancel'));
  el('resume-chat').addEventListener('click', () => void command('resumeTask', { followUp: '' }));
  el<HTMLFormElement>('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || el<HTMLButtonElement>('send-chat').disabled) return;
    const payload = task();
    sending = true;
    input.value = '';
    resizeInput();
    draft();
    notice('');
    readiness();
    el('chat-options').hidden = true;
    try {
      await request('sendChat', payload);
    } catch (e) {
      notice(e instanceof Error ? e.message : String(e), true);
      if (!conversation?.messages.some((m) => m.kind === 'user' && m.text === payload.requirement))
        input.value = payload.requirement;
    } finally {
      sending = false;
      render(await request('getState'));
      resizeInput();
      draft();
      input.focus();
    }
  });
  return {
    render,
    renderChat,
    activity: (status: string) => {
      if (state?.taskRunning) el('chat-status').textContent = t(status);
    },
  };
}
