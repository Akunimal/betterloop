import {
  assessCompletion,
  checkpointRun,
  finishRun,
  getEffectiveStreamState,
  getRun,
  getStore,
  isFeatureEnabled,
  recordCompletionCheck,
  reportBlocker,
  releaseQuotaForDemo,
  resumeRun,
  setQuotaWait,
  startRun,
} from '../state/loopStore'
import type { LoopRun, WebMCPTool } from '../webmcp-types'
import { getModelContext, getWebMCPMode } from './polyfill'

let registered = false
let controllers: AbortController[] = []

const text = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback
const bool = (value: unknown): boolean => value === true

function disabledResult(tool: string) {
  return {
    success: false,
    disabled: true,
    tool,
    message: 'BetterLoop is OFF. The user must activate it before the agent can use continuity assistance.',
  }
}

function summarize(run: LoopRun | null) {
  if (!run) {
    return {
      success: false,
      runId: null,
      status: 'idle',
      shouldContinue: true,
      continueInstruction: 'Start a BetterLoop run for the original task.',
    }
  }
  const failed = run.completionChecks.filter((check) => !check.passed)
  const openBlockers = run.blockers.filter((blocker) => blocker.status === 'open')
  const pendingVerification = run.completionChecks.length === 0
  const needsFinish = run.completionChecks.length > 0 && failed.length === 0 && run.status !== 'completed'
  const shouldContinue = run.status !== 'completed' || failed.length > 0 || openBlockers.length > 0 || pendingVerification
  const next = openBlockers.length
    ? 'Resolve the blocker "' + openBlockers[0].title + '" and continue the original task.'
    : pendingVerification
      ? 'Verify the original task with concrete evidence before finishing.'
      : failed.length
        ? 'Continue from the failed criterion: ' + failed[0].criterion + '.'
        : needsFinish
          ? 'All criteria passed. Call betterloop_finish to close the verified run.'
          : run.nextAction
  return {
    success: true,
    runId: run.runId,
    goal: run.goal,
    status: run.status,
    currentStep: run.currentStep,
    nextAction: run.nextAction,
    shouldContinue,
    continueInstruction: shouldContinue ? 'The task is incomplete. ' + next : 'The task is complete and verified.',
    streamState: getEffectiveStreamState(run),
    quota: { waiting: run.status === 'waiting_for_quota', retryAt: run.expectedResumeAt ? new Date(run.expectedResumeAt).toISOString() : null },
    verification: {
      passed: run.completionChecks.filter((check) => check.passed).length,
      failed: failed.length,
      pending: pendingVerification ? 1 : 0,
    },
    completedCheckpoints: run.checkpoints.filter((checkpoint) => checkpoint.status === 'completed').map((checkpoint) => ({ id: checkpoint.id, label: checkpoint.label })),
    openBlockers: openBlockers.map((blocker) => ({ id: blocker.id, title: blocker.title, detail: blocker.detail, options: blocker.options })),
    recentEvents: run.events.slice(-8),
  }
}

function schema(properties: Record<string, unknown>, required: string[] = []) {
  return { type: 'object', properties, required, additionalProperties: false }
}

