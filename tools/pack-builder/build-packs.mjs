#!/usr/bin/env node
/**
 * Runner script for Pack Builder
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const builderScript = path.join(__dirname, 'pack-builder.ts');

console.log('[PackBuilder Runner] Building JSON packs via Node TypeScript...');
const resNode = spawnSync(process.execPath, ['--experimental-strip-types', builderScript], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '../../'),
});

if (resNode.status !== 0) {
  console.error('[PackBuilder Runner] Failed to build JSON packs.');
  process.exit(resNode.status || 1);
}

const pyScript = path.join(__dirname, 'pack_builder.py');
console.log('\n[PackBuilder Runner] Building SQLite creatures.db and manifests via Python...');
const resPy = spawnSync('python', [pyScript, '--build-all'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '../../'),
});

if (resPy.status !== 0) {
  console.warn('[PackBuilder Runner] Python step exited with status:', resPy.status);
}

console.log('\n[PackBuilder Runner] Pack build complete!');
