const fs = require('fs');

console.log('🔍 Magic Picker - Final Verification\n');

const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'index.html',
  'README.md',
  'SUBMISSION.md',
  'LICENSE',
  'VIDEO_SCRIPT.md',
  'PICKER_BRIDGE.md',
  'src/main.tsx',
  'src/App.tsx',
  'src/styles.css',
  'src/webmcp-types.ts',
  'src/webmcp/magicPickerTool.ts',
  'src/webmcp/polyfill.ts',
  'src/utils/fileToBase64.ts',
  'src/state/pickerState.ts',
  'src/components/MagicPickerModal.tsx',
  'src/components/DropZone.tsx',
  'src/components/StatusBar.tsx',
  'src/components/TestPanel.tsx',
  'src/components/WebMCPConsole.tsx',
  'public/magic.svg',
  'public/agent-demo.html'
];

let allGood = true;

console.log('📁 Checking files:');
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ Missing: ${file}`);
    allGood = false;
  }
}

console.log('\n📦 Checking package.json scripts:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['dev', 'build', 'preview'];
for (const script of requiredScripts) {
  if (packageJson.scripts && packageJson.scripts[script]) {
    console.log(`  ✅ ${script}`);
  } else {
    console.log(`  ❌ Missing script: ${script}`);
    allGood = false;
  }
}

console.log('\n📚 Checking dependencies:');
const requiredDeps = ['react', 'react-dom'];
const requiredDevDeps = ['vite', '@vitejs/plugin-react', 'typescript'];

for (const dep of requiredDeps) {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`  ✅ ${dep}`);
  } else {
    console.log(`  ❌ Missing dependency: ${dep}`);
    allGood = false;
  }
}

for (const dep of requiredDevDeps) {
  if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
    console.log(`  ✅ ${dep}`);
  } else {
    console.log(`  ❌ Missing dev dependency: ${dep}`);
    allGood = false;
  }
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ All checks passed! Magic Picker is ready for submission.');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  process.exit(1);
}
