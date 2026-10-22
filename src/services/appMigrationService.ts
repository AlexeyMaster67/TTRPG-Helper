/**
 * TTRPG Helper Data Directory Migration Service
 *
 * Automatically detects legacy "%APPDATA%/dnd-ait" (or "com.alexeymaster67.ttrpghelper")
 * and migrates all campaign JSON files, SQLite database (ttrpghelper.db / dnd2024.db),
 * and backups into "%APPDATA%/ttrpg-helper" with a persistent safety migration log.
 */

export interface MigrationReport {
  attempted: boolean;
  migrated: boolean;
  sourceDir: string | null;
  targetDirs: string[];
  copiedFiles: string[];
  skippedReason?: string | null;
  error?: string | null;
  timestampMs: number;
}

const STORAGE_KEY_MIGRATION_DONE = 'ttrpg_helper_data_migrated_v1';
const STORAGE_KEY_MIGRATION_REPORT = 'ttrpg_helper_migration_report';

class AppMigrationService {
  private static instance: AppMigrationService;
  private hasRun = false;
  private lastReport: MigrationReport | null = null;

  private constructor() {}

  public static getInstance(): AppMigrationService {
    if (!AppMigrationService.instance) {
      AppMigrationService.instance = new AppMigrationService();
    }
    return AppMigrationService.instance;
  }

  /**
   * Runs the directory migration check once on application startup.
   * Safe to call multiple times; execution is idempotent.
   */
  public async runMigration(): Promise<MigrationReport> {
    if (this.hasRun && this.lastReport) {
      return this.lastReport;
    }

    const timestampMs = Date.now();
    let report: MigrationReport = {
      attempted: true,
      migrated: false,
      sourceDir: null,
      targetDirs: [],
      copiedFiles: [],
      skippedReason: null,
      error: null,
      timestampMs,
    };

    try {
      const isTauri =
        typeof window !== 'undefined' &&
        ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

      if (isTauri) {
        // Run native Rust migration command
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          const nativeReport = await invoke<MigrationReport>('run_app_migration');
          if (nativeReport) {
            report = nativeReport;
          }
        } catch (invokeErr: any) {
          console.warn('[Migration] Native run_app_migration invoke returned:', invokeErr);
          report.error = String(invokeErr?.message || invokeErr);
        }
      } else {
        // Browser / Web fallback: ensure legacy localStorage keys are recognized
        const legacySession = localStorage.getItem('dnd_ait_combat_active') || localStorage.getItem('dnd_ait_active_session');
        const legacyParty = localStorage.getItem('dnd_ait_party');
        const legacyEncounters = localStorage.getItem('dnd_ait_encounters');

        let migratedCount = 0;
        if (legacySession && !localStorage.getItem('ttrpg_helper_combat_active')) {
          localStorage.setItem('ttrpg_helper_combat_active', legacySession);
          migratedCount++;
        }
        if (legacyParty && !localStorage.getItem('ttrpg_helper_party')) {
          localStorage.setItem('ttrpg_helper_party', legacyParty);
          migratedCount++;
        }
        if (legacyEncounters && !localStorage.getItem('ttrpg_helper_encounters')) {
          localStorage.setItem('ttrpg_helper_encounters', legacyEncounters);
          migratedCount++;
        }

        report = {
          attempted: true,
          migrated: migratedCount > 0,
          sourceDir: 'localStorage',
          targetDirs: ['localStorage'],
          copiedFiles: migratedCount > 0 ? [`${migratedCount} localStorage items copied`] : [],
          skippedReason: migratedCount === 0 ? 'No legacy web keys or already migrated' : null,
          error: null,
          timestampMs,
        };
      }

      // Store completion status
      localStorage.setItem(STORAGE_KEY_MIGRATION_DONE, 'true');
      localStorage.setItem(STORAGE_KEY_MIGRATION_REPORT, JSON.stringify(report));

      if (report.migrated) {
        console.info(
          `[Migration] Successfully migrated ${report.copiedFiles.length} files from "${report.sourceDir}" to "${report.targetDirs.join(', ')}"`
        );
      } else if (report.skippedReason) {
        console.log(`[Migration] Check completed: ${report.skippedReason}`);
      }
    } catch (err: any) {
      console.error('[Migration] Failed to execute data migration:', err);
      report.error = String(err?.message || err);
    }

    this.hasRun = true;
    this.lastReport = report;
    return report;
  }

  public getLastReport(): MigrationReport | null {
    if (this.lastReport) return this.lastReport;
    const stored = localStorage.getItem(STORAGE_KEY_MIGRATION_REPORT);
    if (stored) {
      try {
        return JSON.parse(stored) as MigrationReport;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const appMigrationService = AppMigrationService.getInstance();
export const runAppDataMigration = () => appMigrationService.runMigration();
