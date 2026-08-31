export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  execute: (input: any) => Promise<any>;
}

export interface FileResult {
  success: boolean;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  base64Data?: string;
  error?: string;
}

export interface MagicPickerOptions {
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  prompt?: string;
}
