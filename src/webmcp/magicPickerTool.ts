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

  // ChatGPT desktop app (Electron-based)
  if (w.electronAPI || ua.includes('Electron')) return 'ChatGPT Desktop';

  // ChatGPT in-app browser
  if (ua.includes('ChatGPT') || w.__NEXT_DATA__?.props?.pageProps?.isElectron) return 'ChatGPT Browser';

  // Codex
  if (ua.includes('Codex') || document.title.includes('Codex')) return 'Codex';

  // Chrome with WebMCP
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    if ((navigator as any).modelContext) return 'Chrome (WebMCP)';
    return 'Chrome';
  }

  // Edge
  if (ua.includes('Edg')) return 'Edge';

  // Firefox
  if (ua.includes('Firefox')) return 'Firefox';

  // Safari
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

/**
 * Find the best available WebMCP context.
 * Priority: navigator > document > window
 */
function findModelContext(): any {
  const n = navigator as any;
  const d = document as any;
  const w = window as any;

  // Check all known locations for modelContext
  const candidates = [
    { ctx: n.modelContext, name: 'navigator.modelContext' },
    { ctx: d.modelContext, name: 'document.modelContext' },
    { ctx: w.modelContext, name: 'window.modelContext' },
  ];

  for (const { ctx, name } of candidates) {
    if (ctx && typeof ctx.registerTool === 'function') {
      console.log(`🪄 Found WebMCP context at ${name}`);
      return ctx;
    }
  }

  return null;
}

/**
 * Register magic_picker with the browser's WebMCP API.
 *
 * Supports:
 *   - ChatGPT in-app browser (navigator.modelContext)
 *   - Chrome with WebMCP enabled (navigator.modelContext)
 *   - Chrome DevTools / Canary (document.modelContext)
 *   - Local polyfill for testing (window.modelContext)
 *
 * The browser handles auto-discovery: agents visiting this page
 * will automatically see magic_picker as an available tool.
 */
export async function registerMagicPickerTool(): Promise<boolean> {
  if (registered) return true;

  detectedPlatform = detectPlatform();
  console.log(`🪄 Platform detected: ${detectedPlatform}`);
  console.log(`🪄 WebMCP status: ${detectWebMCPStatus()}`);

  // Restore directory permission from IndexedDB
  await initResolver();

  const inputSchema = {
    type: 'object' as const,
    properties: {
      accept: {
        type: 'string',
        description: "Accepted MIME types or extensions, for example 'image/*' or '.pdf'.",
        default: '*'
      },
      multiple: {
        type: 'boolean',
        description: 'Whether the user may select more than one file.',
        default: false
      },
      maxSizeMB: {
        type: 'number',
        description: 'Maximum size allowed for each file in megabytes.',
        default: 10
      },
      prompt: {
        type: 'string',
        description: 'Short explanation of why the file is needed. Can include a file path like "src/App.tsx".'
      }
    },
    required: []
  };

  const executeHandler = async (input: Record<string, unknown>): Promise<FileResult> => {
    const accept = typeof input.accept === 'string' && input.accept.trim() ? input.accept : '*';
    const multiple = input.multiple === true;
    const maxSizeMB = typeof input.maxSizeMB === 'number' && input.maxSizeMB > 0 ? input.maxSizeMB : 10;
    const prompt = typeof input.prompt === 'string' && input.prompt.trim() ? input.prompt : '';

    console.log(`🪄 [${detectedPlatform}] Magic Picker resolving:`, { accept, prompt });

    const emitEvent = (detail: Record<string, unknown>) => {
      window.dispatchEvent(new CustomEvent('magic-picker:resolve', { detail }));
    };

    emitEvent({
      file: prompt || accept || 'searching...',
      path: prompt,
      status: 'resolving'
    });

    const result = await resolveFile({ accept, multiple, maxSizeMB, prompt });

    emitEvent({
      file: result.fileName || prompt || 'unknown',
      path: prompt,
      status: result.success ? 'resolved' : 'error',
      size: result.fileSize ? formatSize(result.fileSize) : undefined,
      type: result.fileType,
      detail: result.error
    });

    return result;
  };

  // Find the best available WebMCP context
  const modelContext = findModelContext();

  if (modelContext) {
    try {
      modelContext.registerTool({
        name: TOOL_NAME,
        title: 'Request a file from the user',
        description: 'Ask the user to choose a file in the page UI and return metadata plus base64 data.',
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
      console.log(`✅ Magic Picker registered on ${detectedPlatform} via WebMCP`);
      console.log(`   Directory: ${getDirectoryName() || 'not connected'}`);
      console.log(`   Auto-discovery: agents will see magic_picker automatically`);
      return true;
    } catch (error) {
      console.error('❌ Registration failed:', error);
    }
  }

  console.warn('🪄 No WebMCP context found');
  console.warn('   Enable WebMCP: chrome://flags/#enable-webmcp-testing');
  console.warn('   Or use ChatGPT desktop app with in-app browser');
  return false;
}

export function isMagicPickerRegistered(): boolean {
  return registered;
}

export function isCrossTabCapable(): boolean {
  return registrationMode === 'native';
}

export function getRegistrationMode(): string {
  return registrationMode;
}

export function getDetectedPlatform(): string {
  return detectedPlatform;
}

export { hasDirectoryPermission, getDirectoryName, selectDirectory };

export const magicPickerToolName = TOOL_NAME;
