import type { ConfigDocument } from './mcp-types'
import type { WorkspaceFile } from './codex-analysis'

export const DEMO_WORKSPACE_FILES: WorkspaceFile[] = [
  {
    path: '.codex/config.toml',
    text: `shell = "pwsh"\n\n[mcp_servers.filesystem]\ncommand = "npx"\nargs = ["-y", "@modelcontextprotocol/server-filesystem", "./workspace"]\n\n[mcp_servers.docs]\ncommand = "node"\nargs = ["docs-server.js"]\nenabled = false\n`,
  },
  {
    path: '.mcp.json',
    text: `{"mcpServers":{"filesystem":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","./workspace"]},"filesystem-copy":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","./workspace"]},"legacy-search":{"url":"not a url"}}}`,
  },
  {
    path: 'package.json',
    text: JSON.stringify({ name: 'codex-demo-workspace', private: true, dependencies: { '@modelcontextprotocol/sdk': '^1.0.0', '@modelcontextprotocol/server-filesystem': '^1.0.0' } }),
  },
  { path: 'package-lock.json', text: '{"name":"codex-demo-workspace","lockfileVersion":3,"packages":{}}' },
  { path: 'AGENTS.md', text: '# Workspace guidance\n\nKeep changes small and explain any MCP configuration change before applying it.\n' },
  { path: '.codex/skills/review/SKILL.md', text: '# Review skill\n\nReview proposed configuration changes and require a backup before writing.\n' },
]

export const DEMO_CONFIG_DOCUMENTS: ConfigDocument[] = [
  { label: 'Codex', client: 'Codex', path: '.codex/config.toml', format: 'toml', text: DEMO_WORKSPACE_FILES[0].text, manualOnly: true },
  { label: 'Codex workspace MCP', client: 'Codex', path: '.mcp.json', format: 'json', text: DEMO_WORKSPACE_FILES[1].text },
]
