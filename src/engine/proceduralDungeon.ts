import { Wall } from '../types/map';

export type DungeonGeneratorStyle = 'bsp' | 'cellular' | 'caves' | 'mixed' | 'labyrinth';
export type DungeonPaletteId = 'granite' | 'crypt' | 'sandstone' | 'grotto';
export type DungeonTextureId = 'none' | 'stone' | 'grass' | 'water' | 'wood' | 'transparent';

export interface DungeonColorPalette {
  id: DungeonPaletteId;
  name: string;
  nameEn: string;
  wallFill: string;
  wallStroke: string;
  floorBg: string;
  floorTileStroke: string;
  floorDetail: string;
  gridLineColor: string;
  accent: string;
}

export const DUNGEON_PALETTES: Record<DungeonPaletteId, DungeonColorPalette> = {
  granite: {
    id: 'granite',
    name: 'Серый гранит',
    nameEn: 'Gray Granite',
    wallFill: '#161b22',
    wallStroke: '#30363d',
    floorBg: '#21262d',
    floorTileStroke: 'rgba(255, 255, 255, 0.08)',
    floorDetail: 'rgba(200, 215, 230, 0.04)',
    gridLineColor: 'rgba(255, 255, 255, 0.35)',
    accent: '#94a3b8',
  },
  crypt: {
    id: 'crypt',
    name: 'Темный склеп',
    nameEn: 'Dark Crypt',
    wallFill: '#0c0b12',
    wallStroke: '#251b33',
    floorBg: '#181424',
    floorTileStroke: 'rgba(168, 85, 247, 0.12)',
    floorDetail: 'rgba(192, 132, 252, 0.05)',
    gridLineColor: 'rgba(192, 132, 252, 0.38)',
    accent: '#a855f7',
  },
  sandstone: {
    id: 'sandstone',
    name: 'Песчаник',
    nameEn: 'Sandstone',
    wallFill: '#221911',
    wallStroke: '#423020',
    floorBg: '#36281c',
    floorTileStroke: 'rgba(245, 185, 32, 0.12)',
    floorDetail: 'rgba(251, 191, 36, 0.05)',
    gridLineColor: 'rgba(245, 185, 32, 0.38)',
    accent: '#f59e0b',
  },
  grotto: {
    id: 'grotto',
    name: 'Подземный грот',
    nameEn: 'Subterranean Grotto',
    wallFill: '#0b1617',
    wallStroke: '#143638',
    floorBg: '#122627',
    floorTileStroke: 'rgba(20, 184, 166, 0.12)',
    floorDetail: 'rgba(45, 212, 191, 0.05)',
    gridLineColor: 'rgba(45, 212, 191, 0.38)',
    accent: '#14b8a6',
  },
};

export interface ProceduralDungeonOptions {
  style: DungeonGeneratorStyle;
  gridWidth: number;
  gridHeight: number;
  cellSize?: number;
  palette?: DungeonPaletteId;
  texture?: DungeonTextureId;
  roomDensity?: 'low' | 'medium' | 'high';
  corridorWidth?: 1 | 2;
  doorFrequency?: 'none' | 'some' | 'all';
  includeSecretRooms?: boolean;
  initialFillRate?: number;
  smoothIterations?: number;
  seed?: number;
  caveWinding?: number; // 0.1 to 1.0 (how twisting the cave paths are)
}

export interface GeneratedDungeonResult {
  backgroundDataUrl: string;
  width: number;
  height: number;
  gridSize: number;
  walls: Wall[];
  roomCount: number;
  doorCount: number;
}

export interface DungeonRoom {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isSecret?: boolean;
  shape?: 'rect' | 'octagonal' | 'cross' | 'pillared';
}

export interface DoorwayDef {
  edgeType: 'horizontal' | 'vertical';
  x: number;
  y: number;
  isSecret?: boolean;
}

export interface BspSector {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BspSector;
  right?: BspSector;
  room?: DungeonRoom;
}

export function createRng(initialSeed?: number) {
  let s = (initialSeed !== undefined ? initialSeed : Math.floor(Math.random() * 2147483647)) >>> 0;
  if (s === 0) s = 123456789;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function create2DArray<T>(rows: number, cols: number, initialValue: T): T[][] {
  const result: T[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: T[] = new Array(cols).fill(initialValue);
    result.push(row);
  }
  return result;
}

export function checkDungeonConnectivity(grid: number[][]): boolean {
  const h = grid.length;
  if (h === 0) return true;
  const w = grid[0].length;
  if (w === 0) return true;

  let startX = -1;
  let startY = -1;
  let totalWalkable = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] > 0) {
        totalWalkable++;
        if (startX === -1) {
          startX = x;
          startY = y;
        }
      }
    }
  }

  if (totalWalkable === 0) return true;
  if (startX === -1 || startY === -1) return true;

  const visited = create2DArray<boolean>(h, w, false);
  const queue: Array<[number, number]> = [[startX, startY]];
  visited[startY][startX] = true;
  let visitedCount = 0;

  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    visitedCount++;

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        if (grid[ny][nx] > 0 && !visited[ny][nx]) {
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
  }

  return visitedCount === totalWalkable;
}

/**
 * Finds all disconnected components in grid and carves connecting tunnels between them
 * until the whole grid is 100% connected.
 */
