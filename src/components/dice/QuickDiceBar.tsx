import React, { useState, useRef, useEffect } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { useDice3dStore } from '../../store/dice3dStore';
import { audioService } from '../../services/audioService';
import { broadcastService } from '../../services/broadcastService';
import { rollDie } from '../../engine/rolls';
import {
  Dices,
  ChevronUp,
  ChevronDown,
  Minus,
  Plus,
  Radio,
  X,
  Box,
  EyeOff,
  Eye,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

type AdvantageMode = 'normal' | 'advantage' | 'disadvantage';

interface RollPopoverData {
  sides: number;
  r1: number;
  r2?: number;
  kept: number;
  modifier: number;
  total: number;
  mode: AdvantageMode;
  breakdown: string;
  isNat20: boolean;
  isNat1: boolean;
}

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];

export const QuickDiceBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [advantageMode, setAdvantageMode] = useState<AdvantageMode>('normal');
  const [modifier, setModifier] = useState<number>(0);
  const [broadcastActive, setBroadcastActive] = useState<boolean>(true);
  const [popover, setPopover] = useState<RollPopoverData | null>(null);

  const popoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const combatants = useCombatStore((s) => s.combatants);
  const activeCombatantId = useCombatStore((s) => s.activeCombatantId);
  const addDiceLog = useCombatStore((s) => s.addDiceLog);

  const is3dEnabled = useDice3dStore((s) => s.is3dEnabled);
  const toggle3dEnabled = useDice3dStore((s) => s.toggle3dEnabled);
  const isSecretRoll = useDice3dStore((s) => s.isSecretRoll);
  const toggleSecretRoll = useDice3dStore((s) => s.toggleSecretRoll);
  const rollDice3d = useDice3dStore((s) => s.rollDice3d);

  // Auto-dismiss popover after 5 seconds
  useEffect(() => {
    if (popover) {
      if (popoverTimerRef.current) clearTimeout(popoverTimerRef.current);
      popoverTimerRef.current = setTimeout(() => {
        setPopover(null);
      }, 5000);
    }
    return () => {
      if (popoverTimerRef.current) clearTimeout(popoverTimerRef.current);
    };
  }, [popover]);

  const handleRoll = (sides: number) => {
    // 1. Play dice sound effect via audioService
    audioService.playDiceRoll();

    // 2. Perform roll with advantage / disadvantage logic
    const r1 = rollDie(sides);
    let r2: number | undefined;
    let kept = r1;
    let modeText = '';

    if (advantageMode === 'advantage') {
      r2 = rollDie(sides);
      kept = Math.max(r1, r2);
      modeText = ' (Преимущество)';
    } else if (advantageMode === 'disadvantage') {
      r2 = rollDie(sides);
      kept = Math.min(r1, r2);
      modeText = ' (Помеха)';
    }

    const total = kept + modifier;
    const isNat20 = sides === 20 && kept === 20;
    const isNat1 = sides === 20 && kept === 1;

    // Build math breakdown: e.g. d20(18) + 3 = 21 or d20[18, 7] -> 18 + 3 = 21
    let dicePart = `d${sides}(${kept})`;
    if (r2 !== undefined) {
      dicePart = `d${sides}[${r1}, ${r2}] -> ${kept}${modeText}`;
    }

    const modStr =
      modifier !== 0
        ? modifier > 0
          ? ` + ${modifier}`
          : ` - ${Math.abs(modifier)}`
        : '';
    const breakdown = `${dicePart}${modStr} = ${total}`;

    const popoverData: RollPopoverData = {
      sides,
      r1,
      r2,
      kept,
      modifier,
      total,
      mode: advantageMode,
      breakdown,
      isNat20,
      isNat1,
    };
    setPopover(popoverData);

    // 3. Log roll to diceHistory / diceLog in combatStore
    const activeCombatant = combatants.find((c) => c.id === activeCombatantId);
    const rollerName = activeCombatant
      ? activeCombatant.nameRu || activeCombatant.name
      : 'Быстрый бросок';
    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const actionTitle = `${isSecretRoll ? '[Скрытно] ' : ''}Бросок d${sides}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`;
    const cleanNote = isNat20
      ? `КРИТИЧЕСКИЙ УСПЕХ! ${breakdown}`
      : isNat1
      ? `КРИТИЧЕСКИЙ ПРОВАЛ! ${breakdown}`
      : breakdown;

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: isSecretRoll ? `[Скрытно] ${rollerName}` : rollerName,
      actionName: actionTitle,
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
              details: breakdown,
            }
          : undefined,
      note: cleanNote,
    });

    // 4. Trigger 3D Dice Simulation if enabled
    if (is3dEnabled) {
      rollDice3d({
        dice: [{ sides, result: kept }],
        title: `${rollerName}: d${sides}`,
        total,
        isSecret: isSecretRoll,
      });
    }

    // 5. Broadcast roll to Player Display View if broadcast is active AND not secret
    if (broadcastActive && !isSecretRoll) {
      broadcastService.send({
        type: 'BROADCAST_ROLL',
        payload: {
          id: crypto.randomUUID(),
          title: `${rollerName}: Бросок d${sides}`,
          formula: `1d${sides}${modStr}`,
          resultDisplay: `${breakdown}${isNat20 ? ' [КРИТ (20)]' : isNat1 ? ' [ПРОВАЛ (1)]' : ''}`,
          total,
          isCritical: isNat20,
          isCriticalMiss: isNat1,
          timestamp: Date.now(),
          dice3d: [{ sides, result: kept }],
        },
      });
    }

    if (isNat20) {
      audioService.playCriticalHit();
    }
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 select-none">
      {/* 3D-Style Popover Result with Gold Glow */}
      {popover && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-80 sm:w-96 rounded-glass-xl border-2 border-gold/60 bg-surface/95 backdrop-blur-md p-4 shadow-glass-panel shadow-[0_0_35px_rgba(245,185,32,0.35),0_15px_30px_rgba(0,0,0,0.85)] text-center animate-in zoom-in-95 duration-150 flex flex-col gap-2 z-50">
          <button
            onClick={() => setPopover(null)}
            className="absolute top-2 right-2 min-h-[32px] min-w-[32px] h-8 w-8 flex items-center justify-center text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Закрыть результат"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Badge & Nat condition */}
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            {popover.isNat20 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 shadow-emerald-glow flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                КРИТИЧЕСКИЙ УСПЕХ (20)!
              </span>
            )}
            {popover.isNat1 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-crimson-dark/90 text-crimson-bright border border-crimson/60 shadow-crimson-glow flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-crimson-bright" />
                КРИТИЧЕСКИЙ ПРОВАЛ (1)!
              </span>
            )}
            {!popover.isNat20 && !popover.isNat1 && (
              <span className="text-xs font-bold text-gold-light flex items-center gap-1.5">
                <Dices className="h-4 w-4 text-gold" /> Бросок d{popover.sides}
                {popover.mode !== 'normal' && (
                  <span className="text-text-muted font-normal">
                    ({popover.mode === 'advantage' ? 'Преимущество' : 'Помеха'})
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Big Stylized 3D Number */}
          <div
            className={`text-5xl font-extrabold font-mono tabular-nums tracking-tight my-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${
              popover.isNat20
                ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]'
                : popover.isNat1
                ? 'text-crimson-bright drop-shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                : 'text-gold-light drop-shadow-[0_0_20px_rgba(245,185,32,0.6)]'
            }`}
          >
            {popover.total}
          </div>

          {/* Breakdown description */}
          <div className="text-xs text-text-secondary font-mono tabular-nums bg-black/50 px-3 py-2 rounded-lg border border-glass-border break-all">
            {popover.breakdown}
          </div>
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-glass-xl border border-glass-border bg-surface/85 px-3.5 py-2 text-xs text-text-primary shadow-glass-panel backdrop-blur-md">
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
              title="Обычный бросок (1d20)"
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
              title="Преимущество: бросок 2d20, выбирается наибольший результат"
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
              title="Помеха: бросок 2d20, выбирается наименьший результат"
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

          {/* 3D Dice Simulation Toggle */}
          <button
            onClick={toggle3dEnabled}
            className={`flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 ${
              is3dEnabled
                ? 'text-gold-light bg-gold/15 border border-gold/50 shadow-gold-glow'
                : 'text-text-muted hover:text-text-primary hover:bg-white/10 border border-transparent'
            }`}
            title={is3dEnabled ? '3D-анимация костей: включена' : '3D-анимация костей: выключена'}
          >
            <Box className="h-4 w-4" />
          </button>

          {/* Secret Roll (GM Hidden Roll) Toggle */}
          <button
            onClick={toggleSecretRoll}
            className={`flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 ${
              isSecretRoll
                ? 'text-rose-300 bg-rose-950/80 border border-rose-500/70 shadow-crimson-glow'
                : 'text-text-muted hover:text-text-primary hover:bg-white/10 border border-transparent'
            }`}
            title={
              isSecretRoll
                ? 'Скрытый бросок Мастера (активен, бросок не виден игрокам)'
                : 'Публичный бросок (нажмите, чтобы бросать скрытно)'
            }
          >
            {isSecretRoll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          {/* Broadcast to Players Indicator / Toggle */}
          <button
            onClick={() => setBroadcastActive((b) => !b)}
            className={`flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 ${
              broadcastActive && !isSecretRoll
                ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-500/50 shadow-emerald-glow'
                : 'text-text-muted hover:text-text-primary hover:bg-white/10 border border-transparent'
            }`}
            title={
              isSecretRoll
                ? 'Скрытый режим: трансляция отключена'
                : broadcastActive
                ? 'Трансляция броска на экран игроков: включена'
                : 'Трансляция броска на экран игроков: выключена'
            }
          >
            <Radio className={`h-4 w-4 ${broadcastActive && !isSecretRoll ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
};
