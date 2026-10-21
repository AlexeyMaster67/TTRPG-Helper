import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  DiceType,
  DiceTheme,
  ActivePhysicsDie,
  DieGeometryResult,
} from './types';
import {
  getDieGeometryData,
  determineTopFace,
  getRotationForTargetValue,
} from './diceGeometries';
import { createFaceMaterials } from './diceTextures';

export interface TrayDimensions {
  width: number; // X axis total width
  depth: number; // Z axis total depth
  height: number; // Y axis wall height
}

export class DicePhysicsWorld {
  public world: CANNON.World;
  public diceMaterial: CANNON.Material;
  public tableMaterial: CANNON.Material;
  public activeDice: ActivePhysicsDie[] = [];
  public scene: THREE.Scene;

  private trayBodies: CANNON.Body[] = [];

  constructor(scene: THREE.Scene, dimensions: TrayDimensions = { width: 26, depth: 18, height: 20 }) {
    this.scene = scene;

    // 1. Initialize Cannon World with realistic dice physics
    this.world = new CANNON.World();
    this.world.gravity.set(0, -45, 0);
    this.world.allowSleep = true;

    // 2. Physics Materials & Friction / Restitution
    this.diceMaterial = new CANNON.Material('dice');
    this.tableMaterial = new CANNON.Material('table');

    const diceTableContact = new CANNON.ContactMaterial(this.diceMaterial, this.tableMaterial, {
      friction: 0.35,
      restitution: 0.45,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 3,
    });

    const diceDiceContact = new CANNON.ContactMaterial(this.diceMaterial, this.diceMaterial, {
      friction: 0.25,
      restitution: 0.5,
    });

    this.world.addContactMaterial(diceTableContact);
    this.world.addContactMaterial(diceDiceContact);

    // 3. Build Invisible Tray Boundaries (Floor + 4 Walls + Ceiling)
    this.setupTray(dimensions);
  }

  private setupTray(dim: TrayDimensions) {
    const halfW = dim.width / 2;
    const halfD = dim.depth / 2;
    const halfH = dim.height / 2;
    const wallThick = 2;

    // Floor at y = 0 (top surface)
    const floorBody = new CANNON.Body({
      mass: 0,
      material: this.tableMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(halfW + 10, wallThick, halfD + 10)),
    });
    floorBody.position.set(0, -wallThick, 0);
    this.world.addBody(floorBody);
    this.trayBodies.push(floorBody);

