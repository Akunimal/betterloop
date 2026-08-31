// MAIN-world page agent. This file is injected by content.js so native
// WebMCP can discover the bridge tools on the user's current tab.
(function () {
  'use strict';

  if (window.__magicPickerAgentLoaded) return;
  window.__magicPickerAgentLoaded = true;

  var SOURCE = 'magic-picker-agent';
  var CONTENT_SOURCE = 'magic-picker-content';
  var currentScript = document.currentScript;
  var CHANNEL_TOKEN = currentScript && currentScript.dataset ? currentScript.dataset.magicPickerToken : '';
  var pending = new Map();
  var serial = 0;

  function request(operation, params) {
    return new Promise(function (resolve, reject) {
      var requestId = 'mp-' + Date.now().toString(36) + '-' + (++serial);
      var timer = setTimeout(function () {
        pending.delete(requestId);
        reject(new Error('MagicPicker request timed out. Is the local gateway/control page running?'));
      }, 120000);
      pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
      window.postMessage({ source: SOURCE, type: 'request', channelToken: CHANNEL_TOKEN, requestId: requestId, operation: operation, params: params || {} }, window.location.origin);
    });
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window || event.origin !== window.location.origin) return;
    var message = event.data;
    if (!message || message.source !== CONTENT_SOURCE || message.type !== 'response' || message.channelToken !== CHANNEL_TOKEN) return;
    var call = pending.get(message.requestId);
    if (!call) return;
    pending.delete(message.requestId);
    clearTimeout(call.timer);
    if (message.error) call.reject(new Error(message.error));
    else if (message.result && message.result.success === false) call.reject(new Error(message.result.error || 'MagicPicker request failed'));
    else call.resolve(message.result);
  });

  function getContext() {
    return (navigator && navigator.modelContext) || (document && document.modelContext) || window.modelContext || null;
  }

  function register() {
    var context = getContext();
    if (!context || typeof context.registerTool !== 'function') return false;

    var fileSchema = {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Exact absolute path requested by the user, for example C:\\Users\\me\\project\\photo.png.' },
        accept: { type: 'string', description: 'Optional target input filter, for example image/* or .png.' },
        multiple: { type: 'boolean', description: 'Whether the target HTML file input accepts multiple files.' },
        projectDir: { type: 'string', description: 'Optional absolute project directory used when path is relative.' },
        inputSelector: { type: 'string', description: 'Optional CSS selector for the target file input.' },
        autoAttach: { type: 'boolean', description: 'If true, attach as soon as the file is ready; otherwise call this before clicking upload.' },
        targetTabId: { type: 'number', description: 'Optional tab id returned by magic_picker_tabs when the upload is in another browser tab.' }
      },
      required: ['path']
    };

    var readTool = {
      name: 'magic_picker_read',
      title: 'Read an exact local file',
      description: 'Read the exact local file path provided by the user through MagicPicker. Pass the exact path; never guess a file and never open a native picker. Use this when the agent needs file contents.',
      inputSchema: fileSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: function (input) { return request('read', input); }
    };
    var attachTool = {
      name: 'magic_picker_attach',
      title: 'Prepare an exact file for this tab upload',
      description: 'Prepare the exact local file requested by the user for an HTML file upload. Use targetTabId from magic_picker_tabs for another tab, wait for success, then click that tab file input. MagicPicker prevents the native picker only for that prepared request; normal clicks remain normal.',
      inputSchema: fileSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: function (input) { return request('attach', input); }
    };

    try {
      Promise.resolve(context.registerTool(readTool)).then(function () {
        return context.registerTool(attachTool);
      }).catch(function (error) { console.warn('MagicPicker tool registration failed', error); });
      window.__magicPickerNativeTools = true;
      return true;
    } catch (error) {
      console.warn('MagicPicker tool registration failed', error);
      return false;
    }
  }

  var attempts = 0;
  function tryRegister() {
    if (register() || ++attempts >= 12) return;
    setTimeout(tryRegister, attempts < 4 ? 250 : 1000);
  }
  tryRegister();
})();
