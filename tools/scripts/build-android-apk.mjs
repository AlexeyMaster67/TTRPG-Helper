import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const ANDROID_GEN_DIR = path.join(ROOT_DIR, 'src-tauri', 'gen', 'android');
const JAVA_HOME = 'D:\\android-toolchain\\jdk-21\\jdk-21.0.12.1+1';
const ANDROID_HOME = 'D:\\android-toolchain\\android-sdk';

function ensureDir(d) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function run(cmd, cwd = ROOT_DIR, env = process.env) {
  console.log(`[EXEC] ${cmd} (in ${cwd})`);
  execSync(cmd, { stdio: 'inherit', cwd, env });
}

async function buildApk() {
  console.log('========================================================');
  console.log('  TTRPG Helper - Сборка Android APK (Companion)');
  console.log('========================================================');

  const NDK_HOME = path.join(ANDROID_HOME, 'ndk', '26.3.11579264');
  const llvmBin = path.join(NDK_HOME, 'toolchains', 'llvm', 'prebuilt', 'windows-x86_64', 'bin');

  const customEnv = {
    ...process.env,
    JAVA_HOME: JAVA_HOME,
    ANDROID_HOME: ANDROID_HOME,
    ANDROID_SDK_ROOT: ANDROID_HOME,
    NDK_HOME: NDK_HOME,
    PATH: `${path.join(JAVA_HOME, 'bin')};${llvmBin};${path.join(ANDROID_HOME, 'platform-tools')};${process.env.PATH}`,
    CC_aarch64_linux_android: path.join(llvmBin, 'aarch64-linux-android24-clang.cmd'),
    CXX_aarch64_linux_android: path.join(llvmBin, 'aarch64-linux-android24-clang++.cmd'),
    AR_aarch64_linux_android: path.join(llvmBin, 'llvm-ar.exe'),
    CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER: path.join(llvmBin, 'aarch64-linux-android24-clang.cmd'),
    CARGO_TARGET_AARCH64_LINUX_ANDROID_AR: path.join(llvmBin, 'llvm-ar.exe'),
  };

  // 1. Build Frontend
  console.log('[1/4] Сборка фронтенда Vite (npm run build)...');
  run('npm.cmd run build', ROOT_DIR, customEnv);

  // 2. Build Rust Android Library (aarch64)
  console.log('[2/4] Компиляция Rust-библиотеки для Android (aarch64)...');
  const cargoCmd = 'cargo.exe build --package ttrpg-helper --manifest-path src-tauri/Cargo.toml --target aarch64-linux-android --release --features custom-protocol';
  run(cargoCmd, ROOT_DIR, customEnv);

  // 3. Copy .so to jniLibs
  console.log('[3/4] Размещение libttrpg_helper_lib.so в jniLibs/arm64-v8a...');
  const soSource = path.join(ROOT_DIR, 'src-tauri', 'target', 'aarch64-linux-android', 'release', 'libttrpg_helper_lib.so');
  const jniDestDir = path.join(ANDROID_GEN_DIR, 'app', 'src', 'main', 'jniLibs', 'arm64-v8a');
  ensureDir(jniDestDir);
  const soDest = path.join(jniDestDir, 'libttrpg_helper_lib.so');
  fs.copyFileSync(soSource, soDest);

  // 4. Gradle assemble
  console.log('[4/4] Запуск Gradle assembleArm64Release...');
  run('gradlew.bat assembleArm64Release', ANDROID_GEN_DIR, customEnv);

  // 5. Deploy Output
  const outputApk = path.join(ANDROID_GEN_DIR, 'app', 'build', 'outputs', 'apk', 'arm64', 'release', 'app-arm64-release.apk');
  if (!fs.existsSync(outputApk)) {
    throw new Error(`Не найден собранный APK по пути: ${outputApk}`);
  }

  const releasesDir = path.join(ROOT_DIR, 'releases');
  ensureDir(releasesDir);

  const releaseApk = path.join(releasesDir, 'TTRPG_Helper_Companion.apk');
  const rootApk = path.join(ROOT_DIR, 'TTRPG_Helper_Companion.apk');

  fs.copyFileSync(outputApk, releaseApk);
  fs.copyFileSync(outputApk, rootApk);

  const stats = fs.statSync(rootApk);
  console.log('========================================================');
  console.log('[ГОТОВО] Сборка Android APK завершена успешно!');
  console.log(`[ФАЙЛ 1] ${rootApk} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`[ФАЙЛ 2] ${releaseApk}`);
  console.log('========================================================');
}

buildApk().catch((err) => {
  console.error('[ОШИБКА] Сборка APK завершилась сбоем:', err);
  process.exit(1);
});
