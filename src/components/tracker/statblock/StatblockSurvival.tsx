
import clsx from 'clsx';
import { Shield } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { cleanRussianText } from '../../../utils/textUtils';
import { formatSpeedRu } from './statblockUtils';

export interface StatblockSurvivalProps {
  combatant: Combatant;
}

export function StatblockSurvival({ combatant }: StatblockSurvivalProps) {
  const sb = combatant.statblock;
  const hpRatio = combatant.hp / (combatant.maxHp || 1);
  const hpPercent = Math.max(0, Math.min(100, Math.round(hpRatio * 100)));

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-glass-sm p-2 mt-2.5 shadow-inner flex items-center justify-between gap-1.5 text-white overflow-hidden">
      {/* 1. AC Shield Badge */}
      <div className="relative flex items-center justify-center w-11 h-12 flex-shrink-0">
        <Shield className="w-11 h-12 text-crimson/80 fill-black/60 stroke-gold/70 drop-shadow-md" />
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-0.5 pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-gold-light leading-none">КД</span>
          <span className="text-base font-black font-mono tabular-nums text-white leading-none mt-0.5">
            {combatant.ac}
          </span>
        </div>
      </div>

      {/* 2. HP with hit dice formula */}
      <div className="flex-1 flex flex-col justify-center min-w-0 pl-2 border-l border-white/10">
        <div className="flex items-baseline gap-1.5 flex-nowrap min-w-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-sans flex-shrink-0">ОЗ</span>
          <span className="text-sm font-black font-mono tabular-nums text-emerald-300 flex-shrink-0 whitespace-nowrap">
            {combatant.hp}<span className="text-xs text-gray-400 font-normal">/{combatant.maxHp}</span>
          </span>
          {(sb?.hp_formula || (sb as any)?.hit_dice) && (
            <span
              className="text-xs font-mono tabular-nums text-gray-400 truncate min-w-0"
              title={cleanRussianText(sb?.hp_formula || (sb as any)?.hit_dice)}
            >
              ({cleanRussianText(sb?.hp_formula || (sb as any)?.hit_dice)})
            </span>
          )}
        </div>
        <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden mt-1 border border-white/10">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-300",
              hpRatio > 0.5
                ? "bg-emerald-500"
                : hpRatio > 0.2
                ? "bg-amber"
                : "bg-red-600"
            )}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* 3. Speed */}
      <div className="flex flex-col justify-center min-w-0 max-w-[95px] flex-shrink-0 pl-2 border-l border-white/10">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider leading-none">Скорость</span>
        <span
          className="font-mono tabular-nums text-xs font-medium text-gray-100 truncate block mt-1"
          title={formatSpeedRu(combatant.speed)}
        >
          {formatSpeedRu(combatant.speed)}
        </span>
      </div>

      {/* 4. Initiative */}
      <div className="flex flex-col justify-center items-end flex-shrink-0 pl-2 border-l border-white/10">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider leading-none">Иниц.</span>
        <div
          className="min-h-[30px] flex items-center justify-center px-2 py-0.5 mt-1 rounded-glass-sm bg-black/50 border border-white/10"
          title={`Инициатива: ${combatant.initiative}`}
        >
          <span className="font-mono tabular-nums font-bold text-xs text-gold-light leading-none">
            {combatant.initiative}
          </span>
        </div>
      </div>
    </div>
  );
}
