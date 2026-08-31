import React, { useState, useEffect } from 'react';

export const StatusBar: React.FC = () => {
  const [webmcpAvailable, setWebmcpAvailable] = useState(false);
  const [toolRegistered, setToolRegistered] = useState(false);

  useEffect(() => {
    const hasWebMCP = !!(window as any).modelContext;
    setWebmcpAvailable(hasWebMCP);

    if (hasWebMCP) {
      setToolRegistered(true);
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#1F2937',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 999
    }}>
      <div>WebMCP: {webmcpAvailable ? '✅ Available' : '❌ Not Available'}</div>
      <div>Tool: {toolRegistered ? '✅ Registered' : '❌ Not Registered'}</div>
    </div>
  );
};
