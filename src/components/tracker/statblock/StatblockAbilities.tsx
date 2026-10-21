
import clsx from 'clsx';
import { Star } from 'lucide-react';
import { formatMod } from './statblockUtils';

export interface AbilityStat {
  label: string;
  key: string;
  fullRu: string;
  score: number;
}

export interface SaveStat {
  stat: string;
  nameRu: string;
  fullName: string;
  bonus: number;
  isProficient: boolean;
}

export interface StatblockAbilitiesProps {
  stats: AbilityStat[];
  onRollAbilityScore: (stat: AbilityStat) => void;
  variant?: 'grid' | 'saves' | 'both';
  saves?: SaveStat[];
  onRollSavingThrow?: (stat: string, nameRu: string, bonus: number, fullName: string) => void;
}

export interface StatblockSavingThrowsProps {
  saves: SaveStat[];
  onRollSavingThrow: (stat: string, nameRu: string, bonus: number, fullName: string) => void;
}

export function StatblockSavingThrows({
  saves,
  onRollSavingThrow,
}: StatblockSavingThrowsProps) {
  return (
    <div className="space-y-1.5">
      <strong className="text-gray-200 font-bold tracking-wide block text-xs">
        Спасброски (клик для броска):
      </strong>
      <div className="flex flex-wrap gap-1.5">
        {saves.map((sv) => (
          <button
            key={sv.stat}
            type="button"
            onClick={() => onRollSavingThrow(sv.stat, sv.nameRu, sv.bonus, sv.fullName)}
            title={`Бросить спасбросок ${sv.fullName} (${sv.nameRu}): 1d20 ${sv.bonus >= 0 ? `+${sv.bonus}` : sv.bonus}`}
            className={clsx(
              'min-h-[32px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-glass-sm text-xs font-mono tabular-nums transition-all border shadow-sm cursor-pointer active:scale-95 select-none',
              sv.isProficient
                ? 'bg-gold/15 hover:bg-gold/25 border-gold/70 text-gold-light hover:border-gold hover:shadow-[0_0_12px_rgba(245,185,32,0.3)] font-bold'
                : 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-500/40 hover:border-blue-400 text-blue-200 hover:text-white font-medium'
            )}
          >
            {sv.isProficient && <Star className="h-3 w-3 text-gold fill-gold inline-block flex-shrink-0" />}
            <span className="font-sans font-semibold text-xs">{sv.nameRu}</span>
            <span className="font-black tabular-nums">{sv.bonus >= 0 ? `+${sv.bonus}` : sv.bonus}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function StatblockAbilities({
  stats,
  onRollAbilityScore,
  variant = 'grid',
  saves,
  onRollSavingThrow,
}: StatblockAbilitiesProps) {
  const renderGrid = () => (
    <div className="grid grid-cols-6 gap-1.5 mt-2.5 text-center w-full">
      {stats.map((st) => (
        <button
          key={st.label}
          type="button"
          onClick={() => onRollAbilityScore(st)}
          className="min-h-[58px] flex flex-col items-center justify-between p-1.5 rounded-glass-sm bg-black/40 hover:bg-black/60 border border-white/10 hover:border-gold/60 transition-all cursor-pointer group shadow-sm active:scale-95 select-none"
          title={`Кликните, чтобы бросить проверку ${st.fullRu} (${st.label}): 1d20 ${formatMod(st.score)}`}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-gold-light group-hover:text-gold leading-none">
            {st.label}
          </span>
          <span className="font-mono tabular-nums text-sm font-bold text-white group-hover:text-gold-light leading-tight">
            {formatMod(st.score)}
          </span>
          <div className="font-mono tabular-nums text-xs font-medium text-gray-400 bg-black/60 px-1 rounded border border-white/10 leading-none">
            {st.score}
          </div>
        </button>
      ))}
    </div>
  );

  if (variant === 'saves') {
    return saves && onRollSavingThrow ? (
      <StatblockSavingThrows saves={saves} onRollSavingThrow={onRollSavingThrow} />
    ) : null;
  }

  if (variant === 'both') {
    return (
      <div className="space-y-3">
        {renderGrid()}
        {saves && onRollSavingThrow && (
          <StatblockSavingThrows saves={saves} onRollSavingThrow={onRollSavingThrow} />
        )}
      </div>
    );
  }

  return renderGrid();
}
