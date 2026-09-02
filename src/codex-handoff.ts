import type { AnalysisResult, HostHandoff, WorkspaceAccessMode } from './mcp-types.ts'

export const CODEX_HOST_ALLOWLIST = [
  '.codex/config.toml',
  '.mcp.json',
  'mcp.json',
  '**/package.json',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/pyproject.toml',
  '**/requirements.txt',
  '**/uv.lock',
  '**/poetry.lock',
  '**/setup.py',
  '**/AGENTS.md',
  '**/AGENTS.override.md',
  '**/skills/**/SKILL.md',
]

const MAX_WORKSPACE_FILES = 240
const MAX_WORKSPACE_DEPTH = 5

function baseHandoff(operation: HostHandoff['operation'], mode: WorkspaceAccessMode | null): HostHandoff {
  const permissionMode = operation === 'apply' ? 'write' : 'read'
  const preferredTools = operation === 'apply'
    ? ['fs/readFile', 'fs/copy', 'fs/writeFile']
    : ['fs/readDirectory', 'fs/readFile']
  const reason = operation === 'apply'
    ? 'MCPation has a reviewed deterministic JSON action. Codex must request native write approval before creating a sibling backup and applying only that action.'
    : 'MCPation needs the Codex host to inspect the current workspace because the page has no host filesystem scope.'
  const nextSteps = operation === 'apply'
    ? [
        'Ask the user for Codex host filesystem write approval scoped to the current workspace root.',
        'Read the exact JSON file, copy it to the sibling backup name, then remove only the listed server key.',
        'Call codex_submit_host_snapshot with the refreshed allowlisted files, then call codex_verify_workspace.',
      ]
    : [
        'Ask the user for Codex host filesystem read approval scoped to the current workspace root.',
        'Use the preferred native filesystem tools to read only the relative allowlist below; never execute downloaded MCP code.',
        'Call codex_submit_host_snapshot with those allowlisted files so MCPation can update the shared readiness view.',
      ]
  return {
    protocol: 'mcpation-codex-host/v1',
    status: mode === 'codex-host' && operation === 'apply' ? 'approval-required' : 'approval-required',
    operation,
    scope: { root: 'current Codex workspace root', relativeAllowlist: CODEX_HOST_ALLOWLIST, maxFiles: MAX_WORKSPACE_FILES, maxDepth: MAX_WORKSPACE_DEPTH },
    permissionRequest: { mode: permissionMode, reason, nativePermissionFlow: 'Codex host approval', preferredTools },
    actions: [],
    nextSteps,
  }
}

export function buildHostScanHandoff(mode: WorkspaceAccessMode | null = null): HostHandoff {
  return baseHandoff('scan', mode)
}

export function buildHostApplyHandoff(analysis: AnalysisResult | null, actionIds: string[], mode: WorkspaceAccessMode | null = null): HostHandoff {
  const handoff = baseHandoff('apply', mode)
  if (mode === 'demo') {
    return { ...handoff, status: 'rescan-required', nextSteps: ['The deterministic demo has no host files. Submit a real Codex host snapshot before requesting a host write.', ...handoff.nextSteps.slice(1)] }
  }
  if (!analysis) {
    return { ...handoff, status: 'rescan-required', nextSteps: ['Run codex_scan_workspace or codex_request_host_handoff with operation scan first.', ...handoff.nextSteps.slice(1)] }
  }
  const requested = [...new Set(actionIds)]
  const known = new Set(analysis.removals.map((action) => action.actionId))
  const unknown = requested.filter((actionId) => !known.has(actionId))
  if (unknown.length) throw new Error(`The host handoff contains unknown action id(s): ${unknown.join(', ')}`)
  const actions = analysis.removals.filter((action) => requested.includes(action.actionId))
  if (!actions.length) {
    return { ...handoff, status: 'review-required', nextSteps: ['Choose an exact deterministic action id from codex_plan_hardening before requesting a host write.', ...handoff.nextSteps.slice(1)] }
  }
  return {
    ...handoff,
    actions: actions.map((action) => ({ actionId: action.actionId, path: action.path, serverName: action.serverName, operation: 'remove-json-entry', backup: `${action.path}.mcpation-<timestamp>.bak` })),
  }
}
