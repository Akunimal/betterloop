// Local polyfill for development/testing when WebMCP is not enabled in the browser.
// In production with WebMCP-enabled Chrome, navigator.modelContext is native
// and this polyfill is NOT installed.

const hasNativeWebMCP = !!(navigator as any).modelContext;

if (hasNativeWebMCP) {
  console.log('🪄 WebMCP native API detected — polyfill skipped');
} else {
  // Install minimal local polyfill for same-tab testing only.
  // Cross-tab will NOT work with this — only native WebMCP does that.

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

    unregisterTool(name: string) {
      this.tools.delete(name);
    }

    getTool(name: string): ToolDefinition | undefined {
      return this.tools.get(name);
    }

    getTools(): ToolDefinition[] {
      return Array.from(this.tools.values());
    }

    async invokeTool(name: string, input: any): Promise<any> {
      const tool = this.tools.get(name);
      if (!tool) throw new Error(`Tool not found: ${name}`);
      console.log(`🪄 [Polyfill] Invoking tool: ${name}`, input);
      return tool.execute(input);
    }
  }

  (window as any).modelContext = new WebMCPPolyfill();
  console.log('🪄 WebMCP local polyfill activated (same-tab testing only)');
}
