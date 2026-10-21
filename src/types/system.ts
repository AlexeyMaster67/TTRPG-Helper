/**
 * TTRPG Helper - Multi-System Core TypeScript Interfaces
 * Corresponds to Rust `crate::systems` architecture.
 */

export type SystemFamily = 'dnd5e' | 'pathfinder' | 'cyberpunk' | 'custom';

export type SystemStatus = 'stable' | 'beta' | 'wip' | 'planned';

export type ActionEconomyType = 
  | 'action_bonus_reaction' // D&D 5e / 2024
  | 'three_action'          // Pathfinder 2e
  | 'move_and_action'       // Cyberpunk RED
  | 'action_points';        // Universal / Fallout / Action point systems

export interface SystemFeatures {
  spellSlots: boolean;
  weaponMastery: boolean;
  armorAblation: boolean;
  degreesOfSuccess: boolean;
  deathSaveTrack: boolean;
  humanityTrack: boolean;
  actionEconomy: ActionEconomyType;
}

export interface SystemMetadata {
  id: string;
  name: string;
  shortName?: string;
  family: SystemFamily;
  edition: string;
  version: string;
  status: SystemStatus;
  themeId: string;
  description: string;
  shortDescription?: string;
  author?: string;
  supportedFeatures: SystemFeatures;
}

export interface ResourcePool {
  current: number;
  max: number;
  temp?: number;
  resetOn?: 'short_rest' | 'long_rest' | 'encounter' | 'dawn' | string;
}

export interface TrackStep {
  index: number;
  label: string;
  description?: string;
}

export interface Track {
  name: string;
  current: number;
  max: number;
  steps?: TrackStep[];
  currentLabel?: string;
}

export interface ConditionInstance {
  id: string;
  name: string;
  level?: number;
  source?: string;
  durationRounds?: number;
  expiryRound?: number;
  triggerOn?: string;
  notes?: string;
}

export interface CreatureDefenses {
  damageImmunities: string[];
  damageResistances: string[];
  damageVulnerabilities: string[];
  conditionImmunities: string[];
  damageReductions: Record<string, number>;
}

export interface CreatureAction {
  id: string;
  name: string;
  actionType: 'action' | 'bonus' | 'reaction' | 'free' | 'passive';
  attackBonus?: number;
  reachRange?: string;
  target?: string;
  hitDc?: number;
  saveStat?: string;
  damageDice?: string;
  damageBonus?: number;
  damageType?: string;
  description?: string;
  recharge?: string;
}

export interface UniversalCreature {
  id: string;
  name: string;
  systemId: string;
  systemVersion: string;
  isPlayer: boolean;
  avatarUrl?: string;

  // Generic core attributes
  stats: Record<string, number>;
  resources: Record<string, ResourcePool>;
  tracks: Record<string, Track>;
  conditions: ConditionInstance[];
  defenses: CreatureDefenses;
  actions: CreatureAction[];

  senses: Record<string, number | string>;
  speeds: Record<string, number>;
  notes: string;
  customFields: Record<string, unknown>;
}

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface RollContext {
  rollMode: RollMode;
  situationalBonus?: number;
  note?: string;
}

export interface InitiativeResult {
  total: number;
  rolledValue: number;
  bonus: number;
  tieBreaker: number;
}

export interface CheckResult {
  total: number;
  rolledValue: number;
  bonus: number;
  isCriticalSuccess: boolean;
  isCriticalFailure: boolean;
  degreeOfSuccess?: 'critical_success' | 'success' | 'failure' | 'critical_failure';
  margin?: number;
}

export interface HitCalculationResult {
  isHit: boolean;
  isCritical: boolean;
  isFumble: boolean;
  degree?: 'critical_success' | 'success' | 'failure' | 'critical_failure';
  details: string;
}

export interface DamageResolutionResult {
  hpDamage: number;
  tempHpAbsorbed: number;
  armorDamage: number;
  appliedToZone?: string;
  effectiveDamage: number;
  isCriticalWound: boolean;
  statusEffectsApplied: string[];
}

export interface SystemRuleEngine {
  metadata: SystemMetadata;

  calculateInitiative(creature: UniversalCreature, rollOverride?: number): InitiativeResult;
  resolveCheck(statKey: string, creature: UniversalCreature, dc?: number, context?: RollContext): CheckResult;
  calculateHit(attackRoll: number, target: UniversalCreature, isCritRoll?: boolean): HitCalculationResult;
  applyDamage(
    target: UniversalCreature,
    rawDamage: number,
    damageType: string,
    zone?: string
  ): { updatedCreature: UniversalCreature; result: DamageResolutionResult };

  applyRest?(
    creatures: UniversalCreature[],
    restType: 'short' | 'long' | 'encounter'
  ): UniversalCreature[];
}
