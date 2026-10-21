import { useState, useEffect, useRef, useMemo } from 'react';
import Konva from 'konva';
import clsx from 'clsx';
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Circle as KonvaCircle,
  Rect as KonvaRect,
  Text as KonvaText,
  Line as KonvaLine,
  Group as KonvaGroup,
  Wedge as KonvaWedge,
  Shape as KonvaShape,
} from 'react-konva';
import { useMapStore } from '../../store/mapStore';
import {
  AoeShape,
  DrawingLine,
  GridType,
  Wall,
  WallType,
  StandaloneToken,
  FogShape,
  getWallType,
  getDoorState,
  isWallBlockingMovement,
  isWallBlockingVision,
  LightSource,
} from '../../types/map';
import { useCombatStore } from '../../store/combatStore';
import { usePartyStore } from '../../store/partyStore';
import { importCharacterFromTtrpgh } from '../../services/ttrpghFormat';
import {
  computeVisibilityPolygon,
  feetToPixels,
  getFlickerFactor,
  hexToRgba,
  getTokenDarkvisionFeet,
  createLightFromPreset,
  DND_LIGHT_PRESETS,
} from '../../engine/lightingEngine';
import {
  calculateAuraPixelRadius,
  getEffectiveAuras,
} from '../../engine/effectStackEngine';

import { MapToolbar } from './MapToolbar';
import { SceneDirectorBar } from './SceneDirectorBar';
import { WeatherOverlay } from './WeatherOverlay';
import { TokenQuickActions } from './TokenQuickActions';
import { resolveTokenUrl } from '../../services/tokenResolver';
import { cleanRussianText, pluralizeRussian } from '../../utils/textUtils';
import {
  MapPin as MapPinIcon,
  X,
  Trash2,
  Upload,
  ToyBrick,
  DoorClosed,
  DoorOpen,
  Lock,
  EyeOff,
  AppWindow,
  Crosshair,
  Map as MapIcon,
  Users,
  Flame,
  Link as LinkIcon,
  Unlink as UnlinkIcon,
} from 'lucide-react';

export {
  findWallSnapPoint,
  checkLineIntersection,
  snapToHexPointy,
  snapToHexFlat,
  getHexPoints,
} from '../../utils/mapGeometry';

import {
  findWallSnapPoint,
  checkLineIntersection,
  snapToHexPointy,
  snapToHexFlat,
  getHexPoints,
} from '../../utils/mapGeometry';

interface TacticalBattleMapProps {
  isMasterView?: boolean;
}

const imageCache = new Map<string, HTMLImageElement>();

function useKonvaImage(url: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(() => {
    if (url && imageCache.has(url)) {
      return imageCache.get(url)!;
    }
    return null;
  });

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    if (imageCache.has(url)) {
      setImage(imageCache.get(url)!);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      imageCache.set(url, img);
      setImage(img);
    };
    img.onerror = () => {
      setImage(null);
    };
  }, [url]);

  return image;
}

export function getTokenScale(c: any): number {
  if (c.size) {
    const s = String(c.size).toLowerCase();
    if (s.includes('gargantuan') || s.includes('громадный')) return 4.0;
    if (s.includes('huge') || s.includes('огромный')) return 3.0;
    if (s.includes('large') || s.includes('большой')) return 2.0;
    if (s.includes('medium') || s.includes('средний')) return 1.0;
    if (s.includes('small') || s.includes('маленький')) return 0.85;
    if (s.includes('tiny') || s.includes('крошечный')) return 0.6;
  }
  if (typeof c.tokenScale === 'number' && c.tokenScale > 0) return c.tokenScale;
  const size = (c.statblock?.size || c.statblock?.size_ru || '').toLowerCase();
  if (size.includes('gargantuan') || size.includes('громадный')) return 4.0;
  if (size.includes('huge') || size.includes('огромный')) return 3.0;
  if (size.includes('large') || size.includes('большой')) return 2.0;
  return 1.0;
}

function CombatantTokenNode({
  c,
  gridCellSize,
  gridType = 'square',
  walls = [],
  isMasterView,
  activeTool,
  isTarget,
  isSelected,
  isActiveTurn,
  onInspect,
  onAttack,
  onTarget,
  onPositionChange,
  onHover,
}: {
  c: any;
  gridCellSize: number;
  gridType?: GridType;
  walls?: Wall[];
  isMasterView: boolean;
  activeTool: string;
  isTarget: boolean;
  isSelected: boolean;
  isActiveTurn: boolean;
  onInspect: () => void;
  onAttack: () => void;
  onTarget: () => void;
  onPositionChange: (x: number, y: number) => void;
  onHover: (combatant: any | null, pos?: { x: number; y: number }) => void;
}) {
  const groupRef = useRef<any>(null);
  const haloGroupRef = useRef<any>(null);
  const beaconGroupRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const x = c.tokenX ?? 100;
  const y = c.tokenY ?? 100;
  const scaleMod = getTokenScale(c);
  const tokenRadius = (gridCellSize / 2) * scaleMod;

  // Smooth interpolation on player screen (120-150ms ease-out)
  useEffect(() => {
    if (!isMasterView && groupRef.current) {
      groupRef.current.to({
        x,
        y,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
      });
    }
  }, [x, y, isMasterView]);

  // Smooth 60 FPS animation for selected magical halo and active turn rotating beacon
  useEffect(() => {
    if (!isSelected && !isActiveTurn) return;

    const node = haloGroupRef.current || beaconGroupRef.current;
    const layer = node?.getLayer();
    if (!layer) return;

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const time = frame.time;

      // Pulsing magical halo for selected token (gold/cyan animated glow)
      if (haloGroupRef.current) {
        const pulse = Math.sin(time * 0.005);
        const s = 1 + 0.06 * pulse;
        haloGroupRef.current.scale({ x: s, y: s });
        haloGroupRef.current.opacity(0.75 + 0.25 * pulse);
      }

      // Rotating golden turn beacon for active turn combatant
      if (beaconGroupRef.current) {
        beaconGroupRef.current.rotation((time * 0.06) % 360);
      }
    }, layer);

    anim.start();
    return () => {
      anim.stop();
    };
  }, [isSelected, isActiveTurn]);

  const combatantEffects = useCombatStore((s) => s.activeEffects[c.id]) || [];
  const effectAuras = getEffectiveAuras(combatantEffects);
  const directAura = (c as any).aura?.enabled ? [{
    radiusFeet: (c as any).aura.radiusFeet || 10,
    color: (c as any).aura.color || '#3B82F6',
    opacity: (c as any).aura.opacity ?? 0.22,
    pulsing: (c as any).aura.pulsing,
    effectName: 'Аура токена',
  }] : [];
  const auras = [...effectAuras, ...directAura];

  const tokenUrl = resolveTokenUrl(c.name, c.nameRu, c.tokenUrl || c.avatarUrl);
  const tokenImg = useKonvaImage(tokenUrl);
  const initials = (c.nameRu || c.name || '??').slice(0, 2).toUpperCase();

  // If token is hidden and we are in player view, do not render
  if (!isMasterView && c.tokenVisibleToPlayers === false) {
    return null;
  }

  return (
    <KonvaGroup
      ref={groupRef}
      x={x}
      y={y}
      opacity={c.tokenVisibleToPlayers === false ? 0.55 : 1}
      draggable={isMasterView && activeTool === 'select'}
      listening={isMasterView}
      onDragStart={() => {
        setIsDragging(true);
      }}
      onDragEnd={(e) => {
        setIsDragging(false);
        const cellSize = gridCellSize > 0 ? gridCellSize : 50;
        let snappedX: number;
        let snappedY: number;

        if (gridType === 'hex-pointy') {
          const snapped = snapToHexPointy(e.target.x(), e.target.y(), cellSize);
          snappedX = snapped.x;
          snappedY = snapped.y;
        } else if (gridType === 'hex-flat') {
          const snapped = snapToHexFlat(e.target.x(), e.target.y(), cellSize);
          snappedX = snapped.x;
          snappedY = snapped.y;
        } else {
          const isEven = Math.round(scaleMod) % 2 === 0;
          snappedX = isEven
            ? Math.round(e.target.x() / cellSize) * cellSize
            : Math.floor(e.target.x() / cellSize) * cellSize + cellSize / 2;
          snappedY = isEven
            ? Math.round(e.target.y() / cellSize) * cellSize
            : Math.floor(e.target.y() / cellSize) * cellSize + cellSize / 2;
        }

        // Collision Check: Cannot pass through closed walls or closed doors
        if (walls && walls.length > 0) {
          const oldX = c.tokenX ?? 100;
          const oldY = c.tokenY ?? 100;
          const hasCollision = walls.some((wall) => {
            if (!isWallBlockingMovement(wall)) return false;
            return checkLineIntersection({ x: oldX, y: oldY }, { x: snappedX, y: snappedY }, wall.p1, wall.p2);
          });

          if (hasCollision) {
            e.target.position({ x: oldX, y: oldY });
            return;
          }
        }

        e.target.position({ x: snappedX, y: snappedY });
        onPositionChange(snappedX, snappedY);
      }}
      onClick={() => {
        if (activeTool === 'draw' || activeTool === 'eraser') return;
        onInspect();
      }}
      onDblClick={() => {
        if (activeTool === 'draw' || activeTool === 'eraser') return;
        onAttack();
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        if (activeTool === 'draw' || activeTool === 'eraser') return;
        onTarget();
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (!isMasterView) return;
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition() || { x, y };
        onHover(c, pos);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isMasterView) return;
        onHover(null);
      }}
    >
      {/* Dynamic Aura rendering */}
      {auras.map((aura, aIdx) => {
        const auraPx = calculateAuraPixelRadius(aura.radiusFeet, gridCellSize);
        if (auraPx <= 0) return null;
        return (
          <KonvaGroup key={`c-aura-${aIdx}`} listening={false}>
            {/* Soft semi-transparent radial aura fill */}
            <KonvaCircle
              radius={auraPx}
              fill={aura.color}
              opacity={aura.opacity ?? 0.22}
              listening={false}
            />
            {/* Outer styled dashed ring with glow */}
            <KonvaCircle
              radius={auraPx}
              stroke={aura.color}
              strokeWidth={2}
              dash={[8, 5]}
              opacity={Math.min(1, (aura.opacity ?? 0.22) + 0.45)}
              shadowColor={aura.color}
              shadowBlur={6}
              listening={false}
            />
            {/* Subtle inner pulse ring */}
            <KonvaCircle
              radius={Math.max(4, auraPx - 3)}
              stroke={aura.color}
              strokeWidth={1}
              opacity={Math.min(1, (aura.opacity ?? 0.22) + 0.2)}
              listening={false}
            />
          </KonvaGroup>
        );
      })}

      {/* Multi-cell footprint grid highlight for Large (2x2), Huge (3x3), Gargantuan (4x4) */}
      {(isHovered || isDragging) && scaleMod >= 2 && (
        <KonvaGroup listening={false}>
          {/* Outer semi-transparent footprint rect covering all 4, 9, or 16 occupied cells */}
          <KonvaRect
            x={-tokenRadius}
            y={-tokenRadius}
            width={tokenRadius * 2}
            height={tokenRadius * 2}
            fill={c.isPlayer ? 'rgba(16, 185, 129, 0.22)' : 'rgba(224, 26, 34, 0.22)'}
            stroke={c.isPlayer ? '#10B981' : '#E01A22'}
            strokeWidth={2}
            dash={[6, 4]}
            cornerRadius={4}
            listening={false}
          />
          {/* Inner cell division lines showing all 4, 9, or 16 individual cells */}
          {Array.from({ length: Math.round(scaleMod) - 1 }).map((_, idx) => {
            const lineOffset = -tokenRadius + (idx + 1) * gridCellSize;
            return (
              <KonvaGroup key={`footprint-line-${idx}`} listening={false}>
                {/* Vertical line */}
                <KonvaLine
                  points={[lineOffset, -tokenRadius, lineOffset, tokenRadius]}
                  stroke={c.isPlayer ? 'rgba(16, 185, 129, 0.5)' : 'rgba(224, 26, 34, 0.5)'}
                  strokeWidth={1.5}
                  dash={[4, 3]}
                  listening={false}
                />
                {/* Horizontal line */}
                <KonvaLine
                  points={[-tokenRadius, lineOffset, tokenRadius, lineOffset]}
                  stroke={c.isPlayer ? 'rgba(16, 185, 129, 0.5)' : 'rgba(224, 26, 34, 0.5)'}
                  strokeWidth={1.5}
                  dash={[4, 3]}
                  listening={false}
                />
              </KonvaGroup>
            );
          })}
          {/* Footprint badge: e.g. 2×2 (4 кл), 3×3 (9 кл), 4×4 (16 кл) */}
          <KonvaRect
            x={-tokenRadius + 4}
            y={-tokenRadius + 4}
            width={52}
            height={16}
            fill="rgba(0, 0, 0, 0.8)"
            stroke={c.isPlayer ? 'rgba(16, 185, 129, 0.7)' : 'rgba(224, 26, 34, 0.7)'}
            strokeWidth={1}
            cornerRadius={2}
            listening={false}
          />
          <KonvaText
            text={`${Math.round(scaleMod)}×${Math.round(scaleMod)} (${Math.round(scaleMod) ** 2} кл)`}
            x={-tokenRadius + 6}
            y={-tokenRadius + 7}
            fontSize={9}
            fontFamily="monospace"
            fontStyle="bold"
            fill={c.isPlayer ? '#A7F3D0' : '#FECACA'}
            listening={false}
          />
        </KonvaGroup>
      )}

      {/* Active turn combatant rotating golden beacon ring */}
      {isActiveTurn && (
        <KonvaGroup listening={false}>
          {/* Ambient soft golden ground pool */}
          <KonvaCircle
            radius={tokenRadius + 6}
            fill="rgba(245, 158, 11, 0.22)"
            stroke="rgba(217, 119, 6, 0.5)"
            strokeWidth={1}
            listening={false}
          />
          {/* Rotating golden ring with direction pointer beacons */}
          <KonvaGroup ref={beaconGroupRef} listening={false}>
            {/* Outer dashed beacon ring */}
            <KonvaCircle
              radius={tokenRadius + 7}
              stroke="#F59E0B"
              strokeWidth={2.5}
              dash={[10, 6]}
              shadowColor="#F59E0B"
              shadowBlur={8}
              listening={false}
            />
            {/* 4 Directional Beacon Pointers (North, East, South, West) pointing inward */}
            <KonvaLine
              points={[0, -(tokenRadius + 14), 0, -(tokenRadius + 7)]}
              stroke="#FCD34D"
              strokeWidth={3}
              lineCap="round"
              listening={false}
            />
            <KonvaLine
              points={[tokenRadius + 7, 0, tokenRadius + 14, 0]}
              stroke="#FCD34D"
              strokeWidth={3}
              lineCap="round"
              listening={false}
            />
            <KonvaLine
              points={[0, tokenRadius + 7, 0, tokenRadius + 14]}
              stroke="#FCD34D"
              strokeWidth={3}
              lineCap="round"
              listening={false}
            />
            <KonvaLine
              points={[-(tokenRadius + 14), 0, -(tokenRadius + 7), 0]}
              stroke="#FCD34D"
              strokeWidth={3}
              lineCap="round"
              listening={false}
            />
          </KonvaGroup>
        </KonvaGroup>
      )}

      {/* Selected token pulsing magical halo ring (gold/cyan animated glow) */}
      {isSelected && (
        <KonvaGroup ref={haloGroupRef} listening={false}>
          {/* Outer cyan soft glow */}
          <KonvaCircle
            radius={tokenRadius + 6}
            stroke="#06B6D4"
            strokeWidth={2.5}
            shadowColor="#06B6D4"
            shadowBlur={10}
            shadowOpacity={0.8}
            listening={false}
          />
          {/* Inner gold dashed ring */}
          <KonvaCircle
            radius={tokenRadius + 3}
            stroke="#F59E0B"
            strokeWidth={1.5}
            dash={[5, 4]}
            shadowColor="#F59E0B"
            shadowBlur={4}
            listening={false}
          />
          {/* Ambient cyan/gold field */}
          <KonvaCircle
            radius={tokenRadius + 5}
            fill="rgba(6, 182, 212, 0.12)"
            listening={false}
          />
        </KonvaGroup>
      )}

      {/* Target indicator ring (only when explicitly targeted) */}
      {isTarget && (
        <KonvaCircle
          radius={tokenRadius + 2}
          stroke="#E01A22"
          strokeWidth={1.5}
          dash={[4, 4]}
          listening={false}
        />
      )}

      {/* Pure token art / initials without any external border clutter */}
      {tokenImg ? (
        <KonvaGroup
          clipFunc={(ctx: any) => {
            ctx.arc(0, 0, tokenRadius, 0, Math.PI * 2, false);
          }}
        >
          <KonvaImage
            image={tokenImg}
            x={-tokenRadius}
            y={-tokenRadius}
            width={tokenRadius * 2}
            height={tokenRadius * 2}
          />
        </KonvaGroup>
      ) : (
        <>
          <KonvaCircle
            radius={tokenRadius}
            fill={c.color || (c.isPlayer ? '#10B981' : '#E01A22')}
          />
          <KonvaText
            text={initials}
            fontSize={Math.max(10, tokenRadius * 0.75)}
            fontStyle="bold"
            fontFamily="monospace"
            fill="#FFFFFF"
            x={-tokenRadius * 0.55}
            y={-tokenRadius * 0.45}
            listening={false}
          />
        </>
      )}

      {/* HP mini-bar below tokens on map with dynamic health color (Green > Yellow > Red) */}
      {(() => {
        const barY = tokenRadius + 6;
        const barWidth = Math.max(34, tokenRadius * 1.6);
        const barHeight = 4.5;
        const maxHp = Math.max(1, c.maxHp || 10);
        const hp = Math.max(0, c.hp ?? maxHp);
        const hpPercent = Math.max(0, Math.min(1, hp / maxHp));
        const hpColor =
          hpPercent > 0.5 ? '#10B981' : hpPercent > 0.2 ? '#EAB308' : '#EF4444';

        return (
          <KonvaGroup listening={false}>
            {/* Background container */}
            <KonvaRect
              x={-barWidth / 2}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill="rgba(10, 14, 22, 0.88)"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth={0.8}
              cornerRadius={2}
              shadowColor="#000000"
              shadowBlur={2}
              shadowOpacity={0.6}
            />
            {/* Health fill */}
            {hpPercent > 0 && (
              <KonvaRect
                x={-barWidth / 2}
                y={barY}
                width={barWidth * hpPercent}
                height={barHeight}
                fill={hpColor}
                cornerRadius={2}
              />
            )}
            {/* Temp HP bar indicator */}
            {c.tempHp > 0 && (
              <KonvaRect
                x={-barWidth / 2 + barWidth * hpPercent}
                y={barY}
                width={Math.min(barWidth * (1 - hpPercent), (c.tempHp / maxHp) * barWidth)}
                height={barHeight}
                fill="#06B6D4"
                cornerRadius={2}
              />
            )}
          </KonvaGroup>
        );
      })()}

      {/* Master View: if hidden from players, show subtle eye badge */}
      {isMasterView && c.tokenVisibleToPlayers === false && (
        <KonvaText
          text="H"
          fontSize={10}
          fontStyle="bold"
          fill="#38BDF8"
          x={tokenRadius - 10}
          y={-tokenRadius - 2}
          listening={false}
        />
      )}

      {/* Master View: if dead, subtle cross mark */}
      {isMasterView && c.isDead && (
        <KonvaText
          text="X"
          fontSize={13}
          fontStyle="bold"
          fill="#EF4444"
          x={-5}
          y={-7}
          listening={false}
        />
      )}
    </KonvaGroup>
  );
}

