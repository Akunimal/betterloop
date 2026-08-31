import React, { useEffect, useState } from 'react';
import { getActivationSnapshot, subscribeActivation, type ActivationSnapshot } from '../state/activation';

export const BridgeStatus: React.FC = () => {
  const [connected, setConnected] = useState(getActivationSnapshot().extensionDetected);
  const [activation, setActivation] = useState<ActivationSnapshot>(getActivationSnapshot());

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.source !== 'magic-picker-content' || event.data.type !== 'bridge-status') return;
      setConnected(event.data.connected === true);
    };
    window.addEventListener('message', onMessage);
    const unsubscribe = subscribeActivation(setActivation);
    return () => {
      window.removeEventListener('message', onMessage);
      unsubscribe();
    };
  }, []);

  const live = activation.status === 'active' && activation.extensionDetected;

  return (
    <div className={`bridge-card ${live ? 'bridge-card-ready' : ''}`}>
      <div className="bridge-card-topline">
        <span className="bridge-dot" />
        <strong>Local browser bridge</strong>
        <span className="bridge-badge">{live ? 'active' : connected ? 'detected' : 'dormant'}</span>
      </div>
      <p>
        {live
          ? 'The extension is active for this session and can route an exact file request to another tab. Normal picker clicks remain untouched.'
          : connected
          ? 'The extension is installed but dormant. Click Activate MagicPicker above to start the temporary browser session.'
          : 'The extension is optional for the public WebMCP demo. Cross-tab uploads require it to be loaded in the same Chromium session.'}
      </p>
    </div>
  );
};
