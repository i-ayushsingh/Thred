const { createWindowsInstaller } = require('electron-winstaller');
const path = require('path');

async function run() {
  console.log('Building app...');
  require('./build.js');
  
  console.log('\nCreating Squirrel installer...');
  const start = Date.now();
  
  try {
    await createWindowsInstaller({
      appDirectory: path.join(__dirname, 'out', 'Thred-win32-x64'),
      outputDirectory: path.join(__dirname, 'out', 'installer'),
      authors: 'Ayush Singh',
      exe: 'Thred.exe',
      setupExe: 'Thred-Setup.exe',
      noMsi: true,
    });
    
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\nDone in ${elapsed}s`);
    console.log('Output: out/installer/');
    console.log('  Thred-Setup.exe  — installer for distribution');
    console.log('  thred-1.0.0-full.nupkg — Squirrel update package');
    console.log('  RELEASES — version manifest');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

run();
