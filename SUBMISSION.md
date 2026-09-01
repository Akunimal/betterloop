# MCPation — WebMCP Challenge submission notes

MCPation is a consent-first environment doctor for people who build with many MCP servers. It turns scattered local MCP configuration into a structured inventory an agent can inspect through WebMCP.

The user starts a temporary local scan from the page. The companion reads only known configuration locations, redacts sensitive fields by design, and returns metadata such as server name, source, transport, disabled status, and executable availability. It never returns tokens, environment variables, headers, full paths, or file contents.

WebMCP is the product surface: Codex can call the page tools to scan the approved environment, read the sanitized inventory, inspect findings, and generate a supervised cleanup plan. This creates a better human-agent workflow: the agent can identify duplicate definitions, name conflicts, disabled servers, and unavailable commands, while the user remains in control of every change.

MCPation makes something difficult before possible in one place: a human and an agent can reason about a fragmented local MCP environment without granting a public webpage raw filesystem access. A deterministic JSON duplicate can be selected by the user, backed up locally, and applied only after a second confirmation. Ambiguous repairs stay manual; MCPation never guesses a command or chooses which conflicting server to delete.
