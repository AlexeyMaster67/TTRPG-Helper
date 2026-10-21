/**
 * TTRPG Helper - Modular D&D Core Rule Logic
 * Common d20 resolution, initiative, attack vs AC, damage pipeline, resting,
 * and base SystemRuleEngine implementation for D&D 5e family.
 */

import {
  SystemMetadata,
  UniversalCreature,
  SystemRuleEngine,
  InitiativeResult,
  CheckResult,
  HitCalculationResult,
  DamageResolutionResult,
  RollContext,
} from '../../types/system';
import {
  calculateInitiative,
  rollInitiative,
  sortCandidatesByInitiative,
  InitiativeCandidate,
} from '../../engine/initiative';
import {
  resolveAttackRoll,
  doubleDamageDiceInFormula,
  AttackRollParams,
  AttackRollResult,
} from '../../engine/attack';
import {
  processDamagePipeline,
  addTempHp,
  processHealing,
  DamagePipelineResult,
  TargetDefenses,
} from '../../engine/damage';
import {
  applyShortRest,
  applyLongRest,
  RestCharacter,
  RestResource,
  RestSpellSlot,
} from '../../engine/rest';
import { rollDie } from '../../engine/rolls';
import { DamageType, DamageComponent } from '../../types/dnd5e';

// Re-export core math & mechanics for direct consumption
export {
  calculateInitiative,
  rollInitiative,
  sortCandidatesByInitiative,
  resolveAttackRoll,
  doubleDamageDiceInFormula,
  processDamagePipeline,
  addTempHp,
  processHealing,
  applyShortRest,
  applyLongRest,
};
export type {
  InitiativeCandidate,
  AttackRollParams,
  AttackRollResult,
  DamagePipelineResult,
  TargetDefenses,
  RestCharacter,
  RestResource,
  RestSpellSlot,
};

/**
 * Standard d20 check resolution with advantage/disadvantage, criticals, and DC comparison.
 */
export function resolveD20Check(
  bonus: number,
  dc?: number,
  rollOverride?: number,
  context?: RollContext
): CheckResult {
  const mode = context?.rollMode || 'normal';
  let rolledValue: number;

  if (typeof rollOverride === 'number') {
    rolledValue = rollOverride;
  } else if (mode === 'advantage') {
    const r1 = rollDie(20);
    const r2 = rollDie(20);
    rolledValue = Math.max(r1, r2);
  } else if (mode === 'disadvantage') {
    const r1 = rollDie(20);
    const r2 = rollDie(20);
    rolledValue = Math.min(r1, r2);
  } else {
    rolledValue = rollDie(20);
  }

  const situational = context?.situationalBonus || 0;
  const effectiveBonus = bonus + situational;
  const total = rolledValue + effectiveBonus;

  const isCriticalSuccess = rolledValue === 20;
  const isCriticalFailure = rolledValue === 1;

  let degreeOfSuccess: CheckResult['degreeOfSuccess'];
  if (dc !== undefined) {
    if (isCriticalSuccess) {
      degreeOfSuccess = 'critical_success';
    } else if (isCriticalFailure) {
      degreeOfSuccess = 'critical_failure';
    } else if (total >= dc) {
      degreeOfSuccess = 'success';
    } else {
      degreeOfSuccess = 'failure';
    }
  } else {
    if (isCriticalSuccess) degreeOfSuccess = 'critical_success';
    else if (isCriticalFailure) degreeOfSuccess = 'critical_failure';
  }

  const margin = dc !== undefined ? total - dc : undefined;

  return {
    total,
    rolledValue,
    bonus: effectiveBonus,
    isCriticalSuccess,
    isCriticalFailure,
    degreeOfSuccess,
    margin,
  };
}

/**
 * Calculates hit against Armor Class (AC).
 * Natural 20 is always a critical hit.
 * Natural 1 is always a critical fumble.
 */
