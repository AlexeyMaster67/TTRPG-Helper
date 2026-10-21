import { CharacterStats } from '../types/party';

export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function calculateProficiencyBonus(level: number): number {
  const safeLevel = Math.max(1, Math.min(20, Math.floor(level) || 1));
  return Math.floor((safeLevel - 1) / 4) + 2;
}

export const POINT_BUY_COST_MAP: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export interface PointBuyValidation {
  totalCost: number;
  remainingPoints: number;
  isValid: boolean;
  errors: string[];
}

export function calculatePointBuy(stats: CharacterStats): PointBuyValidation {
  let totalCost = 0;
  const errors: string[] = [];

  const keys: Array<keyof CharacterStats> = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  for (const k of keys) {
    const val = stats[k];
    if (val < 8 || val > 15) {
      errors.push(`Значение характеристики ${k.toUpperCase()} (${val}) должно быть в диапазоне от 8 до 15.`);
    }
    const cost = POINT_BUY_COST_MAP[val];
    if (cost !== undefined) {
      totalCost += cost;
    } else if (val < 8) {
      totalCost += 0;
    } else {
      totalCost += 999;
    }
  }

  const remainingPoints = 27 - totalCost;
  const isValid = errors.length === 0 && totalCost <= 27;

  return {
    totalCost,
    remainingPoints,
    isValid,
    errors,
  };
}

export interface AcCalculationParams {
  armorType: 'none' | 'light' | 'medium' | 'heavy';
  baseArmorAc?: number;
  dexMod: number;
  hasShield?: boolean;
  characterClass?: string;
  conMod?: number;
  wisMod?: number;
  isWarforged?: boolean;
  isBeasthideShifted?: boolean;
}

export function calculateArmorClass(params: AcCalculationParams): number {
  const {
    armorType,
    baseArmorAc = 10,
    dexMod,
    hasShield = false,
    characterClass = '',
    conMod = 0,
    wisMod = 0,
    isWarforged = false,
    isBeasthideShifted = false,
  } = params;

  let baseAc = 10;
  const normalizedClass = characterClass.toLowerCase();

  if (armorType === 'none') {
    if (normalizedClass.includes('варвар') || normalizedClass.includes('barbarian')) {
      baseAc = 10 + dexMod + conMod;
    } else if ((normalizedClass.includes('монах') || normalizedClass.includes('monk')) && !hasShield) {
      baseAc = 10 + dexMod + wisMod;
    } else {
      baseAc = 10 + dexMod;
    }
  } else if (armorType === 'light') {
    baseAc = baseArmorAc + dexMod;
  } else if (armorType === 'medium') {
    baseAc = baseArmorAc + Math.min(2, dexMod);
  } else if (armorType === 'heavy') {
    baseAc = baseArmorAc;
  }

  let finalAc = baseAc;

  if (hasShield) {
    finalAc += 2;
  }

  if (isWarforged) {
    finalAc += 1;
  }

  if (isBeasthideShifted) {
    finalAc += 1;
  }

  return finalAc;
}

export interface HpCalculationParams {
  hitDieValue: number;
  level: number;
  conMod: number;
  isDwarf?: boolean;
  rollMethod?: 'average' | 'max';
}

export function calculateHitPoints(params: HpCalculationParams): number {
  const {
    hitDieValue,
    level,
    conMod,
    isDwarf = false,
    rollMethod = 'average',
  } = params;

  const safeLevel = Math.max(1, Math.min(20, Math.floor(level) || 1));
  const level1Hp = Math.max(1, hitDieValue + conMod);

  if (safeLevel === 1) {
    return level1Hp + (isDwarf ? 1 : 0);
  }

  const perLevelGain =
    rollMethod === 'max'
      ? hitDieValue + conMod
      : Math.floor(hitDieValue / 2) + 1 + conMod;

  const subsequentLevelsGain = Math.max(1, perLevelGain) * (safeLevel - 1);
  let totalHp = level1Hp + subsequentLevelsGain;

  if (isDwarf) {
    totalHp += safeLevel;
  }

  return totalHp;
}

export function calculatePassivePerception(
  wisMod: number,
  pb: number,
  profState?: 'proficient' | 'expertise'
): number {
  let bonus = 0;
  if (profState === 'expertise') {
    bonus = pb * 2;
  } else if (profState === 'proficient') {
    bonus = pb;
  }
  return 10 + wisMod + bonus;
}

const FULL_CASTER_SLOTS_TABLE: Record<number, Record<number, number>> = {
  1: { 1: 2 },
  2: { 1: 3 },
  3: { 1: 4, 2: 2 },
  4: { 1: 4, 2: 3 },
  5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 },
  7: { 1: 4, 2: 3, 3: 3, 4: 1 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

const HALF_CASTER_SLOTS_TABLE: Record<number, Record<number, number>> = {
  1: { 1: 2 },
  2: { 1: 2 },
  3: { 1: 3 },
  4: { 1: 3 },
  5: { 1: 4, 2: 2 },
  6: { 1: 4, 2: 2 },
  7: { 1: 4, 2: 3 },
  8: { 1: 4, 2: 3 },
  9: { 1: 4, 2: 3, 3: 2 },
  10: { 1: 4, 2: 3, 3: 2 },
  11: { 1: 4, 2: 3, 3: 3 },
  12: { 1: 4, 2: 3, 3: 3 },
  13: { 1: 4, 2: 3, 3: 3, 4: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 2 },
  16: { 1: 4, 2: 3, 3: 3, 4: 2 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
};

export function calculateSpellSlots(
  casterType: 'none' | 'full' | 'half' | 'pact',
  level: number
): Record<number, { max: number; used: number }> {
  const safeLevel = Math.max(1, Math.min(20, Math.floor(level) || 1));
  const result: Record<number, { max: number; used: number }> = {};

  if (casterType === 'none') {
    return result;
  }

  if (casterType === 'full') {
    const row = FULL_CASTER_SLOTS_TABLE[safeLevel] || {};
    for (let spellLvl = 1; spellLvl <= 9; spellLvl++) {
      if (row[spellLvl]) {
        result[spellLvl] = { max: row[spellLvl], used: 0 };
      }
    }
    return result;
  }

  if (casterType === 'half') {
    const row = HALF_CASTER_SLOTS_TABLE[safeLevel] || {};
    for (let spellLvl = 1; spellLvl <= 5; spellLvl++) {
      if (row[spellLvl]) {
        result[spellLvl] = { max: row[spellLvl], used: 0 };
      }
    }
    return result;
  }

  if (casterType === 'pact') {
    let slotLvl = 1;
    let count = 1;
    if (safeLevel >= 17) {
      slotLvl = 5;
      count = 4;
    } else if (safeLevel >= 11) {
      slotLvl = 5;
      count = 3;
    } else if (safeLevel >= 9) {
      slotLvl = 5;
      count = 2;
    } else if (safeLevel >= 7) {
      slotLvl = 4;
      count = 2;
    } else if (safeLevel >= 5) {
      slotLvl = 3;
      count = 2;
    } else if (safeLevel >= 3) {
      slotLvl = 2;
      count = 2;
    } else if (safeLevel >= 2) {
      slotLvl = 1;
      count = 2;
    }
    result[slotLvl] = { max: count, used: 0 };
    return result;
  }

  return result;
}

export function calculateSpellSaveDc(pb: number, spellMod: number): number {
  return 8 + pb + spellMod;
}

export function calculateSpellAttackBonus(pb: number, spellMod: number): number {
  return pb + spellMod;
}
