import { resolveFile, initResolver, hasDirectoryPermission, getDirectoryName, selectDirectory } from '../state/fileResolver';
import { FileResult } from '../webmcp-types';

const TOOL_NAME = 'magic_picker';

let registered = false;
let registrationMode: 'native' | 'polyfill' | 'none' = 'none';
let detectedPlatform: string = 'unknown';

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
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    if ((navigator as any).modelContext) return 'Chrome (WebMCP)';
    return 'Chrome';
  }
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
  for (const ctx of candidates) {
    if (ctx && typeof ctx.registerTool === 'function') return ctx;
  }
  return null;
}

/**
 * Register magic_picker — resolves files from the connected directory.
 *
 * After the one-time directory grant, every call resolves automatically.
 * Codex passes a file path, MagicPicker reads it. No picker, no modal.
 */
export async function registerMagicPickerTool(): Promise<boolean> {
  if (registered) return true;

  detectedPlatform = detectPlatform();
  console.log(`🪄 Platform: ${detectedPlatform} | WebMCP: ${detectWebMCPStatus()}`);

  await initResolver();

  const inputSchema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'File path to resolve, e.g. "src/App.tsx" or "package.json".'
      },
      accept: {
        type: 'string',
        description: 'MIME type filter, e.g. "image/*" or ".pdf". Default: "*".',
        default: '*'
      },
      prompt: {
        type: 'string',
        description: 'Fallback: describe what file is needed if no path is given.'
      }
    },
    required: []
  };

  const executeHandler = async (input: Record<string, unknown>): Promise<FileResult> => {
    const path = typeof input.path === 'string' ? input.path.trim() : '';
    const accept = typeof input.accept === 'string' ? input.accept.trim() : '*';
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';

    // Use path as the primary resolution target, fallback to prompt
    const searchTarget = path || prompt;

    console.log(`🪄 [${detectedPlatform}] Resolving:`, searchTarget || accept);

    const emitEvent = (detail: Record<string, unknown>) => {
      window.dispatchEvent(new CustomEvent('magic-picker:resolve', { detail }));
    };

    emitEvent({
      file: searchTarget || accept || 'searching...',
      path: searchTarget,
      status: 'resolving'
    });

    const result = await resolveFile({ accept, multiple: false, maxSizeMB: 50, prompt: searchTarget });

    emitEvent({
      file: result.fileName || searchTarget || 'unknown',
      path: searchTarget,
      status: result.success ? 'resolved' : 'error',
      size: result.fileSize ? formatSize(result.fileSize) : undefined,
      type: result.fileType,
      detail: result.error
    });

    return result;
  };

  const modelContext = findModelContext();

  if (modelContext) {
    try {
      modelContext.registerTool({
        name: TOOL_NAME,
        title: 'Resolve a file from the project',
        description: 'Read a file from the user\'s connected project directory. Pass the file path (e.g. "src/App.tsx"). Returns file data as base64. No picker dialog.',
        annotations: {
          readOnlyHint: true,
          untrustedContentHint: true
        },
        inputSchema,
        execute: executeHandler
      });
      registered = true;
      registrationMode = 'native';
      window.dispatchEvent(new Event('magic-picker:registered'));
      console.log(`✅ magic_picker registered | Dir: ${getDirectoryName() || 'connect once'}`);
      return true;
    } catch (error) {
      console.error('❌ Registration failed:', error);
    }
  }

  return false;
}

export function isMagicPickerRegistered(): boolean {
  return registered;
}

export function getRegistrationMode(): string {
  return registrationMode;
}

export function getDetectedPlatform(): string {
  return detectedPlatform;
}

export { hasDirectoryPermission, getDirectoryName, selectDirectory };

export const magicPickerToolName = TOOL_NAME;
