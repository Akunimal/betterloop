# Magic Picker - WebMCP Challenge Submission

## 📋 Project Overview

**Magic Picker** is a WebMCP tool that enables AI agents to request files from users without relying on native OS file dialogs - something that was previously impossible in sandboxed browser environments.

## 🔗 Links

- **Repository:** [Your GitLab/GitHub URL]
- **Live Demo:** [Your deployment URL or localhost instructions]
- **Video Demo:** [YouTube URL]

## 🎯 Problem Solved

AI agents running in web browsers cannot interact with native OS dialogs (file pickers, color pickers, etc.) due to browser sandboxing. This is a fundamental security limitation that makes file access impossible for browser-based agents.

## 💡 Solution

Magic Picker provides a WebMCP tool that:
1. Receives file requests from AI agents
2. Shows a web-based file picker UI to the user
3. Converts selected files to base64
4. Returns the data directly to the agent

This completely bypasses the need for native OS dialogs.

## 🛠️ Technical Implementation

### WebMCP Tool Registration

```javascript
window.modelContext.registerTool({
  name: "magic_picker",
  description: "Allows AI agents to request files from users without native OS dialogs",
  inputSchema: {
    type: "object",
    properties: {
      accept: { type: "string" },
      multiple: { type: "boolean" },
      maxSizeMB: { type: "number" },
      prompt: { type: "string" }
    }
  },
  execute: async (input) => {
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
✅ **Novel concept**
- First WebMCP tool specifically designed to bypass OS dialog limitations
- Elegant solution to a fundamental browser security constraint
- Opens new possibilities for browser-based AI agents

## 🎥 Video Demo Script (3 minutes)

**0:00-0:30:** Introduction - Explain the problem of native OS dialogs in sandboxed browsers

**0:30-1:30:** Live demo - Show ChatGPT invoking magic_picker, user selecting a file, agent receiving base64 data

**1:30-2:30:** Technical explanation - Show the code, explain how WebMCP registration works, demonstrate file conversion

**2:30-3:00:** Impact - Explain how this enables new use cases for browser-based AI agents

## 🚀 Setup Instructions

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
4. Open http://localhost:3000
5. For real WebMCP testing: Open in ChatGPT browser or Chrome 149+ with WebMCP enabled

## 📄 License

MIT License
