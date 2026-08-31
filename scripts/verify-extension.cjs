const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const files = ['manifest.json', 'agent.js', 'content.js', 'background.js'];
let ok = true;

for (const file of files) {
  const exists = fs.existsSync(path.join(root, file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  ok = ok && exists;
}

const checks = [
  ['MV3', manifest.manifest_version === 3],
  ['service worker', manifest.background?.service_worker === 'background.js'],
  ['MAIN agent resource', manifest.web_accessible_resources?.some((item) => item.resources?.includes('agent.js'))],
  ['all URL content script', manifest.content_scripts?.some((item) => item.matches?.includes('<all_urls>'))],
  ['correlated page channel', /channelToken/.test(fs.readFileSync(path.join(root, 'agent.js'), 'utf8')) && /channelToken/.test(fs.readFileSync(path.join(root, 'content.js'), 'utf8'))],
  ['no legacy interceptor', !fs.existsSync(path.join(root, 'interceptor.js'))]
];

for (const [label, passed] of checks) {
  console.log(`${passed ? '✅' : '❌'} ${label}`);
  ok = ok && passed;
}

if (!ok) process.exit(1);
console.log('Extension manifest and source layout look valid.');
