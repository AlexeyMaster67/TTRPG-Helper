/**
 * TTRPG Helper - Pathfinder 2e Rule Engine Implementation
 *
 * Implements SystemRuleEngine interface for Pathfinder 2e (Paizo / ORC License):
 * - Initiative: Perception + 1d20 (or Stealth when sneaking)
 * - 4 Degrees of Success: Critical Success (>= DC+10 or Nat 20 up-rank),
 *   Success (>= DC), Failure (< DC), Critical Failure (<= DC-10 or Nat 1 down-rank)
 * - 3-Action Economy (1, 2, 3 actions, free actions, and reactions)
 * - Multi-Attack Penalty (MAP): -5 / -10 (-4 / -8 for agile weapons)
 * - Conditions: Frightened (1-4), Clumsy (1-4), Enfeebled (1-4), Drained (1-4),
 *   Stunned (1-4), Dying (1-4), Wounded (1-3), Doomed (1-3), Off-guard
 * - Resistances, Weaknesses, and Immunities pipeline
 */

import {
  SystemRuleEngine,
  SystemMetadata,
  UniversalCreature,
  InitiativeResult,
  CheckResult,
  HitCalculationResult,
  DamageResolutionResult,
  RollContext,
} from '../../types/system';
import { SYSTEM_REGISTRY } from '../registry';
import { rollDie } from '../../engine/rolls';
import {
  Pf2eDegreeOfSuccess,
  Pf2eActionCost,
  Pf2eRollContext,
  Pf2eConditionType,
} from './types';

export class Pathfinder2eEngine implements SystemRuleEngine {
  public metadata: SystemMetadata;

  constructor(metadataOverride?: SystemMetadata) {
    this.metadata = metadataOverride || SYSTEM_REGISTRY['pathfinder2e'] || {
      id: 'pathfinder2e',
      name: 'Pathfinder 2e (PF2e)',
      family: 'pathfinder',
      edition: 'Remastered',
      version: '1.0.0',
      status: 'beta',
      themeId: 'pathfinder2e',
      description: 'Тактическая система с 3 действиями за ход, четырьмя степенями успеха (±10) и инициативой по Восприятию.',
      supportedFeatures: {
        spellSlots: true,
        weaponMastery: false,
        armorAblation: false,
        degreesOfSuccess: true,
        deathSaveTrack: false,
        humanityTrack: false,
        actionEconomy: 'three_action',
      },
    };
  }

  /**
   * Initiative in PF2e is rolled using Perception (or Stealth when sneaking).
   * Formula: Perception (or Stealth) + 1d20 + (Bonus / 100)
   */
  calculateInitiative(creature: UniversalCreature, rollOverride?: number): InitiativeResult {
    const stats = creature.stats || {};
    const bonus = stats.perception ?? stats.stealth ?? stats.initiative ?? stats.wisMod ?? 0;
    const rolledValue = typeof rollOverride === 'number' ? rollOverride : rollDie(20);
    const tieBreaker = Number((bonus / 100).toFixed(2));
    const total = Number((rolledValue + bonus + tieBreaker).toFixed(2));

    return {
      total,
      rolledValue,
      bonus,
      tieBreaker,
    };
  }

