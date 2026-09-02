# MCPation — Codex Environment Doctor

**Make Codex ready before it runs.** MCPation is a browser-native WebMCP app that turns one explicitly granted workspace into an explainable readiness gate for MCP configuration, downloaded MCP package signals, `AGENTS.md`, and Codex skills. **Emancipate your workspace from what no longer serves it.**

The agent and the person see the same state: Codex can scan, explain a finding, propose hardening, request a native host capability when the page needs it, apply only an exact deterministic cleanup, and verify the result. Nothing is installed and no model/API key is needed.

## Why this matters

As MCP servers and agent instructions accumulate, Codex can inherit duplicate servers, disabled entries, invalid endpoints, package/config drift, or conflicting guidance. MCPation answers a practical pre-flight question:

> **What can this workspace tell Codex, what looks risky, and which safe changes are worth approving before the next run?**

It is an environment readiness check, not a hidden full-disk cleaner and not a runtime claim about whether a server is currently alive.

## WebMCP tools

The page registers these top-level `document.modelContext` tools when WebMCP is available:

- `codex_scan_workspace` — rescan the granted workspace and return the sanitized readiness report.
- `codex_get_tool_inventory` — inspect configured MCP servers and static MCP-related package evidence.
- `codex_get_findings` — read readiness findings and the score.
- `codex_get_instruction_chain` — inspect ordered `AGENTS.md` and `SKILL.md` metadata without returning their text.
- `codex_get_workspace_graph` — map sanitized evidence from workspace artifacts to declared MCP signals and current findings.
- `codex_explain_finding` — explain one finding by its current id.
- `codex_plan_hardening` — produce a review-only plan with deterministic and manual actions separated.
- `codex_request_host_handoff` — return a bounded read/write handshake for Codex's native host permission flow.
- `codex_submit_host_snapshot` — ingest an allowlisted snapshot read by Codex after host approval and update the shared page.
- `codex_apply_hardening` — after explicit review, create a sibling backup and apply selected duplicate JSON cleanup.
- `codex_verify_workspace` — rescan after a change and return the new score and findings.
- `codex_get_access_scope` — explain the exact browser-granted boundary and privacy guarantees.

Read-only tools are annotated `readOnlyHint: true`. The apply tool is explicitly non-read-only and requires `actionIds` from the latest plan plus `confirm: true`; its tool response is a precise Codex host-handoff contract because a tool call cannot open a browser permission dialog. The visible browser flow can apply a supported cleanup after the person explicitly grants write access to the selected folder. It never invents commands, URLs, policy, or instruction text.

## What is scanned

The user selects a **workspace folder**, not the whole computer. The browser reads only an allowlist, bounded by depth and file count:

- Codex and project MCP config (`.codex/config.toml`, `.mcp.json`, `mcp.json`).
- Package evidence (`package.json`, `pyproject.toml`, requirements and lockfiles) for MCP-related dependencies.
- `AGENTS.md`, `AGENTS.override.md`, and `skills/**/SKILL.md` metadata.

Downloaded MCP code is never executed. Package entries are static evidence; they are not presented as live runtime tools. Secrets, environment values, headers, raw instructions, and full local paths never leave the tab through WebMCP.

## Permission model

A normal web page starts with no filesystem access. In Chrome, open the app with `?browser=chrome`: **Choose workspace folder** is the one native folder picker and one bounded workspace grant. MCPation initially only analyzes allowlisted files; it writes only after the person checks an exact supported cleanup and confirms **Approve & apply**. In Codex's embedded browser, the same button uses the stable read-only folder import so WebMCP analysis and review still work. It stores the original under `.mcpation-backups/`, adds that directory to an existing `.gitignore` when needed, applies only the checked JSON cleanup, and rescans.

MCPation registers native `document.modelContext` tools in supported WebMCP browser contexts, including ChatGPT's in-app browser and Chrome 149+ with WebMCP enabled. When that API is unavailable, it shows a local preview; the preview does not advertise native tools.

For Chrome, open `chrome://flags/#enable-webmcp-testing`, enable it, and relaunch. The deployed app sends `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`, which satisfy the WebMCP page requirements for this top-level, same-origin app. Chrome's Model Context Tool Inspector can list and manually invoke the registered tools.

This is the honest WebMCP boundary: WebMCP exposes the page's scoped, visible actions to Codex. Browser File System Access handles the optional, human-initiated write grant; Codex can independently scan and verify the shared result. The page never claims arbitrary operating-system access.

## Try the deterministic demo

The repository includes [`demo-workspace`](demo-workspace) with safe, intentionally imperfect evidence: a duplicate filesystem MCP declaration, one disabled server, an invalid URL, MCP package dependencies, and Codex guidance files.

1. Open the deployed app: <https://mcpation.vercel.app/> in Codex/ChatGPT's in-app browser, or in Chrome 149+ with the WebMCP testing flag enabled.
2. Choose `demo-workspace` in the folder picker/import flow.
3. Let Codex call `codex_scan_workspace`, `codex_get_tool_inventory`, `codex_get_findings`, and `codex_plan_hardening`.
4. In the Codex embed, review the duplicate proposal, select it, and click **Request Codex approval**. Ask Codex to execute the exact handoff in its current approved workspace, submit the refreshed snapshot, and verify it. For a direct browser write, Chrome also supports `https://mcpation.vercel.app/?browser=chrome` with **Approve & apply**.
5. Ask Codex to call `codex_verify_workspace` and report the current readiness, remaining findings, and what MCPation changed.

## Local development

```bash
npm install
npm run dev
npm run verify
```

`npm run verify` builds the Vite app, type-checks TypeScript, runs analysis/tool-input tests, and checks the submission surface.

## Architecture

```text
visible browser folder grant
        ↓
bounded browser file reader
        ↓
deterministic Codex readiness analyzer
        ↓
document.modelContext WebMCP tools
        ↘ write escalation for the same folder → exact JSON cleanup + .mcpation-backups/
        ↓                         ↘
human-reviewed hardening + backup ← Codex independently verifies current result
        ↓
rescan and verification
```

The implementation is client-side (`src/codex-analysis.ts`, `src/mcp-files.ts`) and uses no daemon, browser extension, local companion, Gemini key, or remote model call.

## A browser-native MCP pattern

MCPation is a concept for a broader class of agent experiences: not every useful MCP-like capability needs installation as a server, extension, or local daemon. WebMCP lets a page publish a scoped tool surface beside the human UI, so an agent can collaborate in the same state without a separate setup step. This project applies that pattern to Codex readiness; the same approach can extend to review gates, onboarding, compliance, migrations, and other supervised workflows.
