import confetti from 'canvas-confetti'
import { useEffect, useMemo, useRef, useState } from 'react'
import { approveAndApplyBrowserFixes, applySupervisedFixes, buildFixPlan, getEnvironmentAccessMode, getLatestScan, getMCPationMode, listBackups, registerMCPationTools, requestHostHandoff, rescanConnectedEnvironment, restoreBackup, restoreConnectedEnvironment, startConsentSession, startImportedSession, supportsDirectDiskAccess, toolNames, type BackupEntry, type ScanResult } from './mcpation'
import './mcpation.css'

function readinessClass(scan: ScanResult | null): string {
  if (!scan) return ''
  return scan.readiness.label === 'ready' ? 'good' : scan.readiness.label === 'needs-attention' ? 'warn' : 'risk'
}

function backupEventLabel(prefix: string, value: string): string {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? `${prefix} ${new Date(timestamp).toLocaleString()}` : `${prefix} in an earlier run`
}

export default function App() {
  const [scan, setScan] = useState<ScanResult | null>(getLatestScan())
  const [registered, setRegistered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Choose a workspace and we’ll check what Codex is about to inherit.')
  const [showPlan, setShowPlan] = useState(false)
  const [selectedFixes, setSelectedFixes] = useState<string[]>([])
  const [baseline, setBaseline] = useState<ScanResult | null>(null)
  const [trail, setTrail] = useState<Array<{ label: string; detail: string; state: 'done' | 'active' }>>([])
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [useImportFallback, setUseImportFallback] = useState(false)
  const folderInput = useRef<HTMLInputElement>(null)
  const baselineScore = useRef<number | null>(null)
  const webmcpMode = getMCPationMode()
  const environmentMode = getEnvironmentAccessMode()
  const nativeFolderMode = new URLSearchParams(window.location.search).get('browser') === 'chrome'
  const issues = useMemo(() => scan?.findings.filter((finding) => finding.severity !== 'healthy').length || 0, [scan])
  const plan = scan ? buildFixPlan(scan) : null
  const record = (label: string, detail: string, state: 'done' | 'active' = 'done') => setTrail((current) => [...current.slice(-4), { label, detail, state }])
  const refreshBackups = async () => {
    try { setBackups(await listBackups()) } catch { setBackups([]) }
  }
  const celebrate = () => {
    const options = { particleCount: 85, spread: 78, startVelocity: 34, gravity: 0.82, ticks: 175, scalar: 0.92, colors: ['#62e9df', '#c7a5ff', '#ffd37b', '#ff8c9d'], disableForReducedMotion: true }
    void confetti({ ...options, angle: 64, origin: { x: 0.13, y: 0.7 } })
    void confetti({ ...options, angle: 116, origin: { x: 0.87, y: 0.7 } })
  }

  useEffect(() => {
    const refresh = (event: Event) => { setScan((event as CustomEvent<ScanResult>).detail || getLatestScan()); void refreshBackups() }
    const handoff = () => { setMessage('Codex is ready to ask for your approval before it changes anything.'); record('Waiting for your approval', 'Codex needs permission only for the exact change you selected.', 'active') }
    const verified = (event: Event) => {
      const result = (event as CustomEvent<{ readiness: ScanResult['readiness']; findings: ScanResult['findings'] }>).detail
      const improved = baselineScore.current !== null && result.readiness.value > baselineScore.current
      record('Post-change verification complete', `${result.readiness.value}/100 · ${result.findings.filter((item) => item.severity !== 'healthy').length} remaining finding(s).`)
      setMessage(improved ? 'Nice — the approved cleanup worked, and the workspace is now in a better state.' : 'Verification complete. This page now reflects the workspace Codex checked.')
      if (improved) celebrate()
    }
    window.addEventListener('mcpation:scan', refresh)
    window.addEventListener('mcpation:handoff', handoff)
    window.addEventListener('mcpation:verified', verified)
    void registerMCPationTools().then(() => {
      setRegistered(true)
      if (getMCPationMode() !== 'native') setMessage(nativeFolderMode ? 'WebMCP is off in Chrome. Enable chrome://flags/#enable-webmcp-testing, relaunch Chrome, and reopen MCPation.' : 'Native WebMCP is unavailable in this browser. Open MCPation in ChatGPT’s in-app browser or Chrome 149+ with WebMCP enabled.')
    }).catch(() => setMessage('Open MCPation in a supported WebMCP browser.'))
    void restoreConnectedEnvironment().then(() => refreshBackups()).catch(() => undefined)
    return () => { window.removeEventListener('mcpation:scan', refresh); window.removeEventListener('mcpation:handoff', handoff); window.removeEventListener('mcpation:verified', verified) }
  }, [])

  const scanNow = async () => {
    if (!scan) {
      if (nativeFolderMode && supportsDirectDiskAccess() && !useImportFallback) {
        setBusy(true)
        try {
          const result = await startConsentSession()
          setScan(result)
          setBaseline(result)
          baselineScore.current = result.readiness.value
          setTrail([{ label: 'Starting point saved', detail: `${result.readiness.value}/100 · ${result.findings.filter((item) => item.severity !== 'healthy').length} thing(s) to review before any change.`, state: 'done' }])
          setMessage(`Workspace checked. Codex can now help you review the next step. Readiness: ${result.readiness.value}/100.`)
          await refreshBackups()
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            setUseImportFallback(true)
            setMessage('Chrome did not return a usable folder handle. Click Choose workspace folder once more to import it read-only.')
          } else setMessage(error instanceof Error ? error.message : 'The browser could not read the selected workspace.')
        } finally { setBusy(false) }
        return
      }
      folderInput.current?.click()
      return
    }
    setBusy(true)
    try {
      const result = await rescanConnectedEnvironment()
      setScan(result)
      setShowPlan(false)
      setMessage(`Check complete. Codex readiness is ${result.readiness.value}/100.`)
      record('Workspace checked again', `${result.readiness.value}/100 based on the latest visible state.`)
      await refreshBackups()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The browser could not access the selected workspace.')
    } finally { setBusy(false) }
  }

  const importFolder = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const result = await startImportedSession(files)
      setScan(result)
      setBaseline(result)
      baselineScore.current = result.readiness.value
      setTrail([{ label: 'Starting point saved', detail: `${result.readiness.value}/100 · ${result.findings.filter((item) => item.severity !== 'healthy').length} thing(s) to review before any change.`, state: 'done' }])
      setShowPlan(false)
      setMessage(`Workspace checked. Codex can now help you review the next step. Readiness: ${result.readiness.value}/100.`)
      await refreshBackups()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The browser could not read the selected workspace.')
    } finally {
      setBusy(false)
      if (folderInput.current) folderInput.current.value = ''
    }
  }

  const toggleFix = (id: string) => setSelectedFixes((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const applyFixes = async () => {
    if (!selectedFixes.length) return
    const selectedCount = selectedFixes.length
    const entryLabel = selectedCount === 1 ? 'entry' : 'entries'
    if (!window.confirm(`Create one backup per affected file, then remove exactly ${selectedCount} checked JSON ${entryLabel}? Unchecked entries and manual findings will stay untouched.`)) return
    setBusy(true)
    try {
      const currentMode = getEnvironmentAccessMode()
      if (currentMode === 'import' || currentMode === 'codex-host') {
        const handoff = requestHostHandoff('apply', selectedFixes)
        setMessage('Codex approval is ready. Ask Codex to execute this handoff in the current workspace, then submit the snapshot and verify it.')
        record('Codex approval request ready', `${handoff.actions.length} exact change(s) · native workspace permission required.`, 'active')
        return
      }
      const result = currentMode === 'direct' || currentMode === 'demo' ? await applySupervisedFixes(selectedFixes) : await approveAndApplyBrowserFixes(selectedFixes)
      setScan(result)
      setSelectedFixes([])
      setShowPlan(false)
      setMessage(getEnvironmentAccessMode() === 'demo' ? 'Demo cleanup complete and checked. No disk file was changed.' : 'Cleanup complete. One backup per changed file was created, the selected JSON entries were removed, and the workspace was checked again.')
      record('Your approved cleanup is complete', `${selectedCount} selected change(s) were applied and checked.`)
      await refreshBackups()
      if (baseline && result.readiness.value > baseline.readiness.value) celebrate()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The reviewed hardening changes could not be applied.')
    } finally { setBusy(false) }
  }

  const restoreSelectedBackup = async (backup: BackupEntry) => {
    if (!window.confirm(`Restore ${backup.path} from this backup? The current file will be saved first.`)) return
    setBusy(true)
    try {
      const result = await restoreBackup(backup.id)
      setScan(result.scan)
      setShowPlan(false)
      setMessage(`Restored ${result.restoredPath}. The previous state was saved as a safety backup.`)
      record('Backup restored', `${result.restoredPath} is back in the workspace; a safety copy was created.`)
      await refreshBackups()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The selected backup could not be restored.')
    } finally { setBusy(false) }
  }

  return <main className="shell">
    <header className="topline">
      <div className="wordmark"><span className="mark">M</span><div><strong>MCPation</strong><small>CODEX ENVIRONMENT DOCTOR</small></div></div>
      <div className="top-actions"><div className={'webmcp-state ' + (registered ? 'ready' : '')}><i />{registered ? webmcpMode === 'native' ? `${toolNames.length} Codex tools ready` : nativeFolderMode ? 'Enable Chrome WebMCP flag' : 'Open in a WebMCP browser' : 'Loading WebMCP'}</div></div>
    </header>

    <section className="hero">
      <div>
        <p className="kicker">CODEX WORKSPACE PRE-FLIGHT</p>
        <h1>Emancipate your<br /><em>workspace.</em></h1>
        <p className="hero-punch">From what no longer serves it.</p>
        <p className="lede">Choose one workspace. MCPation looks at the MCP setup, packages, AGENTS, and skills Codex will see — then helps you decide what is ready and what deserves a closer look.</p>
      </div>
      <aside className="connect-card">
        <div className="card-eyebrow"><span className="status-dot" /> WORKSPACE SCOPE</div>
        <h2>{scan ? scan.scope.root : 'Start with one workspace'}</h2>
        <input ref={folderInput} type="file" multiple hidden onChange={(event) => void importFolder(event.currentTarget.files)} {...({ webkitdirectory: '' } as { webkitdirectory: string })} />
        <button className="primary-button" onClick={() => void scanNow()} disabled={busy}>{busy ? 'Analyzing workspace…' : scan ? 'Rescan workspace' : 'Choose workspace folder'} <b>→</b></button>
        <small>{scan?.scope.mode === 'codex-host' ? 'Codex is checking the workspace you approved; only the agreed summary comes back here.' : 'The first check only reads; nothing runs and nothing changes.'} It never looks outside the workspace you chose.</small>
      </aside>
    </section>

    <section className="metric-strip">
      <div className={readinessClass(scan)}><small>CODEX READINESS</small><strong>{scan ? `${scan.readiness.value}/100` : '—'}</strong></div>
      <div><small>DECLARED SURFACE</small><strong>{scan ? scan.toolSurface.length : '—'}</strong></div>
      <div><small>FINDINGS</small><strong className={issues ? 'warn' : ''}>{scan ? issues : '—'}</strong></div>
      <div><small>INSTRUCTIONS</small><strong>{scan ? scan.instructionChain.length : '—'}</strong></div>
    </section>

    <section className="run-state"><span className="pulse" /><strong>{message}</strong><small>{scan ? `${scan.scope.mode} · ${getMCPationMode()} WebMCP · ${scan.scope.filesConsidered} relevant files checked` : 'No workspace selected yet'}</small></section>

    {scan && <section className="audit-trail"><div><p className="kicker">YOUR CHECKLIST</p><strong>See what changed, every step of the way</strong></div><div className="trail-steps">{trail.map((item, index) => <article key={`${item.label}-${index}`} className={item.state}><b>{String(index + 1).padStart(2, '0')}</b><span><strong>{item.label}</strong><small>{item.detail}</small></span></article>)}</div></section>}

    {!scan ? <section className="empty-state">
      <div className="empty-icon">◎</div>
      <div><p className="kicker">ONE WORKSPACE · EXPLICIT ACCESS</p><h2>Choose a workspace you want to understand.</h2><p>MCPation only reads the setup files that matter at first. A supported fix still requires your exact checkbox and confirmation.</p></div>
      <div className="empty-steps"><span><b>01</b> Choose workspace</span><span><b>02</b> See what needs attention</span><span><b>03</b> Decide what to do</span></div>
    </section> : <>
      <section className="readiness-row">
        <div className={'score-card ' + readinessClass(scan)}><div className="score-ring"><strong>{scan.readiness.value}</strong><small>/100</small></div><div><p className="kicker">READYNESS CHECK</p><h2>{scan.readiness.label === 'ready' ? 'Good to go' : scan.readiness.label === 'needs-attention' ? 'Worth a quick review' : 'Pause before the next run'}</h2><p>{scan.readiness.signals.join(' · ')}</p></div></div>
        <div className="scope-card"><p className="kicker">WHAT WE CHECKED</p><strong>{scan.scope.root}</strong><span>{scan.scope.mode === 'demo' ? 'Safe demo · in memory' : scan.scope.mode === 'codex-host' ? 'Checked with your Codex approval' : scan.scope.mode === 'direct' ? 'Browser folder access' : 'Read-only browser import'} · {scan.sources.length} config source{scan.sources.length === 1 ? '' : 's'}</span><small>{scan.scope.mode === 'direct' ? 'If you approve a fix, the browser uses this same folder — no second folder picker.' : scan.scope.mode === 'import' ? 'Codex can apply the selected action through its approved workspace handoff when this is the current Codex workspace.' : 'Codex sees a safe summary, not your raw files.'}</small></div>
      </section>

      {scan.scope.mode === 'direct' && <section className="backup-panel"><div className="panel-title"><div><p className="kicker">REVERSIBLE CHANGE HISTORY</p><strong>Workspace snapshots</strong></div><span>{backups.length}</span></div><p className="panel-note">Each approved cleanup batch saves one complete original per affected file. If several checked entries share a file, they share one snapshot. Restore a snapshot once; before rewinding, MCPation saves the current file as a safety copy.</p>{backups.length ? <div className="backup-list">{backups.map((backup) => <article key={backup.id}><div><strong>{backup.path}</strong><small>{backup.restoredAt ? backupEventLabel('Restored', backup.restoredAt) : backup.createdAt ? backupEventLabel('Saved', backup.createdAt) : 'Saved before an approved cleanup'}</small></div><button onClick={() => void restoreSelectedBackup(backup)} disabled={busy || Boolean(backup.restoredAt)}>{backup.restoredAt ? 'Restored' : 'Restore'}</button></article>)}</div> : <div className="backup-empty">No approved browser cleanup yet. Snapshots will appear here after the first write.</div>}</section>}

      <section className="dashboard-heading"><div><p className="kicker">AGENT-READY INVENTORY</p><h2>{showPlan ? 'Choose fixes and approve them' : 'What Codex can act on'}</h2></div><button className="plan-button" onClick={() => setShowPlan(!showPlan)}>{showPlan ? 'Back to inventory' : `Fix findings — supervised · ${plan?.items.length || 0}`}</button></section>

      {showPlan ? <section className="fix-plan">
        <div className="plan-intro"><strong>What happens when you approve</strong><span>1) MCPation asks for write access to this same folder. 2) It saves one complete backup per affected file in .mcpation-backups/. 3) It deletes only the checked JSON entries. 4) Unchecked entries, TOML, commands, policies, and instructions stay untouched. 5) It rescans and shows the result.</span></div>
        {plan?.items.length ? plan.items.map((item) => <article key={item.id}><span className={item.canApply ? 'apply-label' : 'manual-label'}>{item.canApply ? 'BACKUP + REVIEW' : 'MANUAL REVIEW'}</span><b>{item.title}</b><p>{item.detail}</p>{item.canApply && <label className="fix-choice"><input type="checkbox" checked={selectedFixes.includes(item.id)} onChange={() => toggleFix(item.id)} /> Remove this exact JSON entry</label>}</article>) : <div className="plan-empty">No hardening action proposed for this workspace.</div>}
        <div className="fix-plan-actions"><small>{environmentMode === 'demo' ? 'Demo mode changes memory only; no disk file is touched.' : environmentMode === 'direct' ? 'Select the exact entries to remove. One approval creates one backup per affected file, deletes only those checked JSON keys, and rescans this same folder.' : 'This import is read-only in the page. After your confirmation, Codex can execute the exact handoff in its already approved workspace.'}</small><button disabled={!selectedFixes.length || busy} onClick={() => void applyFixes()}>{environmentMode === 'demo' ? 'Apply demo change' : environmentMode === 'direct' ? 'Approve & apply' : 'Request Codex approval'} {selectedFixes.length || ''}</button></div>
      </section> : <section className="dashboard-grid">
        <div className="panel inventory-panel"><div className="panel-title"><strong>Declared MCP surface</strong><span>{scan.toolSurface.length}</span></div><p className="panel-note">Configured servers and package evidence. Static declarations are not live runtime proof.</p><div className="inventory">{scan.toolSurface.length ? scan.toolSurface.map((entry) => <article key={entry.id}><div><strong>{entry.name}</strong><small>{entry.kind.replace('-', ' ')} · {entry.confidence} confidence</small></div><div className="server-meta"><span>{entry.source}</span><small>{entry.target || entry.declaredIn}</small></div></article>) : <div className="all-clear"><b>No MCP signal found.</b><span>Connect a project with a Codex config or MCP package manifest.</span></div>}</div></div>
        <div className="panel findings-panel"><div className="panel-title"><strong>Readiness findings</strong><span>{issues}</span></div><div className="findings">{scan.findings.map((finding) => <article key={finding.id} className={finding.severity}><span>{finding.severity}</span><strong>{finding.title}</strong><p>{finding.detail}</p></article>)}</div></div>
        <div className="panel artifacts-panel"><div className="panel-title"><strong>Instruction chain &amp; evidence</strong><span>{scan.artifacts.length}</span></div><div className="artifact-list">{scan.artifacts.map((artifact) => <article key={artifact.id}><span>{artifact.kind.replace('-', ' ')}</span><strong>{artifact.label}</strong><small>{artifact.path} · {artifact.detail}</small></article>)}</div>{scan.instructionChain.length > 0 && <div className="instruction-chain"><p className="kicker">ORDERED GUIDANCE</p>{scan.instructionChain.map((item) => <span key={item.path}>{item.kind} · depth {item.depth}</span>)}</div>}</div>
        <div className="panel graph-panel"><div className="panel-title"><strong>Workspace evidence graph</strong><span>{scan.workspaceGraph.edges.length} links</span></div><p className="panel-note">Static relationships only. No code runs and no file contents leave the tab.</p><p className="graph-summary">{scan.workspaceGraph.summary}</p><div className="graph-legend"><span>config / guidance</span><b>→</b><span>declared MCP signal</span><b>→</b><span>finding</span></div><div className="graph-nodes">{scan.workspaceGraph.nodes.slice(0, 7).map((node) => <span key={node.id} className={node.kind}>{node.label}</span>)}</div></div>
      </section>}
    </>}

    <footer><strong>WebMCP-native.</strong> Codex and the user share the same visible state. Supported cleanup uses a separate browser write grant for the folder you choose; no daemon, extension, Gemini key, or hidden full-disk access.</footer>
  </main>
}
