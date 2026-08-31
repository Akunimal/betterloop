// Polyfill for testing WebMCP in browsers that don't support it natively

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  execute: (input: any) => Promise<any>;
}

class WebMCPPolyfill {
  private tools: Map<string, ToolDefinition> = new Map();

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

// Only apply polyfill if WebMCP is not natively available
if (!(window as any).modelContext) {
  (window as any).modelContext = new WebMCPPolyfill();
  console.log('🪄 WebMCP polyfill activated for testing');
}
