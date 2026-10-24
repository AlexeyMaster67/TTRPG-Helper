import React, { useState, useEffect, useRef } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { useDice3dStore } from '../../store/dice3dStore';
import { useSettingsStore } from '../../store/settingsStore';
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
  GripVertical,
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

  const language = useSettingsStore((s) => s.language);
  const isEn = language === 'en';
  const isSecretRoll = useDice3dStore((s) => s.isSecretRoll);
  const toggleSecretRoll = useDice3dStore((s) => s.toggleSecretRoll);

  // Position and free-dragging state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('quick_dice_bar_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    elemX: number;
    elemY: number;
    hasMoved: boolean;
  } | null>(null);

  // Ensure element stays inside viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev || !containerRef.current) return prev;
        const rect = containerRef.current.getBoundingClientRect();
        const maxX = Math.max(8, window.innerWidth - rect.width - 8);
        const maxY = Math.max(8, window.innerHeight - rect.height - 8);
        const newX = Math.min(Math.max(8, prev.x), maxX);
        const newY = Math.min(Math.max(8, prev.y), maxY);
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      elemX: rect.left,
      elemY: rect.top,
      hasMoved: false,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 4) {
      dragRef.current.hasMoved = true;
    }

    if (dragRef.current.hasMoved) {
      const rect = containerRef.current.getBoundingClientRect();
      const maxX = Math.max(8, window.innerWidth - rect.width - 8);
      const maxY = Math.max(8, window.innerHeight - rect.height - 8);
      const newX = Math.min(Math.max(8, dragRef.current.elemX + dx), maxX);
      const newY = Math.min(Math.max(8, dragRef.current.elemY + dy), maxY);
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const hadMoved = dragRef.current.hasMoved;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (hadMoved && position) {
      try {
        localStorage.setItem('quick_dice_bar_pos', JSON.stringify(position));
      } catch {
        // ignore
      }
    } else if (!hadMoved) {
      // User tapped or clicked without dragging -> toggle expand
      if (!isExpanded) {
        setIsExpanded(true);
      }
    }

    dragRef.current = null;
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition(null);
    try {
      localStorage.removeItem('quick_dice_bar_pos');
    } catch {
      // ignore
    }
  };

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
      ? (isEn ? (activeCombatant.name || activeCombatant.nameRu) : (activeCombatant.nameRu || activeCombatant.name))
      : undefined;

    const title = rollerName
      ? `${rollerName}: d${sides}`
      : (isEn ? `d${sides} Roll` : `Бросок d${sides}`);

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
        ? (isEn ? `[Secret] ${rollerName || 'Quick Roll'}` : `[Скрытно] ${rollerName || 'Быстрый бросок'}`)
        : rollerName || (isEn ? 'Quick Roll' : 'Быстрый бросок'),
      actionName: `${isSecretRoll ? (isEn ? '[Secret] ' : '[Скрытно] ') : ''}${isEn ? `Roll d${sides}${modStr}` : `Бросок d${sides}${modStr}`}`,
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
              damageType: isEn ? 'Universal' : 'Универсальный',
              details: formulaStr,
            }
          : undefined,
      note: isNat20
        ? (isEn ? `CRITICAL HIT! ${formulaStr}` : `КРИТИЧЕСКИЙ УСПЕХ! ${formulaStr}`)
        : isNat1
        ? (isEn ? `CRITICAL MISS! ${formulaStr}` : `КРИТИЧЕСКИЙ ПРОВАЛ! ${formulaStr}`)
        : formulaStr,
    });
  };

  const isNearTop = position ? position.y < 280 : false;
  const containerStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        transform: 'none',
      }
    : {};

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`fixed z-40 select-none ${!position ? 'bottom-3 left-1/2 -translate-x-1/2' : ''}`}
    >
      {/* 2D Animated Dice Popover Result (Positioned relative to bar) */}
      {activeRoll && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-50 ${isNearTop ? 'top-full mt-3' : 'bottom-full mb-3'}`}>
          <Dice2dRollCard
            data={activeRoll}
            onClose={clearRoll}
          />
        </div>
      )}

      {/* Main Bar */}
      {!isExpanded ? (
        /* Collapsed Floating Pill - freely draggable */
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleResetPosition}
          className="flex items-center gap-2 rounded-full border border-gold/50 bg-surface/85 px-3.5 py-2 min-h-[36px] text-xs font-semibold text-gold-light shadow-glass-panel backdrop-blur-md hover:border-gold hover:bg-surface/95 hover:text-gold hover:shadow-gold-glow transition-all cursor-grab active:cursor-grabbing select-none touch-none active:scale-95"
          title={isEn ? "Quick Dice (click to expand, drag to move, double click to center)" : "Быстрые кости (клик — развернуть, зажмите — переместить, 2 клика — сброс по центру)"}
        >
          <GripVertical className="h-3.5 w-3.5 text-text-muted/60 flex-shrink-0" />
          <Dices className="h-4 w-4 text-gold animate-pulse flex-shrink-0" />
          <span>{isEn ? "Quick Dice" : "Быстрые кости"}</span>
          <ChevronUp className="h-4 w-4 text-text-muted flex-shrink-0" />
        </div>
      ) : (
        /* Expanded Floating Tray */
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 rounded-glass-xl border border-glass-border bg-surface/90 px-2.5 py-2 text-xs text-text-primary shadow-glass-panel backdrop-blur-md">
          {/* Drag Grip Handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleResetPosition}
            className="flex h-8 w-6 min-h-[32px] items-center justify-center rounded-lg text-text-muted/70 hover:text-gold hover:bg-white/10 transition-colors cursor-grab active:cursor-grabbing touch-none select-none flex-shrink-0"
            title={isEn ? "Drag to move bar (double click to reset to center)" : "Зажмите для перемещения панели (двойной клик — сброс в центр)"}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Collapse Handle */}
          <button
            onClick={() => setIsExpanded(false)}
            className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors cursor-pointer flex-shrink-0"
            title={isEn ? "Collapse bar" : "Свернуть панель"}
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
              title={isEn ? "Normal roll (1 die)" : "Обычный бросок (1 кость)"}
            >
              {isEn ? "Normal" : "Обычный"}
            </button>
            <button
              onClick={() => setAdvantageMode('advantage')}
              className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                advantageMode === 'advantage'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 shadow-emerald-glow'
                  : 'text-text-muted hover:text-emerald-300 hover:bg-emerald-950/30 border border-transparent'
              }`}
              title={isEn ? "Advantage: roll 2 dice, take highest" : "Преимущество: бросок 2 костей, выбирается наибольший результат"}
            >
              {isEn ? "Advantage" : "Преимущество"}
            </button>
            <button
              onClick={() => setAdvantageMode('disadvantage')}
              className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                advantageMode === 'disadvantage'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/60 shadow-crimson-glow'
                  : 'text-text-muted hover:text-rose-300 hover:bg-rose-950/30 border border-transparent'
              }`}
              title={isEn ? "Disadvantage: roll 2 dice, take lowest" : "Помеха: бросок 2 костей, выбирается наименьший результат"}
            >
              {isEn ? "Disadvantage" : "Помеха"}
            </button>
          </div>

          {/* Modifier Input Controls */}
          <div className="inline-flex items-center gap-0.5 bg-black/40 rounded-xl p-1 border border-glass-border">
            <button
              onClick={() => setModifier((m) => m - 1)}
              className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title={isEn ? "Decrease modifier" : "Уменьшить модификатор"}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setModifier(0)}
              className="min-h-[32px] px-2.5 rounded-lg font-mono tabular-nums text-xs font-bold text-gold-light hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
              title={isEn ? "Reset modifier to 0" : "Сбросить модификатор в 0"}
            >
              {modifier >= 0 ? `+${modifier}` : modifier}
            </button>
            <button
              onClick={() => setModifier((m) => m + 1)}
              className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title={isEn ? "Increase modifier" : "Увеличить модификатор"}
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
                  title={
                    isEn
                      ? `Roll d${sides}${modifier !== 0 ? ` (${modifier >= 0 ? `+${modifier}` : modifier})` : ''}`
                      : `Бросить d${sides}${modifier !== 0 ? ` (${modifier >= 0 ? `+${modifier}` : modifier})` : ''}`
                  }
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
                ? (isEn ? 'GM Hidden Roll (active, players will not see)' : 'Скрытый бросок Мастера (активен, бросок не увидят игроки)')
                : (isEn ? 'Public Roll (click to hide from players)' : 'Публичный бросок (нажмите, чтобы скрыть бросок от игроков)')
            }
          >
            {isSecretRoll ? <EyeOff className="h-3.5 w-3.5 text-rose-300" /> : <Eye className="h-3.5 w-3.5 text-text-muted" />}
            <span className="text-[11px] font-mono">{isSecretRoll ? (isEn ? 'Secret' : 'Скрытно') : (isEn ? 'Public' : 'Публичный')}</span>
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
                ? (isEn ? 'Hidden Roll: Player screen broadcast disabled' : 'Скрытый бросок: трансляция на экран игроков отключена')
                : broadcastActive
                ? (isEn ? 'Player screen broadcast: ON (click to disable)' : 'Трансляция на экран игроков: ВКЛ (нажмите для отключения)')
                : (isEn ? 'Player screen broadcast: OFF (click to enable)' : 'Трансляция на экран игроков: ВЫКЛ (нажмите для включения)')
            }
          >
            <Radio
              className={`h-3.5 w-3.5 ${
                broadcastActive && !isSecretRoll ? 'text-emerald-400 animate-pulse' : 'text-text-muted'
              }`}
            />
            <span className="text-[11px] font-mono">
              {isEn
                ? (broadcastActive && !isSecretRoll ? 'Players: ON' : 'Players: OFF')
                : (broadcastActive && !isSecretRoll ? 'Игроки: ВКЛ' : 'Игроки: ВЫКЛ')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
