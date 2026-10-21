export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder';

export interface DamageComponent {
  amount: number;
  type: DamageType;
}

export type ConditionType =
  | 'Blinded'
  | 'Charmed'
  | 'Deafened'
  | 'Dazed'
  | 'Exhaustion'
  | 'Frightened'
  | 'Grappled'
  | 'Incapacitated'
  | 'Invisible'
  | 'Paralyzed'
  | 'Petrified'
  | 'Poisoned'
  | 'Prone'
  | 'Restrained'
  | 'Stunned'
  | 'Unconscious';

export interface ActiveCondition {
  type: ConditionType;
  level?: number; // strictly for Exhaustion (1..6)
  source?: string;
  durationRounds?: number;
  expiryRound?: number;
  triggerOn?: 'start_of_turn' | 'end_of_turn';
}

export type WeaponMasteryProperty =
  | 'Slow'
  | 'Topple'
  | 'Vex'
  | 'Sap'
  | 'Nick'
  | 'Push'
  | 'Graze'
  | 'Cleave';

export type CreatureSize =
  | 'Tiny'
  | 'Small'
  | 'Medium'
  | 'Large'
  | 'Huge'
  | 'Gargantuan';

export const CREATURE_SIZE_SCALE: Record<CreatureSize, number> = {
  Tiny: 0.6,
  Small: 0.85,
  Medium: 1.0,
  Large: 2.0,
  Huge: 3.0,
  Gargantuan: 4.0,
};

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface RollResult {
  d20_1: number;
  d20_2?: number;
  mode: RollMode;
  keptRoll: number;
  modifier: number;
  total: number;
  isNatural20: boolean;
  isNatural1: boolean;
}
