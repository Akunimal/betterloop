# ✦ MagicPicker

MagicPicker is a WebMCP file handoff for browser agents. The agent supplies the exact path the user requested; MagicPicker resolves that file without opening a native picker. In local Chromium mode, it can also prepare the file for an HTML upload in another tab.

Live public page: https://magic-picker.vercel.app
Repository: https://github.com/Akunimal/magicpicker

## What is solved

Native OS dialogs are outside the DOM and can block an agent. MagicPicker gives the agent an explicit capability instead:

1. The agent calls `magic_picker_read` with the exact path.
2. A configured local provider reads the bytes.
3. For an upload, the agent calls `magic_picker_attach` before clicking the file input.
4. The extension delivers the prepared file to that tab and cancels only that prepared native click.

Normal user clicks remain normal. An already-open OS dialog cannot be intercepted after the fact, and Google OAuth or terminal dialogs are outside this MVP's scope.

## One-click temporary activation

The public page has a large **Activate MagicPicker — full browser access** button. This is explicit product consent for a temporary browser session, not a silent installation and not a replacement for Codex's own command approvals.

While the session is active, MagicPicker can coordinate the tabs in the supported browser session, resolve the exact path supplied by the agent, prepare an HTML file input, and show the activity log. The session is kept alive by a heartbeat and ends when the user deactivates it, closes or navigates away from the control page, or the heartbeat expires. The extension may remain loaded in the browser profile, but it is dormant outside an active session and does not intercept normal clicks.

The local WebSocket gateway is also opened only when the session is active; it is not contacted merely because the extension exists in the profile.

The project directory button is an optional fallback for the public browser-only demo. In local mode, the preferred route is the local MCP gateway, so the user can activate the session and let Codex provide the exact local path without a second file-selection flow.

The page also exposes `magic_picker_activate` so Codex can verify that the user-authorized session is live. A webpage cannot push a new prompt into Codex or bypass Codex's approval policy; after activation, Codex discovers/uses the available tool according to its normal browser and local-command rules.

The hosted demo is the embedded-browser WebMCP path. The optional cross-tab extension is packaged and ready for a supported local Chromium launch. We studied an on-demand Codex/Chromium launcher or managed-extension handoff that could load it after the user's explicit consent; that integration is feasible but is not implemented in this submission. A web page alone cannot perform that browser-level installation.

## Two supported modes

### Public WebMCP mode

Open the live page in a WebMCP-enabled browser, click **Activate MagicPicker** if you want the temporary bridge, and optionally click **Select project directory** for browser-only file access. The page registers `magic_picker_read`, `magic_picker_activate` (plus the backwards-compatible `magic_picker` alias). Same-page mode needs no extension or local server.

### Local cross-tab bridge

Use a Chromium instance launched with the unpacked MV3 extension. Open the MagicPicker page in that same instance, click **Activate MagicPicker**, then browse to the target upload page. The extension registers:

- `magic_picker_read`: read the exact path and return content/metadata.
- `magic_picker_attach`: prepare the exact path for the current tab, then click its HTML file input.

The extension first calls `devin/filesystem.read_file` through the local MCP gateway at `ws://127.0.0.1:8765/ws`. If that provider is unavailable or cannot return bytes for an upload, it asks the visible MagicPicker control page to read through its user-granted File System Access handle.

## Quick start

```powershell
npm install
npm run dev
```

Open `http://localhost:3000` and click **Activate MagicPicker**. Connect a directory only if you need the browser-only FSA fallback. For a production build:

```powershell
npm run build
```

Vercel can deploy this Vite project with the default build command and output directory `dist`.

## Load the local extension

The distributable is `public/extension.zip`. Extract it and load the extracted folder as an unpacked extension, or launch the supported Chromium instance with:

```text
--load-extension=C:\path\to\magicpicker-extension
```

The extension is not silently installed into an existing browser profile. It must be loaded at browser startup or through the browser's developer/managed extension mechanism. CDP can be used to inspect the running tabs and service worker, but the extension message channel is the file data plane.

## Exact attach flow

```text
Codex sees magic_picker_attach
  → magic_picker_attach({ path: "C:\\work\\demo\\image.png" })
  → gateway or control page resolves exact path
  → extension queues bytes for the originating tab
  → Codex clicks that tab's <input type="file">
  → only the prepared click is cancelled
  → File is assigned with DataTransfer and input/change are dispatched
```

The target must be a normal web page with an HTML `<input type="file">`. The extension does not guess which file the user meant: the agent supplies `path`.

## Security and boundaries

- Directory access is granted by an explicit user gesture and persisted as a browser handle.
- Browser bridge access is explicit, visible, temporary, and revocable from the page; it is not a claim of silent full-computer access.
- Codex retains its own approval rules for launching local processes and accessing files outside its selected workspace.
- Closing/navigating away from the control page or losing its heartbeat disables the bridge and clears pending file queues.
- The public page never opens a picker during a WebMCP tool call.
- The local extension accepts exact paths and limits transferred files to 25 MB.
- The extension does not upload files to a third-party service; the optional gateway is local.
- The extension has broad page coverage because it must reach the target tab; load it only in a Chromium profile you trust.
- The extension's content script can be present in the profile, but it stays dormant until the control page starts a user-authorized session.

## Verification

```powershell
npm run build
node scripts/final-check.cjs
node --check extension/background.js
node --check extension/content.js
node --check extension/agent.js
```

## Stack and license

React 18, TypeScript, Vite, WebMCP, File System Access API, IndexedDB, MV3, and a WebSocket MCP gateway contract. MIT licensed.
