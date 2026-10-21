/**
 * D&D 2024 / 5e Targeted Attack Resolution Engine
 */

export interface AttackRollParams {
  d20Roll: number;
  attackBonus: number;
  targetAc: number;
  damageFormula?: string;
}

export interface AttackRollResult {
  roll: number;
  attackBonus: number;
  total: number;
  targetAc: number;
  isHit: boolean;
  isCriticalHit: boolean;
  isCriticalMiss: boolean;
  outcomeText: string;
  criticalDamageFormula?: string;
}

/**
 * Doubles only the damage dice in a formula (modifiers like +3 remain unchanged).
 * Example: "1d8 + 3" -> "2d8 + 3", "2d6 + 4" -> "4d6 + 4"
 */
export function doubleDamageDiceInFormula(formula: string): string {
  return formula.replace(/(\d+)?d(\d+)/gi, (_match, countStr, sides) => {
    const count = countStr ? parseInt(countStr, 10) : 1;
    return `${count * 2}d${sides}`;
  });
}

/**
 * Resolves an attack roll vs target Armor Class (AC) according to D&D 2024 / 5e rules:
 * - Natural 20 is always a Critical Hit (auto-hits, doubles damage dice)
 * - Natural 1 is always a Critical Miss (auto-misses regardless of attack bonus)
 * - Otherwise: hits if total (roll + bonus) >= target AC
 */
export function resolveAttackRoll(params: AttackRollParams): AttackRollResult {
  const { d20Roll, attackBonus, targetAc, damageFormula } = params;
  const isNat20 = d20Roll === 20;
  const isNat1 = d20Roll === 1;
  const total = d20Roll + attackBonus;

  let isHit = false;
  let isCriticalHit = false;
  let isCriticalMiss = false;
  let outcomeText = '';

  if (isNat20) {
    isHit = true;
    isCriticalHit = true;
    outcomeText = `Критическое попадание! (Натуральная 20) ${total} против КД ${targetAc}`;
  } else if (isNat1) {
    isHit = false;
    isCriticalMiss = true;
    outcomeText = `Критический промах! (Натуральная 1) ${total} против КД ${targetAc}`;
  } else {
    isHit = total >= targetAc;
    outcomeText = isHit
      ? `Попадание: ${total} против КД ${targetAc}`
      : `Промах: ${total} против КД ${targetAc}`;
  }

  let criticalDamageFormula: string | undefined;
  if (damageFormula) {
    criticalDamageFormula = isCriticalHit ? doubleDamageDiceInFormula(damageFormula) : damageFormula;
  }

  return {
    roll: d20Roll,
    attackBonus,
    total,
    targetAc,
    isHit,
    isCriticalHit,
    isCriticalMiss,
    outcomeText,
    criticalDamageFormula,
  };
}
