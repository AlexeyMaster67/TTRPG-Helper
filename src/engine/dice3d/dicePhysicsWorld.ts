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

interface ParticleEffect {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  life: number;
  maxLife: number;
}

export class DicePhysicsWorld {
  public world: CANNON.World;
  public diceMaterial: CANNON.Material;
  public tableMaterial: CANNON.Material;
  public activeDice: ActivePhysicsDie[] = [];
  public scene: THREE.Scene;

  private trayBodies: CANNON.Body[] = [];
  private particles: ParticleEffect[] = [];

  constructor(
    scene: THREE.Scene,
    dimensions: TrayDimensions = { width: 26, depth: 18, height: 20 }
  ) {
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

    // 3. Build Tray Boundaries
    this.setupTray(dimensions);
  }

  public reconfigureTray(dim: TrayDimensions) {
    for (const b of this.trayBodies) {
      this.world.removeBody(b);
    }
    this.trayBodies = [];
    this.setupTray(dim);
  }

  private setupTray(dim: TrayDimensions) {
    const halfW = dim.width / 2;
    const halfD = dim.depth / 2;
    const halfH = dim.height / 2;
    const wallThick = 2;

    // Floor at y = 0
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
    totalDice = 1,
    isDiscarded: boolean | { isDiscarded?: boolean; isHighlighted?: boolean } = false,
    isHighlighted = false
  ): ActivePhysicsDie {
    const effectiveDiscarded =
      typeof isDiscarded === 'object' && isDiscarded !== null
        ? !!isDiscarded.isDiscarded
        : !!isDiscarded;
    const effectiveHighlighted =
      typeof isDiscarded === 'object' && isDiscarded !== null
        ? !!isDiscarded.isHighlighted
        : !!isHighlighted;

    const data: DieGeometryResult = getDieGeometryData(type);

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
    const startY = 8 + Math.random() * 3 + index * 0.4;
    const startZ = -4 + (Math.random() - 0.5) * 3;

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
      isDiscarded: effectiveDiscarded,
      isHighlighted: effectiveHighlighted,
    };

