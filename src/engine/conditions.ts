import { ConditionType, ActiveCondition } from '../types/dnd5e';

export interface ConditionInfo {
  type: ConditionType;
  nameEn: string;
  nameRu: string;
  badgeColor: string;
  descriptionRu: string;
  descriptionEn: string;
}

export const CONDITIONS_2024_DATA: Record<ConditionType, ConditionInfo> = {
  Blinded: {
    type: 'Blinded',
    nameEn: 'Blinded',
    nameRu: 'Ослеплённый',
    badgeColor: '#6B7280',
    descriptionRu:
      'Существо ничего не видит и автоматически проваливает проверки характеристик, требующие зрения. Броски атак существа совершаются с помехой, броски атак по нему — с преимуществом.',
    descriptionEn:
      "A blinded creature can't see and automatically fails any ability check requiring sight. Attack rolls against it have Advantage; its attack rolls have Disadvantage.",
  },
  Charmed: {
    type: 'Charmed',
    nameEn: 'Charmed',
    nameRu: 'Очарованный',
    badgeColor: '#F43F5E',
    descriptionRu:
      'Существо не может атаковать пленителя или причинять ему вред. Пленитель совершает социальные проверки при взаимодействии с существом с преимуществом.',
    descriptionEn:
      "A charmed creature can't attack the charmer or target it with harmful abilities/magical effects. Charmer has Advantage on ability checks to interact socially.",
  },
  Deafened: {
    type: 'Deafened',
    nameEn: 'Deafened',
    nameRu: 'Оглохший',
    badgeColor: '#4B5563',
    descriptionRu:
      'Существо ничего не слышит и автоматически проваливает проверки характеристик, требующие слуха.',
    descriptionEn:
      "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
  },
  Dazed: {
    type: 'Dazed',
    nameEn: 'Dazed',
    nameRu: 'Ошеломлённый',
    badgeColor: '#A855F7',
    descriptionRu:
      'Существо может в свой ход совершить только перемещение или одно действие (но не то и другое). Не может совершать бонусные действия и реакции.',
    descriptionEn:
      'A dazed creature can move or take an action on its turn, not both. It cannot take Bonus Actions or Reactions.',
  },
  Exhaustion: {
    type: 'Exhaustion',
    nameEn: 'Exhaustion',
    nameRu: 'Истощение',
    badgeColor: '#B45309',
    descriptionRu:
      'Уровни 1–6. Каждый уровень даёт -2 ко всем броскам d20 (атаки, спасброски, проверки) и -5 футов к скорости. Уровень 6 влечёт мгновенную смерть.',
    descriptionEn:
      'Levels 1–6. Each level gives -2 to all D20 tests (attacks, checks, saves) and -5 ft to speed. Level 6 causes instant death.',
  },
  Frightened: {
    type: 'Frightened',
    nameEn: 'Frightened',
    nameRu: 'Испуганный',
    badgeColor: '#EC4899',
    descriptionRu:
      'Проверки характеристик и броски атак совершаются с помехой, пока источник страха находится в пределах зоны видимости. Существо не может добровольно приблизиться к источнику страха.',
    descriptionEn:
      'Has Disadvantage on ability checks and attack rolls while source of fear is within line of sight. Cannot willingly move closer to source.',
  },
  Grappled: {
    type: 'Grappled',
    nameEn: 'Grappled',
    nameRu: 'Захваченный',
    badgeColor: '#8B5CF6',
    descriptionRu:
      'Скорость существа равна 0 и не может увеличиваться за счёт бонусов. Броски атак по другим целям, кроме захватившего, совершаются с помехой.',
    descriptionEn:
      'Speed is 0. Disadvantage on attacks against targets other than the grappler. Grappler can move dragging creature at half speed.',
  },
  Incapacitated: {
    type: 'Incapacitated',
    nameEn: 'Incapacitated',
    nameRu: 'Недееспособный',
    badgeColor: '#EF4444',
    descriptionRu:
      'Существо не может совершать действия, бонусные действия и реакции. Концентрация немедленно прерывается.',
    descriptionEn:
      "Can't take Actions, Bonus Actions, or Reactions. Concentration is immediately broken.",
  },
  Invisible: {
    type: 'Invisible',
    nameEn: 'Invisible',
    nameRu: 'Невидимый',
    badgeColor: '#3B82F6',
    descriptionRu:
      'Существо невозможно увидеть обычным зрением. Броски атак существа совершаются с преимуществом, а броски атак по нему — с помехой.',
    descriptionEn:
      'Impossible to see without special senses. Attack rolls against have Disadvantage; attacks by creature have Advantage.',
  },
  Paralyzed: {
    type: 'Paralyzed',
    nameEn: 'Paralyzed',
    nameRu: 'Парализованный',
    badgeColor: '#DC2626',
    descriptionRu:
      'Существо недееспособно, не может двигаться и говорить. Автоматический провал спасбросков Силы и Ловкости. Броски атак по нему совершаются с преимуществом; любое попадание по существу из пределов 5 футов является критическим.',
    descriptionEn:
      'Incapacitated and cannot move or speak. Automatically fails STR and DEX saving throws. Attacks against have Advantage; hits from within 5 ft are critical hits.',
  },
  Petrified: {
    type: 'Petrified',
    nameEn: 'Petrified',
    nameRu: 'Окаменевший',
    badgeColor: '#78716C',
    descriptionRu:
      'Существо превращено в твёрдый камень и недееспособно. Вес увеличивается в 10 раз. Иммунитет к яду, сопротивление ко всем видам урона. Автоматический провал спасбросков Силы и Ловкости.',
    descriptionEn:
      'Transformed into solid stone and Incapacitated. Weight multiplied by 10. Immune to poison and disease; resistance to all damage. Auto-fails STR and DEX saves.',
  },
  Poisoned: {
    type: 'Poisoned',
    nameEn: 'Poisoned',
    nameRu: 'Отравленный',
    badgeColor: '#10B981',
    descriptionRu:
      'Существо совершает броски атак и проверки характеристик с помехой.',
    descriptionEn:
      'A poisoned creature has Disadvantage on attack rolls and ability checks.',
  },
  Prone: {
    type: 'Prone',
    nameEn: 'Prone',
    nameRu: 'Сбитый с ног',
    badgeColor: '#F59E0B',
    descriptionRu:
      'Существо передвигается только ползком (тратит 1 дополнительный фут перемещения за каждый пройденный фут). Совершает броски атак с помехой. Броски атак по существу совершаются с преимуществом, если атакующий находится в пределах 5 футов, иначе — с помехой.',
    descriptionEn:
      'Movement requires crawl (costs double). Disadvantage on attack rolls. Attacks within 5 ft have Advantage, otherwise Disadvantage.',
  },
  Restrained: {
    type: 'Restrained',
    nameEn: 'Restrained',
    nameRu: 'Опутанный',
    badgeColor: '#D97706',
    descriptionRu:
      'Скорость существа равна 0. Броски атак существа и спасброски Ловкости совершаются с помехой. Броски атак по существу совершаются с преимуществом.',
    descriptionEn:
      'Speed becomes 0. Disadvantage on attack rolls and DEX saves. Attack rolls against have Advantage.',
  },
  Stunned: {
    type: 'Stunned',
    nameEn: 'Stunned',
    nameRu: 'Оглушённый',
    badgeColor: '#E11D48',
    descriptionRu:
      'Существо недееспособно, не может двигаться и способно лишь запинаясь говорить. Автоматический провал спасбросков Силы и Ловкости. Броски атак по существу совершаются с преимуществом.',
    descriptionEn:
      'Incapacitated, cannot move, speaks haltingly. Automatically fails STR and DEX saving throws. Attack rolls against have Advantage.',
  },
  Unconscious: {
    type: 'Unconscious',
    nameEn: 'Unconscious',
    nameRu: 'Бессознательный',
    badgeColor: '#991B1B',
    descriptionRu:
      'Существо недееспособно, падает ничком и роняет всё, что держит. Автоматический провал спасбросков Силы и Ловкости. Броски атак по существу совершаются с преимуществом; любое попадание из пределов 5 футов является критическим попаданием.',
    descriptionEn:
      'Incapacitated, drops what it is holding, falls Prone. Auto-fails STR and DEX saves. Attacks have Advantage; hits from within 5 ft are critical hits.',
  },
};

