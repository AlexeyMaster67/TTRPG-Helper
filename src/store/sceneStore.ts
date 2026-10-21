import { create } from 'zustand';
import {
  Wall,
  FogShape,
  StandaloneToken,
  MapPin,
  WeatherEffect,
  GridType,
} from '../types/map';
import { useMapStore } from './mapStore';

export interface VttScene {
  id: string;
  name: string;
  previewUrl?: string;
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  isVideoMap: boolean;
  gridCellSize: number;
  isGridVisible: boolean;
  gridType: GridType;
  scale: number;
  panX: number;
  panY: number;
  walls: Wall[];
  fogShapes: FogShape[];
  isFogEnabled: boolean;
  mapTokens: StandaloneToken[];
  pins: MapPin[];
  weatherEffect: WeatherEffect;
  createdAt: number;
  updatedAt: number;
}

export interface SceneStore {
  scenes: VttScene[];
  activeSceneId: string | null;
  createScene: (name?: string, imageUrl?: string, isVideo?: boolean) => string;
  updateScene: (id: string, updates: Partial<VttScene>) => void;
  deleteScene: (id: string) => void;
  duplicateScene: (id: string) => string;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  switchScene: (sceneId: string) => void;
  syncCurrentMapToActiveScene: () => void;
}

const STORAGE_KEY = 'ttrpg_vtt_scenes_v1';

function createDefaultScene(name = 'Главная сцена', imageUrl: string | null = null): VttScene {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    imageUrl,
    imageWidth: 1600,
    imageHeight: 1200,
    isVideoMap: false,
    gridCellSize: 50,
    isGridVisible: true,
    gridType: 'square',
    scale: 1.0,
    panX: 0,
    panY: 0,
    walls: [],
    fogShapes: [],
    isFogEnabled: false,
    mapTokens: [],
    pins: [],
    weatherEffect: 'none',
    createdAt: now,
    updatedAt: now,
  };
}

function loadInitialState(): { scenes: VttScene[]; activeSceneId: string } {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
          const activeSceneId = parsed.scenes.some((s: VttScene) => s.id === parsed.activeSceneId)
            ? parsed.activeSceneId
            : parsed.scenes[0].id;
          return { scenes: parsed.scenes, activeSceneId };
        }
      }
    } catch (e) {
      console.warn('[SceneStore] Failed to load scenes from storage:', e);
    }
  }

  const defaultScene = createDefaultScene();
  return {
    scenes: [defaultScene],
    activeSceneId: defaultScene.id,
  };
}

function saveScenesToStorage(scenes: VttScene[], activeSceneId: string | null) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ scenes, activeSceneId })
      );
    } catch (e) {
      console.warn('[SceneStore] Failed to save scenes to storage:', e);
    }
  }
}

const initial = loadInitialState();

