# MagicPicker — WebMCP Challenge Submission

## Links

- **Repository:** https://github.com/Akunimal/magicpicker
- **Live demo:** https://magic-picker.vercel.app
- **Video:** [YouTube URL]

## Problem

AI agents in browsers can't operate native file dialogs. When a workflow needs a file, the agent stalls or the user intervenes manually with screenshots and copy-paste.

## Solution

MagicPicker is a WebMCP file resolver. Codex passes a file path → MagicPicker reads it from the project directory → agent continues. No picker, no modal, no break.

### How it works

1. Codex discovers `magic_picker` via WebMCP auto-discovery
2. User grants directory access once (one-time browser dialog)
3. Codex calls `magic_picker({path: "src/App.tsx"})`
4. MagicPicker reads the file and returns base64
5. Agent continues without interruption

### Before / After

- **Before:** Agent hits native file dialog → workflow stalls → user intervenes
- **After:** Agent calls `magic_picker` → file resolves automatically → workflow continues

## Why WebMCP

WebMCP is the contract between page and agent: the page registers a tool (`magic_picker`), the agent invokes it by name, and the page resolves the file. No extensions needed, no native dialogs, no flow break.

## Technical implementation

```javascript
navigator.modelContext.registerTool({
  name: "magic_picker",
  description: "Read files from the project directory. Pass the file path.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path, e.g. src/App.tsx" },
      projectDir: { type: "string", description: "Project root path (first call)" }
    }
  },
  execute: async (input) => {
    // File System Access API → read file → return base64
  }
});
```

### Key features

- **Auto-discovery** — WebMCP registers silently, agents find it automatically
- **One-time grant** — File System Access API, persisted via IndexedDB
- **Direct path resolution** — Codex passes path, MagicPicker reads it
- **Platform detection** — Works in ChatGPT Desktop, Chrome, Edge, Codex CLI
- **Optional extension** — Intercepts `<input type="file">` on non-WebMCP sites

## Judging criteria

### WebMCP Leverage
- Native `navigator.modelContext.registerTool()` — no polyfill in production
- Proper input schema with path and projectDir parameters
- Async execution with automatic resolution

### Execution
- Complete React + TypeScript implementation
- Deployed to Vercel, working live demo
- File System Access API + IndexedDB persistence

### Potential Impact
- **Before:** Impossible for browser agents to access files without stalling
- **After:** Agents resolve files automatically from the project directory
- **Use cases:** Code analysis, document review, image processing, data import

### Creativity & Ambition
- File resolver, not file picker — the agent never loses the thread
- Codex-driven flow — tool tells agent what to ask
- Multi-platform: ChatGPT Desktop, Chrome, Edge, Codex CLI
- Optional extension for non-WebMCP sites

## Video script (2:30)

0:00–0:25 — Problem: browser agents hit a wall with file dialogs
0:25–1:15 — Demo: Codex requests file, MagicPicker resolves, agent continues
1:15–1:55 — Technical: WebMCP registration, File System Access API, path resolution
1:55–2:25 — Persistence: IndexedDB, one-time grant, platform support
2:25–2:50 — Close: URL, repo, impact

## License

MIT
