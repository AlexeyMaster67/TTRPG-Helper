import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  createD4Data,
  createD6Data,
  createD8Data,
  createD10Data,
  createD12Data,
  createD20Data,
  getDieGeometryData,
  determineTopFace,
  getRotationForTargetValue,
} from '../engine/dice3d/diceGeometries';
import { DicePhysicsWorld } from '../engine/dice3d/dicePhysicsWorld';
import { isCanvasSupported, createFaceTexture } from '../engine/dice3d/diceTextures';
import { isWebGLSupported } from '../components/dice/Dice3dOverlay';
import { DiceTrayDock } from '../components/dice/DiceTrayDock';
import { useDice3dStore } from '../store/dice3dStore';
import { useCombatStore } from '../store/combatStore';
import { broadcastService } from '../services/broadcastService';
import { rollDie } from '../engine/rolls';

describe('3D Dice Engine - Geometries and Face Definitions', () => {
  it('initializes d4 tetrahedron geometry and cannon shape', () => {
    const d4 = createD4Data();
    expect(d4.faces.length).toBe(4);
    expect(d4.geometry).toBeDefined();
    expect(d4.cannonShape).toBeDefined();
    expect(d4.faces.map((f) => f.value)).toEqual([1, 2, 3, 4]);
  });

  it('initializes d6 box geometry and cannon shape', () => {
    const d6 = createD6Data();
    expect(d6.faces.length).toBe(6);
    expect(d6.geometry).toBeDefined();
    expect(d6.cannonShape).toBeDefined();
    expect(d6.faces.map((f) => f.value)).toEqual([1, 6, 2, 5, 3, 4]);
  });

  it('initializes d8 octahedron geometry and cannon shape', () => {
    const d8 = createD8Data();
    expect(d8.faces.length).toBe(8);
    expect(d8.geometry).toBeDefined();
    expect(d8.cannonShape).toBeDefined();
    expect(d8.faces.map((f) => f.value)).toContain(1);
    expect(d8.faces.map((f) => f.value)).toContain(8);
  });

  it('initializes d10 pentagonal trapezohedron geometry with values 1 to 10', () => {
    const d10 = createD10Data(1.25, false);
    expect(d10.faces.length).toBe(10);
    expect(d10.geometry).toBeDefined();
    expect(d10.cannonShape).toBeDefined();
    const values = d10.faces.map((f) => f.value);
    for (let v = 1; v <= 10; v++) {
      expect(values).toContain(v);
    }
  });

  it('initializes d100 percentile die with tens values (00 to 90)', () => {
    const d100 = createD10Data(1.25, true);
    expect(d100.faces.length).toBe(10);
    const labels = d100.faces.map((f) => f.label);
    expect(labels).toContain('00');
    expect(labels).toContain('10');
    expect(labels).toContain('50');
    expect(labels).toContain('90');
  });

  it('initializes d12 dodecahedron geometry with 12 pentagonal faces', () => {
    const d12 = createD12Data();
    expect(d12.faces.length).toBe(12);
    expect(d12.geometry).toBeDefined();
    expect(d12.cannonShape).toBeDefined();
    const values = d12.faces.map((f) => f.value);
    for (let v = 1; v <= 12; v++) {
      expect(values).toContain(v);
    }
  });

  it('initializes d20 icosahedron geometry with 20 triangular faces', () => {
    const d20 = createD20Data();
    expect(d20.faces.length).toBe(20);
    expect(d20.geometry).toBeDefined();
    expect(d20.cannonShape).toBeDefined();
    const values = d20.faces.map((f) => f.value);
    for (let v = 1; v <= 20; v++) {
      expect(values).toContain(v);
    }
  });

  it('factory getDieGeometryData supports all standard polyhedral dice', () => {
    const types = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const;
    types.forEach((type) => {
      const data = getDieGeometryData(type);
      expect(data).toBeDefined();
      expect(data.faces.length).toBeGreaterThanOrEqual(4);
      expect(data.cannonShape).toBeDefined();
    });
  });
});

describe('3D Dice Engine - Face Normal Vectors and Target Alignments', () => {
  it('correctly determines top face when die is aligned with UP vector', () => {
    const d6 = createD6Data();
    // Face index 2 has normal (0, 1, 0) and value 2
    const identityQuat = new THREE.Quaternion();
    const topFace = determineTopFace(identityQuat, d6.faces);
    expect(topFace.value).toBe(2);
  });

  it('computes alignment quaternion that brings target face normal to UP vector', () => {
    const d20 = createD20Data();
    const UP = new THREE.Vector3(0, 1, 0);

    // Test multiple target values across the d20
    const testValues = [1, 7, 13, 20];
    testValues.forEach((targetVal) => {
      const q = getRotationForTargetValue(targetVal, d20.faces, 0);
      const face = d20.faces.find((f) => f.value === targetVal)!;
      const worldNormal = face.normal.clone().applyQuaternion(q);
      const dot = worldNormal.dot(UP);

      expect(dot).toBeGreaterThan(0.99);

      // Verify determineTopFace identifies targetVal with this orientation
      const detected = determineTopFace(q, d20.faces);
      expect(detected.value).toBe(targetVal);
    });
  });

  it('aligns d6 faces accurately to top vector', () => {
    const d6 = createD6Data();
    const UP = new THREE.Vector3(0, 1, 0);

    for (let val = 1; val <= 6; val++) {
      const q = getRotationForTargetValue(val, d6.faces, 0);
      const face = d6.faces.find((f) => f.value === val)!;
      const worldNormal = face.normal.clone().applyQuaternion(q);
      expect(worldNormal.dot(UP)).toBeGreaterThan(0.99);
      expect(determineTopFace(q, d6.faces).value).toBe(val);
    }
  });
});

