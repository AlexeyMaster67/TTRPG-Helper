import { useMemo } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { useCombatNumpadState } from '../../hooks/useCombatNumpadHotkeys';
import { cleanRussianText } from '../../utils/textUtils';
import { Zap, Skull, Check, CornerDownLeft, X, ArrowUpDown, Swords, Heart, Shield } from 'lucide-react';

export function CombatQuickInputHud() {
  const { combatants, inspectedCombatantId, currentTurnIndex } = useCombatStore();
  const { buffer, feedback } = useCombatNumpadState();

  const target = useMemo(() => {
    if (combatants.length === 0) return null;
    if (inspectedCombatantId) {
      const found = combatants.find((c) => c.id === inspectedCombatantId);
      if (found) return found;
    }
    return combatants[currentTurnIndex] || combatants[0] || null;
  }, [combatants, inspectedCombatantId, currentTurnIndex]);

  // Determine current operation type from buffer
  const operation = useMemo(() => {
    if (!buffer) return null;
    if (buffer.includes('+')) return 'heal';
    if (buffer.includes('/')) return 'temp_hp';
    return 'damage'; // '-' or raw digits default to damage
  }, [buffer]);

  const targetName = target ? cleanRussianText(target.nameRu || target.name) : 'Не выбран';
  const hasActiveInput = buffer.trim().length > 0;

  // Don't render anything if no combatants
  if (combatants.length === 0) return null;

  return (
    <aside
      aria-label="Быстрый цифровой ввод боя"
      className="relative flex-shrink-0 px-3 py-1.5 bg-[rgba(14,18,25,0.85)] backdrop-blur-md border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2 text-xs select-none shadow-[0_-4px_16px_rgba(0,0,0,0.4)] transition-all duration-200"
    >
      {/* Слева: Выбранная цель и индикатор */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[11px] text-gray-300">
          <Zap className="w-3 h-3 text-[#f5b920] animate-pulse" />
          <span className="text-gray-400">Цель:</span>
          <strong className="text-white font-bold truncate max-w-[120px] sm:max-w-[160px]">
            {targetName}
          </strong>
          {target && (
            <span className="font-mono text-[10px] text-gray-400 tabular-nums">
              ({target.hp}/{target.maxHp} ОЗ)
            </span>
          )}
        </div>

        {/* Уведомление об успешном действии (Feedback) */}
        {feedback && (
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold animate-in fade-in zoom-in-95 duration-150 ${
              feedback.type === 'damage'
                ? 'bg-red-950/80 border border-red-500/60 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : feedback.type === 'heal'
                ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : feedback.type === 'temp_hp'
                ? 'bg-blue-950/80 border border-blue-500/60 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                : feedback.type === 'knockout'
                ? 'bg-purple-950/80 border border-purple-500/60 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-amber-950/80 border border-[#f5b920]/60 text-amber-200'
            }`}
          >
            <Check className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Центр: Буфер быстрого ввода цифр и знака */}
      {hasActiveInput ? (
        <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-[#f5b920] shadow-[0_0_16px_rgba(245,185,32,0.35)] animate-pulse">
          <span className="text-[10px] uppercase font-bold text-gray-400 font-sans inline-flex items-center gap-1">
            {operation === 'damage' && (
              <>
                <Swords className="w-3 h-3 text-red-400 inline" />
                <span>Урон</span>
              </>
            )}
            {operation === 'heal' && (
              <>
                <Heart className="w-3 h-3 text-emerald-400 inline" />
                <span>Исцеление</span>
              </>
            )}
            {operation === 'temp_hp' && (
              <>
                <Shield className="w-3 h-3 text-blue-400 inline" />
                <span>Врем. ОЗ</span>
              </>
            )}
          </span>
          <span
            className={`font-mono text-base font-black tabular-nums tracking-wider px-1 ${
              operation === 'heal'
                ? 'text-emerald-400'
                : operation === 'temp_hp'
                ? 'text-blue-400'
                : 'text-red-400'
            }`}
          >
            {buffer}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-white text-[9px] flex items-center gap-0.5">
              <span>Enter</span>
              <CornerDownLeft className="w-2.5 h-2.5" />
            </kbd>
            <span className="text-[10px] text-gray-400 hidden sm:inline">применить</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-white text-[9px] flex items-center gap-0.5">
              <span>Esc</span>
              <X className="w-2.5 h-2.5" />
            </kbd>
          </div>
        </div>
      ) : (
        /* Справа: Шпаргалка хоткеев при отсутствии активного ввода */
        <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[10px] text-red-300">
              -14
            </kbd>
            <span className="text-gray-400">урон</span>
          </span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[10px] text-emerald-300">
              +10
            </kbd>
            <span className="text-gray-400">лечение</span>
          </span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[10px] text-blue-300">
              /5
            </kbd>
            <span className="text-gray-400">врем. ОЗ</span>
          </span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[10px] text-purple-300 flex items-center gap-0.5">
              <Skull className="w-2.5 h-2.5" />
              <span>X/Del</span>
            </kbd>
            <span className="text-gray-400">нокаут</span>
          </span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[10px] text-[#fce79f] flex items-center gap-0.5">
              <ArrowUpDown className="w-2.5 h-2.5" />
              <span>Стрелки</span>
            </kbd>
            <span className="text-gray-400">выбор</span>
          </span>
        </div>
      )}
    </aside>
  );
}
