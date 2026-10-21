export type EffectDuration = number | 'instant' | 'permanent';

export interface EffectModifiers {
  acBonus?: number;
  speedBonus?: number;
  attackBonus?: number | string;
  saveBonus?: number | string;
  advantageAttacks?: boolean;
  disadvantageAttacks?: boolean;
}

export interface EffectAura {
  enabled: boolean;
  radiusFeet: number;
  color: string;
  opacity: number;
  pulsing?: boolean;
}

export interface ActiveEffectModifier {
  id: string;
  name: string;
  iconTag?: string;
  description?: string;
  durationRounds: EffectDuration;
  sourceCombatantId?: string;
  modifiers?: EffectModifiers;
  aura?: EffectAura;
}

export interface EffectiveStats {
  baseAc: number;
  effectiveAc: number;
  acBonus: number;
  baseSpeed: string;
  effectiveSpeed: string;
  speedBonus: number;
  advantageAttacks: boolean;
  disadvantageAttacks: boolean;
  attackBonuses: (number | string)[];
  saveBonuses: (number | string)[];
}

/**
 * Pure non-destructive calculation of effective creature stats.
 * When an effect is removed from the array, effective AC automatically reverts to base AC.
 */
export function calculateEffectiveStats(
  base: { ac: number; speed?: string },
  effects: ActiveEffectModifier[] = []
): EffectiveStats {
  const baseAc = typeof base.ac === 'number' && !isNaN(base.ac) ? base.ac : 10;
  const baseSpeed = base.speed || '30 фт.';

  let acBonus = 0;
  let speedBonus = 0;
  let advantageAttacks = false;
  let disadvantageAttacks = false;
  const attackBonuses: (number | string)[] = [];
  const saveBonuses: (number | string)[] = [];

  for (const eff of effects) {
    if (!eff.modifiers) continue;
    if (typeof eff.modifiers.acBonus === 'number') {
      acBonus += eff.modifiers.acBonus;
    }
    if (typeof eff.modifiers.speedBonus === 'number') {
      speedBonus += eff.modifiers.speedBonus;
    }
    if (eff.modifiers.advantageAttacks) {
      advantageAttacks = true;
    }
    if (eff.modifiers.disadvantageAttacks) {
      disadvantageAttacks = true;
    }
    if (eff.modifiers.attackBonus !== undefined) {
      attackBonuses.push(eff.modifiers.attackBonus);
    }
    if (eff.modifiers.saveBonus !== undefined) {
      saveBonuses.push(eff.modifiers.saveBonus);
    }
  }

  let effectiveSpeed = baseSpeed;
  if (speedBonus !== 0) {
    const match = baseSpeed.match(/^(\d+)\s*(.*)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const unit = match[2] || 'фт.';
      const newNum = Math.max(0, num + speedBonus);
      effectiveSpeed = `${newNum} ${unit}`.trim();
    } else {
      effectiveSpeed = `${baseSpeed} (${speedBonus > 0 ? `+${speedBonus}` : speedBonus} фт.)`;
    }
  }

  return {
    baseAc,
    effectiveAc: baseAc + acBonus,
    acBonus,
    baseSpeed,
    effectiveSpeed,
    speedBonus,
    advantageAttacks,
    disadvantageAttacks,
    attackBonuses,
    saveBonuses,
  };
}

/**
 * Decrements duration of active round-based effects by 1.
 * Permanent effects remain untouched.
 * Instant or expired effects (rounds <= 0) are filtered out into expiredEffects.
 */
export function advanceEffectsRound(effects: ActiveEffectModifier[]): {
  remainingEffects: ActiveEffectModifier[];
  expiredEffects: ActiveEffectModifier[];
} {
  const remainingEffects: ActiveEffectModifier[] = [];
  const expiredEffects: ActiveEffectModifier[] = [];

  for (const eff of effects) {
    if (eff.durationRounds === 'permanent') {
      remainingEffects.push(eff);
    } else if (eff.durationRounds === 'instant') {
      expiredEffects.push(eff);
    } else if (typeof eff.durationRounds === 'number') {
      const updatedRounds = eff.durationRounds - 1;
      if (updatedRounds <= 0) {
        expiredEffects.push({ ...eff, durationRounds: 0 });
      } else {
        remainingEffects.push({ ...eff, durationRounds: updatedRounds });
      }
    } else {
      remainingEffects.push(eff);
    }
  }

  return { remainingEffects, expiredEffects };
}

/**
 * Converts aura radius in feet to tactical map pixel radius.
 * Standard D&D 5e: 1 grid cell = 5 feet.
 */
export function calculateAuraPixelRadius(radiusFeet: number, gridCellSize: number): number {
  if (radiusFeet <= 0 || gridCellSize <= 0) return 0;
  return (radiusFeet / 5) * gridCellSize;
}

