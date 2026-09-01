# BetterLoop judge guide

This guide separates the public product demo from the optional host integration. Both are functional; the second route lets an agent call BetterLoop through MCP and lets the page show the real host run.

## Route A — public interactive demo

1. Open [betterloop-akunimal.vercel.app](https://betterloop-akunimal.vercel.app/).
2. Press `Turn BetterLoop ON`.
3. Confirm the grouped toggles are enabled. The important ones are `Auto-continue`, `Ask “100% done?”`, `Quota recovery`, `Evidence check`, and `Research before blocking`.
4. Press `Start guided demo`.
5. Press `Needs more work` to see a failed evidence state.
6. Press `Simulate quota`, then `Quota available`.
7. Press `Mark 100% done`.

Expected result: the run changes from open work to quota recovery, resumes, and ends at `100% verified`. The observability section shows the event timeline. This route exercises the core continuity flow; the research-first blocker guard is exercised through the MCP route below. The page uses its local WebMCP polyfill when a native agent context is not available, so it is usable in an ordinary browser.

## Route B — full Codex/MCP integration

Use this route when evaluating whether an agent can consume the tools.

1. Clone the repository and open its root as a trusted Codex project.
2. Confirm Node.js 18+ is available, then run `npm install` and `npm run verify`.
3. Restart or reopen the Codex task after reviewing the project MCP and hook configuration. The project files are `.codex/config.toml` and `.codex/hooks.json`; no global configuration is required.
4. Open the public page in Codex’s embedded browser and press `Turn BetterLoop ON`.
5. Let Codex call the newly exposed `betterloop_activation_check`. The page reports `Codex verified BetterLoop tools` only after that tool returns success.
6. Confirm the capability strip reports a connected `Host MCP`. The visible button is the explicit consent gate; before it, the host is connected but dormant.
7. Ask the agent to call `betterloop_host_status`, then `betterloop_start` with the exact original task.
8. Ask it to save a checkpoint with `betterloop_checkpoint`, and if it encounters uncertainty, use `betterloop_research_blocker` only after trying a workaround and collecting alternatives.
9. Ask it to verify evidence with `betterloop_verify_completion`, and close only through `betterloop_finish`.

Expected result: the page labels the run `CODEX HOST RUN`, displays the agent’s checkpoints and events, and updates while the MCP changes state. If the agent attempts to finish with missing or failed evidence, the tool returns a continuation instruction. If it reports a quota limit, `betterloop_report_quota` stores the five-hour fallback and `betterloop_resume` continues when the window is available. For a fast recording, provide a retry timestamp that is already available instead of waiting five hours.

## Route C — another MCP-capable model

The server is standard MCP and is not tied to a model. Configure the host to launch:

```text
node /absolute/path/to/betterloop/scripts/betterloop-mcp.cjs
```

Then open the same public page, press `Turn BetterLoop ON`, and have the model discover the tools with its normal MCP tool-list operation. The model-specific part is only how the host loads a local STDIO MCP. The page activation, loopback session, features, run state, and tools are shared.

## What the status messages mean

- `Waiting for activation`: BetterLoop is OFF; no continuity action is enabled.
- `Connected / dormant`: the MCP process exists, but the user has not pressed ON.
- `Connected / Luna ready`: the current Codex host has the standard fallback connected and the page session is active.
- `Activation sent / Codex checking`: the ON click registered the page tools and is waiting for Codex to execute `betterloop_activation_check`.
- `Tools verified / hook optional`: Codex can use the page tools; automatic Stop-hook continuation still waits for the normal hook trust/restart step.
- `Ready / hook confirmed`: the optional project hook delivered its trusted `SessionStart` proof and the page confirmed it.

## Safety and scope

- The public page cannot install a global MCP, change approval settings, or start a process on the judge’s machine.
- The MCP session is in memory, bound to the visible page’s session id, and expires after five minutes without a heartbeat.
- Pressing OFF clears the host session and unregisters page tools.
- The five-hour quota window is an explicit fallback, not private account-quota telemetry.

## Submission smoke check

From the repository root:

```text
npm run verify
```

The check builds the UI, type-checks it, confirms retired prototype files are absent, validates the WebMCP/MCP/hook contracts, and runs both MCP and Stop-hook self-tests.
