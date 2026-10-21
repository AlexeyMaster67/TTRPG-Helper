import { Combatant, DiceRollLogEntry, CombatLogEntry } from '../../types/combat';
import { ActiveCondition, ConditionType, DamageComponent } from '../../types/dnd5e';
import { DeathSaveResult } from '../../engine';
import { ActiveEffectModifier } from '../../engine/effectStackEngine';
import {
  saveActiveCombatToDisk,
  loadActiveCombatFromDisk,
  ActiveCombatSaveData,
} from '../../services/combatDiskStorage';

export { loadActiveCombatFromDisk, saveActiveCombatToDisk };
export type { ActiveCombatSaveData };

export interface CombatSnapshot {
  systemId?: string;
  systemVersion?: string;
  combatants: Combatant[];
  currentTurnIndex: number;
  roundCounter: number;
  activeCombatantId: string | null;
  inspectedCombatantId: string | null;
  combatLog?: CombatLogEntry[];
  description?: string;
  activeEffects?: Record<string, ActiveEffectModifier[]>;
}

export interface ConcentrationAlert {
  combatantId: string;
  combatantName: string;
  damage: number;
  dc: number;
  conMod: number;
}

export interface CombatantSlice {
  combatants: Combatant[];
  concentrationAlert: ConcentrationAlert | null;
  clearConcentrationAlert: () => void;
  removeConcentration: (id: string) => void;
  toggleConcentration: (id: string, spellName?: string) => void;

  updateCombatantPosition: (id: string, x: number, y: number) => void;
  autoArrangeCombatantsOnMap: () => void;

  addCombatant: (data: Partial<Combatant> & { name: string }) => void;
  removeCombatant: (id: string) => void;
  updateCombatant: (id: string, updates: Partial<Combatant>) => void;

  applyDamage: (id: string, damages: DamageComponent[] | number, isCritical?: boolean, skipDefenses?: boolean) => void;
  applyHealing: (id: string, amount: number) => void;
  applyTempHp: (id: string, amount: number) => void;
  rollDeathSave: (id: string, customRoll?: number) => DeathSaveResult | null;
  addCondition: (id: string, condition: ActiveCondition) => void;
  removeCondition: (id: string, type: ConditionType) => void;
  spendLegendaryAction: (id: string, count?: number) => void;
  toggleReaction: (id: string) => void;

  activeEffects: Record<string, ActiveEffectModifier[]>;
  addEffectToCombatant: (combatantId: string, effect: ActiveEffectModifier) => void;
  removeEffectFromCombatant: (combatantId: string, effectId: string) => void;
  clearCombatantEffects: (combatantId: string) => void;
}

export interface TurnSlice {
  currentTurnIndex: number;
  roundCounter: number;
  activeCombatantId: string | null;
  inspectedCombatantId: string | null;
  hasSavedSessionPrompt: boolean;
  savedSessionData: any | null;

  isMobModalOpen: boolean;
  setMobModalOpen: (open: boolean) => void;

  nextTurn: () => void;
  prevTurn: () => void;
  setCurrentTurnIndex: (index: number) => void;
  setRound: (round: number) => void;
  sortByInitiative: () => void;
  resetCombat: () => void;
  setInspectedCombatantId: (id: string | null) => void;
  populateDefaultEncounter: () => void;

  checkForSavedSession: () => Promise<void>;
  restoreSavedSession: () => void;
  dismissSavedSession: () => void;
}

export interface TargetingSlice {
  targetedAttackModalOpen: boolean;
  targetedAttackAttackerId: string | null;
  targetedAttackActionName: string | null;
  openTargetedAttack: (attackerId?: string, actionName?: string) => void;
  closeTargetedAttack: () => void;

  currentTargetId: string | null;
  isTargetingMode: boolean;
  targetingPrompt: string | null;
  pendingAttackAction: any | null;
  pendingAttackerId: string | null;
  attackAdvantageMode: 'normal' | 'advantage' | 'disadvantage';
  setCurrentTargetId: (id: string | null) => void;
  toggleCurrentTargetId: (id: string) => void;
  startTargetingMode: (attackerId: string, action?: any, prompt?: string) => void;
  cancelTargetingMode: () => void;
  setAttackAdvantageMode: (mode: 'normal' | 'advantage' | 'disadvantage') => void;
  executeTargetedStrike: (
    attackerId: string,
    targetId: string,
    action: any,
    advantageMode?: 'normal' | 'advantage' | 'disadvantage'
  ) => void;
  executeMultiattackSeries: (attackerId: string, targetId: string) => void;
}

export interface DiceSlice {
  diceLog: DiceRollLogEntry[];
  diceHistory: DiceRollLogEntry[];
  addDiceLog: (entry: DiceRollLogEntry) => void;
  clearDiceLog: () => void;
  addDiceHistory: (entry: DiceRollLogEntry) => void;
}

export interface PersistenceSlice {
  undoStack: CombatSnapshot[];
  redoStack: CombatSnapshot[];
  undoLastAction: () => void;
  redoLastAction: () => void;

  combatLog: CombatLogEntry[];
  addCombatLog: (entry: Omit<CombatLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => void;
  clearCombatLog: () => void;
  isCombatLogOpen: boolean;
  setCombatLogOpen: (open: boolean) => void;

  broadcastCurrentState: () => void;
  triggerAutosave: () => void;
  exportCombatSessionJson: () => string;
  importCombatSessionJson: (json: string) => boolean;

  systemId: string;
  systemVersion: string;
  setSystemId: (newSystemId: string, force?: boolean) => { success: boolean; error?: string };
  duplicateCampaignInSystem: (targetSystemId: string) => {
    success: boolean;
    warning: string;
    duplicatedState: Partial<CombatState>;
  };
}

export interface CombatState
  extends CombatantSlice,
    TurnSlice,
    TargetingSlice,
    DiceSlice,
    PersistenceSlice {}
