# MCPation — judge guide

## Run it

```bash
npm install
npm run companion
npm run dev
```

Open the local URL in a WebMCP-capable browser context, or open the deployed page and keep the local companion running. Select **Scan Codex setup** to explicitly create a 15-minute local session.

## What to verify

1. The page registers seven WebMCP tools: scan environment, read inventory, read findings, compare environments, inspect host shell compatibility, get the glow-up recommendations, and plan cleanup.
2. The scan returns server metadata only: name, source, transport, disabled state, and executable availability.
3. Duplicate definitions, conflicting names, missing transport, invalid endpoints, disabled entries, unavailable commands, malformed shapes, and unreadable configuration are reported as findings across the supported Windows, macOS, and Linux IDE locations.
4. **Review cleanup** is supervised: only deterministic JSON duplicates can be selected; each write is backed up under `~/.mcpation-backups/<timestamp>` before it is applied; a second browser confirmation is required. The demo intentionally does not apply fixes.
5. No token, environment variable, header, file content, or full local path appears in the page or WebMCP output.

## Safety boundary

The companion listens only on `127.0.0.1:4318`. A scan is available only after an explicit page action, is scoped to the page origin, and expires after 15 minutes. MCPation never auto-fixes ambiguous issues, TOML files, missing executables, or name conflicts.
