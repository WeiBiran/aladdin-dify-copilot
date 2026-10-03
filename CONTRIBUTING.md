# Contributing

[English](CONTRIBUTING.md) · [简体中文](CONTRIBUTING.zh-CN.md)

This is a Beta. [Issues](https://github.com/WeiBiran/aladdin-dify-copilot/issues) and pull requests are welcome in English or Chinese. Fork the repository, create a branch, and describe the problem, behavior change, and evidence. Use English commit messages.

```sh
npm ci
npm run check
node scripts/stage-runtime.mjs
npm run test:engine
npm run package
```

Run `npm run format` before submitting. GitHub Actions builds and tests native runtimes on macOS, Windows, and Linux; inspect each platform result rather than assuming the matrix passed. On macOS with VS Code installed, `npm run test:host` checks actual webview initialization. Use `DIFY_VSIX` to test an installed package.

For a new Dify adapter, provide upstream sources for the exact version, redacted fixtures, and live import/run/publication reports. Mocked tests never establish live compatibility. Keep version differences in `src/dify/versions.ts` and the adapter layer, not in UI or agent prompts.

Preserve real tool identities and parameters. Do not match display names or expose business-tool credentials to the generation model. Reconcile ambiguous writes instead of replaying them. A changed test baseline requires a new task. OpenCode owns general planning and context; do not duplicate those systems in the host.

Keep both interface languages and paired documentation aligned. Use `humanizer-zh` as an optional writing aid, not a runtime dependency. Preserve factual limits and verification status when editing Chinese prose.

Remove credentials, internal URLs, customer data, and raw private reports before submitting. The project uses MIT; retain license notices for new dependencies. Marketplace publication is outside this Beta release.
