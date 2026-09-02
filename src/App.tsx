import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { approveAndApplyBrowserFixes, applySupervisedFixes, buildFixPlan, getEnvironmentAccessMode, getLatestScan, getMCPationMode, registerMCPationTools, rescanConnectedEnvironment, restoreConnectedEnvironment, startConsentSession, startImportedSession, supportsDirectDiskAccess, toolNames, type ScanResult } from './mcpation'
import './mcpation.css'

function readinessClass(scan: ScanResult | null): string {
  if (!scan) return ''
  return scan.readiness.label === 'ready' ? 'good' : scan.readiness.label === 'needs-attention' ? 'warn' : 'risk'
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
  const [celebrating, setCelebrating] = useState(false)
  const [useImportFallback, setUseImportFallback] = useState(false)
  const folderInput = useRef<HTMLInputElement>(null)
  const baselineScore = useRef<number | null>(null)
  const webmcpMode = getMCPationMode()
  const environmentMode = getEnvironmentAccessMode()
  const issues = useMemo(() => scan?.findings.filter((finding) => finding.severity !== 'healthy').length || 0, [scan])
  const plan = scan ? buildFixPlan(scan) : null
  const record = (label: string, detail: string, state: 'done' | 'active' = 'done') => setTrail((current) => [...current.slice(-4), { label, detail, state }])

  useEffect(() => {
    const refresh = (event: Event) => setScan((event as CustomEvent<ScanResult>).detail || getLatestScan())
    const handoff = () => { setMessage('Codex is ready to ask for your approval before it changes anything.'); record('Waiting for your approval', 'Codex needs permission only for the exact change you selected.', 'active') }
    const verified = (event: Event) => {
      const result = (event as CustomEvent<{ readiness: ScanResult['readiness']; findings: ScanResult['findings'] }>).detail
      const improved = baselineScore.current !== null && result.readiness.value > baselineScore.current
      record('Post-change verification complete', `${result.readiness.value}/100 · ${result.findings.filter((item) => item.severity !== 'healthy').length} remaining finding(s).`)
      setMessage(improved ? 'Nice — the approved cleanup worked, and the workspace is now in a better state.' : 'Verification complete. This page now reflects the workspace Codex checked.')
      if (improved) { setCelebrating(true); window.setTimeout(() => setCelebrating(false), 2600) }
    }
    window.addEventListener('mcpation:scan', refresh)
    window.addEventListener('mcpation:handoff', handoff)
    window.addEventListener('mcpation:verified', verified)
    void registerMCPationTools().then(() => {
      setRegistered(true)
      if (getMCPationMode() !== 'native') setMessage('Native WebMCP is unavailable in this browser. Open MCPation in ChatGPT’s in-app browser or Chrome 149+ with WebMCP enabled.')
    }).catch(() => setMessage('Open MCPation in a supported WebMCP browser.'))
    void restoreConnectedEnvironment().catch(() => undefined)
    return () => { window.removeEventListener('mcpation:scan', refresh); window.removeEventListener('mcpation:handoff', handoff); window.removeEventListener('mcpation:verified', verified) }
  }, [])

  const scanNow = async () => {
    if (!scan) {
      if (supportsDirectDiskAccess() && !useImportFallback) {
        setBusy(true)
        try {
          const result = await startConsentSession()
          setScan(result)
          setBaseline(result)
          baselineScore.current = result.readiness.value
          setTrail([{ label: 'Starting point saved', detail: `${result.readiness.value}/100 · ${result.findings.filter((item) => item.severity !== 'healthy').length} thing(s) to review before any change.`, state: 'done' }])
          setMessage(`Workspace checked. Codex can now help you review the next step. Readiness: ${result.readiness.value}/100.`)
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            setUseImportFallback(true)
            setMessage('This embedded browser did not return a usable folder handle. Click Choose workspace folder once more to import it read-only; Chrome supports the complete browser apply flow.')
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
    if (!window.confirm(`Back up and apply ${selectedFixes.length} reviewed hardening change${selectedFixes.length === 1 ? '' : 's'}?`)) return
    setBusy(true)
    try {
      const result = ['direct', 'demo'].includes(getEnvironmentAccessMode() || '') ? await applySupervisedFixes(selectedFixes) : await approveAndApplyBrowserFixes(selectedFixes)
      setScan(result)
      setSelectedFixes([])
      setShowPlan(false)
      setMessage(getEnvironmentAccessMode() === 'demo' ? 'Demo cleanup complete and checked. No disk file was changed.' : 'Cleanup complete. A backup was created and the workspace was checked again.')
      record('Your approved cleanup is complete', `${selectedFixes.length} selected change(s) were applied and checked.`)
      if (baseline && result.readiness.value > baseline.readiness.value) { setCelebrating(true); window.setTimeout(() => setCelebrating(false), 2600) }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The reviewed hardening changes could not be applied.')
    } finally { setBusy(false) }
  }

  return <main className="shell">{celebrating && <div className="confetti" aria-label="Verified cleanup celebration">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--i': index } as CSSProperties} />)}</div>}
    <header className="topline">
      <div className="wordmark"><span className="mark">M</span><div><strong>MCPation</strong><small>CODEX ENVIRONMENT DOCTOR</small></div></div>
      <div className="top-actions"><div className={'webmcp-state ' + (registered ? 'ready' : '')}><i />{registered ? webmcpMode === 'native' ? `${toolNames.length} Codex tools ready` : 'Open in a WebMCP browser' : 'Loading WebMCP'}</div></div>
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
        <div className="scope-card"><p className="kicker">WHAT WE CHECKED</p><strong>{scan.scope.root}</strong><span>{scan.scope.mode === 'demo' ? 'Safe demo · in memory' : scan.scope.mode === 'codex-host' ? 'Checked with your Codex approval' : scan.scope.mode === 'direct' ? 'Browser folder access' : 'Read-only browser import'} · {scan.sources.length} config source{scan.sources.length === 1 ? '' : 's'}</span><small>{scan.scope.mode === 'direct' ? 'If you approve a fix, the browser asks to elevate access for this same folder — no second folder picker.' : scan.scope.mode === 'import' ? 'This browser imported files read-only; reconnect with the browser folder picker to use supported cleanup.' : 'Codex sees a safe summary, not your raw files.'}</small></div>
      </section>

      <section className="dashboard-heading"><div><p className="kicker">AGENT-READY INVENTORY</p><h2>{showPlan ? 'Choose fixes and approve them' : 'What Codex can act on'}</h2></div><button className="plan-button" onClick={() => setShowPlan(!showPlan)}>{showPlan ? 'Back to inventory' : `Fix findings — supervised · ${plan?.items.length || 0}`}</button></section>

      {showPlan ? <section className="fix-plan">
        <div className="plan-intro"><strong>Every write is explicit.</strong><span>Only deterministic JSON duplicate cleanup can be applied. Commands, TOML, policy, and instruction changes remain manual. Before a real write, the browser asks for your folder permission and MCPation creates a backup.</span></div>
        {plan?.items.length ? plan.items.map((item) => <article key={item.id}><span className={item.canApply ? 'apply-label' : 'manual-label'}>{item.canApply ? 'BACKUP + REVIEW' : 'MANUAL REVIEW'}</span><b>{item.title}</b><p>{item.detail}</p>{item.canApply && <label className="fix-choice"><input type="checkbox" checked={selectedFixes.includes(item.id)} onChange={() => toggleFix(item.id)} /> Include this exact change</label>}</article>) : <div className="plan-empty">No hardening action proposed for this workspace.</div>}
        <div className="fix-plan-actions"><small>{environmentMode === 'demo' ? 'Demo mode changes memory only; no disk file is touched.' : environmentMode === 'direct' ? 'Choose exact fixes, then approve them. The browser asks to elevate access for this same folder before anything changes.' : 'This browser imported files read-only. Reconnect with the browser folder picker to apply a supported cleanup.'}</small><button disabled={!selectedFixes.length || busy || (environmentMode !== 'demo' && environmentMode !== 'direct')} onClick={() => void applyFixes()}>{environmentMode === 'demo' ? 'Apply demo change' : 'Approve & apply'} {selectedFixes.length || ''}</button></div>
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
