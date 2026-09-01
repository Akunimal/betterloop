import assert from 'node:assert/strict'
import { analyzeDocuments } from '../src/mcp-analysis.ts'
import { matchSourceForPath } from '../src/mcp-paths.ts'
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

assert.equal(scan.schemaVersion, 4)
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
assert.equal(scan.supportedSources.includes('Roo Code'), true)

const empty = analyzeDocuments([], 'test').scan
assert.equal(empty.servers.length, 0)
assert.equal(empty.findings[0].severity, 'healthy')

assert.equal(matchSourceForPath('Home/.codex/config.toml')?.source.label, 'Codex')
assert.equal(matchSourceForPath('Home\\AppData\\Roaming\\Code\\User\\mcp.json')?.source.label, 'VS Code User')
assert.equal(matchSourceForPath('Home/Documents/notes.json'), null)

console.log('MCPation browser analysis tests passed.')
