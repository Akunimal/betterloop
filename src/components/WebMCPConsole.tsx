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
      const modelContext = (document as any).modelContext || (window as any).modelContext;

      if (!modelContext) {
        setOutput(prev => [...prev, '❌ WebMCP not available']);
        return;
      }

      if (command.action === 'list') {
        if (modelContext.listTools) {
          const tools = modelContext.listTools();
          setOutput(prev => [...prev, `Available tools: ${tools.join(', ')}`]);
        } else if (modelContext.getTools) {
          const tools = await modelContext.getTools();
          setOutput(prev => [...prev, `Available tools: ${tools.map((tool: { name?: string }) => tool.name || 'unnamed').join(', ')}`]);
        } else {
          setOutput(prev => [...prev, 'Tool discovery is managed by the browser in native WebMCP mode.']);
        }
      } else if (command.action === 'invoke' && command.tool) {
        if (!modelContext.invokeTool) {
          setOutput(prev => [...prev, 'Direct invocation is available in the local polyfill preview. Use the browser WebMCP inspector for native mode.']);
        } else {
          const result = await modelContext.invokeTool(command.tool, command.input || {});
          setOutput(prev => [...prev, JSON.stringify(result, null, 2)]);
        }
      } else {
        setOutput(prev => [...prev, '❌ Unknown command. Try: {"action": "list"} or {"action": "invoke", "tool": "magic_picker", "input": {...}}']);
      }
    } catch (error) {
      setOutput(prev => [...prev, `❌ Error: ${String(error)}`]);
    }
  };

  return (
    <section className="console-panel" aria-labelledby="console-title">
      <div className="panel-heading">
        <span className="panel-icon" aria-hidden="true">02</span>
        <div>
          <p className="panel-kicker">WebMCP test</p>
          <h2 id="console-title">WebMCP console</h2>
        </div>
      </div>
      <p className="panel-description">
        Inspect the registered tool or invoke it directly in the local preview. Example commands:
      </p>
      <ul className="console-examples">
        <li><code>{'{"action":"list"}'}</code></li>
        <li><code>{'{"action":"invoke","tool":"magic_picker","input":{"accept":"image/*"}}'}</code></li>
      </ul>

      <div className="console-output" aria-live="polite" aria-label="Console output">
        {output.length === 0 && <span className="console-placeholder">No commands yet. Start with list.</span>}
        {output.map((line, i) => (
          <p className="console-line" key={i}>{line}</p>
        ))}
      </div>

      <form className="console-form" onSubmit={(event) => { event.preventDefault(); void executeCommand(); }}>
        <input
          className="console-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command…"
          aria-label="WebMCP console command"
        />
        <button className="console-run" type="submit">
          Run
        </button>
      </form>
    </section>
  );
};
