import { create } from 'zustand';
import {
  CombatState,
  CombatSnapshot,
  ConcentrationAlert,
  loadActiveCombatFromDisk,
  saveActiveCombatToDisk,
  ActiveCombatSaveData,
} from './slices/types';
import {
  getCombatantConMod,
  createSampleCombatants,
  duplicateCampaignInSystem,
} from './slices/sliceUtils';
import { createCombatantSlice } from './slices/combatantSlice';
import { createTurnSlice } from './slices/turnSlice';
import { createTargetingSlice } from './slices/targetingSlice';
import { createDiceSlice } from './slices/diceSlice';
import { createPersistenceSlice } from './slices/persistenceSlice';

export {
  loadActiveCombatFromDisk,
  saveActiveCombatToDisk,
  getCombatantConMod,
  createSampleCombatants,
  duplicateCampaignInSystem,
};
export type {
  CombatState,
  CombatSnapshot,
  ConcentrationAlert,
  ActiveCombatSaveData,
};

export const useCombatStore = create<CombatState>((set, get, api) => {
  (api as any).getInitialState = () => get();
  return {
    ...createCombatantSlice(set, get, api),
    ...createTurnSlice(set, get, api),
    ...createTargetingSlice(set, get, api),
    ...createDiceSlice(set, get, api),
    ...createPersistenceSlice(set, get, api),
  };
});
