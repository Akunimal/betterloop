# MCPation

**Know what your agent can call.** MCPation is a consent-first MCP environment doctor. A WebMCP page gives an agent a structured, sanitized view of the local MCP configuration only after the user explicitly starts a temporary scan.

## Why this exists

MCP tools accumulate across Codex, Claude Desktop, Cursor, and Windsurf. The result is often duplicate servers, disabled entries, missing commands, and no clear inventory. MCPation makes that environment visible without exposing tokens or silently changing anything.

## WebMCP tools

- `mcpation_scan_environment` — refresh the user-approved scan.
- `mcpation_get_inventory` — read server metadata only.
- `mcpation_get_findings` — inspect duplicate, disabled, and unavailable entries.
- `mcpation_plan_cleanup` — produce a review-only cleanup plan.

## Local companion

A public webpage cannot read local configuration files. MCPation uses a small, local-only companion instead of installing another MCP server.

```bash
npm install
npm run companion
npm run dev
```

The companion listens only on `127.0.0.1:4318`, requires an explicit temporary page session, and never returns `env`, `headers`, tokens, or file contents. It reads only supported configuration locations and never edits a configuration.

## Demo

1. Start logged in with the MCPation page open in Codex.
2. Run `npm run companion` locally.
3. Select **Start local scan**.
4. Let Codex call `mcpation_scan_environment`, then `mcpation_get_findings`.
5. Show the inventory and call `mcpation_plan_cleanup` to produce a review-only recommendation.

The agent uses the webpage’s WebMCP tools; the local companion only supplies the permitted operating-system boundary.
