import clsx from 'clsx';
import { Star } from 'lucide-react';
import { useTranslation } from '../../../i18n';

export interface SaveStat {
  stat: string;
  nameRu: string;
  fullName: string;
  bonus: number;
  isProficient: boolean;
}

export interface StatblockSavingThrowsProps {
  saves: SaveStat[];
  onRollSavingThrow: (stat: string, nameRu: string, bonus: number, fullName: string) => void;
}

export function StatblockSavingThrows({
  saves,
  onRollSavingThrow,
}: StatblockSavingThrowsProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';

  return (
    <div className="space-y-1.5">
      <strong className="text-gray-200 font-bold tracking-wide block text-xs">
        {isEn ? 'Saving Throws (click to roll):' : 'Спасброски (клик для броска):'}
      </strong>
      <div className="flex flex-wrap gap-1.5">
        {saves.map((sv) => (
          <button
            key={sv.stat}
            type="button"
            onClick={() => onRollSavingThrow(sv.stat, sv.nameRu, sv.bonus, sv.fullName)}
            title={
              isEn
                ? `Roll ${sv.fullName} (${sv.nameRu}) saving throw: 1d20 ${sv.bonus >= 0 ? `+${sv.bonus}` : sv.bonus}`
                : `Бросить спасбросок: ${sv.fullName} (${sv.nameRu}) 1d20 ${sv.bonus >= 0 ? `+${sv.bonus}` : sv.bonus}`
            }
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
