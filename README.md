# ✦ MagicPicker

WebMCP file resolver for browser agents. Codex passes a file path → MagicPicker reads it. No picker, no modal, no break.

**Live:** https://magic-picker.vercel.app

## The problem

AI agents in browsers can't operate native file dialogs. When a workflow needs a file, the agent stalls — or the user intervenes manually.

## The solution

MagicPicker is a WebMCP tool that resolves files from the user's project directory:

1. **Codex discovers** `magic_picker` via WebMCP auto-discovery
2. **User grants once** — selects project directory (one-time browser dialog)
3. **Codex passes path** — `magic_picker({path: "src/App.tsx"})`
4. **File resolved** — returned as base64, agent continues

After the one-time grant, every subsequent call resolves instantly with zero user interaction.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## WebMCP tool

### `magic_picker`

Reads a file from the connected project directory.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | File path relative to project root (e.g. `"src/App.tsx"`) |
| `projectDir` | string | Absolute path to project directory (first call only) |

**Returns:** `{ success, fileName, fileSize, fileType, base64Data }`

## How resolution works

1. **Direct path** — if `path` is provided, reads it directly
2. **Path extraction** — extracts path from text prompts
3. **File search** — walks directory tree matching patterns

Handles absolute Windows paths (`C:\Users\...\src\App.tsx`), relative paths (`./src/App.tsx`), and bare filenames (`App.tsx`).

## Browser extension (optional)

For sites without WebMCP, the extension intercepts `<input type="file">` on any page.

```powershell
# Auto-install for Codex CLI:
$zip = "$env:TEMP\magicpicker-extension.zip"
Invoke-WebRequest -Uri "https://magic-picker.vercel.app/extension.zip" -OutFile $zip
Expand-Archive -Path $zip -DestinationPath "$env:TEMP\magicpicker-ext" -Force
```

Load with: `--load-extension="$env:TEMP\magicpicker-ext"`

## Architecture

```
Codex CLI
  ↓ WebMCP call
magic_picker tool (auto-resolve)
  ↓ File System Access API
Project directory (persistent handle via IndexedDB)
  → base64 → returned to Codex
```

## Tech stack

- React 18 + TypeScript + Vite
- File System Access API (showDirectoryPicker)
- WebMCP (navigator.modelContext.registerTool)
- IndexedDB (directory handle persistence)

## License

MIT
