/**
 * TTRPG Helper - Cyberpunk RED Rule Engine Implementation
 *
 * Implements SystemRuleEngine interface for Cyberpunk RED (R. Talsorian Games):
 * - Initiative: REF + 1d10 + (REF / 100)
 * - Checks: Stat + Skill + 1d10 vs DV (Exploding 10s add 1d10, Fumble 1s subtract 1d10)
 * - Wounding penalties: Seriously Wounded (<= 50% HP: -2 penalty to actions), Mortally Wounded (<= 0 HP)
 * - Armor SP: Head SP & Body SP; when damage > SP, excess applies to HP and SP reduces by 1
 * - Resources: HP, Humanity (EMP recalculation), Luck (spendable pool)
 * - Rest: Natural healing restores BODY HP per day (no short/long rests)
 * - Critical Injuries: Inflicted when 2+ damage dice roll 6 (+5 bonus HP damage, specific bodily trauma)
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
import { getCurrentLanguage } from '../../i18n';
import { SupportedLanguage } from '../../i18n/types';
import {
  CyberpunkRollContext,
  CyberpunkWoundState,
  CyberpunkDeathSaveResult,
  CyberpunkArmorZone,
  getCyberpunkCriticalInjury,
} from './types';

export class CyberpunkRedEngine implements SystemRuleEngine {
  public metadata: SystemMetadata;

  constructor(metadataOverride?: SystemMetadata) {
    this.metadata = metadataOverride || SYSTEM_REGISTRY['cyberpunk_red'] || {
      id: 'cyberpunk_red',
      name: 'Cyberpunk RED',
      family: 'cyberpunk',
      edition: 'Core Rulebook System',
      version: '1.0.0',
      status: 'stable',
      themeId: 'cyberpunk-red',
      description: 'Cyberpunk RED Rules: REF+1d10, SP Armor Ablation by Hit Zone, Humanity & Wound Thresholds.',
      supportedFeatures: {
        spellSlots: false,
        weaponMastery: false,
        armorAblation: true,
        degreesOfSuccess: false,
        deathSaveTrack: true,
        humanityTrack: true,
        actionEconomy: 'move_and_action',
      },
    };
  }

  /**
   * Initiative formula: REF + 1d10 + (REF / 100)
   * The fractional REF / 100 serves as the official tie-breaker.
   */
  calculateInitiative(creature: UniversalCreature, rollOverride?: number): InitiativeResult {
    const stats = creature.stats || {};
    const ref = stats.ref ?? stats.REF ?? stats.initiative ?? stats.initBonus ?? 0;
    const rolledValue = typeof rollOverride === 'number' ? rollOverride : rollDie(10);
    const tieBreaker = Number((ref / 100).toFixed(2));
    const total = Number((rolledValue + ref + tieBreaker).toFixed(2));

    return {
      total,
      rolledValue,
      bonus: ref,
      tieBreaker,
    };
  }

  /**
   * Evaluates creature current wound threshold state.
   */
  getWoundState(creature: UniversalCreature): CyberpunkWoundState {
    const currentHp = typeof creature.stats.hp === 'number'
      ? creature.stats.hp
      : (creature.resources.hp?.current ?? 0);
    const maxHp = typeof creature.stats.maxHp === 'number'
      ? creature.stats.maxHp
      : (creature.resources.hp?.max ?? currentHp);

    if (currentHp <= 0) {
      if (creature.customFields?.isDead) return 'dead';
      return 'mortally_wounded';
    }

    const halfHp = Math.floor(maxHp / 2);
    if (currentHp <= halfHp) {
      return 'seriously_wounded';
    }

    if (currentHp < maxHp) {
      return 'light';
    }

    return 'healthy';
  }

  /**
   * Computes penalty from wound threshold:
   * - Seriously Wounded (<= 50% HP): -2 to all actions
   * - Mortally Wounded (<= 0 HP): -4 (or -2 minimum)
   */
  getWoundPenalty(creature: UniversalCreature): number {
    const state = this.getWoundState(creature);
    switch (state) {
      case 'seriously_wounded':
        return -2;
      case 'mortally_wounded':
        return -4;
      case 'dead':
        return -999;
      default:
        return 0;
    }
  }

  /**
   * Stat / Skill Check Resolution:
   * Formula: Stat + Skill + 1d10 vs DV
   * Exploding 10: If natural 10 rolled, roll another 1d10 and ADD to total.
   * Fumble 1: If natural 1 rolled, roll another 1d10 and SUBTRACT from total.
   */
  resolveCheck(
    statKey: string,
    creature: UniversalCreature,
    dc?: number,
    context?: RollContext | CyberpunkRollContext
  ): CheckResult {
    const cpContext = context as CyberpunkRollContext | undefined;
    const stats = creature.stats || {};
    const keyLower = statKey.toLowerCase().trim();

    // 1. Calculate Base Stat & Skill Modifiers
    let baseStat = 0;
    if (typeof stats[keyLower] === 'number') {
      baseStat = stats[keyLower];
    } else if (typeof stats[statKey] === 'number') {
      baseStat = stats[statKey];
    } else if (keyLower.includes('+')) {
      // E.g. "REF + Handgun"
      const parts = keyLower.split('+').map((p) => p.trim());
      baseStat = parts.reduce((acc, part) => acc + (stats[part] || 0), 0);
    }

    const explicitSkill = cpContext?.skillBonus || 0;
    const situational = cpContext?.situationalBonus || 0;
    const luckBonus = cpContext?.luckSpend || 0;
    const woundPenalty = this.getWoundPenalty(creature);

    const totalBonus = baseStat + explicitSkill + situational + luckBonus + woundPenalty;

    // 2. Roll 1d10 with Explosion (10) or Fumble (1)
    const baseRoll = typeof cpContext?.rollOverride === 'number'
      ? cpContext.rollOverride
      : rollDie(10);

    const isCriticalSuccess = baseRoll === 10;
    const isCriticalFailure = baseRoll === 1;

    let effectiveRoll = baseRoll;
    if (isCriticalSuccess) {
      const explodeDie = typeof cpContext?.critRollOverride === 'number'
        ? cpContext.critRollOverride
        : rollDie(10);
      effectiveRoll = 10 + explodeDie;
    } else if (isCriticalFailure) {
      const fumbleDie = typeof cpContext?.critRollOverride === 'number'
        ? cpContext.critRollOverride
        : rollDie(10);
      effectiveRoll = 1 - fumbleDie;
    }

    const total = effectiveRoll + totalBonus;

    // 3. Compare with DV (beat DV: total > dc)
    let degreeOfSuccess: CheckResult['degreeOfSuccess'];
    let margin: number | undefined;

    if (dc !== undefined) {
      margin = total - dc;
      const isSuccess = total > dc; // CPR: Beat the DV
      if (isSuccess) {
        degreeOfSuccess = isCriticalSuccess ? 'critical_success' : 'success';
      } else {
        degreeOfSuccess = isCriticalFailure ? 'critical_failure' : 'failure';
      }
    } else {
      if (isCriticalSuccess) degreeOfSuccess = 'critical_success';
      else if (isCriticalFailure) degreeOfSuccess = 'critical_failure';
    }

    return {
      total,
      rolledValue: effectiveRoll,
      bonus: totalBonus,
      isCriticalSuccess,
      isCriticalFailure,
      degreeOfSuccess,
      margin,
    };
  }

  /**
   * Calculates hit against defense or DV.
   * In Cyberpunk RED, ranged attacks check against range DV,
   * while melee or dodged attacks check against Defender DEX + Evasion + 1d10.
   */
  calculateHit(
    attackRoll: number,
    target: UniversalCreature,
    isCritRoll = false
  ): HitCalculationResult {
    const stats = target.stats || {};
    // Target defense DC: evasion DV or static defense
    const evasion = stats.evasion ?? 0;
    const dex = stats.dex ?? stats.DEX ?? 0;
    const targetDefense = stats.dv ?? (dex > 0 || evasion > 0 ? dex + evasion + 10 : stats.ac ?? 10);

    const isHit = attackRoll > targetDefense;
    const lang = getCurrentLanguage();

    const details = lang === 'en'
      ? (isHit
          ? `Hit: ${attackRoll} vs Defense ${targetDefense}${isCritRoll ? ' (Critical Roll!)' : ''}`
          : `Miss: ${attackRoll} vs Defense ${targetDefense}`)
      : (isHit
          ? `Попадание: ${attackRoll} против Защиты ${targetDefense}${isCritRoll ? ' (Критический бросок!)' : ''}`
          : `Промах: ${attackRoll} против Защиты ${targetDefense}`);

    return {
      isHit,
      isCritical: isCritRoll,
      isFumble: false,
      degree: isHit ? (isCritRoll ? 'critical_success' : 'success') : 'failure',
      details,
    };
  }

  /**
   * Applies damage through Cyberpunk RED Armor Ablation Pipeline:
   * - Armor has Head SP and Body SP.
   * - If Damage > SP:
   *     - Excess damage applies directly to HP.
   *     - Armor SP in that hit zone reduces by 1 (ablated).
   * - If Damage <= SP:
   *     - Armor fully stops the hit (0 HP damage, 0 SP ablation).
   * - If HP drops to <= 50%, target becomes Seriously Wounded (-2 penalty).
   * - If HP drops to <= 0, target becomes Mortally Wounded (Death Saves).
   */
  applyDamage(
    target: UniversalCreature,
    rawDamage: number,
    _damageType: string = 'kinetic',
    zone: string = 'body'
  ): { updatedCreature: UniversalCreature; result: DamageResolutionResult } {
    const currentHp = typeof target.stats.hp === 'number'
      ? target.stats.hp
      : (target.resources.hp?.current ?? 0);
    const maxHp = typeof target.stats.maxHp === 'number'
      ? target.stats.maxHp
      : (target.resources.hp?.max ?? currentHp);

    const normalizedZone: CyberpunkArmorZone = zone.toLowerCase().includes('head') ? 'head' : 'body';

    // Retrieve active SP for targeted zone
    let activeSp = 0;
    let headSp = target.stats.headSp ?? target.stats.spHead ?? target.resources.spHead?.current ?? target.defenses.damageReductions?.head ?? 0;
    let bodySp = target.stats.bodySp ?? target.stats.spBody ?? target.resources.spBody?.current ?? target.defenses.damageReductions?.body ?? 0;

    if (normalizedZone === 'head') {
      activeSp = headSp;
    } else {
      activeSp = bodySp;
    }

    let hpDamage = 0;
    let armorDamage = 0;

    if (rawDamage > activeSp) {
      hpDamage = rawDamage - activeSp;
      armorDamage = activeSp > 0 ? 1 : 0; // Ablate SP by 1 down to min 0
    } else {
      hpDamage = 0;
      armorDamage = 0;
    }

    // Apply ablation
    if (armorDamage > 0) {
      if (normalizedZone === 'head') {
        headSp = Math.max(0, headSp - 1);
      } else {
        bodySp = Math.max(0, bodySp - 1);
      }
    }

    const newHp = Math.max(0, currentHp - hpDamage);
    const halfHp = Math.floor(maxHp / 2);

    const isSeriouslyWounded = newHp <= halfHp && newHp > 0;
    const isMortallyWounded = newHp <= 0;

    const statusEffectsApplied: string[] = [];
    const updatedConditions = [...(target.conditions || []).filter(
      (c) => c.id !== 'seriously_wounded' && c.id !== 'mortally_wounded'
    )];

    const lang = getCurrentLanguage();

    if (isMortallyWounded) {
      statusEffectsApplied.push('Mortally Wounded');
      updatedConditions.push({
        id: 'mortally_wounded',
        name: lang === 'ru' ? 'Смертельно ранен (Mortally Wounded)' : 'Mortally Wounded',
        level: 1,
        notes: lang === 'ru'
          ? 'Должен совершать Death Save каждый раунд. Штраф -4 к действиям.'
          : 'Must make a Death Save at the start of each turn. -4 penalty to actions.',
      });
    } else if (isSeriouslyWounded) {
      statusEffectsApplied.push('Seriously Wounded');
      updatedConditions.push({
        id: 'seriously_wounded',
        name: lang === 'ru' ? 'Тяжело ранен (Seriously Wounded)' : 'Seriously Wounded',
        level: 1,
        notes: lang === 'ru'
          ? 'Штраф -2 ко всем действиям при HP <= 50%.'
          : '-2 penalty to all actions when HP <= 50%.',
      });
    }

    const updatedCreature: UniversalCreature = {
      ...target,
      stats: {
        ...target.stats,
        hp: newHp,
        headSp,
        bodySp,
        spHead: headSp,
        spBody: bodySp,
      },
      resources: {
        ...target.resources,
        hp: {
          current: newHp,
          max: maxHp,
          resetOn: 'dawn',
        },
        ...(target.resources.spHead
          ? { spHead: { ...target.resources.spHead, current: headSp } }
          : {}),
        ...(target.resources.spBody
          ? { spBody: { ...target.resources.spBody, current: bodySp } }
          : {}),
      },
      defenses: {
        ...target.defenses,
        damageReductions: {
          ...target.defenses.damageReductions,
          head: headSp,
          body: bodySp,
        },
      },
      conditions: updatedConditions,
      customFields: {
        ...target.customFields,
        isSeriouslyWounded,
        isMortallyWounded,
        isDying: isMortallyWounded,
        isDead: Boolean(target.customFields?.isDead),
      },
    };

    const result: DamageResolutionResult = {
      hpDamage,
      tempHpAbsorbed: 0,
      armorDamage,
      appliedToZone: normalizedZone,
      effectiveDamage: hpDamage,
      isCriticalWound: isSeriouslyWounded || isMortallyWounded,
      statusEffectsApplied,
    };

    return { updatedCreature, result };
  }

  /**
   * Death Save resolution for Cyberpunk RED:
   * Roll 1d10:
   * - Must roll strictly LESS than creature's BODY stat minus death penalty.
   * - Rolling a 10 is ALWAYS a critical failure and instant death.
   * - If roll + deathPenalty < BODY: creature survives this round.
   * - Otherwise: creature dies.
   */
  resolveDeathSave(creature: UniversalCreature, rollOverride?: number): CyberpunkDeathSaveResult {
    const stats = creature.stats || {};
    const bodyStat = stats.body ?? stats.BODY ?? 5;
    const penalty = (creature.customFields?.deathSavePenalty as number) || 0;

    const roll = typeof rollOverride === 'number' ? rollOverride : rollDie(10);
    const isCriticalFailure = roll === 10;
    const effectiveRoll = roll + penalty;

    const isSuccess = !isCriticalFailure && effectiveRoll < bodyStat;
    const isDead = !isSuccess;

    const lang = getCurrentLanguage();

    const details = lang === 'en'
      ? (isSuccess
          ? `Death save succeeded: ${effectiveRoll} (Die ${roll} + Penalty ${penalty}) < BODY ${bodyStat}`
          : isCriticalFailure
          ? `Critical Failure (Natural 10)! Character dies.`
          : `Death save failed: ${effectiveRoll} >= BODY ${bodyStat}. Character dies.`)
      : (isSuccess
          ? `Успешный спасбросок от смерти: ${effectiveRoll} (кубик ${roll} + штраф ${penalty}) < ТЕЛО ${bodyStat}`
          : isCriticalFailure
          ? `Критический провал (Натуральная 10)! Персонаж погибает.`
          : `Провал спасброска от смерти: ${effectiveRoll} >= ТЕЛО ${bodyStat}. Персонаж погибает.`);

    return {
      roll,
      penalty,
      effectiveRoll,
      bodyStat,
      isSuccess,
      isDead,
      isCriticalFailure,
      details,
    };
  }

  /**
   * Modifies Humanity and recalculates Empathy (EMP = Math.floor(Humanity / 10)).
   * If Humanity drops to <= 0, applies Cyberpsychosis condition.
   */
  modifyHumanity(creature: UniversalCreature, delta: number): UniversalCreature {
    const currentHumanity = creature.resources.humanity?.current ?? ((creature.stats.emp ?? 5) * 10);
    const maxHumanity = creature.resources.humanity?.max ?? ((creature.stats.emp ?? 5) * 10);

    const newHumanity = Math.max(0, currentHumanity + delta);
    const newEmp = Math.floor(newHumanity / 10);

    const conditions = [...(creature.conditions || [])];
    const isPsychotic = newHumanity <= 0;
    const lang = getCurrentLanguage();

    if (isPsychotic && !conditions.some((c) => c.id === 'cyberpsychosis')) {
      conditions.push({
        id: 'cyberpsychosis',
        name: lang === 'ru' ? 'Киберпсихоз (Cyberpsychosis)' : 'Cyberpsychosis',
        level: 1,
        notes: lang === 'ru'
          ? 'Человечность исчерпана. Персонаж теряет самоконтроль и становится неуправляемым.'
          : 'Humanity depleted. Character loses control and enters violent psychosis.',
      });
    }

    return {
      ...creature,
      stats: {
        ...creature.stats,
        emp: newEmp,
        EMP: newEmp,
        humanity: newHumanity,
      },
      resources: {
        ...creature.resources,
        humanity: {
          current: newHumanity,
          max: maxHumanity,
        },
      },
      conditions,
      customFields: {
        ...creature.customFields,
        isCyberpsycho: isPsychotic,
      },
    };
  }

  /**
   * Spends Luck points from the creature's Luck pool.
   */
  spendLuck(creature: UniversalCreature, points: number): UniversalCreature {
    const currentLuck = creature.resources.luck?.current ?? creature.stats.luck ?? 0;
    const maxLuck = creature.resources.luck?.max ?? creature.stats.luck ?? currentLuck;

    const newLuck = Math.max(0, currentLuck - points);

    return {
      ...creature,
      resources: {
        ...creature.resources,
        luck: {
          current: newLuck,
          max: maxLuck,
        },
      },
    };
  }

  /**
   * Resolves a Critical Injury for Cyberpunk RED (inflicted when 2+ d6 damage dice come up 6).
   */
  getCriticalInjury(
    zone: 'head' | 'body',
    roll: number,
    lang?: SupportedLanguage
  ) {
    const effectiveLang = lang || getCurrentLanguage();
    return getCyberpunkCriticalInjury(zone, roll, effectiveLang);
  }

  /**
   * Rolls 2d6 on the Critical Injury Table for Cyberpunk RED.
   */
  rollCriticalInjury(
    zone: 'head' | 'body',
    rollOverride?: number,
    lang?: SupportedLanguage
  ) {
    const effectiveLang = lang || getCurrentLanguage();
    const roll = typeof rollOverride === 'number' ? rollOverride : rollDie(6) + rollDie(6);
    const clampedRoll = Math.max(2, Math.min(12, roll));
    const result = getCyberpunkCriticalInjury(zone, clampedRoll, effectiveLang);
    return {
      roll: clampedRoll,
      zone,
      bonusDamage: 5, // All CPR critical injuries deal 5 bonus damage directly to HP
      ...result,
    };
  }

  /**
   * Natural healing in Cyberpunk RED:
   * - Rest restores HP equal to the character's BODY stat per full day of rest.
   * - Resets Luck pool to maximum.
   * - No short rests exist in Cyberpunk RED.
   */
  applyRest(
    creatures: UniversalCreature[],
    restType: 'short' | 'long' | 'encounter'
  ): UniversalCreature[] {
    return creatures.map((creature) => {
      // In CPR, short rest provides no mechanical healing
      if (restType !== 'long') {
        return creature;
      }

      const bodyStat = creature.stats.body ?? creature.stats.BODY ?? 5;
      const currentHp = creature.resources.hp?.current ?? creature.stats.hp ?? 0;
      const maxHp = creature.resources.hp?.max ?? creature.stats.maxHp ?? currentHp;
      const maxLuck = creature.resources.luck?.max ?? creature.stats.luck ?? 0;

      // Natural healing restores BODY HP per day
      const newHp = Math.min(maxHp, currentHp + bodyStat);
      const halfHp = Math.floor(maxHp / 2);
      const isSeriouslyWounded = newHp <= halfHp && newHp > 0;
      const isMortallyWounded = newHp <= 0;

      const updatedConditions = (creature.conditions || []).filter((c) => {
        if (!isSeriouslyWounded && c.id === 'seriously_wounded') return false;
        if (!isMortallyWounded && c.id === 'mortally_wounded') return false;
        return true;
      });

      return {
        ...creature,
        stats: {
          ...creature.stats,
          hp: newHp,
        },
        resources: {
          ...creature.resources,
          hp: {
            current: newHp,
            max: maxHp,
            resetOn: 'dawn',
          },
          ...(creature.resources.luck
            ? {
                luck: {
                  ...creature.resources.luck,
                  current: maxLuck,
                },
              }
            : {}),
        },
        conditions: updatedConditions,
        customFields: {
          ...creature.customFields,
          isSeriouslyWounded,
          isMortallyWounded,
          isDying: isMortallyWounded,
        },
      };
    });
  }
}

export const cyberpunkRedEngine = new CyberpunkRedEngine();
