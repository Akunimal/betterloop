export type FindingSeverity = 'healthy' | 'attention' | 'review'

export interface MCPServer {
  id: string
  name: string
  source: string
  transport: 'stdio' | 'http'
  target: string
  disabled: boolean
}

export interface Finding { id: string; severity: FindingSeverity; title: string; detail: string }
export interface FixProposal { id: string; title: string; detail: string; kind: 'remove-json-entry' | 'manual-review'; canApply: boolean }
export interface EnvironmentProfile { name: string; configuredServers: string[]; mcpAccess: string; discovery: 'on' | 'off' | 'unknown' }
export interface HostProfile { operatingSystem: string; codexShell: string; recommendedShell: string }
export interface Recommendation { id: string; priority: 'high' | 'review' | 'optional'; category: 'cleanup' | 'compatibility' | 'coverage' | 'performance'; title: string; reason: string; action: string }

export interface ScanResult {
  schemaVersion: number
  scannedAt: string
  platform: string
  host: HostProfile
  sources: string[]
  supportedSources: string[]
  profiles: EnvironmentProfile[]
  servers: MCPServer[]
  findings: Finding[]
  proposals: FixProposal[]
  recommendations: Recommendation[]
  privacy: string
}

export interface ConfigDocument {
  label: string
  client: string
  path: string
  format: 'json' | 'toml'
  text: string
  manualOnly?: boolean
}

export interface RemovalAction { actionId: string; path: string; groupKey: string; serverName: string }
export interface AnalysisResult { scan: ScanResult; removals: RemovalAction[] }
