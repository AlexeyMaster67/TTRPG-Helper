import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export type DiceTheme = 'classic' | 'ruby' | 'bone';

export interface DieFaceDef {
  index: number;
  value: number;
  label: string;
  normal: THREE.Vector3; // Unit normal in local space pointing outward
  oppositeFaceIndex?: number; // For d4 or antipodal faces
}

export interface DieGeometryResult {
  geometry: THREE.BufferGeometry;
  cannonShape: CANNON.Shape;
  faces: DieFaceDef[];
  radius: number;
  mass: number;
}

export interface RollSingleDieRequest {
  id: string;
  sides: number;
  targetValue?: number;
}

export interface RollBatchRequest {
  id: string;
  dice: RollSingleDieRequest[];
  title?: string;
  total?: number;
  isSecret?: boolean;
  theme?: DiceTheme;
  timestamp: number;
}

export interface ActivePhysicsDie {
  id: string;
  type: DiceType;
  mesh: THREE.Mesh;
  body: CANNON.Body;
  faces: DieFaceDef[];
  targetValue?: number;
  currentValue: number;
  isSettled: boolean;
  settleTime: number;
  initialThrowDuration: number;
  elapsedTime: number;
}
