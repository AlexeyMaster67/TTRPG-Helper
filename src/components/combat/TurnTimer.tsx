import { useState, useEffect, useRef, useCallback } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { broadcastService } from '../../services/broadcastService';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Timer,
  ChevronDown,
} from 'lucide-react';

// Procedural audio warning synthesizer using Web Audio API (100% offline, 0 asset dependencies)
function playBeep(frequency = 600, duration = 0.15, count = 1) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + i * (duration + 0.08));

      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * (duration + 0.08));
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * (duration + 0.08) + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * (duration + 0.08));
      osc.stop(ctx.currentTime + i * (duration + 0.08) + duration);
    }
  } catch {
    // Audio might be blocked by browser policy until user interaction
  }
}

export function TurnTimer() {
  const currentTurnIndex = useCombatStore((s) => s.currentTurnIndex);
  const combatantsCount = useCombatStore((s) => s.combatants.length);

  // Settings from localStorage or defaults
  const [totalSeconds, setTotalSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dnd_turn_timer_seconds');
      return saved ? parseInt(saved, 10) : 90;
    } catch {
      return 90;
    }
  });

  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dnd_turn_timer_sound') !== 'false';
    } catch {
      return true;
    }
  });
  const [showPresetsMenu, setShowPresetsMenu] = useState<boolean>(false);

  const prevTurnIndexRef = useRef<number>(currentTurnIndex);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-reset when current combatant turn changes (e.g. Spacebar or "Ход")
  useEffect(() => {
    if (combatantsCount > 0 && prevTurnIndexRef.current !== currentTurnIndex) {
      prevTurnIndexRef.current = currentTurnIndex;
      // Reset timer to configured duration
      setSecondsLeft(totalSeconds);
      setIsRunning(true);
    }
  }, [currentTurnIndex, combatantsCount, totalSeconds]);

  // Countdown tick effect
  useEffect(() => {
    if (!isRunning || secondsLeft <= 0 || combatantsCount === 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1);

        // Sound warning at 10 seconds remaining
        if (next === 10 && soundEnabled) {
          playBeep(700, 0.12, 2);
        }

        // Sound alert when time hits 0
        if (next === 0 && soundEnabled) {
          playBeep(450, 0.25, 3);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, combatantsCount, soundEnabled]);

  // Sync turn timer state with Player Display View via BroadcastChannel
  useEffect(() => {
    broadcastService.send({
      type: 'SYNC_TURN_TIMER',
      payload: {
        secondsLeft,
        totalSeconds,
        isRunning,
      },
    });
  }, [secondsLeft, totalSeconds, isRunning]);

  // Close presets menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPresetsMenu(false);
      }
    }
    if (showPresetsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPresetsMenu]);

  const handleSelectPreset = (sec: number) => {
    setTotalSeconds(sec);
    setSecondsLeft(sec);
    setIsRunning(true);
    setShowPresetsMenu(false);
    try {
      localStorage.setItem('dnd_turn_timer_seconds', String(sec));
    } catch {
      // Ignore
    }
  };

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    try {
      localStorage.setItem('dnd_turn_timer_sound', String(nextVal));
    } catch {
      // Ignore
    }
  };

  const handleReset = useCallback(() => {
    setSecondsLeft(totalSeconds);
    setIsRunning(true);
  }, [totalSeconds]);

  // Formatted display (MM:SS)
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress percentage (0 to 1)
  const progressRatio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const percent = Math.round(progressRatio * 100);

  // Visual status
  const isExpired = secondsLeft === 0;
  const isWarning = secondsLeft > 0 && secondsLeft <= 15;

  return (
    <div
      ref={menuRef}
      className="relative flex items-center bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-full px-2 py-0.5 gap-1.5 shadow-sm text-xs select-none min-h-[32px]"
      title={`Таймер хода: ${timeFormatted} (Лимит: ${totalSeconds}с)`}
    >
      {/* Иконка таймера */}
      <Timer
        className={`w-3.5 h-3.5 flex-shrink-0 ${
          isExpired
            ? 'text-red-500 animate-bounce'
            : isWarning
            ? 'text-amber-400 animate-pulse'
            : 'text-[#f5b920]'
        }`}
      />

      {/* Цифровой счётчик (JetBrains Mono tabular) с кнопкой открытия меню */}
      <button
        type="button"
        onClick={() => setShowPresetsMenu((prev) => !prev)}
        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
        title="Нажмите для настройки длительности (60с / 90с / 120с)"
      >
        <span
          className={`font-mono font-black text-xs sm:text-sm tabular-nums leading-none tracking-tight ${
            isExpired
              ? 'text-red-400 animate-pulse'
              : isWarning
              ? 'text-amber-400'
              : 'text-gray-100'
          }`}
        >
          {timeFormatted}
        </span>
        <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
      </button>

      {/* Линейный прогресс-бар хода */}
      <div className="w-10 sm:w-14 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5 flex-shrink-0">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isExpired
              ? 'bg-red-500'
              : isWarning
              ? 'bg-amber-400'
              : progressRatio > 0.5
              ? 'bg-emerald-400'
              : 'bg-[#f5b920]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Кнопка Старт / Пауза */}
      <button
        type="button"
        onClick={() => setIsRunning((prev) => !prev)}
        disabled={combatantsCount === 0}
        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
        title={isRunning ? 'Приостановить таймер' : 'Запустить таймер'}
      >
        {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-[#f5b920]" />}
      </button>

      {/* Кнопка сброса таймера */}
      <button
        type="button"
        onClick={handleReset}
        disabled={combatantsCount === 0}
        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-[#f5b920] transition-colors cursor-pointer disabled:opacity-40"
        title="Сбросить таймер хода"
      >
        <RotateCcw className="w-2.5 h-2.5" />
      </button>

      {/* Кнопка включения/выключения звука */}
      <button
        type="button"
        onClick={handleToggleSound}
        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
        title={soundEnabled ? 'Звуковые сигналы включены (10с и финиш)' : 'Звуковые сигналы выключены'}
      >
        {soundEnabled ? (
          <Volume2 className="w-3 h-3 text-emerald-400" />
        ) : (
          <VolumeX className="w-3 h-3 text-gray-500" />
        )}
      </button>

      {/* Всплывающее меню пресетов таймера */}
      {showPresetsMenu && (
        <div className="absolute top-full right-0 mt-1.5 z-50 min-w-[170px] p-2 bg-[#141923] border border-[#f5b920]/70 rounded-glass-xl shadow-[0_16px_36px_rgba(0,0,0,0.95)] flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150">
          <span className="text-[10px] uppercase font-bold text-gray-400 px-2 py-0.5">
            Лимит времени хода:
          </span>
          {[
            { sec: 60, label: '60 секунд (Быстро)' },
            { sec: 90, label: '90 секунд (Стандарт)' },
            { sec: 120, label: '120 секунд (Тактично)' },
            { sec: 180, label: '3 минуты (Боссы)' },
          ].map((preset) => (
            <button
              key={preset.sec}
              type="button"
              onClick={() => handleSelectPreset(preset.sec)}
              className={`flex items-center justify-between px-2.5 py-1 rounded text-left transition-colors cursor-pointer ${
                totalSeconds === preset.sec
                  ? 'bg-[#f5b920]/20 text-[#fce79f] font-bold border border-[#f5b920]/30'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{preset.label}</span>
              {totalSeconds === preset.sec && <span className="text-[#f5b920]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
