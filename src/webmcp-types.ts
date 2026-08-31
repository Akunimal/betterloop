export type LoopStatus =
  | 'idle'
  | 'running'
  | 'waiting_for_user'
  | 'blocked'
  | 'resuming'
  | 'waiting_for_quota'
  | 'completed'
  | 'failed'
  | 'paused'

export type StreamState = 'live' | 'quiet' | 'interrupted' | 'unknown'
export type CheckpointStatus = 'in_progress' | 'completed' | 'skipped'
export type LoopEventType =
  | 'run_started'
  | 'checkpoint'
  | 'blocker'
  | 'decision'
  | 'verification'
  | 'stream_interrupted'
  | 'quota_wait'
  | 'resumed'
  | 'run_completed'
  | 'run_failed'

export interface DecisionOption {
  id: string
  label: string
  description?: string
}

export interface Checkpoint {
  id: string
  label: string
  status: CheckpointStatus
  summary: string
  nextAction: string
  createdAt: number
  updatedAt: number
}

export interface Blocker {
  id: string
  title: string
  detail: string
  options: DecisionOption[]
  status: 'open' | 'resolved' | 'dismissed'
  selectedOptionId?: string
  createdAt: number
  resolvedAt?: number
}

export interface CompletionCheck {
  id: string
  criterion: string
  passed: boolean
  evidence: string
  checkedAt: number
}

export interface LoopEvent {
  id: string
  type: LoopEventType
  title: string
  detail: string
  createdAt: number
}

export interface LoopRun {
  version: 1
  runId: string
  goal: string
  status: LoopStatus
  createdAt: number
  updatedAt: number
  currentStep: string
  nextAction: string
  lastHeartbeatAt: number
  lastAgentSignalAt: number
  streamState: StreamState
  expectedResumeAt?: number
  resumeReason?: 'quota_reset' | 'stream_interruption' | 'user_request'
  completionChecks: CompletionCheck[]
  checkpoints: Checkpoint[]
  blockers: Blocker[]
  events: LoopEvent[]
}

export interface BetterLoopFeatures {
  checkpoints: boolean
  completionVerification: boolean
  blockerHandoffs: boolean
  streamMonitor: boolean
  quotaContinuation: boolean
  autoContinue: boolean
  askIfDone: boolean
  soundAlerts: boolean
  researchBeforeBlocking: boolean
  activityLog: boolean
}

export interface BetterLoopSettings {
  enabled: boolean
  features: BetterLoopFeatures
  quietThresholdSeconds: number
}

export interface BetterLoopStore {
  version: 1
  activeRunId: string | null
  runs: Record<string, LoopRun>
  settings: BetterLoopSettings
}

export interface WebMCPExecuteOptions {
  signal?: AbortSignal
}

export interface WebMCPTool {
  name: string
  title?: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
  execute: (input: Record<string, unknown>, options?: WebMCPExecuteOptions) => Promise<unknown> | unknown
}
