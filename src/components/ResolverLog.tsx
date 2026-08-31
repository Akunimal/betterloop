import React, { useState, useEffect, useCallback } from 'react';

interface LogEntry {
  id: number;
  time: string;
  file: string;
  path?: string;
  status: 'resolved' | 'error' | 'resolving';
  size?: string;
  type?: string;
  detail?: string;
}

let logId = 0;

function onResolverEvent(handler: (entry: LogEntry) => void) {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    handler({
      id: ++logId,
      time: new Date().toLocaleTimeString(),
      file: detail.file || '?',
      path: detail.path,
      status: detail.status || 'resolved',
      size: detail.size,
      type: detail.type,
      detail: detail.detail
    });
  };
  window.addEventListener('magic-picker:resolve', listener);
  return () => window.removeEventListener('magic-picker:resolve', listener);
}

export const ResolverLog: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [toast, setToast] = useState<LogEntry | null>(null);

  const addEntry = useCallback((entry: LogEntry) => {
    setEntries(prev => [entry, ...prev].slice(0, 30));
    if (entry.status === 'resolved' || entry.status === 'error') {
      setToast(entry);
      setTimeout(() => setToast(null), 4000);
    }
  }, []);

  useEffect(() => {
    return onResolverEvent(addEntry);
  }, [addEntry]);

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className={`toast toast-${toast.status}`} key={toast.id}>
          <span className="toast-icon">{toast.status === 'resolved' ? '⚡' : '✗'}</span>
          <span className="toast-text">
            {toast.status === 'resolved'
              ? `Resolved: ${toast.file}`
              : `Failed: ${toast.detail || 'not found'}`
            }
          </span>
        </div>
      )}

      {/* Activity feed */}
      <div className="log-panel">
        <div className="log-header">
          <h3 className="log-title">Activity feed</h3>
          <span className="log-count">{entries.length} events</span>
        </div>

        {entries.length === 0 ? (
          <div className="log-empty-state">
            <div className="log-empty-icon">✦</div>
            <p>Waiting for agent requests...</p>
            <p className="log-empty-hint">When an agent calls magic_picker, activity appears here</p>
          </div>
        ) : (
          <div className="log-entries">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`log-entry log-${entry.status} ${i === 0 ? 'log-entry-new' : ''}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="log-entry-left">
                  <span className={`log-dot log-dot-${entry.status}`} />
                  <div className="log-entry-info">
                    <span className="log-file">{entry.file}</span>
                    {entry.path && entry.path !== entry.file && (
                      <span className="log-path">{entry.path}</span>
                    )}
                  </div>
                </div>
                <div className="log-entry-right">
                  {entry.size && <span className="log-size">{entry.size}</span>}
                  {entry.type && <span className="log-type">{entry.type}</span>}
                  <span className="log-time">{entry.time}</span>
                  <span className={`log-badge log-badge-${entry.status}`}>
                    {entry.status === 'resolved' ? '✓' : entry.status === 'resolving' ? '...' : '✗'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
