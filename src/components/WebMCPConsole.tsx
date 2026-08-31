import React, { useState } from 'react';

export const WebMCPConsole: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);

  const executeCommand = async () => {
    if (!input.trim()) return;

    setOutput(prev => [...prev, `> ${input}`]);
    setInput('');

    try {
      const command = JSON.parse(input);
      const modelContext = (window as any).modelContext;

      if (!modelContext) {
        setOutput(prev => [...prev, '❌ WebMCP not available']);
        return;
      }

      if (command.action === 'list') {
        const tools = modelContext.listTools ? modelContext.listTools() : [];
        setOutput(prev => [...prev, `Available tools: ${tools.join(', ')}`]);
      } else if (command.action === 'invoke' && command.tool) {
        const result = await modelContext.invokeTool(command.tool, command.input || {});
        setOutput(prev => [...prev, JSON.stringify(result, null, 2)]);
      } else {
        setOutput(prev => [...prev, '❌ Unknown command. Try: {"action": "list"} or {"action": "invoke", "tool": "magic_picker", "input": {...}}']);
      }
    } catch (error) {
      setOutput(prev => [...prev, `❌ Error: ${String(error)}`]);
    }
  };

  return (
    <div style={{
      backgroundColor: '#1F2937',
      borderRadius: '12px',
      padding: '24px',
      color: 'white',
      fontFamily: 'monospace',
      marginTop: '24px'
    }}>
      <h2 style={{ marginTop: 0, fontSize: '18px' }}>🔧 WebMCP Console</h2>
      <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
        Test the magic_picker tool directly. Example commands:
      </p>
      <ul style={{ color: '#9CA3AF', fontSize: '14px' }}>
        <li>{'{"action": "list"}'}</li>
        <li>{'{"action": "invoke", "tool": "magic_picker", "input": {"accept": "image/*", "prompt": "Select a test image"}}'}</li>
      </ul>

      <div style={{
        backgroundColor: '#111827',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px',
        minHeight: '100px',
        maxHeight: '200px',
        overflow: 'auto',
        fontSize: '12px'
      }}>
        {output.map((line, i) => (
          <div key={i} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>{line}</div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
          placeholder='Enter command...'
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #374151',
            backgroundColor: '#111827',
            color: 'white',
            fontSize: '12px'
          }}
        />
        <button
          onClick={executeCommand}
          style={{
            backgroundColor: '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Run
        </button>
      </div>
    </div>
  );
};
