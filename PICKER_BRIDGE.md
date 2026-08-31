# Magic Picker — Scope & Boundary

## The product thesis

Magic Picker is a WebMCP file resolver for browser agents. It gives agents a structured way to access files from the user's project directory without showing a picker modal or breaking the agent's workflow.

`magic_picker` resolves files automatically using the File System Access API. The user grants directory access once; subsequent agent requests resolve instantly.

## What Magic Picker can resolve

| Interaction | Auto-resolve | Result |
| --- | --- | --- |
| File from the project directory | Yes | `magic_picker` finds and reads the file automatically via File System Access API. |
| File by path hint (e.g., `src/App.tsx`) | Yes | Path detection extracts the path from the prompt and reads it directly. |
| File by type (e.g., `image/*`) | Yes | File search walks the directory tree and returns the first matching file. |
| File outside the granted directory | No | The user must grant access to a different directory. |
| Native OS dialog interception | No | Requires host-level integration or browser extension. |
| OAuth popup interception | No | Requires host-level integration. Use `--no-launch-browser` for gcloud. |
| Terminal prompt interception | No | Requires host-level integration or local companion process. |

## The File System Access API contract

The File System Access API (`showDirectoryPicker`) establishes a persistent connection between a web page and a local directory:

1. **Grant:** User clicks "Select project directory" and picks a folder
2. **Persist:** The directory handle is stored in IndexedDB
3. **Restore:** On page load, the handle is restored and permission is verified
4. **Resolve:** Agent requests are resolved automatically using the stored handle
5. **Revoke:** The user can revoke access at any time via browser permissions

This is a one-time interaction. After the initial grant, agents resolve files without any user intervention.

## Security rules

- Directory access requires explicit user permission (File System Access API)
- Permission is persisted but can be revoked at any time
- Files are processed entirely client-side
- No files are sent to external servers
- Maximum file size limits prevent abuse
- File type validation via `accept` parameter
- Directory handle stored in IndexedDB (not localStorage)

## Generalization path

The resolver pattern can expand to other adapters:

- `magic_picker`: File resolution with type filters, size limits, base64 output.
- `magic_confirm`: Explicit approval for a consequential action.
- `magic_form`: Collect a small structured value from the user.
- `magic_terminal_handoff`: A host integration that turns a blocked terminal prompt into a resumable user action.

## gcloud and OAuth

For gcloud, the robust workaround is to avoid an automatically launched browser popup. Google documents `gcloud init --console-only`, `gcloud auth login --no-launch-browser`, and `gcloud auth login --no-browser` for flows where the terminal and browser are separate.

Magic Picker does not intercept or proxy OAuth credentials. Those flows belong to the host or CLI.

## Hackathon scope

The defensible demo is a complete file resolver: an agent calls `magic_picker`, the resolver finds and reads the file automatically, and the agent continues without interruption. The broader vision is an adapter model plus host contract for terminal and browser-chrome interactions; this submission stays focused on file resolution.
