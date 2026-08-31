const fs = require('fs');

console.log('🔍 MagicPicker — final verification\n');

const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'index.html',
  'README.md',
  'SUBMISSION.md',
  'LICENSE',
  'VIDEO_SCRIPT.md',
  'PICKER_BRIDGE.md',
  'STATE.md',
  'src/main.tsx',
  'src/App.tsx',
  'src/styles.css',
  'src/webmcp-types.ts',
  'src/webmcp/magicPickerTool.ts',
  'src/webmcp/extensionControlBridge.ts',
  'src/webmcp/polyfill.ts',
  'src/state/fileResolver.ts',
  'src/state/activation.ts',
  'src/components/BridgeStatus.tsx',
  'src/components/ActivationPanel.tsx',
  'src/components/DirectorySetup.tsx',
  'src/components/ResolverLog.tsx',
  'src/components/StatusBar.tsx',
  'extension/manifest.json',
  'extension/agent.js',
  'extension/content.js',
  'extension/background.js',
  'public/magic.svg',
  'public/agent-demo.html',
  'public/extension.zip'
];

let allGood = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) console.log(`  ✅ ${file}`);
  else { console.log(`  ❌ Missing: ${file}`); allGood = false; }
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const script of ['dev', 'build', 'preview']) {
  const ok = Boolean(packageJson.scripts && packageJson.scripts[script]);
  console.log(`  ${ok ? '✅' : '❌'} script:${script}`);
  allGood = allGood && ok;
}

const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));
const manifestChecks = [
  ['MV3 manifest', manifest.manifest_version === 3],
  ['agent exposed', manifest.web_accessible_resources?.some((item) => item.resources?.includes('agent.js'))],
  ['content router', manifest.content_scripts?.some((item) => item.js?.includes('content.js'))],
  ['service worker', manifest.background?.service_worker === 'background.js']
];
for (const [label, ok] of manifestChecks) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  allGood = allGood && ok;
}

const sourceChecks = [
  ['exact read tool', /magic_picker_read/.test(fs.readFileSync('src/webmcp/magicPickerTool.ts', 'utf8'))],
  ['exact attach tool', /magic_picker_attach/.test(fs.readFileSync('extension/agent.js', 'utf8'))],
  ['request correlation', /requestId/.test(fs.readFileSync('extension/background.js', 'utf8'))],
  ['page channel token', /channelToken/.test(fs.readFileSync('extension/agent.js', 'utf8')) && /channelToken/.test(fs.readFileSync('extension/content.js', 'utf8'))],
  ['safe normal click fallback', /Normal user clicks retain native picker behavior/.test(fs.readFileSync('extension/content.js', 'utf8'))],
  ['temporary activation session', /SESSION_TTL_MS/.test(fs.readFileSync('extension/background.js', 'utf8')) && /control-heartbeat/.test(fs.readFileSync('extension/content.js', 'utf8'))],
  ['dormant outside session', /sessionActive = false/.test(fs.readFileSync('extension/content.js', 'utf8')) && /get-session-state/.test(fs.readFileSync('extension/content.js', 'utf8'))],
  ['no dead interceptor', !fs.existsSync('extension/interceptor.js')]
];
for (const [label, ok] of sourceChecks) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  allGood = allGood && ok;
}

console.log('\n' + '='.repeat(50));
if (!allGood) {
  console.log('❌ Some checks failed.');
  process.exit(1);
}
console.log('✅ MagicPicker is ready for browser validation and submission.');
