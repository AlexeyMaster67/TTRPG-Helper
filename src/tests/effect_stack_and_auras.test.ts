import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateEffectiveStats,
  advanceEffectsRound,
  calculateAuraPixelRadius,
  getEffectiveAuras,
  DND_2024_EFFECT_PRESETS,
  createEffectFromPreset,
  ActiveEffectModifier,
} from '../engine/effectStackEngine';
import { useCombatStore } from '../store/combatStore';

describe('Aura & Effect Stack Engine (Этап 7)', () => {
  describe('Non-destructive Modifier Calculations', () => {
    it('calculates base stats correctly when no effects are active', () => {
      const stats = calculateEffectiveStats({ ac: 16, speed: '30 фт.' }, []);
      expect(stats.baseAc).toBe(16);
      expect(stats.effectiveAc).toBe(16);
      expect(stats.acBonus).toBe(0);
      expect(stats.effectiveSpeed).toBe('30 фт.');
      expect(stats.speedBonus).toBe(0);
      expect(stats.advantageAttacks).toBe(false);
      expect(stats.disadvantageAttacks).toBe(false);
    });

    it('stacks multiple AC modifiers (+2 Shield of Faith and +2 Haste)', () => {
      const shieldOfFaith = createEffectFromPreset('preset_shield_of_faith');
      const haste = createEffectFromPreset('preset_haste');

      const stats = calculateEffectiveStats({ ac: 15, speed: '30 фт.' }, [shieldOfFaith, haste]);

      // Base AC is 15, Shield of Faith is +2, Haste is +2 => 19
      expect(stats.baseAc).toBe(15);
      expect(stats.acBonus).toBe(4);
      expect(stats.effectiveAc).toBe(19);

      // Haste grants +30 ft. speed bonus (30 + 30 = 60 ft.)
      expect(stats.speedBonus).toBe(30);
      expect(stats.effectiveSpeed).toBe('60 фт.');
      expect(stats.advantageAttacks).toBe(true);
    });

    it('automatically and non-destructively reverts to base AC when an effect is removed', () => {
      const shieldOfFaith = createEffectFromPreset('preset_shield_of_faith');
      const haste = createEffectFromPreset('preset_haste');

      let activeEffects: ActiveEffectModifier[] = [shieldOfFaith, haste];
      let stats = calculateEffectiveStats({ ac: 14 }, activeEffects);
      expect(stats.effectiveAc).toBe(18); // 14 + 2 + 2

      // Remove Haste
      activeEffects = activeEffects.filter((e) => e.name !== 'Ускорение');
      stats = calculateEffectiveStats({ ac: 14 }, activeEffects);
      expect(stats.effectiveAc).toBe(16); // 14 + 2

      // Remove Shield of Faith
      activeEffects = activeEffects.filter((e) => e.name !== 'Щит веры');
      stats = calculateEffectiveStats({ ac: 14 }, activeEffects);
      expect(stats.effectiveAc).toBe(14); // Exactly base AC
    });

    it('aggregates attack bonuses, save bonuses, and disadvantage flags', () => {
      const bless = createEffectFromPreset('preset_bless');
      const protection = createEffectFromPreset('preset_protection_evil_good');
      const customEffect: ActiveEffectModifier = {
        id: 'eff_test',
        name: 'Особое благословение',
        durationRounds: 5,
        modifiers: {
          saveBonus: '+2',
          attackBonus: '+1',
        },
      };

      const stats = calculateEffectiveStats({ ac: 10 }, [bless, protection, customEffect]);
      expect(stats.attackBonuses).toEqual(['+1d4', '+1']);
      expect(stats.saveBonuses).toEqual(['+1d4', '+2']);
      expect(stats.disadvantageAttacks).toBe(true);
    });
  });

  describe('Round Advancement and Effect Expiry', () => {
    it('decrements duration of round-based effects by 1', () => {
      const effect: ActiveEffectModifier = {
        id: 'eff_1',
        name: 'Щит веры',
        durationRounds: 10,
      };

      const result = advanceEffectsRound([effect]);
      expect(result.remainingEffects.length).toBe(1);
      expect(result.remainingEffects[0].durationRounds).toBe(9);
      expect(result.expiredEffects.length).toBe(0);
    });

    it('filters out expired effects when duration reaches 0', () => {
      const effect1: ActiveEffectModifier = {
        id: 'eff_1',
        name: 'Ускорение',
        durationRounds: 1, // Final round
      };
      const effect2: ActiveEffectModifier = {
        id: 'eff_2',
        name: 'Щит веры',
        durationRounds: 5,
      };

      const result = advanceEffectsRound([effect1, effect2]);
      expect(result.remainingEffects.length).toBe(1);
      expect(result.remainingEffects[0].name).toBe('Щит веры');
      expect(result.remainingEffects[0].durationRounds).toBe(4);

      expect(result.expiredEffects.length).toBe(1);
      expect(result.expiredEffects[0].name).toBe('Ускорение');
      expect(result.expiredEffects[0].durationRounds).toBe(0);
    });

    it('keeps permanent effects untouched indefinitely', () => {
      const paladinAura = createEffectFromPreset('preset_paladin_aura');
      expect(paladinAura.durationRounds).toBe('permanent');

      const result = advanceEffectsRound([paladinAura]);
      expect(result.remainingEffects.length).toBe(1);
      expect(result.remainingEffects[0].durationRounds).toBe('permanent');
      expect(result.expiredEffects.length).toBe(0);
    });

    it('immediately expires instant effects', () => {
      const instantEffect: ActiveEffectModifier = {
        id: 'eff_inst',
        name: 'Мгновенная вспышка',
        durationRounds: 'instant',
      };

      const result = advanceEffectsRound([instantEffect]);
      expect(result.remainingEffects.length).toBe(0);
      expect(result.expiredEffects.length).toBe(1);
      expect(result.expiredEffects[0].name).toBe('Мгновенная вспышка');
    });
  });

  describe('Tactical Battle Map Aura Radius Conversion', () => {
    it('converts aura feet to pixel radius based on 5-foot grid cells', () => {
      const cellSize = 50;

      // 10 feet = 2 cells = 100 pixels
      expect(calculateAuraPixelRadius(10, cellSize)).toBe(100);

      // 30 feet = 6 cells = 300 pixels
      expect(calculateAuraPixelRadius(30, cellSize)).toBe(300);

      // 60 feet = 12 cells = 600 pixels
      expect(calculateAuraPixelRadius(60, cellSize)).toBe(600);

      // 15 feet with 60px cell size = 3 cells * 60 = 180 pixels
      expect(calculateAuraPixelRadius(15, 60)).toBe(180);
    });

    it('handles zero or negative radius and cell size safely', () => {
      expect(calculateAuraPixelRadius(0, 50)).toBe(0);
      expect(calculateAuraPixelRadius(-10, 50)).toBe(0);
      expect(calculateAuraPixelRadius(10, 0)).toBe(0);
    });

    it('extracts active auras from active effect modifiers list', () => {
      const paladinAura = createEffectFromPreset('preset_paladin_aura');
      const bless = createEffectFromPreset('preset_bless');

      const auras = getEffectiveAuras([paladinAura, bless]);
      expect(auras.length).toBe(1);
      expect(auras[0].radiusFeet).toBe(10);
      expect(auras[0].color).toBe('#F59E0B');
      expect(auras[0].effectName).toBe('Аура защиты паладина');
      expect(auras[0].pulsing).toBe(true);
    });
  });

  describe('D&D 2024 Effect Presets Catalog', () => {
    it('contains all required D&D 2024 presets with valid parameters', () => {
      const presetIds = DND_2024_EFFECT_PRESETS.map((p) => p.id);
      expect(presetIds).toContain('preset_shield_of_faith');
      expect(presetIds).toContain('preset_bless');
      expect(presetIds).toContain('preset_haste');
      expect(presetIds).toContain('preset_paladin_aura');
      expect(presetIds).toContain('preset_protection_evil_good');
      expect(presetIds).toContain('preset_stunned');
      expect(presetIds).toContain('preset_blinded');
      expect(presetIds).toContain('preset_restrained');
      expect(presetIds).toContain('preset_unconscious');
    });

    it('creates unique effect instances with overrides', () => {
      const effect1 = createEffectFromPreset('preset_shield_of_faith');
      const effect2 = createEffectFromPreset('preset_shield_of_faith');

      expect(effect1.id).not.toBe(effect2.id);
      expect(effect1.name).toBe('Щит веры');
      expect(effect1.modifiers?.acBonus).toBe(2);

      const customHaste = createEffectFromPreset('preset_haste', {
        name: 'Великое ускорение',
        durationRounds: 20,
      });
      expect(customHaste.name).toBe('Великое ускорение');
      expect(customHaste.durationRounds).toBe(20);
      expect(customHaste.modifiers?.acBonus).toBe(2);
    });
  });

  describe('Zustand Combat Store Integration', () => {
    beforeEach(() => {
      useCombatStore.setState({
        activeEffects: {},
        roundCounter: 1,
        currentTurnIndex: 0,
      });
    });

    it('adds effect to combatant and updates activeEffects state', () => {
      const combatantId = 'test-paladin-1';
      const shieldOfFaith = createEffectFromPreset('preset_shield_of_faith');

      useCombatStore.getState().addEffectToCombatant(combatantId, shieldOfFaith);

      const effects = useCombatStore.getState().activeEffects[combatantId];
      expect(effects).toBeDefined();
      expect(effects.length).toBe(1);
      expect(effects[0].name).toBe('Щит веры');
    });

    it('removes specific effect from combatant', () => {
      const combatantId = 'test-paladin-1';
      const effect1 = createEffectFromPreset('preset_shield_of_faith');
      const effect2 = createEffectFromPreset('preset_bless');

      useCombatStore.getState().addEffectToCombatant(combatantId, effect1);
      useCombatStore.getState().addEffectToCombatant(combatantId, effect2);

      expect(useCombatStore.getState().activeEffects[combatantId].length).toBe(2);

      useCombatStore.getState().removeEffectFromCombatant(combatantId, effect1.id);
      const remaining = useCombatStore.getState().activeEffects[combatantId];
      expect(remaining.length).toBe(1);
      expect(remaining[0].name).toBe('Благословение');
    });

    it('clears all effects from combatant', () => {
      const combatantId = 'test-paladin-1';
      const effect1 = createEffectFromPreset('preset_shield_of_faith');
      const effect2 = createEffectFromPreset('preset_bless');

      useCombatStore.getState().addEffectToCombatant(combatantId, effect1);
      useCombatStore.getState().addEffectToCombatant(combatantId, effect2);

      useCombatStore.getState().clearCombatantEffects(combatantId);
      expect(useCombatStore.getState().activeEffects[combatantId]).toEqual([]);
    });

    it('automatically advances effects when round increments via nextTurn', () => {
      const combatantId = 'c1';
      useCombatStore.setState({
        combatants: [
          {
            id: combatantId,
            name: 'Рыцарь',
            hp: 20,
            maxHp: 20,
            tempHp: 0,
            ac: 18,
            speed: '30 фт.',
            initiative: 15,
            initBonus: 1,
            passiveInit: 11,
            size: 'Medium',
            tokenScale: 1,
            color: '#10B981',
            conditions: [],
            deathSaves: { successes: 0, failures: 0 },
            isDying: false,
            isDead: false,
            isPlayer: true,
            isConcentrating: false,
            reactionUsed: false,
            legendaryActions: { current: 0, max: 0 },
            damageImmunities: [],
            damageResistances: [],
            damageVulnerabilities: [],
            conditionImmunities: [],
          },
        ],
        currentTurnIndex: 0,
        roundCounter: 1,
        activeEffects: {
          [combatantId]: [
            {
              id: 'eff_short',
              name: 'Краткий эффект',
              durationRounds: 1, // Will expire when round increments
            },
            {
              id: 'eff_long',
              name: 'Длительный эффект',
              durationRounds: 5, // Will decrement to 4
            },
          ],
        },
      });

      // Advance turn: since there's 1 combatant, nextIndex = 0 => roundCounter becomes 2
      useCombatStore.getState().nextTurn();

      const state = useCombatStore.getState();
      expect(state.roundCounter).toBe(2);

      const effects = state.activeEffects[combatantId];
      expect(effects.length).toBe(1);
      expect(effects[0].name).toBe('Длительный эффект');
      expect(effects[0].durationRounds).toBe(4);
    });
  });
});
