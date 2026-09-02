import { analyzeDocuments } from './mcp-analysis.ts'
import type { AnalysisResult, ConfigDocument, Finding, InstructionEntry, ReadinessScore, ScanResult, ToolSurfaceEntry, WorkspaceArtifact, WorkspaceArtifactKind } from './mcp-types.ts'

export interface WorkspaceFile { path: string; text: string }

function stableId(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function normalized(path: string): string { return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase() }
function basename(path: string): string { return path.replace(/\\/g, '/').split('/').pop() || path }
function artifactKind(path: string): WorkspaceArtifactKind | null {
  const value = normalized(path)
  const name = basename(value)
  if (value.endsWith('/.codex/config.toml') || value === '.codex/config.toml') return 'codex-config'
  if (name === '.mcp.json' || name === 'mcp.json') return 'mcp-config'
  if (name === 'agents.md' || name === 'agents.override.md') return 'instruction'
  if (name === 'skill.md' && (value.includes('/skills/') || value.startsWith('skills/'))) return 'skill'
  if (name === 'package.json' || name === 'pyproject.toml' || name === 'requirements.txt' || name === 'setup.py') return 'package-manifest'
  if (name === 'package-lock.json' || name === 'pnpm-lock.yaml' || name === 'yarn.lock' || name === 'uv.lock' || name === 'poetry.lock') return 'lockfile'
  return null
}

function summarizeArtifact(kind: WorkspaceArtifactKind, path: string, text: string): string {
  if (kind === 'codex-config') return 'Codex configuration layer discovered; values and secrets stay local.'
  if (kind === 'mcp-config') return 'Project MCP configuration discovered; server entries are analyzed without executing them.'
  if (kind === 'instruction') return 'Codex instruction layer discovered; content is not returned through WebMCP.'
  if (kind === 'skill') return 'Codex skill manifest discovered; only metadata is counted.'
  if (kind === 'package-manifest') return `Package manifest discovered (${text.split(/\r?\n/).length} lines). MCP dependencies are counted without installing or running code.`
  if (kind === 'lockfile') return 'Dependency lockfile discovered; it is used only as evidence of reproducibility.'
  return `${path} discovered.`
}

function parsePackageDependencies(file: WorkspaceFile): ToolSurfaceEntry[] {
  if (basename(file.path).toLowerCase() !== 'package.json') return []
  try {
    const parsed = JSON.parse(file.text) as Record<string, unknown>
    const groups = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
    const entries: ToolSurfaceEntry[] = []
    for (const group of groups) {
      const values = parsed[group]
      if (!values || typeof values !== 'object' || Array.isArray(values)) continue
      for (const name of Object.keys(values as Record<string, unknown>)) {
        if (!/mcp|model[-_]?context|context[-_]?protocol/i.test(name)) continue
        entries.push({ id: `package:${stableId(`${file.path}:${group}:${name}`)}`, name, source: 'Workspace package', declaredIn: file.path, kind: 'package-dependency', confidence: 'medium' })
      }
    }
    return entries
  } catch { return [] }
}

function parsePythonDependencies(file: WorkspaceFile): ToolSurfaceEntry[] {
  const name = basename(file.path).toLowerCase()
  if (!['pyproject.toml', 'requirements.txt', 'setup.py'].includes(name)) return []
  return file.text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/(?:^|["'\s])([A-Za-z0-9_.-]*(?:mcp|model[-_]?context|context[-_]?protocol)[A-Za-z0-9_.-]*)/i)
    if (!match) return []
    const packageName = match[1]
    return [{ id: `package:${stableId(`${file.path}:${packageName}`)}`, name: packageName, source: 'Workspace Python package', declaredIn: file.path, kind: 'package-dependency' as const, confidence: 'medium' as const }]
  })
}

function instructionEntries(files: WorkspaceFile[]): InstructionEntry[] {
  return files.flatMap((file) => {
    const name = basename(file.path).toLowerCase()
    if (name !== 'agents.md' && name !== 'agents.override.md' && name !== 'skill.md') return []
    const depth = file.path.replace(/\\/g, '/').split('/').filter(Boolean).length
    const kind: InstructionEntry['kind'] = name === 'skill.md' ? 'SKILL.md' : name === 'agents.override.md' ? 'AGENTS.override.md' : 'AGENTS.md'
    return [{ path: file.path, kind, depth, label: kind === 'SKILL.md' ? 'Skill manifest' : 'Instruction layer' }]
  }).sort((left, right) => left.depth - right.depth || left.path.localeCompare(right.path))
}

function readiness(scan: ScanResult, artifacts: WorkspaceArtifact[], instructionChain: InstructionEntry[], toolSurface: ToolSurfaceEntry[]): ReadinessScore {
  const attention = scan.findings.filter((finding) => finding.severity === 'attention').length
  const review = scan.findings.filter((finding) => finding.severity === 'review').length
  const value = Math.max(0, Math.min(100, 100 - attention * 10 - review * 15 - (!artifacts.some((item) => item.kind === 'codex-config') ? 10 : 0)))
  const signals = [`${toolSurface.length} declared MCP/package signal${toolSurface.length === 1 ? '' : 's'}`, `${instructionChain.length} Codex instruction/skill file${instructionChain.length === 1 ? '' : 's'}`]
  if (!artifacts.some((item) => item.kind === 'codex-config')) signals.push('No .codex/config.toml in this scope')
  if (attention) signals.push(`${attention} attention finding${attention === 1 ? '' : 's'}`)
  if (review) signals.push(`${review} review finding${review === 1 ? '' : 's'}`)
  return { value, label: value >= 80 ? 'ready' : value >= 55 ? 'needs-attention' : 'high-risk', signals }
}

export function analyzeCodexWorkspace(files: WorkspaceFile[], configDocuments: ConfigDocument[], options: { root?: string; mode?: ScanResult['scope']['mode']; filesConsidered?: number; platform?: string } = {}): AnalysisResult {
  const base = analyzeDocuments(configDocuments, options.platform)
  const artifacts: WorkspaceArtifact[] = files.flatMap((file) => {
    const kind = artifactKind(file.path)
    return kind ? [{ id: `artifact:${stableId(file.path)}`, path: file.path, kind, label: basename(file.path), detail: summarizeArtifact(kind, file.path, file.text) }] : []
  })
  const instructionChain = instructionEntries(files)
  const toolSurface: ToolSurfaceEntry[] = [
    ...base.scan.servers.map((server) => {
      const document = configDocuments.find((item) => item.label === server.source)
      return { id: `configured:${server.id}`, name: server.name, source: server.source, declaredIn: document?.path || server.source, kind: 'configured-server' as const, transport: server.transport, target: server.target, confidence: 'high' as const }
    }),
    ...files.flatMap(parsePackageDependencies),
    ...files.flatMap(parsePythonDependencies),
  ]
  const findings: Finding[] = [...base.scan.findings]
  if (!artifacts.some((item) => item.kind === 'codex-config')) findings.push({ id: 'codex-config-missing', severity: 'review', title: 'Codex config is outside this scope', detail: 'Select the folder containing .codex/config.toml when you want to audit global Codex MCP settings.' })
  if (instructionChain.length === 0) findings.push({ id: 'instruction-chain-empty', severity: 'attention', title: 'No Codex instruction layer found', detail: 'Add or select a workspace containing AGENTS.md or a Codex skill when you want the audit to include agent guidance.' })
  const recommendations = [...base.scan.recommendations]
  if (toolSurface.some((item) => item.kind === 'package-dependency')) recommendations.push({ id: 'declared-mcp-packages', priority: 'review', category: 'coverage', title: 'Reconcile downloaded MCP packages', reason: 'The workspace declares MCP-related packages. Compare them with configured servers before removing or upgrading anything.', action: 'Review package-to-server wiring with Codex' })
  if (instructionChain.length) recommendations.push({ id: 'instruction-chain', priority: 'optional', category: 'compatibility', title: 'Keep the Codex instruction chain intentional', reason: `${instructionChain.length} instruction or skill file(s) are in scope and may affect the next agent run.`, action: 'Ask Codex to summarize precedence and remove stale guidance manually' })
  const scan: ScanResult = { ...base.scan, schemaVersion: 5, scope: { root: options.root || 'connected folder', mode: options.mode || 'direct', filesConsidered: options.filesConsidered ?? files.length }, findings, recommendations, artifacts, toolSurface, instructionChain, readiness: readiness({ ...base.scan, findings }, artifacts, instructionChain, toolSurface), privacy: 'Analysis runs in this browser tab. Only an allowlisted set of workspace/config files is read; secrets, environment values, headers, raw instruction text, and full local paths are never returned by WebMCP tools.' }
  return { scan, removals: base.removals }
}
