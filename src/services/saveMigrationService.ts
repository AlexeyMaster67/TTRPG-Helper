/**
 * TTRPG Helper - Save Migration Engine
 *
 * Safely inspects existing save files:
 * - combat_active.json
 * - encounters.json
 * - party.json
 *
 * If missing system_id, updates state to:
 * - system_id: 'dnd5e_2024'
 * - system_version: '2.0.0'
 *
 * Before any file mutation, creates a timestamped safety backup in the backups/ directory.
 * Preserves 100% of combatants, party members, and custom attributes.
 */

export const DEFAULT_MIGRATION_SYSTEM_ID = 'dnd5e_2024';
export const DEFAULT_MIGRATION_SYSTEM_VERSION = '2.0.0';

export const TARGET_SAVE_FILES = [
  'combat_active.json',
  'encounters.json',
  'party.json',
] as const;

export interface FileMigrationResult {
  file: string;
  attempted: boolean;
  migrated: boolean;
  backupPath?: string;
  skippedReason?: string;
  error?: string;
}

export interface SaveMigrationReport {
  timestampMs: number;
  totalFilesChecked: number;
  migratedFilesCount: number;
  files: FileMigrationResult[];
  success: boolean;
  error?: string;
}

/**
 * Pure migration logic for combat_active.json payload.
 */
export function migrateCombatActiveData(data: any): { migrated: boolean; data: any } {
  if (!data || typeof data !== 'object') {
    return { migrated: false, data };
  }

  // Already migrated
  if (data.system_id && data.system_version) {
    return { migrated: false, data };
  }

  const clone = JSON.parse(JSON.stringify(data));
  clone.system_id = DEFAULT_MIGRATION_SYSTEM_ID;
  clone.system_version = DEFAULT_MIGRATION_SYSTEM_VERSION;
  clone.systemId = DEFAULT_MIGRATION_SYSTEM_ID;
  clone.systemVersion = DEFAULT_MIGRATION_SYSTEM_VERSION;

  if (Array.isArray(clone.combatants)) {
    for (const c of clone.combatants) {
      if (!c.system_id) {
        c.system_id = DEFAULT_MIGRATION_SYSTEM_ID;
        c.system_version = DEFAULT_MIGRATION_SYSTEM_VERSION;
      }
      if (!c.systemId) {
        c.systemId = c.system_id || DEFAULT_MIGRATION_SYSTEM_ID;
        c.systemVersion = c.system_version || DEFAULT_MIGRATION_SYSTEM_VERSION;
      }
    }
  }

  return { migrated: true, data: clone };
}

/**
 * Pure migration logic for encounters.json payload.
 */
export function migrateEncountersData(data: any): { migrated: boolean; data: any } {
  if (!data) return { migrated: false, data };

  if (Array.isArray(data)) {
    const needsMigration = data.some((enc) => !enc.system_id);
    if (!needsMigration) {
      return { migrated: false, data };
    }
    const clone = JSON.parse(JSON.stringify(data));
    for (const enc of clone) {
      if (!enc.system_id) {
        enc.system_id = DEFAULT_MIGRATION_SYSTEM_ID;
        enc.system_version = DEFAULT_MIGRATION_SYSTEM_VERSION;
        enc.systemId = DEFAULT_MIGRATION_SYSTEM_ID;
        enc.systemVersion = DEFAULT_MIGRATION_SYSTEM_VERSION;
      }
      if (Array.isArray(enc.combatants)) {
        for (const c of enc.combatants) {
          if (!c.system_id) {
            c.system_id = DEFAULT_MIGRATION_SYSTEM_ID;
            c.system_version = DEFAULT_MIGRATION_SYSTEM_VERSION;
          }
          if (!c.systemId) {
            c.systemId = c.system_id || DEFAULT_MIGRATION_SYSTEM_ID;
            c.systemVersion = c.system_version || DEFAULT_MIGRATION_SYSTEM_VERSION;
          }
        }
      }
    }
    return { migrated: true, data: clone };
  }

  if (typeof data === 'object') {
    if (data.system_id && data.system_version) {
      return { migrated: false, data };
    }
    const clone = JSON.parse(JSON.stringify(data));
    clone.system_id = DEFAULT_MIGRATION_SYSTEM_ID;
    clone.system_version = DEFAULT_MIGRATION_SYSTEM_VERSION;
    clone.systemId = DEFAULT_MIGRATION_SYSTEM_ID;
    clone.systemVersion = DEFAULT_MIGRATION_SYSTEM_VERSION;
    if (Array.isArray(clone.encounters)) {
      const subRes = migrateEncountersData(clone.encounters);
      if (subRes.migrated) {
        clone.encounters = subRes.data;
      }
    }
    return { migrated: true, data: clone };
  }

  return { migrated: false, data };
}

