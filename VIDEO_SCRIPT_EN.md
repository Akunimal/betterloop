# MCPation demo — 2 minutes 20 seconds

The video should be public, under three minutes, narrated in neutral English, and begin with the working agent/tool flow. Do not record setup, loading, or live typing.

| Time | Screen action | Narration |
| --- | --- | --- |
| 0:00–0:14 | Start on MCPation after selecting the environment folder. In Codex, show `mcpation_scan_environment` and the dashboard inventory. | “MCPation gives Codex a safe, read-only view of the MCP configuration already on your machine, directly from a browser-selected folder.” |
| 0:14–0:32 | Show the registered seven WebMCP tools and Codex calling `mcpation_get_findings`. | “Nothing was installed. The page parses known config paths locally, while WebMCP lets Codex inspect findings, coverage, access scope, and a safe cleanup plan.” |
| 0:32–0:52 | Highlight an MCP issue and the glow-up recommendations. | “MCPation turns scattered editor files into concrete, evidence-based next steps. A recommendation is never an automatic install or configuration change.” |
| 0:52–1:13 | Open **Review cleanup** and show the supervised proposal list. | “Cleanup is never blind. MCPation separates deterministic JSON cleanup from shell, policy, and compatibility decisions that need a human.” |
| 1:13–1:31 | Show the disabled Apply state; do not select or apply anything. | “The demo stops at review. If a supported write is ever selected, MCPation creates a backup and asks again for confirmation.” |
| 1:31–1:51 | Show `mcpation_get_recommendations`, then `mcpation_plan_cleanup` called from Codex and the same plan visible on the page. | “The agent and the person now share a practical plan, while the person keeps control of every configuration change.” |
| 1:51–2:10 | Show the access-scope tool and privacy strip. | “The browser reads only known MCP paths inside the folder I granted. Codex receives sanitized findings—not tokens, environment values, full paths, or raw files.” |
| 2:10–2:20 | Return to the dashboard. | “MCPation makes a growing Codex environment understandable, safer to clean up, and ready for the next agent run.” |

Record short clips and cut pauses. If no deterministic duplicate exists in the real environment, do not fabricate an applied fix; show the manual-review state and say why it is intentionally not automated.
