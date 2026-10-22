import React from 'react';
import { useSettingsStore } from '../../store/settingsStore';

interface BrandLogoProps {
  className?: string;
  showBadge?: boolean;
}

/**
 * BrandLogo - Primary branded header logo for TTRPG Helper
 * Features the signature d20 sword emblem with dynamic multi-system theme accent support,
 * crisp Manrope vector typography, and full accessibility.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'h-8',
  showBadge = true,
}) => {
  const language = useSettingsStore((s) => s.language);
  const isEn = language === 'en';
  return (
    <div className="flex items-center gap-2 select-none group cursor-default">
      {/* Dynamic Theme Vector Brand Logo */}
      <svg
        viewBox="0 0 680 240"
        className={`${className} w-auto max-h-8 object-contain drop-shadow-[0_0_12px_var(--primary-glow,rgba(245,185,32,0.25))] transition-transform duration-200 group-hover:scale-105`}
        role="img"
        aria-label="TTRPG Helper"
      >
        <title>TTRPG Helper</title>
        <g transform="translate(130,120) scale(0.95) translate(-140,-130)">
          <path
            fill="var(--primary, #f5b920)"
            fillRule="evenodd"
            stroke="var(--primary, #f5b920)"
            strokeWidth="6"
            strokeLinejoin="round"
            d="M140 52 L207.5 91 L207.5 169 L140 208 L72.5 169 L72.5 91 Z M108 84 H172 V99 H146 V160 L140 184 L134 160 V99 H108 Z"
          />
          <circle cx="207.5" cy="91" r="9" fill="var(--semantic-damage, #e5484d)" />
        </g>
        <text
          x="235"
          y="124"
          fontFamily="Manrope, 'Segoe UI', system-ui, sans-serif"
          fontSize="54"
          fontWeight="500"
          letterSpacing="3"
          fill="var(--text-primary, #ececf1)"
        >
          TTRPG
        </text>
        <text
          x="238"
          y="162"
          fontFamily="Manrope, 'Segoe UI', system-ui, sans-serif"
          fontSize="20"
          fontWeight="400"
          letterSpacing="13"
          fill="var(--text-muted, #9a9aa8)"
        >
          HELPER
        </text>
      </svg>

      <span className="sr-only">TTRPG Helper</span>

      {showBadge && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-[var(--accent-glow-text,#fce79f)] px-1.5 py-0.5 rounded-full bg-[var(--primary-subtle,rgba(245,185,32,0.15))] border border-[var(--primary-border,rgba(245,185,32,0.4))] shadow-[0_0_8px_var(--primary-glow,rgba(245,185,32,0.2))] leading-none">
              2.0
            </span>
          </div>
          <span className="text-[10px] font-medium tracking-wider text-gray-400 hidden xl:block -mt-0.5">
            {isEn ? 'Command Center' : 'Центр управления'}
          </span>
        </div>
      )}
    </div>
  );
};
