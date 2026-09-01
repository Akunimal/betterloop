import { useEffect, useState } from 'react'
import { applySupervisedFixes, buildFixPlan, getLatestScan, getMCPationMode, registerMCPationTools, startConsentSession, toolNames, type ScanResult } from './mcpation'
import './mcpation.css'

const tools = [
  ['Scan setup', 'Read the approved local inventory.'],
  ['Map environments', 'Compare which IDE is configured for each server.'],
  ['Check the host', 'See shell compatibility and quoting risk.'],
  ['Spot friction', 'Find gaps, broken commands, and blocked access.'],
  ['Check the details', 'See the source, transport, and command status.'],
  ['Review next steps', 'Get a plan. Nothing changes by itself.'],
]

export default function App() {
  const [scan, setScan] = useState<ScanResult | null>(getLatestScan())
  const [registered, setRegistered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Loading the tools for this page.')
  const [showFixPlan, setShowFixPlan] = useState(false)
  const [selectedFixes, setSelectedFixes] = useState<string[]>([])
  const mode = getMCPationMode()

  useEffect(() => {
    const refresh = (event: Event) => setScan((event as CustomEvent<ScanResult>).detail || getLatestScan())
    window.addEventListener('mcpation:scan', refresh)
    void registerMCPationTools().then(() => {
      setRegistered(true)
      setMessage('This page is ready for an agent to inspect the approved scan.')
    }).catch(() => setMessage('Waiting for a WebMCP-capable browser context.'))
    return () => window.removeEventListener('mcpation:scan', refresh)
  }, [])

  const scanNow = async () => {
    setBusy(true)
    try {
      const result = await startConsentSession()
      setScan(result)
      setMessage(`${result.servers.length} entries found in ${result.sources.length} local configuration source${result.sources.length === 1 ? '' : 's'}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not reach the local companion.')
    } finally {
      setBusy(false)
    }
  }
  const toggleFix = (id: string) => setSelectedFixes((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const applyFixes = async () => {
    if (!selectedFixes.length || !window.confirm(`Back up and apply ${selectedFixes.length} reviewed JSON change${selectedFixes.length === 1 ? '' : 's'}?`)) return
    setBusy(true)
    try {
      const result = await applySupervisedFixes(selectedFixes)
      setScan(result)
      setSelectedFixes([])
      setShowFixPlan(false)
      setMessage('The reviewed changes were applied after local backups were created.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not apply the reviewed changes.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="shell">
    <header className="topline">
      <div className="wordmark"><span className="mark">M</span><strong>MCPation</strong><span>LOCAL MCP MAP</span></div>
      <div className={'webmcp-state ' + (registered ? 'ready' : '')}><i />{registered ? 'Tools ready' : 'Loading tools'}</div>
    </header>

    <section className="hero">
      <div>
        <p className="kicker">MCP CONFIGURATION, WITHOUT THE GUESSWORK</p>
        <h1>Make every agent<br /><em>setup make sense.</em></h1>
        <p className="lede">See which MCPs each coding environment is configured to use. Catch access gaps, dead commands, and expensive setup friction before they send an agent in circles.</p>
      </div>
      <aside className="scan-box">
        <span className="scan-label">LOCAL COMPANION</span>
        <h2>{scan ? 'Your setup is mapped' : 'Map this machine'}</h2>
        <p>{scan ? `${scan.sources.length} configuration source${scan.sources.length === 1 ? '' : 's'} checked on ${scan.platform}. Only redacted metadata is shown.` : 'Run the companion once, then approve a short-lived local scan here.'}</p>
        <button onClick={() => void scanNow()} disabled={busy}>{busy ? 'Reading setup…' : scan ? 'Scan again' : 'Start local scan'} <b>→</b></button>
        <code>npm run companion</code>
      </aside>
    </section>

    <section className="status-strip">
      <div><small>WEBMCP</small><strong>{mode === 'native' ? 'Site tools registered' : 'Local bridge active'}</strong></div>
      <div><small>DATA</small><strong>Secrets stay local</strong></div>
      <div><small>DEFAULT</small><strong>Inspect, don’t change</strong></div>
      <div><small>TOOLS</small><strong>{toolNames.length} ways to inspect</strong></div>
    </section>

    <section className="agent-proof"><span className="pulse" /><div><strong>Built for the handoff between you and an agent.</strong><p>{message}</p></div>{scan && <small>{scan.host.operatingSystem} · {scan.host.gitBashInstalled ? 'Git Bash found' : 'No Git Bash detected'} · {scan.host.recommendedShell}</small>}</section>

    <div className="workbench">
      <section className="guide">
        <div><p className="kicker">WHAT THE AGENT CAN ASK</p><h2>One scan. Six clear answers.</h2></div>
        <div className="tool-grid">{tools.map(([title, detail], index) => <article key={title}><span>0{index + 1}</span><strong>{title}</strong><p>{detail}</p></article>)}</div>
      </section>

      <section className="results" aria-live="polite">
        <div className="results-heading">
          <div><p className="kicker">YOUR ENVIRONMENT MAP</p><h2>{scan ? `${scan.servers.length} MCP entries` : 'Waiting for a local scan'}</h2></div>
          {scan && <div className="result-actions"><small>{new Date(scan.scannedAt).toLocaleString()}</small><button className="fix-button" onClick={() => setShowFixPlan(!showFixPlan)}>{showFixPlan ? 'Back to map' : 'Review next steps'}</button></div>}
        </div>
        {!scan ? <div className="empty"><span>↗</span><p>Start the local companion, then select <b>Start local scan</b>. The agent can inspect the same redacted result through the page tools.</p></div>
          : showFixPlan ? <div className="fix-plan"><strong>Review before changing anything</strong>{buildFixPlan(scan).items.map((item) => <article key={item.id}><span>{item.canApply ? 'Backup first' : 'Manual decision'}</span><b>{item.title}</b><p>{item.detail}</p>{item.canApply && <label className="fix-choice"><input type="checkbox" checked={selectedFixes.includes(item.id)} onChange={() => toggleFix(item.id)} /> Include this backed-up change</label>}</article>)}<div className="fix-plan-actions"><small>The demo stops here. TOML, shell, policy, and command repairs always stay manual.</small><button disabled={!selectedFixes.length || busy} onClick={() => void applyFixes()}>Back up & apply {selectedFixes.length || ''}</button></div></div>
          : <div className="scan-results">
            <div className="environment-matrix">{scan.profiles.map((profile) => <article key={profile.name}><strong>{profile.name}</strong><span>{profile.configuredServers.length} configured</span><small>{profile.mcpAccess === 'none' ? 'MCP blocked' : profile.mcpAccess === 'unknown' ? 'Access unknown' : `Access: ${profile.mcpAccess}`}</small></article>)}</div>
            <div className="inventory">{scan.servers.map((server) => <article key={server.id}><div><strong>{server.name}</strong><small>{server.source} · {server.transport}</small></div><div className="server-meta"><span>{server.disabled ? 'Disabled' : server.available === false ? 'Unavailable' : 'Configured'}</span><small>{server.target}</small></div></article>)}</div>
            <div className="findings">{scan.findings.map((finding, index) => <article className={finding.severity} key={index}><span>{finding.severity}</span><strong>{finding.title}</strong><p>{finding.detail}</p></article>)}</div>
          </div>}
      </section>
    </div>
    <footer>MCPation never exposes environment variables, headers, tokens, full paths, or file contents. It maps the setup; you stay in control.</footer>
  </main>
}
