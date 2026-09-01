const fs = require('fs')
const required = ['README.md', 'SUBMISSION.md', 'JUDGE_GUIDE.md', 'VIDEO_SCRIPT_EN.md', 'DEMO_RUNBOOK.md', 'LICENSE', 'src/App.tsx', 'src/mcpation.ts', 'src/mcpation.css', 'src/webmcp/polyfill.ts', 'scripts/mcpation-companion.cjs']
let failed = false
for (const file of required) { const ok = fs.existsSync(file); console.log(`${ok ? '✓' : '✗'} ${file}`); failed ||= !ok }
const app = fs.readFileSync('src/mcpation.ts', 'utf8')
if (!app.includes('normalizeScan') || !app.includes('schemaVersion')) { console.log('✗ rolling companion upgrade guard is missing'); failed = true }
for (const tool of ['mcpation_scan_environment', 'mcpation_get_inventory', 'mcpation_get_findings', 'mcpation_get_environment_matrix', 'mcpation_get_host_profile', 'mcpation_get_recommendations', 'mcpation_plan_cleanup']) { const ok = app.includes(tool); console.log(`${ok ? '✓' : '✗'} ${tool}`); failed ||= !ok }
if (/betterloop|magic picker/i.test(app + fs.readFileSync('src/App.tsx', 'utf8'))) { console.log('✗ retired product name remains in active source'); failed = true }
if (failed) process.exit(1)
console.log('MCPation verification passed.')
