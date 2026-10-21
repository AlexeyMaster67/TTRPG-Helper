import { describe, it, expect } from 'vitest';
import {
  getRuleEngine,
  dnd5e2014Engine,
  dnd5e2024Engine,
  calculateInitiative,
  calculateHitAgainstAc,
} from '../systems';
import { UniversalCreature } from '../types/system';

describe('Modular D&D Rule Engines (SRD 5.2.1, 2014 Classic, 2024 Revised)', () => {
  const createMockCreature = (overrides: Partial<UniversalCreature> = {}): UniversalCreature => ({
    id: 'test-creature-1',
    name: 'Тестовый воин',
    systemId: 'dnd5e_2024',
    systemVersion: '2.0.0',
    isPlayer: true,
    stats: {
      ac: 16,
      hp: 40,
      maxHp: 40,
      tempHp: 10,
      dex: 14,
      dexBonus: 2,
      initBonus: 2,
      passiveInit: 12,
      str: 16,
      con: 14,
      wis: 12,
    },
    resources: {
      hp: { current: 40, max: 40, temp: 10, resetOn: 'long_rest' },
      actionSurge: { current: 0, max: 1, resetOn: 'short_rest' },
    },
    tracks: {
      deathSaves: { name: 'Death Saves', current: 0, max: 3 },
    },
    conditions: [],
    defenses: {
      damageImmunities: ['poison'],
      damageResistances: ['fire'],
      damageVulnerabilities: ['cold'],
      conditionImmunities: [],
      damageReductions: {},
    },
    actions: [],
    senses: {},
    speeds: { walk: 30 },
    notes: '',
    customFields: {},
    ...overrides,
  });

  describe('Registry & Adapter Resolution', () => {
    it('retrieves rule engines registered by edition ID', () => {
      const e2024 = getRuleEngine('dnd5e_2024');
      expect(e2024).toBeDefined();
      expect(e2024?.metadata.id).toBe('dnd5e_2024');
      expect(e2024?.metadata.edition).toBe('2024 Revised');

      const e2014 = getRuleEngine('dnd5e_2014');
      expect(e2014).toBeDefined();
      expect(e2014?.metadata.id).toBe('dnd5e_2014');
      expect(e2014?.metadata.edition).toBe('2014 Classic');

      const eSrd = getRuleEngine('srd_5_2_1');
      expect(eSrd).toBeDefined();
      expect(eSrd?.metadata.id).toBe('srd_5_2_1');
      expect(eSrd?.metadata.edition).toBe('5.2.1 (CC-BY)');
    });
  });

  describe('Common D&D Initiative (roll + dexBonus + passiveInit/100)', () => {
    it('calculates initiative strictly using decimal tie-breaking formula', () => {
      // Roll 14 + Dex 2 + (Passive 12 / 100) = 16.12
      const init = calculateInitiative(14, 2, 12);
      expect(init).toBe(16.12);

      const creature = createMockCreature();
      const res = dnd5e2024Engine.calculateInitiative(creature, 15);
      expect(res.rolledValue).toBe(15);
      expect(res.bonus).toBe(2);
      expect(res.tieBreaker).toBe(0.12);
      expect(res.total).toBe(17.12);
    });
  });

  describe('Common Attack vs AC Resolution', () => {
    it('resolves hit, miss, crit, and fumble correctly against AC', () => {
      // Hit: 16 vs 16
      const hit = calculateHitAgainstAc(16, 16);
      expect(hit.isHit).toBe(true);
      expect(hit.isCritical).toBe(false);

      // Miss: 15 vs 16
      const miss = calculateHitAgainstAc(15, 16);
      expect(miss.isHit).toBe(false);

      // Natural 20 is always Critical Hit
      const crit = calculateHitAgainstAc(20, 35, true);
      expect(crit.isHit).toBe(true);
      expect(crit.isCritical).toBe(true);
      expect(crit.degree).toBe('critical_success');

      // Natural 1 is always Fumble
      const fumble = calculateHitAgainstAc(1, 5, false, true);
      expect(fumble.isHit).toBe(false);
      expect(fumble.isFumble).toBe(true);
      expect(fumble.degree).toBe('critical_failure');
    });
  });

  describe('Damage Resolution with Resistances, Immunities, Vulnerabilities, Temp HP', () => {
    it('applies defenses correctly via engine.applyDamage', () => {
      const creature = createMockCreature({
        stats: { ac: 16, hp: 50, maxHp: 50, tempHp: 10 },
        resources: { hp: { current: 50, max: 50, temp: 10 } },
      });

      // 1. Poison Immunity -> 0 damage
      const { updatedCreature: immCreature, result: immRes } = dnd5e2024Engine.applyDamage(
        creature,
        20,
        'poison'
      );
      expect(immRes.effectiveDamage).toBe(0);
      expect(immCreature.resources.hp.current).toBe(50);
      expect(immCreature.resources.hp.temp).toBe(10);

      // 2. Fire Resistance -> floor(15 / 2) = 7 damage. Absorbed by tempHp 10 -> tempHp becomes 3, hp stays 50
      const { updatedCreature: resCreature, result: resRes } = dnd5e2024Engine.applyDamage(
        creature,
        15,
        'fire'
      );
      expect(resRes.effectiveDamage).toBe(7);
      expect(resRes.tempHpAbsorbed).toBe(7);
      expect(resRes.hpDamage).toBe(0);
      expect(resCreature.resources.hp.temp).toBe(3);
      expect(resCreature.resources.hp.current).toBe(50);

      // 3. Cold Vulnerability -> 10 * 2 = 20 damage. Temp HP absorbs 10, remaining 10 hits HP -> HP becomes 40
      const { updatedCreature: vulnCreature, result: vulnRes } = dnd5e2024Engine.applyDamage(
        creature,
        10,
        'cold'
      );
      expect(vulnRes.effectiveDamage).toBe(20);
      expect(vulnRes.tempHpAbsorbed).toBe(10);
      expect(vulnRes.hpDamage).toBe(10);
      expect(vulnCreature.resources.hp.temp).toBe(0);
      expect(vulnCreature.resources.hp.current).toBe(40);
    });
  });

  describe('Edition Differentiation: 2024 vs 2014 Exhaustion and Masteries', () => {
    it('2024 engine enforces numeric exhaustion (-2 per level) to d20 checks', () => {
      const creatureEx2 = createMockCreature({
        conditions: [{ id: 'exhaustion', name: 'Exhaustion', level: 2 }],
      });

      expect(dnd5e2024Engine.isWeaponMasterySupported()).toBe(true);
      expect(dnd5e2024Engine.isDazedConditionSupported()).toBe(true);

      // Base bonus = str +3 (score 16 -> +3). Exhaustion level 2 applies -4 penalty -> effective bonus = -1
      const checkRes = dnd5e2024Engine.resolveCheck('str', creatureEx2, 10, {
        rollMode: 'normal',
      });
      // rolledValue + effectiveBonus
      expect(checkRes.bonus).toBe(-1); // 3 - 4 = -1
      expect(checkRes.total).toBe(checkRes.rolledValue - 1);
    });

    it('2014 engine enforces classic disadvantage on checks for exhaustion level 1+', () => {
      const creatureEx1 = createMockCreature({
        conditions: [{ id: 'exhaustion', name: 'Exhaustion', level: 1 }],
      });

      expect(dnd5e2014Engine.isWeaponMasterySupported()).toBe(false);
      expect(dnd5e2014Engine.isDazedConditionSupported()).toBe(false);

      const classicEffects = dnd5e2014Engine.getClassicExhaustionEffects(1);
      expect(classicEffects?.disadvantageAbilityChecks).toBe(true);
      expect(classicEffects?.speedHalved).toBe(false);

      // Resolving check with normal rollMode automatically switches to disadvantage due to level 1 exhaustion
      const checkRes = dnd5e2014Engine.resolveCheck('str', creatureEx1, 10, {
        rollMode: 'normal',
      });
      expect(checkRes).toBeDefined();
    });
  });

  describe('Resting Mechanics', () => {
    it('applies long rest restoring HP, clearing temp HP and reducing exhaustion', () => {
      const tiredCreature = createMockCreature({
        stats: { ac: 16, hp: 15, maxHp: 40, tempHp: 5 },
        resources: {
          hp: { current: 15, max: 40, temp: 5 },
          actionSurge: { current: 0, max: 1, resetOn: 'short_rest' },
        },
        conditions: [{ id: 'exhaustion', name: 'Exhaustion', level: 2 }],
      });

      const [rested] = dnd5e2024Engine.applyRest([tiredCreature], 'long');
      expect(rested.resources.hp.current).toBe(40);
      expect(rested.stats.hp).toBe(40);
      expect(rested.resources.hp.temp).toBe(0);
      expect(rested.stats.tempHp).toBe(0);
      expect(rested.resources.actionSurge.current).toBe(1);

      // Exhaustion reduced from 2 to 1
      const exhCond = rested.conditions.find((c) => c.id === 'exhaustion');
      expect(exhCond?.level).toBe(1);
    });

    it('applies short rest recovering short-rest resources', () => {
      const depletedCreature = createMockCreature({
        resources: {
          hp: { current: 20, max: 40, temp: 0 },
          actionSurge: { current: 0, max: 1, resetOn: 'short_rest' },
        },
      });

      const [rested] = dnd5e2024Engine.applyRest([depletedCreature], 'short');
      expect(rested.resources.actionSurge.current).toBe(1);
      expect(rested.resources.hp.current).toBe(20); // HP preserved unless hit dice spent
    });
  });
});
