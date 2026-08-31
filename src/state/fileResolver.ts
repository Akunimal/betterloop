/**
 * File Resolver — Smart file resolution without UI interruption.
 *
 * Uses the File System Access API to maintain access to the user's project
 * directory. When an AI agent requests a file, this resolver finds and reads
 * it automatically without showing a modal.
 *
 * Flow:
 *   1. The user may connect a directory from the visible setup button.
 *   2. Store the directory handle in IndexedDB for persistence.
 *   3. Subsequent requests resolve files from the stored handle.
 *   4. The WebMCP tool never opens a picker implicitly; agent calls are
 *      deterministic and return an actionable error when setup is missing.
 */

import { FileResult } from '../webmcp-types';

const DB_NAME = 'magic-picker-db';
const DB_VERSION = 1;
const STORE_NAME = 'directory-handle';
const HANDLE_KEY = 'project-root';

let rootHandle: FileSystemDirectoryHandle | null = null;
let initPromise: Promise<void> | null = null;

// ------------------------------------------------------------------
// IndexedDB persistence
// ------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      req.onsuccess = () => { db.close(); resolve(req.result || null); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Permission check
// ------------------------------------------------------------------

async function hasReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return (await handle.queryPermission({ mode: 'read' })) === 'granted';
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------
// Init: try to restore saved handle, or prompt user
// ------------------------------------------------------------------

async function ensureDirectory(): Promise<FileSystemDirectoryHandle | null> {
  // Try to restore from IndexedDB
  if (!rootHandle) {
    rootHandle = await loadHandle();
  }

  // Verify permission is still valid. Requesting permission here would be
  // unreliable because browser permission prompts require user activation.
  if (rootHandle) {
    if (await hasReadPermission(rootHandle)) {
      return rootHandle;
    }
    rootHandle = null; // Permission revoked
  }

  return null;
}

/**
 * Ask user to select a directory. Only needed once.
 */
export async function selectDirectory(): Promise<boolean> {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'read',
      startIn: 'documents'
    });
    rootHandle = handle;
    await saveHandle(handle);
    return true;
  } catch {
    // User cancelled or API not supported
    return false;
  }
}

export async function initResolver(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      rootHandle = await loadHandle();
      if (rootHandle && !(await hasReadPermission(rootHandle))) rootHandle = null;
    } catch {
      rootHandle = null;
    }
  })();
  return initPromise;
}

// ------------------------------------------------------------------
// File operations
// ------------------------------------------------------------------

async function readFileFromHandle(
  dir: FileSystemDirectoryHandle,
  pathParts: string[]
): Promise<{ data: string; name: string; type: string } | null> {
  let current = dir;

  // Traverse to parent directory
  for (let i = 0; i < pathParts.length - 1; i++) {
    try {
      current = await current.getDirectoryHandle(pathParts[i]);
    } catch {
      return null;
    }
  }

  // Read the file
  const fileName = pathParts[pathParts.length - 1];
  try {
    const fileHandle = await current.getFileHandle(fileName);
    const file = await fileHandle.getFile();

    // Read as base64
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return {
      data: base64,
      name: file.name,
      type: file.type || guessMime(fileName)
    };
  } catch {
    return null;
  }
}

async function* walkDirectory(
  dir: FileSystemDirectoryHandle,
  prefix: string = ''
): AsyncGenerator<string> {
  for await (const [name, handle] of dir.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'file') {
      yield path;
    } else if (handle.kind === 'directory' && !name.startsWith('.') && name !== 'node_modules') {
      yield* walkDirectory(handle as FileSystemDirectoryHandle, path);
    }
  }
}

async function findFiles(
  dir: FileSystemDirectoryHandle,
  accept: string,
  prompt: string
): Promise<string[]> {
  const matches: string[] = [];
  const acceptLower = accept.toLowerCase();
  const promptLower = prompt.toLowerCase();

  // Parse accept patterns
  const patterns = acceptLower.split(',').map(s => s.trim());

  for await (const path of walkDirectory(dir)) {
    const pathLower = path.toLowerCase();

    // Check accept filter
    if (acceptLower !== '*' && acceptLower !== '*/*') {
      const matchesAccept = patterns.some(p => {
        if (p.startsWith('.')) return pathLower.endsWith(p);
        if (p.endsWith('/*')) return pathLower.includes(p.slice(0, -2));
        return pathLower.endsWith(p);
      });
      if (!matchesAccept) continue;
    }

    // Check prompt relevance (simple heuristic: words from prompt in path)
    const promptWords = promptLower.split(/\s+/).filter(w => w.length > 2);
    const promptMatch = promptWords.length === 0 ||
      promptWords.some(w => pathLower.includes(w));

    if (promptMatch || acceptLower !== '*') {
      matches.push(path);
    }
  }

  return matches;
}

function guessMime(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    'js': 'text/javascript', 'ts': 'text/typescript', 'tsx': 'text/typescript',
    'jsx': 'text/javascript', 'py': 'text/x-python', 'rb': 'text/x-ruby',
    'go': 'text/x-go', 'rs': 'text/x-rust', 'java': 'text/x-java',
    'c': 'text/x-c', 'cpp': 'text/x-c++', 'h': 'text/x-c',
    'css': 'text/css', 'html': 'text/html', 'htm': 'text/html',
    'json': 'application/json', 'yaml': 'text/yaml', 'yml': 'text/yaml',
    'toml': 'text/plain', 'xml': 'text/xml',
    'md': 'text/markdown', 'txt': 'text/plain', 'log': 'text/plain',
    'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'gif': 'image/gif', 'svg': 'image/svg+xml', 'webp': 'image/webp',
    'pdf': 'application/pdf', 'zip': 'application/zip',
    'mp3': 'audio/mpeg', 'mp4': 'video/mp4', 'wav': 'audio/wav',
  };
  return map[ext] || 'application/octet-stream';
}

