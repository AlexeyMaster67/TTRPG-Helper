import { rollDie } from './rolls';

/**
 * Calculates total initiative with standard D&D 2024 / 5e decimal tie-breaker:
 * formula: roll + dexBonus + (passiveInit / 100)
 * Example: Roll 12, Dex +2, PassiveInit 12 -> 12 + 2 + 0.12 = 14.12
 */
export function calculateInitiative(roll: number, dexBonus: number, passiveInit: number): number {
  return Number((roll + dexBonus + passiveInit / 100).toFixed(2));
}

/**
 * Rolls initiative (d20) and calculates tie-broken total.
 */
export function rollInitiative(dexBonus: number, passiveInit: number = 10 + dexBonus): {
  roll: number;
  dexBonus: number;
  passiveInit: number;
  total: number;
} {
  const roll = rollDie(20);
  const total = calculateInitiative(roll, dexBonus, passiveInit);
  return { roll, dexBonus, passiveInit, total };
}

export interface InitiativeCandidate {
  id?: string;
  name?: string;
  initiative?: number;
  roll?: number;
  initBonus?: number;
  dexBonus?: number;
  passiveInit?: number;
}

/**
 * Sorts candidates in descending order of initiative.
 * Primary: calculated or assigned initiative score (roll + dexBonus + passiveInit/100)
 * Secondary tie-breaker: dex bonus / initBonus
 * Tertiary tie-breaker: passive initiative
 */
export function sortCandidatesByInitiative<T extends InitiativeCandidate>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => {
    const aDex = a.dexBonus ?? a.initBonus ?? 0;
    const bDex = b.dexBonus ?? b.initBonus ?? 0;
    const aPassive = a.passiveInit ?? (10 + aDex);
    const bPassive = b.passiveInit ?? (10 + bDex);

    const aScore = a.initiative !== undefined
      ? a.initiative
      : calculateInitiative(a.roll ?? 10, aDex, aPassive);

    const bScore = b.initiative !== undefined
      ? b.initiative
      : calculateInitiative(b.roll ?? 10, bDex, bPassive);

    if (bScore !== aScore) {
      return bScore - aScore;
    }
    if (bDex !== aDex) {
      return bDex - aDex;
    }
    return bPassive - aPassive;
  });
}