  /**
   * Evaluates standard PF2e 4 Degrees of Success.
   * - Critical Success: total >= DC + 10 (or promoted from Success on Nat 20)
   * - Success: total >= DC
   * - Failure: total < DC
   * - Critical Failure: total <= DC - 10 (or demoted from Failure on Nat 1)
   *
   * Nat 20 promotes degree by 1 step.
   * Nat 1 demotes degree by 1 step.
   */
  evaluateDegreeOfSuccess(
    total: number,
    dc: number,
    naturalRoll?: number
  ): Pf2eDegreeOfSuccess {
    let initialDegree: Pf2eDegreeOfSuccess;

    if (total >= dc + 10) {
      initialDegree = 'critical_success';
    } else if (total >= dc) {
      initialDegree = 'success';
    } else if (total <= dc - 10) {
      initialDegree = 'critical_failure';
    } else {
      initialDegree = 'failure';
    }

    if (naturalRoll === 20) {
      switch (initialDegree) {
        case 'critical_failure':
          return 'failure';
        case 'failure':
          return 'success';
        case 'success':
        case 'critical_success':
          return 'critical_success';
      }
    } else if (naturalRoll === 1) {
      switch (initialDegree) {
        case 'critical_success':
          return 'success';
        case 'success':
          return 'failure';
        case 'failure':
        case 'critical_failure':
          return 'critical_failure';
      }
    }

    return initialDegree;
  }

  /**
   * Computes Multi-Attack Penalty (MAP) based on attack count in current turn.
   * Standard weapons: 0 / -5 / -10
   * Agile weapons: 0 / -4 / -8
   */
  getMultipleAttackPenalty(attackNumber: number = 1, isAgile: boolean = false): number {
    if (attackNumber <= 1) return 0;
    if (attackNumber === 2) return isAgile ? -4 : -5;
    return isAgile ? -8 : -10;
  }

  /**
   * Retrieves numerical value of a condition (e.g. Frightened 2 -> 2).
   */
  getConditionLevel(creature: UniversalCreature, conditionId: Pf2eConditionType | string): number {
    const idLower = conditionId.toLowerCase();
    const cond = (creature.conditions || []).find((c) => c.id.toLowerCase() === idLower);
    return cond?.level ?? 0;
  }

  /**
   * Sets or updates a condition with a specific value. If level <= 0, removes it.
   */
  setConditionLevel(
    creature: UniversalCreature,
    conditionId: Pf2eConditionType | string,
    level: number
  ): UniversalCreature {
    const idLower = conditionId.toLowerCase();
    const filtered = (creature.conditions || []).filter((c) => c.id.toLowerCase() !== idLower);

    if (level > 0) {
      filtered.push({
        id: idLower,
        name: conditionId.charAt(0).toUpperCase() + conditionId.slice(1),
        level,
        notes: `PF2e Уровень состояния: ${level}`,
      });
    }

    return {
      ...creature,
      conditions: filtered,
    };
  }

  /**
   * Reduces condition value by amount.
   */
  reduceCondition(
    creature: UniversalCreature,
    conditionId: Pf2eConditionType | string,
    amount: number = 1
  ): UniversalCreature {
    const current = this.getConditionLevel(creature, conditionId);
    return this.setConditionLevel(creature, conditionId, Math.max(0, current - amount));
  }

  /**
   * Ticks end of turn condition expirations:
   * - Frightened decreases by 1
   * - Stunned value decreases per action lost
   */
  tickEndOfTurnConditions(creature: UniversalCreature): UniversalCreature {
    const frightened = this.getConditionLevel(creature, 'frightened');
    if (frightened > 0) {
      return this.reduceCondition(creature, 'frightened', 1);
    }
    return creature;
  }

  /**
   * Computes cumulative condition penalties for a check.
   * - Frightened X: -X to all checks and DCs
   * - Clumsy X: -X to DEX checks, Reflex saves, AC
   * - Enfeebled X: -X to STR checks and melee damage
   * - Drained X: -X to CON checks and Fortitude saves
   */
  getConditionPenalty(
    creature: UniversalCreature,
    statKey?: string,
    checkType?: string
  ): number {
    let penalty = 0;

    // Frightened applies status penalty to ALL checks and DCs
    const frightened = this.getConditionLevel(creature, 'frightened');
    penalty -= frightened;

    const normalizedStat = (statKey || '').toLowerCase();
    const normalizedType = (checkType || '').toLowerCase();

    // Clumsy applies to DEX-based checks
    if (normalizedStat === 'dex' || normalizedStat === 'dexterity' || normalizedType === 'reflex' || normalizedType === 'acrobatics' || normalizedType === 'stealth') {
      const clumsy = this.getConditionLevel(creature, 'clumsy');
      penalty -= clumsy;
    }

    // Enfeebled applies to STR-based checks
    if (normalizedStat === 'str' || normalizedStat === 'strength' || normalizedType === 'athletics') {
      const enfeebled = this.getConditionLevel(creature, 'enfeebled');
      penalty -= enfeebled;
    }

    // Drained applies to CON-based checks
    if (normalizedStat === 'con' || normalizedStat === 'constitution' || normalizedType === 'fortitude') {
      const drained = this.getConditionLevel(creature, 'drained');
      penalty -= drained;
    }

    return penalty;
  }

