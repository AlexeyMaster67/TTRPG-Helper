import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const srcTauriDir = path.join(projectRoot, 'src-tauri');
const releasesDir = path.join(projectRoot, 'releases');

// Ensure releases dir exists
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

console.log('========================================================');
console.log('  TTRPG Helper - Build & Duplicate Setup Installer');
console.log('========================================================\n');

// 1. Setup PATH with node, cargo and mingw if needed
const userProfile = process.env.USERPROFILE || '';
const cargoBin = path.join(userProfile, '.cargo', 'bin');
const nodeBin = 'C:\\Program Files\\nodejs';
const mingwBin = path.join(
  userProfile,
  'AppData',
  'Local',
  'Microsoft',
  'WinGet',
  'Packages',
  'BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe',
  'mingw64',
  'bin'
);
const envPath = [mingwBin, cargoBin, nodeBin, process.env.PATH].join(path.delimiter);
const env = { ...process.env, PATH: envPath };

// 2. Build tauri app if requested or if no existing installer
function findExistingInstallers() {
  const nsisDir = path.join(srcTauriDir, 'target', 'release', 'bundle', 'nsis');
  if (!fs.existsSync(nsisDir)) return [];
  return fs.readdirSync(nsisDir)
    .filter(f => f.endsWith('.exe'))
    .map(f => path.join(nsisDir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

let installers = findExistingInstallers();

if (installers.length === 0 || process.argv.includes('--rebuild') || process.argv.includes('-b')) {
  console.log('[BUILD] Launching Tauri production build (npm run build + cargo tauri build)...');
  try {
    execSync('npm run build', { cwd: projectRoot, env, stdio: 'inherit', shell: true });

    // Ensure WebView2Loader.dll is in src-tauri so NSIS bundles it into the install directory
    const targetDll = path.join(srcTauriDir, 'target', 'release', 'WebView2Loader.dll');
    const srcTauriDll = path.join(srcTauriDir, 'WebView2Loader.dll');
    if (fs.existsSync(targetDll)) {
      fs.copyFileSync(targetDll, srcTauriDll);
      console.log('[BUNDLE] Copied WebView2Loader.dll to src-tauri for NSIS inclusion');
    }

    execSync('npx tauri build', { cwd: projectRoot, env, stdio: 'inherit', shell: true });
    installers = findExistingInstallers();
  } catch (err) {
    console.error('\n[ERROR] Build step failed or MSVC linker is missing.');
    console.error('Please ensure "Desktop development with C++" is installed in Visual Studio Installer.');
  }
}

// 3. Duplicate installer if found
if (installers.length > 0) {
  const srcExe = installers[0];
  const exeName = path.basename(srcExe);
  const targetReleasesExe = path.join(releasesDir, exeName);
  const targetRootExe = path.join(projectRoot, 'TTRPG_Helper_Setup.exe');

  console.log(`\n[INFO] Found generated installer: ${srcExe}`);
  console.log(`Copying to convenient locations...`);

  fs.copyFileSync(srcExe, targetReleasesExe);
  console.log(` -> Duplicated to releases folder: [${targetReleasesExe}]`);

  fs.copyFileSync(srcExe, targetRootExe);
  console.log(` -> Duplicated to project root:    [${targetRootExe}]`);

  const stat = fs.statSync(targetRootExe);
  console.log(`\n[SUCCESS] Setup successfully duplicated!`);
  console.log(`   File: TTRPG_Helper_Setup.exe`);
  console.log(`   Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
} else {
  console.log('\n[WARN] No compiled installer found yet in src-tauri/target/release/bundle/nsis/');
  console.log('Once compiled, it will be automatically mirrored to:');
  console.log(`  1. ${path.join(projectRoot, 'TTRPG_Helper_Setup.exe')} (Project Root)`);
  console.log(`  2. ${path.join(releasesDir, 'TTRPG Helper_2.0.0_x64-setup.exe')} (releases/ folder)`);
}
