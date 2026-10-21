import { create } from 'zustand';
import {
  DiceTheme,
  DiceDisplayMode,
  RollBatchRequest,
  RollSingleDieRequest,
} from '../engine/dice3d/types';

interface Dice3dStoreState {
  is3dEnabled: boolean;
  isSecretRoll: boolean;
  theme: DiceTheme;
  displayMode: DiceDisplayMode;
  activeBatch: RollBatchRequest | null;
  shouldSkipAnimation: boolean;

  set3dEnabled: (enabled: boolean) => void;
  toggle3dEnabled: () => void;
  setSecretRoll: (secret: boolean) => void;
  toggleSecretRoll: () => void;
  setTheme: (theme: DiceTheme) => void;
  setDisplayMode: (mode: DiceDisplayMode) => void;
  toggleDisplayMode: () => void;

  rollDice3d: (params: {
    dice: Array<{
      sides: number;
      result?: number;
      isDiscarded?: boolean;
      isHighlighted?: boolean;
    }>;
    title?: string;
    total?: number;
    isSecret?: boolean;
    theme?: DiceTheme;
    rollMode?: 'normal' | 'advantage' | 'disadvantage';
    displayMode?: DiceDisplayMode;
  }) => RollBatchRequest | null;

  skipActiveBatch: () => void;
  clearActiveBatch: () => void;
}

const STORAGE_3D_ENABLED = 'dnd_ait_dice3d_enabled_v2';
const STORAGE_SECRET_ROLL = 'dnd_ait_dice3d_secret';
const STORAGE_THEME = 'dnd_ait_dice3d_theme';
const STORAGE_DISPLAY_MODE = 'dnd_ait_dice3d_display_mode';

function getInitial3dEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(STORAGE_3D_ENABLED);
    return val !== 'false';
  } catch {
    return true;
  }
}

function getInitialSecretRoll(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_SECRET_ROLL);
    return val === 'true';
  } catch {
    return false;
  }
}

function getInitialTheme(): DiceTheme {
  if (typeof window === 'undefined') return 'obsidian';
  try {
    const val = localStorage.getItem(STORAGE_THEME) as DiceTheme;
    if (val === 'classic' || val === 'ruby' || val === 'bone' || val === 'obsidian') {
      return val;
    }
    return 'obsidian';
  } catch {
    return 'obsidian';
  }
}

function getInitialDisplayMode(): DiceDisplayMode {
  if (typeof window === 'undefined') return 'tray';
  try {
    const val = localStorage.getItem(STORAGE_DISPLAY_MODE) as DiceDisplayMode;
    if (val === 'fullscreen' || val === 'tray') return val;
    return 'tray';
  } catch {
    return 'tray';
  }
}

export const useDice3dStore = create<Dice3dStoreState>((set, get) => ({
  is3dEnabled: getInitial3dEnabled(),
  isSecretRoll: getInitialSecretRoll(),
  theme: getInitialTheme(),
  displayMode: getInitialDisplayMode(),
  activeBatch: null,
  shouldSkipAnimation: false,

  set3dEnabled: (enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_3D_ENABLED, String(enabled));
    } catch {}
    set({ is3dEnabled: enabled });
  },

  toggle3dEnabled: () => {
    const next = !get().is3dEnabled;
    try {
      localStorage.setItem(STORAGE_3D_ENABLED, String(next));
    } catch {}
    set({ is3dEnabled: next });
  },

  setSecretRoll: (secret: boolean) => {
    try {
      localStorage.setItem(STORAGE_SECRET_ROLL, String(secret));
    } catch {}
    set({ isSecretRoll: secret });
  },

  toggleSecretRoll: () => {
    const next = !get().isSecretRoll;
    try {
      localStorage.setItem(STORAGE_SECRET_ROLL, String(next));
    } catch {}
    set({ isSecretRoll: next });
  },

  setTheme: (theme: DiceTheme) => {
    try {
      localStorage.setItem(STORAGE_THEME, theme);
    } catch {}
    set({ theme });
  },

  setDisplayMode: (mode: DiceDisplayMode) => {
    try {
      localStorage.setItem(STORAGE_DISPLAY_MODE, mode);
    } catch {}
    set({ displayMode: mode });
  },

  toggleDisplayMode: () => {
    const next = get().displayMode === 'tray' ? 'fullscreen' : 'tray';
    get().setDisplayMode(next);
  },

  rollDice3d: ({ dice, title, total, isSecret, theme, rollMode, displayMode }) => {
    const state = get();
    if (!state.is3dEnabled) return null;

    const effectiveSecret = isSecret !== undefined ? isSecret : state.isSecretRoll;
    const effectiveTheme = theme || state.theme;
    const effectiveDisplay = displayMode || state.displayMode;

    // Handle advantage/disadvantage highlight & discard
    let processedDice = dice.map((d, idx) => ({
      ...d,
      id: `die_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    }));

    if (rollMode === 'advantage' && processedDice.length === 2 && processedDice[0].sides === 20 && processedDice[1].sides === 20) {
      const v0 = processedDice[0].result ?? 0;
      const v1 = processedDice[1].result ?? 0;
      if (v0 >= v1) {
        processedDice[0].isHighlighted = true;
        processedDice[1].isDiscarded = true;
      } else {
        processedDice[1].isHighlighted = true;
        processedDice[0].isDiscarded = true;
      }
    } else if (rollMode === 'disadvantage' && processedDice.length === 2 && processedDice[0].sides === 20 && processedDice[1].sides === 20) {
      const v0 = processedDice[0].result ?? 0;
      const v1 = processedDice[1].result ?? 0;
      if (v0 <= v1) {
        processedDice[0].isHighlighted = true;
        processedDice[1].isDiscarded = true;
      } else {
        processedDice[1].isHighlighted = true;
        processedDice[0].isDiscarded = true;
      }
    }

    const singleDice: RollSingleDieRequest[] = processedDice.map((d) => ({
      id: d.id,
      sides: d.sides,
      targetValue: d.result,
      isDiscarded: d.isDiscarded,
      isHighlighted: d.isHighlighted,
    }));

    const batch: RollBatchRequest = {
      id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      dice: singleDice,
      title: title || 'Бросок костей',
      total,
      isSecret: effectiveSecret,
      theme: effectiveTheme,
      timestamp: Date.now(),
      rollMode,
      displayMode: effectiveDisplay,
    };

    set({ activeBatch: batch, shouldSkipAnimation: false });
    return batch;
  },

  skipActiveBatch: () => {
    set({ shouldSkipAnimation: true });
  },

  clearActiveBatch: () => {
    set({ activeBatch: null, shouldSkipAnimation: false });
  },
}));
