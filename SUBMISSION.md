# MCPation — WebMCP Challenge submission notes

MCPation is a consent-first, Codex-first environment glow-up for people who build with many MCP servers. It turns scattered local MCP configuration into a structured inventory, compatibility check, and prioritized improvement plan an agent can inspect through WebMCP.

The user starts a temporary local scan from the page. The companion resolves known Windows, macOS, and Linux locations for Codex, Claude Desktop, Cursor, Windsurf, VS Code, Cline, Roo Code, and Zed. It redacts sensitive fields by design and returns metadata such as server name, source, transport, disabled status, invalid endpoint state, and executable availability. It never returns tokens, environment variables, headers, full paths, or file contents.

WebMCP is the product surface: Codex can call seven page tools to scan the approved environment, read the sanitized inventory, inspect findings, compare configured coverage, check host-shell compatibility, review recommendations, and generate a supervised cleanup plan. This creates a better human-agent workflow: the agent can identify duplicate definitions, name conflicts, disabled servers, unavailable commands, and evidence-based Git Bash or WSL follow-ups, while the user remains in control of every change.

MCPation makes something difficult before possible in one place: a human and an agent can reason about a fragmented local MCP environment without granting a public webpage raw filesystem access. Its supervised remediation workflow is deliberately separate from diagnosis; the demo stops at the plan. Ambiguous repairs stay manual; MCPation never guesses a command or chooses which conflicting server to delete.
