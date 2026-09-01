# MCPation — judge guide

## Run it

Open the deployed page in Codex's WebMCP-capable in-app browser. Select **Select environment folder** and approve the folder containing the supported MCP configuration locations. This embedded-browser path is read-only; nothing is installed or started locally and no API key is required.

## What to verify

1. The page registers seven WebMCP tools: rescan environment, read inventory, read findings, compare environments, inspect the browser-granted scope, get glow-up recommendations, and plan cleanup.
2. The scan returns server metadata only: name, source, transport, disabled state, conflicts, and recommendations.
3. Duplicate definitions, conflicting names, missing transport, invalid endpoints, disabled entries, unavailable commands, malformed shapes, and unreadable configuration are reported as findings across the supported Windows, macOS, and Linux IDE locations.
4. **Review cleanup** is supervised: only deterministic JSON duplicates can be selected; each write is backed up under `~/.mcpation-backups/<timestamp>` before it is applied; a second browser confirmation is required. The demo intentionally does not apply fixes.
5. No token, environment variable, header, file content, or full local path appears in the page or WebMCP output.

## Safety boundary

The page starts with no filesystem access. A scan becomes available only after the visible browser selection flow. MCPation reads the contents of known configuration paths only. Direct-access browsers may write a reviewed JSON fix after creating a backup; Codex's embedded-browser import stays read-only. MCPation never auto-fixes ambiguous issues, TOML files, commands, or name conflicts.
