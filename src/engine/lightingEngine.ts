import { Wall, isWallBlockingVision } from '../types/map';

export interface Point {
  x: number;
  y: number;
}

export interface LightSource {
  id: string;
  x: number;
  y: number;
  brightRadiusFeet: number;
  dimRadiusFeet: number;
  color: string;
  intensity: number;
  flicker: boolean;
  attachedTokenId?: string | null;
  enabled: boolean;
}

export type AmbientLightMode = 'daylight' | 'torchlight' | 'dim' | 'night' | 'pitch_black';

export interface AmbientLightInfo {
  id: AmbientLightMode;
  name: string;
  nameEn?: string;
  darkness: number;
  description: string;
  descriptionEn?: string;
}

export const AMBIENT_LIGHT_CONFIG: Record<AmbientLightMode, AmbientLightInfo> = {
  daylight: {
    id: 'daylight',
    name: 'День',
    nameEn: 'Daylight',
    darkness: 0.0,
    description: 'Яркий солнечный свет, маска тьмы отключена',
    descriptionEn: 'Bright sunlight, darkness mask disabled',
  },
  torchlight: {
    id: 'torchlight',
    name: 'Факельный полумрак',
    nameEn: 'Torchlight',
    darkness: 0.35,
    description: 'Легкие тени и приглушенный свет',
    descriptionEn: 'Light shadows and subdued glow',
  },
  dim: {
    id: 'dim',
    name: 'Сумерки',
    nameEn: 'Twilight',
    darkness: 0.5,
    description: 'Вечерние сумерки и тусклый свет',
    descriptionEn: 'Evening twilight and dim light',
  },
  night: {
    id: 'night',
    name: 'Ночь',
    nameEn: 'Night',
    darkness: 0.85,
    description: 'Лунная ночь на открытой местности',
    descriptionEn: 'Moonlit night in open terrain',
  },
  pitch_black: {
    id: 'pitch_black',
    name: 'Подземелье',
    nameEn: 'Pitch Black',
    darkness: 0.95,
    description: 'Полная тьма подземелий и склепов',
    descriptionEn: 'Complete dungeon and crypt darkness',
  },
};

export interface LightPreset {
  id: string;
  name: string;
  nameEn?: string;
  brightRadiusFeet: number;
  dimRadiusFeet: number;
  color: string;
  intensity: number;
  flicker: boolean;
  description: string;
  descriptionEn?: string;
}

export const DND_LIGHT_PRESETS: LightPreset[] = [
  {
    id: 'torch',
    name: 'Факел',
    nameEn: 'Torch',
    brightRadiusFeet: 20,
    dimRadiusFeet: 40,
    color: '#FFA726',
    intensity: 0.9,
    flicker: true,
    description: '20 фт. яркий / 40 фт. тусклый, теплый янтарь, мерцание',
    descriptionEn: '20 ft. bright / 40 ft. dim, warm amber, flickering',
  },
  {
    id: 'lantern_hooded',
    name: 'Фонарь (круговой)',
    nameEn: 'Hooded Lantern',
    brightRadiusFeet: 30,
    dimRadiusFeet: 60,
    color: '#FFF8E1',
    intensity: 0.95,
    flicker: false,
    description: '30 фт. яркий / 60 фт. тусклый, желто-белый свет',
    descriptionEn: '30 ft. bright / 60 ft. dim, warm white beam',
  },
  {
    id: 'candle',
    name: 'Свеча',
    nameEn: 'Candle',
    brightRadiusFeet: 5,
    dimRadiusFeet: 10,
    color: '#FFE082',
    intensity: 0.7,
    flicker: true,
    description: '5 фт. яркий / 10 фт. тусклый, мягкий свет',
    descriptionEn: '5 ft. bright / 10 ft. dim, gentle light',
  },
  {
    id: 'spell_light',
    name: 'Заклинание Свет (Light)',
    nameEn: 'Light Spell',
    brightRadiusFeet: 20,
    dimRadiusFeet: 40,
    color: '#E0F2FE',
    intensity: 1.0,
    flicker: false,
    description: '20 фт. яркий / 40 фт. тусклый, чистый белый/арканный свет',
    descriptionEn: '20 ft. bright / 40 ft. dim, pure white/arcane light',
  },
  {
    id: 'campfire',
    name: 'Костер / Жаровня',
    nameEn: 'Campfire / Brazier',
    brightRadiusFeet: 30,
    dimRadiusFeet: 60,
    color: '#FF7043',
    intensity: 0.95,
    flicker: true,
    description: '30 фт. яркий / 60 фт. тусклый, пламенный оранжевый свет',
    descriptionEn: '30 ft. bright / 60 ft. dim, fiery orange glow',
  },
];

