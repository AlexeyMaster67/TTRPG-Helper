import { create } from 'zustand';
import { TokenFrameId, TokenFaction } from '../engine/tokenFrames';
import {
  PaperDollConfig,
  HeraldryConfig,
  randomProceduralTokenConfig,
  randomHeraldryConfig,
} from '../engine/proceduralTokens';

export type TokenForgeTab = 'crop' | 'procedural' | 'heraldry' | 'library' | 'forge';

export interface SavedForgeToken {
  id: string;
  name: string;
  dataUrl: string;
  frameId: TokenFrameId;
  faction: TokenFaction;
  createdAt: number;
}

export interface OpenForgeConfig {
  initialImage?: string | null;
  name?: string;
  targetCombatantId?: string | null;
  targetTokenId?: string | null;
  frameId?: TokenFrameId;
  faction?: TokenFaction;
  customColor?: string;
  glowIntensity?: number;
  initialTab?: TokenForgeTab;
}

export interface TokenForgeState {
  isOpen: boolean;
  activeTab: TokenForgeTab;

  // Target linking
  targetCombatantId: string | null;
  targetTokenId: string | null;

  // Forge Inputs
  imageSrc: string | null;
  name: string;
  currentFrame: TokenFrameId;
  currentFaction: TokenFaction;
  customColor: string;
  glowIntensity: number; // 0 - 100
  showGridOverlay: boolean;
  backgroundMode: 'transparent' | 'dark' | 'faction';

  // Procedural Paper-Doll & Heraldry State
  paperDollConfig: PaperDollConfig;
  heraldryConfig: HeraldryConfig;

  // Transforms
  zoom: number; // 0.1 - 5.0
  panX: number;
  panY: number;
  rotation: number; // -180 - 180 degrees
  flipH: boolean;

  // Local Library
  savedTokens: SavedForgeToken[];

  // Actions
  openForge: (config?: OpenForgeConfig) => void;
  closeForge: () => void;
  setActiveTab: (tab: TokenForgeTab) => void;
  setImageSrc: (src: string | null) => void;
  setName: (name: string) => void;
  setFrame: (frameId: TokenFrameId) => void;
  setFaction: (faction: TokenFaction) => void;
  setCustomColor: (hex: string) => void;
  setGlowIntensity: (intensity: number) => void;
  setShowGridOverlay: (show: boolean) => void;
  toggleGridOverlay: () => void;
  setBackgroundMode: (mode: 'transparent' | 'dark' | 'faction') => void;

  // Procedural actions
  setPaperDollConfig: (updates: Partial<PaperDollConfig>) => void;
  setHeraldryConfig: (updates: Partial<HeraldryConfig>) => void;
  randomizePaperDoll: () => void;
  randomizeHeraldry: () => void;

  // Transform controls
  setZoom: (zoom: number) => void;
  setPan: (panX: number, panY: number) => void;
  setRotation: (rotation: number) => void;
  rotateBy: (degrees: number) => void;
  toggleFlipH: () => void;
  resetTransform: () => void;

  // Library actions
  saveTokenToLibrary: (token: {
    name: string;
    dataUrl: string;
    frameId: TokenFrameId;
    faction: TokenFaction;
  }) => SavedForgeToken;
  deleteTokenFromLibrary: (id: string) => void;
  clearLibrary: () => void;
  loadSavedTokens: () => void;
}

const STORAGE_KEY = 'ttrpg_forge_saved_tokens_v1';

function getStoredTokens(): SavedForgeToken[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[TokenForgeStore] Failed to read saved tokens from localStorage:', err);
  }
  return [];
}

function persistStoredTokens(tokens: SavedForgeToken[]) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch (err) {
    console.warn('[TokenForgeStore] Failed to save tokens to localStorage:', err);
  }
}

