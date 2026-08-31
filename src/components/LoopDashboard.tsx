import { useEffect, useMemo, useRef, useState } from 'react'
import {
  clearRuns,
  finishRun,
  getStore,
  releaseQuotaForDemo,
  resumeRun,
  seedDemoRun,
  subscribeLoopStore,
  updateSettings,
} from '../state/loopStore'
import {
  getBetterLoopRegistrationMode,
  getBetterLoopToolNames,
  isBetterLoopHookReady,
  isBetterLoopRegistered,
  prepareDemoQuota,
  registerBetterLoopTools,
  unregisterBetterLoopTools,
  verifyDemoOutcome,
} from '../webmcp/betterLoopTools'
import type { BetterLoopFeatures, LoopRun } from '../webmcp-types'
import { ActivityTimeline } from './ActivityTimeline'
import { unlockAudio, playContinuationTone } from '../ui/sound'
import {
  activateBetterLoopHost,
  deactivateBetterLoopHost,
  probeBetterLoopHost,
  syncBetterLoopHost,
  type BetterLoopHostStatus,
} from '../host/betterLoopHost'

const featureGroups: Array<{ title: string; description: string; items: Array<{ key: keyof BetterLoopFeatures; label: string; detail: string }> }> = [
  {
    title: 'Agent continuity',
    description: 'Keep long-running work moving across pauses and phases.',
    items: [
      { key: 'autoContinue', label: 'Auto-continue', detail: 'Lets the trusted Stop hook request the next Codex turn.' },
      { key: 'quotaContinuation', label: 'Quota recovery', detail: 'Records a conservative five-hour reset and resumes from the checkpoint.' },
      { key: 'checkpoints', label: 'Phase checkpoints', detail: 'Preserves the exact next action before a pause or handoff.' },
    ],
  },
  {
    title: 'Verification',
    description: 'Make “done” mean done, not merely a completed response.',
    items: [
      { key: 'askIfDone', label: 'Ask “100% done?”', detail: 'At the end of a flow, Codex must answer the final completion question.' },
      { key: 'completionVerification', label: 'Evidence check', detail: 'Requires concrete evidence for every important outcome.' },
      { key: 'researchBeforeBlocking', label: 'Research before blocking', detail: 'Investigate, test a workaround, and offer alternatives before escalating.' },
    ],
  },
  {
    title: 'Signals',
    description: 'Give the user a quiet visual and audible handoff.',
    items: [
      { key: 'soundAlerts', label: 'Sound alerts', detail: 'Plays a short browser tone when continuation becomes available.' },
      { key: 'activityLog', label: 'Activity log', detail: 'Keeps a local visual timeline of the BetterLoop state.' },
    ],
  },
]

function useLoopSnapshot() {
  const [, refresh] = useState(0)
  useEffect(() => subscribeLoopStore(() => refresh((value) => value + 1)), [])
  return getStore()
}

function statusLabel(status: LoopRun['status'] | 'idle'): string {
  return {
    idle: 'Ready',
    running: 'Running',
    waiting_for_user: 'Needs user',
    blocked: 'Needs research',
    resuming: 'Resuming',
    waiting_for_quota: 'Waiting for quota',
    completed: '100% verified',
    failed: 'Failed',
    paused: 'Paused',
  }[status]
}

function formatCountdown(timestamp?: number): string {
  if (!timestamp) return 'not scheduled'
  const remaining = Math.max(0, timestamp - Date.now())
  const hours = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  return hours + 'h ' + minutes + 'm remaining'
}