    this.activeDice.push(activeDie);
    return activeDie;
  }

  public step(dt: number) {
    const clampedDt = Math.min(dt, 0.033);
    this.world.step(1 / 60, clampedDt, 3);

    // Update particles if any
    for (let pIdx = this.particles.length - 1; pIdx >= 0; pIdx--) {
      const p = this.particles[pIdx];
      p.life += clampedDt;
      const geom = p.points.geometry;
      const positions = geom.attributes.position.array as Float32Array;

      for (let i = 0; i < p.velocities.length; i++) {
        positions[i * 3 + 0] += p.velocities[i].x * clampedDt;
        positions[i * 3 + 1] += p.velocities[i].y * clampedDt;
        positions[i * 3 + 2] += p.velocities[i].z * clampedDt;
        p.velocities[i].y -= 9.8 * clampedDt; // slight gravity on sparks
      }
      geom.attributes.position.needsUpdate = true;

      const mat = p.points.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.scene.remove(p.points);
        geom.dispose();
        mat.dispose();
        this.particles.splice(pIdx, 1);
      }
    }

    for (let i = 0; i < this.activeDice.length; i++) {
      const die = this.activeDice[i];
      die.elapsedTime += clampedDt;

      const body = die.body;
      const mesh = die.mesh;

      const linearSpeed = body.velocity.length();
      const angularSpeed = body.angularVelocity.length();

      // Smooth target alignment after throw
      if (die.targetValue !== undefined && die.elapsedTime > die.initialThrowDuration) {
        if (linearSpeed < 3.5 || die.elapsedTime > 1.6) {
          const targetQuat = getRotationForTargetValue(die.targetValue, die.faces);
          const currentThreeQuat = new THREE.Quaternion(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
          );

          const slerpFactor = Math.min(clampedDt * 8.0, 0.4);
          currentThreeQuat.slerp(targetQuat, slerpFactor);

          body.quaternion.set(
            currentThreeQuat.x,
            currentThreeQuat.y,
            currentThreeQuat.z,
            currentThreeQuat.w
          );

          body.angularVelocity.scale(0.85, body.angularVelocity);
          if (linearSpeed < 1.0) {
            body.velocity.scale(0.85, body.velocity);
          }
        }
      }

      // Sync Mesh
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);

      // Check settled
      const isSlow = linearSpeed < 0.25 && angularSpeed < 0.35;
      const isNearFloor = body.position.y < 3.0;

      if ((isSlow && isNearFloor) || die.elapsedTime > 2.8) {
        die.settleTime += clampedDt;
        if (die.settleTime > 0.2 || die.elapsedTime > 3.0) {
          if (!die.isSettled) {
            die.isSettled = true;
            const topFace = determineTopFace(mesh.quaternion, die.faces);
            die.currentValue = die.targetValue ?? topFace.value;
            this.applySettleVisuals(die);
          }
        }
      } else {
        die.settleTime = 0;
      }
    }
  }

  public forceSettle() {
    for (let i = 0; i < this.activeDice.length; i++) {
      const die = this.activeDice[i];
      if (die.isSettled) continue;

      die.body.velocity.set(0, 0, 0);
      die.body.angularVelocity.set(0, 0, 0);
      die.body.position.y = 1.0;

      if (die.targetValue !== undefined) {
        const targetQuat = getRotationForTargetValue(die.targetValue, die.faces);
        die.body.quaternion.set(targetQuat.x, targetQuat.y, targetQuat.z, targetQuat.w);
        die.mesh.quaternion.copy(targetQuat);
        die.currentValue = die.targetValue;
      } else {
        const topFace = determineTopFace(die.mesh.quaternion, die.faces);
        die.currentValue = topFace.value;
      }

      die.mesh.position.set(die.body.position.x, die.body.position.y, die.body.position.z);
      die.isSettled = true;
      this.applySettleVisuals(die);
    }
  }

  private applySettleVisuals(die: ActivePhysicsDie) {
    const materials = Array.isArray(die.mesh.material) ? die.mesh.material : [die.mesh.material];

    if (die.isDiscarded) {
      materials.forEach((m) => {
        if ('opacity' in m && 'transparent' in m) {
          m.transparent = true;
          m.opacity = 0.32;
          m.needsUpdate = true;
        }
      });
    } else if (die.isHighlighted) {
      materials.forEach((m) => {
        if ('emissive' in m) {
          (m as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xf5b920);
          (m as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
          m.needsUpdate = true;
        }
      });
      this.spawnCritParticles(die.mesh.position, 'crit');
    }

    // Nat 20 particles
    if (die.type === 'd20' && die.currentValue === 20 && !die.isDiscarded) {
      this.spawnCritParticles(die.mesh.position, 'crit');
    } else if (die.type === 'd20' && die.currentValue === 1 && !die.isDiscarded) {
      this.spawnCritParticles(die.mesh.position, 'fail');
    }
  }

  public spawnCritParticles(origin: THREE.Vector3, type: 'crit' | 'fail') {
    if (typeof document === 'undefined') return;

    const count = type === 'crit' ? 36 : 20;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    const color = type === 'crit' ? 0xf5b920 : 0xe5484d;

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = origin.x;
      positions[i * 3 + 1] = origin.y + 0.5;
      positions[i * 3 + 2] = origin.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      const upSpeed = 4 + Math.random() * 6;

      velocities.push(
        new THREE.Vector3(
          Math.cos(angle) * speed,
          upSpeed,
          Math.sin(angle) * speed
        )
      );
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color,
      size: type === 'crit' ? 0.35 : 0.25,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geom, mat);
    this.scene.add(points);

    this.particles.push({
      points,
      velocities,
      life: 0,
      maxLife: 0.85,
    });
  }

  public isAllSettled(): boolean {
    if (this.activeDice.length === 0) return true;
    return this.activeDice.every((d) => d.isSettled);
  }

  public getResults(): Array<{ id: string; type: DiceType; value: number; isDiscarded?: boolean; isHighlighted?: boolean }> {
    return this.activeDice.map((d) => ({
      id: d.id,
      type: d.type,
      value: d.currentValue,
      isDiscarded: d.isDiscarded,
      isHighlighted: d.isHighlighted,
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

    for (const p of this.particles) {
      this.scene.remove(p.points);
      p.points.geometry.dispose();
      (p.points.material as THREE.Material).dispose();
    }
    this.particles = [];
  }

  public destroy() {
    this.clear();
    for (const b of this.trayBodies) {
      this.world.removeBody(b);
    }
    this.trayBodies = [];
  }
}
