# Live WebMCP demo runbook

## Before recording

1. Start `npm run companion` in a local terminal.
2. Open MCPation in Codex’s browser and select **Start local scan** yourself.
3. Confirm the page shows the inventory and findings.
4. Use a model/browser context that supports native WebMCP tool execution.

## Prompt for Codex

```text
Use the active MCPation WebMCP tools for a read-only diagnostic demonstration.
First call mcpation_scan_environment, then mcpation_get_inventory and mcpation_get_findings.
Summarize only the detected MCP health findings; do not expose secrets, full paths, environment values, headers, or file contents.
Then call mcpation_plan_cleanup and explain which proposals require manual review. Do not apply any configuration change.
Keep the visible explanation concise and in neutral English.
```

## Recording rules

- Start the video with Codex using a MCPation tool, not with a title card or setup.
- Do not type long prompts live; paste the prepared prompt or cut to it.
- Do not show unrelated chats, file paths, tokens, environment variables, or terminal content.
- Do not demonstrate an apply action unless the exact selected change is intentional and recoverable from the displayed backup.
