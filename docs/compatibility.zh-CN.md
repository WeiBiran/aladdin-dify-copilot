# 兼容与验证状态

[English](compatibility.md) | [简体中文](compatibility.zh-CN.md)

当前 Beta 区分真实验证和夹具测试，一个接口通过不代表其他接口已经通过。

| 组件                   | 版本／平台                         | 证据与限制                                                                                                                                                               |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 浏览器应用             | 0.5.0-beta.2，macOS ARM64，Node 22 | 真实带认证 HTTP 服务、Chat／设置、中英文切换、目录选择；尚未配置凭据完成真实 Dify 业务闭环                                                                               |
| npm 安装包             | GitHub 分发                        | 禁用安装脚本后的独立安装、运行时定位、静态文件与公开 API；发布入口另从 GitHub 验证                                                                                       |
| 凭据存储               | macOS 钥匙串                       | 原生写入／读取／删除测试；Windows／Linux 存储仍需本地验收                                                                                                                |
| OpenCode CLI／SDK      | 1.18.34                            | macOS ARM64、Windows x64、Linux x64 原生进程和真实 SDK／MCP，使用兼容接口／DeepSeek 本地模型夹具；没有真实模型账号调用证据                                               |
| Dify／DSL              | 1.14.2／0.6.0                      | 此前浏览器工具发现、最小 Workflow／Chatflow 导入、运行、发布；应用 HTTP 和业务验收待完成                                                                                 |
| Dify／DSL              | 1.17.1／0.7.0                      | 固定源码契约和模拟 Console API 测试；没有真实实例验收                                                                                                                    |
| Windows x64／Linux x64 | Node 22 CI 矩阵                    | npm 安装、带认证页面／API 和两项原生引擎夹具均已通过 [CI](https://github.com/WeiBiran/aladdin-dify-copilot/actions/runs/37117517654)；系统凭据存储和真实业务验收仍待完成 |

## 节点覆盖

模板包含 `start`、`end`、`answer`、`llm`、`tool`、`knowledge-retrieval`、`http-request`、`if-else`、`template-transform`、`code`、`assigner`、`variable-aggregator`、`iteration`、`iteration-start`、`loop`、`loop-start`、`loop-end`。

每种节点都需要在目标 Dify 版本真实导入并运行，才能标记为已验证。模板和 YAML 测试不能替代这些证据。独立 Agent 应用、人工审批和触发器不在本版范围内。已有应用遇到不支持的节点会保留内容并阻止自动修改。

缓存按项目真实路径、连接／账号、工作空间隔离。换实例后需要重新连接和同步。SSO、其他 Dify 版本、其他 CPU 架构和远端／局域网部署未验证。Linux 凭据持久性取决于原生后端，尚未实现 LLM-as-judge。

## 已记录的 Dify 浏览器检查

2026-10-03，一台自部署实例在账号菜单中显示版本 1.14.2。最小 start／end Workflow 执行成功，耗时 0.086 秒、0 Token。start／answer Chatflow 在同一对话中两轮返回预期文本，并完成发布。创建了专用测试应用，没有覆盖已有业务应用。

这些检查不能证明会话变量、追问、真实工具业务场景或全部节点兼容。浏览器和应用 HTTP 验收分别记录。[业务验收](acceptance.zh-CN.md)的五个案例仍待完成，私有报告不进入公开仓库。

上述三平台证据对应浏览器应用与引擎提交 `d570d86`；Beta.2 另修复了大事件背压问题，并增加回归测试。本地通过 55 项自动化测试和两项原生引擎夹具。