export function calculateHitAgainstAc(
  attackRoll: number,
  targetAc: number,
  isNat20 = false,
  isNat1 = false
): HitCalculationResult {
  if (isNat20) {
    return {
      isHit: true,
      isCritical: true,
      isFumble: false,
      degree: 'critical_success',
      details: `Критическое попадание! (Натуральная 20) против КД ${targetAc}`,
    };
  }

  if (isNat1) {
    return {
      isHit: false,
      isCritical: false,
      isFumble: true,
      degree: 'critical_failure',
      details: `Критический промах! (Натуральная 1) против КД ${targetAc}`,
    };
  }

  const isHit = attackRoll >= targetAc;
  return {
    isHit,
    isCritical: false,
    isFumble: false,
    degree: isHit ? 'success' : 'failure',
    details: isHit
      ? `Попадание: ${attackRoll} против КД ${targetAc}`
      : `Промах: ${attackRoll} против КД ${targetAc}`,
  };
}

/**
 * Base D&D 5e Rule Engine implementing universal SystemRuleEngine interface.
 */
export abstract class BaseDndRuleEngine implements SystemRuleEngine {
  constructor(public metadata: SystemMetadata) {}

  /**
   * Initiative formula: d20 + dexBonus + (passiveInit / 100)
   */
  calculateInitiative(creature: UniversalCreature, rollOverride?: number): InitiativeResult {
    const stats = creature.stats || {};
    const dexScore = stats.dex ?? stats.dexterity ?? 10;
    const computedDexMod = Math.floor((dexScore - 10) / 2);
    const bonus = stats.initBonus ?? stats.dexBonus ?? computedDexMod;
    const passiveInit = stats.passiveInit ?? (10 + bonus);

    const rolledValue = typeof rollOverride === 'number' ? rollOverride : rollDie(20);
    const total = calculateInitiative(rolledValue, bonus, passiveInit);
    const tieBreaker = Number((passiveInit / 100).toFixed(2));

    return {
      total,
      rolledValue,
      bonus,
      tieBreaker,
    };
  }

  /**
   * Resolves ability check or saving throw.
   */
  resolveCheck(
    statKey: string,
    creature: UniversalCreature,
    dc?: number,
    context?: RollContext
  ): CheckResult {
    const stats = creature.stats || {};
    const keyLower = statKey.toLowerCase();

    let bonus = 0;
    const abilityKeys = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);

    if (typeof stats[`${keyLower}_mod`] === 'number') {
      bonus = stats[`${keyLower}_mod`];
    } else if (typeof stats[`${keyLower}_save`] === 'number') {
      bonus = stats[`${keyLower}_save`];
    } else if (abilityKeys.has(keyLower)) {
      const val = stats[statKey] ?? stats[keyLower] ?? 10;
      bonus = val > 5 && val <= 30 ? Math.floor((val - 10) / 2) : val;
    } else if (typeof stats[statKey] === 'number') {
      bonus = stats[statKey];
    } else if (typeof stats[keyLower] === 'number') {
      bonus = stats[keyLower];
    }

