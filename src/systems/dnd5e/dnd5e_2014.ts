/**
 * TTRPG Helper - D&D 5e (2014 Classic) Rule Engine Adapter
 * Classic exhaustion (6 distinct tiered levels), classic actions, no weapon mastery.
 */

import { SYSTEM_REGISTRY } from '../registry';
import { BaseDndRuleEngine } from './dndBase';
import { UniversalCreature, RollContext, CheckResult } from '../../types/system';

export interface ClassicExhaustionLevelEffect {
  level: number;
  descriptionRu: string;
  descriptionEn: string;
  disadvantageAbilityChecks: boolean;
  speedHalved: boolean;
  disadvantageAttacksAndSaves: boolean;
  hpMaxHalved: boolean;
  speedZero: boolean;
  isDead: boolean;
}

export const CLASSIC_EXHAUSTION_2014: Record<number, ClassicExhaustionLevelEffect> = {
  1: {
    level: 1,
    descriptionRu: 'Помеха на проверки характеристик',
    descriptionEn: 'Disadvantage on ability checks',
    disadvantageAbilityChecks: true,
    speedHalved: false,
    disadvantageAttacksAndSaves: false,
    hpMaxHalved: false,
    speedZero: false,
    isDead: false,
  },
  2: {
    level: 2,
    descriptionRu: 'Скорость уменьшается вдвое',
    descriptionEn: 'Speed halved',
    disadvantageAbilityChecks: true,
    speedHalved: true,
    disadvantageAttacksAndSaves: false,
    hpMaxHalved: false,
    speedZero: false,
    isDead: false,
  },
  3: {
    level: 3,
    descriptionRu: 'Помеха на броски атак и спасброски',
    descriptionEn: 'Disadvantage on attack rolls and saving throws',
    disadvantageAbilityChecks: true,
    speedHalved: true,
    disadvantageAttacksAndSaves: true,
    hpMaxHalved: false,
    speedZero: false,
    isDead: false,
  },
  4: {
    level: 4,
    descriptionRu: 'Максимум хитов уменьшается вдвое',
    descriptionEn: 'Hit point maximum halved',
    disadvantageAbilityChecks: true,
    speedHalved: true,
    disadvantageAttacksAndSaves: true,
    hpMaxHalved: true,
    speedZero: false,
    isDead: false,
  },
  5: {
    level: 5,
    descriptionRu: 'Скорость снижается до 0',
    descriptionEn: 'Speed reduced to 0',
    disadvantageAbilityChecks: true,
    speedHalved: true,
    disadvantageAttacksAndSaves: true,
    hpMaxHalved: true,
    speedZero: true,
    isDead: false,
  },
  6: {
    level: 6,
    descriptionRu: 'Смерть',
    descriptionEn: 'Death',
    disadvantageAbilityChecks: true,
    speedHalved: true,
    disadvantageAttacksAndSaves: true,
    hpMaxHalved: true,
    speedZero: true,
    isDead: true,
  },
};

export class Dnd5e2014Engine extends BaseDndRuleEngine {
  constructor() {
    super(SYSTEM_REGISTRY['dnd5e_2014']);
  }

  /**
   * Reads exhaustion condition level (0 - 6) for a creature.
   */
  getExhaustionLevel(creature: UniversalCreature): number {
    const cond = creature.conditions.find(
      (c) => c.id === 'exhaustion' || c.name.toLowerCase() === 'exhaustion' || c.name === 'Истощение'
    );
    return cond?.level || 0;
  }

  /**
   * Retrieves 2014 classic exhaustion effects.
   */
  getClassicExhaustionEffects(level: number): ClassicExhaustionLevelEffect | null {
    const clamped = Math.max(0, Math.min(6, level));
    return clamped > 0 ? CLASSIC_EXHAUSTION_2014[clamped] : null;
  }

  /**
   * 2014 Rules: Level 1+ exhaustion gives Disadvantage on ability checks.
   * Level 3+ gives Disadvantage on saving throws as well.
   */
  override resolveCheck(
    statKey: string,
    creature: UniversalCreature,
    dc?: number,
    context?: RollContext
  ): CheckResult {
    const level = this.getExhaustionLevel(creature);
    const effectiveContext: RollContext = context
      ? { ...context }
      : { rollMode: 'normal' };

    // At Level 1+, all ability checks suffer disadvantage
    if (level >= 1 && effectiveContext.rollMode === 'normal') {
      effectiveContext.rollMode = 'disadvantage';
      effectiveContext.note = (effectiveContext.note ? effectiveContext.note + '; ' : '') + 'Помеха от истощения (2014 Ур. ' + level + ')';
    }

    return super.resolveCheck(statKey, creature, dc, effectiveContext);
  }

  /**
   * 2014 rules do not have Weapon Mastery properties.
   */
  isWeaponMasterySupported(): boolean {
    return false;
  }

  /**
   * 2014 rules do not have the Dazed condition.
   */
  isDazedConditionSupported(): boolean {
    return false;
  }
}

export const dnd5e2014Engine = new Dnd5e2014Engine();
