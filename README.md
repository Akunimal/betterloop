# MCPation — Codex Environment Doctor

**Make Codex ready before it runs.** MCPation is a browser-native WebMCP app that turns one explicitly granted workspace into an explainable readiness gate for MCP configuration, downloaded MCP package signals, `AGENTS.md`, and Codex skills.

The agent and the person see the same state: Codex can scan, explain a finding, propose hardening, apply only an exact deterministic cleanup, and verify the result. Nothing is installed and no model/API key is needed.

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
- `codex_explain_finding` — explain one finding by its current id.
- `codex_plan_hardening` — produce a review-only plan with deterministic and manual actions separated.
- `codex_apply_hardening` — after explicit review, create a sibling backup and apply selected duplicate JSON cleanup.
- `codex_verify_workspace` — rescan after a change and return the new score and findings.
- `codex_get_access_scope` — explain the exact browser-granted boundary and privacy guarantees.

Read-only tools are annotated `readOnlyHint: true`. The apply tool is explicitly non-read-only and requires `actionIds` from the latest plan plus `confirm: true`; it never invents commands, URLs, policy, or instruction text.

## What is scanned

The user selects a **workspace folder**, not the whole computer. The browser reads only an allowlist, bounded by depth and file count:

- Codex and project MCP config (`.codex/config.toml`, `.mcp.json`, `mcp.json`).
- Package evidence (`package.json`, `pyproject.toml`, requirements and lockfiles) for MCP-related dependencies.
- `AGENTS.md`, `AGENTS.override.md`, and `skills/**/SKILL.md` metadata.

Downloaded MCP code is never executed. Package entries are static evidence; they are not presented as live runtime tools. Secrets, environment values, headers, raw instructions, and full local paths never leave the tab through WebMCP.

## Permission model

A normal web page starts with no filesystem access. The visible **Connect workspace folder** action requests the browser's native directory permission. Direct-access browsers can create a sibling backup and apply selected JSON cleanup. Codex's embedded browser may expose a read-only directory import; in that mode diagnosis and WebMCP still work, while the apply action correctly remains disabled.

This is the honest WebMCP boundary: WebMCP exposes page actions to Codex, but it does not bypass browser permissions or grant arbitrary operating-system access.

## Try the deterministic demo

The repository includes [`demo-workspace`](demo-workspace) with safe, intentionally imperfect evidence: a duplicate filesystem MCP declaration, one disabled server, an invalid URL, MCP package dependencies, and Codex guidance files.

1. Open the deployed app: <https://mcpation.vercel.app/>.
2. Choose `demo-workspace` in the folder picker/import flow.
3. Let Codex call `codex_scan_workspace`, `codex_get_tool_inventory`, `codex_get_findings`, and `codex_plan_hardening`.
4. Review the duplicate proposal. In a direct-access browser, call `codex_apply_hardening` with the exact action id and then `codex_verify_workspace`.

## Local development

```bash
npm install
npm run dev
npm run verify
```

`npm run verify` builds the Vite app, type-checks TypeScript, runs analysis/tool-input tests, and checks the submission surface.

## Architecture

```text
visible folder grant
        ↓
bounded browser file reader
        ↓
deterministic Codex readiness analyzer
        ↓
document.modelContext WebMCP tools
        ↓
human-reviewed hardening + backup
        ↓
rescan and verification
```

The implementation is client-side (`src/codex-analysis.ts`, `src/mcp-files.ts`) and uses no daemon, browser extension, local companion, Gemini key, or remote model call.
