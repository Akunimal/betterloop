# 🪄 Magic Picker

A WebMCP tool that allows AI agents to request files from users without using native OS file dialogs.

## 🎯 The Problem

AI agents running in sandboxed browsers **cannot interact with native OS dialogs** like file pickers. This is a fundamental security limitation of web browsers. Computer use agents cannot simulate these dialogs because they run outside the browser context.

## 💡 The Solution

Magic Picker provides a WebMCP tool that:

1. **Receives a request** from an AI agent for a file
2. **Shows a web UI** to the user for file selection (drag & drop or click)
3. **Converts the file** to base64 and returns it directly to the agent
4. **Bypasses native OS dialogs** entirely

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

## 🛠️ WebMCP Tool

### magic_picker

**Description:** Allows AI agents to request files from users without using native OS file dialogs.

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

## 🎮 How to Test

### Option 1: Local Testing

1. Run `npm run dev`
2. Open http://localhost:3000
3. Use the **Test Panel** to simulate an agent requesting a file
4. Or use the **WebMCP Console** to invoke the tool directly

### Option 2: Real WebMCP Testing

1. Open the app in **ChatGPT's built-in browser** or **Chrome 149+** with WebMCP enabled
2. Ask ChatGPT: *"Use magic_picker to ask me for an image file"*
3. ChatGPT should invoke the WebMCP tool and show the file picker UI
4. Select a file, and ChatGPT will receive it as base64

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
