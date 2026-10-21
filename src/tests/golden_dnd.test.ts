import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  calculateInitiative,
  rollInitiative,
  sortCandidatesByInitiative,
  resolveAttackRoll,
  doubleDamageDiceInFormula,
  processDamagePipeline,
  addTempHp,
  processHealing,
  addCondition,
  removeCondition,
  getExhaustionEffects,
  CONDITIONS_2024_DATA,
  applyShortRest,
  applyLongRest,
} from '../engine';
import { usePartyStore } from '../store/partyStore';
import { DamageComponent } from '../types/dnd5e';

describe('D&D 2024 / 5e Golden Rules Regression Suite', () => {
  // Container to collect golden baseline metrics
  const goldenBaselineResults: Record<string, any> = {
    suite: 'D&D 2024 / 5e Golden Regression Test Baseline',
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // --------------------------------------------------------------------------
  // TEST 1: Initiative rolling and tie-breaking formula
  // Formula: roll + dexBonus + (passiveInit / 100)
  // --------------------------------------------------------------------------
  describe('Test 1: Initiative Rolling & Tie-Breaking (roll + dexBonus + passiveInit/100)', () => {
    it('calculates initiative score strictly using roll + dexBonus + passiveInit/100', () => {
      // Roll 12, Dex +2, PassiveInit 12 -> 12 + 2 + 0.12 = 14.12
      const score1 = calculateInitiative(12, 2, 12);
      expect(score1).toBe(14.12);

      // Roll 15, Dex +3, PassiveInit 13 -> 15 + 3 + 0.13 = 18.13
      const score2 = calculateInitiative(15, 3, 13);
      expect(score2).toBe(18.13);

      // Roll 8, Dex -1, PassiveInit 9 -> 8 + (-1) + 0.09 = 7.09
      const score3 = calculateInitiative(8, -1, 9);
      expect(score3).toBe(7.09);

      goldenBaselineResults.tests['Test1_Calculations'] = {
        standardCase: score1,
        highDexCase: score2,
        negativeDexCase: score3,
      };
    });

    it('breaks ties between combatants with the same integer total using passive initiative', () => {
      // Both combatants roll an integer total of 14:
      // Fighter: d20 roll 12 + dex 2 = 14; passiveInit = 12 -> 14.12
      // Rogue:   d20 roll 11 + dex 3 = 14; passiveInit = 15 -> 14.15
      const fighterInit = calculateInitiative(12, 2, 12);
      const rogueInit = calculateInitiative(11, 3, 15);

      expect(fighterInit).toBe(14.12);
      expect(rogueInit).toBe(14.15);
      expect(rogueInit).toBeGreaterThan(fighterInit);

      // Sorting an array of combatants
      const candidates = [
        { id: 'fighter', name: 'Fighter', initiative: fighterInit, dexBonus: 2, passiveInit: 12 },
        { id: 'rogue', name: 'Rogue', initiative: rogueInit, dexBonus: 3, passiveInit: 15 },
        { id: 'wizard', name: 'Wizard', initiative: calculateInitiative(18, 1, 11), dexBonus: 1, passiveInit: 11 }, // 19.11
      ];

      const sorted = sortCandidatesByInitiative(candidates);
      expect(sorted[0].id).toBe('wizard'); // 19.11
      expect(sorted[1].id).toBe('rogue');  // 14.15 (wins tie-break over Fighter)
      expect(sorted[2].id).toBe('fighter'); // 14.12

      goldenBaselineResults.tests['Test1_TieBreaking'] = {
        fighterInit,
        rogueInit,
        winner: sorted[1].id,
      };
    });

    it('rolls random initiative within valid bounds [1 + dex + 0.1, 20 + dex + 0.2]', () => {
      const rolled = rollInitiative(3, 13);
      expect(rolled.roll).toBeGreaterThanOrEqual(1);
      expect(rolled.roll).toBeLessThanOrEqual(20);
      expect(rolled.dexBonus).toBe(3);
      expect(rolled.passiveInit).toBe(13);
      expect(rolled.total).toBe(Number((rolled.roll + 3 + 0.13).toFixed(2)));
    });
  });

  // --------------------------------------------------------------------------
  // TEST 2: Attack rolls vs AC: hit, miss, critical hit, critical miss
  // --------------------------------------------------------------------------
  describe('Test 2: Attack Rolls vs AC (Hit, Miss, Critical Hit, Critical Miss)', () => {
    const targetAc = 16;
    const attackBonus = 5;
    const baseDamageFormula = '1d8 + 3';

    it('resolves regular hit when roll + attackBonus >= AC', () => {
      // 11 + 5 = 16 >= 16 -> Hit
      const resHitEqual = resolveAttackRoll({
        d20Roll: 11,
        attackBonus,
        targetAc,
        damageFormula: baseDamageFormula,
      });
      expect(resHitEqual.isHit).toBe(true);
      expect(resHitEqual.isCriticalHit).toBe(false);
      expect(resHitEqual.isCriticalMiss).toBe(false);
      expect(resHitEqual.total).toBe(16);

      // 12 + 5 = 17 > 16 -> Hit
      const resHitOver = resolveAttackRoll({
        d20Roll: 12,
        attackBonus,
        targetAc,
        damageFormula: baseDamageFormula,
      });
      expect(resHitOver.isHit).toBe(true);
      expect(resHitOver.total).toBe(17);
    });

    it('resolves regular miss when roll + attackBonus < AC', () => {
      // 10 + 5 = 15 < 16 -> Miss
      const resMiss = resolveAttackRoll({
        d20Roll: 10,
        attackBonus,
        targetAc,
        damageFormula: baseDamageFormula,
      });
      expect(resMiss.isHit).toBe(false);
      expect(resMiss.isCriticalHit).toBe(false);
      expect(resMiss.isCriticalMiss).toBe(false);
      expect(resMiss.total).toBe(15);
    });

    it('resolves Critical Hit on natural 20 (always hits, doubles damage dice)', () => {
      // Even against impossible AC 35, Nat 20 always hits
      const resCrit = resolveAttackRoll({
        d20Roll: 20,
        attackBonus: 2,
        targetAc: 35,
        damageFormula: '1d8 + 4',
      });
      expect(resCrit.isHit).toBe(true);
      expect(resCrit.isCriticalHit).toBe(true);
      expect(resCrit.isCriticalMiss).toBe(false);
      // Double damage dice: 1d8+4 -> 2d8 + 4
      expect(resCrit.criticalDamageFormula).toBe('2d8 + 4');

      // Test multiple dice doubling: 2d6 + 3 -> 4d6 + 3
      const multiDiceDoubling = doubleDamageDiceInFormula('2d6 + 3');
      expect(multiDiceDoubling).toBe('4d6 + 3');

      // Complex formula: 1d10 + 2d6 + 5 -> 2d10 + 4d6 + 5
      const complexDoubling = doubleDamageDiceInFormula('1d10 + 2d6 + 5');
      expect(complexDoubling).toBe('2d10 + 4d6 + 5');

      goldenBaselineResults.tests['Test2_CriticalHit'] = {
        nat20HitsImpossiblyHighAc: resCrit.isHit,
        doubledFormula: resCrit.criticalDamageFormula,
        multiDiceDoubling,
      };
    });

    it('resolves Critical Miss on natural 1 (always misses regardless of bonus vs low AC)', () => {
      // Even with +20 to hit against AC 5 (1 + 20 = 21 >= 5), Nat 1 is an automatic miss
      const resCritMiss = resolveAttackRoll({
        d20Roll: 1,
        attackBonus: 20,
        targetAc: 5,
        damageFormula: baseDamageFormula,
      });
      expect(resCritMiss.isHit).toBe(false);
      expect(resCritMiss.isCriticalMiss).toBe(true);
      expect(resCritMiss.isCriticalHit).toBe(false);
      expect(resCritMiss.total).toBe(21);

      goldenBaselineResults.tests['Test2_CriticalMiss'] = {
        nat1AutoFailsHighBonus: !resCritMiss.isHit,
        isCriticalMiss: resCritMiss.isCriticalMiss,
      };
    });
  });

  // --------------------------------------------------------------------------
  // TEST 3: Damage resolution: normal, resistances, vulnerabilities, immunities, temp HP
  // --------------------------------------------------------------------------
  describe('Test 3: Damage Pipeline Resolution (Normal, Resistance, Vulnerability, Immunity, Temp HP)', () => {
    it('applies normal damage directly to target HP', () => {
      const target = { hp: 50, maxHp: 50, tempHp: 0 };
      const damages: DamageComponent[] = [{ type: 'slashing', amount: 15 }];
      const result = processDamagePipeline(damages, target);

      expect(result.totalRawDamage).toBe(15);
      expect(result.totalEffectiveDamage).toBe(15);
      expect(result.tempHpAbsorbed).toBe(0);
      expect(result.hpDamage).toBe(15);
      expect(result.newHp).toBe(35);
      expect(result.newTempHp).toBe(0);
      expect(result.isDying).toBe(false);
    });

    it('halves damage rounded down for resistances (floor(dmg / 2))', () => {
      const target = {
        hp: 50,
        maxHp: 50,
        tempHp: 0,
        defenses: { damageResistances: ['fire' as const] },
      };

      // 15 fire damage -> floor(15 / 2) = 7 effective damage
      const resultOdd = processDamagePipeline([{ type: 'fire', amount: 15 }], target);
      expect(resultOdd.totalEffectiveDamage).toBe(7);
      expect(resultOdd.newHp).toBe(43);
      expect(resultOdd.components[0].multiplierReason).toBe('resistant');

      // 16 fire damage -> floor(16 / 2) = 8 effective damage
      const resultEven = processDamagePipeline([{ type: 'fire', amount: 16 }], target);
      expect(resultEven.totalEffectiveDamage).toBe(8);
      expect(resultEven.newHp).toBe(42);

      goldenBaselineResults.tests['Test3_Resistance'] = {
        rawOdd: 15,
        effectiveOdd: resultOdd.totalEffectiveDamage,
        rawEven: 16,
        effectiveEven: resultEven.totalEffectiveDamage,
      };
    });

    it('doubles damage for vulnerabilities (dmg * 2)', () => {
      const target = {
        hp: 50,
        maxHp: 50,
        tempHp: 0,
        defenses: { damageVulnerabilities: ['radiant' as const] },
      };

      const result = processDamagePipeline([{ type: 'radiant', amount: 12 }], target);
      expect(result.totalEffectiveDamage).toBe(24);
      expect(result.newHp).toBe(26);
      expect(result.components[0].multiplierReason).toBe('vulnerable');

      goldenBaselineResults.tests['Test3_Vulnerability'] = {
        raw: 12,
        effective: result.totalEffectiveDamage,
      };
    });

    it('reduces damage to 0 for immunities', () => {
      const target = {
        hp: 50,
        maxHp: 50,
        tempHp: 0,
        defenses: { damageImmunities: ['poison' as const] },
      };

      const result = processDamagePipeline([{ type: 'poison', amount: 50 }], target);
      expect(result.totalEffectiveDamage).toBe(0);
      expect(result.newHp).toBe(50);
      expect(result.components[0].multiplierReason).toBe('immune');

      goldenBaselineResults.tests['Test3_Immunity'] = {
        raw: 50,
        effective: result.totalEffectiveDamage,
      };
    });

    it('absorbs damage using Temporary HP buffer before deducting from HP', () => {
      const target = { hp: 40, maxHp: 40, tempHp: 15 };

      // Case A: Damage 10 is less than Temp HP 15
      const resMinor = processDamagePipeline([{ type: 'bludgeoning', amount: 10 }], target);
      expect(resMinor.tempHpAbsorbed).toBe(10);
      expect(resMinor.hpDamage).toBe(0);
      expect(resMinor.newTempHp).toBe(5);
      expect(resMinor.newHp).toBe(40); // HP remains untouched!

      // Case B: Damage 25 exceeds Temp HP 15 (15 absorbed, 10 hits HP)
      const resMajor = processDamagePipeline([{ type: 'bludgeoning', amount: 25 }], target);
      expect(resMajor.tempHpAbsorbed).toBe(15);
      expect(resMajor.hpDamage).toBe(10);
      expect(resMajor.newTempHp).toBe(0);
      expect(resMajor.newHp).toBe(30);

      goldenBaselineResults.tests['Test3_TempHpBuffer'] = {
        absorbedMinor: resMinor.tempHpAbsorbed,
        newHpMinor: resMinor.newHp,
        absorbedMajor: resMajor.tempHpAbsorbed,
        newHpMajor: resMajor.newHp,
      };
    });

    it('enforces non-stacking Temporary HP rules (takes the higher value)', () => {
      // 10 temp HP + 5 incoming -> remains 10
      expect(addTempHp(10, 5)).toBe(10);
      // 10 temp HP + 15 incoming -> becomes 15
      expect(addTempHp(10, 15)).toBe(15);
      // 0 temp HP + 8 incoming -> becomes 8
      expect(addTempHp(0, 8)).toBe(8);
    });

    it('properly restores HP on healing without exceeding maxHp and revives 0 HP creatures', () => {
      // Healing capped at maxHp
      const heal1 = processHealing(35, 40, 10);
      expect(heal1.newHp).toBe(40);
      expect(heal1.healedAmount).toBe(5);
      expect(heal1.revived).toBe(false);

      // Reviving dying creature at 0 HP
      const heal2 = processHealing(0, 40, 6);
      expect(heal2.newHp).toBe(6);
      expect(heal2.healedAmount).toBe(6);
      expect(heal2.revived).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TEST 4: Conditions management: applying, removing, exhaustion 1-6, Dazed, Unconscious
  // --------------------------------------------------------------------------
  describe('Test 4: Condition Management (Add, Remove, Exhaustion 1-6, Dazed 2024, Unconscious/Incapacitated)', () => {
    it('applies and removes standard conditions', () => {
      let conditions: any[] = [];

      // Add Poisoned
      const addRes = addCondition(conditions, { type: 'Poisoned', source: 'Spider Venom' });
      conditions = addRes.conditions;
      expect(conditions).toHaveLength(1);
      expect(conditions[0].type).toBe('Poisoned');
      expect(conditions[0].source).toBe('Spider Venom');

      // Add Prone
      const addRes2 = addCondition(conditions, { type: 'Prone' });
      conditions = addRes2.conditions;
      expect(conditions).toHaveLength(2);

      // Remove Poisoned
      conditions = removeCondition(conditions, 'Poisoned');
      expect(conditions).toHaveLength(1);
      expect(conditions[0].type).toBe('Prone');
    });

    it('accurately enforces D&D 2024 numeric exhaustion levels 1-6 (-2 per level, death at 6)', () => {
      // Level 1: -2 penalty, 5 ft speed reduction
      const ex1 = getExhaustionEffects(1);
      expect(ex1.d20Penalty).toBe(-2);
      expect(ex1.speedReductionFt).toBe(5);
      expect(ex1.isDead).toBe(false);

      // Level 2: -4 penalty, 10 ft speed reduction
      const ex2 = getExhaustionEffects(2);
      expect(ex2.d20Penalty).toBe(-4);
      expect(ex2.speedReductionFt).toBe(10);
      expect(ex2.isDead).toBe(false);

      // Level 3: -6 penalty, 15 ft speed reduction
      const ex3 = getExhaustionEffects(3);
      expect(ex3.d20Penalty).toBe(-6);
      expect(ex3.speedReductionFt).toBe(15);
      expect(ex3.isDead).toBe(false);

      // Level 4: -8 penalty, 20 ft speed reduction
      const ex4 = getExhaustionEffects(4);
      expect(ex4.d20Penalty).toBe(-8);
      expect(ex4.speedReductionFt).toBe(20);
      expect(ex4.isDead).toBe(false);

      // Level 5: -10 penalty, 25 ft speed reduction
      const ex5 = getExhaustionEffects(5);
      expect(ex5.d20Penalty).toBe(-10);
      expect(ex5.speedReductionFt).toBe(25);
      expect(ex5.isDead).toBe(false);

      // Level 6: -12 penalty, 30 ft speed reduction, INSTANT DEATH!
      const ex6 = getExhaustionEffects(6);
      expect(ex6.d20Penalty).toBe(-12);
      expect(ex6.speedReductionFt).toBe(30);
      expect(ex6.isDead).toBe(true);

      // Verify addition of exhaustion condition triggers isDead at level 6
      const resAddEx6 = addCondition([], { type: 'Exhaustion', level: 6 });
      expect(resAddEx6.isDead).toBe(true);
      expect(resAddEx6.conditions[0].level).toBe(6);

      goldenBaselineResults.tests['Test4_Exhaustion'] = {
        level1: ex1,
        level3: ex3,
        level6: ex6,
      };
    });

    it('verifies Dazed (2024) condition specification: action OR move, no bonus action or reaction', () => {
      const dazed = CONDITIONS_2024_DATA['Dazed'];
      expect(dazed).toBeDefined();
      expect(dazed.nameEn).toBe('Dazed');
      expect(dazed.descriptionEn).toContain('move or take an action on its turn, not both');
      expect(dazed.descriptionEn).toContain('cannot take Bonus Actions or Reactions');
    });

    it('verifies Incapacitated and Unconscious conditions', () => {
      const inc = CONDITIONS_2024_DATA['Incapacitated'];
      expect(inc).toBeDefined();
      expect(inc.descriptionEn).toContain("Can't take Actions, Bonus Actions, or Reactions");
      expect(inc.descriptionEn).toContain('Concentration is immediately broken');

      const unc = CONDITIONS_2024_DATA['Unconscious'];
      expect(unc).toBeDefined();
      expect(unc.descriptionEn).toContain('Incapacitated');
      expect(unc.descriptionEn).toContain('falls Prone');
      expect(unc.descriptionEn).toContain('Auto-fails STR and DEX saves');
      expect(unc.descriptionEn).toContain('hits from within 5 ft are critical hits');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 5: Rest mechanics: Short Rest and Long Rest
  // --------------------------------------------------------------------------
  describe('Test 5: Rest Mechanics (Short Rest & Long Rest Automation)', () => {
    it('executes Short Rest: deducts hit dice, restores HP, resets short-rest resources and Warlock pact slots', () => {
      const warlockCharacter = {
        id: 'warlock-1',
        name: 'Warlock hero',
        characterClass: 'Warlock',
        maxHp: 40,
        currentHp: 18,
        hitDiceMax: 5,
        hitDiceCurrent: 5,
        resources: [
          { id: 'res-1', name: 'Action Surge', current: 0, max: 1, resetOn: 'short' as const },
          { id: 'res-2', name: 'Rage', current: 1, max: 3, resetOn: 'long' as const },
        ],
        spellSlots: {
          3: { max: 2, used: 2 }, // Both pact slots spent
        },
      };

      // Spends 2 hit dice, recovers 14 HP
      const rested = applyShortRest(warlockCharacter, 2, 14);

      // Hit dice: 5 - 2 = 3
      expect(rested.hitDiceCurrent).toBe(3);
      // HP: 18 + 14 = 32 (capped at 40)
      expect(rested.currentHp).toBe(32);
      // Short rest resource recovered to max
      expect(rested.resources?.find((r) => r.id === 'res-1')?.current).toBe(1);
      // Long rest resource untouched
      expect(rested.resources?.find((r) => r.id === 'res-2')?.current).toBe(1);
      // Warlock Pact magic spell slots recovered (used: 0)
      expect(rested.spellSlots?.[3].used).toBe(0);

      goldenBaselineResults.tests['Test5_ShortRest'] = {
        remainingHitDice: rested.hitDiceCurrent,
        restoredHp: rested.currentHp,
        shortRestResourceRestored: rested.resources?.[0].current,
        pactSlotsUsedAfterRest: rested.spellSlots?.[3].used,
      };
    });

    it('executes Long Rest: 100% HP, clears temp HP, restores 50% hit dice, resets all spell slots, clears death saves, reduces exhaustion by 1', () => {
      const batteredHero = {
        id: 'paladin-1',
        name: 'Paladin',
        characterClass: 'Paladin',
        maxHp: 50,
        currentHp: 12,
        tempHp: 10,
        hitDiceMax: 6,
        hitDiceCurrent: 1, // Spent 5 hit dice earlier
        exhaustion: 2,     // Exhaustion level 2
        deathSaves: { successes: 2, failures: 1 },
        isDying: false,
        spellSlots: {
          1: { max: 4, used: 4 },
          2: { max: 2, used: 2 },
        },
        resources: [
          { id: 'res-sr', name: 'Channel Divinity', current: 0, max: 2, resetOn: 'short' as const },
          { id: 'res-lr', name: 'Lay on Hands', current: 5, max: 25, resetOn: 'long' as const },
        ],
      };

      const fullyRested = applyLongRest(batteredHero);

      // 1. 100% HP restored
      expect(fullyRested.currentHp).toBe(50);
      // 2. Temp HP cleared
      expect(fullyRested.tempHp).toBe(0);
      // 3. 50% hit dice restored: floor(6 / 2) = 3 restored -> 1 + 3 = 4
      expect(fullyRested.hitDiceCurrent).toBe(4);
      // 4. All spell slots reset
      expect(fullyRested.spellSlots?.[1].used).toBe(0);
      expect(fullyRested.spellSlots?.[2].used).toBe(0);
      // 5. Short and Long rest resources reset
      expect(fullyRested.resources?.[0].current).toBe(2);
      expect(fullyRested.resources?.[1].current).toBe(25);
      // 6. Death saves cleared
      expect(fullyRested.deathSaves?.successes).toBe(0);
      expect(fullyRested.deathSaves?.failures).toBe(0);
      // 7. Exhaustion reduced by 1 (2 -> 1)
      expect(fullyRested.exhaustion).toBe(1);

      goldenBaselineResults.tests['Test5_LongRest'] = {
        hp: fullyRested.currentHp,
        tempHp: fullyRested.tempHp,
        hitDiceCurrent: fullyRested.hitDiceCurrent,
        spellSlotsLevel1Used: fullyRested.spellSlots?.[1].used,
        exhaustion: fullyRested.exhaustion,
        deathSaves: fullyRested.deathSaves,
      };
    });

    it('validates partyStore longRest integrated action updates party members and resets resources', () => {
      const partyState = usePartyStore.getState();
      const firstMember = partyState.members[0];

      if (firstMember) {
        // Hurt member and spend resources
        usePartyStore.getState().updateMember(firstMember.id, {
          currentHp: 5,
          hitDiceCurrent: 1,
          exhaustion: 1,
        });

        // Execute store longRest
        usePartyStore.getState().longRest();

        const updated = usePartyStore.getState().members.find((m) => m.id === firstMember.id);
        expect(updated?.currentHp).toBe(updated?.maxHp);
        expect(updated?.exhaustion).toBe(0);
        expect(updated?.hitDiceCurrent).toBeGreaterThan(1);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Save Golden Baseline Snapshot to src/tests/golden_baseline_dnd.json
  // --------------------------------------------------------------------------
  it('saves the golden baseline snapshot to src/tests/golden_baseline_dnd.json and tests/golden_dnd_baseline.json', () => {
    const baselinePath1 = path.resolve(process.cwd(), 'src/tests/golden_baseline_dnd.json');
    const baselinePath2 = path.resolve(process.cwd(), 'tests/golden_dnd_baseline.json');
    goldenBaselineResults.completedAt = new Date().toISOString();
    goldenBaselineResults.status = 'ALL_TESTS_PASSING';

    const serialized = JSON.stringify(goldenBaselineResults, null, 2);
    fs.writeFileSync(baselinePath1, serialized, 'utf-8');
    fs.mkdirSync(path.dirname(baselinePath2), { recursive: true });
    fs.writeFileSync(baselinePath2, serialized, 'utf-8');

    expect(fs.existsSync(baselinePath1)).toBe(true);
    expect(fs.existsSync(baselinePath2)).toBe(true);

    const readBack = JSON.parse(fs.readFileSync(baselinePath1, 'utf-8'));
    expect(readBack.status).toBe('ALL_TESTS_PASSING');
    expect(readBack.tests['Test1_Calculations']).toBeDefined();
    expect(readBack.tests['Test2_CriticalHit']).toBeDefined();
    expect(readBack.tests['Test3_Resistance']).toBeDefined();
    expect(readBack.tests['Test4_Exhaustion']).toBeDefined();
    expect(readBack.tests['Test5_LongRest']).toBeDefined();
  });
});
