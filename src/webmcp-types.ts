export interface WebMCPExecuteOptions {
  signal?: AbortSignal
}

export interface WebMCPTool {
  name: string
  title?: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
  execute: (input: Record<string, unknown>, options?: WebMCPExecuteOptions) => Promise<unknown> | unknown
}
