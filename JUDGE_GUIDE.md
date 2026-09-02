# MCPation — judge guide

## Run the live app

Open <https://mcpation.vercel.app/> in ChatGPT's in-app browser or a WebMCP-enabled Chrome. The page should show **11 Codex tools ready** after registration.

For a deterministic run, use the repository's `demo-workspace` folder. The page asks for one explicit folder grant/import; if the browser cannot grant host access, Codex can request the native host handoff. It does not ask for a token, install, extension, or local service.

## Suggested Codex prompt

```text
Use the active MCPation WebMCP tools as a Codex pre-flight gate.
1. Call codex_scan_workspace.
2. Call codex_get_tool_inventory, codex_get_instruction_chain, codex_get_findings, and codex_get_access_scope.
3. Explain the most important finding using codex_explain_finding.
4. Call codex_plan_hardening and summarize deterministic versus manual actions.
5. If the page reports preview/import scope, call codex_request_host_handoff with `{"operation":"scan"}` before asking Codex to read host files.
Do not reveal secrets, raw instruction text, full local paths, or package file contents.
Do not apply anything until I explicitly choose action ids.
```

## Expected fixture evidence

The fixture should produce evidence for:

- a duplicate `filesystem` MCP declared in Codex TOML and project `.mcp.json`;
- a disabled `docs` server;
- an invalid `legacy-search` URL;
- MCP-related dependencies in `package.json`;
- one `AGENTS.md` and one Codex `SKILL.md` in the instruction chain.

The dashboard should show a readiness score below 100, a declared surface with both configured servers and package signals, findings, and a hardening plan. Static package evidence must be labeled as non-live.

## Apply path through the Codex host handoff

The page cannot call Codex's native filesystem API. After the plan returns an exact deterministic action id, ask Codex to call:

```json
{"operation":"apply","actionIds":["<id returned by codex_plan_hardening>"]}
```

Codex should request native host filesystem write approval for the current workspace root, use `fs/readFile` + `fs/copy` + `fs/writeFile` (or the host's equivalent), and change only the listed JSON key. It then calls `codex_submit_host_snapshot` with the refreshed allowlisted files and `codex_verify_workspace`. The handoff is a request contract, not a claim that the web page performed the write.

## Apply path (direct-access browser)

If the browser grants read/write access, select the deterministic duplicate proposal and use the visible **Back up & apply** button or ask Codex to call:

```json
{"actionIds":["<id returned by codex_plan_hardening>"],"confirm":true}
```

The result must report applied ids, a sibling `.mcpation-*.bak`, and a fresh scan. Then call `codex_verify_workspace`; the duplicate finding should be gone. The tool rejects unknown ids and never writes TOML, commands, policies, or instruction text.

If the embedded browser provides only a directory import preview, the apply control remains disabled by design, but the Codex host handoff remains available. Discovery, explanation, planning, native approval, snapshot submission, and verification can still complete without reopening the page elsewhere.

## What to verify

1. Tools are registered at top-level `document.modelContext` and are discoverable by Codex.
2. The page and Codex show the same readiness state.
3. The permission boundary says **selected workspace**, never full disk.
4. No token, environment value, header, raw file content, or full absolute path appears in tool output.
5. Downloaded MCP code is never executed.
6. The apply tool is visibly non-read-only, requires exact current action ids, and either creates a backup in direct mode or returns a host handoff that requires native approval, backup, and verification data.
