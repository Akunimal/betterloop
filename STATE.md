# BetterLoop state

## Current milestone

The app is a polished WebMCP demo for agent continuity. The old file-transfer prototype has been removed from the active source, public assets, and documentation. Git history remains available for archaeology.

## Implemented

- BetterLoop rebrand in UI, metadata, package name, demo copy, and docs.
- Explicit ON/OFF activation with default OFF.
- Native WebMCP registration through document.modelContext.
- Local WebMCP polyfill for visible demos outside a native host.
- Nine continuity tools, including a Codex hook-readiness handshake, for start, checkpoints, completion evidence, research-first blockers, quota recovery, resume, finish, and status.
- Compact control surface with grouped feature toggles.
- Optional Auto-continue and “Is the job 100% done?” behavior.
- Five-hour quota recovery heuristic without blocking the browser.
- Optional browser sound alert unlocked by the activation gesture.
- Local visual event timeline.
- Project-local Codex Stop hook with stop_hook_active loop protection.
- Explicit post-activation `NOT READY` banner that becomes `READY` only after Codex's trusted `SessionStart` hook tells the model to confirm through `betterloop_hook_ready`; otherwise it tells the user to trust/load the hook and restart or reopen Codex.

## Known boundary

WebMCP gives a page a discoverable tool contract; the page does not get arbitrary control over Codex’s host process. The Stop hook is the supported route for synchronous turn continuation, but project hooks must be trusted by Codex and can require a new session. A web page cannot silently write Codex configuration, inspect private quota state, or wake a closed session. BetterLoop now lets Codex perform the readiness check: a trusted `SessionStart` hook injects context, and Codex confirms the result by calling `betterloop_hook_ready`. Until that handshake arrives, the dashboard stays `NOT READY`.

The next production step would be a small local host/App Server bridge that synchronizes the page’s activation state with the hook and receives real Codex lifecycle events. It is intentionally documented as a follow-up, not presented as implemented.

## Files

- src/components/LoopDashboard.tsx — product UI and demo controls.
- src/state/loopStore.ts — local run state, checkpoints, verification, and quota lifecycle.
- src/webmcp/betterLoopTools.ts — WebMCP tools and registration.
- src/webmcp/polyfill.ts — native-context detection and demo fallback.
- scripts/betterloop-stop.cjs — synchronous Codex Stop hook.
- .codex/hooks.json — project hook definition.
- .betterloop/config.example.json — optional host hook configuration.
