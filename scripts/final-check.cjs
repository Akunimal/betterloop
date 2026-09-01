const fs = require('fs')
const required = ['README.md', 'SUBMISSION.md', 'JUDGE_GUIDE.md', 'VIDEO_SCRIPT_EN.md', 'DEMO_RUNBOOK.md', 'LICENSE', 'src/App.tsx', 'src/mcpation.ts', 'src/mcp-files.ts', 'src/mcp-paths.ts', 'src/mcp-analysis.ts', 'src/mcp-types.ts', 'src/mcpation.css', 'src/webmcp/polyfill.ts', 'src/webmcp/fsa.d.ts', 'scripts/mcpation-tests.ts']
let failed = false
for (const file of required) { const ok = fs.existsSync(file); console.log(`${ok ? '✓' : '✗'} ${file}`); failed ||= !ok }
const app = fs.readFileSync('src/mcpation.ts', 'utf8')
for (const tool of ['mcpation_scan_environment', 'mcpation_get_inventory', 'mcpation_get_findings', 'mcpation_get_environment_matrix', 'mcpation_get_access_scope', 'mcpation_get_recommendations', 'mcpation_plan_cleanup']) { const ok = app.includes(tool); console.log(`${ok ? '✓' : '✗'} ${tool}`); failed ||= !ok }
const active = app + fs.readFileSync('src/App.tsx', 'utf8') + fs.readFileSync('src/mcp-files.ts', 'utf8')
if (/betterloop|magic picker/i.test(active)) { console.log('✗ retired product name remains in active source'); failed = true }
if (/127\.0\.0\.1:4318|local companion/i.test(active)) { console.log('✗ local companion dependency remains in active source'); failed = true }
if (!active.includes('showDirectoryPicker')) { console.log('✗ native browser file access is missing'); failed = true }
if (failed) process.exit(1)
console.log('MCPation verification passed.')
