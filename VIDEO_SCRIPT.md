# Magic Picker — Video Demo Script

Target length: 2:30–2:50. The video must be public on YouTube and include clear audio.

## 0:00–0:25 — The problem

Show the landing hero and say:

> Browser agents are powerful, but they hit a wall when they need a file. The agent can't operate a native file dialog, so the workflow stalls — or the user has to manually intervene. Magic Picker turns that dead end into an automatic resolution.

## 0:25–1:15 — The working demo

1. Open the app at magic-picker.vercel.app
2. Click **Select project directory** and choose a project folder
3. Show the status change to **Connected**
4. Say:

> One time. That's all it takes. Magic Picker now has persistent access to your project directory via the File System Access API.

5. Open another tab with a WebMCP-enabled agent (or simulate the call)
6. Show the agent requesting a file: *"Read the file src/App.tsx"*
7. Show the resolver log — the file appears instantly
8. Say:

> No modal. No picker. The agent asked, Magic Picker found and read the file automatically, and the agent continues without interruption.

## 1:15–1:55 — The technical flow

Show the code architecture and say:

> Magic Picker registers via WebMCP's native navigator.modelContext. When the agent invokes magic_picker, the tool uses path detection to extract the file path from the prompt. If no path is found, it walks the directory tree matching against accept patterns. The file is read via the File System Access API and returned as base64.

Show `src/state/fileResolver.ts` briefly, highlighting:
- `extractPathFromPrompt()` — smart path detection
- `walkDirectory()` — recursive file search
- `readFileFromHandle()` — File System Access API read

Show `src/webmcp/magicPickerTool.ts` briefly, highlighting:
- `navigator.modelContext.registerTool()` — native WebMCP registration
- `executeHandler` — auto-resolve without modal

## 1:55–2:25 — The persistence story

Show the IndexedDB storage and say:

> The directory handle persists in IndexedDB between sessions. Refresh the page, come back tomorrow — the connection is still there. The user can revoke access at any time through the browser's permission system.

Show the StatusBar indicating **WebMCP: native (cross-tab)** and say:

> When WebMCP is enabled, agents in other tabs can discover and invoke magic_picker. The browser handles the routing. No extensions needed.

## 2:25–2:50 — Close

Show the public URL and repository, then say:

> Magic Picker is a file resolver, not a file picker. The agent asks, the resolver answers, and the workflow never stops. The code, live demo, and setup instructions are public.

## Recording checklist

- [ ] Keep the video under three minutes.
- [ ] Make the YouTube visibility **Public**, not Unlisted.
- [ ] Record clear narration/audio throughout.
- [ ] Use your own voice or an AI voice; if the narration is not English, add English subtitles or translation.
- [ ] Show the public URL in the browser.
- [ ] Show the directory connection and auto-resolution working.
- [ ] Say the words "WebMCP" and explain where `registerTool` is used.
- [ ] Show the public repository and `LICENSE` file.
- [ ] Do not include copyrighted music, third-party trademarks, or other material without permission.