function ensureAllComponentsConnected(
  grid: number[][],
  corridorWidth = 1,
  rng: () => number = Math.random
) {
  const h = grid.length;
  const w = grid[0].length;

  const visited = create2DArray<boolean>(h, w, false);
  const components: Array<Array<[number, number]>> = [];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y][x] > 0 && !visited[y][x]) {
        const comp: Array<[number, number]> = [];
        const queue: Array<[number, number]> = [[x, y]];
        visited[y][x] = true;

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          comp.push([cx, cy]);
          const dirs = [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
          ];
          for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 1 && nx < w - 1 && ny >= 1 && ny < h - 1) {
              if (grid[ny][nx] > 0 && !visited[ny][nx]) {
                visited[ny][nx] = true;
                queue.push([nx, ny]);
              }
            }
          }
        }
        if (comp.length > 0) {
          components.push(comp);
        }
      }
    }
  }

  if (components.length <= 1) return;

  // Connect components sequentially to the primary (largest) component
  components.sort((a, b) => b.length - a.length);
  const mainComp = components[0];

  for (let i = 1; i < components.length; i++) {
    const comp = components[i];
    // Find closest pair of cells between mainComp and comp
    let bestDist = Infinity;
    let p1: [number, number] = comp[0];
    let p2: [number, number] = mainComp[0];

    // Sample up to 40 cells to keep performance snappy
    const samplesA = comp.length > 40 ? Array.from({ length: 40 }, () => comp[Math.floor(rng() * comp.length)]) : comp;
    const samplesB = mainComp.length > 40 ? Array.from({ length: 40 }, () => mainComp[Math.floor(rng() * mainComp.length)]) : mainComp;

    for (const [ax, ay] of samplesA) {
      for (const [bx, by] of samplesB) {
        const d = Math.hypot(ax - bx, ay - by);
        if (d < bestDist) {
          bestDist = d;
          p1 = [ax, ay];
          p2 = [bx, by];
        }
      }
    }

    // Carve connecting tunnel from p1 to p2 with natural meandering
    let curX = p1[0];
    let curY = p1[1];
    const targetX = p2[0];
    const targetY = p2[1];

    let steps = 0;
    while ((curX !== targetX || curY !== targetY) && steps < 500) {
      steps++;
      for (let dy = 0; dy < corridorWidth; dy++) {
        for (let dx = 0; dx < corridorWidth; dx++) {
          const cy = curY + dy;
          const cx = curX + dx;
          if (cy >= 1 && cy < h - 1 && cx >= 1 && cx < w - 1) {
            grid[cy][cx] = 2; // corridor
          }
        }
      }

      if (rng() < 0.6) {
        if (curX < targetX) curX++;
        else if (curX > targetX) curX--;
        else if (curY < targetY) curY++;
        else if (curY > targetY) curY--;
      } else {
        if (curY < targetY) curY++;
        else if (curY > targetY) curY--;
        else if (curX < targetX) curX++;
        else if (curX > targetX) curX--;
      }
    }

    // Add connected comp to mainComp
    for (const cell of comp) {
      mainComp.push(cell);
    }
  }
}

/**
 * 1. Enhanced BSP Dungeon Generator with Varied Room Shapes and Tactical Loops
 */
