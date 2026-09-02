import type { WebMCPExecuteOptions, WebMCPTool } from '../webmcp-types.ts'

export interface ModelContextLike {
  registerTool: (tool: WebMCPTool, options?: { signal?: AbortSignal; exposedTo?: string[] }) => Promise<unknown> | unknown
  getTools: (options?: { fromOrigins?: string[] }) => Promise<unknown[]> | unknown[]
  executeTool?: (tool: unknown, input?: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>
  unregisterTool?: (name: string) => void
  __mcpationPolyfill?: boolean
}

type MCPationDocument = Document & { modelContext?: ModelContextLike }

class LocalModelContext implements ModelContextLike {
  readonly __mcpationPolyfill = true
  private tools = new Map<string, WebMCPTool>()

  async registerTool(tool: WebMCPTool): Promise<void> {
    this.tools.set(tool.name, tool)
    window.dispatchEvent(new CustomEvent('mcpation:registered'))
  }

  unregisterTool(name: string): void {
    this.tools.delete(name)
    window.dispatchEvent(new CustomEvent('mcpation:registered'))
  }

  getTools(): WebMCPTool[] {
    return [...this.tools.values()]
  }

  async executeTool(tool: unknown, input: Record<string, unknown> = {}, options?: { signal?: AbortSignal }): Promise<unknown> {
    return (tool as WebMCPTool).execute(input, options as WebMCPExecuteOptions)
  }
}

const page = document as MCPationDocument
const nativeModelContext = page.modelContext

if (!nativeModelContext) {
  page.modelContext = new LocalModelContext()
  console.info('[MCPation] Local WebMCP fallback active. Native discovery is unavailable in this browser.')
} else {
  console.info('[MCPation] Native document.modelContext detected.')
}

export function getModelContext(): ModelContextLike {
  return page.modelContext!
}

export function getWebMCPMode(): 'native' | 'polyfill' | 'none' {
  if (!page.modelContext) return 'none'
  return page.modelContext.__mcpationPolyfill ? 'polyfill' : 'native'
}
