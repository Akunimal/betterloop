import assert from 'node:assert/strict'
import { analyzeCodexWorkspace } from '../src/codex-analysis.ts'
import { applyBrowserFixes, connectEnvironment, grantWriteAccessToConnectedEnvironment, ingestHostSnapshot, listBrowserBackups, restoreBrowserBackup, startDemoEnvironment } from '../src/mcp-files.ts'
import { analyzeDocuments } from '../src/mcp-analysis.ts'
import { parseCleanupToolInput, parseHostHandoffInput, parseHostSnapshotInput } from '../src/mcp-tool-input.ts'
import { matchSourceForPath } from '../src/mcp-paths.ts'
import { buildHostApplyHandoff, buildHostScanHandoff } from '../src/codex-handoff.ts'
import { DEMO_WORKSPACE_FILES } from '../src/demo-workspace.ts'
import type { ConfigDocument } from '../src/mcp-types.ts'

const documents: ConfigDocument[] = [
  {
    label: 'Claude Desktop', client: 'Claude Desktop', path: 'AppData/Roaming/Claude/claude_desktop_config.json', format: 'json',
    text: JSON.stringify({ mcpServers: { shared: { command: 'npx', args: ['-y', 'shared-mcp'], env: { SECRET_TOKEN: 'never-return-this' } }, disabled: { command: 'node', args: ['server.js'], disabled: true } } }),
  },
  {
    label: 'Cursor', client: 'Cursor', path: '.cursor/mcp.json', format: 'json',
    text: '{\n  // JSONC is accepted but never auto-written\n  "mcpServers": { "shared": { "command": "npx", "args": ["-y", "shared-mcp"], "env": { "SECRET_TOKEN": "never-return-this" } }, "broken": { "url": "not a url" }, },\n}',
  },
  {
    label: 'VS Code User', client: 'VS Code', path: 'AppData/Roaming/Code/User/mcp.json', format: 'json',
    text: JSON.stringify({ servers: { shared: { command: 'npx', args: ['-y', 'shared-mcp'], env: { SECRET_TOKEN: 'never-return-this' } } } }),
  },
  {
    label: 'Codex', client: 'Codex', path: '.codex/config.toml', format: 'toml', manualOnly: true,
    text: 'shell = "pwsh"\n\n[mcp_servers.codex_only]\ncommand = "node"\nargs = ["codex-server.js"]\n',
  },
]

const { scan, removals } = analyzeDocuments(documents, 'test')

assert.equal(scan.schemaVersion, 6)
assert.equal(scan.servers.length, 6)
assert.equal(scan.host.codexShell, 'pwsh')
assert.ok(scan.findings.some((finding) => finding.title === 'Exact duplicate: shared'))
assert.ok(scan.findings.some((finding) => finding.title === 'broken has an invalid URL'))
assert.ok(scan.findings.some((finding) => finding.title === 'disabled is disabled'))
assert.ok(scan.findings.some((finding) => finding.title.startsWith('Coverage gap:')))
assert.equal(removals.length, 1)
assert.equal(scan.proposals.find((proposal) => proposal.id === removals[0].actionId)?.canApply, true)
assert.ok(!JSON.stringify(scan).includes('never-return-this'))
assert.match(scan.privacy, /browser tab/i)
assert.equal(scan.supportedSources.includes('Codex'), true)
assert.equal(scan.supportedSources.includes('Roo Code'), false)

