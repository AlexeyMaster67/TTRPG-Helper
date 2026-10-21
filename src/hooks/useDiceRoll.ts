import { useCombatStore } from '../store/combatStore';
import { useDice3dStore } from '../store/dice3dStore';
import { audioService } from '../services/audioService';
import { broadcastService } from '../services/broadcastService';
import { rollD20, rollDiceFormula } from '../engine/rolls';
import { RollMode } from '../types/dnd5e';

export interface UseDiceRollOptions {
  title?: string;
  rollerName?: string;
  isSecret?: boolean;
  modifier?: number;
  mode?: RollMode;
}

export function useDiceRoll() {
  const is3dEnabled = useDice3dStore((s) => s.is3dEnabled);
  const isSecretRollGlobal = useDice3dStore((s) => s.isSecretRoll);
  const rollDice3d = useDice3dStore((s) => s.rollDice3d);
  const addDiceLog = useCombatStore((s) => s.addDiceLog);

  const rollD20Check = ({
    title = 'Проверка d20',
    rollerName = 'Мастер',
    modifier = 0,
    mode = 'normal',
    isSecret,
  }: UseDiceRollOptions = {}) => {
    const effectiveSecret = isSecret !== undefined ? isSecret : isSecretRollGlobal;

    // 1. Play sound
    audioService.playDiceRoll();

    // 2. Perform roll
    const res = rollD20(mode, modifier);

    let modeText = '';
    if (mode === 'advantage') modeText = ' (Преимущество)';
    if (mode === 'disadvantage') modeText = ' (Помеха)';

    let dicePart = `d20(${res.keptRoll})`;
    if (res.d20_2 !== undefined) {
      dicePart = `d20[${res.d20_1}, ${res.d20_2}] -> ${res.keptRoll}${modeText}`;
    }

    const modStr =
      modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : '';
    const breakdown = `${dicePart}${modStr} = ${res.total}`;

    // 3. Crit sounds
    if (res.isNatural20) {
      setTimeout(() => audioService.playCriticalHit(), 200);
    } else if (res.isNatural1) {
      setTimeout(() => audioService.playSadHorn(), 200);
    }

    // 4. Log to Combat Log
    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const note = res.isNatural20
      ? `КРИТИЧЕСКИЙ УСПЕХ! ${breakdown}`
      : res.isNatural1
      ? `КРИТИЧЕСКИЙ ПРОВАЛ! ${breakdown}`
      : breakdown;

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: effectiveSecret ? `[Скрытно] ${rollerName}` : rollerName,
      actionName: `${title}${modStr}`,
      attackRoll: {
        d20: res.keptRoll,
        modifier,
        total: res.total,
        isNat20: res.isNatural20,
        isNat1: res.isNatural1,
      },
      note,
    });

    // 5. 3D Dice Simulation
    if (is3dEnabled) {
      const dice =
        res.d20_2 !== undefined
          ? [
              { sides: 20, result: res.d20_1 },
              { sides: 20, result: res.d20_2 },
            ]
          : [{ sides: 20, result: res.keptRoll }];

      rollDice3d({
        dice,
        title: `${rollerName}: ${title}`,
        total: res.total,
        isSecret: effectiveSecret,
        rollMode: mode,
      });
    }

    // 6. Broadcast if public
    if (!effectiveSecret) {
      broadcastService.send({
        type: 'BROADCAST_ROLL',
        payload: {
          id: `roll_${Date.now()}`,
          title: `${rollerName}: ${title}`,
          formula: `1d20${modStr}`,
          resultDisplay: String(res.total),
          total: res.total,
          timestamp: Date.now(),
          dice3d: [{ sides: 20, result: res.keptRoll }],
        },
      });
    }

    return res;
  };

  const rollFormula = (
    formula: string,
    {
      title = 'Бросок урона',
      rollerName = 'Мастер',
      isSecret,
    }: { title?: string; rollerName?: string; isSecret?: boolean } = {}
  ) => {
    const effectiveSecret = isSecret !== undefined ? isSecret : isSecretRollGlobal;
    audioService.playDiceRoll();

    const evaluated = rollDiceFormula(formula);

    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const dice3dList: Array<{ sides: number; result: number }> = [];
    if (evaluated.rolls) {
      for (const r of evaluated.rolls) {
        for (const v of r.values) {
          dice3dList.push({ sides: r.sides, result: v });
        }
      }
    }

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: effectiveSecret ? `[Скрытно] ${rollerName}` : rollerName,
      actionName: `${title}: ${formula}`,
      damageRoll: {
        formula,
        total: evaluated.total,
        damageType: 'Универсальный',
        details: `${formula} = ${evaluated.total}`,
      },
      note: `${formula} = ${evaluated.total}`,
    });

    if (is3dEnabled && dice3dList.length > 0) {
      rollDice3d({
        dice: dice3dList,
        title: `${rollerName}: ${title}`,
        total: evaluated.total,
        isSecret: effectiveSecret,
      });
    }

    if (!effectiveSecret && dice3dList.length > 0) {
      broadcastService.send({
        type: 'BROADCAST_ROLL',
        payload: {
          id: `roll_${Date.now()}`,
          title: `${rollerName}: ${title}`,
          formula,
          resultDisplay: String(evaluated.total),
          total: evaluated.total,
          timestamp: Date.now(),
          dice3d: dice3dList,
        },
      });
    }

    return evaluated;
  };

  return {
    rollD20Check,
    rollFormula,
  };
}
