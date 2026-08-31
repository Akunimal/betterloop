import React, { useState } from 'react';

export const InstallCommand: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const installScript = `# MagicPicker — Auto-install extension for Codex
$zip = "$env:TEMP\\magicpicker-extension.zip"
Invoke-WebRequest -Uri "https://magic-picker.vercel.app/extension.zip" -OutFile $zip
Expand-Archive -Path $zip -DestinationPath "$env:TEMP\\magicpicker-ext" -Force
Remove-Item $zip
Write-Host "Extension extracted to: $env:TEMP\\magicpicker-ext"
Write-Host "Load it with: --load-extension=\\"$env:TEMP\\magicpicker-ext\\""`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="install-card">
      <h3>Auto-install for Codex CLI</h3>
      <p>
        Copy this command and paste it in Codex. It will download and extract the extension,
        ready to load with <code>--load-extension</code>.
      </p>
      <div className="install-code">
        <pre>{installScript}</pre>
        <button className="install-copy" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
};
