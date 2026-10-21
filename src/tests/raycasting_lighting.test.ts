import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRaySegmentIntersection,
  computeRayClosestIntersection,
  computeVisibilityPolygon,
  feetToPixels,
  pixelsToFeet,
  createLightFromPreset,
  DND_LIGHT_PRESETS,
  AMBIENT_LIGHT_CONFIG,
  getFlickerFactor,
  hexToRgba,
  getTokenDarkvisionFeet,
} from '../engine/lightingEngine';
import { Wall, isWallBlockingVision } from '../types/map';
import { useMapStore } from '../store/mapStore';
import { useCombatStore } from '../store/combatStore';

describe('Raycasting and Dynamic Lighting Engine', () => {
  describe('Ray-Segment Intersections', () => {
    it('calculates direct perpendicular hit on a wall segment', () => {
      const origin = { x: 0, y: 0 };
      const rayDir = { x: 1, y: 0 };
      const p1 = { x: 100, y: -50 };
      const p2 = { x: 100, y: 50 };
      const maxDist = 200;

      const hit = checkRaySegmentIntersection(origin, rayDir, p1, p2, maxDist);

      expect(hit).not.toBeNull();
      expect(hit!.distance).toBeCloseTo(100, 2);
      expect(hit!.point.x).toBeCloseTo(100, 2);
      expect(hit!.point.y).toBeCloseTo(0, 2);
    });

    it('returns null when ray is parallel to the wall segment', () => {
      const origin = { x: 0, y: 0 };
      const rayDir = { x: 1, y: 0 };
      const p1 = { x: 50, y: 50 };
      const p2 = { x: 150, y: 50 };
      const maxDist = 200;

      const hit = checkRaySegmentIntersection(origin, rayDir, p1, p2, maxDist);
      expect(hit).toBeNull();
    });

    it('returns null when wall is behind the ray origin', () => {
      const origin = { x: 0, y: 0 };
      const rayDir = { x: 1, y: 0 };
      const p1 = { x: -100, y: -50 };
      const p2 = { x: -100, y: 50 };
      const maxDist = 200;

      const hit = checkRaySegmentIntersection(origin, rayDir, p1, p2, maxDist);
      expect(hit).toBeNull();
    });

    it('returns null when wall is further than maxDistance', () => {
      const origin = { x: 0, y: 0 };
      const rayDir = { x: 1, y: 0 };
      const p1 = { x: 300, y: -50 };
      const p2 = { x: 300, y: 50 };
      const maxDist = 200;

      const hit = checkRaySegmentIntersection(origin, rayDir, p1, p2, maxDist);
      expect(hit).toBeNull();
    });

    it('selects the closest intersection when multiple walls lie along ray path', () => {
      const origin = { x: 0, y: 0 };
      const angle = 0; // pointing along +X axis
      const maxRadius = 300;

      const wallNear: Wall = {
        id: 'wall-near',
        p1: { x: 100, y: -50 },
        p2: { x: 100, y: 50 },
        wallType: 'wall',
        blocksVision: true,
      };

      const wallFar: Wall = {
        id: 'wall-far',
        p1: { x: 200, y: -50 },
        p2: { x: 200, y: 50 },
        wallType: 'wall',
        blocksVision: true,
      };

      const hit = computeRayClosestIntersection(origin, angle, maxRadius, [wallFar, wallNear]);
      expect(hit.x).toBeCloseTo(100, 2);
      expect(hit.y).toBeCloseTo(0, 2);
    });
  });

  describe('Visibility Polygon Construction', () => {
    it('creates a full circular polygon in open space without walls', () => {
      const origin = { x: 200, y: 200 };
      const radius = 100;
      const walls: Wall[] = [];

      const poly = computeVisibilityPolygon(origin, radius, walls, 36);

      expect(poly.length).toBeGreaterThanOrEqual(36);
      for (const pt of poly) {
        const dist = Math.hypot(pt.x - origin.x, pt.y - origin.y);
        expect(dist).toBeCloseTo(radius, 1);
      }
    });

    it('casts realistic shadow behind an occluding wall', () => {
      const origin = { x: 0, y: 0 };
      const radius = 200;

      // Vertical wall at x = 100 from y = -50 to y = 50
      const wall: Wall = {
        id: 'wall-1',
        p1: { x: 100, y: -50 },
        p2: { x: 100, y: 50 },
        wallType: 'wall',
        blocksVision: true,
      };

      const poly = computeVisibilityPolygon(origin, radius, [wall], 72);

      // Ray directly at angle 0 (+X) must hit wall at x = 100, not reach radius 200
      const rayAtZero = computeRayClosestIntersection(origin, 0, radius, [wall]);
      expect(rayAtZero.x).toBeCloseTo(100, 2);
      expect(rayAtZero.y).toBeCloseTo(0, 2);

      // Points facing the wall must not extend beyond x = 100
      const wallFacingPoints = poly.filter((pt) => {
        const angle = Math.atan2(pt.y - origin.y, pt.x - origin.x);
        return angle > -0.4 && angle < 0.4;
      });

      expect(wallFacingPoints.length).toBeGreaterThan(0);
      for (const pt of wallFacingPoints) {
        expect(pt.x).toBeLessThanOrEqual(100.01);
      }

      // Opposite direction (-X) must reach full radius 200
      const rayOpposite = computeRayClosestIntersection(origin, Math.PI, radius, [wall]);
      expect(rayOpposite.x).toBeCloseTo(-200, 1);
    });

    it('returns empty array if radius is zero or negative', () => {
      const polyZero = computeVisibilityPolygon({ x: 0, y: 0 }, 0, []);
      const polyNegative = computeVisibilityPolygon({ x: 0, y: 0 }, -50, []);
      expect(polyZero).toEqual([]);
      expect(polyNegative).toEqual([]);
    });
  });

  describe('Barrier Properties and Optical Transparency', () => {
    it('verifies standard walls and closed doors block vision', () => {
      const wall: Wall = {
        id: 'w1',
        p1: { x: 0, y: 0 },
        p2: { x: 10, y: 0 },
        wallType: 'wall',
      };
      expect(isWallBlockingVision(wall)).toBe(true);

      const closedDoor: Wall = {
        id: 'd1',
        p1: { x: 0, y: 0 },
        p2: { x: 10, y: 0 },
        wallType: 'door',
        doorState: 'closed',
      };
      expect(isWallBlockingVision(closedDoor)).toBe(true);

      const lockedDoor: Wall = {
        id: 'd2',
        p1: { x: 0, y: 0 },
        p2: { x: 10, y: 0 },
        wallType: 'door',
        doorState: 'locked',
      };
      expect(isWallBlockingVision(lockedDoor)).toBe(true);
    });

    it('verifies windows and open doors pass light and vision', () => {
      const openDoor: Wall = {
        id: 'd-open',
        p1: { x: 0, y: 0 },
        p2: { x: 10, y: 0 },
        wallType: 'door',
        doorState: 'open',
      };
      expect(isWallBlockingVision(openDoor)).toBe(false);

      const windowBarrier: Wall = {
        id: 'win1',
        p1: { x: 0, y: 0 },
        p2: { x: 10, y: 0 },
        wallType: 'window',
      };
      expect(isWallBlockingVision(windowBarrier)).toBe(false);

      const etherealBarrier: Wall = {
        id: 'eth1',
        p1: { x: 0, y: 0 },
        p2: { x: 10, y: 0 },
        wallType: 'ethereal',
      };
      expect(isWallBlockingVision(etherealBarrier)).toBe(false);
    });

    it('allows light rays to pass unimpeded through open doors and windows', () => {
      const origin = { x: 0, y: 0 };
      const radius = 200;

      const openDoor: Wall = {
        id: 'd-open-1',
        p1: { x: 100, y: -50 },
        p2: { x: 100, y: 50 },
        wallType: 'door',
        doorState: 'open',
      };

      const polyWithOpenDoor = computeVisibilityPolygon(origin, radius, [openDoor], 36);

      // Because open door does not block vision, rays should reach full radius
      for (const pt of polyWithOpenDoor) {
        const dist = Math.hypot(pt.x - origin.x, pt.y - origin.y);
        expect(dist).toBeCloseTo(radius, 1);
      }

      const windowBarrier: Wall = {
        id: 'win-1',
        p1: { x: 100, y: -50 },
        p2: { x: 100, y: 50 },
        wallType: 'window',
      };

      const polyWithWindow = computeVisibilityPolygon(origin, radius, [windowBarrier], 36);
      for (const pt of polyWithWindow) {
        const dist = Math.hypot(pt.x - origin.x, pt.y - origin.y);
        expect(dist).toBeCloseTo(radius, 1);
      }
    });
  });

  describe('D&D Light Presets and Configuration', () => {
    it('contains all required D&D lighting presets', () => {
      const presetIds = DND_LIGHT_PRESETS.map((p) => p.id);
      expect(presetIds).toContain('torch');
      expect(presetIds).toContain('lantern_hooded');
      expect(presetIds).toContain('candle');
      expect(presetIds).toContain('spell_light');
      expect(presetIds).toContain('campfire');
    });

    it('correctly creates light source from torch preset', () => {
      const torch = createLightFromPreset('torch', 150, 250);
      expect(torch.brightRadiusFeet).toBe(20);
      expect(torch.dimRadiusFeet).toBe(40);
      expect(torch.flicker).toBe(true);
      expect(torch.color).toBe('#FFA726');
      expect(torch.x).toBe(150);
      expect(torch.y).toBe(250);
      expect(torch.enabled).toBe(true);
    });

    it('correctly creates light source from lantern preset', () => {
      const lantern = createLightFromPreset('lantern_hooded', 100, 100);
      expect(lantern.brightRadiusFeet).toBe(30);
      expect(lantern.dimRadiusFeet).toBe(60);
      expect(lantern.flicker).toBe(false);
      expect(lantern.color).toBe('#FFF8E1');
    });

    it('correctly creates light source from candle preset', () => {
      const candle = createLightFromPreset('candle', 50, 50);
      expect(candle.brightRadiusFeet).toBe(5);
      expect(candle.dimRadiusFeet).toBe(10);
      expect(candle.flicker).toBe(true);
    });

    it('correctly creates light source from spell_light preset', () => {
      const spell = createLightFromPreset('spell_light', 0, 0);
      expect(spell.brightRadiusFeet).toBe(20);
      expect(spell.dimRadiusFeet).toBe(40);
      expect(spell.color).toBe('#E0F2FE');
      expect(spell.flicker).toBe(false);
    });

    it('correctly creates light source from campfire preset', () => {
      const fire = createLightFromPreset('campfire', 300, 300);
      expect(fire.brightRadiusFeet).toBe(30);
      expect(fire.dimRadiusFeet).toBe(60);
      expect(fire.color).toBe('#FF7043');
      expect(fire.flicker).toBe(true);
    });

    it('falls back to torch when unknown preset ID is provided', () => {
      const fallback = createLightFromPreset('unknown_preset', 0, 0);
      expect(fallback.brightRadiusFeet).toBe(20);
      expect(fallback.dimRadiusFeet).toBe(40);
      expect(fallback.color).toBe('#FFA726');
    });
  });

  describe('Lighting and Token Attachment in mapStore', () => {
    beforeEach(() => {
      useMapStore.setState({
        lights: [],
        isLightingEnabled: false,
        ambientLightMode: 'daylight',
        ambientDarkness: 0.0,
        selectedLightId: null,
        mapTokens: [],
      });
      useCombatStore.setState({
        combatants: [],
      });
    });

    it('adds, updates, toggles, and removes lights', () => {
      const store = useMapStore.getState();

      const lightId = store.addLight({
        x: 100,
        y: 150,
        brightRadiusFeet: 20,
        dimRadiusFeet: 40,
        color: '#FFA726',
        intensity: 0.9,
        flicker: true,
        enabled: true,
      });

      expect(useMapStore.getState().lights.length).toBe(1);
      expect(useMapStore.getState().lights[0].id).toBe(lightId);

      // Update light
      useMapStore.getState().updateLight(lightId, { brightRadiusFeet: 30, color: '#3B82F6' });
      expect(useMapStore.getState().lights[0].brightRadiusFeet).toBe(30);
      expect(useMapStore.getState().lights[0].color).toBe('#3B82F6');

      // Toggle light
      useMapStore.getState().toggleLight(lightId);
      expect(useMapStore.getState().lights[0].enabled).toBe(false);

      useMapStore.getState().toggleLight(lightId);
      expect(useMapStore.getState().lights[0].enabled).toBe(true);

      // Remove light
      useMapStore.getState().removeLight(lightId);
      expect(useMapStore.getState().lights.length).toBe(0);
    });

    it('manages ambient light modes and darkness values', () => {
      const store = useMapStore.getState();

      store.setAmbientLightMode('daylight');
      expect(useMapStore.getState().ambientDarkness).toBe(AMBIENT_LIGHT_CONFIG.daylight.darkness);

      store.setAmbientLightMode('dim');
      expect(useMapStore.getState().ambientDarkness).toBe(AMBIENT_LIGHT_CONFIG.dim.darkness);

      store.setAmbientLightMode('night');
      expect(useMapStore.getState().ambientDarkness).toBe(AMBIENT_LIGHT_CONFIG.night.darkness);

      store.setAmbientLightMode('pitch_black');
      expect(useMapStore.getState().ambientDarkness).toBe(AMBIENT_LIGHT_CONFIG.pitch_black.darkness);

      store.setAmbientDarkness(0.72);
      expect(useMapStore.getState().ambientDarkness).toBe(0.72);
    });

    it('attaches light to standalone map token and syncs coordinates when token moves', () => {
      const store = useMapStore.getState();

      const tokenId = store.addMapToken({
        name: 'Разведчик',
        x: 200,
        y: 300,
        size: 'medium',
        isVisibleToPlayers: true,
      });

      const lightId = store.addLight({
        x: 0,
        y: 0,
        brightRadiusFeet: 20,
        dimRadiusFeet: 40,
        color: '#FFA726',
        intensity: 0.9,
        flicker: true,
        enabled: true,
      });

      // Attach light to token
      store.attachLightToToken(lightId, tokenId);
      expect(useMapStore.getState().lights[0].attachedTokenId).toBe(tokenId);
      expect(useMapStore.getState().lights[0].x).toBe(200);
      expect(useMapStore.getState().lights[0].y).toBe(300);

      // Move token
      store.updateMapToken(tokenId, { x: 450, y: 550 });
      expect(useMapStore.getState().mapTokens[0].x).toBe(450);
      expect(useMapStore.getState().mapTokens[0].y).toBe(550);

      // Attached light must have updated coordinates
      expect(useMapStore.getState().lights[0].x).toBe(450);
      expect(useMapStore.getState().lights[0].y).toBe(550);

      // Detach light from token
      store.detachLightFromToken(lightId);
      expect(useMapStore.getState().lights[0].attachedTokenId).toBeNull();

      // Moving token further must NOT affect detached light
      store.updateMapToken(tokenId, { x: 700, y: 800 });
      expect(useMapStore.getState().lights[0].x).toBe(450);
      expect(useMapStore.getState().lights[0].y).toBe(550);
    });

    it('syncs light attached to combatant via syncTokenAttachedLights', () => {
      const store = useMapStore.getState();
      const combatStore = useCombatStore.getState();

      const combatantId = 'combatant-fighter-1';
      combatStore.addCombatant({
        id: combatantId,
        name: 'Воин',
        tokenX: 150,
        tokenY: 250,
        hp: 30,
        maxHp: 30,
        ac: 16,
        isPlayer: true,
      });

      const lightId = store.addLight({
        x: 150,
        y: 250,
        brightRadiusFeet: 30,
        dimRadiusFeet: 60,
        color: '#FFF8E1',
        intensity: 1.0,
        flicker: false,
        attachedTokenId: combatantId,
        enabled: true,
      });

      // Sync position to new spot
      store.syncTokenAttachedLights(combatantId, 500, 600);

      const light = useMapStore.getState().lights.find((l) => l.id === lightId);
      expect(light).toBeDefined();
      expect(light!.x).toBe(500);
      expect(light!.y).toBe(600);
    });
  });

  describe('Lighting Calculation Utilities', () => {
    it('converts feet to pixels and pixels to feet accurately', () => {
      const cellSize = 50; // 5 ft = 50 px => 10 px/ft
      expect(feetToPixels(20, cellSize)).toBe(200);
      expect(feetToPixels(40, cellSize)).toBe(400);
      expect(pixelsToFeet(200, cellSize)).toBe(20);
      expect(pixelsToFeet(400, cellSize)).toBe(40);
    });

    it('generates consistent organic flicker factor within safe bounds', () => {
      const lightId = 'test-torch-light-123';
      const factor1 = getFlickerFactor(lightId, 1000);
      const factor2 = getFlickerFactor(lightId, 1050);

      expect(factor1).toBeGreaterThanOrEqual(0.9);
      expect(factor1).toBeLessThanOrEqual(1.1);
      expect(factor2).toBeGreaterThanOrEqual(0.9);
      expect(factor2).toBeLessThanOrEqual(1.1);
    });

    it('converts hex colors to rgba strings with alpha', () => {
      expect(hexToRgba('#FFA726', 0.5)).toBe('rgba(255, 167, 38, 0.5)');
      expect(hexToRgba('#FFF', 1)).toBe('rgba(255, 255, 255, 1)');
      expect(hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    });

    it('parses token darkvision from explicit property or statblock senses', () => {
      const tokenExplicit = { darkvisionFeet: 120 };
      expect(getTokenDarkvisionFeet(tokenExplicit)).toBe(120);

      const tokenRussianSenses = { statblock: { senses: 'темное зрение 60 фт., пассивное восприятие 14' } };
      expect(getTokenDarkvisionFeet(tokenRussianSenses)).toBe(60);

      const tokenEnglishSenses = { statblock: { senses: 'darkvision 60 ft., passive Perception 12' } };
      expect(getTokenDarkvisionFeet(tokenEnglishSenses)).toBe(60);

      const tokenNoVision = { statblock: { senses: 'пассивное восприятие 10' } };
      expect(getTokenDarkvisionFeet(tokenNoVision)).toBe(0);
    });
  });
});
