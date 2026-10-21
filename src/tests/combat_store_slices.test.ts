import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCombatStore,
  getCombatantConMod,
  createSampleCombatants,
  duplicateCampaignInSystem,
  loadActiveCombatFromDisk,
  saveActiveCombatToDisk,
} from '../store/combatStore';
import type { CombatState, CombatSnapshot, ConcentrationAlert, ActiveCombatSaveData } from '../store/combatStore';

describe('useCombatStore Modular Slices Architecture', () => {
  beforeEach(() => {
    useCombatStore.getState().resetCombat();
    useCombatStore.getState().populateDefaultEncounter();
  });

  describe('Exports and Backward Compatibility', () => {
    it('re-exports helper functions, storage methods, and types correctly', () => {
      expect(typeof useCombatStore).toBe('function');
      expect(typeof useCombatStore.getState).toBe('function');
      expect(typeof loadActiveCombatFromDisk).toBe('function');
      expect(typeof saveActiveCombatToDisk).toBe('function');
      expect(typeof getCombatantConMod).toBe('function');
      expect(typeof createSampleCombatants).toBe('function');
      expect(typeof duplicateCampaignInSystem).toBe('function');

      const samples = createSampleCombatants();
      expect(samples.length).toBeGreaterThanOrEqual(4);
      expect(samples[0].name).toContain('Вампир');

      const conMod = getCombatantConMod(samples[0]);
      expect(typeof conMod).toBe('number');
    });

    it('allows type assertions against exported interfaces without compile issues', () => {
      const state: CombatState = useCombatStore.getState();
      expect(state.combatants).toBeDefined();

      const alert: ConcentrationAlert = {
        combatantId: '1',
        combatantName: 'Test',
        damage: 10,
        dc: 10,
        conMod: 2,
      };
      expect(alert.damage).toBe(10);

      const snapshot: CombatSnapshot = {
        combatants: [],
        currentTurnIndex: 0,
        roundCounter: 1,
        activeCombatantId: null,
        inspectedCombatantId: null,
      };
      expect(snapshot.roundCounter).toBe(1);

      const saveData: ActiveCombatSaveData = {
        combatants: [],
        currentTurnIndex: 0,
        roundCounter: 1,
        activeCombatantId: null,
        timestamp: Date.now(),
        version: '2.0.0',
      };
      expect(saveData.timestamp).toBeGreaterThan(0);
    });
  });

  describe('combatantSlice', () => {
    it('manages combatant CRUD', () => {
      const store = useCombatStore.getState();
      const initialCount = store.combatants.length;

      store.addCombatant({
        name: 'Новый Гоблин',
        hp: 12,
        maxHp: 12,
        ac: 15,
        initiative: 14,
      });

      const updated = useCombatStore.getState();
      expect(updated.combatants.length).toBe(initialCount + 1);
      const added = updated.combatants.find((c) => c.name === 'Новый Гоблин');
      expect(added).toBeDefined();
      expect(added?.hp).toBe(12);

      // Update combatant
      store.updateCombatant(added!.id, { hp: 8 });
      expect(useCombatStore.getState().combatants.find((c) => c.id === added!.id)?.hp).toBe(8);

      // Remove combatant
      store.removeCombatant(added!.id);
      expect(useCombatStore.getState().combatants.find((c) => c.id === added!.id)).toBeUndefined();
    });

    it('handles damage, healing, and temp HP pipeline correctly', () => {
      const store = useCombatStore.getState();
      const target = store.combatants[1]; // Ranger without resistances
      const initialHp = target.hp;

      // Apply damage
      store.applyDamage(target.id, 20);
      let current = useCombatStore.getState().combatants.find((c) => c.id === target.id)!;
      expect(current.hp).toBe(initialHp - 20);

      // Apply healing
      store.applyHealing(target.id, 10);
      current = useCombatStore.getState().combatants.find((c) => c.id === target.id)!;
      expect(current.hp).toBe(initialHp - 10);

      // Apply Temp HP
      store.applyTempHp(target.id, 15);
      current = useCombatStore.getState().combatants.find((c) => c.id === target.id)!;
      expect(current.tempHp).toBe(15);

      // Damage absorbs Temp HP first
      store.applyDamage(target.id, 10);
      current = useCombatStore.getState().combatants.find((c) => c.id === target.id)!;
      expect(current.tempHp).toBe(5);
      expect(current.hp).toBe(initialHp - 10);
    });

    it('triggers concentration alert on damage if concentrating', () => {
      const store = useCombatStore.getState();
      const target = store.combatants[1]; // Ranger
      store.toggleConcentration(target.id, "Hunter's Mark");

      let current = useCombatStore.getState().combatants.find((c) => c.id === target.id)!;
      expect(current.isConcentrating).toBe(true);

      store.applyDamage(target.id, 24);
      const alert = useCombatStore.getState().concentrationAlert;
      expect(alert).not.toBeNull();
      expect(alert?.combatantId).toBe(target.id);
      expect(alert?.dc).toBe(12); // max(10, 24/2)

      store.clearConcentrationAlert();
      expect(useCombatStore.getState().concentrationAlert).toBeNull();

      store.removeConcentration(target.id);
      current = useCombatStore.getState().combatants.find((c) => c.id === target.id)!;
      expect(current.isConcentrating).toBe(false);
    });

    it('manages death saves and conditions', () => {
      const store = useCombatStore.getState();
      const target = store.combatants[2];

      // Add condition
      store.addCondition(target.id, {
        type: 'Poisoned',
        source: 'Venom',
      });
      let current = useCombatStore.getState().combatants.find((c) => c.id === target.id)!;
      expect(current.conditions.some((cond) => cond.type === 'Poisoned')).toBe(true);

      // Remove condition
      store.removeCondition(target.id, 'Poisoned');
      current = useCombatStore.getState().combatants.find((c) => c.id === target.id)!;
      expect(current.conditions.some((cond) => cond.type === 'Poisoned')).toBe(false);

      // Knockout and death save
      store.updateCombatant(target.id, { hp: 0, isDying: true });
      const dsResult = store.rollDeathSave(target.id, 15);
      expect(dsResult).not.toBeNull();
      expect(dsResult?.newSuccesses).toBe(1);
    });

    it('manages legendary actions, reactions, and map positions', () => {
      const store = useCombatStore.getState();
      const boss = store.combatants[0];

      expect(boss.legendaryActions.current).toBe(3);
      store.spendLegendaryAction(boss.id, 2);
      expect(useCombatStore.getState().combatants.find((c) => c.id === boss.id)?.legendaryActions.current).toBe(1);

      store.toggleReaction(boss.id);
      expect(useCombatStore.getState().combatants.find((c) => c.id === boss.id)?.reactionUsed).toBe(true);

      store.updateCombatantPosition(boss.id, 200, 300);
      const posUpdated = useCombatStore.getState().combatants.find((c) => c.id === boss.id)!;
      expect(posUpdated.tokenX).toBe(200);
      expect(posUpdated.tokenY).toBe(300);

      store.autoArrangeCombatantsOnMap();
      const arranged = useCombatStore.getState().combatants.find((c) => c.id === boss.id)!;
      expect(arranged.tokenX).toBeDefined();
    });
  });

  describe('turnSlice', () => {
    it('manages nextTurn, round advancement, and turn replenishment', () => {
      const store = useCombatStore.getState();
      const bossId = store.combatants[0].id;
      store.spendLegendaryAction(bossId, 3);
      store.toggleReaction(bossId);

      expect(store.currentTurnIndex).toBe(0);
      expect(store.roundCounter).toBe(1);

      // Next turn
      store.nextTurn();
      expect(useCombatStore.getState().currentTurnIndex).toBe(1);

      // Advance through all combatants until round increments and returns to boss
      const count = store.combatants.length;
      for (let i = 1; i < count; i++) {
        useCombatStore.getState().nextTurn();
      }

      const backAtBoss = useCombatStore.getState();
      expect(backAtBoss.currentTurnIndex).toBe(0);
      expect(backAtBoss.roundCounter).toBe(2);

      // Boss legendary actions & reaction should be replenished at start of its turn
      const boss = backAtBoss.combatants.find((c) => c.id === bossId)!;
      expect(boss.legendaryActions.current).toBe(boss.legendaryActions.max);
      expect(boss.reactionUsed).toBe(false);
    });

    it('handles prevTurn and manual setRound / setCurrentTurnIndex', () => {
      const store = useCombatStore.getState();
      store.setCurrentTurnIndex(2);
      expect(useCombatStore.getState().currentTurnIndex).toBe(2);

      store.prevTurn();
      expect(useCombatStore.getState().currentTurnIndex).toBe(1);

      store.setRound(5);
      expect(useCombatStore.getState().roundCounter).toBe(5);
    });

    it('sorts combatants by initiative descending', () => {
      const store = useCombatStore.getState();
      store.updateCombatant(store.combatants[0].id, { initiative: 5, initBonus: 0, passiveInit: 10 });
      store.updateCombatant(store.combatants[1].id, { initiative: 25, initBonus: 5, passiveInit: 15 });

      store.sortByInitiative();
      const sorted = useCombatStore.getState().combatants;
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].initiative).toBeGreaterThanOrEqual(sorted[i + 1].initiative);
      }
    });

    it('handles mob modal and inspector selection', () => {
      const store = useCombatStore.getState();
      store.setMobModalOpen(true);
      expect(useCombatStore.getState().isMobModalOpen).toBe(true);

      store.setInspectedCombatantId('test-id');
      expect(useCombatStore.getState().inspectedCombatantId).toBe('test-id');
    });
  });

  describe('targetingSlice', () => {
    it('manages targeting mode and advantage settings', () => {
      const store = useCombatStore.getState();
      store.startTargetingMode('attacker-1', { name: 'Slash' }, 'Select Target');

      let state = useCombatStore.getState();
      expect(state.isTargetingMode).toBe(true);
      expect(state.pendingAttackerId).toBe('attacker-1');
      expect(state.targetingPrompt).toBe('Select Target');

      store.setAttackAdvantageMode('advantage');
      expect(useCombatStore.getState().attackAdvantageMode).toBe('advantage');

      store.setCurrentTargetId('target-1');
      expect(useCombatStore.getState().currentTargetId).toBe('target-1');

      store.toggleCurrentTargetId('target-1');
      expect(useCombatStore.getState().currentTargetId).toBeNull();

      store.cancelTargetingMode();
      state = useCombatStore.getState();
      expect(state.isTargetingMode).toBe(false);
      expect(state.pendingAttackerId).toBeNull();
    });

    it('executes targeted strike and multiattack series', () => {
      const store = useCombatStore.getState();
      const attacker = store.combatants[0]; // Boss NPC
      const target = store.combatants[1]; // Player

      const initialTargetHp = target.hp;
      store.executeTargetedStrike(attacker.id, target.id, {
        name: 'Grave Strike',
        attack_bonus: 20, // guaranteed hit
        damage_dice: '1d4+2',
        damage_type: 'slashing',
      });

      const afterStrike = useCombatStore.getState();
      const updatedTarget = afterStrike.combatants.find((c) => c.id === target.id)!;
      expect(updatedTarget.hp).toBeLessThan(initialTargetHp);
      expect(afterStrike.diceLog.length).toBeGreaterThan(0);

      // Execute multiattack
      store.executeMultiattackSeries(attacker.id, target.id);
      const afterMulti = useCombatStore.getState();
      expect(afterMulti.diceLog.length).toBeGreaterThan(1);
    });
  });

  describe('diceSlice', () => {
    it('records dice rolls and maintains history up to limit', () => {
      const store = useCombatStore.getState();
      store.clearDiceLog();
      expect(useCombatStore.getState().diceLog).toEqual([]);

      store.addDiceLog({
        id: 'roll-1',
        timestamp: '12:00:00',
        combatantName: 'Ranger',
        actionName: 'Longbow',
        note: 'Hit 18 vs AC 15',
      });

      expect(useCombatStore.getState().diceLog.length).toBe(1);
      expect(useCombatStore.getState().diceHistory.length).toBe(1);

      store.addDiceHistory({
        id: 'roll-2',
        timestamp: '12:00:05',
        combatantName: 'Guard',
        actionName: 'Spear',
      });

      expect(useCombatStore.getState().diceLog.length).toBe(2);
    });
  });

  describe('persistenceSlice', () => {
    it('manages undo and redo history snapshots', () => {
      const store = useCombatStore.getState();
      const target = store.combatants[1]; // Ranger without resistances
      const origHp = target.hp;

      store.applyDamage(target.id, 10);
      expect(useCombatStore.getState().combatants.find((c) => c.id === target.id)?.hp).toBe(origHp - 10);
      expect(useCombatStore.getState().undoStack.length).toBeGreaterThan(0);

      store.undoLastAction();
      expect(useCombatStore.getState().combatants.find((c) => c.id === target.id)?.hp).toBe(origHp);
      expect(useCombatStore.getState().redoStack.length).toBeGreaterThan(0);

      store.redoLastAction();
      expect(useCombatStore.getState().combatants.find((c) => c.id === target.id)?.hp).toBe(origHp - 10);
    });

    it('exports and imports session JSON cleanly', () => {
      const store = useCombatStore.getState();
      const json = store.exportCombatSessionJson();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.combatants.length).toBe(store.combatants.length);

      // Reset and import back
      store.resetCombat();
      expect(useCombatStore.getState().combatants.length).toBe(0);

      const importOk = store.importCombatSessionJson(json);
      expect(importOk).toBe(true);
      expect(useCombatStore.getState().combatants.length).toBe(parsed.combatants.length);
    });

    it('enforces multi-system locking and safe campaign duplication', () => {
      const store = useCombatStore.getState();
      expect(store.systemId).toBe('dnd5e_2024');

      // In-place switch without force should fail if combatants exist
      const lockRes = store.setSystemId('pathfinder2e', false);
      expect(lockRes.success).toBe(false);
      expect(useCombatStore.getState().systemId).toBe('dnd5e_2024');

      // Duplicate campaign creates standalone state without mutating original
      const dupRes = store.duplicateCampaignInSystem('pathfinder2e');
      expect(dupRes.success).toBe(true);
      expect(dupRes.duplicatedState.systemId).toBe('pathfinder2e');
      expect(dupRes.duplicatedState.combatants?.length).toBe(store.combatants.length);
      expect(useCombatStore.getState().systemId).toBe('dnd5e_2024');
    });
  });
});
