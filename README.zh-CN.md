# Aladdin Dify

[English](README.md) | [简体中文](README.zh-CN.md)

**未必然的 Dify FDE 交付工具。** 从业务需求出发，让 OpenCode Agent 构建 Workflow 或 Chatflow，再按固定测试基线验证候选版本。用 npm 在本机启动，在浏览器里使用。

**Beta · 0.5.0-beta.2。** 遇到问题欢迎[提 Issue](https://github.com/WeiBiran/aladdin-dify-copilot/issues/new/choose)，也可以 Fork 后提交 PR。真实业务验收仍未完成，使用前请看[验证状态](docs/compatibility.zh-CN.md)。

## 一条命令启动

安装 [Node.js 22 及以上版本](https://nodejs.org/en/download)，在业务项目目录中运行：

```sh
npx --yes github:WeiBiran/aladdin-dify-copilot
```

首次运行会安装依赖，包括官方 OpenCode 运行时。命令启动一个只监听 `127.0.0.1` 的本地服务，并自动在浏览器里打开专属启动链接。使用时保持终端运行；按 **Ctrl+C** 停止服务并取消正在执行的任务。配置在网页中完成，不需要 VS Code、Electron、Docker、全局 OpenCode 命令或 npm 发布账号。

指定项目和固定版本：

```sh
npx --yes github:WeiBiran/aladdin-dify-copilot#v0.5.0-beta.2 ./customer-project
```

命令中的目录需要已经存在，也可以在网页的目录选择器里创建并选择项目。`--port 0` 自动选择空闲端口，`--no-open` 只打印链接，`--help` 查看全部参数。默认端口为 `8787`，被占用时请换一个端口。

本版通过 GitHub 分发，**没有发布到 npm 仓库**，因此暂时不能使用 `npx aladdin-dify`。仓库附带编译好的启动文件，用户安装时不用自己构建。[Beta Release](https://github.com/WeiBiran/aladdin-dify-copilot/releases/tag/v0.5.0-beta.2) 提供 npm 安装包、源码压缩包和 SHA-256 校验文件。

## 我们要解决什么问题

FDE（Forward Deployed Engineer）需要把客户需求变成能演示、能测试、能交付的工作流。客户环境中的工具是否存在、参数是否正确、执行结果是否符合约定，都需要实际验证。一张看起来合理的流程图不能证明这些事情。

Aladdin Dify 会读取当前账号在 Dify 工作空间里可见的工具、模型和知识库。OpenCode 按需读取定义，生成 Dify 原生 DSL，再根据测试失败的证据修改候选版本。应用负责固定测试基线、限制执行、控制导入和发布；需求、DSL 和测试保留为普通项目文件。

我们希望缩短从需求到**已验证候选版本**的过程，并保留可供审查的交付证据。当前 Beta 没有经过效率量化验证，也不宣称已经达到生产可用标准。

## 在网页里完成配置

点击 Chat 页面上的齿轮进入设置。界面默认跟随浏览器语言，也可以选择英文或简体中文。

1. **Dify 连接：**填写根地址或 Console API 地址、实际受支持的版本、邮箱和密码，点击“连接并同步”。账号有多个工作空间时选择一个。应用的 Service API Key 不能替代控制台登录。
2. **生成模型：**选择 DeepSeek、OpenAI、OpenAI 兼容接口或其他 OpenCode 供应商，填写需要的 API 地址、Key 和真实模型 ID。供应商提供模型目录时，可以点击读取。
3. **工作流运行模型：**选择 Dify 已配置的模型，也可以让 Agent 自行选择。它与上面的生成模型分别配置。
4. **执行限制：**设置修复轮次、超时、生成模型和 Dify 的独立 Token 预算。默认最多修复五轮，限时 30 分钟，两类预算各 100,000 Token。

密码、Key、Cookie 和 Token 通过 `@napi-rs/keyring` 保存在系统凭据存储中：macOS 使用钥匙串，Windows 使用凭据管理器；Linux 需要可用的 Secret Service 或内核 keyring，后者可能在退出登录或重启后丢失。存储不可用时会报错，不退回明文保存。切换语言会重载页面，请先切换语言再填写尚未保存的凭据。

版本适配器面向 **Dify 1.14.2 / DSL 0.6.0** 和 **1.17.1 / DSL 0.7.0**。其他版本和仅支持 SSO 的部署需要新增适配器。版本由用户明确选择，不承诺自动识别所有部署。

## 构建、测试和交付

主页面是 Chat：中间显示对话和工具调用，底部输入需求，旁边选择应用类型、模型和任务选项。

1. 选择 **Workflow** 或 **Chatflow**，通过目录按钮切换业务项目。
2. 点击 **＋／任务选项**，填写应用名称、验收要求，或选择一个已有应用来改进。
3. 明确允许业务工具、HTTP 请求和代码节点执行的测试范围。Dify 测试副本不能隔离外部业务系统中的写操作。
4. 输入需求并按 **Enter** 发送，**Shift+Enter** 换行。可以查看回复、真实工具调用、校验、测试与修复过程，点击停止按钮取消任务。
5. 查看生成的 DSL 和测试报告。新建测试应用通过检查后自动发布；更新已有原应用前，需要查看差异和报告并确认目标，远端冲突会阻止覆盖。

示例需求：

> 做一个售后 Chatflow。用户没有提供产品型号时先追问；使用已有知识库和业务工具排查故障，回答中给出依据。不同测试对话不能共享上下文。

Agent 会发现内置／插件工具、自定义 API 工具、工作流工具和 Dify 已接入的 MCP 工具，再读取选中工具的完整定义。真实提供方和工具标识、必填参数都会保留；未知输出不会被编造成确定字段。用户不用重新登记所有 MCP，也不用手动复制工具说明。

测试支持字段、JSON 结构、类型、范围、格式、节点／分支和多轮结果断言。每个 Chatflow 用例使用独立对话。首次测试基线固定后，修复不能通过删除失败用例或降低要求来宣布通过。继续对话沿用基线、目标和测试应用；新对话会归档旧记录，暂时没有历史浏览页面。

**本版尚未实现 LLM-as-judge 语义评分。** Agent 分析失败并提出修复，验收门槛使用确定性断言。重复错误、凭据缺失、预算限制和结果未知的写操作会停止自动推进，不会显示模拟成功。

## 本地文件与隐私

```text
customer-project/
  dify.project.json  # 目标、应用类型、原应用与测试应用引用
  requirements.md   # 根据输入自动生成，不需要手工配置 Markdown
  workflow.yml      # Dify 原生 DSL
  tests.json        # 固定测试基线
```

设置、聊天记录、能力缓存、报告、原始运行记录、备份和部署记录保存在 `~/.aladdin-dify`，与项目分开。`--data-dir` 可以指定其他位置，同时使用独立的凭据命名空间。报告可能含业务输出，分享前需要脱敏。公开界面状态、DSL 和普通日志不包含凭据。

本地网页先用短时、一次性的启动链接建立 HttpOnly／SameSite 会话，服务校验 Host 和写请求的来源，只提供规定的操作，不开放任意终端命令。请保管终端打印的链接。服务只监听本机回环地址，不对局域网开放。

发布绑定已测试的 DSL、能力和测试摘要。文件或依赖变化后需要重新验证；网络中断的写操作先核对结果，不盲目重放。测试副本的秘密环境变量可能需要在 Dify 中另行配置，无法安全合并的秘密节点配置会阻止更新原应用。外部写操作不支持跨系统回滚。

## 已经验证了什么

本地检查覆盖了真实 HTTP 服务、浏览器 Chat／设置页面、中英文切换、目录选择、macOS 原生钥匙串存取、安装后的 npm 包启动，以及真实 OpenCode／SDK／MCP 通信。模型响应使用确定性夹具，没有调用真实 DeepSeek 账号。

此前在真实 Dify 1.14.2 实例中，通过浏览器验证过工具发现和最小 Workflow／Chatflow 的导入、运行、发布。**新的浏览器应用尚未使用已配置凭据完成真实 Dify 业务闭环。** Dify 1.17.1 仅有源码契约和模拟接口测试。每种节点仍需要在目标版本导入并运行的证据。详见[兼容矩阵](docs/compatibility.zh-CN.md)、[业务验收](docs/acceptance.md)和当前提交的 [CI 结果](https://github.com/WeiBiran/aladdin-dify-copilot/actions)。

暂不包含 Dify Cloud、独立 Agent 应用类型、SSO、人工审批／触发器节点、语义评分和其他 Agent 引擎。本版替换了此前的 VS Code 界面，不提供 VSIX 或原生桌面安装包。

## 开发

```sh
git clone https://github.com/WeiBiran/aladdin-dify-copilot.git
cd aladdin-dify-copilot
npm ci
npm run check
node scripts/stage-runtime.mjs
npm run test:engine
npm start -- --no-open --port 0
npm run package
npm run test:package
```

`npm test` 使用模拟 Dify 接口和真实本地 HTTP 服务。`test:engine` 启动固定版本的原生运行时，通过真实 SDK／MCP 与本地模型夹具通信。`test:package` 把安装包放进独立目录，禁用安装脚本后验证启动、静态文件和 API。改源码后运行 `npm run compile`；推送时包含 `dist/` 的三个编译文件，保证 GitHub `npx` 可以直接运行。CI 覆盖 macOS、Windows 和 Linux，请以实际结果为准。

参见[架构](docs/architecture.zh-CN.md)、[贡献指南](CONTRIBUTING.zh-CN.md)和[更新记录](CHANGELOG.zh-CN.md)。项目采用 [MIT](LICENSE)，保留[依赖许可](THIRD_PARTY_NOTICES.md)。

## 反馈与贡献

当前为 Beta，欢迎[提 Issue](https://github.com/WeiBiran/aladdin-dify-copilot/issues/new/choose)。请提供应用版本、Node 版本、系统与架构、Dify 版本、复现步骤和脱敏错误。中英文都可以，不要附上凭据、内部地址、客户数据或原始私有日志。也欢迎 Fork 后按自己的环境修改，并提交带测试和真实验证说明的 PR。
