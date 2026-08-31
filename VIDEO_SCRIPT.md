# BetterLoop demo script

> Recording note: use [VIDEO_SCRIPT_EN.md](VIDEO_SCRIPT_EN.md) as the exact neutral-English narration track. This file remains the shot list and agent-action checklist for the integrated demo.

## 0:00 — The problem

“Codex can do a long agentic task, but the end of a response is not always the end of the job. A quota pause, an unverified result, or an uncertain error can leave the user with an incomplete workflow.”

## 0:10 — Activate

Open BetterLoop in Codex’s built-in browser. Make sure the project MCP is loaded, then press Turn BetterLoop ON.

“This one visible action is the consent boundary. BetterLoop registers its page tools and opens a temporary host-MCP session for this browser page.”

Point at the capability strip and banner:

“BetterLoop prefers native WebMCP. When this host does not expose Site Tools, the standard project MCP is the compatibility path: it is already connected by Codex, but it stays dormant until this visible click opens a temporary session. That lets another MCP-capable model use the same continuity tools without pretending the browser has native WebMCP.”

## 0:20 — The control surface

Show the compact grouped controls:

- Auto-continue — requests the next Codex turn.
- 100% done? — verifies the original request before stopping.
- Quota recovery — holds a five-hour fallback window.
- Research first — searches for workarounds before declaring a hard blocker.

## 0:30 — Recovery loop

In the Codex conversation, ask the agent to call `betterloop_start` with the exact original task. Show the page label `CODEX HOST RUN`, the failed evidence check, and the event log. Ask the agent to call `betterloop_report_quota`.

“The browser stays responsive. BetterLoop records the pause and keeps the exact next action.”

Ask the agent to call `betterloop_resume` once the window is available. For the recording, use an already-available retry timestamp so the demo does not wait five hours.

“When the window is available, BetterLoop resumes from the checkpoint. Sound is optional and only plays if enabled.”

## 0:45 — 100% completion

Ask the agent to call `betterloop_verify_completion` with concrete evidence for every criterion, then `betterloop_finish`.

“BetterLoop does not close on a confident sentence alone. It closes only after the evidence check passes, whether the caller is Codex or another MCP-capable model.”

## 0:55 — Codex hook

Show .codex/config.toml, scripts/betterloop-mcp.cjs, .codex/hooks.json, and scripts/betterloop-stop.cjs.

“The STDIO MCP is the standard host channel. The page sends activation and toggles over loopback, and the MCP refuses to act when the page is off or its heartbeat expires. The trusted Stop hook later asks Codex: Is the job 100% done? If Auto-continue is on, its supported block decision creates a continuation prompt.”

## 1:05 — Close

“BetterLoop is not another automation surface. It is a transparent continuity layer that helps agents verify, recover, research, and keep going without hiding control from the user.”
