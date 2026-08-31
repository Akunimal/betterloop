# BetterLoop — WebMCP Challenge Submission

## One-line pitch

BetterLoop is a user-activated WebMCP continuity layer that helps Codex verify whether the original job is 100% done, recover from quota pauses, research around uncertain blockers, and request the next turn without losing context.

## Why this matters

Agentic work often stops at the wrong boundary. A response can end while tests are still failing, a browser result is unverified, a usage limit pauses the run, or the first apparent blocker has an available workaround. BetterLoop turns those moments into explicit, inspectable continuation states.

## Demo flow

1. Open the public page in Codex’s built-in browser.
2. Press Turn BetterLoop ON. This is the visible consent boundary for the temporary page session.
3. Show the capability strip: native WebMCP when available, or `Host MCP — Connected / Luna ready` through the project-scoped fallback.
4. Show the compact feature controls and turn on Auto-continue, 100% done, Quota recovery, and Research first.
5. Start the guided demo.
6. Show an evidence check that fails, then use the visible log to show the task staying open.
7. Simulate a quota pause. BetterLoop records the five-hour recovery assumption without freezing the page.
8. Mark quota available. BetterLoop resumes from the last checkpoint and plays the optional short sound.
9. Mark the evidence complete. BetterLoop closes the run as 100% verified.
10. In the repository, show `.codex/config.toml`, `scripts/betterloop-mcp.cjs`, `.codex/hooks.json`, and `scripts/betterloop-stop.cjs`. The host MCP gives Codex the same continuity tools on Luna; the Stop hook asks “Is the job 100% done?” at a Codex turn stop and can request another turn through the supported contract.

## WebMCP implementation

BetterLoop calls document.modelContext.registerTool after the explicit ON click. Tools are schema-defined and meaningful to an agent: they return state, evidence requirements, next actions, and continuation instructions rather than asking the agent to scrape the dashboard. The `betterloop_hook_ready` tool is the explicit page-side confirmation after Codex's trusted `SessionStart` hook runs.

The local STDIO MCP is the model-compatible fallback when native model context is unavailable. In a WebMCP-capable Codex browser, the native context remains the preferred page channel; both routes share the same user activation and continuity behavior.

## Honest integration boundary

The page cannot silently install a Codex hook, alter approval settings, or edit global MCP configuration. The project MCP and hook are transparent, reviewable host integrations. Codex may require the user to trust the project and reopen the session once; after that, the page’s visible ON click opens only a short-lived host session. The five-hour reset is a conservative fallback because a web page cannot read private account quota state.

## Links

- Live demo: https://betterloop-akunimal.vercel.app
- WebMCP: https://webmachinelearning.github.io/webmcp/
- Codex Site Tools: https://learn.chatgpt.com/docs/webmcp
- Codex Hooks: https://learn.chatgpt.com/docs/hooks
