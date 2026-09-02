import { applyBrowserFixes, connectEnvironment, fileSystemAccessSupported, getAccessMode, getLatestAnalysis, grantWriteAccessToConnectedEnvironment, importEnvironment, ingestHostSnapshot, listBrowserBackups, rescanEnvironment, restoreBrowserBackup, restoreEnvironmentAccess, startDemoEnvironment } from './mcp-files.ts'
import { buildHostApplyHandoff, buildHostScanHandoff } from './codex-handoff.ts'
import { parseCleanupToolInput, parseHostHandoffInput, parseHostSnapshotInput, parseRequiredId } from './mcp-tool-input.ts'
import type { ScanResult } from './mcp-types.ts'
import { getModelContext, getWebMCPMode } from './webmcp/polyfill.ts'
import type { WebMCPTool } from './webmcp-types.ts'

export type { ScanResult } from './mcp-types.ts'
export type { BackupEntry, RestoreResult } from './mcp-types.ts'

let registered = false

export const getLatestScan = () => getLatestAnalysis()?.scan || null
export const getMCPationMode = () => getWebMCPMode()
export const supportsDirectDiskAccess = fileSystemAccessSupported
export const getEnvironmentAccessMode = getAccessMode
export const restoreConnectedEnvironment = restoreEnvironmentAccess

export async function startConsentSession(): Promise<ScanResult> {
  return (await connectEnvironment()).scan
}

export async function startImportedSession(files: FileList): Promise<ScanResult> {
  return (await importEnvironment(files)).scan
}

export function startDemoSession(): ScanResult {
  return startDemoEnvironment().scan
}

export async function rescanConnectedEnvironment(): Promise<ScanResult> {
  return (await rescanEnvironment()).scan
}

export async function applySupervisedFixes(selectedActionIds: string[]): Promise<ScanResult> {
  return (await applyBrowserFixes(selectedActionIds)).scan
}

export const listBackups = listBrowserBackups
export const restoreBackup = restoreBrowserBackup

export async function approveAndApplyBrowserFixes(selectedActionIds: string[]): Promise<ScanResult> {
  if (getAccessMode() !== 'demo') await grantWriteAccessToConnectedEnvironment()
  return (await applyBrowserFixes(selectedActionIds)).scan
}

export function requestHostHandoff(operation: 'scan' | 'apply', actionIds: string[] = []) {
  const handoff = operation === 'scan' ? buildHostScanHandoff(getAccessMode()) : buildHostApplyHandoff(getLatestAnalysis(), actionIds, getAccessMode())
  window.dispatchEvent(new CustomEvent('mcpation:handoff', { detail: handoff }))
  return handoff
}

function requireScan(): ScanResult {
  const scan = getLatestScan()
  if (!scan) throw new Error('No browser-granted environment is connected. Ask the user to select their environment folder on the page first.')
  return scan
}

export function buildFixPlan(scan: ScanResult) {
  return { automaticChanges: scan.proposals.filter((item) => item.canApply).length, requiresReview: scan.proposals.length, rule: 'Codex Doctor writes only selected deterministic JSON cleanup after explicit review and creates a sibling backup first.', items: scan.proposals }
}

