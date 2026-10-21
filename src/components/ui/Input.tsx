import React from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, onClear, value, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          value={value}
          disabled={disabled}
          className={clsx(
            'w-full min-h-[34px] bg-[rgba(20,25,35,0.7)] hover:bg-[rgba(24,30,42,0.85)] text-gray-100 placeholder:text-gray-500',
            'border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] focus:border-[#f5b920]/70',
            'rounded-glass px-3 text-xs font-sans outline-none transition-all duration-200',
            'focus:ring-1 focus:ring-[#f5b920]/40 focus:shadow-[0_0_14px_rgba(245,185,32,0.2)]',
            icon ? 'pl-9' : 'pl-3',
            onClear && value ? 'pr-8' : 'pr-3',
            disabled && 'opacity-40 cursor-not-allowed',
            className
          )}
          {...props}
        />
        {onClear && value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Очистить"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
