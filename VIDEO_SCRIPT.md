# Magic Picker — video demo script

Target length: 2:30–2:50. The video must be public on YouTube and include clear audio.

## 0:00–0:25 — The problem

Show the landing hero and say:

> Browser agents are good at using pages, but they cannot operate a native operating-system file dialog. When a workflow reaches that boundary, the agent can lose the thread. Magic Picker turns that dead end into a visible human handoff owned by the page.

## 0:25–1:15 — The working demo

1. Scroll to **Live demo**.
2. Click **Open the picker**.
3. Say:

> This button simulates the same async action as a WebMCP tool call. The request is pending, the user sees exactly what is needed, and the user remains in control.

4. Select a small image file.
5. Show the tool result and image preview.
6. Say:

> The file never leaves the browser. Magic Picker validates the type and size, converts the file to base64 locally, and returns the metadata plus data to the waiting tool call.

## 1:15–1:55 — The WebMCP surface

Show the WebMCP console and run `{"action":"list"}`. Then show `src/webmcp/magicPickerTool.ts` and say:

> The page registers `magic_picker` through `document.modelContext.registerTool`. The schema gives the agent a small, explicit contract: accepted types, multiple files, size limit, and a user-facing prompt. The execution stays pending until the human completes or cancels the handoff.

If WebMCP is available in the test browser, show the registered tool in the browser’s WebMCP inspector or ask the agent:

> Use magic_picker to ask me for an image file.

## 1:55–2:25 — Reliability and boundaries

Show `PICKER_BRIDGE.md` or the boundary card and say:

> The implementation also listens for WebMCP cancellation and page unload, so navigation does not leave a dead modal or unresolved local request. This is intentionally focused: the page can own this handoff, but it cannot intercept arbitrary OS dialogs, Google OAuth popups, terminal prompts, or browser chrome. Those require host-level integration.

## 2:25–2:50 — Close

Show the public URL and repository, then say:

> Magic Picker is a small, concrete example of the agent-native web: the agent requests, the human decides, and the page returns a structured result. The code, live demo, and setup instructions are public.

## Recording checklist

- [ ] Keep the video under three minutes.
- [ ] Make the YouTube visibility **Public**, not Unlisted.
- [ ] Record clear narration/audio throughout.
- [ ] Show the public URL in the browser.
- [ ] Show the working picker and returned result.
- [ ] Say the words “WebMCP” and explain where `registerTool` is used.
- [ ] Show the public repository and `LICENSE` file.
