import { useEffect, useMemo, useRef, useState } from 'react'
import { applySupervisedFixes, buildFixPlan, getEnvironmentAccessMode, getLatestScan, getMCPationMode, registerMCPationTools, rescanConnectedEnvironment, restoreConnectedEnvironment, startImportedSession, toolNames, type ScanResult } from './mcpation'
import './mcpation.css'

function readinessClass(scan: ScanResult | null): string {
  if (!scan) return ''
  return scan.readiness.label === 'ready' ? 'good' : scan.readiness.label === 'needs-attention' ? 'warn' : 'risk'
}

export default function App() {
  const [scan, setScan] = useState<ScanResult | null>(getLatestScan())
  const [registered, setRegistered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready to audit a Codex workspace.')
  const [showPlan, setShowPlan] = useState(false)
  const [selectedFixes, setSelectedFixes] = useState<string[]>([])
  const folderInput = useRef<HTMLInputElement>(null)
  const webmcpMode = getMCPationMode()
  const environmentMode = getEnvironmentAccessMode()
  const issues = useMemo(() => scan?.findings.filter((finding) => finding.severity !== 'healthy').length || 0, [scan])
  const plan = scan ? buildFixPlan(scan) : null

  useEffect(() => {
    const refresh = (event: Event) => setScan((event as CustomEvent<ScanResult>).detail || getLatestScan())
    const handoff = () => setMessage('Codex host handoff requested. Review and approve the native filesystem capability, then return the sanitized snapshot.')
    window.addEventListener('mcpation:scan', refresh)
    window.addEventListener('mcpation:handoff', handoff)
    void registerMCPationTools().then(() => {
      setRegistered(true)
      if (getMCPationMode() !== 'native') setMessage('Native WebMCP is unavailable in this browser. Open MCPation in ChatGPT’s in-app browser or Chrome 149+ with WebMCP enabled.')
    }).catch(() => setMessage('Open MCPation in a supported WebMCP browser.'))
    void restoreConnectedEnvironment().catch(() => undefined)
    return () => { window.removeEventListener('mcpation:scan', refresh); window.removeEventListener('mcpation:handoff', handoff) }
  }, [])

  const scanNow = async () => {
    if (!scan) {
      folderInput.current?.click()
      return
    }
    setBusy(true)
    try {
      const result = await rescanConnectedEnvironment()
      setScan(result)
      setShowPlan(false)
      setMessage(`Audit complete. Codex readiness: ${result.readiness.value}/100.`)
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
      setShowPlan(false)
      setMessage(`Browser preview complete. Codex host handoff is available. Readiness: ${result.readiness.value}/100.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The browser could not read the selected workspace.')
    } finally {
      setBusy(false)
      if (folderInput.current) folderInput.current.value = ''
    }
  }

  const toggleFix = (id: string) => setSelectedFixes((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const applyFixes = async () => {
    if (!selectedFixes.length || !['direct', 'demo'].includes(getEnvironmentAccessMode() || '')) return
    if (!window.confirm(`Back up and apply ${selectedFixes.length} reviewed hardening change${selectedFixes.length === 1 ? '' : 's'}?`)) return
    setBusy(true)
    try {
      const result = await applySupervisedFixes(selectedFixes)
      setScan(result)
      setSelectedFixes([])
      setShowPlan(false)
      setMessage(getEnvironmentAccessMode() === 'demo' ? 'Demo hardening applied in memory and verified. No disk file was changed.' : 'Hardening applied. A sibling backup was created and the workspace was verified.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The reviewed hardening changes could not be applied.')
    } finally { setBusy(false) }
  }

  return <main className="shell">
    <header className="topline">
      <div className="wordmark"><span className="mark">M</span><div><strong>MCPation</strong><small>CODEX ENVIRONMENT DOCTOR</small></div></div>
      <div className="top-actions"><div className={'webmcp-state ' + (registered ? 'ready' : '')}><i />{registered ? webmcpMode === 'native' ? `${toolNames.length} Codex tools ready` : 'Open in a WebMCP browser' : 'Loading WebMCP'}</div></div>
    </header>

    <section className="hero">
      <div>
        <p className="kicker">CODEX WORKSPACE PRE-FLIGHT</p>
        <h1>Know what Codex<br /><em>will inherit.</em></h1>
        <p className="lede">Choose one workspace. MCPation reads its MCP configuration, package signals, AGENTS, and skills, then turns configuration drift into a clear readiness decision.</p>
      </div>
      <aside className="connect-card">
        <div className="card-eyebrow"><span className="status-dot" /> WORKSPACE SCOPE</div>
        <h2>{scan ? scan.scope.root : 'Choose a workspace'}</h2>
        <input ref={folderInput} type="file" multiple hidden onChange={(event) => void importFolder(event.currentTarget.files)} {...({ webkitdirectory: '' } as { webkitdirectory: string })} />
        <button className="primary-button" onClick={() => void scanNow()} disabled={busy}>{busy ? 'Analyzing workspace…' : scan ? 'Rescan workspace' : 'Choose workspace folder'} <b>→</b></button>
        <small>{scan?.scope.mode === 'codex-host' ? 'Codex host scope; only allowlisted snapshots return here.' : 'Read-only analysis. No code runs and nothing is changed.'} Never scans outside the selected scope.</small>
      </aside>
    </section>

    <section className="metric-strip">
      <div className={readinessClass(scan)}><small>CODEX READINESS</small><strong>{scan ? `${scan.readiness.value}/100` : '—'}</strong></div>
      <div><small>DECLARED SURFACE</small><strong>{scan ? scan.toolSurface.length : '—'}</strong></div>
      <div><small>FINDINGS</small><strong className={issues ? 'warn' : ''}>{scan ? issues : '—'}</strong></div>
      <div><small>INSTRUCTIONS</small><strong>{scan ? scan.instructionChain.length : '—'}</strong></div>
    </section>

    <section className="run-state"><span className="pulse" /><strong>{message}</strong><small>{scan ? `${scan.scope.mode} · ${getMCPationMode()} WebMCP · ${scan.scope.filesConsidered} files considered` : 'No workspace has been selected'}</small></section>

    {!scan ? <section className="empty-state">
      <div className="empty-icon">◎</div>
      <div><p className="kicker">ONE WORKSPACE · READ ONLY</p><h2>Start with the workspace Codex will use.</h2><p>MCPation reads only allowlisted config, package, instruction, and skill files. Codex can inspect the same findings; any write remains a separate, explicit host approval.</p></div>
      <div className="empty-steps"><span><b>01</b> Select workspace</span><span><b>02</b> Inspect findings</span><span><b>03</b> Review next step</span></div>
    </section> : <>
      <section className="readiness-row">
        <div className={'score-card ' + readinessClass(scan)}><div className="score-ring"><strong>{scan.readiness.value}</strong><small>/100</small></div><div><p className="kicker">READINESS GATE</p><h2>{scan.readiness.label === 'ready' ? 'Ready for the next run' : scan.readiness.label === 'needs-attention' ? 'Review before the next run' : 'Pause and harden first'}</h2><p>{scan.readiness.signals.join(' · ')}</p></div></div>
        <div className="scope-card"><p className="kicker">WHAT IS IN SCOPE</p><strong>{scan.scope.root}</strong><span>{scan.scope.mode === 'demo' ? 'Deterministic demo · in memory' : scan.scope.mode === 'codex-host' ? 'Codex host approval · snapshot bridge' : 'Browser read-only preview · host handoff available'} · {scan.sources.length} config source{scan.sources.length === 1 ? '' : 's'}</span><small>Codex sees sanitized metadata only.</small></div>
      </section>

      <section className="dashboard-heading"><div><p className="kicker">AGENT-READY INVENTORY</p><h2>{showPlan ? 'Supervised hardening' : 'What Codex can act on'}</h2></div><button className="plan-button" onClick={() => setShowPlan(!showPlan)}>{showPlan ? 'Back to inventory' : `Review hardening · ${plan?.items.length || 0}`}</button></section>

      {showPlan ? <section className="fix-plan">
        <div className="plan-intro"><strong>Every write is explicit.</strong><span>Only deterministic JSON duplicate cleanup can be applied. Commands, TOML, policy, and instruction changes remain manual. If the page is read-only, Codex can request the host handoff for this exact plan.</span></div>
        {plan?.items.length ? plan.items.map((item) => <article key={item.id}><span className={item.canApply ? 'apply-label' : 'manual-label'}>{item.canApply ? 'BACKUP + REVIEW' : 'MANUAL REVIEW'}</span><b>{item.title}</b><p>{item.detail}</p>{item.canApply && <label className="fix-choice"><input type="checkbox" checked={selectedFixes.includes(item.id)} onChange={() => toggleFix(item.id)} /> Include this exact change</label>}</article>) : <div className="plan-empty">No hardening action proposed for this workspace.</div>}
        <div className="fix-plan-actions"><small>{environmentMode === 'demo' ? 'Demo mode changes memory only; no disk file is touched.' : environmentMode === 'codex-host' ? 'Codex must request native write approval, then use the host handoff and submit a fresh snapshot.' : 'Ask Codex to call codex_request_host_handoff with operation apply; the page never writes selected workspace files.'}</small><button disabled={!selectedFixes.length || busy || environmentMode !== 'demo'} onClick={() => void applyFixes()}>{environmentMode === 'demo' ? 'Apply demo change' : 'Use Codex host handoff'} {selectedFixes.length || ''}</button></div>
      </section> : <section className="dashboard-grid">
        <div className="panel inventory-panel"><div className="panel-title"><strong>Declared MCP surface</strong><span>{scan.toolSurface.length}</span></div><p className="panel-note">Configured servers and package evidence. Static declarations are not live runtime proof.</p><div className="inventory">{scan.toolSurface.length ? scan.toolSurface.map((entry) => <article key={entry.id}><div><strong>{entry.name}</strong><small>{entry.kind.replace('-', ' ')} · {entry.confidence} confidence</small></div><div className="server-meta"><span>{entry.source}</span><small>{entry.target || entry.declaredIn}</small></div></article>) : <div className="all-clear"><b>No MCP signal found.</b><span>Connect a project with a Codex config or MCP package manifest.</span></div>}</div></div>
        <div className="panel findings-panel"><div className="panel-title"><strong>Readiness findings</strong><span>{issues}</span></div><div className="findings">{scan.findings.map((finding) => <article key={finding.id} className={finding.severity}><span>{finding.severity}</span><strong>{finding.title}</strong><p>{finding.detail}</p></article>)}</div></div>
        <div className="panel artifacts-panel"><div className="panel-title"><strong>Instruction chain &amp; evidence</strong><span>{scan.artifacts.length}</span></div><div className="artifact-list">{scan.artifacts.map((artifact) => <article key={artifact.id}><span>{artifact.kind.replace('-', ' ')}</span><strong>{artifact.label}</strong><small>{artifact.detail}</small></article>)}</div>{scan.instructionChain.length > 0 && <div className="instruction-chain"><p className="kicker">ORDERED GUIDANCE</p>{scan.instructionChain.map((item) => <span key={item.path}>{item.kind} · depth {item.depth}</span>)}</div>}</div>
        <div className="panel graph-panel"><div className="panel-title"><strong>Workspace evidence graph</strong><span>{scan.workspaceGraph.edges.length} links</span></div><p className="panel-note">Static relationships only. No code runs and no file contents leave the tab.</p><p className="graph-summary">{scan.workspaceGraph.summary}</p><div className="graph-legend"><span>config / guidance</span><b>→</b><span>declared MCP signal</span><b>→</b><span>finding</span></div><div className="graph-nodes">{scan.workspaceGraph.nodes.slice(0, 7).map((node) => <span key={node.id} className={node.kind}>{node.label}</span>)}</div></div>
      </section>}
    </>}

    <footer><strong>WebMCP-native.</strong> Codex and the user share the same visible state. Host-only work goes through Codex's native permission flow; no daemon, extension, Gemini key, or hidden full-disk access.</footer>
  </main>
}
