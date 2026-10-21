import { DamageType, DamageComponent } from '../types/dnd5e';

export interface TargetDefenses {
  damageImmunities?: DamageType[];
  damageResistances?: DamageType[];
  damageVulnerabilities?: DamageType[];
}

export interface DamageComponentResult {
  type: DamageType;
  rawAmount: number;
  effectiveAmount: number;
  multiplierReason: 'immune' | 'resistant' | 'vulnerable' | 'normal';
}

export interface DamagePipelineResult {
  totalRawDamage: number;
  totalEffectiveDamage: number;
  components: DamageComponentResult[];
  tempHpAbsorbed: number;
  hpDamage: number;
  newHp: number;
  newTempHp: number;
  isDying: boolean;
  isDead: boolean;
  instantDeath: boolean;
  deathSaveFailuresAdded: number;
  newDeathSaveFailures: number;
  concentrationCheckDCs: number[];
}

/**
 * Evaluates damage pipeline strictly according to D&D 2024 rules:
 * 1. Immunities -> 0
 * 2. Resistances -> Math.floor(dmg / 2)
 * 3. Vulnerabilities -> dmg * 2
 * 4. Temp HP absorbed first, non-stacking
 * 5. 0 HP & Death saves: regular hit = +1 failure, crit = +2 failures
 * 6. Massive damage: leftover >= maxHp -> instant death
 */
export function processDamagePipeline(
  damages: DamageComponent[],
  target: {
    hp: number;
    maxHp: number;
    tempHp: number;
    isDying?: boolean;
    isDead?: boolean;
    deathSaveFailures?: number;
    defenses?: TargetDefenses;
  },
  options: { isCritical?: boolean; skipDefenses?: boolean } = {}
): DamagePipelineResult {
  const immunities = new Set(target.defenses?.damageImmunities || []);
  const resistances = new Set(target.defenses?.damageResistances || []);
  const vulnerabilities = new Set(target.defenses?.damageVulnerabilities || []);

  const components: DamageComponentResult[] = [];
  let totalRawDamage = 0;
  let totalEffectiveDamage = 0;
  const concentrationCheckDCs: number[] = [];

  for (const comp of damages) {
    const raw = Math.max(0, comp.amount);
    totalRawDamage += raw;

    let effective = raw;
    let reason: DamageComponentResult['multiplierReason'] = 'normal';

    if (!options.skipDefenses) {
      if (immunities.has(comp.type)) {
        effective = 0;
        reason = 'immune';
      } else if (resistances.has(comp.type)) {
        effective = Math.floor(raw / 2);
        reason = 'resistant';
      } else if (vulnerabilities.has(comp.type)) {
        effective = raw * 2;
        reason = 'vulnerable';
      }
    }

    components.push({
      type: comp.type,
      rawAmount: raw,
      effectiveAmount: effective,
      multiplierReason: reason,
    });

    totalEffectiveDamage += effective;

    // D&D 2024 Concentration: Each separate source/hit dealing damage requires DC max(10, floor(dmg / 2))
    if (effective > 0) {
      concentrationCheckDCs.push(Math.max(10, Math.floor(effective / 2)));
    }
  }

  // Deduct from Temp HP first
  let remainingDamage = totalEffectiveDamage;
  const tempHpAbsorbed = Math.min(target.tempHp, remainingDamage);
  const newTempHp = target.tempHp - tempHpAbsorbed;
  remainingDamage -= tempHpAbsorbed;

  let newHp = target.hp;
  let isDying = target.isDying ?? (target.hp <= 0);
  let isDead = target.isDead ?? false;
  let instantDeath = false;
  let deathSaveFailuresAdded = 0;
  let currentFailures = target.deathSaveFailures || 0;

  if (target.isDead) {
    return {
      totalRawDamage,
      totalEffectiveDamage,
      components,
      tempHpAbsorbed,
      hpDamage: remainingDamage,
      newHp: 0,
      newTempHp,
      isDying: false,
      isDead: true,
      instantDeath: false,
      deathSaveFailuresAdded: 0,
      newDeathSaveFailures: 3,
      concentrationCheckDCs,
    };
  }

  // Case 1: Target is already at 0 HP
  if (target.hp <= 0) {
    if (remainingDamage > 0) {
      // Massive damage at 0 HP: if damage equals or exceeds maxHp -> instant death
      if (remainingDamage >= target.maxHp) {
        instantDeath = true;
        isDead = true;
        isDying = false;
        currentFailures = 3;
      } else {
        // Regular damage = +1 failure; Critical = +2 failures
        deathSaveFailuresAdded = options.isCritical ? 2 : 1;
        currentFailures = Math.min(3, currentFailures + deathSaveFailuresAdded);
        if (currentFailures >= 3) {
          isDead = true;
          isDying = false;
        }
      }
    }
  } else {
    // Case 2: Target is above 0 HP
    if (remainingDamage >= target.hp) {
      const leftover = remainingDamage - target.hp;
      newHp = 0;

      // Massive damage from above 0 HP: remainder >= maxHp -> instant death
      if (leftover >= target.maxHp) {
        instantDeath = true;
        isDead = true;
        isDying = false;
        currentFailures = 3;
      } else {
        isDying = true;
        isDead = false;
      }
    } else {
      newHp = target.hp - remainingDamage;
    }
  }

  return {
    totalRawDamage,
    totalEffectiveDamage,
    components,
    tempHpAbsorbed,
    hpDamage: remainingDamage,
    newHp,
    newTempHp,
    isDying,
    isDead,
    instantDeath,
    deathSaveFailuresAdded,
    newDeathSaveFailures: currentFailures,
    concentrationCheckDCs,
  };
}

/**
 * Apply Temp HP: does not stack, takes the higher value
 */
export function addTempHp(currentTempHp: number, incomingTempHp: number): number {
  return Math.max(currentTempHp, Math.max(0, incomingTempHp));
}

/**
 * Apply Healing: caps at maxHp, revives character if dying, does not heal Temp HP
 */
export function processHealing(
  currentHp: number,
  maxHp: number,
  amount: number
): { newHp: number; healedAmount: number; revived: boolean } {
  const validAmount = Math.max(0, amount);
  const revived = currentHp <= 0 && validAmount > 0;
  const newHp = Math.min(maxHp, currentHp + validAmount);
  const healedAmount = newHp - currentHp;

  return {
    newHp,
    healedAmount,
    revived,
  };
}
