import { StateCreator } from 'zustand';
import { CombatLogEntry, createDefaultCombatant } from '../../types/combat';
import { ActiveCondition } from '../../types/dnd5e';
import { cleanRussianText } from '../../utils/textUtils';
import { CONDITIONS_2024_DATA } from '../../engine/conditions';
import { advanceEffectsRound } from '../../engine/effectStackEngine';
import { loadActiveCombatFromDisk, clearActiveCombatDisk } from '../../services/combatDiskStorage';
import { usePartyStore } from '../partyStore';
import { CombatState, TurnSlice } from './types';
import {
  debouncedAutosave,
  createSnapshot,
  createSampleCombatants,
  defaultInitialCombatants,
} from './sliceUtils';

export const createTurnSlice: StateCreator<
  CombatState,
  [],
  [],
  TurnSlice
> = (set, get) => ({
  currentTurnIndex: 0,
  roundCounter: 1,
  activeCombatantId: defaultInitialCombatants[0]?.id || null,
  inspectedCombatantId: defaultInitialCombatants[0]?.id || null,
  hasSavedSessionPrompt: false,
  savedSessionData: null,
  isMobModalOpen: false,

  setMobModalOpen: (open) => set({ isMobModalOpen: open }),

  nextTurn: () => {
    const { combatants, currentTurnIndex, roundCounter, undoStack, addDiceLog, combatLog } = get();
    if (combatants.length === 0) return;

    const snapshot = createSnapshot(get(), 'Следующий ход');
    const nextUndoStack = [...undoStack, snapshot].slice(-30);

    let nextIndex = (currentTurnIndex + 1) % combatants.length;
    let nextRound = roundCounter;
    const isRoundAdvancing = nextIndex === 0;
    if (isRoundAdvancing) {
      nextRound += 1;
    }

    const expiredLogs: string[] = [];
    const conditionLogEntries: CombatLogEntry[] = [];

    // Clone combatants to update condition durations & turn-start mechanics
    const updatedCombatants = combatants.map((c, idx) => {
      const remainingConditions: ActiveCondition[] = [];
      const cName = cleanRussianText(c.nameRu || c.name);

      for (const cond of c.conditions || []) {
        let isExpired = false;

        // 1. Condition expiring at end of combatant's turn (e.g. "До конца следующего хода")
        if (idx === currentTurnIndex && cond.triggerOn === 'end_of_turn') {
          if (cond.expiryRound === undefined || roundCounter >= cond.expiryRound) {
            isExpired = true;
          }
        }

        // 2. Condition expiring at start of combatant's turn
        if (idx === nextIndex && cond.triggerOn === 'start_of_turn') {
          if (cond.expiryRound === undefined || nextRound >= cond.expiryRound) {
            isExpired = true;
          }
        }

        // 3. Absolute round expiration when round counter increments
        if (isRoundAdvancing && cond.expiryRound !== undefined && nextRound > cond.expiryRound) {
          isExpired = true;
        }

        if (isExpired) {
          const condMeta = CONDITIONS_2024_DATA[cond.type];
          const condName = condMeta?.nameRu || cond.type;
          expiredLogs.push(`Состояние [${condName}] у [${cName}] завершилось!`);
          conditionLogEntries.push({
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            round: nextRound,
            type: 'condition_remove',
            actorName: cName,
            text: `Завершилось состояние [${condName}] у [${cName}]`,
          });
        } else {
          remainingConditions.push(cond);
        }
      }

      if (idx === nextIndex) {
        // TURN START MECHANICS:
        // 1. Replenish Reaction
        // 2. Replenish Boss Legendary Actions strictly at the start of its own turn!
        const restoredLegendary =
          c.legendaryActions.max > 0
            ? { ...c.legendaryActions, current: c.legendaryActions.max }
            : c.legendaryActions;

        return {
          ...c,
          conditions: remainingConditions,
          reactionUsed: false,
          legendaryActions: restoredLegendary,
        };
      }

      return {
        ...c,
        conditions: remainingConditions,
      };
    });

    // Advance active effects stack upon round increment (turnIndex === 0 and round > 1)
    const currentActiveEffects = get().activeEffects || {};
    let nextActiveEffects = currentActiveEffects;
    const expiredEffectMsgs: string[] = [];

    if (isRoundAdvancing && nextRound > 1) {
      nextActiveEffects = {};
      Object.entries(currentActiveEffects).forEach(([cId, effects]) => {
        const combatant = combatants.find((c) => c.id === cId);
        const cName = combatant ? cleanRussianText(combatant.nameRu || combatant.name) : 'Боец';
        const { remainingEffects, expiredEffects } = advanceEffectsRound(effects);
        nextActiveEffects[cId] = remainingEffects;

        for (const exp of expiredEffects) {
          const msg = `Действие эффекта [${exp.name}] у [${cName}] завершилось`;
          expiredEffectMsgs.push(msg);
          conditionLogEntries.push({
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            round: nextRound,
            type: 'condition_remove',
            actorName: cName,
            text: msg,
          });
        }
      });

      if (expiredEffectMsgs.length > 0) {
        usePartyStore.getState().showToast(expiredEffectMsgs.join('; '));
      }
    }

    // Add dice log entries for expired conditions
    expiredLogs.forEach((msg) => {
      addDiceLog({
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        combatantName: 'Длительность эффектов',
        actionName: 'Истечение состояния',
        note: msg,
      });
    });

    const activeId = updatedCombatants[nextIndex]?.id || null;
    const activeCombatant = updatedCombatants[nextIndex];
    const activeName = activeCombatant ? cleanRussianText(activeCombatant.nameRu || activeCombatant.name) : 'Боец';

    const newCombatLogs: CombatLogEntry[] = [];
    if (isRoundAdvancing) {
      newCombatLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: nextRound,
        type: 'round',
        text: `─── НАЧАЛО РАУНДА ${nextRound} ───`,
      });
    }

    newCombatLogs.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: nextRound,
      type: 'turn',
      actorName: activeName,
      text: `Ход переходит к: ${activeName}${activeCombatant?.isPlayer ? ' (Игрок)' : ''}`,
    });

    const newState = {
      combatants: updatedCombatants,
      activeEffects: nextActiveEffects,
      currentTurnIndex: nextIndex,
      roundCounter: nextRound,
      activeCombatantId: activeId,
      inspectedCombatantId: activeId,
      undoStack: nextUndoStack,
      redoStack: [],
      combatLog: [...newCombatLogs, ...conditionLogEntries, ...combatLog].slice(0, 300),
    };

    set(newState);
    debouncedAutosave(newState);
    get().broadcastCurrentState();
  },

  prevTurn: () => {
    const { combatants, currentTurnIndex, roundCounter, undoStack, combatLog } = get();
    if (combatants.length === 0) return;

    const snapshot = createSnapshot(get(), 'Предыдущий ход');
    const nextUndoStack = [...undoStack, snapshot].slice(-30);

    let prevIndex = currentTurnIndex - 1;
    let prevRound = roundCounter;
    if (prevIndex < 0) {
      prevIndex = combatants.length - 1;
      prevRound = Math.max(1, roundCounter - 1);
    }

    const activeId = combatants[prevIndex]?.id || null;
    const activeCombatant = combatants[prevIndex];
    const activeName = activeCombatant ? cleanRussianText(activeCombatant.nameRu || activeCombatant.name) : 'Боец';

    const turnLog: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: prevRound,
      type: 'turn',
      actorName: activeName,
      text: `Возврат хода к: ${activeName}`,
    };

    const newState = {
      currentTurnIndex: prevIndex,
      roundCounter: prevRound,
      activeCombatantId: activeId,
      inspectedCombatantId: activeId,
      undoStack: nextUndoStack,
      redoStack: [],
      combatLog: [turnLog, ...combatLog].slice(0, 300),
    };

    set(newState);
    debouncedAutosave({ ...get(), ...newState });
    get().broadcastCurrentState();
  },

  setCurrentTurnIndex: (index) => {
    const { combatants } = get();
    if (index >= 0 && index < combatants.length) {
      const activeId = combatants[index]?.id || null;
      set({ currentTurnIndex: index, activeCombatantId: activeId, inspectedCombatantId: activeId });
      get().triggerAutosave();
    }
  },

  setRound: (round) => {
    const nextRound = Math.max(1, round);
    const roundLog: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: nextRound,
      type: 'round',
      text: `Раунд вручную изменён на ${nextRound}`,
    };
    set((state) => ({
      roundCounter: nextRound,
      combatLog: [roundLog, ...state.combatLog].slice(0, 300),
    }));
    get().triggerAutosave();
  },

  sortByInitiative: () => {
    set((state) => {
      const snapshot = createSnapshot(state, 'Сортировка по инициативе');
      const sorted = [...state.combatants].sort((a, b) => {
        if (b.initiative !== a.initiative) {
          return b.initiative - a.initiative;
        }
        if (b.initBonus !== a.initBonus) {
          return b.initBonus - a.initBonus;
        }
        const aPassive = a.passiveInit ?? (10 + a.initBonus);
        const bPassive = b.passiveInit ?? (10 + b.initBonus);
        return bPassive - aPassive;
      });
      const activeId = sorted[0]?.id || null;
      const sortLog: CombatLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: state.roundCounter,
        type: 'custom',
        text: `Очередь боя отсортирована по инициативе`,
      };
      const newState = {
        combatants: sorted,
        currentTurnIndex: 0,
        activeCombatantId: activeId,
        inspectedCombatantId: activeId,
        undoStack: [...state.undoStack, snapshot].slice(-30),
        redoStack: [],
        combatLog: [sortLog, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
    get().broadcastCurrentState();
  },

  resetCombat: () => {
    const snapshot = createSnapshot(get(), 'Сброс боя');
    const resetLog: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: 1,
      type: 'custom',
      text: `Очередь боя очищена, раунды сброшены`,
    };
    const newState = {
      combatants: [],
      currentTurnIndex: 0,
      roundCounter: 1,
      activeCombatantId: null,
      inspectedCombatantId: null,
      undoStack: [...get().undoStack, snapshot].slice(-30),
      redoStack: [],
      combatLog: [resetLog, ...get().combatLog].slice(0, 300),
    };
    set(newState);
    debouncedAutosave(newState);
    get().broadcastCurrentState();
  },

  setInspectedCombatantId: (id) => {
    set({ inspectedCombatantId: id });
  },

  populateDefaultEncounter: () => {
    const samples = createSampleCombatants();
    const newState = {
      combatants: samples,
      currentTurnIndex: 0,
      roundCounter: 1,
      activeCombatantId: samples[0]?.id || null,
      inspectedCombatantId: samples[0]?.id || null,
    };
    set(newState);
    get().autoArrangeCombatantsOnMap();
  },

  checkForSavedSession: async () => {
    const saved = await loadActiveCombatFromDisk();
    if (saved && Array.isArray(saved.combatants) && saved.combatants.length > 0) {
      set({
        hasSavedSessionPrompt: true,
        savedSessionData: saved,
      });
    }
  },

  restoreSavedSession: () => {
    const { savedSessionData } = get();
    if (savedSessionData) {
      const rawCombatants = Array.isArray(savedSessionData.combatants) ? savedSessionData.combatants : [];
      const sanitizedCombatants = rawCombatants.map((c: any, index: number) =>
        createDefaultCombatant(
          {
            ...c,
            name: c.name || c.nameRu || 'Существо',
          },
          index
        )
      );
      const maxIdx = Math.max(0, sanitizedCombatants.length - 1);
      const rawTurnIndex = typeof savedSessionData.currentTurnIndex === 'number' ? savedSessionData.currentTurnIndex : 0;
      const newTurnIndex = sanitizedCombatants.length > 0 ? Math.min(Math.max(0, rawTurnIndex), maxIdx) : 0;

      const activeId =
        savedSessionData.activeCombatantId && sanitizedCombatants.some((c: any) => c.id === savedSessionData.activeCombatantId)
          ? savedSessionData.activeCombatantId
          : sanitizedCombatants[newTurnIndex]?.id || null;

      const inspectedId =
        savedSessionData.inspectedCombatantId && sanitizedCombatants.some((c: any) => c.id === savedSessionData.inspectedCombatantId)
          ? savedSessionData.inspectedCombatantId
          : activeId;

      const newState = {
        systemId: savedSessionData.systemId || savedSessionData.system_id || 'dnd5e_2024',
        systemVersion: savedSessionData.systemVersion || savedSessionData.system_version || '2.0.0',
        combatants: sanitizedCombatants,
        currentTurnIndex: newTurnIndex,
        roundCounter: savedSessionData.roundCounter || 1,
        activeCombatantId: activeId,
        inspectedCombatantId: inspectedId,
        combatLog: Array.isArray(savedSessionData.combatLog) ? savedSessionData.combatLog : [],
        undoStack: [],
        redoStack: [],
        hasSavedSessionPrompt: false,
        savedSessionData: null,
      };

      set(newState);
      debouncedAutosave(newState);
      get().broadcastCurrentState();
    }
  },

  dismissSavedSession: () => {
    clearActiveCombatDisk();
    set({
      hasSavedSessionPrompt: false,
      savedSessionData: null,
    });
  },
});
