import { resolveFile, initResolver, hasDirectoryPermission, getDirectoryName, selectDirectory } from '../state/fileResolver';
import { FileResult } from '../webmcp-types';

const TOOL_NAME = 'magic_picker';

let registered = false;
let registrationMode: 'native' | 'polyfill' | 'none' = 'none';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Register magic_picker with the browser's native WebMCP API.
 *
 * When the AI agent invokes this tool, it resolves files automatically
 * from the user's project directory without showing a picker modal.
 */
export async function registerMagicPickerTool(): Promise<boolean> {
  if (registered) return true;

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

  /**
   * Execute handler — resolves files automatically from the project directory.
   * No modal, no user interruption. The AI gets the file and continues.
   */
  const executeHandler = async (input: Record<string, unknown>): Promise<FileResult> => {
    const accept = typeof input.accept === 'string' && input.accept.trim() ? input.accept : '*';
    const multiple = input.multiple === true;
    const maxSizeMB = typeof input.maxSizeMB === 'number' && input.maxSizeMB > 0 ? input.maxSizeMB : 10;
    const prompt = typeof input.prompt === 'string' && input.prompt.trim() ? input.prompt : '';

    console.log('🪄 Magic Picker resolving:', { accept, prompt });

    const emitEvent = (detail: Record<string, unknown>) => {
      window.dispatchEvent(new CustomEvent('magic-picker:resolve', { detail }));
    };

    // Emit "resolving" status immediately
    emitEvent({
      file: prompt || accept || 'searching...',
      path: prompt,
      status: 'resolving'
    });

    // Resolve file(s) automatically — no modal
    const result = await resolveFile({ accept, multiple, maxSizeMB, prompt });

    // Emit final result
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

  // --- Strategy 1: Native WebMCP (navigator.modelContext) ---
  const nativeCtx = (navigator as any).modelContext;
  if (nativeCtx && typeof nativeCtx.registerTool === 'function') {
    try {
      nativeCtx.registerTool({
        name: TOOL_NAME,
        title: 'Request a file from the project directory',
        description: 'Resolve a file from the user\'s project directory. Returns file metadata and base64 data automatically without showing a picker.',
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
      console.log('✅ Magic Picker registered via native WebMCP (cross-tab)');
      console.log('   Project directory:', getDirectoryName() || 'not set');
      return true;
    } catch (error) {
      console.warn('🪄 Native WebMCP registration failed, trying polyfill...', error);
    }
  }

  // --- Strategy 2: Local polyfill (window.modelContext) ---
  const polyfillCtx = (window as any).modelContext;
  if (polyfillCtx && typeof polyfillCtx.registerTool === 'function') {
    try {
      polyfillCtx.registerTool({
        name: TOOL_NAME,
        title: 'Request a file from the project directory',
        description: 'Resolve a file from the user\'s project directory. Returns file metadata and base64 data automatically without showing a picker.',
        annotations: {
          readOnlyHint: true,
          untrustedContentHint: true
        },
        inputSchema,
        execute: executeHandler
      });
      registered = true;
      registrationMode = 'polyfill';
      window.dispatchEvent(new Event('magic-picker:registered'));
      console.log('✅ Magic Picker registered via local polyfill (same-tab only)');
      console.log('   Project directory:', getDirectoryName() || 'not set');
      return true;
    } catch (error) {
      console.error('❌ Magic Picker registration failed:', error);
    }
  }

  console.warn('🪄 Magic Picker: No WebMCP transport available');
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

export { hasDirectoryPermission, getDirectoryName, selectDirectory };

export const magicPickerToolName = TOOL_NAME;
