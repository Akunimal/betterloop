import { analyzeCodexWorkspace, type WorkspaceFile } from './codex-analysis.ts'
import { DEMO_CONFIG_DOCUMENTS, DEMO_WORKSPACE_FILES } from './demo-workspace.ts'
import { matchCodexSourceForPath } from './mcp-paths.ts'
import type { AnalysisResult, ApplyResult, ConfigDocument, WorkspaceAccessMode } from './mcp-types.ts'

const DB_NAME = 'mcpation-files-v1'
const STORE_NAME = 'handles'
const ROOT_KEY = 'environment-root'
const MAX_WORKSPACE_FILES = 240
const MAX_WORKSPACE_DEPTH = 5
const MAX_WORKSPACE_FILE_BYTES = 250_000
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', 'graphify-out'])
const WORKSPACE_FILE_NAMES = new Set(['.mcp.json', 'mcp.json', 'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'pyproject.toml', 'requirements.txt', 'uv.lock', 'poetry.lock', 'setup.py', 'agents.md', 'agents.override.md'])
let rootHandle: FileSystemDirectoryHandle | null = null
let latestAnalysis: AnalysisResult | null = null
let importedFiles: File[] = []
let accessMode: WorkspaceAccessMode | null = null
let demoFiles: WorkspaceFile[] | null = null
let hostFiles: WorkspaceFile[] | null = null

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function storeRoot(handle: FileSystemDirectoryHandle): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(handle, ROOT_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

async function restoreRoot(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const database = await openDatabase()
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(ROOT_KEY)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
    database.close()
    return handle
  } catch { return null }
}

async function fileAt(root: FileSystemDirectoryHandle, parts: string[]): Promise<FileSystemFileHandle | null> {
  try {
    let directory = root
    for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part)
    return await directory.getFileHandle(parts[parts.length - 1] || '')
  } catch { return null }
}

async function directoryAt(root: FileSystemDirectoryHandle, parts: string[]): Promise<FileSystemDirectoryHandle> {
  let directory = root
  for (const part of parts) directory = await directory.getDirectoryHandle(part)
  return directory
}

function configDocumentsForFiles(files: WorkspaceFile[], manualOnly: boolean): ConfigDocument[] {
  const documents: ConfigDocument[] = []
  const seen = new Set<string>()
  for (const file of files) {
    const match = matchCodexSourceForPath(file.path)
    if (!match) continue
    const path = file.path.replace(/\\/g, '/')
    const key = `${match.source.label}:${path.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    documents.push({ label: match.source.label, client: match.source.client, path, format: match.source.format, text: file.text, manualOnly: manualOnly || match.source.manualOnly })
  }
  return documents
}

function isInterestingWorkspaceFile(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase()
  const name = normalizedPath.split('/').pop() || ''
  return Boolean(matchCodexSourceForPath(normalizedPath) || WORKSPACE_FILE_NAMES.has(name) || (name === 'skill.md' && (normalizedPath.includes('/skills/') || normalizedPath.startsWith('skills/'))))
}

async function readWorkspaceFiles(root: FileSystemDirectoryHandle): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = []
  const walk = async (directory: FileSystemDirectoryHandle, parts: string[], depth: number): Promise<void> => {
    if (files.length >= MAX_WORKSPACE_FILES || depth > MAX_WORKSPACE_DEPTH) return
    for await (const entry of directory.values()) {
      if (files.length >= MAX_WORKSPACE_FILES) break
      const nextParts = [...parts, entry.name]
      if (entry.kind === 'directory') {
        if (!IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) await walk(entry as FileSystemDirectoryHandle, nextParts, depth + 1)
        continue
      }
      const path = nextParts.join('/')
      if (!isInterestingWorkspaceFile(path)) continue
      try {
        const file = await (entry as FileSystemFileHandle).getFile()
        if (file.size > MAX_WORKSPACE_FILE_BYTES) continue
        files.push({ path, text: await file.text() })
      } catch { /* unreadable files stay outside the analysis */ }
    }
  }
  await walk(root, [], 0)
  return files
}

async function permissionGranted(handle: FileSystemDirectoryHandle, mode: 'read' | 'readwrite' = 'read'): Promise<boolean> {
  try { return await handle.queryPermission({ mode }) === 'granted' } catch { return false }
}

async function scanRoot(root: FileSystemDirectoryHandle): Promise<AnalysisResult> {
  const workspaceFiles = await readWorkspaceFiles(root)
  latestAnalysis = analyzeCodexWorkspace(workspaceFiles, configDocumentsForFiles(workspaceFiles, false), { root: root.name, mode: 'direct', filesConsidered: workspaceFiles.length })
  accessMode = 'direct'
  hostFiles = null
  window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestAnalysis.scan }))
  return latestAnalysis
}

async function scanImportedFiles(files: File[]): Promise<AnalysisResult> {
  const workspaceFiles: WorkspaceFile[] = []
  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name
    if (!isInterestingWorkspaceFile(relativePath)) continue
    if (file.size > MAX_WORKSPACE_FILE_BYTES) continue
    const text = await file.text()
    workspaceFiles.push({ path: relativePath.replace(/^[^/]+\//, ''), text })
  }
  if (!workspaceFiles.length) throw new Error('No Codex/MCP workspace files were found in that folder.')
  latestAnalysis = analyzeCodexWorkspace(workspaceFiles, configDocumentsForFiles(workspaceFiles, false), { root: 'Imported workspace', mode: 'import', filesConsidered: workspaceFiles.length })
  latestAnalysis.scan.proposals = latestAnalysis.scan.proposals.map((proposal) => proposal.canApply ? { ...proposal, detail: `${proposal.detail} This browser preview cannot write; ask Codex for the native host handoff to apply this exact action after approval.` } : proposal)
  latestAnalysis.scan.recommendations = latestAnalysis.scan.recommendations.map((item) => ({ ...item, action: item.action === 'Review the backed-up browser write' ? 'Ask Codex for a native host handoff' : item.action }))
  accessMode = 'import'
  hostFiles = null
  window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestAnalysis.scan }))
  return latestAnalysis
}

function normalizeHostSnapshot(files: WorkspaceFile[]): WorkspaceFile[] {
  if (!Array.isArray(files) || files.length === 0) throw new Error('Codex must provide at least one allowlisted workspace file.')
  if (files.length > MAX_WORKSPACE_FILES) throw new Error(`Codex host snapshot exceeds the ${MAX_WORKSPACE_FILES}-file limit.`)
  const seen = new Set<string>()
  return files.map((file) => {
    const rawPath = typeof file?.path === 'string' ? file.path : ''
    if (!rawPath || /^(?:[A-Za-z]:[\\/]|[\\/]{1,2})/.test(rawPath)) throw new Error('Host snapshot path must be a relative path inside the Codex workspace allowlist.')
    const path = rawPath.replace(/\\/g, '/').replace(/^\/+/, '')
    const segments = path.split('/')
    if (segments.some((segment) => !segment || segment === '.' || segment === '..') || !isInterestingWorkspaceFile(path)) throw new Error('Host snapshot path is outside the Codex workspace allowlist.')
    const key = path.toLowerCase()
    if (seen.has(key)) throw new Error('Host snapshot contains a duplicate workspace path.')
    seen.add(key)
    if (typeof file.text !== 'string' || file.text.length > MAX_WORKSPACE_FILE_BYTES) throw new Error('Host snapshot file is missing text or exceeds the bounded file-size limit.')
    return { path, text: file.text }
  })
}

export function ingestHostSnapshot(files: WorkspaceFile[]): AnalysisResult {
  hostFiles = normalizeHostSnapshot(files)
  demoFiles = null
  importedFiles = []
  latestAnalysis = analyzeCodexWorkspace(hostFiles, configDocumentsForFiles(hostFiles, false), { root: 'Codex host workspace', mode: 'codex-host', filesConsidered: hostFiles.length })
  accessMode = 'codex-host'
  window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestAnalysis.scan }))
  return latestAnalysis
}

function scanDemoFiles(): AnalysisResult {
  const files = demoFiles || DEMO_WORKSPACE_FILES.map((file) => ({ ...file }))
  demoFiles = files
  latestAnalysis = analyzeCodexWorkspace(files, files === DEMO_WORKSPACE_FILES ? DEMO_CONFIG_DOCUMENTS : [
    { ...DEMO_CONFIG_DOCUMENTS[0], text: files.find((file) => file.path === '.codex/config.toml')?.text || '' },
    { ...DEMO_CONFIG_DOCUMENTS[1], text: files.find((file) => file.path === '.mcp.json')?.text || '' },
  ], { root: 'demo-workspace', mode: 'demo', filesConsidered: files.length })
  accessMode = 'demo'
  hostFiles = null
  window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestAnalysis.scan }))
  return latestAnalysis
}

export const fileSystemAccessSupported = () => typeof window.showDirectoryPicker === 'function'

export async function restoreEnvironmentAccess(): Promise<boolean> {
  rootHandle ||= await restoreRoot()
  if (!rootHandle || !(await permissionGranted(rootHandle))) return false
  await scanRoot(rootHandle)
  return true
}

export async function connectEnvironment(): Promise<AnalysisResult> {
  if (!fileSystemAccessSupported()) throw new Error('This browser does not expose the File System Access API.')
  rootHandle = await window.showDirectoryPicker({ id: 'mcpation-environment', mode: 'read' })
  try { await storeRoot(rootHandle) } catch { /* Private browsing may not persist handles; the current session still works. */ }
  return scanRoot(rootHandle)
}

export async function connectWritableEnvironment(): Promise<AnalysisResult> {
  if (!fileSystemAccessSupported()) throw new Error('This browser does not expose the folder permission needed to apply a change.')
  const handle = await window.showDirectoryPicker({ id: 'mcpation-environment-write', mode: 'readwrite' })
  const granted = await handle.requestPermission({ mode: 'readwrite' })
  if (granted !== 'granted') throw new Error('Write permission was not granted. Nothing was changed.')
  rootHandle = handle
  try { await storeRoot(rootHandle) } catch { /* The current approved session still works if private browsing blocks storage. */ }
  return scanRoot(rootHandle)
}

export async function importEnvironment(files: FileList | File[]): Promise<AnalysisResult> {
  const selectedFiles = Array.from(files)
  if (!selectedFiles.length) throw new Error('No folder was selected.')
  importedFiles = selectedFiles.filter((file) => isInterestingWorkspaceFile(file.webkitRelativePath || file.name))
  if (!importedFiles.length) throw new Error('No Codex/MCP workspace files were found in that folder.')
  return scanImportedFiles(importedFiles)
}

export function startDemoEnvironment(): AnalysisResult {
  demoFiles = DEMO_WORKSPACE_FILES.map((file) => ({ ...file }))
  return scanDemoFiles()
}

export async function rescanEnvironment(): Promise<AnalysisResult> {
  if (accessMode === 'demo') return scanDemoFiles()
  if (accessMode === 'import' && importedFiles.length) return scanImportedFiles(importedFiles)
  if (accessMode === 'codex-host' && hostFiles) return ingestHostSnapshot(hostFiles)
  rootHandle ||= await restoreRoot()
  if (!rootHandle || !(await permissionGranted(rootHandle))) throw new Error('Ask the user to connect their environment folder from the visible page first.')
  return scanRoot(rootHandle)
}

export async function applyBrowserFixes(actionIds: string[]): Promise<ApplyResult> {
  if (accessMode === 'import') throw new Error('This browser session is read-only. Use the visible approved-cleanup button to grant write access to the selected folder before writing.')
  if (accessMode === 'codex-host') throw new Error('This scan belongs to the Codex host. Ask Codex to execute the reviewed host handoff with native filesystem approval.')
  if (accessMode === 'demo') {
    if (!latestAnalysis || !demoFiles) throw new Error('Start the deterministic demo before applying a demo action.')
    const requested = [...new Set(actionIds)]
    const known = new Set(latestAnalysis.removals.map((action) => action.actionId))
    const unknown = requested.filter((actionId) => !known.has(actionId))
    if (unknown.length) throw new Error(`The hardening request contains unknown action id(s): ${unknown.join(', ')}`)
    const appliedActionIds: string[] = []
    const skippedActionIds: string[] = []
    const backups: string[] = []
    for (const action of latestAnalysis.removals.filter((item) => requested.includes(item.actionId))) {
      const file = demoFiles.find((item) => item.path === action.path)
      if (!file) { skippedActionIds.push(action.actionId); continue }
      try {
        const document = JSON.parse(file.text) as Record<string, Record<string, unknown>>
        if (!document[action.groupKey] || !(action.serverName in document[action.groupKey])) { skippedActionIds.push(action.actionId); continue }
        delete document[action.groupKey][action.serverName]
        file.text = `${JSON.stringify(document, null, 2)}\n`
        appliedActionIds.push(action.actionId)
        backups.push(`${action.path}.mcpation-demo.bak`)
      } catch { skippedActionIds.push(action.actionId) }
    }
    const result = scanDemoFiles()
    return { ...result, appliedActionIds, skippedActionIds, backups }
  }
  rootHandle ||= await restoreRoot()
  if (!rootHandle || !(await permissionGranted(rootHandle, 'readwrite')) || !latestAnalysis) throw new Error('This browser connection has no write grant. Use the visible approved-cleanup button to grant write access to the selected folder before writing.')
  const requested = [...new Set(actionIds)]
  const known = new Set(latestAnalysis.removals.map((action) => action.actionId))
  const unknown = requested.filter((actionId) => !known.has(actionId))
  if (unknown.length) throw new Error(`The cleanup request contains unknown action id(s): ${unknown.join(', ')}`)
  const actions = latestAnalysis.removals.filter((action) => requested.includes(action.actionId))
  const appliedActionIds: string[] = []
  const skippedActionIds: string[] = []
  const backups: string[] = []
  for (const action of actions) {
    try {
      const parts = action.path.split('/')
      const handle = await fileAt(rootHandle, parts)
      if (!handle) { skippedActionIds.push(action.actionId); continue }
      const file = await handle.getFile()
      const original = await file.text()
      const document = JSON.parse(original) as Record<string, Record<string, unknown>>
      if (!document[action.groupKey] || !(action.serverName in document[action.groupKey])) { skippedActionIds.push(action.actionId); continue }
      const directory = await directoryAt(rootHandle, parts.slice(0, -1))
      const backupName = `${parts[parts.length - 1]}.mcpation-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`
      const backup = await directory.getFileHandle(backupName, { create: true })
      const backupWriter = await backup.createWritable()
      await backupWriter.write(original)
      await backupWriter.close()
      delete document[action.groupKey][action.serverName]
      const writer = await handle.createWritable()
      await writer.write(`${JSON.stringify(document, null, 2)}\n`)
      await writer.close()
      appliedActionIds.push(action.actionId)
      backups.push(`${parts.slice(0, -1).concat(backupName).join('/')}`)
    } catch {
      skippedActionIds.push(action.actionId)
    }
  }
  const result = await scanRoot(rootHandle)
  return { ...result, appliedActionIds, skippedActionIds, backups }
}

export const getLatestAnalysis = () => latestAnalysis
export const getAccessMode = () => accessMode
