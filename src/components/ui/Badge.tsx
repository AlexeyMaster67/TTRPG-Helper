import React from 'react';
import clsx from 'clsx';

export type BadgeVariant =
  | 'default'
  | 'gold'
  | 'crimson'
  | 'emerald'
  | 'sapphire'
  | 'violet'
  | 'amber'
  | 'ddb'
  | 'parchment'
  | 'slate';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  value?: string | number;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'border-[#2e3846] bg-gradient-to-b from-[#1e2833] to-[#151c24] text-ddb-parchment shadow-sm',
  gold:
    'border-ddb-gold/50 bg-gradient-to-b from-[#c5a059]/25 to-[#c5a059]/10 text-ddb-gold-bright shadow-[0_0_8px_rgba(197,160,89,0.18)]',
  crimson:
    'border-ddb-red-bright/50 bg-gradient-to-b from-[#82050b]/50 to-[#bc050f]/20 text-red-200 shadow-[0_0_8px_rgba(228,7,18,0.25)]',
  emerald:
    'border-emerald-600/50 bg-gradient-to-b from-emerald-950/60 to-emerald-900/30 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.18)]',
  sapphire:
    'border-blue-600/50 bg-gradient-to-b from-blue-950/60 to-blue-900/30 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.18)]',
  violet:
    'border-purple-600/50 bg-gradient-to-b from-purple-950/60 to-purple-900/30 text-purple-300 shadow-[0_0_8px_rgba(139,92,246,0.18)]',
  amber:
    'border-amber-600/50 bg-gradient-to-b from-amber-950/60 to-amber-900/30 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.18)]',
  ddb:
    'border-ddb-red-bright/60 bg-gradient-to-r from-[#82050b] via-[#bc050f] to-[#82050b] text-ddb-parchment shadow-[0_0_8px_rgba(228,7,18,0.3)]',
  parchment:
    'border-ddb-gold/40 bg-ddb-parchment/10 text-ddb-parchment',
  slate:
    'border-ddb-slate-600 bg-ddb-slate-800 text-gray-300',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  value,
  icon,
  className,
  title,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center gap-1 border font-medium rounded-sm select-none transition-colors',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px] leading-none' : 'px-2 py-1 text-xs',
        variantStyles[variant],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
      {value !== undefined && (
        <span className="font-mono tabular-nums font-semibold tracking-tight">
          {value}
        </span>
      )}
    </span>
  );
}
