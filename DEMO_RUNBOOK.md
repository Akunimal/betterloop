# MCPation recording runbook

## Before recording

1. Run `npm run verify` and confirm the deployed URL is <https://mcpation.vercel.app/>.
2. Open the deployed page in Codex's in-app browser with a WebMCP-capable model. This is the browser used for the recorded end-to-end demo; Chrome 149+ with `chrome://flags/#enable-webmcp-testing` is also supported for native tool discovery.
3. Keep the repository's `demo-workspace` folder ready to select. It contains no secrets and is intentionally small.
4. If recording the apply step, select the reviewed JSON action and click **Approve & apply**. Approve the browser's write escalation for the folder already selected. MCPation stores a backup in `.mcpation-backups/`, adds it to an existing `.gitignore` when needed, applies only that exact action, and rescans.

## Prompt to paste into Codex

```text
Run MCPation as a Codex pre-flight gate for this workspace.
Call codex_scan_workspace first, then codex_get_tool_inventory, codex_get_instruction_chain, codex_get_findings, and codex_get_access_scope.
Explain the highest-impact finding without exposing secrets, raw instructions, full paths, or package contents.
Call codex_explain_finding for that finding, then codex_plan_hardening.
Separate deterministic actions from manual review. Do not apply anything until I choose an action id.
I will approve supported cleanup in MCPation's browser folder-permission dialog. When it completes, call codex_verify_workspace and independently review what MCPation changed, remaining findings, the backup boundary, and readiness. Do not claim you performed the cleanup.
```

## Two-minute shot list

| Time | Screen action | Voiceover |
| --- | --- | --- |
| 0:00–0:12 | Start on MCPation with the tool badge visible. | “MCPation is a Codex Environment Doctor. It checks what this workspace can tell the next agent before the run starts.” |
| 0:12–0:27 | Select `demo-workspace` and show the explicit folder boundary. | “I grant one workspace, not the whole disk. The page reads an allowlist and never executes downloaded MCP code.” |
| 0:27–0:47 | Let Codex call `codex_scan_workspace` and show the readiness score. | “Codex now sees a readiness gate, not a pile of settings: MCP declarations, package evidence, AGENTS, and skills.” |
| 0:47–1:05 | Show declared surface and findings. | “The same filesystem server appears twice, one server is disabled, one endpoint is invalid, and the package manifest declares MCP dependencies.” |
| 1:05–1:20 | Call `codex_explain_finding`, then open the hardening plan. | “The agent can ask for the evidence behind a finding, while I can see exactly what it proposes.” |
| 1:20–1:42 | Select only the deterministic duplicate action. | “Ambiguous commands, TOML, policies, and instruction changes stay manual. I choose the single safe action.” |
| 1:42–2:00 | Click **Approve & apply**; approve the write escalation and show the backup plus refreshed result. | “I grant write access only to the folder I already selected. MCPation stores a backup, applies only that exact JSON cleanup, and rescans.” |
| 2:00–2:15 | Ask Codex to call `codex_verify_workspace` and review the result. | “Codex independently reports what MCPation changed on the same verified state. That is the point of WebMCP: shared, structured action—not guessing at the UI.” |

## Recording rules

- Start with the agent/tool interaction, not a title card.
- Do not show personal folders, tokens, environment values, raw instruction text, or terminal output.
- Keep the visible scope card in frame when discussing permissions.
- Do not claim that static package evidence is a live runtime tool list.
- The folder is selected once. Keep the browser permission prompt and `.mcpation-backups/` result in frame.
