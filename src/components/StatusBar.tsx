import React, { useState, useEffect } from 'react';
import { isMagicPickerRegistered, getRegistrationMode, getDetectedPlatform } from '../webmcp/magicPickerTool';

export const StatusBar: React.FC = () => {
  const [toolRegistered, setToolRegistered] = useState(false);
  const [mode, setMode] = useState('none');
  const [platform, setPlatform] = useState('unknown');

  useEffect(() => {
    const updateStatus = () => {
      setToolRegistered(isMagicPickerRegistered());
      setMode(getRegistrationMode());
      setPlatform(getDetectedPlatform());
    };

    updateStatus();
    window.addEventListener('magic-picker:registered', updateStatus);
    return () => window.removeEventListener('magic-picker:registered', updateStatus);
  }, []);

  const modeLabel = mode === 'native'
    ? 'WebMCP active'
    : mode === 'polyfill'
    ? 'polyfill (testing)'
    : 'waiting';

  return (
    <div className="status-bar" aria-label="WebMCP status">
      <div className="status-row">
        <span className="status-label">Tool</span>
        <strong>{toolRegistered ? 'registered' : 'pending'}</strong>
      </div>
      <div className="status-row">
        <span className="status-label">Platform</span>
        <strong>{platform}</strong>
      </div>
      <div className="status-row">
        <span className="status-label">WebMCP</span>
        <strong className={mode === 'native' ? 'status-green' : ''}>{modeLabel}</strong>
      </div>
      {mode === 'none' && (
        <a
          className="status-hint"
          href="https://chatgpt.com"
          target="_blank"
          rel="noreferrer"
        >
          Open in ChatGPT browser →
        </a>
      )}
    </div>
  );
};
