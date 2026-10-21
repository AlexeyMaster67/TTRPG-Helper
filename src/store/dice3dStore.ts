import { create } from 'zustand';
import { DiceTheme, RollBatchRequest, RollSingleDieRequest } from '../engine/dice3d/types';

interface Dice3dStoreState {
  is3dEnabled: boolean;
  isSecretRoll: boolean;
  theme: DiceTheme;
  activeBatch: RollBatchRequest | null;

  set3dEnabled: (enabled: boolean) => void;
  toggle3dEnabled: () => void;
  setSecretRoll: (secret: boolean) => void;
  toggleSecretRoll: () => void;
  setTheme: (theme: DiceTheme) => void;

  rollDice3d: (params: {
    dice: Array<{ sides: number; result?: number }>;
    title?: string;
    total?: number;
    isSecret?: boolean;
    theme?: DiceTheme;
  }) => RollBatchRequest | null;

  clearActiveBatch: () => void;
}

const STORAGE_3D_ENABLED = 'dnd_ait_dice3d_enabled';
const STORAGE_SECRET_ROLL = 'dnd_ait_dice3d_secret';
const STORAGE_THEME = 'dnd_ait_dice3d_theme';

function getInitial3dEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(STORAGE_3D_ENABLED);
    return val !== null ? val === 'true' : true;
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
  if (typeof window === 'undefined') return 'classic';
  try {
    const val = localStorage.getItem(STORAGE_THEME) as DiceTheme;
    if (val === 'classic' || val === 'ruby' || val === 'bone') return val;
    return 'classic';
  } catch {
    return 'classic';
  }
}

export const useDice3dStore = create<Dice3dStoreState>((set, get) => ({
  is3dEnabled: getInitial3dEnabled(),
  isSecretRoll: getInitialSecretRoll(),
  theme: getInitialTheme(),
  activeBatch: null,

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

  rollDice3d: ({ dice, title, total, isSecret, theme }) => {
    const state = get();
    if (!state.is3dEnabled) return null;

    const effectiveSecret = isSecret !== undefined ? isSecret : state.isSecretRoll;
    const effectiveTheme = theme || state.theme;

    const singleDice: RollSingleDieRequest[] = dice.map((d, idx) => ({
      id: `die_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      sides: d.sides,
      targetValue: d.result,
    }));

    const batch: RollBatchRequest = {
      id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      dice: singleDice,
      title: title || 'Бросок костей',
      total,
      isSecret: effectiveSecret,
      theme: effectiveTheme,
      timestamp: Date.now(),
    };

    set({ activeBatch: batch });
    return batch;
  },

  clearActiveBatch: () => {
    set({ activeBatch: null });
  },
}));
