import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  migrateCombatActiveData,
  migrateEncountersData,
  migratePartyData,
  migrateDirectory,
  DEFAULT_MIGRATION_SYSTEM_ID,
  DEFAULT_MIGRATION_SYSTEM_VERSION,
} from '../services/saveMigrationService';

describe('Save Migration Engine Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttrpg-save-migration-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Pure Data Migration Functions', () => {
    it('migrates legacy combat_active data preserving all combatants and fields', () => {
      const legacyCombat = {
        combatants: [
          {
            id: 'fighter-1',
            name: 'Бруннор',
            hp: 45,
            maxHp: 45,
            ac: 18,
            initiative: 14.12,
            conditions: [{ type: 'Prone' }],
            customFields: { notes: 'Опытный ветеран' },
          },
          {
            id: 'goblin-1',
            name: 'Гоблин Лучник',
            hp: 7,
            maxHp: 7,
            ac: 15,
            initiative: 18.15,
            conditions: [],
          },
        ],
        currentTurnIndex: 1,
        roundCounter: 3,
        activeCombatantId: 'goblin-1',
        inspectedCombatantId: 'fighter-1',
        combatLog: [
          { id: 'log-1', text: 'Гоблин стреляет из лука', timestamp: 123456789 },
        ],
        timestamp: 123456789,
        version: '2.0',
      };

      const { migrated, data } = migrateCombatActiveData(legacyCombat);

      expect(migrated).toBe(true);
      expect(data.system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);
      expect(data.system_version).toBe(DEFAULT_MIGRATION_SYSTEM_VERSION);
      expect(data.systemId).toBe(DEFAULT_MIGRATION_SYSTEM_ID);
      expect(data.systemVersion).toBe(DEFAULT_MIGRATION_SYSTEM_VERSION);

      // Verify all combatants preserved
      expect(data.combatants).toHaveLength(2);
      expect(data.combatants[0].name).toBe('Бруннор');
      expect(data.combatants[0].hp).toBe(45);
      expect(data.combatants[0].maxHp).toBe(45);
      expect(data.combatants[0].ac).toBe(18);
      expect(data.combatants[0].initiative).toBe(14.12);
      expect(data.combatants[0].conditions[0].type).toBe('Prone');
      expect(data.combatants[0].customFields.notes).toBe('Опытный ветеран');
      expect(data.combatants[0].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);

      expect(data.combatants[1].name).toBe('Гоблин Лучник');
      expect(data.combatants[1].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);

      // Verify state fields preserved
      expect(data.currentTurnIndex).toBe(1);
      expect(data.roundCounter).toBe(3);
      expect(data.activeCombatantId).toBe('goblin-1');
      expect(data.inspectedCombatantId).toBe('fighter-1');
      expect(data.combatLog).toHaveLength(1);
      expect(data.combatLog[0].text).toBe('Гоблин стреляет из лука');
    });

    it('migrates legacy encounters preserving all entries and monsters', () => {
      const legacyEncounters = [
        {
          id: 'enc-1',
          name: 'Засада на тракте',
          description: 'Три разбойника и волк',
          combatants: [
            { id: 'r1', name: 'Разбойник 1', hp: 11, maxHp: 11, ac: 12 },
            { id: 'r2', name: 'Разбойник 2', hp: 11, maxHp: 11, ac: 12 },
            { id: 'w1', name: 'Лютоволк', hp: 37, maxHp: 37, ac: 13 },
          ],
        },
      ];

      const { migrated, data } = migrateEncountersData(legacyEncounters);

      expect(migrated).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);
      expect(data[0].system_version).toBe(DEFAULT_MIGRATION_SYSTEM_VERSION);
      expect(data[0].name).toBe('Засада на тракте');
      expect(data[0].combatants).toHaveLength(3);
      expect(data[0].combatants[0].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);
      expect(data[0].combatants[2].name).toBe('Лютоволк');
      expect(data[0].combatants[2].hp).toBe(37);
    });

    it('migrates legacy party data preserving characters and classes', () => {
      const legacyParty = [
        {
          id: 'p1',
          name: 'Элиас',
          characterClass: 'Волшебник',
          level: 5,
          hp: 28,
          maxHp: 28,
          ac: 12,
        },
        {
          id: 'p2',
          name: 'Торвальд',
          characterClass: 'Жрец',
          level: 5,
          hp: 38,
          maxHp: 38,
          ac: 18,
        },
      ];

      const { migrated, data } = migratePartyData(legacyParty);

      expect(migrated).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Элиас');
      expect(data[0].characterClass).toBe('Волшебник');
      expect(data[0].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);
      expect(data[0].system_version).toBe(DEFAULT_MIGRATION_SYSTEM_VERSION);
      expect(data[1].name).toBe('Торвальд');
      expect(data[1].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);
    });

    it('does not re-migrate data that already has system_id', () => {
      const alreadyMigrated = {
        system_id: 'dnd5e_2024',
        system_version: '2.0.0',
        combatants: [{ id: 'c1', name: 'Knight', system_id: 'dnd5e_2024' }],
      };

      const { migrated } = migrateCombatActiveData(alreadyMigrated);
      expect(migrated).toBe(false);
    });
  });

  describe('Directory Migration with Timestamped Safety Backups', () => {
    it('creates safety backups in backups/ before mutating files on disk', async () => {
      // 1. Create mock legacy files
      const oldCombatData = {
        combatants: [
          { id: 'hero-1', name: 'Герой', hp: 50, maxHp: 50, ac: 16 },
        ],
        currentTurnIndex: 0,
        roundCounter: 1,
      };

      const oldEncountersData = [
        {
          id: 'enc-test',
          name: 'Тестовая встреча',
          combatants: [{ id: 'm1', name: 'Гоблин', hp: 7, maxHp: 7 }],
        },
      ];

      const oldPartyData = [
        { id: 'member-1', name: 'Рейнджер', level: 3, hp: 24, maxHp: 24 },
      ];

      const combatFilePath = path.join(tempDir, 'combat_active.json');
      const encountersFilePath = path.join(tempDir, 'encounters.json');
      const partyFilePath = path.join(tempDir, 'party.json');

      const rawOldCombat = JSON.stringify(oldCombatData, null, 2);
      const rawOldEncounters = JSON.stringify(oldEncountersData, null, 2);
      const rawOldParty = JSON.stringify(oldPartyData, null, 2);

      fs.writeFileSync(combatFilePath, rawOldCombat, 'utf-8');
      fs.writeFileSync(encountersFilePath, rawOldEncounters, 'utf-8');
      fs.writeFileSync(partyFilePath, rawOldParty, 'utf-8');

      // 2. Run directory migration
      const report = await migrateDirectory(tempDir);

      expect(report.success).toBe(true);
      expect(report.migratedFilesCount).toBe(3);
      expect(report.files).toHaveLength(3);

      // 3. Verify backups directory exists and contains original files
      const backupDir = path.join(tempDir, 'backups');
      expect(fs.existsSync(backupDir)).toBe(true);

      const backupFiles = fs.readdirSync(backupDir);
      expect(backupFiles.length).toBe(3);

      const combatBackupName = backupFiles.find((f) => f.startsWith('combat_active.json'));
      expect(combatBackupName).toBeDefined();
      const backupCombatContent = fs.readFileSync(path.join(backupDir, combatBackupName!), 'utf-8');
      // The backup must be IDENTICAL to the untouched original pre-migration content!
      expect(backupCombatContent).toBe(rawOldCombat);

      const encountersBackupName = backupFiles.find((f) => f.startsWith('encounters.json'));
      expect(encountersBackupName).toBeDefined();
      const backupEncountersContent = fs.readFileSync(path.join(backupDir, encountersBackupName!), 'utf-8');
      expect(backupEncountersContent).toBe(rawOldEncounters);

      const partyBackupName = backupFiles.find((f) => f.startsWith('party.json'));
      expect(partyBackupName).toBeDefined();
      const backupPartyContent = fs.readFileSync(path.join(backupDir, partyBackupName!), 'utf-8');
      expect(backupPartyContent).toBe(rawOldParty);

      // 4. Verify migrated files now have system_id and preserve all content
      const migratedCombat = JSON.parse(fs.readFileSync(combatFilePath, 'utf-8'));
      expect(migratedCombat.system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);
      expect(migratedCombat.system_version).toBe(DEFAULT_MIGRATION_SYSTEM_VERSION);
      expect(migratedCombat.combatants[0].name).toBe('Герой');
      expect(migratedCombat.combatants[0].hp).toBe(50);
      expect(migratedCombat.combatants[0].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);

      const migratedEncounters = JSON.parse(fs.readFileSync(encountersFilePath, 'utf-8'));
      expect(migratedEncounters[0].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);
      expect(migratedEncounters[0].name).toBe('Тестовая встреча');
      expect(migratedEncounters[0].combatants[0].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);

      const migratedParty = JSON.parse(fs.readFileSync(partyFilePath, 'utf-8'));
      expect(migratedParty[0].system_id).toBe(DEFAULT_MIGRATION_SYSTEM_ID);
      expect(migratedParty[0].name).toBe('Рейнджер');

      // 5. Test idempotency: second migration should not modify anything or create new backups
      const secondReport = await migrateDirectory(tempDir);
      expect(secondReport.migratedFilesCount).toBe(0);
      const backupFilesAfterSecond = fs.readdirSync(backupDir);
      expect(backupFilesAfterSecond.length).toBe(3); // No new backups created!
    });
  });

  describe('Campaign System Lock & Duplication Engine', () => {
    it('locks active combat against in-place system switching', async () => {
      const { useCombatStore, duplicateCampaignInSystem } = await import('../store/combatStore');

      const store = useCombatStore.getState();
      expect(store.systemId).toBe('dnd5e_2024');
      expect(store.systemVersion).toBe('2.0.0');

      // Attempt in-place system switch while active combatants exist
      expect(store.combatants.length).toBeGreaterThan(0);
      const switchAttempt = store.setSystemId('dnd5e_2014');
      expect(switchAttempt.success).toBe(false);
      expect(switchAttempt.error).toContain('Активный бой заблокирован в системе');

      // System ID remains locked
      expect(useCombatStore.getState().systemId).toBe('dnd5e_2024');

      // Duplication creates safe copy with explicit warning
      const dupRes = store.duplicateCampaignInSystem('dnd5e_2014');
      expect(dupRes.success).toBe(true);
      expect(dupRes.warning).toContain('Внимание: механики, классы брони, состояния и действия могут отличаться');
      expect(dupRes.duplicatedState.systemId).toBe('dnd5e_2014');
      expect(dupRes.duplicatedState.combatants?.length).toBe(store.combatants.length);
      expect(dupRes.duplicatedState.combatants?.[0].system_id).toBe('dnd5e_2014');

      // Original store state remains unmutated
      expect(useCombatStore.getState().systemId).toBe('dnd5e_2024');

      // Standalone helper test
      const standalonePack = {
        name: 'Подземелье Ужаса',
        combatants: [
          { id: 'c1', name: 'Скелет', hp: 13, maxHp: 13, ac: 13 },
        ],
      };
      const duplicatedPack = duplicateCampaignInSystem(standalonePack, 'pathfinder2e');
      expect(duplicatedPack.success).toBe(true);
      expect(duplicatedPack.duplicatedCampaign.systemId).toBe('pathfinder2e');
      expect(duplicatedPack.duplicatedCampaign.name).toContain('Pathfinder 2e');
      expect(duplicatedPack.duplicatedCampaign.combatants[0].system_id).toBe('pathfinder2e');
      expect(duplicatedPack.warning).toContain('Pathfinder 2e (PF2e)');
    });
  });
});
