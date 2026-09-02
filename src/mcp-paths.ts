export interface SourceDefinition { label: string; client: string; paths: string[][]; format: 'json' | 'toml'; manualOnly?: boolean }

export const MCP_CONFIG_SOURCES: SourceDefinition[] = [
  { label: 'Codex', client: 'Codex', format: 'toml', manualOnly: true, paths: [['.codex', 'config.toml']] },
  { label: 'Codex workspace MCP', client: 'Codex', format: 'json', paths: [['.mcp.json'], ['mcp.json']] },
]

export const CODEX_CONFIG_SOURCES: SourceDefinition[] = MCP_CONFIG_SOURCES

function normalizedRelativePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase()
}

export function matchSourceForPath(path: string): { source: SourceDefinition; path: string[] } | null {
  const normalized = normalizedRelativePath(path)
  for (const source of MCP_CONFIG_SOURCES) {
    for (const candidate of source.paths) {
      const candidatePath = candidate.join('/').toLowerCase()
      if (normalized === candidatePath || normalized.endsWith(`/${candidatePath}`)) return { source, path: candidate }
    }
  }
  return null
}

export function matchCodexSourceForPath(path: string): { source: SourceDefinition; path: string[] } | null {
  const match = matchSourceForPath(path)
  return match && match.source.client === 'Codex' ? match : null
}