export function feetToPixels(feet: number, gridCellSize: number): number {
  const safeCell = gridCellSize > 0 ? gridCellSize : 50;
  return (feet / 5) * safeCell;
}

export function pixelsToFeet(pixels: number, gridCellSize: number): number {
  const safeCell = gridCellSize > 0 ? gridCellSize : 50;
  return (pixels / safeCell) * 5;
}

export function createLightFromPreset(
  presetId: string,
  x: number,
  y: number,
  attachedTokenId: string | null = null
): LightSource {
  const preset = DND_LIGHT_PRESETS.find((p) => p.id === presetId) || DND_LIGHT_PRESETS[0];
  return {
    id: crypto.randomUUID(),
    x,
    y,
    brightRadiusFeet: preset.brightRadiusFeet,
    dimRadiusFeet: preset.dimRadiusFeet,
    color: preset.color,
    intensity: preset.intensity,
    flicker: preset.flicker,
    attachedTokenId,
    enabled: true,
  };
}

export function checkRaySegmentIntersection(
  origin: Point,
  rayDir: Point,
  p1: Point,
  p2: Point,
  maxDistance: number
): { distance: number; point: Point } | null {
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  const wx = p1.x - origin.x;
  const wy = p1.y - origin.y;

  const det = rayDir.x * vy - rayDir.y * vx;
  if (Math.abs(det) < 1e-9) {
    return null;
  }

  const t = (wx * vy - wy * vx) / det;
  const u = (wx * rayDir.y - wy * rayDir.x) / det;

  if (t >= 1e-4 && t <= maxDistance && u >= -1e-6 && u <= 1 + 1e-6) {
    return {
      distance: t,
      point: {
        x: origin.x + t * rayDir.x,
        y: origin.y + t * rayDir.y,
      },
    };
  }

  return null;
}

export function computeRayClosestIntersection(
  origin: Point,
  angle: number,
  maxRadius: number,
  blockingWalls: Wall[]
): Point {
  const rayDir = {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };

  let minDistance = maxRadius;
  let closestPoint: Point = {
    x: origin.x + maxRadius * rayDir.x,
    y: origin.y + maxRadius * rayDir.y,
  };

  for (let i = 0; i < blockingWalls.length; i++) {
    const wall = blockingWalls[i];
    const hit = checkRaySegmentIntersection(origin, rayDir, wall.p1, wall.p2, minDistance);
    if (hit && hit.distance < minDistance) {
      minDistance = hit.distance;
      closestPoint = hit.point;
    }
  }

  return closestPoint;
}

