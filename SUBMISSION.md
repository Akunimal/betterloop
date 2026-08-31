# MagicPicker — WebMCP Challenge Submission

## Links

- Repository: https://github.com/Akunimal/magicpicker
- Live public demo: https://magic-picker.vercel.app
- Video: `[add public video URL before submitting]`

## One-line pitch

MagicPicker gives browser agents an explicit file handoff: the agent passes the exact path the user requested, and MagicPicker resolves it without breaking the flow on a native picker.

## The problem

Browser agents operate in the web page, but native OS file dialogs sit outside the DOM. When an upload requires a file, the agent can stall, lose context, or force the user to take over.

## The solution

MagicPicker has a public WebMCP mode and an optional local Chromium bridge with one-click, temporary activation:

1. The public page registers `magic_picker_read` through `navigator.modelContext.registerTool()`.
2. The user clicks **Activate MagicPicker — full browser access** to start a visible, temporary session.
3. The agent passes the exact path instead of asking the app to guess a file.
4. In local bridge mode, `magic_picker_attach` prepares that file for the current tab.
5. The extension intercepts only the next matching prepared file-input click, injects a `File`, and dispatches normal `input`/`change` events.
6. A heartbeat ties the session to the open control page; closing it clears pending work and restores normal browser behavior.

Normal user clicks are untouched. This MVP intentionally does not claim to control arbitrary OS dialogs, Google OAuth popups, or terminal prompts.

The hosted submission demonstrates the page-scoped WebMCP flow in ChatGPT's built-in browser. The MV3 extension and temporary-session protocol are included as the local Chromium bridge. We studied an on-demand Codex/Chromium launcher or managed-extension handoff that could load the extension after explicit consent; it is feasible, but not implemented in this submission, and a webpage cannot perform that browser-level installation by itself.

## Why WebMCP

WebMCP is the agent-facing contract. The site exposes a meaningful capability with a schema and description instead of relying on DOM scraping or a hidden automation protocol. The local extension complements that contract for cross-tab upload delivery in a Chromium instance where it is explicitly loaded.

## WebMCP contract

```javascript
navigator.modelContext.registerTool({
  name: 'magic_picker_read',
  title: 'Read an exact local file',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Exact requested file path' },
      accept: { type: 'string' },
      maxSizeMB: { type: 'number' }
    },
    required: ['path']
  },
  execute: async ({ path }) => resolveFromConnectedDirectory(path)
});
```

The extension adds `magic_picker_attach` on target pages. It routes requests by `tabId` and `requestId`, prefers `devin/filesystem.read_file` through the local MCP gateway, and falls back to the visible control page's authorized handle.

## Technical highlights

- React + TypeScript + Vite frontend.
- Native WebMCP registration with a local same-tab polyfill only for development.
- File System Access API and IndexedDB handle persistence.
- MV3 extension with MAIN-world WebMCP agent and isolated content router.
- WebSocket gateway contract compatible with `I:\mcp-gateway-master`.
- Exact-path resolution; no arbitrary first-file fallback after an explicit path fails.
- Pending-file queue with accept/selector matching and 25 MB safety limit.
- Public Vercel deployment plus source and extension ZIP.

## Judge demo

### Public mode

Open the live page in a WebMCP-enabled browser, click **Activate MagicPicker**, optionally click **Select project directory** for the FSA fallback, choose a small demo project, and ask the agent to read `src/App.tsx` or `package.json`.

### Cross-tab mode

Launch Chromium with the unpacked extension, open the MagicPicker page, click **Activate MagicPicker**, then open an upload page. Grant the directory only if the gateway fallback is unavailable. Ask the agent to call:

```json
{
  "path": "C:\\demo\\assets\\logo.png",
  "accept": "image/*"
}
```

After the tool returns “File prepared”, click the target upload input. The file is assigned without a native dialog. A separate unprepared click should still open the normal picker.

## Criteria mapping

- WebMCP leverage: native `registerTool`, explicit schemas, agent-readable descriptions, and a page-scoped activation status tool.
- Execution: live Vite/Vercel page, persistent user permission, deterministic path resolver.
- Impact: prevents a common agent dead-end and preserves human control for ordinary clicks.
- Creativity: a small, defensible handoff protocol that can grow to other user interactions.

The page makes the broad browser scope explicit to the user. It does not claim silent full-computer access: the extension must already be loaded in the supported Chromium session, and Codex retains its own local-command approvals.

## License

MIT
