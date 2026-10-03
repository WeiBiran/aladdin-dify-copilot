import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { UiState } from '../src/ui/contracts';
export async function run() {
  const extension = vscode.extensions.getExtension('aladdin.aladdin-dify-copilot');
  assert(extension, 'Extension manifest must load');
  await extension.activate();
  assert(extension.isActive);
  const exported = extension.exports as {
    ui: {
      taskViewReady: () => boolean;
      taskViewVisible: () => boolean;
      scriptsReady: () => boolean;
    };
  };
  const startupDeadline = Date.now() + 10000;
  while (!exported.ui.taskViewVisible() && Date.now() < startupDeadline)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert(exported.ui.taskViewVisible(), 'The task panel must open automatically on startup');
  const containers = extension.packageJSON.contributes.viewsContainers;
  assert.equal(containers.secondarySidebar[0].id, 'aladdinDifyRight');
  assert(!containers.activitybar, 'The default task container must be in the secondary sidebar');
  await vscode.commands.executeCommand('aladdinDify.saveLanguage', 'zh-CN');
  if (process.env.DIFY_HOST_UNTRUSTED) {
    assert.equal(vscode.workspace.isTrusted, false);
    await assert.rejects(
      Promise.resolve(
        vscode.commands.executeCommand('aladdinDify.saveTask', {
          name: 'Restricted UI',
          mode: 'workflow',
          source: 'new',
          requirement: 'Display only',
        }),
      ),
      /请先信任/,
    );
    const state = await vscode.commands.executeCommand<UiState>('aladdinDify.getState');
    assert.equal(state?.workspace?.trusted, false);
    await writeFile(
      process.env.DIFY_HOST_REPORT!,
      JSON.stringify({
        host: vscode.version,
        restrictedMode: true,
        startupRevealed: true,
        taskExecutionBlocked: true,
      }),
    );
    return;
  }
  const commands = await vscode.commands.getCommands(true);
  for (const name of [
    'settings',
    'showTask',
    'newChat',
    'initialize',
    'connect',
    'configureModel',
    'sync',
    'generate',
    'cancel',
    'resume',
    'promote',
    'openReport',
    'openDsl',
    'diff',
  ])
    assert(commands.includes('aladdinDify.' + name), `Missing command ${name}`);
  await vscode.commands.executeCommand('aladdinDify.settings');
  assert(
    vscode.window.tabGroups.all.some((group) =>
      group.tabs.some((tab) => tab.label === 'Dify Copilot · 设置'),
    ),
    'Settings page must open in an editor tab',
  );
  const initial = await vscode.commands.executeCommand<UiState>('aladdinDify.getState');
  assert(initial && !initial.busy && !initial.model);
  const fixtureKey = 'fixture-key-only-used-in-isolated-vscode-host';
  await vscode.commands.executeCommand('aladdinDify.saveModel', {
    provider: 'custom',
    baseUrl: 'http://127.0.0.1:9/v1',
    model: 'fixture-model',
    apiKey: fixtureKey,
  });
  const modelState = await vscode.commands.executeCommand<UiState>('aladdinDify.getState');
  assert.equal(modelState?.model?.hasKey, true);
  assert(
    !JSON.stringify(modelState).includes(fixtureKey),
    'Public Webview state must never contain saved secrets',
  );
  assert(!JSON.stringify(modelState).includes('apiKeyRef'), 'Webview receives metadata only');
  await assert.rejects(
    Promise.resolve(
      vscode.commands.executeCommand('aladdinDify.saveModel', {
        provider: 'custom',
        baseUrl: 'http://127.0.0.1:10/v1',
        model: 'fixture-model',
        apiKey: '',
      }),
    ),
    /API Key/,
  );
  await vscode.commands.executeCommand('aladdinDify.saveLimits', {
    maxRepairs: 3,
    timeoutMinutes: 15,
    generationTokenBudget: 20000,
    difyTokenBudget: 30000,
    opencodePath: '',
    showTaskOnStartup: false,
  });
  const task = {
    name: '页面输入的项目',
    mode: 'advanced-chat',
    source: 'new',
    requirement: '根据产品型号检索知识库，信息不足时追问。',
    acceptance: '回答必须包含依据，不同会话不串扰。',
    allowSideEffects: false,
  };
  await vscode.commands.executeCommand('aladdinDify.saveTask', task);
  const project = vscode.workspace.workspaceFolders![0]!.uri.fsPath;
  const spec = JSON.parse(await readFile(path.join(project, 'dify.project.json'), 'utf8'));
  const markdown = await readFile(path.join(project, 'requirements.md'), 'utf8');
  assert.deepEqual(spec.brief, { requirement: task.requirement, acceptance: task.acceptance });
  assert(spec.requirement.includes(task.acceptance) && markdown.includes(task.requirement));
  const saved = await vscode.commands.executeCommand<UiState>('aladdinDify.getState');
  assert.equal(saved?.task?.acceptance, task.acceptance);
  assert.equal(saved?.limits.maxRepairs, 3);
  assert.equal(saved?.limits.timeoutMinutes, 15);
  assert.equal(saved?.limits.showTaskOnStartup, false);
  const emptyChat = saved?.chat?.id;
  await assert.rejects(
    Promise.resolve(vscode.commands.executeCommand('aladdinDify.sendChat', task)),
    /连接 Dify/,
  );
  const conversation = await vscode.commands.executeCommand<UiState>('aladdinDify.getState');
  assert.equal(conversation?.chat?.messages[0]?.kind, 'user');
  assert.equal(conversation?.chat?.messages[0]?.text, task.requirement);
  assert.equal(conversation?.chat?.messages.at(-1)?.kind, 'error');
  assert.equal(
    conversation?.chat?.hasTask,
    false,
    'A prerequisite failure must not pretend an engine session started',
  );
  await vscode.commands.executeCommand('aladdinDify.newChat');
  const reset = await vscode.commands.executeCommand<UiState>('aladdinDify.getState');
  assert.notEqual(reset?.chat?.id, emptyChat);
  assert.deepEqual(reset?.chat?.messages, []);
  assert.equal(
    reset?.task?.requirement,
    task.requirement,
    'New chat must not delete existing project requirements',
  );
  await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
  assert.equal(
    exported.ui.taskViewVisible(),
    false,
    'Closing the secondary sidebar hides the task view',
  );
  await vscode.commands.executeCommand('aladdinDify.showTask');
  const deadline = Date.now() + 10000;
  while (!exported.ui.scriptsReady() && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert(exported.ui.taskViewReady(), 'The actual task Webview must resolve');
  assert(exported.ui.taskViewVisible(), 'The task command must restore a hidden right panel');
  assert(
    exported.ui.scriptsReady(),
    'Settings and task scripts must execute and complete an RPC in real VS Code Webviews',
  );
  await vscode.commands.executeCommand('aladdinDify.saveLanguage', 'en');
  const english = await vscode.commands.executeCommand<UiState>('aladdinDify.getState');
  assert.equal(english?.locale, 'en');
  assert(
    vscode.window.tabGroups.all.some((group) =>
      group.tabs.some((tab) => tab.label === 'Dify Copilot · Settings'),
    ),
  );
  const languageDeadline = Date.now() + 10000;
  while (!exported.ui.scriptsReady() && Date.now() < languageDeadline)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert(
    exported.ui.scriptsReady(),
    'Both English Webviews must finish initialization after switching languages',
  );
  await writeFile(
    process.env.DIFY_HOST_REPORT!,
    JSON.stringify(
      {
        host: vscode.version,
        active: extension.isActive,
        commands: 14,
        chatPrerequisiteFailureVisible: true,
        newChatPreservesProject: true,
        bilingualWebviewsVerified: true,
        secondarySidebarDefault: true,
        startupRevealed: true,
        hiddenPanelRestored: true,
        viewOpened: true,
        settingsOpened: true,
        webviewScriptsVerified: true,
        taskSavedFromForm: true,
        secretStorageVerified: true,
        crossHostKeyReuseBlocked: true,
        limitsSaved: true,
      },
      null,
      2,
    ),
  );
}
