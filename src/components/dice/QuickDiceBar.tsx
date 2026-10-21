import React, { useState } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { useDice3dStore } from '../../store/dice3dStore';
import { useDiceAnimationStore } from '../../store/diceAnimationStore';
import { rollDie } from '../../engine/rolls';
import { Dice2dRollCard, Dice2dRollData } from './Dice2dRollCard';
import {
  Dices,
  ChevronUp,
  ChevronDown,
  Minus,
  Plus,
  Radio,
  EyeOff,
  Eye,
} from 'lucide-react';

type AdvantageMode = 'normal' | 'advantage' | 'disadvantage';

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];

export const QuickDiceBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [advantageMode, setAdvantageMode] = useState<AdvantageMode>('normal');
  const [modifier, setModifier] = useState<number>(0);
  const [broadcastActive, setBroadcastActive] = useState<boolean>(true);
  const activeRoll = useDiceAnimationStore((s) => s.activeRoll);
  const clearRoll = useDiceAnimationStore((s) => s.clearRoll);

  const combatants = useCombatStore((s) => s.combatants);
  const activeCombatantId = useCombatStore((s) => s.activeCombatantId);
  const addDiceLog = useCombatStore((s) => s.addDiceLog);

  const isSecretRoll = useDice3dStore((s) => s.isSecretRoll);
  const toggleSecretRoll = useDice3dStore((s) => s.toggleSecretRoll);

  const handleRoll = (sides: number) => {
    // 1. Perform roll with advantage / disadvantage logic
    const r1 = rollDie(sides);
    let r2: number | undefined;
    let kept = r1;

    if (advantageMode === 'advantage') {
      r2 = rollDie(sides);
      kept = Math.max(r1, r2);
    } else if (advantageMode === 'disadvantage') {
      r2 = rollDie(sides);
      kept = Math.min(r1, r2);
    }

    const total = kept + modifier;
    const isNat20 = sides === 20 && kept === 20;
    const isNat1 = sides === 20 && kept === 1;

    const activeCombatant = combatants.find((c) => c.id === activeCombatantId);
    const rollerName = activeCombatant
      ? activeCombatant.nameRu || activeCombatant.name
      : undefined;

    const title = rollerName ? `${rollerName}: d${sides}` : `Бросок d${sides}`;

    const rollData: Dice2dRollData = {
      id: crypto.randomUUID(),
      sides,
      r1,
      r2,
      kept,
      modifier,
      total,
      mode: advantageMode,
      isNat20,
      isNat1,
      title,
      rollerName,
    };

    // 2. Trigger global 2D animated dice roll (auto broadcasts if broadcastActive && !isSecret)
    useDiceAnimationStore.getState().triggerRoll(rollData, broadcastActive);

    // 3. Log to combat history
    const modStr =
      modifier !== 0
        ? modifier > 0
          ? ` + ${modifier}`
          : ` - ${Math.abs(modifier)}`
        : '';
    const formulaStr = `d${sides}${r2 !== undefined ? `[${r1}, ${r2}]` : `(${kept})`}${modStr} = ${total}`;

    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: isSecretRoll
        ? `[Скрытно] ${rollerName || 'Быстрый бросок'}`
        : rollerName || 'Быстрый бросок',
      actionName: `${isSecretRoll ? '[Скрытно] ' : ''}Бросок d${sides}${modStr}`,
      attackRoll:
        sides === 20
          ? {
              d20: kept,
              modifier,
              total,
              isNat20,
              isNat1,
            }
          : undefined,
      damageRoll:
        sides !== 20
          ? {
              formula: `1d${sides}${modStr}`,
              total,
              damageType: 'Универсальный',
              details: formulaStr,
            }
          : undefined,
      note: isNat20
        ? `КРИТИЧЕСКИЙ УСПЕХ! ${formulaStr}`
        : isNat1
        ? `КРИТИЧЕСКИЙ ПРОВАЛ! ${formulaStr}`
        : formulaStr,
    });
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 select-none">
      {/* 2D Animated Dice Popover Result (Centered directly above bar, no side-window!) */}
      {activeRoll && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50">
          <Dice2dRollCard
            data={activeRoll}
            onClose={clearRoll}
          />
        </div>
      )}

      {/* Main Bar */}
      {!isExpanded ? (
        /* Collapsed Floating Pill */
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2.5 rounded-full border border-gold/50 bg-surface/85 px-4 py-2 min-h-[36px] text-xs font-semibold text-gold-light shadow-glass-panel backdrop-blur-md hover:border-gold hover:bg-surface/95 hover:text-gold hover:shadow-gold-glow transition-all cursor-pointer active:scale-95"
          title="Развернуть панель быстрых костей"
        >
          <Dices className="h-4 w-4 text-gold animate-pulse" />
          <span>Быстрые кости</span>
          <ChevronUp className="h-4 w-4 text-text-muted" />
        </button>
      ) : (
        /* Expanded Floating Tray */
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-glass-xl border border-glass-border bg-surface/90 px-3.5 py-2 text-xs text-text-primary shadow-glass-panel backdrop-blur-md">
          {/* Collapse Handle */}
          <button
            onClick={() => setIsExpanded(false)}
            className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors cursor-pointer"
            title="Свернуть панель"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Advantage / Disadvantage Mode Selector */}
          <div className="inline-flex items-center rounded-xl bg-black/40 p-1 border border-glass-border gap-1">
            <button
              onClick={() => setAdvantageMode('normal')}
              className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                advantageMode === 'normal'
                  ? 'bg-gold/15 text-gold-light border border-gold/50 shadow-gold-glow'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5 border border-transparent'
              }`}
              title="Обычный бросок (1 кость)"
            >
              Обычный
            </button>
            <button
              onClick={() => setAdvantageMode('advantage')}
              className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                advantageMode === 'advantage'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 shadow-emerald-glow'
                  : 'text-text-muted hover:text-emerald-300 hover:bg-emerald-950/30 border border-transparent'
              }`}
              title="Преимущество: бросок 2 костей, выбирается наибольший результат"
            >
              Преимущество
            </button>
            <button
              onClick={() => setAdvantageMode('disadvantage')}
              className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                advantageMode === 'disadvantage'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/60 shadow-crimson-glow'
                  : 'text-text-muted hover:text-rose-300 hover:bg-rose-950/30 border border-transparent'
              }`}
              title="Помеха: бросок 2 костей, выбирается наименьший результат"
            >
              Помеха
            </button>
          </div>

          {/* Modifier Input Controls */}
          <div className="inline-flex items-center gap-0.5 bg-black/40 rounded-xl p-1 border border-glass-border">
            <button
              onClick={() => setModifier((m) => m - 1)}
              className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Уменьшить модификатор"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setModifier(0)}
              className="min-h-[32px] px-2.5 rounded-lg font-mono tabular-nums text-xs font-bold text-gold-light hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
              title="Сбросить модификатор в 0"
            >
              {modifier >= 0 ? `+${modifier}` : modifier}
            </button>
            <button
              onClick={() => setModifier((m) => m + 1)}
              className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Увеличить модификатор"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

          {/* Quick Dice Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {QUICK_DICE.map((sides) => {
              const isD20 = sides === 20;
              return (
                <button
                  key={sides}
                  onClick={() => handleRoll(sides)}
                  className={`group relative flex min-h-[34px] min-w-[38px] items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold font-mono tabular-nums transition-all active:scale-95 cursor-pointer ${
                    isD20
                      ? 'border border-gold/70 text-gold-light bg-gold/15 bg-gradient-to-b from-gold/25 to-gold/10 hover:border-gold hover:shadow-gold-glow shadow-[0_0_12px_rgba(245,185,32,0.2)]'
                      : 'bg-card border border-glass-border text-text-primary hover:border-gold/50 hover:text-gold-light hover:bg-gold/10 hover:shadow-gold-glow'
                  }`}
                  title={`Бросить d${sides}${modifier !== 0 ? ` (${modifier >= 0 ? `+${modifier}` : modifier})` : ''}`}
                >
                  <span>d{sides}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

          {/* Secret Roll (GM Hidden Roll) Toggle */}
          <button
            onClick={toggleSecretRoll}
            className={`flex items-center gap-1.5 h-8 px-2.5 min-h-[32px] rounded-lg transition-all cursor-pointer active:scale-95 text-xs font-semibold ${
              isSecretRoll
                ? 'text-rose-300 bg-rose-950/80 border border-rose-500/70 shadow-crimson-glow'
                : 'text-text-muted hover:text-text-primary hover:bg-white/10 border border-glass-border'
            }`}
            title={
              isSecretRoll
                ? 'Скрытый бросок Мастера (активен, бросок не увидят игроки)'
                : 'Публичный бросок (нажмите, чтобы скрыть бросок от игроков)'
            }
          >
            {isSecretRoll ? <EyeOff className="h-3.5 w-3.5 text-rose-300" /> : <Eye className="h-3.5 w-3.5 text-text-muted" />}
            <span className="text-[11px] font-mono">{isSecretRoll ? 'Скрытно' : 'Видно'}</span>
          </button>

          {/* Player Screen Broadcasting Toggle */}
          <button
            onClick={() => setBroadcastActive((b) => !b)}
            disabled={isSecretRoll}
            className={`flex items-center gap-1.5 h-8 px-2.5 min-h-[32px] rounded-lg transition-all cursor-pointer active:scale-95 text-xs font-semibold ${
              isSecretRoll
                ? 'opacity-40 cursor-not-allowed border border-glass-border text-text-muted'
                : broadcastActive
                ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-500/70 shadow-emerald-glow'
                : 'text-text-muted hover:text-text-primary hover:bg-white/10 border border-glass-border'
            }`}
            title={
              isSecretRoll
                ? 'Скрытый бросок: трансляция на экран игроков отключена'
                : broadcastActive
                ? 'Трансляция на экран игроков: ВКЛ (нажмите для отключения)'
                : 'Трансляция на экран игроков: ВЫКЛ (нажмите для включения)'
            }
          >
            <Radio
              className={`h-3.5 w-3.5 ${
                broadcastActive && !isSecretRoll ? 'text-emerald-400 animate-pulse' : 'text-text-muted'
              }`}
            />
            <span className="text-[11px] font-mono">
              {broadcastActive && !isSecretRoll ? 'Игроки: ВКЛ' : 'Игроки: ВЫКЛ'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
