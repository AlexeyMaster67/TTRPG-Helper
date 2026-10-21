import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { DieFaceDef, DieGeometryResult, DiceType } from './types';

// Helper to convert non-indexed Three.js BufferGeometry to CANNON.ConvexPolyhedron
export function bufferGeometryToConvexPolyhedron(geometry: THREE.BufferGeometry): CANNON.ConvexPolyhedron {
  const position = geometry.attributes.position;
  const uniqueVerts: CANNON.Vec3[] = [];
  const faces: number[][] = [];

  function getOrAddVertex(v: THREE.Vector3): number {
    for (let i = 0; i < uniqueVerts.length; i++) {
      const u = uniqueVerts[i];
      const dx = u.x - v.x;
      const dy = u.y - v.y;
      const dz = u.z - v.z;
      if (dx * dx + dy * dy + dz * dz < 1e-6) {
        return i;
      }
    }
    uniqueVerts.push(new CANNON.Vec3(v.x, v.y, v.z));
    return uniqueVerts.length - 1;
  }

  for (let i = 0; i < position.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(position, i);
    const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);

    const ia = getOrAddVertex(a);
    const ib = getOrAddVertex(b);
    const ic = getOrAddVertex(c);

    // Skip degenerate triangles
    if (ia !== ib && ib !== ic && ia !== ic) {
      faces.push([ia, ib, ic]);
    }
  }

  return new CANNON.ConvexPolyhedron({
    vertices: uniqueVerts,
    faces,
  });
}

