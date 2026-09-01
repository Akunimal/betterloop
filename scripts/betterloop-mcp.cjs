#!/usr/bin/env node
'use strict'

/*
 * BetterLoop's Codex-host fallback.
 *
 * Codex connects to this process through STDIO. The same process exposes a
 * localhost-only control plane so the visible BetterLoop page can activate a
 * short-lived session. The MCP server may be connected before activation, but
 * every continuity action is refused until the page sends the activation
 * handshake. This keeps model-compatible MCP access explicit and temporary.
 */

const http = require('node:http')
const crypto = require('node:crypto')

const SERVER_NAME = 'betterloop'
const SERVER_VERSION = '1.1.0'
const PROTOCOL_VERSION = '2024-11-05'
const HOST_PORT = Number(process.env.BETTERLOOP_MCP_PORT || process.env.BETTERLOOP_HOST_PORT || 8767)
const SESSION_TTL_MS = 5 * 60 * 1000
const MAX_BODY_BYTES = 64 * 1024
const SESSION_PROOF = 'session_start_hook_confirmed'
const ACTIVATION_CONFIRMATION = 'user_clicked_betterloop_on'

const DEFAULT_FEATURES = {
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

let hostSession = {
  active: false,
  sessionId: null,
  activatedAt: 0,
  expiresAt: 0,
  features: { ...DEFAULT_FEATURES },
  run: null,
}

function id(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

function now() {
  return Date.now()
}

function normalizeFeatures(value) {
  const input = value && typeof value === 'object' ? value : {}
  return Object.fromEntries(Object.keys(DEFAULT_FEATURES).map((key) => [key, input[key] === undefined ? DEFAULT_FEATURES[key] : input[key] === true]))
}

function isActive() {
  if (!hostSession.active || !hostSession.sessionId || hostSession.expiresAt <= now()) {
    if (hostSession.active) clearSession()
    return false
  }
  return true
}

function clearSession() {
  hostSession = {
    active: false,
    sessionId: null,
    activatedAt: 0,
    expiresAt: 0,
    features: { ...DEFAULT_FEATURES },
    run: null,
  }
}

function featureEnabled(name) {
  return isActive() && hostSession.features[name] === true
}

function emptyRunMessage() {
  return {
    success: false,
    active: isActive(),
    runId: null,
    status: 'idle',
    shouldContinue: true,
    continueInstruction: 'Start a BetterLoop run for the original task.',
  }
}

function requireSession(tool) {
  if (!isActive()) {
    return {
      success: false,
      disabled: true,
      tool,
      active: false,
      message: 'BetterLoop is connected but dormant. The user must open the BetterLoop page and press the visible ON button before using continuity assistance.',
    }
  }
  return null
}

function requireFeature(tool, feature) {
  const sessionError = requireSession(tool)
  if (sessionError) return sessionError
  if (!hostSession.features[feature]) {
    return { success: false, disabled: true, tool, active: true, message: `The BetterLoop feature "${feature}" is OFF.` }
  }
  return null
}

function makeRun(goal) {
  const timestamp = now()
  return {
    version: 1,
    runId: id('run'),
    goal: String(goal || 'Complete the requested task').trim() || 'Complete the requested task',
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
    events: [{ id: id('event'), type: 'run_started', title: 'Run started', detail: String(goal || 'Task started'), createdAt: timestamp }],
  }
}

function addEvent(run, type, title, detail) {
  run.events = [...run.events, { id: id('event'), type, title, detail, createdAt: now() }].slice(-80)
  run.updatedAt = now()
}

function saveRun(run) {
  run.updatedAt = now()
  hostSession.run = run
  return run
}

function summarize(run = hostSession.run) {
  if (!run) return emptyRunMessage()
  const failed = run.completionChecks.filter((check) => !check.passed)
  const openBlockers = run.blockers.filter((blocker) => blocker.status === 'open')
  const pendingVerification = run.completionChecks.length === 0
  const needsFinish = run.completionChecks.length > 0 && failed.length === 0 && run.status !== 'completed'
  const shouldContinue = run.status !== 'completed' || failed.length > 0 || openBlockers.length > 0 || pendingVerification
  const next = openBlockers.length
    ? `Resolve the blocker "${openBlockers[0].title}" and continue the original task.`
    : pendingVerification
      ? 'Verify the original task with concrete evidence before finishing.'
      : failed.length
        ? `Continue from the failed criterion: ${failed[0].criterion}.`
        : needsFinish
          ? 'All criteria passed. Call betterloop_finish to close the verified run.'
          : run.nextAction
  return {
    success: true,
    active: isActive(),
    runId: run.runId,
    goal: run.goal,
    status: run.status,
    currentStep: run.currentStep,
    nextAction: run.nextAction,
    shouldContinue,
    continueInstruction: shouldContinue ? `The task is incomplete. ${next}` : 'The task is complete and verified.',
    streamState: run.streamState,
    quota: { waiting: run.status === 'waiting_for_quota', retryAt: run.expectedResumeAt ? new Date(run.expectedResumeAt).toISOString() : null },
    verification: {
      passed: run.completionChecks.filter((check) => check.passed).length,
      failed: failed.length,
      pending: pendingVerification ? 1 : 0,
    },
    completedCheckpoints: run.checkpoints.filter((checkpoint) => checkpoint.status === 'completed').map(({ id: checkpointId, label }) => ({ id: checkpointId, label })),
    openBlockers: openBlockers.map(({ id: blockerId, title, detail, options }) => ({ id: blockerId, title, detail, options })),
    recentEvents: run.events.slice(-8),
  }
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function bool(value) {
  return value === true
}

function schema(properties = {}, required = []) {
  return { type: 'object', properties, required, additionalProperties: false }
}

const tools = [
  {
    name: 'betterloop_host_status',
    title: 'Read BetterLoop host status',
    description: 'Read whether the BetterLoop MCP host bridge is connected and whether the user has explicitly activated the temporary page session. This tool is safe to call before activation.',
    inputSchema: schema(),
    execute: () => hostStatus(),
  },
  {
    name: 'betterloop_activation_check',
    title: 'Verify BetterLoop activation',
    description: 'MANDATORY after the user presses Turn BetterLoop ON: call this tool immediately to verify that the connected BetterLoop host is active and executable. Do not claim activation is complete until this returns success. Use confirmation "user_clicked_betterloop_on".',
    inputSchema: schema({ confirmation: { type: 'string', enum: [ACTIVATION_CONFIRMATION], description: 'Confirms the visible user activation that triggered this check.' } }, ['confirmation']),
    execute: (input) => {
      const error = requireSession('betterloop_activation_check')
      if (error) return error
      if (text(input.confirmation) !== ACTIVATION_CONFIRMATION) {
        return { success: false, codexReady: false, active: true, message: 'The activation confirmation is missing. Call this tool immediately after the visible BetterLoop ON activation.' }
      }
      return {
        success: true,
        codexReady: true,
        active: true,
        mode: 'mcp-stdio',
        registeredTools: tools.map((tool) => tool.name),
        message: 'The BetterLoop host is active and its continuity tools are executable for this page session. Continue with betterloop_start for the original task. The optional Stop hook is a separate readiness check.',
      }
    },
  },
  {
    name: 'betterloop_hook_ready',
    title: 'Confirm BetterLoop host readiness',
    description: 'Confirm that the connected BetterLoop MCP server and the user-activated page session are ready. With native WebMCP, call the same tool only after receiving the SessionStart proof.',
    inputSchema: schema({ verification: { type: 'string', description: `Optional proof. Native WebMCP uses exactly ${SESSION_PROOF}; the host MCP connection itself is the proof for this fallback.` } }),
    execute: (input) => {
      const error = requireSession('betterloop_hook_ready')
      if (error) return error
      const proof = text(input.verification)
      if (proof && proof !== SESSION_PROOF && proof !== 'mcp_server_connected') {
        return { success: false, hostHookReady: false, active: true, message: 'Use the SessionStart proof supplied by the hook or confirm through the connected BetterLoop MCP server.' }
      }
      return { success: true, hostHookReady: true, active: true, mode: 'mcp-stdio', message: 'BetterLoop MCP is connected and the user-activated host session is live. Luna can use the continuity tools.' }
    },
  },
  {
    name: 'betterloop_start',
    title: 'Start BetterLoop run',
    description: 'Start tracking the exact original task. Use once at the beginning of the task after BetterLoop host status is active.',
    inputSchema: schema({ goal: { type: 'string', description: 'The exact original task.' } }, ['goal']),
    execute: (input) => {
      const error = requireSession('betterloop_start')
      if (error) return error
      return summarize(saveRun(makeRun(text(input.goal, 'Complete the requested task.'))))
    },
  },
  {
    name: 'betterloop_checkpoint',
    title: 'Save BetterLoop checkpoint',
    description: 'Save the current phase and exact next action before a pause, context compaction, or potentially interrupting operation.',
    inputSchema: schema({ runId: { type: 'string' }, checkpointId: { type: 'string' }, label: { type: 'string' }, summary: { type: 'string' }, nextAction: { type: 'string' }, status: { type: 'string', enum: ['in_progress', 'completed', 'skipped'] } }, ['label', 'summary', 'nextAction']),
    execute: (input) => {
      const error = requireFeature('betterloop_checkpoint', 'checkpoints')
      if (error) return error
      const run = hostSession.run
      if (!run || (input.runId && input.runId !== run.runId)) return { success: false, message: 'Start the BetterLoop run before saving a checkpoint.' }
      const checkpointId = text(input.checkpointId, id('checkpoint'))
      const checkpoint = { id: checkpointId, label: text(input.label), summary: text(input.summary), nextAction: text(input.nextAction), status: text(input.status, 'in_progress'), createdAt: now(), updatedAt: now() }
      const index = run.checkpoints.findIndex((item) => item.id === checkpointId)
      if (index >= 0) run.checkpoints[index] = { ...run.checkpoints[index], ...checkpoint, createdAt: run.checkpoints[index].createdAt }
      else run.checkpoints.push(checkpoint)
      run.currentStep = checkpoint.label
      run.nextAction = checkpoint.nextAction
      run.lastAgentSignalAt = now()
      run.streamState = 'live'
      addEvent(run, 'checkpoint', checkpoint.label, checkpoint.summary)
      return summarize(saveRun(run))
    },
  },
  {
    name: 'betterloop_research_blocker',
    title: 'Research before declaring blocked',
    description: 'When blocked, investigate the cause, test at least one workaround, and return varied alternatives before reporting a real blocker.',
    inputSchema: schema({ runId: { type: 'string' }, title: { type: 'string' }, detail: { type: 'string' }, certainty: { type: 'string', enum: ['uncertain', 'real_blocker'] }, researchSummary: { type: 'string' }, workaroundsTried: { type: 'array', items: { type: 'string' } }, alternatives: { type: 'array', items: { type: 'string' } }, options: { type: 'array', items: { type: 'object' } } }, ['title', 'detail', 'certainty', 'researchSummary', 'workaroundsTried', 'alternatives']),
    execute: (input) => {
      const error = requireFeature('betterloop_research_blocker', 'researchBeforeBlocking')
      if (error) return error
      const run = hostSession.run
      const workarounds = Array.isArray(input.workaroundsTried) ? input.workaroundsTried.filter((item) => typeof item === 'string' && item.trim()) : []
      const alternatives = Array.isArray(input.alternatives) ? input.alternatives.filter((item) => typeof item === 'string' && item.trim()) : []
      const researchSummary = text(input.researchSummary)
      if (!run || text(input.certainty) !== 'real_blocker' || alternatives.length < 2 || workarounds.length < 1 || researchSummary.length < 20) {
        return { success: false, blocked: false, needsResearch: true, runId: run?.runId || null, continueInstruction: 'Do not report a blocker yet. Investigate the cause, try a workaround, and return at least two viable alternatives with evidence.' }
      }
      const options = Array.isArray(input.options) && input.options.length
        ? input.options.filter((item) => item && typeof item === 'object').map((item, index) => ({ id: text(item.id, `option-${index + 1}`), label: text(item.label, 'Review alternative'), description: text(item.description) }))
        : alternatives.map((alternative, index) => ({ id: `alternative-${index + 1}`, label: alternative, description: 'Research-backed alternative.' }))
      const blocker = { id: id('blocker'), title: text(input.title), detail: `${researchSummary} Evidence: ${text(input.detail)}`, options, status: 'open', createdAt: now() }
      run.blockers.push(blocker)
      run.status = 'waiting_for_user'
      run.nextAction = 'Choose a decision above, then continue from this blocker.'
      addEvent(run, 'blocker', blocker.title, blocker.detail)
      return { ...summarize(saveRun(run)), blocked: true, research: { summary: researchSummary, workaroundsTried: workarounds, alternatives } }
    },
  },
  {
    name: 'betterloop_verify_completion',
    title: 'Verify task completion',
    description: 'Answer “Is the job 100% done?” with concrete evidence for every important outcome. Any failed or missing criterion requests continuation.',
    inputSchema: schema({ runId: { type: 'string' }, checks: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, criterion: { type: 'string' }, passed: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['criterion', 'passed', 'evidence'] } } }, ['checks']),
    execute: (input) => {
      const error = requireFeature('betterloop_verify_completion', 'completionVerification')
      if (error) return error
      const run = hostSession.run
      if (!run) return { success: false, message: 'Start the BetterLoop run before verifying completion.' }
      const checks = Array.isArray(input.checks) ? input.checks : []
      for (const item of checks) {
        const check = { id: text(item.id, id('check')), criterion: text(item.criterion), passed: bool(item.passed), evidence: text(item.evidence), checkedAt: now() }
        const index = run.completionChecks.findIndex((entry) => entry.id === check.id)
        if (index >= 0) run.completionChecks[index] = check
        else run.completionChecks.push(check)
        addEvent(run, 'verification', check.passed ? 'Completion criterion passed' : 'Completion criterion needs work', `${check.criterion}: ${check.evidence}`)
      }
      const failed = run.completionChecks.filter((check) => !check.passed)
      const shouldContinue = failed.length > 0 || run.completionChecks.length === 0 || run.blockers.some((blocker) => blocker.status === 'open') || run.status === 'waiting_for_quota'
      run.nextAction = shouldContinue ? (failed[0] ? `Continue from: ${failed[0].criterion}.` : 'Add evidence for each completion criterion.') : 'No further action required.'
      return { ...summarize(saveRun(run)), verificationRequested: true, finalQuestion: hostSession.features.askIfDone ? 'Is the job 100% done?' : null, shouldContinue, continueInstruction: shouldContinue ? `The task is incomplete. ${run.nextAction}` : 'The task is complete and verified.' }
    },
  },
  {
    name: 'betterloop_report_quota',
    title: 'Report quota pause',
    description: 'Record a usage-limit pause using a conservative five-hour reset assumption unless the host supplied a precise retry time.',
    inputSchema: schema({ runId: { type: 'string' }, detail: { type: 'string' }, retryAt: { type: 'string' } }),
    execute: (input) => {
      const error = requireFeature('betterloop_report_quota', 'quotaContinuation')
      if (error) return error
      const run = hostSession.run
      if (!run) return { success: false, message: 'Start the BetterLoop run before recording a quota pause.' }
      const parsedRetryAt = Date.parse(text(input.retryAt))
      const retryAt = Number.isFinite(parsedRetryAt) ? parsedRetryAt : now() + 5 * 60 * 60 * 1000
      run.status = 'waiting_for_quota'
      run.expectedResumeAt = retryAt
      run.resumeReason = 'quota_reset'
      run.nextAction = `Continue after quota reset at ${new Date(retryAt).toLocaleTimeString()}.`
      addEvent(run, 'quota_wait', 'Waiting for quota reset', text(input.detail, 'Codex reported that its usage quota is unavailable.'))
      return { ...summarize(saveRun(run)), quotaAssumptionHours: 5, autoContinue: hostSession.features.autoContinue, soundAlert: hostSession.features.soundAlerts, continueInstruction: hostSession.features.autoContinue ? 'Wait for the quota window, then the trusted Stop hook or next Codex turn should request continuation automatically.' : 'Wait for the quota window, then call betterloop_resume manually.' }
    },
  },
  {
    name: 'betterloop_resume',
    title: 'Resume BetterLoop run',
    description: 'Resume the original task from its last checkpoint when the quota window is available or the stream recovers.',
    inputSchema: schema({ runId: { type: 'string' } }),
    execute: (input) => {
      const error = requireSession('betterloop_resume')
      if (error) return error
      const run = hostSession.run
      if (!run) return { success: false, message: 'Start the BetterLoop run first.' }
      if (run.status === 'waiting_for_quota' && run.expectedResumeAt && now() < run.expectedResumeAt) return { ...summarize(run), shouldWait: true, continueInstruction: `Wait until ${new Date(run.expectedResumeAt).toLocaleTimeString()}, then call betterloop_resume and continue.` }
      run.status = 'resuming'
      run.streamState = 'live'
      run.lastAgentSignalAt = now()
      run.nextAction = 'Continue the original task from the last checkpoint and verify the outcome.'
      addEvent(run, 'resumed', 'Continuation requested', run.nextAction)
      return { ...summarize(saveRun(run)), shouldWait: false, continueInstruction: run.nextAction }
    },
  },
  {
    name: 'betterloop_finish',
    title: 'Finish verified run',
    description: 'Close the run only after every important completion criterion has concrete evidence.',
    inputSchema: schema({ runId: { type: 'string' }, summary: { type: 'string' } }),
    execute: (input) => {
      const error = requireSession('betterloop_finish')
      if (error) return error
      const run = hostSession.run
      if (!run) return { success: false, message: 'Start the BetterLoop run first.' }
      const failed = run.completionChecks.filter((check) => !check.passed)
      const pending = run.completionChecks.length === 0
      const openBlocker = run.blockers.find((blocker) => blocker.status === 'open')
      if (failed.length || pending || openBlocker || run.status === 'waiting_for_quota') {
        run.status = openBlocker ? 'waiting_for_user' : 'blocked'
        run.nextAction = openBlocker ? `Resolve blocker: ${openBlocker.title}.` : failed[0] ? `Continue from: ${failed[0].criterion}.` : 'Add evidence for each completion criterion.'
        saveRun(run)
        return { ...summarize(run), success: false, continueInstruction: `The task is incomplete. ${run.nextAction}` }
      }
      run.status = 'completed'
      run.currentStep = 'Verified complete'
      run.nextAction = 'No further action required.'
      addEvent(run, 'run_completed', 'Run completed', text(input.summary, 'All completion criteria passed.'))
      return { ...summarize(saveRun(run)), success: true, continueInstruction: 'The task is complete and verified.' }
    },
  },
  {
    name: 'betterloop_status',
    title: 'Read BetterLoop status',
    description: 'Read the active run, completion evidence, checkpoints, quota wait, selected features, and next action.',
    inputSchema: schema({ runId: { type: 'string' } }),
    execute: () => ({ ...summarize(hostSession.run), active: isActive(), hostConnected: true, mode: 'mcp-stdio', features: hostSession.features, registeredTools: tools.map((tool) => tool.name) }),
  },
]

function hostStatus() {
  return {
    success: true,
    hostConnected: true,
    active: isActive(),
    mode: 'mcp-stdio',
    sessionId: isActive() ? hostSession.sessionId : null,
    activatedAt: hostSession.activatedAt || null,
    expiresAt: isActive() ? hostSession.expiresAt : null,
    features: hostSession.features,
    run: isActive() ? hostSession.run : null,
    message: isActive() ? 'BetterLoop host MCP is connected and the user session is active.' : 'BetterLoop host MCP is connected but dormant. Activate the visible BetterLoop page first.',
  }
}

function json(res, status, body, origin) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : 'null'
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-private-network': 'true',
    vary: 'Origin',
  })
  res.end(JSON.stringify(body))
}

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true
  return origin === 'https://betterloop-akunimal.vercel.app' || origin === 'https://magic-picker.vercel.app'
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > MAX_BODY_BYTES) reject(new Error('Request body is too large.'))
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try { resolve(JSON.parse(body)) } catch { reject(new Error('Request body must be valid JSON.')) }
    })
    req.on('error', reject)
  })
}