const tools: WebMCPTool[] = [
  {
    name: 'betterloop_start',
    title: 'Start BetterLoop run',
    description: 'Start a continuity run for the user’s original task. Use this once at the beginning so BetterLoop can track progress and later verify the outcome.',
    inputSchema: schema({ goal: { type: 'string', description: 'The exact original task the agent is expected to complete.' } }, ['goal']),
    execute: async (input) => {
      if (!getStore().settings.enabled) return disabledResult('betterloop_start')
      return summarize(startRun(text(input.goal, 'Complete the original task.')))
    },
  },
  {
    name: 'betterloop_checkpoint',
    title: 'Save BetterLoop checkpoint',
    description: 'Save the current phase of the original task and the exact next action. Call this when the agent changes phase or before a potentially interrupting operation.',
    inputSchema: schema({ runId: { type: 'string' }, checkpointId: { type: 'string' }, label: { type: 'string' }, summary: { type: 'string' }, nextAction: { type: 'string' }, status: { type: 'string', enum: ['in_progress', 'completed', 'skipped'] } }, ['label', 'summary', 'nextAction']),
    execute: async (input) => {
      if (!isFeatureEnabled('checkpoints')) return disabledResult('betterloop_checkpoint')
      return summarize(checkpointRun({ runId: text(input.runId) || undefined, checkpointId: text(input.checkpointId) || undefined, label: text(input.label), summary: text(input.summary), nextAction: text(input.nextAction), status: text(input.status) as 'in_progress' | 'completed' | 'skipped' || undefined }))
    },
  },
  {
    name: 'betterloop_research_blocker',
    title: 'Research before declaring blocked',
    description: 'Use this when a task appears blocked. If the obstacle is uncertain or a workaround may exist, research the cause, test viable paths, and bring back varied alternatives before declaring a real blocker. Only report a hard blocker with evidence after that investigation.',
    inputSchema: schema({
      runId: { type: 'string' },
      title: { type: 'string' },
      detail: { type: 'string' },
      certainty: { type: 'string', enum: ['uncertain', 'real_blocker'] },
      researchSummary: { type: 'string', description: 'What was investigated and what evidence was found.' },
      workaroundsTried: { type: 'array', items: { type: 'string' } },
      alternatives: { type: 'array', items: { type: 'string' } },
      options: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, label: { type: 'string' }, description: { type: 'string' } }, required: ['id', 'label'] } },
    }, ['title', 'detail', 'certainty', 'researchSummary', 'workaroundsTried', 'alternatives']),
    execute: async (input) => {
      if (!isFeatureEnabled('researchBeforeBlocking')) return disabledResult('betterloop_research_blocker')
      const certainty = text(input.certainty)
      const researchSummary = text(input.researchSummary)
      const workarounds = Array.isArray(input.workaroundsTried) ? input.workaroundsTried.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
      const alternatives = Array.isArray(input.alternatives) ? input.alternatives.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
      if (certainty !== 'real_blocker' || alternatives.length < 2 || workarounds.length < 1 || researchSummary.trim().length < 20) {
        const run = getRun(text(input.runId) || undefined)
        return {
          success: false,
          blocked: false,
          needsResearch: true,
          runId: run?.runId || null,
          continueInstruction: 'Do not report a blocker yet. Investigate the uncertainty, use available research, test at least one workaround, and return at least two viable alternatives with evidence.',
          researchChecklist: ['Explain the failure mode', 'Try at least one workaround', 'Research the likely cause', 'Offer two or more viable alternatives'],
        }
      }
      const options = Array.isArray(input.options)
        ? input.options.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')).map((item) => ({ id: text(item.id) || 'option-' + Math.random().toString(36).slice(2, 7), label: text(item.label) || 'Review alternative', description: text(item.description) }))
        : alternatives.map((alternative, index) => ({ id: 'alternative-' + (index + 1), label: alternative, description: 'Research-backed alternative.' }))
      const run = reportBlocker({
        runId: text(input.runId) || undefined,
        title: text(input.title),
        detail: researchSummary + ' Evidence: ' + text(input.detail),
        options,
      })
      return {
        ...summarize(run),
        blocked: true,
        research: { summary: researchSummary, workaroundsTried: workarounds, alternatives },
      }
    },
  },
  {
    name: 'betterloop_verify_completion',
    title: 'Verify task completion',
    description: 'Externally verify whether the original task was actually completed. When the final-check toggle is on, answer the explicit question “Is the job 100% done?” and provide concrete evidence for every important outcome; if any criterion fails, BetterLoop returns a continuation instruction.',
    inputSchema: schema({ runId: { type: 'string' }, checks: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, criterion: { type: 'string' }, passed: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['criterion', 'passed', 'evidence'] } } }, ['checks']),
    execute: async (input) => {
      if (!isFeatureEnabled('completionVerification')) return disabledResult('betterloop_verify_completion')
      const checks = Array.isArray(input.checks) ? input.checks : []
      for (const item of checks) {
        const check = item as Record<string, unknown>
        recordCompletionCheck({ runId: text(input.runId) || undefined, checkId: text(check.id) || undefined, criterion: text(check.criterion), passed: bool(check.passed), evidence: text(check.evidence) })
      }
      const result = assessCompletion(text(input.runId) || undefined)
      return { ...summarize(result.run), verificationRequested: true, finalQuestion: getStore().settings.features.askIfDone ? 'Is the job 100% done?' : null, shouldContinue: result.shouldContinue, continueInstruction: result.continueInstruction }
    },
  },
  {
    name: 'betterloop_report_quota',
    title: 'Report quota pause',
    description: 'Record that the agent stopped because of a usage limit. BetterLoop uses a conservative five-hour reset assumption and never blocks the browser while waiting.',
    inputSchema: schema({ runId: { type: 'string' }, detail: { type: 'string' }, retryAt: { type: 'string', description: 'Optional ISO timestamp if the host provided a precise reset time.' } }),
    execute: async (input) => {
      if (!isFeatureEnabled('quotaContinuation')) return disabledResult('betterloop_report_quota')
      const retryAt = Date.parse(text(input.retryAt)) || Date.now() + 5 * 60 * 60 * 1000
      const run = setQuotaWait(text(input.runId) || undefined, retryAt, text(input.detail, 'Codex reported that its usage quota is unavailable.'))
      return {
        ...summarize(run),
        quotaAssumptionHours: 5,
        autoContinue: isFeatureEnabled('autoContinue'),
        soundAlert: isFeatureEnabled('soundAlerts'),
        continueInstruction: isFeatureEnabled('autoContinue')
          ? 'Wait for the quota window, then the Codex Stop hook or host watcher should request continuation automatically.'
          : 'Wait for the quota window, then call betterloop_resume to continue manually.',
      }
    },
  },
  {
    name: 'betterloop_resume',
    title: 'Resume BetterLoop run',
    description: 'Resume the original task from its last checkpoint when the quota window is available or the agent stream has recovered.',
    inputSchema: schema({ runId: { type: 'string' } }),
    execute: async (input) => {
      if (!getStore().settings.enabled) return disabledResult('betterloop_resume')
      const result = resumeRun(text(input.runId) || undefined)
      return { ...summarize(result.run), shouldWait: result.shouldWait, continueInstruction: result.continueInstruction }
    },
  },
  {
    name: 'betterloop_finish',
    title: 'Finish verified run',
    description: 'Close the run only after the original task has concrete evidence for every important completion criterion.',
    inputSchema: schema({ runId: { type: 'string' }, summary: { type: 'string' } }),
    execute: async (input) => {
      if (!getStore().settings.enabled) return disabledResult('betterloop_finish')
      const result = finishRun(text(input.runId) || undefined, text(input.summary))
      return { ...summarize(result.run), success: result.success, continueInstruction: result.continueInstruction }
    },
  },
  {
    name: 'betterloop_status',
    title: 'Read BetterLoop status',
    description: 'Read the active BetterLoop run, verification state, checkpoints, quota wait, and the next recommended action.',
    inputSchema: schema({ runId: { type: 'string' } }),
    execute: async (input) => {
      if (!getStore().settings.enabled) return disabledResult('betterloop_status')
      return {
        ...summarize(getRun(text(input.runId) || undefined)),
        features: getStore().settings.features,
        webMCPMode: getWebMCPMode(),
        registeredTools: tools.map((tool) => tool.name),
      }
    },
  },
]

