export type Locale = 'en' | 'zh-CN';
export type LanguageSetting = 'auto' | Locale;
export function resolveLanguage(setting: LanguageSetting, vscodeLanguage: string): Locale {
  return setting === 'auto' ? (/^zh(?:-|$)/i.test(vscodeLanguage) ? 'zh-CN' : 'en') : setting;
}
// Keys are the existing Chinese source messages. User prompts, model replies,
// tool definitions, saved project names and credentials never pass through this table.
export const englishMessages: Record<string, string> = {
  设置: 'Settings',
  任务: 'Chat',
  '跟随 VS Code': 'Follow VS Code',
  界面语言: 'Interface language',
  打开右侧任务面板: 'Open chat panel',
  连接你的开发环境: 'Connect your development environment',
  '配置一次，让 Agent 了解 Dify 的真实工具、模型和知识库。':
    'Connect Dify so the agent can discover its actual tools, models, and knowledge bases.',
  '连接 Dify': 'Connect Dify',
  选择生成模型: 'Choose a generation model',
  在任务面板描述需求: 'Describe your task in chat',
  设置分类: 'Settings sections',
  'Dify 连接': 'Dify connection',
  生成模型: 'Generation model',
  工作流运行模型: 'Workflow runtime model',
  执行限制: 'Execution limits',
  '凭据安全保存在本机。': 'Credentials stay in secure local storage.',
  '项目文件可独立分享。': 'Project files can be shared separately.',
  '连接已有实例，自动同步当前账号可见的能力。':
    'Connect an existing instance and sync the capabilities visible to your account.',
  未配置: 'Not configured',
  实例地址: 'Instance URL',
  '填写 Dify 根地址或 Console API 地址。': 'Enter the Dify root URL or Console API URL.',
  'Dify 版本': 'Dify version',
  登录邮箱: 'Login email',
  登录密码: 'Login password',
  输入登录密码: 'Enter your login password',
  '密码与会话保存在 VS Code 安全凭据存储中。':
    'Passwords and sessions are stored in VS Code SecretStorage.',
  选择工作空间: 'Select workspace',
  保存工作空间并同步: 'Save workspace and sync',
  连接并同步: 'Connect and sync',
  刷新能力: 'Refresh capabilities',
  可见工具: 'Visible tools',
  环境模型: 'Runtime models',
  知识库: 'Knowledge bases',
  '连接后，Agent 会按任务需要读取具体工具的参数与调用定义。':
    'The agent reads detailed tool parameters and call definitions as needed.',
  '负责理解需求、编排工作流、分析测试结果并修复。':
    'Used to understand requirements, build workflows, and repair failures using test evidence.',
  模型供应商: 'Model provider',
  '供应商 ID': 'Provider ID',
  '例如 openrouter': 'e.g. openrouter',
  'OpenAI 兼容接口': 'OpenAI-compatible API',
  '其他 OpenCode 供应商': 'Other OpenCode provider',
  'API 地址': 'API URL',
  '输入 API Key': 'Enter your API key',
  '密钥仅保存在安全凭据存储中。': 'Keys are stored only in SecretStorage.',
  '例如 deepseek-chat': 'e.g. deepseek-chat',
  '支持从供应商读取模型列表，也可填写实际模型 ID。':
    'Fetch available models or enter an actual model ID.',
  保存生成模型: 'Save generation model',
  读取模型列表: 'Fetch models',
  '工作流在 Dify 中执行时使用，由 Dify 管理认证和用量。':
    'Used when a workflow runs in Dify. Dify manages its credentials and usage.',
  默认模型: 'Default model',
  '让 Agent 根据需求选择': 'Let the agent choose',
  '列表来自连接的 Dify 实例，与上方生成模型分别配置。':
    'Models come from your Dify instance and are separate from the generation model.',
  保存运行模型偏好: 'Save runtime preference',
  '控制单次任务的自动修复、运行时间和调用预算。':
    'Limit repair attempts, runtime, and token usage.',
  最大修复轮次: 'Maximum repair rounds',
  '单次运行时限（分钟）': 'Run timeout (minutes)',
  '生成模型 Token 预算': 'Generation token budget',
  'Dify 执行 Token 预算': 'Dify execution token budget',
  '启动 VS Code 时显示右侧任务面板': 'Show the chat panel when VS Code starts',
  高级设置: 'Advanced settings',
  'OpenCode 路径（可选）': 'OpenCode path (optional)',
  默认使用插件内置版本: 'Use the bundled runtime by default',
  保存执行限制: 'Save execution limits',
  新对话: 'New conversation',
  打开设置: 'Open settings',
  '用对话构建 Dify': 'Build Dify workflows with an agent',
  '描述你的目标，Agent 会发现可用工具，':
    'Describe your goal. The agent discovers available tools,',
  '编排、测试并持续改进工作流。': 'builds the workflow, tests it, and iterates.',
  '配置 Dify 和生成模型': 'Configure Dify and a generation model',
  构建客服助手: 'Build a support assistant',
  编排业务工具: 'Connect business tools',
  '构建一个客服 Chatflow：信息不足时先追问，再查询知识库和已有工具，回答要提供依据。':
    'Build a support Chatflow: ask for missing information, query the knowledge base and existing tools, and cite evidence in the answer.',
  '根据输入查询两个已有业务工具，汇总结果，生成一个带条件分支的 Workflow。':
    'Build a Workflow that queries two existing business tools, combines their results, and uses a conditional branch.',
  对话记录: 'Conversation',
  'Agent 正在准备…': 'Preparing the agent…',
  恢复任务: 'Resume task',
  任务选项: 'Task options',
  关闭任务选项: 'Close task options',
  '首次发送时固定任务目标；后续通过对话补充修改要求。':
    'The first message sets the task target. Send later messages to request changes.',
  应用名称: 'Application name',
  默认使用项目目录名: 'Defaults to the project folder name',
  任务来源: 'Task source',
  新建应用: 'New application',
  改进已有应用: 'Improve an existing application',
  '已有 Dify 应用': 'Existing Dify application',
  请读取应用列表: 'Fetch applications first',
  读取应用列表: 'Fetch applications',
  '修改先在测试副本进行，更新原应用时确认。':
    'Changes run on a test copy. Updating the original requires confirmation.',
  '验收要求（可选）': 'Acceptance criteria (optional)',
  '例如：回答包含依据，不同会话互不串扰。': 'For example: cite evidence and isolate conversations.',
  '允许在已认可的测试范围内调用业务工具、HTTP 和代码节点':
    'Allow business tools, HTTP, and code nodes within your approved test scope',
  '这些调用可能改变外部业务数据。': 'These calls may change external business data.',
  消息: 'Message',
  '描述你想构建的工作流…': 'Describe the workflow you want to build…',
  应用与验收要求: 'Application and acceptance criteria',
  应用类型: 'Application type',
  配置生成模型: 'Configure generation model',
  选择模型: 'Choose model',
  '发送（Enter）；Shift+Enter 换行': 'Send (Enter); Shift+Enter for a new line',
  发送消息: 'Send message',
  停止任务: 'Stop task',
  选择项目目录: 'Select project folder',
  打开目录: 'Open folder',
  'Dify 未连接': 'Dify not connected',
  限定工具权限: 'Restricted tool permissions',
  '处理中…': 'Working…',
  已保存: 'Saved',
  '密码已保存，留空可以保留。': 'Password saved. Leave blank to keep it.',
  '已保存密码，留空可继续使用；填写新值会替换。':
    'Password saved. Leave blank to keep it, or enter a replacement.',
  '已保存密钥，同一供应商与地址留空可保留。':
    'Key saved. Leave blank to keep it for the same provider and URL.',
  信息完整: 'Complete',
  当前空间: 'Current workspace',
  操作完成: 'Done',
  '生成模型已保存。': 'Generation model saved.',
  '运行模型偏好已保存。': 'Runtime preference saved.',
  '执行限制已保存。': 'Execution limits saved.',
  你: 'You',
  需要处理: 'Action needed',
  '✓ 测试通过': '✓ Tests passed',
  '✧ Dify Agent': '✧ Dify Agent',
  '查看 DSL': 'View DSL',
  测试报告: 'Test report',
  查看差异: 'View changes',
  更新原应用: 'Update original application',
  查找可用工具: 'Find available tools',
  读取工具定义: 'Read tool definition',
  读取项目: 'Read project',
  '同步 Dify 能力': 'Sync Dify capabilities',
  保存工作流: 'Save workflow',
  建立测试基线: 'Create test baseline',
  校验工作流: 'Validate workflow',
  导入测试应用: 'Import test application',
  运行测试: 'Run tests',
  发布测试应用: 'Publish test application',
  等待: 'Pending',
  调用中: 'Running',
  完成: 'Completed',
  失败: 'Failed',
  '继续补充要求或提出修改…': 'Add requirements or request changes…',
  在设置页更换: 'Change in settings',
  'Dify 已配置': 'Dify configured',
  已授权测试范围: 'Approved test scope',
  '打开一个项目目录，开始构建。': 'Open a project folder to get started.',
  '目录处于受限模式，信任后可运行 Agent。':
    'This folder is in Restricted Mode. Trust it before running the agent.',
  '在设置页连接 Dify 并配置生成模型。':
    'Connect Dify and configure a generation model in Settings.',
  '当前任务目标和验收基线已固定。修改要求请直接发送消息；更换目标请新建对话。':
    'The target and test baseline are fixed. Send a message to request changes, or start a new conversation for a different target.',
  '任务已停止，可补充要求或恢复': 'Task stopped. Add requirements or resume.',
  'Agent 正在生成…': 'The agent is generating…',
  '校验 DSL…': 'Validating DSL…',
  '导入测试应用…': 'Importing test application…',
  '运行测试…': 'Running tests…',
  'Agent 正在修复…': 'The agent is repairing…',
  '发布测试应用…': 'Publishing test application…',
  请选择应用: 'Select an application',
  正在生成: 'Generating',
  正在校验: 'Validating',
  正在导入: 'Importing',
  正在测试: 'Testing',
  正在修复: 'Repairing',
  正在发布: 'Publishing',
  已完成: 'Completed',
  执行失败: 'Failed',
  已停止: 'Stopped',
  '候选工作流通过验收，测试应用已发布。你可以查看 DSL 和测试报告，或继续发送修改要求。':
    'The candidate passed its acceptance tests and the test application was published. View the DSL and test report, or send another change request.',
  '当前任务或设置正在处理中，请稍后再操作。':
    'A task or settings change is in progress. Try again when it finishes.',
  '请先信任工作区，才能连接 Dify 并运行 Agent':
    'Trust the workspace before connecting Dify or running the agent.',
  请先选择一个项目目录: 'Select a project folder first.',
  '请先在设置页连接 Dify': 'Connect Dify in Settings first.',
  请先信任当前工作区: 'Trust the current workspace first.',
  请填写登录密码: 'Enter your login password.',
  账号没有可用工作空间: 'This account has no available workspaces.',
  '请先连接 Dify': 'Connect Dify first.',
  工作空间不属于当前登录账号: 'The workspace does not belong to the signed-in account.',
  '请填写该供应商与地址对应的 API Key': 'Enter the API key for this provider and URL.',
  '该供应商请填写实际模型 ID；自动列表用于提供模型目录的 API。':
    'Enter an actual model ID for this provider. Model discovery requires an API with a model catalog.',
  '该模型不在当前 Dify 的可用目录中，请刷新能力':
    'This model is not in the available Dify catalog. Refresh capabilities.',
  请先在设置页配置生成模型: 'Configure a generation model in Settings first.',
  '缺少模型 Key，请在设置页重新配置': 'The model key is missing. Configure it again in Settings.',
  '当前连接与任务目标不一致，请核对设置后重新保存任务。':
    'The connection does not match the task target. Check Settings and save the task again.',
  当前应用类型不支持自动改造: 'This application type cannot be modified automatically.',
  '应用类型与远端不一致，请重新选择应用':
    'The application type differs from the remote target. Select the application again.',
  '请输入有效且不含凭据的 HTTP(S) 地址': 'Enter a valid HTTP(S) URL without embedded credentials.',
  请输入有效的登录邮箱: 'Enter a valid login email.',
  '供应商 ID 格式不正确': 'Invalid provider ID.',
  '请选择或填写模型 ID': 'Select or enter a model ID.',
  请填写项目名称: 'Enter a project name.',
  请描述你希望完成的任务: 'Describe the task you want to accomplish.',
  '请选择要改进的 Dify 应用': 'Select the Dify application to improve.',
  '操作仍未返回结果，请核对执行状态后重试。':
    'The operation has not returned a result. Check its state before retrying.',
  页面类型不匹配: 'Page type mismatch.',
  未知操作: 'Unknown operation.',
  'Dify 测试应用已发布': 'Dify test application published',
  打开应用: 'Open application',
  已请求停止任务: 'Task cancellation requested',
  原应用更新完成: 'Original application updated',
  '打开 Dify 项目目录': 'Open Dify project folder',
  '上次 Dify 测试结果未知，可能已产生外部业务写入。请先核对 Dify 日志、测试数据和业务状态，再允许重新测试。':
    'The previous Dify test result is unknown and may have changed business data. Check Dify logs, test data, and external state before allowing another test.',
  '已核对，允许继续测试': 'Checked; allow further testing',
};
export function translate(text: string, locale: Locale): string {
  if (locale === 'zh-CN') return text;
  if (Object.hasOwn(englishMessages, text)) return englishMessages[text]!;
  const round = text.match(
    /^(正在生成|正在校验|正在导入|正在测试|正在修复|正在发布|已完成|执行失败|已停止|需要处理) · 第 (\d+) 轮(.*)$/,
  );
  if (round)
    return `${englishMessages[round[1]!] ?? round[1]} · Round ${round[2]}${round[3]?.replace('生成 ', 'Generation ').replace(' / Dify ', ' / Dify ') ?? ''}`;
  const models = text.match(/^已读取 (\d+) 个模型，可在生成模型输入框中选择。$/);
  if (models) return `Found ${models[1]} models. Select one in the generation model field.`;
  const selected = text.match(/^已选应用 · (.+)$/);
  if (selected) return `Selected application · ${selected[1]}`;
  const tools = text.match(/^(\d+) 个工具( · 待处理)?$/);
  if (tools) return `${tools[1]} tools${tools[2] ? ' · Action needed' : ''}`;
  return text;
}
export function translateMarkup(markup: string, locale: Locale): string {
  if (locale === 'zh-CN') return markup;
  for (const [source, target] of Object.entries(englishMessages).sort(
    (a, b) => b[0].length - a[0].length,
  ))
    markup = markup
      .split(source)
      .join(
        target
          .replaceAll('&', '&amp;')
          .replaceAll('"', '&quot;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;'),
      );
  return markup;
}
