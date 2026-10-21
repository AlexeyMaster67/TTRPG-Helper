import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'island' | 'elevated' | 'interactive';
  glow?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'glass', glow = false, children, ...props }, ref) => {
    const variantStyles = {
      // Стандартная стеклянная панель с радиусом 16px и размытием
      glass:
        'bg-[rgba(18,22,30,0.72)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-glass-lg shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
      // Панель-остров: выделенный независимый остров с радиусом 16–20px
      island:
        'bg-[rgba(18,22,30,0.78)] backdrop-blur-lg border border-[rgba(255,255,255,0.08)] rounded-glass-xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)]',
      // Приподнятая панель для модалок и поповеров (20px)
      elevated:
        'bg-[rgba(24,30,42,0.88)] backdrop-blur-xl border border-[rgba(255,255,255,0.12)] rounded-glass-xl shadow-[0_16px_40px_-4px_rgba(0,0,0,0.85)]',
      // Интерактивная карточка (списки, бойцы)
      interactive:
        'bg-[rgba(24,29,40,0.65)] hover:bg-[rgba(33,40,56,0.85)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] rounded-glass transition-all duration-200 cursor-pointer shadow-md',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          variantStyles[variant],
          glow && 'ring-1 ring-[#f5b920]/40 shadow-[0_0_20px_rgba(245,185,32,0.25)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
