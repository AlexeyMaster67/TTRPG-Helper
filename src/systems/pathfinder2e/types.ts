/**
 * TTRPG Helper - Pathfinder 2e Rule Engine Types
 * Core definitions for 4 Degrees of Success, 3-Action Economy, MAP, and Conditions.
 */

import { RollContext } from '../../types/system';

export type Pf2eDegreeOfSuccess =
  | 'critical_success'
  | 'success'
  | 'failure'
  | 'critical_failure';

export type Pf2eActionCost = 1 | 2 | 3 | 'free' | 'reaction';

export type Pf2eConditionType =
  | 'frightened'
  | 'clumsy'
  | 'enfeebled'
  | 'drained'
  | 'stunned'
  | 'dying'
  | 'wounded'
  | 'doomed'
  | 'grabbed'
  | 'prone'
  | 'off_guard'
  | 'fatigued';

export interface Pf2eRollContext extends RollContext {
  /** Deterministic override for the d20 roll */
  rollOverride?: number;
  /** Action cost of the action (1, 2, 3, free, reaction) */
  actionCost?: Pf2eActionCost;
  /** Attack sequence number in current turn (1 = first, 2 = second, 3+ = third) */
  attackNumber?: number;
  /** Whether the attack uses a weapon or strike with the Agile trait */
  isAgile?: boolean;
  /** Specific check type for applying condition penalties */
  checkType?: 'perception' | 'stealth' | 'attack' | 'athletics' | 'acrobatics' | 'fortitude' | 'reflex' | 'will' | string;
  /** Stat driving the check ('str', 'dex', 'con', 'int', 'wis', 'cha') */
  statKey?: string;
}

export interface Pf2eDamageOptions {
  isCriticalHit?: boolean;
  traits?: string[];
  weaknessMultiplier?: number;
}
