import { Wall } from '../types/map';

export type DungeonGeneratorStyle = 'bsp' | 'cellular';
export type DungeonPaletteId = 'granite' | 'crypt' | 'sandstone' | 'grotto';

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
    gridLineColor: 'rgba(255, 255, 255, 0.07)',
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
    gridLineColor: 'rgba(168, 85, 247, 0.08)',
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
    gridLineColor: 'rgba(245, 185, 32, 0.08)',
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
    gridLineColor: 'rgba(20, 184, 166, 0.08)',
    accent: '#14b8a6',
  },
};

export interface ProceduralDungeonOptions {
  style: DungeonGeneratorStyle;
  gridWidth: number;
  gridHeight: number;
  cellSize?: number;
  palette?: DungeonPaletteId;
  roomDensity?: 'low' | 'medium' | 'high';
  corridorWidth?: 1 | 2;
  doorFrequency?: 'none' | 'some' | 'all';
  includeSecretRooms?: boolean;
  initialFillRate?: number;
  smoothIterations?: number;
  seed?: number;
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
      Math.min(availW, Math.floor(availW * 0.6 + rng() * (availW * 0.4 + 1)))
    );
    const roomH = Math.max(
      minRoomDim,
      Math.min(availH, Math.floor(availH * 0.6 + rng() * (availH * 0.4 + 1)))
    );

    const maxOffsetX = Math.max(0, availW - roomW);
    const maxOffsetY = Math.max(0, availH - roomH);
    const roomX = sector.x + padding + Math.floor(rng() * (maxOffsetX + 1));
    const roomY = sector.y + padding + Math.floor(rng() * (maxOffsetY + 1));

    const room: DungeonRoom = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'room-' + (rooms.length + 1),
      x: roomX,
      y: roomY,
      w: roomW,
      h: roomH,
    };

    sector.room = room;
    rooms.push(room);

    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
          grid[y][x] = 1;
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
        if (cy >= 0 && cy < gridHeight && x >= 0 && x < gridWidth) {
          if (grid[cy][x] === 0) {
            grid[cy][x] = 2;
          }
        }
      }
    }

    for (let y = minY; y <= maxY; y++) {
      for (let w = 0; w < corridorWidth; w++) {
        const cx = x2 + w;
        if (y >= 0 && y < gridHeight && cx >= 0 && cx < gridWidth) {
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

  if (includeSecretRooms && rooms.length >= 3) {
    const candidateIndex = Math.floor(rng() * rooms.length);
    rooms[candidateIndex].isSecret = true;
  }

  const candidateDoorways: DoorwayDef[] = [];

  for (const r of rooms) {
    // Check left boundary: x = r.x
    for (let y = r.y; y < r.y + r.h; y++) {
      if (r.x > 0 && grid[y][r.x - 1] === 2 && grid[y][r.x] === 1) {
        candidateDoorways.push({
          edgeType: 'vertical',
          x: r.x,
          y,
          isSecret: r.isSecret,
        });
      }
    }
    // Check right boundary: x = r.x + r.w
    for (let y = r.y; y < r.y + r.h; y++) {
      if (r.x + r.w < gridWidth && grid[y][r.x + r.w] === 2 && grid[y][r.x + r.w - 1] === 1) {
        candidateDoorways.push({
          edgeType: 'vertical',
          x: r.x + r.w,
          y,
          isSecret: r.isSecret,
        });
      }
    }
    // Check top boundary: y = r.y
    for (let x = r.x; x < r.x + r.w; x++) {
      if (r.y > 0 && grid[r.y - 1][x] === 2 && grid[r.y][x] === 1) {
        candidateDoorways.push({
          edgeType: 'horizontal',
          x,
          y: r.y,
          isSecret: r.isSecret,
        });
      }
    }
    // Check bottom boundary: y = r.y + r.h
    for (let x = r.x; x < r.x + r.w; x++) {
      if (r.y + r.h < gridHeight && grid[r.y + r.h][x] === 2 && grid[r.y + r.h - 1][x] === 1) {
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

export function generateCellularCaves(
  gridWidth: number,
  gridHeight: number,
  initialFillRate = 0.46,
  smoothIterations = 4,
  doorFrequency: 'none' | 'some' | 'all' = 'none',
  rng: () => number = Math.random
): { grid: number[][]; doorways: DoorwayDef[] } {
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

    const visited = create2DArray<boolean>(gridHeight, gridWidth, false);
    let largestComp: Array<[number, number]> = [];

    for (let y = 1; y < gridHeight - 1; y++) {
      for (let x = 1; x < gridWidth - 1; x++) {
        if (grid[y][x] === 1 && !visited[y][x]) {
          const comp: Array<[number, number]> = [];
          const queue: Array<[number, number]> = [[x, y]];
          visited[y][x] = true;

          while (queue.length > 0) {
            const [cx, cy] = queue.shift()!;
            comp.push([cx, cy]);
            const neighbors = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1],
            ];
            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                if (grid[ny][nx] === 1 && !visited[ny][nx]) {
                  visited[ny][nx] = true;
                  queue.push([nx, ny]);
                }
              }
            }
          }

          if (comp.length > largestComp.length) {
            largestComp = comp;
          }
        }
      }
    }

    const minAcceptable = Math.floor(gridWidth * gridHeight * 0.18);
    if (largestComp.length >= minAcceptable || attempt === 4) {
      const mainLookup = new Set<string>();
      for (const [cx, cy] of largestComp) {
        mainLookup.add(`${cx}:${cy}`);
      }
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          if (grid[y][x] === 1 && !mainLookup.has(`${x}:${y}`)) {
            grid[y][x] = 0;
          }
        }
      }
      break;
    }
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
  walls: Wall[]
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
      // 1. Draw wall background
      ctx.fillStyle = palette.wallFill;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw floor cells
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (grid[y][x] > 0) {
            const px = x * cellSize;
            const py = y * cellSize;

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

      // 3. Wall perimeter shading
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (grid[y][x] > 0) {
            const px = x * cellSize;
            const py = y * cellSize;

            if (y > 0 && grid[y - 1][x] === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
              ctx.fillRect(px, py, cellSize, 4);
            }
            if (x > 0 && grid[y][x - 1] === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
              ctx.fillRect(px, py, 4, cellSize);
            }
            if (y < h - 1 && grid[y + 1][x] === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
              ctx.fillRect(px, py + cellSize - 3, cellSize, 3);
            }
            if (x < w - 1 && grid[y][x + 1] === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
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
            ctx.strokeStyle = '#8B5A2B';
            ctx.lineWidth = 4;
          }
          ctx.beginPath();
          ctx.moveTo(wall.p1.x, wall.p1.y);
          ctx.lineTo(wall.p2.x, wall.p2.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 5. Tactical grid lines
      ctx.strokeStyle = palette.gridLineColor;
      ctx.lineWidth = 1;
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
  } else {
    const caveResult = generateCellularCaves(
      gridWidth,
      gridHeight,
      options.initialFillRate || 0.46,
      options.smoothIterations || 4,
      options.doorFrequency || 'none',
      rng
    );
    grid = caveResult.grid;
    doorways = caveResult.doorways;
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
    walls
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
