export type FindingSeverity = 'healthy' | 'attention' | 'review'

export type WorkspaceArtifactKind = 'codex-config' | 'mcp-config' | 'instruction' | 'skill' | 'package-manifest' | 'lockfile' | 'other'

export interface WorkspaceArtifact {
  id: string
  path: string
  kind: WorkspaceArtifactKind
  label: string
  detail: string
}

export interface ToolSurfaceEntry {
  id: string
  name: string
  source: string
  declaredIn: string
  kind: 'configured-server' | 'package-dependency' | 'static-declaration'
  transport?: 'stdio' | 'http'
  target?: string
  confidence: 'high' | 'medium' | 'low'
}

export interface InstructionEntry {
  path: string
  kind: 'AGENTS.md' | 'AGENTS.override.md' | 'SKILL.md'
  depth: number
  label: string
}

export interface ReadinessScore {
  value: number
  label: 'ready' | 'needs-attention' | 'high-risk'
  signals: string[]
}

export interface WorkspaceGraphNode {
  id: string
  label: string
  kind: 'artifact' | 'configured-server' | 'package-signal' | 'finding'
}

export interface WorkspaceGraphEdge {
  from: string
  to: string
  relation: 'declares' | 'evidence-for'
}

export interface WorkspaceGraph {
  nodes: WorkspaceGraphNode[]
  edges: WorkspaceGraphEdge[]
  summary: string
}

export type WorkspaceAccessMode = 'direct' | 'import' | 'demo' | 'codex-host'

export interface HostHandoff {
  protocol: 'mcpation-codex-host/v1'
  status: 'approval-required' | 'rescan-required' | 'review-required'
  operation: 'scan' | 'apply'
  scope: {
    root: 'current Codex workspace root'
    relativeAllowlist: string[]
    maxFiles: number
    maxDepth: number
  }
  permissionRequest: {
    mode: 'read' | 'write'
    reason: string
    nativePermissionFlow: 'Codex host approval'
    preferredTools: string[]
  }
  actions: Array<{ actionId: string; path: string; serverName: string; operation: 'remove-json-entry'; backup: string }>
  nextSteps: string[]
}

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
  scope: { root: string; mode: WorkspaceAccessMode; filesConsidered: number }
  host: HostProfile
  sources: string[]
  supportedSources: string[]
  profiles: EnvironmentProfile[]
  servers: MCPServer[]
  findings: Finding[]
  proposals: FixProposal[]
  recommendations: Recommendation[]
  artifacts: WorkspaceArtifact[]
  toolSurface: ToolSurfaceEntry[]
  instructionChain: InstructionEntry[]
  workspaceGraph: WorkspaceGraph
  readiness: ReadinessScore
  hostHandoff?: HostHandoff
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
export interface ApplyResult {
  scan: ScanResult
  appliedActionIds: string[]
  skippedActionIds: string[]
  backups: string[]
}
export interface AnalysisResult { scan: ScanResult; removals: RemovalAction[] }