/**
 * Pure migration logic for party.json payload.
 */
export function migratePartyData(data: any): { migrated: boolean; data: any } {
  if (!data) return { migrated: false, data };

  if (Array.isArray(data)) {
    const needsMigration = data.some((member) => !member.system_id);
    if (!needsMigration) {
      return { migrated: false, data };
    }
    const clone = JSON.parse(JSON.stringify(data));
    for (const member of clone) {
      if (!member.system_id) {
        member.system_id = DEFAULT_MIGRATION_SYSTEM_ID;
        member.system_version = DEFAULT_MIGRATION_SYSTEM_VERSION;
        member.systemId = DEFAULT_MIGRATION_SYSTEM_ID;
        member.systemVersion = DEFAULT_MIGRATION_SYSTEM_VERSION;
      }
    }
    return { migrated: true, data: clone };
  }

  if (typeof data === 'object') {
    if (data.system_id && data.system_version) {
      return { migrated: false, data };
    }
    const clone = JSON.parse(JSON.stringify(data));
    clone.system_id = DEFAULT_MIGRATION_SYSTEM_ID;
    clone.system_version = DEFAULT_MIGRATION_SYSTEM_VERSION;
    clone.systemId = DEFAULT_MIGRATION_SYSTEM_ID;
    clone.systemVersion = DEFAULT_MIGRATION_SYSTEM_VERSION;
    if (Array.isArray(clone.members)) {
      const subRes = migratePartyData(clone.members);
      if (subRes.migrated) {
        clone.members = subRes.data;
      }
    }
    return { migrated: true, data: clone };
  }

  return { migrated: false, data };
}

/**
 * Migrates a raw JSON string according to its target filename.
 */
