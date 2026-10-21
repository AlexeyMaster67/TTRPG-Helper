/**
 * TTRPG Helper - D&D 5e (2024 Revised) Rule Engine Adapter
 * Implements 2024 Revised rules:
 * - Weapon Masteries (Slow, Topple, Vex, Sap, Nick, Push, Graze, Cleave)
 * - Dazed condition
 * - Numeric Exhaustion (-2 per level to D20 tests, -5 ft speed per level, instant death at level 6)
 */

import { SYSTEM_REGISTRY } from '../registry';
import { BaseDndRuleEngine } from './dndBase';
import { UniversalCreature, RollContext, CheckResult } from '../../types/system';
import {
  WEAPON_MASTERY_2024,
  parseWeaponMastery,
  WeaponMasteryInfo,
} from '../../engine/weaponMastery';
import {
  getExhaustionEffects,
  CONDITIONS_2024_DATA,
  ConditionInfo,
} from '../../engine/conditions';
import { WeaponMasteryProperty, ConditionType } from '../../types/dnd5e';

export class Dnd5e2024Engine extends BaseDndRuleEngine {
  constructor() {
    super(SYSTEM_REGISTRY['dnd5e_2024']);
  }

  /**
   * Reads current exhaustion level (0 - 6) for creature.
   */
  getExhaustionLevel(creature: UniversalCreature): number {
    const cond = creature.conditions.find(
      (c) => c.id === 'exhaustion' || c.name.toLowerCase() === 'exhaustion' || c.name === 'Истощение'
    );
    return cond?.level || 0;
  }

  /**
   * D&D 2024: Numeric exhaustion gives -2 per level to all d20 tests (attacks, checks, saves).
   */
  getExhaustionEffects(level: number) {
    return getExhaustionEffects(level);
  }

  /**
   * In 2024 rules, exhaustion applies -2 per level to all d20 tests.
   */
  override resolveCheck(
    statKey: string,
    creature: UniversalCreature,
    dc?: number,
    context?: RollContext
  ): CheckResult {
    const level = this.getExhaustionLevel(creature);
    const exhaustionPenalty = -(level * 2);

    const effectiveBonus = (context?.situationalBonus || 0) + exhaustionPenalty;
    const effectiveContext: RollContext = {
      rollMode: context?.rollMode || 'normal',
      situationalBonus: effectiveBonus,
      note: level > 0
        ? `${context?.note ? context.note + '; ' : ''}Истощение (2024 Ур. ${level}: ${exhaustionPenalty})`
        : context?.note,
    };

    return super.resolveCheck(statKey, creature, dc, effectiveContext);
  }

  /**
   * D&D 2024 natively supports Weapon Mastery.
   */
  isWeaponMasterySupported(): boolean {
    return true;
  }

  /**
   * Returns all available 2024 weapon masteries.
   */
  getAvailableMasteries(): Record<WeaponMasteryProperty, WeaponMasteryInfo> {
    return WEAPON_MASTERY_2024;
  }

  /**
   * Parses string into valid weapon mastery property.
   */
  parseMastery(name: string | null | undefined): WeaponMasteryProperty | null {
    return parseWeaponMastery(name);
  }

  /**
   * D&D 2024 introduces the Dazed condition.
   */
  isDazedConditionSupported(): boolean {
    return true;
  }

  /**
   * Returns metadata for 2024 conditions including Dazed.
   */
  getConditionData(type: ConditionType): ConditionInfo | undefined {
    return CONDITIONS_2024_DATA[type];
  }
}

export const dnd5e2024Engine = new Dnd5e2024Engine();
