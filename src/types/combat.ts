import { ActiveCondition, CreatureSize, DamageType, CREATURE_SIZE_SCALE } from './dnd5e';
import { ParsedMonster } from './database';

export type ConditionTriggerOn = 'start_of_turn' | 'end_of_turn';

export interface CombatCondition extends ActiveCondition {
  durationRounds?: number;
  expiryRound?: number;
  triggerOn?: ConditionTriggerOn;
}

export type { ActiveCondition };

export interface Combatant {
  id: string;
  system_id?: string;
  system_version?: string;
  systemId?: string;
  systemVersion?: string;
  monsterDbId?: string;
  name: string;
  nameRu?: string;
  name_en?: string;
  cr?: string;
  creatureType?: string;
  creatureTypeRu?: string;
  size: CreatureSize;
  tokenScale: number; // Tiny: 0.6, Small: 0.85, Medium: 1.0, Large: 2.0, Huge: 3.0, Gargantuan: 4.0
  tokenUrl?: string;
  avatarUrl?: string;
  tokenX?: number;
  tokenY?: number;
  tokenVisibleToPlayers?: boolean;
  color: string;
  statblock?: ParsedMonster;
  
  // Health & Stats
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  
  // Initiative
  initiative: number;
  initBonus: number;
  passiveInit: number;
  speed: string;
  
  // Statuses
  conditions: ActiveCondition[];
  deathSaves: {
    successes: number; // max 3
    failures: number;  // max 3
  };
  isDying: boolean;
  isDead: boolean;
  isPlayer: boolean;
  
  // Actions & Concentration
  isConcentrating: boolean;
  concentratingSpell?: string;
  reactionUsed: boolean;
  legendaryActions: {
    current: number;
    max: number;
  };
  spellSlots?: Record<number, { max: number; used: number }>;
  
  // Defenses
  damageImmunities: DamageType[];
  damageResistances: DamageType[];
  damageVulnerabilities: DamageType[];
  conditionImmunities: string[];
}

export function createDefaultCombatant(
  partial: Partial<Combatant> & { name: string },
  index = 0
): Combatant {
  const sb = partial.statblock;
  const size: CreatureSize = partial.size || (sb?.size as CreatureSize) || 'Medium';
  const tokenScale = CREATURE_SIZE_SCALE[size] || 1.0;
  const maxHp = partial.maxHp ?? (sb ? sb.hp_average : 10);
  const hp = partial.hp ?? maxHp;

  const legCount = sb && sb.legendary_actions && sb.legendary_actions.length > 0 ? 3 : 0;

  // Staggered chess coordinates by map grid to prevent token stacking at (100, 100)
  const defaultTokenX = (index % 4) * 80 + 80;
  const defaultTokenY = Math.floor(index / 4) * 80 + 80;

  return {
    id: partial.id || crypto.randomUUID(),
    monsterDbId: partial.monsterDbId || sb?.id,
    name: partial.name,
    nameRu: partial.nameRu || sb?.name_ru,
    cr: partial.cr || sb?.cr,
    creatureType: partial.creatureType || (sb ? (sb.creature_type_ru || sb.creature_type) : undefined),
    creatureTypeRu: partial.creatureTypeRu || sb?.creature_type_ru,
    size,
    tokenScale,
    tokenUrl: partial.tokenUrl || partial.avatarUrl,
    avatarUrl: partial.avatarUrl || partial.tokenUrl,
    tokenX: partial.tokenX ?? defaultTokenX,
    tokenY: partial.tokenY ?? defaultTokenY,
    tokenVisibleToPlayers: partial.tokenVisibleToPlayers ?? true,
    color: partial.color || '#C5A059',
    statblock: sb,
    
    hp,
    maxHp,
    tempHp: partial.tempHp ?? 0,
    ac: partial.ac ?? (sb ? sb.ac : 10),
    
    initiative: partial.initiative ?? 0,
    initBonus: partial.initBonus ?? (sb ? sb.init_bonus : 0),
    passiveInit: partial.passiveInit ?? (10 + (partial.initBonus ?? (sb ? sb.init_bonus : 0))),
    speed: partial.speed || (sb ? sb.speed : '30 ft.'),
    
    conditions: Array.isArray(partial.conditions) ? partial.conditions : [],
    deathSaves:
      partial.deathSaves &&
      typeof partial.deathSaves.successes === 'number' &&
      typeof partial.deathSaves.failures === 'number'
        ? { successes: partial.deathSaves.successes, failures: partial.deathSaves.failures }
        : { successes: 0, failures: 0 },
    isDying: partial.isDying ?? (hp <= 0),
    isDead: partial.isDead ?? false,
    isPlayer: partial.isPlayer ?? false,
    
    isConcentrating: partial.isConcentrating ?? false,
    concentratingSpell: partial.concentratingSpell,
    reactionUsed: partial.reactionUsed ?? false,
    legendaryActions:
      partial.legendaryActions && typeof partial.legendaryActions.max === 'number'
        ? partial.legendaryActions
        : { current: legCount, max: legCount },
    spellSlots: partial.spellSlots,
    
    damageImmunities: Array.isArray(partial.damageImmunities) ? partial.damageImmunities : [],
    damageResistances: Array.isArray(partial.damageResistances) ? partial.damageResistances : [],
    damageVulnerabilities: Array.isArray(partial.damageVulnerabilities) ? partial.damageVulnerabilities : [],
    conditionImmunities: Array.isArray(partial.conditionImmunities) ? partial.conditionImmunities : [],
  };
}

export interface DiceRollLogEntry {
  id: string;
  timestamp: string;
  combatantName: string;
  actionName: string;
  attackRoll?: {
    d20: number;
    modifier: number;
    total: number;
    isNat20: boolean;
    isNat1: boolean;
  };
  damageRoll?: {
    formula: string;
    total: number;
    damageType: string;
    details: string;
  };
  weaponMastery?: string;
  note?: string;
  targetName?: string;
  targetId?: string;
  isHit?: boolean;
  effectiveDamage?: number;
  concentrationPrompt?: {
    dc: number;
    targetId: string;
  };
  topplePrompt?: {
    dc: number;
    targetId: string;
  };
}

export type CombatLogType =
  | 'round'
  | 'turn'
  | 'damage'
  | 'heal'
  | 'temp_hp'
  | 'condition_add'
  | 'condition_remove'
  | 'death_save'
  | 'knockout'
  | 'death'
  | 'attack'
  | 'mob_attack'
  | 'rest'
  | 'custom';

export interface CombatLogEntry {
  id: string;
  timestamp: string; // e.g. "14:23:05"
  round: number;
  type: CombatLogType;
  actorName?: string;
  targetName?: string;
  text: string;
  details?: string;
  value?: number;
  isCritical?: boolean;
}

