# Changelog

[English](CHANGELOG.md) | [简体中文](CHANGELOG.zh-CN.md)

## 0.6.0-beta.1 — Agent workbench

- Add persistent agent projects, direct Workflow/Chatflow creation, sidebar switching, and separate unsent drafts.
- Move connection and model settings to a dialog opened from the upper-right corner. Use provider-backed model dropdowns and an explicit custom-ID option.
- Add a resizable Dify preview with Manage, Run, DSL, and Tests tabs. Preview the current test app, keep published/runtime and draft views distinct, and preserve external navigation when embedding is unavailable.
- Scope remote frames through an authenticated wrapper, retain browser-owned Dify login, and reject stale project previews. Do not proxy credentials or strip remote security headers.
- Add project, model-catalog, link-discovery, framing, and localization regression coverage. Live business and production embedding acceptance remain pending.

## 0.5.0-beta.2 — Streaming fix

- Keep the event stream open when a large DSL preview or chat snapshot temporarily fills the HTTP buffer. Disconnect only when a slow client accumulates over 4 MB of buffered data.
- Add a 200 KB preview/report regression test so the following review remains available on the same stream.
- Retain beta.1 as a historical tag; GitHub startup and download instructions now point to beta.2.

## 0.5.0-beta.1 — Browser application

- Replace the VS Code host with an npm CLI and browser Chat/Settings interface.
- Run directly with `npx --yes github:WeiBiran/aladdin-dify-copilot`; include compiled launch files and install the official OpenCode 1.18.34 runtime through dependencies.
- Add authenticated loopback HTTP/SSE, a one-use launch ticket, host/origin validation, browser folder selection, file comparison, reports, and confirmation dialogs.
- Store credentials in the native OS keyring; retain private settings, journals, capability caches, and run evidence outside project files.
- Reuse the Dify adapters, real tool discovery, native DSL validation, frozen tests, repair controller, recovery, and publication gates.
- Check OpenCode health before session creation and isolate each process's HTTP pool; never replay writes as a startup retry.
- Provide aligned English/Chinese documentation, npm-package installation checks, native-engine fixtures, and a three-platform CI matrix.
- Full live Dify business acceptance and LLM-as-judge scoring remain open. The abandoned desktop prototype was not released; this version provides no VSIX or native desktop installer.

## 0.3.1 — Previous extension source

- Publish initial source as Wei Biran's FDE delivery toolkit, with bilingual Chat/Settings and documentation.
- Integrate OpenCode 1.18.34, a restricted Dify MCP bridge, and Dify 1.14.2/1.17.1 adapters.
- Implement capability discovery, native Workflow/Chatflow DSL, fixed tests, bounded repairs, test apps, and guarded original-app updates.
- Record browser discovery and minimal Dify 1.14.2 import/run/publication checks separately from mocked interface tests.