export const useSceneStore = create<SceneStore>((set, get) => ({
  scenes: initial.scenes,
  activeSceneId: initial.activeSceneId,

  createScene: (name?: string, imageUrl?: string, isVideo = false) => {
    const mapState = useMapStore.getState();
    const id = crypto.randomUUID();
    const now = Date.now();
    const sceneName = name?.trim() || `Сцена ${get().scenes.length + 1}`;
    const newScene: VttScene = {
      id,
      name: sceneName,
      imageUrl: imageUrl !== undefined ? imageUrl : mapState.imageUrl,
      imageWidth: mapState.imageWidth || 1600,
      imageHeight: mapState.imageHeight || 1200,
      isVideoMap: isVideo,
      gridCellSize: mapState.gridCellSize || 50,
      isGridVisible: mapState.isGridVisible ?? true,
      gridType: mapState.gridType || 'square',
      scale: 1.0,
      panX: 0,
      panY: 0,
      walls: [],
      fogShapes: [],
      isFogEnabled: false,
      mapTokens: [],
      pins: [],
      weatherEffect: 'none',
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const updated = [...state.scenes, newScene];
      saveScenesToStorage(updated, state.activeSceneId || id);
      return {
        scenes: updated,
        activeSceneId: state.activeSceneId || id,
      };
    });

    return id;
  },

  updateScene: (id, updates) => {
    set((state) => {
      const updatedScenes = state.scenes.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
      );
      saveScenesToStorage(updatedScenes, state.activeSceneId);
      return { scenes: updatedScenes };
    });
  },

  deleteScene: (id) => {
    const { scenes, activeSceneId } = get();
    const filtered = scenes.filter((s) => s.id !== id);
    let nextActiveId = activeSceneId;
    let finalScenes = filtered;

    if (filtered.length === 0) {
      const fallback = createDefaultScene('Стартовая сцена');
      finalScenes = [fallback];
      nextActiveId = fallback.id;
    } else if (activeSceneId === id) {
      const deletedIndex = scenes.findIndex((s) => s.id === id);
      const newIndex = Math.max(0, Math.min(deletedIndex, filtered.length - 1));
      nextActiveId = filtered[newIndex].id;
    }

    set({ scenes: finalScenes, activeSceneId: nextActiveId });
    saveScenesToStorage(finalScenes, nextActiveId);

    if (activeSceneId === id && nextActiveId) {
      get().switchScene(nextActiveId);
    }
  },

  duplicateScene: (id) => {
    const { scenes, activeSceneId } = get();
    const original = scenes.find((s) => s.id === id);
    if (!original) return '';

    const newId = crypto.randomUUID();
    const now = Date.now();
    const duplicated: VttScene = {
      ...original,
      id: newId,
      name: `${original.name} (Копия)`,
      walls: original.walls.map((w) => ({ ...w, id: crypto.randomUUID() })),
      fogShapes: original.fogShapes.map((f) => ({ ...f, id: crypto.randomUUID() })),
      mapTokens: original.mapTokens.map((t) => ({ ...t, id: crypto.randomUUID() })),
      pins: original.pins.map((p) => ({ ...p, id: crypto.randomUUID() })),
      createdAt: now,
      updatedAt: now,
    };

    const origIdx = scenes.findIndex((s) => s.id === id);
    const updatedScenes = [...scenes];
    updatedScenes.splice(origIdx + 1, 0, duplicated);

    set({ scenes: updatedScenes });
    saveScenesToStorage(updatedScenes, activeSceneId);
    return newId;
  },

  reorderScenes: (fromIndex, toIndex) => {
    const { scenes, activeSceneId } = get();
    if (fromIndex < 0 || fromIndex >= scenes.length || toIndex < 0 || toIndex >= scenes.length) return;
    const updated = [...scenes];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    set({ scenes: updated });
    saveScenesToStorage(updated, activeSceneId);
  },

  switchScene: (sceneId) => {
    const { scenes, activeSceneId } = get();
    const target = scenes.find((s) => s.id === sceneId);
    if (!target) return;

    // 1. Sync current map to currently active scene if changing scenes
    if (activeSceneId && activeSceneId !== sceneId) {
      get().syncCurrentMapToActiveScene();
    }

    // 2. Fetch fresh target
    const currentScenes = get().scenes;
    const refreshedTarget = currentScenes.find((s) => s.id === sceneId) || target;

    // 3. Load target scene into mapStore
    useMapStore.setState({
      imageUrl: refreshedTarget.imageUrl,
      imageWidth: refreshedTarget.imageWidth,
      imageHeight: refreshedTarget.imageHeight,
      isVideoMap: refreshedTarget.isVideoMap,
      gridCellSize: refreshedTarget.gridCellSize,
      isGridVisible: refreshedTarget.isGridVisible,
      gridType: refreshedTarget.gridType,
      scale: refreshedTarget.scale,
      panX: refreshedTarget.panX,
      panY: refreshedTarget.panY,
      walls: [...(refreshedTarget.walls || [])],
      fogShapes: [...(refreshedTarget.fogShapes || [])],
      isFogEnabled: refreshedTarget.isFogEnabled,
      mapTokens: [...(refreshedTarget.mapTokens || [])],
      pins: [...(refreshedTarget.pins || [])],
      weatherEffect: refreshedTarget.weatherEffect,
      selectedWallId: null,
      selectedPinId: null,
      selectedMapTokenId: null,
      selectedAoeId: null,
      ruler: null,
      pendingAoe: null,
    });

    // 4. Broadcast updated map state to players
    useMapStore.getState().broadcastMapState();

    // 5. Update activeSceneId
    set({ activeSceneId: sceneId });
    saveScenesToStorage(get().scenes, sceneId);
  },

  syncCurrentMapToActiveScene: () => {
    const { activeSceneId, scenes } = get();
    if (!activeSceneId) return;
    const mapState = useMapStore.getState();
    const now = Date.now();
    const updatedScenes = scenes.map((s) => {
      if (s.id !== activeSceneId) return s;
      return {
        ...s,
        imageUrl: mapState.imageUrl,
        imageWidth: mapState.imageWidth,
        imageHeight: mapState.imageHeight,
        isVideoMap: mapState.isVideoMap,
        gridCellSize: mapState.gridCellSize,
        isGridVisible: mapState.isGridVisible,
        gridType: mapState.gridType,
        scale: mapState.scale,
        panX: mapState.panX,
        panY: mapState.panY,
        walls: [...mapState.walls],
        fogShapes: [...mapState.fogShapes],
        isFogEnabled: mapState.isFogEnabled,
        mapTokens: [...mapState.mapTokens],
        pins: [...mapState.pins],
        weatherEffect: mapState.weatherEffect,
        updatedAt: now,
      };
    });
    set({ scenes: updatedScenes });
    saveScenesToStorage(updatedScenes, activeSceneId);
  },
}));
