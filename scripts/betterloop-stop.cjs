#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const QUESTION = 'Is the job 100% done?'
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

function main() {
  const input = readInput()
  const config = readConfig(input.cwd || process.cwd())
  const lastMessage = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : ''

  if (process.env.BETTERLOOP_DISABLED === '1' || config.enabled === false || input.stop_hook_active === true) {
    writeOutput({})
    return
  }

  if (config.quotaContinuation !== false && isQuotaMessage(lastMessage)) {
    writeOutput({
      systemMessage: 'BetterLoop detected a possible quota pause. Record it with betterloop_report_quota; use a conservative ' + (config.quotaAssumptionHours || 5) + '-hour reset assumption and do not retry blindly.',
    })
    return
  }

  if (config.askIfDone === false) {
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

  if (config.autoContinue === false) {
    writeOutput({ systemMessage: reason })
    return
  }

  writeOutput({ decision: 'block', reason })
}

if (process.argv.includes('--self-test')) {
  process.stderr.write('BetterLoop Stop hook self-test passed.\n')
  writeOutput({ decision: 'block', reason: 'Answer this explicit question: “' + QUESTION + '” before stopping.' })
} else {
  main()
}
