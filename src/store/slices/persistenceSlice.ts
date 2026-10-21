import { StateCreator } from 'zustand';
import { CombatLogEntry, createDefaultCombatant } from '../../types/combat';
import { broadcastService } from '../../services/broadcastService';
import { getSystemById } from '../../systems/registry';
import { CombatState, PersistenceSlice } from './types';
import { debouncedAutosave, createSnapshot } from './sliceUtils';

export const createPersistenceSlice: StateCreator<
  CombatState,
  [],
  [],
  PersistenceSlice
> = (set, get) => ({
  undoStack: [],
  redoStack: [],
  combatLog: [],
  isCombatLogOpen: false,
  systemId: 'dnd5e_2024',
  systemVersion: '2.0.0',

  setCombatLogOpen: (open) => set({ isCombatLogOpen: open }),

  addCombatLog: (entry) => {
    const newEntry: CombatLogEntry = {
      id: entry.id || crypto.randomUUID(),
      timestamp: entry.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: entry.round ?? get().roundCounter,
      type: entry.type,
      actorName: entry.actorName,
      targetName: entry.targetName,
      text: entry.text,
      details: entry.details,
      value: entry.value,
      isCritical: entry.isCritical,
    };
    set((state) => ({
      combatLog: [newEntry, ...state.combatLog].slice(0, 300),
    }));
  },

  clearCombatLog: () => set({ combatLog: [] }),

  broadcastCurrentState: () => {
    const { combatants, currentTurnIndex, roundCounter, activeCombatantId, activeEffects } = get();
    broadcastService.send({
      type: 'SYNC_COMBAT_STATE',
      payload: { combatants, currentTurnIndex, roundCounter, activeCombatantId, activeEffects },
    });
  },

  triggerAutosave: () => {
    const { combatants, currentTurnIndex, roundCounter, activeCombatantId, activeEffects } = get();
    debouncedAutosave({ combatants, currentTurnIndex, roundCounter, activeCombatantId, activeEffects });
    get().broadcastCurrentState();
  },

  undoLastAction: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, undoStack.length - 1);
    const currentSnapshot = createSnapshot(get(), 'Текущее состояние до отмены');
    const newRedoStack = [...redoStack, currentSnapshot].slice(-30);

    const newState = {
      combatants: previous.combatants,
      activeEffects: previous.activeEffects || {},
      currentTurnIndex: previous.currentTurnIndex,
      roundCounter: previous.roundCounter,
      activeCombatantId: previous.activeCombatantId,
      inspectedCombatantId: previous.inspectedCombatantId || previous.activeCombatantId,
      combatLog: previous.combatLog || get().combatLog,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    };
    set(newState);
    debouncedAutosave(newState);
    get().broadcastCurrentState();
  },

  redoLastAction: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, redoStack.length - 1);
    const currentSnapshot = createSnapshot(get(), 'Текущее состояние до возврата');
    const newUndoStack = [...undoStack, currentSnapshot].slice(-30);

    const newState = {
      combatants: next.combatants,
      activeEffects: next.activeEffects || {},
      currentTurnIndex: next.currentTurnIndex,
      roundCounter: next.roundCounter,
      activeCombatantId: next.activeCombatantId,
      inspectedCombatantId: next.inspectedCombatantId || next.activeCombatantId,
      combatLog: next.combatLog || get().combatLog,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    };
    set(newState);
    debouncedAutosave(newState);
    get().broadcastCurrentState();
  },

  exportCombatSessionJson: () => {
    const { systemId, systemVersion, combatants, currentTurnIndex, roundCounter, activeCombatantId, diceLog, combatLog, activeEffects } = get();
    return JSON.stringify(
      {
        version: '2.0',
        system_id: systemId || 'dnd5e_2024',
        system_version: systemVersion || '2.0.0',
        systemId: systemId || 'dnd5e_2024',
        systemVersion: systemVersion || '2.0.0',
        timestamp: Date.now(),
        combatants,
        currentTurnIndex,
        roundCounter,
        activeCombatantId,
        activeEffects,
        diceLog,
        combatLog,
      },
      null,
      2
    );
  },

  importCombatSessionJson: (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data.combatants)) return false;
      const sanitizedCombatants = data.combatants.map((c: any, index: number) =>
        createDefaultCombatant(
          {
            ...c,
            name: c.name || c.nameRu || 'Существо',
          },
          index
        )
      );
      const maxIdx = Math.max(0, sanitizedCombatants.length - 1);
      const rawTurnIndex = typeof data.currentTurnIndex === 'number' ? data.currentTurnIndex : 0;
      const newTurnIndex = sanitizedCombatants.length > 0 ? Math.min(Math.max(0, rawTurnIndex), maxIdx) : 0;

      const activeId =
        data.activeCombatantId && sanitizedCombatants.some((c: any) => c.id === data.activeCombatantId)
          ? data.activeCombatantId
          : sanitizedCombatants[newTurnIndex]?.id || null;

      const inspectedId =
        data.inspectedCombatantId && sanitizedCombatants.some((c: any) => c.id === data.inspectedCombatantId)
          ? data.inspectedCombatantId
          : activeId;

      const sysId = data.systemId || data.system_id || 'dnd5e_2024';
      const sysVer = data.systemVersion || data.system_version || '2.0.0';

      const newState = {
        systemId: sysId,
        systemVersion: sysVer,
        combatants: sanitizedCombatants,
        activeEffects: data.activeEffects || {},
        currentTurnIndex: newTurnIndex,
        roundCounter: data.roundCounter || 1,
        activeCombatantId: activeId,
        inspectedCombatantId: inspectedId,
        diceLog: Array.isArray(data.diceLog) ? data.diceLog : get().diceLog,
        combatLog: Array.isArray(data.combatLog) ? data.combatLog : get().combatLog,
        undoStack: [],
        redoStack: [],
      };
      set(newState);
      debouncedAutosave(newState);
      get().broadcastCurrentState();
      return true;
    } catch {
      return false;
    }
  },

  setSystemId: (newSystemId: string, force = false) => {
    const state = get();
    if (state.systemId === newSystemId) {
      return { success: true };
    }
    // Lock active combat: cannot switch systems in-place if combatants exist and not forced
    if (state.combatants.length > 0 && !force) {
      const errorMsg = `Активный бой заблокирован в системе ${state.systemId}. Переключение системы на лету запрещено для предотвращения повреждения характеристик. Используйте функцию безопасного копирования (duplicateCampaignInSystem).`;
      console.warn(`[CombatStore] ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
    const targetMeta = getSystemById(newSystemId);
    const newVersion = targetMeta?.version || '1.0.0';
    const newState = { systemId: newSystemId, systemVersion: newVersion };
    set(newState);
    debouncedAutosave({ ...state, ...newState });
    return { success: true };
  },

  duplicateCampaignInSystem: (targetSystemId: string) => {
    const state = get();
    const targetMeta = getSystemById(targetSystemId);
    const warning = `Кампания успешно скопирована в систему ${targetMeta.name} (${targetSystemId}). Внимание: механики, классы брони, состояния и действия могут отличаться между редакциями. Пожалуйста, проверьте характеристики участников.`;

    const duplicatedCombatants = state.combatants.map((c, index) => ({
      ...JSON.parse(JSON.stringify(c)),
      id: `dup_${Date.now()}_${index}_${c.id}`,
      name: `${c.name} (${targetMeta.name})`,
      system_id: targetSystemId,
      system_version: targetMeta.version,
      systemId: targetSystemId,
      systemVersion: targetMeta.version,
    }));

    const duplicatedState: Partial<CombatState> = {
      systemId: targetSystemId,
      systemVersion: targetMeta.version,
      combatants: duplicatedCombatants,
      currentTurnIndex: 0,
      roundCounter: 1,
      activeCombatantId: duplicatedCombatants[0]?.id || null,
      inspectedCombatantId: duplicatedCombatants[0]?.id || null,
      combatLog: [],
      undoStack: [],
      redoStack: [],
    };

    return {
      success: true,
      warning,
      duplicatedState,
    };
  },
});
