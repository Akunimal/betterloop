import type { AnalysisResult, ConfigDocument, MCPServer, RemovalAction, ScanResult } from './mcp-types.ts'

interface InternalServer extends MCPServer { client: string; path: string; format: 'json' | 'toml'; groupKey: string; signature: string; manualOnly: boolean; strictJson: boolean }

export const SUPPORTED_SOURCES = ['Codex', 'Claude Desktop', 'Cursor', 'Windsurf', 'VS Code Agent Host', 'VS Code User', 'Cline', 'Roo Code', 'Zed']

function stableId(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function parseLooseJson(text: string): Record<string, unknown> {
  try { return JSON.parse(text) as Record<string, unknown> } catch { return JSON.parse(text.replace(/^\s*\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1')) as Record<string, unknown> }
}

function safeTarget(command: string, url: string): string {
  if (url) { try { return new URL(url).origin } catch { return 'invalid URL' } }
  return command ? command.replace(/\\/g, '/').split('/').pop() || command : 'missing transport'
}

function serverSignature(value: Record<string, unknown>): string {
  return stableId(JSON.stringify({ command: value.command || '', args: value.args || [], url: value.url || '', disabled: Boolean(value.disabled), env: value.env || {}, headers: value.headers || {} }))
}

function parseJsonDocument(document: ConfigDocument): { servers: InternalServer[]; malformed: boolean } {
  let strictJson = true
  try { JSON.parse(document.text) } catch { strictJson = false }
  const parsed = parseLooseJson(document.text)
  const keys = document.label === 'Zed' ? ['context_servers'] : document.label.includes('VS Code') ? ['servers', 'mcpServers', 'mcp_servers'] : ['mcpServers', 'mcp_servers', 'servers']
  const groupKey = keys.find((key) => parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key])) || ''
  const group = groupKey ? parsed[groupKey] as Record<string, unknown> : {}
  const servers = Object.entries(group).filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry[1]) && typeof entry[1] === 'object' && !Array.isArray(entry[1])).map(([name, value]) => {
    const command = typeof value.command === 'string' ? value.command : ''
    const url = typeof value.url === 'string' ? value.url : ''
    return {
      id: `${document.label}:${name}:${stableId(document.path)}`, name, source: document.label, client: document.client, path: document.path, format: 'json' as const, groupKey,
      transport: url ? 'http' as const : 'stdio' as const, target: safeTarget(command, url), disabled: Boolean(value.disabled), signature: serverSignature(value), manualOnly: Boolean(document.manualOnly), strictJson,
    }
  })
  return { servers, malformed: !groupKey && Object.keys(parsed).length > 0 }
}

