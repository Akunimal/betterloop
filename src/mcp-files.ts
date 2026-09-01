import { analyzeDocuments } from './mcp-analysis'
import { MCP_CONFIG_SOURCES as SOURCES, matchSourceForPath } from './mcp-paths'
import type { AnalysisResult, ConfigDocument } from './mcp-types'

const DB_NAME = 'mcpation-files-v1'
const STORE_NAME = 'handles'
const ROOT_KEY = 'environment-root'
let rootHandle: FileSystemDirectoryHandle | null = null
let latestAnalysis: AnalysisResult | null = null
let importedFiles: File[] = []
let accessMode: 'direct' | 'import' | null = null

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

async function permissionGranted(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try { return await handle.queryPermission({ mode: 'readwrite' }) === 'granted' } catch { return false }
}

async function scanRoot(root: FileSystemDirectoryHandle): Promise<AnalysisResult> {
  latestAnalysis = analyzeDocuments(await readDocuments(root))
  accessMode = 'direct'
  window.dispatchEvent(new CustomEvent('mcpation:scan', { detail: latestAnalysis.scan }))
  return latestAnalysis
}

async function scanImportedFiles(files: File[]): Promise<AnalysisResult> {
  const documents: ConfigDocument[] = []
  const seen = new Set<string>()
  for (const file of files) {
    const match = matchSourceForPath(file.webkitRelativePath || file.name)
    if (!match || seen.has(match.source.label)) continue
    seen.add(match.source.label)
    documents.push({ label: match.source.label, client: match.source.client, path: match.path.join('/'), format: match.source.format, text: await file.text(), manualOnly: true })
  }
  if (!documents.length) throw new Error('No supported MCP configuration files were found in that folder.')
  latestAnalysis = analyzeDocuments(documents)
  latestAnalysis.scan.proposals = latestAnalysis.scan.proposals.map((proposal) => proposal.canApply ? { ...proposal, kind: 'manual-review', canApply: false, detail: `${proposal.detail} Reopen this folder in a browser with direct File System Access to apply it here.` } : proposal)
  latestAnalysis.scan.recommendations = latestAnalysis.scan.recommendations.map((item) => ({ ...item, action: item.action === 'Review the backed-up browser write' ? 'Review with Codex or reopen in a direct-access browser' : item.action }))
  latestAnalysis.removals = []
  accessMode = 'import'
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
  importedFiles = selectedFiles.filter((file) => Boolean(matchSourceForPath(file.webkitRelativePath || file.name)))
  if (!importedFiles.length) throw new Error('No supported MCP configuration files were found in that folder.')
  return scanImportedFiles(importedFiles)
}

export async function rescanEnvironment(): Promise<AnalysisResult> {
  if (accessMode === 'import' && importedFiles.length) return scanImportedFiles(importedFiles)
  rootHandle ||= await restoreRoot()
  if (!rootHandle || !(await permissionGranted(rootHandle))) throw new Error('Ask the user to connect their environment folder from the visible page first.')
  return scanRoot(rootHandle)
}

export async function applyBrowserFixes(actionIds: string[]): Promise<AnalysisResult> {
  if (accessMode === 'import') throw new Error('This embedded browser granted read-only folder import. Review the plan with Codex or reopen MCPation in a direct-access browser to write backups and fixes.')
  rootHandle ||= await restoreRoot()
  if (!rootHandle || !(await permissionGranted(rootHandle)) || !latestAnalysis) throw new Error('Reconnect the environment before applying a reviewed change.')
  const actions = latestAnalysis.removals.filter((action) => actionIds.includes(action.actionId))
  for (const action of actions) {
    const parts = action.path.split('/')
    const handle = await fileAt(rootHandle, parts)
    if (!handle) continue
    const file = await handle.getFile()
    const original = await file.text()
    const document = JSON.parse(original) as Record<string, Record<string, unknown>>
    if (!document[action.groupKey] || !(action.serverName in document[action.groupKey])) continue
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
  }
  return scanRoot(rootHandle)
}

export const getLatestAnalysis = () => latestAnalysis
export const getAccessMode = () => accessMode
