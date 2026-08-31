/**
 * background.js — Resolves files from the user's project directory.
 *
 * The directory handle is stored in IndexedDB (magic-picker-db).
 * Same DB as the MagicPicker webapp — they share the connection.
 */
let rootHandle = null;

async function restoreHandle() {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("magic-picker-db", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("directory-handle");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const handle = await new Promise((resolve) => {
      const tx = db.transaction("directory-handle", "readonly");
      const req = tx.objectStore("directory-handle").get("project-root");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    db.close();
    if (handle) {
      const perm = await handle.queryPermission({ mode: "read" });
      if (perm === "granted") {
        rootHandle = handle;
      }
    }
  } catch {}
}

async function readFile(path) {
  if (!rootHandle) return null;
  const parts = path.replace(/\\/g, "/").replace(/^\//, "").split("/");
  let current = rootHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    try { current = await current.getDirectoryHandle(parts[i]); }
    catch { return null; }
  }
  try {
    const fh = await current.getFileHandle(parts[parts.length - 1]);
    const file = await fh.getFile();
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || "application/octet-stream",
      base64Data: btoa(bin)
    };
  } catch { return null; }
}

async function* walk(dir, prefix) {
  for await (const [name, h] of dir.entries()) {
    const p = prefix ? `${prefix}/${name}` : name;
    if (h.kind === "file") yield p;
    else if (h.kind === "directory" && !name.startsWith(".") && name !== "node_modules")
      yield* walk(h, p);
  }
}

async function findFile(accept) {
  if (!rootHandle) return null;
  const patterns = accept.toLowerCase().split(",").map(s => s.trim());
  const all = accept === "*" || accept === "*/*";

  for await (const path of walk(rootHandle)) {
    if (all) return path;
    const lower = path.toLowerCase();
    if (patterns.some(p => lower.endsWith(p) || lower.includes(p))) return path;
  }
  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "resolve-file") return;
  (async () => {
    const path = await findFile(msg.accept || "*");
    if (!path) return sendResponse({ success: false });
    const file = await readFile(path);
    if (!file) return sendResponse({ success: false });
    sendResponse({ success: true, files: [file] });
  })();
  return true;
});

restoreHandle();
