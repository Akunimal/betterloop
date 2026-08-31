const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'index.html',
  'README.md',
  'SUBMISSION.md',
  'STATE.md',
  'VIDEO_SCRIPT.md',
  'LICENSE',
  'src/main.tsx',
  'src/App.tsx',
  'src/styles.css',
  'src/webmcp-types.ts',
  'src/webmcp/polyfill.ts',
  'src/webmcp/betterLoopTools.ts',
  'src/state/loopStore.ts',
  'src/components/LoopDashboard.tsx',
  'src/components/ActivityTimeline.tsx',
  'src/ui/sound.ts',
  'scripts/betterloop-stop.cjs',
  '.codex/hooks.json',
  '.betterloop/config.example.json',
]

const obsoleteFiles = [
  'PICKER_BRIDGE.md',
  'extension/agent.js',
  'extension/background.js',
  'extension/content.js',
  'extension/manifest.json',
  'scripts/codex-magic-picker.cjs',
  'scripts/verify-extension.cjs',
  'src/state/activation.ts',
  'src/state/fileResolver.ts',
  'src/webmcp/codexRuntime.ts',
  'src/webmcp/extensionControlBridge.ts',
  'src/webmcp/fsa.d.ts',
  'src/webmcp/magicPickerTool.ts',
  'src/components/ActivationPanel.tsx',
  'src/components/BridgeStatus.tsx',
  'src/components/DirectorySetup.tsx',
  'src/components/ResolverLog.tsx',
  'public/agent-demo.html',
  'public/extension.zip',
  'public/magic.svg',
]

let allGood = true
function check(label, condition) {
  console.log('  ' + (condition ? '✅' : '❌') + ' ' + label)
  allGood = allGood && Boolean(condition)
}

console.log('🔍 BetterLoop — final verification')
for (const file of requiredFiles) check(file, fs.existsSync(path.join(root, file)))
for (const file of obsoleteFiles) check('removed ' + file, !fs.existsSync(path.join(root, file)))

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
check('package name is betterloop', packageJson.name === 'betterloop')
for (const script of ['dev', 'build', 'preview', 'verify']) check('script:' + script, Boolean(packageJson.scripts?.[script]))

const types = fs.readFileSync(path.join(root, 'src/webmcp-types.ts'), 'utf8')
const store = fs.readFileSync(path.join(root, 'src/state/loopStore.ts'), 'utf8')
const tools = fs.readFileSync(path.join(root, 'src/webmcp/betterLoopTools.ts'), 'utf8')
const hook = fs.readFileSync(path.join(root, 'scripts/betterloop-stop.cjs'), 'utf8')
const hookConfig = JSON.parse(fs.readFileSync(path.join(root, '.codex/hooks.json'), 'utf8'))
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const dashboard = fs.readFileSync(path.join(root, 'src/components/LoopDashboard.tsx'), 'utf8')

for (const tool of [
  'betterloop_hook_ready',
  'betterloop_start',
  'betterloop_checkpoint',
  'betterloop_research_blocker',
  'betterloop_verify_completion',
  'betterloop_report_quota',
  'betterloop_resume',
  'betterloop_finish',
  'betterloop_status',
]) check('tool ' + tool, tools.includes('name: \'' + tool + '\''))

check('native document.modelContext contract', fs.readFileSync(path.join(root, 'src/webmcp/polyfill.ts'), 'utf8').includes('document as BetterLoopDocument') && fs.readFileSync(path.join(root, 'src/webmcp/polyfill.ts'), 'utf8').includes('modelContext'))
check('auto continue feature', types.includes('autoContinue') && store.includes('autoContinue: true'))
check('explicit 100% question', types.includes('askIfDone') && hook.includes('Is the job 100% done?'))
check('sound feature', types.includes('soundAlerts') && fs.existsSync(path.join(root, 'src/ui/sound.ts')))
check('five-hour fallback', tools.includes('5 * 60 * 60 * 1000') && hook.includes('quotaAssumptionHours'))
check('research-first guard', types.includes('researchBeforeBlocking') && tools.includes('needsResearch'))
check('Stop hook loop guard', hook.includes('stop_hook_active') && hook.includes("decision: 'block'"))
check('SessionStart hook check', hook.includes("hook_event_name === 'SessionStart'") && hook.includes('hookSpecificOutput') && hook.includes('session_start_hook_confirmed'))
check('Stop hook config shape', Array.isArray(hookConfig.hooks?.Stop) && hookConfig.hooks.Stop[0]?.hooks?.[0]?.type === 'command' && Array.isArray(hookConfig.hooks?.SessionStart) && hookConfig.hooks.SessionStart[0]?.hooks?.[0]?.type === 'command')
check('BetterLoop metadata', index.includes('betterloop-control') && index.includes('<title>BetterLoop'))
check('hook readiness banner', dashboard.includes('NOT READY') && dashboard.includes('READY: Codex confirmed') && dashboard.includes('restart or reopen Codex') && tools.includes("name: 'betterloop_hook_ready'"))

const activePaths = [
  'README.md',
  'STATE.md',
  'SUBMISSION.md',
  'VIDEO_SCRIPT.md',
  'src',
  'index.html',
  'package.json',
  'scripts/betterloop-stop.cjs',
  '.codex',
  '.betterloop',
]
const activeText = activePaths.map((item) => {
  const full = path.join(root, item)
  if (!fs.existsSync(full)) return ''
  if (fs.statSync(full).isDirectory()) {
    return fs.readdirSync(full, { withFileTypes: true }).map((entry) => {
      const child = path.join(full, entry.name)
      return entry.isDirectory() ? '' : fs.readFileSync(child, 'utf8')
    }).join('\n')
  }
  return fs.readFileSync(full, 'utf8')
}).join('\n')
check('no retired implementation names remain', !/(magic.?picker|magic_picker|fileResolver|extensionControlBridge|codexRuntime|DOM\\.setFileInputFiles)/i.test(activeText))

console.log('\n' + '='.repeat(50))
if (!allGood) {
  console.log('❌ Some checks failed.')
  process.exit(1)
}
console.log('✅ BetterLoop is ready for browser validation and submission.')
