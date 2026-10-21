import { describe, it, expect } from 'vitest';
import {
  getRuleEngine,
  registerRuleEngine,
  getAllRuleEngines,
  dnd5e2024Engine,
  cyberpunkRedEngine,
  pathfinder2eEngine,
  calculateInitiative,
  calculateHitAgainstAc,
  sortCandidatesByInitiative,
  CYBERPUNK_STARTER_NPCS,
  getPathfinderCreature,
} from '../systems';
import {
  UniversalCreature,
  SystemRuleEngine,
  SystemMetadata,
  InitiativeResult,
  CheckResult,
  HitCalculationResult,
  DamageResolutionResult,
  RollContext,
} from '../types/system';

describe('Stage 4 - Multi-System End-to-End Combat Integration Scenarios', () => {
  // =========================================================================
  // SCENARIO 1: D&D 2024 Full Combat Flow
  // =========================================================================
  describe('Scenario D&D 2024: Paladin vs Goblin Skirmisher', () => {
    const createPaladin = (): UniversalCreature => ({
      id: 'paladin-seraphina',
      name: 'Серафина (Паладин)',
      systemId: 'dnd5e_2024',
      systemVersion: '2.0.0',
      isPlayer: true,
      stats: {
        ac: 18,
        hp: 28,
        maxHp: 28,
        tempHp: 0,
        str: 16,
        dex: 12,
        con: 14,
        int: 10,
        wis: 12,
        cha: 16,
        initBonus: 1,
        passiveInit: 11,
      },
      resources: {
        hp: { current: 28, max: 28, temp: 0, resetOn: 'long_rest' },
        spellSlots_1: { current: 4, max: 4, resetOn: 'long_rest' },
        spellSlots_2: { current: 2, max: 2, resetOn: 'long_rest' },
        layOnHands: { current: 15, max: 15, resetOn: 'long_rest' },
      },
      tracks: {
        deathSaves: { name: 'Death Saves', current: 0, max: 3 },
      },
      conditions: [],
      defenses: {
        damageImmunities: [],
        damageResistances: ['fire'],
        damageVulnerabilities: ['necrotic'],
        conditionImmunities: ['frightened'],
        damageReductions: {},
      },
      actions: [
        {
          id: 'longsword_slash',
          name: 'Удар длинным мечом',
          actionType: 'action',
          attackBonus: 5,
          damageDice: '1d8+3',
          damageType: 'slashing',
        },
      ],
      senses: {},
      speeds: { walk: 30 },
      notes: 'Паладин Клятвы Преданности',
      customFields: {},
    });

    const createGoblin = (): UniversalCreature => ({
      id: 'goblin-skirmisher',
      name: 'Гоблин-разведчик',
      systemId: 'dnd5e_2024',
      systemVersion: '2.0.0',
      isPlayer: false,
      stats: {
        ac: 15,
        hp: 7,
        maxHp: 7,
        tempHp: 0,
        str: 8,
        dex: 14,
        con: 10,
        int: 10,
        wis: 8,
        cha: 8,
        initBonus: 2,
        passiveInit: 12,
      },
      resources: {
        hp: { current: 7, max: 7, resetOn: 'long_rest' },
      },
      tracks: {
        deathSaves: { name: 'Death Saves', current: 0, max: 3 },
      },
      conditions: [],
      defenses: {
        damageImmunities: [],
        damageResistances: ['poison'],
        damageVulnerabilities: [],
        conditionImmunities: [],
        damageReductions: {},
      },
      actions: [
        {
          id: 'scimitar',
          name: 'Скимитар',
          actionType: 'action',
          attackBonus: 4,
          damageDice: '1d6+2',
          damageType: 'slashing',
        },
      ],
      senses: {},
      speeds: { walk: 30 },
      notes: 'Проворный гоблин с засады',
      customFields: {},
    });

    it('Step 1: rolls initiative with decimal tie-breaker and handles exact tie resolution', () => {
      const paladin = createPaladin();
      const goblin = createGoblin();

      // Paladin rolls 12: roll 12 + initBonus 1 + (passiveInit 11 / 100) = 13.11
      const paladinInit = dnd5e2024Engine.calculateInitiative(paladin, 12);
      expect(paladinInit.rolledValue).toBe(12);
      expect(paladinInit.bonus).toBe(1);
      expect(paladinInit.tieBreaker).toBe(0.11);
      expect(paladinInit.total).toBe(13.11);

      // Goblin rolls 11: roll 11 + initBonus 2 + (passiveInit 12 / 100) = 13.12
      const goblinInit = dnd5e2024Engine.calculateInitiative(goblin, 11);
      expect(goblinInit.rolledValue).toBe(11);
      expect(goblinInit.bonus).toBe(2);
      expect(goblinInit.tieBreaker).toBe(0.12);
      expect(goblinInit.total).toBe(13.12);

      // Goblin wins initiative by 0.01 fractional tie-breaker!
      expect(goblinInit.total).toBeGreaterThan(paladinInit.total);

      // Verify initiative sorting order
      const sorted = sortCandidatesByInitiative([
        { id: paladin.id, initiative: paladinInit.total, dexBonus: 1, passiveInit: 11 },
        { id: goblin.id, initiative: goblinInit.total, dexBonus: 2, passiveInit: 12 },
      ]);
      expect(sorted[0].id).toBe(goblin.id);
      expect(sorted[1].id).toBe(paladin.id);

      // Direct tie-breaker function test: identical rolls with distinct passiveInit
      const tie1 = calculateInitiative(10, 2, 14); // 12.14
      const tie2 = calculateInitiative(10, 2, 12); // 12.12
      expect(tie1).toBe(12.14);
      expect(tie2).toBe(12.12);
      expect(tie1).toBeGreaterThan(tie2);
    });

    it('Step 2: resolves attack rolls vs AC with hit, miss, and natural 20 critical hit', () => {
      const paladin = createPaladin(); // AC 18
      const goblin = createGoblin();   // AC 15

      // Goblin attacks Paladin: attack roll 19 vs AC 18 -> Hit
      const goblinHit = dnd5e2024Engine.calculateHit(19, paladin);
      expect(goblinHit.isHit).toBe(true);
      expect(goblinHit.isCritical).toBe(false);

      // Goblin attacks Paladin: attack roll 17 vs AC 18 -> Miss
      const goblinMiss = dnd5e2024Engine.calculateHit(17, paladin);
      expect(goblinMiss.isHit).toBe(false);

      // Paladin attacks Goblin: attack roll 16 vs AC 15 -> Hit
      const paladinHit = dnd5e2024Engine.calculateHit(16, goblin);
      expect(paladinHit.isHit).toBe(true);

      // Verify direct calculateHitAgainstAc helper
      const directHit = calculateHitAgainstAc(16, 15);
      expect(directHit.isHit).toBe(true);
      expect(directHit.degree).toBe('success');

      // Paladin rolls Natural 20 -> Critical Hit regardless of AC
      const paladinCrit = dnd5e2024Engine.calculateHit(20, goblin, true);
      expect(paladinCrit.isHit).toBe(true);
      expect(paladinCrit.isCritical).toBe(true);
      expect(paladinCrit.degree).toBe('critical_success');
    });

    it('Step 3: applies damage pipeline with half damage on resistance and temp HP absorption', () => {
      const paladin = createPaladin(); // HP 28, Fire Resistance
      expect(paladin.defenses.damageResistances).toContain('fire');

      // 1. Goblin Shaman casts fire bolt dealing 14 fire damage
      // Fire resistance halves damage to floor(14 / 2) = 7
      const { updatedCreature: burnedPaladin, result: fireRes } = dnd5e2024Engine.applyDamage(
        paladin,
        14,
        'fire'
      );
      expect(fireRes.effectiveDamage).toBe(7);
      expect(fireRes.hpDamage).toBe(7);
      expect(burnedPaladin.stats.hp).toBe(21);
      expect(burnedPaladin.resources.hp.current).toBe(21);

      // 2. Paladin gains 10 Temp HP (e.g. from Heroism or Inspiring Leader)
      const shieldedPaladin: UniversalCreature = {
        ...burnedPaladin,
        stats: { ...burnedPaladin.stats, tempHp: 10 },
        resources: {
          ...burnedPaladin.resources,
          hp: { ...burnedPaladin.resources.hp, temp: 10 },
        },
      };

      // 3. Takes 15 necrotic damage (Vulnerability: 15 * 2 = 30)
      // 10 absorbed by temp HP, remaining 20 hits HP -> HP becomes 1
      const { updatedCreature: woundedPaladin, result: vulnRes } = dnd5e2024Engine.applyDamage(
        shieldedPaladin,
        15,
        'necrotic'
      );
      expect(vulnRes.effectiveDamage).toBe(30);
      expect(vulnRes.tempHpAbsorbed).toBe(10);
      expect(vulnRes.hpDamage).toBe(20);
      expect(woundedPaladin.stats.hp).toBe(1);
      expect(woundedPaladin.stats.tempHp).toBe(0);
      expect(woundedPaladin.resources.hp.current).toBe(1);
    });

    it('Step 4: applies 2024 Dazed and Exhaustion (-2 per level) mechanics', () => {
      let paladin = createPaladin();

      // Verify D&D 2024 feature flags
      expect(dnd5e2024Engine.isDazedConditionSupported()).toBe(true);
      expect(dnd5e2024Engine.isWeaponMasterySupported()).toBe(true);

      // Apply Dazed condition
      paladin = {
        ...paladin,
        conditions: [
          ...paladin.conditions,
          {
            id: 'dazed',
            name: 'Dazed',
            level: 1,
            notes: 'Может только перемещаться или совершить одно действие. Без реакций.',
          },
        ],
      };
      expect(paladin.conditions.some((c) => c.id === 'dazed')).toBe(true);

      // Apply Exhaustion level 2: in 2024 rules, exhaustion gives -2 per level to all d20 tests (-4)
      paladin = {
        ...paladin,
        conditions: [
          ...paladin.conditions,
          { id: 'exhaustion', name: 'Exhaustion', level: 2 },
        ],
      };
      expect(dnd5e2024Engine.getExhaustionLevel(paladin)).toBe(2);

      // Check with STR (score 16 -> modifier +3):
      // With level 2 exhaustion (-4), effective bonus is 3 - 4 = -1
      const checkResult = dnd5e2024Engine.resolveCheck('str', paladin, 10, {
        rollMode: 'normal',
      });
      expect(checkResult.bonus).toBe(-1);
      expect(checkResult.total).toBe(checkResult.rolledValue - 1);
    });

    it('Step 5: long rest restores HP, resets spell slots, clears death saves, and reduces exhaustion', () => {
      // Simulate battered Paladin who spent spell slots and failed 2 death saves
      const batteredPaladin: UniversalCreature = {
        ...createPaladin(),
        stats: { ac: 18, hp: 5, maxHp: 28, tempHp: 3 },
        resources: {
          hp: { current: 5, max: 28, temp: 3, resetOn: 'long_rest' },
          spellSlots_1: { current: 0, max: 4, resetOn: 'long_rest' }, // Fully depleted
          spellSlots_2: { current: 0, max: 2, resetOn: 'long_rest' }, // Fully depleted
          layOnHands: { current: 2, max: 15, resetOn: 'long_rest' },
        },
        tracks: {
          deathSaves: { name: 'Death Saves', current: 2, max: 3 }, // 2 accumulated marks
        },
        conditions: [
          { id: 'exhaustion', name: 'Exhaustion', level: 2 },
          { id: 'dazed', name: 'Dazed', level: 1 },
        ],
      };

      // Apply Long Rest
      const [rested] = dnd5e2024Engine.applyRest([batteredPaladin], 'long');

      // 1. HP fully restored, temp HP cleared
      expect(rested.stats.hp).toBe(28);
      expect(rested.resources.hp.current).toBe(28);
      expect(rested.stats.tempHp).toBe(0);
      expect(rested.resources.hp.temp).toBe(0);

      // 2. Spell slots completely restored to maximum
      expect(rested.resources.spellSlots_1.current).toBe(4);
      expect(rested.resources.spellSlots_2.current).toBe(2);
      expect(rested.resources.layOnHands.current).toBe(15);

      // 3. Death saves track reset to 0
      expect(rested.tracks.deathSaves?.current).toBe(0);

      // 4. Exhaustion reduced from level 2 to level 1
      const remainingExhaustion = rested.conditions.find((c) => c.id === 'exhaustion');
      expect(remainingExhaustion?.level).toBe(1);

      // Second long rest removes exhaustion completely
      const [fullyRecovered] = dnd5e2024Engine.applyRest([rested], 'long');
      expect(fullyRecovered.conditions.some((c) => c.id === 'exhaustion')).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO 2: Cyberpunk RED Full Combat Flow
  // =========================================================================
  describe('Scenario Cyberpunk RED: Solo vs Boosterganger', () => {
    const createSolo = (): UniversalCreature => ({
      ...CYBERPUNK_STARTER_NPCS['solo_veteran'],
      id: 'solo-silverhand',
      name: 'Морган (Solo)',
      isPlayer: true,
      stats: {
        ...CYBERPUNK_STARTER_NPCS['solo_veteran'].stats,
        ref: 8,
        body: 8,
        luck: 5,
        bodySp: 11,
        headSp: 11,
        hp: 45,
        maxHp: 45,
      },
      resources: {
        ...CYBERPUNK_STARTER_NPCS['solo_veteran'].resources,
        hp: { current: 45, max: 45, resetOn: 'dawn' },
        luck: { current: 5, max: 5 },
        spBody: { current: 11, max: 11 },
        spHead: { current: 11, max: 11 },
      },
    });

    const createBooster = (): UniversalCreature => ({
      ...CYBERPUNK_STARTER_NPCS['boosterganger'],
      id: 'booster-choom',
      name: 'Бустергенгер (Boosterganger)',
      isPlayer: false,
      stats: {
        ...CYBERPUNK_STARTER_NPCS['boosterganger'].stats,
        ref: 6,
        body: 6,
        will: 4,
        luck: 2,
        bodySp: 4,
        headSp: 4,
        hp: 35,
        maxHp: 35,
        evasion: 8,
      },
      resources: {
        ...CYBERPUNK_STARTER_NPCS['boosterganger'].resources,
        hp: { current: 35, max: 35, resetOn: 'dawn' },
        luck: { current: 2, max: 2 },
        spBody: { current: 4, max: 4 },
        spHead: { current: 4, max: 4 },
      },
    });

    it('Step 1: rolls initiative (REF + 1d10 + REF/100) with Solo winning priority', () => {
      const solo = createSolo();
      const booster = createBooster();

      // Solo (REF 8) rolls 7 -> 7 + 8 + 0.08 = 15.08
      const soloInit = cyberpunkRedEngine.calculateInitiative(solo, 7);
      expect(soloInit.rolledValue).toBe(7);
      expect(soloInit.bonus).toBe(8);
      expect(soloInit.tieBreaker).toBe(0.08);
      expect(soloInit.total).toBe(15.08);

      // Boosterganger (REF 6) rolls 8 -> 8 + 6 + 0.06 = 14.06
      const boosterInit = cyberpunkRedEngine.calculateInitiative(booster, 8);
      expect(boosterInit.rolledValue).toBe(8);
      expect(boosterInit.bonus).toBe(6);
      expect(boosterInit.tieBreaker).toBe(0.06);
      expect(boosterInit.total).toBe(14.06);

      // Solo acts first
      expect(soloInit.total).toBeGreaterThan(boosterInit.total);
    });

    it('Step 2 & 3: attack exceeds Body SP, ablating armor by 1 and dealing HP damage', () => {
      const booster = createBooster(); // Body SP 4, Head SP 4, HP 35

      // 1. Ranged attack vs Range DV (e.g. Standard DV 13 at 7-12m)
      const boosterAtRange: UniversalCreature = {
        ...booster,
        stats: { ...booster.stats, dv: 13 },
      };
      const rangedHit = cyberpunkRedEngine.calculateHit(17, boosterAtRange);
      expect(rangedHit.isHit).toBe(true);

      // 2. Close quarters dodged attack vs Booster defense (DEX 6 + Evasion 8 + 10 = 24)
      const meleeHit = cyberpunkRedEngine.calculateHit(25, booster);
      expect(meleeHit.isHit).toBe(true);
      const meleeMiss = cyberpunkRedEngine.calculateHit(20, booster);
      expect(meleeMiss.isHit).toBe(false);

      // Solo fires Heavy Pistol dealing 15 damage to Body (Body SP is 4)
      // Damage 15 > SP 4:
      // - Excess damage to HP = 15 - 4 = 11 HP damage
      // - Body SP ablates by 1 (4 -> 3)
      // - Head SP remains untouched (4)
      const { updatedCreature: shotBooster, result: shotResult } = cyberpunkRedEngine.applyDamage(
        booster,
        15,
        'kinetic',
        'body'
      );

      expect(shotResult.effectiveDamage).toBe(11);
      expect(shotResult.hpDamage).toBe(11);
      expect(shotResult.armorDamage).toBe(1);
      expect(shotResult.appliedToZone).toBe('body');

      expect(shotBooster.stats.hp).toBe(24); // 35 - 11 = 24
      expect(shotBooster.stats.bodySp).toBe(3); // 4 - 1 = 3
      expect(shotBooster.stats.headSp).toBe(4); // Head armor untouched
    });

    it('Step 4: triggers Seriously Wounded (<= 50% HP) threshold applying -2 penalty to actions', () => {
      // Boosterganger maxHp = 35. 50% threshold is Math.floor(35 / 2) = 17 HP
      const injuredBooster: UniversalCreature = {
        ...createBooster(),
        stats: {
          ...createBooster().stats,
          hp: 24,
          bodySp: 3,
        },
        resources: {
          ...createBooster().resources,
          hp: { current: 24, max: 35, resetOn: 'dawn' },
          spBody: { current: 3, max: 4 },
        },
      };

      // Second shot: 12 damage to Body vs ablated SP 3:
      // Excess damage = 12 - 3 = 9. HP becomes 24 - 9 = 15 (which is <= 17)
      const { updatedCreature: criticallyInjured, result: secondShotResult } =
        cyberpunkRedEngine.applyDamage(injuredBooster, 12, 'kinetic', 'body');

      expect(secondShotResult.hpDamage).toBe(9);
      expect(criticallyInjured.stats.hp).toBe(15);
      expect(criticallyInjured.stats.bodySp).toBe(2);

      // Verification of Seriously Wounded state
      expect(secondShotResult.statusEffectsApplied).toContain('Seriously Wounded');
      expect(criticallyInjured.customFields.isSeriouslyWounded).toBe(true);
      expect(cyberpunkRedEngine.getWoundState(criticallyInjured)).toBe('seriously_wounded');
      expect(cyberpunkRedEngine.getWoundPenalty(criticallyInjured)).toBe(-2);

      // Boosterganger tries to shoot back with Handgun (REF 6 + Handgun 4 = base 10)
      // Seriously Wounded applies -2 penalty -> effective bonus = 8
      const returnFire = cyberpunkRedEngine.resolveCheck('ref', criticallyInjured, 15, {
        rollMode: 'normal',
        skillBonus: 4,
        rollOverride: 6,
      });

      // Effective bonus includes the -2 wound penalty: 6 + 4 - 2 = 8
      expect(returnFire.bonus).toBe(8);
      expect(returnFire.total).toBe(14); // 6 + 8 = 14 (fails DV 15 by 1)
      expect(returnFire.degreeOfSuccess).toBe('failure');
    });

    it('Step 5: spends Luck points from pool to modify check outcome and turn failure to success', () => {
      let solo = createSolo(); // REF 8, Luck 5
      expect(solo.resources.luck.current).toBe(5);

      // Solo attempts crucial sniper shot against DV 16:
      // Base REF 8. Rolls 6. Without luck: 6 + 8 = 14 (failure vs DV 16).
      // Solo spends 3 Luck points:
      solo = cyberpunkRedEngine.spendLuck(solo, 3);
      expect(solo.resources.luck.current).toBe(2); // Reduced from 5 to 2

      // Check resolution with 3 Luck added:
      const luckyCheck = cyberpunkRedEngine.resolveCheck('ref', solo, 16, {
        rollMode: 'normal',
        rollOverride: 6,
        luckSpend: 3,
      });

      // Bonus: 8 + 3 = 11. Total: 6 + 11 = 17 vs DV 16 -> Success!
      expect(luckyCheck.bonus).toBe(11);
      expect(luckyCheck.total).toBe(17);
      expect(luckyCheck.degreeOfSuccess).toBe('success');
      expect(luckyCheck.margin).toBe(1);
    });
  });

  // =========================================================================
  // SCENARIO 3: Pathfinder 2e Full Combat Flow
  // =========================================================================
  describe('Scenario Pathfinder 2e: Fighter vs Orc Brute', () => {
    const createFighter = (): UniversalCreature => ({
      id: 'fighter-valeros',
      name: 'Валерос (Боец)',
      systemId: 'pathfinder2e',
      systemVersion: '1.0.0',
      isPlayer: true,
      stats: {
        level: 1,
        hp: 20,
        maxHp: 20,
        ac: 18, // Heavy armor + shield raised
        perception: 6,
        initiative: 6,
        conMod: 2,
        attack_longsword: 9,
      },
      resources: {
        hp: { current: 20, max: 20, resetOn: 'long_rest' },
        actions: { current: 3, max: 3, resetOn: 'turn' },
      },
      tracks: {},
      conditions: [],
      defenses: {
        damageImmunities: [],
        damageResistances: [],
        damageVulnerabilities: [],
        conditionImmunities: [],
        damageReductions: {},
      },
      actions: [
        {
          id: 'strike',
          name: 'Удар длинным мечом',
          actionType: 'action',
          attackBonus: 9,
          damageDice: '1d8+4',
          damageType: 'slashing',
        },
      ],
      senses: { perception: 6 },
      speeds: { walk: 25 },
      notes: 'Легендарный воин PF2e',
      customFields: { level: 1 },
    });

    const getOrc = (): UniversalCreature => {
      const orc = getPathfinderCreature('orc_brute');
      if (!orc) throw new Error('Orc Brute starter creature not found in registry');
      return JSON.parse(JSON.stringify(orc));
    };

    it('Step 1: rolls initiative using Perception with fractional tie-breaker', () => {
      const fighter = createFighter(); // Perception 6
      const orc = getOrc();             // Perception 3

      // Fighter rolls 14 -> 14 + 6 + 0.06 = 20.06
      const fighterInit = pathfinder2eEngine.calculateInitiative(fighter, 14);
      expect(fighterInit.rolledValue).toBe(14);
      expect(fighterInit.bonus).toBe(6);
      expect(fighterInit.tieBreaker).toBe(0.06);
      expect(fighterInit.total).toBe(20.06);

      // Orc rolls 10 -> 10 + 3 + 0.03 = 13.03
      const orcInit = pathfinder2eEngine.calculateInitiative(orc, 10);
      expect(orcInit.rolledValue).toBe(10);
      expect(orcInit.bonus).toBe(3);
      expect(orcInit.tieBreaker).toBe(0.03);
      expect(orcInit.total).toBe(13.03);

      expect(fighterInit.total).toBeGreaterThan(orcInit.total);
    });

    it('Step 2: attack roll exceeds AC by >= 10 achieving Critical Success with double damage', () => {
      const orc = getOrc(); // AC 15, HP 15

      // Fighter attack check: base bonus +9. Rolls 16 -> total attack = 25
      // 25 vs AC 15: 25 >= 15 + 10 -> Critical Success!
      const hitResult = pathfinder2eEngine.calculateHit(25, orc);
      expect(hitResult.isHit).toBe(true);
      expect(hitResult.isCritical).toBe(true);
      expect(hitResult.degree).toBe('critical_success');

      // Regular damage would be 1d8+4 = 8.
      // On Critical Success, PF2e doubles all damage: 8 * 2 = 16!
      const rawCritDamage = 16;
      const { updatedCreature: smashedOrc, result: critDmgRes } = pathfinder2eEngine.applyDamage(
        orc,
        rawCritDamage,
        'slashing',
        'critical'
      );

      expect(critDmgRes.effectiveDamage).toBe(16);
      expect(smashedOrc.stats.hp).toBe(0); // 15 - 16 capped at 0
    });

    it('Step 3: manages 3-action economy expenditure and Multi-Attack Penalty (MAP)', () => {
      let remainingActions = 3;

      // Validate initial 3-action affordability
      expect(pathfinder2eEngine.canTakeAction(remainingActions, 1)).toBe(true);
      expect(pathfinder2eEngine.canTakeAction(remainingActions, 3)).toBe(true);

      // Action 1: Strike with Longsword (Cost 1 action)
      // MAP on 1st attack = 0
      expect(pathfinder2eEngine.getMultipleAttackPenalty(1, false)).toBe(0);
      remainingActions -= 1;
      expect(remainingActions).toBe(2);

      // Action 2: Second Strike (Cost 1 action)
      // MAP on 2nd attack = -5 (-4 for agile)
      expect(pathfinder2eEngine.getMultipleAttackPenalty(2, false)).toBe(-5);
      expect(pathfinder2eEngine.getMultipleAttackPenalty(2, true)).toBe(-4);
      remainingActions -= 1;
      expect(remainingActions).toBe(1);

      // Action 3: Raise a Shield (Cost 1 action)
      remainingActions -= 1;
      expect(remainingActions).toBe(0);

      // Can no longer afford any standard actions
      expect(pathfinder2eEngine.canTakeAction(remainingActions, 1)).toBe(false);
      expect(pathfinder2eEngine.canTakeAction(remainingActions, 2)).toBe(false);

      // Free actions and reactions are still available outside turn action pool
      expect(pathfinder2eEngine.canTakeAction(remainingActions, 'free')).toBe(true);
      expect(pathfinder2eEngine.canTakeAction(remainingActions, 'reaction')).toBe(true);
    });

    it('Step 4: handles Dying condition progression from critical knockdown to fatality', () => {
      const orc = getOrc(); // HP 15

      // 1. Critical hit reduces HP to 0 -> applies Dying 2 (zone = 'critical')
      const { updatedCreature: dyingOrc, result: downResult } = pathfinder2eEngine.applyDamage(
        orc,
        18,
        'slashing',
        'critical'
      );

      expect(dyingOrc.stats.hp).toBe(0);
      expect(dyingOrc.customFields.isDying).toBe(true);
      expect(dyingOrc.customFields.isDead).toBe(false);
      expect(downResult.statusEffectsApplied).toContain('Dying 2');
      expect(pathfinder2eEngine.getConditionLevel(dyingOrc, 'dying')).toBe(2);

      // 2. Orc with existing Wounded 1 condition drops to 0 HP:
      // Base Dying 1 + Wounded 1 = Dying 2
      let woundedOrc = getOrc();
      woundedOrc = pathfinder2eEngine.setConditionLevel(woundedOrc, 'wounded', 1);

      const { updatedCreature: woundedDown } = pathfinder2eEngine.applyDamage(
        woundedOrc,
        15,
        'bludgeoning'
      );
      expect(pathfinder2eEngine.getConditionLevel(woundedDown, 'dying')).toBe(2);

      // 3. Wounded 3 creature drops to 0 HP:
      // Base Dying 1 + Wounded 3 = Dying 4 -> Instant death!
      let mortallyWoundedOrc = getOrc();
      mortallyWoundedOrc = pathfinder2eEngine.setConditionLevel(mortallyWoundedOrc, 'wounded', 3);

      const { updatedCreature: deadOrc, result: deadResult } = pathfinder2eEngine.applyDamage(
        mortallyWoundedOrc,
        15,
        'slashing'
      );
      expect(deadResult.statusEffectsApplied).toContain('Dead');
      expect(deadOrc.customFields.isDead).toBe(true);
      expect(deadOrc.customFields.isDying).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO 4: Dynamic System Extensibility
  // =========================================================================
  describe('Scenario Extensibility: Dynamic Registration of Custom Rule Engine (Call of Cthulhu D100)', () => {
    // Custom D100 Call of Cthulhu Rule Engine stub implementing SystemRuleEngine interface
    class CallOfCthulhuD100Engine implements SystemRuleEngine {
      public metadata: SystemMetadata = {
        id: 'call_of_cthulhu_7e',
        name: 'Call of Cthulhu (7th Edition)',
        shortName: 'CoC 7e',
        family: 'custom',
        edition: '7th Edition Quickstart / BRP',
        version: '1.0.0',
        status: 'stable',
        themeId: 'cthulhu-dark',
        description: 'Percentile D100 roll-under system with Sanity loss, extreme successes, and lethal combat.',
        author: 'Chaosium Inc. / Community Plugin',
        supportedFeatures: {
          spellSlots: false,
          weaponMastery: false,
          armorAblation: false,
          degreesOfSuccess: true,
          deathSaveTrack: false,
          humanityTrack: true, // Sanity track
          actionEconomy: 'action_points',
        },
      };

      calculateInitiative(creature: UniversalCreature, rollOverride?: number): InitiativeResult {
        // CoC initiative is purely DEX ranking (highest DEX acts first) with fractional tie-breaker
        const dex = creature.stats.dex ?? 50;
        const rolledValue = typeof rollOverride === 'number' ? rollOverride : 0;
        const tieBreaker = Number((dex / 1000).toFixed(3));
        const total = Number((dex + tieBreaker).toFixed(3));

        return {
          total,
          rolledValue,
          bonus: dex,
          tieBreaker,
        };
      }

      resolveCheck(
        statKey: string,
        creature: UniversalCreature,
        _dc?: number,
        context?: RollContext
      ): CheckResult {
        const stats = creature.stats || {};
        const skillValue = stats[statKey.toLowerCase()] ?? stats[statKey] ?? 50;

        // D100 roll: override via situationalBonus or default to 35
        const roll = typeof context?.situationalBonus === 'number' && context.situationalBonus > 0
          ? context.situationalBonus
          : 35;

        // D100 Degrees of success:
        // - Critical: 01
        // - Extreme: <= skill / 5
        // - Hard: <= skill / 2
        // - Regular Success: <= skill
        // - Failure: > skill
        // - Fumble: 96-100 (or 100 if skill >= 50)
        const isCriticalSuccess = roll === 1;
        const isExtreme = roll <= Math.floor(skillValue / 5);
        const isHard = roll <= Math.floor(skillValue / 2);
        const isRegular = roll <= skillValue;
        const isCriticalFailure = skillValue < 50 ? roll >= 96 : roll === 100;

        let degreeOfSuccess: CheckResult['degreeOfSuccess'];
        if (isCriticalSuccess || isExtreme) {
          degreeOfSuccess = 'critical_success';
        } else if (isHard || isRegular) {
          degreeOfSuccess = 'success';
        } else if (isCriticalFailure) {
          degreeOfSuccess = 'critical_failure';
        } else {
          degreeOfSuccess = 'failure';
        }

        return {
          total: roll,
          rolledValue: roll,
          bonus: skillValue,
          isCriticalSuccess: isCriticalSuccess || isExtreme,
          isCriticalFailure,
          degreeOfSuccess,
          margin: skillValue - roll,
        };
      }

      calculateHit(
        attackRoll: number,
        target: UniversalCreature,
        _isCritRoll = false
      ): HitCalculationResult {
        const dodgeSkill = target.stats.dodge ?? 25;
        // In CoC: attacker hits if attack roll succeeds and exceeds dodge
        const isHit = attackRoll <= 50 && attackRoll < (100 - dodgeSkill);
        const isCritical = attackRoll <= 5;
        const isFumble = attackRoll >= 96;

        return {
          isHit,
          isCritical,
          isFumble,
          degree: isHit ? (isCritical ? 'critical_success' : 'success') : 'failure',
          details: isHit ? `D100 Попадание (${attackRoll}%)` : `D100 Промах (${attackRoll}%)`,
        };
      }

      applyDamage(
        target: UniversalCreature,
        rawDamage: number,
        _damageType: string = 'kinetic',
        _zone?: string
      ): { updatedCreature: UniversalCreature; result: DamageResolutionResult } {
        const currentHp = target.stats.hp ?? target.resources.hp?.current ?? 10;
        const maxHp = target.stats.maxHp ?? target.resources.hp?.max ?? currentHp;
        const newHp = Math.max(0, currentHp - rawDamage);

        // In CoC: Major Wound triggered if single hit >= Max HP / 2
        const isMajorWound = rawDamage >= Math.floor(maxHp / 2);
        const isDying = newHp <= 0;

        const statusEffectsApplied: string[] = [];
        if (isMajorWound) statusEffectsApplied.push('Major Wound');
        if (isDying) statusEffectsApplied.push('Unconscious / Dying');

        const updatedCreature: UniversalCreature = {
          ...target,
          stats: { ...target.stats, hp: newHp },
          resources: {
            ...target.resources,
            hp: { current: newHp, max: maxHp, resetOn: 'long_rest' },
          },
          customFields: {
            ...target.customFields,
            majorWound: isMajorWound,
            isUnconscious: isDying,
          },
        };

        return {
          updatedCreature,
          result: {
            hpDamage: rawDamage,
            tempHpAbsorbed: 0,
            armorDamage: 0,
            effectiveDamage: rawDamage,
            isCriticalWound: isMajorWound,
            statusEffectsApplied,
          },
        };
      }
    }

    it('dynamically registers custom rule engine without modifying any core files', () => {
      const cocEngine = new CallOfCthulhuD100Engine();

      // Register engine at runtime
      registerRuleEngine(cocEngine);

      // Verify retrieval by ID from global registry
      const retrieved = getRuleEngine('call_of_cthulhu_7e');
      expect(retrieved).toBeDefined();
      expect(retrieved?.metadata.id).toBe('call_of_cthulhu_7e');
      expect(retrieved?.metadata.name).toBe('Call of Cthulhu (7th Edition)');
      expect(retrieved?.metadata.family).toBe('custom');

      // Verify presence in all rule engines list
      const allEngines = getAllRuleEngines();
      expect(allEngines.some((e) => e.metadata.id === 'call_of_cthulhu_7e')).toBe(true);
    });

    it('executes full D100 combat flow using the dynamically registered custom engine', () => {
      const cocEngine = getRuleEngine('call_of_cthulhu_7e');
      expect(cocEngine).toBeDefined();

      const investigator: UniversalCreature = {
        id: 'investigator-edward',
        name: 'Эдвард Пирс (Детектив)',
        systemId: 'call_of_cthulhu_7e',
        systemVersion: '1.0.0',
        isPlayer: true,
        stats: {
          hp: 12,
          maxHp: 12,
          dex: 65,
          sanity: 55,
          firearms: 70,
          dodge: 30,
        },
        resources: {
          hp: { current: 12, max: 12, resetOn: 'long_rest' },
          sanity: { current: 55, max: 99 },
          luck: { current: 50, max: 99 },
        },
        tracks: {},
        conditions: [],
        defenses: {
          damageImmunities: [],
          damageResistances: [],
          damageVulnerabilities: [],
          conditionImmunities: [],
          damageReductions: {},
        },
        actions: [],
        senses: {},
        speeds: { walk: 8 },
        notes: 'Частный сыщик из Бостона',
        customFields: {},
      };

      // 1. Initiative: DEX-based ranking (DEX 65 -> 65.065)
      const init = cocEngine!.calculateInitiative(investigator);
      expect(init.total).toBe(65.065);
      expect(init.bonus).toBe(65);

      // 2. Skill Check: Firearms test (Skill 70, roll 12 -> Extreme Success since 12 <= 70 / 5 = 14)
      const shotCheck = cocEngine!.resolveCheck('firearms', investigator, undefined, {
        rollMode: 'normal',
        situationalBonus: 12, // Roll override
      });
      expect(shotCheck.rolledValue).toBe(12);
      expect(shotCheck.isCriticalSuccess).toBe(true);
      expect(shotCheck.degreeOfSuccess).toBe('critical_success');

      // 3. Major Wound lethal damage pipeline:
      // Taking 7 damage (>= 12 / 2 = 6) triggers Major Wound
      const { updatedCreature, result } = cocEngine!.applyDamage(investigator, 7, 'kinetic');
      expect(result.hpDamage).toBe(7);
      expect(updatedCreature.stats.hp).toBe(5);
      expect(result.isCriticalWound).toBe(true);
      expect(result.statusEffectsApplied).toContain('Major Wound');
      expect(updatedCreature.customFields.majorWound).toBe(true);
    });
  });
});
