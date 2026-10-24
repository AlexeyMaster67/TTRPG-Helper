import React, { useState } from 'react';
import { Dices, Sparkles } from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { usePartyStore } from '../../store/partyStore';

interface WBDiceChipProps {
  formula: string;
  label?: string;
}

export const WBDiceChip: React.FC<WBDiceChipProps> = ({ formula, label }) => {
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRolling(true);

    try {
      // Basic parse: NdX(+/-M)
      const match = formula.match(/^(\d+)d(\d+)(?:([+-])(\d+))?/i);
      let total = 0;
      let rolls: number[] = [];
      let modifier = 0;

      if (match) {
        const count = parseInt(match[1], 10) || 1;
        const sides = parseInt(match[2], 10) || 20;
        const sign = match[3] || '+';
        const modVal = parseInt(match[4], 10) || 0;
        modifier = sign === '-' ? -modVal : modVal;

        for (let i = 0; i < count; i++) {
          const r = Math.floor(Math.random() * sides) + 1;
          rolls.push(r);
          total += r;
        }
        total += modifier;
      } else {
        total = Math.floor(Math.random() * 20) + 1;
      }

      setTimeout(() => {
        setLastResult(total);
        setIsRolling(false);

        // Add to combat log if available
        const addDiceLog = useCombatStore.getState().addDiceLog;
        if (addDiceLog) {
          const detail = rolls.length > 0 ? `[${rolls.join(', ')}] ${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}` : '';
          addDiceLog({
            id: `wbmd-dice-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            combatantName: 'WBmd',
            actionName: `Бросок ${formula}`,
            attackRoll: {
              d20: rolls[0] || total,
              modifier,
              total,
              isNat20: total === 20,
              isNat1: total === 1,
            },
            note: detail,
          });
        }

        usePartyStore.getState().showToast(`🎲 Бросок ${formula} = ${total}!`);
      }, 250);
    } catch {
      setIsRolling(false);
    }
  };

  return (
    <button
      onClick={handleRoll}
      type="button"
      title={`Нажмите, чтобы бросить ${formula}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 mx-1 text-xs font-mono font-semibold rounded-md border transition-all duration-200 select-none shadow-sm cursor-pointer ${
        isRolling
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 scale-105 animate-pulse'
          : lastResult !== null
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
          : 'bg-zinc-800 text-amber-400 border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-750'
      }`}
    >
      <Dices className={`w-3.5 h-3.5 text-amber-400 ${isRolling ? 'animate-spin' : ''}`} />
      <span>{label || formula}</span>
      {lastResult !== null && (
        <span className="flex items-center gap-0.5 px-1 py-0.2 bg-amber-500/20 rounded text-[11px] font-bold text-amber-200">
          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
          {lastResult}
        </span>
      )}
    </button>
  );
};
