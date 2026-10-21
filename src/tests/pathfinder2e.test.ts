import { describe, it, expect } from 'vitest';
import {
  getRuleEngine,
  pathfinder2eEngine,
  PATHFINDER2E_STARTER_CREATURES,
  getPathfinderCreature,
  getAllPathfinderCreatures,
} from '../systems';
import { UniversalCreature } from '../types/system';

describe('Pathfinder 2e Rule Engine Suite', () => {
  const createMockPf2eCreature = (overrides: Partial<UniversalCreature> = {}): UniversalCreature => {
    const hp = overrides.stats?.hp ?? 20;
    const maxHp = overrides.stats?.maxHp ?? 20;
    const ac = overrides.stats?.ac ?? 16;
    const perception = overrides.stats?.perception ?? 6;

    return {
      id: 'valeros-fighter',
      name: 'Valeros (Fighter)',
      systemId: 'pathfinder2e',
      systemVersion: '1.0.0',
      isPlayer: true,
      stats: {
        str: 4,
        dex: 2,
        con: 2,
        int: -1,
        wis: 1,
        cha: 0,
        ac,
        hp,
        maxHp,
        perception,
        initiative: perception,
        initBonus: perception,
        speed: 25,
        level: 1,
        conMod: 2,
        athletics: 7,
        acrobatics: 5,
        attack_longsword: 9,
        ...overrides.stats,
      },
      resources: {
        hp: { current: hp, max: maxHp, resetOn: 'long_rest' },
        actions: { current: 3, max: 3, resetOn: 'turn' },
        ...overrides.resources,
      },
      tracks: {},
      conditions: [],
      defenses: {
        damageImmunities: [],
        damageResistances: [],
        damageVulnerabilities: [],
        conditionImmunities: [],
        damageReductions: {},
        ...overrides.defenses,
      },
      actions: [
        {
          id: 'strike_longsword',
          name: 'Longsword Strike',
          actionType: 'action',
          attackBonus: 9,
          damageDice: '1d8+4',
          damageType: 'slashing',
        },
      ],
      senses: { perception },
      speeds: { walk: 25 },
      notes: 'Iconic Fighter',
      customFields: {
        level: 1,
        ...overrides.customFields,
      },
      ...overrides,
    };
  };

  describe('Registry & System Metadata', () => {
    it('retrieves Pathfinder 2e engine from central registry', () => {
      const engine = getRuleEngine('pathfinder2e');
      expect(engine).toBeDefined();
      expect(engine?.metadata.id).toBe('pathfinder2e');
      expect(engine?.metadata.family).toBe('pathfinder');
      expect(engine?.metadata.supportedFeatures.degreesOfSuccess).toBe(true);
      expect(engine?.metadata.supportedFeatures.actionEconomy).toBe('three_action');
      expect(engine?.metadata.supportedFeatures.spellSlots).toBe(true);
    });
  });

  describe('Initiative: Perception + 1d20', () => {
    it('calculates initiative based on Perception with tie-breaker', () => {
      const creature = createMockPf2eCreature({
        stats: { perception: 7 },
      });

      // Roll 12 + Perception 7 = 19. Tie-breaker = 0.07 -> 19.07
      const res = pathfinder2eEngine.calculateInitiative(creature, 12);
      expect(res.rolledValue).toBe(12);
      expect(res.bonus).toBe(7);
      expect(res.tieBreaker).toBe(0.07);
      expect(res.total).toBe(19.07);
    });
  });

  describe('4 Degrees of Success & Nat 20 / Nat 1 Promotion/Demotion', () => {
    it('evaluates Critical Success (total >= DC + 10)', () => {
      const creature = createMockPf2eCreature();
      // Athletics 7. Roll 18 -> total 25 vs DC 15 (>= 15 + 10) -> Critical Success
      const res = pathfinder2eEngine.resolveCheck('athletics', creature, 15, {
        rollMode: 'normal',
        rollOverride: 18,
      });

      expect(res.total).toBe(25);
      expect(res.margin).toBe(10);
      expect(res.degreeOfSuccess).toBe('critical_success');
      expect(res.isCriticalSuccess).toBe(true);
    });

    it('evaluates Success (DC <= total < DC + 10)', () => {
      const creature = createMockPf2eCreature();
      // Athletics 7. Roll 10 -> total 17 vs DC 15 -> Success
      const res = pathfinder2eEngine.resolveCheck('athletics', creature, 15, {
        rollMode: 'normal',
        rollOverride: 10,
      });

      expect(res.total).toBe(17);
      expect(res.degreeOfSuccess).toBe('success');
      expect(res.isCriticalSuccess).toBe(false);
      expect(res.isCriticalFailure).toBe(false);
    });

    it('evaluates Failure (DC - 10 < total < DC)', () => {
      const creature = createMockPf2eCreature();
      // Athletics 7. Roll 5 -> total 12 vs DC 15 -> Failure
      const res = pathfinder2eEngine.resolveCheck('athletics', creature, 15, {
        rollMode: 'normal',
        rollOverride: 5,
      });

      expect(res.total).toBe(12);
      expect(res.degreeOfSuccess).toBe('failure');
    });

    it('evaluates Critical Failure (total <= DC - 10)', () => {
      const creature = createMockPf2eCreature();
      // Athletics 7. Roll 2 -> total 9 vs DC 20 (<= 20 - 10) -> Critical Failure
      const res = pathfinder2eEngine.resolveCheck('athletics', creature, 20, {
        rollMode: 'normal',
        rollOverride: 2,
      });

      expect(res.total).toBe(9);
      expect(res.margin).toBe(-11);
      expect(res.degreeOfSuccess).toBe('critical_failure');
      expect(res.isCriticalFailure).toBe(true);
    });

    it('natural 20 promotes degree of success by one step (Failure -> Success)', () => {
      const creature = createMockPf2eCreature();
      // Bonus 1. DC 25. Roll 20 -> total 21 (< 25, which would normally be Failure).
      // Nat 20 promotes Failure to Success!
      const res = pathfinder2eEngine.resolveCheck('wis', creature, 25, {
        rollMode: 'normal',
        rollOverride: 20,
      });

      expect(res.rolledValue).toBe(20);
      expect(res.total).toBe(21);
      expect(res.degreeOfSuccess).toBe('success');
    });

    it('natural 20 promotes Success to Critical Success', () => {
      const creature = createMockPf2eCreature();
      // Athletics 7. DC 25. Roll 20 -> total 27 (>= 25, normally Success).
      // Nat 20 promotes Success to Critical Success!
      const res = pathfinder2eEngine.resolveCheck('athletics', creature, 25, {
        rollMode: 'normal',
        rollOverride: 20,
      });

      expect(res.rolledValue).toBe(20);
      expect(res.degreeOfSuccess).toBe('critical_success');
    });

    it('natural 1 demotes degree of success by one step (Success -> Failure)', () => {
      const creature = createMockPf2eCreature({ stats: { attack_longsword: 15 } });
      // Bonus 15. DC 15. Roll 1 -> total 16 (>= 15, normally Success).
      // Nat 1 demotes Success to Failure!
      const res = pathfinder2eEngine.resolveCheck('attack_longsword', creature, 15, {
        rollMode: 'normal',
        rollOverride: 1,
      });

      expect(res.rolledValue).toBe(1);
      expect(res.total).toBe(16);
      expect(res.degreeOfSuccess).toBe('failure');
    });

    it('natural 1 demotes Failure to Critical Failure', () => {
      const creature = createMockPf2eCreature({ stats: { attack_longsword: 5 } });
      // Bonus 5. DC 10. Roll 1 -> total 6 (< 10, normally Failure).
      // Nat 1 demotes Failure to Critical Failure!
      const res = pathfinder2eEngine.resolveCheck('attack_longsword', creature, 10, {
        rollMode: 'normal',
        rollOverride: 1,
      });

      expect(res.rolledValue).toBe(1);
      expect(res.degreeOfSuccess).toBe('critical_failure');
    });
  });

  describe('3-Action Economy & Multi-Attack Penalty (MAP)', () => {
    it('validates 3-action economy affordability', () => {
      expect(pathfinder2eEngine.canTakeAction(3, 1)).toBe(true);
      expect(pathfinder2eEngine.canTakeAction(3, 3)).toBe(true);
      expect(pathfinder2eEngine.canTakeAction(1, 2)).toBe(false);
      expect(pathfinder2eEngine.canTakeAction(0, 'free')).toBe(true);
      expect(pathfinder2eEngine.canTakeAction(0, 'reaction')).toBe(true);
    });

    it('calculates standard MAP: 0 / -5 / -10', () => {
      expect(pathfinder2eEngine.getMultipleAttackPenalty(1, false)).toBe(0);
      expect(pathfinder2eEngine.getMultipleAttackPenalty(2, false)).toBe(-5);
      expect(pathfinder2eEngine.getMultipleAttackPenalty(3, false)).toBe(-10);
      expect(pathfinder2eEngine.getMultipleAttackPenalty(4, false)).toBe(-10);
    });

    it('calculates Agile weapon MAP: 0 / -4 / -8', () => {
      expect(pathfinder2eEngine.getMultipleAttackPenalty(1, true)).toBe(0);
      expect(pathfinder2eEngine.getMultipleAttackPenalty(2, true)).toBe(-4);
      expect(pathfinder2eEngine.getMultipleAttackPenalty(3, true)).toBe(-8);
      expect(pathfinder2eEngine.getMultipleAttackPenalty(4, true)).toBe(-8);
    });

    it('applies MAP penalty during attack check resolution', () => {
      const creature = createMockPf2eCreature();
      // Base attack 9. 2nd attack without agile -> -5 penalty -> total bonus = 4. Roll 10 -> total = 14
      const resNormal = pathfinder2eEngine.resolveCheck('attack_longsword', creature, 15, {
        rollMode: 'normal',
        rollOverride: 10,
        attackNumber: 2,
        isAgile: false,
      });
      expect(resNormal.bonus).toBe(4);
      expect(resNormal.total).toBe(14);

      // 2nd attack with agile -> -4 penalty -> total bonus = 5. Roll 10 -> total = 15
      const resAgile = pathfinder2eEngine.resolveCheck('attack_longsword', creature, 15, {
        rollMode: 'normal',
        rollOverride: 10,
        attackNumber: 2,
        isAgile: true,
      });
      expect(resAgile.bonus).toBe(5);
      expect(resAgile.total).toBe(15);
    });
  });

  describe('Conditions & Penalty Adjustments', () => {
    it('applies Frightened status penalty to all checks and DCs', () => {
      let creature = createMockPf2eCreature();
      creature = pathfinder2eEngine.setConditionLevel(creature, 'frightened', 2);

      // Athletics 7, Frightened 2 (-2) -> effective bonus 5. Roll 10 -> total 15
      const res = pathfinder2eEngine.resolveCheck('athletics', creature, 15, {
        rollMode: 'normal',
        rollOverride: 10,
      });
      expect(res.bonus).toBe(5);
      expect(res.total).toBe(15);
    });

    it('reduces Frightened condition by 1 at end of turn', () => {
      let creature = createMockPf2eCreature();
      creature = pathfinder2eEngine.setConditionLevel(creature, 'frightened', 2);
      expect(pathfinder2eEngine.getConditionLevel(creature, 'frightened')).toBe(2);

      const ticked = pathfinder2eEngine.tickEndOfTurnConditions(creature);
      expect(pathfinder2eEngine.getConditionLevel(ticked, 'frightened')).toBe(1);

      const tickedAgain = pathfinder2eEngine.tickEndOfTurnConditions(ticked);
      expect(pathfinder2eEngine.getConditionLevel(tickedAgain, 'frightened')).toBe(0);
    });

    it('applies Clumsy condition penalty to DEX-based checks and saves', () => {
      let creature = createMockPf2eCreature();
      creature = pathfinder2eEngine.setConditionLevel(creature, 'clumsy', 2);

      // Acrobatics (DEX) 5, Clumsy 2 (-2) -> effective bonus 3
      const res = pathfinder2eEngine.resolveCheck('dex', creature, 15, {
        rollMode: 'normal',
        rollOverride: 10,
        checkType: 'acrobatics',
      });
      expect(res.bonus).toBe(0); // stats.dex = 2, clumsy = -2 -> 0
    });

    it('applies Enfeebled condition penalty to STR-based checks', () => {
      let creature = createMockPf2eCreature();
      creature = pathfinder2eEngine.setConditionLevel(creature, 'enfeebled', 1);

      // Athletics (STR) 7, Enfeebled 1 (-1) -> effective bonus 6
      const res = pathfinder2eEngine.resolveCheck('athletics', creature, 15, {
        rollMode: 'normal',
        rollOverride: 10,
        checkType: 'athletics',
      });
      expect(res.bonus).toBe(6);
    });
  });

  describe('Attack & Hit Calculation vs AC', () => {
    it('evaluates Critical Hit (>= AC + 10)', () => {
      const target = createMockPf2eCreature({ stats: { ac: 16 } });
      const hit = pathfinder2eEngine.calculateHit(26, target);

      expect(hit.isHit).toBe(true);
      expect(hit.isCritical).toBe(true);
      expect(hit.degree).toBe('critical_success');
    });

    it('evaluates Hit (AC <= attack < AC + 10)', () => {
      const target = createMockPf2eCreature({ stats: { ac: 16 } });
      const hit = pathfinder2eEngine.calculateHit(18, target);

      expect(hit.isHit).toBe(true);
      expect(hit.isCritical).toBe(false);
      expect(hit.degree).toBe('success');
    });

    it('evaluates Miss (AC - 10 < attack < AC)', () => {
      const target = createMockPf2eCreature({ stats: { ac: 16 } });
      const hit = pathfinder2eEngine.calculateHit(12, target);

      expect(hit.isHit).toBe(false);
      expect(hit.isFumble).toBe(false);
      expect(hit.degree).toBe('failure');
    });

    it('evaluates Critical Miss (attack <= AC - 10)', () => {
      const target = createMockPf2eCreature({ stats: { ac: 16 } });
      const hit = pathfinder2eEngine.calculateHit(6, target);

      expect(hit.isHit).toBe(false);
      expect(hit.isFumble).toBe(true);
      expect(hit.degree).toBe('critical_failure');
    });

    it('lowers target effective AC when target is Off-guard or Clumsy', () => {
      let target = createMockPf2eCreature({ stats: { ac: 18 } });
      // Apply Clumsy 1 and Off-guard (-2 circumstance) -> effective AC = 18 - 1 - 2 = 15
      target = pathfinder2eEngine.setConditionLevel(target, 'clumsy', 1);
      target = {
        ...target,
        conditions: [...target.conditions, { id: 'off_guard', name: 'Off-guard', level: 1 }],
      };

      // Attack roll 15 against original AC 18 would miss, but against effective AC 15 it hits!
      const hit = pathfinder2eEngine.calculateHit(15, target);
      expect(hit.isHit).toBe(true);
      expect(hit.degree).toBe('success');
    });
  });

  describe('Damage Pipeline, Weaknesses, Resistances & Dying', () => {
    it('applies standard damage reducing HP', () => {
      const target = createMockPf2eCreature({ stats: { hp: 20, maxHp: 20 } });
      const { updatedCreature, result } = pathfinder2eEngine.applyDamage(target, 8, 'slashing');

      expect(result.effectiveDamage).toBe(8);
      expect(updatedCreature.stats.hp).toBe(12);
    });

    it('respects damage immunity (takes 0 damage)', () => {
      const target = createMockPf2eCreature({
        stats: { hp: 20 },
        defenses: {
          damageImmunities: ['fire'],
          damageResistances: [],
          damageVulnerabilities: [],
          conditionImmunities: [],
          damageReductions: {},
        },
      });

      const { updatedCreature, result } = pathfinder2eEngine.applyDamage(target, 15, 'fire');
      expect(result.effectiveDamage).toBe(0);
      expect(updatedCreature.stats.hp).toBe(20);
    });

    it('triggers weakness extra damage (e.g. Slashing 5)', () => {
      const target = createMockPf2eCreature({
        stats: { hp: 20 },
        customFields: {
          weaknesses: { slashing: 5 },
        },
      });

      // 6 raw damage + 5 weakness = 11 effective damage
      const { updatedCreature, result } = pathfinder2eEngine.applyDamage(target, 6, 'slashing');
      expect(result.effectiveDamage).toBe(11);
      expect(updatedCreature.stats.hp).toBe(9);
    });

    it('triggers resistance damage reduction (e.g. Cold 5)', () => {
      const target = createMockPf2eCreature({
        stats: { hp: 20 },
        customFields: {
          resistances: { cold: 5 },
        },
      });

      // 8 raw damage - 5 resistance = 3 effective damage
      const { updatedCreature, result } = pathfinder2eEngine.applyDamage(target, 8, 'cold');
      expect(result.effectiveDamage).toBe(3);
      expect(updatedCreature.stats.hp).toBe(17);
    });

    it('applies Dying 1 condition when reduced to 0 HP', () => {
      const target = createMockPf2eCreature({ stats: { hp: 5 } });
      const { updatedCreature, result } = pathfinder2eEngine.applyDamage(target, 10, 'piercing');

      expect(updatedCreature.stats.hp).toBe(0);
      expect(updatedCreature.customFields.isDying).toBe(true);
      expect(updatedCreature.customFields.isDead).toBe(false);
      expect(result.statusEffectsApplied).toContain('Dying 1');
      expect(pathfinder2eEngine.getConditionLevel(updatedCreature, 'dying')).toBe(1);
    });

    it('applies Dying 2 when dropping to 0 HP via critical hit', () => {
      const target = createMockPf2eCreature({ stats: { hp: 5 } });
      const { updatedCreature, result } = pathfinder2eEngine.applyDamage(target, 20, 'slashing', 'critical');

      expect(result.statusEffectsApplied).toContain('Dying 2');
      expect(pathfinder2eEngine.getConditionLevel(updatedCreature, 'dying')).toBe(2);
    });

    it('increases Dying value by Wounded value', () => {
      let target = createMockPf2eCreature({ stats: { hp: 5 } });
      target = pathfinder2eEngine.setConditionLevel(target, 'wounded', 1);

      // Dropping to 0 with Wounded 1 -> Dying 1 + 1 = Dying 2
      const { updatedCreature, result } = pathfinder2eEngine.applyDamage(target, 10, 'slashing');
      expect(result.statusEffectsApplied).toContain('Dying 2');
      expect(pathfinder2eEngine.getConditionLevel(updatedCreature, 'dying')).toBe(2);
    });

    it('kills creature when Dying reaches 4', () => {
      let target = createMockPf2eCreature({ stats: { hp: 5 } });
      target = pathfinder2eEngine.setConditionLevel(target, 'wounded', 3);

      // Base Dying 1 + Wounded 3 = Dying 4 -> Instant death!
      const { updatedCreature, result } = pathfinder2eEngine.applyDamage(target, 10, 'slashing');
      expect(result.statusEffectsApplied).toContain('Dead');
      expect(updatedCreature.customFields.isDead).toBe(true);
      expect(updatedCreature.customFields.isDying).toBe(false);
    });
  });

  describe('Resting & Condition Recovery', () => {
    it('restores HP based on Con Mod * Level, reduces Drained by 1, clears Frightened', () => {
      let damaged = createMockPf2eCreature({
        stats: { hp: 5, maxHp: 20, conMod: 2, level: 2 },
      });
      damaged = pathfinder2eEngine.setConditionLevel(damaged, 'drained', 2);
      damaged = pathfinder2eEngine.setConditionLevel(damaged, 'frightened', 1);

      const rested = pathfinder2eEngine.applyRest([damaged], 'long');
      const survivor = rested[0];

      // Heals conMod (2) * level (2) = 4 HP -> 5 + 4 = 9 HP
      expect(survivor.stats.hp).toBe(9);
      // Drained reduced from 2 to 1
      expect(pathfinder2eEngine.getConditionLevel(survivor, 'drained')).toBe(1);
      // Frightened removed
      expect(pathfinder2eEngine.getConditionLevel(survivor, 'frightened')).toBe(0);
    });
  });

  describe('5 Starter Bestiary Creatures', () => {
    it('provides all 5 core creatures', () => {
      const creatures = getAllPathfinderCreatures();
      expect(creatures.length).toBe(5);
      expect(Object.keys(PATHFINDER2E_STARTER_CREATURES).length).toBe(5);
    });

    it('validates Goblin Warrior (Agile Dogslicer, Level -1, AC 16)', () => {
      const goblin = getPathfinderCreature('goblin_warrior');
      expect(goblin).toBeDefined();
      expect(goblin?.stats.ac).toBe(16);
      expect(goblin?.stats.hp).toBe(6);
      expect(goblin?.stats.perception).toBe(3);
      expect(goblin?.actions.some((a) => a.id === 'dogslicer')).toBe(true);
    });

    it('validates Orc Brute (Greataxe, Orc Ferocity, Level 0, HP 15)', () => {
      const orc = getPathfinderCreature('orc_brute');
      expect(orc).toBeDefined();
      expect(orc?.stats.hp).toBe(15);
      expect(orc?.stats.ac).toBe(15);
      expect(orc?.actions.some((a) => a.id === 'orc_ferocity')).toBe(true);
    });

    it('validates Skeleton Guard (Resistances: Cold 5, Piercing 5, Slashing 5)', () => {
      const skeleton = getPathfinderCreature('skeleton_guard');
      expect(skeleton).toBeDefined();
      expect(skeleton?.stats.ac).toBe(16);
      expect(skeleton?.customFields.resistances).toEqual({ cold: 5, piercing: 5, slashing: 5 });
    });

    it('validates Zombie Shambler (Weaknesses: Slashing 5, Positive 5)', () => {
      const zombie = getPathfinderCreature('zombie_shambler');
      expect(zombie).toBeDefined();
      expect(zombie?.stats.hp).toBe(20);
      expect(zombie?.stats.ac).toBe(12);
      expect(zombie?.customFields.weaknesses).toEqual({ slashing: 5, positive: 5 });
    });

    it('validates Young Red Dragon (Level 10, AC 30, HP 210, Fire Immunity, Cold Weakness 10)', () => {
      const dragon = getPathfinderCreature('young_dragon');
      expect(dragon).toBeDefined();
      expect(dragon?.stats.ac).toBe(30);
      expect(dragon?.stats.hp).toBe(210);
      expect(dragon?.defenses.damageImmunities).toContain('fire');
      expect(dragon?.customFields.weaknesses).toEqual({ cold: 10 });
      expect(dragon?.actions.some((a) => a.id === 'dragon_breath')).toBe(true);
    });
  });
});
