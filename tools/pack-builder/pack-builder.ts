import * as fs from 'fs';
import * as path from 'path';

export interface ContentPackManifest {
  id: string;
  name: string;
  system_id: string;
  edition: string;
  version: string;
  author: string;
  description: string;
  count: number;
  format?: string;
  created_at?: string;
  tags?: string[];
  license?: string;
}

export interface ContentPackBundle {
  manifest: ContentPackManifest;
  creatures: any[];
}

export interface BuildResult {
  packId: string;
  fileName: string;
  filePath: string;
  creatureCount: number;
  sizeBytes: number;
  buildTimeMs: number;
}

import { fileURLToPath } from 'url';

const TOOL_DIR = import.meta.dirname || path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TOOL_DIR, '../../');

/**
 * Normalizes a creature into standard fields ensuring both UniversalCreature
 * and classic monster views can read it.
 */
function normalizeCreature(raw: any, defaultSystemId: string): any {
  const sysId = raw.system_id || raw.systemId || defaultSystemId;
  const name = raw.name || raw.name_en || raw.name_ru || 'Unknown Creature';
  const name_ru = raw.name_ru || raw.name || raw.name_en || '';
  const name_en = raw.name_en || raw.name || raw.name_ru || '';
  const size = raw.size || 'Medium';
  const size_ru = raw.size_ru || (size === 'Medium' ? 'Средний' : size);
  const creature_type = raw.creature_type || 'Humanoid';
  const creature_type_ru = raw.creature_type_ru || creature_type;
  const ac = Number(raw.ac) || 10;
  const hp_average = Number(raw.hp_average || raw.hp || raw.stats?.hp || raw.resources?.hp?.max) || 10;
  const cr = raw.cr !== undefined ? String(raw.cr) : (raw.level !== undefined ? String(raw.level) : '1');

  const stats = raw.stats || {
    str: Number(raw.str) || 10,
    dex: Number(raw.dex) || 10,
    con: Number(raw.con) || 10,
    int: Number(raw.intellect || raw.int) || 10,
    wis: Number(raw.wis) || 10,
    cha: Number(raw.cha) || 10,
  };

  const resources = raw.resources || {
    hp: { current: hp_average, max: hp_average },
  };

  return {
    ...raw,
    id: String(raw.id || `creature-${Math.random().toString(36).substring(2, 9)}`),
    name,
    name_ru,
    name_en,
    system_id: sysId,
    systemId: sysId,
    systemVersion: raw.systemVersion || '1.0.0',
    size,
    size_ru,
    creature_type,
    creature_type_ru,
    ac,
    hp_average,
    cr,
    cr_or_level: cr,
    stats,
    resources,
    actions: raw.actions || [],
  };
}

