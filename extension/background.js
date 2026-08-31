// MV3 service worker. The gateway is the preferred provider; the visible
// MagicPicker control tab is the browser-local FSA fallback.
(function () {
  'use strict';

  var GATEWAY_URL = 'ws://127.0.0.1:8765/ws';
  var MAX_BYTES = 25 * 1024 * 1024;
  var SESSION_TTL_MS = 60 * 1000;
  var socket = null;
  var reconnectTimer = null;
  var gatewayWaiters = [];
  var gatewayPending = new Map();
  var controlTabId = null;
  var controlPending = new Map();
  var activeSession = null;
  var sessionExpiryTimer = null;

  function id(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function sessionIsActive() {
    return !!activeSession && activeSession.expiresAt > Date.now();
  }

  function sessionStatus(reason) {
    return {
      active: sessionIsActive(),
      sessionId: activeSession ? activeSession.sessionId : null,
      controlTabId: controlTabId,
      reason: reason || (sessionIsActive() ? undefined : 'MagicPicker is inactive until the control page is explicitly activated.'),
    };
  }

  function broadcastSessionState(active, reason) {
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(function (tab) {
        if (tab.id == null) return;
        chrome.tabs.sendMessage(tab.id, {
          type: 'session-state',
          active: active,
          sessionId: activeSession ? activeSession.sessionId : null,
          reason: reason || '',
        }, function () { void chrome.runtime.lastError; });
      });
    });
  }

  function clearControlPending(reason) {
    controlPending.forEach(function (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason || 'MagicPicker session ended.'));
    });
    controlPending.clear();
  }

  function deactivateSession(reason) {
    if (sessionExpiryTimer) {
      clearTimeout(sessionExpiryTimer);
      sessionExpiryTimer = null;
    }
    var hadSession = !!activeSession;
    activeSession = null;
    disconnectGateway();
    clearControlPending(reason || 'MagicPicker session ended.');
    if (hadSession) broadcastSessionState(false, reason || 'MagicPicker session ended.');
  }

  function scheduleSessionExpiry() {
    if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);
    if (!activeSession) return;
    sessionExpiryTimer = setTimeout(function () {
      if (sessionIsActive()) scheduleSessionExpiry();
      else deactivateSession('MagicPicker control page heartbeat expired.');
    }, Math.max(1000, activeSession.expiresAt - Date.now()));
  }

  function activateSession(tabId, message) {
    if (!message.sessionId || tabId == null) return { success: false, error: 'Missing MagicPicker session id.' };
    controlTabId = tabId;
    activeSession = {
      sessionId: String(message.sessionId),
      controlTabId: tabId,
      activatedAt: Number(message.activatedAt) || Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    connectGateway();
    scheduleSessionExpiry();
    broadcastSessionState(true);
    return Object.assign({ success: true }, sessionStatus());
  }

  function handleControlReady(sender, message) {
    if (!sender.tab || sender.tab.id == null) return { success: false, error: 'Control page has no tab id.' };
    var tabId = sender.tab.id;
    if (message.active === true) return activateSession(tabId, message);

    // A reload/navigation creates a new document in the same tab. Treat it as
    // the end of the old consent session; the new document must be activated
    // again by an explicit user click.
    if (activeSession && controlTabId === tabId) deactivateSession('MagicPicker control page was reloaded or navigated.');

    // A second control page must not silently steal a live session.
    if (!sessionIsActive() || controlTabId == null || controlTabId === tabId) controlTabId = tabId;
    return Object.assign({ success: true }, sessionStatus());
  }

  function handleHeartbeat(sender, message) {
    if (!sender.tab || sender.tab.id !== controlTabId || !activeSession || message.sessionId !== activeSession.sessionId) {
      return Object.assign({ success: false, error: 'MagicPicker heartbeat rejected.' }, sessionStatus());
    }
    activeSession.expiresAt = Date.now() + SESSION_TTL_MS;
    scheduleSessionExpiry();
    return Object.assign({ success: true }, sessionStatus());
  }

  function scheduleReconnect() {
    if (reconnectTimer || !sessionIsActive()) return;
    reconnectTimer = setTimeout(function () { reconnectTimer = null; connectGateway(); }, 3000);
  }

  function settleGatewayWaiters(error) {
    var waiters = gatewayWaiters.splice(0);
    waiters.forEach(function (waiter) { error ? waiter.reject(error) : waiter.resolve(); });
  }

  function connectGateway() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
    try {
      socket = new WebSocket(GATEWAY_URL);
      socket.onopen = function () { settleGatewayWaiters(null); };
      socket.onmessage = function (event) {
        var message;
        try { message = JSON.parse(event.data); } catch (_) { return; }
        if (!message.id) return;
        var pending = gatewayPending.get(message.id);
        if (!pending) return;
        gatewayPending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error));
        else pending.resolve(message.result);
      };
      socket.onerror = function () {};
      socket.onclose = function () {
        socket = null;
        settleGatewayWaiters(new Error('Local MCP gateway is not connected'));
        gatewayPending.forEach(function (pending) {
          clearTimeout(pending.timer);
          pending.reject(new Error('Local MCP gateway disconnected'));
        });
        gatewayPending.clear();
        scheduleReconnect();
      };
    } catch (_) {
      socket = null;
      scheduleReconnect();
    }
  }

  function disconnectGateway() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      var current = socket;
      socket = null;
      current.onclose = null;
      try { current.close(); } catch (_) {}
    }
    settleGatewayWaiters(new Error('MagicPicker session is inactive.'));
    gatewayPending.forEach(function (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('MagicPicker session is inactive.'));
    });
    gatewayPending.clear();
  }

  function waitForGateway(timeout) {
    if (socket && socket.readyState === WebSocket.OPEN) return Promise.resolve();
    connectGateway();
    return new Promise(function (resolve, reject) {
      var waiter;
      var timer = setTimeout(function () {
        var index = gatewayWaiters.indexOf(waiter);
        if (index >= 0) gatewayWaiters.splice(index, 1);
        reject(new Error('Local MCP gateway unavailable at 127.0.0.1:8765'));
      }, timeout || 6000);
      waiter = {
        resolve: function () { clearTimeout(timer); resolve(); },
        reject: function (error) { clearTimeout(timer); reject(error); }
      };
      gatewayWaiters.push(waiter);
    });
  }

  async function callGateway(tool, params) {
    // Do not hold the agent on a missing optional gateway; the control-page
    // FSA fallback should take over quickly.
    await waitForGateway(1500);
    var requestId = id('gw');
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        gatewayPending.delete(requestId);
        reject(new Error('Gateway tool timed out: ' + tool));
      }, 120000);
      gatewayPending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
      try {
        socket.send(JSON.stringify({ id: requestId, action: 'call-tool', payload: { tool: tool, params: params || {} } }));
      } catch (error) {
        clearTimeout(timer);
        gatewayPending.delete(requestId);
        reject(error);
      }
    });
  }

  function asObject(value) { return value && typeof value === 'object' ? value : null; }
  function tryJson(value) { if (typeof value !== 'string') return null; try { return JSON.parse(value); } catch (_) { return null; } }
  function textType(path) { return /\.(txt|md|json|js|jsx|ts|tsx|css|html?|xml|ya?ml|toml|py|rb|go|rs|java|c|cpp|h|log)$/i.test(path || ''); }

  function base64FromText(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  function normalizeResult(raw, path, forAttach) {
    var root = asObject(raw) || {};
    if (root.success === false) return { success: false, error: root.error || 'File provider failed' };
    if (root.success && root.base64Data) {
      var directClean = String(root.base64Data).replace(/^data:[^,]+,/, '').replace(/\s/g, '');
      var directSize = Math.floor(directClean.length * 0.75);
      if (directSize > MAX_BYTES) return { success: false, error: 'File exceeds the 25MB local bridge limit.' };
      return { success: true, fileName: root.fileName || String(path).split(/[\\/]/).pop() || 'upload', fileSize: root.fileSize || directSize, fileType: root.fileType || 'application/octet-stream', base64Data: directClean };
    }

    var text = null;
    var base64 = null;
    var fileName = String(path).split(/[\\/]/).pop() || 'file';
    var fileType = 'application/octet-stream';
    var visit = function (value) {
      if (value == null) return;
      if (typeof value === 'string') {
        var parsed = tryJson(value);
        if (parsed) { visit(parsed); return; }
        if (text === null) text = value;
        return;
      }
      if (Array.isArray(value)) { value.forEach(visit); return; }
      if (typeof value !== 'object') return;
      if (typeof value.fileName === 'string') fileName = value.fileName;
      if (typeof value.fileType === 'string') fileType = value.fileType;
      if (typeof value.mimeType === 'string') fileType = value.mimeType;
      if (typeof value.base64Data === 'string') base64 = value.base64Data;
      if (typeof value.blob === 'string') base64 = value.blob;
      if (typeof value.data === 'string' && value.data.length > 0) {
        var looksLikeBinaryBase64 = !textType(path) && value.data.length % 4 === 0 && /^[A-Za-z0-9+/=\s]+$/.test(value.data);
        if (value.data.indexOf('data:') === 0 || looksLikeBinaryBase64) base64 = value.data;
        else if (text === null) text = value.data;
      }
      if (typeof value.text === 'string' && text === null) text = value.text;
      if (value.resource) visit(value.resource);
      if (value.content) visit(value.content);
      if (value.result) visit(value.result);
    };
    visit(raw);

    if (base64) {
      var clean = String(base64).replace(/^data:[^,]+,/, '').replace(/\s/g, '');
      var bytes = Math.floor(clean.length * 0.75);
      if (bytes > MAX_BYTES) return { success: false, error: 'File exceeds the 25MB local bridge limit.' };
      return { success: true, fileName: fileName, fileSize: bytes, fileType: fileType, base64Data: clean };
    }
    if (text !== null) {
      var result = { success: true, fileName: fileName, fileType: textType(path) ? 'text/plain' : fileType, fileSize: new TextEncoder().encode(text).length, content: text };
      if (forAttach && textType(path)) result.base64Data = base64FromText(text);
      return result;
    }
    return { success: false, error: 'The configured file provider returned no readable content.' };
  }

  function joinProjectPath(projectDir, path) {
    if (!projectDir || !path) return path;
    if (/^[A-Za-z]:[\\/]/.test(path) || path.charAt(0) === '/') return path;
    return projectDir.replace(/[\\/]$/, '') + '/' + path.replace(/^[\\/]+/, '');
  }

  function resolveFromControl(options) {
    var tabId = controlTabId;
    if (!sessionIsActive() || tabId == null) return Promise.reject(new Error('MagicPicker is inactive. Open the control page and click Activate MagicPicker first.'));
    var requestId = id('control');
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        controlPending.delete(requestId);
        reject(new Error('MagicPicker control page timed out while reading the file.'));
      }, 120000);
      controlPending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
      chrome.tabs.sendMessage(tabId, { type: 'control-request', requestId: requestId, options: options }, function () {
        if (!chrome.runtime.lastError) return;
        var pending = controlPending.get(requestId);
        if (!pending) return;
        clearTimeout(pending.timer);
        controlPending.delete(requestId);
        reject(new Error('MagicPicker control page is no longer available.'));
      });
    });
  }

  async function resolveFile(options, forAttach) {
    var path = options.path || '';
    var gatewayParams = Object.assign({}, options, { path: joinProjectPath(options.projectDir, path) });
    try {
      var raw = await callGateway('devin/filesystem.read_file', gatewayParams);
      var normalized = normalizeResult(raw, gatewayParams.path, forAttach);
      if (normalized.success && (!forAttach || normalized.base64Data || normalized.files)) return normalized;
    } catch (error) {
      console.info('MagicPicker gateway fallback:', error.message);
    }
    var controlResult = await resolveFromControl(options);
    return normalizeResult(controlResult, path, forAttach);
  }

  async function handleAgentRequest(message, sender) {
    if (!sender.tab || sender.tab.id == null) throw new Error('The request did not originate from a browser tab.');
    if (!sessionIsActive()) throw new Error('MagicPicker is inactive. Open the control page and click Activate MagicPicker first.');
    var options = message.params && typeof message.params === 'object' ? message.params : {};
    if (!options.path || typeof options.path !== 'string') throw new Error('magic_picker requires the exact file path in params.path.');
    var forAttach = message.operation === 'attach';
    var result = await resolveFile(options, forAttach);
    if (!result.success) return result;

    if (forAttach) {
      var file = result.files ? { files: result.files } : result;
      await new Promise(function (resolve, reject) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'file-ready', requestId: message.requestId, file: file, inputSelector: options.inputSelector || '', autoAttach: options.autoAttach === true }, function () {
          if (chrome.runtime.lastError) reject(new Error('Target tab cannot receive the prepared file. Reload it with the extension enabled.'));
          else resolve();
        });
      });
      return { success: true, queued: options.autoAttach !== true, attached: options.autoAttach === true, fileName: result.fileName, fileSize: result.fileSize, fileType: result.fileType, requestId: message.requestId, instruction: options.autoAttach === true ? 'File attached.' : 'File prepared. Click the target file input now.' };
    }
    return result;
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'control-ready' && sender.tab) {
      sendResponse(handleControlReady(sender, message));
      return false;
    }
    if (message.type === 'control-state' && sender.tab) {
      var stateResult = message.active === true
        ? activateSession(sender.tab.id, message)
        : (sender.tab.id === controlTabId ? (deactivateSession(message.reason || 'Control page deactivated.'), Object.assign({ success: true }, sessionStatus(message.reason))) : Object.assign({ success: true }, sessionStatus()));
      sendResponse(stateResult);
      return false;
    }
    if (message.type === 'control-heartbeat' && sender.tab) {
      sendResponse(handleHeartbeat(sender, message));
      return false;
    }
    if (message.type === 'control-deactivate' && sender.tab) {
      if (sender.tab.id === controlTabId && (!message.sessionId || !activeSession || message.sessionId === activeSession.sessionId)) {
        deactivateSession(message.reason || 'User deactivated MagicPicker.');
      }
      sendResponse(Object.assign({ success: true }, sessionStatus(message.reason)));
      return false;
    }
    if (message.type === 'get-session-state') {
      sendResponse(Object.assign({ success: true }, sessionStatus()));
      return false;
    }
    if (message.type === 'control-response') {
      var pending = controlPending.get(message.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        controlPending.delete(message.requestId);
        pending.resolve(message.result);
      }
      return false;
    }
    if (message.type === 'file-attached') return false;
    if (message.type !== 'agent-request') return false;
    handleAgentRequest(message, sender).then(sendResponse).catch(function (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    });
    return true;
  });

  chrome.tabs.onRemoved.addListener(function (tabId) {
    if (tabId === controlTabId) {
      controlTabId = null;
      deactivateSession('MagicPicker control page was closed.');
    }
  });

})();
