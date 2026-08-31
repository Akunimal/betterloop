# Magic Picker — WebMCP Challenge Submission

## 📋 Project Overview

**Magic Picker** is a focused human-handoff tool for browser agents. It lets an agent request a file from a person through a page-owned UI, keeping the agent out of the native file-dialog dead end.

## 🔗 Links

- **Repository:** https://github.com/Akunimal/magicpicker
- **Live Demo:** https://magic-picker.vercel.app
- **Video Demo:** [YouTube URL — record using VIDEO_SCRIPT.md]

The repository is public and includes the MIT `LICENSE` file. The video should be public on YouTube, shorter than three minutes, include audio, and show the live app working plus how WebMCP is used.

## 🎯 Problem Solved

AI agents running in web browsers can lose the thread when a workflow reaches a native OS dialog, browser popup, or another human-only interaction. A page cannot control those surfaces directly, but it can expose a structured WebMCP handoff for the interactions it owns.

## Why WebMCP is the right fit

WebMCP is the contract between the page and the agent: the page advertises a precise action, the agent can invoke it by name, and the page can keep the execution pending while a person completes the interaction. That is more reliable and understandable than asking an agent to guess how to operate a UI it cannot control.

## Before and after

- **Before:** the agent reaches a native file dialog it cannot operate, so the workflow stalls.
- **After:** the agent calls `magic_picker`, the page presents a clear handoff, the person selects or drops a file, and the tool returns structured data.

## 💡 Solution

Magic Picker provides a WebMCP handoff that:
1. Receives file requests from AI agents
2. Shows a web-based file picker UI to the user
3. Converts selected files to base64
4. Returns the data directly to the agent

The agent does not need to operate the native picker. The user remains in control of the selection. If the host navigates away or aborts the tool, the page closes the pending handoff instead of leaving a dead request behind.

## 🛠️ Technical Implementation

### WebMCP Tool Registration

```javascript
window.modelContext.registerTool({
  name: "magic_picker",
  title: "Request a file from the user",
  description: "Ask the user to choose a file in the page UI and return metadata plus base64 data",
  inputSchema: {
    type: "object",
    properties: {
      accept: { type: "string" },
      multiple: { type: "boolean" },
      maxSizeMB: { type: "number" },
      prompt: { type: "string" }
    }
  },
  annotations: { readOnlyHint: true, untrustedContentHint: true },
  execute: async (input, { signal }) => {
    // Shows web UI, user selects file, returns base64
  }
});
```

### Key Features

- **Drag & drop** file selection
- **File type filtering** via `accept` parameter
- **Size validation** with configurable limits
- **Base64 conversion** for direct agent consumption
- **User-friendly UI** with clear prompts

## 📊 Judging Criteria Alignment

### WebMCP Leverage
✅ **Genuine, non-trivial implementation**
- Uses native WebMCP API (`window.modelContext.registerTool`)
- Proper input schema validation
- Async execution with error handling
- Real file processing pipeline

### Execution
✅ **Working, runnable project**
- Complete React + TypeScript implementation
- Local development server
- Test panel for validation
- WebMCP console for direct tool invocation
- Build process for production

### Potential Impact
✅ **Solves a real problem**
- **Before:** Impossible for browser agents to access files
- **After:** Agents can request files through web UI
- **Use cases:** Document analysis, image processing, data import, media collection

### Creativity & Ambition
✅ **Focused and extensible concept**
- A reusable human-handoff pattern, demonstrated by `magic_picker`
- Explicitly separates page-owned interactions from host-owned popups and terminal prompts
- Leaves a clear path for future handoff tools without over-scoping this submission

## 🎥 Video Demo Script (3 minutes)

**0:00-0:30:** Introduction - Explain why browser agents lose the thread at human-only interactions

**0:30-1:30:** Live demo - Show ChatGPT invoking magic_picker, user selecting a file, agent receiving base64 data

**1:30-2:30:** Technical explanation - Show the code, explain how WebMCP registration works, demonstrate file conversion

**2:30-3:00:** Impact - Explain the handoff pattern and the boundary between page and host

## 🚀 Setup Instructions

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
4. Open http://localhost:3000
5. For real WebMCP testing: Open in ChatGPT browser or Chrome 149+ with WebMCP enabled

For a ready-to-record walkthrough, see [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md). For the navigation, popup, OAuth, and terminal boundary, see [PICKER_BRIDGE.md](PICKER_BRIDGE.md).

## 📄 License

MIT License