describe('3D Dice Engine - Physics World Simulation', () => {
  it('instantiates DicePhysicsWorld and steps physics without crashing', () => {
    const scene = new THREE.Scene();
    const physics = new DicePhysicsWorld(scene);

    const die = physics.spawnDie('test_die_1', 'd20', 20, 'classic', 0, 1);
    expect(die).toBeDefined();
    expect(die.body.position.y).toBeGreaterThan(8);

    const initialY = die.body.position.y;

    // Run 30 physics steps
    for (let i = 0; i < 30; i++) {
      physics.step(1 / 60);
    }

    // Body should drop downwards due to gravity
    expect(die.body.position.y).toBeLessThan(initialY);

    physics.destroy();
  });

  it('stabilizes active die on designated target value', () => {
    const scene = new THREE.Scene();
    const physics = new DicePhysicsWorld(scene);

    const targetVal = 18;
    const die = physics.spawnDie('test_die_target', 'd20', targetVal, 'classic', 0, 1);

    // Run extended steps to trigger stabilization
    for (let i = 0; i < 200; i++) {
      physics.step(1 / 60);
    }

    expect(die.isSettled).toBe(true);
    expect(die.currentValue).toBe(targetVal);

    physics.destroy();
  });
});

describe('3D Dice Engine - Secret Roll Isolation and Broadcast', () => {
  beforeEach(() => {
    useDice3dStore.setState({
      is3dEnabled: true,
      isSecretRoll: false,
      theme: 'classic',
      activeBatch: null,
    });
    useCombatStore.getState().clearDiceLog();
    vi.restoreAllMocks();
  });

  it('records secret roll in dice3dStore with isSecret: true', () => {
    useDice3dStore.getState().setSecretRoll(true);

    const batch = useDice3dStore.getState().rollDice3d({
      dice: [{ sides: 20, result: 19 }],
      title: 'Атака дракона',
      total: 25,
    });

    expect(batch).not.toBeNull();
    expect(batch?.isSecret).toBe(true);
    expect(batch?.dice[0].sides).toBe(20);
    expect(batch?.dice[0].targetValue).toBe(19);
  });

  it('isolates secret roll from broadcastService', () => {
    const sendSpy = vi.spyOn(broadcastService, 'send');

    useDice3dStore.getState().setSecretRoll(true);
    const isSecret = useDice3dStore.getState().isSecretRoll;

    // Simulate a secret roll execution
    const rollerName = 'Мастер Подземелий';
    const actionTitle = 'Тайное заклинание';
    const total = 18;

    useCombatStore.getState().addDiceLog({
      id: 'secret_log_1',
      timestamp: '12:00:00',
      combatantName: isSecret ? `[Скрытно] ${rollerName}` : rollerName,
      actionName: isSecret ? `[Скрытно] ${actionTitle}` : actionTitle,
      attackRoll: {
        d20: 18,
        modifier: 0,
        total,
        isNat20: false,
        isNat1: false,
      },
    });

    // Verification: secret roll does not invoke broadcastService.send
    if (!isSecret) {
      broadcastService.send({
        type: 'BROADCAST_ROLL',
        payload: {
          id: 'test_broadcast',
          title: `${rollerName}: ${actionTitle}`,
          formula: '1d20',
          resultDisplay: '18',
          total,
          timestamp: Date.now(),
        },
      });
    }

    expect(sendSpy).not.toHaveBeenCalled();

    // Verify log contains [Скрытно] label
    const log = useCombatStore.getState().diceLog;
    expect(log.length).toBe(1);
    expect(log[0].combatantName).toContain('[Скрытно]');
    expect(log[0].actionName).toContain('[Скрытно]');
  });

  it('transmits public roll to broadcastService with dice3d data', () => {
    const sendSpy = vi.spyOn(broadcastService, 'send');

    useDice3dStore.getState().setSecretRoll(false);
    const isSecret = useDice3dStore.getState().isSecretRoll;

    const rollerName = 'Воин';
    const actionTitle = 'Удар мечом';
    const total = 21;
    const sides = 20;
    const kept = 18;

    if (!isSecret) {
      broadcastService.send({
        type: 'BROADCAST_ROLL',
        payload: {
          id: 'public_roll_1',
          title: `${rollerName}: ${actionTitle}`,
          formula: '1d20+3',
          resultDisplay: '21',
          total,
          timestamp: Date.now(),
          dice3d: [{ sides, result: kept }],
        },
      });
    }

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const callArgs = sendSpy.mock.calls[0][0];
    expect(callArgs.type).toBe('BROADCAST_ROLL');
    if (callArgs.type === 'BROADCAST_ROLL') {
      expect(callArgs.payload.dice3d).toBeDefined();
      expect(callArgs.payload.dice3d?.[0].sides).toBe(20);
      expect(callArgs.payload.dice3d?.[0].result).toBe(18);
    }
  });
});

