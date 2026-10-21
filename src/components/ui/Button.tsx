import React from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'ghost' | 'icon' | 'danger' | 'success' | 'save';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  glow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'ghost', size = 'md', icon, glow = false, children, disabled, ...props }, ref) => {
    // Базовые стили: минимальный размер клика 32px, текст >= 12px
    const baseStyles =
      'inline-flex items-center justify-center font-sans font-semibold transition-all duration-200 select-none outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] cursor-pointer';

    // Размеры (строго >= 32px в высоту и ширину)
    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'min-h-[32px] px-3 py-1 text-xs gap-1.5 rounded-glass',
      md: 'min-h-[36px] px-4 py-1.5 text-xs gap-2 rounded-glass-lg',
      lg: 'min-h-[40px] px-5 py-2 text-sm gap-2.5 rounded-glass-xl',
    };

    // Стили иконочных кнопок
    const iconSizeStyles: Record<ButtonSize, string> = {
      sm: 'w-8 h-8 min-h-[32px] min-w-[32px] p-0 text-xs rounded-glass',
      md: 'w-9 h-9 min-h-[36px] min-w-[36px] p-0 text-xs rounded-glass-lg',
      lg: 'w-10 h-10 min-h-[40px] min-w-[40px] p-0 text-sm rounded-glass-xl',
    };

    // Варианты иерархии кнопок
    const variantStyles: Record<ButtonVariant, string> = {
      // Primary: Золотой акцент (#f5b920), тёмный текст, мягкое свечение
      primary: clsx(
        'bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] text-[#0c0d12] font-bold border border-[#f5b920]',
        glow || 'shadow-[0_0_16px_rgba(245,185,32,0.3)] hover:shadow-[0_0_24px_rgba(245,185,32,0.45)]'
      ),
      // Ghost: Glass-подложка, тонкая рамка 0.08, мягкий ховер
      ghost: clsx(
        'bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] text-[#f3f4f6] hover:text-white',
        'border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]',
        'backdrop-blur-md'
      ),
      // Icon: круглая или скругленная кнопка для действий
      icon: clsx(
        'bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.09)] text-gray-300 hover:text-white',
        'border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]',
        'backdrop-blur-md'
      ),
      // Danger (Босс / Урон): красный
      danger: clsx(
        'bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/50 hover:border-red-400',
        glow && 'shadow-[0_0_16px_rgba(239,68,68,0.35)]'
      ),
      // Success (Хил): зелёный
      success: clsx(
        'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-500/50 hover:border-emerald-400',
        glow && 'shadow-[0_0_16px_rgba(16,185,129,0.35)]'
      ),
      // Save (Спасбросок): синий
      save: clsx(
        'bg-blue-950/60 hover:bg-blue-900/80 text-blue-200 border border-blue-500/50 hover:border-blue-400',
        glow && 'shadow-[0_0_16px_rgba(59,130,246,0.35)]'
      ),
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          baseStyles,
          variant === 'icon' ? iconSizeStyles[size] : sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