const enriched = analyzeCodexWorkspace([
  { path: '.codex/config.toml', text: documents[3].text },
  { path: 'AGENTS.md', text: '# Workspace rules\nKeep changes small.' },
  { path: '.codex/skills/review/SKILL.md', text: '# Review skill\nReview changes.' },
  { path: 'package.json', text: JSON.stringify({ name: 'demo', dependencies: { '@modelcontextprotocol/sdk': '^1.0.0', zod: '^3.0.0' } }) },
  { path: 'package-lock.json', text: '{}' },
], [documents[3]], { root: 'demo-workspace', mode: 'demo', filesConsidered: 5, platform: 'test' }).scan
assert.equal(enriched.scope.mode, 'demo')
assert.equal(enriched.artifacts.length, 5)
assert.equal(enriched.instructionChain.length, 2)
assert.ok(enriched.toolSurface.some((entry) => entry.kind === 'package-dependency'))
assert.ok(enriched.toolSurface.some((entry) => entry.kind === 'configured-server'))
assert.equal(enriched.artifacts.filter((artifact) => artifact.kind === 'package-manifest').length, 1)
assert.ok(enriched.workspaceGraph.nodes.length >= enriched.artifacts.length)
assert.ok(enriched.workspaceGraph.edges.some((edge) => edge.relation === 'declares'))
assert.equal(new Set(enriched.workspaceGraph.edges.map((edge) => `${edge.from}:${edge.to}:${edge.relation}`)).size, enriched.workspaceGraph.edges.length)
assert.ok(!JSON.stringify(enriched.workspaceGraph).includes('Keep changes small'))

const graphStressFiles = Array.from({ length: 260 }, (_, index) => ({
  path: `packages/${index}/package.json`,
  text: JSON.stringify({ dependencies: { [`@example/mcp-${index}`]: '^1.0.0' } }),
}))
const graphStress = analyzeCodexWorkspace(graphStressFiles, [], { root: 'stress', mode: 'demo', filesConsidered: graphStressFiles.length, platform: 'test' }).scan.workspaceGraph
assert.ok(graphStress.nodes.length <= 180)
assert.ok(graphStress.edges.length <= 240)
assert.ok(enriched.readiness.value > 0)

const hostScanHandoff = buildHostScanHandoff('import')
assert.equal(hostScanHandoff.protocol, 'mcpation-codex-host/v1')
assert.equal(hostScanHandoff.operation, 'scan')
assert.equal(hostScanHandoff.permissionRequest.mode, 'read')
assert.ok(hostScanHandoff.scope.relativeAllowlist.includes('.codex/config.toml'))

;(globalThis as any).window = { dispatchEvent: () => true }
const host = ingestHostSnapshot(DEMO_WORKSPACE_FILES)
assert.equal(host.scan.scope.mode, 'codex-host')
assert.equal(host.removals.length, 2)
const nestedHost = ingestHostSnapshot(DEMO_WORKSPACE_FILES.map((file) => ({ ...file, path: `project/${file.path}` })))
assert.equal(nestedHost.removals[0].path, 'project/.mcp.json')
assert.equal(nestedHost.scan.artifacts.some((artifact) => artifact.path === 'project/.codex/config.toml'), true)
assert.equal(nestedHost.scan.instructionChain.some((entry) => entry.path === 'project/AGENTS.md'), true)
assert.equal(ingestHostSnapshot([{ path: 'skills/review/skill.md', text: '# Skill' }]).scan.instructionChain[0].kind, 'SKILL.md')
assert.throws(() => ingestHostSnapshot([{ path: 'C:/private/.mcp.json', text: '{}' }]), /relative path/)
assert.throws(() => ingestHostSnapshot([{ path: './.mcp.json', text: '{}' }]), /outside the Codex workspace allowlist/)
assert.throws(() => ingestHostSnapshot([{ path: '.mcp.json', text: '{}' }, { path: '.mcp.json', text: '{}' }]), /duplicate workspace path/)
assert.equal(ingestHostSnapshot([{ path: 'skills/review/SKILL.md', text: '# Skill' }]).scan.instructionChain.length, 1)
const hostApplyHandoff = buildHostApplyHandoff(host, [host.removals[0].actionId], 'codex-host')
assert.equal(hostApplyHandoff.operation, 'apply')
assert.equal(hostApplyHandoff.permissionRequest.mode, 'write')
assert.equal(hostApplyHandoff.actions[0].actionId, host.removals[0].actionId)
assert.equal(buildHostApplyHandoff(host, [host.removals[0].actionId], 'import').actions.length, 1)
assert.equal(buildHostApplyHandoff(host, [host.removals[0].actionId], 'demo').status, 'rescan-required')

