# Magic Picker — WebMCP Challenge Submission

## 📋 Project Overview

**Magic Picker** is a WebMCP file resolver for browser agents. When an AI agent needs a file, Magic Picker resolves it automatically from the user's project directory — no picker modal, no flow interruption.

## 🔗 Links

- **Repository:** https://github.com/Akunimal/magicpicker
- **Live Demo:** https://magic-picker.vercel.app
- **Video Demo:** [YouTube URL — record using VIDEO_SCRIPT.md]

## 🎯 Problem Solved

AI agents running in web browsers hit a wall when they need a file. The agent can't operate native OS file dialogs, so the workflow stalls — or the user has to manually intervene with screenshots, copy-paste, and context switching.

## Why WebMCP is the right fit

WebMCP is the contract between the page and the agent: the page advertises a precise action (`magic_picker`), the agent invokes it by name, and the page resolves the file automatically. No modal, no human interruption, no flow break.

## Before and after

- **Before:** The agent reaches a native file dialog it cannot operate. The workflow stalls, or the user has to manually provide the file.
- **After:** The agent calls `magic_picker` with a file path or type. Magic Picker resolves it instantly from the project directory. The agent continues without interruption.

## 💡 Solution

Magic Picker provides a WebMCP file resolver that:

1. **Grants once** — User selects their project directory one time
2. **Resolves automatically** — When the agent requests a file, it's found and read instantly
3. **Returns base64** — File data is returned directly to the agent
4. **Persists access** — IndexedDB stores the directory handle between sessions

The File System Access API maintains a persistent connection to the user's project directory. No modal appears. The agent keeps moving.

## 🛠️ Technical Implementation

### WebMCP Tool Registration

```javascript
// Registers with navigator.modelContext (native WebMCP) or window.modelContext (polyfill)
navigator.modelContext.registerTool({
  name: "magic_picker",
  title: "Resolve a file from the project directory",
  description: "Find and read a file automatically without showing a picker",
  inputSchema: {
    type: "object",
    properties: {
      accept: { type: "string" },
      multiple: { type: "boolean" },
      maxSizeMB: { type: "number" },
      prompt: { type: "string", description: "File path or description" }
    }
  },
  execute: async (input) => {
    // Auto-resolve: path detection → file search → read → base64
  }
});
```

### Key Features

- **Auto-resolve** — No modal, no user interruption
- **Path detection** — Extracts file paths from agent prompts
- **File search** — Walks directory tree matching accept patterns
- **Persistent access** — IndexedDB stores directory handle
- **WebMCP native** — Cross-tab routing via navigator.modelContext

## 📊 Judging Criteria Alignment

### WebMCP Leverage ✅
- Uses native WebMCP API (`navigator.modelContext.registerTool`)
- Proper input schema with file type, size, and path parameters
- Async execution with automatic resolution
- Cross-tab routing via WebMCP native transport

### Execution ✅
- Complete React + TypeScript implementation
- File System Access API integration
- IndexedDB persistence
- Build process for production

### Potential Impact ✅
- **Before:** Impossible for browser agents to access files without stalling
- **After:** Agents resolve files automatically from the project directory
- **Use cases:** Code analysis, document review, image processing, data import

### Creativity & Ambition ✅
- File resolver instead of file picker — the agent never loses the thread
- Multi-strategy resolution: path detection, file search, recursive traversal
- Persistent directory access without repeated user prompts
- Native WebMCP for cross-tab agent communication

## 🎥 Video Demo Script (3 minutes)

**0:00-0:30:** Problem — Browser agents can't access files without stalling the workflow

**0:30-1:30:** Demo — Show agent requesting a file, Magic Picker resolving it automatically, agent continuing

**1:30-2:30:** Technical — Show File System Access API, path detection, WebMCP registration

**2:30-3:00:** Impact — The agent-native web where files resolve themselves

## 🚀 Setup Instructions

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
4. Open http://localhost:3000
5. Click **Select project directory** and choose your project folder
6. For WebMCP testing: Open in Chrome with `chrome://flags/#web-mcp` enabled

## 📄 License

MIT License
