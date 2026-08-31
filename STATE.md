# MagicPicker — State

Last updated: 2026-09-02

## Project

**What:** WebMCP file resolver — Codex passes path, MagicPicker reads file, no picker.
**Repo:** https://github.com/Akunimal/magicpicker
**Live:** https://magic-picker.vercel.app
**Stack:** React 18 + TypeScript + Vite

## Architecture

```
Codex CLI → WebMCP → magic_picker({path: "src/App.tsx"})
  → File System Access API → Project directory (IndexedDB handle)
  → base64 → returned to Codex
```

## Key decisions

| Decision | Reason |
|----------|--------|
| Codex-driven flow | Tool tells Codex to ask user for projectDir, not the other way around |
| One-time grant | File System Access API — user clicks Allow once, then automatic |
| Direct path parameter | Codex passes `path: "src/App.tsx"` — no text parsing needed |
| WebMCP native first | Auto-discovery via navigator.modelContext, no install required |
| Optional extension | For non-WebMCP sites, extension intercepts `<input type="file">` |
| Ultra-minimal UI | Header + directory status + activity log — nothing else |
| Base64 output | Standard format agents can process directly |
| IndexedDB persistence | Directory handle survives page refreshes |

## File structure

```
src/
├── main.tsx                  # Entry: register tool, render App
├── App.tsx                   # Minimal: header + DirectorySetup + ResolverLog
├── styles.css                # 5KB — minimal dark theme
├── webmcp-types.ts           # TypeScript interfaces
│
├── webmcp/
│   ├── magicPickerTool.ts    # WebMCP tool registration
│   ├── polyfill.ts           # Local polyfill for testing
│   └── fsa.d.ts              # File System Access API types
│
├── state/
│   └── fileResolver.ts       # Resolution engine
│
└── components/
    ├── DirectorySetup.tsx     # One-time directory connect
    ├── ResolverLog.tsx        # Activity feed
    └── StatusBar.tsx          # Tool status indicator

extension/
├── manifest.json              # MV3 Chrome extension
├── interceptor.js             # Content script: intercepts <input type="file">
└── background.js              # Service worker: reads files from directory
```

## Tool flow

```
1. Codex visits magic-picker.vercel.app
2. magic_picker auto-registers via WebMCP
3. Codex: "What's your project directory?"
4. User: "C:\Users\me\myproject"
5. Codex: magic_picker({projectDir: "C:\\Users\\me\\myproject"})
6. Browser: "Allow access to myproject?" → User clicks Allow
7. Codex: magic_picker({path: "src/App.tsx"})
8. MagicPicker: reads file → returns base64
9. Codex continues — no interruption
```

## Status

- ✅ WebMCP tool registered and working
- ✅ File System Access API + IndexedDB persistence
- ✅ Direct path resolution (absolute, relative, bare filenames)
- ✅ Minimal frontend deployed to Vercel
- ✅ Browser extension for non-WebMCP sites
- ✅ Auto-install command for Codex CLI
- ✅ Platform detection (ChatGPT, Chrome, Edge, Firefox, Safari)
- ✅ Activity feed with toast notifications
- ✅ Deployed to https://magic-picker.vercel.app
- ⬜ Video demo
- ⬜ Devpost submission