    return resolveD20Check(bonus, dc, undefined, context);
  }

  /**
   * Calculates hit vs target AC.
   */
  calculateHit(
    attackRoll: number,
    target: UniversalCreature,
    isCritRoll = false
  ): HitCalculationResult {
    const targetAc = target.stats.ac ?? 10;
    return calculateHitAgainstAc(attackRoll, targetAc, isCritRoll, false);
  }

  /**
   * Applies damage through D&D damage pipeline:
   * Resistances (floor/2), immunities (0), vulnerabilities (*2), temp HP absorption.
   */
  applyDamage(
    target: UniversalCreature,
    rawDamage: number,
    damageType: string,
    zone?: string
  ): { updatedCreature: UniversalCreature; result: DamageResolutionResult } {
    const currentHp = target.resources.hp?.current ?? target.stats.hp ?? 0;
    const maxHp = target.resources.hp?.max ?? target.stats.maxHp ?? currentHp;
    const currentTempHp = target.resources.hp?.temp ?? target.stats.tempHp ?? 0;

    const damageComp: DamageComponent = {
      type: damageType.toLowerCase() as DamageType,
      amount: rawDamage,
    };

    const targetDefenses: TargetDefenses = {
      damageImmunities: (target.defenses.damageImmunities || []).map((s) => s.toLowerCase() as DamageType),
      damageResistances: (target.defenses.damageResistances || []).map((s) => s.toLowerCase() as DamageType),
      damageVulnerabilities: (target.defenses.damageVulnerabilities || []).map((s) => s.toLowerCase() as DamageType),
    };

    const pipeResult = processDamagePipeline([damageComp], {
      hp: currentHp,
      maxHp,
      tempHp: currentTempHp,
      isDying: currentHp <= 0 && target.isPlayer,
      isDead: currentHp <= 0 && !target.isPlayer,
      defenses: targetDefenses,
    });

    const updatedCreature: UniversalCreature = {
      ...target,
      stats: {
        ...target.stats,
        hp: pipeResult.newHp,
        tempHp: pipeResult.newTempHp,
      },
      resources: {
        ...target.resources,
        hp: {
          current: pipeResult.newHp,
          max: maxHp,
          temp: pipeResult.newTempHp,
          resetOn: 'long_rest',
        },
      },
      customFields: {
        ...target.customFields,
        isDying: pipeResult.isDying,
        isDead: pipeResult.isDead,
      },
    };

    const statusEffectsApplied: string[] = [];
    if (pipeResult.isDying) statusEffectsApplied.push('Dying');
    if (pipeResult.isDead) statusEffectsApplied.push('Dead');

    const result: DamageResolutionResult = {
      hpDamage: pipeResult.hpDamage,
      tempHpAbsorbed: pipeResult.tempHpAbsorbed,
      armorDamage: 0,
      appliedToZone: zone,
      effectiveDamage: pipeResult.totalEffectiveDamage,
      isCriticalWound: pipeResult.instantDeath,
      statusEffectsApplied,
    };

    return { updatedCreature, result };
  }

  /**
   * Applies short or long rest across a group of creatures.
   */
  applyRest(
    creatures: UniversalCreature[],
    restType: 'short' | 'long' | 'encounter'
  ): UniversalCreature[] {
    return creatures.map((creature) => {
      const maxHp = creature.resources.hp?.max ?? creature.stats.maxHp ?? 10;

      if (restType === 'long') {
        const resetResources: Record<string, any> = {};
        for (const [key, pool] of Object.entries(creature.resources || {})) {
          resetResources[key] = {
            ...pool,
            current: pool.max,
            temp: 0,
          };
        }

        // Exhaustion reduced by 1
        const updatedConditions = (creature.conditions || [])
          .map((cond) => {
            if (cond.id === 'exhaustion' || cond.name.toLowerCase() === 'exhaustion') {
              const currentLevel = cond.level || 1;
              return currentLevel > 1 ? { ...cond, level: currentLevel - 1 } : null;
            }
            return cond;
          })
          .filter(Boolean) as UniversalCreature['conditions'];

        return {
          ...creature,
          stats: {
            ...creature.stats,
            hp: maxHp,
            tempHp: 0,
          },
          resources: {
            ...resetResources,
            hp: {
              current: maxHp,
              max: maxHp,
              temp: 0,
              resetOn: 'long_rest',
            },
          },
          tracks: {
            ...creature.tracks,
            ...(creature.tracks.deathSaves
              ? { deathSaves: { ...creature.tracks.deathSaves, current: 0 } }
              : {}),
          },
          conditions: updatedConditions,
        };
      }

      if (restType === 'short') {
        const resetResources: Record<string, any> = {};
        for (const [key, pool] of Object.entries(creature.resources || {})) {
          if (pool.resetOn === 'short_rest' || pool.resetOn === 'short') {
            resetResources[key] = { ...pool, current: pool.max };
          } else {
            resetResources[key] = pool;
          }
        }

        return {
          ...creature,
          resources: resetResources,
        };
      }

      return creature;
    });
  }
}
