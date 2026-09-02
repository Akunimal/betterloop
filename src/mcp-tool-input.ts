import type { WorkspaceFile } from './codex-analysis.ts'

export function parseCleanupToolInput(input: Record<string, unknown>): string[] {
  if (input.confirm !== true) throw new Error('A Codex hardening call must include confirm: true after reviewing the exact action ids.')
  if (!Array.isArray(input.actionIds) || input.actionIds.length === 0 || input.actionIds.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new Error('actionIds must be a non-empty array of action id strings from codex_plan_hardening.')
  }
  return [...new Set(input.actionIds as string[])]
}

export function parseHostHandoffInput(input: Record<string, unknown>): { operation: 'scan' | 'apply'; actionIds: string[] } {
  const operation = input.operation
  if (operation !== 'scan' && operation !== 'apply') throw new Error('operation must be either scan or apply.')
  if (input.actionIds !== undefined && (!Array.isArray(input.actionIds) || input.actionIds.some((value) => typeof value !== 'string' || !value.trim()))) {
    throw new Error('actionIds must be an array of non-empty action id strings from codex_plan_hardening.')
  }
  return { operation, actionIds: input.actionIds ? [...new Set(input.actionIds as string[])] : [] }
}

export function parseHostSnapshotInput(input: Record<string, unknown>): WorkspaceFile[] {
  if (!Array.isArray(input.files) || input.files.length === 0) throw new Error('files must be a non-empty array from the approved Codex host workspace scan.')
  if (input.files.length > 240) throw new Error('files exceeds the 240-file Codex workspace limit.')
  return input.files.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('Each host snapshot file must contain a relative path and text.')
    const item = value as Record<string, unknown>
    if (typeof item.path !== 'string' || typeof item.text !== 'string') throw new Error('Each host snapshot file must contain a relative path and text.')
    return { path: item.path, text: item.text }
  })
}

export function parseRequiredId(input: Record<string, unknown>, field: string): string {
  const value = input[field]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string from the latest Codex Doctor scan.`)
  return value
}
