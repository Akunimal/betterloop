import { applyBrowserFixes, connectEnvironment, fileSystemAccessSupported, getAccessMode, getLatestAnalysis, importEnvironment, rescanEnvironment, restoreEnvironmentAccess } from './mcp-files'
import type { ScanResult } from './mcp-types'
import { getModelContext, getWebMCPMode } from './webmcp/polyfill'
import type { WebMCPTool } from './webmcp-types'

export type { ScanResult } from './mcp-types'

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

export async function rescanConnectedEnvironment(): Promise<ScanResult> {
  return (await rescanEnvironment()).scan
}

export async function applySupervisedFixes(selectedActionIds: string[]): Promise<ScanResult> {
  return (await applyBrowserFixes(selectedActionIds)).scan
}

function requireScan(): ScanResult {
  const scan = getLatestScan()
  if (!scan) throw new Error('No browser-granted environment is connected. Ask the user to select their environment folder on the page first.')
  return scan
}

export function buildFixPlan(scan: ScanResult) {
  return { automaticChanges: 0, requiresReview: scan.proposals.length, rule: 'MCPation writes only a selected deterministic JSON cleanup after visible confirmation and creates a sibling backup first.', items: scan.proposals }
}

const readOnly = { readOnlyHint: true, untrustedContentHint: false }
const tools: WebMCPTool[] = [
  { name: 'mcpation_scan_environment', title: 'Rescan the connected MCP environment', description: 'Re-reads only known MCP configuration paths inside the folder the user granted to this web page. It never opens a picker or installs a local service.', annotations: readOnly, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: async () => (await rescanEnvironment()).scan },
  { name: 'mcpation_get_inventory', title: 'Read the sanitized MCP inventory', description: 'Returns configured MCP names, source applications, transports, disabled state, and redacted targets from the browser-local analysis.', annotations: readOnly, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: () => requireScan().servers },
  { name: 'mcpation_get_findings', title: 'Read configuration findings', description: 'Returns duplicate, invalid transport, disabled, malformed, and cross-environment findings from the connected files.', annotations: readOnly, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: () => requireScan().findings },
  { name: 'mcpation_get_environment_matrix', title: 'Compare configured MCP access by environment', description: 'Compares which MCP servers are configured in each connected IDE without claiming that a server is currently running.', annotations: readOnly, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: () => requireScan().profiles },
  { name: 'mcpation_get_access_scope', title: 'Explain the browser-granted access scope', description: 'Returns the active privacy boundary: browser-only analysis of known MCP configuration paths inside the user-selected folder.', annotations: readOnly, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: () => ({ platform: requireScan().platform, connectedSources: requireScan().sources, supportedSources: requireScan().supportedSources, privacy: requireScan().privacy }) },
  { name: 'mcpation_get_recommendations', title: 'Get the environment glow-up plan', description: 'Returns prioritized cleanup, compatibility, coverage, and performance recommendations calculated entirely in the browser.', annotations: readOnly, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: () => requireScan().recommendations },
  { name: 'mcpation_plan_cleanup', title: 'Generate a supervised cleanup plan', description: 'Creates a review-only plan. It does not write configuration; the user must select and confirm a supported change in the visible page.', annotations: readOnly, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: () => buildFixPlan(requireScan()) },
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
