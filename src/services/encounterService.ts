import { Encounter, EncounterDifficulty, PartyDifficultyMetrics } from '../types/encounter';

export const CR_XP_MAP: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '0.125': 25,
  '1/4': 50,
  '0.25': 50,
  '1/2': 100,
  '0.5': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
};

// XP Thresholds by character level [Easy, Medium, Hard, Deadly]
export const LEVEL_THRESHOLDS: Record<number, [number, number, number, number]> = {
  1: [25, 50, 75, 100],
  2: [50, 100, 150, 200],
  3: [75, 150, 225, 400],
  4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100],
  6: [300, 600, 900, 1400],
  7: [350, 750, 1100, 1700],
  8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700],
};

export function getXpForCr(cr?: string): number {
  if (!cr) return 50;
  const clean = cr.trim().toLowerCase();
  if (CR_XP_MAP[clean] !== undefined) {
    return CR_XP_MAP[clean];
  }
  const num = parseFloat(clean);
  if (!isNaN(num) && CR_XP_MAP[String(num)]) {
    return CR_XP_MAP[String(num)];
  }
  return 50;
}

export function getMonsterMultiplier(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 1.5;
  if (count >= 3 && count <= 6) return 2;
  if (count >= 7 && count <= 10) return 2.5;
  if (count >= 11 && count <= 14) return 3;
  return 4;
}

export function getDifficultyLabel(diff?: EncounterDifficulty): string {
  if (!diff) return 'Средне';
  if (diff === 'Легкий' || diff === 'Легко') return 'Легко';
  if (diff === 'Средний' || diff === 'Средне') return 'Средне';
  if (diff === 'Сложный' || diff === 'Сложно') return 'Сложно';
  if (diff === 'Смертельный' || diff === 'Смертельно') return 'Смертельно';
  return 'Тривиально';
}

export function calculateEncounterDifficulty(
  monsters: Array<{ cr?: string }>,
  partyCount: number = 4,
  avgLevel: number = 3
): PartyDifficultyMetrics {
  const pCount = Math.max(1, partyCount);
  const lvl = Math.min(20, Math.max(1, Math.round(avgLevel)));
  const [eTh, mTh, hTh, dTh] = LEVEL_THRESHOLDS[lvl] || [75, 150, 225, 400];

  const partyThresholds = {
    easy: eTh * pCount,
    medium: mTh * pCount,
    hard: hTh * pCount,
    deadly: dTh * pCount,
  };

  const enemyCount = monsters.length;
  let rawXp = 0;
  for (const m of monsters) {
    rawXp += getXpForCr(m.cr);
  }

  // Multiplier by number of monsters (D&D 2024 / 5e DMG)
  const mult = getMonsterMultiplier(enemyCount);
  const adjustedXp = Math.round(rawXp * mult);

  let difficulty: EncounterDifficulty = 'Тривиально';
  if (adjustedXp >= partyThresholds.deadly) difficulty = 'Смертельно';
  else if (adjustedXp >= partyThresholds.hard) difficulty = 'Сложно';
  else if (adjustedXp >= partyThresholds.medium) difficulty = 'Средне';
  else if (adjustedXp >= partyThresholds.easy) difficulty = 'Легко';

  return {
    totalXp: rawXp,
    adjustedXp,
    difficulty,
    thresholds: partyThresholds,
  };
}

