import type { BetterLoopFeatures, LoopRun } from '../webmcp-types'

const HOST_ENDPOINTS = [
  'http://127.0.0.1:8767',
  'http://localhost:8767',
]
const REQUEST_TIMEOUT_MS = 900
const HEARTBEAT_MS = 15_000

export interface BetterLoopHostStatus {
  success: boolean
  hostConnected: boolean
  active: boolean
  mode: 'mcp-stdio' | string
  sessionId?: string | null
  activatedAt?: number | null
  expiresAt?: number | null
  features?: Partial<BetterLoopFeatures>
  run?: LoopRun | null
  message?: string
  error?: string
}

let activeEndpoint: string | null = null
let activeSessionId: string | null = null
let heartbeatTimer: number | null = null

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `betterloop-${crypto.randomUUID()}`
  }
  return `betterloop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function request(path: string, body?: Record<string, unknown>): Promise<BetterLoopHostStatus> {
  const endpoints = activeEndpoint ? [activeEndpoint] : HOST_ENDPOINTS
  let lastError = 'BetterLoop host MCP was not detected.'

  for (const endpoint of endpoints) {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(endpoint + path, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      const result = await response.json() as BetterLoopHostStatus
      if (!response.ok || result.success === false) {
        throw new Error(result.error || `BetterLoop host returned HTTP ${response.status}.`)
      }
      activeEndpoint = endpoint
      return result
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    } finally {
      window.clearTimeout(timer)
    }
  }

  activeEndpoint = null
  return { success: false, hostConnected: false, active: false, mode: 'unavailable', error: lastError, message: 'BetterLoop MCP is not connected in this Codex session yet.' }
}

function stopHeartbeat(): void {
  if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

function startHeartbeat(features?: BetterLoopFeatures): void {
  stopHeartbeat()
  if (!activeSessionId) return
  heartbeatTimer = window.setInterval(() => {
    if (!activeSessionId) return
    void request('/heartbeat', { sessionId: activeSessionId, features }).then((status) => {
      window.dispatchEvent(new CustomEvent('betterloop:host-status', { detail: status }))
      if (!status.active) {
        stopHeartbeat()
        activeSessionId = null
      }
    })
  }, HEARTBEAT_MS)
}

export async function probeBetterLoopHost(): Promise<BetterLoopHostStatus> {
  const status = await request('/status')
  window.dispatchEvent(new CustomEvent('betterloop:host-status', { detail: status }))
  return status
}

export async function activateBetterLoopHost(features: BetterLoopFeatures): Promise<BetterLoopHostStatus> {
  const sessionId = createSessionId()
  const status = await request('/activate', { sessionId, features })
  if (status.success && status.hostConnected) {
    activeSessionId = sessionId
    startHeartbeat(features)
  }
  window.dispatchEvent(new CustomEvent('betterloop:host-status', { detail: status }))
  return status
}

export async function syncBetterLoopHost(features: BetterLoopFeatures): Promise<BetterLoopHostStatus | null> {
  if (!activeSessionId) return null
  const status = await request('/heartbeat', { sessionId: activeSessionId, features })
  window.dispatchEvent(new CustomEvent('betterloop:host-status', { detail: status }))
  return status
}

export async function deactivateBetterLoopHost(): Promise<BetterLoopHostStatus | null> {
  stopHeartbeat()
  if (!activeSessionId) return null
  const status = await request('/deactivate', { sessionId: activeSessionId })
  activeSessionId = null
  activeEndpoint = null
  window.dispatchEvent(new CustomEvent('betterloop:host-status', { detail: status }))
  return status
}

export function getBetterLoopHostSessionId(): string | null {
  return activeSessionId
}
