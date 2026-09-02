import { analyzeCodexWorkspace, type WorkspaceFile } from './codex-analysis.ts'
import { DEMO_CONFIG_DOCUMENTS, DEMO_WORKSPACE_FILES } from './demo-workspace.ts'
import { CODEX_CONFIG_SOURCES as SOURCES, matchCodexSourceForPath } from './mcp-paths.ts'
import type { AnalysisResult, ApplyResult, ConfigDocument } from './mcp-types.ts'

const DB_NAME = 'mcpation-files-v1'
const STORE_NAME = 'handles'
const ROOT_KEY = 'environment-root'
const MAX_WORKSPACE_FILES = 240
const MAX_WORKSPACE_DEPTH = 5
const MAX_WORKSPACE_FILE_BYTES = 250_000
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', 'graphify-out'])
const WORKSPACE_FILE_NAMES = new Set(['.mcp.json', 'mcp.json', 'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'pyproject.toml', 'requirements.txt', 'uv.lock', 'poetry.lock', 'setup.py', 'agents.md', 'agents.override.md', 'skill.md'])
let rootHandle: FileSystemDirectoryHandle | null = null
let latestAnalysis: AnalysisResult | null = null
let importedFiles: File[] = []
let accessMode: 'direct' | 'import' | 'demo' | null = null
let demoFiles: WorkspaceFile[] | null = null

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

async function readDocuments(root: FileSystemDirectoryHandle): Promise<ConfigDocument[]> {
  const documents: ConfigDocument[] = []
  for (const source of SOURCES) {
    for (const parts of source.paths) {
      const handle = await fileAt(root, parts)
      if (!handle) continue
      const file = await handle.getFile()
      documents.push({ label: source.label, client: source.client, path: parts.join('/'), format: source.format, text: await file.text(), manualOnly: source.manualOnly })
      break
    }
  }
  return documents
}

function isInterestingWorkspaceFile(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase()
  const name = normalizedPath.split('/').pop() || ''
  return Boolean(matchCodexSourceForPath(normalizedPath) || WORKSPACE_FILE_NAMES.has(name) || (name === 'skill.md' && normalizedPath.includes('/skills/')))
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

async function permissionGranted(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try { return await handle.queryPermission({ mode: 'readwrite' }) === 'granted' } catch { return false }
}

async function scanRoot(root: FileSystemDirectoryHandle): Promise<AnalysisResult> {
  const documents = await readDocuments(root)
  const workspaceFiles = await readWorkspaceFiles(root)
  latestAnalysis = analyzeCodexWorkspace(workspaceFiles, documents, { root: root.name, mode: 'direct', filesConsidered: workspaceFiles.length })
  accessMode = 'direct'
  window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestAnalysis.scan }))
  return latestAnalysis
}

async function scanImportedFiles(files: File[]): Promise<AnalysisResult> {
  const documents: ConfigDocument[] = []
  const seen = new Set<string>()
  const workspaceFiles: WorkspaceFile[] = []
  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name
    if (!isInterestingWorkspaceFile(relativePath)) continue
    if (file.size > MAX_WORKSPACE_FILE_BYTES) continue
    const text = await file.text()
    workspaceFiles.push({ path: relativePath.replace(/^[^/]+\//, ''), text })
    const match = matchCodexSourceForPath(relativePath)
    if (!match || seen.has(match.source.label)) continue
    seen.add(match.source.label)
    documents.push({ label: match.source.label, client: match.source.client, path: match.path.join('/'), format: match.source.format, text, manualOnly: true })
  }
  if (!workspaceFiles.length) throw new Error('No Codex/MCP workspace files were found in that folder.')
  latestAnalysis = analyzeCodexWorkspace(workspaceFiles, documents, { root: 'Imported workspace', mode: 'import', filesConsidered: workspaceFiles.length })
  latestAnalysis.scan.proposals = latestAnalysis.scan.proposals.map((proposal) => proposal.canApply ? { ...proposal, kind: 'manual-review', canApply: false, detail: `${proposal.detail} Reopen this folder in a browser with direct File System Access to apply it here.` } : proposal)
  latestAnalysis.scan.recommendations = latestAnalysis.scan.recommendations.map((item) => ({ ...item, action: item.action === 'Review the backed-up browser write' ? 'Review with Codex or reopen in a direct-access browser' : item.action }))
  latestAnalysis.removals = []
  accessMode = 'import'
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
  rootHandle = await window.showDirectoryPicker({ id: 'mcpation-environment', mode: 'readwrite' })
  await storeRoot(rootHandle)
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
  rootHandle ||= await restoreRoot()
  if (!rootHandle || !(await permissionGranted(rootHandle))) throw new Error('Ask the user to connect their environment folder from the visible page first.')
  return scanRoot(rootHandle)
}

export async function applyBrowserFixes(actionIds: string[]): Promise<ApplyResult> {
  if (accessMode === 'import') throw new Error('This embedded browser granted read-only folder import. Review the plan with Codex or reopen MCPation in a direct-access browser to write backups and fixes.')
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
  if (!rootHandle || !(await permissionGranted(rootHandle)) || !latestAnalysis) throw new Error('Reconnect the environment before applying a reviewed change.')
  const requested = [...new Set(actionIds)]
  const known = new Set(latestAnalysis.removals.map((action) => action.actionId))
  const unknown = requested.filter((actionId) => !known.has(actionId))
  if (unknown.length) throw new Error(`The cleanup request contains unknown action id(s): ${unknown.join(', ')}`)
  const actions = latestAnalysis.removals.filter((action) => requested.includes(action.actionId))
  const appliedActionIds: string[] = []
  const skippedActionIds: string[] = []
  const backups: string[] = []
  for (const action of actions) {
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
  }
  const result = await scanRoot(rootHandle)
  return { ...result, appliedActionIds, skippedActionIds, backups }
}

export const getLatestAnalysis = () => latestAnalysis
export const getAccessMode = () => accessMode
