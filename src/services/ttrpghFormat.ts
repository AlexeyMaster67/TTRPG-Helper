/**
 * TTRPG-Helper Open Character Format (.ttrpgh) Engine
 * Specification Version: 1
 * System: D&D 2024 / 5e
 *
 * Provides typed serialization, deserialization, export, import,
 * QR code compact transport, and file download utilities.
 */

import {
  PartyMember,
  CharacterStats,
  ClassResource,
  PreparedSpell,
  EquipmentItem,
  CharacterWeapon,
  AttunementSlot,
} from '../types/party';

export interface TtrpghMeta {
  createdAt: string;
  updatedAt: string;
  appVersion: string;
}

export interface TtrpghIdentity {
  name: string;
  class: string;
  subclass?: string;
  level: number;
  speciesId?: string;
  speciesName?: string;
  background?: string;
  alignment?: string;
  experience?: number;
}

export interface TtrpghToken {
  hasCustomToken: boolean;
  base64?: string; // data:image/png;base64,...
  frameStyle?: string;
  ringColor?: string;
}

export interface TtrpghAttributes {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface TtrpghSavingThrows {
  proficiencies: string[];
  customBonuses?: Record<string, number>;
}

export interface TtrpghHitDice {
  current: number;
  max: number;
  type: string;
}

export interface TtrpghDeathSaves {
  successes: number;
  failures: number;
}

export interface TtrpghVitals {
  hpCurrent: number;
  hpMax: number;
  hpTemp: number;
  hitDice: TtrpghHitDice;
  deathSaves?: TtrpghDeathSaves;
  exhaustion: number;
}

export interface TtrpghCombat {
  ac: number;
  speed: string;
  initiativeBonus: number;
  masteries?: string[];
}

export interface TtrpghSpells {
  spellcastingAbility?: 'int' | 'wis' | 'cha';
  spellAttackBonus?: number;
  spellSaveDc?: number;
  spellSlots?: Record<number, { max: number; used: number }>;
  preparedSpells?: PreparedSpell[];
}

export interface TtrpghInventory {
  equipment?: EquipmentItem[];
  weapons?: CharacterWeapon[];
  attunementSlots?: AttunementSlot[];
}

export interface TtrpghEffect {
  id: string;
  name: string;
  durationRounds?: number;
  source?: string;
}

export interface TtrpghFile {
  format: 'ttrpgh';
  version: 1;
  system: 'dnd2024';
  meta: TtrpghMeta;
  identity: TtrpghIdentity;
  token: TtrpghToken;
  attributes: TtrpghAttributes;
  savingThrows: TtrpghSavingThrows;
  vitals: TtrpghVitals;
  combat: TtrpghCombat;
  skills: Record<string, 'proficient' | 'expertise' | undefined>;
  classResources: ClassResource[];
  spells: TtrpghSpells;
  inventory: TtrpghInventory;
  effects?: TtrpghEffect[];
}

export const TTRPGH_FORMAT_VERSION = 1;
export const TTRPGH_APP_VERSION = '2.4.0';

/**
 * Cross-environment UTF-8 Base64 helper
 */
function encodeBase64(str: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(unescape(encodeURIComponent(str)));
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(b64: string): string {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return decodeURIComponent(escape(window.atob(b64)));
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf-8');
  }
  return decodeURIComponent(escape(atob(b64)));
}

/**
 * Exports a PartyMember into a typed TtrpghFile data structure.
 */
export function exportCharacterToTtrpgh(
  member: PartyMember,
  tokenBase64?: string,
  frameStyle?: string
): TtrpghFile {
  const now = new Date().toISOString();

  // Extract class and optional subclass from format: "Class (Subclass)"
  let mainClass = member.characterClass || 'Искатель приключений';
  let subclass: string | undefined;

  const subclassMatch = mainClass.match(/^(.*?)\s*\((.*?)\)$/);
  if (subclassMatch) {
    mainClass = subclassMatch[1].trim();
    subclass = subclassMatch[2].trim();
  }

  // Determine token base64 and presence
  const finalTokenBase64 =
    tokenBase64 ||
    (member.avatarUrl && member.avatarUrl.startsWith('data:image/')
      ? member.avatarUrl
      : undefined);

  const stats: CharacterStats = member.stats || {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };

  const level = member.level || 1;
  const currentHp = member.currentHp !== undefined ? member.currentHp : member.maxHp;
  const tempHp = member.tempHp || 0;
  const hitDiceMax = member.hitDiceMax || level;
  const hitDiceCurrent = member.hitDiceCurrent !== undefined ? member.hitDiceCurrent : hitDiceMax;
  const hitDiceType = member.hitDiceType || 'd8';

  const masteries: string[] = [];
  if (member.weapons) {
    for (const w of member.weapons) {
      if (w.mastery && w.mastery.trim()) {
        masteries.push(`${w.name}: ${w.mastery.trim()}`);
      }
    }
  }

  const file: TtrpghFile = {
    format: 'ttrpgh',
    version: 1,
    system: 'dnd2024',
    meta: {
      createdAt: now,
      updatedAt: now,
      appVersion: TTRPGH_APP_VERSION,
    },
    identity: {
      name: member.name || 'Безымянный герой',
      class: mainClass,
      subclass,
      level,
      speciesName: member.species || 'Человек',
      experience: 0,
    },
    token: {
      hasCustomToken: Boolean(finalTokenBase64),
      base64: finalTokenBase64,
      frameStyle: frameStyle || 'gold-runic',
      ringColor: member.color || '#10B981',
    },
    attributes: {
      str: stats.str ?? 10,
      dex: stats.dex ?? 10,
      con: stats.con ?? 10,
      int: stats.int ?? 10,
      wis: stats.wis ?? 10,
      cha: stats.cha ?? 10,
    },
    savingThrows: {
      proficiencies: member.savingThrowProficiencies ? [...member.savingThrowProficiencies] : [],
    },
    vitals: {
      hpCurrent: currentHp,
      hpMax: member.maxHp || 10,
      hpTemp: tempHp,
      hitDice: {
        current: hitDiceCurrent,
        max: hitDiceMax,
        type: hitDiceType,
      },
      exhaustion: member.exhaustion || 0,
    },
    combat: {
      ac: member.ac || 10,
      speed: member.speed || '30 фт.',
      initiativeBonus: member.initBonus || 0,
      masteries: masteries.length > 0 ? masteries : undefined,
    },
    skills: member.skillProficiencies ? { ...member.skillProficiencies } : {},
    classResources: member.resources ? JSON.parse(JSON.stringify(member.resources)) : [],
    spells: {
      spellcastingAbility: member.spellcastingAbility,
      spellAttackBonus: member.spellAttackBonus,
      spellSaveDc: member.spellSaveDc,
      spellSlots: member.spellSlots ? JSON.parse(JSON.stringify(member.spellSlots)) : undefined,
      preparedSpells: member.preparedSpells ? JSON.parse(JSON.stringify(member.preparedSpells)) : undefined,
    },
    inventory: {
      equipment: member.equipment ? JSON.parse(JSON.stringify(member.equipment)) : [],
      weapons: member.weapons ? JSON.parse(JSON.stringify(member.weapons)) : [],
      attunementSlots: member.attunementSlots ? JSON.parse(JSON.stringify(member.attunementSlots)) : [],
    },
  };

  return file;
}

/**
 * Serializes a TtrpghFile object to a JSON string.
 */
export function serializeTtrpgh(file: TtrpghFile): string {
  return JSON.stringify(file, null, 2);
}

/**
 * Parses and validates a .ttrpgh JSON string.
 */
export function deserializeTtrpgh(jsonStr: string): TtrpghFile {
  if (!jsonStr || typeof jsonStr !== 'string') {
    throw new Error('Некорректные данные файла .ttrpgh');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err: any) {
    throw new Error(`Ошибка разбора JSON .ttrpgh: ${err.message || 'Синтаксическая ошибка'}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Файл не содержит валидный объект .ttrpgh');
  }

  if (parsed.format !== 'ttrpgh') {
    throw new Error(`Неподдерживаемый формат: ожидался "ttrpgh", получено "${parsed.format}"`);
  }

  if (parsed.version !== 1) {
    throw new Error(`Неподдерживаемая версия формата: ${parsed.version}`);
  }

  if (!parsed.identity || !parsed.identity.name) {
    throw new Error('Файл .ttrpgh поврежден: отсутствует имя персонажа (identity.name)');
  }

  return parsed as TtrpghFile;
}

/**
 * Imports a PartyMember from a .ttrpgh file data string or object.
 */
export function importCharacterFromTtrpgh(fileData: string | object): PartyMember {
  const file: TtrpghFile =
    typeof fileData === 'string' ? deserializeTtrpgh(fileData) : (fileData as TtrpghFile);

  if (file.format !== 'ttrpgh') {
    throw new Error('Неверный формат файла .ttrpgh');
  }

  const id = crypto.randomUUID();
  const identity = file.identity || { name: 'Герой', class: 'Воин', level: 1 };

  const fullClassName = identity.subclass
    ? `${identity.class} (${identity.subclass})`
    : identity.class || 'Искатель приключений';

  const attrs = file.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const vitals = file.vitals || {
    hpCurrent: 10,
    hpMax: 10,
    hpTemp: 0,
    hitDice: { current: 1, max: 1, type: 'd8' },
    exhaustion: 0,
  };
  const combat = file.combat || { ac: 10, speed: '30 фт.', initiativeBonus: 0 };
  const token = file.token || { hasCustomToken: false };

  const member: PartyMember = {
    id,
    name: identity.name || 'Импортированный персонаж',
    characterClass: fullClassName,
    level: identity.level || 1,
    species: identity.speciesName || identity.speciesId || 'Человек',
    ac: combat.ac ?? 10,
    maxHp: vitals.hpMax ?? 10,
    currentHp: vitals.hpCurrent !== undefined ? vitals.hpCurrent : vitals.hpMax ?? 10,
    tempHp: vitals.hpTemp ?? 0,
    initBonus: combat.initiativeBonus ?? 0,
    speed: combat.speed || '30 фт.',
    avatarUrl: token.hasCustomToken && token.base64 ? token.base64 : undefined,
    color: token.ringColor || '#10B981',
    hitDiceCurrent: vitals.hitDice?.current ?? identity.level ?? 1,
    hitDiceMax: vitals.hitDice?.max ?? identity.level ?? 1,
    hitDiceType: vitals.hitDice?.type || 'd8',
    exhaustion: vitals.exhaustion ?? 0,
    stats: {
      str: attrs.str ?? 10,
      dex: attrs.dex ?? 10,
      con: attrs.con ?? 10,
      int: attrs.int ?? 10,
      wis: attrs.wis ?? 10,
      cha: attrs.cha ?? 10,
    },
    savingThrowProficiencies: file.savingThrows?.proficiencies || [],
    skillProficiencies: file.skills || {},
    resources: file.classResources || [],
    spellcastingAbility: file.spells?.spellcastingAbility,
    spellAttackBonus: file.spells?.spellAttackBonus,
    spellSaveDc: file.spells?.spellSaveDc,
    spellSlots: file.spells?.spellSlots,
    preparedSpells: file.spells?.preparedSpells || [],
    equipment: file.inventory?.equipment || [],
    weapons: file.inventory?.weapons || [],
    attunementSlots: file.inventory?.attunementSlots || [],
  };

  return member;
}

/**
 * Triggers a client-side download of a .ttrpgh file for the specified PartyMember.
 */
export function downloadTtrpghFile(
  member: PartyMember,
  tokenBase64?: string,
  frameStyle?: string
): void {
  const file = exportCharacterToTtrpgh(member, tokenBase64, frameStyle);
  const serialized = serializeTtrpgh(file);
  const cleanName = (member.name || 'character').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
  const filename = `${cleanName}.ttrpgh`;

  if (typeof document !== 'undefined') {
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Compact representation for offline QR exchange.
 */
interface CompactQrPayload {
  n: string; // name
  c: string; // class
  sub?: string; // subclass
  l: number; // level
  spc?: string; // species
  ac: number;
  hp: number;
  mhp: number;
  thp?: number;
  spd: string; // speed
  ini: number; // init bonus
  st: [number, number, number, number, number, number]; // str, dex, con, int, wis, cha
  sv: string[]; // saving throws proficiencies
  rc?: string; // ring color
  fst?: string; // frame style
}

const QR_PREFIX = 'TTRPGH:1:';

/**
 * Encodes key character stats into a compact string suitable for QR codes.
 */
export function compressForQr(source: TtrpghFile | PartyMember): string {
  let file: TtrpghFile;
  if ('format' in source && source.format === 'ttrpgh') {
    file = source as TtrpghFile;
  } else {
    file = exportCharacterToTtrpgh(source as PartyMember);
  }

  const compact: CompactQrPayload = {
    n: file.identity.name,
    c: file.identity.class,
    sub: file.identity.subclass,
    l: file.identity.level,
    spc: file.identity.speciesName,
    ac: file.combat.ac,
    hp: file.vitals.hpCurrent,
    mhp: file.vitals.hpMax,
    thp: file.vitals.hpTemp > 0 ? file.vitals.hpTemp : undefined,
    spd: file.combat.speed,
    ini: file.combat.initiativeBonus,
    st: [
      file.attributes.str,
      file.attributes.dex,
      file.attributes.con,
      file.attributes.int,
      file.attributes.wis,
      file.attributes.cha,
    ],
    sv: file.savingThrows.proficiencies || [],
    rc: file.token.ringColor,
    fst: file.token.frameStyle,
  };

  const jsonStr = JSON.stringify(compact);
  const b64 = encodeBase64(jsonStr);
  return `${QR_PREFIX}${b64}`;
}

/**
 * Decodes and unpacks key character stats from a QR code payload.
 */
export function decompressFromQr(qrPayload: string): TtrpghFile {
  if (!qrPayload || !qrPayload.startsWith(QR_PREFIX)) {
    throw new Error('Некорректный QR код: отсутствует префикс формата TTRPGH:1:');
  }

  const b64 = qrPayload.slice(QR_PREFIX.length);
  const jsonStr = decodeBase64(b64);
  const compact: CompactQrPayload = JSON.parse(jsonStr);

  const now = new Date().toISOString();

  const file: TtrpghFile = {
    format: 'ttrpgh',
    version: 1,
    system: 'dnd2024',
    meta: {
      createdAt: now,
      updatedAt: now,
      appVersion: TTRPGH_APP_VERSION,
    },
    identity: {
      name: compact.n || 'Безымянный герой',
      class: compact.c || 'Воин',
      subclass: compact.sub,
      level: compact.l || 1,
      speciesName: compact.spc || 'Человек',
    },
    token: {
      hasCustomToken: false,
      frameStyle: compact.fst || 'gold-runic',
      ringColor: compact.rc || '#10B981',
    },
    attributes: {
      str: compact.st?.[0] ?? 10,
      dex: compact.st?.[1] ?? 10,
      con: compact.st?.[2] ?? 10,
      int: compact.st?.[3] ?? 10,
      wis: compact.st?.[4] ?? 10,
      cha: compact.st?.[5] ?? 10,
    },
    savingThrows: {
      proficiencies: compact.sv || [],
    },
    vitals: {
      hpCurrent: compact.hp ?? 10,
      hpMax: compact.mhp ?? 10,
      hpTemp: compact.thp ?? 0,
      hitDice: {
        current: compact.l || 1,
        max: compact.l || 1,
        type: 'd8',
      },
      exhaustion: 0,
    },
    combat: {
      ac: compact.ac ?? 10,
      speed: compact.spd || '30 фт.',
      initiativeBonus: compact.ini ?? 0,
    },
    skills: {},
    classResources: [],
    spells: {},
    inventory: {},
  };

  return file;
}
