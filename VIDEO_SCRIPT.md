# BetterLoop demo script

## 0:00 — The problem

“Codex can do a long agentic task, but the end of a response is not always the end of the job. A quota pause, an unverified result, or an uncertain error can leave the user with an incomplete workflow.”

## 0:10 — Activate

Open BetterLoop in Codex’s built-in browser. Press Turn BetterLoop ON.

“This one visible action is the consent boundary. BetterLoop now registers its WebMCP continuity tools for this page.”

Point at the warning banner:

“The page is live, but automatic Codex continuation is explicitly marked not ready until Codex checks the trusted project hook. If Codex asks for `/hooks`, I trust it and restart or reopen the session. Codex then confirms the hook through WebMCP and the banner becomes ready. The web page never pretends it can install that host hook itself.”

## 0:20 — The control surface

Show the compact grouped controls:

- Auto-continue — requests the next Codex turn.
- 100% done? — verifies the original request before stopping.
- Quota recovery — holds a five-hour fallback window.
- Research first — searches for workarounds before declaring a hard blocker.

## 0:30 — Recovery loop

Press Start guided demo. Show the failed evidence check and the event log. Press Simulate quota.

“The browser stays responsive. BetterLoop records the pause and keeps the exact next action.”

Press Quota available / continue.

“When the window is available, BetterLoop resumes from the checkpoint. Sound is optional and only plays if enabled.”

## 0:45 — 100% completion

Press Mark 100% done.

“BetterLoop does not close on a confident sentence alone. It closes only after the evidence check passes.”

## 0:55 — Codex hook

Show .codex/hooks.json and scripts/betterloop-stop.cjs.

“The SessionStart hook is the readiness check. If Codex trusted and loaded it, it receives the instruction to confirm BetterLoop through the page. Only then does the banner become ready. The same trusted hook later asks Codex: Is the job 100% done? If Auto-continue is on, its supported block decision creates a continuation prompt.”

## 1:05 — Close

“BetterLoop is not another automation surface. It is a transparent continuity layer that helps agents verify, recover, research, and keep going without hiding control from the user.”
