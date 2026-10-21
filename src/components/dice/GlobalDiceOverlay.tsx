import React, { useEffect } from 'react';
import { useDiceAnimationStore } from '../../store/diceAnimationStore';
import { Dice2dRollCard } from './Dice2dRollCard';

export const GlobalDiceOverlay: React.FC = () => {
  const activeRoll = useDiceAnimationStore((s) => s.activeRoll);
  const clearRoll = useDiceAnimationStore((s) => s.clearRoll);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeRoll) {
        clearRoll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRoll, clearRoll]);

  if (!activeRoll) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
      <div className="pointer-events-auto shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        <Dice2dRollCard data={activeRoll} onClose={clearRoll} />
      </div>
    </div>
  );
};
