import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type {
  ConnectionProfile,
  ModelProfile,
  SecretStore,
  RunRecord,
  CapabilitySnapshot,
} from '../core/types';
import { ProjectStore } from '../core/project';
import { ChatJournal } from '../core/chat';
import { translate, type LanguageSetting } from '../core/i18n';
import { DifyTransport } from '../dify/transport';
import { DifyClient } from '../dify/client';
import { TaskController } from '../core/controller';
import { DifyBridge } from '../engine/bridge';
import { OpenCodeEngine } from '../engine/opencode';
import {
  connectionForm,
  modelForm,
  modelDiscoveryForm,
  limitForm,
  taskForm,
  type UiState,
} from '../ui/contracts';
import { normalizeBaseUrl, digest, redact, object, throwIfAborted } from '../core/util';
import type { ApplicationHost } from './host';
export function createApplication(host: ApplicationHost) {
  let active: TaskController | undefined;
  let bridge: DifyBridge | undefined;
  const secrets = host.secrets;
  const handlers: Record<string, (payload?: unknown) => Promise<unknown>> = {};
  let starting = false;
  let preparing: AbortController | undefined;
  let changingSettings = false;
  let pendingConnection:
    | {
        client: DifyClient;
        password: string;
        spaces: { id: string; name: string; role: string; current: boolean }[];
      }
    | undefined;
  const profile = () =>
    host.projectState.get<ConnectionProfile>('connection') ??
    host.globalState.get<ConnectionProfile>('defaultConnection');
  const invoke = async (name: string, payload?: unknown) => {
    if (!Object.hasOwn(handlers, name)) throw new Error('未知操作');
    try {
      return await handlers[name]!(payload);
    } catch (e) {
      const raw =
        e instanceof z.ZodError
          ? e.issues.map((i) => i.message).join('；')
          : e instanceof Error
            ? e.message
            : String(e);
      const submitted = object(payload);
      const text = redact(raw, [String(submitted.password ?? ''), String(submitted.apiKey ?? '')]);
      throw new Error(translate(text, host.locale()));
    }
  };
  const journals = new Map<string, Promise<ChatJournal>>();
  let runningChat: ChatJournal | undefined;
  let chatSaveTimer: ReturnType<typeof setTimeout> | undefined;
  async function journal() {
    const key = host.project()?.path ?? 'no-folder';
    if (!journals.has(key))
      journals.set(
        key,
        new ChatJournal(path.join(host.storagePath, 'chats', digest(key) + '.json')).load(),
      );
    return journals.get(key)!;
  }
  function showChat(chat: ChatJournal) {
    host.emit({ type: 'chat', chat: chat.snapshot() });
    if (chatSaveTimer) clearTimeout(chatSaveTimer);
    chatSaveTimer = setTimeout(() => {
      void chat.flush().catch((e) => host.log('Chat persistence failed: ' + redact(String(e))));
    }, 250);
  }
  const log = (text: string) => {
    host.log(redact(text));
  };
  const ensureIdle = () => {
    if (active || starting || changingSettings)
      throw new Error('当前任务或设置正在处理中，请稍后再操作。');
  };
  async function store() {
    if (!(host.project()?.trusted ?? true))
      throw new Error('请先信任工作区，才能连接 Dify 并运行 Agent');
    const folder = host.project();
    if (!folder) throw new Error('请先选择一个项目目录');
    const local = path.join(host.storagePath, 'projects', digest(folder.path));
    await fs.mkdir(local, { recursive: true, mode: 0o700 });
    return new ProjectStore(folder.path, local);
  }
  async function client() {
    if (!(host.project()?.trusted ?? true))
      throw new Error('请先信任工作区，才能连接 Dify 并运行 Agent');
    const p = profile();
    if (!p) throw new Error('请先在设置页连接 Dify');
    const transport = new DifyTransport({ ...p }, secrets);
    await transport.restore();
    return new DifyClient(transport);
  }
  const limits = () => {
    const c = host.config;
    return {
      maxRepairs: c.get<number>('maxRepairs', 5),
      timeoutMinutes: c.get<number>('taskTimeoutMinutes', 30),
      generationTokenBudget: c.get<number>('generationTokenBudget', 100000),
      difyTokenBudget: c.get<number>('difyTokenBudget', 100000),
    };
  };
  const snapshotPath = (p: ConnectionProfile) =>
    path.join(host.storagePath, 'connections', digest(p.id + '.' + p.workspaceId) + '.json');
  async function saveSnapshot(snap: CapabilitySnapshot, p: ConnectionProfile) {
    const file = snapshotPath(p);
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    const tmp = file + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(snap), { mode: 0o600 });
    await fs.rename(tmp, file);
    if (host.project()) await (await store()).snapshot(snap);
  }
  async function savedSnapshot(): Promise<CapabilitySnapshot | undefined> {
    const p = profile();
    if (!p) return;
    try {
      const s = JSON.parse(await fs.readFile(snapshotPath(p), 'utf8')) as CapabilitySnapshot;
      return s.connectionId === p.id &&
        s.workspaceId === p.workspaceId &&
        s.difyVersion === p.version
        ? s
        : undefined;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') log('能力缓存不可读，请重新同步。');
      return;
    }
  }
  async function getState(): Promise<UiState> {
    const contextPath = host.project()?.path;
    const p = profile(),
      m = host.globalState.get<ModelProfile>('generationModel'),
      snap = await savedSnapshot(),
      folder = host.project();
    const s = folder && (host.project()?.trusted ?? true) ? await store() : undefined;
    const spec = s ? await s.spec().catch(() => undefined) : undefined;
    const record = active?.record ?? (s ? await s.record() : undefined);
    const runtime = host.globalState.get<{
      connectionId: string;
      model: { provider: string; model: string };
    }>('runtimePreference');
    const state: UiState = {
      chat: (await journal()).snapshot(),
      locale: host.locale(),
      language: host.config.get<LanguageSetting>('language', 'auto'),
      workspace: folder
        ? {
            name: spec?.name ?? folder.name,
            path: folder.path,
            trusted: host.project()?.trusted ?? true,
          }
        : undefined,
      projects: await host.projects?.(),
      generationModels: m
        ? [
            ...new Set([
              m.model,
              ...host.globalState.get<string[]>(
                'models.' + digest(m.provider + '|' + (m.baseUrl ?? '')),
                [],
              )!,
            ]),
          ]
        : [],
      remoteApp:
        spec?.testAppId && spec.connectionId === p?.id
          ? {
              id: spec.testAppId,
              editorUrl: `${p!.baseUrl}/app/${encodeURIComponent(spec.testAppId)}/workflow`,
              published: record?.phase === 'complete',
            }
          : undefined,
      connection: p
        ? {
            baseUrl: p.baseUrl,
            version: p.version,
            email: p.email,
            workspaceId: p.workspaceId,
            hasPassword: Boolean(await secrets.get('dify.password.' + p.id)),
          }
        : undefined,
      model: m
        ? {
            provider: m.provider,
            baseUrl: m.baseUrl,
            model: m.model,
            hasKey: Boolean(await secrets.get(m.apiKeyRef)),
          }
        : undefined,
      limits: {
        ...limits(),
        opencodePath: host.config.get<string>('opencodePath', ''),
      },
      runtimeModel: runtime?.connectionId === p?.id ? runtime?.model : undefined,
      runtimeModels: (snap?.models ?? []).filter(
        (m) => m.type === 'llm' && m.availability === 'ready',
      ),
      capabilities: snap
        ? {
            tools: snap.tools.length,
            models: snap.models.length,
            datasets: snap.datasets.length,
            complete: snap.complete,
            fetchedAt: snap.fetchedAt,
            issues: snap.issues.map((i) => i.category + '：' + redact(i.reason)),
          }
        : undefined,
      task: spec
        ? {
            name: spec.name,
            mode: spec.mode,
            source: spec.originalAppId ? 'existing' : 'new',
            originalAppId: spec.originalAppId,
            requirement: spec.brief?.requirement ?? spec.requirement,
            acceptance: spec.brief?.acceptance ?? '',
            allowSideEffects: spec.allowSideEffects,
          }
        : undefined,
      run: record
        ? {
            id: record.id,
            phase: record.phase,
            round: record.round,
            error: record.error ? redact(record.error) : undefined,
            passed: record.report?.passed,
          }
        : undefined,
      busy: Boolean(active || starting || changingSettings),
      taskRunning: Boolean(active || starting),
    };
    if (contextPath !== host.project()?.path) return getState();
    return state;
  }
  async function emitState() {
    const state = await getState();
    host.emit({ type: 'state', state });
  }
  const notify = (record: RunRecord) => {
    const phases: Record<string, string> = {
      generating: '正在生成',
      validating: '正在校验',
      importing: '正在导入',
      testing: '正在测试',
      repairing: '正在修复',
      publishing: '正在发布',
      complete: '已完成',
      failed: '执行失败',
      cancelled: '已停止',
      'needs-input': '需要处理',
    };
    host.emit({
      type: 'activity',
      status: `${phases[record.phase] ?? record.phase} · 第 ${record.round + 1} 轮 · 生成 ${record.generationTokens} / Dify ${record.difyTokens} tokens`,
    });
    if (runningChat) {
      runningChat.progress(
        'run:' + record.id + ':' + record.round + ':' + record.phase,
        `${phases[record.phase] ?? record.phase} · 第 ${record.round + 1} 轮`,
      );
      showChat(runningChat);
    }
    void emitState().catch(() => {});
  };
  handlers.getState = getState;
  handlers.saveLanguage = async (payload) => {
    ensureIdle();
    const language = z.enum(['auto', 'en', 'zh-CN']).parse(payload);
    await host.config.update('language', language, undefined);
    await emitState();
  };
  handlers.settings = async () => {
    await host.showSettings();
  };
  handlers.showTask = async () => {
    await host.showChat();
    await emitState();
  };
  handlers.initialize = handlers.showTask;
  handlers.connect = handlers.settings;
  handlers.configureModel = handlers.settings;
  handlers.selectFolder = async () => {
    ensureIdle();
    await host.selectFolder();
    await emitState();
  };
  async function finishConnection(id: string) {
    const pending = pendingConnection;
    if (!pending) throw new Error('请先连接 Dify');
    if (!pending.spaces.some((s) => s.id === id)) throw new Error('工作空间不属于当前登录账号');
    const old = profile(),
      p = pending.client.transport.profile;
    if (old?.id === p.id && old.workspaceId && old.workspaceId !== id) p.id = randomUUID();
    await pending.client.selectWorkspace(id);
    const snap = await pending.client.refresh();
    await secrets.store('dify.password.' + p.id, pending.password);
    await host.globalState.update('defaultConnection', p);
    await host.projectState.update('connection', host.project() ? p : undefined);
    await saveSnapshot(snap, p);
    pendingConnection = undefined;
    log(
      `已保存 Dify 连接：${snap.tools.length} 个工具、${snap.models.length} 个模型、${snap.datasets.length} 个知识库。`,
    );
    return { complete: snap.complete };
  }
  handlers.connectForm = async (payload) => {
    ensureIdle();
    const form = connectionForm.parse(payload);
    if (!(host.project()?.trusted ?? true)) throw new Error('请先信任当前工作区');
    changingSettings = true;
    try {
      const old = profile(),
        baseUrl = normalizeBaseUrl(form.baseUrl),
        same = old?.baseUrl === baseUrl && old.email.toLowerCase() === form.email.toLowerCase();
      const password =
        form.password || (same ? await secrets.get('dify.password.' + old!.id) : undefined);
      if (!password) throw new Error('请填写登录密码');
      const p: ConnectionProfile = {
        id: same ? old!.id : randomUUID(),
        baseUrl,
        version: form.version,
        email: form.email,
        workspaceId: '',
      };
      const t = new DifyTransport(p, secrets);
      await t.login(form.email, password);
      const c = new DifyClient(t),
        spaces = await c.workspaces();
      if (!spaces.length) throw new Error('账号没有可用工作空间');
      pendingConnection = { client: c, password, spaces };
      if (spaces.length === 1) return await finishConnection(spaces[0]!.id);
      return { workspaces: spaces.map(({ id, name, current }) => ({ id, name, current })) };
    } finally {
      changingSettings = false;
      await emitState();
    }
  };
  handlers.selectWorkspace = async (payload) => {
    ensureIdle();
    const { id } = z.object({ id: z.string().min(1).max(100) }).parse(payload);
    changingSettings = true;
    try {
      return await finishConnection(id);
    } finally {
      changingSettings = false;
      await emitState();
    }
  };
  async function modelKey(form: { provider: string; baseUrl?: string; apiKey: string }) {
    const old = host.globalState.get<ModelProfile>('generationModel');
    const same = old?.provider === form.provider && old.baseUrl === form.baseUrl;
    const key = form.apiKey || (same ? await secrets.get(old!.apiKeyRef) : undefined);
    if (!key) throw new Error('请填写该供应商与地址对应的 API Key');
    return key;
  }
  handlers.saveModel = async (payload) => {
    ensureIdle();
    const f = modelForm.parse(payload);
    changingSettings = true;
    try {
      const key = await modelKey(f),
        ref = 'model.' + digest(f.provider + '|' + (f.baseUrl ?? ''));
      await secrets.store(ref, key);
      await host.globalState.update('generationModel', {
        provider: f.provider,
        baseUrl: f.baseUrl,
        model: f.model,
        apiKeyRef: ref,
      } satisfies ModelProfile);
      log('生成模型已保存：' + f.provider + '/' + f.model);
    } finally {
      changingSettings = false;
      await emitState();
    }
  };
  handlers.discoverModels = async (payload) => {
    ensureIdle();
    const f = modelDiscoveryForm.parse(payload);
    if (!f.baseUrl) throw new Error('该供应商请填写实际模型 ID；自动列表用于提供模型目录的 API。');
    const key = await modelKey(f);
    const response = await fetch(f.baseUrl.replace(/\/$/, '') + '/models', {
      headers: { Authorization: 'Bearer ' + key },
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error('模型列表读取失败：HTTP ' + response.status + '。可填写实际模型 ID。');
    const data = (await response.json()) as { data?: { id?: unknown }[] };
    const models = (data.data ?? [])
      .map((m) => m.id)
      .filter((m): m is string => typeof m === 'string' && m.length <= 200)
      .slice(0, 1000);
    await host.globalState.update('models.' + digest(f.provider + '|' + (f.baseUrl ?? '')), [
      ...new Set(models),
    ]);
    await emitState();
    return { models };
  };
  handlers.appPreview = async (payload) => {
    const projectPath = host.project()?.path;
    const requestedPath = object(payload).projectPath;
    if (requestedPath !== undefined && requestedPath !== projectPath)
      throw new Error('预览所属项目已切换，请刷新。');
    const spec = await (await store()).spec();
    const p = profile();
    if (!spec.testAppId || !p || spec.connectionId !== p.id)
      throw new Error('当前项目还没有对应的 Dify 测试应用。');
    const c = await client();
    const view = await c.preview(spec.testAppId, spec.mode);
    if (projectPath !== host.project()?.path || p.id !== profile()?.id)
      throw new Error('预览所属项目已切换，请刷新。');
    return view;
  };
  handlers.saveRuntime = async (payload) => {
    ensureIdle();
    const p = profile();
    if (!p) throw new Error('请先连接 Dify');
    const model = z
      .object({ provider: z.string().min(1).max(300), model: z.string().min(1).max(200) })
      .nullable()
      .parse(payload);
    if (
      model &&
      !(await savedSnapshot())?.models.some(
        (m) =>
          m.type === 'llm' &&
          m.availability === 'ready' &&
          m.provider === model.provider &&
          m.model === model.model,
      )
    )
      throw new Error('该模型不在当前 Dify 的可用目录中，请刷新能力');
    await host.globalState.update(
      'runtimePreference',
      model ? { connectionId: p.id, model } : undefined,
    );
    await emitState();
  };
  handlers.saveLimits = async (payload) => {
    ensureIdle();
    const f = limitForm.parse(payload),
      c = host.config;
    const values = {
      maxRepairs: f.maxRepairs,
      taskTimeoutMinutes: f.timeoutMinutes,
      generationTokenBudget: f.generationTokenBudget,
      difyTokenBudget: f.difyTokenBudget,
      opencodePath: f.opencodePath,
    };
    for (const [key, value] of Object.entries(values)) await c.update(key, value, undefined);
    await emitState();
  };
  handlers.sync = async () => {
    ensureIdle();
    changingSettings = true;
    try {
      const c = await client();
      await saveSnapshot(await c.refresh(), c.transport.profile);
      log('Dify 环境能力已刷新');
    } finally {
      changingSettings = false;
      await emitState();
    }
  };
  handlers.loadApps = async () => {
    const c = await client();
    return {
      apps: (await c.apps())
        .filter((a) => a.mode === 'workflow' || a.mode === 'advanced-chat')
        .map((a) => ({ id: String(a.id), name: String(a.name), mode: String(a.mode) })),
    };
  };
  async function saveTask(payload: unknown) {
    const f = taskForm.parse(payload),
      s = await store();
    let spec = await s.initialize(f.name, f.mode);
    const nextOriginal = f.source === 'existing' ? f.originalAppId : undefined;
    const changed =
      spec.originalAppId !== nextOriginal ||
      spec.mode !== f.mode ||
      spec.connectionId !== profile()?.id;
    spec = {
      ...spec,
      name: f.name,
      mode: f.mode,
      allowSideEffects: f.allowSideEffects,
      originalAppId: nextOriginal,
      connectionId: profile()?.id,
    };
    if (changed) {
      spec.originalDigest = undefined;
      spec.testAppId = undefined;
    }
    await s.writeSpec(spec);
    await s.saveBrief(f.requirement, f.acceptance);
    await emitState();
  }
  handlers.saveTask = async (payload) => {
    ensureIdle();
    await saveTask(payload);
  };
  async function launch(resume = false, followUp = '') {
    const signal = preparing?.signal;
    throwIfAborted(signal);
    const s = await store();
    let spec = await s.spec();
    const c = await client();
    const model = host.globalState.get<ModelProfile>('generationModel');
    if (!model) throw new Error('请先在设置页配置生成模型');
    const apiKey = await secrets.get(model.apiKeyRef);
    if (!apiKey) throw new Error('缺少模型 Key，请在设置页重新配置');
    if (spec.connectionId && spec.connectionId !== c.transport.profile.id)
      throw new Error('当前连接与任务目标不一致，请核对设置后重新保存任务。');
    if (!resume) {
      if (spec.originalAppId) {
        const remote = await c.app(spec.originalAppId, signal);
        if (!['workflow', 'advanced-chat'].includes(remote.mode))
          throw new Error('当前应用类型不支持自动改造');
        if (remote.mode !== spec.mode) throw new Error('应用类型与远端不一致，请重新选择应用');
        const yaml = await c.exportApp(spec.originalAppId, signal);
        throwIfAborted(signal);
        spec.originalDigest = digest(yaml);
        await s.backup('original', yaml);
        await s.saveDsl(yaml);
      } else spec.originalDigest = undefined;
      const preference = host.globalState.get<{
        connectionId: string;
        model: { provider: string; model: string };
      }>('runtimePreference');
      spec.runtimeModel =
        preference?.connectionId === c.transport.profile.id ? preference?.model : undefined;
      spec.connectionId = c.transport.profile.id;
      await s.writeSpec(spec);
    } else {
      const previous = await s.record();
      if (previous?.pendingTest) {
        const decision = await host.confirm(
          translate(
            '上次 Dify 测试结果未知，可能已产生外部业务写入。请先核对 Dify 日志、测试数据和业务状态，再允许重新测试。',
            host.locale(),
          ),
          translate('已核对，允许继续测试', host.locale()),
        );
        if (!decision) return;
        previous.pendingTest = false;
        await s.saveRecord(previous);
      }
      if (followUp) {
        spec.requirement += '\n后续要求：' + followUp;
        await s.writeSpec(spec);
      }
    }
    throwIfAborted(signal);
    const controller = new TaskController(s, c, limits(), notify);
    active = controller;
    try {
      await controller.begin(resume, Boolean(followUp));
      runningChat?.started();
      bridge = new DifyBridge(
        c,
        s,
        {
          frozenDigest: controller.frozenDigest,
          signal: () => controller.signal,
          importDraft: () => controller.importDraft(),
          runTests: () => controller.runTests(),
          publish: () => controller.publish(),
        },
        log,
      );
      await bridge.start();
      const configured = host.config.get<string>('opencodePath');
      const binary = configured || host.runtimePath;
      const engine = new OpenCodeEngine({
        difyVersion: c.transport.profile.version,
        binary,
        directory: path.join(s.privateRoot, 'engine'),
        model,
        apiKey,
        mcpUrl: bridge.url,
        mcpToken: bridge.token,
        sessionId: resume ? controller.record?.sessionId : undefined,
        onEvent: (event) => {
          const d = object(event.data);
          const p = object(d.properties);
          const part = object(p.part);
          if (part.type === 'tool')
            log(`Agent 工具：${part.tool} · ${object(part.state).status ?? ''}`);
          if (runningChat?.engineEvent(d, engine.sessionId)) showChat(runningChat);
        },
        onReply: (info, parts, sessionId) => {
          if (runningChat) {
            runningChat.reply(info, parts, sessionId);
            showChat(runningChat);
          }
        },
      });
      controller.attach(engine);
      await controller.drive(resume);
      if (runningChat) {
        runningChat.add(
          'result',
          '候选工作流通过验收，测试应用已发布。你可以查看 DSL 和测试报告，或继续发送修改要求。',
          '测试通过',
        );
        showChat(runningChat);
      }
      log(`已通过测试并发布测试应用：${c.url((await s.spec()).testAppId!, spec.mode)}`);
      host.published(c.url(controller.record?.testAppId!, spec.mode));
    } finally {
      await controller.abandon();
      await bridge?.close();
      bridge = undefined;
      active = undefined;
    }
  }
  handlers.generate = handlers.showTask;
  handlers.resume = handlers.showTask;
  handlers.newChat = async () => {
    ensureIdle();
    const chat = await journal();
    if (chat.snapshot().messages.length) {
      const folder = path.join(host.storagePath, 'chat-history');
      await fs.mkdir(folder, { recursive: true, mode: 0o700 });
      await fs.writeFile(
        path.join(folder, chat.snapshot().id + '.json'),
        JSON.stringify(chat.snapshot()),
        { mode: 0o600 },
      );
    }
    chat.newConversation();
    await chat.flush();
    await handlers.showTask!();
  };
  handlers.sendChat = async (payload) => {
    ensureIdle();
    const form = taskForm.parse(payload);
    // Trust and folder checks precede any project mutation or engine launch.
    await store();
    const chat = await journal();
    const resume = chat.snapshot().hasTask;
    chat.add('user', form.requirement);
    runningChat = chat;
    starting = true;
    preparing = new AbortController();
    try {
      await chat.flush();
      await emitState();
      if (!resume) {
        const requirement = chat
          .snapshot()
          .messages.filter((m) => m.kind === 'user')
          .map((m) => m.text)
          .join('\n\n');
        await saveTask({ ...form, requirement });
      }
      await launch(resume, resume ? form.requirement : '');
    } catch (e) {
      chat.add('error', redact(e instanceof Error ? e.message : String(e)), '需要处理');
      showChat(chat);
      throw e;
    } finally {
      preparing = undefined;
      starting = false;
      runningChat = undefined;
      await chat.flush();
      await emitState();
    }
  };
  handlers.startTask = async (payload) => {
    ensureIdle();
    starting = true;
    preparing = new AbortController();
    try {
      await saveTask(payload);
      await launch(false);
    } finally {
      preparing = undefined;
      starting = false;
      await emitState();
    }
  };
  handlers.resumeTask = async (payload) => {
    ensureIdle();
    const { followUp } = z.object({ followUp: z.string().max(20000).default('') }).parse(payload);
    starting = true;
    preparing = new AbortController();
    const chat = await journal();
    runningChat = chat.snapshot().hasTask ? chat : undefined;
    try {
      await emitState();
      await launch(true, followUp);
    } catch (e) {
      if (runningChat) {
        chat.add('error', e instanceof Error ? e.message : String(e), '需要处理');
        showChat(chat);
      }
      throw e;
    } finally {
      preparing = undefined;
      starting = false;
      runningChat = undefined;
      await chat.flush();
      await emitState();
    }
  };
  handlers.cancel = async () => {
    preparing?.abort(new Error('任务已取消'));
    await active?.cancel();
    log('已请求停止任务');
  };
  handlers.promote = async () => {
    ensureIdle();
    changingSettings = true;
    try {
      await emitState();
      const s = await store(),
        c = await client();
      const controller = new TaskController(s, c, limits(), notify);
      const updated = await controller.promote(async () => {
        const spec = await s.spec();
        await host.showDiff(
          path.join(s.privateRoot, 'original.yml'),
          s.dslPath,
          host.locale() === 'en' ? 'Dify original → candidate changes' : 'Dify 原应用 → 候选修改',
        );
        await host.openFile(s.reportPath);
        return host.confirm(
          host.locale() === 'en'
            ? `Update and publish original application ${spec.name} (${spec.originalAppId})? Review the DSL diff and test report before confirming.`
            : `更新并发布原应用 ${spec.name} (${spec.originalAppId})？请先检查 DSL 差异和测试报告。`,
          translate('更新原应用', host.locale()),
        );
      });
      if (updated) log('原应用更新完成');
    } finally {
      changingSettings = false;
      await emitState();
    }
  };
  handlers.openDsl = async () => host.openFile((await store()).dslPath);
  handlers.openReport = async () => host.openFile((await store()).reportPath);
  handlers.diff = async () => {
    const s = await store();
    await host.showDiff(
      path.join(s.privateRoot, 'original.yml'),
      s.dslPath,
      host.locale() === 'en' ? 'Dify original → candidate changes' : 'Dify 原应用 → 候选修改',
    );
  };

  return {
    invoke,
    state: getState,
    refresh: emitState,
    busy: () => Boolean(active || starting || changingSettings),
    async shutdown() {
      preparing?.abort(new Error('Application closing'));
      await active?.cancel();
      await active?.abandon();
      await bridge?.close();
      if (chatSaveTimer) clearTimeout(chatSaveTimer);
      await Promise.allSettled([...journals.values()].map(async (chat) => (await chat).flush()));
    },
  };
}
