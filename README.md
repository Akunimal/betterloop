# BetterLoop

BetterLoop is a user-activated continuity layer for agentic work. It uses native WebMCP when the host exposes Site Tools and a project-scoped standard MCP fallback when it does not, so the agent can close the gap between “the response stopped” and “the original job is actually finished”.

Live demo: https://betterloop-akunimal.vercel.app

## The product

The user opens BetterLoop in an agent-capable browser and presses one visible ON button. The page then registers a small set of site tools for the current browser session and activates the project MCP session, if the host has loaded it:

- betterloop_hook_ready — confirm that Codex received the trusted SessionStart hook signal.
- betterloop_host_status — report whether the standard host MCP is connected and whether the user activated the temporary session.
- betterloop_start — start a run for the exact original request.
- betterloop_checkpoint — save the current phase and next action.
- betterloop_verify_completion — check every important outcome with evidence.
- betterloop_research_blocker — investigate uncertainty and workarounds before escalating.
- betterloop_report_quota — record a usage-limit pause with a conservative five-hour assumption.
- betterloop_resume — continue from the last checkpoint when work can resume.
- betterloop_finish — close the run only after verification passes.
- betterloop_status — expose the current state and selected features.

The dashboard makes the loop visible: active features, current phase, verification criteria, quota countdown, host-MCP status, and a local event timeline. After activation it reports the actual channel: native WebMCP, a connected standard host MCP, or a pending host restart.

## Judge quick start

The public page is a working interactive demo even without a local agent. Open https://betterloop-akunimal.vercel.app, press `Turn BetterLoop ON`, confirm the feature toggles, and press `Start guided demo`. The manual controls exercise the core continuity flow: failed evidence, quota pause, recovery, and `100% verified`. This route proves the product behavior without requiring an account, API key, database, or local setup.

For the full agent-integrated path, use the repository from a trusted Codex project. Codex loads `.codex/config.toml` and `.codex/hooks.json`; after the one-time trust/restart step, open the public page in the embedded browser and press `Turn BetterLoop ON`. The button registers the page tools, then exposes a mandatory `betterloop_activation_check` instruction so Codex verifies the catalog before the page reports it ready. The strip should show `Host MCP — Connected / Luna ready` on the current Codex configuration, or the equivalent connected standard-MCP state on another MCP-capable host. Ask the agent to call `betterloop_start` with the exact original task; the resulting run appears in the visual log.

The host path is intentionally split: Vercel serves the visible page, while the local MCP process runs inside the judge’s agent environment. A public page cannot start a Node process on a judge’s computer by itself. See [JUDGE_GUIDE.md](JUDGE_GUIDE.md) for the complete reproducible route.

## Video and voice-over

