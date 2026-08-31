# BetterLoop state

## Current milestone

The app is a polished WebMCP demo for agent continuity. The old file-transfer prototype has been removed from the active source, public assets, and documentation. Git history remains available for archaeology.

## Implemented

- BetterLoop rebrand in UI, metadata, package name, demo copy, and docs.
- Explicit ON/OFF activation with default OFF.
- Native WebMCP registration through document.modelContext when the Codex host exposes Site Tools.
- Local WebMCP polyfill for visible demos outside a native host.
- Nine page continuity tools plus a project-scoped, model-compatible STDIO MCP host with the same continuity contract.
- Compact control surface with grouped feature toggles.
- Optional Auto-continue and “Is the job 100% done?” behavior.
- Five-hour quota recovery heuristic without blocking the browser.
- Optional browser sound alert unlocked by the activation gesture.
- Local visual event timeline.
- Project-local Codex Stop hook with stop_hook_active loop protection.
- Capability-aware post-activation status: native WebMCP, connected host MCP, or a truthful restart-required state.
- Public interactive demo plus a reproducible judge guide for the full agent-integrated path.

## Known boundary

WebMCP gives a page a discoverable tool contract; the page does not get arbitrary control over Codex’s host process. The supported fallback is now a project-scoped STDIO MCP server. Codex starts it from `.codex/config.toml`, while the visible page controls a short-lived activation session through the server’s loopback control plane. The server refuses continuity actions until that consent arrives and clears the session when the heartbeat expires.

The Stop hook consults the host session when the MCP process is available. This keeps BetterLoop inert while the page is OFF and applies the selected toggles while it is ON. Native WebMCP remains the preferred path; the standard local MCP is the compatibility path for hosts where native Site Tools are unavailable, including the current Luna configuration. A different MCP-capable model can consume the same server contract.

The remaining boundary is honest and intentional: a page cannot silently edit Codex’s global configuration or hot-reload the tool catalog of an already-running session. The project MCP is reviewable and may require one trust/restart step. After that, activation is one visible button and the MCP process lasts only as long as the Codex session.

## Files

- src/components/LoopDashboard.tsx — product UI and demo controls.
- src/state/loopStore.ts — local run state, checkpoints, verification, and quota lifecycle.
- src/webmcp/betterLoopTools.ts — WebMCP tools and registration.
- src/webmcp/polyfill.ts — native-context detection and demo fallback.
- scripts/betterloop-stop.cjs — synchronous Codex Stop hook.
- scripts/betterloop-mcp.cjs — standard STDIO MCP server and temporary localhost activation bridge.
- .codex/hooks.json — project hook definition.
- .codex/config.toml — project-scoped MCP connection; intentionally not global.
- .betterloop/config.example.json — optional host hook configuration.
- JUDGE_GUIDE.md — public demo, Codex, and other MCP-capable host instructions.