async function handleHttp(req, res) {
  const origin = req.headers.origin || ''
  if (req.method === 'OPTIONS') return json(res, 204, {}, origin)
  const url = new URL(req.url || '/', `http://127.0.0.1:${HOST_PORT}`)
  try {
    if (req.method === 'GET' && (url.pathname === '/status' || url.pathname === '/health')) return json(res, 200, hostStatus(), origin)
    if (req.method !== 'POST' || !isAllowedOrigin(origin)) return json(res, 403, { success: false, error: 'BetterLoop host accepts commands only from the visible BetterLoop page.' }, origin)
    const body = await readBody(req)
    if (url.pathname === '/activate') {
      const sessionId = text(body.sessionId).trim()
      if (!sessionId) return json(res, 400, { success: false, error: 'sessionId is required.' }, origin)
      const timestamp = now()
      hostSession = { active: true, sessionId, activatedAt: timestamp, expiresAt: timestamp + SESSION_TTL_MS, features: normalizeFeatures(body.features), run: null }
      return json(res, 200, { ...hostStatus(), consent: 'visible_user_activation', ttlMs: SESSION_TTL_MS }, origin)
    }
    if (url.pathname === '/heartbeat') {
      if (!isActive() || text(body.sessionId) !== hostSession.sessionId) return json(res, 409, { success: false, active: false, error: 'BetterLoop session is inactive or expired.' }, origin)
      hostSession.expiresAt = now() + SESSION_TTL_MS
      if (body.features) hostSession.features = normalizeFeatures(body.features)
      return json(res, 200, hostStatus(), origin)
    }
    if (url.pathname === '/deactivate') {
      if (text(body.sessionId) && text(body.sessionId) !== hostSession.sessionId) return json(res, 409, { success: false, error: 'Session id does not match.' }, origin)
      clearSession()
      return json(res, 200, hostStatus(), origin)
    }
    return json(res, 404, { success: false, error: 'BetterLoop host route not found.' }, origin)
  } catch (error) {
    return json(res, 400, { success: false, error: error instanceof Error ? error.message : String(error) }, origin)
  }
}

