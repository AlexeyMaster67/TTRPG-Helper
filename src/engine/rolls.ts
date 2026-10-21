import { RollMode, RollResult } from '../types/dnd5e';

/**
 * Generates a random integer in range [1, sides].
 * For d100, produces the standard tabletop percentile tens die (10, 20, 30, 40, 50, 60, 70, 80, 90, 100).
 */
export function rollDie(sides: number): number {
  if (sides === 100) {
    return (Math.floor(Math.random() * 10) + 1) * 10;
  }
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Performs a D20 roll with support for:
 * - Normal: 1d20 + modifier
 * - Advantage: 2d20kh1 + modifier
 * - Disadvantage: 2d20kl1 + modifier
 */
export function rollD20(mode: RollMode = 'normal', modifier: number = 0): RollResult {
  const d20_1 = rollDie(20);
  let d20_2: number | undefined;
  let keptRoll = d20_1;

  if (mode === 'advantage') {
    d20_2 = rollDie(20);
    keptRoll = Math.max(d20_1, d20_2);
  } else if (mode === 'disadvantage') {
    d20_2 = rollDie(20);
    keptRoll = Math.min(d20_1, d20_2);
  }

  const isNatural20 = keptRoll === 20;
  const isNatural1 = keptRoll === 1;
  const total = keptRoll + modifier;

  return {
    d20_1,
    d20_2,
    mode,
    keptRoll,
    modifier,
    total,
    isNatural20,
    isNatural1,
  };
}

/**
 * Parse and evaluate a dice formula like "2d6 + 3" or "1d8 - 1"
 */
export function rollDiceFormula(formula: string): {
  formula: string;
  rolls: { count: number; sides: number; values: number[] }[];
  modifier: number;
  total: number;
} {
  const cleaned = formula.replace(/\s+/g, '');
  const pattern = /([+-]?\d+d\d+|[+-]?\d+)/g;
  const matches = cleaned.match(pattern);

  if (!matches) {
    const fallback = Number(formula) || 0;
    return { formula, rolls: [], modifier: fallback, total: fallback };
  }

  const rolls: { count: number; sides: number; values: number[] }[] = [];
  let modifier = 0;
  let total = 0;

  for (const match of matches) {
    if (match.includes('d')) {
      const isNegative = match.startsWith('-');
      const part = match.replace(/^[+-]/, '');
      const [countStr, sidesStr] = part.split('d');
      const count = countStr ? parseInt(countStr, 10) : 1;
      const sides = parseInt(sidesStr, 10);
      const values: number[] = [];

      for (let i = 0; i < count; i++) {
        const val = rollDie(sides);
        values.push(val);
        total += isNegative ? -val : val;
      }

      rolls.push({ count, sides, values });
    } else {
      const num = parseInt(match, 10);
      modifier += num;
      total += num;
    }
  }

  return { formula, rolls, modifier, total };
}
