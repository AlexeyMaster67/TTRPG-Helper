import React from 'react';
import clsx from 'clsx';

export type ChipVariant =
  | 'default'
  | 'gold'
  | 'damage'
  | 'heal'
  | 'save'
  | 'magic'
  | 'neutral';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  active?: boolean;
}

export const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant = 'default', size = 'sm', icon, active = false, children, ...props }, ref) => {
    const sizeStyles = {
      sm: 'px-2.5 py-0.5 text-xs gap-1.5 min-h-[26px]',
      md: 'px-3 py-1 text-xs gap-2 min-h-[32px]',
    };

    const variantStyles: Record<ChipVariant, string> = {
      default:
        'bg-[rgba(255,255,255,0.04)] text-gray-200 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]',
      gold:
        'bg-[#f5b920]/15 text-[#fce79f] border border-[#f5b920]/40 shadow-[0_0_10px_rgba(245,185,32,0.15)] font-semibold',
      damage:
        'bg-red-950/60 text-red-200 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)] font-semibold',
      heal:
        'bg-emerald-950/60 text-emerald-200 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-semibold',
      save:
        'bg-blue-950/60 text-blue-200 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)] font-semibold',
      magic:
        'bg-purple-950/60 text-purple-200 border border-purple-500/50 shadow-[0_0_10px_rgba(139,92,246,0.2)] font-semibold',
      neutral:
        'bg-[rgba(10,14,20,0.6)] text-gray-400 border border-[rgba(255,255,255,0.06)]',
    };

    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-full font-sans select-none transition-all leading-none',
          sizeStyles[size],
          variantStyles[variant],
          active && 'ring-1 ring-[#f5b920] border-[#f5b920] text-gold-light bg-[#f5b920]/20 shadow-[0_0_12px_rgba(245,185,32,0.3)]',
          className
        )}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </span>
    );
  }
);

Chip.displayName = 'Chip';