export function StandaloneTokenNode({
  token,
  gridCellSize,
  gridType = 'square',
  walls = [],
  isMasterView,
  activeTool,
  isSelected,
  onInspect,
  onPositionChange,
  onHover,
}: {
  token: StandaloneToken;
  gridCellSize: number;
  gridType?: GridType;
  walls?: Wall[];
  isMasterView: boolean;
  activeTool: string;
  isSelected: boolean;
  onInspect: () => void;
  onPositionChange: (x: number, y: number) => void;
  onHover: (token: StandaloneToken | null, pos?: { x: number; y: number }) => void;
}) {
  const groupRef = useRef<any>(null);
  const haloGroupRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const x = token.x ?? 100;
  const y = token.y ?? 100;
  const scaleMod = getTokenScale(token);
  const tokenRadius = (gridCellSize / 2) * scaleMod;

  // Smooth interpolation on player screen (120-150ms ease-out)
  useEffect(() => {
    if (!isMasterView && groupRef.current) {
      groupRef.current.to({
        x,
        y,
        duration: 0.15,
        easing: Konva.Easings.EaseOut,
      });
    }
  }, [x, y, isMasterView]);

  // Selected pulsing halo
  useEffect(() => {
    if (!isSelected) return;
    const node = haloGroupRef.current;
    const layer = node?.getLayer();
    if (!layer) return;

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const time = frame.time;
      if (haloGroupRef.current) {
        const pulse = Math.sin(time * 0.005);
        const s = 1 + 0.06 * pulse;
        haloGroupRef.current.scale({ x: s, y: s });
        haloGroupRef.current.opacity(0.75 + 0.25 * pulse);
      }
    }, layer);

    anim.start();
    return () => {
      anim.stop();
    };
  }, [isSelected]);

  const tokenUrl = resolveTokenUrl(token.name, token.nameRu, token.tokenUrl || token.avatarUrl);
  const tokenImg = useKonvaImage(tokenUrl);
  const initials = (token.nameRu || token.name || '??').slice(0, 2).toUpperCase();

  // If token is hidden and we are in player view, do not render
  if (!isMasterView && !token.isVisibleToPlayers) {
    return null;
  }

  return (
    <KonvaGroup
      ref={groupRef}
      x={x}
      y={y}
      opacity={!token.isVisibleToPlayers ? 0.55 : 1}
      draggable={isMasterView && activeTool === 'select'}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(e) => {
        setIsDragging(false);
        const cellSize = gridCellSize > 0 ? gridCellSize : 50;
        let snappedX: number;
        let snappedY: number;

        if (gridType === 'hex-pointy') {
          const snapped = snapToHexPointy(e.target.x(), e.target.y(), cellSize);
          snappedX = snapped.x;
          snappedY = snapped.y;
        } else if (gridType === 'hex-flat') {
          const snapped = snapToHexFlat(e.target.x(), e.target.y(), cellSize);
          snappedX = snapped.x;
          snappedY = snapped.y;
        } else {
          const isEven = Math.round(scaleMod) % 2 === 0;
          snappedX = isEven
            ? Math.round(e.target.x() / cellSize) * cellSize
            : Math.floor(e.target.x() / cellSize) * cellSize + cellSize / 2;
          snappedY = isEven
            ? Math.round(e.target.y() / cellSize) * cellSize
            : Math.floor(e.target.y() / cellSize) * cellSize + cellSize / 2;
        }

        // Collision Check: Cannot pass through closed walls or closed doors
        if (walls && walls.length > 0) {
          const oldX = token.x ?? 100;
          const oldY = token.y ?? 100;
          const hasCollision = walls.some((wall) => {
            if (!isWallBlockingMovement(wall)) return false;
            return checkLineIntersection({ x: oldX, y: oldY }, { x: snappedX, y: snappedY }, wall.p1, wall.p2);
          });

          if (hasCollision) {
            e.target.position({ x: oldX, y: oldY });
            return;
          }
        }

        e.target.position({ x: snappedX, y: snappedY });
        onPositionChange(snappedX, snappedY);
      }}
      onClick={() => {
        if (activeTool === 'draw' || activeTool === 'eraser' || activeTool === 'fog') return;
        onInspect();
      }}
      onTap={() => {
        if (activeTool === 'draw' || activeTool === 'eraser' || activeTool === 'fog') return;
        onInspect();
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (!isMasterView) return;
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition() || { x, y };
        onHover(token, pos);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isMasterView) return;
        onHover(null);
      }}
    >
      {/* Standalone Token Aura */}
      {token.aura?.enabled && token.aura.radiusFeet > 0 && (() => {
        const auraPx = calculateAuraPixelRadius(token.aura.radiusFeet, gridCellSize);
        if (auraPx <= 0) return null;
        const color = token.aura.color || '#3B82F6';
        const opacity = token.aura.opacity ?? 0.22;
        return (
          <KonvaGroup listening={false}>
            <KonvaCircle
              radius={auraPx}
              fill={color}
              opacity={opacity}
              listening={false}
            />
            <KonvaCircle
              radius={auraPx}
              stroke={color}
              strokeWidth={2}
              dash={[8, 5]}
              opacity={Math.min(1, opacity + 0.45)}
              shadowColor={color}
              shadowBlur={6}
              listening={false}
            />
            <KonvaCircle
              radius={Math.max(4, auraPx - 3)}
              stroke={color}
              strokeWidth={1}
              opacity={Math.min(1, opacity + 0.2)}
              listening={false}
            />
          </KonvaGroup>
        );
      })()}

      {/* Multi-cell footprint grid highlight for Large (2x2), Huge (3x3), Gargantuan (4x4) */}
      {(isHovered || isDragging) && scaleMod >= 2 && (
        <KonvaGroup listening={false}>
          <KonvaRect
            x={-tokenRadius}
            y={-tokenRadius}
            width={tokenRadius * 2}
            height={tokenRadius * 2}
            fill="rgba(59, 130, 246, 0.22)"
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[6, 4]}
            cornerRadius={4}
            listening={false}
          />
        </KonvaGroup>
      )}

      {/* Selected token pulsing magical halo ring */}
      {isSelected && (
        <KonvaGroup ref={haloGroupRef} listening={false}>
          <KonvaCircle
            radius={tokenRadius + 6}
            stroke="#3B82F6"
            strokeWidth={2.5}
            shadowColor="#3B82F6"
            shadowBlur={10}
            shadowOpacity={0.8}
            listening={false}
          />
          <KonvaCircle
            radius={tokenRadius + 3}
            stroke="#60A5FA"
            strokeWidth={1.5}
            dash={[5, 4]}
            shadowColor="#60A5FA"
            shadowBlur={4}
            listening={false}
          />
          <KonvaCircle
            radius={tokenRadius + 5}
            fill="rgba(59, 130, 246, 0.15)"
            listening={false}
          />
        </KonvaGroup>
      )}

      {/* Pure token art / initials */}
      {tokenImg ? (
        <KonvaGroup
          clipFunc={(ctx: any) => {
            ctx.arc(0, 0, tokenRadius, 0, Math.PI * 2, false);
          }}
        >
          <KonvaImage
            image={tokenImg}
            x={-tokenRadius}
            y={-tokenRadius}
            width={tokenRadius * 2}
            height={tokenRadius * 2}
          />
        </KonvaGroup>
      ) : (
        <>
          <KonvaCircle
            radius={tokenRadius}
            fill={token.color || '#3B82F6'}
          />
          <KonvaText
            text={initials}
            fontSize={Math.max(10, tokenRadius * 0.75)}
            fontStyle="bold"
            fontFamily="monospace"
            fill="#FFFFFF"
            x={-tokenRadius * 0.55}
            y={-tokenRadius * 0.45}
            listening={false}
          />
        </>
      )}

      {/* HP mini-bar if hp is specified */}
      {token.hp !== undefined && token.maxHp !== undefined && (() => {
        const barY = tokenRadius + 6;
        const barWidth = Math.max(34, tokenRadius * 1.6);
        const barHeight = 4.5;
        const maxHp = Math.max(1, token.maxHp);
        const hp = Math.max(0, token.hp);
        const hpPercent = Math.max(0, Math.min(1, hp / maxHp));
        const hpColor =
          hpPercent > 0.5 ? '#10B981' : hpPercent > 0.2 ? '#EAB308' : '#EF4444';

        return (
          <KonvaGroup listening={false}>
            <KonvaRect
              x={-barWidth / 2}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill="rgba(10, 14, 22, 0.88)"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth={0.8}
              cornerRadius={2}
            />
            {hpPercent > 0 && (
              <KonvaRect
                x={-barWidth / 2}
                y={barY}
                width={barWidth * hpPercent}
                height={barHeight}
                fill={hpColor}
                cornerRadius={2}
              />
            )}
          </KonvaGroup>
        );
      })()}

      {/* Master View: if hidden from players, show subtle eye badge */}
      {isMasterView && !token.isVisibleToPlayers && (
        <KonvaText
          text="H"
          fontSize={10}
          fontStyle="bold"
          fill="#38BDF8"
          x={tokenRadius - 10}
          y={-tokenRadius - 2}
          listening={false}
        />
      )}
    </KonvaGroup>
  );
}


/**
 * Snaps a point to either the nearest grid line intersection (corner) or cell center,
 * whichever is closer.
 */
export function snapRulerPoint(
  x: number,
  y: number,
  cellSize: number
): { x: number; y: number; isCorner: boolean } {
  const size = cellSize > 0 ? cellSize : 50;

  // Nearest grid line intersection (corner)
  const cornerX = Math.round(x / size) * size;
  const cornerY = Math.round(y / size) * size;
  const distCornerSq = (x - cornerX) ** 2 + (y - cornerY) ** 2;

  // Nearest cell center
  const centerX = Math.floor(x / size) * size + size / 2;
  const centerY = Math.floor(y / size) * size + size / 2;
  const distCenterSq = (x - centerX) ** 2 + (y - centerY) ** 2;

  if (distCornerSq <= distCenterSq) {
    return { x: cornerX, y: cornerY, isCorner: true };
  } else {
    return { x: centerX, y: centerY, isCorner: false };
  }
}

/**
 * Calculates distance metrics for the tactical ruler:
 * - Corner-to-corner: measures along grid lines (e.g., from corner 0 to corner 6 = 6 cells = 30 ft)
 * - Cell-based: calculates inclusive cell span (from Cell 1 across to Cell 6 = 6 cells = 30 ft)
 * - Supports D&D 5-10-5 diagonal rules (every second diagonal costs 10 ft instead of 5 ft)
 */
export function calculateRulerMetrics(
  start: { x: number; y: number; isCorner?: boolean },
  current: { x: number; y: number; isCorner?: boolean },
  cellSize: number
): { feet: number; cells: number; midX: number; midY: number; isCornerToCorner: boolean } {
  const size = cellSize > 0 ? cellSize : 50;

  const startIsCorner =
    start.isCorner ??
    (Math.abs(start.x % size) < 1 && Math.abs(start.y % size) < 1);
  const currentIsCorner =
    current.isCorner ??
    (Math.abs(current.x % size) < 1 && Math.abs(current.y % size) < 1);

  let totalCells = 0;
  let feet = 0;
  const isCornerToCorner = Boolean(startIsCorner && currentIsCorner);

  if (isCornerToCorner) {
    // Corner-to-corner measurement (measuring along grid lines / intersections)
    const dxCells = Math.abs(Math.round((current.x - start.x) / size));
    const dyCells = Math.abs(Math.round((current.y - start.y) / size));
    const diagonals = Math.min(dxCells, dyCells);
    const straights = Math.max(dxCells, dyCells) - diagonals;
    totalCells = straights + diagonals + Math.floor(diagonals / 2);
    feet = totalCells * 5;
  } else if (!startIsCorner && !currentIsCorner) {
    // Cell-center to cell-center measurement (inclusive cell span)
    const startCol = Math.floor(start.x / size);
    const startRow = Math.floor(start.y / size);
    const endCol = Math.floor(current.x / size);
    const endRow = Math.floor(current.y / size);

    const dxSteps = Math.abs(endCol - startCol);
    const dySteps = Math.abs(endRow - startRow);
    const diagonals = Math.min(dxSteps, dySteps);
    const straights = Math.max(dxSteps, dySteps) - diagonals;

    // D&D 5-10-5 diagonal rule for cell step traversal:
    const stepCost = straights + diagonals + Math.floor(diagonals / 2);
    // Inclusive cell count: counts all cells spanned including the starting square
    totalCells = stepCost + 1;
    feet = totalCells * 5;
  } else {
    // Mixed center/corner measurement
    const dxCells = Math.max(1, Math.round(Math.abs(current.x - start.x) / size));
    const dyCells = Math.max(0, Math.round(Math.abs(current.y - start.y) / size));
    const diagonals = Math.min(dxCells, dyCells);
    const straights = Math.max(dxCells, dyCells) - diagonals;
    totalCells = straights + diagonals + Math.floor(diagonals / 2);
    feet = totalCells * 5;
  }

  return {
    feet,
    cells: totalCells,
    midX: (start.x + current.x) / 2,
    midY: (start.y + current.y) / 2,
    isCornerToCorner,
  };
}

