# Aladdin Dify Copilot

[English](README.md) | [简体中文](README.zh-CN.md)

**Wei Biran's FDE delivery toolkit for Dify.** Build Workflow and Chatflow applications from a business brief, verify them against acceptance tests, and iterate with an agent inside VS Code.

**Beta · 0.3.1** — APIs, node coverage, and the delivery process are still being validated. See [validation status](docs/compatibility.md) before choosing a deployment. Bugs and missing integrations are expected; [open an issue](https://github.com/WeiBiran/aladdin-dify-copilot/issues) or fork the repository and send a pull request.

[Download the Beta](https://github.com/WeiBiran/aladdin-dify-copilot/releases/tag/v0.3.1-beta.1) · [Installation and usage](#installation-and-usage) · [Contributing](CONTRIBUTING.md)

## The problem

An FDE (Forward Deployed Engineer) needs to turn a customer's requirements into a workflow that can be demonstrated, tested, and delivered. A plausible diagram is only part of that work: tools must actually exist in the customer's Dify workspace, their parameters must match, and the resulting workflow must meet the agreed criteria.

This extension brings those steps into one project. It discovers the tools, models, and knowledge bases visible in an existing Dify instance. An OpenCode agent reads the relevant definitions, writes native Dify DSL, and uses test failures to revise its candidate. The extension keeps the test baseline fixed and controls imports, execution limits, and publishing.

The goal is to shorten the path from a business brief to a **validated candidate**, while retaining the DSL, test cases, and delivery evidence needed to review it. This beta does not claim a measured speed improvement or production readiness.

## What it does

- **See the actual environment.** Sync built-in/plugin, custom API, workflow, and MCP tools, plus models and knowledge bases. The agent fetches full definitions for selected tools instead of guessing IDs or parameters.
- **Build through conversation.** Choose Workflow or Chatflow, describe the task, and follow replies, tool calls, validation, tests, and repairs in the right-hand chat panel.
- **Evaluate and iterate.** Freeze a test baseline, run Workflow cases or independent Chatflow conversations, check assertions, and return failure evidence to the same agent session. The default limit is five repair rounds.
- **Deliver a tested candidate.** Import into a dedicated test application and publish after the gates pass. For an existing application, work on a test copy; updating the original requires a diff, confirmation, and a conflict check.
- **Keep a local project.** Store the brief, native YAML DSL, and tests in ordinary files. Credentials, chat history, capability caches, and raw run records stay in extension storage.
- **Use English or Chinese.** The interface follows VS Code by default; choose English or Simplified Chinese in the extension's Settings page. Both READMEs describe the same beta scope.

Evaluation currently uses deterministic assertions for fields, structure, values, formats, nodes, and multi-turn results. Agent analysis drives repairs. **LLM-as-judge scoring is not implemented in this beta.**

## Installation and usage

### 1. Install the extension

Requirements: **VS Code 1.106+**, an existing self-hosted Dify instance, a console account with application-editing and tool-reading access, and a generation model with tool calling.

1. Open the [Beta release](https://github.com/WeiBiran/aladdin-dify-copilot/releases/tag/v0.3.1-beta.1) and download the VSIX for your operating system and CPU architecture.
2. In VS Code, open Extensions → **…** → **Install from VSIX…** and select the downloaded file.
3. Reload the VS Code window after an upgrade.

The initial locally validated installer targets **macOS Apple Silicon (`darwin-arm64`)**. Other platform packages are published only when their CI builds pass; packaging alone is not evidence of real Dify compatibility. The official OpenCode **1.18.34** runtime is bundled. A global OpenCode installation and Docker are not required.

### 2. Configure the environment

Open **Dify: Open Settings** from the Command Palette. The extension also opens Settings on first activation.

- **Interface language:** Auto, English, or Simplified Chinese. Changing it reloads the extension pages; enter unsaved credentials after switching languages.
- **Dify connection:** enter the instance root or Console API URL, the actual supported Dify version, login email, and password. Click **Connect and sync**. Select a workspace if the account has more than one.
- **Generation model:** choose DeepSeek, OpenAI, an OpenAI-compatible API, or another OpenCode provider. Enter its API URL where required, API key, and actual model ID. You can fetch a model list when the provider exposes one.
- **Workflow runtime model:** select a model from Dify's available catalog or let the agent choose. This model is configured separately from the extension's generation model.
- **Execution limits:** set repair rounds, run timeout, generation token budget, and Dify execution token budget.

This beta implements console email/password authentication for **Dify 1.14.2 / DSL 0.6.0** and **1.17.1 / DSL 0.7.0**. A Dify application Service API key does not replace console authentication. SSO-only deployments and other versions require additional adapters.

### 3. Start a delivery task

Create a business project folder, open it in VS Code, and trust it before connecting or running the agent. Settings and chat remain visible in Restricted Mode, but execution is blocked.

Open the right-hand **Dify Copilot** tab. If it is hidden, click **Dify** in the status bar or run **Dify: Open Chat Panel**. VS Code's built-in Chat is a separate tab.

1. Select **Workflow** or **Chatflow** beside the composer.
2. Open **＋ / Task options** to set an application name, acceptance criteria, or an existing application to improve.
3. Decide whether the task may execute business tools, HTTP requests, and code nodes within your approved test scope. A test copy isolates the Dify definition; it does not isolate changes to external business systems.
4. Describe the requirement and press **Enter** to send. Use **Shift+Enter** for a new line.
5. Follow the conversation, tool calls, and test evidence. Stop the task with the composer stop button. Resume a stopped task or send a follow-up change request in the same conversation.
6. When the candidate passes, open the DSL and test report. A tested new application is published automatically. Updating an original application requires your confirmation after reviewing its diff and report.

Example brief:

> Build a support Chatflow. Ask for the product model when it is missing, use the existing knowledge base and business tools to investigate the fault, and cite evidence in the answer. Separate test conversations must not share context.

The first message fixes the target and acceptance baseline. Follow-ups keep that baseline and the same test application. A new conversation can set a different target; it archives the previous conversation without deleting project files. There is no history browser yet.

## Project files and delivery evidence

```text
customer-project/
  dify.project.json  # App type and connection/original/test app references
  requirements.md    # Generated from the brief; no manual Markdown setup required
  workflow.yml       # Native Dify DSL
  tests.json         # Fixed acceptance test baseline
```

Passwords, keys, cookies, and tokens use VS Code SecretStorage. Chat history, capabilities, test reports, raw run data, backups, and deployment records live in extension-owned storage outside the project. A report can contain business output; review and redact it before sharing.

Publishing is bound to the tested DSL, test baseline, and used environment capabilities. Changes require revalidation. Unknown results after a network interruption are kept for reconciliation instead of blindly repeating a write. An existing application's secret environment variables may need configuration in its test copy; automatic updates containing node secret configuration are blocked until a safe merge is available.

## Beta scope and validation

| Area                 | Current status                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chat and Settings    | Real VS Code host checks: activation, right sidebar, form persistence, language switching, SecretStorage, and key isolation                                                          |
| OpenCode + SDK + MCP | Real pinned native runtime and tool transport on macOS ARM64; model responses in these tests come from local fixtures                                                                |
| Dify 1.14.2          | Actual browser discovery and minimal Workflow/Chatflow import, run, and publish checks; plugin HTTP access and full business tasks still need validation with configured credentials |
| Dify 1.17.1          | Versioned source contracts and mocked tests; no real instance acceptance claim                                                                                                       |
| Windows / Linux      | Native build and engine CI matrix; see CI and release assets for the results of this release                                                                                         |

Each supported node still needs import and execution evidence on the target version. Parsing YAML or passing a fixture is not sufficient. The [compatibility matrix](docs/compatibility.md) and [acceptance checklist](docs/acceptance.md) track the remaining work.

Not included: Dify Cloud, standalone Agent applications, SSO, human-approval or trigger nodes, semantic scoring, additional agent engines, and Marketplace publication. External side effects do not have cross-system rollback.

## Development

Use Node.js 22+ and npm:

```sh
git clone https://github.com/WeiBiran/aladdin-dify-copilot.git
cd aladdin-dify-copilot
npm ci
npm run check
node scripts/stage-runtime.mjs
npm run test:engine
npm run package
```

Press **F5** in this repository to launch an Extension Development Host, then open a business folder in that window. `npm run package` creates a VSIX for the current host platform. `npm run test:host` uses an isolated temporary VS Code profile; `DIFY_VSIX` can point it at a packaged installer.

`npm test` uses mocked Dify interfaces. `npm run test:engine` runs native OpenCode with real SDK/MCP communication and a local model fixture; it does not call a real DeepSeek account. Actual Dify acceptance uses the checklist and an approved environment.

See [architecture](docs/architecture.md), [contributing](CONTRIBUTING.md), and [changelog](CHANGELOG.md). The project is licensed under [MIT](LICENSE); dependency licenses are listed in [third-party notices](THIRD_PARTY_NOTICES.md).

## Feedback

This is a Beta. If something fails, [open an issue](https://github.com/WeiBiran/aladdin-dify-copilot/issues/new/choose) with the extension version, OS/architecture, Dify version, reproduction steps, and redacted error. Chinese and English reports are welcome. Do not include keys, passwords, cookies, internal URLs, or customer data.

Fork the repository to adapt it to your environment. Pull requests with tests and a clear account of what was actually verified are welcome.
