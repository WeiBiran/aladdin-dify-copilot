"use strict";
(() => {
  // src/core/i18n.ts
  var englishMessages = {
    \u8BBE\u7F6E: "Settings",
    \u8DDF\u968F\u6D4F\u89C8\u5668: "Follow browser",
    "\u5BC6\u7801\u4E0E\u4F1A\u8BDD\u4FDD\u5B58\u5728\u7CFB\u7EDF\u5B89\u5168\u51ED\u636E\u5B58\u50A8\u4E2D\u3002": "Passwords and sessions are stored in the system credential store.",
    "\u9ED8\u8BA4\u4F7F\u7528\u5185\u7F6E OpenCode \u7248\u672C": "Use the included OpenCode version by default",
    \u8DDF\u968F\u7CFB\u7EDF: "Follow system",
    \u8FD4\u56DE\u804A\u5929: "Back to chat",
    \u542F\u52A8\u65F6\u6253\u5F00\u804A\u5929: "Open chat at startup",
    "\u5BC6\u7801\u4E0E\u4F1A\u8BDD\u4F7F\u7528\u7CFB\u7EDF\u5B89\u5168\u51ED\u636E\u52A0\u5BC6\u4FDD\u5B58\u3002": "Passwords and sessions are encrypted using secure system storage.",
    \u4EFB\u52A1: "Chat",
    \u754C\u9762\u8BED\u8A00: "Interface language",
    \u6253\u5F00\u53F3\u4FA7\u4EFB\u52A1\u9762\u677F: "Open chat panel",
    \u8FDE\u63A5\u4F60\u7684\u5F00\u53D1\u73AF\u5883: "Connect your development environment",
    "\u914D\u7F6E\u4E00\u6B21\uFF0C\u8BA9 Agent \u4E86\u89E3 Dify \u7684\u771F\u5B9E\u5DE5\u5177\u3001\u6A21\u578B\u548C\u77E5\u8BC6\u5E93\u3002": "Connect Dify so the agent can discover its actual tools, models, and knowledge bases.",
    "\u8FDE\u63A5 Dify": "Connect Dify",
    \u9009\u62E9\u751F\u6210\u6A21\u578B: "Choose a generation model",
    \u5728\u4EFB\u52A1\u9762\u677F\u63CF\u8FF0\u9700\u6C42: "Describe your task in chat",
    \u8BBE\u7F6E\u5206\u7C7B: "Settings sections",
    "Dify \u8FDE\u63A5": "Dify connection",
    \u751F\u6210\u6A21\u578B: "Generation model",
    \u5DE5\u4F5C\u6D41\u8FD0\u884C\u6A21\u578B: "Workflow runtime model",
    \u6267\u884C\u9650\u5236: "Execution limits",
    "\u51ED\u636E\u5B89\u5168\u4FDD\u5B58\u5728\u672C\u673A\u3002": "Credentials stay in secure local storage.",
    "\u9879\u76EE\u6587\u4EF6\u53EF\u72EC\u7ACB\u5206\u4EAB\u3002": "Project files can be shared separately.",
    "\u8FDE\u63A5\u5DF2\u6709\u5B9E\u4F8B\uFF0C\u81EA\u52A8\u540C\u6B65\u5F53\u524D\u8D26\u53F7\u53EF\u89C1\u7684\u80FD\u529B\u3002": "Connect an existing instance and sync the capabilities visible to your account.",
    \u672A\u914D\u7F6E: "Not configured",
    \u5B9E\u4F8B\u5730\u5740: "Instance URL",
    "\u586B\u5199 Dify \u6839\u5730\u5740\u6216 Console API \u5730\u5740\u3002": "Enter the Dify root URL or Console API URL.",
    "Dify \u7248\u672C": "Dify version",
    \u767B\u5F55\u90AE\u7BB1: "Login email",
    \u767B\u5F55\u5BC6\u7801: "Login password",
    \u8F93\u5165\u767B\u5F55\u5BC6\u7801: "Enter your login password",
    \u9009\u62E9\u5DE5\u4F5C\u7A7A\u95F4: "Select workspace",
    \u4FDD\u5B58\u5DE5\u4F5C\u7A7A\u95F4\u5E76\u540C\u6B65: "Save workspace and sync",
    \u8FDE\u63A5\u5E76\u540C\u6B65: "Connect and sync",
    \u5237\u65B0\u80FD\u529B: "Refresh capabilities",
    \u53EF\u89C1\u5DE5\u5177: "Visible tools",
    \u73AF\u5883\u6A21\u578B: "Runtime models",
    \u77E5\u8BC6\u5E93: "Knowledge bases",
    "\u8FDE\u63A5\u540E\uFF0CAgent \u4F1A\u6309\u4EFB\u52A1\u9700\u8981\u8BFB\u53D6\u5177\u4F53\u5DE5\u5177\u7684\u53C2\u6570\u4E0E\u8C03\u7528\u5B9A\u4E49\u3002": "The agent reads detailed tool parameters and call definitions as needed.",
    "\u8D1F\u8D23\u7406\u89E3\u9700\u6C42\u3001\u7F16\u6392\u5DE5\u4F5C\u6D41\u3001\u5206\u6790\u6D4B\u8BD5\u7ED3\u679C\u5E76\u4FEE\u590D\u3002": "Used to understand requirements, build workflows, and repair failures using test evidence.",
    \u6A21\u578B\u4F9B\u5E94\u5546: "Model provider",
    "\u4F9B\u5E94\u5546 ID": "Provider ID",
    "\u4F8B\u5982 openrouter": "e.g. openrouter",
    "OpenAI \u517C\u5BB9\u63A5\u53E3": "OpenAI-compatible API",
    "\u5176\u4ED6 OpenCode \u4F9B\u5E94\u5546": "Other OpenCode provider",
    "API \u5730\u5740": "API URL",
    "\u8F93\u5165 API Key": "Enter your API key",
    "\u5BC6\u94A5\u4EC5\u4FDD\u5B58\u5728\u5B89\u5168\u51ED\u636E\u5B58\u50A8\u4E2D\u3002": "Keys are stored only in the system credential store.",
    "\u4F8B\u5982 deepseek-chat": "e.g. deepseek-chat",
    "\u652F\u6301\u4ECE\u4F9B\u5E94\u5546\u8BFB\u53D6\u6A21\u578B\u5217\u8868\uFF0C\u4E5F\u53EF\u586B\u5199\u5B9E\u9645\u6A21\u578B ID\u3002": "Fetch available models or enter an actual model ID.",
    \u4FDD\u5B58\u751F\u6210\u6A21\u578B: "Save generation model",
    \u8BFB\u53D6\u6A21\u578B\u5217\u8868: "Fetch models",
    "\u5DE5\u4F5C\u6D41\u5728 Dify \u4E2D\u6267\u884C\u65F6\u4F7F\u7528\uFF0C\u7531 Dify \u7BA1\u7406\u8BA4\u8BC1\u548C\u7528\u91CF\u3002": "Used when a workflow runs in Dify. Dify manages its credentials and usage.",
    \u9ED8\u8BA4\u6A21\u578B: "Default model",
    "\u8BA9 Agent \u6839\u636E\u9700\u6C42\u9009\u62E9": "Let the agent choose",
    "\u5217\u8868\u6765\u81EA\u8FDE\u63A5\u7684 Dify \u5B9E\u4F8B\uFF0C\u4E0E\u4E0A\u65B9\u751F\u6210\u6A21\u578B\u5206\u522B\u914D\u7F6E\u3002": "Models come from your Dify instance and are separate from the generation model.",
    \u4FDD\u5B58\u8FD0\u884C\u6A21\u578B\u504F\u597D: "Save runtime preference",
    "\u63A7\u5236\u5355\u6B21\u4EFB\u52A1\u7684\u81EA\u52A8\u4FEE\u590D\u3001\u8FD0\u884C\u65F6\u95F4\u548C\u8C03\u7528\u9884\u7B97\u3002": "Limit repair attempts, runtime, and token usage.",
    \u6700\u5927\u4FEE\u590D\u8F6E\u6B21: "Maximum repair rounds",
    "\u5355\u6B21\u8FD0\u884C\u65F6\u9650\uFF08\u5206\u949F\uFF09": "Run timeout (minutes)",
    "\u751F\u6210\u6A21\u578B Token \u9884\u7B97": "Generation token budget",
    "Dify \u6267\u884C Token \u9884\u7B97": "Dify execution token budget",
    \u9AD8\u7EA7\u8BBE\u7F6E: "Advanced settings",
    "OpenCode \u8DEF\u5F84\uFF08\u53EF\u9009\uFF09": "OpenCode path (optional)",
    \u4FDD\u5B58\u6267\u884C\u9650\u5236: "Save execution limits",
    \u65B0\u5BF9\u8BDD: "New conversation",
    \u6253\u5F00\u8BBE\u7F6E: "Open settings",
    "\u7528\u5BF9\u8BDD\u6784\u5EFA Dify": "Build Dify workflows with an agent",
    "\u63CF\u8FF0\u4F60\u7684\u76EE\u6807\uFF0CAgent \u4F1A\u53D1\u73B0\u53EF\u7528\u5DE5\u5177\uFF0C": "Describe your goal. The agent discovers available tools,",
    "\u7F16\u6392\u3001\u6D4B\u8BD5\u5E76\u6301\u7EED\u6539\u8FDB\u5DE5\u4F5C\u6D41\u3002": "builds the workflow, tests it, and iterates.",
    "\u914D\u7F6E Dify \u548C\u751F\u6210\u6A21\u578B": "Configure Dify and a generation model",
    \u6784\u5EFA\u5BA2\u670D\u52A9\u624B: "Build a support assistant",
    \u7F16\u6392\u4E1A\u52A1\u5DE5\u5177: "Connect business tools",
    "\u6784\u5EFA\u4E00\u4E2A\u5BA2\u670D Chatflow\uFF1A\u4FE1\u606F\u4E0D\u8DB3\u65F6\u5148\u8FFD\u95EE\uFF0C\u518D\u67E5\u8BE2\u77E5\u8BC6\u5E93\u548C\u5DF2\u6709\u5DE5\u5177\uFF0C\u56DE\u7B54\u8981\u63D0\u4F9B\u4F9D\u636E\u3002": "Build a support Chatflow: ask for missing information, query the knowledge base and existing tools, and cite evidence in the answer.",
    "\u6839\u636E\u8F93\u5165\u67E5\u8BE2\u4E24\u4E2A\u5DF2\u6709\u4E1A\u52A1\u5DE5\u5177\uFF0C\u6C47\u603B\u7ED3\u679C\uFF0C\u751F\u6210\u4E00\u4E2A\u5E26\u6761\u4EF6\u5206\u652F\u7684 Workflow\u3002": "Build a Workflow that queries two existing business tools, combines their results, and uses a conditional branch.",
    \u5BF9\u8BDD\u8BB0\u5F55: "Conversation",
    "Agent \u6B63\u5728\u51C6\u5907\u2026": "Preparing the agent\u2026",
    \u6062\u590D\u4EFB\u52A1: "Resume task",
    \u4EFB\u52A1\u9009\u9879: "Task options",
    \u5173\u95ED\u4EFB\u52A1\u9009\u9879: "Close task options",
    "\u9996\u6B21\u53D1\u9001\u65F6\u56FA\u5B9A\u4EFB\u52A1\u76EE\u6807\uFF1B\u540E\u7EED\u901A\u8FC7\u5BF9\u8BDD\u8865\u5145\u4FEE\u6539\u8981\u6C42\u3002": "The first message sets the task target. Send later messages to request changes.",
    \u5E94\u7528\u540D\u79F0: "Application name",
    \u9ED8\u8BA4\u4F7F\u7528\u9879\u76EE\u76EE\u5F55\u540D: "Defaults to the project folder name",
    \u4EFB\u52A1\u6765\u6E90: "Task source",
    \u65B0\u5EFA\u5E94\u7528: "New application",
    \u6539\u8FDB\u5DF2\u6709\u5E94\u7528: "Improve an existing application",
    "\u5DF2\u6709 Dify \u5E94\u7528": "Existing Dify application",
    \u8BF7\u8BFB\u53D6\u5E94\u7528\u5217\u8868: "Fetch applications first",
    \u8BFB\u53D6\u5E94\u7528\u5217\u8868: "Fetch applications",
    "\u4FEE\u6539\u5148\u5728\u6D4B\u8BD5\u526F\u672C\u8FDB\u884C\uFF0C\u66F4\u65B0\u539F\u5E94\u7528\u65F6\u786E\u8BA4\u3002": "Changes run on a test copy. Updating the original requires confirmation.",
    "\u9A8C\u6536\u8981\u6C42\uFF08\u53EF\u9009\uFF09": "Acceptance criteria (optional)",
    "\u4F8B\u5982\uFF1A\u56DE\u7B54\u5305\u542B\u4F9D\u636E\uFF0C\u4E0D\u540C\u4F1A\u8BDD\u4E92\u4E0D\u4E32\u6270\u3002": "For example: cite evidence and isolate conversations.",
    "\u5141\u8BB8\u5728\u5DF2\u8BA4\u53EF\u7684\u6D4B\u8BD5\u8303\u56F4\u5185\u8C03\u7528\u4E1A\u52A1\u5DE5\u5177\u3001HTTP \u548C\u4EE3\u7801\u8282\u70B9": "Allow business tools, HTTP, and code nodes within your approved test scope",
    "\u8FD9\u4E9B\u8C03\u7528\u53EF\u80FD\u6539\u53D8\u5916\u90E8\u4E1A\u52A1\u6570\u636E\u3002": "These calls may change external business data.",
    \u6D88\u606F: "Message",
    "\u63CF\u8FF0\u4F60\u60F3\u6784\u5EFA\u7684\u5DE5\u4F5C\u6D41\u2026": "Describe the workflow you want to build\u2026",
    \u5E94\u7528\u4E0E\u9A8C\u6536\u8981\u6C42: "Application and acceptance criteria",
    \u5E94\u7528\u7C7B\u578B: "Application type",
    \u914D\u7F6E\u751F\u6210\u6A21\u578B: "Configure generation model",
    \u9009\u62E9\u6A21\u578B: "Choose model",
    "\u53D1\u9001\uFF08Enter\uFF09\uFF1BShift+Enter \u6362\u884C": "Send (Enter); Shift+Enter for a new line",
    \u53D1\u9001\u6D88\u606F: "Send message",
    \u505C\u6B62\u4EFB\u52A1: "Stop task",
    \u9009\u62E9\u9879\u76EE\u76EE\u5F55: "Select project folder",
    \u6253\u5F00\u76EE\u5F55: "Open folder",
    "Dify \u672A\u8FDE\u63A5": "Dify not connected",
    \u9650\u5B9A\u5DE5\u5177\u6743\u9650: "Restricted tool permissions",
    "\u5904\u7406\u4E2D\u2026": "Working\u2026",
    \u5DF2\u4FDD\u5B58: "Saved",
    "\u5BC6\u7801\u5DF2\u4FDD\u5B58\uFF0C\u7559\u7A7A\u53EF\u4EE5\u4FDD\u7559\u3002": "Password saved. Leave blank to keep it.",
    "\u5DF2\u4FDD\u5B58\u5BC6\u7801\uFF0C\u7559\u7A7A\u53EF\u7EE7\u7EED\u4F7F\u7528\uFF1B\u586B\u5199\u65B0\u503C\u4F1A\u66FF\u6362\u3002": "Password saved. Leave blank to keep it, or enter a replacement.",
    "\u5DF2\u4FDD\u5B58\u5BC6\u94A5\uFF0C\u540C\u4E00\u4F9B\u5E94\u5546\u4E0E\u5730\u5740\u7559\u7A7A\u53EF\u4FDD\u7559\u3002": "Key saved. Leave blank to keep it for the same provider and URL.",
    \u4FE1\u606F\u5B8C\u6574: "Complete",
    \u5F53\u524D\u7A7A\u95F4: "Current workspace",
    \u64CD\u4F5C\u5B8C\u6210: "Done",
    "\u751F\u6210\u6A21\u578B\u5DF2\u4FDD\u5B58\u3002": "Generation model saved.",
    "\u8FD0\u884C\u6A21\u578B\u504F\u597D\u5DF2\u4FDD\u5B58\u3002": "Runtime preference saved.",
    "\u6267\u884C\u9650\u5236\u5DF2\u4FDD\u5B58\u3002": "Execution limits saved.",
    \u4F60: "You",
    \u9700\u8981\u5904\u7406: "Action needed",
    "\u2713 \u6D4B\u8BD5\u901A\u8FC7": "\u2713 Tests passed",
    "\u2727 Dify Agent": "\u2727 Dify Agent",
    "\u67E5\u770B DSL": "View DSL",
    \u6D4B\u8BD5\u62A5\u544A: "Test report",
    \u67E5\u770B\u5DEE\u5F02: "View changes",
    \u66F4\u65B0\u539F\u5E94\u7528: "Update original application",
    \u67E5\u627E\u53EF\u7528\u5DE5\u5177: "Find available tools",
    \u8BFB\u53D6\u5DE5\u5177\u5B9A\u4E49: "Read tool definition",
    \u8BFB\u53D6\u9879\u76EE: "Read project",
    "\u540C\u6B65 Dify \u80FD\u529B": "Sync Dify capabilities",
    \u4FDD\u5B58\u5DE5\u4F5C\u6D41: "Save workflow",
    \u5EFA\u7ACB\u6D4B\u8BD5\u57FA\u7EBF: "Create test baseline",
    \u6821\u9A8C\u5DE5\u4F5C\u6D41: "Validate workflow",
    \u5BFC\u5165\u6D4B\u8BD5\u5E94\u7528: "Import test application",
    \u8FD0\u884C\u6D4B\u8BD5: "Run tests",
    \u53D1\u5E03\u6D4B\u8BD5\u5E94\u7528: "Publish test application",
    \u7B49\u5F85: "Pending",
    \u8C03\u7528\u4E2D: "Running",
    \u5B8C\u6210: "Completed",
    \u5931\u8D25: "Failed",
    "\u7EE7\u7EED\u8865\u5145\u8981\u6C42\u6216\u63D0\u51FA\u4FEE\u6539\u2026": "Add requirements or request changes\u2026",
    \u5728\u8BBE\u7F6E\u9875\u66F4\u6362: "Change in settings",
    "Dify \u5DF2\u914D\u7F6E": "Dify configured",
    \u5DF2\u6388\u6743\u6D4B\u8BD5\u8303\u56F4: "Approved test scope",
    "\u6253\u5F00\u4E00\u4E2A\u9879\u76EE\u76EE\u5F55\uFF0C\u5F00\u59CB\u6784\u5EFA\u3002": "Open a project folder to get started.",
    "\u76EE\u5F55\u5904\u4E8E\u53D7\u9650\u6A21\u5F0F\uFF0C\u4FE1\u4EFB\u540E\u53EF\u8FD0\u884C Agent\u3002": "This folder is in Restricted Mode. Trust it before running the agent.",
    "\u5728\u8BBE\u7F6E\u9875\u8FDE\u63A5 Dify \u5E76\u914D\u7F6E\u751F\u6210\u6A21\u578B\u3002": "Connect Dify and configure a generation model in Settings.",
    "\u5F53\u524D\u4EFB\u52A1\u76EE\u6807\u548C\u9A8C\u6536\u57FA\u7EBF\u5DF2\u56FA\u5B9A\u3002\u4FEE\u6539\u8981\u6C42\u8BF7\u76F4\u63A5\u53D1\u9001\u6D88\u606F\uFF1B\u66F4\u6362\u76EE\u6807\u8BF7\u65B0\u5EFA\u5BF9\u8BDD\u3002": "The target and test baseline are fixed. Send a message to request changes, or start a new conversation for a different target.",
    "\u4EFB\u52A1\u5DF2\u505C\u6B62\uFF0C\u53EF\u8865\u5145\u8981\u6C42\u6216\u6062\u590D": "Task stopped. Add requirements or resume.",
    "Agent \u6B63\u5728\u751F\u6210\u2026": "The agent is generating\u2026",
    "\u6821\u9A8C DSL\u2026": "Validating DSL\u2026",
    "\u5BFC\u5165\u6D4B\u8BD5\u5E94\u7528\u2026": "Importing test application\u2026",
    "\u8FD0\u884C\u6D4B\u8BD5\u2026": "Running tests\u2026",
    "Agent \u6B63\u5728\u4FEE\u590D\u2026": "The agent is repairing\u2026",
    "\u53D1\u5E03\u6D4B\u8BD5\u5E94\u7528\u2026": "Publishing test application\u2026",
    \u8BF7\u9009\u62E9\u5E94\u7528: "Select an application",
    \u6B63\u5728\u751F\u6210: "Generating",
    \u6B63\u5728\u6821\u9A8C: "Validating",
    \u6B63\u5728\u5BFC\u5165: "Importing",
    \u6B63\u5728\u6D4B\u8BD5: "Testing",
    \u6B63\u5728\u4FEE\u590D: "Repairing",
    \u6B63\u5728\u53D1\u5E03: "Publishing",
    \u5DF2\u5B8C\u6210: "Completed",
    \u6267\u884C\u5931\u8D25: "Failed",
    \u5DF2\u505C\u6B62: "Stopped",
    "\u5019\u9009\u5DE5\u4F5C\u6D41\u901A\u8FC7\u9A8C\u6536\uFF0C\u6D4B\u8BD5\u5E94\u7528\u5DF2\u53D1\u5E03\u3002\u4F60\u53EF\u4EE5\u67E5\u770B DSL \u548C\u6D4B\u8BD5\u62A5\u544A\uFF0C\u6216\u7EE7\u7EED\u53D1\u9001\u4FEE\u6539\u8981\u6C42\u3002": "The candidate passed its acceptance tests and the test application was published. View the DSL and test report, or send another change request.",
    "\u5F53\u524D\u4EFB\u52A1\u6216\u8BBE\u7F6E\u6B63\u5728\u5904\u7406\u4E2D\uFF0C\u8BF7\u7A0D\u540E\u518D\u64CD\u4F5C\u3002": "A task or settings change is in progress. Try again when it finishes.",
    "\u8BF7\u5148\u4FE1\u4EFB\u5DE5\u4F5C\u533A\uFF0C\u624D\u80FD\u8FDE\u63A5 Dify \u5E76\u8FD0\u884C Agent": "Trust the workspace before connecting Dify or running the agent.",
    \u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u9879\u76EE\u76EE\u5F55: "Select a project folder first.",
    "\u8BF7\u5148\u5728\u8BBE\u7F6E\u9875\u8FDE\u63A5 Dify": "Connect Dify in Settings first.",
    \u8BF7\u5148\u4FE1\u4EFB\u5F53\u524D\u5DE5\u4F5C\u533A: "Trust the current workspace first.",
    \u8BF7\u586B\u5199\u767B\u5F55\u5BC6\u7801: "Enter your login password.",
    \u8D26\u53F7\u6CA1\u6709\u53EF\u7528\u5DE5\u4F5C\u7A7A\u95F4: "This account has no available workspaces.",
    "\u8BF7\u5148\u8FDE\u63A5 Dify": "Connect Dify first.",
    \u5DE5\u4F5C\u7A7A\u95F4\u4E0D\u5C5E\u4E8E\u5F53\u524D\u767B\u5F55\u8D26\u53F7: "The workspace does not belong to the signed-in account.",
    "\u8BF7\u586B\u5199\u8BE5\u4F9B\u5E94\u5546\u4E0E\u5730\u5740\u5BF9\u5E94\u7684 API Key": "Enter the API key for this provider and URL.",
    "\u8BE5\u4F9B\u5E94\u5546\u8BF7\u586B\u5199\u5B9E\u9645\u6A21\u578B ID\uFF1B\u81EA\u52A8\u5217\u8868\u7528\u4E8E\u63D0\u4F9B\u6A21\u578B\u76EE\u5F55\u7684 API\u3002": "Enter an actual model ID for this provider. Model discovery requires an API with a model catalog.",
    "\u8BE5\u6A21\u578B\u4E0D\u5728\u5F53\u524D Dify \u7684\u53EF\u7528\u76EE\u5F55\u4E2D\uFF0C\u8BF7\u5237\u65B0\u80FD\u529B": "This model is not in the available Dify catalog. Refresh capabilities.",
    \u8BF7\u5148\u5728\u8BBE\u7F6E\u9875\u914D\u7F6E\u751F\u6210\u6A21\u578B: "Configure a generation model in Settings first.",
    "\u7F3A\u5C11\u6A21\u578B Key\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u9875\u91CD\u65B0\u914D\u7F6E": "The model key is missing. Configure it again in Settings.",
    "\u5F53\u524D\u8FDE\u63A5\u4E0E\u4EFB\u52A1\u76EE\u6807\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u6838\u5BF9\u8BBE\u7F6E\u540E\u91CD\u65B0\u4FDD\u5B58\u4EFB\u52A1\u3002": "The connection does not match the task target. Check Settings and save the task again.",
    \u5F53\u524D\u5E94\u7528\u7C7B\u578B\u4E0D\u652F\u6301\u81EA\u52A8\u6539\u9020: "This application type cannot be modified automatically.",
    "\u5E94\u7528\u7C7B\u578B\u4E0E\u8FDC\u7AEF\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u5E94\u7528": "The application type differs from the remote target. Select the application again.",
    "\u8BF7\u8F93\u5165\u6709\u6548\u4E14\u4E0D\u542B\u51ED\u636E\u7684 HTTP(S) \u5730\u5740": "Enter a valid HTTP(S) URL without embedded credentials.",
    \u8BF7\u8F93\u5165\u6709\u6548\u7684\u767B\u5F55\u90AE\u7BB1: "Enter a valid login email.",
    "\u4F9B\u5E94\u5546 ID \u683C\u5F0F\u4E0D\u6B63\u786E": "Invalid provider ID.",
    "\u8BF7\u9009\u62E9\u6216\u586B\u5199\u6A21\u578B ID": "Select or enter a model ID.",
    \u8BF7\u586B\u5199\u9879\u76EE\u540D\u79F0: "Enter a project name.",
    \u8BF7\u63CF\u8FF0\u4F60\u5E0C\u671B\u5B8C\u6210\u7684\u4EFB\u52A1: "Describe the task you want to accomplish.",
    "\u8BF7\u9009\u62E9\u8981\u6539\u8FDB\u7684 Dify \u5E94\u7528": "Select the Dify application to improve.",
    "\u64CD\u4F5C\u4ECD\u672A\u8FD4\u56DE\u7ED3\u679C\uFF0C\u8BF7\u6838\u5BF9\u6267\u884C\u72B6\u6001\u540E\u91CD\u8BD5\u3002": "The operation has not returned a result. Check its state before retrying.",
    \u9875\u9762\u7C7B\u578B\u4E0D\u5339\u914D: "Page type mismatch.",
    \u672A\u77E5\u64CD\u4F5C: "Unknown operation.",
    "Dify \u6D4B\u8BD5\u5E94\u7528\u5DF2\u53D1\u5E03": "Dify test application published",
    \u6253\u5F00\u5E94\u7528: "Open application",
    \u5DF2\u8BF7\u6C42\u505C\u6B62\u4EFB\u52A1: "Task cancellation requested",
    \u539F\u5E94\u7528\u66F4\u65B0\u5B8C\u6210: "Original application updated",
    "\u6253\u5F00 Dify \u9879\u76EE\u76EE\u5F55": "Open Dify project folder",
    "\u4E0A\u6B21 Dify \u6D4B\u8BD5\u7ED3\u679C\u672A\u77E5\uFF0C\u53EF\u80FD\u5DF2\u4EA7\u751F\u5916\u90E8\u4E1A\u52A1\u5199\u5165\u3002\u8BF7\u5148\u6838\u5BF9 Dify \u65E5\u5FD7\u3001\u6D4B\u8BD5\u6570\u636E\u548C\u4E1A\u52A1\u72B6\u6001\uFF0C\u518D\u5141\u8BB8\u91CD\u65B0\u6D4B\u8BD5\u3002": "The previous Dify test result is unknown and may have changed business data. Check Dify logs, test data, and external state before allowing another test.",
    "\u5DF2\u6838\u5BF9\uFF0C\u5141\u8BB8\u7EE7\u7EED\u6D4B\u8BD5": "Checked; allow further testing"
  };
  function translate(text, locale2) {
    if (locale2 === "zh-CN") return text;
    if (Object.hasOwn(englishMessages, text)) return englishMessages[text];
    const round = text.match(
      /^(正在生成|正在校验|正在导入|正在测试|正在修复|正在发布|已完成|执行失败|已停止|需要处理) · 第 (\d+) 轮(.*)$/
    );
    if (round)
      return `${englishMessages[round[1]] ?? round[1]} \xB7 Round ${round[2]}${round[3]?.replace("\u751F\u6210 ", "Generation ").replace(" / Dify ", " / Dify ") ?? ""}`;
    const models = text.match(/^已读取 (\d+) 个模型，可在生成模型输入框中选择。$/);
    if (models) return `Found ${models[1]} models. Select one in the generation model field.`;
    const selected = text.match(/^已选应用 · (.+)$/);
    if (selected) return `Selected application \xB7 ${selected[1]}`;
    const tools = text.match(/^(\d+) 个工具( · 待处理)?$/);
    if (tools) return `${tools[1]} tools${tools[2] ? " \xB7 Action needed" : ""}`;
    return text;
  }

  // src/ui/chat-client.ts
  function setupChat(request2, api2) {
    let locale2 = document.body.dataset.locale === "en" ? "en" : "zh-CN";
    const t2 = (text) => translate(text, locale2);
    const el2 = (id) => document.getElementById(id);
    const value2 = (id) => el2(id).value;
    let state2;
    let conversation;
    let workspacePath;
    let sending = false;
    let initialized2 = false;
    const nodes = /* @__PURE__ */ new Map();
    const input = el2("chat-input");
    const scroll = el2("chat-scroll");
    const transcript = el2("chat-transcript");
    function draft() {
      api2.setState({ workspacePath, chatId: conversation?.id, input: input.value, task: task() });
    }
    function task() {
      return {
        name: value2("task-name").trim() || state2?.workspace?.name || "Dify Project",
        mode: value2("task-mode"),
        source: value2("task-source"),
        originalAppId: value2("original-app") || void 0,
        requirement: input.value.trim(),
        acceptance: value2("task-acceptance"),
        allowSideEffects: el2("allow-side-effects").checked
      };
    }
    function resizeInput() {
      input.style.height = "auto";
      input.style.height = Math.min(160, Math.max(49, input.scrollHeight)) + "px";
    }
    function notice(text, error = false) {
      const e = el2("global-message");
      e.textContent = t2(text);
      e.classList.toggle("error", error);
    }
    async function command(name, payload) {
      try {
        notice("");
        return await request2(name, payload);
      } catch (e) {
        notice(e instanceof Error ? e.message : String(e), true);
      }
    }
    function options2(id, items, selected = "") {
      const select = el2(id);
      select.replaceChildren();
      for (const item of items) {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = t2(item.label);
        select.append(option);
      }
      select.value = selected;
    }
    function richText(target, text) {
      target.replaceChildren();
      const pieces = text.split(/```[^\n]*\n([\s\S]*?)```/g);
      pieces.forEach((piece, i) => {
        if (i % 2) {
          const pre = document.createElement("pre"), code = document.createElement("code");
          code.textContent = piece;
          pre.append(code);
          target.append(pre);
        } else {
          for (const token of piece.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g)) {
            if (token.startsWith("`") && token.endsWith("`")) {
              const code = document.createElement("code");
              code.textContent = token.slice(1, -1);
              target.append(code);
            } else if (token.startsWith("**") && token.endsWith("**")) {
              const strong = document.createElement("strong");
              strong.textContent = token.slice(2, -2);
              target.append(strong);
            } else target.append(document.createTextNode(token));
          }
        }
      });
    }
    const toolLabels = {
      search_tools: "\u67E5\u627E\u53EF\u7528\u5DE5\u5177",
      get_tool: "\u8BFB\u53D6\u5DE5\u5177\u5B9A\u4E49",
      read_project: "\u8BFB\u53D6\u9879\u76EE",
      refresh_capabilities: "\u540C\u6B65 Dify \u80FD\u529B",
      save_workflow: "\u4FDD\u5B58\u5DE5\u4F5C\u6D41",
      save_test_suite: "\u5EFA\u7ACB\u6D4B\u8BD5\u57FA\u7EBF",
      validate_workflow: "\u6821\u9A8C\u5DE5\u4F5C\u6D41",
      import_workflow: "\u5BFC\u5165\u6D4B\u8BD5\u5E94\u7528",
      run_tests: "\u8FD0\u884C\u6D4B\u8BD5",
      publish_workflow: "\u53D1\u5E03\u6D4B\u8BD5\u5E94\u7528"
    };
    function entryNode(m) {
      let node = nodes.get(m.id);
      if (!node) {
        node = document.createElement("article");
        node.dataset.id = m.id;
        nodes.set(m.id, node);
      }
      const fingerprint = JSON.stringify(m);
      if (node.dataset.fingerprint === fingerprint) return node;
      node.dataset.fingerprint = fingerprint;
      const open = node.querySelector("details")?.open;
      node.className = "chat-entry " + m.kind;
      node.replaceChildren();
      if (m.kind === "tool") {
        const details = document.createElement("details"), summary = document.createElement("summary"), indicator = document.createElement("span"), title = document.createElement("span"), status = document.createElement("span");
        indicator.className = "tool-indicator " + m.status;
        indicator.textContent = m.status === "completed" ? "\u2713" : m.status === "error" ? "!" : "\u25CC";
        const key = (m.title ?? "").replace(/^dify_/, "");
        title.className = "tool-name";
        title.textContent = t2(toolLabels[key] ?? key);
        title.title = m.title ?? "";
        status.className = "tool-status";
        status.textContent = t2(
          { pending: "\u7B49\u5F85", running: "\u8C03\u7528\u4E2D", completed: "\u5B8C\u6210", error: "\u5931\u8D25" }[m.status ?? ""] ?? ""
        );
        summary.append(indicator, title, status);
        details.append(summary);
        const body = document.createElement("div");
        body.className = "tool-detail";
        body.textContent = m.title + (m.text ? "\n" + m.text : "");
        details.append(body);
        details.open = open ?? m.status === "error";
        node.append(details);
      } else if (m.kind === "progress") {
        const mark = document.createElement("span");
        mark.className = "phase-icon";
        mark.textContent = "\xB7";
        node.append(mark, document.createTextNode(t2(m.text)));
      } else {
        const label = document.createElement("div");
        label.className = "entry-label";
        label.textContent = t2(
          m.kind === "user" ? "\u4F60" : m.kind === "error" ? "\u9700\u8981\u5904\u7406" : m.kind === "result" ? "\u2713 \u6D4B\u8BD5\u901A\u8FC7" : "\u2727 Dify Agent"
        );
        const body = document.createElement("div");
        body.className = "entry-body";
        richText(body, ["progress", "error", "result"].includes(m.kind) ? t2(m.text) : m.text);
        node.append(label, body);
        if (m.kind === "result") {
          const actions = document.createElement("div");
          actions.className = "result-actions";
          const items = [
            ["openDsl", "\u67E5\u770B DSL"],
            ["openReport", "\u6D4B\u8BD5\u62A5\u544A"],
            ...state2?.task?.source === "existing" ? [
              ["diff", "\u67E5\u770B\u5DEE\u5F02"],
              ["promote", "\u66F4\u65B0\u539F\u5E94\u7528"]
            ] : []
          ];
          for (const [name, title] of items) {
            const button = document.createElement("button");
            button.textContent = t2(title);
            button.addEventListener("click", () => void command(name));
            actions.append(button);
          }
          node.append(actions);
        }
      }
      return node;
    }
    function renderChat(chat) {
      const atBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 90;
      const changed = conversation?.id !== chat.id;
      if (changed) {
        nodes.clear();
        transcript.replaceChildren();
        if (initialized2) {
          input.value = "";
          resizeInput();
        }
      }
      conversation = chat;
      el2("chat-welcome").hidden = chat.messages.length > 0;
      const present = new Set(chat.messages.map((m) => m.id));
      for (const [id, node] of nodes)
        if (!present.has(id)) {
          node.remove();
          nodes.delete(id);
        }
      for (const m of chat.messages) {
        const node = entryNode(m);
        if (!node.parentNode) transcript.append(node);
      }
      const first = chat.messages.find((m) => m.kind === "user");
      el2("chat-title").textContent = first ? first.text.slice(0, 35).replace(/\n/g, " ") : t2("\u65B0\u5BF9\u8BDD");
      if (atBottom || changed) scroll.scrollTop = scroll.scrollHeight;
      if (state2) readiness();
    }
    function readiness() {
      const s = state2;
      const busy = s.busy || sending;
      const ready = Boolean(s.workspace?.trusted && s.model?.hasKey && s.connection);
      el2("send-chat").disabled = busy || !ready || !input.value.trim();
      el2("send-chat").hidden = s.taskRunning || sending;
      el2("stop-chat").hidden = !s.taskRunning && !sending;
      el2("stop-chat").disabled = !s.taskRunning;
      el2("new-chat").disabled = busy;
      input.disabled = busy;
      input.placeholder = t2(
        conversation?.hasTask ? "\u7EE7\u7EED\u8865\u5145\u8981\u6C42\u6216\u63D0\u51FA\u4FEE\u6539\u2026" : "\u63CF\u8FF0\u4F60\u60F3\u6784\u5EFA\u7684\u5DE5\u4F5C\u6D41\u2026"
      );
      el2("chat-model").textContent = s.model?.model ?? t2("\u9009\u62E9\u6A21\u578B");
      el2("chat-model").title = s.model ? `${s.model.provider} / ${s.model.model} \xB7 ${t2("\u5728\u8BBE\u7F6E\u9875\u66F4\u6362")}` : t2("\u914D\u7F6E\u751F\u6210\u6A21\u578B");
      el2("folder-name").textContent = s.workspace?.name ?? t2("\u6253\u5F00\u76EE\u5F55");
      el2("folder-name").title = s.workspace?.path ?? "";
      el2("chat-environment").textContent = t2(
        s.capabilities ? `${s.capabilities.tools} \u4E2A\u5DE5\u5177${s.capabilities.complete ? "" : " \xB7 \u5F85\u5904\u7406"}` : s.connection ? "Dify \u5DF2\u914D\u7F6E" : "Dify \u672A\u8FDE\u63A5"
      );
      el2("chat-scope").textContent = t2(s.task?.allowSideEffects ? "\u5DF2\u6388\u6743\u6D4B\u8BD5\u8303\u56F4" : "\u9650\u5B9A\u5DE5\u5177\u6743\u9650");
      el2("welcome-setup").hidden = ready;
      el2("chat-notice").textContent = t2(
        !s.workspace ? "\u6253\u5F00\u4E00\u4E2A\u9879\u76EE\u76EE\u5F55\uFF0C\u5F00\u59CB\u6784\u5EFA\u3002" : !s.workspace.trusted ? "\u76EE\u5F55\u5904\u4E8E\u53D7\u9650\u6A21\u5F0F\uFF0C\u4FE1\u4EFB\u540E\u53EF\u8FD0\u884C Agent\u3002" : !s.connection || !s.model?.hasKey ? "\u5728\u8BBE\u7F6E\u9875\u8FDE\u63A5 Dify \u5E76\u914D\u7F6E\u751F\u6210\u6A21\u578B\u3002" : ""
      );
      const locked = busy || conversation?.hasTask === true;
      for (const id of [
        "task-name",
        "task-mode",
        "task-source",
        "original-app",
        "task-acceptance",
        "allow-side-effects",
        "load-apps"
      ])
        el2(id).disabled = locked;
      el2("options-note").textContent = t2(
        locked ? "\u5F53\u524D\u4EFB\u52A1\u76EE\u6807\u548C\u9A8C\u6536\u57FA\u7EBF\u5DF2\u56FA\u5B9A\u3002\u4FEE\u6539\u8981\u6C42\u8BF7\u76F4\u63A5\u53D1\u9001\u6D88\u606F\uFF1B\u66F4\u6362\u76EE\u6807\u8BF7\u65B0\u5EFA\u5BF9\u8BDD\u3002" : "\u9996\u6B21\u53D1\u9001\u65F6\u56FA\u5B9A\u4EFB\u52A1\u76EE\u6807\uFF1B\u540E\u7EED\u901A\u8FC7\u5BF9\u8BDD\u8865\u5145\u4FEE\u6539\u8981\u6C42\u3002"
      );
      const recoverable = conversation?.hasTask && !busy && s.run && ["cancelled", "failed", "needs-input"].includes(s.run.phase);
      el2("chat-working").hidden = !(s.taskRunning || sending || recoverable);
      el2("chat-working").classList.toggle("recoverable", Boolean(recoverable));
      el2("resume-chat").hidden = !recoverable;
      if (recoverable) el2("chat-status").textContent = t2("\u4EFB\u52A1\u5DF2\u505C\u6B62\uFF0C\u53EF\u8865\u5145\u8981\u6C42\u6216\u6062\u590D");
      else if (s.taskRunning || sending)
        el2("chat-status").textContent = t2(
          {
            generating: "Agent \u6B63\u5728\u751F\u6210\u2026",
            validating: "\u6821\u9A8C DSL\u2026",
            importing: "\u5BFC\u5165\u6D4B\u8BD5\u5E94\u7528\u2026",
            testing: "\u8FD0\u884C\u6D4B\u8BD5\u2026",
            repairing: "Agent \u6B63\u5728\u4FEE\u590D\u2026",
            publishing: "\u53D1\u5E03\u6D4B\u8BD5\u5E94\u7528\u2026"
          }[s.run?.phase ?? ""] ?? "Agent \u6B63\u5728\u51C6\u5907\u2026"
        );
    }
    function render2(s) {
      const changed = workspacePath !== s.workspace?.path;
      state2 = s;
      locale2 = s.locale;
      workspacePath = s.workspace?.path;
      if (!initialized2 || changed) {
        const saved = api2.getState();
        const matches = saved?.workspacePath === workspacePath && saved?.chatId === s.chat?.id;
        const t3 = matches ? saved.task : s.task;
        el2("task-name").value = t3?.name ?? s.workspace?.name ?? "";
        el2("task-mode").value = t3?.mode ?? "workflow";
        el2("task-source").value = t3?.source ?? "new";
        el2("task-acceptance").value = t3?.acceptance ?? "";
        el2("allow-side-effects").checked = t3?.allowSideEffects ?? false;
        if (t3?.originalAppId)
          options2(
            "original-app",
            [{ value: t3.originalAppId, label: "\u5DF2\u9009\u5E94\u7528 \xB7 " + t3.originalAppId }],
            t3.originalAppId
          );
        el2("existing-app-field").hidden = value2("task-source") !== "existing";
        input.value = matches ? saved.input ?? "" : "";
        resizeInput();
      }
      if (s.chat) renderChat(s.chat);
      initialized2 = true;
      readiness();
    }
    function toggleOptions() {
      el2("chat-options").hidden = !el2("chat-options").hidden;
    }
    for (const id of ["toggle-options", "add-context"])
      el2(id).addEventListener("click", toggleOptions);
    el2("close-options").addEventListener("click", () => el2("chat-options").hidden = true);
    el2("task-source").addEventListener("change", () => {
      el2("existing-app-field").hidden = value2("task-source") !== "existing";
      draft();
    });
    el2("task-mode").addEventListener("change", draft);
    el2("chat-options").addEventListener("input", draft);
    el2("chat-options").addEventListener("change", draft);
    input.addEventListener("input", () => {
      resizeInput();
      draft();
      if (state2) readiness();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (!el2("send-chat").disabled)
          el2("chat-form").requestSubmit();
      }
    });
    document.querySelectorAll("[data-suggestion]").forEach(
      (button) => button.addEventListener("click", () => {
        input.value = button.dataset.suggestion;
        if (!conversation?.hasTask) el2("task-mode").value = button.dataset.mode;
        resizeInput();
        draft();
        readiness();
        input.focus();
      })
    );
    el2("load-apps").addEventListener(
      "click",
      () => void command("loadApps").then((r) => {
        if (!r) return;
        options2("original-app", [
          { value: "", label: "\u8BF7\u9009\u62E9\u5E94\u7528" },
          ...r.apps.map((a) => ({
            value: a.id,
            label: a.name + " \xB7 " + (a.mode === "workflow" ? "Workflow" : "Chatflow")
          }))
        ]);
        el2("original-app").onchange = () => {
          const app = r.apps.find((a) => a.id === value2("original-app"));
          if (app) {
            el2("task-name").value = app.name;
            el2("task-mode").value = app.mode;
          }
          draft();
        };
      })
    );
    el2("new-chat").addEventListener(
      "click",
      () => void command("newChat").then(() => {
        el2("chat-options").hidden = true;
        draft();
        input.focus();
      })
    );
    el2("stop-chat").addEventListener("click", () => void command("cancel"));
    el2("resume-chat").addEventListener("click", () => void command("resumeTask", { followUp: "" }));
    el2("chat-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending || el2("send-chat").disabled) return;
      const payload = task();
      sending = true;
      input.value = "";
      resizeInput();
      draft();
      notice("");
      readiness();
      el2("chat-options").hidden = true;
      try {
        await request2("sendChat", payload);
      } catch (e2) {
        notice(e2 instanceof Error ? e2.message : String(e2), true);
        if (!conversation?.messages.some((m) => m.kind === "user" && m.text === payload.requirement))
          input.value = payload.requirement;
      } finally {
        sending = false;
        render2(await request2("getState"));
        resizeInput();
        draft();
        input.focus();
      }
    });
    return {
      render: render2,
      renderChat,
      activity: (status) => {
        if (state2?.taskRunning) el2("chat-status").textContent = t2(status);
      }
    };
  }

  // src/ui/client.ts
  var locale = document.body.dataset.locale === "en" ? "en" : "zh-CN";
  var t = (text) => translate(text, locale);
  var api = acquireAppApi();
  api.postMessage({ id: "renderer-ready", command: "rendererReady" });
  var page = document.body.dataset.page;
  var pending = /* @__PURE__ */ new Map();
  var state;
  var initialized = false;
  var dirtySettings = /* @__PURE__ */ new Set();
  var el = (id) => document.getElementById(id);
  var value = (id) => el(id).value;
  function message(id, text, error = false) {
    const e = el(id);
    if (e) {
      e.textContent = t(text);
      e.className = "message " + (error ? "error" : "success");
    }
  }
  function request(command, payload) {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => {
          pending.delete(id);
          reject(new Error("\u64CD\u4F5C\u4ECD\u672A\u8FD4\u56DE\u7ED3\u679C\uFF0C\u8BF7\u6838\u5BF9\u6267\u884C\u72B6\u6001\u540E\u91CD\u8BD5\u3002"));
        },
        ["startTask", "resumeTask", "sendChat"].includes(command) ? 130 * 6e4 : 10 * 6e4
      );
      pending.set(id, { resolve, reject, timer });
      api.postMessage({ id, command, payload });
    });
  }
  async function action(container, messageId, fn, success) {
    const buttons = container ? Array.from(container.querySelectorAll("button")) : [];
    buttons.forEach((b) => b.disabled = true);
    message(messageId, "\u5904\u7406\u4E2D\u2026");
    try {
      const r = await fn();
      message(messageId, success ?? "\u5DF2\u4FDD\u5B58");
      return r;
    } catch (e) {
      message(messageId, e instanceof Error ? e.message : String(e), true);
    } finally {
      buttons.forEach((b) => b.disabled = false);
      if (state) renderReadiness(state);
    }
  }
  function options(id, items, selected = "") {
    const select = el(id);
    select.replaceChildren();
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = t(item.label);
      select.append(option);
    }
    select.value = selected;
    if (select.selectedIndex < 0) select.selectedIndex = 0;
  }
  function renderReadiness(s) {
    if (page === "task") return;
    {
      el("connection-status").textContent = t(s.connection ? "\u5DF2\u4FDD\u5B58" : "\u672A\u914D\u7F6E");
      el("connection-status").classList.toggle("ready", Boolean(s.connection));
      el("model-status").textContent = t(s.model?.hasKey ? "\u5DF2\u4FDD\u5B58" : "\u672A\u914D\u7F6E");
      el("model-status").classList.toggle("ready", Boolean(s.model?.hasKey));
      el("password-hint").textContent = t(
        s.connection?.hasPassword ? "\u5DF2\u4FDD\u5B58\u5BC6\u7801\uFF0C\u7559\u7A7A\u53EF\u7EE7\u7EED\u4F7F\u7528\uFF1B\u586B\u5199\u65B0\u503C\u4F1A\u66FF\u6362\u3002" : "\u5BC6\u7801\u4E0E\u4F1A\u8BDD\u4FDD\u5B58\u5728\u7CFB\u7EDF\u5B89\u5168\u51ED\u636E\u5B58\u50A8\u4E2D\u3002"
      );
      el("key-hint").textContent = t(
        s.model?.hasKey ? "\u5DF2\u4FDD\u5B58\u5BC6\u94A5\uFF0C\u540C\u4E00\u4F9B\u5E94\u5546\u4E0E\u5730\u5740\u7559\u7A7A\u53EF\u4FDD\u7559\u3002" : "\u5BC6\u94A5\u4EC5\u4FDD\u5B58\u5728\u5B89\u5168\u51ED\u636E\u5B58\u50A8\u4E2D\u3002"
      );
      el("capability-metrics").hidden = !s.capabilities;
      if (s.capabilities) {
        el("tool-count").textContent = String(s.capabilities.tools);
        el("model-count").textContent = String(s.capabilities.models);
        el("dataset-count").textContent = String(s.capabilities.datasets);
        el("sync-summary").textContent = `${locale === "en" ? "Last sync: " : "\u4E0A\u6B21\u540C\u6B65\uFF1A"}${new Date(s.capabilities.fetchedAt).toLocaleString()}${s.capabilities.complete ? " \xB7 " + t("\u4FE1\u606F\u5B8C\u6574") : " \xB7 " + s.capabilities.issues.join("; ")}`;
      }
      document.querySelectorAll("form button").forEach((b) => b.disabled = s.busy);
    }
  }
  function updateProvider(defaults = false) {
    const p = value("model-provider");
    el("provider-id-field").hidden = p !== "other";
    el("model-url-field").hidden = p === "other";
    el("provider-id").required = p === "other";
    el("model-url").required = p !== "other";
    if (defaults) {
      el("model-url").value = p === "deepseek" ? "https://api.deepseek.com/v1" : p === "openai" ? "https://api.openai.com/v1" : "";
      el("model-id").value = "";
      el("model-key").value = "";
    }
  }
  function render(s) {
    state = s;
    locale = s.locale;
    if (page === "task") {
      chatUi?.render(s);
      return;
    }
    {
      el("ui-language").value = s.language;
      if (!initialized || !dirtySettings.has("connection-form")) {
        el("dify-url").value = s.connection?.baseUrl ?? "";
        el("dify-version").value = s.connection?.version ?? "1.14.2";
        el("dify-email").value = s.connection?.email ?? "";
      }
      if (!initialized || !dirtySettings.has("model-form")) {
        const m = s.model;
        el("model-provider").value = m && ["deepseek", "openai", "custom"].includes(m.provider) ? m.provider : m ? "other" : "deepseek";
        el("provider-id").value = m?.provider ?? "";
        el("model-url").value = m?.baseUrl ?? (m ? "" : "https://api.deepseek.com/v1");
        el("model-id").value = m?.model ?? "";
        updateProvider();
      }
      if (!initialized || !dirtySettings.has("limits-form")) {
        el("max-repairs").value = String(s.limits.maxRepairs);
        el("timeout-minutes").value = String(s.limits.timeoutMinutes);
        el("generation-budget").value = String(s.limits.generationTokenBudget);
        el("dify-budget").value = String(s.limits.difyTokenBudget);
        el("opencode-path").value = s.limits.opencodePath;
      }
      if (!dirtySettings.has("runtime-form"))
        options(
          "runtime-model",
          [
            { value: "", label: "\u8BA9 Agent \u6839\u636E\u9700\u6C42\u9009\u62E9" },
            ...s.runtimeModels.map((m) => ({
              value: JSON.stringify({ provider: m.provider, model: m.model }),
              label: m.model + " \xB7 " + m.provider
            }))
          ],
          s.runtimeModel ? JSON.stringify(s.runtimeModel) : ""
        );
    }
    initialized = true;
    renderReadiness(s);
  }
  var chatUi = page === "task" ? setupChat(request, api) : void 0;
  window.addEventListener("message", (e) => {
    const m = e.data;
    if (m.type === "response") {
      const p = pending.get(m.id);
      if (p) {
        clearTimeout(p.timer);
        pending.delete(m.id);
        m.error ? p.reject(new Error(m.error)) : p.resolve(m.result);
      }
    } else if (m.type === "state") render(m.state);
    else if (m.type === "chat" && page === "task") chatUi?.renderChat(m.chat);
    else if (m.type === "activity" && page === "task") chatUi?.activity(m.status);
  });
  document.querySelectorAll("[data-command]").forEach(
    (b) => b.addEventListener(
      "click",
      () => void action(
        void 0,
        "global-message",
        () => request(b.dataset.command),
        ["settings", "selectFolder", "showTask"].includes(b.dataset.command) ? "" : "\u64CD\u4F5C\u5B8C\u6210"
      )
    )
  );
  if (page === "settings") {
    el("ui-language").addEventListener(
      "change",
      () => void action(
        void 0,
        "global-message",
        () => request("saveLanguage", value("ui-language")),
        ""
      )
    );
    document.querySelectorAll("form").forEach((f) => f.addEventListener("input", () => dirtySettings.add(f.id)));
    el("model-provider").addEventListener("change", () => updateProvider(true));
    el("connection-form").addEventListener("submit", (e) => {
      e.preventDefault();
      void action(
        el("connection-form"),
        "connection-message",
        async () => {
          const r = await request("connectForm", {
            baseUrl: value("dify-url"),
            version: value("dify-version"),
            email: value("dify-email"),
            password: value("dify-password")
          });
          el("dify-password").value = "";
          if (r.workspaces) {
            options(
              "dify-workspace",
              r.workspaces.map((w) => ({
                value: w.id,
                label: w.name + (w.current ? " \xB7 \u5F53\u524D\u7A7A\u95F4" : "")
              })),
              r.workspaces.find((w) => w.current)?.id
            );
            el("workspace-choice").hidden = false;
            message("connection-message", "\u767B\u5F55\u6210\u529F\uFF0C\u8BF7\u9009\u62E9\u5DE5\u4F5C\u7A7A\u95F4\u540E\u4FDD\u5B58\u3002");
          } else {
            el("workspace-choice").hidden = true;
            dirtySettings.delete("connection-form");
            render(await request("getState"));
          }
          return r;
        },
        ""
      ).then((r) => {
        if (r)
          message(
            "connection-message",
            r.workspaces ? "\u767B\u5F55\u6210\u529F\uFF0C\u8BF7\u9009\u62E9\u5DE5\u4F5C\u7A7A\u95F4\u540E\u4FDD\u5B58\u3002" : "\u8FDE\u63A5\u5DF2\u4FDD\u5B58\uFF0C\u80FD\u529B\u540C\u6B65\u5B8C\u6210\u3002"
          );
      });
    });
    el("confirm-workspace").addEventListener(
      "click",
      () => void action(
        el("connection-form"),
        "connection-message",
        async () => {
          await request("selectWorkspace", { id: value("dify-workspace") });
          el("workspace-choice").hidden = true;
          dirtySettings.delete("connection-form");
          render(await request("getState"));
        },
        "\u8FDE\u63A5\u5DF2\u4FDD\u5B58\uFF0C\u80FD\u529B\u540C\u6B65\u5B8C\u6210\u3002"
      )
    );
    const modelPayload = () => ({
      provider: value("model-provider") === "other" ? value("provider-id") : value("model-provider"),
      baseUrl: value("model-provider") === "other" ? void 0 : value("model-url"),
      model: value("model-id"),
      apiKey: value("model-key")
    });
    el("model-form").addEventListener("submit", (e) => {
      e.preventDefault();
      void action(
        el("model-form"),
        "model-message",
        async () => {
          await request("saveModel", modelPayload());
          el("model-key").value = "";
          dirtySettings.delete("model-form");
          render(await request("getState"));
        },
        "\u751F\u6210\u6A21\u578B\u5DF2\u4FDD\u5B58\u3002"
      );
    });
    el("discover-models").addEventListener(
      "click",
      () => void action(
        el("model-form"),
        "model-message",
        async () => {
          const payload = modelPayload();
          const { model, ...discovery } = payload;
          const r = await request("discoverModels", discovery);
          el("generation-models").replaceChildren();
          for (const id of r.models) {
            const o = document.createElement("option");
            o.value = id;
            el("generation-models").append(o);
          }
          if (r.models.length && !value("model-id"))
            el("model-id").value = r.models[0];
          message("model-message", `\u5DF2\u8BFB\u53D6 ${r.models.length} \u4E2A\u6A21\u578B\uFF0C\u53EF\u5728\u751F\u6210\u6A21\u578B\u8F93\u5165\u6846\u4E2D\u9009\u62E9\u3002`);
          return r;
        },
        ""
      ).then((r) => {
        if (r)
          message(
            "model-message",
            `\u5DF2\u8BFB\u53D6 ${r.models.length} \u4E2A\u6A21\u578B\uFF0C\u53EF\u5728\u751F\u6210\u6A21\u578B\u8F93\u5165\u6846\u4E2D\u9009\u62E9\u3002`
          );
      })
    );
    el("runtime-form").addEventListener("submit", (e) => {
      e.preventDefault();
      void action(
        el("runtime-form"),
        "runtime-message",
        async () => {
          await request(
            "saveRuntime",
            value("runtime-model") ? JSON.parse(value("runtime-model")) : null
          );
          dirtySettings.delete("runtime-form");
          render(await request("getState"));
        },
        "\u8FD0\u884C\u6A21\u578B\u504F\u597D\u5DF2\u4FDD\u5B58\u3002"
      );
    });
    el("limits-form").addEventListener("submit", (e) => {
      e.preventDefault();
      void action(
        el("limits-form"),
        "limits-message",
        async () => {
          await request("saveLimits", {
            maxRepairs: Number(value("max-repairs")),
            timeoutMinutes: Number(value("timeout-minutes")),
            generationTokenBudget: Number(value("generation-budget")),
            difyTokenBudget: Number(value("dify-budget")),
            opencodePath: value("opencode-path")
          });
          dirtySettings.delete("limits-form");
          render(await request("getState"));
        },
        "\u6267\u884C\u9650\u5236\u5DF2\u4FDD\u5B58\u3002"
      );
    });
  }
  void request("getState").then(async (state2) => {
    render(state2);
    await request("pageReady", { page });
  }).catch((e) => message("global-message", e.message, true));
})();
