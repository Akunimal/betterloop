# MCPation — submission brief

## One-line pitch

MCPation is a WebMCP-powered **Codex Environment Doctor**: select one workspace, let Codex discover the MCP and instruction surface, explain the readiness risks, approve a precise hardening patch, and verify the result.

## The problem

Codex workspaces quietly accumulate MCP definitions, package dependencies, `AGENTS.md` layers, and skills. A server can be duplicated between Codex and a project manifest, disabled without explanation, pointed at an invalid endpoint, or accompanied by guidance that the next agent will interpret differently. Existing dashboards show configuration; they do not turn it into a shared, reviewable pre-flight decision.

## What people and agents do together

The person grants a bounded workspace and sees every scope and proposed change. Codex uses the same page's WebMCP tools to scan, inspect the declared tool surface, ask for the evidence behind a finding, propose hardening, and independently verify the post-change state. The person chooses the exact action; MCPation then requests a browser write escalation for that already selected folder, saves the original in `.mcpation-backups/`, applies only the supported JSON cleanup, and rescans.

This is materially better than a generic report because the workflow ends in a safe, observable decision: **ready, review, or pause** before the next agent run.

## Why WebMCP is essential

The product is not a separate MCP server. Its value is the live shared surface between the user and Codex:

- The page exposes precise, structured tools through top-level `document.modelContext`.
- Tool calls update the same visible readiness gate the user is reviewing.
- Schemas distinguish read-only inspection, a host-capability fallback contract, snapshot submission, and a non-read-only apply action.
- The browser apply flow accepts only exact ids returned by the current plan and requires a separate native browser permission grant, a sibling backup, and a fresh rescan. A WebMCP tool call cannot silently trigger that browser prompt.
- No daemon, extension, companion, Gemini key, or second account is required.

## The broader concept

MCPation is also a proof of concept for a wider WebMCP idea: an agent-native capability does not always need to be installed as a separate MCP server, desktop extension, or local daemon. A web page can expose a bounded, structured, visible tool surface exactly where a person is already making decisions. Here that surface is workspace readiness and supervised cleanup; the same pattern could expand to onboarding, compliance checks, migration review, release gates, data exploration, or any workflow where people need to see and approve what an agent does.

WebMCP does not replace every installed MCP. It makes a complementary class of experiences possible: lightweight, browser-native tools that share state with the person, preserve explicit permissions, and require no setup beyond opening the page.

## Safety and scope

The user selects a workspace folder; MCPation never claims whole-system access. Discovery is allowlisted and bounded. A supported write requires a browser `readwrite` escalation for that same handle, never a second folder selection. Originals go to `.mcpation-backups/`, which MCPation adds to an existing `.gitignore` when needed. Downloaded MCP code is not executed. Package manifests are static evidence, not proof of live tools. WebMCP results omit secrets, environment values, headers, raw instructions, and full local paths. Ambiguous commands, TOML edits, policy changes, and instruction rewrites remain manual.

## Demo story

The repository contains `demo-workspace`, a safe fixture with:

- the same filesystem MCP declared in Codex TOML and a project `.mcp.json`;
- a disabled documentation MCP;
- an invalid URL;
- MCP package dependencies in `package.json`;
- `AGENTS.md` and a Codex `SKILL.md`.

The live app turns that fixture into a visible readiness score, a declared tool inventory, evidence cards, and a supervised duplicate-cleanup plan. The initial browser selection is read-only; after the user checks the exact JSON action, the browser escalates write access for that same selected folder. MCPation backs up, applies, and rescans; Codex then verifies the same page state.

## Implementation notes

- React + Vite + TypeScript.
- `src/codex-analysis.ts` enriches deterministic MCP parsing with workspace artifact, package, instruction-chain, and readiness analysis.
- `src/mcp-files.ts` owns native browser permission, bounded discovery, import fallback, backups, writes, and rescans.
- `src/mcpation.ts` registers the WebMCP surface and validates tool arguments.
- `scripts/mcpation-tests.ts` covers parsing, redaction, package/instruction discovery, readiness, and write-input validation.

## Judging alignment

- **WebMCP leverage:** twelve meaningful tools, including a deterministic workspace evidence graph, precise schemas, explicit annotations, a host fallback contract, and a real browser apply/agent-verify loop.
- **Execution:** hosted Vite app, responsive UI, deterministic fixture, tests, build, and verification command.
- **Potential impact:** a specific pre-flight problem for people who use multiple MCPs and Codex instructions.
- **Creativity and ambition:** treats an agent's tool/instruction surface as something a human can audit and harden together, rather than another passive settings page.
