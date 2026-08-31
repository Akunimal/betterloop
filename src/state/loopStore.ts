import type {
  BetterLoopFeatures,
  BetterLoopSettings,
  BetterLoopStore,
  Blocker,
  Checkpoint,
  CompletionCheck,
  DecisionOption,
  LoopEvent,
  LoopEventType,
  LoopRun,
  StreamState,
} from '../webmcp-types'

export const STORAGE_KEY = 'betterloop-store-v1'
export const LOOP_STATE_EVENT = 'betterloop:state'

const defaultFeatures: BetterLoopFeatures = {
  checkpoints: true,
  completionVerification: true,
  blockerHandoffs: true,
  streamMonitor: true,
  quotaContinuation: true,
  autoContinue: true,
  askIfDone: true,
  soundAlerts: true,
  researchBeforeBlocking: true,
  activityLog: true,
}

const defaultSettings: BetterLoopSettings = {
  enabled: false,
  features: defaultFeatures,
  quietThresholdSeconds: 30,
}

let store: BetterLoopStore = loadStore()

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadStore(): BetterLoopStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as BetterLoopStore
      if (parsed?.version === 1 && parsed.runs && parsed.settings) {
        return {
          ...parsed,
          settings: {
          ...defaultSettings,
          ...parsed.settings,
          enabled: false,
          features: { ...defaultFeatures, ...parsed.settings.features },
          },
        }
      }
    }
  } catch {
    // A browser privacy mode or malformed local state should not break the app.
  }
  return { version: 1, activeRunId: null, runs: {}, settings: { ...defaultSettings, features: { ...defaultFeatures } } }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    window.dispatchEvent(new CustomEvent(LOOP_STATE_EVENT, { detail: store }))
  } catch {
    // The UI can continue to operate in memory if storage is unavailable.
  }
}

function makeEvent(type: LoopEventType, title: string, detail: string): LoopEvent {
  return { id: createId('event'), type, title, detail, createdAt: Date.now() }
}

function activeRun(): LoopRun | null {
  return store.activeRunId ? store.runs[store.activeRunId] ?? null : null
}

function touch(run: LoopRun): void {
  run.updatedAt = Date.now()
}

function saveRun(run: LoopRun): LoopRun {
  touch(run)
  store.runs[run.runId] = run
  store.activeRunId = run.runId
  persist()
  return run
}

function appendEvent(run: LoopRun, type: LoopEventType, title: string, detail: string): void {
  run.events = [...run.events, makeEvent(type, title, detail)].slice(-80)
}

function makeRun(goal: string, requestedRunId?: string): LoopRun {
  const timestamp = Date.now()
  const runId = requestedRunId || createId('run')
  return {
    version: 1,
    runId,
    goal: goal.trim() || 'Complete the requested task',
    status: 'running',
    createdAt: timestamp,
    updatedAt: timestamp,
    currentStep: 'Task started',
    nextAction: 'Continue the task and report a checkpoint when the phase changes.',
    lastHeartbeatAt: timestamp,
    lastAgentSignalAt: timestamp,
    streamState: 'live',
    completionChecks: [],
    checkpoints: [],
    blockers: [],
    events: [makeEvent('run_started', 'Run started', goal.trim() || 'Task started')],
  }
}

export function getStore(): BetterLoopStore {
  return store
}

export function getRun(runId?: string): LoopRun | null {
  return (runId ? store.runs[runId] : activeRun()) ?? null
}

