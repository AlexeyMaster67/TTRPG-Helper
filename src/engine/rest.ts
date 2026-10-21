/**
 * D&D 2024 / 5e Rest Mechanics Engine
 */

export interface RestSpellSlot {
  max: number;
  used: number;
}

export interface RestResource {
  id: string;
  name: string;
  current: number;
  max: number;
  resetOn: 'short' | 'long';
}

export interface RestCharacter {
  id?: string;
  name?: string;
  characterClass?: string;
  maxHp: number;
  currentHp?: number;
  tempHp?: number;
  hitDiceCurrent?: number;
  hitDiceMax?: number;
  hitDiceType?: string;
  level?: number;
  exhaustion?: number;
  spellSlots?: Record<number, RestSpellSlot>;
  resources?: RestResource[];
  deathSaves?: { successes: number; failures: number };
  isDying?: boolean;
  isDead?: boolean;
}

export function isWarlockOrPactCaster(characterClass?: string): boolean {
  if (!characterClass) return false;
  const lower = characterClass.toLowerCase();
  return lower.includes('warlock') || lower.includes('колдун');
}

/**
 * Short Rest Automation:
 * - Spends hit dice and recovers HP up to maxHp.
 * - Resets short-rest class resources.
 * - Recovers Pact Magic spell slots if character is a Warlock.
 */
export function applyShortRest<T extends RestCharacter>(
  character: T,
  hitDiceSpent: number = 0,
  hpRecovered: number = 0
): T {
  const maxHp = character.maxHp;
  const currentHp = character.currentHp !== undefined ? character.currentHp : maxHp;
  const newHp = Math.min(maxHp, currentHp + Math.max(0, hpRecovered));

  const maxDice = character.hitDiceMax || character.level || 1;
  const currentDice = character.hitDiceCurrent !== undefined ? character.hitDiceCurrent : maxDice;
  const newDice = Math.max(0, currentDice - Math.max(0, hitDiceSpent));

  // Reset short rest resources
  const newResources = (character.resources || []).map((res) =>
    res.resetOn === 'short' ? { ...res, current: res.max } : { ...res }
  );

  // Reset pact magic spell slots if Warlock
  let newSpellSlots = character.spellSlots;
  if (character.spellSlots && isWarlockOrPactCaster(character.characterClass)) {
    newSpellSlots = {};
    for (const [lvl, slot] of Object.entries(character.spellSlots)) {
      newSpellSlots[Number(lvl)] = { ...slot, used: 0 };
    }
  }

  return {
    ...character,
    currentHp: newHp,
    hitDiceCurrent: newDice,
    resources: newResources,
    spellSlots: newSpellSlots,
  };
}

/**
 * Long Rest Automation (D&D 2024 / 5e):
 * - 100% HP restored (currentHp = maxHp).
 * - Temp HP cleared (tempHp = 0).
 * - 50% max hit dice restored (min 1, capped at maxHp/hitDiceMax).
 * - All spell slots reset (used = 0 for all levels).
 * - All class resources (both short and long) reset to max.
 * - Death saves reset ({ successes: 0, failures: 0 }), isDying = false, isDead = false.
 * - Exhaustion level reduced by 1 (min 0).
 */
export function applyLongRest<T extends RestCharacter>(character: T): T {
  const maxHp = character.maxHp;
  const maxDice = character.hitDiceMax || character.level || 1;
  const currentDice = character.hitDiceCurrent !== undefined ? character.hitDiceCurrent : maxDice;
  const restoredDice = Math.max(1, Math.floor(maxDice / 2));
  const newDice = Math.min(maxDice, currentDice + restoredDice);

  // Reset all spell slots (used: 0)
  let newSpellSlots: Record<number, RestSpellSlot> | undefined;
  if (character.spellSlots) {
    newSpellSlots = {};
    for (const [lvl, slot] of Object.entries(character.spellSlots)) {
      newSpellSlots[Number(lvl)] = { ...slot, used: 0 };
    }
  }

  // Reset all resources
  const newResources = (character.resources || []).map((res) => ({
    ...res,
    current: res.max,
  }));

  // Decrement exhaustion by 1 (min 0)
  const currentExhaustion = character.exhaustion || 0;
  const newExhaustion = Math.max(0, currentExhaustion - 1);

  return {
    ...character,
    currentHp: maxHp,
    tempHp: 0,
    hitDiceCurrent: newDice,
    spellSlots: newSpellSlots,
    resources: newResources,
    exhaustion: newExhaustion,
    deathSaves: { successes: 0, failures: 0 },
    isDying: false,
    isDead: false,
  };
}