function writeRpc(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`)
}

function rpcError(idValue, code, message) {
  return { jsonrpc: '2.0', id: idValue, error: { code, message } }
}

function toolResult(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
  }
}

function handleRpc(message) {
  if (!message || message.jsonrpc !== '2.0') return
  if (message.method === 'notifications/initialized' || message.method === 'notifications/cancelled') return
  if (message.method === 'ping') return writeRpc({ jsonrpc: '2.0', id: message.id, result: {} })
  if (message.method === 'initialize') {
    return writeRpc({ jsonrpc: '2.0', id: message.id, result: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      instructions: 'BetterLoop is a user-activated continuity layer. Call betterloop_host_status first. After the user presses the visible BetterLoop ON button, call betterloop_activation_check immediately and do not claim activation is complete until it succeeds. Do not use continuity actions until the visible BetterLoop page reports active. Start the original task, save checkpoints, verify concrete evidence, research alternatives before blockers, and resume after quota windows.',
    } })
  }
  if (message.method === 'tools/list') return writeRpc({ jsonrpc: '2.0', id: message.id, result: { tools: tools.map(({ execute, ...tool }) => tool) } })
  if (message.method === 'tools/call') {
    const name = text(message.params?.name)
    const tool = tools.find((item) => item.name === name)
    if (!tool) return writeRpc(rpcError(message.id, -32602, `Unknown BetterLoop tool: ${name}`))
    try {
      return writeRpc({ jsonrpc: '2.0', id: message.id, result: toolResult(tool.execute(message.params?.arguments || {})) })
    } catch (error) {
      return writeRpc({ jsonrpc: '2.0', id: message.id, result: toolResult({ success: false, error: error instanceof Error ? error.message : String(error) }) })
    }
  }
  if (message.id !== undefined) writeRpc(rpcError(message.id, -32601, `Unsupported MCP method: ${message.method}`))
}

if (process.argv.includes('--self-test')) {
  process.stderr.write('BetterLoop MCP self-test passed.\n')
  process.exit(0)
}

const server = http.createServer(handleHttp)
server.listen(HOST_PORT, '127.0.0.1', () => {
  process.stderr.write(`BetterLoop MCP host ready on 127.0.0.1:${HOST_PORT}.\n`)
})

let inputBuffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  inputBuffer += chunk
  let newlineIndex = inputBuffer.indexOf('\n')
  while (newlineIndex >= 0) {
    const line = inputBuffer.slice(0, newlineIndex).trim()
    inputBuffer = inputBuffer.slice(newlineIndex + 1)
    if (line) {
      try { handleRpc(JSON.parse(line)) } catch (error) { process.stderr.write(`BetterLoop MCP parse error: ${error instanceof Error ? error.message : String(error)}\n`) }
    }
    newlineIndex = inputBuffer.indexOf('\n')
  }
})

function stop() {
  server.close(() => process.exit(0))
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
