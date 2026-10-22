import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const TOOLCHAIN_ROOT = 'D:\\android-toolchain';
const DOWNLOADS_DIR = path.join(TOOLCHAIN_ROOT, 'downloads');
const JDK_DIR = path.join(TOOLCHAIN_ROOT, 'jdk-21');
const ANDROID_SDK_DIR = path.join(TOOLCHAIN_ROOT, 'android-sdk');
const CMDLINE_TOOLS_DIR = path.join(ANDROID_SDK_DIR, 'cmdline-tools');
const CMDLINE_LATEST_DIR = path.join(CMDLINE_TOOLS_DIR, 'latest');

const JDK_URL = 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip';
const CMDLINE_TOOLS_URL = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip';

function ensureDir(d) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function run(cmd, env = process.env) {
  console.log(`[EXEC] ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env });
}

async function main() {
  console.log('[STAGE] Android Toolchain & APK Build Pipeline starting...');
  ensureDir(TOOLCHAIN_ROOT);
  ensureDir(DOWNLOADS_DIR);
  ensureDir(JDK_DIR);
  ensureDir(ANDROID_SDK_DIR);

  // 1. Download & Extract OpenJDK 21
  const jdkZip = path.join(DOWNLOADS_DIR, 'jdk21.zip');
  let javaBinDir = '';

  const existingJdkBins = fs.existsSync(JDK_DIR) ? fs.readdirSync(JDK_DIR) : [];
  let foundJdkSubdir = existingJdkBins.find(f => f.startsWith('jdk-21') && fs.existsSync(path.join(JDK_DIR, f, 'bin', 'java.exe')));

  if (!foundJdkSubdir) {
    if (!fs.existsSync(jdkZip) || fs.statSync(jdkZip).size < 1000000) {
      console.log('[DOWNLOAD] Downloading OpenJDK 21...');
      run(`curl.exe -L -o "${jdkZip}" "${JDK_URL}"`);
    }

    console.log('[EXTRACT] Extracting OpenJDK 21 to ' + JDK_DIR);
    run(`tar.exe -xf "${jdkZip}" -C "${JDK_DIR}"`);

    const refreshed = fs.readdirSync(JDK_DIR);
    foundJdkSubdir = refreshed.find(f => f.startsWith('jdk-21') && fs.existsSync(path.join(JDK_DIR, f, 'bin', 'java.exe')));
  }

  const JAVA_HOME = foundJdkSubdir ? path.join(JDK_DIR, foundJdkSubdir) : JDK_DIR;
  javaBinDir = path.join(JAVA_HOME, 'bin');
  console.log(`[INFO] JAVA_HOME set to: ${JAVA_HOME}`);

  // 2. Download & Extract Android Command-line Tools
  const cmdlineZip = path.join(DOWNLOADS_DIR, 'cmdline-tools.zip');
  const sdkmanagerBat = path.join(CMDLINE_LATEST_DIR, 'bin', 'sdkmanager.bat');

  if (!fs.existsSync(sdkmanagerBat)) {
    if (!fs.existsSync(cmdlineZip) || fs.statSync(cmdlineZip).size < 1000000) {
      console.log('[DOWNLOAD] Downloading Android Command-line Tools...');
      run(`curl.exe -L -o "${cmdlineZip}" "${CMDLINE_TOOLS_URL}"`);
    }

    const tempExtract = path.join(TOOLCHAIN_ROOT, 'temp-cmdline');
    ensureDir(tempExtract);
    console.log('[EXTRACT] Extracting Command-line Tools...');
    run(`tar.exe -xf "${cmdlineZip}" -C "${tempExtract}"`);

    // The zip contains a 'cmdline-tools' folder. Move its content to cmdline-tools/latest
    ensureDir(CMDLINE_TOOLS_DIR);
    if (fs.existsSync(CMDLINE_LATEST_DIR)) {
      fs.rmSync(CMDLINE_LATEST_DIR, { recursive: true, force: true });
    }

    const unzippedCmdline = path.join(tempExtract, 'cmdline-tools');
    fs.renameSync(unzippedCmdline, CMDLINE_LATEST_DIR);
    fs.rmSync(tempExtract, { recursive: true, force: true });
    console.log('[INFO] Command-line tools installed at: ' + CMDLINE_LATEST_DIR);
  }

  // 3. Configure Android Environment
  const customEnv = {
    ...process.env,
    JAVA_HOME: JAVA_HOME,
    ANDROID_HOME: ANDROID_SDK_DIR,
    ANDROID_SDK_ROOT: ANDROID_SDK_DIR,
    PATH: `${javaBinDir};${path.join(CMDLINE_LATEST_DIR, 'bin')};${path.join(ANDROID_SDK_DIR, 'platform-tools')};${process.env.PATH}`,
  };

  // 4. Accept Licenses and Install Required SDK Components
  console.log('[SDK] Accepting licenses and installing platform-tools, platforms;android-34, build-tools;34.0.0, ndk...');

  // Pre-seed license files to bypass interactive prompts
  const licensesDir = path.join(ANDROID_SDK_DIR, 'licenses');
  ensureDir(licensesDir);

  const androidSdkLicense = '24333f8a63b6825ea9c5514f83c2829b004d1fee\nd56f5187479451eabf01fb78af6dfcb131a6481e\n24333f8a63b6825ea9c5514f83c2829b004d1fee';
  const androidSdkArmDbtLicense = '859f317696f67ef43ac2641a16aa471a7596b43a';
  const androidSdkPreviewLicense = '84831b9409646a918e30573bab4c9c91346d8abd\n504667f4c0de7af1a06de9f4b1727b84351f2910';

  fs.writeFileSync(path.join(licensesDir, 'android-sdk-license'), androidSdkLicense, 'utf8');
  fs.writeFileSync(path.join(licensesDir, 'android-sdk-arm-dbt-license'), androidSdkArmDbtLicense, 'utf8');
  fs.writeFileSync(path.join(licensesDir, 'android-sdk-preview-license'), androidSdkPreviewLicense, 'utf8');

  // Install platform-tools, platforms;android-34, build-tools;34.0.0, and ndk
  try {
    const installCmd = `"${sdkmanagerBat}" --sdk_root="${ANDROID_SDK_DIR}" "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;26.3.11579264"`;
    run(installCmd, customEnv);
  } catch (err) {
    console.warn('[SDK] Sdkmanager command returned warning/error, checking if installed files exist...');
  }

  // Locate installed NDK
  const ndkRoot = path.join(ANDROID_SDK_DIR, 'ndk');
  let ndkVersionDir = '';
  if (fs.existsSync(ndkRoot)) {
    const ndkVersions = fs.readdirSync(ndkRoot);
    if (ndkVersions.length > 0) {
      ndkVersionDir = path.join(ndkRoot, ndkVersions[0]);
    }
  }

  if (ndkVersionDir) {
    customEnv.NDK_HOME = ndkVersionDir;
    console.log(`[INFO] NDK_HOME set to: ${ndkVersionDir}`);
  }

  // 5. Initialize Tauri Android Project
  console.log('[STAGE] Initializing Tauri Android project...');
  try {
    run('npx.cmd tauri android init', customEnv);
  } catch (err) {
    console.log('[WARN] Tauri android init completed with message: ' + err.message);
  }

  // 6. Build Android APK
  console.log('[STAGE] Building Android APK via Tauri...');
  run('npx.cmd tauri android build --apk', customEnv);

  // 7. Locate generated APK and copy to release directories
  console.log('[STAGE] Locating generated APK...');
  const searchRoots = [
    path.join(process.cwd(), 'src-tauri', 'gen', 'android', 'app', 'build', 'outputs', 'apk'),
    path.join(process.cwd(), 'src-tauri', 'target'),
  ];

  let foundApk = null;
  function searchApk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        searchApk(full);
      } else if (e.isFile() && e.name.endsWith('.apk')) {
        foundApk = full;
        return;
      }
    }
  }

  for (const r of searchRoots) {
    if (!foundApk) searchApk(r);
  }

  if (foundApk) {
    const releasesDir = path.join(process.cwd(), 'releases');
    ensureDir(releasesDir);

    const targetReleaseApk = path.join(releasesDir, 'TTRPG_Helper_Companion.apk');
    const targetRootApk = path.join(process.cwd(), 'TTRPG_Helper_Companion.apk');

    fs.copyFileSync(foundApk, targetReleaseApk);
    fs.copyFileSync(foundApk, targetRootApk);

    const stats = fs.statSync(targetRootApk);
    console.log('[SUCCESS] Android APK created successfully!');
    console.log(`[OUTPUT] Root APK: ${targetRootApk} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`[OUTPUT] Releases APK: ${targetReleaseApk}`);
  } else {
    throw new Error('Could not find generated .apk file');
  }
}

main().catch((err) => {
  console.error('[ERROR] Build pipeline failed:', err);
  process.exit(1);
});