  /**
   * Resolves ability check, skill check, attack roll, or saving throw in PF2e.
   */
  resolveCheck(
    statKey: string,
    creature: UniversalCreature,
    dc?: number,
    context?: RollContext | Pf2eRollContext
  ): CheckResult {
    const pfContext = context as Pf2eRollContext | undefined;
    const stats = creature.stats || {};
    const keyLower = statKey.toLowerCase().trim();

    // 1. Base Stat / Skill Modifier
    let baseBonus = 0;
    if (typeof stats[keyLower] === 'number') {
      baseBonus = stats[keyLower];
    } else if (typeof stats[statKey] === 'number') {
      baseBonus = stats[statKey];
    }

    // 2. Multi-Attack Penalty (MAP)
    const attackNumber = pfContext?.attackNumber || 1;
    const isAgile = Boolean(pfContext?.isAgile);
    const mapPenalty = this.getMultipleAttackPenalty(attackNumber, isAgile);

    // 3. Condition penalties
    const conditionPenalty = this.getConditionPenalty(creature, pfContext?.statKey || statKey, pfContext?.checkType);
    const situational = pfContext?.situationalBonus || 0;

    const totalBonus = baseBonus + mapPenalty + conditionPenalty + situational;

    // 4. Roll 1d20
    const rolledValue = typeof pfContext?.rollOverride === 'number'
      ? pfContext.rollOverride
      : rollDie(20);

    const total = rolledValue + totalBonus;

    // 5. Evaluate Degrees of Success (DC ± 10 & Nat 20 / Nat 1)
    let degreeOfSuccess: CheckResult['degreeOfSuccess'];
    let margin: number | undefined;

    if (dc !== undefined) {
      margin = total - dc;
      degreeOfSuccess = this.evaluateDegreeOfSuccess(total, dc, rolledValue);
    } else {
      if (rolledValue === 20) degreeOfSuccess = 'critical_success';
      else if (rolledValue === 1) degreeOfSuccess = 'critical_failure';
    }

    const isCriticalSuccess = degreeOfSuccess === 'critical_success';
    const isCriticalFailure = degreeOfSuccess === 'critical_failure';

    return {
      total,
      rolledValue,
      bonus: totalBonus,
      isCriticalSuccess,
      isCriticalFailure,
      degreeOfSuccess,
      margin,
    };
  }

