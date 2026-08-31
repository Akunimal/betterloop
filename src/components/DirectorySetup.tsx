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

  if (loading) {
    return (
      <div className="setup-panel">
        <div className="setup-status">Checking permissions...</div>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="setup-panel setup-connected">
        <div className="setup-icon">✓</div>
        <div className="setup-info">
          <h3>Connected</h3>
          <p className="setup-dir">{dirName}</p>
          <p className="setup-hint">Agents can resolve files from this directory</p>
        </div>
        <button className="button button-secondary" onClick={handleConnect}>
          Change directory
        </button>
      </div>
    );
  }

  return (
    <div className="setup-panel setup-disconnected">
      <div className="setup-icon">📁</div>
      <div className="setup-info">
        <h3>No directory connected</h3>
        <p className="setup-hint">Select your project directory to enable auto-resolution</p>
      </div>
      <button className="button button-primary" onClick={handleConnect}>
        Select project directory
      </button>
    </div>
  );
};
