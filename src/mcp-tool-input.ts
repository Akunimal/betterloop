export function parseCleanupToolInput(input: Record<string, unknown>): string[] {
  if (input.confirm !== true) throw new Error('A Codex hardening call must include confirm: true after reviewing the exact action ids.')
  if (!Array.isArray(input.actionIds) || input.actionIds.length === 0 || input.actionIds.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new Error('actionIds must be a non-empty array of action id strings from codex_plan_hardening.')
  }
  return [...new Set(input.actionIds as string[])]
}

export function parseRequiredId(input: Record<string, unknown>, field: string): string {
  const value = input[field]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string from the latest Codex Doctor scan.`)
  return value
}
