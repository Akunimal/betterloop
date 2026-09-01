export interface SourceDefinition { label: string; client: string; paths: string[][]; format: 'json' | 'toml'; manualOnly?: boolean }

export const MCP_CONFIG_SOURCES: SourceDefinition[] = [
  { label: 'Codex', client: 'Codex', format: 'toml', manualOnly: true, paths: [['.codex', 'config.toml']] },
  { label: 'Claude Desktop', client: 'Claude Desktop', format: 'json', paths: [['AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'], ['Library', 'Application Support', 'Claude', 'claude_desktop_config.json'], ['.config', 'Claude', 'claude_desktop_config.json']] },
  { label: 'Cursor', client: 'Cursor', format: 'json', paths: [['.cursor', 'mcp.json']] },
  { label: 'Windsurf', client: 'Windsurf', format: 'json', paths: [['.codeium', 'windsurf', 'mcp_config.json']] },
  { label: 'VS Code Agent Host', client: 'VS Code', format: 'json', paths: [['.copilot', 'mcp-config.json']] },
  { label: 'VS Code User', client: 'VS Code', format: 'json', paths: [['AppData', 'Roaming', 'Code', 'User', 'mcp.json'], ['Library', 'Application Support', 'Code', 'User', 'mcp.json'], ['.config', 'Code', 'User', 'mcp.json']] },
  { label: 'Cline', client: 'Cline', format: 'json', paths: [['AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'mcp_settings.json'], ['Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'mcp_settings.json'], ['.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'mcp_settings.json']] },
  { label: 'Roo Code', client: 'Roo Code', format: 'json', paths: [['AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json'], ['Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json'], ['.config', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json']] },
  { label: 'Zed', client: 'Zed', format: 'json', manualOnly: true, paths: [['AppData', 'Roaming', 'zed', 'settings.json'], ['Library', 'Application Support', 'zed', 'settings.json'], ['.config', 'zed', 'settings.json']] },
]

function normalizedRelativePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const parts = normalized.split('/')
  return (parts.length > 1 ? parts.slice(1) : parts).join('/').toLowerCase()
}

export function matchSourceForPath(path: string): { source: SourceDefinition; path: string[] } | null {
  const normalized = normalizedRelativePath(path)
  for (const source of MCP_CONFIG_SOURCES) {
    for (const candidate of source.paths) {
      if (normalized === candidate.join('/').toLowerCase()) return { source, path: candidate }
    }
  }
  return null
}
