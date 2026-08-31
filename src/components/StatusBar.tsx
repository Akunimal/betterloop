import React, { useState, useEffect } from 'react';
import { isMagicPickerRegistered, getRegistrationMode } from '../webmcp/magicPickerTool';

export const StatusBar: React.FC = () => {
  const [toolRegistered, setToolRegistered] = useState(false);
  const [mode, setMode] = useState('none');

  useEffect(() => {
    const updateStatus = () => {
      setToolRegistered(isMagicPickerRegistered());
      setMode(getRegistrationMode());
    };

    updateStatus();
    window.addEventListener('magic-picker:registered', updateStatus);
    return () => window.removeEventListener('magic-picker:registered', updateStatus);
  }, []);

  const modeLabel = mode === 'native'
    ? 'WebMCP native (cross-tab)'
    : mode === 'polyfill'
    ? 'polyfill (same-tab only)'
    : 'not registered';

  return (
    <div className="status-bar" aria-label="WebMCP status">
      <div>Tool: <strong>{toolRegistered ? 'registered' : 'pending'}</strong></div>
      <div>WebMCP: <strong>{modeLabel}</strong></div>
      {mode === 'none' && (
        <span className="status-mode">enable in chrome://flags/#web-mcp</span>
      )}
    </div>
  );
};
