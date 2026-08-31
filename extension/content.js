// ISOLATED-world router. It connects the MAIN-world WebMCP agent and the
// MagicPicker control page to the background service worker.
(function () {
  'use strict';

  var AGENT_SOURCE = 'magic-picker-agent';
  var CONTENT_SOURCE = 'magic-picker-content';
  var PAGE_SOURCE = 'magic-picker-page';
  var EXTENSION_SOURCE = 'magic-picker-extension';
  var channelToken = createChannelToken();
  var pendingFiles = [];
  var hookedInputs = new WeakSet();
  var sessionActive = false;

  function postToPage(message) {
    window.postMessage(Object.assign({ source: CONTENT_SOURCE }, message), window.location.origin);
  }

  function sendBackground(message, callback) {
    chrome.runtime.sendMessage(message, function (response) {
      var error = chrome.runtime.lastError;
      callback(error ? { success: false, error: error.message } : response);
    });
  }

  function createChannelToken() {
    var bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
  }

  function applySessionState(message) {
    sessionActive = message && message.active === true;
    if (!sessionActive) pendingFiles = [];
    if (sessionActive) {
      injectAgent();
      scanInputs();
    }
    postToPage({
      type: 'bridge-status',
      connected: true,
      active: sessionActive,
      sessionId: message && message.sessionId,
      controlTabId: message && message.controlTabId,
      reason: message && message.reason,
    });
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window || event.origin !== window.location.origin) return;
    var message = event.data;
    if (!message) return;

    if (message.source === AGENT_SOURCE && message.type === 'request') {
      if (message.channelToken !== channelToken) return;
      if (!sessionActive) {
        postToPage({
          type: 'response',
          channelToken: channelToken,
          requestId: message.requestId,
          result: { success: false, error: 'MagicPicker is inactive. Click Activate MagicPicker on the control page first.' },
        });
        return;
      }
      sendBackground({ type: 'agent-request', requestId: message.requestId, operation: message.operation, params: message.params || {} }, function (response) {
        postToPage({ type: 'response', channelToken: channelToken, requestId: message.requestId, result: response });
      });
      return;
    }

    if (message.source === PAGE_SOURCE && message.type === 'control-ready') {
      sendBackground({ type: 'control-ready', version: message.version || 'unknown' }, function (response) {
        if (response && response.success) applySessionState(response);
        else postToPage({ type: 'bridge-status', connected: false, active: false, reason: response && response.error });
      });
      return;
    }

    if (message.source === PAGE_SOURCE && message.type === 'control-state') {
      sendBackground(message, function (response) {
        if (response && response.success) applySessionState(response);
        else postToPage({ type: 'bridge-status', connected: false, active: false, reason: response && response.error });
      });
      return;
    }

    if (message.source === PAGE_SOURCE && message.type === 'control-heartbeat') {
      sendBackground(message, function (response) {
        if (response && response.success) applySessionState(response);
        else postToPage({ type: 'bridge-status', connected: false, active: false, reason: response && response.error });
      });
      return;
    }

    if (message.source === PAGE_SOURCE && message.type === 'control-deactivate') {
      sendBackground(message, function (response) {
        if (response && response.success) applySessionState(response);
      });
      return;
    }

    // Control-page operations (tab listing and cross-tab file preparation)
    // are only accepted by the background after it verifies the live session
    // and the sender tab is the activated control page.
    if (message.source === PAGE_SOURCE && message.type === 'bridge-request') {
      sendBackground({
        type: 'control-operation',
        requestId: message.requestId,
        operation: message.operation,
        params: message.params || {},
      }, function (response) {
        postToPage({
          type: 'bridge-response',
          requestId: message.requestId,
          result: response || { success: false, error: 'MagicPicker bridge did not answer.' },
        });
      });
      return;
    }

    if (message.source === PAGE_SOURCE && message.type === 'resolve-file-response') {
      sendBackground({ type: 'control-response', requestId: message.requestId, result: message.result }, function () {});
    }
  });

  function injectAgent() {
    if (document.querySelector('meta[name="magic-picker-control"][content="true"]')) return;
    var parent = document.documentElement || document.head || document.body;
    if (!parent) return setTimeout(injectAgent, 50);
    var script = document.createElement('script');
    script.src = chrome.runtime.getURL('agent.js');
    script.dataset.magicPickerToken = channelToken;
    script.async = false;
    script.onload = function () { script.remove(); };
    parent.appendChild(script);
  }

  function matchesAccept(file, accept) {
    if (!accept || accept === '*' || accept === '*/*') return true;
    var name = (file.fileName || '').toLowerCase();
    var type = (file.fileType || '').toLowerCase();
    return accept.toLowerCase().split(',').some(function (raw) {
      var pattern = raw.trim();
      if (!pattern) return true;
      if (pattern.charAt(0) === '.') return name.endsWith(pattern);
      if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
      return type === pattern || name.endsWith(pattern);
    });
  }

  function selectorMatches(input, selector) {
    if (!selector) return true;
    try { return input.matches(selector); } catch (_) { return false; }
  }

  function consumeForInput(input) {
    for (var i = 0; i < pendingFiles.length; i++) {
      var candidate = pendingFiles[i];
      if (!matchesAccept(candidate.file, input.accept) || !selectorMatches(input, candidate.inputSelector)) continue;
      pendingFiles.splice(i, 1);
      return candidate;
    }
    return null;
  }

  function decodeBase64(value) {
    var raw = String(value || '');
    var comma = raw.indexOf(',');
    if (raw.indexOf('data:') === 0 && comma >= 0) raw = raw.slice(comma + 1);
    var binary = atob(raw);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function attachToInput(input, candidate) {
    var payload = candidate.file || {};
    var files = payload.files || [payload];
    if (!input.multiple) files = files.slice(0, 1);
    var dataTransfer = new DataTransfer();
    files.forEach(function (file) {
      if (!file || !file.base64Data) return;
      dataTransfer.items.add(new File([decodeBase64(file.base64Data)], file.fileName || 'upload', {
        type: file.fileType || 'application/octet-stream', lastModified: Date.now()
      }));
    });
    if (!dataTransfer.files.length) return false;
    try { input.files = dataTransfer.files; } catch (_) { return false; }
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    return true;
  }

  function hookInput(input) {
    if (hookedInputs.has(input)) return;
    hookedInputs.add(input);
    input.addEventListener('click', function (event) {
      if (!sessionActive) return;
      var candidate = consumeForInput(input);
      if (!candidate) return; // Normal user clicks retain native picker behavior.
      event.preventDefault();
      event.stopImmediatePropagation();
      var attached = attachToInput(input, candidate);
      chrome.runtime.sendMessage({ type: 'file-attached', requestId: candidate.requestId, success: attached, fileName: candidate.file && candidate.file.fileName }, function () {});
      if (!attached) console.warn('MagicPicker could not assign the prepared file to the input');
    }, true);
  }

  function scanInputs() { document.querySelectorAll('input[type="file"]').forEach(hookInput); }

  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === 'file-ready') {
      if (message.active === true) sessionActive = true;
      if (!sessionActive) return;
      var candidate = { requestId: message.requestId, file: message.file, inputSelector: message.inputSelector || '', expiresAt: Date.now() + 120000 };
      if (message.autoAttach) {
        var inputs = Array.from(document.querySelectorAll('input[type="file"]'));
        var target = inputs.find(function (input) { return selectorMatches(input, candidate.inputSelector) && matchesAccept(candidate.file, input.accept); });
        if (target && attachToInput(target, candidate)) return;
      }
      pendingFiles.push(candidate);
      pendingFiles = pendingFiles.filter(function (item) { return item.expiresAt > Date.now(); });
    }
    if (message.type === 'session-state') applySessionState(message);
    if (message.type === 'control-request') {
      window.postMessage({ source: EXTENSION_SOURCE, type: 'resolve-file', requestId: message.requestId, options: message.options }, window.location.origin);
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { if (sessionActive) scanInputs(); }, { once: true });
  else if (sessionActive) scanInputs();
  new MutationObserver(function () { if (sessionActive) scanInputs(); }).observe(document.documentElement || document, { childList: true, subtree: true });
  sendBackground({ type: 'get-session-state' }, function (response) {
    if (response && response.success) applySessionState(response);
  });
})();