const demo = startDemoEnvironment()
assert.equal(demo.scan.scope.mode, 'demo')
assert.equal(demo.removals.length, 2)
const demoApplied = await applyBrowserFixes([demo.removals[0].actionId])
assert.deepEqual(demoApplied.appliedActionIds, [demo.removals[0].actionId])
assert.equal(demoApplied.backups[0], '.mcp.json.mcpation-demo.bak')
assert.equal(demoApplied.scan.findings.some((finding) => finding.title.startsWith('Exact duplicate:')), true)

class MemoryFile {
  kind = 'file' as const
  name: string
  value: string
  constructor(name: string, value: string) { this.name = name; this.value = value }
  async getFile() { return { size: Buffer.byteLength(this.value), text: async () => this.value } }
  async createWritable() {
    let next = ''
    return { write: async (value: string) => { next = value }, close: async () => { this.value = next } }
  }
  text() { return this.value }
}

class MemoryDirectory {
  kind = 'directory' as const
  readonly entries = new Map<string, MemoryDirectory | MemoryFile>()
  requests = 0
  name: string
  constructor(name: string) { this.name = name }
  async *values() { yield* this.entries.values() }
  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    const entry = this.entries.get(name)
    if (entry?.kind === 'directory') return entry
    if (options?.create) { const directory = new MemoryDirectory(name); this.entries.set(name, directory); return directory }
    throw new Error(`Missing directory ${name}`)
  }
  async getFileHandle(name: string, options?: { create?: boolean }) {
    const entry = this.entries.get(name)
    if (entry?.kind === 'file') return entry
    if (options?.create) { const file = new MemoryFile(name, ''); this.entries.set(name, file); return file }
    throw new Error(`Missing file ${name}`)
  }
  async queryPermission() { return 'granted' as const }
  async requestPermission() { this.requests += 1; return 'granted' as const }
}