export const useTokenForgeStore = create<TokenForgeState>((set, get) => ({
  isOpen: false,
  activeTab: 'forge',

  targetCombatantId: null,
  targetTokenId: null,

  imageSrc: null,
  name: 'Новый токен',
  currentFrame: 'gold-runic',
  currentFaction: 'none',
  customColor: '#06b6d4',
  glowIntensity: 50,
  showGridOverlay: false,
  backgroundMode: 'transparent',

  paperDollConfig: randomProceduralTokenConfig(),
  heraldryConfig: randomHeraldryConfig(),

  zoom: 1.0,
  panX: 0,
  panY: 0,
  rotation: 0,
  flipH: false,

  savedTokens: getStoredTokens(),

  openForge: (config) => {
    set({
      isOpen: true,
      activeTab: config?.initialTab ?? 'crop',
      targetCombatantId: config?.targetCombatantId ?? null,
      targetTokenId: config?.targetTokenId ?? null,
      imageSrc: config?.initialImage ?? get().imageSrc ?? null,
      name: config?.name || get().name || 'Новый токен',
      currentFrame: config?.frameId ?? get().currentFrame ?? 'gold-runic',
      currentFaction: config?.faction ?? get().currentFaction ?? 'none',
      customColor: config?.customColor ?? get().customColor ?? '#06b6d4',
      glowIntensity: config?.glowIntensity ?? get().glowIntensity ?? 50,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipH: false,
    });
  },

  closeForge: () => {
    set({ isOpen: false });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setPaperDollConfig: (updates) =>
    set((state) => ({ paperDollConfig: { ...state.paperDollConfig, ...updates } })),

  setHeraldryConfig: (updates) =>
    set((state) => ({ heraldryConfig: { ...state.heraldryConfig, ...updates } })),

  randomizePaperDoll: () => set({ paperDollConfig: randomProceduralTokenConfig() }),

  randomizeHeraldry: () => set({ heraldryConfig: randomHeraldryConfig() }),

  setImageSrc: (src) => set({ imageSrc: src }),

  setName: (name) => set({ name }),

  setFrame: (frameId) => set({ currentFrame: frameId }),

  setFaction: (faction) => set({ currentFaction: faction }),

  setCustomColor: (hex) => set({ customColor: hex }),

  setGlowIntensity: (intensity) =>
    set({ glowIntensity: Math.max(0, Math.min(100, intensity)) }),

  setShowGridOverlay: (show) => set({ showGridOverlay: show }),

  toggleGridOverlay: () => set((state) => ({ showGridOverlay: !state.showGridOverlay })),

  setBackgroundMode: (mode) => set({ backgroundMode: mode }),

  setZoom: (zoom) =>
    set({ zoom: Math.max(0.1, Math.min(5.0, Number(zoom.toFixed(2)))) }),

  setPan: (panX, panY) => set({ panX, panY }),

  setRotation: (deg) => {
    // Clamp to -180..180
    let normalized = deg % 360;
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;
    set({ rotation: Math.round(normalized) });
  },

  rotateBy: (deltaDegrees) => {
    const current = get().rotation;
    let next = (current + deltaDegrees) % 360;
    if (next > 180) next -= 360;
    if (next < -180) next += 360;
    set({ rotation: Math.round(next) });
  },

  toggleFlipH: () => set((state) => ({ flipH: !state.flipH })),

  resetTransform: () =>
    set({
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipH: false,
    }),

  saveTokenToLibrary: (token) => {
    const newToken: SavedForgeToken = {
      id: crypto.randomUUID(),
      name: token.name.trim() || 'Без названия',
      dataUrl: token.dataUrl,
      frameId: token.frameId,
      faction: token.faction,
      createdAt: Date.now(),
    };
    const updated = [newToken, ...get().savedTokens];
    persistStoredTokens(updated);
    set({ savedTokens: updated });
    return newToken;
  },

  deleteTokenFromLibrary: (id) => {
    const updated = get().savedTokens.filter((t) => t.id !== id);
    persistStoredTokens(updated);
    set({ savedTokens: updated });
  },

  clearLibrary: () => {
    persistStoredTokens([]);
    set({ savedTokens: [] });
  },

  loadSavedTokens: () => {
    set({ savedTokens: getStoredTokens() });
  },
}));
