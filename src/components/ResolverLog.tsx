import React, { useState, useEffect } from 'react';

interface LogEntry {
  id: number;
  time: string;
  file: string;
  status: 'resolved' | 'error';
  detail?: string;
}

let logId = 0;

// Listen for resolver events from the WebMCP tool
function onResolverEvent(handler: (entry: LogEntry) => void) {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    handler({
      id: ++logId,
      time: new Date().toLocaleTimeString(),
      file: detail.file || '?',
      status: detail.status || 'resolved',
      detail: detail.detail
    });
  };
  window.addEventListener('magic-picker:resolve', listener);
  return () => window.removeEventListener('magic-picker:resolve', listener);
}

export const ResolverLog: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    return onResolverEvent((entry) => {
      setEntries(prev => [entry, ...prev].slice(0, 20));
    });
  }, []);

  if (entries.length === 0) {
    return (
      <div className="log-panel">
        <h3 className="log-title">Resolver log</h3>
        <p className="log-empty">No files resolved yet. Agent requests will appear here.</p>
      </div>
    );
  }

  return (
    <div className="log-panel">
      <h3 className="log-title">Resolver log</h3>
      <div className="log-entries">
        {entries.map(entry => (
          <div key={entry.id} className={`log-entry log-${entry.status}`}>
            <span className="log-time">{entry.time}</span>
            <span className="log-file">{entry.file}</span>
            <span className="log-status">{entry.status === 'resolved' ? '✓' : '✗'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
