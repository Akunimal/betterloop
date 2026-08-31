const RUNTIME_BASE = 'http://127.0.0.1:8766';

async function postRuntime(path: string, body: Record<string, unknown>, timeoutMs = 900): Promise<any> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${RUNTIME_BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.error || `MagicPicker runtime returned HTTP ${response.status}.`);
    }
    return result;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function activateLocalRuntime(sessionId: string): Promise<any> {
  return postRuntime('/activate', { sessionId });
}

export async function deactivateLocalRuntime(sessionId: string): Promise<any> {
  return postRuntime('/deactivate', { sessionId });
}

export async function heartbeatLocalRuntime(sessionId: string): Promise<any> {
  return postRuntime('/heartbeat', { sessionId });
}

export async function requestLocalRuntimeOperation(
  operation: 'list-tabs' | 'attach',
  sessionId: string,
  params: Record<string, unknown> = {},
): Promise<any> {
  return postRuntime(operation === 'list-tabs' ? '/tabs' : '/attach', { ...params, sessionId });
}
