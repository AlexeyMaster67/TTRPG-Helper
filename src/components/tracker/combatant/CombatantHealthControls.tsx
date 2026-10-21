import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Heart, Skull, X } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { HealthBar } from '../../ui';
import { cleanRussianText } from '../../../utils/textUtils';

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
  const [customHpVal, setCustomHpVal] = useState('');
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');
  const [popoverAlign, setPopoverAlign] = useState<'right' | 'left'>('right');
  const popoverRef = useRef<HTMLDivElement>(null);
  const healthContainerRef = useRef<HTMLDivElement>(null);

  // Position popover intelligently and close on outside click / escape
  useEffect(() => {
    if (!isHpPopoverOpen) return;

    if (healthContainerRef.current) {
      const rect = healthContainerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceAbove < 220 && spaceBelow > spaceAbove) {
        setPopoverPlacement('bottom');
      } else {
        setPopoverPlacement('top');
      }

      // If health bar is too close to the left edge of viewport (< 300px), align left to prevent clipping
      if (rect.right < 300) {
        setPopoverAlign('left');
      } else {
        setPopoverAlign('right');
      }
    }

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
      title="Кликните для быстрых дельт, урона и лечения"
      className={clsx("relative w-[120px] sm:w-[130px] flex-shrink-0 cursor-pointer rounded p-0.5 hover:ring-1 hover:ring-gold/40 transition-all", isHpPopoverOpen && "z-50")}
    >
      {isDying ? (
        <div className="flex items-center justify-between gap-1 p-1 rounded bg-crimson/15 border border-crimson/40 text-[10px]">
          <span className="font-bold text-red-400 flex items-center gap-0.5">
            <Skull className="h-3 w-3" />
            0
          </span>
          <span className="text-[9px] font-mono text-gray-300">
            {deathSaves.successes}✓ / {deathSaves.failures}✗
          </span>
          <button
            onClick={onRollDeathSave}
            title="Бросок спасброска от смерти"
            className="px-1.5 py-0.2 bg-crimson text-white hover:bg-red-600 rounded text-[9px] font-bold"
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
            'absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-gold/50 bg-[#141b21] shadow-2xl p-3 animate-in fade-in duration-100 flex flex-col gap-2.5 ring-1 ring-black/50',
            popoverPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            popoverAlign === 'left' ? 'left-0' : 'right-0'
          )}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-[#2e3b46] pb-1.5 gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-100 min-w-0">
              <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500/20 flex-shrink-0" />
              <span className="truncate max-w-[120px]" title={cleanRussianText(combatant.nameRu || combatant.name)}>
                {cleanRussianText(combatant.nameRu || combatant.name)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono text-xs font-black tabular-nums text-gold-light whitespace-nowrap">
                {combatant.hp} <span className="text-gray-500 font-normal">/</span> {combatant.maxHp} ОЗ
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHpPopoverOpen(false);
                }}
                className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-[#202a32]"
                title="Закрыть"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Deltas: DDB Encounter Tracker layout */}
          <div className="grid grid-cols-2 gap-2">
            {/* Damage: -10, -5, -1 */}
            <div className="flex items-center justify-between gap-1 bg-[#1a1112] p-1 rounded border border-red-950/60">
              <button
                onClick={(e) => onDamage(e, 10)}
                title="Нанести 10 урона"
                className="flex-1 py-1.5 px-0.5 text-center font-mono font-black text-xs text-red-100 bg-gradient-to-b from-[#8c251a] to-[#7a2016] hover:from-[#a82e21] hover:to-[#8c251a] border border-[#b8382b]/80 rounded shadow-sm transition-all active:scale-95 leading-tight whitespace-nowrap"
              >
                -10
              </button>
              <button
                onClick={(e) => onDamage(e, 5)}
                title="Нанести 5 урона"
                className="flex-1 py-1.5 px-0.5 text-center font-mono font-black text-xs text-red-100 bg-gradient-to-b from-[#8c251a] to-[#7a2016] hover:from-[#a82e21] hover:to-[#8c251a] border border-[#b8382b]/80 rounded shadow-sm transition-all active:scale-95 leading-tight whitespace-nowrap"
              >
                -5
              </button>
              <button
                onClick={(e) => onDamage(e, 1)}
                title="Нанести 1 урон"
                className="flex-1 py-1.5 px-0.5 text-center font-mono font-black text-xs text-red-100 bg-gradient-to-b from-[#8c251a] to-[#7a2016] hover:from-[#a82e21] hover:to-[#8c251a] border border-[#b8382b]/80 rounded shadow-sm transition-all active:scale-95 leading-tight whitespace-nowrap"
              >
                -1
              </button>
            </div>

            {/* Heal: +1, +5, +10 */}
            <div className="flex items-center justify-between gap-1 bg-[#0d1c15] p-1 rounded border border-emerald-950/60">
              <button
                onClick={(e) => onHeal(e, 1)}
                title="Восстановить 1 ОЗ"
                className="flex-1 py-1.5 px-0.5 text-center font-mono font-black text-xs text-emerald-100 bg-gradient-to-b from-[#0f5436] to-[#0a3d27] hover:from-[#136b45] hover:to-[#0f5436] border border-emerald-500/70 rounded shadow-sm transition-all active:scale-95 leading-tight whitespace-nowrap"
              >
                +1
              </button>
              <button
                onClick={(e) => onHeal(e, 5)}
                title="Восстановить 5 ОЗ"
                className="flex-1 py-1.5 px-0.5 text-center font-mono font-black text-xs text-emerald-100 bg-gradient-to-b from-[#0f5436] to-[#0a3d27] hover:from-[#136b45] hover:to-[#0f5436] border border-emerald-500/70 rounded shadow-sm transition-all active:scale-95 leading-tight whitespace-nowrap"
              >
                +5
              </button>
              <button
                onClick={(e) => onHeal(e, 10)}
                title="Восстановить 10 ОЗ"
                className="flex-1 py-1.5 px-0.5 text-center font-mono font-black text-xs text-emerald-100 bg-gradient-to-b from-[#0f5436] to-[#0a3d27] hover:from-[#136b45] hover:to-[#0f5436] border border-emerald-500/70 rounded shadow-sm transition-all active:scale-95 leading-tight whitespace-nowrap"
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
              placeholder="Урон / Лечение..."
              value={customHpVal}
              autoFocus
              onChange={(e) => setCustomHpVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit();
                if (e.key === 'Escape') setIsHpPopoverOpen(false);
              }}
              className="flex-1 min-w-0 h-7 px-2 bg-[#10151a] border border-[#2e3b46] rounded text-xs font-mono text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-gold"
            />
            <button
              onClick={() => handleCustomSubmit('damage')}
              disabled={!customHpVal || parseInt(customHpVal, 10) <= 0}
              className="px-2.5 py-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-40 text-white rounded text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex-shrink-0 whitespace-nowrap leading-none"
            >
              Урон
            </button>
            <button
              onClick={() => handleCustomSubmit('heal')}
              disabled={!customHpVal || parseInt(customHpVal, 10) <= 0}
              className="px-2.5 py-1 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 disabled:opacity-40 text-white rounded text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex-shrink-0 whitespace-nowrap leading-none"
            >
              Лечение
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
