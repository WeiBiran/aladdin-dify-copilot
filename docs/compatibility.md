# Compatibility and verification status

[English](compatibility.md) · [简体中文](compatibility.zh-CN.md)

This Beta distinguishes live evidence from fixtures. Tests for one interface do not certify another.

| Component               | Version / platform                         | Evidence                                                                                     | Status                                                                       |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| OpenCode CLI + SDK      | 1.18.34                                    | Native macOS ARM64 process, official SDK, and actual MCP calls against local model fixtures  | Native integration verified; no live generation-model account test           |
| Generation models       | DeepSeek and compatible providers          | Local OpenAI-compatible and native DeepSeek SSE fixtures                                     | Live account calls pending                                                   |
| Dify / DSL              | 1.17.1 / 0.7.0                             | Pinned upstream source and mocked Console API tests                                          | Live-instance validation pending                                             |
| Dify / DSL              | 1.14.2 / 0.6.0                             | Browser tool discovery; minimal Workflow/Chatflow imports, runs, and publication             | Those browser cases passed; plugin HTTP and full business acceptance pending |
| VS Code                 | macOS ARM64, local development environment | Real extension-host UI, SecretStorage, source/VSIX smoke tests, and native runtime packaging | Local installation verified; full business loop pending                      |
| Windows x64 / Linux x64 | GitHub Actions matrix                      | Native-engine fixture tests and platform packaging configured                                | Consult the published CI results; no desktop installation claim              |

## Node coverage

Templates exist for `start`, `end`, `answer`, `llm`, `tool`, `knowledge-retrieval`, `http-request`, `if-else`, `template-transform`, `code`, `assigner`, `variable-aggregator`, `iteration`, `iteration-start`, `loop`, `loop-start`, and `loop-end`.

Each node must be imported and run on the target Dify version before being marked live-verified. Templates and YAML tests do not establish that status. Independent Agent apps, human approval, and trigger nodes are outside first-release generation scope. Existing unsupported nodes are preserved and block automatic modification.

Caches are scoped by project, connection/account, and workspace. Changing instances requires reconnection and synchronization. SSO-only deployments, other Dify versions, and remote extension hosts remain unverified.

## Recorded browser checks

On 2026-10-03, a self-hosted instance displayed version 1.14.2 in its account menu. A minimal start/end Workflow completed (0.086 seconds, 0 tokens). A start/answer Chatflow returned expected content for two turns in one conversation and was published. Dedicated test applications were created; existing business apps were not overwritten.

These checks do not establish conversation-variable behavior, clarification, tool-backed business tasks, or compatibility of every node. Browser and plugin HTTP acceptance are recorded separately. The five business cases in [acceptance.md](acceptance.md) remain open. Raw private reports are not included in the public repository.
