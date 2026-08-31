#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const QUESTION = 'Is the job 100% done?'
const HOST_STATUS_URL = process.env.BETTERLOOP_HOST_STATUS_URL || 'http://127.0.0.1:8767/status'
const DEFAULT_CONFIG = {
  enabled: true,
  askIfDone: true,
  autoContinue: true,
  quotaContinuation: true,
  quotaAssumptionHours: 5,
}

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim()
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function readConfig(cwd) {
  const configuredPath = process.env.BETTERLOOP_CONFIG
  const candidates = [configuredPath, cwd ? path.join(cwd, '.betterloop', 'config.json') : null].filter(Boolean)
  for (const candidate of candidates) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(candidate, 'utf8')) }
    } catch {
      // Optional config errors must never stop Codex.
    }
  }
  return { ...DEFAULT_CONFIG }
}

function isQuotaMessage(message) {
  return /\b(quota|rate[\s-]?limit|usage limit|usage cap|too many requests|try again later)\b/i.test(message)
}

function writeOutput(value) {
  process.stdout.write(JSON.stringify(value))
}

function sessionStartOutput() {
  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: [
        'BetterLoop host hook loaded and trusted for this Codex project.',
        'This SessionStart signal is the host-side readiness proof.',
        'If the user has activated BetterLoop in the Codex browser, call betterloop_host_status and then use the connected BetterLoop MCP tools even when native WebMCP is unavailable.',
        'If native WebMCP is available, the page may also confirm with betterloop_hook_ready using verification "session_start_hook_confirmed".',
      ].join(' '),
    },
  }
}

async function readHostStatus() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 350)
  try {
    const response = await fetch(HOST_STATUS_URL, { signal: controller.signal })
    if (!response.ok) return null
    const status = await response.json()
    return status && status.hostConnected === true ? status : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const input = readInput()
  const config = readConfig(input.cwd || process.cwd())
  const lastMessage = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : ''

  if (process.env.BETTERLOOP_DISABLED === '1' || config.enabled === false || input.stop_hook_active === true) {
    writeOutput({})
    return
  }

  if (input.hook_event_name === 'SessionStart') {
    writeOutput(sessionStartOutput())
    return
  }

  // The MCP host is the page's temporary consent gate. If it is reachable and
  // the user has not activated BetterLoop, the Stop hook stays inert. When the
  // host is not installed yet we retain the config-based fallback for users
  // who intentionally enabled the standalone hook.
  const hostStatus = await readHostStatus()
  if (hostStatus && hostStatus.active !== true) {
    writeOutput({})
    return
  }
  const hostFeatures = hostStatus?.features && typeof hostStatus.features === 'object' ? hostStatus.features : {}
  const effectiveConfig = hostStatus?.active
    ? { ...config, enabled: true, ...hostFeatures }
    : config

  if (effectiveConfig.quotaContinuation !== false && isQuotaMessage(lastMessage)) {
    writeOutput({
      systemMessage: 'BetterLoop detected a possible quota pause. Record it with betterloop_report_quota; use a conservative ' + (effectiveConfig.quotaAssumptionHours || 5) + '-hour reset assumption and do not retry blindly.',
    })
    return
  }

  if (effectiveConfig.askIfDone === false) {
    writeOutput({})
    return
  }

  const reason = [
    'BetterLoop final verification checkpoint.',
    'Answer this explicit question: “' + QUESTION + '”',
    'Compare the original user request with the actual result and concrete evidence.',
    'If the answer is no, or any important criterion is unverified, continue working now.',
    'If the answer is yes, state the evidence and then provide the final response.',
  ].join(' ')

  if (effectiveConfig.autoContinue === false) {
    writeOutput({ systemMessage: reason })
    return
  }

  writeOutput({ decision: 'block', reason })
}

if (process.argv.includes('--self-test')) {
  process.stderr.write('BetterLoop Stop hook self-test passed.\n')
  writeOutput({ decision: 'block', reason: 'Answer this explicit question: “' + QUESTION + '” before stopping.' })
} else {
  void main()
}
