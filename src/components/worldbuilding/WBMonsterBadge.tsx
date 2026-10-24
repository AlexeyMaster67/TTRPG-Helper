import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { Skull, Swords, Check } from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { usePartyStore } from '../../store/partyStore';

interface WBMonsterBadgeProps {
  id: string; // Monster name or ID
  label?: string;
}

export const WBMonsterBadge: React.FC<WBMonsterBadgeProps> = ({ id, label }) => {
  const { t } = useTranslation();
  const [showPopover, setShowPopover] = useState(false);
  const [added, setAdded] = useState(false);
  const addCombatant = useCombatStore((s) => s.addCombatant);

  const handleAddToCombat = (e: React.MouseEvent) => {
    e.stopPropagation();
    addCombatant({
      name: id,
      nameRu: id,
      cr: '—',
      hp: 30,
      maxHp: 30,
      currentHp: 30,
      ac: 13,
      initiative: Math.floor(Math.random() * 20) + 1,
      type: 'monster',
    } as any);

    setAdded(true);
    usePartyStore.getState().showToast(t('wb.monsterAddedToast', { id }));
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <span
      className="relative inline-block my-0.5 mx-1 select-none"
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <button
        type="button"
        onClick={() => setShowPopover((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md border border-red-500/30 bg-red-950/40 text-red-300 hover:bg-red-900/50 hover:border-red-500/50 transition-colors shadow-sm cursor-pointer"
      >
        <Skull className="w-3.5 h-3.5 text-red-400" />
        <span>{label || id}</span>
      </button>

      {showPopover && (
        <div
          className="absolute z-50 left-0 bottom-full mb-1.5 w-64 p-3 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl backdrop-blur-md text-left text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-zinc-100">
              <Skull className="w-4 h-4 text-red-400" />
              <span className="truncate">{label || id}</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-red-950/60 text-red-400 border border-red-800/40 rounded">
              {t('wb.creatureLabel')}
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 mb-2.5">
            {t('wb.creatureDesc')}
          </p>

          <button
            type="button"
            onClick={handleAddToCombat}
            className={`w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded font-medium text-xs transition-colors ${
              added
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-md'
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                {t('wb.toCombat')}
              </>
            ) : (
              <>
                <Swords className="w-3.5 h-3.5" />
                {t('wb.toCombat')}
              </>
            )}
          </button>
        </div>
      )}
    </span>
  );
};
