# BetterLoop — WebMCP Challenge Submission

## One-line pitch

BetterLoop is a user-activated WebMCP continuity layer that helps Codex verify whether the original job is 100% done, recover from quota pauses, research around uncertain blockers, and request the next turn without losing context.

## Why this matters

Agentic work often stops at the wrong boundary. A response can end while tests are still failing, a browser result is unverified, a usage limit pauses the run, or the first apparent blocker has an available workaround. BetterLoop turns those moments into explicit, inspectable continuation states.

## Judge experience

The public page is usable by itself: a judge can open it, activate BetterLoop, start the guided demo, and exercise the core continuity flow without credentials or local services. The repository adds the agent-integrated route: a trusted Codex project loads the standard STDIO MCP and optional hook, and the same page’s ON button opens the temporary host session.

Detailed reproducible instructions are in [JUDGE_GUIDE.md](JUDGE_GUIDE.md).

## Demo flow — agent-integrated recording

1. Open the public page in Codex’s built-in browser.
2. Press Turn BetterLoop ON. This is the visible consent boundary for the temporary page session.
3. Show the capability strip: native WebMCP when available, or `Host MCP — Connected / Luna ready` through the standard project-scoped fallback.
4. Have the agent call `betterloop_start` with the exact original task. The page should show `CODEX HOST RUN` and the `Run started` event.
5. Have the agent save a checkpoint and submit one failed completion criterion. The visible log shows why the task remains open.
6. Have the agent call `betterloop_report_quota`. BetterLoop records the five-hour recovery assumption without freezing the page.
7. Have the agent call `betterloop_resume` with the window available, then re-verify the evidence.
8. Have the agent call `betterloop_finish`. The page closes the run as `100% verified` only after every criterion passes.
9. In the repository, show `.codex/config.toml`, `scripts/betterloop-mcp.cjs`, `.codex/hooks.json`, and `scripts/betterloop-stop.cjs`. The standard MCP gives an MCP-capable model the continuity tools; the Stop hook asks “Is the job 100% done?” at a Codex turn stop and can request another turn through the supported contract.

For a short manual-only recording, the same visible result can be produced with `Start guided demo`, `Needs more work`, `Simulate quota`, `Quota available`, and `Mark 100% done`; this is the public fallback, not a claim that the agent called the tools.

The exact neutral-English narration, timing map, and free TTS instructions are in [VIDEO_SCRIPT_EN.md](VIDEO_SCRIPT_EN.md).

## WebMCP implementation

BetterLoop calls document.modelContext.registerTool after the explicit ON click and waits for the registration promises to settle. It then checks the visible catalog and exposes `betterloop_activation_check` with an explicit instruction for Codex to verify the registered tools before claiming readiness. Tools are schema-defined and meaningful to an agent: they return state, evidence requirements, next actions, and continuation instructions rather than asking the agent to scrape the dashboard. The `betterloop_hook_ready` tool remains the separate page-side confirmation after Codex's trusted `SessionStart` hook runs.

The local STDIO MCP is the model-compatible fallback when native model context is unavailable. In a WebMCP-capable Codex browser, the native context remains the preferred page channel; both routes share the same user activation and continuity behavior. The Vercel page supplies the UI; the judge’s trusted agent environment supplies the local MCP process.

## Honest integration boundary

The page cannot silently install a Codex hook, alter approval settings, or edit global MCP configuration. The project MCP and hook are transparent, reviewable host integrations. Codex may require the user to trust the project and reopen the session once; after that, the page’s visible ON click opens only a short-lived host session. The five-hour reset is a conservative fallback because a web page cannot read private account quota state.

## Links

- Live demo: https://betterloop-akunimal.vercel.app
- WebMCP: https://webmachinelearning.github.io/webmcp/
- Codex Site Tools: https://learn.chatgpt.com/docs/webmcp
- Codex Hooks: https://learn.chatgpt.com/docs/hooks
