import React, { useState, useEffect } from 'react';
import { selectDirectory, hasDirectoryPermission, getDirectoryName, initResolver } from '../state/fileResolver';

export const DirectorySetup: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [dirName, setDirName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initResolver().then(() => {
      setConnected(hasDirectoryPermission());
      setDirName(getDirectoryName());
      setLoading(false);
    });
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    const ok = await selectDirectory();
    setConnected(ok);
    setDirName(getDirectoryName());
    setLoading(false);
  };

  return (
    <div className="dir-card">
      {loading ? (
        <p className="dir-status">Checking permissions...</p>
      ) : connected ? (
        <>
          <div className="dir-connected">
            <span className="dir-connected-icon">⚡</span>
            <span className="dir-connected-name">{dirName}</span>
            <span className="dir-connected-badge">ready</span>
          </div>
          <p className="dir-hint">Optional FSA fallback ready → agent passes the exact path</p>
        </>
      ) : (
        <>
          <h3>Optional: connect a project directory</h3>
          <p>Useful for the browser-only demo when no local gateway is available. The bridge can otherwise use the exact path supplied by Codex.</p>
          <button className="dir-btn" onClick={handleConnect}>
            📁 Connect directory (optional)
          </button>
        </>
      )}
    </div>
  );
};
