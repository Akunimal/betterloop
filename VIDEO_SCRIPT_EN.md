# MCPation demo — 2 minutes 15 seconds

Use a public recording with audio. Keep the live app and Codex interaction visible from the first second.

| Time | Visual | Narration |
| --- | --- | --- |
| 0:00–0:12 | MCPation open; `12 Codex tools ready` badge visible. | “MCPation is a Codex Environment Doctor. It makes the next agent run ready, explainable, and safer.” |
| 0:12–0:27 | Select the `demo-workspace` folder in the Codex embed; keep the scope card visible. | “I grant one workspace, never the whole disk. The browser reads an allowlist and never executes downloaded MCP code.” |
| 0:27–0:47 | Codex calls `codex_scan_workspace`; readiness score appears. | “WebMCP lets Codex use the same page the person is looking at. It sees MCP configuration, package evidence, AGENTS, and skills.” |
| 0:47–1:05 | Show declared MCP surface and findings cards. | “The filesystem server is declared twice, the docs server is disabled, the legacy endpoint is invalid, and the package manifest contains MCP dependencies.” |
| 1:05–1:20 | Codex calls `codex_explain_finding`; open **Review hardening**. | “The agent can explain the evidence behind one finding, then produce a plan that separates deterministic changes from manual review.” |
| 1:20–1:42 | Select exactly one duplicate cleanup action. | “I choose the action. MCPation never invents a command, URL, policy, or instruction rewrite.” |
| 1:42–2:00 | Switch to Chrome at `?browser=chrome`, select the same workspace once, click **Approve & apply**, then show `.mcpation-backups/` and the refreshed result. | “In Chrome, I grant one bounded workspace. MCPation backs up the JSON, applies only the checked action, and rescans immediately.” |
| 2:00–2:15 | Ask Codex to call `codex_verify_workspace` and review the result; readiness card updates. | “Codex independently reviews what MCPation changed on the same visible state. That is WebMCP: structured collaboration on a real workflow, not a passive dashboard.” |

## Prompt shown in the video

```text
Run MCPation as a Codex pre-flight gate for this workspace.
Call codex_scan_workspace, codex_get_tool_inventory, codex_get_instruction_chain, codex_get_workspace_graph,
codex_get_findings, and codex_get_access_scope. Explain the highest-impact finding
without exposing secrets, raw instructions, full paths, or package contents.
Call codex_explain_finding, then codex_plan_hardening. Do not apply anything until
I explicitly choose an action id. I will approve the supported cleanup in MCPation's
browser folder-permission dialog. After it finishes, call codex_verify_workspace and
review what MCPation changed, remaining findings, the backup boundary, and readiness.
Do not claim you performed the cleanup or expose secrets, raw instructions, or full paths.
```
