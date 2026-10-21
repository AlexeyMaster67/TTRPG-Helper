import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Heart, Shield, Skull } from 'lucide-react';

export interface HealthBarProps {
  current: number;
  max: number;
  temp?: number;
  showNumbers?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HealthBar({
  current,
  max,
  temp = 0,
  showNumbers = true,
  size = 'md',
  className,
}: HealthBarProps) {
  const safeMax = Math.max(1, max);
  const clampedCurrent = Math.max(0, Math.min(safeMax, current));
  const hpPercent = Math.min(100, Math.round((clampedCurrent / safeMax) * 100));

  // Temp HP as a percentage of Max HP (can extend visually)
  const tempPercent = Math.min(100, Math.round((Math.max(0, temp) / safeMax) * 100));

  // Refs for tracking previous state and DOM elements
  const prevHpRef = useRef<number>(clampedCurrent);
  const isFirstRender = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  // Ghost (phantom delta) bar state
  const [ghostPercent, setGhostPercent] = useState<number>(hpPercent);
  const [isGhostHolding, setIsGhostHolding] = useState<boolean>(false);
  const [isGhostVisible, setIsGhostVisible] = useState<boolean>(false);
  const ghostPercentRef = useRef<number>(hpPercent);
  const isGhostHoldingRef = useRef<boolean>(false);

  // Healing visual state
  const [isHealing, setIsHealing] = useState<boolean>(false);

  // Timers
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shrinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect whether this current render cycle is damage or healing
  const isDamageRender = !isFirstRender.current && clampedCurrent < prevHpRef.current;
  const isHealRender = !isFirstRender.current && clampedCurrent > prevHpRef.current;

  // Calculate prior HP percent to anchor ghost bar immediately on damage frame
  const prevHpPercent = Math.min(
    100,
    Math.round((Math.max(0, prevHpRef.current) / safeMax) * 100)
  );

  // Effective ghost percent: on damage render, immediately anchor at previous HP or higher
  const effectiveGhostPercent = isDamageRender
    ? Math.max(ghostPercentRef.current, prevHpPercent)
    : ghostPercent;

  // Ghost bar is shown if an active animation is running OR if this is the initial damage frame
  const showGhost = (isGhostVisible || isDamageRender) && effectiveGhostPercent > hpPercent;

  // Main HP bar transition logic:
  // Instant snap (transition: none) on damage; smooth expansion on healing with cubic-bezier(0.16, 1, 0.3, 1)
  const isTransitioningHeal = isHealRender || isHealing;
  const mainBarTransition = isDamageRender
    ? 'none'
    : isTransitioningHeal
    ? 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)'
    : 'none';

