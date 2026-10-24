import { useMemo } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useCombatNumpadState, setQuickBuffer, setQuickFeedback } from '../../hooks/useCombatNumpadHotkeys';
import { cleanRussianText } from '../../utils/textUtils';
import { Zap, Skull, Check, CornerDownLeft, X, ArrowUpDown, Swords, Heart, Shield } from 'lucide-react';

export function CombatQuickInputHud() {
  const isEn = useSettingsStore((s) => s.language === 'en');
  const {
    combatants,
    inspectedCombatantId,
    currentTurnIndex,
    setInspectedCombatantId,
    applyDamage,
    applyHealing,
    applyTempHp,
    updateCombatant,
  } = useCombatStore();
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

  const targetName = target
    ? isEn
      ? target.name || target.nameRu || ''
      : cleanRussianText(target.nameRu || target.name)
    : isEn
    ? 'None selected'
    : 'Не выбран';
  const hasActiveInput = buffer.trim().length > 0;

  const handleApply = () => {
    if (!target || !buffer.trim()) return;
    const currentBuf = buffer.trim();
    const tName = isEn ? target.name || target.nameRu || '' : cleanRussianText(target.nameRu || target.name);

    let op: 'damage' | 'heal' | 'temp_hp' = 'damage';
    if (currentBuf.includes('+')) op = 'heal';
    else if (currentBuf.includes('/')) op = 'temp_hp';
    else if (currentBuf.includes('-')) op = 'damage';

    const digitsMatch = currentBuf.match(/\d+/);
    const amount = digitsMatch ? parseInt(digitsMatch[0], 10) : 0;

    if (amount > 0) {
      if (op === 'damage') {
        applyDamage(target.id, amount);
        setQuickFeedback({
          text: isEn ? `-${amount} HP damage to ${tName}` : `-${amount} ОЗ урона по ${tName}`,
          type: 'damage',
          timestamp: Date.now(),
        });
      } else if (op === 'heal') {
        applyHealing(target.id, amount);
        setQuickFeedback({
          text: isEn ? `+${amount} HP healing to ${tName}` : `+${amount} ОЗ лечения для ${tName}`,
          type: 'heal',
          timestamp: Date.now(),
        });
      } else if (op === 'temp_hp') {
        applyTempHp(target.id, amount);
        setQuickFeedback({
          text: isEn ? `+${amount} temp HP to ${tName}` : `+${amount} врем. ОЗ для ${tName}`,
          type: 'temp_hp',
          timestamp: Date.now(),
        });
      }
      setTimeout(() => setQuickFeedback(null), 2800);
    }
    setQuickBuffer('');
  };

  const handleKnockout = () => {
    if (!target) return;
    const tName = isEn ? target.name || target.nameRu || '' : cleanRussianText(target.nameRu || target.name);
    if (target.hp > 0) {
      updateCombatant(target.id, { hp: 0, isDying: true, isDead: false });
      setQuickFeedback({
        text: isEn ? `${tName} unconscious (0 HP)` : `${tName} без сознания (0 ОЗ)`,
        type: 'knockout',
        timestamp: Date.now(),
      });
    } else if (!target.isDead) {
      updateCombatant(target.id, { hp: 0, isDying: false, isDead: true });
      setQuickFeedback({
        text: isEn ? `${tName} killed!` : `${tName} погиб!`,
        type: 'knockout',
        timestamp: Date.now(),
      });
    } else {
      updateCombatant(target.id, { hp: 1, isDying: false, isDead: false });
      setQuickFeedback({
        text: isEn ? `${tName} revived (1 HP)` : `${tName} возвращён в строй (1 ОЗ)`,
        type: 'heal',
        timestamp: Date.now(),
      });
    }
    setTimeout(() => setQuickFeedback(null), 2800);
  };

  const handleCycleTarget = () => {
    if (combatants.length <= 1) return;
    const currentIdx = target ? combatants.findIndex((c) => c.id === target.id) : currentTurnIndex;
    const nextIdx = currentIdx >= combatants.length - 1 ? 0 : currentIdx + 1;
    const nextTarget = combatants[nextIdx];
    if (nextTarget) {
      setInspectedCombatantId(nextTarget.id);
    }
  };

  // Don't render anything if no combatants
  if (combatants.length === 0) return null;

  return (
    <aside
      aria-label={isEn ? 'Combat Quick Numpad Input' : 'Быстрый цифровой ввод боя'}
      className="relative flex-shrink-0 px-3 py-1.5 bg-[rgba(14,18,25,0.85)] backdrop-blur-md border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2 text-xs select-none shadow-[0_-4px_16px_rgba(0,0,0,0.4)] transition-all duration-200"
    >
      {/* Target indicator and status */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[11px] text-gray-300">
          <Zap className="w-3 h-3 text-[#f5b920] animate-pulse" />
          <span className="text-gray-400">{isEn ? 'Target:' : 'Цель:'}</span>
          <strong className="text-white font-bold truncate max-w-[120px] sm:max-w-[160px]">
            {targetName}
          </strong>
          {target && (
            <span className="font-mono text-[10px] text-gray-400 tabular-nums">
              ({target.hp}/{target.maxHp} {isEn ? 'HP' : 'ОЗ'})
            </span>
          )}
        </div>

        {/* Feedback alert */}
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

      {/* Active input buffer or shortcuts */}
      {hasActiveInput ? (
        <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-[#f5b920] shadow-[0_0_16px_rgba(245,185,32,0.35)] animate-pulse">
          <span className="text-[10px] uppercase font-bold text-gray-400 font-sans inline-flex items-center gap-1">
            {operation === 'damage' && (
              <>
                <Swords className="w-3 h-3 text-red-400 inline" />
                <span>{isEn ? 'Damage' : 'Урон'}</span>
              </>
            )}
            {operation === 'heal' && (
              <>
                <Heart className="w-3 h-3 text-emerald-400 inline" />
                <span>{isEn ? 'Healing' : 'Лечение'}</span>
              </>
            )}
            {operation === 'temp_hp' && (
              <>
                <Shield className="w-3 h-3 text-blue-400 inline" />
                <span>{isEn ? 'Temp HP' : 'Врем. ОЗ'}</span>
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
            <button
              type="button"
              onClick={handleApply}
              className="px-1 py-0.5 rounded bg-white/10 hover:bg-white/20 font-mono text-white text-[9px] flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
              title={isEn ? 'Apply action (Enter)' : 'Применить действие (Enter)'}
            >
              <span>Enter</span>
              <CornerDownLeft className="w-2.5 h-2.5" />
            </button>
            <span className="text-[10px] text-gray-400 hidden sm:inline">{isEn ? 'Apply' : 'Применить'}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <button
              type="button"
              onClick={() => setQuickBuffer('')}
              className="px-1 py-0.5 rounded bg-white/10 hover:bg-white/20 font-mono text-white text-[9px] flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
              title={isEn ? 'Clear buffer (Esc)' : 'Очистить ввод (Esc)'}
            >
              <span>Esc</span>
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Shortcut cheat sheet and quick action buttons */
        <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-400">
          <button
            type="button"
            onClick={() => setQuickBuffer('-')}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
            title={isEn ? 'Damage: enter amount and press Enter' : 'Урон: введите число и нажмите Enter'}
          >
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 group-hover:bg-red-950/60 border border-white/10 group-hover:border-red-500/50 font-mono text-[10px] text-red-300">
              -14
            </kbd>
            <span className="text-gray-400 group-hover:text-red-200">{isEn ? 'Damage' : 'Урон'}</span>
          </button>
          <span className="text-gray-600">•</span>
          <button
            type="button"
            onClick={() => setQuickBuffer('+')}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
            title={isEn ? 'Healing: enter amount and press Enter' : 'Лечение: введите число и нажмите Enter'}
          >
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 group-hover:bg-emerald-950/60 border border-white/10 group-hover:border-emerald-500/50 font-mono text-[10px] text-emerald-300">
              +10
            </kbd>
            <span className="text-gray-400 group-hover:text-emerald-200">{isEn ? 'Healing' : 'Лечение'}</span>
          </button>
          <span className="text-gray-600">•</span>
          <button
            type="button"
            onClick={() => setQuickBuffer('/')}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
            title={isEn ? 'Temp HP: enter amount and press Enter' : 'Врем. ОЗ: введите число и нажмите Enter'}
          >
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 group-hover:bg-blue-950/60 border border-white/10 group-hover:border-blue-500/50 font-mono text-[10px] text-blue-300">
              /5
            </kbd>
            <span className="text-gray-400 group-hover:text-blue-200">{isEn ? 'Temp HP' : 'Врем. ОЗ'}</span>
          </button>
          <span className="text-gray-600">•</span>
          <button
            type="button"
            onClick={handleKnockout}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
            title={isEn ? 'Toggle Knockout / Death (X / Del)' : 'Переключить нокаут / смерть (X / Del)'}
          >
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 group-hover:bg-purple-950/60 border border-white/10 group-hover:border-purple-500/50 font-mono text-[10px] text-purple-300 flex items-center gap-0.5">
              <Skull className="w-2.5 h-2.5" />
              <span>X/Del</span>
            </kbd>
            <span className="text-gray-400 group-hover:text-purple-200">{isEn ? 'Knockout' : 'Нокаут'}</span>
          </button>
          <span className="text-gray-600">•</span>
          <button
            type="button"
            onClick={handleCycleTarget}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
            title={isEn ? 'Select next combatant (Up/Down Arrows)' : 'Выбрать следующего участника (Стрелки Вверх/Вниз)'}
          >
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 group-hover:bg-amber-950/60 border border-white/10 group-hover:border-[#f5b920]/50 font-mono text-[10px] text-[#fce79f] flex items-center gap-0.5">
              <ArrowUpDown className="w-2.5 h-2.5" />
              <span>{isEn ? 'Arrows' : 'Стрелки'}</span>
            </kbd>
            <span className="text-gray-400 group-hover:text-amber-200">{isEn ? 'Select' : 'Выбрать'}</span>
          </button>
        </div>
      )}
    </aside>
  );
}