/**
 * Returns the grid cells covered/highlighted by the ruler line
 */
export function getCoveredCells(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cellSize: number,
  isCornerToCorner: boolean
): Array<{ col: number; row: number }> {
  const size = cellSize > 0 ? cellSize : 50;

  if (isCornerToCorner) {
    const col0 = Math.round(startX / size);
    const row0 = Math.round(startY / size);
    const col1 = Math.round(endX / size);
    const row1 = Math.round(endY / size);

    if (col0 === col1 && row0 === row1) return [];

    const cells: Array<{ col: number; row: number }> = [];
    const minCol = Math.min(col0, col1);
    const maxCol = Math.max(col0, col1);
    const minRow = Math.min(row0, row1);
    const maxRow = Math.max(row0, row1);

    if (row0 === row1) {
      for (let c = minCol; c < maxCol; c++) {
        cells.push({ col: c, row: minRow });
      }
      return cells;
    }

    if (col0 === col1) {
      for (let r = minRow; r < maxRow; r++) {
        cells.push({ col: minCol, row: r });
      }
      return cells;
    }

    const dx = Math.abs(col1 - col0);
    const dy = Math.abs(row1 - row0);
    const steps = Math.max(dx, dy);
    for (let i = 0; i < steps; i++) {
      const c =
        col0 < col1
          ? col0 + Math.floor((i * dx) / steps)
          : col0 - 1 - Math.floor((i * dx) / steps);
      const r =
        row0 < row1
          ? row0 + Math.floor((i * dy) / steps)
          : row0 - 1 - Math.floor((i * dy) / steps);
      cells.push({ col: c, row: r });
    }
    return cells;
  } else {
    const col0 = Math.floor(startX / size);
    const row0 = Math.floor(startY / size);
    const col1 = Math.floor(endX / size);
    const row1 = Math.floor(endY / size);

    if (col0 === col1 && row0 === row1) {
      return [{ col: col0, row: row0 }];
    }

    const cells: Array<{ col: number; row: number }> = [];
    const dx = Math.abs(col1 - col0);
    const dy = Math.abs(row1 - row0);
    const steps = Math.max(dx, dy);

    for (let i = 0; i <= steps; i++) {
      const c = Math.round(col0 + ((col1 - col0) * i) / steps);
      const r = Math.round(row0 + ((row1 - row0) * i) / steps);
      cells.push({ col: c, row: r });
    }

    const seen = new Set<string>();
    const uniqueCells: Array<{ col: number; row: number }> = [];
    for (const cell of cells) {
      const key = `${cell.col},${cell.row}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCells.push(cell);
      }
    }
    return uniqueCells;
  }
}

export function TacticalBattleMap({ isMasterView = true }: TacticalBattleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  const [containerSize, setContainerSize] = useState({ width: 1200, height: 750 });

  // Spacebar and Mouse Pan State
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const isSpacePressed = useRef(false);
  const isMousePanning = useRef(false);
  const panStartPos = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        isSpacePressed.current = true;
        setIsSpaceDown(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressed.current = false;
        setIsSpaceDown(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Map Store
  const {
    imageUrl,
    imageWidth,
    imageHeight,
    scale,
    panX,
    panY,
    gridCellSize,
    isGridVisible,
    gridType,
    isVideoMap,
    setImageUrl,
    activeTool,
    setActiveTool,
    aoeTemplates,
    selectedAoeId,
    setSelectedAoeId,
    addAoeTemplate,
    updateAoeTemplate,
    removeAoeTemplate,
    pendingAoe,
    setPendingAoe,
    rotatePendingAoe,
    ruler: storeRuler,
    setRuler,
    setScale,
    setPan,
    fitToViewport,
    drawingLines,
    currentBrushColor,
    currentBrushWidth,
    isWhiteBackground,
    weatherEffect,
    addDrawingLine,
    updateCurrentDrawingLine,
    undoLastDrawing,
    pins,
    selectedPinId,
    setSelectedPinId,
    addPin,
    updatePin,
    removePin,
    walls,
    selectedWallId,
    setSelectedWallId,
    addWall,
    updateWall,
    removeWall,
    toggleDoor,
    toggleLockDoor,
    setDoorState,
    broadcastMapState,
    isFogEnabled,
    fogShapes,
    fogBrushSize,
    fogToolMode,
    fogShapeType,
    addFogShape,
    undoLastFog,
    mapTokens,
    selectedMapTokenId,
    setSelectedMapTokenId,
    addMapToken,
    updateMapToken,
    removeMapToken,
    lights,
    isLightingEnabled,
    ambientDarkness,
    selectedLightId,
    activeLightPresetId,
    addLight,
    updateLight,
    removeLight,
    setSelectedLightId,
    syncTokenAttachedLights,
  } = useMapStore();

  // Combat Store
  const {
    combatants,
    activeCombatantId,
    inspectedCombatantId,
    setInspectedCombatantId,
    updateCombatantPosition,
    addCombatant,
    openTargetedAttack,
    currentTargetId,
    toggleCurrentTargetId,
    isTargetingMode,
    pendingAttackAction,
    pendingAttackerId,
    executeTargetedStrike,
    cancelTargetingMode,
  } = useCombatStore();

  const selectedCombatant = useMemo(
    () => combatants.find((c) => c.id === inspectedCombatantId) || null,
    [combatants, inspectedCombatantId]
  );

  const selectedStandaloneToken = useMemo(
    () => mapTokens.find((t) => t.id === selectedMapTokenId) || null,
    [mapTokens, selectedMapTokenId]
  );

  const selectedPin = useMemo(
    () => pins.find((p) => p.id === selectedPinId) || null,
    [pins, selectedPinId]
  );

  const selectedWall = useMemo(
    () => walls.find((w) => w.id === selectedWallId) || null,
    [walls, selectedWallId]
  );

  const selectedLight = useMemo(
    () => lights.find((l) => l.id === selectedLightId) || null,
    [lights, selectedLightId]
  );

  // Flicker animation tick for active flickering lights
  const [flickerTick, setFlickerTick] = useState(0);
  useEffect(() => {
    const hasFlicker = lights.some((l) => l.enabled && l.flicker);
    if (!hasFlicker) return;

    const interval = setInterval(() => {
      setFlickerTick(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [lights]);

  // Compute visibility polygons for all active lights
  const lightPolygons = useMemo(() => {
    if (!isLightingEnabled && ambientDarkness <= 0) return [];

    const result: Array<{
      light: LightSource;
      origin: { x: number; y: number };
      dimRadiusPx: number;
      brightRadiusPx: number;
      poly: Array<{ x: number; y: number }>;
    }> = [];

    const now = flickerTick || Date.now();

    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      if (!light.enabled) continue;

      let flicker = 1.0;
      if (light.flicker) {
        flicker = getFlickerFactor(light.id, now);
      }

      const dimRadiusPx = feetToPixels(light.dimRadiusFeet, gridCellSize) * flicker;
      const brightRadiusPx = feetToPixels(light.brightRadiusFeet, gridCellSize) * flicker;
      const origin = { x: light.x, y: light.y };

      const poly = computeVisibilityPolygon(origin, dimRadiusPx, walls, 72);

      result.push({
        light,
        origin,
        dimRadiusPx,
        brightRadiusPx,
        poly,
      });
    }

    return result;
  }, [lights, isLightingEnabled, ambientDarkness, walls, gridCellSize, flickerTick]);

  // Compute vision polygons for player tokens & darkvision
  const visionPolygons = useMemo(() => {
    if (!isLightingEnabled && ambientDarkness <= 0) return [];

    const result: Array<{
      tokenId: string;
      origin: { x: number; y: number };
      radiusPx: number;
      poly: Array<{ x: number; y: number }>;
    }> = [];

    // Combatant player tokens (or all combatants if DM view)
    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      if (!isMasterView && !c.isPlayer) continue;

      const darkvisionFeet = getTokenDarkvisionFeet(c) || (isMasterView ? 0 : 5);
      if (darkvisionFeet <= 0) continue;

      const radiusPx = feetToPixels(darkvisionFeet, gridCellSize);
      const origin = { x: c.tokenX ?? 100, y: c.tokenY ?? 100 };
      const poly = computeVisibilityPolygon(origin, radiusPx, walls, 60);

      result.push({
        tokenId: c.id,
        origin,
        radiusPx,
        poly,
      });
    }

    // Standalone tokens visible to players
    for (let i = 0; i < mapTokens.length; i++) {
      const t = mapTokens[i];
      if (!isMasterView && !t.isVisibleToPlayers) continue;

      const darkvisionFeet = getTokenDarkvisionFeet(t);
      if (darkvisionFeet <= 0) continue;

      const radiusPx = feetToPixels(darkvisionFeet, gridCellSize);
      const origin = { x: t.x, y: t.y };
      const poly = computeVisibilityPolygon(origin, radiusPx, walls, 60);

      result.push({
        tokenId: t.id,
        origin,
        radiusPx,
        poly,
      });
    }

    return result;
  }, [combatants, mapTokens, isLightingEnabled, ambientDarkness, walls, gridCellSize, isMasterView]);


  // ResizeObserver for auto-fit container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Background map image element
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!imageUrl) {
      setBgImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setBgImage(img);
    };
  }, [imageUrl]);

  // Video map element support (.mp4, .webm)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const isVideo = isVideoMap || (imageUrl && (imageUrl.endsWith('.mp4') || imageUrl.endsWith('.webm') || imageUrl.startsWith('data:video/')));
    if (isVideo && imageUrl) {
      const video = document.createElement('video');
      video.src = imageUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.crossOrigin = 'anonymous';
      video.onloadedmetadata = () => {
        setVideoLoaded(true);
        video.play().catch(console.error);
      };
      videoRef.current = video;

      return () => {
        video.pause();
        video.src = '';
        videoRef.current = null;
        setVideoLoaded(false);
      };
    } else {
      videoRef.current = null;
      setVideoLoaded(false);
    }
  }, [isVideoMap, imageUrl]);

  // Video frame animation ticker
  useEffect(() => {
    if (!videoLoaded || !videoRef.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    const layer = stage.getLayers()[0];
    if (!layer) return;

    const anim = new Konva.Animation(() => {
      // Re-draw background layer to display video frames
    }, layer);
    anim.start();
    return () => {
      anim.stop();
    };
  }, [videoLoaded]);

  // Active wall drawing preview state
  const [drawingWall, setDrawingWall] = useState<{
    p1: { x: number; y: number };
    p2: { x: number; y: number };
  } | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<{ x: number; y: number } | null>(null);

  // Drag and drop assets from Windows Explorer
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [dragDropTarget, setDragDropTarget] = useState<{
    file: File;
    dropX: number;
    dropY: number;
  } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const stage = stageRef.current;
    const pointer = stage ? stage.getPointerPosition() : null;
    const dropX = pointer ? (pointer.x - stage.x()) / stage.scaleX() : 100;
    const dropY = pointer ? (pointer.y - stage.y()) / stage.scaleY() : 100;

    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
    if (isVideo) {
      const url = URL.createObjectURL(file);
      setImageUrl(url, 1920, 1080, true);
      return;
    }

    // Handle .ttrpgh character file drop
    if (file.name.toLowerCase().endsWith('.ttrpgh')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const member = importCharacterFromTtrpgh(text);
          // Add to party store
          usePartyStore.getState().addMember(member);

          // Add to combat store and position directly at drop location on the map
          const combatStore = useCombatStore.getState();
          const combatantId = crypto.randomUUID();
          combatStore.addCombatant({
            id: combatantId,
            name: member.name,
            nameRu: member.name,
            creatureType: member.characterClass,
            initiative: 10 + (member.initBonus || 0),
            hp: member.currentHp ?? member.maxHp,
            maxHp: member.maxHp,
            ac: member.ac,
            speed: member.speed || '30 фт.',
            isPlayer: true,
            tokenUrl: member.avatarUrl,
            avatarUrl: member.avatarUrl,
            color: member.color || '#10B981',
            tokenX: Math.round(dropX),
            tokenY: Math.round(dropY),
          });

          usePartyStore.getState().showToast(`Персонаж "${member.name}" импортирован на карту из .ttrpgh!`);
        } catch (err) {
          console.error('[TacticalBattleMap] Failed to import .ttrpgh:', err);
        }
      };
      reader.readAsText(file);
      return;
    }

    if (file.type.startsWith('image/')) {
      setDragDropTarget({ file, dropX, dropY });
    }
  };

  const handleUseAsMap = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        setImageUrl(dataUrl, img.naturalWidth || 1920, img.naturalHeight || 1080, false);
        setDragDropTarget(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateToken = (file: File, dropX: number, dropY: number) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      addCombatant({
        name: baseName,
        nameRu: baseName,
        initiative: 10,
        hp: 25,
        maxHp: 25,
        ac: 14,
        speed: '30 фт.',
        isPlayer: false,
        tokenUrl: dataUrl,
        avatarUrl: dataUrl,
        tokenX: Math.round(dropX),
        tokenY: Math.round(dropY),
      });
      setDragDropTarget(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStandaloneToken = (file: File, dropX: number, dropY: number) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      addMapToken({
        id: crypto.randomUUID(),
        name: baseName,
        x: Math.round(dropX),
        y: Math.round(dropY),
        size: 'medium',
        tokenUrl: dataUrl,
        avatarUrl: dataUrl,
        isVisibleToPlayers: true,
      });
      setDragDropTarget(null);
    };
    reader.readAsDataURL(file);
  };

  // Pointer position in stage canvas coordinates
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);

  // Master View hover tooltip for combatants
  const [hoveredInfo, setHoveredInfo] = useState<{
    combatant: any;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Dynamic Ruler state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [rulerStart, setRulerStart] = useState<{ x: number; y: number; isCorner?: boolean } | null>(null);
  const [rulerCurrent, setRulerCurrent] = useState<{ x: number; y: number; isCorner?: boolean } | null>(null);

  // Drawing state
  const isDrawing = useRef(false);

  // Fog of War Drawing state
  const [currentFogStroke, setCurrentFogStroke] = useState<FogShape | null>(null);
  const currentFogStrokeRef = useRef<FogShape | null>(null);
  const isFogDrawing = useRef(false);

  // Commits active fog stroke to mapStore
  const commitCurrentFogStroke = () => {
    if (!isFogDrawing.current || !currentFogStrokeRef.current) return;
    isFogDrawing.current = false;
    let finalShape = { ...currentFogStrokeRef.current };
    if (finalShape.type === 'rect') {
      let { x = 0, y = 0, width = 0, height = 0 } = finalShape;
      if (width < 0) {
        x = x + width;
        width = Math.abs(width);
      }
      if (height < 0) {
        y = y + height;
        height = Math.abs(height);
      }
      finalShape.x = Math.round(x);
      finalShape.y = Math.round(y);
      finalShape.width = Math.round(width);
      finalShape.height = Math.round(height);
      if (finalShape.width > 5 || finalShape.height > 5) {
        addFogShape(finalShape);
      }
    } else {
      if (finalShape.points && finalShape.points.length >= 2) {
        addFogShape(finalShape);
      }
    }
    currentFogStrokeRef.current = null;
    setCurrentFogStroke(null);
  };

  // Global mouseup listener for drawing release
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDrawing.current) {
        isDrawing.current = false;
        broadcastMapState();
      }
      if (isFogDrawing.current) {
        commitCurrentFogStroke();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [broadcastMapState]);


  // Transform screen coordinate to stage canvas coordinate
  const getStageRelativePos = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };
  };

  // Hotkeys: 'Ctrl+Z' (undo), 'R' (ruler), 'D' (draw), 'E' (eraser), 'T' (toggle target), 'Escape' (cancel actions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Undo drawing or fog: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ')) {
        e.preventDefault();
        if (activeTool === 'fog') {
          undoLastFog();
        } else {
          undoLastDrawing();
        }
        return;
      }

      if (e.key === 'h' || e.key === 'H' || e.code === 'KeyH') {
        if (isMasterView) {
          setActiveTool(activeTool === 'pan' ? 'select' : 'pan');
        }
      } else if (e.key === 'v' || e.key === 'V' || e.code === 'KeyV') {
        if (isMasterView) {
          setActiveTool('select');
        }
      } else if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
        setActiveTool(activeTool === 'ruler' ? 'select' : 'ruler');
      } else if (e.key === 'd' || e.key === 'D' || e.code === 'KeyD') {
        if (isMasterView) {
          setActiveTool(activeTool === 'draw' ? 'select' : 'draw');
        }
      } else if (e.key === 'e' || e.key === 'E' || e.code === 'KeyE') {
        if (isMasterView) {
          setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser');
        }
      } else if (e.key === 't' || e.key === 'T' || e.code === 'KeyT') {
        if (hoveredInfo?.combatant) {
          toggleCurrentTargetId(hoveredInfo.combatant.id);
        } else if (inspectedCombatantId) {
          toggleCurrentTargetId(inspectedCombatantId);
        }
      } else if (e.key === 'Escape' || e.code === 'Escape') {
        if (selectedAoeId) {
          setSelectedAoeId(null);
        }
        if (selectedPinId) {
          setSelectedPinId(null);
        }
        if (selectedWallId) {
          setSelectedWallId(null);
        }
        if (drawingWall) {
          setDrawingWall(null);
          setSnapIndicator(null);
          return;
        }
        if (pendingAoe) {
          setPendingAoe(null);
          setActiveTool('select');
        }
        if (isTargetingMode) {
          cancelTargetingMode();
        }
        if (
          activeTool === 'draw' ||
          activeTool === 'eraser' ||
          activeTool === 'pin' ||
          activeTool === 'wall' ||
          activeTool === 'door' ||
          activeTool === 'secret_door' ||
          activeTool === 'window' ||
          activeTool === 'fog' ||
          activeTool === 'light'
        ) {
          setActiveTool('select');
        }
        if (currentFogStroke) {
          setCurrentFogStroke(null);
          isFogDrawing.current = false;
        }
        if (selectedMapTokenId) {
          setSelectedMapTokenId(null);
        }
        if (selectedLightId) {
          setSelectedLightId(null);
        }
        if (activeTool === 'ruler') {
          setActiveTool('select');
          setRuler(null);
          setRulerStart(null);
          setRulerCurrent(null);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && isMasterView) {
        if (selectedAoeId) {
          removeAoeTemplate(selectedAoeId);
        } else if (selectedPinId) {
          removePin(selectedPinId);
        } else if (selectedWallId) {
          removeWall(selectedWallId);
        } else if (selectedMapTokenId) {
          removeMapToken(selectedMapTokenId);
        } else if (selectedLightId) {
          removeLight(selectedLightId);
        }
      } else if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && selectedAoeId && isMasterView) {
        rotatePendingAoe(15);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTool,
    setActiveTool,
    hoveredInfo,
    inspectedCombatantId,
    toggleCurrentTargetId,
    pendingAoe,
    setPendingAoe,
    rotatePendingAoe,
    selectedAoeId,
    setSelectedAoeId,
    removeAoeTemplate,
    selectedPinId,
    setSelectedPinId,
    removePin,
    selectedWallId,
    setSelectedWallId,
    removeWall,
    selectedMapTokenId,
    setSelectedMapTokenId,
    removeMapToken,
    selectedLightId,
    setSelectedLightId,
    removeLight,
    currentFogStroke,
    drawingWall,
    isTargetingMode,
    cancelTargetingMode,
    setRuler,
    undoLastDrawing,
    isMasterView,
  ]);


  // Pan & Zoom Wheel + Sticky AoE Rotation
  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    // If a sticky AoE template is currently active, rotate it by 15°
    if (pendingAoe && isMasterView) {
      const delta = e.evt.deltaY > 0 ? 15 : -15;
      rotatePendingAoe(delta);
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const factor = e.evt.deltaY > 0 ? 0.88 : 1.14;
    const newScale = Math.max(0.2, Math.min(4.0, oldScale * factor));

    setScale(newScale);
    setPan(
      pointer.x - mousePointTo.x * newScale,
      pointer.y - mousePointTo.y * newScale
    );
  };

  // Mouse Down handler for Sticky AoE placement, snapped Ruler, and Freehand Drawing
  const handleMouseDown = (e: any) => {
    // Right click (button 2) or middle click (button 1) or Spacebar held starts panning anywhere
    if (e.evt.button === 1 || e.evt.button === 2 || isSpacePressed.current) {
      isMousePanning.current = true;
      panStartPos.current = {
        x: e.evt.clientX,
        y: e.evt.clientY,
        panX,
        panY,
      };
      return;
    }
    // Left-click commits sticky AoE template placement
    if (pendingAoe && isMasterView && e.evt.button === 0) {
      const pos = getStageRelativePos();
      const sShape = (pendingAoe.shape || (pendingAoe.type === 'sphere' ? 'circle' : pendingAoe.type) || 'circle') as AoeShape;
      const id = addAoeTemplate({
        shape: sShape,
        sizeFeet: pendingAoe.sizeFeet,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        rotation: pendingAoe.rotation || 0,
        color: pendingAoe.color || '#EF4444',
        label: pendingAoe.label,
      });
      setSelectedAoeId(id);
      setPendingAoe(null);
      setActiveTool('select');
      return;
    }

    // Pin Placement Tool
    if (activeTool === 'pin' && isMasterView && e.evt.button === 0) {
      const pos = getStageRelativePos();
      const newPinId = addPin({
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        title: 'Заметка комнаты',
        description: '',
        isSecret: true,
        color: '#f59e0b',
      });
      setSelectedPinId(newPinId);
      setActiveTool('select');
      return;
    }

    // Dynamic Light Placement Tool
    if (activeTool === 'light' && isMasterView && e.evt.button === 0) {
      const pos = getStageRelativePos();
      const cellSize = gridCellSize > 0 ? gridCellSize : 50;
      const isAlt = e.evt.altKey;
      const x = isAlt ? Math.round(pos.x) : Math.round(pos.x / (cellSize / 2)) * (cellSize / 2);
      const y = isAlt ? Math.round(pos.y) : Math.round(pos.y / (cellSize / 2)) * (cellSize / 2);

      const newLight = createLightFromPreset(activeLightPresetId || 'torch', x, y);
      const newId = addLight(newLight);
      setSelectedLightId(newId);
      return;
    }

    // Barrier Drawing Tools Start & Chain
    const isBarrierTool =
      activeTool === 'wall' ||
      activeTool === 'door' ||
      activeTool === 'secret_door' ||
      activeTool === 'window';
    if (isBarrierTool && isMasterView && e.evt.button === 0) {
      const pos = getStageRelativePos();
      const snap = findWallSnapPoint(pos.x, pos.y, walls, gridCellSize, isGridVisible, 15, Boolean(e.evt.altKey));
      const currentPt = { x: snap.x, y: snap.y };

      if (!drawingWall) {
        setDrawingWall({
          p1: currentPt,
          p2: currentPt,
        });
      } else {
        const dist = Math.hypot(currentPt.x - drawingWall.p1.x, currentPt.y - drawingWall.p1.y);
        if (dist >= 10) {
          const wallType: WallType =
            activeTool === 'door'
              ? 'door'
              : activeTool === 'secret_door'
              ? 'secret_door'
              : activeTool === 'window'
              ? 'window'
              : 'wall';
          const isDoor = wallType === 'door' || wallType === 'secret_door';
          addWall({
            p1: drawingWall.p1,
            p2: currentPt,
            wallType,
            doorState: isDoor ? 'closed' : undefined,
            blocksMovement: isWallBlockingMovement({ wallType, doorState: 'closed' } as any),
            blocksVision: isWallBlockingVision({ wallType, doorState: 'closed' } as any),
            isDoor,
            isOpen: false,
          });
          setDrawingWall({
            p1: currentPt,
            p2: currentPt,
          });
        }
      }
      return;
    }

    // Fog of War Tool Start
    if (activeTool === 'fog' && isMasterView && e.evt.button === 0) {
      const pos = getStageRelativePos();
      isFogDrawing.current = true;
      const initialStroke: FogShape = {
        id: crypto.randomUUID(),
        type: fogShapeType,
        mode: fogToolMode,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        width: 0,
        height: 0,
        points: [Math.round(pos.x), Math.round(pos.y)],
        strokeWidth: fogBrushSize,
      };
      currentFogStrokeRef.current = initialStroke;
      setCurrentFogStroke(initialStroke);
      return;
    }

    // Freehand Drawing / Eraser Stroke Click start
    if ((activeTool === 'draw' || activeTool === 'eraser') && isMasterView && e.evt.button === 0) {
      const pos = getStageRelativePos();
      isDrawing.current = true;
      const strokeWidth = activeTool === 'eraser' ? Math.max(16, currentBrushWidth * 2) : currentBrushWidth;
      const tool = activeTool === 'eraser'
        ? 'eraser'
        : currentBrushWidth >= 24
        ? 'marker'
        : currentBrushWidth >= 12
        ? 'brush'
        : 'pen';

      const newLine: DrawingLine = {
        id: crypto.randomUUID(),
        points: [Math.round(pos.x), Math.round(pos.y)],
        color: activeTool === 'eraser' ? '#000000' : currentBrushColor,
        strokeWidth,
        tool,
      };
      addDrawingLine(newLine);
      return;
    }

    const isShift = e.evt.shiftKey;
    const isRulerTool = activeTool === 'ruler';

    if (isShift || isRulerTool) {
      const rawPos = getStageRelativePos();
      const cellSize = gridCellSize > 0 ? gridCellSize : 50;
      const isAlt = e.evt.altKey;
      const snappedPos = isAlt
        ? { x: Math.round(rawPos.x), y: Math.round(rawPos.y), isCorner: false }
        : snapRulerPoint(rawPos.x, rawPos.y, cellSize);

      setIsMeasuring(true);
      setRulerStart(snappedPos);
      setRulerCurrent(snappedPos);

      const metrics = calculateRulerMetrics(snappedPos, snappedPos, cellSize);

      if (isMasterView) {
        setRuler({
          active: true,
          startX: snappedPos.x,
          startY: snappedPos.y,
          currentX: snappedPos.x,
          currentY: snappedPos.y,
          distanceFeet: metrics.feet,
          distanceCells: metrics.cells,
        });
      }
      return;
    }
  };

  // Mouse Move handler: tracks pointer, freehand drawing, wall preview, and snapped ruler
  const handleMouseMove = (e?: any) => {
    const pos = getStageRelativePos();
    setPointerPos(pos);

    // Fog of War Drawing / Rect Drag
    if (isFogDrawing.current && activeTool === 'fog' && isMasterView) {
      const roundedX = Math.round(pos.x);
      const roundedY = Math.round(pos.y);
      const prev = currentFogStrokeRef.current;
      if (prev) {
        let updated: FogShape;
        if (prev.type === 'brush') {
          const len = prev.points?.length || 0;
          if (len < 2 || prev.points![len - 2] !== roundedX || prev.points![len - 1] !== roundedY) {
            updated = {
              ...prev,
              points: (prev.points || []).concat([roundedX, roundedY]),
            };
          } else {
            return;
          }
        } else {
          updated = {
            ...prev,
            width: roundedX - (prev.x ?? 0),
            height: roundedY - (prev.y ?? 0),
          };
        }
        currentFogStrokeRef.current = updated;
        setCurrentFogStroke(updated);
      }
      return;
    }

    // Barrier Drawing Drag preview & Snapping Indicator
    const isBarrierTool =
      activeTool === 'wall' ||
      activeTool === 'door' ||
      activeTool === 'secret_door' ||
      activeTool === 'window';
    if (isBarrierTool && isMasterView) {
      const snap = findWallSnapPoint(pos.x, pos.y, walls, gridCellSize, isGridVisible, 15, Boolean(e?.evt?.altKey));
      setSnapIndicator(snap.isSnapped ? { x: snap.x, y: snap.y } : null);
      if (drawingWall) {
        setDrawingWall((prev) => (prev ? { ...prev, p2: { x: snap.x, y: snap.y } } : null));
        return;
      }
    } else if (snapIndicator) {
      setSnapIndicator(null);
    }

    // Freehand Drawing / Eraser Drag
    if (isDrawing.current && (activeTool === 'draw' || activeTool === 'eraser') && isMasterView) {
      const state = useMapStore.getState();
      const lines = state.drawingLines;
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        const roundedX = Math.round(pos.x);
        const roundedY = Math.round(pos.y);
        const len = lastLine.points.length;
        if (len < 2 || lastLine.points[len - 2] !== roundedX || lastLine.points[len - 1] !== roundedY) {
          updateCurrentDrawingLine(lastLine.points.concat([roundedX, roundedY]));
        }
      }
      return;
    }

    if (isMeasuring && rulerStart) {
      const cellSize = gridCellSize > 0 ? gridCellSize : 50;
      const isAlt = Boolean(e?.evt?.altKey);
      const snappedPos = isAlt
        ? { x: Math.round(pos.x), y: Math.round(pos.y), isCorner: false }
        : snapRulerPoint(pos.x, pos.y, cellSize);

      setRulerCurrent(snappedPos);

      if (isMasterView) {
        const metrics = calculateRulerMetrics(rulerStart, snappedPos, cellSize);

        setRuler({
          active: true,
          startX: rulerStart.x,
          startY: rulerStart.y,
          currentX: snappedPos.x,
          currentY: snappedPos.y,
          distanceFeet: metrics.feet,
          distanceCells: metrics.cells,
        });
      }
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    if (isMousePanning.current) {
      isMousePanning.current = false;
    }
    if (isFogDrawing.current && isMasterView) {
      commitCurrentFogStroke();
    }
    if (drawingWall && isMasterView) {
      const dx = drawingWall.p2.x - drawingWall.p1.x;
      const dy = drawingWall.p2.y - drawingWall.p1.y;
      if (Math.hypot(dx, dy) >= 15) {
        const wallType: WallType =
          activeTool === 'door'
            ? 'door'
            : activeTool === 'secret_door'
            ? 'secret_door'
            : activeTool === 'window'
            ? 'window'
            : 'wall';
        const isDoor = wallType === 'door' || wallType === 'secret_door';
        addWall({
          p1: drawingWall.p1,
          p2: drawingWall.p2,
          wallType,
          doorState: isDoor ? 'closed' : undefined,
          blocksMovement: isWallBlockingMovement({ wallType, doorState: 'closed' } as any),
          blocksVision: isWallBlockingVision({ wallType, doorState: 'closed' } as any),
          isDoor,
          isOpen: false,
        });
        setDrawingWall({ p1: drawingWall.p2, p2: drawingWall.p2 });
      }
    }
    if (isDrawing.current) {
      isDrawing.current = false;
      broadcastMapState();
    }
    if (isMeasuring) {
      setIsMeasuring(false);
      if (activeTool !== 'ruler') {
        setRulerStart(null);
        setRulerCurrent(null);
        if (isMasterView) {
          setRuler(null);
        }
      }
    }
  };

  // Distance calculations for ruler (D&D 5-10-5 diagonal rules & inclusive cell span)
  const rulerMetrics = useMemo(() => {
    if (!rulerStart || !rulerCurrent) return null;
    const cellSize = gridCellSize > 0 ? gridCellSize : 50;
    return calculateRulerMetrics(rulerStart, rulerCurrent, cellSize);
  }, [rulerStart, rulerCurrent, gridCellSize]);

  // Target detection in AoE templates
  const aoeTargetMap = useMemo(() => {
    const result: Record<string, string[]> = {};
    const cellSize = gridCellSize > 0 ? gridCellSize : 50;

    for (const template of aoeTemplates) {
      const radiusPx = (template.sizeFeet / 5) * cellSize;
      const targetsInZone: string[] = [];
      const rotRad = ((template.rotation || 0) * Math.PI) / 180;
      const rotDeg = (template.rotation || 0) % 360;

      for (const c of combatants) {
        const tx = c.tokenX ?? 100;
        const ty = c.tokenY ?? 100;
        const dx = tx - template.x;
        const dy = ty - template.y;
        const dist = Math.hypot(dx, dy);

        // Account for token scale and radius
        const scaleMod = getTokenScale(c);
        const tokenRadius = (cellSize / 2) * scaleMod;

        if (template.shape === 'circle') {
          if (dist <= radiusPx + tokenRadius * 0.4) {
            targetsInZone.push(c.id);
          }
        } else if (template.shape === 'cube') {
          // Rotate point into cube local space
          const localX = dx * Math.cos(-rotRad) - dy * Math.sin(-rotRad);
          const localY = dx * Math.sin(-rotRad) + dy * Math.cos(-rotRad);
          const half = radiusPx / 2;
          if (Math.abs(localX) <= half + tokenRadius * 0.4 && Math.abs(localY) <= half + tokenRadius * 0.4) {
            targetsInZone.push(c.id);
          }
        } else if (template.shape === 'line') {
          // Line originates from caster (0, 0) extending along rotRad with width cellSize
          const localX = dx * Math.cos(-rotRad) - dy * Math.sin(-rotRad);
          const localY = dx * Math.sin(-rotRad) + dy * Math.cos(-rotRad);
          if (
            localX >= -tokenRadius * 0.4 &&
            localX <= radiusPx + tokenRadius * 0.4 &&
            Math.abs(localY) <= cellSize / 2 + tokenRadius * 0.4
          ) {
            targetsInZone.push(c.id);
          }
        } else if (template.shape === 'cone') {
          // 53.13 degree cone from origin
          if (dist <= radiusPx + tokenRadius * 0.4) {
            const angleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
            let diff = Math.abs(angleDeg - ((rotDeg + 360) % 360));
            if (diff > 180) diff = 360 - diff;
            const tokenAngleSlack = (tokenRadius / Math.max(dist, 1)) * (180 / Math.PI) * 0.4;
            if (diff <= 26.565 + tokenAngleSlack) {
              targetsInZone.push(c.id);
            }
          }
        }
      }
      result[template.id] = targetsInZone;
    }
    return result;
  }, [aoeTemplates, combatants, gridCellSize]);

  // Fit to viewport handler
  const handleFit = () => {
    fitToViewport(containerSize.width, containerSize.height);
  };

  // Generate grid lines
  const gridLines = useMemo(() => {
    if (!isGridVisible) return [];
    const lines = [];
    const width = Math.max(containerSize.width * 2, imageWidth || 1600);
    const height = Math.max(containerSize.height * 2, imageHeight || 1200);
    const size = gridCellSize > 0 ? gridCellSize : 50;
    const strokeColor = isWhiteBackground ? '#334155' : 'rgba(197, 160, 89, 0.18)';
    const strokeW = isWhiteBackground ? 1.5 : 1;

    if (gridType === 'hex-pointy') {
      const R = size / 1.732;
      const W = size;
      const vertSpacing = 1.5 * R;
      const maxRows = Math.ceil(height / vertSpacing) + 1;
      const maxCols = Math.ceil(width / W) + 1;

      for (let r = 0; r <= maxRows; r++) {
        const colOffset = r % 2 !== 0 ? W / 2 : 0;
        for (let c = 0; c <= maxCols; c++) {
          const cx = c * W + colOffset;
          const cy = r * vertSpacing;
          const pts = getHexPoints(cx, cy, R, true);
          lines.push(
            <KonvaLine
              key={`hex-p-${r}-${c}`}
              points={pts}
              closed={true}
              stroke={strokeColor}
              strokeWidth={strokeW}
              listening={false}
            />
          );
        }
      }
    } else if (gridType === 'hex-flat') {
      const R = size / 1.732;
      const H = size;
      const horizSpacing = 1.5 * R;
      const maxCols = Math.ceil(width / horizSpacing) + 1;
      const maxRows = Math.ceil(height / H) + 1;

      for (let c = 0; c <= maxCols; c++) {
        const rowOffset = c % 2 !== 0 ? H / 2 : 0;
        for (let r = 0; r <= maxRows; r++) {
          const cx = c * horizSpacing;
          const cy = r * H + rowOffset;
          const pts = getHexPoints(cx, cy, R, false);
          lines.push(
            <KonvaLine
              key={`hex-f-${c}-${r}`}
              points={pts}
              closed={true}
              stroke={strokeColor}
              strokeWidth={strokeW}
              listening={false}
            />
          );
        }
      }
    } else {
      // Standard Square Grid
      for (let x = 0; x <= width; x += size) {
        lines.push(
          <KonvaLine
            key={`v-${x}`}
            points={[x, 0, x, height]}
            stroke={strokeColor}
            strokeWidth={strokeW}
            listening={false}
          />
        );
      }
      for (let y = 0; y <= height; y += size) {
        lines.push(
          <KonvaLine
            key={`h-${y}`}
            points={[0, y, width, y]}
            stroke={strokeColor}
            strokeWidth={strokeW}
            listening={false}
          />
        );
      }
    }

    return lines;
  }, [isGridVisible, containerSize, imageWidth, imageHeight, gridCellSize, isWhiteBackground, gridType]);

  return (
    <div className={clsx("flex flex-col w-full h-full overflow-hidden select-none relative", isWhiteBackground ? "bg-[#f8fafc]" : "bg-canvas")}>
      {/* Scene Director Bar (Master Only) */}
      {isMasterView && <SceneDirectorBar />}

      {/* Top Map Toolbar */}
      <MapToolbar onFitToViewport={handleFit} isMasterView={isMasterView} />

      {/* Main Canvas Container */}
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 w-full h-full overflow-hidden relative ${
          isTargetingMode
            ? 'cursor-crosshair'
            : pendingAoe
            ? 'cursor-cell'
            : activeTool === 'draw'
            ? 'cursor-crosshair'
            : activeTool === 'eraser'
            ? 'cursor-cell'
            : activeTool === 'pin' || activeTool === 'light'
            ? 'cursor-pointer'
            : activeTool === 'wall' || activeTool === 'door' || activeTool === 'secret_door' || activeTool === 'window' || activeTool === 'fog'
            ? 'cursor-crosshair'
            : !isMasterView || activeTool === 'pan' || isSpaceDown
            ? 'cursor-grab active:cursor-grabbing'
            : 'cursor-default'
        }`}
      >
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          scaleX={scale}
          scaleY={scale}
          x={panX}
          y={panY}
          draggable={!isMasterView || activeTool === 'pan' || isSpaceDown}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDblClick={() => {
            if (drawingWall) {
              setDrawingWall(null);
              setSnapIndicator(null);
            }
          }}
          onContextMenu={(e) => {
            e.evt.preventDefault();
            if (drawingWall) {
              setDrawingWall(null);
              setSnapIndicator(null);
            }
            if (pendingAoe) {
              setPendingAoe(null);
              setActiveTool('select');
            }
            if (isTargetingMode) {
              cancelTargetingMode();
            }
          }}
          onClick={(e) => {
            if (e.target === stageRef.current) {
              if (selectedAoeId) {
                setSelectedAoeId(null);
              }
              if (inspectedCombatantId) {
                setInspectedCombatantId(null);
              }
              if (selectedPinId) {
                setSelectedPinId(null);
              }
              if (selectedWallId) {
                setSelectedWallId(null);
              }
              if (selectedMapTokenId) {
                setSelectedMapTokenId(null);
              }
              if (selectedLightId) {
                setSelectedLightId(null);
              }
            }
          }}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) {
              setPan(e.target.x(), e.target.y());
            }
          }}
        >
          {/* Layer 1: Background and Grid */}
          <Layer>
            {/* Background image, animated video map, or default tactical surface */}
            {isVideoMap && videoRef.current ? (
              <KonvaImage
                image={videoRef.current}
                width={imageWidth || 1920}
                height={imageHeight || 1080}
                listening={false}
              />
            ) : bgImage ? (
              <KonvaImage
                image={bgImage}
                width={imageWidth}
                height={imageHeight}
                listening={false}
              />
            ) : (
              <KonvaRect
                x={0}
                y={0}
                width={Math.max(containerSize.width * 2, 2000)}
                height={Math.max(containerSize.height * 2, 1600)}
                fill={isWhiteBackground ? '#FFFFFF' : '#141722'}
                listening={false}
              />
            )}

            {/* Tactical Grid */}
            {gridLines}
          </Layer>

          {/* Layer 1.4: Barriers, Walls, Doors, Secret Doors, Windows */}
          <Layer>
            {walls.map((wall) => {
              const isSelected = isMasterView && selectedWallId === wall.id;
              const rawType = getWallType(wall);
              const doorState = getDoorState(wall);
              // For player display (!isMasterView), if secret_door is closed/locked, it looks like a regular wall!
              const effectiveType = !isMasterView && rawType === 'secret_door' && doorState !== 'open'
                ? 'wall'
                : rawType;

              const dx = wall.p2.x - wall.p1.x;
              const dy = wall.p2.y - wall.p1.y;
              const len = Math.hypot(dx, dy) || 1;
              const midX = (wall.p1.x + wall.p2.x) / 2;
              const midY = (wall.p1.y + wall.p2.y) / 2;
              const nx = -dy / len;
              const ny = dx / len;
              const angleRad = Math.atan2(dy, dx);
              const angleDeg = (angleRad * 180) / Math.PI;

              const isDoorLike = effectiveType === 'door' || effectiveType === 'secret_door';

              return (
                <KonvaGroup
                  key={wall.id}
                  onClick={(e) => {
                    if (!isMasterView) return;
                    e.cancelBubble = true;
                    if (isDoorLike) {
                      if (e.evt.shiftKey) {
                        toggleLockDoor(wall.id);
                      } else {
                        toggleDoor(wall.id);
                      }
                    } else {
                      setSelectedWallId(wall.id);
                    }
                  }}
                  onTap={(e) => {
                    if (!isMasterView) return;
                    e.cancelBubble = true;
                    if (isDoorLike) {
                      toggleDoor(wall.id);
                    } else {
                      setSelectedWallId(wall.id);
                    }
                  }}
                >
                  {/* Selection glow */}
                  {isSelected && (
                    <KonvaLine
                      points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                      stroke="#F5B920"
                      strokeWidth={12}
                      opacity={0.4}
                      lineCap="round"
                    />
                  )}

                  {/* 1. Solid Wall */}
                  {effectiveType === 'wall' && (
                    <>
                      {/* Dark outer outline */}
                      <KonvaLine
                        points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                        stroke="#0F172A"
                        strokeWidth={8}
                        lineCap="round"
                        hitStrokeWidth={18}
                      />
                      {/* Dense stone/slate core */}
                      <KonvaLine
                        points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                        stroke="#64748B"
                        strokeWidth={5}
                        lineCap="round"
                      />
                    </>
                  )}

                  {/* 2. Window */}
                  {effectiveType === 'window' && (
                    <>
                      {/* Glass core */}
                      <KonvaLine
                        points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                        stroke="#38BDF8"
                        strokeWidth={4}
                        opacity={0.8}
                        lineCap="round"
                        hitStrokeWidth={16}
                      />
                      {/* Center mullion crossbar */}
                      <KonvaLine
                        points={[midX - nx * 7, midY - ny * 7, midX + nx * 7, midY + ny * 7]}
                        stroke="#BAE6FD"
                        strokeWidth={2}
                      />
                      {/* Additional crossbars if long */}
                      {len >= 55 && (
                        <>
                          <KonvaLine
                            points={[
                              wall.p1.x + dx * 0.33 - nx * 6,
                              wall.p1.y + dy * 0.33 - ny * 6,
                              wall.p1.x + dx * 0.33 + nx * 6,
                              wall.p1.y + dy * 0.33 + ny * 6,
                            ]}
                            stroke="#BAE6FD"
                            strokeWidth={2}
                          />
                          <KonvaLine
                            points={[
                              wall.p1.x + dx * 0.67 - nx * 6,
                              wall.p1.y + dy * 0.67 - ny * 6,
                              wall.p1.x + dx * 0.67 + nx * 6,
                              wall.p1.y + dy * 0.67 + ny * 6,
                            ]}
                            stroke="#BAE6FD"
                            strokeWidth={2}
                          />
                        </>
                      )}
                    </>
                  )}

                  {/* 3. Regular Door */}
                  {effectiveType === 'door' && (
                    <>
                      {doorState === 'open' ? (
                        <>
                          {/* Passable opening line */}
                          <KonvaLine
                            points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                            stroke="#10B981"
                            strokeWidth={3}
                            dash={[6, 4]}
                            lineCap="round"
                            hitStrokeWidth={18}
                          />
                          {/* Swung door leaf line */}
                          <KonvaLine
                            points={[
                              wall.p1.x,
                              wall.p1.y,
                              wall.p1.x + Math.cos(angleRad - Math.PI / 3) * Math.min(len * 0.7, 28),
                              wall.p1.y + Math.sin(angleRad - Math.PI / 3) * Math.min(len * 0.7, 28),
                            ]}
                            stroke="#10B981"
                            strokeWidth={4}
                            lineCap="round"
                          />
                          {/* Center indicator */}
                          <KonvaCircle
                            x={midX}
                            y={midY}
                            radius={6}
                            fill="#064E3B"
                            stroke="#10B981"
                            strokeWidth={1.5}
                          />
                          <KonvaCircle
                            x={midX}
                            y={midY}
                            radius={2}
                            fill="#34D399"
                          />
                        </>
                      ) : doorState === 'locked' ? (
                        <>
                          {/* Crimson locked segment */}
                          <KonvaLine
                            points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                            stroke="#EF4444"
                            strokeWidth={5}
                            lineCap="round"
                            hitStrokeWidth={18}
                          />
                          {/* Locked door badge */}
                          <KonvaGroup x={midX} y={midY} rotation={angleDeg}>
                            <KonvaRect
                              x={-12}
                              y={-6}
                              width={24}
                              height={12}
                              fill="#7F1D1D"
                              stroke="#EF4444"
                              strokeWidth={1.5}
                              cornerRadius={2}
                            />
                            {/* Geometric lock icon */}
                            <KonvaRect
                              x={-4}
                              y={-2}
                              width={8}
                              height={6}
                              fill="#FCA5A5"
                              cornerRadius={1}
                            />
                            <KonvaLine
                              points={[-2.5, -2, -2.5, -4.5, 2.5, -4.5, 2.5, -2]}
                              stroke="#FCA5A5"
                              strokeWidth={1.5}
                            />
                          </KonvaGroup>
                        </>
                      ) : (
                        <>
                          {/* Amber wooden closed segment */}
                          <KonvaLine
                            points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                            stroke="#B45309"
                            strokeWidth={5}
                            lineCap="round"
                            hitStrokeWidth={18}
                          />
                          {/* Wooden plate with handle */}
                          <KonvaGroup x={midX} y={midY} rotation={angleDeg}>
                            <KonvaRect
                              x={-12}
                              y={-5}
                              width={24}
                              height={10}
                              fill="#78350F"
                              stroke="#D97706"
                              strokeWidth={1.5}
                              cornerRadius={2}
                            />
                            <KonvaCircle
                              x={3}
                              y={0}
                              radius={2}
                              fill="#FCD34D"
                              stroke="#78350F"
                              strokeWidth={0.5}
                            />
                          </KonvaGroup>
                        </>
                      )}
                    </>
                  )}

                  {/* 4. Secret Door (Master View) */}
                  {effectiveType === 'secret_door' && (
                    <>
                      {/* Purple dashed segment */}
                      <KonvaLine
                        points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                        stroke="#A855F7"
                        strokeWidth={5}
                        dash={[6, 4]}
                        lineCap="round"
                        hitStrokeWidth={18}
                      />
                      {doorState === 'open' && (
                        <KonvaLine
                          points={[
                            wall.p1.x,
                            wall.p1.y,
                            wall.p1.x + Math.cos(angleRad - Math.PI / 3) * Math.min(len * 0.7, 28),
                            wall.p1.y + Math.sin(angleRad - Math.PI / 3) * Math.min(len * 0.7, 28),
                          ]}
                          stroke="#C084FC"
                          strokeWidth={4}
                          lineCap="round"
                        />
                      )}
                      {/* Badge with clean letter S */}
                      <KonvaGroup x={midX} y={midY}>
                        <KonvaCircle
                          radius={10}
                          fill="#581C87"
                          stroke="#C084FC"
                          strokeWidth={1.5}
                        />
                        <KonvaText
                          text="S"
                          fontSize={11}
                          fontStyle="bold"
                          fill="#F3E8FF"
                          x={-4}
                          y={-6}
                          listening={false}
                        />
                      </KonvaGroup>
                    </>
                  )}

                  {/* 5. Ethereal Barrier */}
                  {effectiveType === 'ethereal' && (
                    <KonvaLine
                      points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                      stroke="#818CF8"
                      strokeWidth={4}
                      dash={[4, 6]}
                      opacity={0.65}
                      lineCap="round"
                      hitStrokeWidth={16}
                    />
                  )}
                </KonvaGroup>
              );
            })}

            {/* Barrier preview line during drag or continuous chaining */}
            {drawingWall && (
              <KonvaGroup>
                <KonvaLine
                  points={[drawingWall.p1.x, drawingWall.p1.y, drawingWall.p2.x, drawingWall.p2.y]}
                  stroke={
                    activeTool === 'door'
                      ? '#F59E0B'
                      : activeTool === 'secret_door'
                      ? '#A855F7'
                      : activeTool === 'window'
                      ? '#38BDF8'
                      : '#60A5FA'
                  }
                  strokeWidth={4}
                  dash={[6, 4]}
                  lineCap="round"
                />
                <KonvaCircle
                  x={drawingWall.p1.x}
                  y={drawingWall.p1.y}
                  radius={4}
                  fill="#F59E0B"
                />
                <KonvaCircle
                  x={drawingWall.p2.x}
                  y={drawingWall.p2.y}
                  radius={4}
                  fill="#38BDF8"
                />
              </KonvaGroup>
            )}

            {/* Node snapping indicator ring */}
            {snapIndicator && isMasterView && (
              <KonvaCircle
                x={snapIndicator.x}
                y={snapIndicator.y}
                radius={7}
                stroke="#F59E0B"
                strokeWidth={2}
                dash={[3, 2]}
                listening={false}
              />
            )}
          </Layer>

          {/* Layer 1.7: Interactive Map Pins */}
          <Layer>
            {pins
              .filter((pin) => isMasterView || !pin.isSecret)
              .map((pin) => {
                const isSelected = isMasterView && selectedPinId === pin.id;
                return (
                  <KonvaGroup
                    key={pin.id}
                    x={pin.x}
                    y={pin.y}
                    draggable={isMasterView && activeTool === 'select'}
                    onDragEnd={(e) => {
                      updatePin(pin.id, {
                        x: Math.round(e.target.x()),
                        y: Math.round(e.target.y()),
                      });
                    }}
                    onClick={(e) => {
                      if (!isMasterView) return;
                      e.cancelBubble = true;
                      setSelectedPinId(pin.id);
                    }}
                    onTap={(e) => {
                      if (!isMasterView) return;
                      e.cancelBubble = true;
                      setSelectedPinId(pin.id);
                    }}
                  >
                    {isSelected && (
                      <KonvaCircle
                        radius={22}
                        fill="rgba(245, 185, 32, 0.25)"
                        stroke="#F5B920"
                        strokeWidth={1.5}
                      />
                    )}
                    <KonvaCircle
                      radius={14}
                      fill={pin.color || (pin.isSecret ? '#F59E0B' : '#3B82F6')}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      shadowColor="#000000"
                      shadowBlur={6}
                      shadowOpacity={0.6}
                    />
                    <KonvaText
                      text={pin.isSecret ? 'S' : 'P'}
                      fontSize={11}
                      fontStyle="bold"
                      fill="#FFFFFF"
                      x={-4}
                      y={-6}
                      listening={false}
                    />
                    <KonvaGroup y={-26}>
                      <KonvaRect
                        x={-55}
                        y={-8}
                        width={110}
                        height={18}
                        fill="rgba(15, 23, 42, 0.9)"
                        stroke={isSelected ? '#F5B920' : 'rgba(255, 255, 255, 0.15)'}
                        strokeWidth={1}
                        cornerRadius={4}
                        listening={false}
                      />
                      <KonvaText
                        text={pin.title || 'Заметка'}
                        fontSize={10}
                        fontFamily="sans-serif"
                        fontStyle="bold"
                        fill="#F8FAFC"
                        align="center"
                        width={110}
                        x={-55}
                        y={-4}
                        listening={false}
                      />
                    </KonvaGroup>
                  </KonvaGroup>
                );
              })}
          </Layer>

          {/* Layer 2: AoE Spell Templates */}
          <Layer>
            {aoeTemplates.map((template) => {
              const isSelected = isMasterView && selectedAoeId === template.id;
              const radiusPx = (template.sizeFeet / 5) * gridCellSize;
              const cellSize = gridCellSize > 0 ? gridCellSize : 50;
              const rot = template.rotation || 0;
              const color = template.color || '#EF4444';
              const targets = aoeTargetMap[template.id] || [];
              const label = template.label || `${template.sizeFeet} фт.`;

              return (
                <KonvaGroup
                  key={template.id}
                  x={template.x}
                  y={template.y}
                  draggable={isMasterView}
                  onClick={(e) => {
                    if (!isMasterView) return;
                    e.cancelBubble = true;
                    setSelectedAoeId(template.id);
                  }}
                  onTap={(e) => {
                    if (!isMasterView) return;
                    e.cancelBubble = true;
                    setSelectedAoeId(template.id);
                  }}
                  onWheel={(e) => {
                    if (!isMasterView) return;
                    e.evt.preventDefault();
                    e.evt.stopPropagation();
                    const delta = e.evt.deltaY > 0 ? 15 : -15;
                    updateAoeTemplate(template.id, {
                      rotation: ((template.rotation || 0) + delta + 360) % 360,
                    });
                  }}
                  onDragEnd={(e) => {
                    const snapCell = cellSize / 2;
                    const snappedX = Math.round(e.target.x() / snapCell) * snapCell;
                    const snappedY = Math.round(e.target.y() / snapCell) * snapCell;
                    e.target.position({ x: snappedX, y: snappedY });
                    updateAoeTemplate(template.id, {
                      x: snappedX,
                      y: snappedY,
                    });
                  }}
                >
                  {/* Circle AoE: Circle with radius = (sizeFeet / 5) * cellSize, semi-transparent fill (opacity: 0.3), stroke (strokeWidth: 2, dash: [6, 4]) */}
                  {template.shape === 'circle' && (
                    <KonvaCircle
                      radius={radiusPx}
                      fill={color}
                      opacity={0.3}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      dash={[6, 4]}
                    />
                  )}

                  {/* Cone AoE: Konva Wedge creating a 53-degree angle cone (standard 5e cone rules: length = width at base) */}
                  {template.shape === 'cone' && (
                    <KonvaWedge
                      radius={radiusPx}
                      angle={53.13}
                      rotation={rot - 53.13 / 2}
                      fill={color}
                      opacity={0.3}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      dash={[6, 4]}
                    />
                  )}

                  {/* Line AoE: Rect with width (lengthFeet / 5) * cellSize and height cellSize (5 ft) */}
                  {template.shape === 'line' && (
                    <KonvaRect
                      x={0}
                      y={-cellSize / 2}
                      width={radiusPx}
                      height={cellSize}
                      rotation={rot}
                      fill={color}
                      opacity={0.3}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      dash={[6, 4]}
                    />
                  )}

                  {/* Cube AoE: Rect with width and height (sizeFeet / 5) * cellSize */}
                  {template.shape === 'cube' && (
                    <KonvaRect
                      x={-radiusPx / 2}
                      y={-radiusPx / 2}
                      width={radiusPx}
                      height={radiusPx}
                      rotation={rot}
                      fill={color}
                      opacity={0.3}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      dash={[6, 4]}
                    />
                  )}

                  {/* Center Dot Indicator */}
                  <KonvaCircle
                    radius={isSelected ? 7 : 5}
                    fill="#C5A059"
                    stroke="#000"
                    strokeWidth={1}
                  />

                  {/* Label / Targets Badge */}
                  <KonvaGroup y={-24}>
                    <KonvaRect
                      x={-70}
                      y={-10}
                      width={140}
                      height={20}
                      fill="#0F172A"
                      opacity={0.88}
                      cornerRadius={4}
                      stroke={isSelected ? '#F59E0B' : '#334155'}
                      strokeWidth={1}
                      listening={false}
                    />
                    <KonvaText
                      text={`${label} (${targets.length} ${pluralizeRussian(targets.length, 'цель', 'цели', 'целей')})`}
                      fontSize={10}
                      fontFamily="sans-serif"
                      fontStyle="bold"
                      fill="#F8FAFC"
                      align="center"
                      width={140}
                      x={-70}
                      y={-5}
                      listening={false}
                    />
                  </KonvaGroup>

                  {/* When selected, show small delete [X] and rotate [R] controls */}
                  {isSelected && (
                    <KonvaGroup y={-48}>
                      {/* Rotate Button [R] */}
                      <KonvaGroup
                        x={-22}
                        y={0}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          updateAoeTemplate(template.id, {
                            rotation: ((template.rotation || 0) + 45) % 360,
                          });
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true;
                          updateAoeTemplate(template.id, {
                            rotation: ((template.rotation || 0) + 45) % 360,
                          });
                        }}
                      >
                        <KonvaCircle
                          radius={12}
                          fill="#1E293B"
                          stroke="#F59E0B"
                          strokeWidth={1.5}
                          shadowColor="#000"
                          shadowBlur={4}
                          shadowOpacity={0.6}
                        />
                        <KonvaText
                          text="R"
                          fontSize={13}
                          fontFamily="sans-serif"
                          fontStyle="bold"
                          fill="#F59E0B"
                          offsetX={5}
                          offsetY={7}
                          listening={false}
                        />
                      </KonvaGroup>

                      {/* Delete Button [X] */}
                      <KonvaGroup
                        x={22}
                        y={0}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          removeAoeTemplate(template.id);
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true;
                          removeAoeTemplate(template.id);
                        }}
                      >
                        <KonvaCircle
                          radius={12}
                          fill="#7F1D1D"
                          stroke="#EF4444"
                          strokeWidth={1.5}
                          shadowColor="#000"
                          shadowBlur={4}
                          shadowOpacity={0.6}
                        />
                        <KonvaText
                          text="X"
                          fontSize={12}
                          fontFamily="sans-serif"
                          fontStyle="bold"
                          fill="#FFFFFF"
                          offsetX={4}
                          offsetY={6}
                          listening={false}
                        />
                      </KonvaGroup>
                    </KonvaGroup>
                  )}
                </KonvaGroup>
              );
            })}
          </Layer>

          {/* Layer 2.5: Sticky AoE Ghost Preview attached to cursor */}
          {pendingAoe && pointerPos && isMasterView && (
            <Layer listening={false}>
              {(() => {
                const radiusPx = (pendingAoe.sizeFeet / 5) * gridCellSize;
                const rot = pendingAoe.rotation || 0;
                const shape = (pendingAoe.shape || (pendingAoe.type === 'sphere' ? 'circle' : pendingAoe.type) || 'circle') as AoeShape;
                const color = pendingAoe.color || '#EF4444';
                return (
                  <KonvaGroup x={pointerPos.x} y={pointerPos.y} opacity={0.65}>
                    {shape === 'circle' && (
                      <KonvaCircle
                        radius={radiusPx}
                        fill={color}
                        stroke={color}
                        strokeWidth={2}
                        dash={[6, 4]}
                      />
                    )}
                    {shape === 'cube' && (
                      <KonvaRect
                        x={-radiusPx / 2}
                        y={-radiusPx / 2}
                        width={radiusPx}
                        height={radiusPx}
                        rotation={rot}
                        fill={color}
                        stroke={color}
                        strokeWidth={2}
                        dash={[6, 4]}
                      />
                    )}
                    {shape === 'cone' && (
                      <KonvaWedge
                        radius={radiusPx}
                        angle={53.13}
                        rotation={rot - 53.13 / 2}
                        fill={color}
                        stroke={color}
                        strokeWidth={2}
                        dash={[6, 4]}
                      />
                    )}
                    {shape === 'line' && (
                      <KonvaRect
                        x={0}
                        y={-gridCellSize / 2}
                        width={radiusPx}
                        height={gridCellSize}
                        rotation={rot}
                        fill={color}
                        stroke={color}
                        strokeWidth={2}
                        dash={[6, 4]}
                      />
                    )}
                    <KonvaCircle radius={6} fill="#C5A059" stroke="#000" strokeWidth={1} />
                    <KonvaText
                      text={`${pendingAoe.label || `${pendingAoe.sizeFeet} фт.`} [ЛКМ: Установить | Колёсико: Поворот | ПКМ/Esc: Отмена]`}
                      fontSize={11}
                      fontFamily="sans-serif"
                      fontStyle="bold"
                      fill="#FFFFFF"
                      x={-150}
                      y={-26}
                    />
                  </KonvaGroup>
                );
              })()}
            </Layer>
          )}

          {/* Layer: Freehand Drawings & Paint Engine */}
          <Layer>
            {drawingLines.map((line) => {
              const pts =
                line.points.length === 2
                  ? [line.points[0], line.points[1], line.points[0] + 0.5, line.points[1] + 0.5]
                  : line.points;

              return (
                <KonvaLine
                  key={line.id}
                  points={pts}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  opacity={line.tool === 'marker' ? 0.6 : 1.0}
                  globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                  listening={false}
                />
              );
            })}
          </Layer>

          {/* Layer 3: Combatant and Standalone Map Tokens */}
          <Layer>
            {/* Standalone Map Tokens */}
            {mapTokens.map((token) => (
              <StandaloneTokenNode
                key={token.id}
                token={token}
                gridCellSize={gridCellSize}
                gridType={gridType}
                walls={walls}
                isMasterView={isMasterView}
                activeTool={activeTool}
                isSelected={token.id === selectedMapTokenId}
                onInspect={() => {
                  setSelectedMapTokenId(token.id);
                  setInspectedCombatantId(null);
                }}
                onPositionChange={(snappedX, snappedY) => {
                  updateMapToken(token.id, { x: snappedX, y: snappedY });
                }}
                onHover={() => {}}
              />
            ))}

            {/* Combatant Tokens */}
            {combatants.map((c) => {
              const isTarget = c.id === currentTargetId;

              return (
                <CombatantTokenNode
                  key={c.id}
                  c={c}
                  gridCellSize={gridCellSize}
                  gridType={gridType}
                  walls={walls}
                  isMasterView={isMasterView}
                  activeTool={activeTool}
                  isTarget={isTarget}
                  isSelected={c.id === inspectedCombatantId}
                  isActiveTurn={c.id === activeCombatantId}
                  onInspect={() => {
                    if (isTargetingMode && pendingAttackerId && pendingAttackAction) {
                      executeTargetedStrike(pendingAttackerId, c.id, pendingAttackAction);
                      return;
                    }
                    setInspectedCombatantId(c.id);
                    setSelectedMapTokenId(null);
                  }}
                  onAttack={() => openTargetedAttack(c.id)}
                  onTarget={() => toggleCurrentTargetId(c.id)}
                  onPositionChange={(snappedX, snappedY) => {
                    updateCombatantPosition(c.id, snappedX, snappedY);
                    syncTokenAttachedLights(c.id, snappedX, snappedY);
                  }}
                  onHover={(combatant, pos) => {
                    if (!isMasterView) return;
                    if (combatant && pos) {
                      setHoveredInfo({ combatant, screenX: pos.x, screenY: pos.y });
                    } else {
                      setHoveredInfo(null);
                    }
                  }}
                />
              );
            })}
          </Layer>

          {/* Layer 3.4: Dynamic Lighting & Vision Layer */}
          {(isLightingEnabled || ambientDarkness > 0) && (
            <>
              {/* Base Darkness Mask with Destination-Out Cutouts */}
              <Layer opacity={isMasterView ? Math.min(ambientDarkness, 0.6) : ambientDarkness} listening={false}>
                {/* Dark Ambient Shroud */}
                <KonvaRect
                  x={-5000}
                  y={-5000}
                  width={Math.max(15000, (imageWidth || 2000) + 10000)}
                  height={Math.max(15000, (imageHeight || 2000) + 10000)}
                  fill="#05070B"
                  listening={false}
                />

                {/* Light Sources Cutouts */}
                {lightPolygons.map(({ light, origin, dimRadiusPx, brightRadiusPx, poly }) => (
                  <KonvaShape
                    key={`light-mask-${light.id}`}
                    globalCompositeOperation="destination-out"
                    sceneFunc={(ctx) => {
                      if (!poly || poly.length < 3) return;
                      const nativeCtx = ctx._context;
                      nativeCtx.beginPath();
                      nativeCtx.moveTo(poly[0].x, poly[0].y);
                      for (let i = 1; i < poly.length; i++) {
                        nativeCtx.lineTo(poly[i].x, poly[i].y);
                      }
                      nativeCtx.closePath();

                      const grad = nativeCtx.createRadialGradient(
                        origin.x, origin.y, 0,
                        origin.x, origin.y, dimRadiusPx
                      );
                      const brightRatio = Math.max(0.05, Math.min(0.95, brightRadiusPx / dimRadiusPx));
                      grad.addColorStop(0, `rgba(0, 0, 0, ${light.intensity})`);
                      grad.addColorStop(brightRatio, `rgba(0, 0, 0, ${light.intensity * 0.95})`);
                      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

                      nativeCtx.fillStyle = grad;
                      nativeCtx.fill();
                    }}
                    listening={false}
                  />
                ))}

                {/* Token Vision / Darkvision Cutouts */}
                {visionPolygons.map(({ tokenId, origin, radiusPx, poly }) => (
                  <KonvaShape
                    key={`vision-mask-${tokenId}`}
                    globalCompositeOperation="destination-out"
                    sceneFunc={(ctx) => {
                      if (!poly || poly.length < 3) return;
                      const nativeCtx = ctx._context;
                      nativeCtx.beginPath();
                      nativeCtx.moveTo(poly[0].x, poly[0].y);
                      for (let i = 1; i < poly.length; i++) {
                        nativeCtx.lineTo(poly[i].x, poly[i].y);
                      }
                      nativeCtx.closePath();

                      const grad = nativeCtx.createRadialGradient(
                        origin.x, origin.y, 0,
                        origin.x, origin.y, radiusPx
                      );
                      grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
                      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.5)');
                      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

                      nativeCtx.fillStyle = grad;
                      nativeCtx.fill();
                    }}
                    listening={false}
                  />
                ))}
              </Layer>

              {/* Warm Color Illumination Glow Layer */}
              <Layer opacity={isMasterView ? 0.65 : 0.85} listening={false}>
                {lightPolygons.map(({ light, origin, dimRadiusPx, brightRadiusPx, poly }) => (
                  <KonvaShape
                    key={`light-glow-${light.id}`}
                    sceneFunc={(ctx) => {
                      if (!poly || poly.length < 3) return;
                      const nativeCtx = ctx._context;
                      nativeCtx.beginPath();
                      nativeCtx.moveTo(poly[0].x, poly[0].y);
                      for (let i = 1; i < poly.length; i++) {
                        nativeCtx.lineTo(poly[i].x, poly[i].y);
                      }
                      nativeCtx.closePath();

                      const grad = nativeCtx.createRadialGradient(
                        origin.x, origin.y, 0,
                        origin.x, origin.y, dimRadiusPx
                      );
                      const brightRatio = Math.max(0.05, Math.min(0.95, brightRadiusPx / dimRadiusPx));
                      grad.addColorStop(0, hexToRgba(light.color, 0.35 * light.intensity));
                      grad.addColorStop(brightRatio, hexToRgba(light.color, 0.18 * light.intensity));
                      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

                      nativeCtx.fillStyle = grad;
                      nativeCtx.fill();
                    }}
                    listening={false}
                  />
                ))}
              </Layer>
            </>
          )}

          {/* Master Light Gizmos / Interactive Handles Layer */}
          {isMasterView && lights.length > 0 && (
            <Layer>
              {lights.map((light) => {
                const isSelected = selectedLightId === light.id;
                const dimRadiusPx = feetToPixels(light.dimRadiusFeet, gridCellSize);
                const brightRadiusPx = feetToPixels(light.brightRadiusFeet, gridCellSize);

                return (
                  <KonvaGroup
                    key={`light-gizmo-${light.id}`}
                    x={light.x}
                    y={light.y}
                    draggable={activeTool === 'select'}
                    onDragEnd={(e) => {
                      updateLight(light.id, {
                        x: Math.round(e.target.x()),
                        y: Math.round(e.target.y()),
                      });
                    }}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setSelectedLightId(light.id);
                    }}
                  >
                    {/* If selected: show dashed boundary rings */}
                    {isSelected && (
                      <>
                        <KonvaCircle
                          radius={brightRadiusPx}
                          stroke="#F59E0B"
                          strokeWidth={1.5}
                          dash={[6, 4]}
                          listening={false}
                        />
                        <KonvaCircle
                          radius={dimRadiusPx}
                          stroke="#D97706"
                          strokeWidth={1}
                          dash={[8, 6]}
                          opacity={0.65}
                          listening={false}
                        />
                      </>
                    )}

                    {/* Halo ring */}
                    <KonvaCircle
                      radius={isSelected ? 16 : 12}
                      fill={light.color}
                      opacity={light.enabled ? 0.35 : 0.1}
                    />

                    {/* Center light icon body */}
                    <KonvaCircle
                      radius={isSelected ? 10 : 8}
                      fill={light.enabled ? light.color : '#6B7280'}
                      stroke={isSelected ? '#FFFFFF' : '#1E293B'}
                      strokeWidth={isSelected ? 2 : 1.5}
                      shadowColor="#000000"
                      shadowBlur={4}
                      shadowOpacity={0.6}
                    />

                    {/* Indicator dot if attached to token */}
                    {light.attachedTokenId && (
                      <KonvaCircle
                        x={6}
                        y={-6}
                        radius={3}
                        fill="#10B981"
                        stroke="#064E3B"
                        strokeWidth={1}
                      />
                    )}
                  </KonvaGroup>
                );
              })}
            </Layer>
          )}

          {/* Light Reticle Cursor when placing light */}
          {isMasterView && activeTool === 'light' && pointerPos && (
            <Layer listening={false}>
              <KonvaCircle
                x={pointerPos.x}
                y={pointerPos.y}
                radius={feetToPixels(DND_LIGHT_PRESETS.find((p) => p.id === activeLightPresetId)?.brightRadiusFeet || 20, gridCellSize)}
                stroke="#F59E0B"
                strokeWidth={1.5}
                dash={[6, 4]}
                opacity={0.6}
                listening={false}
              />
              <KonvaCircle
                x={pointerPos.x}
                y={pointerPos.y}
                radius={feetToPixels(DND_LIGHT_PRESETS.find((p) => p.id === activeLightPresetId)?.dimRadiusFeet || 40, gridCellSize)}
                stroke="#D97706"
                strokeWidth={1}
                dash={[8, 6]}
                opacity={0.4}
                listening={false}
              />
              <KonvaCircle
                x={pointerPos.x}
                y={pointerPos.y}
                radius={10}
                fill="#FFA726"
                opacity={0.7}
                listening={false}
              />
            </Layer>
          )}

          {/* Layer 3.5: Fog of War Layer */}
          {isFogEnabled && (
            <Layer opacity={isMasterView ? 0.55 : 1.0} listening={false}>
              {/* Base dark shroud covering the map canvas and surroundings */}
              <KonvaRect
                x={-5000}
                y={-5000}
                width={Math.max(15000, (imageWidth || 2000) + 10000)}
                height={Math.max(15000, (imageHeight || 2000) + 10000)}
                fill="#05070B"
                listening={false}
              />

              {/* Fog Shapes: reveal holes or conceal patches */}
              {fogShapes.map((shape) => {
                const isReveal = shape.mode === 'reveal';
                const compOp = isReveal ? 'destination-out' : 'source-over';

                if (shape.type === 'brush' && shape.points && shape.points.length >= 2) {
                  const pts =
                    shape.points.length === 2
                      ? [shape.points[0], shape.points[1], shape.points[0] + 0.5, shape.points[1] + 0.5]
                      : shape.points;
                  return (
                    <KonvaLine
                      key={shape.id}
                      points={pts}
                      stroke={isReveal ? '#000000' : '#05070B'}
                      strokeWidth={shape.strokeWidth || 40}
                      tension={0.4}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation={compOp}
                      listening={false}
                    />
                  );
                }

                if (shape.type === 'rect') {
                  return (
                    <KonvaRect
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      fill={isReveal ? '#000000' : '#05070B'}
                      globalCompositeOperation={compOp}
                      listening={false}
                    />
                  );
                }

                return null;
              })}

              {/* Live drawing preview of currently active fog stroke (Master view only) */}
              {isMasterView && currentFogStroke && (
                <>
                  {currentFogStroke.type === 'brush' && currentFogStroke.points && currentFogStroke.points.length >= 2 && (
                    <KonvaLine
                      points={
                        currentFogStroke.points.length === 2
                          ? [currentFogStroke.points[0], currentFogStroke.points[1], currentFogStroke.points[0] + 0.5, currentFogStroke.points[1] + 0.5]
                          : currentFogStroke.points
                      }
                      stroke={currentFogStroke.mode === 'reveal' ? '#000000' : '#05070B'}
                      strokeWidth={currentFogStroke.strokeWidth || fogBrushSize}
                      tension={0.4}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation={currentFogStroke.mode === 'reveal' ? 'destination-out' : 'source-over'}
                      listening={false}
                    />
                  )}
                  {currentFogStroke.type === 'rect' && (
                    <KonvaRect
                      x={currentFogStroke.width && currentFogStroke.width < 0 ? (currentFogStroke.x ?? 0) + currentFogStroke.width : (currentFogStroke.x ?? 0)}
                      y={currentFogStroke.height && currentFogStroke.height < 0 ? (currentFogStroke.y ?? 0) + currentFogStroke.height : (currentFogStroke.y ?? 0)}
                      width={Math.abs(currentFogStroke.width || 0)}
                      height={Math.abs(currentFogStroke.height || 0)}
                      fill={currentFogStroke.mode === 'reveal' ? '#000000' : '#05070B'}
                      globalCompositeOperation={currentFogStroke.mode === 'reveal' ? 'destination-out' : 'source-over'}
                      listening={false}
                    />
                  )}
                </>
              )}
            </Layer>
          )}

          {/* Layer 3.6: Fog Cursor Reticle / Brush Indicator */}
          {isMasterView && activeTool === 'fog' && pointerPos && (
            <Layer listening={false}>
              {fogShapeType === 'brush' ? (
                <KonvaCircle
                  x={pointerPos.x}
                  y={pointerPos.y}
                  radius={fogBrushSize / 2}
                  stroke={fogToolMode === 'reveal' ? '#38BDF8' : '#A855F7'}
                  strokeWidth={2}
                  dash={[6, 4]}
                  fill={fogToolMode === 'reveal' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)'}
                  listening={false}
                />
              ) : (
                <KonvaRect
                  x={pointerPos.x - 16}
                  y={pointerPos.y - 16}
                  width={32}
                  height={32}
                  stroke={fogToolMode === 'reveal' ? '#38BDF8' : '#A855F7'}
                  strokeWidth={2}
                  dash={[4, 4]}
                  fill={fogToolMode === 'reveal' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)'}
                  listening={false}
                />
              )}
            </Layer>
          )}

          {/* Layer 4: Dynamic Distance Ruler (Master & Synced Player View) */}
          {(() => {
            const cellSize = gridCellSize > 0 ? gridCellSize : 50;
            const displayRuler = (isMasterView && rulerStart && rulerCurrent && rulerMetrics)
              ? {
                  startX: rulerStart.x,
                  startY: rulerStart.y,
                  currentX: rulerCurrent.x,
                  currentY: rulerCurrent.y,
                  midX: rulerMetrics.midX,
                  midY: rulerMetrics.midY,
                  feet: rulerMetrics.feet,
                  cells: rulerMetrics.cells,
                  isCornerToCorner: rulerMetrics.isCornerToCorner,
                }
              : (storeRuler && storeRuler.active)
              ? {
                  startX: storeRuler.startX,
                  startY: storeRuler.startY,
                  currentX: storeRuler.currentX,
                  currentY: storeRuler.currentY,
                  midX: (storeRuler.startX + storeRuler.currentX) / 2,
                  midY: (storeRuler.startY + storeRuler.currentY) / 2,
                  feet: storeRuler.distanceFeet,
                  cells: storeRuler.distanceCells,
                  isCornerToCorner: Math.abs(storeRuler.startX % cellSize) < 1 && Math.abs(storeRuler.currentX % cellSize) < 1,
                }
              : null;

            if (!displayRuler) return null;

            const badgeText = `${displayRuler.feet} фт. (${displayRuler.cells} кл.)`;
            const badgeWidth = Math.max(140, Math.round(badgeText.length * 8.5) + 24);
            const badgeHeight = 26;

            const coveredCells = getCoveredCells(
              displayRuler.startX,
              displayRuler.startY,
              displayRuler.currentX,
              displayRuler.currentY,
              cellSize,
              Boolean(displayRuler.isCornerToCorner)
            );

            return (
              <Layer>
                {/* Highlighted Covered Grid Cells */}
                {coveredCells.map(({ col, row }) => (
                  <KonvaRect
                    key={`ruler-cell-${col}-${row}`}
                    x={col * cellSize}
                    y={row * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill="rgba(197, 160, 89, 0.12)"
                    stroke="rgba(197, 160, 89, 0.45)"
                    strokeWidth={1}
                    dash={[4, 2]}
                    listening={false}
                  />
                ))}

                {/* Ruler Line */}
                <KonvaLine
                  points={[displayRuler.startX, displayRuler.startY, displayRuler.currentX, displayRuler.currentY]}
                  stroke="#C5A059"
                  strokeWidth={3}
                  dash={[6, 4]}
                />

                {/* Start & End Marker Circles */}
                <KonvaCircle
                  x={displayRuler.startX}
                  y={displayRuler.startY}
                  radius={5}
                  fill="#C5A059"
                  stroke="#000"
                  strokeWidth={1}
                />
                <KonvaCircle
                  x={displayRuler.currentX}
                  y={displayRuler.currentY}
                  radius={5}
                  fill="#C5A059"
                  stroke="#000"
                  strokeWidth={1}
                />

                {/* Distance Floating Badge with dynamic width */}
                <KonvaGroup x={displayRuler.midX - badgeWidth / 2} y={displayRuler.midY - 32}>
                  <KonvaRect
                    width={badgeWidth}
                    height={badgeHeight}
                    fill="#12141A"
                    stroke="#C5A059"
                    strokeWidth={1.5}
                    cornerRadius={4}
                    shadowColor="#000000"
                    shadowBlur={8}
                    shadowOpacity={0.8}
                  />
                  <KonvaText
                    text={badgeText}
                    fontSize={12}
                    fontFamily="monospace"
                    fontStyle="bold"
                    fill="#F3F4F6"
                    width={badgeWidth}
                    align="center"
                    y={6}
                  />
                </KonvaGroup>
              </Layer>
            );
          })()}
        </Stage>

        {/* Weather Atmospheric Particle Overlay */}
        <WeatherOverlay
          weather={weatherEffect}
          width={containerSize.width}
          height={containerSize.height}
          isMaster={isMasterView}
        />

        {/* Token Quick Context Actions (DM view only, when a token is selected) */}
        {isMasterView && selectedCombatant && (
          <TokenQuickActions
            combatant={selectedCombatant}
            scale={scale}
            panX={panX}
            panY={panY}
            gridCellSize={gridCellSize}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            onClose={() => setInspectedCombatantId(null)}
          />
        )}

        {isMasterView && selectedStandaloneToken && (
          <TokenQuickActions
            standaloneToken={selectedStandaloneToken}
            scale={scale}
            panX={panX}
            panY={panY}
            gridCellSize={gridCellSize}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            onClose={() => setSelectedMapTokenId(null)}
          />
        )}

        {/* Master View: Compact Token Hover Tooltip */}
        {isMasterView && hoveredInfo && (
          <div
            className="absolute pointer-events-none z-30 bg-surface-overlay/95 border border-border-default rounded-md px-3 py-1.5 shadow-2xl text-xs backdrop-blur-sm"
            style={{
              left: Math.min(hoveredInfo.screenX + 14, containerSize.width - 170),
              top: Math.max(10, Math.min(hoveredInfo.screenY - 14, containerSize.height - 80)),
            }}
          >
            <div className="font-semibold text-text-primary text-[12px] truncate max-w-[180px]">
              {cleanRussianText(hoveredInfo.combatant.nameRu || hoveredInfo.combatant.name || 'Существо')}
            </div>
            <div className="flex items-center gap-3 text-text-secondary text-[11px] mt-0.5 font-mono">
              <span>
                КД: <strong className="text-gold">{hoveredInfo.combatant.ac}</strong>
              </span>
              <span>
                ХП:{' '}
                <strong
                  className={
                    hoveredInfo.combatant.hp > (hoveredInfo.combatant.maxHp / 2)
                      ? 'text-emerald-400'
                      : hoveredInfo.combatant.hp > (hoveredInfo.combatant.maxHp * 0.2)
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }
                >
                  {hoveredInfo.combatant.hp}/{hoveredInfo.combatant.maxHp}
                </strong>
              </span>
              {hoveredInfo.combatant.tempHp ? (
                <span className="text-cyan-400">+{hoveredInfo.combatant.tempHp} вр. ХП</span>
              ) : null}
            </div>
          </div>
        )}

        {/* Active Targeting Mode Banner */}
        {isTargetingMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-red-950/90 border border-red-500/50 rounded-lg px-4 py-1.5 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-pulse">
            <span className="text-red-400 font-bold text-xs flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-red-400 animate-spin" />
              <span>ВЫБОР ЦЕЛИ:</span>
            </span>
            <span className="text-gray-200 text-xs font-medium">
              Кликните по токену или строке в трекере для нанесения удара
            </span>
            <button
              onClick={() => cancelTargetingMode()}
              className="text-[10px] bg-red-900/60 hover:bg-red-800 border border-red-500/40 text-red-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
            >
              Отмена (Esc)
            </button>
          </div>
        )}

        {/* Drag & Drop Overlay Indicator */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-50 bg-gold/15 border-2 border-dashed border-gold rounded-xl pointer-events-none flex items-center justify-center backdrop-blur-[2px] transition-all">
            <div className="bg-surface/95 border border-gold px-6 py-3.5 rounded-glass-xl text-gold-light font-bold text-sm shadow-2xl flex items-center gap-3">
              <Upload className="h-5 w-5 animate-bounce text-gold" />
              <span>Перетащите карту или токен на игровое поле</span>
            </div>
          </div>
        )}

        {/* Drag & Drop Action Choice Modal */}
        {dragDropTarget && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
            <div className="bg-surface/95 border border-gold/60 rounded-glass-xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto border border-gold/40">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-100">Импорт ассета</h3>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {dragDropTarget.file.name}
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleUseAsMap(dragDropTarget.file)}
                  className="w-full py-2.5 px-3 rounded-glass-lg bg-gold hover:bg-gold-light text-surface font-bold text-xs flex items-center justify-center gap-2 shadow-gold-glow transition-all"
                >
                  <MapIcon className="h-4 w-4" />
                  <span>Установить как карту поля боя</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateToken(dragDropTarget.file, dragDropTarget.dropX, dragDropTarget.dropY)}
                  className="w-full py-2.5 px-3 rounded-glass-lg bg-surface-subtle hover:bg-surface-overlay text-gray-100 border border-glass-border font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Users className="h-4 w-4" />
                  <span>Создать токен участника боя</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateStandaloneToken(dragDropTarget.file, dragDropTarget.dropX, dragDropTarget.dropY)}
                  className="w-full py-2.5 px-3 rounded-glass-lg bg-surface-subtle hover:bg-surface-overlay text-gray-100 border border-glass-border font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <MapPinIcon className="h-4 w-4" />
                  <span>Создать независимый токен карты</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDragDropTarget(null)}
                  className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Pin Inspector Modal */}
        {isMasterView && selectedPin && (
          <div
            className="absolute z-40 bg-surface/95 border border-gold/50 rounded-glass-xl p-4 shadow-glass-panel backdrop-blur-xl w-80 text-xs animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: Math.min(Math.max(16, selectedPin.x * scale + panX + 20), containerSize.width - 340),
              top: Math.min(Math.max(16, selectedPin.y * scale + panY - 60), containerSize.height - 320),
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5 font-bold text-gold text-sm">
                <MapPinIcon className="h-4 w-4" />
                <span>Булавка мастера</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPinId(null)}
                className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">
                  Название / Комната
                </label>
                <input
                  type="text"
                  value={selectedPin.title}
                  onChange={(e) => updatePin(selectedPin.id, { title: e.target.value })}
                  placeholder="Например: Зал сокровищ (Комната 4)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-subtle border border-glass-border text-gray-100 focus:border-gold outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">
                  Описание, ловушки и добыча
                </label>
                <textarea
                  rows={4}
                  value={selectedPin.description}
                  onChange={(e) => updatePin(selectedPin.id, { description: e.target.value })}
                  placeholder="Секреты, СЛ проверки, сокровища, скрытые двери..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-subtle border border-glass-border text-gray-100 focus:border-gold outline-none resize-none text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedPin.isSecret}
                    onChange={(e) => updatePin(selectedPin.id, { isSecret: e.target.checked })}
                    className="rounded text-gold focus:ring-0 bg-surface-subtle border-glass-border"
                  />
                  <span className="text-gray-300 font-medium">Скрыто от экрана игроков</span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <button
                  type="button"
                  onClick={() => removePin(selectedPin.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Удалить</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPinId(null)}
                  className="bg-gold/20 text-gold-light border border-gold/40 hover:bg-gold/30 px-3 py-1 rounded-lg font-semibold transition-colors"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Barrier Inspector */}
        {isMasterView && selectedWall && (
          <div
            className="absolute z-40 bg-[#121720]/95 border border-gold/60 rounded-xl p-2 shadow-2xl backdrop-blur-xl text-xs flex flex-wrap items-center gap-2 animate-in fade-in"
            style={{
              left: Math.min(Math.max(16, ((selectedWall.p1.x + selectedWall.p2.x) / 2) * scale + panX), containerSize.width - 340),
              top: Math.min(Math.max(16, ((selectedWall.p1.y + selectedWall.p2.y) / 2) * scale + panY - 55), containerSize.height - 90),
            }}
          >
            {/* Barrier type selector buttons */}
            <div className="flex items-center gap-0.5 bg-surface/80 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => updateWall(selectedWall.id, { wallType: 'wall' })}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  getWallType(selectedWall) === 'wall'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Стена"
              >
                <ToyBrick className="h-3 w-3" />
                <span>Стена</span>
              </button>

              <button
                type="button"
                onClick={() => updateWall(selectedWall.id, { wallType: 'door' })}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  getWallType(selectedWall) === 'door'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Дверь"
              >
                <DoorClosed className="h-3 w-3" />
                <span>Дверь</span>
              </button>

              <button
                type="button"
                onClick={() => updateWall(selectedWall.id, { wallType: 'secret_door' })}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  getWallType(selectedWall) === 'secret_door'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Тайная дверь"
              >
                <EyeOff className="h-3 w-3" />
                <span>Тайная</span>
              </button>

              <button
                type="button"
                onClick={() => updateWall(selectedWall.id, { wallType: 'window' })}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  getWallType(selectedWall) === 'window'
                    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Окно"
              >
                <AppWindow className="h-3 w-3" />
                <span>Окно</span>
              </button>
            </div>

            {/* If Door or Secret Door: show Open/Close/Lock controls */}
            {(getWallType(selectedWall) === 'door' || getWallType(selectedWall) === 'secret_door') && (
              <div className="flex items-center gap-0.5 bg-surface/80 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setDoorState(selectedWall.id, 'open')}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                    getDoorState(selectedWall) === 'open'
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Открыть"
                >
                  <DoorOpen className="h-3 w-3" />
                  <span>Открыта</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDoorState(selectedWall.id, 'closed')}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                    getDoorState(selectedWall) === 'closed'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Закрыть"
                >
                  <DoorClosed className="h-3 w-3" />
                  <span>Закрыта</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDoorState(selectedWall.id, 'locked')}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                    getDoorState(selectedWall) === 'locked'
                      ? 'bg-red-600/30 text-red-300 border border-red-500/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Запереть"
                >
                  <Lock className="h-3 w-3" />
                  <span>Заперта</span>
                </button>
              </div>
            )}

            {/* Delete button */}
            <button
              type="button"
              onClick={() => removeWall(selectedWall.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/15 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors border border-transparent hover:border-red-500/30"
              title="Удалить барьер"
            >
              <Trash2 className="h-3 w-3" />
              <span>Удалить</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedWallId(null)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              title="Закрыть"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Selected Light Inspector */}
        {isMasterView && selectedLight && (
          <div
            className="absolute z-40 bg-[#121720]/95 border border-gold/70 rounded-xl p-3 shadow-2xl backdrop-blur-xl text-xs space-y-2.5 animate-in fade-in ring-1 ring-gold/30 w-72"
            style={{
              left: Math.min(Math.max(16, selectedLight.x * scale + panX - 144), containerSize.width - 300),
              top: Math.min(Math.max(16, selectedLight.y * scale + panY + 25), containerSize.height - 240),
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5 text-gold-light font-bold font-serif">
                <Flame className="h-4 w-4 text-gold" />
                <span>Светильник</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLightId(null)}
                className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Presets quick select */}
            <div className="flex flex-wrap gap-1">
              {DND_LIGHT_PRESETS.map((preset) => {
                const isCurrent =
                  selectedLight.brightRadiusFeet === preset.brightRadiusFeet &&
                  selectedLight.dimRadiusFeet === preset.dimRadiusFeet &&
                  selectedLight.color === preset.color;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      updateLight(selectedLight.id, {
                        brightRadiusFeet: preset.brightRadiusFeet,
                        dimRadiusFeet: preset.dimRadiusFeet,
                        color: preset.color,
                        intensity: preset.intensity,
                        flicker: preset.flicker,
                      })
                    }
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-gold/25 text-gold-light border border-gold/60'
                        : 'bg-surface-subtle text-gray-300 hover:text-white border border-transparent'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>

            {/* Metrics: Bright & Dim radius */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-surface/80 p-1.5 rounded border border-white/5">
                <span className="text-gray-400 block text-[9px] uppercase">Яркий свет</span>
                <span className="font-bold text-amber-300">{selectedLight.brightRadiusFeet} фт.</span>
              </div>
              <div className="bg-surface/80 p-1.5 rounded border border-white/5">
                <span className="text-gray-400 block text-[9px] uppercase">Тусклый свет</span>
                <span className="font-bold text-amber-400/80">{selectedLight.dimRadiusFeet} фт.</span>
              </div>
            </div>

            {/* Toggles: Enabled & Flicker */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLight.enabled}
                  onChange={(e) => updateLight(selectedLight.id, { enabled: e.target.checked })}
                  className="rounded text-gold focus:ring-0 bg-surface-subtle border-glass-border"
                />
                <span className="text-gray-300">Включен</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLight.flicker}
                  onChange={(e) => updateLight(selectedLight.id, { flicker: e.target.checked })}
                  className="rounded text-gold focus:ring-0 bg-surface-subtle border-glass-border"
                />
                <span className="text-gray-300">Мерцание</span>
              </label>
            </div>

            {/* Attached token status */}
            {selectedLight.attachedTokenId ? (
              <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded text-[11px] text-emerald-300">
                <div className="flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  <span>Привязан к токену</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateLight(selectedLight.id, { attachedTokenId: null })}
                  className="text-gray-400 hover:text-red-300 transition-colors"
                  title="Отвязать"
                >
                  <UnlinkIcon className="h-3 w-3" />
                </button>
              </div>
            ) : null}

            {/* Actions: Delete and Done */}
            <div className="pt-2 flex items-center justify-between border-t border-white/10">
              <button
                type="button"
                onClick={() => removeLight(selectedLight.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span>Удалить</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLightId(null)}
                className="bg-gold/20 text-gold-light border border-gold/40 hover:bg-gold/30 px-3 py-1 rounded font-semibold transition-colors"
              >
                Готово
              </button>
            </div>
          </div>
        )}

        {/* Floating Hint Overlay */}
        <div className="absolute bottom-3 left-3 bg-surface/90 border border-border-subtle rounded px-2.5 py-1 text-[11px] text-gray-400 font-mono pointer-events-none flex items-center gap-3">
          <span>
            Колёсико: <strong className="text-gray-200">Масштаб</strong>
          </span>
          <span>
            Shift: <strong className="text-gray-200">Линейка</strong>
          </span>
          <span>
            ПКМ / 'T': <strong className="text-gold">Выбрать цель</strong>
          </span>
          <span>
            Клик: <strong className="text-gold">Инфо / Атака</strong>
          </span>
          <span>
            Колёсико на AoE: <strong className="text-purple-300">Поворот</strong>
          </span>
          <span>
            D / E: <strong className="text-gold">Рисование / Ластик</strong>
          </span>
          <span>
            Ctrl+Z: <strong className="text-gray-200">Отмена</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
