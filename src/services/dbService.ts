import Database from '@tauri-apps/plugin-sql';
import {
  MonsterDbRow,
  SpellDbRow,
  ItemDbRow,
  ParsedMonster,
  ParsedSpell,
  ParsedItem,
  MonsterSearchFilters,
} from '../types/database';

function safeJsonParse<T>(jsonValue: any, defaultValue: T): T {
  if (jsonValue === null || jsonValue === undefined) {
    return defaultValue;
  }
  if (typeof jsonValue === 'object') {
    return jsonValue as T;
  }
  if (typeof jsonValue !== 'string' || !jsonValue.trim()) {
    return defaultValue;
  }
  try {
    return JSON.parse(jsonValue);
  } catch {
    return defaultValue;
  }
}

function matchAltNames(altNames: any, query: string): boolean {
  if (!altNames) return false;
  if (typeof altNames === 'string') {
    return altNames.toLowerCase().includes(query);
  }
  if (Array.isArray(altNames)) {
    return altNames.some((a) => typeof a === 'string' && a.toLowerCase().includes(query));
  }
  return false;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private dbPath = 'sqlite:ttrpghelper.db';
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initializes or returns the cached SQLite database connection
   */
  public async load(): Promise<Database | null> {
    if (this.db) {
      return this.db;
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return this.db;
    }

    try {
      this.isConnecting = true;
      // Database.load preloads from tauri.conf.json
      this.db = await Database.load(this.dbPath);
      return this.db;
    } catch (error) {
      console.warn(
        '[DatabaseService] Could not connect to native SQLite (running in web browser or test mode?):',
        error
      );
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Convert raw MonsterDbRow to typed ParsedMonster
   */
  public parseMonsterRow(row: MonsterDbRow): ParsedMonster {
    return {
      ...row,
      ac: Number(row.ac) || 10,
      hp_average: Number(row.hp_average) || 10,
      init_bonus: Number(row.init_bonus) || 0,
      passive_init: Number(row.passive_init) || 10,
      pb: Number(row.pb) || 2,
      str: Number(row.str) || 10,
      dex: Number(row.dex) || 10,
      con: Number(row.con) || 10,
      intellect: Number(row.intellect) || 10, // intellect strictly respected
      wis: Number(row.wis) || 10,
      cha: Number(row.cha) || 10,
      saves: safeJsonParse<Record<string, number>>(row.saves, {}),
      skills: safeJsonParse<Record<string, number>>(row.skills, {}),
      traits: safeJsonParse<Array<{ name: string; desc: string }>>(row.traits, []),
      actions: safeJsonParse<any[]>(row.actions, []),
      bonus_actions: safeJsonParse<any[]>(row.bonus_actions, []),
      reactions: safeJsonParse<any[]>(row.reactions, []),
      legendary_actions: safeJsonParse<any[]>(row.legendary_actions, []),
      spells: safeJsonParse<any[]>(row.spells, []),
      is_srd: Boolean(row.is_srd),
    };
  }

  /**
   * Convert raw SpellDbRow to typed ParsedSpell
   */
  public parseSpellRow(row: SpellDbRow): ParsedSpell {
    return {
      ...row,
      level: Number(row.level) || 0,
      components_v: Boolean(row.components_v),
      components_s: Boolean(row.components_s),
      components_m: Boolean(row.components_m),
      materials_consumed: Boolean(row.materials_consumed),
      concentration: Boolean(row.concentration),
      is_ritual: Boolean(row.is_ritual),
      is_srd: Boolean(row.is_srd),
      classes: safeJsonParse<string[]>(row.classes, []),
    };
  }

  /**
   * Convert raw ItemDbRow to typed ParsedItem
   */
  public parseItemRow(row: ItemDbRow): ParsedItem {
    return {
      ...row,
      properties: safeJsonParse<string[]>(row.properties, []),
      attunement: Boolean(row.attunement),
      is_srd: Boolean(row.is_srd),
    };
  }

  /**
   * Search monsters by name_ru / name_en with optional filters and JSON parsing (case-insensitive for Cyrillic)
   */
  public async searchMonsters(
    query: string,
    limitOrFilters: number | MonsterSearchFilters = 50,
    limitArg = 50
  ): Promise<ParsedMonster[]> {
    const filters: MonsterSearchFilters =
      typeof limitOrFilters === 'object' && limitOrFilters !== null ? limitOrFilters : {};
    const limit =
      typeof limitOrFilters === 'number'
        ? limitOrFilters
        : filters.limit !== undefined
        ? filters.limit
        : limitArg;

    const db = await this.load();
    if (!db) {
      try {
        const rawList = (await import('../../ttrpg_monsters.json')).default as any[];
        const trimmed = query.trim().toLowerCase();
        let filtered = rawList;

        if (trimmed) {
          filtered = filtered.filter(
            (m) =>
              (m.name_ru && m.name_ru.toLowerCase().includes(trimmed)) ||
              (m.name_en && m.name_en.toLowerCase().includes(trimmed)) ||
              matchAltNames(m.alt_names, trimmed)
          );
        }

        if (filters.size && filters.size.trim() && filters.size !== 'all' && filters.size !== 'Any') {
          const s = filters.size.trim().toLowerCase();
          filtered = filtered.filter(
            (m) =>
              (m.size && m.size.toLowerCase().includes(s)) ||
              (m.size_ru && m.size_ru.toLowerCase().includes(s))
          );
        }

        if (filters.type && filters.type.trim() && filters.type !== 'all' && filters.type !== 'Any') {
          const t = filters.type.trim().toLowerCase();
          filtered = filtered.filter(
            (m) =>
              (m.creature_type && m.creature_type.toLowerCase().includes(t)) ||
              (m.creature_type_ru && m.creature_type_ru.toLowerCase().includes(t)) ||
              (m.type && m.type.toLowerCase().includes(t))
          );
        }

        if (filters.cr !== undefined && filters.cr !== null && filters.cr !== 'all' && filters.cr !== 'Any') {
          const crStr = String(filters.cr).trim().toLowerCase();
          filtered = filtered.filter((m) => String(m.cr).trim().toLowerCase() === crStr);
        }

        filtered.sort((a, b) => {
          const nameA = a.name_ru || a.name_en || '';
          const nameB = b.name_ru || b.name_en || '';
          return nameA.localeCompare(nameB, 'ru');
        });

        return filtered.slice(0, limit).map((r) => this.parseMonsterRow(r));
      } catch (e) {
        console.warn('[DatabaseService] Web fallback failed for monsters:', e);
        return [];
      }
    }

    const trimmed = query.trim();
    const conditions: string[] = [];
    const params: any[] = [];

    if (trimmed) {
      const lower = `%${trimmed.toLowerCase()}%`;
      const capitalized = `%${trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase()}%`;
      params.push(lower, capitalized);
      conditions.push('(name_ru LIKE $1 OR name_ru LIKE $2 OR name_en LIKE $1 OR name_en LIKE $2)');
    } else {
      conditions.push('1=1');
    }

    if (filters.size && filters.size.trim() && filters.size !== 'all' && filters.size !== 'Any') {
      params.push(`%${filters.size.trim()}%`);
      conditions.push(`(size LIKE $${params.length} OR size_ru LIKE $${params.length})`);
    }

    if (filters.type && filters.type.trim() && filters.type !== 'all' && filters.type !== 'Any') {
      params.push(`%${filters.type.trim()}%`);
      conditions.push(`(creature_type LIKE $${params.length} OR creature_type_ru LIKE $${params.length})`);
    }

    if (filters.cr !== undefined && filters.cr !== null && filters.cr !== 'all' && filters.cr !== 'Any') {
      params.push(String(filters.cr).trim());
      conditions.push(`cr = $${params.length}`);
    }

    params.push(limit);
    const sql = `
      SELECT * FROM monsters 
      WHERE ${conditions.join(' AND ')} 
      ORDER BY CASE WHEN name_ru IS NOT NULL AND name_ru != '' THEN name_ru ELSE name_en END ASC 
      LIMIT $${params.length}
    `;

    const rows = await db.select<MonsterDbRow[]>(sql, params);
    return rows.map((r) => this.parseMonsterRow(r));
  }

  /**
   * Get single monster by ID
   */
  public async getMonsterById(id: string): Promise<ParsedMonster | null> {
    const db = await this.load();
    if (!db) {
      try {
        const rawList = (await import('../../ttrpg_monsters.json')).default as any[];
        const found = rawList.find((m) => m.id === id);
        return found ? this.parseMonsterRow(found) : null;
      } catch (e) {
        console.warn('[DatabaseService] Web fallback failed for getMonsterById:', e);
        return null;
      }
    }

    const rows = await db.select<MonsterDbRow[]>('SELECT * FROM monsters WHERE id = $1 LIMIT 1', [id]);
    if (rows.length === 0) return null;
    return this.parseMonsterRow(rows[0]);
  }

  /**
   * Search spells with optional level (0-9) and school filters
   */
  public async searchSpells(
    query: string,
    level?: number,
    school?: string,
    limit = 50
  ): Promise<ParsedSpell[]> {
    const db = await this.load();
    if (!db) {
      try {
        const rawList = (await import('../../ttrpg_spells.json')).default as any[];
        const trimmed = query.trim().toLowerCase();
        let filtered = rawList;
        if (trimmed) {
          filtered = filtered.filter(
            (s) =>
              (s.name_ru && s.name_ru.toLowerCase().includes(trimmed)) ||
              (s.name_en && s.name_en.toLowerCase().includes(trimmed)) ||
              matchAltNames(s.alt_names, trimmed)
          );
        }
        if (level !== undefined && level !== null && level >= 0) {
          filtered = filtered.filter((s) => Number(s.level) === level);
        }
        if (school && school.trim()) {
          const sc = school.trim().toLowerCase();
          filtered = filtered.filter(
            (s) =>
              (s.school && s.school.toLowerCase().includes(sc)) ||
              (s.school_ru && s.school_ru.toLowerCase().includes(sc))
          );
        }
        return filtered.slice(0, limit).map((r) => this.parseSpellRow(r));
      } catch {
        return [];
      }
    }

    const trimmed = query.trim();
    const conditions: string[] = [];
    const params: any[] = [];

    if (trimmed) {
      const lower = `%${trimmed.toLowerCase()}%`;
      const capitalized = `%${trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase()}%`;
      params.push(lower, capitalized);
      conditions.push('(name_ru LIKE $1 OR name_ru LIKE $2 OR name_en LIKE $1 OR name_en LIKE $2)');
    } else {
      conditions.push('1=1');
    }

    if (level !== undefined && level !== null && level >= 0) {
      params.push(level);
      conditions.push(`level = $${params.length}`);
    }

    if (school && school.trim().length > 0) {
      params.push(`%${school.trim()}%`);
      conditions.push(`(school LIKE $${params.length} OR school_ru LIKE $${params.length})`);
    }

    params.push(limit);
    const sql = `
      SELECT * FROM spells 
      WHERE ${conditions.join(' AND ')} 
      ORDER BY level ASC, CASE WHEN name_ru IS NOT NULL AND name_ru != '' THEN name_ru ELSE name_en END ASC 
      LIMIT $${params.length}
    `;

    const rows = await db.select<SpellDbRow[]>(sql, params);
    return rows.map((r) => this.parseSpellRow(r));
  }

  /**
   * Get single spell by ID
   */
  public async getSpellById(id: string): Promise<ParsedSpell | null> {
    const db = await this.load();
    if (!db) {
      try {
        const rawList = (await import('../../ttrpg_spells.json')).default as any[];
        const found = rawList.find((s) => s.id === id);
        return found ? this.parseSpellRow(found) : null;
      } catch (e) {
        console.warn('[DatabaseService] Web fallback failed for getSpellById:', e);
        return null;
      }
    }

    const rows = await db.select<SpellDbRow[]>('SELECT * FROM spells WHERE id = $1 LIMIT 1', [id]);
    if (rows.length === 0) return null;
    return this.parseSpellRow(rows[0]);
  }

  /**
   * Search items with optional category filter
   */
  public async searchItems(query: string, category?: string, limit = 50): Promise<ParsedItem[]> {
    const db = await this.load();
    if (!db) {
      try {
        const rawList = (await import('../../ttrpg_items.json')).default as any[];
        const trimmed = query.trim().toLowerCase();
        let filtered = rawList;

        if (trimmed) {
          filtered = filtered.filter(
            (it) =>
              (it.name_ru && it.name_ru.toLowerCase().includes(trimmed)) ||
              (it.name_en && it.name_en.toLowerCase().includes(trimmed))
          );
        }

        if (category && category.trim().length > 0 && category !== 'all' && category !== 'Any') {
          const cat = category.trim().toLowerCase();
          filtered = filtered.filter(
            (it) =>
              (it.category && it.category.toLowerCase().includes(cat)) ||
              (it.item_type && it.item_type.toLowerCase().includes(cat))
          );
        }

        filtered.sort((a, b) => {
          const nameA = a.name_ru || a.name_en || '';
          const nameB = b.name_ru || b.name_en || '';
          return nameA.localeCompare(nameB, 'ru');
        });

        return filtered.slice(0, limit).map((r) => this.parseItemRow(r));
      } catch (e) {
        console.warn('[DatabaseService] Web fallback failed for items:', e);
        return [];
      }
    }

    const trimmed = query.trim();
    const conditions: string[] = [];
    const params: any[] = [];

    if (trimmed) {
      const lower = `%${trimmed.toLowerCase()}%`;
      const capitalized = `%${trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase()}%`;
      params.push(lower, capitalized);
      conditions.push('(name_ru LIKE $1 OR name_ru LIKE $2 OR name_en LIKE $1 OR name_en LIKE $2)');
    } else {
      conditions.push('1=1');
    }

    if (category && category.trim().length > 0) {
      params.push(category.trim());
      conditions.push(`category = $${params.length}`);
    }

    params.push(limit);
    const sql = `
      SELECT * FROM items 
      WHERE ${conditions.join(' AND ')} 
      ORDER BY CASE WHEN name_ru IS NOT NULL AND name_ru != '' THEN name_ru ELSE name_en END ASC 
      LIMIT $${params.length}
    `;

    const rows = await db.select<ItemDbRow[]>(sql, params);
    return rows.map((r) => this.parseItemRow(r));
  }

  /**
   * Get single item by ID
   */
  public async getItemById(id: string): Promise<ParsedItem | null> {
    const db = await this.load();
    if (!db) {
      try {
        const rawList = (await import('../../ttrpg_items.json')).default as any[];
        const found = rawList.find((it) => it.id === id);
        return found ? this.parseItemRow(found) : null;
      } catch (e) {
        console.warn('[DatabaseService] Web fallback failed for getItemById:', e);
        return null;
      }
    }

    const rows = await db.select<ItemDbRow[]>('SELECT * FROM items WHERE id = $1 LIMIT 1', [id]);
    if (rows.length === 0) return null;
    return this.parseItemRow(rows[0]);
  }

  /**
   * Get random items matching optional rarity and category
   */
  public async getRandomItems(
    rarity?: string,
    category?: string,
    limit = 1
  ): Promise<ParsedItem[]> {
    const db = await this.load();
    if (!db) {
      try {
        const rawList = (await import('../../ttrpg_items.json')).default as any[];
        let filtered = rawList;

        if (rarity && rarity !== 'all' && rarity !== 'Any') {
          const r = rarity.trim().toLowerCase();
          filtered = filtered.filter((it) => it.rarity && it.rarity.toLowerCase().includes(r));
        }

        if (category && category !== 'all' && category !== 'Any') {
          const c = category.trim().toLowerCase();
          filtered = filtered.filter(
            (it) =>
              (it.category && it.category.toLowerCase().includes(c)) ||
              (it.item_type && it.item_type.toLowerCase().includes(c))
          );
        }

        const shuffled = [...filtered].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, limit).map((r) => this.parseItemRow(r));
      } catch (e) {
        console.warn('[DatabaseService] Web fallback failed for getRandomItems:', e);
        return [];
      }
    }

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (rarity && rarity !== 'all' && rarity !== 'Any') {
      params.push(`%${rarity.trim()}%`);
      conditions.push(`rarity LIKE $${params.length}`);
    }

    if (category && category !== 'all' && category !== 'Any') {
      params.push(`%${category.trim()}%`);
      conditions.push(`category LIKE $${params.length}`);
    }

    params.push(limit);
    const sql = `
      SELECT * FROM items 
      WHERE ${conditions.join(' AND ')} 
      ORDER BY RANDOM() 
      LIMIT $${params.length}
    `;

    try {
      const rows = await db.select<ItemDbRow[]>(sql, params);
      return rows.map((r) => this.parseItemRow(r));
    } catch (e) {
      console.warn('[DatabaseService] Error getting random items:', e);
      return [];
    }
  }

  /**
   * Get items matching specific filters (category, rarity, attunement) sorted by cost/name
   */
  public async getItemsByFilter(
    filter: {
      category?: string;
      rarity?: string;
      attunement?: boolean;
      query?: string;
    },
    limit = 100
  ): Promise<ParsedItem[]> {
    const db = await this.load();
    if (!db) {
      try {
        const rawList = (await import('../../ttrpg_items.json')).default as any[];
        let filtered = rawList;

        if (filter.query && filter.query.trim()) {
          const q = filter.query.trim().toLowerCase();
          filtered = filtered.filter(
            (it) =>
              (it.name_ru && it.name_ru.toLowerCase().includes(q)) ||
              (it.name_en && it.name_en.toLowerCase().includes(q))
          );
        }

        if (filter.rarity && filter.rarity !== 'all' && filter.rarity !== 'Any') {
          const r = filter.rarity.trim().toLowerCase();
          filtered = filtered.filter((it) => it.rarity && it.rarity.toLowerCase().includes(r));
        }

        if (filter.category && filter.category !== 'all' && filter.category !== 'Any') {
          const c = filter.category.trim().toLowerCase();
          filtered = filtered.filter(
            (it) =>
              (it.category && it.category.toLowerCase().includes(c)) ||
              (it.item_type && it.item_type.toLowerCase().includes(c))
          );
        }

        if (filter.attunement !== undefined && filter.attunement !== null) {
          filtered = filtered.filter((it) => Boolean(it.attunement) === Boolean(filter.attunement));
        }

        filtered.sort((a, b) => {
          const costDiff = (Number(a.cost_gp) || 0) - (Number(b.cost_gp) || 0);
          if (costDiff !== 0) return costDiff;
          const nameA = a.name_ru || a.name_en || '';
          const nameB = b.name_ru || b.name_en || '';
          return nameA.localeCompare(nameB, 'ru');
        });

        return filtered.slice(0, limit).map((r) => this.parseItemRow(r));
      } catch (e) {
        console.warn('[DatabaseService] Web fallback failed for getItemsByFilter:', e);
        return [];
      }
    }

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filter.query && filter.query.trim()) {
      const trimmed = filter.query.trim();
      const lower = `%${trimmed.toLowerCase()}%`;
      const capitalized = `%${trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase()}%`;
      params.push(lower);
      const idx1 = params.length;
      params.push(capitalized);
      const idx2 = params.length;
      conditions.push(`(name_ru LIKE $${idx1} OR name_ru LIKE $${idx2} OR name_en LIKE $${idx1} OR name_en LIKE $${idx2})`);
    }

    if (filter.rarity && filter.rarity !== 'all' && filter.rarity !== 'Any') {
      params.push(`%${filter.rarity.trim()}%`);
      conditions.push(`rarity LIKE $${params.length}`);
    }

    if (filter.category && filter.category !== 'all' && filter.category !== 'Any') {
      params.push(`%${filter.category.trim()}%`);
      conditions.push(`(category LIKE $${params.length} OR item_type LIKE $${params.length})`);
    }

    if (filter.attunement !== undefined && filter.attunement !== null) {
      params.push(filter.attunement ? 1 : 0);
      conditions.push(`attunement = $${params.length}`);
    }

    params.push(limit);
    const sql = `
      SELECT * FROM items 
      WHERE ${conditions.join(' AND ')} 
      ORDER BY cost_gp ASC, name_ru ASC, name_en ASC 
      LIMIT $${params.length}
    `;

    try {
      const rows = await db.select<ItemDbRow[]>(sql, params);
      return rows.map((r) => this.parseItemRow(r));
    } catch (e) {
      console.warn('[DatabaseService] Error getting items by filter:', e);
      return [];
    }
  }
}

export const dbService = DatabaseService.getInstance();