    // Ceiling at y = dim.height
    const ceilingBody = new CANNON.Body({
      mass: 0,
      material: this.tableMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(halfW + 10, wallThick, halfD + 10)),
    });
    ceilingBody.position.set(0, dim.height + wallThick, 0);
    this.world.addBody(ceilingBody);
    this.trayBodies.push(ceilingBody);

    // Left Wall (-X)
    const leftWall = new CANNON.Body({
      mass: 0,
      material: this.tableMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(wallThick, halfH, halfD + 2)),
    });
    leftWall.position.set(-halfW - wallThick, halfH, 0);
    this.world.addBody(leftWall);
    this.trayBodies.push(leftWall);

    // Right Wall (+X)
    const rightWall = new CANNON.Body({
      mass: 0,
      material: this.tableMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(wallThick, halfH, halfD + 2)),
    });
    rightWall.position.set(halfW + wallThick, halfH, 0);
    this.world.addBody(rightWall);
    this.trayBodies.push(rightWall);

    // Far Wall (-Z)
    const farWall = new CANNON.Body({
      mass: 0,
      material: this.tableMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(halfW + 2, halfH, wallThick)),
    });
    farWall.position.set(0, halfH, -halfD - wallThick);
    this.world.addBody(farWall);
    this.trayBodies.push(farWall);

    // Near Wall (+Z)
    const nearWall = new CANNON.Body({
      mass: 0,
      material: this.tableMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(halfW + 2, halfH, wallThick)),
    });
    nearWall.position.set(0, halfH, halfD + wallThick);
    this.world.addBody(nearWall);
    this.trayBodies.push(nearWall);
  }

  public spawnDie(
    id: string,
    type: DiceType,
    targetValue?: number,
    theme: DiceTheme = 'classic',
    index = 0,
    totalDice = 1
  ): ActivePhysicsDie {
    const data: DieGeometryResult = getDieGeometryData(type);

    // Prepare face materials based on shape
    const shapeType =
      type === 'd6'
        ? 'square'
        : type === 'd10' || type === 'd100'
        ? 'kite'
        : type === 'd12'
        ? 'pentagon'
        : 'triangle';

    const labels = data.faces.map((f) => f.label);
    const materials = createFaceMaterials(labels, theme, shapeType);

    const mesh = new THREE.Mesh(data.geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Cannon rigid body
    const body = new CANNON.Body({
      mass: data.mass,
      shape: data.cannonShape,
      material: this.diceMaterial,
      linearDamping: 0.12,
      angularDamping: 0.12,
    });

    // Spread spawn positions across tray
    const offsetX = (index - (totalDice - 1) / 2) * 2.8 + (Math.random() - 0.5) * 1.5;
    const startY = 9 + Math.random() * 3 + index * 0.4;
    const startZ = -5 + (Math.random() - 0.5) * 3;

    body.position.set(offsetX, startY, startZ);

    // Random initial tumble spin
    const spinSpeed = 22 + Math.random() * 12;
    body.angularVelocity.set(
      (Math.random() - 0.5) * spinSpeed,
      (Math.random() - 0.5) * spinSpeed,
      (Math.random() - 0.5) * spinSpeed
    );

    // Random linear throw impulse towards center
    const throwX = -offsetX * 0.8 + (Math.random() - 0.5) * 8;
    const throwY = -12 - Math.random() * 8;
    const throwZ = 6 + Math.random() * 8;
    body.velocity.set(throwX, throwY, throwZ);

    // Random initial orientation
    body.quaternion.set(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    );
    body.quaternion.normalize();

    this.world.addBody(body);

    const activeDie: ActivePhysicsDie = {
      id,
      type,
      mesh,
      body,
      faces: data.faces,
      targetValue,
      currentValue: targetValue ?? 1,
      isSettled: false,
      settleTime: 0,
      initialThrowDuration: 0.85 + Math.random() * 0.35,
      elapsedTime: 0,
    };

    this.activeDice.push(activeDie);
    return activeDie;
  }

  public step(dt: number) {
    // Standard physics step
    const clampedDt = Math.min(dt, 0.033);
    this.world.step(1 / 60, clampedDt, 3);

    for (let i = 0; i < this.activeDice.length; i++) {
      const die = this.activeDice[i];
      die.elapsedTime += clampedDt;

      const body = die.body;
      const mesh = die.mesh;

      // Check speeds
      const linearSpeed = body.velocity.length();
      const angularSpeed = body.angularVelocity.length();

      // If targetValue is provided: after initial throw physics (bouncing off walls/floor),
      // seamlessly stabilize orientation to the target face as kinetic energy drops
      if (die.targetValue !== undefined && die.elapsedTime > die.initialThrowDuration) {
        if (linearSpeed < 3.5 || die.elapsedTime > 1.6) {
          const targetQuat = getRotationForTargetValue(die.targetValue, die.faces);
          const currentThreeQuat = new THREE.Quaternion(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
          );

          // Smooth slerp towards guaranteed target orientation
          const slerpFactor = Math.min(clampedDt * 8.0, 0.4);
          currentThreeQuat.slerp(targetQuat, slerpFactor);

          body.quaternion.set(
            currentThreeQuat.x,
            currentThreeQuat.y,
            currentThreeQuat.z,
            currentThreeQuat.w
          );

          // Damp remaining velocities
          body.angularVelocity.scale(0.85, body.angularVelocity);
          if (linearSpeed < 1.0) {
            body.velocity.scale(0.85, body.velocity);
          }
        }
      }

      // Sync Three.js Mesh with Cannon body
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);

      // Check if settled
      const isSlow = linearSpeed < 0.25 && angularSpeed < 0.35;
      const isNearFloor = body.position.y < 3.0;

      if ((isSlow && isNearFloor) || die.elapsedTime > 3.0) {
        die.settleTime += clampedDt;
        if (die.settleTime > 0.25 || die.elapsedTime > 3.2) {
          die.isSettled = true;
          // Determine final face result
          const topFace = determineTopFace(mesh.quaternion, die.faces);
          die.currentValue = die.targetValue ?? topFace.value;
        }
      } else {
        die.settleTime = 0;
      }
    }
  }

  public isAllSettled(): boolean {
    if (this.activeDice.length === 0) return true;
    return this.activeDice.every((d) => d.isSettled);
  }

  public getResults(): Array<{ id: string; type: DiceType; value: number }> {
    return this.activeDice.map((d) => ({
      id: d.id,
      type: d.type,
      value: d.currentValue,
    }));
  }

  public clear() {
    for (let i = 0; i < this.activeDice.length; i++) {
      const d = this.activeDice[i];
      this.world.removeBody(d.body);
      this.scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      if (Array.isArray(d.mesh.material)) {
        d.mesh.material.forEach((m) => m.dispose());
      } else {
        d.mesh.material.dispose();
      }
    }
    this.activeDice = [];
  }

  public destroy() {
    this.clear();
    for (const b of this.trayBodies) {
      this.world.removeBody(b);
    }
    this.trayBodies = [];
  }
}
