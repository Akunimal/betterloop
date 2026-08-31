# ✦ Magic Picker

Magic Picker is a WebMCP file resolver for browser agents. When an AI agent needs a file, Magic Picker resolves it automatically from the user's project directory — no picker modal, no flow interruption.

**Live demo:** https://magic-picker.vercel.app

## 🎯 The Problem

AI agents running in sandboxed browsers **cannot interact with native OS dialogs** like file pickers. When a workflow reaches that boundary, the agent stalls — either losing the thread or forcing the user to manually intervene with screenshots and copy-paste.

## 💡 The Solution

Magic Picker is a **file resolver, not a file picker**:

1. **Grant once** — Select your project directory one time. Magic Picker remembers via IndexedDB.
2. **Agent requests** — The agent calls `magic_picker` with a file type or path hint.
3. **Auto-resolve** — Magic Picker searches your directory tree and reads the file automatically.
4. **No interruption** — The agent gets the data and continues without any modal or UI blocking.

The File System Access API maintains a persistent connection to the user's project directory. Subsequent agent requests resolve instantly without prompting the user again.

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:3000

### Build

```bash
npm run build
```

### Browser Extension (optional)

The extension intercepts `<input type="file">` on any website and resolves files automatically from your connected project directory.

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Connect your project directory on the Magic Picker webapp
5. File inputs on any website will now resolve automatically

## 🛠️ WebMCP Tool

### `magic_picker`

**Description:** Resolve a file from the user's project directory. Returns file metadata and base64 data automatically without showing a picker.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `accept` | string | `"*"` | File types to accept (e.g., `"image/*"`, `".pdf"`) |
| `multiple` | boolean | `false` | Allow multiple file selection |
| `maxSizeMB` | number | `10` | Maximum file size in MB |
| `prompt` | string | — | Short explanation or file path hint (e.g., `"src/App.tsx"`) |

**Returns:**

```json
{
  "success": true,
  "fileName": "App.tsx",
  "fileSize": 12345,
  "fileType": "text/typescript",
  "base64Data": "aW1wb3J0IFJlYWN0..."
}
```

## 🧭 How Resolution Works

Magic Picker uses a multi-strategy approach:

1. **Path detection** — If the prompt contains a path like `src/App.tsx`, it tries that directly.
2. **File search** — If no path is found, it walks the directory tree matching against `accept` patterns.
3. **Recursive traversal** — Skips `.git`, `node_modules`, and dotfiles automatically.

The File System Access API (`showDirectoryPicker`) requires one user interaction to grant access. After that, the directory handle is persisted in IndexedDB and restored on page load.

## 🧪 How to Test

### Option 1: Local Testing

1. Run `npm run dev`
2. Open http://localhost:3000
3. Click **Select project directory** and choose your project folder
4. The status changes to **Connected** — agents can now resolve files

### Option 2: WebMCP Testing

1. Open the app in **Chrome with WebMCP enabled** (`chrome://flags/#web-mcp`)
2. Open another tab with a WebMCP-enabled agent
3. The agent should discover `magic_picker` as an available tool
4. Ask: *"Read the file src/App.tsx"*
5. The file is resolved automatically and returned to the agent

## 🏗️ Architecture

```
AI Agent (ChatGPT, Claude, etc.)
    ↓ WebMCP call (navigator.modelContext)
magic_picker tool (auto-resolve)
    ↓ File System Access API
Project directory (persistent handle)
    ↓ Search + read
File → Base64 conversion
    ↓ Returns to agent
Agent receives file data directly
```

## 📝 Use Cases

- **Code analysis:** Agent reads source files from the project
- **Document review:** Agent accesses PDFs, markdown, or config files
- **Image processing:** Agent reads images for analysis or editing
- **Data import:** Agent loads CSV, JSON, or YAML from the project

## 🔒 Security Considerations

- Directory access requires explicit user permission (File System Access API)
- Permission is persisted but can be revoked at any time
- Files are processed entirely client-side
- No files are sent to external servers
- Maximum file size limits prevent abuse
- File type validation via `accept` parameter

## 📄 License

MIT License