export function generateBspDungeon(
  gridWidth: number,
  gridHeight: number,
  roomDensity: 'low' | 'medium' | 'high' = 'medium',
  corridorWidth: 1 | 2 = 1,
  doorFrequency: 'none' | 'some' | 'all' = 'some',
  includeSecretRooms = true,
  rng: () => number = Math.random
): { grid: number[][]; rooms: DungeonRoom[]; doorways: DoorwayDef[] } {
  const grid = create2DArray<number>(gridHeight, gridWidth, 0);

  let minSectorSize = 7;
  let maxDepth = 4;
  if (roomDensity === 'low') {
    minSectorSize = 10;
    maxDepth = 3;
  } else if (roomDensity === 'high') {
    minSectorSize = 5;
    maxDepth = 5;
  }

  const rootSector: BspSector = {
    x: 1,
    y: 1,
    w: gridWidth - 2,
    h: gridHeight - 2,
  };

  function splitSector(sector: BspSector, depth: number) {
    if (depth >= maxDepth) return;
    if (sector.w < minSectorSize * 2 && sector.h < minSectorSize * 2) return;

    let splitHorizontally = rng() > 0.5;
    if (sector.w > sector.h && sector.w / sector.h >= 1.25) {
      splitHorizontally = false;
    } else if (sector.h > sector.w && sector.h / sector.w >= 1.25) {
      splitHorizontally = true;
    }

    if (splitHorizontally) {
      if (sector.h < minSectorSize * 2) return;
      const splitPos = Math.floor(
        minSectorSize + rng() * (sector.h - minSectorSize * 2 + 1)
      );
      sector.left = {
        x: sector.x,
        y: sector.y,
        w: sector.w,
        h: splitPos,
      };
      sector.right = {
        x: sector.x,
        y: sector.y + splitPos,
        w: sector.w,
        h: sector.h - splitPos,
      };
    } else {
      if (sector.w < minSectorSize * 2) return;
      const splitPos = Math.floor(
        minSectorSize + rng() * (sector.w - minSectorSize * 2 + 1)
      );
      sector.left = {
        x: sector.x,
        y: sector.y,
        w: splitPos,
        h: sector.h,
      };
      sector.right = {
        x: sector.x + splitPos,
        y: sector.y,
        w: sector.w - splitPos,
        h: sector.h,
      };
    }

    splitSector(sector.left, depth + 1);
    splitSector(sector.right, depth + 1);
  }

  splitSector(rootSector, 0);

  const rooms: DungeonRoom[] = [];

  function createRoomsInLeaves(sector: BspSector) {
    if (sector.left && sector.right) {
      createRoomsInLeaves(sector.left);
      createRoomsInLeaves(sector.right);
      return;
    }

    const padding = 1;
    const availW = Math.max(3, sector.w - padding * 2);
    const availH = Math.max(3, sector.h - padding * 2);

    const minRoomDim = 3;
    const roomW = Math.max(
      minRoomDim,
      Math.min(availW, Math.floor(availW * 0.65 + rng() * (availW * 0.35 + 1)))
    );
    const roomH = Math.max(
      minRoomDim,
      Math.min(availH, Math.floor(availH * 0.65 + rng() * (availH * 0.35 + 1)))
    );

    const maxOffsetX = Math.max(0, availW - roomW);
    const maxOffsetY = Math.max(0, availH - roomH);
    const roomX = sector.x + padding + Math.floor(rng() * (maxOffsetX + 1));
    const roomY = sector.y + padding + Math.floor(rng() * (maxOffsetY + 1));

    // Choose tactical shape: rect, octagonal, pillared, cross
    let shape: 'rect' | 'octagonal' | 'cross' | 'pillared' = 'rect';
    const shapeRoll = rng();
    if (roomW >= 6 && roomH >= 6 && shapeRoll > 0.65) {
      shape = 'pillared';
    } else if (roomW >= 5 && roomH >= 5 && shapeRoll > 0.4) {
      shape = 'octagonal';
    }

    const room: DungeonRoom = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'room-' + (rooms.length + 1),
      x: roomX,
      y: roomY,
      w: roomW,
      h: roomH,
      shape,
    };

    sector.room = room;
    rooms.push(room);

    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
          // Octagonal corner chamfering
          if (shape === 'octagonal') {
            const isCorner =
              (x === room.x && y === room.y) ||
              (x === room.x + room.w - 1 && y === room.y) ||
              (x === room.x && y === room.y + room.h - 1) ||
              (x === room.x + room.w - 1 && y === room.y + room.h - 1);
            if (isCorner) continue;
          }

          grid[y][x] = 1;

          // Interior tactical pillars in large pillared halls
          if (shape === 'pillared') {
            const isPillarX = (x === room.x + 2 && room.w >= 7) || (x === room.x + room.w - 3 && room.w >= 7);
            const isPillarY = (y === room.y + 2 && room.h >= 7) || (y === room.y + room.h - 3 && room.h >= 7);
            if (isPillarX && isPillarY) {
              grid[y][x] = 0; // solid stone pillar!
            }
          }
        }
      }
    }
  }

  createRoomsInLeaves(rootSector);

  function carveCorridorSegment(x1: number, y1: number, x2: number, y2: number) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (let x = minX; x <= maxX; x++) {
      for (let w = 0; w < corridorWidth; w++) {
        const cy = y1 + w;
        if (cy >= 1 && cy < gridHeight - 1 && x >= 1 && x < gridWidth - 1) {
          if (grid[cy][x] === 0) {
            grid[cy][x] = 2;
          }
        }
      }
    }

    for (let y = minY; y <= maxY; y++) {
      for (let w = 0; w < corridorWidth; w++) {
        const cx = x2 + w;
        if (y >= 1 && y < gridHeight - 1 && cx >= 1 && cx < gridWidth - 1) {
          if (grid[y][cx] === 0) {
            grid[y][cx] = 2;
          }
        }
      }
    }
  }

  function connectSubtree(sector: BspSector): DungeonRoom[] {
    if (!sector.left || !sector.right) {
      return sector.room ? [sector.room] : [];
    }

    const leftRooms = connectSubtree(sector.left);
    const rightRooms = connectSubtree(sector.right);

    if (leftRooms.length > 0 && rightRooms.length > 0) {
      const roomA = leftRooms[Math.floor(rng() * leftRooms.length)];
      const roomB = rightRooms[Math.floor(rng() * rightRooms.length)];

      const cx1 = Math.floor(roomA.x + roomA.w / 2);
      const cy1 = Math.floor(roomA.y + roomA.h / 2);
      const cx2 = Math.floor(roomB.x + roomB.w / 2);
      const cy2 = Math.floor(roomB.y + roomB.h / 2);

      if (rng() > 0.5) {
        carveCorridorSegment(cx1, cy1, cx2, cy2);
      } else {
        carveCorridorSegment(cx1, cy1, cx1, cy2);
        carveCorridorSegment(cx1, cy2, cx2, cy2);
      }
    }

    return [...leftRooms, ...rightRooms];
  }

  connectSubtree(rootSector);

  // Add 2-3 extra loop corridors between close rooms for non-linear tactical traversal!
  if (rooms.length >= 4) {
    const extraLoops = Math.min(3, Math.floor(rooms.length / 3));
    for (let i = 0; i < extraLoops; i++) {
      const idxA = Math.floor(rng() * rooms.length);
      const idxB = (idxA + 1 + Math.floor(rng() * (rooms.length - 2))) % rooms.length;
      const rA = rooms[idxA];
      const rB = rooms[idxB];
      const dist = Math.hypot(rA.x - rB.x, rA.y - rB.y);
      if (dist < Math.max(gridWidth, gridHeight) * 0.6) {
        carveCorridorSegment(
          Math.floor(rA.x + rA.w / 2),
          Math.floor(rA.y + rA.h / 2),
          Math.floor(rB.x + rB.w / 2),
          Math.floor(rB.y + rB.h / 2)
        );
      }
    }
  }

  // Ensure 100% connectivity
  ensureAllComponentsConnected(grid, corridorWidth, rng);

  if (includeSecretRooms && rooms.length >= 3) {
    const candidateIndex = Math.floor(rng() * rooms.length);
    rooms[candidateIndex].isSecret = true;
  }

  const candidateDoorways: DoorwayDef[] = [];

  for (const r of rooms) {
    // Left boundary: x = r.x
    for (let y = r.y; y < r.y + r.h; y++) {
      if (r.x > 1 && grid[y][r.x - 1] === 2 && grid[y][r.x] === 1) {
        candidateDoorways.push({
          edgeType: 'vertical',
          x: r.x,
          y,
          isSecret: r.isSecret,
        });
      }
    }
    // Right boundary: x = r.x + r.w
    for (let y = r.y; y < r.y + r.h; y++) {
      if (r.x + r.w < gridWidth - 1 && grid[y][r.x + r.w] === 2 && grid[y][r.x + r.w - 1] === 1) {
        candidateDoorways.push({
          edgeType: 'vertical',
          x: r.x + r.w,
          y,
          isSecret: r.isSecret,
        });
      }
    }
    // Top boundary: y = r.y
    for (let x = r.x; x < r.x + r.w; x++) {
      if (r.y > 1 && grid[r.y - 1][x] === 2 && grid[r.y][x] === 1) {
        candidateDoorways.push({
          edgeType: 'horizontal',
          x,
          y: r.y,
          isSecret: r.isSecret,
        });
      }
    }
    // Bottom boundary: y = r.y + r.h
    for (let x = r.x; x < r.x + r.w; x++) {
      if (r.y + r.h < gridHeight - 1 && grid[r.y + r.h][x] === 2 && grid[r.y + r.h - 1][x] === 1) {
        candidateDoorways.push({
          edgeType: 'horizontal',
          x,
          y: r.y + r.h,
          isSecret: r.isSecret,
        });
      }
    }
  }

  const selectedDoorways: DoorwayDef[] = [];
  if (doorFrequency !== 'none') {
    for (const d of candidateDoorways) {
      if (d.isSecret) {
        selectedDoorways.push(d);
      } else if (doorFrequency === 'all') {
        selectedDoorways.push(d);
      } else if (doorFrequency === 'some') {
        if (rng() < 0.65) {
          selectedDoorways.push(d);
        }
      }
    }
    if (selectedDoorways.length === 0 && candidateDoorways.length > 0) {
      selectedDoorways.push(candidateDoorways[0]);
    }
  }

  return { grid, rooms, doorways: selectedDoorways };
}