export const SAMPLE_ENCOUNTERS: Encounter[] = [
  {
    id: 'enc_sample_1',
    name: 'Засада гоблинов в ущелье',
    folder: 'Лес и засады',
    description: 'Группа гоблинов-разбойников подстерегает караван в узкой расщелине.',
    createdAt: Date.now() - 3600000 * 24,
    totalXp: 400,
    difficulty: 'Средне',
    combatants: [
      {
        name: 'Гоблин-разведчик 1',
        cr: '1/4',
        isPlayer: false,
        hp: 7,
        maxHp: 7,
        ac: 15,
        initBonus: 2,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 100,
        tokenY: 100,
      },
      {
        name: 'Гоблин-разведчик 2',
        cr: '1/4',
        isPlayer: false,
        hp: 7,
        maxHp: 7,
        ac: 15,
        initBonus: 2,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 150,
        tokenY: 100,
      },
      {
        name: 'Гоблин-лучник',
        cr: '1/4',
        isPlayer: false,
        hp: 7,
        maxHp: 7,
        ac: 15,
        initBonus: 2,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 200,
        tokenY: 80,
      },
      {
        name: 'Лютоволк',
        cr: '1',
        isPlayer: false,
        hp: 37,
        maxHp: 37,
        ac: 14,
        initBonus: 2,
        speed: '50 фт.',
        color: '#E01A22',
        tokenX: 150,
        tokenY: 200,
      },
    ],
  },
  {
    id: 'enc_sample_2',
    name: 'Логово огра-вымогателя',
    folder: 'Пещеры',
    description: 'Свирепый огр с прирученными гоблинами в пещере у тракта.',
    createdAt: Date.now() - 3600000 * 12,
    totalXp: 550,
    difficulty: 'Сложно',
    combatants: [
      {
        name: 'Огр',
        cr: '2',
        isPlayer: false,
        hp: 59,
        maxHp: 59,
        ac: 11,
        initBonus: -1,
        speed: '40 фт.',
        color: '#E01A22',
        tokenX: 250,
        tokenY: 250,
        tokenScale: 2.0,
      },
      {
        name: 'Гоблин-прислужник 1',
        cr: '1/4',
        isPlayer: false,
        hp: 7,
        maxHp: 7,
        ac: 15,
        initBonus: 2,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 180,
        tokenY: 220,
      },
      {
        name: 'Гоблин-прислужник 2',
        cr: '1/4',
        isPlayer: false,
        hp: 7,
        maxHp: 7,
        ac: 15,
        initBonus: 2,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 320,
        tokenY: 220,
      },
    ],
  },
  {
    id: 'enc_sample_3',
    name: 'Тайное святилище темного культа',
    folder: 'Подземелье',
    description: 'Фанатик и прислужники, совершающие ритуал жертвоприношения.',
    createdAt: Date.now() - 3600000 * 6,
    totalXp: 550,
    difficulty: 'Сложно',
    combatants: [
      {
        name: 'Фанатик культа',
        cr: '2',
        isPlayer: false,
        hp: 33,
        maxHp: 33,
        ac: 13,
        initBonus: 2,
        speed: '30 фт.',
        color: '#8B5CF6',
        tokenX: 300,
        tokenY: 150,
      },
      {
        name: 'Культист 1',
        cr: '1/8',
        isPlayer: false,
        hp: 9,
        maxHp: 9,
        ac: 12,
        initBonus: 1,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 200,
        tokenY: 180,
      },
      {
        name: 'Культист 2',
        cr: '1/8',
        isPlayer: false,
        hp: 9,
        maxHp: 9,
        ac: 12,
        initBonus: 1,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 240,
        tokenY: 240,
      },
      {
        name: 'Культист 3',
        cr: '1/8',
        isPlayer: false,
        hp: 9,
        maxHp: 9,
        ac: 12,
        initBonus: 1,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 360,
        tokenY: 240,
      },
      {
        name: 'Культист 4',
        cr: '1/8',
        isPlayer: false,
        hp: 9,
        maxHp: 9,
        ac: 12,
        initBonus: 1,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 400,
        tokenY: 180,
      },
    ],
  },
  {
    id: 'enc_sample_4',
    name: 'Гробница Древнего Вампира (Босс)',
    folder: 'Боссы',
    description: 'Легендарный владыка ночи в фамильном склепе.',
    createdAt: Date.now() - 3600000 * 2,
    totalXp: 10200,
    difficulty: 'Смертельно',
    combatants: [
      {
        name: 'Вампир (Владыка склепа)',
        cr: '13',
        isPlayer: false,
        hp: 195,
        maxHp: 195,
        ac: 16,
        initBonus: 14,
        speed: '30 фт., лазание 30 фт.',
        color: '#E01A22',
        tokenX: 300,
        tokenY: 200,
      },
      {
        name: 'Скелет-страж 1',
        cr: '1/4',
        isPlayer: false,
        hp: 13,
        maxHp: 13,
        ac: 13,
        initBonus: 2,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 200,
        tokenY: 150,
      },
      {
        name: 'Скелет-страж 2',
        cr: '1/4',
        isPlayer: false,
        hp: 13,
        maxHp: 13,
        ac: 13,
        initBonus: 2,
        speed: '30 фт.',
        color: '#E01A22',
        tokenX: 400,
        tokenY: 150,
      },
    ],
  },
];

export async function saveEncountersToDisk(encounters: Encounter[]): Promise<void> {
  const json = JSON.stringify(encounters, null, 2);
  try {
    const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    await writeTextFile('encounters.json', json, { baseDir: BaseDirectory.AppData });
  } catch {
    try {
      localStorage.setItem('dnd_ait_encounters', json);
    } catch (e) {
      console.warn('Could not save encounters:', e);
    }
  }
}

export async function loadEncountersFromDisk(): Promise<Encounter[]> {
  try {
    const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    const content = await readTextFile('encounters.json', { baseDir: BaseDirectory.AppData });
    if (content) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    try {
      const stored = localStorage.getItem('dnd_ait_encounters');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
  }
  return SAMPLE_ENCOUNTERS;
}
