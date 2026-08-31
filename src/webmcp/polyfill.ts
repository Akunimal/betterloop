// Polyfill for testing WebMCP in browsers that don't support it natively

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  execute: (input: any) => Promise<any>;
}

class WebMCPPolyfill {
  private tools: Map<string, ToolDefinition> = new Map();
  readonly __magicPickerPolyfill = true;

  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
    console.log(`🪄 [Polyfill] Tool registered: ${tool.name}`);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  async invokeTool(name: string, input: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    console.log(`🪄 [Polyfill] Invoking tool: ${name}`, input);
    const result = await tool.execute(input);
    console.log(`🪄 [Polyfill] Tool result:`, result);
    return result;
  }
}

// Only apply the fallback if neither the page nor the host already provides
// WebMCP. Some host browsers expose document.modelContext as a read-only
// property, so never try to overwrite it.
const existingWindowContext = (window as any).modelContext;
const existingDocumentContext = (document as any).modelContext;

if (!existingWindowContext && !existingDocumentContext) {
  const polyfill = new WebMCPPolyfill();
  (window as any).modelContext = polyfill;
  console.log('🪄 WebMCP polyfill activated for testing');
}
