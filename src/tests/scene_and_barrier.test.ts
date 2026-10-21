import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore, VttScene } from '../store/sceneStore';
import { useMapStore } from '../store/mapStore';
import {
  Wall,
  getWallType,
  getDoorState,
  isWallBlockingMovement,
  isWallBlockingVision,
} from '../types/map';
import { checkLineIntersection, findWallSnapPoint } from '../utils/mapGeometry';

describe('Scene Director (sceneStore)', () => {
  beforeEach(() => {
    // Reset stores and localStorage before each test
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    useMapStore.setState({
      imageUrl: 'https://example.com/start-map.jpg',
      imageWidth: 1600,
      imageHeight: 1200,
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
      selectedWallId: null,
      selectedPinId: null,
      selectedMapTokenId: null,
    });

    const initialScene: VttScene = {
      id: 'test-scene-1',
      name: 'Таверна "У Золотого Дракона"',
      imageUrl: 'https://example.com/tavern.jpg',
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    useSceneStore.setState({
      scenes: [initialScene],
      activeSceneId: 'test-scene-1',
    });
  });

  it('initializes with an active scene and list of scenes', () => {
    const { scenes, activeSceneId } = useSceneStore.getState();
    expect(scenes.length).toBeGreaterThanOrEqual(1);
    expect(activeSceneId).toBe('test-scene-1');
    expect(scenes[0].name).toContain('Таверна');
  });

  it('creates a new scene with specified parameters', () => {
    const newId = useSceneStore.getState().createScene('Подземелье Склепа', 'https://example.com/dungeon.jpg', false);
    const { scenes } = useSceneStore.getState();
    expect(scenes).toHaveLength(2);

    const created = scenes.find((s) => s.id === newId);
    expect(created).toBeDefined();
    expect(created?.name).toBe('Подземелье Склепа');
    expect(created?.imageUrl).toBe('https://example.com/dungeon.jpg');
    expect(created?.isVideoMap).toBe(false);
  });

  it('updates scene metadata', () => {
    useSceneStore.getState().updateScene('test-scene-1', {
      name: 'Таверна "Два Клинка"',
      weatherEffect: 'rain',
    });

    const updated = useSceneStore.getState().scenes.find((s) => s.id === 'test-scene-1');
    expect(updated?.name).toBe('Таверна "Два Клинка"');
    expect(updated?.weatherEffect).toBe('rain');
  });

  it('duplicates an existing scene with deep copied entities and copy name', () => {
    const wallId = 'wall-101';
    useSceneStore.getState().updateScene('test-scene-1', {
      walls: [
        {
          id: wallId,
          p1: { x: 100, y: 100 },
          p2: { x: 200, y: 100 },
          wallType: 'wall',
          blocksMovement: true,
          blocksVision: true,
        },
      ],
    });

    const dupId = useSceneStore.getState().duplicateScene('test-scene-1');
    const { scenes } = useSceneStore.getState();
    expect(scenes).toHaveLength(2);

    const duplicated = scenes.find((s) => s.id === dupId);
    expect(duplicated).toBeDefined();
    expect(duplicated?.name).toBe('Таверна "У Золотого Дракона" (Копия)');
    expect(duplicated?.walls).toHaveLength(1);
    expect(duplicated?.walls[0].id).not.toBe(wallId);
    expect(duplicated?.walls[0].p1).toEqual({ x: 100, y: 100 });
  });

  it('reorders scenes correctly', () => {
    const id2 = useSceneStore.getState().createScene('Сцена 2');
    const id3 = useSceneStore.getState().createScene('Сцена 3');

    expect(useSceneStore.getState().scenes.map((s) => s.id)).toEqual(['test-scene-1', id2, id3]);

    useSceneStore.getState().reorderScenes(0, 2);
    expect(useSceneStore.getState().scenes.map((s) => s.id)).toEqual([id2, id3, 'test-scene-1']);
  });

  it('synchronizes current map state into active scene', () => {
    useMapStore.setState({
      imageUrl: 'https://example.com/synced-map.jpg',
      scale: 1.75,
      panX: -250,
      panY: 120,
      weatherEffect: 'snow',
      walls: [
        {
          id: 'synced-wall',
          p1: { x: 50, y: 50 },
          p2: { x: 150, y: 50 },
          wallType: 'door',
          doorState: 'open',
          blocksMovement: false,
          blocksVision: false,
        },
      ],
    });

    useSceneStore.getState().syncCurrentMapToActiveScene();

    const activeScene = useSceneStore.getState().scenes.find((s) => s.id === 'test-scene-1');
    expect(activeScene?.imageUrl).toBe('https://example.com/synced-map.jpg');
    expect(activeScene?.scale).toBe(1.75);
    expect(activeScene?.weatherEffect).toBe('snow');
    expect(activeScene?.walls).toHaveLength(1);
    expect(activeScene?.walls[0].id).toBe('synced-wall');
  });

  it('switches scenes, saving the old state and broadcasting the new scene', () => {
    const scene2Id = useSceneStore.getState().createScene('Лагерь в Лесу', 'https://example.com/forest-camp.jpg');
    useSceneStore.getState().updateScene(scene2Id, {
      scale: 1.25,
      gridCellSize: 70,
      weatherEffect: 'fog',
      walls: [
        {
          id: 'forest-barrier',
          p1: { x: 200, y: 200 },
          p2: { x: 400, y: 200 },
          wallType: 'window',
          blocksMovement: true,
          blocksVision: false,
        },
      ],
    });

    // Make a change on scene 1
    useMapStore.setState({
      panX: 99,
      panY: 88,
    });

    // Switch to scene 2
    useSceneStore.getState().switchScene(scene2Id);

    expect(useSceneStore.getState().activeSceneId).toBe(scene2Id);
    const map = useMapStore.getState();
    expect(map.imageUrl).toBe('https://example.com/forest-camp.jpg');
    expect(map.scale).toBe(1.25);
    expect(map.gridCellSize).toBe(70);
    expect(map.weatherEffect).toBe('fog');
    expect(map.walls).toHaveLength(1);
    expect(map.walls[0].id).toBe('forest-barrier');

    // Check that scene 1 received the saved snapshot
    const scene1 = useSceneStore.getState().scenes.find((s) => s.id === 'test-scene-1');
    expect(scene1?.panX).toBe(99);
    expect(scene1?.panY).toBe(88);
  });

  it('deletes scene and smoothly falls back to neighbor scene or fallback scene', () => {
    const scene2Id = useSceneStore.getState().createScene('Пещера');
    expect(useSceneStore.getState().scenes).toHaveLength(2);

    // Switch to scene 2 and delete it
    useSceneStore.getState().switchScene(scene2Id);
    useSceneStore.getState().deleteScene(scene2Id);

    const state = useSceneStore.getState();
    expect(state.scenes).toHaveLength(1);
    expect(state.activeSceneId).toBe('test-scene-1');

    // Delete the last scene -> creates a fallback scene so list is never empty
    useSceneStore.getState().deleteScene('test-scene-1');
    const finalState = useSceneStore.getState();
    expect(finalState.scenes.length).toBe(1);
    expect(finalState.activeSceneId).toBe(finalState.scenes[0].id);
  });
});

describe('Barrier Architect (Walls, Doors, Secret Doors, Windows)', () => {
  beforeEach(() => {
    useMapStore.setState({
      walls: [],
      selectedWallId: null,
      gridCellSize: 50,
      isGridVisible: true,
    });
  });

  it('correctly classifies barrier types and provides backward compatibility', () => {
    const wallLegacy: Wall = {
      id: 'w1',
      p1: { x: 0, y: 0 },
      p2: { x: 100, y: 0 },
      isDoor: false,
    };
    expect(getWallType(wallLegacy)).toBe('wall');

    const doorLegacy: Wall = {
      id: 'w2',
      p1: { x: 0, y: 0 },
      p2: { x: 100, y: 0 },
      isDoor: true,
      isOpen: true,
    };
    expect(getWallType(doorLegacy)).toBe('door');
    expect(getDoorState(doorLegacy)).toBe('open');

    const secretDoor: Wall = {
      id: 'w3',
      p1: { x: 0, y: 0 },
      p2: { x: 100, y: 0 },
      wallType: 'secret_door',
      doorState: 'locked',
    };
    expect(getWallType(secretDoor)).toBe('secret_door');
    expect(getDoorState(secretDoor)).toBe('locked');
  });

  it('evaluates blocksMovement according to barrier types and door states', () => {
    const solidWall: Wall = { id: '1', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'wall' };
    expect(isWallBlockingMovement(solidWall)).toBe(true);

    const windowBarrier: Wall = { id: '2', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'window' };
    expect(isWallBlockingMovement(windowBarrier)).toBe(true);

    const closedDoor: Wall = { id: '3', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'door', doorState: 'closed' };
    expect(isWallBlockingMovement(closedDoor)).toBe(true);

    const lockedDoor: Wall = { id: '4', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'door', doorState: 'locked' };
    expect(isWallBlockingMovement(lockedDoor)).toBe(true);

    const openDoor: Wall = { id: '5', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'door', doorState: 'open' };
    expect(isWallBlockingMovement(openDoor)).toBe(false);

    const closedSecretDoor: Wall = { id: '6', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'secret_door', doorState: 'closed' };
    expect(isWallBlockingMovement(closedSecretDoor)).toBe(true);

    const openSecretDoor: Wall = { id: '7', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'secret_door', doorState: 'open' };
    expect(isWallBlockingMovement(openSecretDoor)).toBe(false);

    const etherealBarrier: Wall = { id: '8', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'ethereal' };
    expect(isWallBlockingMovement(etherealBarrier)).toBe(false);
  });

  it('evaluates blocksVision according to barrier types and door states', () => {
    const solidWall: Wall = { id: '1', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'wall' };
    expect(isWallBlockingVision(solidWall)).toBe(true);

    const closedDoor: Wall = { id: '2', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'door', doorState: 'closed' };
    expect(isWallBlockingVision(closedDoor)).toBe(true);

    const openDoor: Wall = { id: '3', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'door', doorState: 'open' };
    expect(isWallBlockingVision(openDoor)).toBe(false);

    // Windows block movement, but allow vision!
    const windowBarrier: Wall = { id: '4', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'window' };
    expect(isWallBlockingVision(windowBarrier)).toBe(false);

    // Ethereal barriers allow vision
    const etherealBarrier: Wall = { id: '5', p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, wallType: 'ethereal' };
    expect(isWallBlockingVision(etherealBarrier)).toBe(false);
  });

  it('supports interactive operations in mapStore: addWall, toggleDoor, toggleLockDoor, setDoorState', () => {
    const store = useMapStore.getState();

    // 1. Add door
    const doorId = store.addWall({
      p1: { x: 100, y: 100 },
      p2: { x: 150, y: 100 },
      wallType: 'door',
      doorState: 'closed',
    });

    let door = useMapStore.getState().walls.find((w) => w.id === doorId);
    expect(door).toBeDefined();
    expect(door?.doorState).toBe('closed');
    expect(door?.isOpen).toBe(false);
    expect(door?.blocksMovement).toBe(true);

    // 2. Click toggles to open
    useMapStore.getState().toggleDoor(doorId);
    door = useMapStore.getState().walls.find((w) => w.id === doorId);
    expect(door?.doorState).toBe('open');
    expect(door?.isOpen).toBe(true);
    expect(door?.blocksMovement).toBe(false);

    // 3. Click toggles to closed
    useMapStore.getState().toggleDoor(doorId);
    door = useMapStore.getState().walls.find((w) => w.id === doorId);
    expect(door?.doorState).toBe('closed');
    expect(door?.isOpen).toBe(false);
    expect(door?.blocksMovement).toBe(true);

    // 4. Shift-click locks the door
    useMapStore.getState().toggleLockDoor(doorId);
    door = useMapStore.getState().walls.find((w) => w.id === doorId);
    expect(door?.doorState).toBe('locked');
    expect(door?.blocksMovement).toBe(true);

    // 5. Shift-click on locked door unlocks to closed
    useMapStore.getState().toggleLockDoor(doorId);
    door = useMapStore.getState().walls.find((w) => w.id === doorId);
    expect(door?.doorState).toBe('closed');

    // 6. Explicit setDoorState
    useMapStore.getState().setDoorState(doorId, 'open');
    door = useMapStore.getState().walls.find((w) => w.id === doorId);
    expect(door?.doorState).toBe('open');
    expect(door?.blocksMovement).toBe(false);
  });

  it('checks line intersection and movement collisions accurately', () => {
    const wallP1 = { x: 100, y: 50 };
    const wallP2 = { x: 100, y: 250 };

    // Move across the wall from (50, 150) to (150, 150) -> should intersect
    const intersects = checkLineIntersection(
      { x: 50, y: 150 },
      { x: 150, y: 150 },
      wallP1,
      wallP2
    );
    expect(intersects).toBe(true);

    // Move parallel without crossing -> should not intersect
    const noIntersection = checkLineIntersection(
      { x: 50, y: 50 },
      { x: 50, y: 250 },
      wallP1,
      wallP2
    );
    expect(noIntersection).toBe(false);
  });

  it('snaps wall endpoints to nearby vertices and grid nodes (Node Snapping)', () => {
    const walls: Wall[] = [
      {
        id: 'w1',
        p1: { x: 100, y: 100 },
        p2: { x: 200, y: 100 },
        wallType: 'wall',
      },
    ];

    // 1. Within 15px of vertex (100, 100) -> snaps to (100, 100)
    const snapVertex = findWallSnapPoint(107, 104, walls, 50, true, 15, false);
    expect(snapVertex.isSnapped).toBe(true);
    expect(snapVertex.x).toBe(100);
    expect(snapVertex.y).toBe(100);

    // 2. Far from wall vertex, near grid intersection (col 50, row 50) -> snaps to grid
    const snapGrid = findWallSnapPoint(48, 52, walls, 50, true, 15, false);
    expect(snapGrid.isSnapped).toBe(true);
    expect(snapGrid.x).toBe(50);
    expect(snapGrid.y).toBe(50);

    // 3. Alt held -> bypasses snapping
    const bypassSnap = findWallSnapPoint(107, 104, walls, 50, true, 15, true);
    expect(bypassSnap.isSnapped).toBe(false);
    expect(bypassSnap.x).toBe(107);
    expect(bypassSnap.y).toBe(104);
  });
});
