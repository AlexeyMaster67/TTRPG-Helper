import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Heart, Skull, X, Check } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { HealthBar } from '../../ui';
import { cleanRussianText, localizeMonsterName } from '../../../utils/textUtils';
import { useTranslation } from '../../../i18n';

export interface CombatantHealthControlsProps {
  combatant: Combatant;
  isDying: boolean;
  deathSaves: { successes: number; failures: number };
  onRollDeathSave: (e: React.MouseEvent) => void;
  onDamage: (e: React.MouseEvent, amount: number) => void;
  onHeal: (e: React.MouseEvent, amount: number) => void;
  onApplyCustom: (mode?: 'damage' | 'heal', customVal?: string) => void;
  isHpPopoverOpen: boolean;
  setIsHpPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CombatantHealthControls({
  combatant,
  isDying,
  deathSaves,
  onRollDeathSave,
  onDamage,
  onHeal,
  onApplyCustom,
  isHpPopoverOpen,
  setIsHpPopoverOpen,
}: CombatantHealthControlsProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';
  const [customHpVal, setCustomHpVal] = useState('');
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('bottom');
  const [popoverAlign, setPopoverAlign] = useState<'right' | 'left'>('right');
  const popoverRef = useRef<HTMLDivElement>(null);
  const healthContainerRef = useRef<HTMLDivElement>(null);

  // Position popover intelligently and close on outside click / escape
  useEffect(() => {
    if (!isHpPopoverOpen) return;

    const updatePosition = () => {
      if (healthContainerRef.current) {
        const rect = healthContainerRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        // Strictly flip to top only when near bottom of viewport (< 220px below AND > 220px above)
        if (spaceBelow < 220 && spaceAbove > 220) {
          setPopoverPlacement('top');
        } else {
          setPopoverPlacement('bottom');
        }

        // Align left if health bar is too close to the left viewport boundary (< 150px) to prevent clipping
        if (rect.left < 150) {
          setPopoverAlign('left');
        } else {
          setPopoverAlign('right');
        }
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        healthContainerRef.current &&
        !healthContainerRef.current.contains(e.target as Node)
      ) {
        setIsHpPopoverOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHpPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHpPopoverOpen, setIsHpPopoverOpen]);

  const handleCustomSubmit = (mode?: 'damage' | 'heal') => {
    onApplyCustom(mode, customHpVal);
    setCustomHpVal('');
  };

  return (
    <div
      ref={healthContainerRef}
      onClick={(e) => {
        e.stopPropagation();
        setIsHpPopoverOpen((prev) => !prev);
      }}
      title={isEn ? "Click for quick deltas, damage and healing" : "Кликните для быстрых дельт, урона и лечения"}
      className={clsx("relative w-[124px] sm:w-[136px] flex-shrink-0 cursor-pointer rounded p-0.5 hover:bg-white/[0.04] transition-all", isHpPopoverOpen && "z-50")}
    >
      {isDying ? (
        <div className="flex items-center justify-between gap-1 px-1.5 py-1 rounded bg-red-950/50 border border-red-500/50 text-[10px] shadow-sm">
          <span className="font-extrabold text-rose-400 flex items-center gap-1">
            <Skull className="h-3 w-3 animate-pulse" />
            <span>0</span>
          </span>
          <span className="text-[9px] font-mono font-bold text-gray-200 inline-flex items-center gap-0.5">
            <span className="text-emerald-400 inline-flex items-center">{deathSaves.successes}<Check className="h-2.5 w-2.5 ml-0.5" /></span>
            <span className="text-gray-500 mx-0.5">/</span>
            <span className="text-rose-400 inline-flex items-center">{deathSaves.failures}<X className="h-2.5 w-2.5 ml-0.5" /></span>
          </span>
          <button
            onClick={onRollDeathSave}
            title={isEn ? "Roll death saving throw" : "Бросок спасброска от смерти"}
            className="px-1.5 py-0.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded text-[9px] font-black uppercase tracking-wider shadow-sm active:scale-95"
          >
            d20
          </button>
        </div>
      ) : (
        <HealthBar
          current={combatant.hp}
          max={combatant.maxHp}
          temp={combatant.tempHp}
          size="sm"
        />
      )}

      {/* Floating Popover directly over/under the Health Bar */}
      {isHpPopoverOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            'absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-glass-lg border border-gold/40 bg-[#0d1219]/98 backdrop-blur-xl shadow-glass-xl p-3 animate-in fade-in duration-100 flex flex-col gap-2.5',
            popoverPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-1.5',
            popoverAlign === 'left' ? 'left-0' : 'right-0'
          )}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-100 min-w-0">
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20 flex-shrink-0" />
              <span className="truncate max-w-[120px]" title={
                language === 'en'
                  ? (combatant.name && !/[а-яА-ЯёЁ]/.test(combatant.name)
                      ? combatant.name
                      : (localizeMonsterName(combatant.nameRu || combatant.name, 'en') || combatant.name || ''))
                  : cleanRussianText(combatant.nameRu || combatant.name)
              }>
                {language === 'en'
                  ? (combatant.name && !/[а-яА-ЯёЁ]/.test(combatant.name)
                      ? combatant.name
                      : (localizeMonsterName(combatant.nameRu || combatant.name, 'en') || combatant.name || ''))
                  : cleanRussianText(combatant.nameRu || combatant.name)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono text-xs font-black tabular-nums text-gold-light whitespace-nowrap">
                {combatant.hp} <span className="text-gray-500 font-normal">/</span> {combatant.maxHp} {language === 'en' ? 'HP' : 'ОЗ'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHpPopoverOpen(false);
                }}
                className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10 cursor-pointer"
                title={language === 'en' ? 'Close' : 'Закрыть'}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Deltas: DDB Encounter Tracker layout */}
          <div className="grid grid-cols-2 gap-2">
            {/* Damage: -10, -5, -1 */}
            <div className="flex items-center justify-between gap-1 bg-red-950/20 p-1 rounded-glass-sm border border-red-500/20">
              <button
                onClick={(e) => onDamage(e, 10)}
                title={language === 'en' ? 'Deal 10 damage' : 'Нанести 10 урона'}
                className="flex-1 py-1 px-0.5 text-center font-mono font-black text-xs text-rose-100 bg-red-900/60 hover:bg-red-800 border border-red-500/40 hover:border-red-400 rounded transition-all active:scale-95 leading-tight whitespace-nowrap cursor-pointer shadow-sm"
              >
                -10
              </button>
              <button
                onClick={(e) => onDamage(e, 5)}
                title={language === 'en' ? 'Deal 5 damage' : 'Нанести 5 урона'}
                className="flex-1 py-1 px-0.5 text-center font-mono font-black text-xs text-rose-100 bg-red-900/60 hover:bg-red-800 border border-red-500/40 hover:border-red-400 rounded transition-all active:scale-95 leading-tight whitespace-nowrap cursor-pointer shadow-sm"
              >
                -5
              </button>
              <button
                onClick={(e) => onDamage(e, 1)}
                title={language === 'en' ? 'Deal 1 damage' : 'Нанести 1 урон'}
                className="flex-1 py-1 px-0.5 text-center font-mono font-black text-xs text-rose-100 bg-red-900/60 hover:bg-red-800 border border-red-500/40 hover:border-red-400 rounded transition-all active:scale-95 leading-tight whitespace-nowrap cursor-pointer shadow-sm"
              >
                -1
              </button>
            </div>

            {/* Heal: +1, +5, +10 */}
            <div className="flex items-center justify-between gap-1 bg-emerald-950/20 p-1 rounded-glass-sm border border-emerald-500/20">
              <button
                onClick={(e) => onHeal(e, 1)}
                title={language === 'en' ? 'Heal 1 HP' : 'Восстановить 1 ОЗ'}
                className="flex-1 py-1 px-0.5 text-center font-mono font-black text-xs text-emerald-100 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-500/40 hover:border-emerald-400 rounded transition-all active:scale-95 leading-tight whitespace-nowrap cursor-pointer shadow-sm"
              >
                +1
              </button>
              <button
                onClick={(e) => onHeal(e, 5)}
                title={language === 'en' ? 'Heal 5 HP' : 'Восстановить 5 ОЗ'}
                className="flex-1 py-1 px-0.5 text-center font-mono font-black text-xs text-emerald-100 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-500/40 hover:border-emerald-400 rounded transition-all active:scale-95 leading-tight whitespace-nowrap cursor-pointer shadow-sm"
              >
                +5
              </button>
              <button
                onClick={(e) => onHeal(e, 10)}
                title={language === 'en' ? 'Heal 10 HP' : 'Восстановить 10 ОЗ'}
                className="flex-1 py-1 px-0.5 text-center font-mono font-black text-xs text-emerald-100 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-500/40 hover:border-emerald-400 rounded transition-all active:scale-95 leading-tight whitespace-nowrap cursor-pointer shadow-sm"
              >
                +10
              </button>
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <input
              type="number"
              min="1"
              placeholder={language === 'en' ? 'Amount...' : 'Количество...'}
              value={customHpVal}
              autoFocus
              onChange={(e) => setCustomHpVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit();
                if (e.key === 'Escape') setIsHpPopoverOpen(false);
              }}
              className="flex-1 min-w-0 h-7 px-2 bg-black/60 border border-white/10 rounded text-xs font-mono text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-gold/70"
            />
            <button
              onClick={() => handleCustomSubmit('damage')}
              disabled={!customHpVal || parseInt(customHpVal, 10) <= 0}
              className="h-7 px-2.5 bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white rounded text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex-shrink-0 whitespace-nowrap leading-none cursor-pointer inline-flex items-center justify-center"
            >
              {language === 'en' ? 'Damage' : 'Урон'}
            </button>
            <button
              onClick={() => handleCustomSubmit('heal')}
              disabled={!customHpVal || parseInt(customHpVal, 10) <= 0}
              className="h-7 px-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white rounded text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex-shrink-0 whitespace-nowrap leading-none cursor-pointer inline-flex items-center justify-center"
            >
              {language === 'en' ? 'Heal' : 'Лечение'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
