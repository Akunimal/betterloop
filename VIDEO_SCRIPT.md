# MagicPicker — Video Script

Target: 2:30–2:50. Public YouTube. Clear audio required.

## 0:00–0:25 — Problem

Show browser with file dialog stuck.

> Browser agents are powerful, but they hit a wall when they need a file. The agent can't operate a native file dialog. The workflow stalls, or the user has to manually intervene. MagicPicker turns that dead end into an automatic resolution.

## 0:25–1:15 — Demo

1. Open magic-picker.vercel.app in ChatGPT embebido / Chrome with WebMCP
2. Show status: "⚡ myproject → ready" (directory already connected)
3. Show Codex requesting a file: `magic_picker({path: "src/App.tsx"})`
4. Show activity feed — file resolved instantly
5. Show the returned data in Codex's response

> One call. Codex passes the file path, MagicPicker reads it from the project directory, and the agent continues. No modal. No picker. No break.

## 1:15–1:55 — Technical

Show code briefly:

`magicPickerTool.ts` — the tool registration:
> MagicPicker registers via WebMCP's native navigator.modelContext. Codex discovers it automatically — no install, no setup.

`fileResolver.ts` — the resolution engine:
> The File System Access API maintains a persistent connection to the project directory. Path detection, directory search, recursive traversal — the file is read and returned as base64.

## 1:55–2:25 — The one-time grant

Show the directory connection flow:
> The user grants access once. That's it. IndexedDB stores the handle. Refresh the page, come back tomorrow — the connection is still there. Every subsequent call resolves automatically.

Show StatusBar:
> Platform detection works across ChatGPT Desktop, Chrome, Edge, and Codex CLI.

## 2:25–2:50 — Close

Show URL and repo.

> MagicPicker is a file resolver, not a file picker. The agent asks, the resolver answers, and the workflow never stops. MIT licensed, live at magic-picker.vercel.app.

## Checklist

- [ ] Under 3 minutes
- [ ] YouTube: Public visibility
- [ ] Clear English audio
- [ ] Show magic-picker.vercel.app
- [ ] Show directory connection
- [ ] Show file resolution via WebMCP
- [ ] Say "WebMCP" and explain registerTool
- [ ] Show GitHub repo
- [ ] No copyrighted music/trademarks
