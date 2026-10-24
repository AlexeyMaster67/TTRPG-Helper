import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface WBSpoilerProps {
  text: string;
}

export const WBSpoiler: React.FC<WBSpoilerProps> = ({ text }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={() => setRevealed((prev) => !prev)}
      title={revealed ? 'Кликните, чтобы скрыть спойлер' : 'Кликните, чтобы раскрыть спойлер'}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all duration-200 select-none ${
        revealed
          ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
          : 'bg-zinc-800 text-transparent border border-zinc-700 hover:border-zinc-600 relative'
      }`}
    >
      <span className={revealed ? '' : 'blur-xs select-none'}>
        {text}
      </span>
      {revealed ? (
        <EyeOff className="w-3 h-3 text-amber-400 opacity-60 inline-block ml-0.5" />
      ) : (
        <Eye className="w-3 h-3 text-zinc-400 absolute right-1 top-1/2 -translate-y-1/2" />
      )}
    </span>
  );
};
