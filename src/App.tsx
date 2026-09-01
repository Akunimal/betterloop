import { useEffect, useMemo, useRef, useState } from 'react'
import { applySupervisedFixes, buildFixPlan, getEnvironmentAccessMode, getLatestScan, registerMCPationTools, rescanConnectedEnvironment, restoreConnectedEnvironment, startConsentSession, startImportedSession, supportsDirectDiskAccess, toolNames, type ScanResult } from './mcpation'
import './mcpation.css'

export default function App() {
  const [scan, setScan] = useState<ScanResult | null>(getLatestScan())
  const [registered, setRegistered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready to connect your MCP configuration folder.')
  const [showPlan, setShowPlan] = useState(false)
  const [selectedFixes, setSelectedFixes] = useState<string[]>([])
  const folderInput = useRef<HTMLInputElement>(null)
  const directAccess = supportsDirectDiskAccess()
  const issues = useMemo(() => scan?.findings.filter((finding) => finding.severity !== 'healthy').length || 0, [scan])

  useEffect(() => {
    const refresh = (event: Event) => setScan((event as CustomEvent<ScanResult>).detail || getLatestScan())
    window.addEventListener('mcpation:scan', refresh)
    void registerMCPationTools().then(() => setRegistered(true)).catch(() => setMessage('Open MCPation in a WebMCP-capable browser.'))
    void restoreConnectedEnvironment().catch(() => undefined)
    return () => window.removeEventListener('mcpation:scan', refresh)
  }, [])

  const scanNow = async () => {
    if (!scan && !directAccess) {
      folderInput.current?.click()
      return
    }
    setBusy(true)
    try {
      const result = scan ? await rescanConnectedEnvironment() : await startConsentSession()
      setScan(result)
      setShowPlan(false)
      setMessage('Browser-local scan complete. Your cleanup plan is ready.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The browser could not access the selected folder.')
    } finally {
      setBusy(false)
    }
  }
  const importFolder = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      setScan(await startImportedSession(files))
      setShowPlan(false)
      setMessage('Browser-local read-only scan complete. Your cleanup plan is ready for Codex review.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The browser could not read the selected folder.')
    } finally {
      setBusy(false)
      if (folderInput.current) folderInput.current.value = ''
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
        <span className="scan-label">BROWSER-NATIVE CHECK</span>
        <h2>{scan ? 'Run it again?' : 'Grant only what is needed'}</h2>
        <input ref={folderInput} type="file" multiple hidden onChange={(event) => void importFolder(event.currentTarget.files)} {...({ webkitdirectory: '' } as { webkitdirectory: string })} />
        <button onClick={() => void scanNow()} disabled={busy}>{busy ? 'Scanning…' : scan ? 'Rescan environment' : directAccess ? 'Connect environment folder' : 'Select environment folder'} <b>→</b></button>
        <small>No install · {directAccess ? 'direct browser access' : 'read-only embedded-browser import'} · known config paths only</small>
      </aside>
    </section>

    <section className="metric-strip">
      <div><small>MCPs</small><strong>{scan ? scan.servers.length : '—'}</strong></div>
      <div><small>TO REVIEW</small><strong className={issues ? 'warn' : ''}>{scan ? issues : '—'}</strong></div>
      <div><small>ENVIRONMENTS</small><strong>{scan ? scan.profiles.length : '—'}</strong></div>
      <div><small>HOST</small><strong>{scan ? scan.host.operatingSystem : 'Local'}</strong></div>
    </section>

    <section className="run-state"><span className="pulse" /><strong>{message}</strong>{scan && <small>Schema {scan.schemaVersion} · browser only</small>}</section>

    {!scan ? <section className="empty-state">
      <div className="empty-icon">↗</div><div><p className="kicker">ONE NATIVE PERMISSION</p><h2>Connect the folder. Keep control.</h2><p>The page reads known MCP config paths locally; WebMCP receives only the sanitized analysis.</p></div>
    </section> : <>
      <section className="system-row">
        <div><small>PRIMARY</small><strong>Codex</strong></div>
        <div><small>ACCESS</small><strong>{getEnvironmentAccessMode() === 'direct' ? 'Browser read/write' : 'Browser read-only'}</strong></div>
        <div><small>CONFIG FILES</small><strong>{scan.sources.length}</strong></div>
        <div><small>LOCAL SERVICE</small><strong>Not required</strong></div>
      </section>

      <section className="dashboard-heading">
        <div><p className="kicker">SCAN RESULTS</p><h2>{showPlan ? 'Supervised cleanup' : 'What MCPation found'}</h2></div>
        <button className="plan-button" onClick={() => setShowPlan(!showPlan)}>{showPlan ? 'Back to results' : `Review cleanup · ${scan.recommendations.length}`}</button>
      </section>

      {showPlan ? <section className="fix-plan">
        <div className="plan-intro"><strong>You choose every change.</strong><span>Sibling backup first. Ambiguous, policy, and command fixes stay manual.</span></div>
        {buildFixPlan(scan).items.length ? buildFixPlan(scan).items.map((item) => <article key={item.id}><span>{item.canApply ? 'BACKUP + REVIEW' : 'MANUAL'}</span><b>{item.title}</b><p>{item.detail}</p>{item.canApply && <label className="fix-choice"><input type="checkbox" checked={selectedFixes.includes(item.id)} onChange={() => toggleFix(item.id)} /> Include this exact change</label>}</article>) : <div className="plan-empty">No configuration changes proposed.</div>}
        <div className="fix-plan-actions"><small>No bulk guesses. Only selected deterministic JSON cleanup can be applied.</small><button disabled={!selectedFixes.length || busy} onClick={() => void applyFixes()}>Back up & apply {selectedFixes.length || ''}</button></div>
      </section> : <section className="dashboard-grid">
        <div className="panel inventory-panel">
          <div className="panel-title"><strong>Configured MCPs</strong><span>{scan.servers.length}</span></div>
          <div className="environment-tags">{scan.profiles.map((profile) => <span key={profile.name}>{profile.name} · {profile.configuredServers.length}</span>)}</div>
          <div className="inventory">{scan.servers.map((server) => <article key={server.id}><div><strong>{server.name}</strong><small>{server.source} · {server.transport}</small></div><div className="server-meta"><span className={server.disabled ? 'bad' : ''}>{server.disabled ? 'Disabled' : 'Configured'}</span><small>{server.target}</small></div></article>)}</div>
        </div>

        <div className="panel upgrade-panel">
          <div className="panel-title"><strong>Glow-up plan</strong><span>{scan.recommendations.length}</span></div>
          <div className="recommendations">{scan.recommendations.length ? scan.recommendations.map((item) => <article key={item.id}><span className={item.priority}>{item.category}</span><strong>{item.title}</strong><p>{item.reason}</p><small>→ {item.action}</small></article>) : <div className="all-clear"><b>All clear.</b><span>No cleanup recommendation right now.</span></div>}</div>
        </div>
      </section>}
    </>}

    <footer><strong>WebMCP-native.</strong> No daemon, extension, or API key. Codex first; other IDE configs remain visible.</footer>
  </main>
}
