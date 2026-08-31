#!/usr/bin/env node
/*
 * MagicPicker's small Codex-browser adapter.
 *
 * It intentionally does not install software, scan profiles, or launch a
 * second browser. Codex starts this process with approval and supplies the
 * CDP endpoint of the embedded Chromium session. The adapter then exposes a
 * localhost-only HTTP control plane and uses CDP to assign an exact path to
 * an existing HTML file input.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_PORT = 8766;
const SESSION_TTL_MS = 60 * 1000;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || process.env.MAGIC_PICKER_RUNTIME_PORT || DEFAULT_PORT);
const cdpEndpoint = String(
  args['cdp-endpoint'] ||
  process.env.MAGIC_PICKER_CDP_ENDPOINT ||
  process.env.CODEX_BROWSER_CDP_ENDPOINT ||
  '',
).trim();
let session = null;

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(payload);
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return /^https:\/\/magic-picker(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 128 * 1024) reject(new Error('Request body is too large.'));
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (_) { reject(new Error('Request body must be valid JSON.')); }
    });
    req.on('error', reject);
  });
}

function normalizeJsonEndpoint(endpoint, resource) {
  const url = new URL(endpoint);
  if (url.pathname.endsWith('/json/version') || url.pathname.endsWith('/json/list')) {
    url.pathname = `/json/${resource}`;
  } else {
    url.pathname = `/json/${resource}`;
  }
  url.search = '';
  return url.toString();
}

async function fetchJson(resource) {
  if (!cdpEndpoint) throw new Error('Codex did not provide a CDP endpoint.');
  const response = await fetch(normalizeJsonEndpoint(cdpEndpoint, resource));
  if (!response.ok) throw new Error(`CDP endpoint returned HTTP ${response.status}.`);
  return response.json();
}

async function getTargets() {
  const targets = await fetchJson('list');
  return (Array.isArray(targets) ? targets : []).filter((target) =>
    target && target.type === 'page' && target.webSocketDebuggerUrl,
  );
}

function sendCdp(target, method, params = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    const id = Math.floor(Math.random() * 0x7fffffff);
    const timer = setTimeout(() => {
      try { socket.close(); } catch (_) { /* noop */ }
      reject(new Error(`CDP command timed out: ${method}`));
    }, 15_000);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ id, method, params })));
    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch (_) { return; }
      if (message.id !== id) return;
      clearTimeout(timer);
      try { socket.close(); } catch (_) { /* noop */ }
      if (message.error) reject(new Error(message.error.message || `CDP error: ${method}`));
      else resolve(message.result || {});
    });
    socket.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error(`Could not connect to CDP target for ${method}.`));
    });
  });
}

function requireActiveSession(sessionId) {
  if (!session || session.expiresAt <= Date.now() || session.sessionId !== sessionId) {
    throw new Error('MagicPicker runtime is inactive. Activate the visible control page first.');
  }
}

async function activate(body) {
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) throw new Error('sessionId is required.');
  const targets = await getTargets();
  session = { sessionId, expiresAt: Date.now() + SESSION_TTL_MS };
  return { success: true, active: true, sessionId, expiresAt: session.expiresAt, mode: 'codex-cdp', tabs: targets.length };
}

async function listTabs(body) {
  requireActiveSession(body.sessionId);
  const targets = await getTargets();
  return {
    success: true,
    mode: 'codex-cdp',
    tabs: targets.map((target) => ({
      tabId: target.id,
      targetId: target.id,
      title: target.title || '',
      url: target.url || '',
      type: target.type,
    })),
  };
}

async function deactivate(body) {
  requireActiveSession(body.sessionId);
  session = null;
  return { success: true, active: false, mode: 'codex-cdp' };
}

async function heartbeat(body) {
  requireActiveSession(body.sessionId);
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return { success: true, active: true, sessionId: session.sessionId, expiresAt: session.expiresAt, mode: 'codex-cdp' };
}

