import { useEffect, useMemo, useRef, useState } from 'react'
import { applySupervisedFixes, buildFixPlan, getEnvironmentAccessMode, getLatestScan, getMCPationMode, registerMCPationTools, rescanConnectedEnvironment, restoreConnectedEnvironment, startConsentSession, startDemoSession, startImportedSession, supportsDirectDiskAccess, toolNames, type ScanResult } from './mcpation'
import './mcpation.css'

function readinessClass(scan: ScanResult | null): string {
  if (!scan) return ''
  return scan.readiness.label === 'ready' ? 'good' : scan.readiness.label === 'needs-attention' ? 'warn' : 'risk'
}

export default function App() {
  const [scan, setScan] = useState<ScanResult | null>(getLatestScan())
  const [registered, setRegistered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [auditLive, setAuditLive] = useState(false)
  const [message, setMessage] = useState('Ready to audit a Codex workspace.')
  const [showPlan, setShowPlan] = useState(false)
  const [selectedFixes, setSelectedFixes] = useState<string[]>([])
  const folderInput = useRef<HTMLInputElement>(null)
  const directAccess = supportsDirectDiskAccess()
  const issues = useMemo(() => scan?.findings.filter((finding) => finding.severity !== 'healthy').length || 0, [scan])
  const plan = scan ? buildFixPlan(scan) : null

  useEffect(() => {
    const refresh = (event: Event) => setScan((event as CustomEvent<ScanResult>).detail || getLatestScan())
    window.addEventListener('mcpation:scan', refresh)
    void registerMCPationTools().then(() => setRegistered(true)).catch(() => setMessage('Open MCPation in a WebMCP-capable browser.'))
    void restoreConnectedEnvironment().catch(() => undefined)
    return () => window.removeEventListener('mcpation:scan', refresh)
  }, [])

  useEffect(() => {
    if (!auditLive || !scan) return
    const timer = window.setInterval(() => {
      if (busy) return
      void rescanConnectedEnvironment().then((result) => setScan(result)).catch(() => setAuditLive(false))
    }, 15000)
    return () => window.clearInterval(timer)
  }, [auditLive, busy, scan])

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
      setMessage(`Read-only audit complete. Codex readiness: ${result.readiness.value}/100.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The browser could not read the selected workspace.')
    } finally {
      setBusy(false)
      if (folderInput.current) folderInput.current.value = ''
    }
  }

  const loadDemo = () => {
    const result = startDemoSession()
    setScan(result)
    setShowPlan(false)
    setSelectedFixes([])
    setMessage(`Deterministic demo loaded. Codex readiness: ${result.readiness.value}/100.`)
  }

  const toggleAudit = () => {
    if (!scan) { void scanNow(); return }
    setAuditLive((current) => !current)
    setMessage(auditLive ? 'Audit paused. The last result remains available to Codex.' : 'Audit live. MCPation will recheck the granted workspace periodically.')
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
      <div className="top-actions">
        <div className={'webmcp-state ' + (registered ? 'ready' : '')}><i />{registered ? `${toolNames.length} Codex tools ready` : 'Loading WebMCP'}</div>
        <button className={'live-button ' + (auditLive ? 'active' : '')} onClick={() => void toggleAudit()} disabled={busy}><span>{auditLive ? 'Ⅱ' : '▶'}</span>{auditLive ? 'Pause audit' : 'Start audit'}</button>
      </div>
    </header>

    <section className="hero">
      <div>
        <p className="kicker">DISCOVER · HARDEN · VERIFY</p>
        <h1>Make Codex<br /><em>ready before it runs.</em></h1>
        <p className="lede">MCPation turns a granted workspace into a safe, explainable readiness check: configured MCPs, downloaded package signals, AGENTS, skills, and the fixes worth reviewing.</p>
      </div>
      <aside className="connect-card">
        <div className="card-eyebrow"><span className="status-dot" /> WORKSPACE SCOPE</div>
        <h2>{scan ? scan.scope.root : 'Connect one workspace'}</h2>
        <input ref={folderInput} type="file" multiple hidden onChange={(event) => void importFolder(event.currentTarget.files)} {...({ webkitdirectory: '' } as { webkitdirectory: string })} />
        <button className="primary-button" onClick={() => void scanNow()} disabled={busy}>{busy ? 'Auditing…' : scan ? 'Rescan workspace' : directAccess ? 'Connect workspace folder' : 'Select workspace folder'} <b>→</b></button>
        {!scan && <button className="demo-button" onClick={loadDemo} disabled={busy}>Try deterministic demo <span>↗</span></button>}
        <small>{scan?.scope.mode === 'demo' ? 'Deterministic demo only; no disk access.' : scan?.scope.mode === 'import' ? 'Embedded browser import is read-only.' : directAccess ? 'Direct browser read/write after explicit folder grant.' : 'Embedded browser import is read-only.'} Never scans outside the selected scope.</small>
      </aside>
    </section>

    <section className="metric-strip">
      <div className={readinessClass(scan)}><small>CODEX READINESS</small><strong>{scan ? `${scan.readiness.value}/100` : '—'}</strong></div>
      <div><small>DECLARED SURFACE</small><strong>{scan ? scan.toolSurface.length : '—'}</strong></div>
      <div><small>FINDINGS</small><strong className={issues ? 'warn' : ''}>{scan ? issues : '—'}</strong></div>
      <div><small>INSTRUCTIONS</small><strong>{scan ? scan.instructionChain.length : '—'}</strong></div>
    </section>

    <section className="run-state"><span className={'pulse ' + (auditLive ? 'live' : '')} /><strong>{message}</strong><small>{scan ? `${scan.scope.mode} · ${getMCPationMode()} WebMCP · ${scan.scope.filesConsidered} files considered` : 'No folder access has been granted'}</small></section>

    {!scan ? <section className="empty-state">
      <div className="empty-icon">◎</div>
      <div><p className="kicker">ONE EXPLICIT PERMISSION</p><h2>Give Codex a bounded workspace view.</h2><p>We read only allowlisted config, package, instruction, and skill files. We never execute downloaded MCP code or return secrets, raw instructions, or full local paths.</p></div>
      <div className="empty-steps"><span><b>01</b> Connect a folder</span><span><b>02</b> Let Codex inspect</span><span><b>03</b> Approve exact fixes</span></div>
    </section> : <>
      <section className="readiness-row">
        <div className={'score-card ' + readinessClass(scan)}><div className="score-ring"><strong>{scan.readiness.value}</strong><small>/100</small></div><div><p className="kicker">READINESS GATE</p><h2>{scan.readiness.label === 'ready' ? 'Ready for the next run' : scan.readiness.label === 'needs-attention' ? 'Review before the next run' : 'Pause and harden first'}</h2><p>{scan.readiness.signals.join(' · ')}</p></div></div>
        <div className="scope-card"><p className="kicker">WHAT IS IN SCOPE</p><strong>{scan.scope.root}</strong><span>{scan.scope.mode === 'direct' ? 'Browser read/write' : scan.scope.mode === 'demo' ? 'Deterministic demo · in memory' : 'Browser read-only'} · {scan.sources.length} config source{scan.sources.length === 1 ? '' : 's'}</span><small>Codex sees sanitized metadata only.</small></div>
      </section>

      <section className="dashboard-heading"><div><p className="kicker">AGENT-READY INVENTORY</p><h2>{showPlan ? 'Supervised hardening' : 'What Codex can act on'}</h2></div><button className="plan-button" onClick={() => setShowPlan(!showPlan)}>{showPlan ? 'Back to inventory' : `Review hardening · ${plan?.items.length || 0}`}</button></section>

      {showPlan ? <section className="fix-plan">
        <div className="plan-intro"><strong>Every write is explicit.</strong><span>Only deterministic JSON duplicate cleanup can be applied. Commands, TOML, policy, and instruction changes remain manual.</span></div>
        {plan?.items.length ? plan.items.map((item) => <article key={item.id}><span className={item.canApply ? 'apply-label' : 'manual-label'}>{item.canApply ? 'BACKUP + REVIEW' : 'MANUAL REVIEW'}</span><b>{item.title}</b><p>{item.detail}</p>{item.canApply && <label className="fix-choice"><input type="checkbox" checked={selectedFixes.includes(item.id)} onChange={() => toggleFix(item.id)} /> Include this exact change</label>}</article>) : <div className="plan-empty">No hardening action proposed for this workspace.</div>}
        <div className="fix-plan-actions"><small>{getEnvironmentAccessMode() === 'direct' ? 'A sibling backup is written before each selected change.' : getEnvironmentAccessMode() === 'demo' ? 'Demo mode changes memory only; no disk file is touched.' : 'This embedded browser is read-only; use a direct-access browser to apply.'}</small><button disabled={!selectedFixes.length || busy || !['direct', 'demo'].includes(getEnvironmentAccessMode() || '')} onClick={() => void applyFixes()}>{getEnvironmentAccessMode() === 'demo' ? 'Apply demo change' : 'Back up & apply'} {selectedFixes.length || ''}</button></div>
      </section> : <section className="dashboard-grid">
        <div className="panel inventory-panel"><div className="panel-title"><strong>Declared MCP surface</strong><span>{scan.toolSurface.length}</span></div><p className="panel-note">Configured servers and package evidence. Static declarations are not live runtime proof.</p><div className="inventory">{scan.toolSurface.length ? scan.toolSurface.map((entry) => <article key={entry.id}><div><strong>{entry.name}</strong><small>{entry.kind.replace('-', ' ')} · {entry.confidence} confidence</small></div><div className="server-meta"><span>{entry.source}</span><small>{entry.target || entry.declaredIn}</small></div></article>) : <div className="all-clear"><b>No MCP signal found.</b><span>Connect a project with a Codex config or MCP package manifest.</span></div>}</div></div>
        <div className="panel findings-panel"><div className="panel-title"><strong>Readiness findings</strong><span>{issues}</span></div><div className="findings">{scan.findings.map((finding) => <article key={finding.id} className={finding.severity}><span>{finding.severity}</span><strong>{finding.title}</strong><p>{finding.detail}</p></article>)}</div></div>
        <div className="panel artifacts-panel"><div className="panel-title"><strong>Instruction chain &amp; evidence</strong><span>{scan.artifacts.length}</span></div><div className="artifact-list">{scan.artifacts.map((artifact) => <article key={artifact.id}><span>{artifact.kind.replace('-', ' ')}</span><strong>{artifact.label}</strong><small>{artifact.detail}</small></article>)}</div>{scan.instructionChain.length > 0 && <div className="instruction-chain"><p className="kicker">ORDERED GUIDANCE</p>{scan.instructionChain.map((item) => <span key={item.path}>{item.kind} · depth {item.depth}</span>)}</div>}</div>
      </section>}
    </>}

    <footer><strong>WebMCP-native.</strong> Codex and the user share the same visible state. No daemon, extension, Gemini key, or hidden full-disk access.</footer>
  </main>
}