const readOnly = { readOnlyHint: true, untrustedContentHint: false }
const write = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false, untrustedContentHint: false }
const emptyInput = { type: 'object', properties: {}, additionalProperties: false }
const tools: WebMCPTool[] = [
  { name: 'codex_scan_workspace', title: 'Scan the connected Codex workspace', description: 'Reads an allowlisted set of Codex, MCP, package, instruction, and skill files inside the folder the person already granted. It never executes downloaded code or opens a picker. If no browser workspace is connected, it returns a bounded Codex host-handoff fallback rather than claiming access.', annotations: readOnly, inputSchema: emptyInput, execute: async () => { try { return (await rescanEnvironment()).scan } catch (error) { if (!getLatestScan()) return { handoff: requestHostHandoff('scan'), message: error instanceof Error ? error.message : 'Native Codex host approval is required before scanning.' } ; throw error } } },
  { name: 'codex_get_tool_inventory', title: 'Inspect the declared MCP tool surface', description: 'Returns configured MCP servers and static MCP-related package signals. It distinguishes declarations from live runtime tools and never returns secrets or raw files.', annotations: readOnly, inputSchema: emptyInput, execute: () => ({ servers: requireScan().servers, toolSurface: requireScan().toolSurface }) },
  { name: 'codex_get_findings', title: 'Read Codex readiness findings', description: 'Returns evidence-based configuration, instruction-chain, package-wiring, and readiness findings from the latest scan.', annotations: readOnly, inputSchema: emptyInput, execute: () => ({ findings: requireScan().findings, readiness: requireScan().readiness }) },
  { name: 'codex_get_instruction_chain', title: 'Inspect Codex instructions and skills', description: 'Returns the ordered AGENTS and SKILL metadata found in scope without returning instruction text.', annotations: readOnly, inputSchema: emptyInput, execute: () => requireScan().instructionChain },
  { name: 'codex_get_workspace_graph', title: 'Inspect the workspace evidence graph', description: 'Returns a sanitized graph linking allowlisted configuration and package artifacts to their declared MCP signals and current non-healthy findings. It describes static evidence only and never executes code or returns file contents.', annotations: readOnly, inputSchema: emptyInput, execute: () => requireScan().workspaceGraph },
  { name: 'codex_explain_finding', title: 'Explain one readiness finding', description: 'Returns one finding by id so Codex and the user can discuss the evidence and next step without exposing file contents.', annotations: readOnly, inputSchema: { type: 'object', properties: { findingId: { type: 'string' } }, required: ['findingId'], additionalProperties: false }, execute: (input) => { const findingId = parseRequiredId(input, 'findingId'); const finding = requireScan().findings.find((item) => item.id === findingId); if (!finding) throw new Error(`Unknown finding id: ${findingId}`); return finding } },
  { name: 'codex_plan_hardening', title: 'Build a supervised Codex hardening plan', description: 'Creates a review-only plan from the latest scan. Ambiguous commands, TOML, policy, and instruction changes remain manual. The person must use the visible browser control to grant write access to the selected folder; an agent tool call cannot open that permission dialog.', annotations: readOnly, inputSchema: emptyInput, execute: () => ({ ...buildFixPlan(requireScan()), readiness: requireScan().readiness, artifacts: requireScan().artifacts }) },
  { name: 'codex_request_host_handoff', title: 'Request Codex host filesystem approval', description: 'Returns a bounded handshake for Codex to request native host filesystem permission, use fs/readDirectory/fs/readFile or fs/copy/fs/writeFile, and return only an allowlisted snapshot. This page never invokes host permissions itself.', annotations: readOnly, inputSchema: { type: 'object', properties: { operation: { type: 'string', enum: ['scan', 'apply'] }, actionIds: { type: 'array', items: { type: 'string' } } }, required: ['operation'], additionalProperties: false }, execute: (input) => { const { operation, actionIds } = parseHostHandoffInput(input); return requestHostHandoff(operation, actionIds) } },
  { name: 'codex_submit_host_snapshot', title: 'Submit a sanitized Codex host snapshot', description: 'Accepts only relative, allowlisted files read by Codex after native host approval and updates the shared readiness view. Raw files are analyzed in the page and are never returned by this tool.', annotations: readOnly, inputSchema: { type: 'object', properties: { files: { type: 'array', minItems: 1, maxItems: 240, items: { type: 'object', properties: { path: { type: 'string' }, text: { type: 'string' } }, required: ['path', 'text'], additionalProperties: false } } }, required: ['files'], additionalProperties: false }, execute: (input) => ingestHostSnapshot(parseHostSnapshotInput(input)).scan },
  { name: 'codex_apply_hardening', title: 'Apply selected deterministic hardening', description: 'After exact action ids are reviewed, applies only the in-memory demo action. In a real workspace, the person uses MCPation’s visible browser control to grant write access, create a sibling backup, apply the listed JSON cleanup, and rescan; this tool returns a bounded Codex host-handoff fallback because a tool call cannot open the required user-gesture permission dialog. It never invents commands, URLs, policies, or instruction text.', annotations: write, inputSchema: { type: 'object', properties: { actionIds: { type: 'array', items: { type: 'string' }, minItems: 1 }, confirm: { type: 'boolean', const: true } }, required: ['actionIds', 'confirm'], additionalProperties: false }, execute: async (input) => { const actionIds = parseCleanupToolInput(input); if (getAccessMode() !== 'demo') return { handoff: requestHostHandoff('apply', actionIds) }; const result = await applyBrowserFixes(actionIds); return { appliedActionIds: result.appliedActionIds, skippedActionIds: result.skippedActionIds, backups: result.backups, scan: result.scan } } },
  { name: 'codex_verify_workspace', title: 'Verify the Codex workspace after changes', description: 'Rescans the granted workspace and returns the new readiness score, findings, and declared tool surface. The visible audit trail marks the verification only after this rescan completes.', annotations: readOnly, inputSchema: emptyInput, execute: async () => { const scan = (await rescanEnvironment()).scan; const result = { readiness: scan.readiness, findings: scan.findings, toolSurface: scan.toolSurface }; window.dispatchEvent(new CustomEvent('mcpation:verified', { detail: result })); return result } },
  { name: 'codex_get_access_scope', title: 'Explain the granted Codex scope', description: 'Returns the active folder boundary, access mode, and privacy guarantees. It never claims whole-system access. A read-only import includes the bounded Codex host-handoff fallback; a direct browser grant can be rescanned in place.', annotations: readOnly, inputSchema: emptyInput, execute: () => { const scan = requireScan(); const mode = getAccessMode(); return { scope: scan.scope, platform: scan.platform, privacy: scan.privacy, hostHandoff: mode === 'import' ? buildHostScanHandoff(mode) : null } } },
]

export const toolNames = tools.map((tool) => tool.name)

export async function registerMCPationTools(): Promise<string[]> {
  if (registered) return toolNames
  const context = getModelContext()
  for (const tool of tools) await context.registerTool(tool)
  registered = true
  window.dispatchEvent(new CustomEvent('mcpation:registered'))
  return toolNames
}
