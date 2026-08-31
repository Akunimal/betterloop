export interface WebMCPTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (input: Record<string, unknown>, options?: WebMCPExecuteOptions) => Promise<unknown>;
}

export interface WebMCPExecuteOptions {
  signal?: AbortSignal;
}

export interface PickedFile {
  fileName: string;
  fileSize: number;
  fileType: string;
  base64Data: string;
}

export interface FileResult {
  success: boolean;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  base64Data?: string;
  files?: PickedFile[];
  fileCount?: number;
  error?: string;
}

export interface MagicPickerOptions {
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  prompt?: string;
}