/**
 * 2. Real Organic Winding Caves Algorithm (Full Canvas Spanning + Worms + Smoothing)
 */
export function generateWindingCaves(
  gridWidth: number,
  gridHeight: number,
  windingFactor = 0.7,
  corridorWidth: 1 | 2 = 2,
  doorFrequency: 'none' | 'some' | 'all' = 'none',
  rng: () => number = Math.random
): { grid: number[][]; doorways: DoorwayDef[] } {
  const grid = create2DArray<number>(gridHeight, gridWidth, 0);

  // Number of worm diggers scaled to canvas size
  const wormCount = Math.max(5, Math.floor((gridWidth + gridHeight) / 10));
  const maxStepsPerWorm = Math.floor(Math.hypot(gridWidth, gridHeight) * 2.2);

  // Define start/target quadrants to ensure full canvas coverage
  const quadrants = [
    { start: [3, 3], target: [gridWidth - 4, gridHeight - 4] },
    { start: [gridWidth - 4, 3], target: [3, gridHeight - 4] },
    { start: [3, Math.floor(gridHeight / 2)], target: [gridWidth - 4, Math.floor(gridHeight / 2)] },
    { start: [Math.floor(gridWidth / 2), 3], target: [Math.floor(gridWidth / 2), gridHeight - 4] },
    { start: [Math.floor(gridWidth / 4), gridHeight - 4], target: [Math.floor(gridWidth * 0.75), 3] },
  ];

  for (let w = 0; w < wormCount; w++) {
    const q = quadrants[w % quadrants.length];
    let cx = q.start[0] + (rng() - 0.5) * 4;
    let cy = q.start[1] + (rng() - 0.5) * 4;
    const tx = q.target[0] + (rng() - 0.5) * 4;
    const ty = q.target[1] + (rng() - 0.5) * 4;

    let angle = Math.atan2(ty - cy, tx - cx);
    let wormRadius = 1.3 + rng() * 1.4;

    for (let step = 0; step < maxStepsPerWorm; step++) {
      // Carve circular brush
      const intR = Math.ceil(wormRadius);
      for (let dy = -intR; dy <= intR; dy++) {
        for (let dx = -intR; dx <= intR; dx++) {
          if (dx * dx + dy * dy <= wormRadius * wormRadius) {
            const gx = Math.round(cx + dx);
            const gy = Math.round(cy + dy);
            if (gx >= 1 && gx < gridWidth - 1 && gy >= 1 && gy < gridHeight - 1) {
              grid[gy][gx] = 1;
            }
          }
        }
      }

      // Turn with momentum and winding factor
      const targetAngle = Math.atan2(ty - cy, tx - cx);
      const angleDiff = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
      const turnBias = angleDiff * 0.15;
      angle += turnBias + (rng() - 0.5) * windingFactor;

      // Random radius breathing (widening and narrowing)
      wormRadius = Math.max(1.2, Math.min(2.8, wormRadius + (rng() - 0.5) * 0.4));

      cx += Math.cos(angle) * 1.1;
      cy += Math.sin(angle) * 1.1;

      // Stay within playable perimeter
      cx = Math.max(2, Math.min(gridWidth - 3, cx));
      cy = Math.max(2, Math.min(gridHeight - 3, cy));

      // Occasional natural cavern pocket along the tunnel
      if (step > 15 && rng() < 0.04) {
        const pocketRadius = 3.2 + rng() * 2.8;
        const pInt = Math.ceil(pocketRadius);
        for (let py = -pInt; py <= pInt; py++) {
          for (let px = -pInt; px <= pInt; px++) {
            if (px * px + py * py <= pocketRadius * pocketRadius) {
              const gx = Math.round(cx + px);
              const gy = Math.round(cy + py);
              if (gx >= 1 && gx < gridWidth - 1 && gy >= 1 && gy < gridHeight - 1) {
                grid[gy][gx] = 1;
              }
            }
          }
        }
      }

      if (Math.hypot(tx - cx, ty - cy) < 2) break;
    }
  }

  // 3-4 Major Cavern Chambers distributed across canvas
  const chamberCount = Math.max(3, Math.floor((gridWidth * gridHeight) / 300));
  for (let c = 0; c < chamberCount; c++) {
    const chamberX = 4 + Math.floor(rng() * (gridWidth - 8));
    const chamberY = 4 + Math.floor(rng() * (gridHeight - 8));
    const radX = 3.5 + rng() * 3.5;
    const radY = 3.5 + rng() * 3.5;

    for (let dy = -Math.ceil(radY); dy <= Math.ceil(radY); dy++) {
      for (let dx = -Math.ceil(radX); dx <= Math.ceil(radX); dx++) {
        if ((dx * dx) / (radX * radX) + (dy * dy) / (radY * radY) <= 1.0) {
          const gx = chamberX + dx;
          const gy = chamberY + dy;
          if (gx >= 1 && gx < gridWidth - 1 && gy >= 1 && gy < gridHeight - 1) {
            grid[gy][gx] = 1;
          }
        }
      }
    }
  }

  // Cellular smoothing pass to make rock walls natural and organic
  for (let iter = 0; iter < 2; iter++) {
    const nextGrid = create2DArray<number>(gridHeight, gridWidth, 0);
    for (let y = 1; y < gridHeight - 1; y++) {
      for (let x = 1; x < gridWidth - 1; x++) {
        let wallCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (grid[y + dy][x + dx] === 0) wallCount++;
          }
        }
        if (grid[y][x] === 1) {
          nextGrid[y][x] = wallCount >= 6 ? 0 : 1;
        } else {
          nextGrid[y][x] = wallCount <= 2 ? 1 : 0;
        }
      }
    }
    for (let y = 1; y < gridHeight - 1; y++) {
      for (let x = 1; x < gridWidth - 1; x++) {
        grid[y][x] = nextGrid[y][x];
      }
    }
  }

  // Enforce outer boundary walls
  for (let x = 0; x < gridWidth; x++) {
    grid[0][x] = 0;
    grid[gridHeight - 1][x] = 0;
  }
  for (let y = 0; y < gridHeight; y++) {
    grid[y][0] = 0;
    grid[y][gridWidth - 1] = 0;
  }

  // Ensure 100% connectivity between all cavern wings
  ensureAllComponentsConnected(grid, corridorWidth, rng);

  // Choke-point natural doors / barricades
  const doorways: DoorwayDef[] = [];
  if (doorFrequency !== 'none') {
    for (let y = 2; y < gridHeight - 2; y++) {
      for (let x = 2; x < gridWidth - 2; x++) {
        if (grid[y][x] === 1) {
          const isVertChoke =
            grid[y - 1][x] === 0 &&
            grid[y + 1][x] === 0 &&
            grid[y][x - 1] === 1 &&
            grid[y][x + 1] === 1;
          const isHorizChoke =
            grid[y][x - 1] === 0 &&
            grid[y][x + 1] === 0 &&
            grid[y - 1][x] === 1 &&
            grid[y + 1][x] === 1;

          if (isVertChoke && rng() < (doorFrequency === 'all' ? 0.6 : 0.25)) {
            doorways.push({ edgeType: 'vertical', x, y });
          } else if (isHorizChoke && rng() < (doorFrequency === 'all' ? 0.6 : 0.25)) {
            doorways.push({ edgeType: 'horizontal', x, y });
          }
        }
      }
    }
  }

  return { grid, doorways };
}

