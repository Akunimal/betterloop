# BetterLoop

BetterLoop is a user-activated WebMCP continuity layer for Codex. It helps an agent close the gap between “the response stopped” and “the original job is actually finished”.

Live demo: https://betterloop-akunimal.vercel.app

## The product

The user opens BetterLoop in Codex’s built-in browser and presses one visible ON button. The page then registers a small set of site tools for the current browser session:

- betterloop_start — start a run for the exact original request.
- betterloop_checkpoint — save the current phase and next action.
- betterloop_verify_completion — check every important outcome with evidence.
- betterloop_research_blocker — investigate uncertainty and workarounds before escalating.
- betterloop_report_quota — record a usage-limit pause with a conservative five-hour assumption.
- betterloop_resume — continue from the last checkpoint when work can resume.
- betterloop_finish — close the run only after verification passes.
- betterloop_status — expose the current state and selected features.

The dashboard makes the loop visible: active features, current phase, verification criteria, quota countdown, and a local event timeline.

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

The page never sleeps for five hours and cannot see Codex’s private quota state. When the agent reports a usage limit, BetterLoop records a five-hour recovery window unless the host supplies a more precise timestamp. A trusted local host watcher or a later App Server integration can call betterloop_resume when the window is available.

This is deliberately a conservative heuristic, not a claim that every model or account resets at exactly five hours.

## WebMCP and Codex integration

The page uses document.modelContext.registerTool, the WebMCP site-tool contract. In a WebMCP-capable Codex browser, the tools are discoverable after the user visits the page and activates it. Outside that environment, the app keeps a local polyfill so the public demo remains interactive and testable.

The optional Stop hook is a host-side Codex integration. A webpage cannot silently install a hook, change Codex approval policy, or wake a closed Codex session. Project hooks require Codex trust review and may require opening a new session or restarting the current one. This boundary is intentional and is shown in the UI.

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

## Scope and safety

- BetterLoop only exposes tools after visible user activation; default state is OFF.
- The page stores run state locally in the browser.
- Sound alerts are optional and are unlocked by the ON click. Browsers may suspend audio in a background tab.
- The local polyfill is a demo bridge; native discovery depends on the browser and model host.
- Quota timing is an explicit heuristic until a host-level integration reports the real reset.
- The project hook can request a continuation, but it cannot bypass approvals or guarantee completion by itself.

MIT licensed.
