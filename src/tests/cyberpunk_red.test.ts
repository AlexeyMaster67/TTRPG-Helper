import { describe, it, expect } from 'vitest';
import {
  getRuleEngine,
  cyberpunkRedEngine,
  getCyberpunkTemplate,
  getAllCyberpunkTemplates,
} from '../systems';
import { UniversalCreature } from '../types/system';

describe('Cyberpunk RED Rule Engine Suite', () => {
  const createMockCyberpunkCreature = (overrides: Partial<UniversalCreature> = {}): UniversalCreature => {
    const hp = overrides.stats?.hp ?? 45;
    const maxHp = overrides.stats?.maxHp ?? 45;
    const headSp = overrides.stats?.headSp ?? 11;
    const bodySp = overrides.stats?.bodySp ?? 11;

    return {
      id: 'edgerunner-v',
      name: 'V (Edgerunner)',
      systemId: 'cyberpunk_red',
      systemVersion: '1.0.0',
      isPlayer: true,
      stats: {
        int: 6,
        ref: 8,
        dex: 7,
        tech: 5,
        cool: 6,
        will: 6,
        luck: 5,
        move: 6,
        body: 8,
        emp: 6,
        hp,
        maxHp,
        headSp,
        bodySp,
        spHead: headSp,
        spBody: bodySp,
        evasion: 13,
        handgun: 6,
        ...overrides.stats,
      },
      resources: {
        hp: { current: hp, max: maxHp, resetOn: 'dawn' },
        humanity: { current: 60, max: 60 },
        luck: { current: 5, max: 5 },
        spHead: { current: headSp, max: headSp },
        spBody: { current: bodySp, max: bodySp },
        ...overrides.resources,
      },
    tracks: {
      deathSaves: { name: 'Death Saves', current: 0, max: 10 },
    },
    conditions: [],
    defenses: {
      damageImmunities: [],
      damageResistances: [],
      damageVulnerabilities: [],
      conditionImmunities: [],
      damageReductions: { head: 11, body: 11 },
    },
    actions: [
      {
        id: 'heavy_pistol',
        name: 'Heavy Pistol',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '3d6',
        damageType: 'kinetic',
      },
    ],
    senses: {},
    speeds: { walk: 12 },
    notes: 'Night City Solo',
    customFields: {
      deathSavePenalty: 0,
    },
    ...overrides,
  };
};

  describe('Registry & System Metadata', () => {
    it('retrieves Cyberpunk RED engine from central registry', () => {
      const engine = getRuleEngine('cyberpunk_red');
      expect(engine).toBeDefined();
      expect(engine?.metadata.id).toBe('cyberpunk_red');
      expect(engine?.metadata.family).toBe('cyberpunk');
      expect(engine?.metadata.supportedFeatures.armorAblation).toBe(true);
      expect(engine?.metadata.supportedFeatures.humanityTrack).toBe(true);
      expect(engine?.metadata.supportedFeatures.spellSlots).toBe(false);
      expect(engine?.metadata.supportedFeatures.actionEconomy).toBe('move_and_action');
    });
  });

  describe('Initiative: REF + 1d10 + (REF / 100)', () => {
    it('calculates initiative with REF bonus and fractional tie-breaker', () => {
      const creature = createMockCyberpunkCreature({
        stats: { ref: 8, hp: 45, maxHp: 45 },
      });

      // Roll 7 with REF 8 -> 7 + 8 + 0.08 = 15.08
      const res = cyberpunkRedEngine.calculateInitiative(creature, 7);
      expect(res.rolledValue).toBe(7);
      expect(res.bonus).toBe(8);
      expect(res.tieBreaker).toBe(0.08);
      expect(res.total).toBe(15.08);
    });

    it('handles low/zero REF creature initiative correctly', () => {
      const creature = createMockCyberpunkCreature({
        stats: { ref: 2, hp: 30, maxHp: 30 },
      });

      const res = cyberpunkRedEngine.calculateInitiative(creature, 10);
      expect(res.total).toBe(12.02);
      expect(res.tieBreaker).toBe(0.02);
    });
  });

  describe('Stat & Skill Checks: Stat + Skill + 1d10 vs DV', () => {
    it('resolves normal check beating DV', () => {
      const creature = createMockCyberpunkCreature();
      // REF 8 + Handgun 6 = 14 bonus. Roll 5 -> total 19. DV 15 -> Success (margin +4)
      const res = cyberpunkRedEngine.resolveCheck('ref', creature, 15, {
        rollMode: 'normal',
        skillBonus: 6,
        rollOverride: 5,
      });

      expect(res.rolledValue).toBe(5);
      expect(res.bonus).toBe(14);
      expect(res.total).toBe(19);
      expect(res.margin).toBe(4);
      expect(res.degreeOfSuccess).toBe('success');
      expect(res.isCriticalSuccess).toBe(false);
      expect(res.isCriticalFailure).toBe(false);
    });

    it('resolves normal check failing to beat DV', () => {
      const creature = createMockCyberpunkCreature();
      // Bonus 14. Roll 3 -> total 17. DV 20 -> Failure (margin -3)
      const res = cyberpunkRedEngine.resolveCheck('ref', creature, 20, {
        rollMode: 'normal',
        skillBonus: 6,
        rollOverride: 3,
      });

      expect(res.total).toBe(17);
      expect(res.margin).toBe(-3);
      expect(res.degreeOfSuccess).toBe('failure');
    });

    it('exploding 10s: natural 10 adds a second 1d10 roll', () => {
      const creature = createMockCyberpunkCreature();
      // Base roll 10, crit roll 8 -> effective roll = 18. Bonus 14 -> Total 32 vs DV 25 -> Critical Success
      const res = cyberpunkRedEngine.resolveCheck('ref', creature, 25, {
        rollMode: 'normal',
        skillBonus: 6,
        rollOverride: 10,
        critRollOverride: 8,
      });

      expect(res.isCriticalSuccess).toBe(true);
      expect(res.isCriticalFailure).toBe(false);
      expect(res.rolledValue).toBe(18); // 10 + 8
      expect(res.total).toBe(32); // 18 + 14
      expect(res.degreeOfSuccess).toBe('critical_success');
    });

    it('fumble 1s: natural 1 rolls second 1d10 and subtracts from 1', () => {
      const creature = createMockCyberpunkCreature();
      // Base roll 1, fumble roll 6 -> effective roll = 1 - 6 = -5. Bonus 14 -> Total 9 vs DV 13 -> Critical Failure
      const res = cyberpunkRedEngine.resolveCheck('ref', creature, 13, {
        rollMode: 'normal',
        skillBonus: 6,
        rollOverride: 1,
        critRollOverride: 6,
      });

      expect(res.isCriticalFailure).toBe(true);
      expect(res.isCriticalSuccess).toBe(false);
      expect(res.rolledValue).toBe(-5); // 1 - 6
      expect(res.total).toBe(9); // -5 + 14
      expect(res.degreeOfSuccess).toBe('critical_failure');
    });

    it('supports spendable Luck modifying check total', () => {
      const creature = createMockCyberpunkCreature();
      // Base roll 4, bonus 8, spend 3 Luck -> total = 4 + 8 + 3 = 15 vs DV 14 -> success
      const res = cyberpunkRedEngine.resolveCheck('ref', creature, 14, {
        rollMode: 'normal',
        rollOverride: 4,
        luckSpend: 3,
      });

      expect(res.bonus).toBe(11); // 8 + 3
      expect(res.total).toBe(15);
      expect(res.degreeOfSuccess).toBe('success');
    });

    it('applies -2 penalty to actions when Seriously Wounded (<= 50% HP)', () => {
      // Max HP 40, current HP 20 (<= 50%) -> Seriously Wounded
      const creature = createMockCyberpunkCreature({
        stats: { ref: 8, hp: 20, maxHp: 40 },
        resources: {
          hp: { current: 20, max: 40, resetOn: 'dawn' },
        },
      });

      const res = cyberpunkRedEngine.resolveCheck('ref', creature, 15, {
        rollMode: 'normal',
        rollOverride: 5,
      });

      // Normal bonus 8, penalty -2 -> effective bonus 6 -> total 5 + 6 = 11
      expect(res.bonus).toBe(6);
      expect(res.total).toBe(11);
    });
  });

  describe('Armor SP & Zone Ablation', () => {
    it('stops damage completely when damage <= SP (0 HP damage, 0 ablation)', () => {
      const target = createMockCyberpunkCreature({
        stats: { hp: 40, maxHp: 40, bodySp: 11, headSp: 11 },
      });

      // 8 damage vs Body SP 11
      const { updatedCreature, result } = cyberpunkRedEngine.applyDamage(target, 8, 'kinetic', 'body');

      expect(result.hpDamage).toBe(0);
      expect(result.armorDamage).toBe(0);
      expect(result.effectiveDamage).toBe(0);
      expect(updatedCreature.stats.hp).toBe(40);
      expect(updatedCreature.stats.bodySp).toBe(11);
    });

    it('when damage > Body SP: difference goes to HP and Body SP is ablated by 1', () => {
      const target = createMockCyberpunkCreature({
        stats: { hp: 40, maxHp: 40, bodySp: 11, headSp: 11 },
      });

      // 16 damage vs Body SP 11:
      // excess = 5 HP damage, Body SP reduces from 11 to 10
      const { updatedCreature, result } = cyberpunkRedEngine.applyDamage(target, 16, 'kinetic', 'body');

      expect(result.hpDamage).toBe(5);
      expect(result.armorDamage).toBe(1);
      expect(result.appliedToZone).toBe('body');
      expect(updatedCreature.stats.hp).toBe(35);
      expect(updatedCreature.stats.bodySp).toBe(10);
      expect(updatedCreature.stats.headSp).toBe(11); // Head SP intact
    });

    it('when damage > Head SP: damages head armor and ablates Head SP only', () => {
      const target = createMockCyberpunkCreature({
        stats: { hp: 40, maxHp: 40, headSp: 7, bodySp: 11 },
      });

      // 12 damage to Head vs Head SP 7:
      // excess = 5 HP damage, Head SP reduces from 7 to 6, Body SP stays 11
      const { updatedCreature, result } = cyberpunkRedEngine.applyDamage(target, 12, 'kinetic', 'head');

      expect(result.hpDamage).toBe(5);
      expect(result.armorDamage).toBe(1);
      expect(result.appliedToZone).toBe('head');
      expect(updatedCreature.stats.hp).toBe(35);
      expect(updatedCreature.stats.headSp).toBe(6);
      expect(updatedCreature.stats.bodySp).toBe(11);
    });

    it('ablates down to 0 SP and caps at 0 without going negative', () => {
      const target = createMockCyberpunkCreature({
        stats: { hp: 40, maxHp: 40, bodySp: 1, headSp: 11 },
      });

      // 10 damage vs Body SP 1
      const { updatedCreature, result } = cyberpunkRedEngine.applyDamage(target, 10, 'kinetic', 'body');
      expect(result.hpDamage).toBe(9);
      expect(updatedCreature.stats.bodySp).toBe(0);

      // Next shot vs 0 SP: takes full 10 damage, armorDamage is 0 (already 0)
      const next = cyberpunkRedEngine.applyDamage(updatedCreature, 10, 'kinetic', 'body');
      expect(next.result.hpDamage).toBe(10);
      expect(next.updatedCreature.stats.bodySp).toBe(0);
    });
  });

  describe('Injury Thresholds: Seriously Wounded, Mortally Wounded & Death Saves', () => {
    it('applies Seriously Wounded status when HP drops to <= 50%', () => {
      const target = createMockCyberpunkCreature({
        stats: { hp: 40, maxHp: 40, bodySp: 0, headSp: 0 },
      });

      // Deal 21 damage -> HP drops to 19 (<= 20)
      const { updatedCreature, result } = cyberpunkRedEngine.applyDamage(target, 21, 'kinetic', 'body');

      expect(updatedCreature.stats.hp).toBe(19);
      expect(result.statusEffectsApplied).toContain('Seriously Wounded');
      expect(updatedCreature.customFields.isSeriouslyWounded).toBe(true);
      expect(updatedCreature.conditions.some((c) => c.id === 'seriously_wounded')).toBe(true);
    });

    it('applies Mortally Wounded and Dying status when HP drops to 0', () => {
      const target = createMockCyberpunkCreature({
        stats: { hp: 10, maxHp: 40, bodySp: 0, headSp: 0 },
      });

      const { updatedCreature, result } = cyberpunkRedEngine.applyDamage(target, 20, 'kinetic', 'body');

      expect(updatedCreature.stats.hp).toBe(0);
      expect(result.statusEffectsApplied).toContain('Mortally Wounded');
      expect(updatedCreature.customFields.isMortallyWounded).toBe(true);
      expect(updatedCreature.customFields.isDying).toBe(true);
    });

    it('resolves Death Save: roll strictly less than BODY succeeds', () => {
      const mortallyWoundedCreature = createMockCyberpunkCreature({
        stats: { body: 8, hp: 0, maxHp: 40 },
        customFields: { deathSavePenalty: 0 },
      });

      // Roll 5 < BODY 8 -> Success
      const resSuccess = cyberpunkRedEngine.resolveDeathSave(mortallyWoundedCreature, 5);
      expect(resSuccess.isSuccess).toBe(true);
      expect(resSuccess.isDead).toBe(false);

      // Roll 8 >= BODY 8 -> Fails and dies
      const resFail = cyberpunkRedEngine.resolveDeathSave(mortallyWoundedCreature, 8);
      expect(resFail.isSuccess).toBe(false);
      expect(resFail.isDead).toBe(true);

      // Roll 10 -> Critical failure / Instant death
      const resCrit = cyberpunkRedEngine.resolveDeathSave(mortallyWoundedCreature, 10);
      expect(resCrit.isCriticalFailure).toBe(true);
      expect(resCrit.isDead).toBe(true);
    });

    it('death save penalty increases failure threshold', () => {
      const creatureWithPenalty = createMockCyberpunkCreature({
        stats: { body: 8, hp: 0, maxHp: 40 },
        customFields: { deathSavePenalty: 3 },
      });

      // Roll 5 + penalty 3 = 8 >= BODY 8 -> Dies
      const res = cyberpunkRedEngine.resolveDeathSave(creatureWithPenalty, 5);
      expect(res.effectiveRoll).toBe(8);
      expect(res.isSuccess).toBe(false);
      expect(res.isDead).toBe(true);
    });
  });

  describe('Resources: Humanity, Empathy, Luck & Resting', () => {
    it('modifies Humanity and recalculates EMP = Math.floor(Humanity / 10)', () => {
      const creature = createMockCyberpunkCreature(); // Humanity 60, EMP 6
      const updated = cyberpunkRedEngine.modifyHumanity(creature, -15); // Humanity 45

      expect(updated.resources.humanity.current).toBe(45);
      expect(updated.stats.emp).toBe(4);
    });

    it('triggers Cyberpsychosis when Humanity drops to 0', () => {
      const creature = createMockCyberpunkCreature();
      const updated = cyberpunkRedEngine.modifyHumanity(creature, -70);

      expect(updated.resources.humanity.current).toBe(0);
      expect(updated.stats.emp).toBe(0);
      expect(updated.customFields.isCyberpsycho).toBe(true);
      expect(updated.conditions.some((c) => c.id === 'cyberpsychosis')).toBe(true);
    });

    it('spends Luck points properly from resource pool', () => {
      const creature = createMockCyberpunkCreature(); // Luck 5
      const updated = cyberpunkRedEngine.spendLuck(creature, 2);

      expect(updated.resources.luck.current).toBe(3);
    });

    it('natural healing restores BODY points of HP per day of rest (no short rest healing)', () => {
      const damaged = createMockCyberpunkCreature({
        stats: { hp: 15, maxHp: 40, body: 8, luck: 5 },
        resources: {
          hp: { current: 15, max: 40, resetOn: 'dawn' },
          luck: { current: 1, max: 5 },
        },
      });

      // Short rest provides 0 healing in Cyberpunk RED
      const shortRested = cyberpunkRedEngine.applyRest([damaged], 'short');
      expect(shortRested[0].resources.hp.current).toBe(15);

      // Long rest heals BODY (8) HP and resets Luck
      const longRested = cyberpunkRedEngine.applyRest([damaged], 'long');
      expect(longRested[0].resources.hp.current).toBe(23); // 15 + 8
      expect(longRested[0].resources.luck.current).toBe(5);
    });
  });

  describe('25 Starter NPC Templates', () => {
    it('provides exactly 25 archetype statblocks', () => {
      const templates = getAllCyberpunkTemplates();
      expect(templates.length).toBe(25);
    });

    it('validates foundational archetypes have correct stats, SP, and actions', () => {
      const solo = getCyberpunkTemplate('solo_veteran');
      expect(solo).toBeDefined();
      expect(solo?.stats.ref).toBe(8);
      expect(solo?.stats.bodySp).toBe(11);
      expect(solo?.stats.headSp).toBe(11);
      expect(solo?.actions.length).toBeGreaterThanOrEqual(2);

      const netrunner = getCyberpunkTemplate('netrunner');
      expect(netrunner).toBeDefined();
      expect(netrunner?.stats.int).toBe(8);

      const cyberpsycho = getCyberpunkTemplate('cyberpsycho');
      expect(cyberpsycho).toBeDefined();
      expect(cyberpsycho?.stats.body).toBe(11);
      expect(cyberpsycho?.stats.bodySp).toBe(14);
      expect(cyberpsycho?.stats.emp).toBe(0);

      const cop = getCyberpunkTemplate('cop_patrol');
      expect(cop).toBeDefined();
      expect(cop?.stats.bodySp).toBe(11);

      const booster = getCyberpunkTemplate('boosterganger');
      expect(booster).toBeDefined();
      expect(booster?.stats.bodySp).toBe(4);
    });
  });
});
