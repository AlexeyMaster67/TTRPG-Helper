import { ParsedLssCharacter } from '../types/lss';
import { PartyMember } from '../types/party';
import { Combatant } from '../types/combat';
import { MonsterAction } from '../types/database';

function extractVal(obj: any, path: string[]): any {
  if (!obj) return undefined;
  let curr = obj;
  for (const p of path) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[p];
  }
  if (curr && typeof curr === 'object' && 'value' in curr) {
    return curr.value;
  }
  return curr;
}

function parseStat(raw: any, defaultScore = 10): number {
  if (raw === undefined || raw === null) return defaultScore;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object') {
    if (typeof raw.score === 'number') return raw.score;
    if (typeof raw.value === 'number') return raw.value;
    if (typeof raw.score === 'string') return parseInt(raw.score, 10) || defaultScore;
    if (typeof raw.value === 'string') return parseInt(raw.value, 10) || defaultScore;
  }
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? defaultScore : parsed;
  }
  return defaultScore;
}

function getMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export class LssImportService {
  private static instance: LssImportService;

  public static getInstance(): LssImportService {
    if (!LssImportService.instance) {
      LssImportService.instance = new LssImportService();
    }
    return LssImportService.instance;
  }

  /**
   * Parses JSON text or object from Long Story Short or 5e sheet export
   */
  public parseLssJson(input: string | object, defaultName?: string): ParsedLssCharacter {
    let raw: any;
    if (typeof input === 'string') {
      try {
        raw = JSON.parse(input);
      } catch (err) {
        throw new Error(`Невалидный JSON: ${(err as Error).message}`);
      }
    } else {
      raw = input;
    }

    // Check if wrapped in "data" property (escaped JSON or nested object)
    if (raw && raw.data) {
      if (typeof raw.data === 'string') {
        try {
          raw = JSON.parse(raw.data);
        } catch {
          // keep raw
        }
      } else if (typeof raw.data === 'object') {
        raw = raw.data;
      }
    }

    // 1. Name
    const name =
      extractVal(raw, ['name']) ||
      extractVal(raw, ['info', 'name']) ||
      defaultName ||
      'Безымянный герой';

    // 2. Class, Level, Race
    const charClassRaw =
      extractVal(raw, ['info', 'charClass']) ||
      extractVal(raw, ['info', 'class']) ||
      extractVal(raw, ['charClass']) ||
      'Воин';

    const levelRaw =
      extractVal(raw, ['info', 'level']) ||
      extractVal(raw, ['level']) ||
      1;
    const level = parseInt(String(levelRaw), 10) || 1;

    const race =
      extractVal(raw, ['info', 'race']) ||
      extractVal(raw, ['race']) ||
      'Гуманоид';

    const classAndLevel = String(charClassRaw).includes(String(level))
      ? String(charClassRaw)
      : `${charClassRaw} ${level}`;

    // 3. Stats
    const statsObj = raw.stats || {};
    const str = parseStat(statsObj.str);
    const dex = parseStat(statsObj.dex);
    const con = parseStat(statsObj.con);
    const int = parseStat(statsObj.int || statsObj.intellect);
    const wis = parseStat(statsObj.wis);
    const cha = parseStat(statsObj.cha);

    const dexMod = getMod(dex);
    const wisMod = getMod(wis);

    // 4. AC, HP, Speed
    const rawHpMax =
      extractVal(raw, ['vitality', 'hp-max']) ||
      extractVal(raw, ['vitality', 'hpMax']) ||
      extractVal(raw, ['vitality', 'maxHp']) ||
      extractVal(raw, ['hpMax']) ||
      extractVal(raw, ['maxHp']) ||
      extractVal(raw, ['hp']) ||
      20;
    const maxHp = parseInt(String(rawHpMax), 10) || 20;

    const rawHpCur =
      extractVal(raw, ['vitality', 'hp-current']) ||
      extractVal(raw, ['vitality', 'currentHp']) ||
      maxHp;
    const currentHp = parseInt(String(rawHpCur), 10) || maxHp;

    const rawAc =
      extractVal(raw, ['vitality', 'ac']) ||
      extractVal(raw, ['ac']) ||
      10 + dexMod;
    const ac = parseInt(String(rawAc), 10) || 10;

    const speedRaw =
      extractVal(raw, ['vitality', 'speed']) ||
      extractVal(raw, ['speed']) ||
      '30 фт.';
    const speed = typeof speedRaw === 'number' ? `${speedRaw} фт.` : String(speedRaw);

    // 5. Initiative & Passive Perception
    const initRaw =
      extractVal(raw, ['vitality', 'init']) ||
      extractVal(raw, ['initiative']) ||
      extractVal(raw, ['initBonus']);
    const initiativeBonus =
      initRaw !== undefined ? parseInt(String(initRaw), 10) || dexMod : dexMod;

    const percRaw =
      extractVal(raw, ['skills', 'perception']) ||
      extractVal(raw, ['skills', 'Perception']) ||
      extractVal(raw, ['passivePerception']);
    const passivePerception =
      percRaw !== undefined
        ? parseInt(String(percRaw), 10) || 10 + wisMod
        : 10 + wisMod;

    // 6. Avatar
    const avatarUrl =
      extractVal(raw, ['avatar']) ||
      extractVal(raw, ['avatarUrl']) ||
      extractVal(raw, ['info', 'avatar']);

    // 7. Actions / Weapons
    const actions: MonsterAction[] = [];
    const weaponsList = raw.weaponsList || raw.weapons || raw.attacks || [];

    if (Array.isArray(weaponsList)) {
      weaponsList.forEach((w: any) => {
        if (!w) return;
        const wName = extractVal(w, ['name']) || 'Атака оружием';
        const wMod = extractVal(w, ['mod']) || extractVal(w, ['attack_bonus']) || extractVal(w, ['bonus']);
        let attack_bonus = 0;
        if (typeof wMod === 'number') attack_bonus = wMod;
        else if (typeof wMod === 'string') attack_bonus = parseInt(wMod.replace('+', ''), 10) || 0;

        const damage_dice = extractVal(w, ['dmg']) || extractVal(w, ['damage_dice']) || extractVal(w, ['damage']) || '1d8';
        const damage_type = extractVal(w, ['type']) || extractVal(w, ['damage_type']) || 'Рубящий';

        actions.push({
          name: String(wName),
          attack_bonus,
          damage_dice: String(damage_dice),
          damage_type: String(damage_type),
          desc: `${wName} (+${attack_bonus} к попаданию, ${damage_dice} ${damage_type})`,
        });
      });
    }

    if (actions.length === 0) {
      actions.push({
        name: 'Основное оружие',
        attack_bonus: 2 + dexMod,
        damage_dice: '1d8+' + Math.max(0, dexMod),
        damage_type: 'Рубящий',
        desc: 'Базовая атака персонажа.',
      });
    }

    // 8. Features & Notes
    const features = raw.features || raw.traits || '';
    const equipment = raw.equipment || '';
    const notesArr: string[] = [];
    if (typeof features === 'string' && features.trim()) notesArr.push(features.trim());
    if (typeof equipment === 'string' && equipment.trim()) notesArr.push(equipment.trim());

    return {
      id: `lss_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: String(name).trim(),
      charClass: String(charClassRaw).trim(),
      level,
      classAndLevel,
      race: String(race).trim(),
      maxHp,
      currentHp,
      ac,
      speed,
      initiativeBonus,
      passivePerception,
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined,
      stats: { str, dex, con, int, wis, cha },
      actions,
      notes: notesArr.length > 0 ? notesArr.join('\n\n') : undefined,
      rawJson: raw,
    };
  }

  /**
   * Converts parsed LSS character to a PartyMember object
   */
  public toPartyMember(char: ParsedLssCharacter): Omit<PartyMember, 'id'> {
    return {
      name: char.name,
      characterClass: char.classAndLevel,
      species: char.race,
      level: char.level || 1,
      ac: char.ac,
      maxHp: char.maxHp,
      currentHp: char.currentHp ?? char.maxHp,
      initBonus: char.initiativeBonus,
      passivePerception: char.passivePerception,
      speed: char.speed,
      avatarUrl: char.avatarUrl,
      notes: char.notes,
      color: '#10B981', // emerald theme for party heroes
      stats: char.stats,
      hitDiceMax: char.level || 1,
      hitDiceCurrent: char.level || 1,
      exhaustion: 0,
    };
  }

  /**
   * Converts parsed LSS character to a Combatant object for combat roster
   */
  public toCombatant(char: ParsedLssCharacter, initRoll?: number): Partial<Combatant> & { name: string } {
    const roll = initRoll !== undefined ? initRoll : 10 + char.initiativeBonus;
    return {
      name: char.name,
      nameRu: char.name,
      isPlayer: true,
      ac: char.ac,
      hp: char.maxHp,
      maxHp: char.maxHp,
      tempHp: 0,
      initiative: roll,
      initBonus: char.initiativeBonus,
      passiveInit: 10 + char.initiativeBonus,
      speed: char.speed,
      color: '#10B981',
      tokenScale: 1.0,
      tokenUrl: char.avatarUrl,
      creatureType: `${char.race} • ${char.classAndLevel}`,
      statblock: {
        id: `lss-${char.id}`,
        name_en: char.name,
        name_ru: char.name,
        size: 'Medium',
        size_ru: 'Средний',
        creature_type: 'humanoid',
        creature_type_ru: char.race || 'гуманоид',
        alignment: 'герой',
        ac: char.ac,
        hp_average: char.maxHp,
        hp_formula: '',
        speed: char.speed,
        init_bonus: char.initiativeBonus,
        passive_init: 10 + char.initiativeBonus,
        cr: `Герой ур.${char.level}`,
        pb: 2 + Math.floor((char.level - 1) / 4),
        str: char.stats.str,
        dex: char.stats.dex,
        con: char.stats.con,
        intellect: char.stats.int,
        wis: char.stats.wis,
        cha: char.stats.cha,
        saves: {},
        skills: { Perception: char.passivePerception - 10 },
        damage_vulnerabilities: '',
        damage_resistances: '',
        damage_immunities: '',
        condition_immunities: '',
        senses: `Пасс. Внимание ${char.passivePerception}`,
        languages: 'Общий',
        source: 'LSS Import',
        is_srd: true,
        spells: [],
        traits: char.notes ? [{ name: 'Способности и снаряжение', desc: char.notes }] : [],
        actions: char.actions,
        bonus_actions: [],
        reactions: [],
        legendary_actions: [],
      },
    };
  }
}

export const lssImportService = LssImportService.getInstance();
