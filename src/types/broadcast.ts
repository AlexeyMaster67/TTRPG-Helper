import { Combatant } from './combat';
import {
  AoeTemplate,
  RulerMeasurement,
  DrawingLine,
  WeatherEffect,
  GridType,
  MapPin,
  Wall,
  FogShape,
  StandaloneToken,
  LightSource,
  AmbientLightMode,
} from './map';

export interface PublicRollNotification {
  id: string;
  title: string;
  formula: string;
  resultDisplay: string;
  total: number;
  damageType?: string;
  isCritical?: boolean;
  isCriticalMiss?: boolean;
  timestamp: number;
  dice3d?: Array<{
    sides: number;
    result: number;
  }>;
  dice2d?: {
    id?: string;
    sides?: number;
    r1?: number;
    r2?: number;
    kept?: number;
    dice?: Array<{
      id?: string;
      sides: number;
      value: number;
      isDiscarded?: boolean;
      isHighlighted?: boolean;
    }>;
    modifier?: number;
    total: number;
    mode?: 'normal' | 'advantage' | 'disadvantage';
    isNat20?: boolean;
    isNat1?: boolean;
    title?: string;
    rollerName?: string;
    targetName?: string;
    damageType?: string;
    subtitle?: string;
  };
}

export interface NpcShowcaseData {
  id: string;
  name: string;
  nameRu?: string;
  avatarUrl?: string;
  creatureType?: string;
  notes?: string;
  timestamp: number;
}

export interface HandoutData {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  type: 'letter' | 'scroll' | 'bounty' | 'clue' | 'decree' | 'riddle' | 'map' | 'portrait' | 'custom';
  timestamp: number;
}

export interface MapSyncData {
  mapImageUrl: string | null;
  imageWidth?: number;
  imageHeight?: number;
  gridCellSize: number;
  isGridVisible: boolean;
  gridType?: GridType;
  isVideoMap?: boolean;
  aoeTemplates?: AoeTemplate[];
  aoeShapes?: any[];
  ruler: RulerMeasurement | null;
  drawingLines?: DrawingLine[];
  isWhiteBackground?: boolean;
  weatherEffect?: 'none' | 'rain' | 'snow' | 'fog' | 'embers' | WeatherEffect;
  pins?: MapPin[];
  walls?: Wall[];
  isFogEnabled?: boolean;
  fogShapes?: FogShape[];
  mapTokens?: StandaloneToken[];
  lights?: LightSource[];
  isLightingEnabled?: boolean;
  ambientLightMode?: AmbientLightMode;
  ambientDarkness?: number;
  backgroundTexture?: string;
}

export type BroadcastMessage =
  | {
      type: 'SYNC_COMBAT_STATE';
      payload: {
        combatants: Combatant[];
        currentTurnIndex: number;
        roundCounter: number;
        activeCombatantId: string | null;
        activeEffects?: Record<string, any[]>;
      };
    }
  | {
      type: 'BROADCAST_ROLL';
      payload: PublicRollNotification;
    }
  | {
      type: 'BROADCAST_NPC_SHOWCASE';
      payload: NpcShowcaseData;
    }
  | {
      type: 'DISMISS_NPC_SHOWCASE';
    }
  | {
      type: 'BROADCAST_HANDOUT';
      payload: HandoutData;
    }
  | {
      type: 'DISMISS_HANDOUT';
    }
  | {
      type: 'SYNC_MAP_STATE';
      payload: MapSyncData;
    }
  | {
      type: 'REQUEST_SYNC';
    }
  | {
      type: 'PLAYER_DISPLAY_PING';
    }
  | {
      type: 'PLAYER_DISPLAY_PONG';
    }
  | {
      type: 'PLAYER_DISPLAY_CLOSED';
    }
  | {
      type: 'SYNC_TURN_TIMER';
      payload: {
        secondsLeft: number;
        totalSeconds: number;
        isRunning: boolean;
      };
    }
  | {
      type: 'SYNC_VIEWPORT';
      payload: {
        panX: number;
        panY: number;
        scale: number;
      };
    }
  | {
      type: 'DICE_3D_ROLL';
      payload: {
        id: string;
        dice: Array<{ sides: number; result?: number }>;
        title?: string;
        total?: number;
        theme?: 'classic' | 'ruby' | 'bone';
        timestamp: number;
      };
    };
