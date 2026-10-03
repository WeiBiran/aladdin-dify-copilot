# Contributing

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md)

This is a Beta. Issues and pull requests are welcome in English or Chinese. Fork the repository, create a branch, and describe the problem, behavior change, and evidence. **Use English commit messages.**

```sh
npm ci
npm run check
node scripts/stage-runtime.mjs
npm run test:engine
npm start -- --no-open --port 0
npm run package
npm run test:package
```

Run `npm run format` before submitting. Compile again afterwards and include `dist/cli.mjs`, `dist/browser.js`, and `dist/webview.js` in the commit: GitHub `npx` runs those files. CI checks that they match the source. Avoid `build`, `prepare`, `prepack`, and install lifecycle script names; npm would then prepare Git dependencies with development packages. The explicit compiler command is `npm run compile`.

The package test installs a tarball in a temporary directory with install scripts disabled, verifies authenticated pages/API and runtime discovery, then stops the service. Native-engine tests use real OpenCode/SDK/MCP with local model fixtures. Mocked Dify tests never establish live compatibility. Inspect each macOS/Windows/Linux CI result.

For a Dify adapter, provide primary upstream sources for the exact version, redacted fixtures, and actual import/run/publication evidence. Keep differences in the adapter layer. Preserve real tool identities, complete parameters, unknown outputs, frozen tests, credential boundaries, conflict checks, and reconciliation of ambiguous writes. OpenCode owns general planning/context; do not duplicate that planner in the host.

Keep both languages and paired documentation aligned. `humanizer-zh` is an optional writing aid, not a product dependency. Preserve factual limits when editing Chinese prose. Remove credentials, internal URLs, customer data, and private reports before submitting. The project uses MIT; retain license notices for dependencies. npm registry publication and production business certification are separate from this GitHub Beta.
