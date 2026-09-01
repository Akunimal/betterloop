import { getModelContext, getWebMCPMode } from './webmcp/polyfill'
import type { WebMCPTool } from './webmcp-types'

export type FindingSeverity = 'healthy' | 'attention' | 'review'
export interface MCPServer { id: string; name: string; source: string; transport: 'stdio' | 'http'; target: string; disabled: boolean; available?: boolean }
export interface Finding { severity: FindingSeverity; title: string; detail: string }
export interface FixProposal { id: string; title: string; detail: string; kind: 'remove-json-entry' | 'manual-review'; canApply: boolean }
export interface EnvironmentProfile { name: string; configuredServers: string[]; mcpAccess: string; discovery: 'on' | 'off' | 'unknown' }
export interface HostProfile { operatingSystem: string; gitBashInstalled: boolean; codexShell: string; recommendedShell: string }
export interface ScanResult { schemaVersion: number; scannedAt: string; platform: string; host: HostProfile; sources: string[]; supportedSources: string[]; profiles: EnvironmentProfile[]; servers: MCPServer[]; findings: Finding[]; proposals: FixProposal[]; privacy: string }

const baseUrl = 'http://127.0.0.1:4318'
let sessionToken = ''
let latestScan: ScanResult | null = null
let registered = false
async function request<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(baseUrl + path, { ...init, headers: { 'content-type': 'application/json', ...(sessionToken ? { 'x-mcpation-session': sessionToken } : {}), ...(init?.headers || {}) } }); const body = await response.json().catch(() => ({ error: 'The local companion returned an invalid response.' })); if (!response.ok) throw new Error(body.error || 'The local companion is unavailable.'); return body as T }
function normalizeScan(raw: Partial<ScanResult>): ScanResult {
  const servers = Array.isArray(raw.servers) ? raw.servers : []
  const platform = raw.platform || 'local machine'
  const legacyProfiles = [...new Set(servers.map((server) => server.source))].map((name) => ({ name, configuredServers: servers.filter((server) => server.source === name).map((server) => server.name), mcpAccess: 'unknown', discovery: 'unknown' as const }))
  return {
    schemaVersion: raw.schemaVersion || 1,
    scannedAt: raw.scannedAt || new Date().toISOString(),
    platform,
    host: raw.host || { operatingSystem: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : platform === 'linux' ? 'Linux' : 'Unknown', gitBashInstalled: false, codexShell: 'not checked', recommendedShell: 'restart the local companion to check shell compatibility' },
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    supportedSources: Array.isArray(raw.supportedSources) ? raw.supportedSources : [],
    profiles: Array.isArray(raw.profiles) ? raw.profiles : legacyProfiles,
    servers,
    findings: Array.isArray(raw.findings) ? raw.findings : [],
    proposals: Array.isArray(raw.proposals) ? raw.proposals : [],
    privacy: raw.privacy || 'Only redacted MCP metadata is shown.',
  }
}
export async function startConsentSession(): Promise<ScanResult> { const session = await request<{ token: string }>('/session', { method: 'POST', body: JSON.stringify({ consent: true }) }); sessionToken = session.token; latestScan = normalizeScan(await request<Partial<ScanResult>>('/scan')); window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestScan })); return latestScan }
export async function applySupervisedFixes(selectedActionIds: string[]): Promise<ScanResult> { const response = await request<{ scan: Partial<ScanResult> }>('/apply', { method: 'POST', body: JSON.stringify({ selectedActionIds, confirmation: 'APPLY_SUPERVISED_FIXES' }) }); latestScan = normalizeScan(response.scan); window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestScan })); return latestScan }
export const getLatestScan = () => latestScan
export const getMCPationMode = () => getWebMCPMode()
function requireScan() { if (!latestScan) throw new Error('No consented local scan is available. Ask the user to select Start local scan first.'); return latestScan }
export function buildFixPlan(scan: ScanResult) { return { automaticChanges: 0, requiresReview: scan.proposals.length, rule: 'MCPation never edits configuration without a file-by-file user confirmation.', items: scan.proposals } }
const tools: WebMCPTool[] = [
  { name: 'mcpation_scan_environment', title: 'Scan the consented MCP environment', description: 'Reads the user-approved, redacted inventory from MCPation’s local companion. It never returns secrets, environment values, or headers.', inputSchema: { type: 'object', properties: {} }, execute: async () => { if (!sessionToken) throw new Error('The user has not started a local MCPation scan yet.'); latestScan = normalizeScan(await request<Partial<ScanResult>>('/scan')); window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestScan })); return latestScan } },
  { name: 'mcpation_get_inventory', title: 'Read the sanitized MCP inventory', description: 'Returns discovered MCP names, sources, transports, disabled state, and command availability. No credentials or headers are exposed.', inputSchema: { type: 'object', properties: {} }, execute: () => requireScan().servers },
  { name: 'mcpation_get_findings', title: 'Read MCP Doctor findings', description: 'Returns duplicate, invalid transport, disabled, unavailable, and review findings calculated from the consented local inventory.', inputSchema: { type: 'object', properties: {} }, execute: () => requireScan().findings },
  { name: 'mcpation_get_environment_matrix', title: 'Compare configured MCP access by environment', description: 'Returns a redacted matrix of which discovered IDE environment configures each MCP server and whether its MCP access policy is restricted. It reports configuration intent, not runtime tool execution.', inputSchema: { type: 'object', properties: {} }, execute: () => requireScan().profiles },
  { name: 'mcpation_get_host_profile', title: 'Read host shell compatibility', description: 'Returns the operating system, whether Git Bash is detected on Windows, the configured Codex shell name when explicitly set, and a quoting-safe recommendation. It never returns paths or configuration contents.', inputSchema: { type: 'object', properties: {} }, execute: () => requireScan().host },
  { name: 'mcpation_plan_cleanup', title: 'Generate a safe cleanup plan', description: 'Creates a review-only cleanup plan. It never changes a configuration or disables a server.', inputSchema: { type: 'object', properties: {} }, execute: () => buildFixPlan(requireScan()) },
]
export const toolNames = tools.map((tool) => tool.name)
export async function registerMCPationTools(): Promise<string[]> { if (registered) return toolNames; const context = getModelContext(); for (const tool of tools) await context.registerTool(tool); registered = true; window.dispatchEvent(new CustomEvent('mcpation:registered')); return toolNames }
