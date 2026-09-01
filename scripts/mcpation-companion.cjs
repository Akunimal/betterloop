#!/usr/bin/env node
/* MCPation companion: local-only, consented, and read-only unless a user later reviews an exact JSON duplicate. */
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { spawnSync } = require('child_process')

const port = 4318
const home = os.homedir()
const sessions = new Map()
const id = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 16)
const platformConfig = process.platform === 'win32'
  ? (process.env.APPDATA || path.join(home, 'AppData', 'Roaming'))
  : process.platform === 'darwin'
    ? path.join(home, 'Library', 'Application Support')
    : (process.env.XDG_CONFIG_HOME || path.join(home, '.config'))
const codeStorage = (extension) => path.join(platformConfig, 'Code', 'User', 'globalStorage', extension, 'settings', 'mcp_settings.json')
const sources = [
  { label: 'Codex', file: path.join(home, '.codex', 'config.toml'), format: 'toml' },
  { label: 'Claude Desktop', file: path.join(platformConfig, 'Claude', 'claude_desktop_config.json'), format: 'json', keys: ['mcpServers', 'mcp_servers'] },
  { label: 'Cursor', file: path.join(home, '.cursor', 'mcp.json'), format: 'json', keys: ['mcpServers', 'mcp_servers'] },
  { label: 'Windsurf', file: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'), format: 'json', keys: ['mcpServers', 'mcp_servers'] },
  { label: 'VS Code Agent Host', client: 'VS Code', file: path.join(home, '.copilot', 'mcp-config.json'), format: 'json', keys: ['servers', 'mcpServers', 'mcp_servers'] },
  { label: 'VS Code User', client: 'VS Code', file: path.join(platformConfig, 'Code', 'User', 'mcp.json'), format: 'json', keys: ['servers', 'mcpServers', 'mcp_servers'] },
  { label: 'Cline', file: codeStorage('saoudrizwan.claude-dev'), format: 'json', keys: ['mcpServers', 'mcp_servers'] },
  { label: 'Roo Code', file: codeStorage('rooveterinaryinc.roo-cline'), format: 'json', keys: ['mcpServers', 'mcp_servers'] },
  { label: 'Zed', file: path.join(platformConfig, 'zed', 'settings.json'), format: 'json', keys: ['context_servers'], manualOnly: true },
]
const ideSettings = [
  { label: 'VS Code', file: path.join(platformConfig, 'Code', 'User', 'settings.json') },
]
const allowedOrigin = (origin = '') => Boolean(origin) && (origin === process.env.MCPATION_ALLOWED_ORIGIN || /^https:\/\/mcpation(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin) || /^http:\/\/localhost(?::\d+)?$/i.test(origin))
function cors(req, res) { const origin = req.headers.origin || ''; if (allowedOrigin(origin)) res.setHeader('access-control-allow-origin', origin); res.setHeader('access-control-allow-headers', 'content-type,x-mcpation-session'); res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS') }
function send(res, code, body) { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }
function readBody(req) { return new Promise((resolve) => { let raw = ''; req.on('data', (chunk) => raw += chunk); req.on('end', () => { try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) } }) }) }
function target(command, url) { if (url) { try { return new URL(url).origin } catch { return 'invalid URL' } } return command ? path.basename(command) : 'missing transport' }
function available(command) { if (!command) return true; return spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], { windowsHide: true, timeout: 1200 }).status === 0 }
function signature(value) { return id(JSON.stringify({ command: value.command || '', args: value.args || [], url: value.url || '', disabled: Boolean(value.disabled) })) }
function hostProfile() {
  const windows = process.platform === 'win32'
  const gitBashInstalled = windows && [path.join(process.env.ProgramFiles || '', 'Git', 'bin', 'bash.exe'), path.join(process.env['ProgramFiles(x86)'] || '', 'Git', 'bin', 'bash.exe'), path.join(home, 'scoop', 'apps', 'git', 'current', 'bin', 'bash.exe')].some((candidate) => fs.existsSync(candidate))
  const wslReady = windows && spawnSync('wsl.exe', ['--status'], { windowsHide: true, timeout: 1800, stdio: 'ignore' }).status === 0
  let codexShell = 'not explicitly configured'
  try { const match = fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8').match(/^\s*shell\s*=\s*["']([^"']+)["']/mi); if (match) codexShell = path.basename(match[1]) } catch { /* Codex configuration is optional. */ }
  const recommendedShell = windows ? (gitBashInstalled ? 'Git Bash for POSIX-focused commands' : 'PowerShell for Windows-native commands') : 'the system default shell'
  return { operatingSystem: windows ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux', gitBashInstalled, wslReady, codexShell, recommendedShell }
}
function parseJsonDocument(file) { const raw = fs.readFileSync(file, 'utf8'); try { return JSON.parse(raw) } catch { return JSON.parse(raw.replace(/^\s*\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1')) } }
function parseJson(source) {
  const document = parseJsonDocument(source.file)
  const groupKey = source.keys.find((key) => document[key] && typeof document[key] === 'object')
  const group = groupKey ? document[groupKey] : {}
  const servers = Object.entries(group).filter(([, value]) => value && typeof value === 'object').map(([name, value]) => ({
    key: `${source.label}:${name}:${id(source.file)}`, name, label: source.label, client: source.client || source.label, file: source.file, format: 'json', groupKey, manualOnly: Boolean(source.manualOnly),
    transport: value.url ? 'http' : 'stdio', target: target(value.command, value.url), command: value.command || '', url: value.url || '', disabled: Boolean(value.disabled), available: value.command ? available(value.command) : true, signature: signature(value),
  }))
  return { servers, malformed: !groupKey && Object.keys(document).length > 0 }
}
function parseToml(source) {
  const text = fs.readFileSync(source.file, 'utf8'); const servers = []; let name = null; let values = {}
  const scalar = (value) => value.trim().replace(/^['"]|['"]$/g, '')
  const commit = () => { if (!name) return; const command = scalar(values.command || ''); const url = scalar(values.url || ''); servers.push({ key: `${source.label}:${name}:${id(source.file)}`, name, label: source.label, client: source.client || source.label, file: source.file, format: 'toml', transport: url ? 'http' : 'stdio', target: target(command, url), command, url, disabled: scalar(values.enabled || '') === 'false' || scalar(values.disabled || '') === 'true', available: command ? available(command) : true, signature: id(JSON.stringify(values)) }) }
  for (const raw of text.split(/\r?\n/)) { const header = raw.match(/^\s*\[mcp_servers\.([A-Za-z0-9_-]+|"[^"]+"|'[^']+')\]\s*$/); if (header) { commit(); name = header[1].replace(/^['"]|['"]$/g, ''); values = {}; continue } if (/^\s*\[/.test(raw)) { commit(); name = null; values = {}; continue } const pair = raw.match(/^\s*(command|url|enabled|disabled|args)\s*=\s*(.+?)\s*(?:#.*)?$/); if (name && pair) values[pair[1]] = pair[2].trim() }
  commit(); return { servers, malformed: false }
}
function inventory() {
  const all = []; const found = []; const errors = []; const malformed = []
  for (const source of sources) { if (!source.file || !fs.existsSync(source.file)) continue; try { const parsed = source.format === 'toml' ? parseToml(source) : parseJson(source); all.push(...parsed.servers); found.push(source); if (parsed.malformed) malformed.push(source.label) } catch { errors.push(source.label) } }
  const policies = []
  for (const setting of ideSettings) { if (!fs.existsSync(setting.file)) continue; try { const document = parseJsonDocument(setting.file); policies.push({ label: setting.label, mcpAccess: typeof document['chat.mcp.access'] === 'string' ? document['chat.mcp.access'] : 'default', discovery: document['chat.mcp.discovery.enabled'], outputCompression: document['chat.tools.compressOutput.enabled'] }) } catch { errors.push(`${setting.label} settings`) } }
  return { all, found, errors, malformed, policies }
}
function diagnose() {
  const { all, found, errors, malformed, policies } = inventory(); const findings = []; const proposals = []
  const host = hostProfile()
  const add = (severity, title, detail) => findings.push({ id: id(title + detail), severity, title, detail })
  const bySignature = new Map(); const byName = new Map()
  for (const server of all) { bySignature.set(server.signature, [...(bySignature.get(server.signature) || []), server]); byName.set(server.name.toLowerCase(), [...(byName.get(server.name.toLowerCase()) || []), server]) }
  for (const matches of bySignature.values()) if (matches.length > 1) { const [keep, ...duplicates] = matches; add('attention', `Exact duplicate: ${keep.name}`, `The same server definition appears in ${matches.map((item) => item.label).join(', ')}.`); for (const duplicate of duplicates) proposals.push({ id: `remove-${duplicate.key}`, title: `Remove duplicate ${duplicate.name} from ${duplicate.label}`, detail: `Keeps the identical definition in ${keep.label}. A backup is mandatory.`, kind: 'remove-json-entry', canApply: duplicate.format === 'json' && !duplicate.manualOnly, serverKey: duplicate.key }) }
  for (const matches of byName.values()) if (matches.length > 1 && new Set(matches.map((item) => item.signature)).size > 1) add('review', `Name conflict: ${matches[0].name}`, `This server name has different definitions in ${matches.map((item) => item.label).join(', ')}. Choose a canonical configuration manually.`)
  for (const server of all.filter((item) => !item.command && !item.url)) { add('attention', `${server.name} has no transport`, `Configured in ${server.label} without a command or URL.`); proposals.push({ id: `transport-${server.key}`, title: `Complete ${server.name} transport`, detail: 'Add the intended command or URL manually. MCPation never invents an endpoint.', kind: 'manual-review', canApply: false, serverKey: server.key }) }
  for (const server of all.filter((item) => item.url && item.target === 'invalid URL')) { add('attention', `${server.name} has an invalid URL`, `Configured in ${server.label}; review the endpoint format manually.`); proposals.push({ id: `url-${server.key}`, title: `Correct ${server.name} URL`, detail: 'Endpoint repairs stay manual so MCPation never redirects a tool to an unreviewed service.', kind: 'manual-review', canApply: false, serverKey: server.key }) }
  for (const server of all.filter((item) => item.disabled)) { add('review', `${server.name} is disabled`, `Configured in ${server.label}; confirm whether it is intentionally retained.`); proposals.push({ id: `disabled-${server.key}`, title: `Review disabled ${server.name}`, detail: 'Disabled entries are never removed automatically because they may be intentionally preserved.', kind: 'manual-review', canApply: false, serverKey: server.key }) }
  for (const server of all.filter((item) => item.available === false)) { add('attention', `${server.name} command is unavailable`, `The configured executable cannot be resolved from PATH.`); proposals.push({ id: `command-${server.key}`, title: `Repair ${server.name} command`, detail: 'Choose the correct executable or install its dependency. MCPation will not guess a replacement.', kind: 'manual-review', canApply: false, serverKey: server.key }) }
  if (host.operatingSystem === 'Windows' && /bash/i.test(host.codexShell)) { add(host.gitBashInstalled ? 'review' : 'attention', `Codex shell: ${host.codexShell}`, host.gitBashInstalled ? 'Git Bash is installed. Confirm Codex resolves it before relying on POSIX quoting or shell scripts.' : 'Codex is configured for a bash-like shell, but Git Bash was not detected. POSIX quoting may fail.'); proposals.push({ id: 'shell-codex', title: 'Review Codex shell on Windows', detail: host.gitBashInstalled ? 'Git Bash is available. Use it only after confirming the configured shell resolves correctly.' : 'Install or explicitly configure a compatible shell, or use PowerShell-native commands.', kind: 'manual-review', canApply: false }) }
  if (host.operatingSystem === 'Windows' && !host.gitBashInstalled && all.some((server) => /(^|[\\/])bash(?:\.exe)?$/i.test(server.command))) { add('attention', 'A configured MCP expects bash on Windows', 'Git Bash was not detected, so this command may fail before the MCP starts.') }
  const profiles = [...new Set(found.map((source) => source.client || source.label))].map((client) => { const configured = all.filter((server) => server.client === client); const policy = policies.find((item) => item.label === client); return { name: client, configuredServers: configured.map((server) => server.name), mcpAccess: policy?.mcpAccess || 'unknown', discovery: policy?.discovery === false ? 'off' : policy?.discovery === true ? 'on' : 'unknown' } })
  for (const profile of profiles) { if (profile.mcpAccess === 'none') { add('attention', `${profile.name} blocks MCP tools`, 'The IDE policy disables MCP access even if a server is configured.'); proposals.push({ id: `access-${profile.name}`, title: `Review ${profile.name} MCP access`, detail: 'Set the IDE MCP access policy intentionally; MCPation will not override an organization or user policy.', kind: 'manual-review', canApply: false }) } if (profile.discovery === 'off') { add('review', `${profile.name} MCP discovery is off`, 'Servers configured by other supported clients will not be automatically discovered by this IDE.'); proposals.push({ id: `discovery-${profile.name}`, title: `Review ${profile.name} MCP discovery`, detail: 'Enable discovery only if sharing MCP configuration across clients is desired.', kind: 'manual-review', canApply: false }) } }
  for (const policy of policies) if (policy.outputCompression === false) { add('review', `${policy.label} terminal output compression is off`, 'Large terminal output can consume unnecessary agent context.'); proposals.push({ id: `compression-${policy.label}`, title: `Review ${policy.label} output compression`, detail: 'Consider enabling output compression after confirming it will not hide information you need.', kind: 'manual-review', canApply: false }) }
  if (profiles.length > 1) for (const name of new Set(all.map((server) => server.name))) { const present = profiles.filter((profile) => profile.configuredServers.includes(name)); if (present.length && present.length < profiles.length) { const missing = profiles.filter((profile) => !profile.configuredServers.includes(name)); add('review', `Coverage gap: ${name}`, `Configured for ${present.map((profile) => profile.name).join(', ')} but not for ${missing.map((profile) => profile.name).join(', ')}.`); proposals.push({ id: `coverage-${id(name + missing.map((profile) => profile.name).join())}`, title: `Review ${name} coverage`, detail: 'Decide whether this server should remain scoped or be configured in the other environment.', kind: 'manual-review', canApply: false }) } }
  for (const source of malformed) add('review', `${source} configuration shape is unsupported`, 'MCPation found the file but not a recognized MCP server collection. Review the IDE configuration format manually.')
  for (const source of errors) add('review', `${source} configuration could not be parsed`, 'MCPation did not read its contents. Repair the syntax before making any change.')
  if (!all.length && !errors.length) add('healthy', 'No readable MCP configurations found', 'No supported configuration file was found in the standard local paths for this operating system.')
  if (!findings.length) add('healthy', 'No obvious configuration conflicts', 'The read-only scan found no duplicates, disabled entries, invalid endpoints, or unavailable commands.')
  const recommendations = proposals.map((proposal) => ({ id: proposal.id, priority: proposal.kind === 'remove-json-entry' ? 'high' : 'review', category: proposal.id.startsWith('coverage-') ? 'coverage' : proposal.id.startsWith('shell-') || proposal.id.startsWith('command-') ? 'compatibility' : 'cleanup', title: proposal.title, reason: proposal.detail, action: proposal.canApply ? 'Review the backed-up change' : 'Review with Codex' }))
  if (host.operatingSystem === 'Windows' && !host.wslReady) recommendations.push({ id: 'upgrade-wsl', priority: 'optional', category: 'compatibility', title: 'Add WSL for Linux-first tooling', reason: 'WSL can reduce shell and path friction for MCP servers and build tools designed around Linux.', action: 'Review WSL compatibility before installing' })
  if (host.operatingSystem === 'Windows' && host.gitBashInstalled && host.codexShell === 'not explicitly configured') recommendations.push({ id: 'upgrade-shell-policy', priority: 'review', category: 'compatibility', title: 'Choose a clear Codex shell', reason: 'Git Bash is available, but Codex has no explicit shell choice. A consistent shell reduces quoting retries.', action: 'Choose Git Bash or PowerShell per project' })
  const servers = all.map(({ key, name, label, transport, target: serverTarget, disabled, available: isAvailable }) => ({ id: key, name, source: label, transport, target: serverTarget, disabled, available: isAvailable }))
  return { schemaVersion: 3, scannedAt: new Date().toISOString(), platform: process.platform, host, sources: found.map((source) => source.label), supportedSources: sources.map(({ label }) => label), profiles, servers, findings, proposals, recommendations, privacy: 'Only server metadata is returned. Values under env and headers are never read or sent.', internal: all }
}
function sessionFor(req) { const token = req.headers['x-mcpation-session']; const session = typeof token === 'string' ? sessions.get(token) : null; return session && session.expiresAt > Date.now() && session.origin === (req.headers.origin || '') ? session : null }
function publicResult(result) { const { internal, ...safe } = result; return safe }
function apply(session, selected) {
  const selectedActions = session.last.proposals.filter((proposal) => selected.includes(proposal.id) && proposal.canApply); const writes = new Map()
  for (const action of selectedActions) { const server = session.last.internal.find((item) => item.key === action.serverKey); if (!server || server.format !== 'json' || server.manualOnly) continue; writes.set(server.file, [...(writes.get(server.file) || []), server]) }
  const backupRoot = path.join(home, '.mcpation-backups', new Date().toISOString().replace(/[:.]/g, '-')); const backups = []
  for (const [file, servers] of writes) { const original = fs.readFileSync(file, 'utf8'); fs.mkdirSync(backupRoot, { recursive: true }); const backup = path.join(backupRoot, `${id(file)}-${path.basename(file)}`); fs.writeFileSync(backup, original, 'utf8'); const document = JSON.parse(original); const groupKey = servers[0].groupKey; for (const server of servers) delete document[groupKey][server.name]; fs.writeFileSync(file, JSON.stringify(document, null, 2) + '\n', 'utf8'); backups.push(path.basename(backup)) }
  return { applied: selectedActions.map((action) => action.id), backups, backupRoot: '~/.mcpation-backups/<timestamp>' }
}
if (process.argv.includes('--self-test')) { const result = diagnose(); if (!Array.isArray(result.servers) || !Array.isArray(result.findings) || !Array.isArray(result.proposals) || !Array.isArray(result.supportedSources)) process.exit(1); console.log('MCPation companion self-test passed.'); process.exit(0) }
http.createServer(async (req, res) => { cors(req, res); const origin = req.headers.origin || ''; if (req.method === 'OPTIONS') return send(res, 204, {}); if (req.url === '/health') return send(res, 200, { ok: true, service: 'mcpation-companion' }); if (req.url === '/session' && req.method === 'POST') { if (!allowedOrigin(origin)) return send(res, 403, { error: 'This origin is not allowed to start an MCPation session.' }); const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, { expiresAt: Date.now() + 15 * 60 * 1000, origin, last: null }); return send(res, 200, { token, expiresInSeconds: 900 }) } const session = sessionFor(req); if (req.url === '/scan' && session) { session.last = diagnose(); return send(res, 200, publicResult(session.last)) } if (req.url === '/apply' && req.method === 'POST' && session) { const body = await readBody(req); if (!session.last) return send(res, 409, { error: 'Run a fresh scan before applying a reviewed fix.' }); if (body.confirmation !== 'APPLY_SUPERVISED_FIXES') return send(res, 400, { error: 'Explicit confirmation is required before MCPation writes a backup or configuration file.' }); const outcome = apply(session, Array.isArray(body.selectedActionIds) ? body.selectedActionIds : []); session.last = diagnose(); return send(res, 200, { outcome, scan: publicResult(session.last) }) } return send(res, session ? 404 : 403, { error: session ? 'Not found' : 'Start a new explicit MCPation session from the page.' }) }).listen(port, '127.0.0.1', () => console.log(`MCPation companion listening on http://127.0.0.1:${port}`))