/**
 * 3. Cellular Automata Caves (Standard cellular smoothing with guaranteed connectivity)
 */
export function generateCellularCaves(
  gridWidth: number,
  gridHeight: number,
  initialFillRate = 0.46,
  smoothIterations = 4,
  doorFrequency: 'none' | 'some' | 'all' = 'none',
  rng: () => number = Math.random
): { grid: number[][]; doorways: DoorwayDef[] } {
  // Use our organic winding cave generator if full canvas / winding features are desired,
  // or run smoothed cellular with connectivity bridge.
  let grid = create2DArray<number>(gridHeight, gridWidth, 0);

  for (let attempt = 0; attempt < 5; attempt++) {
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1) {
          grid[y][x] = 0;
        } else {
          grid[y][x] = rng() > initialFillRate ? 1 : 0;
        }
      }
    }

    for (let iter = 0; iter < smoothIterations; iter++) {
      const nextGrid = create2DArray<number>(gridHeight, gridWidth, 0);
      for (let y = 1; y < gridHeight - 1; y++) {
        for (let x = 1; x < gridWidth - 1; x++) {
          let wallCount = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (grid[y + dy][x + dx] === 0) {
                wallCount++;
              }
            }
          }
          nextGrid[y][x] = wallCount >= 5 ? 0 : 1;
        }
      }
      grid = nextGrid;
    }

    // Connect all isolated cavern components so no region is discarded!
    ensureAllComponentsConnected(grid, 1, rng);

    // Count walkable
    let walkableCount = 0;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x] > 0) walkableCount++;
      }
    }

    if (walkableCount >= gridWidth * gridHeight * 0.15 || attempt === 4) {
      break;
    }
  }

  // Enforce boundary
  for (let x = 0; x < gridWidth; x++) {
    grid[0][x] = 0;
    grid[gridHeight - 1][x] = 0;
  }
  for (let y = 0; y < gridHeight; y++) {
    grid[y][0] = 0;
    grid[y][gridWidth - 1] = 0;
  }

  const doorways: DoorwayDef[] = [];
  if (doorFrequency !== 'none') {
    for (let y = 2; y < gridHeight - 2; y++) {
      for (let x = 2; x < gridWidth - 2; x++) {
        if (grid[y][x] === 1) {
          const isVertChoke =
            grid[y - 1][x] === 0 &&
            grid[y + 1][x] === 0 &&
            grid[y][x - 1] === 1 &&
            grid[y][x + 1] === 1;
          const isHorizChoke =
            grid[y][x - 1] === 0 &&
            grid[y][x + 1] === 0 &&
            grid[y - 1][x] === 1 &&
            grid[y + 1][x] === 1;

          if (isVertChoke && rng() < 0.25) {
            doorways.push({ edgeType: 'vertical', x, y });
          } else if (isHorizChoke && rng() < 0.25) {
            doorways.push({ edgeType: 'horizontal', x, y });
          }
        }
      }
    }
  }

  return { grid, doorways };
}

/**
 * 4. Mixed Fortress / Cavern Complex (Stone chambers carved inside winding caves)
 */
