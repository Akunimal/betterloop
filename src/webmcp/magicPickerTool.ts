import {
  getDirectoryName,
  hasDirectoryPermission,
  initResolver,
  resolveFile,
  selectDirectory,
  type ResolveOptions,
} from '../state/fileResolver';
import { FileResult } from '../webmcp-types';
import { getActivationSnapshot, markRuntimeDetected } from '../state/activation';
import { requestExtensionOperation } from './extensionControlBridge';
import { activateLocalRuntime, requestLocalRuntimeOperation } from './codexRuntime';

const READ_TOOL_NAME = 'magic_picker_read';
const ATTACH_TOOL_NAME = 'magic_picker_attach';
const TABS_TOOL_NAME = 'magic_picker_tabs';
const ACTIVATE_TOOL_NAME = 'magic_picker_activate';

let registered = false;
let registrationMode: 'native' | 'polyfill' | 'none' = 'none';
let detectedPlatform = 'unknown';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function detectPlatform(): string {
  const ua = navigator.userAgent;
  const w = window as any;
  if (w.electronAPI || ua.includes('Electron')) return 'ChatGPT Desktop';
  if (ua.includes('ChatGPT') || w.__NEXT_DATA__?.props?.pageProps?.isElectron) return 'ChatGPT Browser';
  if (ua.includes('Codex') || document.title.includes('Codex')) return 'Codex';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return 'Browser';
}

function detectWebMCPStatus(): string {
  const n = navigator as any;
  const d = document as any;
  const w = window as any;
  if (n.modelContext) return 'native';
  if (d.modelContext) return 'document';
  if (w.modelContext) return 'polyfill';
  return 'unavailable';
}

function findModelContext(): any {
  const candidates = [
    (navigator as any).modelContext,
    (document as any).modelContext,
    (window as any).modelContext,
  ];
  return candidates.find((ctx) => ctx && typeof ctx.registerTool === 'function') || null;
}

const inputSchema = {
  type: 'object' as const,
  properties: {
    path: {
      type: 'string',
      description: 'Exact file path supplied by the user or agent. Relative paths are relative to the connected project directory.',
    },
    accept: {
      type: 'string',
      description: 'Optional browser accept filter, for example "image/*" or ".json".',
    },
    multiple: {
      type: 'boolean',
      description: 'Whether the target upload accepts multiple files.',
    },
    prompt: {
      type: 'string',
      description: 'Optional human description used only when no exact path is available.',
    },
    maxSizeMB: {
      type: 'number',
      description: 'Maximum file size in megabytes. Defaults to 50.',
    },
    targetTabId: {
      type: 'number',
      description: 'Optional tab id returned by magic_picker_tabs. Use it to prepare an upload in another browser tab.',
    },
    inputSelector: {
      type: 'string',
      description: 'Optional CSS selector for the target HTML file input.',
    },
    autoAttach: {
      type: 'boolean',
      description: 'If true, attach immediately when the target input can be identified; otherwise prepare it for the next matching click.',
    },
  },
  required: ['path'],
};

function resolverOptions(input: Record<string, unknown>): ResolveOptions {
  return {
    path: typeof input.path === 'string' ? input.path.trim() : '',
    accept: typeof input.accept === 'string' ? input.accept : undefined,
    multiple: input.multiple === true,
    prompt: typeof input.prompt === 'string' ? input.prompt : undefined,
    maxSizeMB: typeof input.maxSizeMB === 'number' ? input.maxSizeMB : 50,
  };
}

function emitEvent(detail: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent('magic-picker:resolve', { detail }));
}

async function requestControlOperation(operation: 'list-tabs' | 'attach', params: Record<string, unknown> = {}): Promise<any> {
  const state = getActivationSnapshot();
  if (state.sessionId) {
    try {
      return await requestLocalRuntimeOperation(operation, state.sessionId, params);
    } catch (_) {
      // The CDP adapter is optional. The MV3 extension is the fallback when
      // the browser session does not expose the local runtime endpoint.
    }
  }
  return requestExtensionOperation(operation, params);
}

async function executeResolver(input: Record<string, unknown>): Promise<FileResult> {
  const options = resolverOptions(input);
  const searchTarget = options.path || options.prompt || '';

  emitEvent({ file: searchTarget || 'searching...', path: options.path, status: 'resolving' });

  if (!hasDirectoryPermission()) {
    const result: FileResult = {
      success: false,
      error: 'No project directory connected. Use the visible Connect project directory button first; a WebMCP call never opens a picker implicitly.',
    };
    emitEvent({ file: searchTarget || 'unknown', path: options.path, status: 'error', detail: result.error });
    return result;
  }

  console.log(`🪄 [${detectedPlatform}] Resolving:`, options);
  const result = await resolveFile(options);

  emitEvent({
    file: result.fileName || searchTarget || 'unknown',
    path: options.path,
    status: result.success ? 'resolved' : 'error',
    size: result.fileSize ? formatSize(result.fileSize) : undefined,
    type: result.fileType,
    detail: result.error,
  });

  return result;
}

