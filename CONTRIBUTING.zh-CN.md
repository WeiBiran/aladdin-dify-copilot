# 贡献指南

[English](CONTRIBUTING.md) · [简体中文](CONTRIBUTING.zh-CN.md)

当前为 Beta。欢迎用中文或英文提 Issue，也可以 Fork 后提交 PR；提交信息使用英文。

运行 `npm ci`、`npm run check`、`node scripts/stage-runtime.mjs` 和 `npm run test:engine`。提交前执行 `npm run format`。CI 在 macOS ARM64、Windows x64 和 Linux x64 构建运行时包。

新增 Dify 版本时，建立版本适配器，核对认证、工具与模型响应、导入状态、草稿运行 SSE、发布和节点默认配置。使用脱敏夹具覆盖接口变化，并按 `docs/acceptance.md` 保留真实运行证据；仅夹具通过时在兼容矩阵写“待验证”。

新增 Agent 引擎实现 `AgentEngine`；监督器与 Dify 业务工具无需迁移。不要把通用规划、模型上下文压缩或修复规划重新写入宿主。

保持真实工具身份和参数；不要按显示名称匹配，不要把 Dify 业务工具凭据交给生成模型。未知写操作结果需要核对，不能以重试掩盖。变更测试基线需显式新建任务。

提交问题或 PR 前脱敏。项目采用 MIT，新增依赖必须保留许可声明。Marketplace 上架不在此次 Beta 交付范围。
