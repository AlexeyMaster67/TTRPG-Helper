import type { LightSource, AmbientLightMode } from '../engine/lightingEngine';
export type { LightSource, AmbientLightMode };

export type AoeShape = 'circle' | 'cone' | 'line' | 'cube';

export interface AoeTemplate {
  id: string;
  shape: AoeShape;
  sizeFeet: number; // e.g. 20, 15, 30, 60
  x: number; // map coordinates
  y: number;
  rotation: number; // for cone / line in degrees (0 - 360)
  color: string; // e.g. '#EF4444' (Fire), '#3B82F6' (Frost), '#F59E0B' (Radiant), '#8B5CF6' (Force), '#10B981' (Acid)
  label?: string; // e.g. 'Огненный шар (20 фт)', 'Конус холода (60 фт)'
}

// Backward compatibility alias
export type AoeType = AoeShape | 'sphere';

export interface RulerMeasurement {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  distanceFeet: number;
  distanceCells: number;
}

export interface PendingAoe {
  shape: AoeShape;
  sizeFeet: number;
  rotation: number;
  color: string;
  label?: string;
  type?: AoeType;
}

export interface DrawingLine {
  id: string;
  points: number[];
  color: string;
  strokeWidth: number;
  tool: 'pen' | 'brush' | 'marker' | 'eraser';
}

export type WeatherEffect = 'none' | 'rain' | 'snow' | 'fog' | 'embers';

export type GridType = 'square' | 'hex-pointy' | 'hex-flat';

export type WallType = 'wall' | 'door' | 'secret_door' | 'window' | 'ethereal';
export type DoorState = 'open' | 'closed' | 'locked';

export type MapTool =
  | 'select'
  | 'ruler'
  | 'pan'
  | 'aoe'
  | 'draw'
  | 'eraser'
  | 'pin'
  | 'wall'
  | 'door'
  | 'secret_door'
  | 'window'
  | 'fog'
  | 'light';

export interface FogShape {
  id: string;
  type: 'rect' | 'circle' | 'polygon' | 'brush';
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  strokeWidth?: number;
  mode: 'reveal' | 'conceal';
}

export interface StandaloneToken {
  id: string;
  name: string;
  nameRu?: string;
  avatarUrl?: string;
  tokenUrl?: string;
  x: number;
  y: number;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  color?: string;
  isVisibleToPlayers: boolean;
  hp?: number;
  maxHp?: number;
  ac?: number;
  speed?: string;
  cr?: string;
  notes?: string;
  creatureDbId?: string; // monster db id if spawned from bestiary
  darkvisionFeet?: number;
  aura?: {
    enabled: boolean;
    radiusFeet: number;
    color: string;
    opacity?: number;
    pulsing?: boolean;
  };
}

export interface MapPin {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  isSecret: boolean;
  icon?: string;
  color?: string;
}

export interface Wall {
  id: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  wallType?: WallType;
  doorState?: DoorState;
  blocksMovement?: boolean;
  blocksVision?: boolean;
  isDoor?: boolean;
  isOpen?: boolean;
}

export function getWallType(wall: Wall): WallType {
  if (wall.wallType) return wall.wallType;
  return wall.isDoor ? 'door' : 'wall';
}

export function getDoorState(wall: Wall): DoorState {
  if (wall.doorState) return wall.doorState;
  return wall.isOpen ? 'open' : 'closed';
}

export function isWallBlockingMovement(wall: Wall): boolean {
  if (wall.blocksMovement !== undefined) return wall.blocksMovement;
  const type = getWallType(wall);
  if (type === 'wall' || type === 'window') return true;
  if (type === 'door' || type === 'secret_door') {
    return getDoorState(wall) !== 'open';
  }
  if (type === 'ethereal') return false;
  return true;
}

export function isWallBlockingVision(wall: Wall): boolean {
  if (wall.blocksVision !== undefined) return wall.blocksVision;
  const type = getWallType(wall);
  if (type === 'wall') return true;
  if (type === 'door' || type === 'secret_door') {
    return getDoorState(wall) !== 'open';
  }
  if (type === 'window' || type === 'ethereal') return false;
  return true;
}

export interface TacticalMapState {
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  scale: number;
  panX: number;
  panY: number;
  gridCellSize: number;
  isGridVisible: boolean;
  gridType: GridType;
  isVideoMap: boolean;
  activeTool: MapTool;
  selectedAoeShape?: AoeShape;
  selectedAoeSizeFeet?: number;
  aoeTemplates: AoeTemplate[];
  selectedAoeId: string | null;
  ruler: RulerMeasurement | null;
  pendingAoe?: PendingAoe | null;
  drawingLines: DrawingLine[];
  currentBrushColor: string;
  currentBrushWidth: number;
  isWhiteBackground: boolean;
  weatherEffect: WeatherEffect;
  pins: MapPin[];
  selectedPinId: string | null;
  walls: Wall[];
  selectedWallId: string | null;
  // Fog of War
  isFogEnabled: boolean;
  fogShapes: FogShape[];
  fogBrushSize: number;
  fogToolMode: 'reveal' | 'conceal';
  fogShapeType: 'brush' | 'rect';
  // Standalone Map Tokens
  mapTokens: StandaloneToken[];
  selectedMapTokenId: string | null;
  // Dynamic Lighting & Vision
  lights: LightSource[];
  isLightingEnabled: boolean;
  ambientLightMode: AmbientLightMode;
  ambientDarkness: number;
  selectedLightId: string | null;
  activeLightPresetId: string;
  isProceduralModalOpen?: boolean;
  backgroundTexture?: MapBackgroundTexture;
}

export type MapBackgroundTexture = 'none' | 'grass' | 'water' | 'wood' | 'stone';

export function getTokenScale(c: any): number {
  if (c?.size) {
    const s = String(c.size).toLowerCase();
    if (s.includes('gargantuan') || s.includes('громадный')) return 4.0;
    if (s.includes('huge') || s.includes('огромный')) return 3.0;
    if (s.includes('large') || s.includes('большой')) return 2.0;
    if (s.includes('medium') || s.includes('средний')) return 1.0;
    if (s.includes('small') || s.includes('маленький')) return 0.85;
    if (s.includes('tiny') || s.includes('крошечный')) return 0.6;
  }
  if (typeof c?.tokenScale === 'number' && c.tokenScale > 0) return c.tokenScale;
  const size = (c?.statblock?.size || c?.statblock?.size_ru || '').toLowerCase();
  if (size.includes('gargantuan') || size.includes('громадный')) return 4.0;
  if (size.includes('huge') || size.includes('огромный')) return 3.0;
  if (size.includes('large') || size.includes('большой')) return 2.0;
  return 1.0;
}