  useEffect(() => {
    // Initial mount: record baseline HP without triggering animations
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevHpRef.current = clampedCurrent;
      ghostPercentRef.current = hpPercent;
      return;
    }

    const prev = prevHpRef.current;
    prevHpRef.current = clampedCurrent;

    if (clampedCurrent < prev) {
      // -----------------------------------------------------------
      // 1. DAMAGE TAKEN (current < prev)
      // -----------------------------------------------------------
      // Cancel any ongoing heal animation
      if (healTimerRef.current) clearTimeout(healTimerRef.current);
      setIsHealing(false);

      // Cancel any pending damage timers
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);

      // Calculate starting percent for the phantom bar:
      // If ghost is mid-shrink, sample visual position to freeze smoothly
      const prevPct = Math.min(100, Math.round((Math.max(0, prev) / safeMax) * 100));
      let startingPercent = Math.max(ghostPercentRef.current, prevPct);

      if (ghostRef.current && containerRef.current && !isGhostHoldingRef.current) {
        const cWidth = containerRef.current.getBoundingClientRect().width;
        const gWidth = ghostRef.current.getBoundingClientRect().width;
        if (cWidth > 0 && gWidth > 0) {
          const sampled = Math.round((gWidth / cWidth) * 100);
          if (sampled > hpPercent) {
            startingPercent = Math.max(startingPercent, sampled);
          }
        }
      }

      setIsGhostVisible(true);
      setIsGhostHolding(true);
      isGhostHoldingRef.current = true;
      setGhostPercent(startingPercent);
      ghostPercentRef.current = startingPercent;

      // Phase 1: Hold lost delta segment for 350ms
      delayTimerRef.current = setTimeout(() => {
        // Phase 2: Smoothly collapse to current HP using cubic-bezier(0.16, 1, 0.3, 1)
        setIsGhostHolding(false);
        isGhostHoldingRef.current = false;
        setGhostPercent(hpPercent);
        ghostPercentRef.current = hpPercent;

        // Hide ghost bar after transition finishes
        shrinkTimerRef.current = setTimeout(() => {
          setIsGhostVisible(false);
        }, 500);
      }, 350);

    } else if (clampedCurrent > prev) {
      // -----------------------------------------------------------
      // 2. HEALING RECEIVED (current > prev)
      // -----------------------------------------------------------
      // Cancel any pending damage timers & sync ghost bar
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
      setIsGhostVisible(false);
      setIsGhostHolding(false);
      isGhostHoldingRef.current = false;
      setGhostPercent(hpPercent);
      ghostPercentRef.current = hpPercent;

      // Trigger emerald glow flash
      if (healTimerRef.current) clearTimeout(healTimerRef.current);
      setIsHealing(true);
      healTimerRef.current = setTimeout(() => {
        setIsHealing(false);
      }, 600);
    } else {
      // Sync ghostPercent if max HP changed without current HP change
      setGhostPercent(hpPercent);
      ghostPercentRef.current = hpPercent;
    }
  }, [clampedCurrent, hpPercent, safeMax]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
      if (healTimerRef.current) clearTimeout(healTimerRef.current);
    };
  }, []);

  // Color gradient based on health threshold matching AAA tabletop quality
  const getBarColor = (pct: number) => {
    if (pct <= 0) return 'bg-gradient-to-r from-red-950 via-rose-950 to-red-900 border-r border-red-700/60 shadow-[0_0_8px_rgba(153,27,27,0.5)]';
    if (pct <= 25)
      return 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse';
    if (pct <= 50)
      return 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 shadow-[0_0_8px_rgba(245,185,32,0.4)]';
    return 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
  };

  const heightClasses = {
    sm: 'h-2.5',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={clsx('w-full flex flex-col gap-1 select-none', className)}>
      {showNumbers && (
        <div className="flex items-center justify-between leading-none text-xs min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {clampedCurrent <= 0 ? (
              <Skull className={clsx(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-rose-500 flex-shrink-0 animate-pulse')} />
            ) : (
              <Heart
                className={clsx(
                  size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
                  'flex-shrink-0 transition-colors duration-300',
                  isHealing ? 'text-emerald-400' : clampedCurrent / safeMax <= 0.25 ? 'text-rose-400 animate-pulse' : clampedCurrent / safeMax <= 0.5 ? 'text-amber-400' : 'text-rose-500'
                )}
              />
            )}
            <span
              className={clsx(
                'font-mono tabular-nums font-extrabold tracking-tight whitespace-nowrap leading-none',
                size === 'sm' ? 'text-[11px]' : 'text-xs',
                clampedCurrent <= 0 ? 'text-rose-400' : clampedCurrent / safeMax <= 0.25 ? 'text-rose-300' : clampedCurrent / safeMax <= 0.5 ? 'text-amber-300' : 'text-emerald-200'
              )}
            >
              {current}<span className="text-gray-500 font-normal mx-0.5">/</span>{max}
              <span className={clsx('text-gray-400 font-sans ml-1 font-normal', size === 'sm' ? 'text-[9.5px]' : 'text-[10px]')}>
                ОЗ
              </span>
            </span>
          </div>

          {temp > 0 && (
            <div className="flex items-center gap-0.5 font-mono tabular-nums text-[10px] font-bold text-cyan-200 bg-cyan-950/70 border border-cyan-500/50 px-1.5 py-0.2 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.3)] shrink-0">
              <Shield className="h-2.5 w-2.5 text-cyan-300" />
              <span>+{temp}</span>
            </div>
          )}
        </div>
      )}

      {/* Bar container */}
      <div
        ref={containerRef}
        className={clsx(
          'w-full rounded-full bg-[#0a0e14] border border-white/10 overflow-hidden relative flex transition-all duration-300 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.85)]',
          heightClasses[size],
          isHealing && 'shadow-[0_0_12px_rgba(16,185,129,0.5)] border-emerald-500/70',
          clampedCurrent <= 0 && 'border-rose-900/80 bg-red-950/40'
        )}
      >
        {/* Subtle glossy top highlight line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-white/15 pointer-events-none z-40" />

        {/* Incapacitated 0% skull indicator watermark */}
        {hpPercent <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-red-300 tracking-wider uppercase leading-none">
              <Skull className="h-2.5 w-2.5 text-red-400" />
              <span>БЕЗ СОЗНАНИЯ</span>
            </span>
          </div>
        )}

        {/* Phantom / Ghost Damage Delta Bar (Lost Segment) */}
        {showGhost && (
          <div
            ref={ghostRef}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 z-0 shadow-[0_0_10px_rgba(225,29,72,0.55)] rounded-full"
            style={{
              width: `${effectiveGhostPercent}%`,
              transition: isGhostHolding || isDamageRender
                ? 'none'
                : 'width 500ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        )}

        {/* Base HP Fill */}
        <div
          className={clsx(
            'h-full relative z-10 flex-shrink-0 rounded-full',
            getBarColor(hpPercent)
          )}
          style={{
            width: hpPercent <= 0 ? '100%' : `${hpPercent}%`,
            transition: mainBarTransition,
          }}
        />

        {/* Temp HP Fill overlay (magical cyan/sapphire barrier) */}
        {temp > 0 && (
          <div
            className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 transition-all duration-200 border-l border-cyan-200/60 relative z-20 flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.35)] rounded-full"
            style={{ width: `${tempPercent}%` }}
          />
        )}

        {/* Healing luminescence overlay */}
        <div
          className={clsx(
            'absolute inset-0 bg-emerald/20 pointer-events-none transition-opacity duration-500 ease-out z-30',
            isHealing ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
    </div>
  );
}