export function buildCyberpunkRedPack(outDir: string): BuildResult {
  const start = Date.now();
  const sourcePath = path.join(TOOL_DIR, 'cyberpunk_archetypes.json');
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Cyberpunk archetypes file not found: ${sourcePath}`);
  }

  const rawList: any[] = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const creatures = rawList.map((c) => normalizeCreature(c, 'cyberpunk_red'));

  const manifest: ContentPackManifest = {
    id: 'cyberpunk_red_starter',
    name: 'Cyberpunk RED: 25 Archetypes Starter Pack',
    system_id: 'cyberpunk_red',
    edition: 'Core Rulebook System',
    version: '1.0.0',
    author: 'R. Talsorian Games / Night City Community Archetypes',
    description: '25 каноничных боевых архетипов Night City: Соло, Нетраннеры, Техники, Номады, Полиция, Мальстрём, Киберпсихопат, МаксТак, Арасака и Травма Тим со статистикой REF, броней SP головы/тела и арсеналом оружия.',
    count: creatures.length,
    format: 'ait-content-pack-v1',
    created_at: new Date().toISOString(),
    tags: ['cyberpunk', 'cyberpunk_red', 'starter', 'archetypes', 'night_city'],
    license: 'Fan Content / Core Reference',
  };

  const bundle: ContentPackBundle = { manifest, creatures };
  const jsonContent = JSON.stringify(bundle, null, 2);

  // Write .pack.json and alias .pack
  const outJsonPath = path.join(outDir, 'cyberpunk_red_starter.pack.json');
  const outPackPath = path.join(outDir, 'cyberpunk_red_starter.pack');
  fs.writeFileSync(outJsonPath, jsonContent, 'utf8');
  fs.writeFileSync(outPackPath, jsonContent, 'utf8');

  const stats = fs.statSync(outJsonPath);
  return {
    packId: manifest.id,
    fileName: 'cyberpunk_red_starter.pack.json',
    filePath: outJsonPath,
    creatureCount: creatures.length,
    sizeBytes: stats.size,
    buildTimeMs: Date.now() - start,
  };
}

export function buildPathfinder2ePack(outDir: string): BuildResult {
  const start = Date.now();
  const sourcePath = path.join(TOOL_DIR, 'pf2e_creatures.json');
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`PF2e creatures file not found: ${sourcePath}`);
  }

  const rawList: any[] = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const creatures = rawList.map((c) => normalizeCreature(c, 'pathfinder2e'));

  const manifest: ContentPackManifest = {
    id: 'pathfinder2e_starter',
    name: 'Pathfinder 2e (PF2e) Starter Bestiary',
    system_id: 'pathfinder2e',
    edition: 'Remastered (ORC License)',
    version: '1.0.0',
    author: 'Paizo Inc. / Open RPG Creative License (ORC)',
    description: '25 базовых существ тактической системы Pathfinder 2e с трехдейственной экономикой ([1-Действие], [2-Действия], [3-Действия], [Реакция]): Гоблины, Орки, Скелеты, Зомби, Лютоволки, Тролли, Драконы и Гаргульи.',
    count: creatures.length,
    format: 'ait-content-pack-v1',
    created_at: new Date().toISOString(),
    tags: ['pathfinder', 'pf2e', 'starter', 'three_actions', 'orc_license'],
    license: 'ORC License',
  };

  const bundle: ContentPackBundle = { manifest, creatures };
  const jsonContent = JSON.stringify(bundle, null, 2);

  const outJsonPath = path.join(outDir, 'pathfinder2e_starter.pack.json');
  const outPackPath = path.join(outDir, 'pathfinder2e_starter.pack');
  fs.writeFileSync(outJsonPath, jsonContent, 'utf8');
  fs.writeFileSync(outPackPath, jsonContent, 'utf8');

  const stats = fs.statSync(outJsonPath);
  return {
    packId: manifest.id,
    fileName: 'pathfinder2e_starter.pack.json',
    filePath: outJsonPath,
    creatureCount: creatures.length,
    sizeBytes: stats.size,
    buildTimeMs: Date.now() - start,
  };
}

export function buildSrd521Pack(outDir: string): BuildResult {
  const start = Date.now();
  const monstersFile = path.join(ROOT_DIR, 'dnd2024_monsters.json');
  if (!fs.existsSync(monstersFile)) {
    throw new Error(`Monsters source file not found: ${monstersFile}`);
  }

  const rawList: any[] = JSON.parse(fs.readFileSync(monstersFile, 'utf8'));
  const srdRaw = rawList.filter((m) => m.is_srd === 1 || m.source === 'SRD 5.2');
  const creatures = srdRaw.map((c) => normalizeCreature(c, 'srd_5_2_1'));

  const manifest: ContentPackManifest = {
    id: 'srd_5_2_1',
    name: 'SRD 5.2.1 Monsters Bestiary',
    system_id: 'srd_5_2_1',
    edition: '5.2.1 (CC-BY)',
    version: '1.0.0',
    author: 'Wizards of the Coast / Open Gaming Foundation',
    description: 'Официальный открытый свод из 336 существ SRD 5.2.1 под свободной лицензией Creative Commons Attribution 4.0 International (CC-BY-4.0).',
    count: creatures.length,
    format: 'ait-content-pack-v1',
    created_at: new Date().toISOString(),
    tags: ['dnd5e', 'srd', 'cc-by', 'srd_5_2_1', 'official'],
    license: 'CC-BY-4.0',
  };

  const bundle: ContentPackBundle = { manifest, creatures };
  const jsonContent = JSON.stringify(bundle, null, 2);

  const outJsonPath = path.join(outDir, 'srd_5_2_1.pack.json');
  const outPackPath = path.join(outDir, 'srd_5_2_1.pack');
  fs.writeFileSync(outJsonPath, jsonContent, 'utf8');
  fs.writeFileSync(outPackPath, jsonContent, 'utf8');

  const stats = fs.statSync(outJsonPath);
  return {
    packId: manifest.id,
    fileName: 'srd_5_2_1.pack.json',
    filePath: outJsonPath,
    creatureCount: creatures.length,
    sizeBytes: stats.size,
    buildTimeMs: Date.now() - start,
  };
}

export function buildDnd5e2024Pack(outDir: string): BuildResult {
  const start = Date.now();
  const monstersFile = path.join(ROOT_DIR, 'dnd2024_monsters.json');
  if (!fs.existsSync(monstersFile)) {
    throw new Error(`Monsters source file not found: ${monstersFile}`);
  }

  const rawList: any[] = JSON.parse(fs.readFileSync(monstersFile, 'utf8'));
  const creatures = rawList.map((c) => normalizeCreature(c, 'dnd5e_2024'));

  const manifest: ContentPackManifest = {
    id: 'dnd5e_2024',
    name: 'D&D 5e (2024) Complete Bestiary',
    system_id: 'dnd5e_2024',
    edition: '2024 Revised',
    version: '2.0.0',
    author: 'Wizards of the Coast',
    description: 'Полный бестиарий редакции D&D 2024 года (525 существ) с обновленными показателями спасбросков, бонусных действий и мастерства оружия.',
    count: creatures.length,
    format: 'ait-content-pack-v1',
    created_at: new Date().toISOString(),
    tags: ['dnd5e', 'dnd2024', 'complete', 'bestiary', 'mm2024'],
    license: 'D&D 2024 Rules Reference',
  };

  const bundle: ContentPackBundle = { manifest, creatures };
  const jsonContent = JSON.stringify(bundle, null, 2);

  const outJsonPath = path.join(outDir, 'dnd5e_2024.pack.json');
  const outPackPath = path.join(outDir, 'dnd5e_2024.pack');
  fs.writeFileSync(outJsonPath, jsonContent, 'utf8');
  fs.writeFileSync(outPackPath, jsonContent, 'utf8');

  const stats = fs.statSync(outJsonPath);
  return {
    packId: manifest.id,
    fileName: 'dnd5e_2024.pack.json',
    filePath: outJsonPath,
    creatureCount: creatures.length,
    sizeBytes: stats.size,
    buildTimeMs: Date.now() - start,
  };
}

export function buildAllPacks(targetDir?: string): BuildResult[] {
  const outDir = targetDir || path.join(ROOT_DIR, 'packs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Also ensure tools/pack-builder/output exists
  const toolOutDir = path.join(TOOL_DIR, 'output');
  if (!fs.existsSync(toolOutDir)) {
    fs.mkdirSync(toolOutDir, { recursive: true });
  }

  console.log(`[PackBuilder] Starting build for all content packs to: ${outDir}`);

  const results: BuildResult[] = [];
  results.push(buildCyberpunkRedPack(outDir));
  results.push(buildPathfinder2ePack(outDir));
  results.push(buildSrd521Pack(outDir));
  results.push(buildDnd5e2024Pack(outDir));

  // Copy to tool output directory as well
  for (const r of results) {
    const srcFile = r.filePath;
    const destFile = path.join(toolOutDir, path.basename(srcFile));
    fs.copyFileSync(srcFile, destFile);
    const packFile = srcFile.replace(/\.pack\.json$/, '.pack');
    if (fs.existsSync(packFile)) {
      fs.copyFileSync(packFile, path.join(toolOutDir, path.basename(packFile)));
    }
  }

  // Generate a master catalog index.json
  const catalog = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    packs: results.map((r) => ({
      id: r.packId,
      fileName: r.fileName,
      creatureCount: r.creatureCount,
      sizeBytes: r.sizeBytes,
    })),
  };
  fs.writeFileSync(path.join(outDir, 'packs_catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
  fs.writeFileSync(path.join(toolOutDir, 'packs_catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');

  return results;
}

// CLI execution check
if (process.argv[1] && (process.argv[1].endsWith('pack-builder.ts') || process.argv[1].endsWith('pack-builder.mjs') || process.argv[1].endsWith('pack-builder.js'))) {
  const results = buildAllPacks();
  console.log('\n=== Content Packs Build Report ===');
  let totalSize = 0;
  for (const res of results) {
    totalSize += res.sizeBytes;
    console.log(
      `• [${res.packId}] -> ${res.fileName} | ${res.creatureCount} creatures | ${(res.sizeBytes / 1024).toFixed(1)} KB | ${res.buildTimeMs} ms`
    );
  }
  console.log(`Total: ${results.length} packs, ${(totalSize / 1024).toFixed(1)} KB built.`);
}
