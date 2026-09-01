import { useEffect, useMemo, useState } from 'react'
import { applySupervisedFixes, buildFixPlan, getLatestScan, getMCPationMode, registerMCPationTools, startConsentSession, toolNames, type ScanResult } from './mcpation'
import './mcpation.css'

export default function App() {
  const [scan, setScan] = useState<ScanResult | null>(getLatestScan())
  const [registered, setRegistered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready for a local scan.')
  const [showPlan, setShowPlan] = useState(false)
  const [selectedFixes, setSelectedFixes] = useState<string[]>([])
  const mode = getMCPationMode()
  const issues = useMemo(() => scan?.findings.filter((finding) => finding.severity !== 'healthy').length || 0, [scan])

  useEffect(() => {
    const refresh = (event: Event) => setScan((event as CustomEvent<ScanResult>).detail || getLatestScan())
    window.addEventListener('mcpation:scan', refresh)
    void registerMCPationTools().then(() => setRegistered(true)).catch(() => setMessage('Open MCPation in a WebMCP-capable browser.'))
    return () => window.removeEventListener('mcpation:scan', refresh)
  }, [])

  const scanNow = async () => {
    setBusy(true)
    try {
      const result = await startConsentSession()
      setScan(result)
      setShowPlan(false)
      setMessage(result.schemaVersion < 3 ? 'Scan complete. Restart the companion to unlock the full upgrade check.' : 'Scan complete. Your cleanup plan is ready.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The local companion is not responding.')
    } finally {
      setBusy(false)
    }
  }
  const toggleFix = (id: string) => setSelectedFixes((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const applyFixes = async () => {
    if (!selectedFixes.length || !window.confirm(`Back up and apply ${selectedFixes.length} reviewed JSON change${selectedFixes.length === 1 ? '' : 's'}?`)) return
    setBusy(true)
    try {
      setScan(await applySupervisedFixes(selectedFixes))
      setSelectedFixes([])
      setShowPlan(false)
      setMessage('Done. MCPation created a backup before every change.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The reviewed changes could not be applied.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="shell">
    <header className="topline">
      <div className="wordmark"><span className="mark">M</span><strong>MCPation</strong><span>CODEX ENVIRONMENT GLOW-UP</span></div>
      <div className={'webmcp-state ' + (registered ? 'ready' : '')}><i />{registered ? `${toolNames.length} WebMCP tools ready` : 'Loading tools'}</div>
    </header>

    <section className="hero">
      <div>
        <p className="kicker">CLEAN UP · FIX FRICTION · UPGRADE</p>
        <h1>Give Codex a<br /><em>cleaner environment.</em></h1>
        <p className="lede">Find stale MCPs, missing tools, access gaps, and shell problems. Get a safe plan before the next agent run.</p>
      </div>
      <aside className="scan-box">
        <span className="scan-label">LOCAL CHECK</span>
        <h2>{scan ? 'Run it again?' : 'See what Codex sees'}</h2>
        <button onClick={() => void scanNow()} disabled={busy}>{busy ? 'Scanning…' : scan ? 'Rescan environment' : 'Scan Codex setup'} <b>→</b></button>
        <small>Private by design · no tokens or file contents</small>
        <code>npm run companion</code>
      </aside>
    </section>

    <section className="metric-strip">
      <div><small>MCPs</small><strong>{scan ? scan.servers.length : '—'}</strong></div>
      <div><small>TO REVIEW</small><strong className={issues ? 'warn' : ''}>{scan ? issues : '—'}</strong></div>
      <div><small>ENVIRONMENTS</small><strong>{scan ? scan.profiles.length : '—'}</strong></div>
      <div><small>HOST</small><strong>{scan ? scan.host.operatingSystem : 'Local'}</strong></div>
    </section>

    <section className="run-state"><span className="pulse" /><strong>{message}</strong>{scan?.schemaVersion && scan.schemaVersion < 3 && <small>Companion update available</small>}</section>

    {!scan ? <section className="empty-state">
      <div className="empty-icon">↗</div><div><p className="kicker">ONE CLICK AFTER CONSENT</p><h2>Map the stack. Then improve it.</h2><p>Codex gets a clean WebMCP view of the approved result.</p></div>
    </section> : <>
      <section className="system-row">
        <div><small>PRIMARY</small><strong>Codex</strong></div>
        <div><small>GIT BASH</small><strong>{scan.schemaVersion < 3 ? 'Update to check' : scan.host.gitBashInstalled ? 'Ready' : 'Not found'}</strong></div>
        <div><small>WSL</small><strong>{scan.schemaVersion < 3 ? 'Update to check' : scan.host.wslReady ? 'Ready' : 'Recommended review'}</strong></div>
        <div><small>SHELL</small><strong>{scan.host.codexShell}</strong></div>
      </section>

      <section className="dashboard-heading">
        <div><p className="kicker">SCAN RESULTS</p><h2>{showPlan ? 'Supervised cleanup' : 'What MCPation found'}</h2></div>
        <button className="plan-button" onClick={() => setShowPlan(!showPlan)}>{showPlan ? 'Back to results' : `Review cleanup · ${scan.recommendations.length}`}</button>
      </section>

      {showPlan ? <section className="fix-plan">
        <div className="plan-intro"><strong>You choose every change.</strong><span>Backups first. Shell, WSL, policy, and command fixes stay manual.</span></div>
        {buildFixPlan(scan).items.length ? buildFixPlan(scan).items.map((item) => <article key={item.id}><span>{item.canApply ? 'BACKUP + REVIEW' : 'MANUAL'}</span><b>{item.title}</b><p>{item.detail}</p>{item.canApply && <label className="fix-choice"><input type="checkbox" checked={selectedFixes.includes(item.id)} onChange={() => toggleFix(item.id)} /> Include this exact change</label>}</article>) : <div className="plan-empty">No configuration changes proposed.</div>}
        <div className="fix-plan-actions"><small>No bulk guesses. Only selected deterministic JSON cleanup can be applied.</small><button disabled={!selectedFixes.length || busy} onClick={() => void applyFixes()}>Back up & apply {selectedFixes.length || ''}</button></div>
      </section> : <section className="dashboard-grid">
        <div className="panel inventory-panel">
          <div className="panel-title"><strong>Configured MCPs</strong><span>{scan.servers.length}</span></div>
          <div className="environment-tags">{scan.profiles.map((profile) => <span key={profile.name}>{profile.name} · {profile.configuredServers.length}</span>)}</div>
          <div className="inventory">{scan.servers.map((server) => <article key={server.id}><div><strong>{server.name}</strong><small>{server.source} · {server.transport}</small></div><div className="server-meta"><span className={server.disabled || server.available === false ? 'bad' : ''}>{server.disabled ? 'Disabled' : server.available === false ? 'Unavailable' : 'Ready'}</span><small>{server.target}</small></div></article>)}</div>
        </div>

        <div className="panel upgrade-panel">
          <div className="panel-title"><strong>Glow-up plan</strong><span>{scan.recommendations.length}</span></div>
          <div className="recommendations">{scan.recommendations.length ? scan.recommendations.map((item) => <article key={item.id}><span className={item.priority}>{item.category}</span><strong>{item.title}</strong><p>{item.reason}</p><small>→ {item.action}</small></article>) : <div className="all-clear"><b>All clear.</b><span>No cleanup recommendation right now.</span></div>}</div>
        </div>
      </section>}
    </>}

    <footer><strong>Codex first.</strong> Also maps Claude Desktop, Cursor, VS Code, Windsurf, Cline, Roo Code, and Zed.</footer>
  </main>
}