export async function registerBetterLoopTools(): Promise<{ mode: string; count: number }> {
  if (registered) return { mode: getWebMCPMode(), count: tools.length }
  const modelContext = getModelContext()
  if (!modelContext) return { mode: getWebMCPMode(), count: 0 }
  controllers = tools.map(() => new AbortController())
  tools.forEach((tool, index) => modelContext.registerTool(tool, { signal: controllers[index].signal }))
  registered = true
  window.dispatchEvent(new CustomEvent('betterloop:registered'))
  return { mode: getWebMCPMode(), count: tools.length }
}

export function unregisterBetterLoopTools(): void {
  if (!registered) return
  const modelContext = getModelContext()
  tools.forEach((tool) => modelContext?.unregisterTool?.(tool.name))
  controllers.forEach((controller) => controller.abort())
  controllers = []
  registered = false
  window.dispatchEvent(new CustomEvent('betterloop:registered'))
}

export function isBetterLoopRegistered(): boolean {
  return registered
}

export function getBetterLoopToolNames(): string[] {
  return tools.map((tool) => tool.name)
}

export function getBetterLoopRegistrationMode(): string {
  return getWebMCPMode()
}

export function prepareDemoQuota(): LoopRun | null {
  const run = getRun()
  if (!run) return null
  return setQuotaWait(run.runId, Date.now() + 5 * 60 * 60 * 1000, 'Demo: the agent hit a usage limit and BetterLoop scheduled a continuation window.')
}

export function releaseDemoQuota(): LoopRun | null {
  return releaseQuotaForDemo()
}

export function verifyDemoOutcome(passed: boolean): ReturnType<typeof assessCompletion> {
  const run = getRun()
  if (!run) return assessCompletion()
  recordCompletionCheck({
    runId: run.runId,
    checkId: 'demo-visible',
    criterion: 'The original task produced a verifiable result',
    passed,
    evidence: passed ? 'Demo evidence: the result is visible and confirmed.' : 'Demo evidence is still missing; BetterLoop requests continuation.',
  })
  return assessCompletion(run.runId)
}