export function migrateSaveContent(
  filename: string,
  jsonString: string
): { migrated: boolean; content: string; data: any } {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Failed to parse JSON for ${filename}: ${String(err)}`);
  }

  let result: { migrated: boolean; data: any };
  const baseName = filename.toLowerCase();

  if (baseName.includes('combat') || baseName.includes('session')) {
    result = migrateCombatActiveData(parsed);
  } else if (baseName.includes('encounter')) {
    result = migrateEncountersData(parsed);
  } else if (baseName.includes('party')) {
    result = migratePartyData(parsed);
  } else {
    // Generic fallback object migration
    result = migrateCombatActiveData(parsed);
  }

  if (result.migrated) {
    return {
      migrated: true,
      content: JSON.stringify(result.data, null, 2),
      data: result.data,
    };
  }

  return {
    migrated: false,
    content: jsonString,
    data: parsed,
  };
}

/**
 * Node.js filesystem migration helper for unit tests and local CLI environments.
 */
export async function migrateDirectory(dirPath: string): Promise<SaveMigrationReport> {
  const fs = await import('fs');
  const path = await import('path');

  const report: SaveMigrationReport = {
    timestampMs: Date.now(),
    totalFilesChecked: 0,
    migratedFilesCount: 0,
    files: [],
    success: true,
  };

  const backupDir = path.join(dirPath, 'backups');

  for (const filename of TARGET_SAVE_FILES) {
    const filePath = path.join(dirPath, filename);
    report.totalFilesChecked++;

    if (!fs.existsSync(filePath)) {
      report.files.push({
        file: filename,
        attempted: true,
        migrated: false,
        skippedReason: 'File does not exist',
      });
      continue;
    }

    try {
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      const migrationRes = migrateSaveContent(filename, originalContent);

      if (migrationRes.migrated) {
        // Ensure backups directory exists
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `${filename}.${timestampStr}.bak`;
        const backupFilePath = path.join(backupDir, backupFileName);

        // Safety backup write BEFORE mutating original file
        fs.writeFileSync(backupFilePath, originalContent, 'utf-8');

        // Write migrated data
        fs.writeFileSync(filePath, migrationRes.content, 'utf-8');

        report.migratedFilesCount++;
        report.files.push({
          file: filename,
          attempted: true,
          migrated: true,
          backupPath: backupFilePath,
        });
      } else {
        report.files.push({
          file: filename,
          attempted: true,
          migrated: false,
          skippedReason: 'Already has system_id',
        });
      }
    } catch (err: any) {
      report.success = false;
      report.files.push({
        file: filename,
        attempted: true,
        migrated: false,
        error: String(err?.message || err),
      });
    }
  }

  return report;
}

/**
 * Runs the save migration engine on the runtime environment (Tauri FS AppData or localStorage).
 */
export async function runSaveMigration(): Promise<SaveMigrationReport> {
  const report: SaveMigrationReport = {
    timestampMs: Date.now(),
    totalFilesChecked: 0,
    migratedFilesCount: 0,
    files: [],
    success: true,
  };

  const isTauri =
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  if (isTauri) {
    try {
      const { readTextFile, writeTextFile, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs');

      for (const filename of TARGET_SAVE_FILES) {
        report.totalFilesChecked++;
        let content: string | null = null;

        try {
          content = await readTextFile(filename, { baseDir: BaseDirectory.AppData });
        } catch {
          // File not found on disk
        }

        if (!content) {
          report.files.push({
            file: filename,
            attempted: true,
            migrated: false,
            skippedReason: 'File does not exist',
          });
          continue;
        }

        try {
          const migrationRes = migrateSaveContent(filename, content);

          if (migrationRes.migrated) {
            // Ensure backups/ directory exists
            try {
              await mkdir('backups', { baseDir: BaseDirectory.AppData, recursive: true });
            } catch {
              // Directory already exists
            }

            const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `backups/${filename}.${timestampStr}.bak`;

            // Write safety backup
            await writeTextFile(backupFilename, content, { baseDir: BaseDirectory.AppData });

            // Write migrated content
            await writeTextFile(filename, migrationRes.content, { baseDir: BaseDirectory.AppData });

            report.migratedFilesCount++;
            report.files.push({
              file: filename,
              attempted: true,
              migrated: true,
              backupPath: backupFilename,
            });
          } else {
            report.files.push({
              file: filename,
              attempted: true,
              migrated: false,
              skippedReason: 'Already has system_id',
            });
          }
        } catch (err: any) {
          report.success = false;
          report.files.push({
            file: filename,
            attempted: true,
            migrated: false,
            error: String(err?.message || err),
          });
        }
      }
    } catch (tauriErr: any) {
      report.success = false;
      report.error = String(tauriErr?.message || tauriErr);
    }
  } else if (typeof localStorage !== 'undefined') {
    // Browser fallback
    const keyMap: Record<string, string> = {
      'combat_active.json': 'dnd_ait_combat_active',
      'encounters.json': 'dnd_ait_encounters',
      'party.json': 'dnd_ait_party',
    };

    for (const [filename, storageKey] of Object.entries(keyMap)) {
      report.totalFilesChecked++;
      const raw = localStorage.getItem(storageKey);

      if (!raw) {
        report.files.push({
          file: filename,
          attempted: true,
          migrated: false,
          skippedReason: 'No localStorage key found',
        });
        continue;
      }

      try {
        const migrationRes = migrateSaveContent(filename, raw);
        if (migrationRes.migrated) {
          const timestamp = Date.now();
          const backupKey = `backup_${timestamp}_${storageKey}`;
          localStorage.setItem(backupKey, raw);
          localStorage.setItem(storageKey, migrationRes.content);

          report.migratedFilesCount++;
          report.files.push({
            file: filename,
            attempted: true,
            migrated: true,
            backupPath: backupKey,
          });
        } else {
          report.files.push({
            file: filename,
            attempted: true,
            migrated: false,
            skippedReason: 'Already has system_id',
          });
        }
      } catch (err: any) {
        report.success = false;
        report.files.push({
          file: filename,
          attempted: true,
          migrated: false,
          error: String(err?.message || err),
        });
      }
    }
  }

  return report;
}
