import { StateCreator } from 'zustand';
import { createDefaultCombatant, CombatLogEntry } from '../../types/combat';
import { DamageComponent, DamageType } from '../../types/dnd5e';
import {
  processDamagePipeline,
  processHealing,
  addTempHp,
  addCondition,
  removeCondition,
  evaluateDeathSave,
} from '../../engine';
import { cleanRussianText, localizeDamageType } from '../../utils/textUtils';
import { checkHasDefense } from '../../utils/attackParser';
import { useMapStore } from '../mapStore';
import { CombatState, CombatantSlice } from './types';
import {
  debouncedAutosave,
  createSnapshot,
  getCombatantConMod,
  defaultInitialCombatants,
} from './sliceUtils';

export const createCombatantSlice: StateCreator<
  CombatState,
  [],
  [],
  CombatantSlice
> = (set, get) => ({
  combatants: defaultInitialCombatants,
  activeEffects: {},
  concentrationAlert: null,

  clearConcentrationAlert: () => set({ concentrationAlert: null }),

  removeConcentration: (id: string) => {
    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            isConcentrating: false,
            concentratingSpell: undefined,
            conditions: (c.conditions || []).filter((cond: any) => {
              const t = String(cond?.type || cond?.name || cond || '').toLowerCase();
              const s = String(cond?.source || '').toLowerCase();
              return !t.includes('concentration') && !t.includes('концентрация') && !s.includes('concentration') && !s.includes('концентрация');
            }),
          };
        }
        return c;
      });
      const newState = { combatants };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
    get().triggerAutosave();
  },

  updateCombatantPosition: (id, x, y) => {
    set((state) => {
      const combatants = state.combatants.map((c) =>
        c.id === id ? { ...c, tokenX: Math.round(x), tokenY: Math.round(y) } : c
      );
      const newState = { combatants };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
    get().broadcastCurrentState();
  },

  autoArrangeCombatantsOnMap: () => {
    const { combatants } = get();
    const cellSize = useMapStore.getState().gridCellSize || 50;
    let playerIdx = 0;
    let enemyIdx = 0;

    const updated = combatants.map((c) => {
      if (c.isPlayer) {
        const x = (playerIdx % 2) * cellSize * 2 + cellSize * 2;
        const y = Math.floor(playerIdx / 2) * cellSize * 2 + cellSize * 3;
        playerIdx++;
        return { ...c, tokenX: Math.round(x), tokenY: Math.round(y) };
      } else {
        const x = (enemyIdx % 3) * cellSize * 2 + cellSize * 8;
        const y = Math.floor(enemyIdx / 3) * cellSize * 2 + cellSize * 3;
        enemyIdx++;
        return { ...c, tokenX: Math.round(x), tokenY: Math.round(y) };
      }
    });

    set({ combatants: updated });
    get().triggerAutosave();
  },

  addCombatant: (data) => {
    set((state) => {
      let candidateX = data.tokenX;
      let candidateY = data.tokenY;

      if (candidateX === undefined || candidateY === undefined) {
        const occupied = new Set(
          state.combatants.map((c) => `${c.tokenX ?? 80},${c.tokenY ?? 80}`)
        );
        let slot = 0;
        while (occupied.has(`${(slot % 4) * 80 + 80},${Math.floor(slot / 4) * 80 + 80}`)) {
          slot++;
        }
        if (candidateX === undefined) candidateX = (slot % 4) * 80 + 80;
        if (candidateY === undefined) candidateY = Math.floor(slot / 4) * 80 + 80;
      }

      const newCombatant = createDefaultCombatant(
        {
          ...data,
          tokenX: candidateX,
          tokenY: candidateY,
        },
        state.combatants.length
      );
      const snapshot = createSnapshot(state, `Добавлен ${newCombatant.name}`);
      const combatants = [...state.combatants, newCombatant];
      const activeCombatantId =
        state.activeCombatantId || (combatants.length > 0 ? combatants[0].id : null);
      const inspectedCombatantId = state.inspectedCombatantId || newCombatant.id;
      const addLog: CombatLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: state.roundCounter,
        type: 'custom',
        actorName: cleanRussianText(newCombatant.nameRu || newCombatant.name),
        text: `➕ Добавлен в бой: ${cleanRussianText(newCombatant.nameRu || newCombatant.name)} (Иниц: ${newCombatant.initiative}, ОЗ: ${newCombatant.hp}/${newCombatant.maxHp})`,
      };
      const newState = {
        combatants,
        activeCombatantId,
        inspectedCombatantId,
        undoStack: [...state.undoStack, snapshot].slice(-30),
        redoStack: [],
        combatLog: [addLog, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  removeCombatant: (id) => {
    set((state) => {
      const removed = state.combatants.find((c) => c.id === id);
      const snapshot = createSnapshot(state, `Удален ${removed?.name || 'Боец'}`);
      const filtered = state.combatants.filter((c) => c.id !== id);
      let nextIndex = state.currentTurnIndex;
      if (nextIndex >= filtered.length) {
        nextIndex = Math.max(0, filtered.length - 1);
      }
      const activeCombatantId = filtered[nextIndex]?.id || null;
      const inspectedCombatantId =
        state.inspectedCombatantId === id ? activeCombatantId : state.inspectedCombatantId;
      const remLog: CombatLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: state.roundCounter,
        type: 'custom',
        text: `Удален из боя: ${cleanRussianText(removed?.nameRu || removed?.name || 'Боец')}`,
      };
      const nextActiveEffects = { ...state.activeEffects };
      delete nextActiveEffects[id];
      const newState = {
        combatants: filtered,
        activeEffects: nextActiveEffects,
        currentTurnIndex: nextIndex,
        activeCombatantId,
        inspectedCombatantId,
        undoStack: [...state.undoStack, snapshot].slice(-30),
        redoStack: [],
        combatLog: [remLog, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  updateCombatant: (id, updates) => {
    set((state) => {
      const combatants = state.combatants.map((c) => (c.id === id ? { ...c, ...updates } : c));
      const newState = { combatants };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  applyDamage: (id, damages, isCritical = false, skipDefenses = false) => {
    const normDamages: DamageComponent[] = typeof damages === 'number'
      ? [{ amount: damages, type: 'slashing' as DamageType }]
      : damages;

    const { combatants, addDiceLog } = get();
    const target = combatants.find((c) => c.id === id);
    if (!target) return;

    const immunities = new Set(target.damageImmunities || []);
    const resistances = new Set(target.damageResistances || []);
    const vulnerabilities = new Set(target.damageVulnerabilities || []);

    if (!skipDefenses) {
      const allTypes: DamageType[] = [
        'acid', 'bludgeoning', 'cold', 'fire', 'force',
        'lightning', 'necrotic', 'piercing', 'poison',
        'psychic', 'radiant', 'slashing', 'thunder',
      ];
      for (const t of allTypes) {
        if (!immunities.has(t) && checkHasDefense(target.statblock?.damage_immunities, t)) {
          immunities.add(t);
        }
        if (!resistances.has(t) && checkHasDefense(target.statblock?.damage_resistances, t)) {
          resistances.add(t);
        }
        if (!vulnerabilities.has(t) && checkHasDefense(target.statblock?.damage_vulnerabilities, t)) {
          vulnerabilities.add(t);
        }
      }
    }

    const result = processDamagePipeline(
      normDamages,
      {
        hp: target.hp,
        maxHp: target.maxHp,
        tempHp: target.tempHp,
        isDying: target.isDying,
        isDead: target.isDead,
        deathSaveFailures: target.deathSaves?.failures ?? 0,
        defenses: {
          damageImmunities: Array.from(immunities),
          damageResistances: Array.from(resistances),
          damageVulnerabilities: Array.from(vulnerabilities),
        },
      },
      { isCritical, skipDefenses }
    );

    const updatedDeathSaves = {
      successes: result.newHp > 0 ? 0 : (target.deathSaves?.successes ?? 0),
      failures: result.newDeathSaveFailures,
    };

    const targetName = cleanRussianText(target.nameRu || target.name);
    const dmgAmount = result.totalEffectiveDamage > 0
      ? result.totalEffectiveDamage
      : (typeof damages === 'number' ? damages : normDamages.reduce((sum, d) => sum + d.amount, 0));

    // Check if target has concentration
    const hasConcCondition = Array.isArray(target.conditions) && target.conditions.some((c: any) => {
      const t = String(c?.type || c?.name || c || '').toLowerCase();
      const s = String(c?.source || '').toLowerCase();
      return t.includes('concentration') || t.includes('концентрация') || s.includes('concentration') || s.includes('концентрация');
    });
    const isTargetConcentrating = Boolean(target.isConcentrating) || hasConcCondition;

    let nextAlert = get().concentrationAlert;
    if (isTargetConcentrating && dmgAmount > 0) {
      const dc = Math.max(10, Math.floor(dmgAmount / 2));
      const conMod = getCombatantConMod(target);

      nextAlert = {
        combatantId: target.id,
        combatantName: targetName,
        damage: dmgAmount,
        dc,
        conMod,
      };

      // Add prominent entry into diceHistory / combat log
      addDiceLog({
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        combatantName: targetName,
        actionName: 'Проверка концентрации',
        note: `⚡ ${targetName} получает ${dmgAmount} урона! Требуется спасбросок концентрации (Телосложение) СЛ ${dc}!`,
        concentrationPrompt: {
          dc,
          targetId: target.id,
        },
      });
    }

    // If target took damage while concentrating, concentration is broken if knocked out
    let finalIsConcentrating = target.isConcentrating;
    if (result.totalEffectiveDamage > 0 && target.hp > 0 && result.newHp <= 0) {
      finalIsConcentrating = false; // incapacitated / knocked out breaks concentration
    }

    const snapshot = createSnapshot(get(), `Урон по ${targetName}`);
    const nextUndoStack = [...get().undoStack, snapshot].slice(-30);

    const dmgLog: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: get().roundCounter,
      type: isCritical ? 'attack' : 'damage',
      targetName,
      text: `💥 ${targetName} получает ${dmgAmount} урона (ОЗ: ${target.hp} ➔ ${result.newHp}/${target.maxHp})${isCritical ? ' [КРИТ!]' : ''}`,
      value: dmgAmount,
      isCritical,
      details: result.components?.map((c) => `${c.effectiveAmount} ${localizeDamageType(c.type)}`).join(', '),
    };

    const statusLogs: CombatLogEntry[] = [];
    if (result.newHp <= 0 && target.hp > 0) {
      statusLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: get().roundCounter,
        type: 'knockout',
        targetName,
        text: `💀 ${targetName} теряет сознание (0 ОЗ)!`,
      });
    }
    if (result.isDead && !target.isDead) {
      statusLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: get().roundCounter,
        type: 'death',
        targetName,
        text: `☠️ ${targetName} погибает!`,
      });
    }

    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            hp: result.newHp,
            tempHp: result.newTempHp,
            isDying: result.isDying,
            isDead: result.isDead,
            deathSaves: updatedDeathSaves,
            isConcentrating: finalIsConcentrating,
            conditions: result.newHp <= 0
              ? (c.conditions || []).filter((cond: any) => {
                  const t = String(cond?.type || cond?.name || cond || '').toLowerCase();
                  const s = String(cond?.source || '').toLowerCase();
                  return !t.includes('concentration') && !t.includes('концентрация') && !s.includes('concentration') && !s.includes('концентрация');
                })
              : c.conditions,
          };
        }
        return c;
      });
      const newState = {
        combatants,
        concentrationAlert: nextAlert,
        undoStack: nextUndoStack,
        redoStack: [],
        combatLog: [...statusLogs, dmgLog, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  applyHealing: (id, amount) => {
    const { combatants } = get();
    const target = combatants.find((c) => c.id === id);
    if (!target) return;

    const targetName = cleanRussianText(target.nameRu || target.name);
    const snapshot = createSnapshot(get(), `Лечение ${targetName}`);
    const nextUndoStack = [...get().undoStack, snapshot].slice(-30);

    const result = processHealing(target.hp, target.maxHp, amount);
    const healLog: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: get().roundCounter,
      type: 'heal',
      targetName,
      text: `💚 ${targetName}: исцеление +${amount} ОЗ (ОЗ: ${target.hp} ➔ ${result.newHp}/${target.maxHp})`,
      value: amount,
    };

    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            hp: result.newHp,
            isDying: result.newHp > 0 ? false : c.isDying,
            isDead: result.newHp > 0 ? false : c.isDead,
            deathSaves: result.newHp > 0 ? { successes: 0, failures: 0 } : c.deathSaves,
          };
        }
        return c;
      });
      const newState = {
        combatants,
        undoStack: nextUndoStack,
        redoStack: [],
        combatLog: [healLog, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  applyTempHp: (id, amount) => {
    const { combatants } = get();
    const target = combatants.find((c) => c.id === id);
    if (!target) return;
    const targetName = cleanRussianText(target.nameRu || target.name);
    const snapshot = createSnapshot(get(), `Врем. ОЗ ${targetName}`);
    const nextUndoStack = [...get().undoStack, snapshot].slice(-30);

    const tempLog: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: get().roundCounter,
      type: 'temp_hp',
      targetName,
      text: `🛡️ ${targetName}: получено ${amount} временных ОЗ`,
      value: amount,
    };

    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            tempHp: addTempHp(c.tempHp, amount),
          };
        }
        return c;
      });
      const newState = {
        combatants,
        undoStack: nextUndoStack,
        redoStack: [],
        combatLog: [tempLog, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  rollDeathSave: (id, customRoll) => {
    const { combatants } = get();
    const target = combatants.find((c) => c.id === id);
    if (!target || !target.isDying || target.isDead) return null;

    const targetName = cleanRussianText(target.nameRu || target.name);
    const snapshot = createSnapshot(get(), `Спасбросок смерти ${targetName}`);
    const nextUndoStack = [...get().undoStack, snapshot].slice(-30);

    const d20 = customRoll ?? (Math.floor(Math.random() * 20) + 1);
    const result = evaluateDeathSave(target.deathSaves || { successes: 0, failures: 0 }, d20);

    let outcome = '';
    if (result.revived) outcome = `Критический успех (20)! Встал с 1 ОЗ!`;
    else if (result.isDead) outcome = `3 провала! Смерть персонажа.`;
    else if (result.successesAdded > 0) outcome = `Успех (${d20})! [${result.newSuccesses}/3 успехов]`;
    else outcome = `Провал (${d20})! [${result.newFailures}/3 провалов]`;

    const dsLog: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: get().roundCounter,
      type: 'death_save',
      targetName,
      text: `${targetName}: спасбросок от смерти [d20 = ${d20}] — ${outcome}`,
      value: d20,
      isCritical: d20 === 20 || d20 === 1,
    };

    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            hp: result.revived ? result.hpGained : c.hp,
            isDying: result.revived ? false : c.isDying,
            isDead: result.isDead,
            deathSaves: {
              successes: result.newSuccesses,
              failures: result.newFailures,
            },
          };
        }
        return c;
      });
      const newState = {
        combatants,
        undoStack: nextUndoStack,
        redoStack: [],
        combatLog: [dsLog, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });

    return result;
  },

  addCondition: (id, condition) => {
    const { combatants } = get();
    const target = combatants.find((c) => c.id === id);
    if (!target) return;
    const targetName = cleanRussianText(target.nameRu || target.name);
    const snapshot = createSnapshot(get(), `Состояние ${condition.type} для ${targetName}`);
    const nextUndoStack = [...get().undoStack, snapshot].slice(-30);

    const condLog: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: get().roundCounter,
      type: 'condition_add',
      targetName,
      text: `⚡ ${targetName} получает состояние: "${condition.type}"`,
      details: condition.source ? `Источник: ${condition.source}` : undefined,
    };

    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id) {
          const { conditions, isDead } = addCondition(c.conditions, condition);
          return {
            ...c,
            conditions,
            isDead: isDead || c.isDead,
          };
        }
        return c;
      });
      const newState = {
        combatants,
        undoStack: nextUndoStack,
        redoStack: [],
        combatLog: [condLog, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  removeCondition: (id, type) => {
    const { combatants } = get();
    const target = combatants.find((c) => c.id === id);
    if (!target) return;
    const targetName = cleanRussianText(target.nameRu || target.name);
    const snapshot = createSnapshot(get(), `Снятие ${type} с ${targetName}`);
    const nextUndoStack = [...get().undoStack, snapshot].slice(-30);

    const condLog: CombatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: get().roundCounter,
      type: 'condition_remove',
      targetName,
      text: `Снято состояние "${type}" с ${targetName}`,
    };

    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            conditions: removeCondition(c.conditions, type),
          };
        }
        return c;
      });
      const newState = {
        combatants,
        undoStack: nextUndoStack,
        redoStack: [],
        combatLog: [condLog, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  spendLegendaryAction: (id, count = 1) => {
    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id && c.legendaryActions.max > 0) {
          const nextVal = Math.max(0, c.legendaryActions.current - count);
          return {
            ...c,
            legendaryActions: { ...c.legendaryActions, current: nextVal },
          };
        }
        return c;
      });
      const newState = { combatants };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  toggleReaction: (id) => {
    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id) {
          return { ...c, reactionUsed: !c.reactionUsed };
        }
        return c;
      });
      const newState = { combatants };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  toggleConcentration: (id, spellName) => {
    set((state) => {
      const combatants = state.combatants.map((c) => {
        if (c.id === id) {
          const nextVal = !c.isConcentrating;
          return {
            ...c,
            isConcentrating: nextVal,
            concentratingSpell: nextVal ? spellName || c.concentratingSpell : undefined,
          };
        }
        return c;
      });
      const newState = { combatants };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  addEffectToCombatant: (combatantId, effect) => {
    set((state) => {
      const combatant = state.combatants.find((c) => c.id === combatantId);
      const cName = cleanRussianText(combatant?.nameRu || combatant?.name || 'Боец');
      const snapshot = createSnapshot(state, `Эффект ${effect.name} наложен на ${cName}`);
      const currentList = state.activeEffects[combatantId] || [];
      const updatedList = [...currentList, effect];
      const nextActiveEffects = {
        ...state.activeEffects,
        [combatantId]: updatedList,
      };

      const logEntry: CombatLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: state.roundCounter,
        type: 'custom',
        actorName: cName,
        text: `Эффект [${effect.name}] наложен на [${cName}] (${effect.durationRounds === 'permanent' ? 'Постоянно' : `${effect.durationRounds} р.`})`,
      };

      const newState = {
        activeEffects: nextActiveEffects,
        undoStack: [...state.undoStack, snapshot].slice(-30),
        redoStack: [],
        combatLog: [logEntry, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  removeEffectFromCombatant: (combatantId, effectId) => {
    set((state) => {
      const combatant = state.combatants.find((c) => c.id === combatantId);
      const cName = cleanRussianText(combatant?.nameRu || combatant?.name || 'Боец');
      const currentList = state.activeEffects[combatantId] || [];
      const removedEffect = currentList.find((e) => e.id === effectId);
      const updatedList = currentList.filter((e) => e.id !== effectId);
      const snapshot = createSnapshot(state, `Эффект ${removedEffect?.name || ''} снят с ${cName}`);
      const nextActiveEffects = {
        ...state.activeEffects,
        [combatantId]: updatedList,
      };

      const logEntry: CombatLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: state.roundCounter,
        type: 'custom',
        actorName: cName,
        text: `Эффект [${removedEffect?.name || 'Эффект'}] снят с [${cName}]`,
      };

      const newState = {
        activeEffects: nextActiveEffects,
        undoStack: [...state.undoStack, snapshot].slice(-30),
        redoStack: [],
        combatLog: [logEntry, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },

  clearCombatantEffects: (combatantId) => {
    set((state) => {
      const combatant = state.combatants.find((c) => c.id === combatantId);
      const cName = cleanRussianText(combatant?.nameRu || combatant?.name || 'Боец');
      const snapshot = createSnapshot(state, `Очищены эффекты у ${cName}`);
      const nextActiveEffects = {
        ...state.activeEffects,
        [combatantId]: [],
      };

      const logEntry: CombatLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: state.roundCounter,
        type: 'custom',
        actorName: cName,
        text: `Все эффекты сняты с [${cName}]`,
      };

      const newState = {
        activeEffects: nextActiveEffects,
        undoStack: [...state.undoStack, snapshot].slice(-30),
        redoStack: [],
        combatLog: [logEntry, ...state.combatLog].slice(0, 300),
      };
      debouncedAutosave({ ...state, ...newState });
      return newState;
    });
  },
});