// ------------------------------------------------------------------
// Main resolve function — called by the WebMCP tool
// ------------------------------------------------------------------

export interface ResolveOptions {
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  prompt?: string;
  path?: string;
}

export async function resolveFile(options: ResolveOptions): Promise<FileResult> {
  const dir = await ensureDirectory();

  if (!dir) {
    return {
      success: false,
      error: 'No project directory connected. Open MagicPicker and use Connect project directory once.'
    };
  }

  const accept = options.accept || '*';
  const prompt = options.prompt || '';
  const path = options.path || '';
  const maxSizeBytes = (options.maxSizeMB || 10) * 1024 * 1024;

  // Strategy 1: Direct path parameter (most common — Codex passes path directly).
  if (path) {
    const normalized = path.replace(/\\/g, '/').replace(/^\//, '');
    const result = await tryReadFile(dir, normalized, maxSizeBytes);
    if (result) return result;

    // Try with the original path too (handles absolute Windows paths)
    if (path !== normalized) {
      const result2 = await tryReadFile(dir, path, maxSizeBytes);
      if (result2) return result2;
    }
  }

  // Strategy 2: Extract path from prompt text.
  if (prompt) {
    const directPath = extractPathFromPrompt(prompt);
    if (directPath) {
      const result = await tryReadFile(dir, directPath, maxSizeBytes);
      if (result) return result;
    }
  }

  // Never guess when the agent supplied an explicit path. Returning the first
  // file in a project is unsafe and can silently upload the wrong asset.
  if (path || directPathFromPrompt(prompt)) {
    return {
      success: false,
      error: `File not found in the connected project: ${path || prompt}`
    };
  }

  // Strategy 3: Search for matching files only when the request is explicitly
  // a type/search request rather than an exact path.
  const candidates = await findFiles(dir, accept, prompt || path);

  if (candidates.length === 0) {
    return {
      success: false,
      error: `No files found matching "${path || accept}" in the project directory.`
    };
  }

  const best = candidates[0];
  const result = await tryReadFile(dir, best, maxSizeBytes);

  if (result) return result;

  return {
    success: false,
    error: `Found ${candidates.length} file(s) but could not read "${best}".`
  };
}

function directPathFromPrompt(prompt: string): string | null {
  return prompt ? extractPathFromPrompt(prompt) : null;
}

function extractPathFromPrompt(prompt: string): string | null {
  // Look for path-like patterns in the prompt
  // e.g., "read src/App.tsx" or "open the file at ./config.json"
  const pathPatterns = [
    /(?:read|open|load|get|fetch|file)\s+(?:the\s+)?(?:file\s+)?(?:at\s+)?[`"']?([\/\\.\w\-]+[\w.\-\/\\]*)[`"']?/i,
    /([\/\\]?(?:src|lib|app|components|pages|utils|config|public|assets)[\/\\][\w.\-\/\\]+)/i,
    /([\/\\]?\.[\/\\][\w.\-\/\\]+)/i, // ./something
    /([\/\\][\w.\-\/\\]+\.\w{1,5})/i, // /path/to/file.ext
  ];

  for (const pattern of pathPatterns) {
    const match = prompt.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function tryReadFile(
  dir: FileSystemDirectoryHandle,
  path: string,
  maxSizeBytes: number
): Promise<FileResult | null> {
  // Normalize an exact path into a path relative to the connected directory.
  // The browser intentionally does not expose the absolute path of a
  // FileSystemDirectoryHandle, so an absolute path is accepted when it
  // contains the connected directory name and is then made relative.
  const original = path.replace(/\\/g, '/');
  let normalized = original.replace(/^[A-Za-z]:/, '').replace(/^\/+/, '');
  if (/^[A-Za-z]:\//.test(original) || original.startsWith('/')) {
    const segments = normalized.split('/').filter(Boolean);
    const rootName = (dir.name || '').toLowerCase();
    const rootIndex = segments.findIndex((segment) => segment.toLowerCase() === rootName);
    if (rootIndex >= 0) normalized = segments.slice(rootIndex + 1).join('/');
  }

  if (!normalized) return null;

  const parts = normalized.split('/').filter((part) => part && part !== '.');
  if (parts.some((part) => part === '..')) return null;

  const result = await readFileFromHandle(dir, parts);
  if (!result) return null;

  if (result.data.length * 0.75 > maxSizeBytes) {
    return {
      success: false,
      error: `File too large: ${(result.data.length * 0.75 / 1024 / 1024).toFixed(1)}MB exceeds limit.`
    };
  }

  return {
    success: true,
    fileName: result.name,
    fileSize: Math.round(result.data.length * 0.75),
    fileType: result.type,
    base64Data: result.data
  };
}

export function hasDirectoryPermission(): boolean {
  return rootHandle !== null;
}

export function getDirectoryName(): string | null {
  return rootHandle?.name || null;
}
