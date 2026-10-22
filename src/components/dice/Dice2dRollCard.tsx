import React, { useState, useEffect } from 'react';
import { Animated2dDie } from './Animated2dDie';
import { Dices, X, Sparkles, AlertCircle, Check } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { useTranslation } from '../../i18n';
import { localizeMonsterName } from '../../utils/textUtils';

export interface SingleDieResult {
  id?: string;
  sides: number;
  value: number;
  isDiscarded?: boolean;
  isHighlighted?: boolean;
}

export interface Dice2dRollData {
  id?: string;
  sides?: number;
  r1?: number;
  r2?: number;
  kept?: number;
  dice?: SingleDieResult[];
  modifier?: number;
  total: number;
  mode?: 'normal' | 'advantage' | 'disadvantage';
  isNat20?: boolean;
  isNat1?: boolean;
  title?: string;
  rollerName?: string;
  targetName?: string;
  damageType?: string;
  subtitle?: string;
}

export interface Dice2dRollCardProps {
  data: Dice2dRollData;
  onClose: () => void;
  isPlayerView?: boolean;
  initialRolling?: boolean;
}

export const Dice2dRollCard: React.FC<Dice2dRollCardProps> = ({
  data,
  onClose,
  isPlayerView = false,
  initialRolling = true,
}) => {
  const { language } = useTranslation();
  const isEn = language === 'en';
  const [isRolling, setIsRolling] = useState(initialRolling);

  const {
    sides = 20,
    r1 = data.total,
    r2,
    kept = data.total,
    dice,
    modifier = 0,
    total,
    mode = 'normal',
    isNat20 = false,
    isNat1 = false,
    title,
    rollerName,
    targetName,
    damageType,
    subtitle,
  } = data;

  const hasDicePool = Array.isArray(dice) && dice.length > 0;
  const isAdvantage = mode === 'advantage';
  const isDisadvantage = mode === 'disadvantage';
  const isDualRoll = !hasDicePool && (isAdvantage || isDisadvantage) && r2 !== undefined;

  // Sound effects on trigger
  useEffect(() => {
    audioService.playDiceRoll();
    setIsRolling(true);

    const timer = setTimeout(() => {
      setIsRolling(false);
      if (isNat20) {
        audioService.playCriticalHit();
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [data.id, isNat20]);

  // Which die was kept vs discarded for dual roll
  let r1Discarded = false;
  let r2Discarded = false;
  if (isDualRoll && r2 !== undefined) {
    if (isAdvantage) {
      if (r1 >= r2) {
        r2Discarded = true;
      } else {
        r1Discarded = true;
      }
    } else if (isDisadvantage) {
      if (r1 <= r2) {
        r2Discarded = true;
      } else {
        r1Discarded = true;
      }
    }
  }

  // Header display text
  const locRollerName = rollerName ? (isEn ? (localizeMonsterName(rollerName, 'en') || rollerName) : rollerName) : undefined;
  const locTargetName = targetName ? (isEn ? (localizeMonsterName(targetName, 'en') || targetName) : targetName) : undefined;

  const displayTitle = title
    ? (isEn ? (localizeMonsterName(title, 'en') || title) : title)
    : locRollerName
    ? hasDicePool
      ? `${locRollerName}: ${isEn ? 'Roll' : 'Бросок'}`
      : `${locRollerName}: d${sides}`
    : hasDicePool
    ? (isEn ? 'Dice Roll' : 'Бросок кубиков')
    : (isEn ? `d${sides} Roll` : `Бросок d${sides}`);

  // Die size calculation for pool
  const poolCount = hasDicePool ? dice.length : 1;
  const poolDieSize =
    poolCount === 1 ? 88 : poolCount === 2 ? 76 : poolCount <= 4 ? 64 : poolCount <= 8 ? 56 : 48;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative rounded-glass-xl border-2 border-gold/70 bg-[#0c1017]/95 backdrop-blur-md p-4 text-center shadow-[0_12px_45px_rgba(0,0,0,0.88),0_0_28px_rgba(245,185,32,0.35)] animate-in zoom-in-95 duration-150 flex flex-col gap-2.5 z-50 select-none ${
        isPlayerView ? 'w-80 sm:w-96' : 'w-80 sm:w-[360px]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-glass-border pb-2 gap-2">
        <div className="flex flex-col items-start min-w-0 text-left">
          <div className="flex items-center gap-1.5 min-w-0">
            <Dices className="h-4 w-4 text-gold flex-shrink-0 animate-pulse" />
            <h4 className="text-xs font-serif font-bold text-gold-light truncate" title={displayTitle}>
              {displayTitle}
            </h4>
          </div>
          {(subtitle || targetName) && (
            <span className="text-[10px] text-gray-400 truncate pl-5">
              {subtitle || (locTargetName ? (isEn ? `Target: ${locTargetName}` : `Цель: ${locTargetName}`) : undefined)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {mode !== 'normal' && (
            <span
              className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider border ${
                isAdvantage
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-emerald-glow'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-crimson-glow'
              }`}
            >
              {isAdvantage ? (isEn ? 'Advantage' : 'Преимущество') : (isEn ? 'Disadvantage' : 'Помеха')}
            </span>
          )}

          <button
            onClick={onClose}
            className="min-h-[26px] min-w-[26px] h-6 w-6 flex items-center justify-center text-text-muted hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
            title={isEn ? "Close" : "Закрыть"}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Critical Nat 20 / Nat 1 Badges */}
      {!isRolling && isNat20 && (
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 rounded-full py-1 px-3 shadow-emerald-glow animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
          <span>{isEn ? "CRITICAL SUCCESS (20)!" : "КРИТИЧЕСКИЙ УСПЕХ (20)!"}</span>
        </div>
      )}

      {!isRolling && isNat1 && (
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-300 bg-rose-950/80 border border-rose-500/60 rounded-full py-1 px-3 shadow-crimson-glow animate-bounce">
          <AlertCircle className="h-3.5 w-3.5 text-rose-300" />
          <span>{isEn ? "CRITICAL FAILURE (1)!" : "КРИТИЧЕСКИЙ ПРОВАЛ (1)!"}</span>
        </div>
      )}

      {/* Center 2D Die Animation Area */}
      <div className="flex items-center justify-center my-1 py-1">
        {hasDicePool ? (
          /* Multi-Dice Pool (e.g. 4d6, 3d8, etc.) */
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-[360px]">
            {dice.map((d, index) => (
              <div key={d.id || index} className="flex flex-col items-center gap-1">
                <Animated2dDie
                  sides={d.sides}
                  finalValue={d.value}
                  isRolling={isRolling}
                  isNat20={d.sides === 20 && d.value === 20}
                  isNat1={d.sides === 20 && d.value === 1}
                  isDiscarded={!isRolling && d.isDiscarded}
                  isHighlighted={!isRolling && d.isHighlighted}
                  size={poolDieSize}
                />
                {!isRolling && d.isDiscarded && (
                  <span className="text-[9px] font-mono text-gray-500 line-through">{isEn ? "dropped" : "сброшен"}</span>
                )}
              </div>
            ))}
          </div>
        ) : !isDualRoll ? (
          /* Single Die Roll */
          <div className="flex flex-col items-center gap-1">
            <Animated2dDie
              sides={sides}
              finalValue={kept}
              isRolling={isRolling}
              isNat20={isNat20}
              isNat1={isNat1}
              size={92}
            />
          </div>
        ) : (
          /* Dual Dice Roll (Advantage / Disadvantage) */
          <div className="flex items-center justify-center gap-5">
            {/* Die 1 */}
            <div className="flex flex-col items-center gap-1.5">
              <Animated2dDie
                sides={sides}
                finalValue={r1}
                isRolling={isRolling}
                isDiscarded={!isRolling && r1Discarded}
                isHighlighted={!isRolling && !r1Discarded}
                size={76}
              />
              {!isRolling && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    !r1Discarded
                      ? 'bg-amber-500/20 text-amber-300 border border-gold/60'
                      : 'text-gray-500 line-through'
                  }`}
                >
                  {!r1Discarded ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Check className="h-2.5 w-2.5" /> {isEn ? "Kept" : "Выбран"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      <X className="h-2.5 w-2.5" /> {isEn ? "Dropped" : "Сброшен"}
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Die 2 */}
            <div className="flex flex-col items-center gap-1.5">
              <Animated2dDie
                sides={sides}
                finalValue={r2 ?? kept}
                isRolling={isRolling}
                isDiscarded={!isRolling && r2Discarded}
                isHighlighted={!isRolling && !r2Discarded}
                size={76}
              />
              {!isRolling && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    !r2Discarded
                      ? 'bg-amber-500/20 text-amber-300 border border-gold/60'
                      : 'text-gray-500 line-through'
                  }`}
                >
                  {!r2Discarded ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Check className="h-2.5 w-2.5" /> {isEn ? "Kept" : "Выбран"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      <X className="h-2.5 w-2.5" /> {isEn ? "Dropped" : "Сброшен"}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clean Math Calculation / Result line */}
      {!isRolling && (
        <>
          {hasDicePool ? (
            /* Pool Calculation Breakdown */
            <div className="text-xs font-mono tabular-nums text-gold-light bg-black/60 px-3 py-1.5 rounded-lg border border-glass-border">
              {dice.length > 1 ? (
                <>
                  <span className="text-gray-400">
                    [{dice.filter((d) => !d.isDiscarded).map((d) => d.value).join(' + ')}]
                  </span>
                  {modifier !== 0 && (
                    <span>{modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`}</span>
                  )}
                  <span className="text-gray-400"> = </span>
                  <span className="font-bold text-gold text-sm">{total}</span>
                </>
              ) : modifier !== 0 ? (
                <>
                  <span className="text-gray-400">[{dice[0].value}]</span>
                  <span>{modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`}</span>
                  <span className="text-gray-400"> = </span>
                  <span className="font-bold text-gold text-sm">{total}</span>
                </>
              ) : (
                <>
                  {isEn ? 'Total:' : 'Итог:'}{' '}
                  <span className="font-bold text-gold text-sm">{total}</span>
                </>
              )}
              {damageType && (
                <span className="text-amber-300 ml-1.5 font-sans font-semibold">
                  {damageType}
                </span>
              )}
            </div>
          ) : modifier !== 0 ? (
            /* Single/Dual Die with Modifier */
            <div className="text-xs font-mono tabular-nums text-gold-light bg-black/60 px-3 py-1.5 rounded-lg border border-glass-border">
              <span className="text-gray-400">[{kept}]</span>
              <span>{modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`}</span>
              <span className="text-gray-400"> = </span>
              <span className="font-bold text-gold text-sm">{total}</span>
              {damageType && (
                <span className="text-amber-300 ml-1.5 font-sans font-semibold">
                  {damageType}
                </span>
              )}
            </div>
          ) : isDualRoll ? (
            /* Dual roll without modifier: clean total highlight */
            <div className="text-xs font-mono text-gray-300 bg-black/50 px-3 py-1 rounded-lg border border-glass-border">
              {isEn ? 'Total:' : 'Итог:'} <span className="font-bold text-gold text-sm">{total}</span>
              {damageType && (
                <span className="text-amber-300 ml-1.5 font-sans font-semibold">
                  {damageType}
                </span>
              )}
            </div>
          ) : damageType ? (
            /* Single die without modifier but with damage type */
            <div className="text-xs font-mono text-gray-300 bg-black/50 px-3 py-1 rounded-lg border border-glass-border">
              {isEn ? 'Total:' : 'Итог:'} <span className="font-bold text-gold text-sm">{total}</span>
              <span className="text-amber-300 ml-1.5 font-sans font-semibold">
                {damageType}
              </span>
            </div>
          ) : null /* Single die without modifier and without damageType: NO DUPLICATION! */}
        </>
      )}
    </div>
  );
};
