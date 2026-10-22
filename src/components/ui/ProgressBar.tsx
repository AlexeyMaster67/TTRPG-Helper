import React from 'react';
import clsx from 'clsx';
import { useSettingsStore } from '../../store/settingsStore';

export interface ProgressBarProps {
  current: number;
  max: number;
  temp?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'health' | 'gradient' | 'gold' | 'mana';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  temp = 0,
  size = 'md',
  variant = 'health',
  showLabel = true,
  className,
}) => {
  const isEn = useSettingsStore((s) => s.language === 'en');
  const safeMax = Math.max(1, max);
  const clampedCurrent = Math.max(0, Math.min(safeMax, current));
  const percent = Math.min(100, Math.round((clampedCurrent / safeMax) * 100));
  const tempPercent = Math.min(100, Math.round((Math.max(0, temp) / safeMax) * 100));

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const getGradientColor = () => {
    if (variant === 'gold') {
      return 'bg-gradient-to-r from-[#d99b0c] via-[#f5b920] to-[#fac742] shadow-[0_0_10px_rgba(245,185,32,0.4)]';
    }
    if (variant === 'mana') {
      return 'bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]';
    }
    // health variant
    if (percent <= 0) {
      return 'bg-gradient-to-r from-red-950 via-rose-950 to-red-900 shadow-[0_0_8px_rgba(153,27,27,0.5)]';
    }
    if (percent <= 25) {
      return 'bg-gradient-to-r from-rose-600 to-red-600 shadow-[0_0_10px_rgba(225,29,72,0.45)]';
    }
    if (percent <= 50) {
      return 'bg-gradient-to-r from-[#f5b920] to-yellow-400 shadow-[0_0_10px_rgba(245,185,32,0.35)]';
    }
    return 'bg-gradient-to-r from-emerald-600 to-green-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]';
  };

  return (
    <div className={clsx('flex flex-col gap-1 w-full select-none', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs leading-none">
          <span className="font-mono tabular-nums text-gray-200">
            {current} <span className="text-gray-500">/</span> {max}
          </span>
          {temp > 0 && (
            <span className="font-mono tabular-nums text-[11px] text-blue-300">
              +{temp} {isEn ? 'temp' : 'врем.'}
            </span>
          )}
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-[rgba(10,14,20,0.8)] border border-[rgba(255,255,255,0.08)] rounded-full overflow-hidden relative flex shadow-inner',
          heightStyles[size]
        )}
      >
        <div
          className={clsx('h-full transition-all duration-300 rounded-full', getGradientColor())}
          style={{ width: `${percent}%` }}
        />
        {temp > 0 && (
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-300 border-l border-cyan-200/60 shadow-[0_0_8px_rgba(59,130,246,0.35)]"
            style={{ width: `${tempPercent}%` }}
          />
        )}
      </div>
    </div>
  );
};
