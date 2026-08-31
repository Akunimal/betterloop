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
      <h3>Project directory</h3>
      <p>Connect once. Agents resolve files from here automatically.</p>

      {loading ? (
        <p style={{ color: '#505a70', fontSize: 13 }}>Checking permissions...</p>
      ) : connected ? (
        <>
          <div className="dir-connected">
            <span className="dir-connected-icon">✓</span>
            <span className="dir-connected-name">{dirName}</span>
            <span className="dir-connected-badge">active</span>
          </div>
          <button className="dir-btn" onClick={handleConnect} style={{ marginTop: 12 }}>
            Change directory
          </button>
        </>
      ) : (
        <button className="dir-btn" onClick={handleConnect}>
          📁 Select project directory
        </button>
      )}
    </div>
  );
};
