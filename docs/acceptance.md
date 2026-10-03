# Live-environment acceptance

[English](acceptance.md) · [简体中文](acceptance.zh-CN.md)

A target environment needs a root or Console API URL, an exact deployment version, an account permitted to read tools and edit apps, a configured runtime model, and approved business test data. Enter passwords and keys only in the browser application's Settings fields.

## Interface checks

- [ ] Confirm Dify's exact version from the image tag or an administrator. Add an adapter first if it differs from 1.14.2 or 1.17.1.
- [ ] Verify cookie/CSRF login, workspace selection, and permissions.
- [ ] Discover built-in, API, workflow, and MCP tools. Distinguish identical display names and permission failures from empty catalogs.
- [ ] Read real tool parameters, nested schemas, dynamic options, and outputs.
- [ ] Import `examples/workflow`, resolve dependencies, run the draft, publish, and inspect the resulting app.
- [ ] Import `examples/chatflow`, run multiple turns, verify isolated conversations and `message_end`.

## Five business cases

1. Give only a business goal. The agent selects at least two existing tools, records their identities and parameter sources, connects outputs, and passes frozen assertions.
2. A Chatflow asks for missing information, then uses context to call actual tools. Cases use isolated conversations, restarted after DSL changes.
3. Change tool parameters or remove a tool. A refresh invalidates stale definitions and requires new tests.
4. Improve an existing app only through a test copy. Declining promotion leaves the original unchanged; concurrent edits block overwriting.
5. Interrupt model calls, imports, and publication separately. Recovery must not create duplicate apps, replay ambiguous publication, or overwrite an ambiguous update.

## Conditions for a verified release

- [ ] Every supported generated node imports and runs on the actual target version.
- [ ] Workflow/Chatflow reports match test, candidate, and capability digests.
- [ ] Parameter/reference faults can be repaired; permission or credential problems stop appropriately.
- [ ] Tests cannot be weakened. Candidate, remote draft, or dependency changes invalidate publication evidence.
- [ ] Original-app promotion has confirmation, conflict detection, a DSL backup, and a deployment record.
- [ ] Native engine tests and npm package installation pass on macOS ARM64, Windows x64, and Linux x64.
- [ ] Redacted live evidence is archived before changing the compatibility matrix. Fixture results remain explicitly marked as mocked.

Run tests only within authorized business scopes. Reports can contain business outputs; do not publish unredacted reports.
