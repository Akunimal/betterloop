# ✦ Magic Picker

Magic Picker is a focused human-handoff tool for browser agents. It lets an agent ask the user for a file through a page-owned UI, so the agent never has to operate a native file dialog itself.

## 🎯 The Problem

AI agents running in sandboxed browsers **cannot interact with native OS dialogs** like file pickers. This is a fundamental security limitation of web browsers. Computer use agents cannot simulate these dialogs because they run outside the browser context.

## 💡 The Solution

Magic Picker provides a WebMCP handoff that:

1. **Receives a request** from an AI agent for a file
2. **Shows a web UI** to the user for file selection (drag & drop or click)
3. **Converts the file** to base64 and returns it directly to the agent
4. **Cancels cleanly** if the browser host aborts the tool or unloads the page

This does not intercept arbitrary OS dialogs, browser chrome, OAuth popups, or terminal prompts. Those surfaces belong to the host or the CLI. See [PICKER_BRIDGE.md](PICKER_BRIDGE.md) for the boundary and the path to future handoff adapters.

This makes file selection **possible** in scenarios where it was previously **impossible**.

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

The public repository includes an MIT `LICENSE` file so the project is visibly open source to reviewers.

## 🛠️ WebMCP Tool

### `magic_picker`

**Description:** Ask the user to choose a file in the page UI and return metadata plus base64 data.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `accept` | string | `"*"` | File types to accept (e.g., `"image/*"`, `".pdf"`) |
| `multiple` | boolean | `false` | Allow multiple file selection |
| `maxSizeMB` | number | `10` | Maximum file size in MB |
| `prompt` | string | `"Please select a file"` | Message shown to the user |

**Returns:**

```json
{
  "success": true,
  "fileName": "example.png",
  "fileSize": 123456,
  "fileType": "image/png",
  "base64Data": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

When `multiple` is `true`, the result includes a `files` array and `fileCount`. File data is processed entirely in the browser.

## 🧭 Navigation and popup boundary

WebMCP tools are tab-bound. The current WebMCP draft passes an `AbortSignal` to every tool execution and cancels pending executions when the relevant document is destroyed. Magic Picker listens for that cancellation and closes its UI, but a normal web page cannot keep the original agent promise alive after a top-level navigation.

For Google Cloud CLI authentication, prefer the CLI's console/device paths when a browser popup is unreliable:

```bash
gcloud init --console-only
gcloud auth login --no-launch-browser
```

Interception of terminal prompts, OAuth windows, and OS-level dialogs requires a Codex/ChatGPT host integration, browser extension, or local companion process; it is outside the authority of a Vercel-hosted page.

## 🎮 How to Test

### Option 1: Local Testing

1. Run `npm run dev`
2. Open http://localhost:3000
3. Use the **Test Panel** to simulate an agent requesting a file
4. Or use the **WebMCP Console** to list the tool; direct invocation is available in the local polyfill preview

### Option 2: Real WebMCP Testing

1. Open the app in **ChatGPT's built-in browser** or **Chrome 149+** with WebMCP enabled
2. Ask ChatGPT: *"Use magic_picker to ask me for an image file"*
3. ChatGPT should invoke the WebMCP tool and show the file picker UI
4. Select a file, and ChatGPT will receive it as base64

For the submission recording, use [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md). The implementation boundary and gcloud/OAuth guidance are in [PICKER_BRIDGE.md](PICKER_BRIDGE.md).

## 🏗️ Architecture

```
AI Agent (ChatGPT, Claude, etc.)
    ↓ WebMCP call
magic_picker tool
    ↓ Shows UI
Web-based file picker (drag & drop / click)
    ↓ User selects file
File → Base64 conversion
    ↓ Returns to agent
Agent receives file data directly
```

The same handoff pattern could later support confirmations or forms, but this submission intentionally keeps one concrete tool: `magic_picker`.

## 📝 Use Cases

- **Document analysis:** Agent requests a PDF from the user
- **Image processing:** Agent asks for an image to edit or analyze
- **Data import:** Agent requests a CSV or JSON file
- **Media upload:** Agent collects photos/videos from the user

## 🔒 Security Considerations

- Files are processed entirely client-side
- No files are sent to external servers
- Maximum file size limits prevent abuse
- File type validation via `accept` parameter

## 📄 License

MIT License
