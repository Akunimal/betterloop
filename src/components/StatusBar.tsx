import React, { useState, useEffect } from 'react';
import { isMagicPickerRegistered } from '../webmcp/magicPickerTool';

export const StatusBar: React.FC = () => {
  const [webmcpAvailable, setWebmcpAvailable] = useState(false);
  const [toolRegistered, setToolRegistered] = useState(false);
  const [isPolyfill, setIsPolyfill] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const modelContext = (document as Document & { modelContext?: { __magicPickerPolyfill?: boolean } }).modelContext
        || (window as Window & { modelContext?: { __magicPickerPolyfill?: boolean } }).modelContext;
      setWebmcpAvailable(Boolean(modelContext));
      setToolRegistered(isMagicPickerRegistered());
      setIsPolyfill(Boolean(modelContext?.__magicPickerPolyfill));
    };

    updateStatus();
    window.addEventListener('magic-picker:registered', updateStatus);
    return () => window.removeEventListener('magic-picker:registered', updateStatus);
  }, []);

  return (
    <div className="status-bar" aria-label="WebMCP status">
      <div>WebMCP: <strong>{webmcpAvailable ? 'ready' : 'unavailable'}</strong></div>
      <div>Tool: <strong>{toolRegistered ? 'registered' : 'pending'}</strong></div>
      <span className="status-mode">{isPolyfill ? 'local polyfill preview' : 'native browser API'}</span>
    </div>
  );
};