function safeAbsolutePath(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('path must be the exact local file path.');
  const filePath = path.resolve(value.trim());
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) throw new Error('The requested path is not a file.');
  if (stat.size > MAX_BYTES) throw new Error('File exceeds the 25MB local bridge limit.');
  return { filePath, stat };
}

async function attach(body) {
  requireActiveSession(body.sessionId);
  const { filePath, stat } = safeAbsolutePath(body.path);
  const targets = await getTargets();
  const targetId = typeof body.targetTabId === 'string' && body.targetTabId
    ? body.targetTabId
    : targets[0] && targets[0].id;
  const target = targets.find((item) => item.id === targetId);
  if (!target) throw new Error('Target tab is unavailable. Call magic_picker_tabs again.');
  const selector = typeof body.inputSelector === 'string' && body.inputSelector.trim()
    ? body.inputSelector.trim()
    : 'input[type="file"]';

  const documentResult = await sendCdp(target, 'DOM.getDocument', { depth: 0 });
  const query = await sendCdp(target, 'DOM.querySelector', {
    nodeId: documentResult.root.nodeId,
    selector,
  });
  if (!query.nodeId) throw new Error(`No file input matched selector: ${selector}`);

  await sendCdp(target, 'DOM.setFileInputFiles', { nodeId: query.nodeId, files: [filePath] });
  const expression = `(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) return false;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    return true;
  })()`;
  await sendCdp(target, 'Runtime.evaluate', { expression, returnByValue: true });
  return {
    success: true,
    mode: 'codex-cdp',
    targetTabId: target.id,
    fileName: path.basename(filePath),
    fileSize: stat.size,
    attached: true,
    instruction: 'File assigned directly to the target HTML input. Continue the upload flow in that tab.',
  };
}

async function status() {
  let targets = [];
  let error;
  try { targets = await getTargets(); } catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  const active = !!session && session.expiresAt > Date.now();
  return {
    success: !error,
    active,
    mode: 'codex-cdp',
    cdpConnected: !error,
    tabs: targets.length,
    sessionId: active ? session.sessionId : null,
    error,
  };
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  try {
    if (req.method === 'GET' && (url.pathname === '/status' || url.pathname === '/health')) return json(res, 200, await status());
    if (req.method === 'POST' && !isAllowedOrigin(req.headers.origin)) return json(res, 403, { success: false, error: 'MagicPicker runtime accepts commands only from the MagicPicker control page.' });
    const body = await readBody(req);
    if (req.method === 'POST' && url.pathname === '/activate') return json(res, 200, await activate(body));
    if (req.method === 'POST' && url.pathname === '/deactivate') return json(res, 200, await deactivate(body));
    if (req.method === 'POST' && url.pathname === '/heartbeat') return json(res, 200, await heartbeat(body));
    if (req.method === 'POST' && url.pathname === '/tabs') return json(res, 200, await listTabs(body));
    if (req.method === 'POST' && url.pathname === '/attach') return json(res, 200, await attach(body));
    return json(res, 404, { success: false, error: 'MagicPicker runtime route not found.' });
  } catch (cause) {
    return json(res, 400, { success: false, error: cause instanceof Error ? cause.message : String(cause) });
  }
}

if (args.help) {
  console.log('Usage: node scripts/codex-magic-picker.cjs --cdp-endpoint http://127.0.0.1:9222 --port 8766');
  console.log('The endpoint must belong to the Codex-managed Chromium session. No external browser is launched.');
  process.exit(0);
}

if (args['self-test']) {
  console.log(JSON.stringify({ ok: true, maxBytes: MAX_BYTES, defaultPort: DEFAULT_PORT, nodeWebSocket: typeof WebSocket === 'function' }));
  process.exit(0);
}

const server = http.createServer(handle);
server.listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({
    ready: true,
    mode: 'codex-cdp',
    port,
    cdpConfigured: !!cdpEndpoint,
    message: cdpEndpoint
      ? 'MagicPicker Codex runtime is ready for the activated browser session.'
      : 'Waiting for CODEX_BROWSER_CDP_ENDPOINT; no browser was launched.',
  }));
});

function stop() {
  server.close(() => process.exit(0));
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
