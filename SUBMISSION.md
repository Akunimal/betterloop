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
4. `magic_picker_tabs` lets Codex choose the destination tab without reading its contents.
5. `magic_picker_attach` prepares that exact file in the chosen tab through the Codex CDP runtime or the MV3 extension.
6. The browser-side handoff assigns the file and dispatches normal `input`/`change` events; ordinary clicks remain ordinary.
7. A heartbeat ties the session to the open control page; closing it clears pending work and restores normal browser behavior.

Normal user clicks are untouched. This MVP intentionally does not claim to control arbitrary OS dialogs, Google OAuth popups, or terminal prompts.

The hosted submission demonstrates the page-scoped WebMCP flow in ChatGPT's built-in browser. The repository also includes the Codex embedded-browser adapter: Codex starts it as an approved local command with its CDP endpoint, so no external browser or dynamic extension installation is needed. The MV3 extension remains a supported alternative in Chromium sessions where extensions are already loaded.

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

The control page exposes `magic_picker_tabs` and `magic_picker_attach`. In Codex mode, `scripts/codex-magic-picker.cjs` routes through the embedded browser's CDP targets. In extension mode, `background.js` routes by tab and request id, prefers `devin/filesystem.read_file` through the local MCP gateway, and falls back to the visible control page's authorized handle.

## Technical highlights

- React + TypeScript + Vite frontend.
- Native WebMCP registration with a local same-tab polyfill only for development.
- File System Access API and IndexedDB handle persistence.
- MV3 extension with MAIN-world WebMCP agent and isolated content router.
- Codex CDP adapter that stays inside the approved embedded-browser session.
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

### Codex embedded mode

Run the adapter with the CDP endpoint supplied by the Codex browser host:

```powershell
node scripts/codex-magic-picker.cjs --cdp-endpoint $env:CODEX_BROWSER_CDP_ENDPOINT
```

Click **Activate MagicPicker**, call `magic_picker_tabs`, then call `magic_picker_attach` with the exact path and returned `targetTabId`. The adapter assigns the file directly to the HTML input in that embedded session.

## Criteria mapping

- WebMCP leverage: native `registerTool`, explicit schemas, agent-readable descriptions, and a page-scoped activation status tool.
- Execution: live Vite/Vercel page, persistent user permission, deterministic path resolver.
- Impact: prevents a common agent dead-end and preserves human control for ordinary clicks.
- Creativity: a small, defensible handoff protocol that can grow to other user interactions.

The page makes the broad browser scope explicit to the user. It does not claim silent full-computer access: the local adapter needs an approved Codex command and an endpoint explicitly supplied by the host; the extension must already be loaded when that route is used. Codex retains its own local-command approvals.

## License

MIT
