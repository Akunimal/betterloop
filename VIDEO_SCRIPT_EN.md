# MCPation demo — 2 minutes 15 seconds

Use a public recording with audio. Keep the live app and Codex interaction visible from the first second.

| Time | Visual | Narration |
| --- | --- | --- |
| 0:00–0:12 | MCPation open; `11 Codex tools ready` badge visible. | “MCPation is a Codex Environment Doctor. It makes the next agent run ready, explainable, and safer.” |
| 0:12–0:27 | Select the `demo-workspace` folder; keep the scope card visible. | “I grant one workspace, never the whole disk. The browser reads an allowlist and never executes downloaded MCP code.” |
| 0:27–0:47 | Codex calls `codex_scan_workspace`; readiness score appears. | “WebMCP lets Codex use the same page the person is looking at. It sees MCP configuration, package evidence, AGENTS, and skills.” |
| 0:47–1:05 | Show declared MCP surface and findings cards. | “The filesystem server is declared twice, the docs server is disabled, the legacy endpoint is invalid, and the package manifest contains MCP dependencies.” |
| 1:05–1:20 | Codex calls `codex_explain_finding`; open **Review hardening**. | “The agent can explain the evidence behind one finding, then produce a plan that separates deterministic changes from manual review.” |
| 1:20–1:42 | Select exactly one duplicate cleanup action. | “I choose the action. MCPation never invents a command, URL, policy, or instruction rewrite.” |
| 1:42–2:00 | Ask Codex for the host handoff for the chosen action, show the approval, then submit the refreshed snapshot. | “When the page cannot write, Codex requests the exact native host capability, creates the sibling backup, applies only that action id, and returns a sanitized snapshot to the same page.” |
| 2:00–2:15 | Codex calls `codex_verify_workspace`; readiness card updates. | “The person and the agent finish on one verified state. That is WebMCP: structured collaboration on a real workflow, not a passive dashboard.” |

## Prompt shown in the video

```text
Run MCPation as a Codex pre-flight gate for this workspace.
Call codex_scan_workspace, codex_get_tool_inventory, codex_get_instruction_chain,
codex_get_findings, and codex_get_access_scope. Explain the highest-impact finding
without exposing secrets, raw instructions, full paths, or package contents.
Call codex_explain_finding, then codex_plan_hardening. Do not apply anything until
I explicitly choose an action id. If the page is an import preview, use
codex_request_host_handoff, Codex's native filesystem approval, and
codex_submit_host_snapshot before codex_verify_workspace.
```
