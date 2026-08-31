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
 * Register magic_picker tool.
 *
 * Auto-discovery: Codex sees this tool automatically via WebMCP.
 * The tool tells Codex to connect the directory once, then all
 * subsequent calls resolve files instantly.
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
        description: 'File path relative to the project root, e.g. "src/App.tsx".'
      },
      projectDir: {
        type: 'string',
        description: 'Absolute path to the project directory. Required on first call to connect. e.g. "C:\\Users\\user\\myproject" or "/home/user/myproject". Subsequent calls can omit this.'
      }
    },
    required: []
  };

  const executeHandler = async (input: Record<string, unknown>): Promise<FileResult> => {
    const path = typeof input.path === 'string' ? input.path.trim() : '';
    const projectDir = typeof input.projectDir === 'string' ? input.projectDir.trim() : '';

    // If projectDir provided and not connected, trigger directory picker
    // The user will see a one-time browser dialog to grant access
    if (projectDir && !hasDirectoryPermission()) {
      console.log(`🪄 First call — connecting to project: ${projectDir}`);
      // We still need the browser's native picker for the one-time grant
      // but we tell the user exactly what to do
      const granted = await selectDirectory();
      if (!granted) {
        return {
          success: false,
          error: 'Directory access required. Please select your project folder once — after this, all files resolve automatically.'
        };
      }
    }

    if (!hasDirectoryPermission()) {
      return {
        success: false,
        error: 'No project directory connected. Ask the user to select their project folder on the MagicPicker page.'
      };
    }

    const searchTarget = path || '';

    console.log(`🪄 [${detectedPlatform}] Resolving:`, searchTarget);

    const emitEvent = (detail: Record<string, unknown>) => {
      window.dispatchEvent(new CustomEvent('magic-picker:resolve', { detail }));
    };

    emitEvent({
      file: searchTarget || 'searching...',
      path: searchTarget,
      status: 'resolving'
    });

    const result = await resolveFile({ path: searchTarget, maxSizeMB: 50 });

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
        title: 'Resolve files from the project directory',
        description: [
          'Read files from the user\'s project directory without opening a native file picker.',
          '',
          'First call: ask the user for their project directory path, then pass it as projectDir.',
          'The user will see a one-time browser dialog to grant access.',
          'After that, just pass the file path — no more prompts.',
          '',
          'Examples:',
          '- First call: magic_picker({ projectDir: "C:\\\\Users\\\\user\\\\myproject" })',
          '- Read file: magic_picker({ path: "src/App.tsx" })',
          '- Read file: magic_picker({ path: "package.json" })',
        ].join('\n'),
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
      console.log(`✅ magic_picker registered | Dir: ${getDirectoryName() || 'connect on first call'}`);
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
