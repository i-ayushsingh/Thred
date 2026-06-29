const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out', 'Thred-win32-x64');
const appDir = path.join(outDir, 'resources', 'app');
const electronDir = path.join(__dirname, 'node_modules', 'electron', 'dist');
const viteDir = path.join(__dirname, '.vite', 'build');

// Clean and create dirs
if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
fs.mkdirSync(appDir, { recursive: true });

// 1. Copy Electron binaries
console.log('Copying Electron...');
const electronFiles = fs.readdirSync(electronDir);
for (const f of electronFiles) {
  const src = path.join(electronDir, f);
  const dst = path.join(outDir, f);
  const stat = fs.statSync(src);
  if (stat.isFile()) fs.copyFileSync(src, dst);
  else if (stat.isDirectory()) fs.cpSync(src, dst, { recursive: true });
}
console.log(`  Copied ${electronFiles.length} items`);

// 2. Copy package.json
fs.copyFileSync('package.json', path.join(appDir, 'package.json'));

// 3. Copy Vite build output (main + preload)
if (fs.existsSync(viteDir)) {
  fs.cpSync(viteDir, path.join(appDir, '.vite', 'build'), { recursive: true });
  console.log('  Copied .vite/build');
}

// 3b. Copy Vite renderer output
const rendererDir = path.join(__dirname, '.vite', 'renderer', 'main_window');
if (fs.existsSync(rendererDir)) {
  fs.cpSync(rendererDir, path.join(appDir, '.vite', 'renderer', 'main_window'), { recursive: true });
  console.log('  Copied .vite/renderer/main_window');
}

// 4. Copy src files needed at runtime
fs.mkdirSync(path.join(appDir, 'src'), { recursive: true });
const srcFiles = ['splash.html', 'injection-scripts.ts', 'electron.d.ts', 'secretStore.ts'];
for (const f of srcFiles) {
  const src = path.join('src', f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(appDir, 'src', f));
  }
}

// 6. Copy public assets
if (fs.existsSync('public')) {
  fs.cpSync('public', path.join(appDir, 'public'), { recursive: true });
  console.log('  Copied public/');
}

// 7. Copy shared modules
if (fs.existsSync('src/shared')) {
  fs.cpSync('src/shared', path.join(appDir, 'src', 'shared'), { recursive: true });
  console.log('  Copied src/shared/');
}

// 8. Copy i18n
if (fs.existsSync('src/i18n')) {
  fs.cpSync('src/i18n', path.join(appDir, 'src', 'i18n'), { recursive: true });
  console.log('  Copied src/i18n/');
}

// 9. Copy config
if (fs.existsSync('src/config')) {
  fs.cpSync('src/config', path.join(appDir, 'src', 'config'), { recursive: true });
  console.log('  Copied src/config/');
}

// 10. Copy utils
if (fs.existsSync('src/utils')) {
  fs.cpSync('src/utils', path.join(appDir, 'src', 'utils'), { recursive: true });
  console.log('  Copied src/utils/');
}

// 11. Rename electron.exe to Thred.exe
const exeSrc = path.join(outDir, 'electron.exe');
const exeDst = path.join(outDir, 'Thred.exe');
if (fs.existsSync(exeSrc)) {
  fs.copyFileSync(exeSrc, exeDst);
  console.log('  Created Thred.exe');
}

// 12. Set app icon on Thred.exe
const rcedit = path.join(__dirname, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');
const icoPath = path.join(__dirname, 'public', 'icons', 'app.ico');
if (fs.existsSync(rcedit) && fs.existsSync(icoPath)) {
  require('child_process').execSync(`"${rcedit}" "${exeDst}" --set-icon "${icoPath}"`);
  console.log('  Set app icon');
}

// Calculate total size
let totalSize = 0;
const walkDir = (dir) => {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isFile()) totalSize += stat.size;
    else if (stat.isDirectory()) walkDir(p);
  }
};
walkDir(outDir);

console.log(`\nDone! Output: ${outDir}`);
console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
console.log('Run: out\\Thred-win32-x64\\Thred.exe');
