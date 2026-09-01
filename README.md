# MCPation

**Clean up MCPs. Fix environment friction. Upgrade the Codex setup.** MCPation is a consent-first, Codex-first environment doctor that runs in the browser. After the user selects an environment folder, the page analyzes known MCP configuration paths locally and exposes only sanitized findings through WebMCP.

## Why this exists

MCP tools accumulate across Codex and other environments such as Claude Desktop, Cursor, Windsurf, VS Code, Cline, Roo Code, and Zed. The result is often duplicate servers, disabled entries, invalid endpoints, missing transports, and no clear inventory. MCPation makes that environment visible without exposing tokens or silently changing anything.

## WebMCP tools

- `mcpation_scan_environment` — refresh the user-approved scan.
- `mcpation_get_inventory` — read server metadata only.
- `mcpation_get_findings` — inspect gaps, broken commands, policies, and configuration issues.
- `mcpation_get_environment_matrix` — compare configured server coverage and known MCP access policy by IDE.
- `mcpation_get_access_scope` — explain exactly which browser-granted sources are in scope.
- `mcpation_get_recommendations` — read prioritized cleanup, compatibility, coverage, and performance recommendations.
- `mcpation_plan_cleanup` — produce a review-only cleanup plan.

## Browser-native access

A normal web page starts sandboxed. MCPation asks the user to select their environment folder with the browser's native directory picker. That grants this origin a revocable file handle; no daemon, extension, MCP server, or API key is installed.

When the browser exposes the File System Access API, MCPation can create sibling backups and apply only reviewed deterministic JSON cleanup. Codex's embedded browser currently provides a read-only directory import instead; diagnosis and WebMCP still work, while writes remain a Codex-reviewed manual step. No Gemini key or other model API key is used in either mode.

MCPation checks only known configuration locations inside that folder for Codex, Claude Desktop, Cursor, Windsurf, VS Code, Cline, Roo Code, and Zed. File handles can be remembered by the browser, but permissions remain under browser control.

Analysis happens in the tab. WebMCP results never include `env`, headers, tokens, full paths, or raw file contents. MCPation is read-only until the user selects a deterministic JSON cleanup in the visible UI and confirms it; a sibling backup file is written before the original configuration changes.

## Demo

1. Start logged in with the MCPation page open in Codex.
2. Select **Connect environment folder** (or **Select environment folder** in Codex) and grant the folder that contains the supported configuration locations.
3. The page scans the known paths locally.
4. Let Codex call `mcpation_scan_environment`, then `mcpation_get_findings` and `mcpation_get_recommendations`.
5. Show the inventory, environment compatibility, and call `mcpation_plan_cleanup` to produce the supervised plan.
6. Show the supervised plan only. Do not apply a change in the demo.

The agent uses the webpage's WebMCP tools; the browser permission and visible page remain the human-controlled boundary.
