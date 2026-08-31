import { StatusBar } from './components/StatusBar';
import { DirectorySetup } from './components/DirectorySetup';
import { ResolverLog } from './components/ResolverLog';
import './styles.css';

function App() {
  return (
    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="page-wrap">
        <header className="site-header">
          <a className="brand" href="/" aria-label="Magic Picker home">
            <span className="brand-mark" aria-hidden="true">✦</span>
            <span>Magic Picker</span>
          </a>
          <nav className="site-nav" aria-label="Primary navigation">
            <a href="#how-it-works">How it works</a>
            <a className="nav-source" href="https://github.com/Akunimal/magicpicker" target="_blank" rel="noreferrer">
              View source <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </header>

        <main>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <p className="eyebrow"><span className="eyebrow-dot" /> WebMCP file resolver</p>
              <h1 id="hero-title">No more picker interrupts. Files resolve themselves.</h1>
              <p className="hero-lede">
                When a browser AI agent needs a file, Magic Picker resolves it automatically
                from your project directory. No modal. No flow break. Just the data, ready to use.
              </p>
              <div className="hero-proof" aria-label="Product properties">
                <span><span aria-hidden="true">✓</span> Zero interruption</span>
                <span><span aria-hidden="true">✓</span> Auto-resolve</span>
                <span><span aria-hidden="true">✓</span> WebMCP native</span>
              </div>
            </div>

            <div className="hero-visual" aria-label="Illustration of auto-resolution">
              <div className="visual-glow" aria-hidden="true" />
              <div className="agent-card">
                <div className="window-bar">
                  <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
                  <span>agent session</span>
                  <span className="window-status">connected</span>
                </div>
                <div className="agent-message">
                  <span className="message-label">AI AGENT</span>
                  <p>I need the file src/App.tsx to continue.</p>
                  <div className="tool-call">
                    <span className="tool-icon" aria-hidden="true">✦</span>
                    <span><strong>magic_picker</strong><small>auto-resolve · src/App.tsx</small></span>
                    <span className="tool-arrow" aria-hidden="true">→</span>
                  </div>
                </div>
                <div className="human-message">
                  <div className="human-avatar" aria-hidden="true">⚡</div>
                  <div>
                    <span className="message-label">RESOLVED</span>
                    <p>File found and returned automatically.</p>
                  </div>
                  <span className="check-badge" aria-hidden="true">✓</span>
                </div>
              </div>
              <div className="floating-token token-one" aria-hidden="true">no picker needed</div>
              <div className="floating-token token-two" aria-hidden="true">instant resolution</div>
            </div>
          </section>

          <section className="signal-strip" aria-label="Magic Picker highlights">
            <div><span className="signal-icon" aria-hidden="true">01</span><span><strong>Smart resolve</strong><small>Path detection + search</small></span></div>
            <div><span className="signal-icon" aria-hidden="true">02</span><span><strong>Persistent access</strong><small>One-time directory grant</small></span></div>
            <div><span className="signal-icon" aria-hidden="true">03</span><span><strong>WebMCP native</strong><small>Cross-tab routing</small></span></div>
          </section>

          <section className="content-section" id="how-it-works" aria-labelledby="how-title">
            <div className="section-heading">
              <p className="section-kicker">The interaction</p>
              <h2 id="how-title">Files resolve while the agent keeps moving.</h2>
              <p>Magic Picker uses the File System Access API to maintain a persistent connection to your project directory. When an agent requests a file, it searches and reads automatically — no human intervention required.</p>
            </div>
            <div className="steps-grid">
              <article className="step-card">
                <span className="step-index">01</span>
                <h3>Grant once</h3>
                <p>Select your project directory once. Magic Picker remembers the permission via IndexedDB.</p>
              </article>
              <article className="step-card step-card-highlight">
                <span className="step-index">02</span>
                <h3>Agent requests</h3>
                <p>The agent calls <code>magic_picker</code> with a file type or path hint. No modal appears.</p>
              </article>
              <article className="step-card">
                <span className="step-index">03</span>
                <h3>Auto-resolve</h3>
                <p>Magic Picker finds the file in your directory tree and returns metadata plus data instantly.</p>
              </article>
            </div>
          </section>

          <section className="demo-section" id="demo" aria-labelledby="demo-title">
            <div className="section-heading demo-heading">
              <p className="section-kicker">Setup</p>
              <h2 id="demo-title">Connect your project directory.</h2>
              <p>Once connected, any WebMCP-enabled agent in any tab can resolve files from your project.</p>
            </div>
            <DirectorySetup />
            <ResolverLog />
          </section>

          <section className="final-cta" aria-labelledby="cta-title">
            <div>
              <p className="section-kicker">WebMCP Challenge 2026</p>
              <h2 id="cta-title">A file resolver, not a file picker.</h2>
            </div>
            <div className="cta-copy">
              <p>Magic Picker removes the friction from agent file handoffs. The agent asks, the resolver answers, and the workflow never stops.</p>
              <a className="text-link" href="https://github.com/Akunimal/magicpicker" target="_blank" rel="noreferrer">Read the source <span aria-hidden="true">↗</span></a>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <span><span className="footer-mark" aria-hidden="true">✦</span> Magic Picker</span>
          <span>WebMCP Challenge · 2026</span>
        </footer>
      </div>

      <StatusBar />
    </div>
  );
}

export default App;
