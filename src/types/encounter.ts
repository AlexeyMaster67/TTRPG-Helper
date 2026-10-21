export type EncounterDifficulty =
  | 'Легко'
  | 'Средне'
  | 'Сложно'
  | 'Смертельно'
  | 'Тривиально'
  | 'Легкий'
  | 'Средний'
  | 'Сложный'
  | 'Смертельный'
  | 'Тривиальный';

export interface EncounterCombatantPreset {
  name: string;
  nameRu?: string;
  cr?: string;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  ac: number;
  initiative?: number;
  initBonus: number;
  color?: string;
  tokenX?: number;
  tokenY?: number;
  tokenScale?: number;
  speed?: string;
  statblock?: any;
}

export interface Encounter {
  id: string;
  name: string;
  folder: string;
  description?: string;
  createdAt: number;
  combatants: EncounterCombatantPreset[];
  totalXp: number;
  adjustedXp?: number;
  difficulty?: EncounterDifficulty;
}

export interface PartyDifficultyMetrics {
  totalXp: number;
  adjustedXp: number;
  difficulty: EncounterDifficulty;
  thresholds: {
    easy: number;
    medium: number;
    hard: number;
    deadly: number;
  };
}
