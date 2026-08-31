import React, { useEffect } from 'react';
import { MagicPickerModal } from './components/MagicPickerModal';
import { StatusBar } from './components/StatusBar';
import { TestPanel } from './components/TestPanel';
import { WebMCPConsole } from './components/WebMCPConsole';
import { registerMagicPickerTool } from './webmcp/magicPickerTool';

function App() {
  useEffect(() => {
    registerMagicPickerTool();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '48px', margin: '0 0 16px 0', color: '#1F2937' }}>
            🪄 Magic Picker
          </h1>
          <p style={{ fontSize: '18px', color: '#6B7280', margin: 0 }}>
            WebMCP tool that lets AI agents request files without native OS dialogs
          </p>
        </header>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          marginBottom: '24px'
        }}>
          <h2 style={{ marginTop: 0, color: '#1F2937' }}>How it works</h2>
          <ol style={{ color: '#4B5563', lineHeight: '1.6' }}>
            <li><strong>AI Agent</strong> invokes the <code>magic_picker</code> WebMCP tool</li>
            <li><strong>Magic Picker</strong> shows this web UI to the user</li>
            <li><strong>User</strong> selects a file via drag & drop or click</li>
            <li><strong>Tool</strong> converts the file to base64 and returns it to the agent</li>
          </ol>
        </div>

        <TestPanel />

        <div style={{
          backgroundColor: '#EEF2FF',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #C7D2FE'
        }}>
          <h2 style={{ marginTop: 0, color: '#4338CA' }}>Try it out</h2>
          <p style={{ color: '#4B5563' }}>
            Open this page in ChatGPT's built-in browser or Chrome 149+ with WebMCP enabled, then ask:
          </p>
          <code style={{
            display: 'block',
            backgroundColor: '#1F2937',
            color: '#F9FAFB',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            marginTop: '12px'
          }}>
            "Use magic_picker to ask me for an image file"
          </code>
        </div>

        <WebMCPConsole />
      </div>

      <MagicPickerModal />
      <StatusBar />
    </div>
  );
}

export default App;
