import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Swords, Heart, Shield, X, ChevronRight } from 'lucide-react';
import { Combatant } from '../../../types/combat';

export interface CombatantQuickActionsProps {
  combatant: Combatant;
  onAttack: () => void;
  onToggleHpPopover: () => void;
  onRollSave: (statName: string, nameRu: string, bonus: number) => void;
  onNextTurn: () => void;
}

export function CombatantQuickActions({
  combatant,
  onAttack,
  onToggleHpPopover,
  onRollSave,
  onNextTurn,
}: CombatantQuickActionsProps) {
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const savePopoverRef = useRef<HTMLDivElement>(null);

  // Close save popover on click outside
  useEffect(() => {
    if (!isSavePopoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (savePopoverRef.current && !savePopoverRef.current.contains(e.target as Node)) {
        setIsSavePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isSavePopoverOpen]);

  const getSaveOptions = () => {
    const sb = combatant.statblock;
    const stats = [
      { stat: 'str', nameRu: 'СИЛ', score: sb?.str ?? 10 },
      { stat: 'dex', nameRu: 'ЛОВ', score: sb?.dex ?? 10 },
      { stat: 'con', nameRu: 'ТЕЛ', score: sb?.con ?? 10 },
      { stat: 'intellect', nameRu: 'ИНТ', score: sb?.intellect ?? 10 },
      { stat: 'wis', nameRu: 'МДР', score: sb?.wis ?? 10 },
      { stat: 'cha', nameRu: 'ХАР', score: sb?.cha ?? 10 },
    ];

    return stats.map((st) => {
      const explicitSave =
        sb?.saves?.[st.stat.toUpperCase()] ??
        sb?.saves?.[st.stat] ??
        sb?.saves?.[st.nameRu];
      const mod = Math.floor((st.score - 10) / 2);
      const bonus = explicitSave !== undefined ? Number(explicitSave) : mod;
      const isProficient = explicitSave !== undefined;
      return {
        ...st,
        bonus,
        isProficient,
      };
    });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.08)] grid grid-cols-2 sm:grid-cols-4 gap-2 select-none"
    >
      {/* [ Атака ] — Ghost */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAttack();
        }}
        title="Выбрать атаку или цель"
        className="min-h-[34px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-glass bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 text-gray-200 hover:text-white font-semibold text-xs transition-all whitespace-nowrap cursor-pointer"
      >
        <Swords className="h-3.5 w-3.5 flex-shrink-0 text-[#f5b920]" />
        <span>Атака</span>
      </button>

      {/* [ Урон/ОЗ ] — Ghost */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleHpPopover();
        }}
        title="Быстрый ввод урона или восстановления здоровья"
        className="min-h-[34px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-glass bg-[rgba(255,255,255,0.03)] hover:bg-rose-950/40 border border-[rgba(255,255,255,0.08)] hover:border-rose-500/50 text-gray-200 hover:text-rose-200 font-semibold text-xs transition-all whitespace-nowrap cursor-pointer"
      >
        <Heart className="h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
        <span>Урон / ОЗ</span>
      </button>

      {/* [ Спасбросок ] — Ghost */}
      <div className="relative" ref={savePopoverRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsSavePopoverOpen((prev) => !prev);
          }}
          title="Бросить спасбросок характеристик d20"
          className="min-h-[34px] w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-glass bg-[rgba(255,255,255,0.03)] hover:bg-blue-950/40 border border-[rgba(255,255,255,0.08)] hover:border-blue-500/50 text-gray-200 hover:text-blue-200 font-semibold text-xs transition-all whitespace-nowrap cursor-pointer"
        >
          <Shield className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
          <span>Спасбросок</span>
        </button>

        {/* Quick Saves Mini-Popover */}
        {isSavePopoverOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute z-50 bottom-full mb-2 left-0 sm:left-auto sm:right-0 w-64 p-3 rounded-glass-xl bg-[rgba(20,26,38,0.96)] border border-blue-400/70 shadow-2xl backdrop-blur-xl ring-1 ring-black/80 flex flex-col gap-2.5 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-1.5">
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider font-sans">
                Спасбросок:
              </span>
              <button
                type="button"
                onClick={() => setIsSavePopoverOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {getSaveOptions().map((st) => (
                <button
                  key={st.stat}
                  type="button"
                  onClick={() => {
                    onRollSave(st.stat, st.nameRu, st.bonus);
                    setIsSavePopoverOpen(false);
                  }}
                  className={clsx(
                    'min-h-[34px] flex flex-col items-center justify-center py-1 px-1 rounded-glass border text-xs font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer',
                    st.isProficient
                      ? 'bg-blue-950/80 border-blue-500/80 text-blue-200 font-bold shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                      : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-gray-300 hover:border-blue-400 hover:text-white'
                  )}
                  title={`Бросить спасбросок ${st.nameRu} (1d20 ${st.bonus >= 0 ? `+${st.bonus}` : st.bonus})`}
                >
                  <span className="text-[10px] font-sans font-semibold text-gray-400">{st.nameRu}</span>
                  <span className="font-bold text-white tabular-nums">
                    {st.bonus >= 0 ? `+${st.bonus}` : st.bonus}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* [ Завершить ход ] — PRIMARY BUTTON с золотым свечением */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNextTurn();
        }}
        title="Завершить ход и передать следующему (Пробел)"
        className="min-h-[34px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-glass bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] border border-[#f5b920] text-[#0c0d12] font-black text-xs shadow-[0_0_18px_rgba(245,185,32,0.4)] hover:shadow-[0_0_26px_rgba(245,185,32,0.55)] transition-all whitespace-nowrap cursor-pointer leading-tight"
      >
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
        <span>Ход</span>
      </button>
    </div>
  );
}