export function computeVisibilityPolygon(
  origin: Point,
  radiusPx: number,
  walls: Wall[],
  radialSamplesCount = 72
): Point[] {
  if (radiusPx <= 0) return [];

  // Filter only walls that block vision (windows and open doors pass light)
  const blockingWalls = walls.filter((w) => isWallBlockingVision(w));

  const anglesSet: number[] = [];
  const epsilon = 0.0001;

  // 1. Radial samples around the full circle
  const step = (Math.PI * 2) / Math.max(16, radialSamplesCount);
  for (let i = 0; i < radialSamplesCount; i++) {
    anglesSet.push(-Math.PI + i * step);
  }

  // 2. Cast rays towards endpoints of all blocking walls
  for (let i = 0; i < blockingWalls.length; i++) {
    const wall = blockingWalls[i];
    const points = [wall.p1, wall.p2];

    for (let pIdx = 0; pIdx < points.length; pIdx++) {
      const p = points[pIdx];
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      const angle = Math.atan2(dy, dx);

      anglesSet.push(angle - epsilon);
      anglesSet.push(angle);
      anglesSet.push(angle + epsilon);
    }

    // 3. Circle intersection points for segments crossing the radius boundary
    const vx = wall.p2.x - wall.p1.x;
    const vy = wall.p2.y - wall.p1.y;
    const wx = wall.p1.x - origin.x;
    const wy = wall.p1.y - origin.y;

    const a = vx * vx + vy * vy;
    if (a > 1e-9) {
      const b = 2 * (wx * vx + wy * vy);
      const c = wx * wx + wy * wy - radiusPx * radiusPx;
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc);
        const s1 = (-b - sqrtDisc) / (2 * a);
        const s2 = (-b + sqrtDisc) / (2 * a);

        for (const s of [s1, s2]) {
          if (s >= 0 && s <= 1) {
            const crossX = wall.p1.x + s * vx;
            const crossY = wall.p1.y + s * vy;
            const crossAngle = Math.atan2(crossY - origin.y, crossX - origin.x);
            anglesSet.push(crossAngle - epsilon);
            anglesSet.push(crossAngle);
            anglesSet.push(crossAngle + epsilon);
          }
        }
      }
    }
  }

  // Normalize angles to [-Math.PI, Math.PI] and sort ascending
  const normalizedAngles = anglesSet.map((a) => {
    let norm = a;
    while (norm <= -Math.PI) norm += Math.PI * 2;
    while (norm > Math.PI) norm -= Math.PI * 2;
    return norm;
  });

  normalizedAngles.sort((a, b) => a - b);

  // Cast ray for each angle
  const polygonPoints: Point[] = [];
  for (let i = 0; i < normalizedAngles.length; i++) {
    const angle = normalizedAngles[i];
    const pt = computeRayClosestIntersection(origin, angle, radiusPx, blockingWalls);
    polygonPoints.push(pt);
  }

  return polygonPoints;
}

export function getFlickerFactor(lightId: string, timestamp: number): number {
  let hash = 0;
  for (let i = 0; i < lightId.length; i++) {
    hash = (hash * 31 + lightId.charCodeAt(i)) & 0xffffffff;
  }
  const seed = (Math.abs(hash) % 1000) / 1000;
  const t = timestamp / 1000;
  const wave1 = Math.sin(t * 8.5 + seed * 6.28);
  const wave2 = Math.cos(t * 14.7 + seed * 3.14);
  const factor = 1.0 + wave1 * 0.04 + wave2 * 0.02;
  return Math.max(0.92, Math.min(1.08, factor));
}

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  let r = 255;
  let g = 255;
  let b = 255;

  const parseVal = (str: string): number => {
    const v = parseInt(str, 16);
    return isNaN(v) ? 255 : v;
  };

  if (cleanHex.length === 3) {
    r = parseVal(cleanHex[0] + cleanHex[0]);
    g = parseVal(cleanHex[1] + cleanHex[1]);
    b = parseVal(cleanHex[2] + cleanHex[2]);
  } else if (cleanHex.length >= 6) {
    r = parseVal(cleanHex.substring(0, 2));
    g = parseVal(cleanHex.substring(2, 4));
    b = parseVal(cleanHex.substring(4, 6));
  }

  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

export function getTokenDarkvisionFeet(token: any): number {
  if (!token) return 0;
  if (typeof token.darkvisionFeet === 'number' && token.darkvisionFeet > 0) {
    return token.darkvisionFeet;
  }

  const senses = String(token.statblock?.senses || token.senses || '').toLowerCase();
  const match = senses.match(/(?:темное\s*зрение|тёмное\s*зрение|darkvision)\s*(\d+)/i);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  return 0;
}
