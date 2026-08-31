import { MagicPickerModal } from './components/MagicPickerModal';
import { StatusBar } from './components/StatusBar';
import { TestPanel } from './components/TestPanel';
import { WebMCPConsole } from './components/WebMCPConsole';
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
            <a href="#demo">Live demo</a>
            <a className="nav-source" href="https://github.com/Akunimal/magicpicker" target="_blank" rel="noreferrer">
              View source <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </header>

        <main>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <p className="eyebrow"><span className="eyebrow-dot" /> WebMCP human handoff</p>
              <h1 id="hero-title">Keep the agent moving when a person needs to step in.</h1>
              <p className="hero-lede">
                Magic Picker gives browser agents a structured way to request a file without asking the agent
                to operate a native OS dialog. The agent asks. You choose. The tool continues.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#demo">Try the live demo <span aria-hidden="true">↓</span></a>
                <a className="button button-secondary" href="/agent-demo.html">Agent quickstart <span aria-hidden="true">↗</span></a>
              </div>
              <div className="hero-proof" aria-label="Product properties">
                <span><span aria-hidden="true">✓</span> Page-owned UI</span>
                <span><span aria-hidden="true">✓</span> Human in control</span>
                <span><span aria-hidden="true">✓</span> Abort-safe flow</span>
              </div>
            </div>

            <div className="hero-visual" aria-label="Illustration of an agent requesting a file">
              <div className="visual-glow" aria-hidden="true" />
              <div className="agent-card">
                <div className="window-bar">
                  <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
                  <span>agent session</span>
                  <span className="window-status">connected</span>
                </div>
                <div className="agent-message">
                  <span className="message-label">AI AGENT</span>
                  <p>I need an image to continue.</p>
                  <div className="tool-call">
                    <span className="tool-icon" aria-hidden="true">✦</span>
                    <span><strong>magic_picker</strong><small>human handoff · image/*</small></span>
                    <span className="tool-arrow" aria-hidden="true">→</span>
                  </div>
                </div>
                <div className="human-message">
                  <div className="human-avatar" aria-hidden="true">✋</div>
                  <div>
                    <span className="message-label">YOUR TURN</span>
                    <p>Choose a file in the page UI.</p>
                  </div>
                  <span className="check-badge" aria-hidden="true">✓</span>
                </div>
              </div>
              <div className="floating-token token-one" aria-hidden="true">file → data</div>
              <div className="floating-token token-two" aria-hidden="true">human in control</div>
            </div>
          </section>

          <section className="signal-strip" aria-label="Magic Picker highlights">
            <div><span className="signal-icon" aria-hidden="true">01</span><span><strong>One focused tool</strong><small>Small API, clear intent</small></span></div>
            <div><span className="signal-icon" aria-hidden="true">02</span><span><strong>Human handoff</strong><small>The user owns the decision</small></span></div>
            <div><span className="signal-icon" aria-hidden="true">03</span><span><strong>Agent-ready output</strong><small>Metadata plus file data</small></span></div>
          </section>

          <section className="content-section" id="how-it-works" aria-labelledby="how-title">
            <div className="section-heading">
              <p className="section-kicker">The interaction</p>
              <h2 id="how-title">A small handoff for a real browser boundary.</h2>
              <p>Native file dialogs belong to the operating system. WebMCP gives the agent a structured entry point, and Magic Picker provides a visible, user-controlled handoff inside the page.</p>
            </div>
            <div className="steps-grid">
              <article className="step-card">
                <span className="step-index">01</span>
                <h3>Agent requests</h3>
                <p>The agent calls <code>magic_picker</code> with the file type, size limit, and a human-readable prompt.</p>
              </article>
              <article className="step-card step-card-highlight">
                <span className="step-index">02</span>
                <h3>Human chooses</h3>
                <p>A lightweight web modal handles drag-and-drop or selection while the person stays in control of the file.</p>
              </article>
              <article className="step-card">
                <span className="step-index">03</span>
                <h3>Tool returns</h3>
                <p>Files are processed in the browser and returned with name, type, size, and base64 data for the next step.</p>
              </article>
            </div>
          </section>

          <section className="demo-section" id="demo" aria-labelledby="demo-title">
            <div className="section-heading demo-heading">
              <p className="section-kicker">Try it yourself</p>
              <h2 id="demo-title">The tool is waiting for your request.</h2>
              <p>Use the guided test to see the user handoff, or call the local WebMCP polyfill directly from the console.</p>
            </div>
            <div className="demo-grid">
              <TestPanel />
              <WebMCPConsole />
            </div>
          </section>

          <section className="scope-note" aria-labelledby="scope-title">
            <div className="scope-note-mark" aria-hidden="true">↳</div>
            <div>
              <p className="section-kicker">The honest boundary</p>
              <h2 id="scope-title">Built for page-owned handoffs first.</h2>
              <p>Magic Picker handles the interaction this page owns: asking a person for a file. Native OS dialogs, Google OAuth popups, and terminal prompts belong to the host or CLI and need host-level integration rather than a Vercel page pretending to intercept them.</p>
            </div>
          </section>

          <section className="final-cta" aria-labelledby="cta-title">
            <div>
              <p className="section-kicker">Built for the agent-native web</p>
              <h2 id="cta-title">A better request than “open the file picker.”</h2>
            </div>
            <div className="cta-copy">
              <p>Explore the implementation, run the demo, and see how one small WebMCP surface can make a human handoff feel natural.</p>
              <a className="text-link" href="https://github.com/Akunimal/magicpicker" target="_blank" rel="noreferrer">Read the source <span aria-hidden="true">↗</span></a>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <span><span className="footer-mark" aria-hidden="true">✦</span> Magic Picker</span>
          <span>WebMCP Challenge · 2026</span>
          <a href="/agent-demo.html">Agent demo ↗</a>
        </footer>
      </div>

      <MagicPickerModal />
      <StatusBar />
    </div>
  );
}

export default App;
