import { describe, it, expect } from 'vitest';
import { DatabaseService } from '../services/dbService';

describe('DatabaseService Web Fallback Tests', () => {
  const service = DatabaseService.getInstance();

  it('safely falls back to JSON import when SQLite is unavailable', async () => {
    const db = await service.load();
    expect(db).toBeNull();
  });

  describe('Monsters Web Fallback', () => {
    it('returns monsters on empty query with default limit', async () => {
      const results = await service.searchMonsters('', 10);
      expect(results.length).toBe(10);
      expect(results[0].id).toBeDefined();
      expect(results[0].intellect).toBeDefined();
      expect(typeof results[0].saves).toBe('object');
    });

    it('finds monsters by query (case-insensitive, Russian/English)', async () => {
      const results = await service.searchMonsters('дракон', 10);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((m) => m.name_ru.toLowerCase().includes('дракон') || m.name_en.toLowerCase().includes('dragon'))).toBe(true);
    });

    it('filters monsters by size, type, and cr', async () => {
      const results = await service.searchMonsters('', {
        type: 'Dragon',
        cr: '17',
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      for (const m of results) {
        expect(m.cr).toBe('17');
        expect(
          (m.creature_type && m.creature_type.toLowerCase().includes('dragon')) ||
          (m.creature_type_ru && m.creature_type_ru.toLowerCase().includes('дракон'))
        ).toBe(true);
      }
    });

    it('retrieves single monster by ID with authentic stats and non-empty saves', async () => {
      const monster = await service.getMonsterById('adult-red-dragon');
      expect(monster).not.toBeNull();
      if (!monster) return;

      expect(monster.name_en).toBe('Adult Red Dragon');
      expect(monster.name_ru).toBe('Взрослый красный дракон');
      expect(monster.str).toBe(27);
      expect(monster.dex).toBe(10);
      expect(monster.con).toBe(25);
      expect(monster.intellect).toBe(16); // strictly intellect, authentic value
      expect(monster.wis).toBe(13);
      expect(monster.cha).toBe(23);
      expect(monster.cr).toBe('17');
      expect(monster.ac).toBe(19);

      // Verify saves are parsed as an authentic object, not empty or stripped
      expect(monster.saves).toBeDefined();
      expect(Object.keys(monster.saves).length).toBe(6);
      expect(monster.saves.str).toBe(8);
      expect(monster.saves.dex).toBe(6);
      expect(monster.saves.con).toBe(7);
      expect(monster.saves.wis).toBe(7);
      expect(monster.saves.cha).toBe(6);

      // Verify actions
      expect(Array.isArray(monster.actions)).toBe(true);
      expect(monster.actions.length).toBeGreaterThan(0);
    });
  });

  describe('Items Web Fallback', () => {
    it('searches items and preserves parsed properties array', async () => {
      const results = await service.searchItems('adamantine', undefined, 10);
      expect(results.length).toBeGreaterThan(0);
      const battleaxe = results.find((i) => i.id === 'adamantine-battleaxe');
      expect(battleaxe).toBeDefined();
      if (battleaxe) {
        expect(Array.isArray(battleaxe.properties)).toBe(true);
        expect(battleaxe.properties).toContain('Versatile');
      }
    });

    it('retrieves single item by ID', async () => {
      const item = await service.getItemById('adamantine-battleaxe');
      expect(item).not.toBeNull();
      if (!item) return;

      expect(item.name_en).toBe('Adamantine Battleaxe');
      expect(item.category).toBe('Weapon');
      expect(item.damage_formula).toBe('1d8(1d10)');
      expect(item.weapon_mastery).toBe('Topple');
      expect(item.properties).toEqual(['Versatile']);
    });

    it('retrieves random items matching category', async () => {
      const items = await service.getRandomItems(undefined, 'Weapon', 3);
      expect(items.length).toBe(3);
      for (const it of items) {
        expect(it.category).toBe('Weapon');
      }
    });

    it('retrieves items by filter with query and sorting', async () => {
      const items = await service.getItemsByFilter({
        category: 'Armor',
        query: 'adamantine',
      });
      expect(items.length).toBeGreaterThan(0);
      for (const it of items) {
        expect(it.category).toBe('Armor');
      }
    });
  });

  describe('Spells Web Fallback', () => {
    it('searches spells and retrieves spell by ID', async () => {
      const spells = await service.searchSpells('fireball', 3);
      expect(spells.length).toBeGreaterThan(0);
      const fireball = spells[0];
      expect(fireball.level).toBe(3);

      const byId = await service.getSpellById(fireball.id);
      expect(byId).not.toBeNull();
      expect(byId?.id).toBe(fireball.id);
      expect(Array.isArray(byId?.classes)).toBe(true);
    });
  });
});
