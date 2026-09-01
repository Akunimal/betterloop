import { getModelContext, getWebMCPMode } from './webmcp/polyfill'
import type { WebMCPTool } from './webmcp-types'

export type FindingSeverity = 'healthy' | 'attention' | 'review'
export interface MCPServer { id: string; name: string; source: string; transport: 'stdio' | 'http'; target: string; disabled: boolean; available?: boolean }
export interface Finding { severity: FindingSeverity; title: string; detail: string }
export interface ScanResult { scannedAt: string; sources: string[]; servers: MCPServer[]; findings: Finding[]; privacy: string }

const baseUrl = 'http://127.0.0.1:4318'
let sessionToken = ''
let latestScan: ScanResult | null = null
let registered = false
async function request<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(baseUrl + path, { ...init, headers: { 'content-type': 'application/json', ...(sessionToken ? { 'x-mcpation-session': sessionToken } : {}), ...(init?.headers || {}) } }); const body = await response.json().catch(() => ({ error: 'The local companion returned an invalid response.' })); if (!response.ok) throw new Error(body.error || 'The local companion is unavailable.'); return body as T }
export async function startConsentSession(): Promise<ScanResult> { const session = await request<{ token: string }>('/session', { method: 'POST', body: JSON.stringify({ consent: true }) }); sessionToken = session.token; latestScan = await request<ScanResult>('/scan'); window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestScan })); return latestScan }
export const getLatestScan = () => latestScan
export const getMCPationMode = () => getWebMCPMode()
function requireScan() { if (!latestScan) throw new Error('No consented local scan is available. Ask the user to select Start local scan first.'); return latestScan }
const tools: WebMCPTool[] = [
  { name: 'mcpation_scan_environment', title: 'Scan the consented MCP environment', description: 'Reads the user-approved, redacted inventory from MCPation’s local companion. It never returns secrets, environment values, or headers.', inputSchema: { type: 'object', properties: {} }, execute: async () => { if (!sessionToken) throw new Error('The user has not started a local MCPation scan yet.'); latestScan = await request<ScanResult>('/scan'); window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestScan })); return latestScan } },
  { name: 'mcpation_get_inventory', title: 'Read the sanitized MCP inventory', description: 'Returns discovered MCP names, sources, transports, disabled state, and command availability. No credentials or headers are exposed.', inputSchema: { type: 'object', properties: {} }, execute: () => requireScan().servers },
  { name: 'mcpation_get_findings', title: 'Read MCP Doctor findings', description: 'Returns duplicate, disabled, unavailable, and review findings calculated from the consented local inventory.', inputSchema: { type: 'object', properties: {} }, execute: () => requireScan().findings },
  { name: 'mcpation_plan_cleanup', title: 'Generate a safe cleanup plan', description: 'Creates a review-only cleanup plan. It never changes a configuration or disables a server.', inputSchema: { type: 'object', properties: {} }, execute: () => { const scan = requireScan(); const review = scan.findings.filter((finding) => finding.severity !== 'healthy'); return { rule: 'Review only. MCPation does not edit, disable, or delete any configuration.', steps: review.length ? review.map((finding, index) => `${index + 1}. ${finding.title}: ${finding.detail}`) : ['No cleanup action is recommended. Keep the current configuration and rescan after changes.'] } } },
]
export const toolNames = tools.map((tool) => tool.name)
export async function registerMCPationTools(): Promise<string[]> { if (registered) return toolNames; const context = getModelContext(); for (const tool of tools) await context.registerTool(tool); registered = true; window.dispatchEvent(new CustomEvent('mcpation:registered')); return toolNames }
