import { StatusBar } from './components/StatusBar';
import { DirectorySetup } from './components/DirectorySetup';
import { ResolverLog } from './components/ResolverLog';
import './styles.css';

function App() {
  return (
    <div className="app">
      <header>
        <div className="topbar">
          <span className="logo"><span className="logo-icon">✦</span> MagicPicker</span>
          <div className="topbar-links">
            <a href="https://github.com/Akunimal/magicpicker" target="_blank" rel="noreferrer">Source ↗</a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">WebMCP file resolver</div>
          <h1>Files resolve themselves.<br /><span className="hero-dim">No picker. No modal. No break.</span></h1>
          <p className="hero-sub">
            When a browser AI agent needs a file, MagicPicker resolves it automatically
            from your project directory — zero interruption to the workflow.
          </p>
          <div className="hero-steps">
            <div className="hero-step">
              <span className="step-num">1</span>
              <span>Connect directory</span>
            </div>
            <div className="hero-arrow">→</div>
            <div className="hero-step">
              <span className="step-num">2</span>
              <span>Agent calls magic_picker</span>
            </div>
            <div className="hero-arrow">→</div>
            <div className="hero-step">
              <span className="step-num">3</span>
              <span>File resolved automatically</span>
            </div>
          </div>
        </section>

        {/* Demo: Connect + Activity */}
        <section className="demo">
          <DirectorySetup />
          <ResolverLog />
        </section>

        {/* How it works — compact */}
        <section className="how">
          <h2>How it works</h2>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-icon">📡</div>
              <h3>WebMCP auto-discovery</h3>
              <p>MagicPicker registers a <code>magic_picker</code> tool via WebMCP.
                Any agent in the browser discovers it automatically — no install needed.</p>
            </div>
            <div className="how-card">
              <div className="how-icon">📁</div>
              <h3>File System Access API</h3>
              <p>You grant access once. MagicPicker reads from your project directory
                using persistent browser permissions — no repeated prompts.</p>
            </div>
            <div className="how-card">
              <div className="how-icon">🔍</div>
              <h3>Smart resolution</h3>
              <p>Path detection, directory search, pattern matching — the agent asks,
                the resolver answers. No native OS dialog ever opens.</p>
            </div>
          </div>
        </section>

        {/* Extension — optional */}
        <section className="extension">
          <div className="ext-card">
            <div className="ext-left">
              <h2>Chrome Extension <span className="ext-optional">optional</span></h2>
              <p>
                MagicPicker works natively on <strong>WebMCP-enabled sites</strong>.
                For sites that don't support WebMCP yet (like LinkedIn, GitHub, etc.),
                the extension intercepts <code>&lt;input type="file"&gt;</code> on any page
                and resolves files from your connected directory.
              </p>
              <div className="ext-features">
                <span>✓ Intercepts any file input</span>
                <span>✓ No native picker</span>
                <span>✓ Shares directory with webapp</span>
              </div>
            </div>
            <div className="ext-right">
              <a className="ext-download" href="/extension.zip" download>
                Download extension
                <span className="ext-dl-hint">Load unpacked in Chrome</span>
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <span>✦ MagicPicker</span>
          <span>WebMCP Challenge 2026</span>
        </footer>
      </main>

      <StatusBar />
    </div>
  );
}

export default App;
