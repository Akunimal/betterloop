import { pickerState } from '../state/pickerState';
import { FileResult, WebMCPExecuteOptions } from '../webmcp-types';

const TOOL_NAME = 'magic_picker';
type ModelContextLike = {
  registerTool: (tool: unknown) => void | Promise<void>;
  getTool?: (name: string) => unknown;
  getTools?: () => Promise<Array<{ name?: string }>>;
};

let registeredContext: ModelContextLike | null = null;
let inFlightRegistration: Promise<boolean> | null = null;

function getModelContext(): ModelContextLike | null {
  const documentContext = (document as Document & { modelContext?: ModelContextLike }).modelContext;
  const windowContext = (window as Window & { modelContext?: ModelContextLike }).modelContext;
  return documentContext || windowContext || null;
}

export async function registerMagicPickerTool(): Promise<boolean> {
  const modelContext = getModelContext();

  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    console.warn('WebMCP not available in this browser');
    return false;
  }

  if (registeredContext === modelContext) {
    return true;
  }

  if (inFlightRegistration) {
    return inFlightRegistration;
  }

  const registration = (async () => {
    if (typeof modelContext.getTool === 'function' && modelContext.getTool(TOOL_NAME)) {
      registeredContext = modelContext;
      return true;
    }

    if (typeof modelContext.getTools === 'function') {
      try {
        const tools = await modelContext.getTools();
        if (tools.some(tool => tool.name === TOOL_NAME)) {
          registeredContext = modelContext;
          return true;
        }
      } catch {
        // Some early WebMCP implementations expose registration but not discovery.
      }
    }

    const tool = {
      name: TOOL_NAME,
      title: 'Request a file from the user',
      description: 'Ask the user to choose a file in the page UI. Returns file metadata and base64 data without requiring the agent to operate a native file dialog.',
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: true
      },
      inputSchema: {
        type: 'object',
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
            description: 'Short explanation of why the file is needed.',
            default: 'Please select a file'
          }
        },
        required: []
      },
      execute: async (
        input: Record<string, unknown>,
        options: WebMCPExecuteOptions = {}
      ): Promise<FileResult> => {
        console.log('🪄 Magic Picker invoked with options:', input);

        const pickerOptions = {
          accept: typeof input.accept === 'string' && input.accept.trim() ? input.accept : '*',
          multiple: input.multiple === true,
          maxSizeMB: typeof input.maxSizeMB === 'number' && input.maxSizeMB > 0 ? input.maxSizeMB : 10,
          prompt: typeof input.prompt === 'string' && input.prompt.trim() ? input.prompt : 'Please select a file'
        };

        const result = await pickerState.requestFile(pickerOptions, options.signal);
        console.log('🪄 Magic Picker result:', result);
        return result;
      }
    };

    try {
      await modelContext.registerTool(tool);
      registeredContext = modelContext;
      window.dispatchEvent(new Event('magic-picker:registered'));
      console.log('✅ Magic Picker tool registered with WebMCP');
      return true;
    } catch (error) {
      console.error('❌ Magic Picker registration failed:', error);
      return false;
    } finally {
      inFlightRegistration = null;
    }
  })();

  inFlightRegistration = registration;
  return registration;
}

export function isMagicPickerRegistered(): boolean {
  return registeredContext !== null;
}

export const magicPickerToolName = TOOL_NAME;