/**
 * Exhaustion mechanics D&D 2024:
 * Level 1-6. Each level: -2 to d20 tests, -5 ft to speed. Level 6 = death.
 */
export function getExhaustionEffects(level: number): {
  d20Penalty: number;
  speedReductionFt: number;
  isDead: boolean;
} {
  const safeLevel = Math.max(0, Math.min(6, level));
  return {
    d20Penalty: -(safeLevel * 2),
    speedReductionFt: safeLevel * 5,
    isDead: safeLevel >= 6,
  };
}

/**
 * Add or update condition in collection
 */
export function addCondition(
  list: ActiveCondition[],
  condition: ActiveCondition
): { conditions: ActiveCondition[]; isDead: boolean } {
  const existingIdx = list.findIndex((c) => c.type === condition.type);
  let updated = [...list];
  let isDead = false;

  if (condition.type === 'Exhaustion') {
    const currentLevel = existingIdx >= 0 ? updated[existingIdx].level || 1 : 0;
    const targetLevel = condition.level ?? currentLevel + 1;
    const clampedLevel = Math.min(6, Math.max(1, targetLevel));

    const effects = getExhaustionEffects(clampedLevel);
    isDead = effects.isDead;

    const newExhaustion: ActiveCondition = {
      type: 'Exhaustion',
      level: clampedLevel,
      source: condition.source,
      durationRounds: condition.durationRounds,
    };

    if (existingIdx >= 0) {
      updated[existingIdx] = newExhaustion;
    } else {
      updated.push(newExhaustion);
    }
  } else {
    if (existingIdx >= 0) {
      updated[existingIdx] = condition;
    } else {
      updated.push(condition);
    }
  }

  return { conditions: updated, isDead };
}

/**
 * Remove condition by type
 */
export function removeCondition(list: ActiveCondition[], type: ConditionType): ActiveCondition[] {
  return list.filter((c) => c.type !== type);
}