  /**
   * Calculates hit against target Armor Class (AC) using 4 Degrees of Success.
   * Handles target condition penalties to AC (Clumsy, Frightened, Off-guard).
   */
  calculateHit(
    attackRoll: number,
    target: UniversalCreature,
    isCritRoll = false
  ): HitCalculationResult {
    const baseAc = target.stats.ac ?? 10;

    // Condition penalties on target reducing AC
    const clumsy = this.getConditionLevel(target, 'clumsy');
    const frightened = this.getConditionLevel(target, 'frightened');
    const offGuard = (target.conditions || []).some(
      (c) => c.id === 'off_guard' || c.id === 'flat_footed'
    ) ? 2 : 0;

    const effectiveAc = Math.max(0, baseAc - clumsy - frightened - offGuard);

    let degree: Pf2eDegreeOfSuccess;
    if (attackRoll >= effectiveAc + 10 || isCritRoll) {
      degree = 'critical_success';
    } else if (attackRoll >= effectiveAc) {
      degree = 'success';
    } else if (attackRoll <= effectiveAc - 10) {
      degree = 'critical_failure';
    } else {
      degree = 'failure';
    }

    const isHit = degree === 'critical_success' || degree === 'success';
    const isCritical = degree === 'critical_success';
    const isFumble = degree === 'critical_failure';

    let details = '';
    switch (degree) {
      case 'critical_success':
        details = `Критическое попадание! (${attackRoll} против КД ${effectiveAc})`;
        break;
      case 'success':
        details = `Попадание (${attackRoll} против КД ${effectiveAc})`;
        break;
      case 'failure':
        details = `Промах (${attackRoll} против КД ${effectiveAc})`;
        break;
      case 'critical_failure':
        details = `Критический промах! (${attackRoll} против КД ${effectiveAc})`;
        break;
    }

    return {
      isHit,
      isCritical,
      isFumble,
      degree,
      details,
    };
  }

  /**
   * Applies damage taking into account PF2e Weaknesses, Resistances, Immunities,
   * and Dying conditions upon reaching 0 HP.
   */
  applyDamage(
    target: UniversalCreature,
    rawDamage: number,
    damageType: string = 'slashing',
    zone?: string
  ): { updatedCreature: UniversalCreature; result: DamageResolutionResult } {
    const currentHp = typeof target.stats.hp === 'number'
      ? target.stats.hp
      : (target.resources.hp?.current ?? 0);
    const maxHp = typeof target.stats.maxHp === 'number'
      ? target.stats.maxHp
      : (target.resources.hp?.max ?? currentHp);
    const typeLower = damageType.toLowerCase().trim();

    // 1. Check Immunities
    const immunities = (target.defenses.damageImmunities || []).map((s) => s.toLowerCase());
    if (immunities.includes(typeLower) || immunities.includes('all')) {
      const result: DamageResolutionResult = {
        hpDamage: 0,
        tempHpAbsorbed: 0,
        armorDamage: 0,
        effectiveDamage: 0,
        isCriticalWound: false,
        statusEffectsApplied: ['Immune'],
      };
      return { updatedCreature: target, result };
    }

    // 2. Check Weaknesses (Extra Damage)
    let weaknessExtra = 0;
    const customWeaknesses = (target.customFields?.weaknesses as Record<string, number>) || {};
    if (typeof customWeaknesses[typeLower] === 'number') {
      weaknessExtra = customWeaknesses[typeLower];
    } else {
      const vulnerabilities = (target.defenses.damageVulnerabilities || []).map((s) => s.toLowerCase());
      if (vulnerabilities.includes(typeLower)) {
        weaknessExtra = 5; // Standard fallback weakness value
      }
    }

    // 3. Check Resistances (Damage Reduction)
    let resistanceReduction = 0;
    const customResistances = (target.customFields?.resistances as Record<string, number>) || {};
    if (typeof customResistances[typeLower] === 'number') {
      resistanceReduction = customResistances[typeLower];
    } else {
      const resistances = (target.defenses.damageResistances || []).map((s) => s.toLowerCase());
      if (resistances.includes(typeLower) || resistances.includes('all')) {
        resistanceReduction = 5; // Standard fallback resistance value
      }
    }

    const effectiveDamage = Math.max(0, rawDamage + weaknessExtra - resistanceReduction);
    const newHp = Math.max(0, currentHp - effectiveDamage);

    // 4. Dying Condition Tracking
    const statusEffectsApplied: string[] = [];
    let updatedConditions = [...(target.conditions || [])];
    let isDead = Boolean(target.customFields?.isDead);
    let isDying = false;

    if (newHp <= 0) {
      isDying = true;
      const wounded = this.getConditionLevel(target, 'wounded');
      const doomed = this.getConditionLevel(target, 'doomed');
      const maxDyingAllowed = Math.max(1, 4 - doomed);

      // In PF2e, dropping to 0 HP gains Dying 1 + Wounded (or Dying 2 on critical hit)
      const isCriticalHit = zone === 'crit' || zone === 'critical';
      const baseDying = isCriticalHit ? 2 : 1;
      const initialDyingLevel = baseDying + wounded;

      const currentDying = this.getConditionLevel(target, 'dying');
      const finalDyingLevel = Math.max(currentDying, initialDyingLevel);

      if (finalDyingLevel >= maxDyingAllowed) {
        isDead = true;
        isDying = false;
        statusEffectsApplied.push('Dead');
        updatedConditions = updatedConditions.filter((c) => c.id !== 'dying');
      } else {
        statusEffectsApplied.push(`Dying ${finalDyingLevel}`);
        updatedConditions = updatedConditions.filter((c) => c.id !== 'dying');
        updatedConditions.push({
          id: 'dying',
          name: 'Dying',
          level: finalDyingLevel,
          notes: `Умирает (Dying ${finalDyingLevel}/${maxDyingAllowed}). Спасброски восстановления.`,
        });
      }
    }

    const updatedCreature: UniversalCreature = {
      ...target,
      stats: {
        ...target.stats,
        hp: newHp,
      },
      resources: {
        ...target.resources,
        hp: {
          current: newHp,
          max: maxHp,
          resetOn: 'long_rest',
        },
      },
      conditions: updatedConditions,
      customFields: {
        ...target.customFields,
        isDying,
        isDead,
      },
    };

    const result: DamageResolutionResult = {
      hpDamage: effectiveDamage,
      tempHpAbsorbed: 0,
      armorDamage: 0,
      effectiveDamage,
      isCriticalWound: newHp <= 0,
      statusEffectsApplied,
    };

    return { updatedCreature, result };
  }

