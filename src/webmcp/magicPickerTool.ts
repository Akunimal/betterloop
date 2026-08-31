import { pickerState } from '../state/pickerState';
import { FileResult } from '../webmcp-types';

export function registerMagicPickerTool() {
  // Check if WebMCP is available
  if (!(window as any).modelContext) {
    console.warn('WebMCP not available in this browser');
    return;
  }

  (window as any).modelContext.registerTool({
    name: "magic_picker",
    description: "Allows AI agents to request files from users without using native OS file dialogs. The user selects files through a web UI, and the tool returns the file as base64.",
    inputSchema: {
      type: "object",
      properties: {
        accept: {
          type: "string",
          description: "File types to accept (e.g., 'image/*', '.pdf', '.doc,.docx')",
          default: "*"
        },
        multiple: {
          type: "boolean",
          description: "Whether to allow multiple file selection",
          default: false
        },
        maxSizeMB: {
          type: "number",
          description: "Maximum file size in MB",
          default: 10
        },
        prompt: {
          type: "string",
          description: "Message to show the user explaining what file is needed",
          default: "Please select a file"
        }
      },
      required: []
    },
    execute: async (input: Record<string, unknown>): Promise<FileResult> => {
      console.log('🪄 Magic Picker invoked with options:', input);

      const options = {
        accept: (input.accept as string) || "*",
        multiple: (input.multiple as boolean) || false,
        maxSizeMB: (input.maxSizeMB as number) || 10,
        prompt: (input.prompt as string) || "Please select a file"
      };

      const result = await pickerState.requestFile(options);
      console.log('🪄 Magic Picker result:', result);
      return result;
    }
  });

  console.log('✅ Magic Picker tool registered with WebMCP');
}
