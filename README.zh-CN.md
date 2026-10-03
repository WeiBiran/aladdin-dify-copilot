# Aladdin Dify Copilot

[English](README.md) | [简体中文](README.zh-CN.md)

**未必然的 FDE 交付工具。** 在 VS Code 中描述业务需求，让 Agent 构建 Dify Workflow 或 Chatflow，再按固定验收用例测试、修复和交付。

**当前为 Beta 版，版本 0.3.1。** 接口、节点和交付流程仍在验证。接入前请查看[兼容与验证状态](docs/compatibility.zh-CN.md)。遇到问题可以[提 Issue](https://github.com/WeiBiran/aladdin-dify-copilot/issues)，也欢迎 Fork 后提交 Pull Request。

[下载 Beta 安装包](https://github.com/WeiBiran/aladdin-dify-copilot/releases/tag/v0.3.1-beta.1) · [安装与使用](#安装与使用) · [贡献指南](CONTRIBUTING.zh-CN.md)

## 要解决的问题

FDE（Forward Deployed Engineer）需要把客户需求变成可以演示、验证和交付的工作流。画好流程之后，还要确认客户环境里有哪些工具、参数怎么传，以及实际执行结果是否满足约定的验收条件。

这个插件把这些工作放到同一个项目里。连接已有 Dify 后，它同步当前账号可见的工具、模型和知识库。OpenCode Agent 按任务读取相关定义，生成 Dify 原生 DSL；插件固定测试基线、导入测试应用，并把失败证据交回同一 Agent 会话修复。

项目希望缩短从业务需求到**通过验证的候选工作流**的过程，同时保留 DSL、测试用例和交付记录，方便复核。当前 Beta 没有交付速度的量化结论，也不声称已经达到生产可用标准。

## 当前能做什么

- **看见真实环境。** 同步内置及插件工具、自定义 API 工具、工作流工具、MCP 工具，以及模型和知识库。Agent 为选中的工具读取完整参数，不靠显示名称猜 ID 或调用方式。
- **通过对话构建。** 在右侧聊天面板选择 Workflow 或 Chatflow，输入需求，查看 Agent 回复、工具调用、校验、测试和修复过程。
- **评测并迭代。** 固定验收用例，执行 Workflow 输入样例或独立的 Chatflow 多轮会话，检查断言，再把失败证据交给 Agent。默认最多修复五轮。
- **交付经过测试的候选。** 新建任务使用专用测试应用，通过门槛后发布。改进已有应用时先改测试副本，更新原应用前展示差异、请求确认并检查冲突。
- **保留项目文件。** 需求、DSL 和测试保存在普通文件中。凭据、聊天记录、能力缓存和原始运行记录保存在插件私有存储中。
- **支持中英文。** 界面默认跟随 VS Code，也可以在设置页选择 English 或简体中文。两份 README 说明同一版本的能力和限制。

当前评测使用确定性断言，检查字段、结构、值、格式、节点和多轮结果，再由 Agent 分析失败并修复。**Beta 尚未实现模型语义评分或 LLM-as-judge。**

## 安装与使用

### 1. 安装插件

需要 **VS Code 1.106+**、已有的自部署 Dify、具备应用编辑和工具读取权限的控制台账号，以及支持工具调用的生成模型。

1. 打开 [Beta Release](https://github.com/WeiBiran/aladdin-dify-copilot/releases/tag/v0.3.1-beta.1)，下载与操作系统和 CPU 架构匹配的 VSIX。
2. 在 VS Code 扩展面板打开 **… → Install from VSIX…**，选择安装包。
3. 升级后重新加载 VS Code 窗口。

首个经过本机验证的安装包适用于 **macOS Apple Silicon（`darwin-arm64`）**。其他平台的包在对应 CI 构建通过后提供；构建成功不能代替真实 Dify 验收。安装包内置官方 OpenCode **1.18.34**，不要求安装全局 CLI，也不需要启动 Docker。

### 2. 配置开发环境

从命令面板打开 **Dify: 打开设置**。插件首次启动也会打开设置页。

- **界面语言：** 自动、English 或简体中文。切换时插件页面会重新加载，尚未保存的凭据应在切换后填写。
- **Dify 连接：** 填写实例根地址或 Console API 地址、实际版本、登录邮箱和密码，点击“连接并同步”。账号有多个工作空间时，选择目标空间。
- **生成模型：** 选择 DeepSeek、OpenAI、OpenAI 兼容接口或其他 OpenCode 供应商，填写对应地址、API Key 和实际模型 ID。供应商提供目录接口时，可以读取模型列表。
- **工作流运行模型：** 从 Dify 可用目录中选择，或让 Agent 按任务选择。它与插件使用的生成模型分别配置。
- **执行限制：** 设置修复轮次、运行时限、生成 Token 预算和 Dify 执行 Token 预算。

Beta 实现了 **Dify 1.14.2 / DSL 0.6.0** 和 **1.17.1 / DSL 0.7.0** 的控制台邮箱、密码登录接口。应用 Service API Key 不能代替控制台认证。仅 SSO 的部署和其他版本需要新增适配器。

### 3. 开始交付任务

创建一个业务项目目录，在 VS Code 中打开。连接 Dify 或运行 Agent 前，需要信任该目录；受限模式下仍可查看设置和聊天面板。

打开右侧 **Dify Copilot** 标签。面板隐藏时，点击底部 **Dify**，或运行 **Dify: 打开右侧任务面板（聊天）**。VS Code 自带 Chat 是另一个标签。

1. 在输入框旁选择 Workflow 或 Chatflow。
2. 打开 **＋／任务选项**，设置应用名称、验收要求，或选择需要改进的已有应用。
3. 决定是否允许在认可的测试范围内调用业务工具、HTTP 和代码节点。测试副本只隔离 Dify 应用定义，不能隔离外部业务系统的写入。
4. 输入需求，按 Enter 发送；Shift+Enter 换行。
5. 在对话中查看回复、工具调用和测试证据。输入框旁的停止按钮可以取消任务，停止后可以恢复，或继续发送修改要求。
6. 通过验收后查看 DSL 和测试报告。新建应用自动发布测试版本；更新原应用前需要查看差异与报告，再确认。

需求示例：

> 构建一个客服 Chatflow。缺少产品型号时先追问，再通过已有知识库和业务工具排查故障，回答要提供依据。不同测试会话不能共享上下文。

第一条消息固定目标和验收基线，后续修改沿用同一测试应用。新对话可以设置其他目标，并归档上一段对话，不删除项目文件。当前还没有历史会话列表。

## 项目文件与交付记录

```text
业务项目/
  dify.project.json  # 应用类型、连接引用、原应用和测试应用引用
  requirements.md    # 根据聊天需求生成，无需手工编写配置
  workflow.yml       # Dify 原生 DSL
  tests.json         # 固定验收用例
```

密码、Key、Cookie 和 Token 使用 VS Code SecretStorage。聊天记录、能力目录、测试报告、原始运行结果、备份和发布记录存放于插件私有目录，不进入业务项目。报告可能包含业务输出，分享前应检查并脱敏。

发布绑定已测试的 DSL、测试基线和已用能力。发生变化后需要重新验收。网络中断后的未知写入保留待核对状态，不直接重试。已有应用的秘密环境变量可能需要在测试副本中重新配置；包含节点秘密配置的原应用暂不能安全自动合并，插件会阻止覆盖。

## Beta 范围与验证状态

| 部分               | 当前证据                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| 聊天与设置         | 真实 VS Code 宿主检查：激活、右侧面板、需求保存、语言切换、SecretStorage 和跨地址密钥隔离                    |
| OpenCode、SDK、MCP | macOS ARM64 原生运行时及工具通信；模型响应使用本地夹具                                                       |
| Dify 1.14.2        | 浏览器实际能力读取、最小 Workflow／Chatflow 导入、运行和发布；插件 HTTP 接入和完整业务任务仍待配置凭据后验证 |
| Dify 1.17.1        | 固定版本源码契约和模拟测试，未完成真实实例验收                                                               |
| Windows／Linux     | 原生构建和引擎 CI 矩阵；本次结果以 CI 与 Release 文件为准                                                    |

每类节点都需要在目标版本中留下导入和运行证据。YAML 能解析、夹具能通过，都不能代替业务验证。后续工作见[兼容矩阵](docs/compatibility.zh-CN.md)和[验收清单](docs/acceptance.zh-CN.md)。

尚未交付：Dify Cloud、独立 Agent 应用、SSO、人工审批和触发器节点、语义评分、其他 Agent 引擎，以及插件商店上架。外部业务写入没有跨系统回滚机制。

## 开发

需要 Node.js 22+ 和 npm：

```sh
git clone https://github.com/WeiBiran/aladdin-dify-copilot.git
cd aladdin-dify-copilot
npm ci
npm run check
node scripts/stage-runtime.mjs
npm run test:engine
npm run package
```

在仓库里按 F5 启动 Extension Development Host，再打开业务目录。`npm run package` 为当前平台生成 VSIX。`npm run test:host` 使用独立临时 VS Code 配置，也可通过 `DIFY_VSIX` 指向打包后的安装包。

`npm test` 使用模拟 Dify 接口。`npm run test:engine` 执行原生 OpenCode 和真实 SDK／MCP 通信，模型来自本地夹具，不会调用真实 DeepSeek 账号。真实 Dify 验收需要按清单在获准的环境中执行。

详见[架构](docs/architecture.zh-CN.md)、[贡献指南](CONTRIBUTING.zh-CN.md)和[更新记录](CHANGELOG.md)。项目采用 [MIT](LICENSE)，依赖许可保留在[第三方声明](THIRD_PARTY_NOTICES.md)中。

## 反馈与贡献

这是 Beta 版。遇到问题，请[提交 Issue](https://github.com/WeiBiran/aladdin-dify-copilot/issues/new/choose)，提供插件版本、系统和架构、Dify 版本、复现步骤及脱敏错误。中英文都可以。不要上传密钥、密码、Cookie、内部地址或客户数据。

欢迎 Fork 后按自己的环境修改，也欢迎带测试和实际验证说明的 Pull Request。