export function LoopDashboard() {
  const store = useLoopSnapshot()
  const run = store.activeRunId ? store.runs[store.activeRunId] || null : null
  const [registered, setRegistered] = useState(isBetterLoopRegistered())
  const [mode, setMode] = useState(getBetterLoopRegistrationMode())
  const [hookReady, setHookReady] = useState(isBetterLoopHookReady())
  const [hostStatus, setHostStatus] = useState<BetterLoopHostStatus>({ success: false, hostConnected: false, active: false, mode: 'unavailable' })
  const [message, setMessage] = useState('')
  const lastEventId = useRef<string | null>(null)
  const enabled = store.settings.enabled
  const features = store.settings.features
  const viewRun = run ?? hostStatus.run ?? null
  const hostRunVisible = !run && Boolean(hostStatus.run)
  const activeFeatureCount = enabled ? Object.values(features).filter(Boolean).length : 0
  const toolNames = useMemo(() => getBetterLoopToolNames(), [])

  useEffect(() => {
    const updateRegistration = () => {
      setRegistered(isBetterLoopRegistered())
      setMode(getBetterLoopRegistrationMode())
      setHookReady(isBetterLoopHookReady())
    }
    window.addEventListener('betterloop:registered', updateRegistration)
    window.addEventListener('betterloop:hook-ready', updateRegistration)
    updateRegistration()
    return () => {
      window.removeEventListener('betterloop:registered', updateRegistration)
      window.removeEventListener('betterloop:hook-ready', updateRegistration)
    }
  }, [])

  useEffect(() => {
    const latest = viewRun ? viewRun.events[viewRun.events.length - 1] : undefined
    if (!latest || latest.id === lastEventId.current) return
    lastEventId.current = latest.id
    if (features.soundAlerts && latest.type === 'resumed') playContinuationTone()
  }, [viewRun, features.soundAlerts])

  useEffect(() => {
    const onHostStatus = (event: Event) => {
      const detail = (event as CustomEvent<BetterLoopHostStatus>).detail
      if (detail) setHostStatus(detail)
    }
    window.addEventListener('betterloop:host-status', onHostStatus)
    void probeBetterLoopHost().then(setHostStatus)
    return () => window.removeEventListener('betterloop:host-status', onHostStatus)
  }, [])

  useEffect(() => {
    if (!enabled || !hostStatus.active) return
    const poll = window.setInterval(() => {
      void probeBetterLoopHost().then(setHostStatus)
    }, 2_000)
    return () => window.clearInterval(poll)
  }, [enabled, hostStatus.active])

  const toggleEnabled = async () => {
    const next = !enabled
    if (next) {
      unlockAudio()
      const nextSettings = updateSettings({ enabled: true })
      const host = await activateBetterLoopHost(nextSettings.features)
      setHostStatus(host)
      const result = await registerBetterLoopTools()
      setMessage(host.active
        ? 'BetterLoop is live. The Luna-compatible host MCP is connected for this temporary session.'
        : result.count
          ? 'BetterLoop is live. Codex can discover the continuity tools on this page.'
          : 'BetterLoop is on. Restart or reopen Codex to connect the host MCP.')
    } else {
      await deactivateBetterLoopHost()
      unregisterBetterLoopTools()
      updateSettings({ enabled: false })
      setMessage('BetterLoop is off. No continuity tools are exposed.')
    }
  }

  const setFeature = (key: keyof BetterLoopFeatures, value: boolean) => {
    const nextFeatures = { ...features, [key]: value }
    updateSettings({ features: nextFeatures })
    void syncBetterLoopHost(nextFeatures)
    setMessage(value ? featureLabel(key) + ' enabled.' : featureLabel(key) + ' disabled.')
  }

  const startDemo = () => {
    if (!enabled) {
      setMessage('Activate BetterLoop first so the demo follows the same consent flow.')
      return
    }
    seedDemoRun()
    setMessage('Demo run started. The result is intentionally unverified so the loop has something to recover.')
  }

  const markIncomplete = () => {
    if (!run) return
    verifyDemoOutcome(false)
    setMessage('Verification failed. BetterLoop keeps the task open and asks Codex to continue.')
  }

  const markComplete = () => {
    if (!run) return
    const result = verifyDemoOutcome(true)
    if (result.run && !result.shouldContinue) {
      finishRun(result.run.runId, 'Demo evidence confirms the requested outcome.')
      setMessage('The job is 100% done. BetterLoop closed the run after evidence.')
    } else {
      setMessage('Evidence passed, but another criterion still needs attention.')
    }
  }

  const simulateQuota = () => {
    if (!run) return
    prepareDemoQuota()
    setMessage('Quota pause recorded. BetterLoop is using the five-hour recovery assumption.')
  }

  const quotaAvailable = () => {
    if (!run) return
    releaseQuotaForDemo(run.runId)
    if (features.autoContinue) {
      const result = resumeRun(run.runId)
      setMessage(result.shouldWait ? result.continueInstruction : 'Quota available: auto-continuation requested from the last checkpoint.')
    } else {
      setMessage('Quota available. Auto-continue is off; press Resume manually when you are ready.')
    }
  }

  const resumeManually = () => {
    if (!run) return
    const result = resumeRun(run.runId)
    setMessage(result.shouldWait ? result.continueInstruction : 'Manual continuation requested from the last checkpoint.')
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">↻</div>
          <div>
            <span className="eyebrow">BETTERLOOP / CODEX COMPANION</span>
            <strong>BetterLoop</strong>
          </div>
        </div>
        <div className="topbar-status"><span className={'status-light ' + (enabled ? 'is-on' : '')} />{enabled ? 'Active' : 'Off'}</div>
      </header>

      <main>
        <section className="hero-card">
          <div className="hero-copy">
            <span className="eyebrow accent">CONTINUITY LAYER</span>
            <h1>Keep the agent<br /><em>in the loop.</em></h1>
            <p>BetterLoop checks whether Codex really finished the original task, recovers from quota pauses, and asks for the next turn when work is still open.</p>
          </div>
          <div className="activation-panel">
            <div className="activation-heading"><span>Explicit consent</span><span className={enabled ? 'live-label' : ''}>{enabled ? 'LIVE' : 'STANDBY'}</span></div>
            <button className={'master-toggle ' + (enabled ? 'is-on' : '')} type="button" onClick={() => void toggleEnabled()} aria-pressed={enabled}>
              <span className="toggle-track"><span className="toggle-thumb" /></span>
              <span>{enabled ? 'BetterLoop ON' : 'Turn BetterLoop ON'}</span>
            </button>
            <p className="activation-note">Only this page’s registered tools and selected continuity features are enabled. Turn it off to unregister them.</p>
          </div>
        </section>

        <section className="integration-strip">
          <div><span className="strip-label">WebMCP</span><strong>{registered ? 'Tools registered' : 'Waiting for activation'}</strong></div>
          <div><span className="strip-label">Mode</span><strong>{mode === 'polyfill' ? 'Local demo bridge' : mode === 'native' ? 'Native site tools' : 'Unavailable'}</strong></div>
          <div><span className="strip-label">Host MCP</span><strong>{!enabled ? 'Waiting for activation' : hostStatus.active ? 'Connected / Luna ready' : hostStatus.hostConnected ? 'Connected / dormant' : 'Not connected / restart Codex'}</strong></div>
          <div><span className="strip-label">Codex hook</span><strong>{!enabled ? 'Waiting for activation' : hookReady ? 'Ready / Codex confirmed' : 'Not ready / restart Codex'}</strong></div>
        </section>

        <section className={'notice-card hook-banner ' + (!enabled ? 'is-idle' : (hookReady || hostStatus.active) ? 'is-ready' : 'is-pending')} role={enabled && !hookReady && !hostStatus.active ? 'alert' : undefined}>
          <span className="notice-icon">{!enabled ? 'i' : (hookReady || hostStatus.active) ? '✓' : '!'}</span>
          <div>
            <strong>{!enabled
              ? 'One-click activation, host-level continuation.'
              : hostStatus.active && !hookReady
                ? 'READY: Luna-compatible BetterLoop MCP is connected.'
                : hookReady
                  ? 'READY: Codex confirmed the BetterLoop hook.'
                  : 'NOT READY: Codex still needs to load the BetterLoop hook.'}</strong>
            <p>{!enabled
              ? 'After the ON click, the page exposes WebMCP tools and asks the local BetterLoop MCP to open a temporary host session.'
              : hostStatus.active && !hookReady
                ? 'The local STDIO MCP is connected, so Luna can use BetterLoop now even without native WebMCP. The optional Stop hook still needs its normal Codex trust if you want automatic turn blocking.'
              : hookReady
                ? 'Codex delivered the trusted SessionStart hook signal and confirmed it through WebMCP. Automatic “Continue” and the “Is the job 100% done?” check are ready for this page session.'
                : 'WebMCP is active on this page, but automatic “Continue” and the “Is the job 100% done?” check will not run until Codex trusts the project hook, receives its SessionStart signal, and confirms it here. Review the hook, then restart or reopen Codex so the change is loaded.'}</p>
          </div>
        </section>

        <div className="section-heading"><div><span className="eyebrow">CONTROL PLANE</span><h2>Choose the loop behavior</h2></div><span className="feature-count">{activeFeatureCount}/{Object.keys(features).length} active</span></div>
        <section className="feature-grid">
          {featureGroups.map((group) => (
            <article className="feature-card" key={group.title}>
              <div className="feature-card-heading"><div><h3>{group.title}</h3><p>{group.description}</p></div><span className="group-dot" /></div>
              <div className="feature-list">
                {group.items.map((item) => (
                  <label className="feature-row" key={item.key}>
                    <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                    <input type="checkbox" checked={features[item.key]} onChange={(event) => setFeature(item.key, event.target.checked)} />
                    <span className="mini-toggle" aria-hidden="true"><span /></span>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="run-section">
          <div className="section-heading"><div><span className="eyebrow">LIVE RUN</span><h2>Proof, pause, continue</h2></div><button className="text-button" type="button" onClick={clearRuns}>Clear log</button></div>
          <div className="run-card">
            {!viewRun ? (
              <div className="empty-run"><div className="empty-orbit">↻</div><h3>No active run</h3><p>Start the guided demo to see verification fail, quota pause, recovery, and the final 100% check.</p><button className="primary-button" type="button" onClick={startDemo}>Start guided demo <span>→</span></button></div>
            ) : (
              <>
                <div className="run-header"><div><span className="eyebrow">{hostRunVisible ? 'CODEX HOST RUN' : 'RUN'} {viewRun.runId.slice(-8).toUpperCase()}</span><h3>{viewRun.goal}</h3></div><span className={'run-status status-' + viewRun.status}>{statusLabel(viewRun.status)}</span></div>
                <div className="run-progress"><div className="progress-label"><span>{viewRun.currentStep}</span><span>{viewRun.completionChecks.filter((check) => check.passed).length}/{viewRun.completionChecks.length || 1} checks passed</span></div><div className="progress-track"><span style={{ width: (viewRun.completionChecks.length ? Math.round((viewRun.completionChecks.filter((check) => check.passed).length / viewRun.completionChecks.length) * 100) : 10) + '%' }} /></div></div>
                <div className="next-action"><span className="action-kicker">NEXT ACTION</span><strong>{viewRun.nextAction}</strong>{viewRun.status === 'waiting_for_quota' && <small>{formatCountdown(viewRun.expectedResumeAt)} · default recovery window: 5 hours</small>}</div>
                <div className="check-list">{viewRun.completionChecks.map((check) => <div className="check-row" key={check.id}><span className={'check-icon ' + (check.passed ? 'passed' : 'pending')}>{check.passed ? '✓' : '·'}</span><div><strong>{check.criterion}</strong><small>{check.evidence}</small></div></div>)}</div>
                {hostRunVisible
                  ? <div className="host-run-note">Codex is controlling this run through the host MCP. This panel is a live visual log of its checkpoints, verification, blockers, and next action.</div>
                  : <div className="run-actions"><button className="secondary-button" type="button" onClick={markIncomplete}>Needs more work</button><button className="primary-button" type="button" onClick={markComplete}>Mark 100% done <span>→</span></button><button className="secondary-button" type="button" onClick={simulateQuota}>Simulate quota</button><button className="secondary-button" type="button" onClick={quotaAvailable}>Quota available</button>{viewRun.status === 'waiting_for_quota' && !features.autoContinue && <button className="secondary-button" type="button" onClick={resumeManually}>Resume manually</button>}</div>}
              </>
            )}
          </div>
        </section>

        <section className="log-section">
          <div className="section-heading"><div><span className="eyebrow">OBSERVABILITY</span><h2>What BetterLoop sees</h2></div><span className="tool-count">{toolNames.length} page tools · 10 host tools</span></div>
          <div className="log-card">{features.activityLog && viewRun ? <ActivityTimeline events={viewRun.events} /> : <p className="muted-copy">{features.activityLog ? 'Start a run to populate the visual log.' : 'Activity log is off.'}</p>}</div>
        </section>

        {message && <div className="toast" role="status">{message}</div>}
      </main>

      <footer><span>BetterLoop is a user-activated continuity layer.</span><span>WebMCP + Codex Stop hook</span></footer>
    </div>
  )
}

function featureLabel(key: keyof BetterLoopFeatures): string {
  return {
    checkpoints: 'Phase checkpoints',
    completionVerification: 'Evidence check',
    blockerHandoffs: 'Blocker handoffs',
    streamMonitor: 'Stream monitor',
    quotaContinuation: 'Quota recovery',
    autoContinue: 'Auto-continue',
    askIfDone: '100% done question',
    soundAlerts: 'Sound alerts',
    researchBeforeBlocking: 'Research before blocking',
    activityLog: 'Activity log',
  }[key]
}