function parseTomlDocument(document: ConfigDocument): { servers: InternalServer[]; malformed: boolean; codexShell: string } {
  const servers: InternalServer[] = []
  let name = ''
  let values: Record<string, string> = {}
  const scalar = (value = '') => value.trim().replace(/^['"]|['"]$/g, '')
  const commit = () => {
    if (!name) return
    const command = scalar(values.command)
    const url = scalar(values.url)
    servers.push({ id: `${document.label}:${name}:${stableId(document.path)}`, name, source: document.label, client: document.client, path: document.path, format: 'toml', groupKey: '', transport: url ? 'http' : 'stdio', target: safeTarget(command, url), disabled: scalar(values.enabled) === 'false' || scalar(values.disabled) === 'true', signature: stableId(JSON.stringify(values)), manualOnly: true, strictJson: false })
  }
  for (const raw of document.text.split(/\r?\n/)) {
    const header = raw.match(/^\s*\[mcp_servers\.([A-Za-z0-9_-]+|"[^"]+"|'[^']+')\]\s*$/)
    if (header) { commit(); name = header[1].replace(/^['"]|['"]$/g, ''); values = {}; continue }
    if (/^\s*\[/.test(raw)) { commit(); name = ''; values = {}; continue }
    const pair = raw.match(/^\s*(command|url|enabled|disabled|args)\s*=\s*(.+?)\s*(?:#.*)?$/)
    if (name && pair) values[pair[1]] = pair[2].trim()
  }
  commit()
  const shell = document.text.match(/^\s*shell\s*=\s*["']([^"']+)["']/mi)?.[1] || 'not explicitly configured'
  return { servers, malformed: false, codexShell: shell.replace(/\\/g, '/').split('/').pop() || shell }
}

export function analyzeDocuments(documents: ConfigDocument[], platform = typeof navigator === 'undefined' ? 'test' : navigator.platform || 'browser'): AnalysisResult {
  const all: InternalServer[] = []
  const findings: ScanResult['findings'] = []
  const proposals: ScanResult['proposals'] = []
  const removals: RemovalAction[] = []
  const malformed: string[] = []
  let codexShell = 'not explicitly configured'
  const add = (severity: 'healthy' | 'attention' | 'review', title: string, detail: string) => findings.push({ id: stableId(title + detail), severity, title, detail })

  for (const document of documents) {
    try {
      const parsed = document.format === 'toml' ? parseTomlDocument(document) : parseJsonDocument(document)
      all.push(...parsed.servers)
      if (parsed.malformed) malformed.push(document.label)
      if ('codexShell' in parsed && typeof parsed.codexShell === 'string') codexShell = parsed.codexShell
    } catch { add('review', `${document.label} configuration could not be parsed`, 'Repair the syntax before making any change.') }
  }

  const bySignature = new Map<string, InternalServer[]>()
  const byName = new Map<string, InternalServer[]>()
  for (const server of all) {
    bySignature.set(server.signature, [...(bySignature.get(server.signature) || []), server])
    byName.set(server.name.toLowerCase(), [...(byName.get(server.name.toLowerCase()) || []), server])
  }
  for (const matches of bySignature.values()) if (matches.length > 1) {
    const [keep, ...duplicates] = matches
    add('attention', `Exact duplicate: ${keep.name}`, `The same server definition appears in ${matches.map((item) => item.source).join(', ')}.`)
    for (const duplicate of duplicates) {
      const actionId = `remove-${duplicate.id}`
      const canApply = duplicate.format === 'json' && duplicate.strictJson && !duplicate.manualOnly && Boolean(duplicate.groupKey)
      proposals.push({ id: actionId, title: `Remove duplicate ${duplicate.name} from ${duplicate.source}`, detail: `Keeps the identical definition in ${keep.source}. A sibling backup file is created first.`, kind: canApply ? 'remove-json-entry' : 'manual-review', canApply })
      if (canApply) removals.push({ actionId, path: duplicate.path, groupKey: duplicate.groupKey, serverName: duplicate.name })
    }
  }
  for (const matches of byName.values()) if (matches.length > 1 && new Set(matches.map((item) => item.signature)).size > 1) add('review', `Name conflict: ${matches[0].name}`, `This server name has different definitions in ${matches.map((item) => item.source).join(', ')}.`)
  for (const server of all.filter((item) => item.target === 'missing transport')) { add('attention', `${server.name} has no transport`, `Configured in ${server.source} without a command or URL.`); proposals.push({ id: `transport-${server.id}`, title: `Complete ${server.name} transport`, detail: 'Add the intended command or URL manually. MCPation never invents an endpoint.', kind: 'manual-review', canApply: false }) }
  for (const server of all.filter((item) => item.target === 'invalid URL')) add('attention', `${server.name} has an invalid URL`, `Configured in ${server.source}; review the endpoint manually.`)
  for (const server of all.filter((item) => item.disabled)) add('review', `${server.name} is disabled`, `Configured in ${server.source}; confirm whether it is intentionally retained.`)
  for (const source of malformed) add('review', `${source} configuration shape is unsupported`, 'The file exists but has no recognized MCP server collection.')

  const profiles = [...new Set(documents.map((document) => document.client))].map((name) => ({ name, configuredServers: all.filter((server) => server.client === name).map((server) => server.name), mcpAccess: 'configured files only', discovery: 'unknown' as const }))
  if (profiles.length > 1) for (const name of new Set(all.map((server) => server.name))) {
    const present = profiles.filter((profile) => profile.configuredServers.includes(name))
    if (present.length && present.length < profiles.length) add('review', `Coverage gap: ${name}`, `Configured for ${present.map((profile) => profile.name).join(', ')} but not every connected environment.`)
  }
  if (!all.length && !findings.length) add('healthy', 'No MCP entries found', 'The connected folder contains no readable configuration in the supported locations.')
  if (all.length && !findings.length) add('healthy', 'No obvious configuration conflicts', 'The browser-only scan found no duplicates, disabled entries, or invalid endpoints.')

  const recommendations: ScanResult['recommendations'] = proposals.map((proposal) => ({ id: proposal.id, priority: proposal.canApply ? 'high' : 'review', category: proposal.id.startsWith('transport-') ? 'compatibility' : 'cleanup', title: proposal.title, reason: proposal.detail, action: proposal.canApply ? 'Review the backed-up browser write' : 'Review with Codex' }))
  if (profiles.length > 2) recommendations.push({ id: 'consolidate-sources', priority: 'review', category: 'performance', title: 'Reduce configuration drift', reason: `${profiles.length} connected environments maintain separate MCP lists.`, action: 'Choose one canonical list and document intentional differences' })
  const servers = all.map(({ id, name, source, transport, target, disabled }) => ({ id, name, source, transport, target, disabled }))
  return { scan: { schemaVersion: 4, scannedAt: new Date().toISOString(), platform, host: { operatingSystem: 'Browser-granted filesystem', codexShell, recommendedShell: 'Use the shell explicitly configured for each project' }, sources: documents.map((document) => document.label), supportedSources: SUPPORTED_SOURCES, profiles, servers, findings, proposals, recommendations, privacy: 'Analysis runs in this browser tab. Only known MCP configuration files are read; secrets and file contents are never returned by WebMCP tools.' }, removals }
}
