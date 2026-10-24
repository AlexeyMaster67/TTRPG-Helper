
import { formatMod } from './statblockUtils';
import { useTranslation } from '../../../i18n';
import {
  StatblockSavingThrows,
  StatblockSavingThrowsProps,
  SaveStat,
} from './StatblockSavingThrows';

export { StatblockSavingThrows };
export type { StatblockSavingThrowsProps, SaveStat };

export interface AbilityStat {
  label: string;
  key: string;
  fullRu: string;
  score: number;
}

export interface StatblockAbilitiesProps {
  stats: AbilityStat[];
  onRollAbilityScore: (stat: AbilityStat) => void;
  variant?: 'grid' | 'saves' | 'both';
  saves?: SaveStat[];
  onRollSavingThrow?: (stat: string, nameRu: string, bonus: number, fullName: string) => void;
}

export function StatblockAbilities({
  stats,
  onRollAbilityScore,
  variant = 'grid',
  saves,
  onRollSavingThrow,
}: StatblockAbilitiesProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';

  const renderGrid = () => (
    <div className="grid grid-cols-6 gap-1.5 mt-2.5 text-center w-full">
      {stats.map((st) => (
        <button
          key={st.label}
          type="button"
          onClick={() => onRollAbilityScore(st)}
          className="min-h-[58px] flex flex-col items-center justify-between p-1.5 rounded-glass-sm bg-black/40 hover:bg-black/60 border border-white/10 hover:border-gold/60 transition-all cursor-pointer group shadow-sm active:scale-95 select-none"
          title={
            isEn
              ? `Click to roll ${st.fullRu} (${st.label}) check: 1d20 ${formatMod(st.score)}`
              : `Кликните для броска проверки: ${st.fullRu} (${st.label}) 1d20 ${formatMod(st.score)}`
          }
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
