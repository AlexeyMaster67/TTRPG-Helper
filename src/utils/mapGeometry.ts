import { Wall } from '../types/map';

export function findWallSnapPoint(
  rawX: number,
  rawY: number,
  walls: Wall[],
  gridCellSize: number,
  isGridVisible: boolean,
  snapRadius = 15,
  isAlt = false
): { x: number; y: number; isSnapped: boolean } {
  if (isAlt) {
    return { x: Math.round(rawX), y: Math.round(rawY), isSnapped: false };
  }

  let closestVertex: { x: number; y: number } | null = null;
  let minDistance = snapRadius;

  for (const wall of walls) {
    const d1 = Math.hypot(rawX - wall.p1.x, rawY - wall.p1.y);
    if (d1 < minDistance) {
      minDistance = d1;
      closestVertex = wall.p1;
    }
    const d2 = Math.hypot(rawX - wall.p2.x, rawY - wall.p2.y);
    if (d2 < minDistance) {
      minDistance = d2;
      closestVertex = wall.p2;
    }
  }

  if (closestVertex) {
    return { x: closestVertex.x, y: closestVertex.y, isSnapped: true };
  }

  if (isGridVisible && gridCellSize > 0) {
    const nearestGridX = Math.round(rawX / gridCellSize) * gridCellSize;
    const nearestGridY = Math.round(rawY / gridCellSize) * gridCellSize;
    const distGrid = Math.hypot(rawX - nearestGridX, rawY - nearestGridY);
    if (distGrid <= snapRadius) {
      return { x: nearestGridX, y: nearestGridY, isSnapped: true };
    }
  }

  return { x: Math.round(rawX), y: Math.round(rawY), isSnapped: false };
}

export function checkLineIntersection(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const ccw = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  };
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

export function snapToHexPointy(x: number, y: number, cellSize: number): { x: number; y: number } {
  const R = cellSize / 1.732;
  const W = cellSize;
  const vertSpacing = 1.5 * R;
  const row = Math.round(y / vertSpacing);
  const colOffset = row % 2 !== 0 ? W / 2 : 0;
  const col = Math.round((x - colOffset) / W);
  return {
    x: Math.round(col * W + colOffset),
    y: Math.round(row * vertSpacing),
  };
}

export function snapToHexFlat(x: number, y: number, cellSize: number): { x: number; y: number } {
  const R = cellSize / 1.732;
  const H = cellSize;
  const horizSpacing = 1.5 * R;
  const col = Math.round(x / horizSpacing);
  const rowOffset = col % 2 !== 0 ? H / 2 : 0;
  const row = Math.round((y - rowOffset) / H);
  return {
    x: Math.round(col * horizSpacing),
    y: Math.round(row * H + rowOffset),
  };
}

export function getHexPoints(cx: number, cy: number, radius: number, isPointy: boolean): number[] {
  const points: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = isPointy ? 60 * i - 30 : 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    points.push(cx + radius * Math.cos(angleRad), cy + radius * Math.sin(angleRad));
  }
  return points;
}
