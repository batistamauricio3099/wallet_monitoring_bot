const { execFileSync } = require('child_process');
const path = require('path');

// Use the exact npm executable that launched this process — avoids PATH issues on Windows
const npm = process.env.npm_execpath || 'npm';
const node = process.execPath;
const root = path.join(__dirname, '..');

for (const dir of ['backend', 'frontend']) {
  console.log(`\nInstalling ${dir} dependencies...`);
  execFileSync(node, [npm, 'install', '--ignore-scripts'], {
    cwd: path.join(root, dir),
    stdio: 'inherit',
  });
}
