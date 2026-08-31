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
          <p className="dir-hint">Agent passes file path → MagicPicker resolves automatically</p>
        </>
      ) : (
        <>
          <h3>Connect your project directory</h3>
          <p>One-time grant. After this, every agent call resolves files automatically.</p>
          <button className="dir-btn" onClick={handleConnect}>
            📁 Select project directory
          </button>
        </>
      )}
    </div>
  );
};
