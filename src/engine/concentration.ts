export interface ConcentrationCheck {
  hitIndex: number;
  damage: number;
  dc: number;
}

/**
 * DC for concentration check is max(10, floor(damage / 2)).
 */
export function calculateConcentrationDC(damage: number): number {
  return Math.max(10, Math.floor(damage / 2));
}

/**
 * When taking multiple hits or multiattacks, a separate Constitution save is generated
 * for each separate hit that dealt damage.
 */
export function generateConcentrationChecks(hitDamages: number[]): ConcentrationCheck[] {
  return hitDamages
    .filter((dmg) => dmg > 0)
    .map((dmg, idx) => ({
      hitIndex: idx + 1,
      damage: dmg,
      dc: calculateConcentrationDC(dmg),
    }));
}

/**
 * Checks whether concentration is maintained against a DC.
 */
export function evaluateConcentrationSave(
  conSaveTotal: number,
  dc: number
): { maintained: boolean; margin: number } {
  const maintained = conSaveTotal >= dc;
  return {
    maintained,
    margin: conSaveTotal - dc,
  };
}