const browserRoot = new MemoryDirectory('browser-workspace')
const codexDir = new MemoryDirectory('.codex')
codexDir.entries.set('config.toml', new MemoryFile('config.toml', 'shell = "pwsh"\n\n[mcp_servers.filesystem]\ncommand = "npx"\nargs = ["-y", "@modelcontextprotocol/server-filesystem", "./workspace"]\n'))
browserRoot.entries.set('.codex', codexDir)
const browserMcp = new MemoryFile('.mcp.json', JSON.stringify({ mcpServers: {
  filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', './workspace'] },
  'filesystem-copy': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', './workspace'] },
} }))
browserRoot.entries.set('.mcp.json', browserMcp)
const browserGitignore = new MemoryFile('.gitignore', 'node_modules/\n')
browserRoot.entries.set('.gitignore', browserGitignore)
;(globalThis as any).window = {
  dispatchEvent: () => true,
  showDirectoryPicker: async (options: { mode: string }) => { assert.equal(options.mode, 'readwrite'); return browserRoot },
}
const direct = await connectEnvironment()
const directAction = direct.removals.find((item) => item.path === '.mcp.json')
assert.ok(directAction)
await grantWriteAccessToConnectedEnvironment()
const directApplied = await applyBrowserFixes([directAction.actionId])
assert.deepEqual(directApplied.appliedActionIds, [directAction.actionId])
assert.equal(directApplied.skippedActionIds.length, 0)
assert.equal(browserRoot.requests, 1)
assert.match(browserMcp.text(), /filesystem/)
assert.equal(Object.keys(JSON.parse(browserMcp.text()).mcpServers).length, 1)
const browserBackups = browserRoot.entries.get('.mcpation-backups') as MemoryDirectory
assert.ok(browserBackups)
assert.ok([...browserBackups.entries.keys()].some((name) => /^.*-\.mcp\.json\.bak$/.test(name)))
assert.match(browserGitignore.text(), /\.mcpation-backups\//)
const listedBackups = await listBrowserBackups()
assert.equal(listedBackups.length, 1)
assert.equal(listedBackups[0].path, '.mcp.json')
const restored = await restoreBrowserBackup(listedBackups[0].id)
assert.equal(restored.restoredPath, '.mcp.json')
assert.ok(restored.safetyBackup.startsWith('.mcpation-backups/restore-'))
assert.equal(Object.keys(JSON.parse(browserMcp.text()).mcpServers).length, 2)
const restoredEntries = await listBrowserBackups()
assert.equal(restoredEntries.length, 1)
assert.ok(restoredEntries[0].restoredAt)
await assert.rejects(() => restoreBrowserBackup(listedBackups[0].id), /already restored/)
browserBackups.entries.set('2026-09-02T15-44-33-209Z-.mcp.json.bak', new MemoryFile('2026-09-02T15-44-33-209Z-.mcp.json.bak', browserMcp.text()))
const legacyEntries = await listBrowserBackups()
assert.equal(legacyEntries.length, 2)
assert.ok(legacyEntries.find((entry) => entry.id.startsWith('2026-09-'))?.restoredAt)
delete (globalThis as any).window

assert.deepEqual(parseCleanupToolInput({ actionIds: ['remove-one', 'remove-one'], confirm: true }), ['remove-one'])
assert.throws(() => parseCleanupToolInput({ actionIds: ['remove-one'] }), /confirm: true/)
assert.throws(() => parseCleanupToolInput({ actionIds: [] , confirm: true }), /non-empty array/)
assert.deepEqual(parseHostHandoffInput({ operation: 'scan' }), { operation: 'scan', actionIds: [] })
assert.deepEqual(parseHostHandoffInput({ operation: 'apply', actionIds: ['one', 'one'] }), { operation: 'apply', actionIds: ['one'] })
assert.equal(parseHostSnapshotInput({ files: [{ path: '.mcp.json', text: '{}' }] })[0].path, '.mcp.json')
assert.throws(() => parseHostSnapshotInput({ files: [] }), /non-empty array/)

const empty = analyzeDocuments([], 'test').scan
assert.equal(empty.servers.length, 0)
assert.equal(empty.findings[0].severity, 'healthy')

assert.equal(matchSourceForPath('Home/.codex/config.toml')?.source.label, 'Codex')
assert.equal(matchSourceForPath('.codex/config.toml')?.source.label, 'Codex')
assert.equal(matchSourceForPath('Home/.mcp.json')?.source.label, 'Codex workspace MCP')
assert.equal(matchSourceForPath('Home/Documents/notes.json'), null)

const nativeTools: any[] = []
;(globalThis as any).window = { dispatchEvent: () => true }
;(globalThis as any).document = { modelContext: { registerTool: async (tool: any) => { nativeTools.push(tool) }, getTools: () => nativeTools } }
const mcpation = await import('../src/mcpation.ts')
const registeredNames = await mcpation.registerMCPationTools()
assert.equal(registeredNames.length, 12)
assert.equal(mcpation.getMCPationMode(), 'native')
const registeredTool = (name: string) => nativeTools.find((tool) => tool.name === name)
assert.ok((await registeredTool('codex_get_workspace_graph').execute({})).nodes.length > 0)
assert.equal((await registeredTool('codex_request_host_handoff').execute({ operation: 'scan' })).protocol, 'mcpation-codex-host/v1')
const submitted = await registeredTool('codex_submit_host_snapshot').execute({ files: DEMO_WORKSPACE_FILES })
assert.equal(submitted.scope.mode, 'codex-host')
const registeredPlan = await registeredTool('codex_plan_hardening').execute({})
const registeredActionId = registeredPlan.items.find((item: { canApply: boolean }) => item.canApply)?.id
assert.ok(registeredActionId)
const registeredApply = await registeredTool('codex_apply_hardening').execute({ actionIds: [registeredActionId], confirm: true })
assert.equal(registeredApply.handoff.operation, 'apply')
assert.equal(registeredApply.handoff.actions[0].actionId, registeredActionId)
const verified = await registeredTool('codex_verify_workspace').execute({})
assert.equal(verified.readiness.value, submitted.readiness.value)
delete (globalThis as any).window
delete (globalThis as any).document

console.log('MCPation browser analysis tests passed.')