/**
 * Extracts active auras from active effect modifiers list.
 */
export function getEffectiveAuras(effects: ActiveEffectModifier[]): Array<{
  radiusFeet: number;
  color: string;
  opacity: number;
  pulsing?: boolean;
  effectName: string;
}> {
  const auras: Array<{
    radiusFeet: number;
    color: string;
    opacity: number;
    pulsing?: boolean;
    effectName: string;
  }> = [];

  for (const eff of effects) {
    if (eff.aura && eff.aura.enabled && eff.aura.radiusFeet > 0) {
      auras.push({
        radiusFeet: eff.aura.radiusFeet,
        color: eff.aura.color || '#3B82F6',
        opacity: eff.aura.opacity ?? 0.22,
        pulsing: eff.aura.pulsing,
        effectName: eff.name,
      });
    }
  }

  return auras;
}

/**
 * Catalog of standard D&D 2024 effect presets.
 */
export const DND_2024_EFFECT_PRESETS: ActiveEffectModifier[] = [
  {
    id: 'preset_shield_of_faith',
    name: 'Щит веры',
    iconTag: 'Shield',
    description: '+2 к КД цели на 10 раундов',
    durationRounds: 10,
    modifiers: { acBonus: 2 },
  },
  {
    id: 'preset_bless',
    name: 'Благословение',
    iconTag: 'Sparkles',
    description: '+1d4 к броскам атаки и спасброскам на 10 раундов',
    durationRounds: 10,
    modifiers: { attackBonus: '+1d4', saveBonus: '+1d4' },
  },
  {
    id: 'preset_haste',
    name: 'Ускорение',
    iconTag: 'Zap',
    description: '+2 к КД, +30 фт. к скорости, преимущество на атаки на 10 раундов',
    durationRounds: 10,
    modifiers: { acBonus: 2, speedBonus: 30, advantageAttacks: true },
  },
  {
    id: 'preset_paladin_aura',
    name: 'Аура защиты паладина',
    iconTag: 'ShieldAlert',
    description: 'Аура 10 фт., союзники получают бонус Харизмы (+3) к спасброскам',
    durationRounds: 'permanent',
    modifiers: { saveBonus: '+3' },
    aura: {
      enabled: true,
      radiusFeet: 10,
      color: '#F59E0B',
      opacity: 0.22,
      pulsing: true,
    },
  },
  {
    id: 'preset_protection_evil_good',
    name: 'Защита от зла и добра',
    iconTag: 'ShieldCheck',
    description: 'Помеха на броски атаки врагов по цели на 10 раундов',
    durationRounds: 10,
    modifiers: { disadvantageAttacks: true },
  },
  {
    id: 'preset_stunned',
    name: 'Ошеломлен',
    iconTag: 'ZapOff',
    description: 'Недееспособен, проваливает спасброски Силы и Ловкости, атаки по нему с преимуществом',
    durationRounds: 1,
    modifiers: { disadvantageAttacks: true },
  },
  {
    id: 'preset_blinded',
    name: 'Ослеплен',
    iconTag: 'EyeOff',
    description: 'Проваливает проверки со зрением, атаки с помехой, атаки по нему с преимуществом',
    durationRounds: 1,
    modifiers: { disadvantageAttacks: true },
  },
  {
    id: 'preset_restrained',
    name: 'Опутан',
    iconTag: 'Lock',
    description: 'Скорость снижена на 30 фт., атаки с помехой, помеха на спасброски Ловкости',
    durationRounds: 1,
    modifiers: { speedBonus: -30, disadvantageAttacks: true },
  },
  {
    id: 'preset_unconscious',
    name: 'Без сознания',
    iconTag: 'Moon',
    description: 'Недееспособен, роняет оружие, критические попадания в упор',
    durationRounds: 1,
    modifiers: { disadvantageAttacks: true },
  },
];

export function createEffectFromPreset(
  presetId: string,
  overrides?: Partial<ActiveEffectModifier>
): ActiveEffectModifier {
  const preset = DND_2024_EFFECT_PRESETS.find((p) => p.id === presetId);
  const randomSuffix = Math.random().toString(36).substring(2, 7);

  if (!preset) {
    return {
      id: `effect_${Date.now()}_${randomSuffix}`,
      name: 'Пользовательский эффект',
      durationRounds: 10,
      modifiers: {},
      ...overrides,
    };
  }

  return {
    ...preset,
    id: `effect_${preset.id}_${Date.now()}_${randomSuffix}`,
    modifiers: { ...preset.modifiers, ...overrides?.modifiers },
    aura: preset.aura ? { ...preset.aura, ...overrides?.aura } : overrides?.aura,
    ...overrides,
  };
}
