import {
  getDirectoryName,
  hasDirectoryPermission,
  initResolver,
  resolveFile,
  selectDirectory,
  type ResolveOptions,
} from '../state/fileResolver';
import { FileResult } from '../webmcp-types';
import { getActivationSnapshot } from '../state/activation';

const TOOL_NAME = 'magic_picker';
const READ_TOOL_NAME = 'magic_picker_read';
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
      const state = getActivationSnapshot();
      if (state.status === 'inactive') {
        return {
          success: false,
          error: 'The user has not activated MagicPicker. Ask them to click the visible Activate MagicPicker button.',
        };
      }
      return {
        success: state.status === 'active' && state.extensionDetected,
        status: state.status,
        sessionId: state.sessionId,
        extensionDetected: state.extensionDetected,
        instruction: state.extensionDetected
          ? 'MagicPicker is active for this browser session.'
          : 'Consent is recorded; the local extension has not confirmed yet.',
      };
    },
  };

  try {
    await Promise.resolve(modelContext.registerTool(tool));
    // Backwards-compatible alias for existing demos and discovered sessions.
    await Promise.resolve(modelContext.registerTool({ ...tool, name: TOOL_NAME }));
    await Promise.resolve(modelContext.registerTool(activationTool));
    registered = true;
    registrationMode = modelContext.__magicPickerPolyfill ? 'polyfill' : 'native';
    window.dispatchEvent(new Event('magic-picker:registered'));
    console.log(`✅ ${READ_TOOL_NAME} + ${TOOL_NAME} registered | Dir: ${getDirectoryName() || 'not connected'}`);
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
export const magicPickerToolName = TOOL_NAME;