export function generateMixedCavernComplex(
  gridWidth: number,
  gridHeight: number,
  corridorWidth: 1 | 2 = 1,
  doorFrequency: 'none' | 'some' | 'all' = 'some',
  includeSecretRooms = true,
  rng: () => number = Math.random
): { grid: number[][]; rooms: DungeonRoom[]; doorways: DoorwayDef[] } {
  // First generate organic winding caves
  const cave = generateWindingCaves(gridWidth, gridHeight, 0.65, corridorWidth, 'none', rng);
  const grid = cave.grid;
  const rooms: DungeonRoom[] = [];

  // Carve 3 to 6 structured stone rooms inside the caves
  const roomCount = Math.max(3, Math.floor((gridWidth * gridHeight) / 250));
  for (let r = 0; r < roomCount; r++) {
    const rw = 4 + Math.floor(rng() * 5);
    const rh = 4 + Math.floor(rng() * 5);
    const rx = 2 + Math.floor(rng() * (gridWidth - rw - 4));
    const ry = 2 + Math.floor(rng() * (gridHeight - rh - 4));

    const isSecret = includeSecretRooms && r === 0;

    const room: DungeonRoom = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'room-' + (r + 1),
      x: rx,
      y: ry,
      w: rw,
      h: rh,
      isSecret,
      shape: 'rect',
    };
    rooms.push(room);

    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (y >= 1 && y < gridHeight - 1 && x >= 1 && x < gridWidth - 1) {
          grid[y][x] = 1;
        }
      }
    }
  }

  ensureAllComponentsConnected(grid, corridorWidth, rng);

  const doorways: DoorwayDef[] = [];
  if (doorFrequency !== 'none') {
    for (const r of rooms) {
      // Find door candidates connecting room to outside caves
      for (let y = r.y; y < r.y + r.h; y++) {
        if (r.x > 1 && grid[y][r.x - 1] > 0) {
          doorways.push({ edgeType: 'vertical', x: r.x, y, isSecret: r.isSecret });
          break;
        }
        if (r.x + r.w < gridWidth - 1 && grid[y][r.x + r.w] > 0) {
          doorways.push({ edgeType: 'vertical', x: r.x + r.w, y, isSecret: r.isSecret });
          break;
        }
      }
    }
  }

  return { grid, rooms, doorways };
}

/**
 * 5. Labyrinth / Catacombs (Dense winding corridors with crypt niches)
 */
export function generateCatacombs(
  gridWidth: number,
  gridHeight: number,
  corridorWidth: 1 | 2 = 1,
  doorFrequency: 'none' | 'some' | 'all' = 'some',
  rng: () => number = Math.random
): { grid: number[][]; rooms: DungeonRoom[]; doorways: DoorwayDef[] } {
  const grid = create2DArray<number>(gridHeight, gridWidth, 0);

  // Maze carving with recursive backtracker / stack
  const stack: Array<[number, number]> = [];
  const startX = 2;
  const startY = 2;
  grid[startY][startX] = 1;
  stack.push([startX, startY]);

  const step = 2; // grid step for maze walls

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors: Array<[number, number, number, number]> = [];

    const dirs = [
      [0, -step, 0, -1],
      [0, step, 0, 1],
      [-step, 0, -1, 0],
      [step, 0, 1, 0],
    ];

    for (const [dx, dy, wx, wy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 2 && nx < gridWidth - 2 && ny >= 2 && ny < gridHeight - 2) {
        if (grid[ny][nx] === 0) {
          neighbors.push([nx, ny, cx + wx, cy + wy]);
        }
      }
    }

    if (neighbors.length > 0) {
      const [nx, ny, wx, wy] = neighbors[Math.floor(rng() * neighbors.length)];
      grid[wy][wx] = 1;
      grid[ny][nx] = 1;
      stack.push([nx, ny]);
    } else {
      stack.pop();
    }
  }

  // Open up 15-25% random loops in maze
  const loopCandidates = Math.floor((gridWidth * gridHeight) / 50);
  for (let i = 0; i < loopCandidates; i++) {
    const rx = 2 + Math.floor(rng() * (gridWidth - 4));
    const ry = 2 + Math.floor(rng() * (gridHeight - 4));
    if (grid[ry][rx] === 0) {
      const hasAdj =
        (grid[ry - 1][rx] === 1 && grid[ry + 1][rx] === 1) ||
        (grid[ry][rx - 1] === 1 && grid[ry][rx + 1] === 1);
      if (hasAdj) grid[ry][rx] = 1;
    }
  }

  // Carve 2-4 small burial crypt chambers (4x4)
  const rooms: DungeonRoom[] = [];
  const chamberCount = Math.max(2, Math.floor((gridWidth * gridHeight) / 300));
  for (let c = 0; c < chamberCount; c++) {
    const cw = 4;
    const ch = 4;
    const cx = 3 + Math.floor(rng() * (gridWidth - cw - 6));
    const cy = 3 + Math.floor(rng() * (gridHeight - ch - 6));
    rooms.push({
      id: 'crypt-' + (c + 1),
      x: cx,
      y: cy,
      w: cw,
      h: ch,
      shape: 'rect',
    });
    for (let y = cy; y < cy + ch; y++) {
      for (let x = cx; x < cx + cw; x++) {
        grid[y][x] = 1;
      }
    }
  }

  ensureAllComponentsConnected(grid, corridorWidth, rng);

  const doorways: DoorwayDef[] = [];
  if (doorFrequency !== 'none') {
    for (const r of rooms) {
      doorways.push({ edgeType: 'vertical', x: r.x, y: r.y + 1 });
    }
  }

  return { grid, rooms, doorways };
}

