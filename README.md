# Aladdin Dify

[English](README.md) | [简体中文](README.zh-CN.md)

**Wei Biran's FDE delivery toolkit for Dify.** Describe a business task, build a Workflow or Chatflow with an OpenCode agent, and verify its candidate against a fixed test baseline. Run it locally with npm and use it in your browser.

**Beta · 0.5.0-beta.2.** [Report an issue](https://github.com/WeiBiran/aladdin-dify-copilot/issues/new/choose) or fork the repository and send a pull request. Live business acceptance is still open; read the [verification status](docs/compatibility.md) before relying on a deployment.

## Start with one command

Install [Node.js 22+](https://nodejs.org/en/download), then run this in a business project folder:

```sh
npx --yes github:WeiBiran/aladdin-dify-copilot
```

The first run installs the dependencies, including the official OpenCode runtime. The command starts a service bound to `127.0.0.1` and opens its private launch link in your browser. Keep the terminal running; **Ctrl+C** stops the service and cancels active tasks. Configuration happens in the webpage. VS Code, Electron, Docker, a global OpenCode CLI, and an npm registry account are not required.

To select a specific project and release:

```sh
npx --yes github:WeiBiran/aladdin-dify-copilot#v0.5.0-beta.2 ./customer-project
```

The directory must already exist; the browser's folder picker can also create and select a project. Use `--port 0` to choose a free port, `--no-open` to print the link without opening a browser, or `--help` for all options. The default port is `8787`. If it is occupied, choose another port.

This release is distributed through GitHub, **not the npm registry**. The short command `npx aladdin-dify` is not available. The repository includes compiled launch files, so GitHub installation does not require a local build. [Release downloads](https://github.com/WeiBiran/aladdin-dify-copilot/releases/tag/v0.5.0-beta.2) include the npm tarball, source archive, and SHA-256 checksums.

## The problem it solves

An FDE (Forward Deployed Engineer) needs to turn a customer's requirements into a workflow that can be demonstrated, tested, and delivered. The customer's tools must exist, their parameters must match, and the workflow must meet the agreed criteria. Drawing a plausible workflow does not establish any of those things.

Aladdin Dify discovers the tools, models, and knowledge bases visible to your account in an existing Dify workspace. OpenCode reads the relevant definitions, writes native Dify DSL, and revises its candidate using test failures. The application controls the test baseline, execution limits, imports, and publishing. Requirements, DSL, and tests remain ordinary project files.

The aim is to shorten the path from a brief to a **validated candidate**, with evidence available for review. This Beta does not claim a measured speed improvement or production readiness.

## Configure in the browser

Open the gear button in Chat. Settings support English and Simplified Chinese, following the browser language by default.

1. **Dify connection:** enter the root or Console API URL, actual supported Dify version, email, and password. Click **Connect and sync**, then select a workspace if needed. A published app's Service API key cannot replace console authentication.
2. **Generation model:** choose DeepSeek, OpenAI, an OpenAI-compatible API, or another OpenCode provider. Enter its API URL where required, key, and actual model ID. Fetch the model list if the provider exposes one.
3. **Workflow runtime model:** choose from the catalog already configured in Dify, or let the agent choose. This is separate from the generation model above.
4. **Execution limits:** set repair rounds, timeout, and separate generation/Dify token budgets. Defaults: five repairs, 30 minutes, and 100,000 tokens for each budget.

Passwords, API keys, cookies, and tokens use the OS credential store through `@napi-rs/keyring`. macOS uses Keychain; Windows uses Credential Manager. Linux needs an available Secret Service or kernel keyring; kernel-only storage may not persist after logout/reboot. Storage errors are reported; there is no plaintext fallback. Switch the interface language before entering unsaved credentials because the page reloads.

The version adapters target **Dify 1.14.2 / DSL 0.6.0** and **1.17.1 / DSL 0.7.0**. Other versions and SSO-only deployments need additional adapters. Version selection is explicit; the application does not claim to detect every deployment version automatically.

## Build, test, and deliver

The main page is a Chat interface: messages and tool calls in the timeline, a composer at the bottom, and task/model options beside it.

1. Choose **Workflow** or **Chatflow**. The folder button changes the current project.
2. Open **＋ / Task options** to set the application name, acceptance criteria, or an existing application to improve.
3. Define the allowed test scope for business tools, HTTP requests, and code nodes. A Dify test copy does not isolate writes to external systems.
4. Describe the task and send with **Enter**; **Shift+Enter** adds a line. Follow replies, real tool calls, validation, tests, and repairs. Stop with the composer stop button.
5. Open the generated DSL and report. A new test application is published automatically after the gates pass. Updating an existing original requires reviewing the diff/report and confirming the target; remote conflicts stop the update.

Example:

> Build a support Chatflow. Ask for the product model when it is missing, use the available knowledge base and business tools to investigate the fault, and cite evidence in the answer. Independent test conversations must not share context.

The agent discovers built-in/plugin, API, workflow, and Dify-connected MCP tools. It fetches full definitions for selected tools and retains real provider/tool identities, required parameters, and unknown outputs. It does not ask you to manually register all existing MCP tools or copy their documentation into a prompt.

Tests check fields, JSON structure, types, ranges, formats, nodes/branches, and multi-turn results. Each Chatflow case gets an independent conversation. The first test baseline is frozen; a repair cannot delete failed cases or lower their criteria. Follow-up messages keep that baseline, target, and test application. A new conversation archives the previous record; there is no history browser yet.

**LLM-as-judge scoring is not implemented.** Agent analysis drives repairs; the evaluation gates use deterministic assertions. Unchanged errors, missing credentials, limits, and ambiguous write outcomes stop automatic progress instead of producing a success placeholder.

## Local files and privacy

```text
customer-project/
  dify.project.json  # Target, app type, original/test app references
  requirements.md   # Generated from the brief; no manual Markdown setup
  workflow.yml      # Native Dify DSL
  tests.json        # Fixed test baseline
```

Private settings, chat history, capability caches, reports, raw runs, backups, and deployment records live in `~/.aladdin-dify`, separate from the project. `--data-dir` selects another location and an independent keyring namespace. Reports may contain business output; redact them before sharing. Credentials are absent from public UI state, DSL, and ordinary logs.

The web service requires a short-lived, single-use launch ticket, then an HttpOnly/SameSite cookie. It checks the host and POST origin, exposes only allowlisted operations, and does not offer arbitrary terminal execution. Keep the printed launch link private. It listens only on loopback, not your LAN.

Publication is tied to the tested DSL and capability/test digests. Changed files or dependencies require new validation. Interrupted writes are reconciled rather than blindly replayed. Test copies may need secret environment variables configured in Dify; unsafe secret-node merges block original-app updates. External writes have no cross-system rollback.

## What has been verified

Local checks cover the authenticated HTTP API, browser Chat/Settings, both languages, project selection, native macOS keyring persistence, installed npm package startup, and real OpenCode/SDK/MCP communication using deterministic model fixtures. These fixtures do not call a live DeepSeek account.

Previous checks on an actual Dify 1.14.2 instance covered browser tool discovery and minimal Workflow/Chatflow import, run, and publication. **The new browser application's full Dify business loop remains unverified with configured credentials.** Dify 1.17.1 has source-contract and mocked-interface tests only. Every generated node still needs live import/run evidence on the target version. See [compatibility](docs/compatibility.md), [acceptance cases](docs/acceptance.md), and this commit's [CI results](https://github.com/WeiBiran/aladdin-dify-copilot/actions).

Not included: Dify Cloud, independent Agent app types, SSO, human-approval/trigger nodes, semantic scoring, and alternative agent engines. This release replaces the earlier VS Code interface; it does not ship VSIX or native desktop installers.

## Development

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

`npm test` uses mocked Dify interfaces and a real loopback web server. `test:engine` starts the pinned native runtime with real SDK/MCP transport and local model fixtures. `test:package` installs the tarball into an isolated directory with install scripts disabled and verifies its launch, assets, and API. After source changes run `npm run compile`; before pushing include the three compiled files in `dist/` so GitHub `npx` remains runnable. CI runs on macOS, Windows, and Linux; consult its actual results.

See [architecture](docs/architecture.md), [contributing](CONTRIBUTING.md), and [changelog](CHANGELOG.md). Licensed under [MIT](LICENSE), with [dependency notices](THIRD_PARTY_NOTICES.md).

## Feedback

This is a Beta. [Open an issue](https://github.com/WeiBiran/aladdin-dify-copilot/issues/new/choose) with the app version, Node version, OS/architecture, Dify version, reproduction steps, and redacted error. English and Chinese are welcome. Do not attach credentials, internal URLs, customer data, or raw private logs. Fork the repository to adapt it to your environment; contributions with tests and honest validation evidence are welcome.
