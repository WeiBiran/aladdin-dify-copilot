# 贡献指南

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md)

当前为 Beta，欢迎中英文 Issue 和 PR。Fork 后创建分支，说明问题、行为变化和验证证据。**提交信息使用英文。**

```sh
npm ci
npm run check
node scripts/stage-runtime.mjs
npm run test:engine
npm start -- --no-open --port 0
npm run package
npm run test:package
```

提交前运行 `npm run format`，再重新编译，将 `dist/cli.mjs`、`dist/browser.js`、`dist/webview.js` 一起提交：GitHub `npx` 直接运行这些文件，CI 会检查它们与源码是否一致。不要添加 `build`、`prepare`、`prepack` 或安装生命周期脚本，否则 npm 会为 Git 依赖安装开发包。编译命令为 `npm run compile`。

安装包测试在临时目录禁用安装脚本后安装，验证带认证页面／API 和运行时定位，再停止服务。原生引擎测试使用真实 OpenCode／SDK／MCP 和本地模型夹具。模拟 Dify 通过不代表真实兼容，请逐项查看 macOS／Windows／Linux CI 结果。

新增 Dify 适配器时，需要准确版本的官方源码、脱敏夹具和真实导入／运行／发布证据。差异放在适配层，保留工具真实身份、完整参数、未知输出、固定测试、凭据边界、冲突检查和未知写操作核对。通用规划与上下文由 OpenCode 负责，不在应用中重复实现。

中英文界面和成对文档需要同步。`humanizer-zh` 仅为可选写作辅助，不是产品依赖；润色时保留事实限制。提交前删除凭据、内部地址、客户数据和私有报告。项目采用 MIT，新增依赖需要保留许可。npm 仓库发布和生产业务认证是独立工作，不因 GitHub Beta 发布而完成。
