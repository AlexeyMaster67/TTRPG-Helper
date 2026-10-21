
import clsx from 'clsx';
import { Eye, X, Zap, Sparkles, Crosshair, FileText } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { cleanRussianText } from '../../../utils/textUtils';
import { resolveTokenUrl } from '../../../services/tokenResolver';
import { usePartyStore } from '../../../store/partyStore';
import { useTokenForgeStore } from '../../../store/tokenForgeStore';

export const CLONE_BADGE_STYLE =
  'bg-[#182128] text-gray-200 border-[#3d4d5c] ring-1 ring-black/50 font-mono font-bold';

export interface CombatantHeaderProps {
  combatant: Combatant;
  isActiveTurn: boolean;
  isTarget: boolean;
  isEditingInit: boolean;
  tempInit: string;
  setTempInit: (val: string) => void;
  onSaveInit: () => void;
  onStartEditingInit: () => void;
  onCancelEditingInit: () => void;
  onToggleTarget: () => void;
  onShowcase: () => void;
  onRemove: () => void;
}

export function CombatantHeader({
  combatant,
  isActiveTurn,
  isTarget,
  isEditingInit,
  tempInit,
  setTempInit,
  onSaveInit,
  onStartEditingInit,
  onCancelEditingInit,
  onToggleTarget,
  onShowcase,
  onRemove,
}: CombatantHeaderProps) {
  const tokenUrl = resolveTokenUrl(combatant.name, combatant.nameRu, combatant.tokenUrl);
  const initials = (combatant.nameRu || combatant.name || '??').slice(0, 2).toUpperCase();

  // Detect clone mobs (e.g., "Стражник #1", "Goblin #2")
  const nameToCheck = combatant.nameRu || combatant.name || '';
  const cloneMatch = nameToCheck.match(/#(\d+)/);
  const cloneNumber = cloneMatch ? cloneMatch[1] : null;

  const isDead = combatant.isDead;

  return (
    <>
      {/* Верхняя плашка текущего хода с золотым сиянием */}
      {isActiveTurn && (
        <div className="flex items-center justify-between px-3 py-1 bg-gradient-to-r from-amber-500/25 via-gold/35 to-amber-500/25 text-gold-light text-xs font-black uppercase tracking-wider shadow-sm rounded-t-glass-lg -mx-3 -mt-2 mb-2 border-b border-gold/40 select-none">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 fill-gold text-gold animate-pulse flex-shrink-0" />
            <span className="font-extrabold tracking-widest leading-none text-white drop-shadow-sm">ТЕКУЩИЙ ХОД</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-amber-200/90 hidden sm:inline leading-none">
            Горячая клавиша: Пробел
          </span>
        </div>
      )}

      {/* Tier 1 (Top Tier): [Инициатива] [Цель] [Аватар + Клон] [Имя] [ЛИСТ] [МЁРТВ] ... [Глаз] [Удалить] */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Initiative */}
          {isEditingInit ? (
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-gold bg-canvas flex-shrink-0 shadow-gold-glow"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="number"
                value={tempInit}
                autoFocus
                onChange={(e) => setTempInit(e.target.value)}
                onBlur={onSaveInit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveInit();
                  if (e.key === 'Escape') onCancelEditingInit();
                }}
                className="w-full text-center font-mono font-bold text-xs bg-transparent text-gold-light outline-none"
              />
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onStartEditingInit();
              }}
              title="Нажмите, чтобы ввести инициативу"
              className={clsx(
                'flex flex-col items-center justify-center w-7 h-7 rounded-full border font-mono tabular-nums flex-shrink-0 cursor-pointer transition-all active:scale-95 group/init',
                isActiveTurn
                  ? 'border-yellow-300 bg-gradient-to-b from-[#f5b920] to-[#d49912] text-black font-black shadow-[0_0_12px_rgba(245,185,32,0.4)]'
                  : 'border-white/10 bg-[#12161f] text-gray-200 hover:border-gold/60 hover:text-gold-light'
              )}
            >
              <span className="text-xs font-black leading-none">
                {combatant.initiative}
              </span>
            </div>
          )}

          {/* Target Lock */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleTarget();
            }}
            title={isTarget ? 'Цель захвачена (Кликните для снятия)' : 'ПКМ или клик: выбрать как цель'}
            className={clsx(
              'p-0.5 rounded-sm text-xs transition-colors flex-shrink-0 cursor-pointer flex items-center justify-center',
              isTarget
                ? 'text-red-400 bg-red-950/70 border border-red-500/60 shadow-sm animate-pulse'
                : 'text-gray-500 hover:text-red-300 opacity-0 group-hover:opacity-100'
            )}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>

          {/* Avatar Frame with Clone Badge & Token Forge Quick Edit */}
          <div
            className="relative flex-shrink-0 cursor-pointer group/avatar"
            onClick={(e) => {
              e.stopPropagation();
              const faction = combatant.isPlayer ? 'ally-blue' : 'enemy';
              useTokenForgeStore.getState().openForge({
                initialImage: tokenUrl || null,
                name: combatant.nameRu || combatant.name,
                targetCombatantId: combatant.id,
                faction,
              });
            }}
            title="Открыть в Кузнице токенов (кликните для смены окантовки и кадрирования)"
          >
            <div
              className={clsx(
                'w-7 h-7 rounded-full overflow-hidden border-2 flex items-center justify-center bg-canvas shadow-sm transition-transform group-hover/avatar:scale-105 group-hover/avatar:border-amber-400',
                combatant.isPlayer
                  ? 'border-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                  : 'border-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.25)]'
              )}
            >
              {tokenUrl ? (
                <img src={tokenUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold font-mono text-gray-200">
                  {initials}
                </span>
              )}
            </div>
            {cloneNumber && (
              <span
                className={clsx(
                  'absolute -bottom-1 -right-1 min-w-[15px] h-[15px] px-0.5 flex items-center justify-center rounded-full font-mono text-[8px] font-black border leading-none shadow-md ring-1 z-10 whitespace-nowrap',
                  CLONE_BADGE_STYLE
                )}
                title={`Клон #${cloneNumber}`}
              >
                #{cloneNumber}
              </span>
            )}
          </div>

          {/* Name + Badges */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={clsx(
                'text-xs sm:text-sm font-bold tracking-tight truncate leading-tight',
                isActiveTurn ? 'text-white font-extrabold drop-shadow-sm' : 'text-gray-100',
                combatant.isPlayer && 'text-emerald-300'
              )}
              title={cleanRussianText(combatant.nameRu || combatant.name)}
            >
              {cleanRussianText(combatant.nameRu || combatant.name)}
            </span>

            {combatant.isPlayer && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const party = usePartyStore.getState();
                  const pMember = party.members.find(
                    (m) =>
                      m.name.toLowerCase() === (combatant.nameRu || combatant.name).toLowerCase() ||
                      m.name.toLowerCase() === combatant.name.toLowerCase()
                  );
                  if (pMember) {
                    party.openCharacterSheet(pMember.id);
                  } else if (party.members.length > 0) {
                    party.openCharacterSheet(party.members[0].id);
                  }
                }}
                title="Открыть интерактивный лист персонажа D&D Beyond"
                className="text-[9px] px-1 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/70 hover:border-gold hover:text-gold-light text-emerald-300 flex-shrink-0 font-mono leading-none whitespace-nowrap cursor-pointer transition-colors shadow-sm flex items-center gap-0.5"
              >
                <FileText className="h-3 w-3" />
                <span>ЛИСТ</span>
              </button>
            )}

            {isDead && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-900 border border-red-800 text-red-400 font-bold flex-shrink-0 leading-none whitespace-nowrap">
                МЁРТВ
              </span>
            )}
          </div>
        </div>

        {/* Right: Token Forge, Showcase & Delete */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const faction = combatant.isPlayer ? 'ally-blue' : 'enemy';
              useTokenForgeStore.getState().openForge({
                initialImage: tokenUrl || null,
                name: combatant.nameRu || combatant.name,
                targetCombatantId: combatant.id,
                faction,
              });
            }}
            title="Кузница токена: кадрирование, рамки, свечение"
            className="p-1 rounded text-amber-400 hover:text-amber-200 hover:bg-amber-950/40 transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShowcase();
            }}
            title="Показать игрокам на втором мониторе"
            className="p-1 rounded text-gray-400 hover:text-gold-light hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Удалить из боя"
            className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
