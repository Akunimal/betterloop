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

  const live = activation.status === 'active' && (activation.extensionDetected || activation.runtimeDetected);

  return (
    <div className={`bridge-card ${live ? 'bridge-card-ready' : ''}`}>
      <div className="bridge-card-topline">
        <span className="bridge-dot" />
        <strong>Browser handoff bridge</strong>
        <span className="bridge-badge">{live ? (activation.runtimeDetected ? 'Codex live' : 'extension live') : connected ? 'detected' : 'dormant'}</span>
      </div>
      <p>
        {live
          ? activation.runtimeDetected
            ? 'The Codex CDP runtime is active in this browser session and can prepare an exact file in another tab. Normal picker clicks remain untouched.'
            : 'The extension is active for this session and can route an exact file request to another tab. Normal picker clicks remain untouched.'
          : connected
          ? 'The extension is installed but dormant. Click Activate MagicPicker above to start the temporary browser session.'
          : 'The extension is optional for the public WebMCP demo. Cross-tab uploads require it to be loaded in the same Chromium session.'}
      </p>
    </div>
  );
};
