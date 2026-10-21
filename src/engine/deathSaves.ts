export interface DeathSaveState {
  successes: number;
  failures: number;
}

export interface DeathSaveResult {
  roll: number;
  isNatural20: boolean;
  isNatural1: boolean;
  successesAdded: number;
  failuresAdded: number;
  newSuccesses: number;
  newFailures: number;
  revived: boolean;
  isStabilized: boolean;
  isDead: boolean;
  hpGained: number;
  messageRu: string;
}

/**
 * Evaluates D&D 2024 death saving throw:
 * - Natural 20: creature regains 1 HP, wakes up / stops dying.
 * - Roll >= 10: 1 success. At 3 successes: stabilized.
 * - Roll 2-9: 1 failure.
 * - Natural 1: 2 failures. At 3 failures: dead.
 */
export function evaluateDeathSave(
  state: DeathSaveState,
  d20Roll: number
): DeathSaveResult {
  const roll = Math.min(20, Math.max(1, Math.round(d20Roll)));
  const isNatural20 = roll === 20;
  const isNatural1 = roll === 1;

  if (isNatural20) {
    return {
      roll,
      isNatural20: true,
      isNatural1: false,
      successesAdded: 0,
      failuresAdded: 0,
      newSuccesses: 0,
      newFailures: 0,
      revived: true,
      isStabilized: false,
      isDead: false,
      hpGained: 1,
      messageRu: 'Натуральная 20! Персонаж восстанавливает 1 ХП и приходит в сознание.',
    };
  }

  if (isNatural1) {
    const newFailures = Math.min(3, state.failures + 2);
    const isDead = newFailures >= 3;
    return {
      roll,
      isNatural20: false,
      isNatural1: true,
      successesAdded: 0,
      failuresAdded: 2,
      newSuccesses: state.successes,
      newFailures,
      revived: false,
      isStabilized: false,
      isDead,
      hpGained: 0,
      messageRu: isDead
        ? 'Критический провал (Нат. 1, +2 провала). Персонаж погиб.'
        : 'Критический провал (Нат. 1). Начислено 2 провала спасброска от смерти.',
    };
  }

  if (roll >= 10) {
    const newSuccesses = Math.min(3, state.successes + 1);
    const isStabilized = newSuccesses >= 3;
    return {
      roll,
      isNatural20: false,
      isNatural1: false,
      successesAdded: 1,
      failuresAdded: 0,
      newSuccesses,
      newFailures: state.failures,
      revived: false,
      isStabilized,
      isDead: false,
      hpGained: 0,
      messageRu: isStabilized
        ? '3 успеха! Состояние персонажа стабилизировано.'
        : `Успех спасброска (${roll} >= 10). Всего успехов: ${newSuccesses}/3.`,
    };
  }

  // Roll 2-9
  const newFailures = Math.min(3, state.failures + 1);
  const isDead = newFailures >= 3;
  return {
    roll,
    isNatural20: false,
    isNatural1: false,
    successesAdded: 0,
    failuresAdded: 1,
    newSuccesses: state.successes,
    newFailures,
    revived: false,
    isStabilized: false,
    isDead,
    hpGained: 0,
    messageRu: isDead
      ? '3 провала спасброска. Персонаж погиб.'
      : `Провал спасброска (${roll} < 10). Всего провалов: ${newFailures}/3.`,
  };
}
