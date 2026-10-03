# Compatibility and verification status

[English](compatibility.md) | [简体中文](compatibility.zh-CN.md)

This Beta distinguishes live evidence from fixtures. Tests for one interface do not certify another.

| Component               | Version / platform                 | Evidence and limits                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Browser application     | 0.5.0-beta.1, macOS ARM64, Node 22 | Real authenticated HTTP server and browser Chat/Settings, English/Chinese switching, folder picker; no configured live Dify business loop                                                                                      |
| npm package             | GitHub distribution                | Isolated tarball installation with scripts disabled, native runtime resolution, browser assets, and public API checks; release startup also checked from GitHub                                                                |
| Credential store        | macOS Keychain                     | Native set/get/delete test; Windows/Linux store behavior still needs local acceptance                                                                                                                                          |
| OpenCode CLI + SDK      | 1.18.34                            | Native macOS ARM64, Windows x64, and Linux x64 processes with actual SDK/MCP and local compatible/DeepSeek fixtures; no live model-account test                                                                                |
| Dify / DSL              | 1.14.2 / 0.6.0                     | Previous browser tool discovery and minimal Workflow/Chatflow import, run, publication; application HTTP/business acceptance pending                                                                                           |
| Dify / DSL              | 1.17.1 / 0.7.0                     | Pinned source contracts and mocked Console API tests; no real-instance acceptance                                                                                                                                              |
| Windows x64 / Linux x64 | Node 22 CI matrix                  | npm installation, authenticated pages/API, and both native-engine fixtures passed in [CI](https://github.com/WeiBiran/aladdin-dify-copilot/actions/runs/37117517654); OS credential-store and live business acceptance pending |

## Node coverage

Templates exist for `start`, `end`, `answer`, `llm`, `tool`, `knowledge-retrieval`, `http-request`, `if-else`, `template-transform`, `code`, `assigner`, `variable-aggregator`, `iteration`, `iteration-start`, `loop`, `loop-start`, and `loop-end`.

Each node must be imported and run on the target Dify version before being marked live-verified. Templates and YAML tests do not establish that status. Independent Agent apps, human approval, and trigger nodes are outside this Beta. Existing unsupported nodes are preserved and block automatic modification.

Caches are scoped by canonical project, connection/account, and workspace. Changed instances require reconnection and synchronization. SSO-only deployments, other Dify versions, other CPU architectures, and remote/LAN hosting are not verified. Linux credential persistence depends on the available native backend. LLM-as-judge evaluation is not implemented.

## Recorded Dify browser checks

On 2026-10-03, a self-hosted instance displayed version 1.14.2 in its account menu. A minimal start/end Workflow completed (0.086 seconds, 0 tokens). A start/answer Chatflow returned expected content for two turns in one conversation and was published. Dedicated test apps were created; existing business apps were not overwritten.

These checks do not establish conversation-variable behavior, clarification, real-tool business tasks, or compatibility of every node. Browser and application HTTP acceptance are recorded separately. The five cases in [acceptance.md](acceptance.md) remain open. Private reports are not published.

The cross-platform CI evidence above covers code commit `d570d86`; subsequent release documentation changes do not change its runtime. Local checks passed 55 automated tests plus two native-engine fixtures.