export function extractCollinearWalls(
  grid: number[][],
  doorways: DoorwayDef[],
  cellSize: number
): Wall[] {
  const h = grid.length;
  if (h === 0) return [];
  const w = grid[0].length;
  if (w === 0) return [];

  const doorMap = new Map<string, DoorwayDef>();
  for (const d of doorways) {
    doorMap.set(`${d.edgeType}:${d.x}:${d.y}`, d);
  }

  const walls: Wall[] = [];

  function makeWall(x1: number, y1: number, x2: number, y2: number): Wall {
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : 'wall-' + (walls.length + 1),
      p1: { x: x1, y: y1 },
      p2: { x: x2, y: y2 },
      wallType: 'wall',
      blocksMovement: true,
      blocksVision: true,
      isDoor: false,
      isOpen: false,
    };
  }

  function makeDoor(x1: number, y1: number, x2: number, y2: number, isSecret = false): Wall {
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : 'door-' + (walls.length + 1),
      p1: { x: x1, y: y1 },
      p2: { x: x2, y: y2 },
      wallType: isSecret ? 'secret_door' : 'door',
      doorState: 'closed',
      blocksMovement: true,
      blocksVision: true,
      isDoor: true,
      isOpen: false,
    };
  }

  // 1. Horizontal edges
  for (let y = 0; y <= h; y++) {
    const pixelY = y * cellSize;
    let wallStart: number | null = null;

    for (let x = 0; x <= w; x++) {
      if (x === w) {
        if (wallStart !== null) {
          walls.push(makeWall(wallStart * cellSize, pixelY, x * cellSize, pixelY));
          wallStart = null;
        }
        break;
      }

      const cellAbove = y > 0 ? grid[y - 1][x] : 0;
      const cellBelow = y < h ? grid[y][x] : 0;
      const floorAbove = cellAbove > 0;
      const floorBelow = cellBelow > 0;
      const door = doorMap.get(`horizontal:${x}:${y}`);

      if (door) {
        if (wallStart !== null) {
          walls.push(makeWall(wallStart * cellSize, pixelY, x * cellSize, pixelY));
          wallStart = null;
        }
        walls.push(makeDoor(x * cellSize, pixelY, (x + 1) * cellSize, pixelY, door.isSecret));
      } else if (floorAbove !== floorBelow) {
        if (wallStart === null) wallStart = x;
      } else {
        if (wallStart !== null) {
          walls.push(makeWall(wallStart * cellSize, pixelY, x * cellSize, pixelY));
          wallStart = null;
        }
      }
    }
  }

  // 2. Vertical edges
  for (let x = 0; x <= w; x++) {
    const pixelX = x * cellSize;
    let wallStart: number | null = null;

    for (let y = 0; y <= h; y++) {
      if (y === h) {
        if (wallStart !== null) {
          walls.push(makeWall(pixelX, wallStart * cellSize, pixelX, y * cellSize));
          wallStart = null;
        }
        break;
      }

      const cellLeft = x > 0 ? grid[y][x - 1] : 0;
      const cellRight = x < w ? grid[y][x] : 0;
      const floorLeft = cellLeft > 0;
      const floorRight = cellRight > 0;
      const door = doorMap.get(`vertical:${x}:${y}`);

      if (door) {
        if (wallStart !== null) {
          walls.push(makeWall(pixelX, wallStart * cellSize, pixelX, y * cellSize));
          wallStart = null;
        }
        walls.push(makeDoor(pixelX, y * cellSize, pixelX, (y + 1) * cellSize, door.isSecret));
      } else if (floorLeft !== floorRight) {
        if (wallStart === null) wallStart = y;
      } else {
        if (wallStart !== null) {
          walls.push(makeWall(pixelX, wallStart * cellSize, pixelX, y * cellSize));
          wallStart = null;
        }
      }
    }
  }

  return walls;
}

