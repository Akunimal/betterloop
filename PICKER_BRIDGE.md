# MagicPicker — Scope & Boundary

## What it does

MagicPicker is a WebMCP file resolver. Codex passes a file path → MagicPicker reads it from the user's project directory → returns base64. No picker, no modal.

## What it resolves

| Scenario | Works | How |
|----------|-------|-----|
| File in connected directory | ✅ | Direct path via File System Access API |
| File by path (`src/App.tsx`) | ✅ | `path` parameter — reads directly |
| File by type (`image/*`) | ✅ | Directory search with accept filter |
| File outside connected directory | ❌ | User must grant different directory |
| Native OS file dialog | ❌ | Requires browser extension |
| Non-WebMCP sites (LinkedIn, etc.) | ⚠️ | Optional extension intercepts `<input type="file">` |

## File System Access API contract

1. **Grant** — User selects project directory (one-time browser dialog)
2. **Persist** — Directory handle stored in IndexedDB
3. **Restore** — Handle restored on page load, permission verified
4. **Resolve** — Agent calls `magic_picker`, file is read automatically
5. **Revoke** — User can revoke via browser permissions

## Codex-driven flow

The tool tells Codex what to do:

> "Ask the user for their project directory path, then pass it as projectDir."

This means:
- Codex asks user for the path
- User types: "C:\Users\me\myproject"
- Codex calls `magic_picker({projectDir: "..."})`
- Browser shows one-time dialog
- After that, fully automatic

## Platform support

| Platform | WebMCP | Auto-discovery | Notes |
|----------|--------|----------------|-------|
| ChatGPT Desktop | ✅ | ✅ | Best experience |
| Chrome + WebMCP | ✅ | ✅ | chrome://flags/#enable-webmcp-testing |
| Codex CLI | ✅ | ✅ | Embedded browser supports WebMCP |
| Edge | ✅ | ✅ | Chromium-based |
| Firefox | ❌ | ❌ | No WebMCP support |
| Safari | ❌ | ❌ | No WebMCP support |

## Extension scope

The Chrome extension is optional and only needed for:
- Sites that don't support WebMCP
- Intercepting `<input type="file">` on any page

It does NOT:
- Auto-install (requires manual load or `--load-extension` flag)
- Work in the browser embebido de Codex (isolated state)
- Replace the WebMCP tool (complementary, not replacement)
