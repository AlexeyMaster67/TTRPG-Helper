
import clsx from 'clsx';
import { Crosshair, Eye, Sparkles, X } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { CreatureSize } from '../../../types/dnd5e';
import { cleanRussianText, localizeMonsterName } from '../../../utils/textUtils';
import { parseActionDetails } from '../../../utils/attackParser';
import { useTranslation } from '../../../i18n';
import {
  formatCreatureSubtitle,
  SIZE_OPTIONS,
} from './statblockUtils';

export interface StatblockHeaderProps {
  combatant: Combatant;
  currentTarget: Combatant | null;
  onClearTarget: () => void;
  onPerformAttack: (action: any) => void;
  onOpenTargetedAttack: (combatantId: string) => void;
  onShowcase: () => void;
  onUpdateSize: (size: CreatureSize) => void;
}

export function StatblockHeader({
  combatant,
  currentTarget,
  onClearTarget,
  onPerformAttack,
  onOpenTargetedAttack,
  onShowcase,
  onUpdateSize,
}: StatblockHeaderProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';
  const sb = combatant.statblock;

  const subtitleText = formatCreatureSubtitle(combatant, language);
  const currentSize = combatant.size || (sb?.size as CreatureSize) || 'Medium';
  const displayName = isEn
    ? (combatant.name || localizeMonsterName(combatant.nameRu, 'en') || combatant.nameRu)
    : cleanRussianText(combatant.nameRu || combatant.name);

  return (
    <>
      {/* Top Name, Type, CR, PB */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2
            className="tracking-wider uppercase text-base text-white font-bold drop-shadow-sm leading-tight break-words [overflow-wrap:anywhere]"
            title={displayName}
          >
            {displayName}
          </h2>
          <div
            className="text-xs text-amber-100/90 italic mt-0.5 tracking-wide break-words [overflow-wrap:anywhere] leading-snug"
            title={subtitleText}
          >
            {subtitleText}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {(combatant.cr || sb?.cr) && (
            <span className="min-h-[26px] text-xs font-mono tabular-nums font-bold px-2 py-0.5 rounded-glass-sm bg-black/50 text-gold-light border border-gold/40 shadow-sm whitespace-nowrap flex items-center">
              {isEn ? `CR ${combatant.cr || sb?.cr}` : `КО ${combatant.cr || sb?.cr}`}
            </span>
          )}
          {sb?.pb && (
            <span className="text-xs font-mono tabular-nums text-gray-200 whitespace-nowrap">
              {isEn ? `PB +${sb.pb}` : `БМ +${sb.pb}`}
            </span>
          )}
        </div>
      </div>

      {/* Quick Size / Token Scale Footprint Toggle */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-white/10">
        <span className="text-xs font-bold text-gray-200 uppercase tracking-wider font-sans flex-shrink-0">
          {isEn ? 'GRID:' : 'СЕТКА:'}
        </span>
        <div className="grid grid-cols-4 gap-1.5 flex-1 max-w-[280px]">
          {SIZE_OPTIONS.map((opt) => {
            const isSelected = currentSize === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateSize(opt.id as CreatureSize)}
                title={isEn ? `Set size ${opt.id} on battlemap` : `Установить размер ${opt.nameRu} на тактической карте`}
                className={clsx(
                  'min-h-[32px] px-2 py-1 rounded-glass-sm text-xs font-mono tabular-nums font-bold transition-all border text-center flex items-center justify-center leading-none cursor-pointer',
                  isSelected
                    ? 'bg-gold text-black border-gold shadow-[0_0_12px_rgba(245,185,32,0.4)] font-black'
                    : 'bg-black/40 hover:bg-white/10 text-gray-200 border-white/10'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Target Pill */}
      {currentTarget && (
        <div className="flex items-center justify-between gap-2 bg-black/60 backdrop-blur-sm border border-red-500/60 rounded-glass-sm px-3 py-1.5 text-xs mt-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-red-200 text-xs min-w-0 flex-1 overflow-hidden">
            <Crosshair className="h-4 w-4 text-red-400 flex-shrink-0 animate-pulse" />
            <span className="flex-shrink-0">{isEn ? 'Target:' : 'Цель:'}</span>
            <strong
              className="text-white truncate font-medium min-w-0"
              title={cleanRussianText(currentTarget.nameRu || currentTarget.name)}
            >
              {isEn ? (currentTarget.name || currentTarget.nameRu) : cleanRussianText(currentTarget.nameRu || currentTarget.name)}
            </strong>
            <span className="font-mono tabular-nums text-gold flex-shrink-0 whitespace-nowrap">
              ({isEn ? `AC ${currentTarget.ac}` : `КД ${currentTarget.ac}`})
            </span>
          </div>
          <button
            onClick={onClearTarget}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-xs text-gray-300 hover:text-red-300 font-bold rounded-glass-sm hover:bg-red-950/60 transition-colors flex-shrink-0 cursor-pointer"
            title={isEn ? 'Clear target' : 'Снять выбор цели'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sleek Action Buttons */}
      <div className="flex items-center gap-2 mt-2.5">
        {combatant.isPlayer ? (
          <div
            title={isEn ? 'In-person tabletop player • enter results below' : 'Игрок ходит за столом • вносите результаты ниже'}
            className="min-h-[34px] flex-1 py-1 px-3 rounded-glass-sm bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm min-w-0"
          >
            <Sparkles className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{isEn ? 'Tabletop Player (Offline)' : 'Игрок за столом (офлайн)'}</span>
          </div>
        ) : (
          <button
            onClick={() => {
              const firstAttack = sb?.actions?.find((a: any) => {
                const details = parseActionDetails(a);
                return details.attackBonus !== null || details.damageFormula !== null;
              }) || sb?.actions?.[0];

              if (firstAttack) {
                onPerformAttack(firstAttack);
              } else {
                onOpenTargetedAttack(combatant.id);
              }
            }}
            title={
              currentTarget
                ? (isEn ? `Strike ${currentTarget.name || currentTarget.nameRu}` : `Удар по ${cleanRussianText(currentTarget.nameRu || currentTarget.name)}`)
                : (isEn ? 'Targeted attack' : 'Прицельная атака')
            }
            className="min-h-[34px] flex-1 py-1 px-3 rounded-glass-sm bg-gradient-to-r from-crimson-dark via-crimson to-crimson-dark hover:from-crimson hover:to-crimson-bright border border-crimson-bright/50 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_14px_rgba(239,68,68,0.3)] flex items-center justify-center gap-1.5 min-w-0 cursor-pointer active:scale-95"
          >
            <Crosshair className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {currentTarget
                ? (isEn ? `STRIKE: ${(currentTarget.name || currentTarget.nameRu || '').toUpperCase()}` : `УДАР: ${cleanRussianText(currentTarget.nameRu || currentTarget.name || '').toUpperCase()}`)
                : (isEn ? 'TARGETED ATTACK' : 'ПРИЦЕЛЬНАЯ АТАКА')}
            </span>
          </button>
        )}
        <button
          onClick={onShowcase}
          title={isEn ? 'Showcase portrait on player screen' : 'Показать портрет игрокам на втором экране'}
          className="min-h-[34px] py-1 px-3 rounded-glass-sm bg-black/40 hover:bg-white/10 border border-gold/40 text-gold-light hover:text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer active:scale-95"
        >
          <Eye className="h-4 w-4" />
          <span>{isEn ? 'To Players' : 'Игрокам'}</span>
        </button>
      </div>
    </>
  );
}
