import React, { useState, useEffect, useRef } from 'react';

export interface Animated2dDieProps {
  sides: number;
  finalValue: number;
  isRolling: boolean;
  isNat20?: boolean;
  isNat1?: boolean;
  isDiscarded?: boolean;
  isHighlighted?: boolean;
  size?: number; // width & height in px
  className?: string;
  onSettle?: () => void;
}

export const Animated2dDie: React.FC<Animated2dDieProps> = ({
  sides,
  finalValue,
  isRolling,
  isNat20 = false,
  isNat1 = false,
  isDiscarded = false,
  isHighlighted = false,
  size = 88,
  className = '',
  onSettle,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(finalValue);
  const [hasSettled, setHasSettled] = useState<boolean>(!isRolling);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRolling) {
      setDisplayValue(finalValue);
      setHasSettled(true);
      return;
    }

    setHasSettled(false);
    const startTime = Date.now();
    const duration = 650; // total roll animation duration in ms

    const getNextRandom = (): number => {
      if (sides === 100) {
        return (Math.floor(Math.random() * 10) + 1) * 10;
      }
      return Math.floor(Math.random() * sides) + 1;
    };

    let stepDelay = 35; // initial fast scramble delay
    let currentTimeout: ReturnType<typeof setTimeout> | null = null;

    const cycle = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        setDisplayValue(finalValue);
        setHasSettled(true);
        if (onSettle) onSettle();
        return;
      }

      setDisplayValue(getNextRandom());
      // Smooth deceleration: stepDelay grows from 35ms to 120ms
      stepDelay = 35 + Math.floor((elapsed / duration) * 85);
      currentTimeout = setTimeout(cycle, stepDelay);
    };

    currentTimeout = setTimeout(cycle, stepDelay);

    return () => {
      if (currentTimeout) clearTimeout(currentTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRolling, finalValue, sides, onSettle]);

  // Color schemes
  const strokeColor = isDiscarded
    ? '#4b5563'
    : isNat20
    ? '#34d399'
    : isNat1
    ? '#f87171'
    : isHighlighted
    ? '#fbbf24'
    : '#f5b920';

  const glowShadow = isDiscarded
    ? 'drop-shadow(0 0 4px rgba(0,0,0,0.5))'
    : isNat20
    ? 'drop-shadow(0 0 16px rgba(52,211,153,0.75))'
    : isNat1
    ? 'drop-shadow(0 0 16px rgba(248,113,113,0.75))'
    : isHighlighted
    ? 'drop-shadow(0 0 14px rgba(245,185,32,0.7))'
    : 'drop-shadow(0 0 10px rgba(245,185,32,0.45))';

  const textColor = isDiscarded
    ? 'fill-gray-500'
    : isNat20
    ? 'fill-emerald-300'
    : isNat1
    ? 'fill-rose-400'
    : 'fill-amber-300';

  // Format label (e.g. 100 or 00 for d100)
  const displayLabel = sides === 100 && displayValue === 100 ? '00' : String(displayValue);

  // Render polygon based on polyhedral sides
  const renderDieSvg = () => {
    switch (sides) {
      case 4:
        return (
          <>
            <polygon
              points="50,10 90,88 10,88"
              fill="url(#dieGradObsidian)"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="50" y1="10" x2="50" y2="60" stroke={strokeColor} strokeWidth="1.5" opacity="0.65" />
            <line x1="90" y1="88" x2="50" y2="60" stroke={strokeColor} strokeWidth="1.5" opacity="0.65" />
            <line x1="10" y1="88" x2="50" y2="60" stroke={strokeColor} strokeWidth="1.5" opacity="0.65" />
            <text
              x="50"
              y="54"
              textAnchor="middle"
              dominantBaseline="central"
              className={`font-mono font-black ${textColor}`}
              style={{ fontSize: '24px' }}
            >
              {displayLabel}
            </text>
          </>
        );

      case 6:
        return (
          <>
            {/* Rounded Beveled Square Die */}
            <rect
              x="12"
              y="12"
              width="76"
              height="76"
              rx="14"
              fill="url(#dieGradObsidian)"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            <rect
              x="18"
              y="18"
              width="64"
              height="64"
              rx="10"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1"
              opacity="0.4"
            />
            <text
              x="50"
              y="52"
              textAnchor="middle"
              dominantBaseline="central"
              className={`font-mono font-black ${textColor}`}
              style={{ fontSize: '32px' }}
            >
              {displayLabel}
            </text>
          </>
        );

      case 8:
        return (
          <>
            {/* Octahedron Diamond */}
            <polygon
              points="50,8 90,50 50,92 10,50"
              fill="url(#dieGradObsidian)"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="50" y1="8" x2="50" y2="92" stroke={strokeColor} strokeWidth="1.8" opacity="0.65" />
            <line x1="10" y1="50" x2="90" y2="50" stroke={strokeColor} strokeWidth="1.8" opacity="0.65" />
            <text
              x="50"
              y="51"
              textAnchor="middle"
              dominantBaseline="central"
              className={`font-mono font-black ${textColor}`}
              style={{ fontSize: '28px' }}
            >
              {displayLabel}
            </text>
          </>
        );

      case 10:
      case 100:
        return (
          <>
            {/* Kite Trapezohedron */}
            <polygon
              points="50,6 88,40 50,94 12,40"
              fill="url(#dieGradObsidian)"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="50" y1="6" x2="50" y2="94" stroke={strokeColor} strokeWidth="2" opacity="0.75" />
            <line x1="12" y1="40" x2="88" y2="40" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
            <polygon points="50,6 88,40 50,55" fill="#f5b920" opacity="0.08" />
            <polygon points="50,94 12,40 50,55" fill="#f5b920" opacity="0.05" />
            <text
              x="50"
              y="51"
              textAnchor="middle"
              dominantBaseline="central"
              className={`font-mono font-black ${textColor}`}
              style={{ fontSize: sides === 100 ? '22px' : '26px' }}
            >
              {displayLabel}
            </text>
          </>
        );

      case 12:
        return (
          <>
            {/* Dodecahedron Decagon + Pentagon */}
            <polygon
              points="50,6 78,15 94,40 90,69 68,90 32,90 10,69 6,40 22,15"
              fill="url(#dieGradObsidian)"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <polygon
              points="50,28 72,44 63,70 37,70 28,44"
              fill="#181e2b"
              stroke={strokeColor}
              strokeWidth="1.8"
            />
            <line x1="50" y1="6" x2="50" y2="28" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
            <line x1="94" y1="40" x2="72" y2="44" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
            <line x1="68" y1="90" x2="63" y2="70" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
            <line x1="32" y1="90" x2="37" y2="70" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
            <line x1="6" y1="40" x2="28" y2="44" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
            <text
              x="50"
              y="53"
              textAnchor="middle"
              dominantBaseline="central"
              className={`font-mono font-black ${textColor}`}
              style={{ fontSize: '26px' }}
            >
              {displayLabel}
            </text>
          </>
        );

      case 20:
      default:
        return (
          <>
            {/* Iconic D20 Icosahedron with Faceted Gold Triangles */}
            <polygon
              points="50,6 88,28 88,72 50,94 12,72 12,28"
              fill="url(#dieGradObsidian)"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Center Equilateral Triangle */}
            <polygon
              points="50,26 74,68 26,68"
              fill="#1a2233"
              stroke={strokeColor}
              strokeWidth="1.8"
            />
            {/* Outer connecting facet edges */}
            <line x1="50" y1="6" x2="50" y2="26" stroke={strokeColor} strokeWidth="1.5" opacity="0.75" />
            <line x1="88" y1="28" x2="50" y2="26" stroke={strokeColor} strokeWidth="1.5" opacity="0.75" />
            <line x1="12" y1="28" x2="50" y2="26" stroke={strokeColor} strokeWidth="1.5" opacity="0.75" />
            <line x1="88" y1="28" x2="74" y2="68" stroke={strokeColor} strokeWidth="1.5" opacity="0.75" />
            <line x1="88" y1="72" x2="74" y2="68" stroke={strokeColor} strokeWidth="1.5" opacity="0.75" />
            <line x1="50" y1="94" x2="74" y2="68" stroke={strokeColor} strokeWidth="1.5" opacity="0.75" />
            <line x1="50" y1="94" x2="26" y2="68" stroke={strokeColor} strokeWidth="1.5" opacity="0.75" />
            <line x1="12" y1="72" x2="26" y2="68" stroke={strokeColor} strokeWidth="1.5" opacity="0.75" />
            <line x1="12" y1="28" x2="26" y2="68" stroke={strokeColor} strokeWidth="1.5" opacity="0.75" />
            {/* Number inside center face */}
            <text
              x="50"
              y="54"
              textAnchor="middle"
              dominantBaseline="central"
              className={`font-mono font-black ${textColor}`}
              style={{ fontSize: '28px' }}
            >
              {displayLabel}
            </text>
          </>
        );
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{
          filter: glowShadow,
          transition: 'transform 0.15s ease-out, filter 0.2s ease-out',
        }}
        className={`w-full h-full block ${
          !hasSettled
            ? 'animate-[diceTumble_0.65s_cubic-bezier(0.25,1,0.5,1)]'
            : isNat20
            ? 'animate-[diceBounce_0.4s_ease-out]'
            : isNat1
            ? 'animate-[diceShake_0.35s_ease-in-out]'
            : 'animate-[diceBounce_0.3s_ease-out]'
        } ${isDiscarded ? 'opacity-35 grayscale' : ''}`}
      >
        <defs>
          <linearGradient id="dieGradObsidian" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1c2434" />
            <stop offset="60%" stopColor="#0e131d" />
            <stop offset="100%" stopColor="#070a10" />
          </linearGradient>
        </defs>

        {renderDieSvg()}
      </svg>
    </div>
  );
};
