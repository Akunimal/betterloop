import React, { useEffect, useState } from 'react';
import {
  activateMagicPicker,
  deactivateMagicPicker,
  getActivationSnapshot,
  subscribeActivation,
  type ActivationSnapshot,
} from '../state/activation';

function statusCopy(snapshot: ActivationSnapshot): string {
  if (snapshot.status === 'active' && snapshot.extensionDetected) {
    return 'Active in this browser session. Codex can use the local handoff while this page stays open.';
  }
  if (snapshot.status === 'active') {
    return 'Consent recorded. Waiting for the local browser bridge to confirm the extension.';
  }
  if (snapshot.status === 'degraded') {
    return snapshot.reason || 'The bridge stopped answering. No file-input clicks are being intercepted.';
  }
  return 'Nothing is active. The extension remains dormant and ordinary browser interactions are unchanged.';
}

export const ActivationPanel: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ActivationSnapshot>(getActivationSnapshot());

  useEffect(() => subscribeActivation(setSnapshot), []);

  const active = snapshot.status === 'active' || snapshot.status === 'degraded';

  return (
    <section className={`activation-card activation-${snapshot.status}`} aria-labelledby="activation-title">
      <div className="activation-topline">
        <div>
          <span className="activation-eyebrow">TEMPORARY SESSION</span>
          <h2 id="activation-title">Activate MagicPicker</h2>
        </div>
        <span className="activation-badge">
          {snapshot.status === 'active' && snapshot.extensionDetected
            ? 'live'
            : snapshot.status === 'degraded'
            ? 'degraded'
            : snapshot.status === 'active'
            ? 'starting'
            : 'off'}
        </span>
      </div>

      <p className="activation-copy">
        Give MagicPicker explicit, temporary broad access to web pages and tabs in this Chromium session so it can prepare the exact local file requested by Codex.
      </p>

      {!active && (
        <div className="activation-disclosure">
          <div>✓ Read the exact path supplied by the user through the local bridge</div>
          <div>✓ Prepare HTML file uploads in the active browser session</div>
          <div>✓ Access web pages in this browser profile while this session is live</div>
          <div>✓ Keep a visible activity log while this page is open</div>
          <div>✕ Not full-computer access: no silent installation, OS dialogs, or background monitoring</div>
        </div>
      )}

      <p className="activation-status">{statusCopy(snapshot)}</p>

      {active ? (
        <button className="activation-btn activation-btn-stop" onClick={() => deactivateMagicPicker()}>
          Deactivate session
        </button>
      ) : (
        <button className="activation-btn" onClick={() => activateMagicPicker()}>
          Activate MagicPicker — full browser access
        </button>
      )}

      <p className="activation-footnote">
        Session ends when you deactivate, close or navigate away from this page, or the bridge heartbeat expires.
        Codex keeps its own approval rules for local commands and files outside its selected workspace.
      </p>
    </section>
  );
};
