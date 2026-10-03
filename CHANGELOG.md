# Changelog

[English](CHANGELOG.md) · [简体中文](CHANGELOG.zh-CN.md)

## 0.3.1 — Beta

- Publish the project as Wei Biran's FDE delivery toolkit for Dify.
- Add English and Simplified Chinese settings/chat interfaces, automatic locale selection, and a language override.
- Localize command/configuration descriptions and verify webview reinitialization after language changes.
- Add paired installation, usage, architecture, compatibility, acceptance, and contribution documentation.
- Provide GitHub Beta release packages, issue templates, and reproducible build instructions.

## 0.3.0

- Replace the task form with a chat timeline, bottom composer, streamed agent replies, and tool-call cards.
- Continue the same task/session through follow-up messages while preserving frozen tests and target mappings.
- Persist conversation records privately; archive them when starting a new conversation.
- Add model, application-type, acceptance, and test-scope controls to chat.

## 0.2.1

- Place Dify chat in the Secondary Side Bar using new container/view IDs.
- Add automatic startup display, a status-bar shortcut, and a command to reopen the panel.
- Keep settings/chat visible in Restricted Mode while requiring trust for connections and execution.
- Verify startup/reopening and bundled webview scripts in a real VS Code host.
- Require VS Code 1.106 for the stable right-sidebar contribution API.

## 0.2.0

- Add a dedicated settings editor for Dify, workspace, generation/runtime models, and execution limits.
- Support requirement and acceptance entry without hand-editing Markdown.
- Show synchronization, task progress, errors, and recovery actions.
- Verify SecretStorage boundaries and cross-address key isolation in a real host.

## 0.1.0

- Integrate the official OpenCode 1.18.34 SDK, isolated process, and restricted Dify MCP bridge.
- Implement Dify 1.14.2 / 1.17.1 cookie/CSRF adapters and four tool-provider categories.
- Add native Workflow/Chatflow DSL, frozen tests, repair loops, and test-app publication guards.
- Add original-app diff confirmation, concurrency detection, write-intent recovery, fixtures, and native engine tests.
- Browser checks passed for tool discovery and minimal 1.14.2 Workflow/Chatflow cases; plugin HTTP and full business acceptance remain pending.