/** Register the public same-page WebMCP resolver. */
export async function registerMagicPickerTool(): Promise<boolean> {
  if (registered) return true;

  detectedPlatform = detectPlatform();
  console.log(`🪄 Platform: ${detectedPlatform} | WebMCP: ${detectWebMCPStatus()}`);
  await initResolver();

  const modelContext = findModelContext();
  if (!modelContext) return false;

  const tool = {
    name: READ_TOOL_NAME,
    title: 'Read an exact file without opening a picker',
    description: [
      'Read the exact file path requested by the user from the connected MagicPicker project directory.',
      'Pass the exact path; do not guess a different file and do not ask the page to open a native picker.',
      'The user must connect the directory once with the visible button before calling this tool.',
    ].join(' '),
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema,
    execute: executeResolver,
  };

  const activationTool = {
    name: ACTIVATE_TOOL_NAME,
    title: 'Confirm the temporary MagicPicker session',
    description: [
      'Report the current user-authorized MagicPicker session for this browser.',
      'The user must click the visible Activate MagicPicker button first.',
      'This tool never installs an extension or bypasses Codex command approvals.',
    ].join(' '),
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: { type: 'object' as const, properties: {}, additionalProperties: false },
    execute: async () => {
      let state = getActivationSnapshot();
      if (state.status === 'inactive') {
        return {
          success: false,
          error: 'The user has not activated MagicPicker. Ask them to click the visible Activate MagicPicker button.',
        };
      }
      if (state.sessionId && !state.runtimeDetected) {
        try {
          await activateLocalRuntime(state.sessionId);
          markRuntimeDetected(true);
          state = getActivationSnapshot();
        } catch (_) {
          // The extension route may still be available.
        }
      }
      return {
        success: state.status === 'active' && (state.extensionDetected || state.runtimeDetected),
        status: state.status,
        sessionId: state.sessionId,
        extensionDetected: state.extensionDetected,
        runtimeDetected: state.runtimeDetected,
        codexRuntime: {
          detected: state.runtimeDetected,
          requiresApproval: true,
          launchesExternalBrowser: false,
          command: 'node scripts/codex-magic-picker.cjs --cdp-endpoint <CODEX_BROWSER_CDP_ENDPOINT>',
        },
        instruction: state.extensionDetected
          ? 'MagicPicker is active for this browser session.'
          : state.runtimeDetected
          ? 'MagicPicker is active through the Codex CDP runtime.'
          : 'Run the approved Codex runtime command from codexRuntime.command, then call magic_picker_activate again. The app never launches a browser or installs an extension by itself.',
      };
    },
  };

  const tabsTool = {
    name: TABS_TOOL_NAME,
    title: 'List browser tabs available to MagicPicker',
    description: [
      'List the tabs in the currently activated MagicPicker browser session.',
      'Use the returned tabId to target magic_picker_attach in another tab.',
      'Only tab metadata is returned; page contents, cookies, and credentials are not read.',
    ].join(' '),
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: { type: 'object' as const, properties: {}, additionalProperties: false },
    execute: async () => {
      const state = getActivationSnapshot();
      if (state.status === 'inactive') {
        return { success: false, error: 'Activate MagicPicker from the visible control page first.' };
      }
      try {
        return await requestControlOperation('list-tabs');
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };

  const attachTool = {
    name: ATTACH_TOOL_NAME,
    title: 'Prepare an exact file for an upload in any browser tab',
    description: [
      'Prepare the exact local file requested by the user for an HTML file input.',
      'Call magic_picker_tabs first when the upload is in another tab and pass its targetTabId.',
      'After success, click the matching file input in that tab. Only that prepared click is handled; ordinary clicks remain native.',
    ].join(' '),
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    inputSchema,
    execute: async (input: Record<string, unknown>) => {
      const state = getActivationSnapshot();
      if (state.status === 'inactive') {
        return { success: false, error: 'Activate MagicPicker from the visible control page first.' };
      }
      try {
        return await requestControlOperation('attach', input);
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };

  try {
    await Promise.resolve(modelContext.registerTool(tool));
    await Promise.resolve(modelContext.registerTool(activationTool));
    await Promise.resolve(modelContext.registerTool(tabsTool));
    await Promise.resolve(modelContext.registerTool(attachTool));
    registered = true;
    registrationMode = modelContext.__magicPickerPolyfill ? 'polyfill' : 'native';
    window.dispatchEvent(new Event('magic-picker:registered'));
    console.log(`✅ ${READ_TOOL_NAME} + ${TABS_TOOL_NAME} + ${ATTACH_TOOL_NAME} registered | Dir: ${getDirectoryName() || 'not connected'}`);
    return true;
  } catch (error) {
    console.error('❌ Registration failed:', error);
    return false;
  }
}

export function isMagicPickerRegistered(): boolean { return registered; }
export function getRegistrationMode(): string { return registrationMode; }
export function getDetectedPlatform(): string { return detectedPlatform; }
export { hasDirectoryPermission, getDirectoryName, selectDirectory };
export const magicPickerToolName = READ_TOOL_NAME;