export function renderDungeonToDataUrl(
  grid: number[][],
  style: DungeonGeneratorStyle,
  cellSize: number,
  palette: DungeonColorPalette,
  walls: Wall[],
  texture: DungeonTextureId = 'none'
): string {
  const h = grid.length;
  const w = grid[0].length;
  const width = w * cellSize;
  const height = h * cellSize;

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const isTransparent = texture === 'transparent';

      // 1. Draw wall background (if transparent, outer area can be dark void or transparent)
      if (!isTransparent) {
        ctx.fillStyle = palette.wallFill;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Transparent floor plan: wall void is dark with high opacity, rooms are completely cleared
        ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Draw floor cells
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (grid[y][x] > 0) {
            const px = x * cellSize;
            const py = y * cellSize;

            if (isTransparent) {
              // Clear floor so underlying battlemap texture shows through!
              ctx.clearRect(px, py, cellSize, cellSize);
            } else if (texture === 'stone') {
              // Stylized procedural stone flagstones
              ctx.fillStyle = '#2b303c';
              ctx.fillRect(px, py, cellSize, cellSize);
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
              ctx.lineWidth = 1;
              ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
              ctx.fillRect(px + 3, py + 3, cellSize - 6, 2);
            } else if (texture === 'wood') {
              // Stylized wooden planks
              ctx.fillStyle = '#3a2719';
              ctx.fillRect(px, py, cellSize, cellSize);
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
              ctx.lineWidth = 1;
              const plankH = cellSize / 3;
              for (let pl = 0; pl < 3; pl++) {
                ctx.strokeRect(px, py + pl * plankH, cellSize, plankH);
              }
            } else if (texture === 'grass') {
              // Lush green ground
              ctx.fillStyle = '#1c361e';
              ctx.fillRect(px, py, cellSize, cellSize);
              ctx.fillStyle = 'rgba(74, 144, 76, 0.12)';
              ctx.fillRect(px + 4, py + 4, 3, 3);
              ctx.fillRect(px + cellSize - 8, py + cellSize - 8, 3, 3);
            } else if (texture === 'water') {
              // Shimmering underground water
              ctx.fillStyle = '#102a3a';
              ctx.fillRect(px, py, cellSize, cellSize);
              ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
              ctx.fillRect(px + 2, py + 4, cellSize - 4, 2);
              ctx.fillRect(px + 6, py + cellSize - 6, cellSize - 12, 2);
            } else {
              // Default palette
              ctx.fillStyle = palette.floorBg;
              ctx.fillRect(px, py, cellSize, cellSize);

              if (style === 'bsp') {
                const half = cellSize / 2;
                ctx.strokeStyle = palette.floorTileStroke;
                ctx.lineWidth = 1;
                for (let sy = 0; sy < 2; sy++) {
                  for (let sx = 0; sx < 2; sx++) {
                    ctx.strokeRect(px + sx * half + 0.5, py + sy * half + 0.5, half - 1, half - 1);
                  }
                }
              } else {
                ctx.fillStyle = palette.floorDetail;
                const seedOffset = (x * 17 + y * 29) % 7;
                ctx.fillRect(px + 4 + seedOffset, py + 4 + seedOffset, 2, 2);
                ctx.fillRect(px + cellSize - 8 - seedOffset, py + cellSize - 8, 2, 2);
              }
            }
          }
        }
      }

      // 3. Wall perimeter shading
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (grid[y][x] > 0) {
            const px = x * cellSize;
            const py = y * cellSize;

            if (y > 0 && grid[y - 1][x] === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
              ctx.fillRect(px, py, cellSize, 4);
            }
            if (x > 0 && grid[y][x - 1] === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
              ctx.fillRect(px, py, 4, cellSize);
            }
            if (y < h - 1 && grid[y + 1][x] === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              ctx.fillRect(px, py + cellSize - 3, cellSize, 3);
            }
            if (x < w - 1 && grid[y][x + 1] === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              ctx.fillRect(px + cellSize - 3, py, 3, cellSize);
            }
          }
        }
      }

      // 4. Doors on floor plan
      for (const wall of walls) {
        if (wall.wallType === 'door' || wall.wallType === 'secret_door') {
          ctx.save();
          if (wall.wallType === 'secret_door') {
            ctx.strokeStyle = palette.wallStroke;
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 3;
          } else {
            ctx.strokeStyle = '#c5a059';
            ctx.lineWidth = 4;
          }
          ctx.beginPath();
          ctx.moveTo(wall.p1.x, wall.p1.y);
          ctx.lineTo(wall.p2.x, wall.p2.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 5. Tactical grid lines with high contrast for battlemap readability
      if (texture === 'grass') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
        ctx.lineWidth = 1.35;
      } else if (texture === 'water') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.50)';
        ctx.lineWidth = 1.35;
      } else if (texture === 'wood' || texture === 'stone') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.35;
      } else if (texture === 'transparent') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.25;
      } else {
        ctx.strokeStyle = palette.gridLineColor;
        ctx.lineWidth = 1.25;
      }
      ctx.beginPath();
      for (let gx = 0; gx <= width; gx += cellSize) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
      }
      for (let gy = 0; gy <= height; gy += cellSize) {
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
      }
      ctx.stroke();

      return canvas.toDataURL('image/png');
    }
  }

  // Fallback SVG representation for headless test environments
  let svgRects = '';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] > 0) {
        svgRects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${palette.floorBg}" stroke="${palette.floorTileStroke}" stroke-width="0.5"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${palette.wallFill}"/>${svgRects}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function generateProceduralDungeon(
  options: ProceduralDungeonOptions
): GeneratedDungeonResult {
  const gridWidth = Math.max(10, Math.min(80, options.gridWidth || 30));
  const gridHeight = Math.max(10, Math.min(80, options.gridHeight || 30));
  const cellSize = options.cellSize && options.cellSize > 0 ? options.cellSize : 50;
  const paletteId = options.palette && DUNGEON_PALETTES[options.palette] ? options.palette : 'granite';
  const palette = DUNGEON_PALETTES[paletteId];
  const texture = options.texture || 'none';
  const rng = createRng(options.seed);

  let grid: number[][];
  let doorways: DoorwayDef[];
  let roomCount = 0;

  if (options.style === 'bsp') {
    const bspResult = generateBspDungeon(
      gridWidth,
      gridHeight,
      options.roomDensity || 'medium',
      options.corridorWidth || 1,
      options.doorFrequency || 'some',
      options.includeSecretRooms ?? true,
      rng
    );
    grid = bspResult.grid;
    doorways = bspResult.doorways;
    roomCount = bspResult.rooms.length;
  } else if (options.style === 'caves') {
    const caveResult = generateWindingCaves(
      gridWidth,
      gridHeight,
      options.caveWinding ?? 0.7,
      options.corridorWidth || 2,
      options.doorFrequency || 'none',
      rng
    );
    grid = caveResult.grid;
    doorways = caveResult.doorways;
    roomCount = 1;
  } else if (options.style === 'mixed') {
    const mixedResult = generateMixedCavernComplex(
      gridWidth,
      gridHeight,
      options.corridorWidth || 1,
      options.doorFrequency || 'some',
      options.includeSecretRooms ?? true,
      rng
    );
    grid = mixedResult.grid;
    doorways = mixedResult.doorways;
    roomCount = mixedResult.rooms.length;
  } else if (options.style === 'labyrinth') {
    const catacombsResult = generateCatacombs(
      gridWidth,
      gridHeight,
      options.corridorWidth || 1,
      options.doorFrequency || 'some',
      rng
    );
    grid = catacombsResult.grid;
    doorways = catacombsResult.doorways;
    roomCount = catacombsResult.rooms.length;
  } else {
    // Default 'cellular'
    const cellularResult = generateCellularCaves(
      gridWidth,
      gridHeight,
      options.initialFillRate || 0.46,
      options.smoothIterations || 4,
      options.doorFrequency || 'none',
      rng
    );
    grid = cellularResult.grid;
    doorways = cellularResult.doorways;
    roomCount = 1;
  }

  const walls = extractCollinearWalls(grid, doorways, cellSize);
  const doorCount = walls.filter(
    (w) => w.wallType === 'door' || w.wallType === 'secret_door'
  ).length;

  const backgroundDataUrl = renderDungeonToDataUrl(
    grid,
    options.style,
    cellSize,
    palette,
    walls,
    texture
  );

  return {
    backgroundDataUrl,
    width: gridWidth * cellSize,
    height: gridHeight * cellSize,
    gridSize: cellSize,
    walls,
    roomCount,
    doorCount,
  };
}