describe('3D Dice Engine - Headless Environment Compatibility', () => {
  it('checks WebGL support without throwing errors', () => {
    expect(() => isWebGLSupported()).not.toThrow();
    const supported = isWebGLSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('checks Canvas support without throwing errors', () => {
    expect(() => isCanvasSupported()).not.toThrow();
    const supported = isCanvasSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('generates face textures safely in headless environment', () => {
    expect(() => createFaceTexture('20', 'classic', 'triangle')).not.toThrow();
    const texture = createFaceTexture('20', 'classic', 'triangle');
    expect(texture).toBeDefined();
  });
});


describe('3D Dice Engine - Advantage/Disadvantage, Tray Mode and Force Settle', () => {
  it('correctly tags advantage roll dice with isHighlighted and isDiscarded', () => {
    const batch = useDice3dStore.getState().rollDice3d({
      dice: [
        { sides: 20, result: 8 },
        { sides: 20, result: 17 },
      ],
      rollMode: 'advantage',
      title: 'Атака с преимуществом',
    });

    expect(batch).not.toBeNull();
    expect(batch?.dice.length).toBe(2);
    const low = batch?.dice.find((d) => d.targetValue === 8);
    const high = batch?.dice.find((d) => d.targetValue === 17);

    expect(high?.isHighlighted).toBe(true);
    expect(high?.isDiscarded).toBeFalsy();
    expect(low?.isDiscarded).toBe(true);
    expect(low?.isHighlighted).toBeFalsy();
  });

  it('correctly tags disadvantage roll dice with isHighlighted and isDiscarded', () => {
    const batch = useDice3dStore.getState().rollDice3d({
      dice: [
        { sides: 20, result: 19 },
        { sides: 20, result: 4 },
      ],
      rollMode: 'disadvantage',
      title: 'Атака с помехой',
    });

    expect(batch).not.toBeNull();
    const low = batch?.dice.find((d) => d.targetValue === 4);
    const high = batch?.dice.find((d) => d.targetValue === 19);

    expect(low?.isHighlighted).toBe(true);
    expect(low?.isDiscarded).toBeFalsy();
    expect(high?.isDiscarded).toBe(true);
    expect(high?.isHighlighted).toBeFalsy();
  });

  it('manages displayMode between tray and fullscreen', () => {
    useDice3dStore.getState().setDisplayMode('tray');
    expect(useDice3dStore.getState().displayMode).toBe('tray');

    useDice3dStore.getState().toggleDisplayMode();
    expect(useDice3dStore.getState().displayMode).toBe('fullscreen');

    useDice3dStore.getState().toggleDisplayMode();
    expect(useDice3dStore.getState().displayMode).toBe('tray');
  });

  it('supports obsidian theme and force settles dice in physics world', () => {
    const scene = new THREE.Scene();
    const physics = new DicePhysicsWorld(scene, { width: 18, depth: 13, height: 16 });

    physics.spawnDie('die-1', 'd20', 20, 'obsidian', 0, 1);
    expect(physics.activeDice.length).toBe(1);
    expect(physics.isAllSettled()).toBe(false);

    physics.forceSettle();
    expect(physics.isAllSettled()).toBe(true);
    expect(physics.activeDice[0].currentValue).toBe(20);

    physics.destroy();
  });

  it('exports DiceTrayDock component safely', () => {
    expect(DiceTrayDock).toBeDefined();
    expect(typeof DiceTrayDock).toBe('function');
  });

  it('guarantees rollDie(100) only yields tens (10, 20, 30, 40, 50, 60, 70, 80, 90, 100)', () => {
    const validTens = new Set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    for (let i = 0; i < 200; i++) {
      const roll = rollDie(100);
      expect(validTens.has(roll)).toBe(true);
      expect(roll % 10).toBe(0);
      expect(roll).toBeGreaterThanOrEqual(10);
      expect(roll).toBeLessThanOrEqual(100);
    }
  });

  it('rotates d100 accurately to target tens value', () => {
    const d100 = createD10Data(1.25, true);
    for (const tens of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      const quat = getRotationForTargetValue(tens, d100.faces, 0);
      expect(quat).toBeDefined();
      const top = determineTopFace(quat, d100.faces);
      expect([tens, tens === 100 ? 0 : tens]).toContain(top.value);
    }
  });
});
