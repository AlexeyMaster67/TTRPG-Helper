import React from 'react';
import clsx from 'clsx';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsPillProps<T extends string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function TabsPill<T extends string>({
  items,
  activeId,
  onChange,
  className,
  size = 'md',
}: TabsPillProps<T>) {
  return (
    <div
      role="tablist"
      className={clsx(
        'inline-flex items-center p-1 rounded-full bg-[rgba(14,18,25,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] shadow-inner gap-1 select-none',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={clsx(
              'relative inline-flex items-center justify-center font-sans font-medium transition-all duration-200 cursor-pointer rounded-full outline-none',
              size === 'sm' ? 'px-3 py-1 text-xs gap-1.5 min-h-[28px]' : 'px-3.5 py-1.5 text-xs gap-2 min-h-[32px]',
              isActive
                ? 'bg-[#1e2634] text-white font-semibold border border-[#f5b920]/60 shadow-[0_0_14px_rgba(245,185,32,0.25)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
            )}
          >
            {item.icon && (
              <span
                className={clsx(
                  'flex-shrink-0 transition-colors',
                  isActive ? 'text-[#f5b920]' : 'text-gray-400'
                )}
              >
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.2 rounded-full font-mono text-[10px] leading-tight font-bold',
                  isActive
                    ? 'bg-[#f5b920]/20 text-[#fce79f] border border-[#f5b920]/40'
                    : 'bg-black/40 text-gray-400'
                )}
              >
                {item.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#f5b920] rounded-full shadow-[0_0_6px_#f5b920]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
