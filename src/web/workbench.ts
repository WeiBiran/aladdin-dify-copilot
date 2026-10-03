import type { UiState } from '../ui/contracts';

export function setupWorkbench(post: (route: string, data: unknown) => Promise<any>) {
  const en = document.body.dataset.locale === 'en';
  const t = (enText: string, zh: string) => (en ? enText : zh);
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const settings = el<HTMLDialogElement>('settings-dialog');
  const workbench = el('workbench');
  let state: UiState | undefined;
  let selected = 'editor';
  let frameKey = '';
  let projectPath = '';
  let publication = '';
  let draftRevision = '';
  let changing = false;
  const command = async (command: string, payload?: unknown) =>
    (await post('/api/command', { command, payload })).result;
  function notice(message: string) {
    const target = el('global-message') ?? el('settings-message');
    if (target) {
      target.textContent = message;
      target.classList.add('error');
    }
  }
  function openSettings() {
    if (settings && !settings.open) settings.showModal();
    else if (!settings) window.location.assign('/settings');
  }
  function closeSettings() {
    settings?.close();
  }
  el('close-settings')?.addEventListener('click', closeSettings);
  el('toggle-projects')?.addEventListener('click', () =>
    workbench?.classList.toggle('show-projects'),
  );
  el('toggle-preview')?.addEventListener('click', () =>
    workbench?.classList.toggle('show-preview'),
  );
  function renderProjects() {
    if (!workbench || !state) return;
    const query = el<HTMLInputElement>('project-search').value.toLocaleLowerCase();
    const projects = state.projects ?? [];
    const list = el('project-list');
    list.replaceChildren();
    el('project-count').textContent = String(projects.length);
    for (const project of projects.filter((p) => p.name.toLocaleLowerCase().includes(query))) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-item' + (project.path === state.workspace?.path ? ' active' : '');
      button.setAttribute(
        'aria-current',
        project.path === state.workspace?.path ? 'page' : 'false',
      );
      button.disabled = state.busy || changing || Boolean(project.missing);
      button.title = project.path;
      const glyph = document.createElement('span');
      glyph.className = 'project-glyph';
      glyph.textContent = project.mode === 'advanced-chat' ? '◌' : '◇';
      const info = document.createElement('span');
      info.className = 'project-info';
      const name = document.createElement('strong');
      name.textContent = project.name;
      const detail = document.createElement('small');
      detail.textContent = project.missing
        ? t('Folder unavailable', '目录不可用')
        : project.mode === 'advanced-chat'
          ? 'Chatflow'
          : project.mode === 'workflow'
            ? 'Workflow'
            : t('Local project', '本地项目');
      info.append(name, detail);
      button.append(glyph, info);
      button.onclick = async () => {
        if (changing) return;
        changing = true;
        renderProjects();
        try {
          await post('/api/project', { path: project.path });
          workbench.classList.remove('show-projects');
        } catch (error) {
          notice((error as Error).message);
        } finally {
          changing = false;
          renderProjects();
        }
      };
      list.append(button);
    }
    el<HTMLButtonElement>('create-project').disabled = state.busy || changing;
    workbench
      .querySelectorAll<HTMLButtonElement>('[data-command=selectFolder]')
      .forEach((b) => (b.disabled = state!.busy || changing));
  }
  el('project-search')?.addEventListener('input', renderProjects);
  el('create-project')?.addEventListener('click', () => {
    const dialog = el<HTMLDialogElement>('app-dialog');
    dialog.replaceChildren();
    const h = document.createElement('h2');
    h.textContent = t('Create an agent project', '创建智能体项目');
    const form = document.createElement('form');
    form.className = 'new-project-form';
    const field = (label: string, child: HTMLElement) => {
      const node = document.createElement('label');
      node.className = 'field';
      node.append(label, child);
      return node;
    };
    const name = document.createElement('input');
    name.required = true;
    name.maxLength = 100;
    name.placeholder = t('e.g. Customer support assistant', '例如：客户服务助手');
    name.autocomplete = 'off';
    const mode = document.createElement('select');
    for (const [value, label] of [
      ['advanced-chat', 'Chatflow'],
      ['workflow', 'Workflow'],
    ]) {
      const option = document.createElement('option');
      option.value = value!;
      option.textContent = label!;
      mode.append(option);
    }
    const help = document.createElement('p');
    help.textContent = t(
      'Each project owns its conversation, workflow and tests. Its Dify test app is created when the agent imports a draft.',
      '每个项目保存独立的对话、工作流和测试。Agent 导入草稿时会创建对应的 Dify 测试应用。',
    );
    const error = document.createElement('p');
    error.className = 'dialog-error';
    error.setAttribute('role', 'alert');
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = t('Cancel', '取消');
    cancel.onclick = () => dialog.close();
    const create = document.createElement('button');
    create.type = 'submit';
    create.className = 'primary';
    create.textContent = t('Create and start chatting', '创建并开始对话');
    actions.append(cancel, create);
    form.append(
      field(t('Agent name', '智能体名称'), name),
      field(t('App type', '应用类型'), mode),
      help,
      error,
      actions,
    );
    form.onsubmit = (e) => {
      e.preventDefault();
      create.disabled = cancel.disabled = true;
      void post('/api/projects/create', { name: name.value, mode: mode.value })
        .then(() => {
          dialog.close();
          workbench.classList.remove('show-projects', 'show-preview');
          el<HTMLTextAreaElement>('chat-input').focus();
        })
        .catch((e) => (error.textContent = e.message))
        .finally(() => (create.disabled = cancel.disabled = false));
    };
    dialog.append(h, form);
    dialog.showModal();
    name.focus();
  });
  const model = el<HTMLSelectElement>('top-model-select');
  model?.addEventListener('change', () => {
    if (!state?.model || model.value === '__settings') {
      openSettings();
      model.value = state?.model?.model ?? '__settings';
      return;
    }
    const profile = state.model;
    model.disabled = true;
    void command('saveModel', {
      provider: profile.provider,
      baseUrl: profile.baseUrl,
      model: model.value,
      apiKey: '',
    })
      .catch((e) => notice(e.message))
      .finally(() => (model.disabled = Boolean(state?.busy)));
  });
  function renderGlobal() {
    if (!state) return;
    const connection = el('top-dify-address');
    if (connection) {
      connection.textContent = state.connection
        ? new URL(state.connection.baseUrl).host
        : t('Connect Dify', '连接 Dify');
      connection.title = state.connection?.baseUrl ?? '';
      el('connection-led').classList.toggle('ready', Boolean(state.connection));
    }
    model.replaceChildren();
    for (const id of state.generationModels) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = id;
      model.append(option);
    }
    const config = document.createElement('option');
    config.value = '__settings';
    config.textContent = state.model
      ? t('Configure models…', '配置模型…')
      : t('Choose a generation model…', '选择生成模型…');
    model.append(config);
    model.value = state.model?.model ?? '__settings';
    model.disabled = state.busy;
  }
  function setExternal(value?: string) {
    const link = el<HTMLAnchorElement>('external-preview');
    if (!link) return;
    link.hidden = true;
    link.removeAttribute('href');
    if (value) {
      try {
        const url = new URL(value);
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
          link.href = url.href;
          link.hidden = false;
        }
      } catch {
        /* Keep malformed links noninteractive. */
      }
    }
  }
  function renderPreview(refresh = false) {
    if (!workbench || !state) return;
    el('preview-project-name').textContent =
      state.task?.name ?? state.workspace?.name ?? t('Agent preview', '智能体预览');
    el('preview-app-type').textContent =
      state.task?.mode === 'advanced-chat' ? 'Chatflow' : 'Workflow';
    workbench
      .querySelectorAll<HTMLElement>('[data-preview]')
      .forEach((b) => b.setAttribute('aria-selected', String(b.dataset.preview === selected)));
    const frame = el<HTMLIFrameElement>('dify-preview');
    const empty = el('preview-empty');
    const artifacts = el('artifact-preview');
    const local = ['dsl', 'report'].includes(selected);
    if (local) setExternal();
    frame.hidden = local || !state.remoteApp;
    artifacts.hidden = !local;
    empty.hidden = local || Boolean(state.remoteApp);
    el('preview-setup').hidden = Boolean(state.connection && state.model?.hasKey);
    el('preview-address').textContent = state.remoteApp
      ? new URL(state.remoteApp.editorUrl).host + ' / ' + state.remoteApp.id
      : t('Waiting for a test app', '等待创建测试应用');
    const phase = state.run?.phase;
    el('preview-phase').textContent =
      (
        {
          complete: t('Published · tests passed', '已发布 · 测试通过'),
          failed: t('Task failed', '任务失败'),
          'needs-input': t('Needs attention', '需要处理'),
          cancelled: t('Stopped', '已停止'),
        } as Record<string, string>
      )[phase ?? ''] ??
      (state.taskRunning ? t('Building…', '构建中…') : t('Not started', '尚未开始'));
    el('preview-capabilities').textContent = state.capabilities
      ? t(`${state.capabilities.tools} tools synced`, `已同步 ${state.capabilities.tools} 个工具`)
      : t('Tools are discovered from Dify', '能力同步后自动选用工具');
    const key = state.remoteApp
      ? [
          projectPath,
          state.remoteApp.id,
          selected,
          publication,
          selected === 'editor' ? draftRevision : '',
        ].join('|')
      : '';
    if (!state.remoteApp) {
      frame.removeAttribute('src');
      frameKey = '';
      setExternal();
    } else if (!local && (frameKey !== key || refresh)) {
      frameKey = key;
      const path = projectPath;
      const tab = selected;
      frame.src =
        '/preview?view=' +
        (selected === 'runtime' ? 'runtime' : 'editor') +
        '&project=' +
        encodeURIComponent(projectPath) +
        '&revision=' +
        Date.now();
      setExternal(selected === 'editor' ? state.remoteApp.editorUrl : undefined);
      void command('appPreview', { projectPath })
        .then((value) => {
          if (path === projectPath && tab === selected)
            setExternal(tab === 'runtime' && value.published ? value.runtimeUrl : value.editorUrl);
        })
        .catch((e) => {
          if (path === projectPath) notice(e.message);
        });
    }
  }
  async function selectPreview(kind: string, refresh = false) {
    selected = kind;
    renderPreview(refresh);
    if (['dsl', 'report'].includes(kind)) {
      el('artifact-title').textContent =
        kind === 'dsl' ? 'workflow.yml' : t('Test report', '测试报告');
      el('artifact-content').textContent = t('Loading…', '读取中…');
      try {
        await command(kind === 'dsl' ? 'openDsl' : 'openReport');
      } catch (e) {
        el('artifact-content').textContent = (e as Error).message.includes('ENOENT')
          ? kind === 'dsl'
            ? t(
                'No DSL yet. Send your goal in chat to start building.',
                '尚未生成 DSL。发送需求后，Agent 会把工作流保存到这里。',
              )
            : t(
                'No test report yet. Results appear after the agent runs the test suite.',
                '尚未运行测试。Agent 执行测试后，结果会显示在这里。',
              )
          : (e as Error).message;
      }
    }
  }
  workbench
    ?.querySelectorAll<HTMLElement>('[data-preview]')
    .forEach((b) => b.addEventListener('click', () => void selectPreview(b.dataset.preview!)));
  el('refresh-preview')?.addEventListener('click', () => void selectPreview(selected, true));
  const divider = el('preview-divider');
  let dragging = false;
  let width = 46;
  function setWidth(value: number) {
    width = Math.min(64, Math.max(30, value));
    workbench.style.setProperty('--preview-width', width + '%');
    divider.setAttribute('aria-valuenow', String(Math.round(width)));
  }
  divider?.addEventListener('pointerdown', (e) => {
    dragging = true;
    divider.setPointerCapture(e.pointerId);
  });
  divider?.addEventListener('pointermove', (e) => {
    if (dragging)
      setWidth(
        ((workbench.getBoundingClientRect().right - e.clientX) / workbench.clientWidth) * 100,
      );
  });
  divider?.addEventListener('pointerup', () => {
    dragging = false;
  });
  divider?.addEventListener('lostpointercapture', () => {
    dragging = false;
  });
  divider?.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      setWidth(width + (e.key === 'ArrowLeft' ? 2 : -2));
    }
  });
  return {
    openSettings,
    closeSettings,
    render(next: UiState) {
      state = next;
      renderGlobal();
      if (projectPath !== next.workspace?.path) {
        projectPath = next.workspace?.path ?? '';
        selected = next.remoteApp?.published ? 'runtime' : 'editor';
        publication = '';
        draftRevision = '';
        frameKey = '';
        if (workbench) {
          el('artifact-title').textContent = '';
          el('artifact-content').textContent = '';
        }
      }
      const published = next.remoteApp?.published ? next.remoteApp.id + ':published' : '';
      if (published && publication !== published && selected === 'editor') selected = 'runtime';
      publication = published;
      if (next.run?.phase === 'testing') draftRevision = next.run.id + ':' + next.run.round;
      renderProjects();
      renderPreview();
    },
    artifact(event: {
      title: string;
      projectPath?: string;
      files: { label: string; content: string }[];
    }) {
      if (!workbench || event.files.length !== 1) return false;
      if (event.projectPath && event.projectPath !== projectPath) return true;
      selected = event.files[0]!.label === 'workflow.yml' ? 'dsl' : 'report';
      renderPreview();
      el('artifact-title').textContent = event.files[0]!.label;
      el('artifact-content').textContent = event.files[0]!.content;
      return true;
    },
  };
}
