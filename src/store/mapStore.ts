import { create } from 'zustand';
import {
  TacticalMapState,
  AoeShape,
  AoeTemplate,
  PendingAoe,
  RulerMeasurement,
  DrawingLine,
  WeatherEffect,
  GridType,
  MapTool,
  MapPin,
  Wall,
  DoorState,
  getWallType,
  getDoorState,
  isWallBlockingMovement,
  isWallBlockingVision,
  FogShape,
  StandaloneToken,
  LightSource,
  AmbientLightMode,
  MapBackgroundTexture,
} from '../types/map';
import { AMBIENT_LIGHT_CONFIG } from '../engine/lightingEngine';
import { broadcastService } from '../services/broadcastService';
import { useCombatStore } from './combatStore';

interface MapStoreActions {
  setImageUrl: (url: string | null, width?: number, height?: number, isVideo?: boolean) => void;
  setScale: (scale: number) => void;
  setPan: (panX: number, panY: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitToViewport: (viewportWidth: number, viewportHeight: number) => void;
  setGridCellSize: (size: number) => void;
  toggleGrid: () => void;
  setGridType: (type: GridType) => void;
  setIsVideoMap: (isVideo: boolean) => void;
  setActiveTool: (tool: MapTool) => void;
  setAoeConfig: (shape: AoeShape, sizeFeet: number) => void;
  addAoeTemplate: (template: Omit<AoeTemplate, 'id'>) => string;
  updateAoeTemplate: (id: string, updates: Partial<AoeTemplate>) => void;
  removeAoeTemplate: (id: string) => void;
  clearAoeTemplates: () => void;
  setSelectedAoeId: (id: string | null) => void;
  addAoeShape: (shape: any) => string;
  updateAoeShape: (id: string, updates: any) => void;
  removeAoeShape: (id: string) => void;
  clearAoeShapes: () => void;
  setRuler: (ruler: RulerMeasurement | null) => void;
  setPendingAoe: (pending: PendingAoe | null) => void;
  rotatePendingAoe: (deltaDegrees: number) => void;
  addDrawingLine: (line: DrawingLine) => void;
  updateCurrentDrawingLine: (points: number[]) => void;
  clearAllDrawings: () => void;
  undoLastDrawing: () => void;
  setBrushColor: (color: string) => void;
  setBrushWidth: (width: number) => void;
  toggleWhiteBackground: () => void;
  setWeatherEffect: (weather: WeatherEffect) => void;
  addPin: (pin: Omit<MapPin, 'id'>) => string;
  updatePin: (id: string, updates: Partial<MapPin>) => void;
  removePin: (id: string) => void;
  setSelectedPinId: (id: string | null) => void;
  clearPins: () => void;
  setPins: (pins: MapPin[]) => void;
  importMapState: (state: Partial<TacticalMapState>) => void;
  addWall: (wall: Omit<Wall, 'id'>) => string;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  removeWall: (id: string) => void;
  toggleDoor: (id: string) => void;
  toggleLockDoor: (id: string) => void;
  setDoorState: (id: string, state: DoorState) => void;
  setSelectedWallId: (id: string | null) => void;
  clearWalls: () => void;
  setWalls: (walls: Wall[]) => void;
  openProceduralModal: () => void;
  closeProceduralModal: () => void;
  // Fog of War
  toggleFog: () => void;
  setFogEnabled: (enabled: boolean) => void;
  addFogShape: (shape: Omit<FogShape, 'id'> | FogShape) => string;
  clearFog: () => void;
  revealAllFog: () => void;
  concealAllFog: () => void;
  undoLastFog: () => void;
  setFogBrushSize: (size: number) => void;
  setFogToolMode: (mode: 'reveal' | 'conceal') => void;
  setFogShapeType: (shapeType: 'brush' | 'rect') => void;
  // Standalone Map Tokens
  addMapToken: (token: Omit<StandaloneToken, 'id'> | StandaloneToken) => string;
  updateMapToken: (id: string, updates: Partial<StandaloneToken>) => void;
  removeMapToken: (id: string) => void;
  clearMapTokens: () => void;
  setSelectedMapTokenId: (id: string | null) => void;
  sendTokenToCombat: (tokenId: string) => void;
  // Dynamic Lighting & Vision
  addLight: (light: Omit<LightSource, 'id'> | LightSource) => string;
  updateLight: (id: string, updates: Partial<LightSource>) => void;
  removeLight: (id: string) => void;
  toggleLight: (id: string) => void;
  clearLights: () => void;
  setSelectedLightId: (id: string | null) => void;
  setActiveLightPresetId: (presetId: string) => void;
  setLightingEnabled: (enabled: boolean) => void;
  toggleLighting: () => void;
  setAmbientLightMode: (mode: AmbientLightMode, customDarkness?: number) => void;
  setAmbientDarkness: (darkness: number) => void;
  attachLightToToken: (lightId: string, tokenId: string) => void;
  detachLightFromToken: (lightId: string) => void;
  syncTokenAttachedLights: (tokenId: string, x: number, y: number) => void;
  broadcastMapState: () => void;
  setBackgroundTexture: (texture: MapBackgroundTexture) => void;
}

export type MapStore = TacticalMapState & MapStoreActions;

export const useMapStore = create<MapStore>((set, get) => ({
  imageUrl: null,
  imageWidth: 1600,
  imageHeight: 1200,
  scale: 1.0,
  panX: 0,
  panY: 0,
  gridCellSize: 50,
  isGridVisible: true,
  gridType: 'square',
  isVideoMap: false,
  activeTool: 'select',
  selectedAoeShape: 'circle',
  selectedAoeSizeFeet: 20,
  aoeTemplates: [],
  selectedAoeId: null,
  ruler: null,
  pendingAoe: null,
  drawingLines: [],
  currentBrushColor: '#EF4444',
  currentBrushWidth: 5,
  isWhiteBackground: false,
  weatherEffect: 'none',
  pins: [],
  selectedPinId: null,
  walls: [],
  selectedWallId: null,
  isFogEnabled: false,
  fogShapes: [],
  fogBrushSize: 60,
  fogToolMode: 'reveal',
  fogShapeType: 'brush',
  mapTokens: [],
  selectedMapTokenId: null,
  lights: [],
  isLightingEnabled: false,
  ambientLightMode: 'daylight',
  ambientDarkness: 0.0,
  selectedLightId: null,
  activeLightPresetId: 'torch',
  isProceduralModalOpen: false,
  backgroundTexture: 'none',

  setImageUrl: (url, width = 1600, height = 1200, isVideo = false) => {
    set({ imageUrl: url, imageWidth: width, imageHeight: height, isVideoMap: isVideo });
    get().broadcastMapState();
  },

  setGridType: (gridType) => {
    set({ gridType });
    get().broadcastMapState();
  },

  setIsVideoMap: (isVideoMap) => {
    set({ isVideoMap });
    get().broadcastMapState();
  },

  setScale: (scale) => {
    const clamped = Math.max(0.2, Math.min(4.0, scale));
    set({ scale: clamped });
  },

  setPan: (panX, panY) => {
    set({ panX, panY });
  },

  zoomIn: () => {
    const { scale } = get();
    set({ scale: Math.min(4.0, scale * 1.2) });
  },

  zoomOut: () => {
    const { scale } = get();
    set({ scale: Math.max(0.2, scale * 0.8) });
  },

  resetView: () => {
    set({ scale: 1.0, panX: 0, panY: 0 });
  },

  fitToViewport: (viewportWidth, viewportHeight) => {
    const { imageWidth, imageHeight } = get();
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const scaleX = viewportWidth / imageWidth;
    const scaleY = viewportHeight / imageHeight;
    const fitScale = Math.max(0.2, Math.min(4.0, Math.min(scaleX, scaleY) * 0.95));

    const scaledW = imageWidth * fitScale;
    const scaledH = imageHeight * fitScale;
    const panX = Math.max(0, (viewportWidth - scaledW) / 2);
    const panY = Math.max(0, (viewportHeight - scaledH) / 2);

    set({ scale: fitScale, panX, panY });
  },

  setGridCellSize: (size) => {
    const clamped = Math.max(25, Math.min(200, size));
    set({ gridCellSize: clamped });
    get().broadcastMapState();
  },

  toggleGrid: () => {
    set((state) => {
      const isGridVisible = !state.isGridVisible;
      return { isGridVisible };
    });
    get().broadcastMapState();
  },

  setActiveTool: (activeTool) => {
    set({ activeTool, ruler: null });
    get().broadcastMapState();
  },

  setAoeConfig: (selectedAoeShape, selectedAoeSizeFeet) => {
    set({ selectedAoeShape, selectedAoeSizeFeet });
  },

  addAoeTemplate: (template) => {
    const id = crypto.randomUUID();
    const newTemplate: AoeTemplate = { ...template, id };
    set((state) => ({
      aoeTemplates: [...state.aoeTemplates, newTemplate],
      selectedAoeId: id,
    }));
    get().broadcastMapState();
    return id;
  },

  updateAoeTemplate: (id, updates) => {
    set((state) => ({
      aoeTemplates: state.aoeTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    get().broadcastMapState();
  },

  removeAoeTemplate: (id) => {
    set((state) => ({
      aoeTemplates: state.aoeTemplates.filter((t) => t.id !== id),
      selectedAoeId: state.selectedAoeId === id ? null : state.selectedAoeId,
    }));
    get().broadcastMapState();
  },

  clearAoeTemplates: () => {
    set({ aoeTemplates: [], selectedAoeId: null });
    get().broadcastMapState();
  },

  setSelectedAoeId: (selectedAoeId) => {
    set({ selectedAoeId });
  },

  // Backward compatibility aliases
  addAoeShape: (shape: any) => {
    const sType = shape.type === 'sphere' ? 'circle' : shape.type || 'circle';
    return get().addAoeTemplate({
      shape: sType,
      sizeFeet: shape.sizeFeet || 20,
      x: shape.x || 100,
      y: shape.y || 100,
      rotation: shape.rotation || 0,
      color: shape.color || '#EF4444',
      label: shape.label,
    });
  },

  updateAoeShape: (id: string, updates: any) => {
    get().updateAoeTemplate(id, updates);
  },

  removeAoeShape: (id: string) => {
    get().removeAoeTemplate(id);
  },

  clearAoeShapes: () => {
    get().clearAoeTemplates();
  },

  setRuler: (ruler) => {
    set({ ruler });
    if (!ruler) {
      if (broadcastTimer) {
        clearTimeout(broadcastTimer);
        broadcastTimer = null;
      }
      get().broadcastMapState();
    } else {
      throttleBroadcastMapState(get);
    }
  },

  setPendingAoe: (pendingAoe) => {
    set({ pendingAoe });
  },

  rotatePendingAoe: (deltaDegrees) => {
    const { pendingAoe, selectedAoeId, aoeTemplates } = get();
    if (pendingAoe) {
      const newRot = ((pendingAoe.rotation || 0) + deltaDegrees) % 360;
      set({ pendingAoe: { ...pendingAoe, rotation: newRot < 0 ? newRot + 360 : newRot } });
      return;
    }
    if (selectedAoeId) {
      const template = aoeTemplates.find((t) => t.id === selectedAoeId);
      if (template) {
        const newRot = ((template.rotation || 0) + deltaDegrees) % 360;
        get().updateAoeTemplate(selectedAoeId, { rotation: newRot < 0 ? newRot + 360 : newRot });
      }
    }
  },

  addDrawingLine: (line) => {
    set((state) => ({ drawingLines: [...state.drawingLines, line] }));
    get().broadcastMapState();
  },

  updateCurrentDrawingLine: (points) => {
    set((state) => {
      if (state.drawingLines.length === 0) return state;
      const lastIdx = state.drawingLines.length - 1;
      const updatedLines = [...state.drawingLines];
      updatedLines[lastIdx] = {
        ...updatedLines[lastIdx],
        points,
      };
      return { drawingLines: updatedLines };
    });
    throttleBroadcastMapState(get);
  },

  clearAllDrawings: () => {
    set({ drawingLines: [] });
    get().broadcastMapState();
  },

  undoLastDrawing: () => {
    set((state) => ({
      drawingLines: state.drawingLines.slice(0, -1),
    }));
    get().broadcastMapState();
  },

  setBrushColor: (currentBrushColor) => {
    set({ currentBrushColor });
  },

  setBrushWidth: (currentBrushWidth) => {
    set({ currentBrushWidth });
  },

  toggleWhiteBackground: () => {
    set((state) => ({ isWhiteBackground: !state.isWhiteBackground }));
    get().broadcastMapState();
  },

  setWeatherEffect: (weatherEffect) => {
    set({ weatherEffect });
    get().broadcastMapState();
  },

  addPin: (pin) => {
    const id = crypto.randomUUID();
    const newPin: MapPin = { ...pin, id };
    set((state) => ({ pins: [...state.pins, newPin], selectedPinId: id }));
    get().broadcastMapState();
    return id;
  },

  updatePin: (id, updates) => {
    set((state) => ({
      pins: state.pins.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    get().broadcastMapState();
  },

  removePin: (id) => {
    set((state) => ({
      pins: state.pins.filter((p) => p.id !== id),
      selectedPinId: state.selectedPinId === id ? null : state.selectedPinId,
    }));
    get().broadcastMapState();
  },

  setSelectedPinId: (selectedPinId) => {
    set({ selectedPinId });
  },

  clearPins: () => {
    set({ pins: [], selectedPinId: null });
    get().broadcastMapState();
  },

  setPins: (pins: MapPin[]) => {
    set({ pins });
    get().broadcastMapState();
  },

  importMapState: (partialState: Partial<TacticalMapState>) => {
    set((state) => ({ ...state, ...partialState }));
    get().broadcastMapState();
  },

  addWall: (wall) => {
    const id = crypto.randomUUID();
    const wallType = wall.wallType || (wall.isDoor ? 'door' : 'wall');
    const isDoor = wallType === 'door' || wallType === 'secret_door';
    const doorState = isDoor ? (wall.doorState || (wall.isOpen ? 'open' : 'closed')) : undefined;
    const isOpen = doorState === 'open';
    const candidate: Wall = {
      ...wall,
      id,
      wallType,
      doorState,
      isDoor,
      isOpen,
    };
    candidate.blocksMovement = wall.blocksMovement !== undefined ? wall.blocksMovement : isWallBlockingMovement(candidate);
    candidate.blocksVision = wall.blocksVision !== undefined ? wall.blocksVision : isWallBlockingVision(candidate);

    set((state) => ({ walls: [...state.walls, candidate], selectedWallId: id }));
    get().broadcastMapState();
    return id;
  },

  updateWall: (id, updates) => {
    set((state) => ({
      walls: state.walls.map((w) => {
        if (w.id !== id) return w;
        const merged: Wall = { ...w, ...updates };
        if (updates.doorState && updates.isOpen === undefined) {
          merged.isOpen = updates.doorState === 'open';
        } else if (updates.isOpen !== undefined && !updates.doorState) {
          merged.doorState = updates.isOpen ? 'open' : 'closed';
        }
        if (updates.wallType) {
          merged.isDoor = updates.wallType === 'door' || updates.wallType === 'secret_door';
        }
        if (updates.blocksMovement === undefined) {
          merged.blocksMovement = isWallBlockingMovement(merged);
        }
        if (updates.blocksVision === undefined) {
          merged.blocksVision = isWallBlockingVision(merged);
        }
        return merged;
      }),
    }));
    get().broadcastMapState();
  },

  removeWall: (id) => {
    set((state) => ({
      walls: state.walls.filter((w) => w.id !== id),
      selectedWallId: state.selectedWallId === id ? null : state.selectedWallId,
    }));
    get().broadcastMapState();
  },

  toggleDoor: (id) => {
    set((state) => ({
      walls: state.walls.map((w) => {
        const type = getWallType(w);
        if (w.id !== id || (type !== 'door' && type !== 'secret_door' && !w.isDoor)) return w;
        const currentState = getDoorState(w);
        const nextState: DoorState = currentState === 'open' ? 'closed' : 'open';
        const isOpen = nextState === 'open';
        return {
          ...w,
          doorState: nextState,
          isOpen,
          blocksMovement: !isOpen,
          blocksVision: !isOpen,
        };
      }),
    }));
    get().broadcastMapState();
  },

  toggleLockDoor: (id) => {
    set((state) => ({
      walls: state.walls.map((w) => {
        const type = getWallType(w);
        if (w.id !== id || (type !== 'door' && type !== 'secret_door' && !w.isDoor)) return w;
        const currentState = getDoorState(w);
        const nextState: DoorState = currentState === 'locked' ? 'closed' : 'locked';
        return {
          ...w,
          doorState: nextState,
          isOpen: false,
          blocksMovement: true,
          blocksVision: true,
        };
      }),
    }));
    get().broadcastMapState();
  },

  setDoorState: (id, nextState) => {
    set((state) => ({
      walls: state.walls.map((w) => {
        if (w.id !== id) return w;
        const isOpen = nextState === 'open';
        return {
          ...w,
          doorState: nextState,
          isOpen,
          blocksMovement: !isOpen,
          blocksVision: !isOpen,
        };
      }),
    }));
    get().broadcastMapState();
  },

  setSelectedWallId: (selectedWallId) => {
    set({ selectedWallId });
  },

  clearWalls: () => {
    set({ walls: [], selectedWallId: null });
    get().broadcastMapState();
  },

  setWalls: (walls) => {
    set({ walls, selectedWallId: null });
    get().broadcastMapState();
  },

  openProceduralModal: () => {
    set({ isProceduralModalOpen: true });
  },

  closeProceduralModal: () => {
    set({ isProceduralModalOpen: false });
  },

  setBackgroundTexture: (texture) => {
    set({ backgroundTexture: texture });
    get().broadcastMapState();
  },

  // Fog of War actions
  toggleFog: () => {
    set((state) => ({ isFogEnabled: !state.isFogEnabled }));
    get().broadcastMapState();
  },

  setFogEnabled: (isFogEnabled) => {
    set({ isFogEnabled });
    get().broadcastMapState();
  },

  addFogShape: (shape) => {
    const id = 'id' in shape && shape.id ? shape.id : crypto.randomUUID();
    const newShape: FogShape = { ...shape, id };
    set((state) => ({ fogShapes: [...state.fogShapes, newShape] }));
    get().broadcastMapState();
    return id;
  },

  clearFog: () => {
    set({ fogShapes: [] });
    get().broadcastMapState();
  },

  revealAllFog: () => {
    const { imageWidth, imageHeight } = get();
    const fullRevealShape: FogShape = {
      id: crypto.randomUUID(),
      type: 'rect',
      x: -5000,
      y: -5000,
      width: (imageWidth || 1600) + 10000,
      height: (imageHeight || 1200) + 10000,
      mode: 'reveal',
    };
    set((state) => ({ fogShapes: [...state.fogShapes, fullRevealShape] }));
    get().broadcastMapState();
  },

  concealAllFog: () => {
    set({ fogShapes: [] });
    get().broadcastMapState();
  },

  undoLastFog: () => {
    set((state) => ({ fogShapes: state.fogShapes.slice(0, -1) }));
    get().broadcastMapState();
  },

  setFogBrushSize: (fogBrushSize) => {
    set({ fogBrushSize });
  },

  setFogToolMode: (fogToolMode) => {
    set({ fogToolMode });
  },

  setFogShapeType: (fogShapeType) => {
    set({ fogShapeType });
  },

  // Standalone Map Tokens actions
  addMapToken: (token) => {
    const id = 'id' in token && token.id ? token.id : crypto.randomUUID();
    const newToken: StandaloneToken = { ...token, id };
    set((state) => ({ mapTokens: [...state.mapTokens, newToken], selectedMapTokenId: id }));
    get().broadcastMapState();
    return id;
  },

  updateMapToken: (id, updates) => {
    set((state) => {
      const updatedTokens = state.mapTokens.map((t) => (t.id === id ? { ...t, ...updates } : t));
      const hasAttached = state.lights.some((l) => l.attachedTokenId === id);
      let updatedLights = state.lights;
      if (hasAttached && (updates.x !== undefined || updates.y !== undefined)) {
        updatedLights = state.lights.map((l) => {
          if (l.attachedTokenId !== id) return l;
          return {
            ...l,
            x: updates.x !== undefined ? updates.x : l.x,
            y: updates.y !== undefined ? updates.y : l.y,
          };
        });
      }
      return {
        mapTokens: updatedTokens,
        lights: updatedLights,
      };
    });
    get().broadcastMapState();
  },

  removeMapToken: (id) => {
    set((state) => ({
      mapTokens: state.mapTokens.filter((t) => t.id !== id),
      selectedMapTokenId: state.selectedMapTokenId === id ? null : state.selectedMapTokenId,
    }));
    get().broadcastMapState();
  },

  clearMapTokens: () => {
    set({ mapTokens: [], selectedMapTokenId: null });
    get().broadcastMapState();
  },

  setSelectedMapTokenId: (selectedMapTokenId) => {
    set({ selectedMapTokenId });
  },

  sendTokenToCombat: (tokenId) => {
    const token = get().mapTokens.find((t) => t.id === tokenId);
    if (!token) return;

    const sizeMap: Record<string, any> = {
      tiny: 'Tiny',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      huge: 'Huge',
      gargantuan: 'Gargantuan',
    };
    const cSize = sizeMap[String(token.size).toLowerCase()] || 'Medium';
    const d20 = Math.floor(Math.random() * 20) + 1;

    // Convert into Combatant and add to combat tracker
    useCombatStore.getState().addCombatant({
      name: token.name,
      nameRu: token.nameRu || token.name,
      avatarUrl: token.avatarUrl,
      tokenUrl: token.tokenUrl || token.avatarUrl,
      tokenX: token.x,
      tokenY: token.y,
      size: cSize,
      color: token.color,
      tokenVisibleToPlayers: token.isVisibleToPlayers,
      hp: token.hp || 10,
      maxHp: token.maxHp || token.hp || 10,
      ac: token.ac || 10,
      cr: token.cr,
      monsterDbId: token.creatureDbId,
      isPlayer: false,
      initiative: d20,
      initBonus: 0,
      speed: '30 фт.',
    });

    // Remove from standalone map tokens
    set((state) => ({
      mapTokens: state.mapTokens.filter((t) => t.id !== tokenId),
      selectedMapTokenId: state.selectedMapTokenId === tokenId ? null : state.selectedMapTokenId,
    }));
    get().broadcastMapState();
  },

  // Dynamic Lighting & Vision actions
  addLight: (light) => {
    const id = 'id' in light && light.id ? light.id : crypto.randomUUID();
    const newLight: LightSource = { ...light, id };
    set((state) => ({ lights: [...state.lights, newLight], selectedLightId: id }));
    get().broadcastMapState();
    return id;
  },

  updateLight: (id, updates) => {
    set((state) => ({
      lights: state.lights.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
    get().broadcastMapState();
  },

  removeLight: (id) => {
    set((state) => ({
      lights: state.lights.filter((l) => l.id !== id),
      selectedLightId: state.selectedLightId === id ? null : state.selectedLightId,
    }));
    get().broadcastMapState();
  },

  toggleLight: (id) => {
    set((state) => ({
      lights: state.lights.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)),
    }));
    get().broadcastMapState();
  },

  clearLights: () => {
    set({ lights: [], selectedLightId: null });
    get().broadcastMapState();
  },

  setSelectedLightId: (selectedLightId) => {
    set({ selectedLightId });
  },

  setActiveLightPresetId: (activeLightPresetId) => {
    set({ activeLightPresetId });
  },

  setLightingEnabled: (isLightingEnabled) => {
    set({ isLightingEnabled });
    get().broadcastMapState();
  },

  toggleLighting: () => {
    set((state) => ({ isLightingEnabled: !state.isLightingEnabled }));
    get().broadcastMapState();
  },

  setAmbientLightMode: (mode, customDarkness) => {
    const darkness = customDarkness !== undefined ? customDarkness : (AMBIENT_LIGHT_CONFIG[mode]?.darkness ?? 0.0);
    set({ ambientLightMode: mode, ambientDarkness: darkness });
    get().broadcastMapState();
  },

  setAmbientDarkness: (ambientDarkness) => {
    const clamped = Math.max(0.0, Math.min(1.0, ambientDarkness));
    set({ ambientDarkness: clamped });
    get().broadcastMapState();
  },

  attachLightToToken: (lightId, tokenId) => {
    const mapToken = get().mapTokens.find((t) => t.id === tokenId);
    const combatant = useCombatStore.getState().combatants.find((c) => c.id === tokenId);
    const targetX = mapToken?.x ?? combatant?.tokenX;
    const targetY = mapToken?.y ?? combatant?.tokenY;

    set((state) => ({
      lights: state.lights.map((l) => {
        if (l.id !== lightId) return l;
        return {
          ...l,
          attachedTokenId: tokenId,
          x: targetX !== undefined ? targetX : l.x,
          y: targetY !== undefined ? targetY : l.y,
        };
      }),
    }));
    get().broadcastMapState();
  },

  detachLightFromToken: (lightId) => {
    set((state) => ({
      lights: state.lights.map((l) => (l.id === lightId ? { ...l, attachedTokenId: null } : l)),
    }));
    get().broadcastMapState();
  },

  syncTokenAttachedLights: (tokenId, x, y) => {
    set((state) => {
      const hasAttached = state.lights.some((l) => l.attachedTokenId === tokenId);
      if (!hasAttached) return state;
      return {
        lights: state.lights.map((l) =>
          l.attachedTokenId === tokenId ? { ...l, x, y } : l
        ),
      };
    });
    get().broadcastMapState();
  },

  broadcastMapState: () => {
    const state = get();
    broadcastService.send({
      type: 'SYNC_MAP_STATE',
      payload: {
        mapImageUrl: state.imageUrl,
        imageWidth: state.imageWidth,
        imageHeight: state.imageHeight,
        gridCellSize: state.gridCellSize,
        isGridVisible: state.isGridVisible,
        gridType: state.gridType,
        isVideoMap: state.isVideoMap,
        aoeTemplates: state.aoeTemplates,
        aoeShapes: state.aoeTemplates as any,
        ruler: state.ruler,
        drawingLines: state.drawingLines,
        isWhiteBackground: state.isWhiteBackground,
        weatherEffect: state.weatherEffect,
        pins: state.pins.filter((p) => !p.isSecret),
        walls: state.walls,
        isFogEnabled: state.isFogEnabled,
        fogShapes: state.fogShapes,
        mapTokens: state.mapTokens.filter((t) => t.isVisibleToPlayers),
        lights: state.lights,
        isLightingEnabled: state.isLightingEnabled,
        ambientLightMode: state.ambientLightMode,
        ambientDarkness: state.ambientDarkness,
        backgroundTexture: state.backgroundTexture,
      },
    });
  },
}));


let lastBroadcastTime = 0;
let broadcastTimer: any = null;

function throttleBroadcastMapState(getFn: () => MapStore) {
  const now = Date.now();
  if (now - lastBroadcastTime >= 35) {
    lastBroadcastTime = now;
    if (broadcastTimer) {
      clearTimeout(broadcastTimer);
      broadcastTimer = null;
    }
    getFn().broadcastMapState();
  } else {
    if (!broadcastTimer) {
      broadcastTimer = setTimeout(() => {
        lastBroadcastTime = Date.now();
        broadcastTimer = null;
        getFn().broadcastMapState();
      }, 35);
    }
  }
}
