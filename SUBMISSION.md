# MCPation — WebMCP Challenge submission notes

MCPation is a consent-first environment doctor for people who build with many MCP servers. It turns scattered local MCP configuration into a structured inventory an agent can inspect through WebMCP.

The user starts a temporary local scan from the page. The companion reads only known configuration locations, redacts sensitive fields by design, and returns metadata such as server name, source, transport, disabled status, and executable availability. MCPation never auto-edits, disables, or deletes configuration.

WebMCP is the product surface: Codex can call the page tools to scan the approved environment, read the sanitized inventory, inspect findings, and generate a review-only cleanup plan. This lets a human and an agent reason about a fragmented tool environment together without granting the webpage raw filesystem or secret access.