The recording plan and exact neutral-English narration are in [VIDEO_SCRIPT_EN.md](VIDEO_SCRIPT_EN.md). The fastest free route for this submission is to paste the copy-ready narration into [TTSMaker](https://ttsmaker.com/) and export MP3 or WAV, keeping each paragraph as a separate edit point. ElevenLabs is a higher-polish alternative, but its free plan currently requires attribution for published content and does not include a commercial license. Kokoro is the local, no-account fallback when setup time allows.

## The final 100% check

The optional Codex Stop hook in .codex/hooks.json asks the agent:

> Is the job 100% done?

It compares the original request with the actual result and asks for concrete evidence. When Auto-continue is enabled, the hook returns a supported blocking decision with a continuation reason. Codex then creates the next continuation prompt automatically. The hook respects stop_hook_active so it cannot loop forever.

If Auto-continue is off, BetterLoop reports the final-check instruction without forcing another turn.

## Research before blocking

BetterLoop treats “I cannot continue” as a conclusion, not a first reaction. The research tool requires:

1. A clear explanation of the failure mode.
2. At least one workaround attempted.
3. A research summary with evidence.
4. At least two viable alternatives.

Until those fields exist, the tool returns a continuation instruction instead of creating a user-facing blocker. A real blocker is then reported with the research trail and decision options.

## Quota recovery

The page never sleeps for five hours and cannot see Codex’s private quota state. When the agent reports a usage limit, BetterLoop records a five-hour recovery window unless the host supplies a more precise timestamp. The next trusted Stop turn or the agent can call `betterloop_resume` when the window is available.

This is deliberately a conservative heuristic, not a claim that every model or account resets at exactly five hours.

## WebMCP and Codex integration

The page uses document.modelContext.registerTool, the WebMCP site-tool contract. In a WebMCP-capable Codex browser, the ON button waits for registration, checks the visible tool catalog, and exposes a mandatory `betterloop_activation_check` that Codex must call immediately. The page only reports Codex verification after that tool executes successfully. Outside that environment, the app keeps a local polyfill so the public demo remains interactive and testable.

The optional Stop hook is a host-side Codex integration. A webpage cannot silently install a hook, change Codex approval policy, or wake a closed Codex session. Project hooks require Codex trust review and may require opening a new session or restarting the current one. BetterLoop also registers a `SessionStart` hook so Codex can announce the host integration to the model.

### Standard host MCP

The repository includes `scripts/betterloop-mcp.cjs`, a dependency-free STDIO MCP server. `.codex/config.toml` connects it at project scope; Codex starts it when the trusted project session loads. The same process exposes a localhost control plane on `127.0.0.1:8767`. The visible ON button sends a short-lived session id and the selected toggles to that process, and a heartbeat renews it while the page remains open. When the page is OFF or the heartbeat expires, the server remains dormant and its continuity tools refuse to act.

This is the fallback for hosts such as the current Luna Site Tools configuration. The server speaks standard MCP and exposes the same `betterloop_activation_check`, so a host that cannot call the browser WebMCP catalog can still verify the visible ON activation. Another model can use the same tools when its host supports a project/local STDIO MCP; only the `.codex/config.toml` wiring is Codex-specific. It is not a silent global install: the project MCP must be reviewed/trusted and Codex may need one restart or a reopened session. After that one host setup, activation is one visible button and the server works independently of native WebMCP.

For a local smoke test, run `npm run host:mcp` in a terminal and open the page from a local or trusted browser context. For a Codex project, the normal route is the committed `.codex/config.toml`; do not add BetterLoop to the user's global config.

Official references:

- WebMCP specification: https://webmachinelearning.github.io/webmcp/
- Codex Site Tools: https://learn.chatgpt.com/docs/webmcp
- Codex Hooks: https://learn.chatgpt.com/docs/hooks

## Run locally

Use Node.js 18 or newer.

    npm install
    npm run dev

Then open http://localhost:3000 and press Turn BetterLoop ON. The guided demo shows an unverified result, a quota pause, a continuation, and the final 100% done check.

Validation:

    npm run verify

## Trust the optional hook

Open the repository in Codex, review the project hook with the Codex hook controls, and trust it if you want automatic final verification. If Codex asks for a new session after the hook changes, restart or reopen the session; BetterLoop itself remains usable without the hook.

The hook can be disabled without changing the app:

    BETTERLOOP_DISABLED=1

or with a local .betterloop/config.json based on config.example.json. The committed example is intentionally not a secret and contains no credentials.

The hook is additive, not a replacement for the MCP tools. If it is not loaded, the page and host MCP still work; the UI separates `Codex tools verified` from `Codex hook confirmed` so it does not claim automatic Stop-turn continuation is ready without the trusted hook.

## Scope and safety

- BetterLoop only exposes tools after visible user activation; default state is OFF.
- The page stores run state locally in the browser.
- Sound alerts are optional and are unlocked by the ON click. Browsers may suspend audio in a background tab.
- The local polyfill is a demo bridge; native discovery depends on the browser and model host.
- The host MCP is connected at the Codex project layer but remains dormant until the user activates the visible page session.
- Quota timing is an explicit heuristic until a host-level integration reports the real reset.
- The project hook can request a continuation, but it cannot bypass approvals or guarantee completion by itself.

MIT licensed.
