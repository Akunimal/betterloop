/**
 * Temporary, user-initiated MagicPicker session.
 *
 * This state intentionally lives in memory only. Refreshing, navigating away,
 * closing the control page, or losing the heartbeat ends the session.
 */

import { activateLocalRuntime, deactivateLocalRuntime, heartbeatLocalRuntime } from '../webmcp/codexRuntime';

export type ActivationStatus = 'inactive' | 'active' | 'degraded';

export interface ActivationSnapshot {
  status: ActivationStatus;
  sessionId: string | null;
  activatedAt: number | null;
  expiresAt: number | null;
  extensionDetected: boolean;
  runtimeDetected: boolean;
  controlTabId: number | null;
  reason?: string;
}

const ACTIVATION_EVENT = 'magic-picker:activation';
const PAGE_SOURCE = 'magic-picker-page';
const CONTENT_SOURCE = 'magic-picker-content';
const EXTENSION_SOURCE = 'magic-picker-extension';

let snapshot: ActivationSnapshot = {
  status: 'inactive',
  sessionId: null,
  activatedAt: null,
  expiresAt: null,
  extensionDetected: false,
  runtimeDetected: false,
  controlTabId: null,
};

let heartbeatTimer: number | null = null;

function makeSessionId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `session-${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function publish(next: Partial<ActivationSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  window.dispatchEvent(new CustomEvent<ActivationSnapshot>(ACTIVATION_EVENT, { detail: snapshot }));
}

function send(message: Record<string, unknown>): void {
  window.postMessage({ source: PAGE_SOURCE, ...message }, window.location.origin);
}

function stopHeartbeat(): void {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function sendHeartbeat(): void {
  if (snapshot.status !== 'active' || !snapshot.sessionId) return;
  send({
    type: 'control-heartbeat',
    sessionId: snapshot.sessionId,
    expiresAt: snapshot.expiresAt,
  });
  void heartbeatLocalRuntime(snapshot.sessionId)
    .then(() => markRuntimeDetected(true))
    .catch(() => undefined);
}

export function getActivationSnapshot(): ActivationSnapshot {
  return snapshot;
}

export function markRuntimeDetected(detected: boolean, reason?: string): void {
  publish({ runtimeDetected: detected, reason: reason || snapshot.reason });
}

/** Start a session after the user has clicked the explicit consent button. */
export function activateMagicPicker(): ActivationSnapshot {
  stopHeartbeat();
  const now = Date.now();
  const sessionId = makeSessionId();
  publish({
    status: 'active',
    sessionId,
    activatedAt: now,
    expiresAt: now + 60_000,
    reason: undefined,
  });
  send({
    type: 'control-state',
    active: true,
    sessionId,
    activatedAt: now,
    expiresAt: now + 60_000,
  });
  sendHeartbeat();
  void activateLocalRuntime(sessionId)
    .then(() => markRuntimeDetected(true))
    .catch(() => markRuntimeDetected(false));
  heartbeatTimer = window.setInterval(() => {
    publish({ expiresAt: Date.now() + 60_000 });
    sendHeartbeat();
  }, 15_000);
  return snapshot;
}

/** Explicitly end the session and tell the extension to clear all pending work. */
export function deactivateMagicPicker(reason = 'User deactivated MagicPicker'): ActivationSnapshot {
  stopHeartbeat();
  if (snapshot.sessionId) {
    send({ type: 'control-deactivate', sessionId: snapshot.sessionId, reason });
    void deactivateLocalRuntime(snapshot.sessionId).catch(() => undefined);
  }
  publish({
    status: 'inactive',
    sessionId: null,
    activatedAt: null,
    expiresAt: null,
    reason,
  });
  return snapshot;
}

/** A page-level listener used by React components and the control bridge. */
export function subscribeActivation(handler: (value: ActivationSnapshot) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<ActivationSnapshot>).detail);
  window.addEventListener(ACTIVATION_EVENT, listener);
  return () => window.removeEventListener(ACTIVATION_EVENT, listener);
}

/**
 * Handle status messages from the extension. This never upgrades an inactive
 * page to active: only the explicit button can do that.
 */
export function handleExtensionActivationMessage(message: Record<string, unknown>): boolean {
  if (message.source !== EXTENSION_SOURCE && message.source !== CONTENT_SOURCE) return false;
  if (message.type !== 'bridge-status' && message.type !== 'session-status') return false;

  const extensionDetected = true;
  const active = message.active === true && message.sessionId === snapshot.sessionId;
  publish({
    extensionDetected,
    controlTabId: typeof message.controlTabId === 'number' ? message.controlTabId : snapshot.controlTabId,
    status: active ? 'active' : snapshot.status === 'active' ? 'degraded' : 'inactive',
    reason: typeof message.reason === 'string' ? message.reason : snapshot.reason,
  });
  return true;
}

/** Notify the extension that this page exists, but is not yet an active session. */
export function announceControlPage(): void {
  send({ type: 'control-ready', active: false, sessionId: null, version: '1.1.0' });
}

window.addEventListener('pagehide', () => {
  if (snapshot.sessionId) {
    send({ type: 'control-deactivate', sessionId: snapshot.sessionId, reason: 'Control page closed or navigated' });
    void deactivateLocalRuntime(snapshot.sessionId).catch(() => undefined);
  }
  stopHeartbeat();
});