// ----------------------------------------------------------------------
// d4: Tetrahedron (4 faces)
// ----------------------------------------------------------------------
export function createD4Data(scale = 1.3): DieGeometryResult {
  const s = scale;
  const verts = [
    new THREE.Vector3(s, s, s),
    new THREE.Vector3(-s, -s, s),
    new THREE.Vector3(-s, s, -s),
    new THREE.Vector3(s, -s, -s),
  ];

  // 4 triangular faces in outward CCW order
  const faceVerts = [
    [verts[0], verts[2], verts[1]], // Face 0 (opposite to verts[3])
    [verts[0], verts[3], verts[2]], // Face 1 (opposite to verts[1])
    [verts[0], verts[1], verts[3]], // Face 2 (opposite to verts[2])
    [verts[1], verts[2], verts[3]], // Face 3 (opposite to verts[0])
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const faces: DieFaceDef[] = [];

  faceVerts.forEach((tri, fIdx) => {
    // Opposite vertex for top-point determination
    // In our indexing: Face 0 opp 3, Face 1 opp 1, Face 2 opp 2, Face 3 opp 0
    const oppVertIdx = fIdx === 0 ? 3 : fIdx === 1 ? 1 : fIdx === 2 ? 2 : 0;
    const vertexNormal = verts[oppVertIdx].clone().normalize();

    faces.push({
      index: fIdx,
      value: fIdx + 1,
      label: String(fIdx + 1),
      normal: vertexNormal, // Using top vertex vector as reading direction
      oppositeFaceIndex: fIdx,
    });

    tri.forEach((v) => {
      positions.push(v.x, v.y, v.z);
    });

    uvs.push(0.5, 0.95, 0.05, 0.15, 0.95, 0.15);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  for (let i = 0; i < 4; i++) {
    geometry.addGroup(i * 3, 3, i);
  }

  const cannonShape = bufferGeometryToConvexPolyhedron(geometry);

  return {
    geometry,
    cannonShape,
    faces,
    radius: scale,
    mass: 1.0,
  };
}

// ----------------------------------------------------------------------
// d6: Cube (6 faces)
// ----------------------------------------------------------------------
export function createD6Data(size = 1.7): DieGeometryResult {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const half = size / 2;

  // Face values opposite sum to 7:
  // 0: +X -> 1
  // 1: -X -> 6
  // 2: +Y -> 2
  // 3: -Y -> 5
  // 4: +Z -> 3
  // 5: -Z -> 4
  const faces: DieFaceDef[] = [
    { index: 0, value: 1, label: '1', normal: new THREE.Vector3(1, 0, 0) },
    { index: 1, value: 6, label: '6', normal: new THREE.Vector3(-1, 0, 0) },
    { index: 2, value: 2, label: '2', normal: new THREE.Vector3(0, 1, 0) },
    { index: 3, value: 5, label: '5', normal: new THREE.Vector3(0, -1, 0) },
    { index: 4, value: 3, label: '3', normal: new THREE.Vector3(0, 0, 1) },
    { index: 5, value: 4, label: '4', normal: new THREE.Vector3(0, 0, -1) },
  ];

  const cannonShape = new CANNON.Box(new CANNON.Vec3(half, half, half));

  return {
    geometry,
    cannonShape,
    faces,
    radius: half * 1.414,
    mass: 1.2,
  };
}

// ----------------------------------------------------------------------
// d8: Octahedron (8 faces)
// ----------------------------------------------------------------------
export function createD8Data(radius = 1.35): DieGeometryResult {
  const baseGeom = new THREE.OctahedronGeometry(radius, 0);
  const posAttr = baseGeom.attributes.position;
  const positions: number[] = [];
  const uvs: number[] = [];
  const faces: DieFaceDef[] = [];

  const values = [1, 8, 2, 7, 3, 6, 4, 5];

  for (let i = 0; i < posAttr.count; i += 3) {
    const fIdx = i / 3;
    const a = new THREE.Vector3().fromBufferAttribute(posAttr, i);
    const b = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2);

    const normal = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a))
      .normalize();

    // Ensure normal points away from origin
    const center = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    if (normal.dot(center) < 0) {
      normal.negate();
    }

    const val = values[fIdx] || fIdx + 1;
    faces.push({
      index: fIdx,
      value: val,
      label: String(val),
      normal,
    });

    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    uvs.push(0.5, 0.95, 0.05, 0.15, 0.95, 0.15);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  for (let i = 0; i < 8; i++) {
    geometry.addGroup(i * 3, 3, i);
  }

  const cannonShape = bufferGeometryToConvexPolyhedron(geometry);

  return {
    geometry,
    cannonShape,
    faces,
    radius,
    mass: 1.1,
  };
}

// ----------------------------------------------------------------------
// d10 / d100: Pentagonal Trapezohedron (10 faces)
// ----------------------------------------------------------------------
export function createD10Data(radius = 1.25, isD100 = false): DieGeometryResult {
  const R = radius;
  const H = radius * 1.35;
  const h = radius * 0.16;

  const top = new THREE.Vector3(0, H, 0);
  const bot = new THREE.Vector3(0, -H, 0);
  const U: THREE.Vector3[] = [];
  const L: THREE.Vector3[] = [];

  for (let i = 0; i < 5; i++) {
    const aU = (i * 2 * Math.PI) / 5;
    const aL = ((i + 0.5) * 2 * Math.PI) / 5;
    U.push(new THREE.Vector3(R * Math.cos(aU), h, R * Math.sin(aU)));
    L.push(new THREE.Vector3(R * Math.cos(aL), -h, R * Math.sin(aL)));
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const faces: DieFaceDef[] = [];

  // Values sequence
  const d10Values = [1, 10, 2, 9, 3, 8, 4, 7, 5, 6];
  const d100Labels = ['00', '90', '10', '80', '20', '70', '30', '60', '40', '50'];
  const d100Values = [100, 90, 10, 80, 20, 70, 30, 60, 40, 50];

  // Top 5 kites (indices 0..4)
  for (let i = 0; i < 5; i++) {
    const u1 = U[i];
    const l1 = L[i];
    const u2 = U[(i + 1) % 5];

    // Triangle 1: (top, u2, l1)
    // Triangle 2: (top, l1, u1)
    positions.push(top.x, top.y, top.z, u2.x, u2.y, u2.z, l1.x, l1.y, l1.z);
    uvs.push(0.5, 0.95, 0.92, 0.55, 0.5, 0.05);

    positions.push(top.x, top.y, top.z, l1.x, l1.y, l1.z, u1.x, u1.y, u1.z);
    uvs.push(0.5, 0.95, 0.5, 0.05, 0.08, 0.55);

    const edge1 = new THREE.Vector3().subVectors(u2, top);
    const edge2 = new THREE.Vector3().subVectors(l1, top);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    const val = isD100 ? d100Values[i] : d10Values[i];
    const lbl = isD100 ? d100Labels[i] : String(val);

    faces.push({
      index: i,
      value: val,
      label: lbl,
      normal,
    });
  }

  // Bottom 5 kites (indices 5..9)
  for (let i = 0; i < 5; i++) {
    const l1 = L[i];
    const u2 = U[(i + 1) % 5];
    const l2 = L[(i + 1) % 5];

    // Triangle 1: (bot, l1, u2)
    // Triangle 2: (bot, u2, l2)
    positions.push(bot.x, bot.y, bot.z, l1.x, l1.y, l1.z, u2.x, u2.y, u2.z);
    uvs.push(0.5, 0.05, 0.08, 0.45, 0.5, 0.95);

    positions.push(bot.x, bot.y, bot.z, u2.x, u2.y, u2.z, l2.x, l2.y, l2.z);
    uvs.push(0.5, 0.05, 0.5, 0.95, 0.92, 0.45);

    const edge1 = new THREE.Vector3().subVectors(l1, bot);
    const edge2 = new THREE.Vector3().subVectors(u2, bot);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    const idx = 5 + i;
    const val = isD100 ? d100Values[idx] : d10Values[idx];
    const lbl = isD100 ? d100Labels[idx] : String(val);

    faces.push({
      index: idx,
      value: val,
      label: lbl,
      normal,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  for (let i = 0; i < 10; i++) {
    geometry.addGroup(i * 6, 6, i);
  }

  const cannonShape = bufferGeometryToConvexPolyhedron(geometry);

  return {
    geometry,
    cannonShape,
    faces,
    radius: H,
    mass: 1.15,
  };
}

// ----------------------------------------------------------------------
// d12: Dodecahedron (12 pentagonal faces)
// ----------------------------------------------------------------------
export function createD12Data(radius = 1.35): DieGeometryResult {
  const baseGeom = new THREE.DodecahedronGeometry(radius, 0);
  const posAttr = baseGeom.attributes.position;
  const uniqueNormals: THREE.Vector3[] = [];
  const triangleFaceMap: number[] = [];

  for (let i = 0; i < posAttr.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(posAttr, i);
    const b = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2);

    const normal = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a))
      .normalize();

    let foundIdx = uniqueNormals.findIndex((un) => un.dot(normal) > 0.98);
    if (foundIdx === -1) {
      uniqueNormals.push(normal);
      foundIdx = uniqueNormals.length - 1;
    }
    triangleFaceMap.push(foundIdx);
  }

  const values = [1, 12, 2, 11, 3, 10, 4, 9, 5, 8, 6, 7];
  const faces: DieFaceDef[] = uniqueNormals.map((n, idx) => ({
    index: idx,
    value: values[idx] || idx + 1,
    label: String(values[idx] || idx + 1),
    normal: n,
  }));

  // Re-organize geometry into face groups
  const sortedPositions: number[] = [];
  const sortedUvs: number[] = [];

  const geometry = new THREE.BufferGeometry();

  for (let f = 0; f < faces.length; f++) {
    const normal = faces[f].normal;
    // Tangent axes for UV projection
    const upRef = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const tangentU = new THREE.Vector3().crossVectors(normal, upRef).normalize();
    const tangentV = new THREE.Vector3().crossVectors(normal, tangentU).normalize();

    let startVertex = sortedPositions.length / 3;
    let triCount = 0;

    for (let t = 0; t < triangleFaceMap.length; t++) {
      if (triangleFaceMap[t] === f) {
        triCount++;
        for (let vi = 0; vi < 3; vi++) {
          const v = new THREE.Vector3().fromBufferAttribute(posAttr, t * 3 + vi);
          sortedPositions.push(v.x, v.y, v.z);

          const u = 0.5 + (v.dot(tangentU) / (radius * 1.5));
          const w = 0.5 + (v.dot(tangentV) / (radius * 1.5));
          sortedUvs.push(Math.max(0.05, Math.min(0.95, u)), Math.max(0.05, Math.min(0.95, w)));
        }
      }
    }
    geometry.addGroup(startVertex, triCount * 3, f);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(sortedPositions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(sortedUvs, 2));
  geometry.computeVertexNormals();

  const cannonShape = bufferGeometryToConvexPolyhedron(geometry);

  return {
    geometry,
    cannonShape,
    faces,
    radius,
    mass: 1.25,
  };
}

// ----------------------------------------------------------------------
// d20: Icosahedron (20 triangular faces)
// ----------------------------------------------------------------------
export function createD20Data(radius = 1.45): DieGeometryResult {
  const baseGeom = new THREE.IcosahedronGeometry(radius, 0);
  const posAttr = baseGeom.attributes.position;
  const positions: number[] = [];
  const uvs: number[] = [];
  const faces: DieFaceDef[] = [];

  const d20Values = [
    20, 1, 14, 7, 18, 3, 16, 5, 12, 9,
    19, 2, 13, 8, 17, 4, 15, 6, 11, 10,
  ];

  for (let i = 0; i < posAttr.count; i += 3) {
    const fIdx = i / 3;
    const a = new THREE.Vector3().fromBufferAttribute(posAttr, i);
    const b = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2);

    const normal = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a))
      .normalize();

    const center = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    if (normal.dot(center) < 0) {
      normal.negate();
    }

    const val = d20Values[fIdx] || fIdx + 1;
    faces.push({
      index: fIdx,
      value: val,
      label: String(val),
      normal,
    });

    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    uvs.push(0.5, 0.95, 0.05, 0.15, 0.95, 0.15);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  for (let i = 0; i < 20; i++) {
    geometry.addGroup(i * 3, 3, i);
  }

  const cannonShape = bufferGeometryToConvexPolyhedron(geometry);

  return {
    geometry,
    cannonShape,
    faces,
    radius,
    mass: 1.3,
  };
}

// ----------------------------------------------------------------------
// Factory Function by DiceType
// ----------------------------------------------------------------------
export function getDieGeometryData(type: DiceType): DieGeometryResult {
  switch (type) {
    case 'd4':
      return createD4Data();
    case 'd6':
      return createD6Data();
    case 'd8':
      return createD8Data();
    case 'd10':
      return createD10Data(1.25, false);
    case 'd100':
      return createD10Data(1.25, true);
    case 'd12':
      return createD12Data();
    case 'd20':
      return createD20Data();
    default:
      return createD20Data();
  }
}

// ----------------------------------------------------------------------
// Physics Orientation & Face Detection
// ----------------------------------------------------------------------
export function determineTopFace(
  quaternion: THREE.Quaternion | CANNON.Quaternion,
  faces: DieFaceDef[]
): DieFaceDef {
  const threeQuat =
    quaternion instanceof THREE.Quaternion
      ? quaternion
      : new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

  const UP = new THREE.Vector3(0, 1, 0);
  let bestFace = faces[0];
  let maxDot = -Infinity;

  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const worldNormal = f.normal.clone().applyQuaternion(threeQuat);
    const dot = worldNormal.dot(UP);
    if (dot > maxDot) {
      maxDot = dot;
      bestFace = f;
    }
  }

  return bestFace;
}

export function getRotationForTargetValue(
  targetValue: number,
  faces: DieFaceDef[],
  randomYaw = Math.random() * Math.PI * 2
): THREE.Quaternion {
  const targetFace =
    faces.find(
      (f) =>
        f.value === targetValue ||
        (targetValue === 100 && (f.value === 100 || f.value === 0 || f.label === '00')) ||
        (targetValue === 0 && (f.value === 100 || f.value === 0 || f.label === '00'))
    ) || faces[0];
  const UP = new THREE.Vector3(0, 1, 0);

  const qAlign = new THREE.Quaternion().setFromUnitVectors(targetFace.normal, UP);
  const qYaw = new THREE.Quaternion().setFromAxisAngle(UP, randomYaw);

  return qYaw.multiply(qAlign);
}
