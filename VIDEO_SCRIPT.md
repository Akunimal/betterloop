# MagicPicker — Demo video script

Target length: 2:30–2:50. Record clear narration; no music is necessary.

## 0:00–0:25 — The dead end

Show a browser upload page and the native file dialog.

> Browser agents are good at webpages, but native file dialogs are outside the page. When an upload needs a local file, the agent can stall and the user has to take over. MagicPicker gives the agent a direct file handoff instead.

## 0:25–0:55 — Public WebMCP mode

Open `https://magic-picker.vercel.app`. Click **Activate MagicPicker — full browser access**. For the browser-only fallback, optionally click **Select project directory** and choose the prepared demo folder.

> MagicPicker registers real WebMCP tools and starts a temporary session only after this explicit user click. The activity page is the visual log. Codex keeps its own approval rules for local commands; this consent tells the browser bridge that the user wants it active for this flow.

Ask the agent to read `src/App.tsx`. Show the activity feed and returned result.

> One exact path, one tool call, and the agent keeps moving.

## 0:55–1:55 — Cross-tab upload mode

Switch to the Chromium instance launched with the unpacked MagicPicker extension. Keep the activated MagicPicker tab open, then show an upload page in another tab.

Ask the agent to call `magic_picker_attach` with the exact local path.

> In local Chromium mode, the extension adds a second WebMCP capability: `magic_picker_attach`. Codex knows which file the user asked for and passes that exact path. The extension routes the request by tab and request ID. It first tries the local MCP gateway, then falls back to the visible MagicPicker control page.

Wait for the tool result: “File prepared. Click the target file input now.” Click the upload input.

> The extension has already prepared the file, so it cancels only this prepared click, assigns the File with DataTransfer, and dispatches the normal input and change events. No native dialog appears. If the MagicPicker page closes or its heartbeat expires, the extension sleeps and this becomes an ordinary picker again.

Make one separate click without calling `magic_picker_attach`.

> Ordinary user clicks are not intercepted. The normal picker behavior remains available.

## 1:55–2:25 — Architecture and boundaries

Show the repository files: `agent.js`, `content.js`, `background.js`, and `extensionControlBridge.ts`.

> The page-facing agent uses WebMCP. The control page starts a temporary session with a heartbeat. The isolated content script relays messages, and the service worker routes to the gateway or control tab. When that session ends, pending files are cleared and normal clicks pass through. The design is deliberately scoped: it handles HTML file inputs, not arbitrary OS dialogs, Google OAuth popups, or terminal prompts.

## 2:25–2:45 — Close

Show the live URL and repository.

> MagicPicker is not another file picker. It is a reliable handoff between an agent, a local file, and the page that needs it. WebMCP gives the agent the missing capability, while human control stays intact for normal interactions. Live on Vercel and MIT licensed.

## Recording checklist

- Keep the video public and under three minutes.
- Show the live URL and the GitHub repository.
- Show the WebMCP tool name and exact path.
- Show both the resolved read and the cross-tab upload if the local setup is available.
- If the gateway is not running, demonstrate the control-page FSA fallback and say so.
- Do not claim interception of an already-open OS dialog or arbitrary Google/terminal popups.
- Say “full browser access for this temporary session,” not “silent full-computer access.”
- If mentioning the next phase, say that on-demand loading through a Codex/Chromium launcher was studied as feasible but is not implemented in this build.
