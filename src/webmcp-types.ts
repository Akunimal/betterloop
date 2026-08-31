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
  content?: string;
  files?: PickedFile[];
  fileCount?: number;
  queued?: boolean;
  attached?: boolean;
  requestId?: string;
  instruction?: string;
  provider?: 'gateway' | 'control-page' | 'public-page';
  error?: string;
}

export interface MagicPickerOptions {
  path?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  prompt?: string;
}
