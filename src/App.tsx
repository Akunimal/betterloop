import { StatusBar } from './components/StatusBar';
import { DirectorySetup } from './components/DirectorySetup';
import { ResolverLog } from './components/ResolverLog';
import './styles.css';

function App() {
  return (
    <div className="app">
      <header>
        <span className="logo"><span className="logo-icon">✦</span> MagicPicker</span>
        <span className="tagline">WebMCP file resolver</span>
      </header>

      <main>
        <DirectorySetup />
        <ResolverLog />
      </main>

      <StatusBar />
    </div>
  );
}

export default App;
