# Magic Picker — Handoff boundary

## The product thesis

Magic Picker is a focused human-handoff tool for browser agents. It gives an agent a structured way to ask a person for an interaction that the agent should not, or cannot, perform itself.

`magic_picker` is the first concrete adapter: it asks the user to choose a file in a page-owned UI and returns metadata plus base64 data to the tool caller.

The important distinction is ownership. A web page can own its UI and its WebMCP tools. It cannot own arbitrary browser chrome, operating-system dialogs, another website's DOM, or a process running in a terminal.

## What the current architecture can solve

| Interaction | Page-owned WebMCP handoff | Result |
| --- | --- | --- |
| File selection on a cooperating site | Yes | `magic_picker` keeps the agent call pending while the user selects or drops a file. |
| Approval, confirmation, date, color, or structured form | Yes, with a dedicated adapter | Add a tool with a small schema and an in-page component. |
| A popup opened by the same page | Partially | The page can coordinate an explicit return path, but it should not assume it can inspect a cross-origin popup. |
| Google OAuth popup opened by `gcloud` | No, not from Vercel | The CLI and the host must coordinate authentication. Use a console/device flow or a host-level integration. |
| Native OS dialog, terminal prompt, or browser permission UI | No | Requires Codex/ChatGPT host support, a browser extension, or a local companion process. |

## Why a navigation can still cancel a handoff

WebMCP tools are tied to a live browsing context. The current specification gives each execution an `AbortSignal`, and pending executions are cancelled when the caller or target document is destroyed. A tool can therefore clean up its UI when navigation starts, but a page cannot keep the original WebMCP promise alive after its document is gone.

That leads to a safe contract:

1. Register a short, action-oriented tool.
2. Open a visible in-page handoff UI when the tool executes.
3. Keep the promise pending until the user completes or cancels.
4. Listen to the WebMCP `AbortSignal` and close the UI immediately.
5. Never claim that the tool can resume an arbitrary task after a top-level navigation unless the host provides a continuation protocol.

Magic Picker implements steps 2–4. The modal is page-owned, the result is client-side, and the picker state is cleared on abort/page unload so the local app does not leave a dead request behind.

## Generalization path

The suite can grow through adapters rather than a single universal picker:

- `magic_picker`: file or files, type filters, size limits, base64 output.
- `magic_confirm`: explicit approval for a consequential action.
- `magic_form`: collect a small structured value from the user.
- `magic_auth_handoff`: display a safe, host-provided continuation URL or device code; never collect credentials or tokens in the generic page.
- `magic_terminal_handoff`: a host integration that turns a blocked terminal prompt into a resumable user action. This cannot be implemented by a Vercel page alone.

## gcloud and OAuth

For gcloud, the robust workaround is to avoid an automatically launched browser popup. Google documents `gcloud init --console-only`, `gcloud auth login --no-launch-browser`, and `gcloud auth login --no-browser` for flows where the terminal and browser are separate. Magic Picker could be paired with a host UI for that continuation state, but it must not intercept or proxy OAuth credentials.

## Security rules

- Keep file processing client-side unless the user explicitly chooses an upload destination.
- Mark file results as untrusted content for the agent.
- Keep tool descriptions and output compact and action-oriented.
- Do not store file base64, OAuth codes, or tokens in local storage.
- Treat cross-origin popup content as inaccessible and untrusted.

## Hackathon scope

The defensible demo is a complete page-owned handoff: an agent calls `magic_picker`, the human chooses a file, and the tool resolves without asking the agent to operate a native picker. The broader vision is an adapter model plus the host contract required to cover terminal and browser-chrome interactions later; this submission stays focused on the picker.
