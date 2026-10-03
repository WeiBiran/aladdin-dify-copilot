// Local authenticated browser transport. Credentials are never kept in browser storage.
export {};
const en = document.body.dataset.locale === 'en';
const text = (english: string, chinese: string) => (en ? english : chinese);
const dialog = document.getElementById('app-dialog') as HTMLDialogElement;
const status = document.getElementById('server-status')!;
let preview: { title: string; files: { label: string; content: string }[] } | undefined;
let confirmation: { id: string; message: string; label: string } | undefined;
let currentFolder = '';
let parentFolder = '';
function dispatch(value: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data: value }));
}
async function post(route: string, data: unknown) {
  const response = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const value = await response.json();
  if (!response.ok || value.error)
    throw new Error(value.error ?? text('Request failed.', '请求失败。'));
  return value;
}
(window as any).acquireAppApi = () => ({
  postMessage(message: { id: string; command: string; payload?: unknown }) {
    if (message.command === 'rendererReady') return;
    void post('/api/command', message)
      .then((value) => dispatch({ type: 'response', id: message.id, result: value.result }))
      .catch((error) => dispatch({ type: 'response', id: message.id, error: error.message }));
  },
  getState() {
    try {
      return JSON.parse(sessionStorage.getItem('aladdin.draft') ?? 'null');
    } catch {
      return null;
    }
  },
  setState(state: unknown) {
    try {
      sessionStorage.setItem('aladdin.draft', JSON.stringify(state));
    } catch {
      /* Quota or browser policy: draft stays in memory. */
    }
  },
});
function button(label: string, action: () => void | Promise<void>, primary = false) {
  const node = document.createElement('button');
  node.type = 'button';
  node.textContent = label;
  if (primary) node.className = 'primary';
  node.onclick = () => {
    void Promise.resolve(action()).catch((e) => {
      const error = dialog.querySelector('.dialog-error');
      if (error) error.textContent = e.message;
    });
  };
  return node;
}
function openDialog(title: string) {
  dialog.replaceChildren();
  const header = document.createElement('div');
  header.className = 'dialog-header';
  const h = document.createElement('h2');
  h.textContent = title;
  const close = button('×', async () => {
    if (confirmation) await decide(false);
    else {
      dialog.close();
      preview = undefined;
      await post('/api/dismiss-preview', {});
    }
  });
  close.setAttribute('aria-label', text('Close', '关闭'));
  header.append(h, close);
  dialog.append(header);
  if (!dialog.open) dialog.showModal();
}
function errorElement() {
  const error = document.createElement('div');
  error.className = 'dialog-error';
  error.setAttribute('role', 'alert');
  return error;
}
function previews() {
  if (!preview) return;
  const files = preview.files;
  const tabs = document.createElement('div');
  tabs.className = 'preview-tabs';
  const pane = document.createElement('div');
  pane.className = 'preview-pane';
  function render(index: number) {
    pane.replaceChildren();
    pane.classList.toggle('diff', index < 0);
    const chosen = index < 0 ? files.slice(0, 2) : [files[index]!];
    for (const file of chosen) {
      const column = document.createElement('div');
      const label = document.createElement('div');
      label.className = 'preview-label';
      label.textContent = file.label;
      const pre = document.createElement('pre');
      pre.textContent = file.content;
      column.append(label, pre);
      pane.append(column);
    }
  }
  if (files.length > 1) tabs.append(button(text('Compare changes', '查看变更'), () => render(-1)));
  files.forEach((file, i) => tabs.append(button(file.label, () => render(i))));
  dialog.append(tabs, pane);
  render(files.length > 1 ? -1 : 0);
}
function showReview() {
  openDialog(
    confirmation
      ? text('Review and confirm', '核对并确认')
      : (preview?.title ?? text('Preview', '预览')),
  );
  if (confirmation) {
    const p = document.createElement('p');
    p.className = 'confirm-text';
    p.textContent = confirmation.message;
    dialog.append(p);
  }
  previews();
  dialog.append(errorElement());
  if (confirmation) {
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    actions.append(
      button(text('Cancel', '取消'), () => decide(false)),
      button(confirmation.label, () => decide(true), true),
    );
    dialog.append(actions);
  }
}
async function decide(allow: boolean) {
  if (!confirmation) return;
  const pending = confirmation;
  dialog.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.disabled = true));
  try {
    await post('/api/confirmation', { id: pending.id, allow });
    confirmation = undefined;
    preview = undefined;
    dialog.close();
  } catch (e) {
    dialog.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.disabled = false));
    throw e;
  }
}
dialog.addEventListener('cancel', (event) => {
  if (confirmation) {
    event.preventDefault();
    void decide(false).catch((e) => {
      dialog.querySelector('.dialog-error')!.textContent = e.message;
    });
  }
});
async function browse(directory: string) {
  const result = await post('/api/folders', { path: directory });
  currentFolder = result.path;
  parentFolder = result.parent;
  openDialog(text('Choose a project folder', '选择项目目录'));
  const row = document.createElement('div');
  row.className = 'row';
  const input = document.createElement('input');
  input.id = 'folder-path';
  input.value = currentFolder;
  input.setAttribute('aria-label', text('Directory path', '目录路径'));
  input.onkeydown = (e) => {
    if (e.key === 'Enter')
      void browse(input.value).catch(
        (err) => (dialog.querySelector('.dialog-error')!.textContent = err.message),
      );
  };
  row.append(
    input,
    button(text('Go', '前往'), () => browse(input.value)),
  );
  dialog.append(row);
  const list = document.createElement('div');
  list.className = 'folder-list';
  list.append(
    button('↑ ' + text('Parent directory', '上级目录'), () => browse(parentFolder)),
    button('⌂ ' + text('Home', '用户目录'), () => browse(result.home)),
  );
  for (const folder of result.folders)
    list.append(button('▸ ' + folder.name, () => browse(folder.path)));
  dialog.append(list);
  const create = document.createElement('div');
  create.className = 'row';
  const name = document.createElement('input');
  name.id = 'new-folder';
  name.placeholder = text('New project folder name', '新项目目录名称');
  name.setAttribute('aria-label', name.placeholder);
  create.append(
    name,
    button(text('Create and select', '创建并选择'), async () => {
      await post('/api/project', { path: currentFolder, create: name.value });
      dialog.close();
    }),
  );
  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  actions.append(
    button(text('Cancel', '取消'), () => dialog.close()),
    button(
      text('Use this folder', '使用此目录'),
      async () => {
        await post('/api/project', { path: currentFolder });
        dialog.close();
      },
      true,
    ),
  );
  dialog.append(create, errorElement(), actions);
}
const events = new EventSource('/api/events');
events.onopen = () => {
  status.textContent = '';
};
events.onerror = () => {
  status.textContent = text('Connection lost · reconnecting…', '连接中断 · 正在重连…');
};
events.onmessage = (message) => {
  const event = JSON.parse(message.data);
  if (event.type === 'navigate') {
    window.location.assign(event.path);
    return;
  }
  if (event.type === 'state' && event.state.locale !== document.body.dataset.locale) {
    window.location.reload();
    return;
  }
  if (event.type === 'folder') {
    void browse(event.path).catch((e) => {
      openDialog(text('Choose a project folder', '选择项目目录'));
      const error = errorElement();
      error.textContent = e.message;
      dialog.append(error);
    });
    return;
  }
  if (event.type === 'preview') {
    preview = event;
    showReview();
    return;
  }
  if (event.type === 'confirm') {
    confirmation = event;
    showReview();
    return;
  }
  if (event.type === 'published') {
    const note = document.getElementById('app-notification')!;
    note.replaceChildren();
    const link = document.createElement('a');
    link.textContent = text('Test app published · Open in Dify', '测试应用已发布 · 在 Dify 中打开');
    // The Dify connection URL is validated by the server; still restrict navigation protocols.
    try {
      const url = new URL(event.url);
      if (['http:', 'https:'].includes(url.protocol)) {
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    } catch {
      /* Show text without a link. */
    }
    note.append(
      link,
      button('×', () => {
        note.hidden = true;
      }),
    );
    note.hidden = false;
    return;
  }
  dispatch(event);
};
window.addEventListener('pagehide', () => events.close());
