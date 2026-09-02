# MCPation — judge guide

## Run the live app

Open <https://mcpation.vercel.app/> in ChatGPT's in-app browser or a WebMCP-enabled Chrome. The page should show **9 Codex tools ready** after registration.

For a deterministic run, use the repository's `demo-workspace` folder. The page asks for one explicit folder grant/import; it does not ask for a token, install, extension, or local service.

## Suggested Codex prompt

```text
Use the active MCPation WebMCP tools as a Codex pre-flight gate.
1. Call codex_scan_workspace.
2. Call codex_get_tool_inventory, codex_get_instruction_chain, codex_get_findings, and codex_get_access_scope.
3. Explain the most important finding using codex_explain_finding.
4. Call codex_plan_hardening and summarize deterministic versus manual actions.
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

## Apply path (direct-access browser)

If the browser grants read/write access, select the deterministic duplicate proposal and use the visible **Back up & apply** button or ask Codex to call:

```json
{"actionIds":["<id returned by codex_plan_hardening>"],"confirm":true}
```

The result must report applied ids, a sibling `.mcpation-*.bak`, and a fresh scan. Then call `codex_verify_workspace`; the duplicate finding should be gone. The tool rejects unknown ids and never writes TOML, commands, policies, or instruction text.

If the embedded browser provides read-only directory import, the apply control remains disabled by design. Discovery, explanation, planning, and WebMCP registration still work and the scope card says **Browser read-only**.

## What to verify

1. Tools are registered at top-level `document.modelContext` and are discoverable by Codex.
2. The page and Codex show the same readiness state.
3. The permission boundary says **selected workspace**, never full disk.
4. No token, environment value, header, raw file content, or full absolute path appears in tool output.
5. Downloaded MCP code is never executed.
6. The apply tool is visibly non-read-only, requires exact current action ids, creates a backup, and returns verification data.