  /**
   * Action economy: checks if creature can afford action cost.
   */
  canTakeAction(remainingActions: number, cost: Pf2eActionCost): boolean {
    if (cost === 'free' || cost === 'reaction') return true;
    return remainingActions >= cost;
  }

  /**
   * Resting in PF2e (8-hour rest):
   * - Recovers Con Mod * Level HP (min 1 * Level)
   * - Reduces Drained condition by 1
   * - Removes Frightened and Fatigued
   */
  applyRest(
    creatures: UniversalCreature[],
    restType: 'short' | 'long' | 'encounter'
  ): UniversalCreature[] {
    return creatures.map((creature) => {
      if (restType !== 'long') {
        return creature;
      }

      const stats = creature.stats || {};
      const conMod = stats.conMod ?? 1;
      const level = (stats.level as number) ?? (creature.customFields?.level as number) ?? 1;
      const healedHp = Math.max(1, conMod) * Math.max(1, level);

      const currentHp = typeof stats.hp === 'number'
        ? stats.hp
        : (creature.resources.hp?.current ?? 0);
      const maxHp = typeof stats.maxHp === 'number'
        ? stats.maxHp
        : (creature.resources.hp?.max ?? currentHp);
      const newHp = Math.min(maxHp, currentHp + healedHp);

      // Reduce Drained by 1, remove Frightened and Fatigued
      let updatedCreature = this.reduceCondition(creature, 'drained', 1);
      updatedCreature = {
        ...updatedCreature,
        conditions: (updatedCreature.conditions || []).filter(
          (c) => c.id !== 'frightened' && c.id !== 'fatigued'
        ),
        stats: {
          ...updatedCreature.stats,
          hp: newHp,
        },
        resources: {
          ...updatedCreature.resources,
          hp: {
            current: newHp,
            max: maxHp,
            resetOn: 'long_rest',
          },
        },
      };

      return updatedCreature;
    });
  }
}

export const pathfinder2eEngine = new Pathfinder2eEngine();
