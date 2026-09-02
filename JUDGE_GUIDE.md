# MCPation — judge guide

## Run the live app

Open <https://mcpation.vercel.app/> in ChatGPT's in-app browser or Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled and Chrome relaunched. The page should show **12 Codex tools ready** after registration. In Chrome, the Model Context Tool Inspector can list and manually call the same registered tools. If `document.modelContext` is unavailable, the page accurately labels itself as a local preview rather than claiming native tools are available.

## Validation record

The submission's primary demo environment is Codex's in-app browser. Record the public video and primary end-to-end test there; Chrome support uses the same native `document.modelContext.registerTool` implementation and the deployment sends the WebMCP-required origin-isolation and same-origin `tools` permission-policy headers. This distinction is intentional: MCPation never represents a local fallback preview as a native WebMCP test.

For a deterministic run, use the repository's `demo-workspace` folder. In Chrome, open the app with `?browser=chrome`; it uses one native folder picker and one bounded workspace grant for the supported cleanup. Codex's embedded browser uses the stable read-only import path for analysis and review. It saves originals in `.mcpation-backups/` and adds that directory to an existing `.gitignore` when needed. It does not ask for a token, install, extension, or local service.

## Suggested Codex prompt

```text
Use the active MCPation WebMCP tools as a Codex pre-flight gate.
1. Call codex_scan_workspace.
2. Call codex_get_tool_inventory, codex_get_instruction_chain, codex_get_workspace_graph, codex_get_findings, and codex_get_access_scope.
3. Explain the most important finding using codex_explain_finding.
4. Call codex_plan_hardening and summarize deterministic versus manual actions.
5. Do not apply anything until the person has selected exact action ids in the visible page. After the browser-approved cleanup finishes, call `codex_verify_workspace` and report the resulting readiness and remaining findings.
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

## Browser-approved apply path

After the plan returns an exact deterministic action id, the person selects it in MCPation's Chrome `?browser=chrome` view and clicks **Approve & apply**. The browser uses the folder already selected; it does not ask the person to browse for it again. MCPation stores the original in `.mcpation-backups/`, updates an existing `.gitignore` when needed, changes only the listed JSON key, and rescans. Codex then calls `codex_verify_workspace` to independently review the shared result. The tool-level host handoff remains a fallback contract because an agent tool call cannot open a user-gesture browser permission dialog.

## Browser preview and write path

Selecting a folder starts read-only by design. The browser analyzes only allowlisted files. Chrome's `?browser=chrome` apply control is enabled only for an exact deterministic JSON cleanup selected by the person and uses that same folder handle. Codex's embedded import path remains read-only. Discovery, explanation, planning, native browser approval, cleanup, rescan, and Codex verification complete without reopening the page elsewhere.

## What to verify

1. Tools are registered at top-level `document.modelContext` and are discoverable by Codex.
2. The page and Codex show the same readiness state.
3. The permission boundary says **selected workspace**, never full disk.
4. No token, environment value, header, raw file content, or full absolute path appears in tool output.
5. Downloaded MCP code is never executed.
6. The apply flow is visibly non-read-only, requires exact current action ids, requires a separate browser write grant, creates a sibling backup, and rescans before Codex verifies.
