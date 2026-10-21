import { describe, it, expect } from 'vitest';
import {
  generateProceduralDungeon,
  generateBspDungeon,
  generateCellularCaves,
  extractCollinearWalls,
  checkDungeonConnectivity,
  DUNGEON_PALETTES,
  createRng,
} from '../engine/proceduralDungeon';

describe('Procedural Dungeon Engine - BSP Dungeon Algorithm', () => {
  it('generates non-empty rooms and ensures 100% dungeon connectivity', () => {
    const result = generateBspDungeon(30, 30, 'medium', 1, 'some', true, createRng(42));

    expect(result.rooms.length).toBeGreaterThanOrEqual(3);
    for (const room of result.rooms) {
      expect(room.w).toBeGreaterThanOrEqual(3);
      expect(room.h).toBeGreaterThanOrEqual(3);
      expect(room.x).toBeGreaterThanOrEqual(1);
      expect(room.y).toBeGreaterThanOrEqual(1);
      expect(room.x + room.w).toBeLessThanOrEqual(29);
      expect(room.y + room.h).toBeLessThanOrEqual(29);
    }

    const isConnected = checkDungeonConnectivity(result.grid);
    expect(isConnected).toBe(true);
  });

  it('guarantees connectivity across various room densities and corridor widths', () => {
    const densities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    const corridorWidths: Array<1 | 2> = [1, 2];

    for (const density of densities) {
      for (const cw of corridorWidths) {
        const { grid, rooms } = generateBspDungeon(25, 25, density, cw, 'all', false, createRng(100));
        expect(rooms.length).toBeGreaterThan(0);
        expect(checkDungeonConnectivity(grid)).toBe(true);
      }
    }
  });

  it('correctly designates secret rooms and secret doors when requested', () => {
    const { rooms, doorways } = generateBspDungeon(35, 35, 'medium', 1, 'all', true, createRng(777));
    const secretRooms = rooms.filter((r) => r.isSecret);

    if (rooms.length >= 3) {
      expect(secretRooms.length).toBe(1);
      const secretDoors = doorways.filter((d) => d.isSecret);
      expect(secretDoors.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('Procedural Dungeon Engine - Cellular Automata Caves', () => {
  it('smooths initial noise and eliminates disconnected isolated voids', () => {
    const { grid } = generateCellularCaves(30, 30, 0.46, 4, 'none', createRng(123));

    let walkableCount = 0;
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++) {
        if (grid[y][x] === 1) walkableCount++;
      }
    }

    expect(walkableCount).toBeGreaterThan(50);
    const isConnected = checkDungeonConnectivity(grid);
    expect(isConnected).toBe(true);
  });

  it('enforces impassable boundary walls around the entire perimeter', () => {
    const { grid } = generateCellularCaves(25, 25, 0.45, 3, 'none', createRng(555));

    for (let x = 0; x < 25; x++) {
      expect(grid[0][x]).toBe(0);
      expect(grid[24][x]).toBe(0);
    }
    for (let y = 0; y < 25; y++) {
      expect(grid[y][0]).toBe(0);
      expect(grid[y][24]).toBe(0);
    }
  });
});

describe('Procedural Dungeon Engine - Wall and Door Vectorization', () => {
  it('merges collinear adjacent wall segments into continuous chains with non-zero length', () => {
    // 6x6 test grid with a single 3x3 room in center (x: 1..3, y: 1..3)
    const testGrid = [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ];

    const cellSize = 50;
    const walls = extractCollinearWalls(testGrid, [], cellSize);

    // Expect exactly 4 walls enclosing the 3x3 room (top, bottom, left, right)
    expect(walls.length).toBe(4);

    for (const w of walls) {
      expect(w.wallType).toBe('wall');
      expect(w.blocksMovement).toBe(true);
      expect(w.blocksVision).toBe(true);

      const dx = Math.abs(w.p2.x - w.p1.x);
      const dy = Math.abs(w.p2.y - w.p1.y);
      const length = Math.sqrt(dx * dx + dy * dy);

      // Each wall must span 3 cells = 150px
      expect(length).toBe(150);
    }
  });

  it('correctly creates and sets properties for doors and secret doors', () => {
    const testGrid = [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 2, 0, 0],
      [0, 0, 2, 0, 0],
      [0, 0, 0, 0, 0],
    ];

    const doorways = [
      { edgeType: 'horizontal' as const, x: 2, y: 2, isSecret: false },
    ];

    const walls = extractCollinearWalls(testGrid, doorways, 50);
    const doors = walls.filter((w) => w.wallType === 'door');

    expect(doors.length).toBe(1);
    const door = doors[0];
    expect(door.isDoor).toBe(true);
    expect(door.isOpen).toBe(false);
    expect(door.doorState).toBe('closed');
    expect(door.blocksMovement).toBe(true);
    expect(door.blocksVision).toBe(true);
    expect(door.p1).toEqual({ x: 100, y: 100 });
    expect(door.p2).toEqual({ x: 150, y: 100 });
  });

  it('sets wallType to secret_door when doorway is marked secret', () => {
    const testGrid = [
      [0, 0, 0, 0],
      [0, 1, 2, 0],
      [0, 0, 0, 0],
    ];

    const doorways = [
      { edgeType: 'vertical' as const, x: 2, y: 1, isSecret: true },
    ];

    const walls = extractCollinearWalls(testGrid, doorways, 50);
    const secretDoors = walls.filter((w) => w.wallType === 'secret_door');

    expect(secretDoors.length).toBe(1);
    expect(secretDoors[0].blocksMovement).toBe(true);
    expect(secretDoors[0].blocksVision).toBe(true);
    expect(secretDoors[0].doorState).toBe('closed');
  });
});

describe('Procedural Dungeon Engine - Full Generation Pipeline', () => {
  it('generates a complete dungeon package with valid dimensions and dataUrl', () => {
    const result = generateProceduralDungeon({
      style: 'bsp',
      gridWidth: 20,
      gridHeight: 20,
      cellSize: 50,
      palette: 'crypt',
      roomDensity: 'medium',
      corridorWidth: 1,
      doorFrequency: 'all',
      includeSecretRooms: true,
      seed: 888,
    });

    expect(result.width).toBe(1000);
    expect(result.height).toBe(1000);
    expect(result.gridSize).toBe(50);
    expect(result.roomCount).toBeGreaterThan(0);
    expect(result.walls.length).toBeGreaterThan(0);
    expect(result.backgroundDataUrl.startsWith('data:image/')).toBe(true);

    for (const wall of result.walls) {
      expect(wall.blocksMovement).toBe(true);
      expect(wall.blocksVision).toBe(true);
      expect(wall.p1.x !== wall.p2.x || wall.p1.y !== wall.p2.y).toBe(true);
    }
  });

  it('generates a cellular caves system with selected palettes', () => {
    const palettes = Object.keys(DUNGEON_PALETTES) as Array<keyof typeof DUNGEON_PALETTES>;

    for (const pal of palettes) {
      const result = generateProceduralDungeon({
        style: 'cellular',
        gridWidth: 20,
        gridHeight: 20,
        cellSize: 40,
        palette: pal,
        seed: 321,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(800);
      expect(result.walls.length).toBeGreaterThan(0);
      expect(result.backgroundDataUrl).toBeTruthy();
    }
  });

  it('produces deterministic output when given an identical seed', () => {
    const run1 = generateProceduralDungeon({
      style: 'bsp',
      gridWidth: 25,
      gridHeight: 25,
      cellSize: 50,
      seed: 123456,
    });

    const run2 = generateProceduralDungeon({
      style: 'bsp',
      gridWidth: 25,
      gridHeight: 25,
      cellSize: 50,
      seed: 123456,
    });

    expect(run1.roomCount).toBe(run2.roomCount);
    expect(run1.doorCount).toBe(run2.doorCount);
    expect(run1.walls.length).toBe(run2.walls.length);

    for (let i = 0; i < run1.walls.length; i++) {
      expect(run1.walls[i].p1).toEqual(run2.walls[i].p1);
      expect(run1.walls[i].p2).toEqual(run2.walls[i].p2);
      expect(run1.walls[i].wallType).toEqual(run2.walls[i].wallType);
    }
  });
});
