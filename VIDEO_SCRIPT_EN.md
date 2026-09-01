# MCPation demo — 2 minutes 20 seconds

The video should be public, under three minutes, narrated in neutral English, and begin with the working agent/tool flow. Do not record setup, loading, or live typing.

| Time | Screen action | Narration |
| --- | --- | --- |
| 0:00–0:12 | Start on MCPation with a completed scan. In Codex, show `mcpation_scan_environment` and the page inventory. | “MCPation gives an agent a safe view of the MCP tools already living on your machine.” |
| 0:12–0:28 | Show the registered WebMCP tools and Codex calling `mcpation_get_findings`. | “The page exposes four WebMCP tools. After explicit consent, Codex can scan the environment, inspect inventory, read findings, and prepare a cleanup plan.” |
| 0:28–0:48 | Highlight a duplicate, a name conflict, a disabled entry, and an unavailable executable. | “Instead of a scattered set of editor files, MCPation identifies exact duplicates, conflicting names, disabled servers, and commands that cannot be resolved.” |
| 0:48–1:06 | Show **Fix all safely** and the supervised proposal list. | “Fix all is never blind. MCPation separates deterministic fixes from decisions that need a human.” |
| 1:06–1:24 | Select a deterministic duplicate only if one exists; show backup language and confirmation. Otherwise show the disabled Apply state. | “Before any supported write, you select the exact change, MCPation creates a local backup, and the browser asks again for confirmation. Ambiguous fixes stay manual.” |
| 1:24–1:45 | Show `mcpation_plan_cleanup` called from Codex and the same plan visible on the page. | “The agent and the person now share one plan, but the person keeps control over configuration changes.” |
| 1:45–2:05 | Show the privacy strip and companion boundary. | “The browser never receives environment variables, headers, tokens, full paths, or file contents. The local companion is temporary and bound to the approved MCPation page.” |
| 2:05–2:20 | Return to the healthy/updated scan. | “MCPation makes a growing MCP environment understandable, safer to clean up, and usable by agents through WebMCP.” |

Record short clips and cut pauses. If no deterministic duplicate exists in the real environment, do not fabricate an applied fix; show the manual-review state and say why it is intentionally not automated.
