/**
 * TTRPG Helper - Cyberpunk RED Rule Engine Types
 * Core system-specific structures, stats, damage zones, and wounded states.
 */

import { RollContext } from '../../types/system';

export type CyberpunkStatKey =
  | 'int'
  | 'ref'
  | 'dex'
  | 'tech'
  | 'cool'
  | 'will'
  | 'luck'
  | 'move'
  | 'body'
  | 'emp';

export type CyberpunkArmorZone = 'head' | 'body' | 'shield';

export type CyberpunkWoundState =
  | 'healthy'
  | 'light'
  | 'seriously_wounded'
  | 'mortally_wounded'
  | 'dead';

export interface CyberpunkRollContext extends RollContext {
  /** Deterministic override for the initial 1d10 roll */
  rollOverride?: number;
  /** Deterministic override for exploding 10 or fumbled 1 second 1d10 roll */
  critRollOverride?: number;
  /** Explicit skill bonus to add on top of creature stat */
  skillBonus?: number;
  /** Luck points spent to add to the roll (1:1 bonus) */
  luckSpend?: number;
  /** Whether the attack is an aimed headshot */
  isAimedHeadshot?: boolean;
}

export interface CyberpunkDeathSaveResult {
  roll: number;
  penalty: number;
  effectiveRoll: number;
  bodyStat: number;
  isSuccess: boolean;
  isDead: boolean;
  isCriticalFailure: boolean;
  details: string;
}

export interface CyberpunkArmorState {
  headSp: number;
  maxHeadSp: number;
  bodySp: number;
  maxBodySp: number;
}