export function subscribeLoopStore(listener: () => void): () => void {
  const onChange = () => listener()
  window.addEventListener(LOOP_STATE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(LOOP_STATE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function isFeatureEnabled(feature: keyof BetterLoopFeatures): boolean {
  return store.settings.enabled && store.settings.features[feature]
}

export function updateSettings(changes: Partial<BetterLoopSettings> & { features?: Partial<BetterLoopFeatures> }): BetterLoopSettings {
  store.settings = {
    ...store.settings,
    ...changes,
    features: { ...store.settings.features, ...(changes.features || {}) },
  }
  persist()
  return store.settings
}

export function startRun(goal: string, requestedRunId?: string): LoopRun {
  const run = makeRun(goal, requestedRunId)
  return saveRun(run)
}

export function checkpointRun(input: {
  runId?: string
  checkpointId?: string
  label: string
  summary: string
  nextAction: string
  status?: 'in_progress' | 'completed' | 'skipped'
}): LoopRun | null {
  if (!isFeatureEnabled('checkpoints')) return getRun(input.runId)
  const run = getRun(input.runId)
  if (!run) return null
  const timestamp = Date.now()
  const checkpoint: Checkpoint = {
    id: input.checkpointId || createId('checkpoint'),
    label: input.label,
    summary: input.summary,
    nextAction: input.nextAction,
    status: input.status || 'in_progress',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const existing = run.checkpoints.findIndex((item) => item.id === checkpoint.id)
  if (existing >= 0) run.checkpoints[existing] = { ...run.checkpoints[existing], ...checkpoint, createdAt: run.checkpoints[existing].createdAt }
  else run.checkpoints = [...run.checkpoints, checkpoint]
  run.currentStep = input.label
  run.nextAction = input.nextAction
  run.streamState = 'live'
  run.lastAgentSignalAt = timestamp
  appendEvent(run, 'checkpoint', input.label, input.summary)
  return saveRun(run)
}

export function reportBlocker(input: {
  runId?: string
  blockerId?: string
  title: string
  detail: string
  options: DecisionOption[]
}): LoopRun | null {
  if (!isFeatureEnabled('blockerHandoffs')) return getRun(input.runId)
  const run = getRun(input.runId)
  if (!run) return null
  const blocker: Blocker = {
    id: input.blockerId || createId('blocker'),
    title: input.title,
    detail: input.detail,
    options: input.options,
    status: 'open',
    createdAt: Date.now(),
  }
  const existing = run.blockers.findIndex((item) => item.id === blocker.id)
  if (existing >= 0) run.blockers[existing] = { ...run.blockers[existing], ...blocker, createdAt: run.blockers[existing].createdAt }
  else run.blockers = [...run.blockers, blocker]
  run.status = 'waiting_for_user'
  run.nextAction = 'Choose a decision above, then continue from this blocker.'
  appendEvent(run, 'blocker', input.title, input.detail)
  return saveRun(run)
}

export function resolveBlocker(blockerId: string, optionId: string, runId?: string): LoopRun | null {
  const run = getRun(runId)
  if (!run) return null
  const blocker = run.blockers.find((item) => item.id === blockerId)
  const option = blocker?.options.find((item) => item.id === optionId)
  if (!blocker || !option) return run
  blocker.status = 'resolved'
  blocker.selectedOptionId = optionId
  blocker.resolvedAt = Date.now()
  run.status = 'running'
  run.currentStep = `Decision: ${option.label}`
  run.nextAction = 'Continue the original task from the selected decision.'
  run.lastAgentSignalAt = Date.now()
  run.streamState = 'live'
  appendEvent(run, 'decision', 'User decision recorded', option.label)
  return saveRun(run)
}

export function recordAgentSignal(runId?: string, phase?: string): LoopRun | null {
  const run = getRun(runId)
  if (!run) return null
  run.lastHeartbeatAt = Date.now()
  run.lastAgentSignalAt = Date.now()
  run.streamState = 'live'
  if (phase) run.currentStep = phase
  if (run.status === 'resuming') run.status = 'running'
  return saveRun(run)
}

export function getEffectiveStreamState(run: LoopRun | null): StreamState {
  if (!run) return 'unknown'
  if (run.streamState === 'interrupted') return 'interrupted'
  if (!isFeatureEnabled('streamMonitor') || run.status === 'completed') return run.streamState
  const age = Date.now() - run.lastAgentSignalAt
  return age > store.settings.quietThresholdSeconds * 1000 ? 'quiet' : run.streamState
}

export function markStreamInterrupted(runId?: string, reason = 'No agent heartbeat was received before the monitor threshold.'): LoopRun | null {
  if (!isFeatureEnabled('streamMonitor')) return getRun(runId)
  const run = getRun(runId)
  if (!run) return null
  run.streamState = 'interrupted'
  run.status = 'blocked'
  run.resumeReason = 'stream_interruption'
  run.nextAction = 'Reconnect the agent stream and continue from the last checkpoint.'
  appendEvent(run, 'stream_interrupted', 'Stream interruption detected', reason)
  return saveRun(run)
}

export function recordCompletionCheck(input: {
  runId?: string
  checkId?: string
  criterion: string
  passed: boolean
  evidence: string
}): LoopRun | null {
  if (!isFeatureEnabled('completionVerification')) return getRun(input.runId)
  const run = getRun(input.runId)
  if (!run) return null
  const check: CompletionCheck = {
    id: input.checkId || createId('check'),
    criterion: input.criterion,
    passed: input.passed,
    evidence: input.evidence,
    checkedAt: Date.now(),
  }
  const existing = run.completionChecks.findIndex((item) => item.id === check.id)
  if (existing >= 0) run.completionChecks[existing] = check
  else run.completionChecks = [...run.completionChecks, check]
  appendEvent(run, 'verification', input.passed ? 'Completion criterion passed' : 'Completion criterion needs work', `${input.criterion}: ${input.evidence}`)
  return saveRun(run)
}

export function assessCompletion(runId?: string): {
  run: LoopRun | null
  shouldContinue: boolean
  continueInstruction: string
} {
  const run = getRun(runId)
  if (!run) return { run: null, shouldContinue: true, continueInstruction: 'Start the task first, then verify its outcome.' }
  const failed = run.completionChecks.filter((check) => !check.passed)
  const openBlockers = run.blockers.filter((blocker) => blocker.status === 'open')
  const pending = run.completionChecks.length === 0
  const waiting = run.status === 'waiting_for_quota' || run.status === 'paused'
  const shouldContinue = pending || failed.length > 0 || openBlockers.length > 0 || waiting
  const reason = openBlockers.length
    ? `Resolve blocker: ${openBlockers[0].title}.`
    : pending
      ? 'Add evidence for each completion criterion.'
      : failed.length
        ? `Continue from: ${failed[0].criterion}.`
        : run.nextAction
  run.nextAction = shouldContinue ? reason : 'No further action required.'
  if (shouldContinue && run.status === 'completed') run.status = 'running'
  appendEvent(run, 'verification', shouldContinue ? 'Task needs continuation' : 'Task appears complete', run.nextAction)
  saveRun(run)
  return { run, shouldContinue, continueInstruction: shouldContinue ? `The task is incomplete. ${reason}` : 'The task is complete and verified.' }
}

export function setQuotaWait(runId?: string, retryAt = Date.now() + 15_000, detail = 'Agent quota is expected to reset before the next continuation.'): LoopRun | null {
  if (!isFeatureEnabled('quotaContinuation')) return getRun(runId)
  const run = getRun(runId)
  if (!run) return null
  run.status = 'waiting_for_quota'
  run.expectedResumeAt = retryAt
  run.resumeReason = 'quota_reset'
  run.nextAction = `Continue after quota reset at ${new Date(retryAt).toLocaleTimeString()}.`
  appendEvent(run, 'quota_wait', 'Waiting for quota reset', detail)
  return saveRun(run)
}

export function resumeRun(runId?: string): { run: LoopRun | null; shouldWait: boolean; continueInstruction: string } {
  const run = getRun(runId)
  if (!run) return { run: null, shouldWait: false, continueInstruction: 'Start the task first.' }
  if (run.status === 'waiting_for_quota' && run.expectedResumeAt && Date.now() < run.expectedResumeAt) {
    return { run, shouldWait: true, continueInstruction: `Wait until ${new Date(run.expectedResumeAt).toLocaleTimeString()}, then call betterloop_resume and continue.` }
  }
  run.status = 'resuming'
  run.streamState = 'live'
  run.lastAgentSignalAt = Date.now()
  run.nextAction = run.resumeReason === 'quota_reset'
    ? 'Quota window is available. Continue the original task from the last checkpoint.'
    : 'Continue the original task from the last checkpoint and verify the outcome.'
  appendEvent(run, 'resumed', 'Continuation requested', run.nextAction)
  saveRun(run)
  return { run, shouldWait: false, continueInstruction: run.nextAction }
}

export function releaseQuotaForDemo(runId?: string): LoopRun | null {
  const run = getRun(runId)
  if (!run || run.status !== 'waiting_for_quota') return run
  run.expectedResumeAt = Date.now()
  return saveRun(run)
}

export function finishRun(runId?: string, summary?: string): { run: LoopRun | null; success: boolean; continueInstruction: string } {
  const run = getRun(runId)
  if (!run) return { run: null, success: false, continueInstruction: 'Start the task first.' }
  const assessment = assessCompletion(run.runId)
  if (assessment.shouldContinue) {
    run.status = run.blockers.some((blocker) => blocker.status === 'open') ? 'waiting_for_user' : 'blocked'
    if (summary) run.nextAction = `${assessment.continueInstruction} Last report: ${summary}`
    saveRun(run)
    return { run, success: false, continueInstruction: assessment.continueInstruction }
  }
  run.status = 'completed'
  run.currentStep = 'Verified complete'
  run.nextAction = 'No further action required.'
  run.streamState = 'live'
  appendEvent(run, 'run_completed', 'Run completed', summary || 'All completion criteria passed.')
  saveRun(run)
  return { run, success: true, continueInstruction: 'The task is complete and verified.' }
}

export function seedDemoRun(): LoopRun {
  const run = startRun('Publish the prepared update and verify it is visible to the audience.')
  checkpointRun({ runId: run.runId, checkpointId: 'demo-plan', label: 'Plan prepared', summary: 'The content and destination are ready.', nextAction: 'Open the publishing flow.', status: 'completed' })
  checkpointRun({ runId: run.runId, checkpointId: 'demo-publish', label: 'Publishing phase', summary: 'The agent reached the final confirmation step.', nextAction: 'Confirm the result and verify visibility.', status: 'in_progress' })
  recordCompletionCheck({ runId: run.runId, checkId: 'demo-visible', criterion: 'The update is visible at the destination', passed: false, evidence: 'Verification has not run yet.' })
  run.lastAgentSignalAt = Date.now()
  run.streamState = 'live'
  saveRun(run)
  return run
}

export function clearRuns(): void {
  store = { ...store, activeRunId: null, runs: {} }
  persist()
}
