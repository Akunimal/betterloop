import { resolveFile, type ResolveOptions } from '../state/fileResolver';
import type { FileResult } from '../webmcp-types';
import {
  announceControlPage,
  handleExtensionActivationMessage,
} from '../state/activation';

const PAGE_SOURCE = 'magic-picker-page';
const EXTENSION_SOURCE = 'magic-picker-extension';
const CONTENT_SOURCE = 'magic-picker-content';

const pendingBridgeRequests = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timer: number;
}>();

function makeRequestId(): string {
  return `bridge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emit(detail: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent('magic-picker:resolve', { detail }));
}

function normalizeOptions(value: unknown): ResolveOptions {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    path: typeof input.path === 'string' ? input.path.trim() : '',
    accept: typeof input.accept === 'string' ? input.accept : undefined,
    multiple: input.multiple === true,
    prompt: typeof input.prompt === 'string' ? input.prompt : undefined,
    maxSizeMB: typeof input.maxSizeMB === 'number' ? input.maxSizeMB : 50,
  };
}

/**
 * Control-plane endpoint used by the extension.
 *
 * The extension never tries to read this page's IndexedDB. Instead, it asks
 * this visible, user-authorized page to resolve an exact path with its FSA
 * handle and returns the bytes over a correlated postMessage response.
 */
export function startExtensionControlBridge(): void {
  window.addEventListener('message', async (event: MessageEvent) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (!message || (message.source !== EXTENSION_SOURCE && message.source !== CONTENT_SOURCE)) return;

    if (handleExtensionActivationMessage(message)) {
      return;
    }

    if (message.type === 'bridge-response') {
      const requestId = typeof message.requestId === 'string' ? message.requestId : '';
      const pending = pendingBridgeRequests.get(requestId);
      if (!pending) return;
      window.clearTimeout(pending.timer);
      pendingBridgeRequests.delete(requestId);
      if (message.result && typeof message.result === 'object' && (message.result as Record<string, unknown>).success === false) {
        pending.reject(new Error(String((message.result as Record<string, unknown>).error || 'MagicPicker bridge request failed')));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (message.type !== 'resolve-file') return;

    const requestId = typeof message.requestId === 'string' ? message.requestId : '';
    if (!requestId) return;

    const options = normalizeOptions(message.options);
    const target = options.path || options.prompt || 'requested file';
    emit({ file: target, path: options.path, status: 'resolving', source: 'extension' });

    let result: FileResult;
    try {
      result = await resolveFile(options);
    } catch (error) {
      result = { success: false, error: error instanceof Error ? error.message : String(error) };
    }

    emit({
      file: result.fileName || target,
      path: options.path,
      status: result.success ? 'resolved' : 'error',
      size: result.fileSize,
      type: result.fileType,
      detail: result.error,
      source: 'extension',
    });

    window.postMessage({
      source: PAGE_SOURCE,
      type: 'resolve-file-response',
      requestId,
      result,
    }, window.location.origin);
  });

  // The extension may be installed, but it remains dormant until the user
  // explicitly activates a session from the visible control page.
  announceControlPage();
}

/**
 * Ask the installed extension to perform a control-plane operation.
 * Only the visible, activated control page can use this path.
 */
export function requestExtensionOperation(operation: string, params: Record<string, unknown> = {}): Promise<any> {
  const requestId = makeRequestId();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pendingBridgeRequests.delete(requestId);
      reject(new Error('MagicPicker extension did not answer. Load it in this Chromium session and activate MagicPicker first.'));
    }, 2_500);
    pendingBridgeRequests.set(requestId, { resolve, reject, timer });
    window.postMessage({
      source: PAGE_SOURCE,
      type: 'bridge-request',
      requestId,
      operation,
      params,
    }, window.location.origin);
  });
}
