import { StateCreator } from 'zustand';
import { CombatState, DiceSlice } from './types';

export const createDiceSlice: StateCreator<
  CombatState,
  [],
  [],
  DiceSlice
> = (set, get) => ({
  diceLog: [],
  diceHistory: [],

  addDiceLog: (entry) => {
    set((state) => ({
      diceLog: [entry, ...state.diceLog].slice(0, 50),
      diceHistory: [entry, ...(state.diceHistory || state.diceLog)].slice(0, 50),
    }));
  },

  clearDiceLog: () => {
    set({ diceLog: [], diceHistory: [] });
  },

  addDiceHistory: (entry) => {
    get().addDiceLog(entry);
  },
});
