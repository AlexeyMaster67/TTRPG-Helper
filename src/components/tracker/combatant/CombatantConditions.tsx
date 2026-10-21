import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Shield, ShieldOff, Zap, X, Clock } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { ConditionType } from '../../../types/dnd5e';
import { CONDITIONS_2024_DATA } from '../../../engine/conditions';

export const ALL_CONDITIONS: ConditionType[] = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Dazed',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
];

export type ConditionDurationOption = 'permanent' | '1_round' | '10_rounds' | 'end_of_next_turn';

export interface CombatantConditionTogglesProps {
  combatant: Combatant;
  roundCounter: number;
  onToggleReaction: () => void;
  onToggleConcentration: () => void;
  onAddCondition: (condition: {
    type: ConditionType;
    level?: number;
    durationRounds?: number;
    expiryRound?: number;
    triggerOn?: 'start_of_turn' | 'end_of_turn';
  }) => void;
}

export function CombatantConditionToggles({
  combatant,
  roundCounter,
  onToggleReaction,
  onToggleConcentration,
  onAddCondition,
}: CombatantConditionTogglesProps) {
  const [isConditionPickerOpen, setIsConditionPickerOpen] = useState(false);
  const [selectedConditionType, setSelectedConditionType] = useState<ConditionType>('Blinded');
  const [selectedConditionDuration, setSelectedConditionDuration] = useState<ConditionDurationOption>('permanent');
  const conditionPickerRef = useRef<HTMLDivElement>(null);

  // Close condition picker on click outside
  useEffect(() => {
    if (!isConditionPickerOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (conditionPickerRef.current && !conditionPickerRef.current.contains(e.target as Node)) {
        setIsConditionPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isConditionPickerOpen]);

  const handleApplyConditionWithDuration = () => {
    let durationRounds: number | undefined;
    let expiryRound: number | undefined;
    let triggerOn: 'start_of_turn' | 'end_of_turn' | undefined;

    if (selectedConditionDuration === 'end_of_next_turn') {
      durationRounds = 1;
      expiryRound = roundCounter + 1;
      triggerOn = 'end_of_turn';
    } else if (selectedConditionDuration === '1_round') {
      durationRounds = 1;
      expiryRound = roundCounter + 1;
      triggerOn = 'start_of_turn';
    } else if (selectedConditionDuration === '10_rounds') {
      durationRounds = 10;
      expiryRound = roundCounter + 10;
      triggerOn = 'end_of_turn';
    }

    onAddCondition({
      type: selectedConditionType,
      level: selectedConditionType === 'Exhaustion' ? 1 : undefined,
      durationRounds,
      expiryRound,
      triggerOn,
    });
    setIsConditionPickerOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Reaction: Shield / ShieldOff */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleReaction();
        }}
        title={
          combatant.reactionUsed
            ? 'Реакция израсходована (клик, чтобы восстановить)'
            : 'Реакция готова (клик, чтобы потратить)'
        }
        className={clsx(
          'p-1.5 rounded-sm transition-all flex items-center justify-center',
          combatant.reactionUsed
            ? 'bg-card border border-border-subtle text-gray-500 opacity-40 hover:opacity-80'
            : 'bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 shadow-sm'
        )}
      >
        {combatant.reactionUsed ? (
          <ShieldOff className="h-3.5 w-3.5" />
        ) : (
          <Shield className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Concentration: Zap */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleConcentration();
        }}
        title={
          combatant.isConcentrating
            ? 'Концентрация активна (клик, чтобы снять)'
            : 'Концентрация не удерживается (клик, чтобы активировать)'
        }
        className={clsx(
          'p-1.5 rounded-sm border transition-all flex items-center justify-center',
          combatant.isConcentrating
            ? 'bg-sapphire/30 border-blue-400 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.5)] ring-1 ring-blue-400/50'
            : 'bg-card border-border-subtle text-gray-500 hover:text-gray-300'
        )}
      >
        <Zap
          className={clsx(
            'h-3.5 w-3.5',
            combatant.isConcentrating && 'fill-blue-400 text-blue-200'
          )}
        />
      </button>

      {/* Condition Add Picker with Duration Selector */}
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setIsConditionPickerOpen((prev) => !prev)}
          title="Добавить состояние с настройкой длительности..."
          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-card border border-border-subtle text-gray-400 hover:text-gold-light hover:border-gold/40 transition-all flex items-center gap-0.5 cursor-pointer leading-none"
        >
          <span>+</span>
          <span className="text-[8px] opacity-70">Сост.</span>
        </button>

        {isConditionPickerOpen && (
          <div
            ref={conditionPickerRef}
            className="absolute right-0 top-full mt-1 z-50 w-64 rounded-md border border-gold/60 bg-[#161d23] shadow-2xl p-2.5 flex flex-col gap-2 ring-1 ring-black/70 animate-in fade-in duration-100 text-left"
          >
            <div className="flex items-center justify-between pb-1 border-b border-[#2e3b46]">
              <span className="text-[11px] font-bold text-gray-200">Добавить состояние:</span>
              <button
                type="button"
                onClick={() => setIsConditionPickerOpen(false)}
                className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-[#202a32]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Condition Select */}
            <div>
              <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Состояние:
              </label>
              <select
                value={selectedConditionType}
                onChange={(e) => setSelectedConditionType(e.target.value as ConditionType)}
                className="w-full text-xs font-medium px-2 py-1 rounded bg-[#0f1418] border border-[#303f4d] text-gray-100 focus:outline-none focus:border-gold cursor-pointer"
              >
                {ALL_CONDITIONS.map((c) => {
                  const info = CONDITIONS_2024_DATA[c];
                  return (
                    <option key={c} value={c} className="bg-[#12181c] text-gray-200">
                      {info?.nameRu || c} ({info?.nameEn})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Длительность:
              </label>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedConditionDuration('permanent')}
                  className={clsx(
                    'px-1.5 py-1 rounded text-left border transition-all truncate',
                    selectedConditionDuration === 'permanent'
                      ? 'bg-gold/25 border-gold text-gold-light font-bold'
                      : 'bg-[#1a232b] border-[#2e3b46] text-gray-300 hover:text-white'
                  )}
                  title="Бессрочно (до ручного снятия)"
                >
                  Бессрочно
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedConditionDuration('end_of_next_turn')}
                  className={clsx(
                    'px-1.5 py-1 rounded text-left border transition-all truncate',
                    selectedConditionDuration === 'end_of_next_turn'
                      ? 'bg-gold/25 border-gold text-gold-light font-bold'
                      : 'bg-[#1a232b] border-[#2e3b46] text-gray-300 hover:text-white'
                  )}
                  title="До конца следующего хода"
                >
                  До конца хода
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedConditionDuration('1_round')}
                  className={clsx(
                    'px-1.5 py-1 rounded text-left border transition-all truncate',
                    selectedConditionDuration === '1_round'
                      ? 'bg-gold/25 border-gold text-gold-light font-bold'
                      : 'bg-[#1a232b] border-[#2e3b46] text-gray-300 hover:text-white'
                  )}
                  title="1 раунд (до начала следующего раунда)"
                >
                  1 раунд
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedConditionDuration('10_rounds')}
                  className={clsx(
                    'px-1.5 py-1 rounded text-left border transition-all truncate',
                    selectedConditionDuration === '10_rounds'
                      ? 'bg-gold/25 border-gold text-gold-light font-bold'
                      : 'bg-[#1a232b] border-[#2e3b46] text-gray-300 hover:text-white'
                  )}
                  title="1 минута (10 раундов боя)"
                >
                  1 мин (10 р.)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyConditionWithDuration}
              className="w-full mt-1 py-1 rounded bg-gold hover:bg-gold-light text-[#12181c] font-black text-xs transition-colors shadow-sm cursor-pointer"
            >
              Применить состояние
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export interface CombatantConditionsProps {
  combatant: Combatant;
  onRemoveCondition: (type: ConditionType) => void;
}

export function CombatantConditions({
  combatant,
  onRemoveCondition,
}: CombatantConditionsProps) {
  if (!Array.isArray(combatant.conditions) || combatant.conditions.length === 0) {
    return null;
  }

  return (
    <div className="mt-1.5 pt-1.5 flex flex-wrap items-center gap-1.5 border-t border-[#2e3b46]/70 max-w-full select-none">
      {combatant.conditions.map((cond) => {
        const condMeta = CONDITIONS_2024_DATA[cond.type];
        const durationLabel =
          cond.triggerOn === 'end_of_turn' && cond.durationRounds === 1
            ? 'до конца хода'
            : cond.durationRounds
            ? `${cond.durationRounds} р.`
            : null;

        return (
          <span
            key={cond.type}
            className="group/cond relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/40 border border-amber-500/40 text-amber-200 hover:border-rose-500 hover:bg-rose-950/40 hover:text-rose-200 transition-all cursor-pointer shadow-sm max-w-full leading-none flex-shrink-0"
            title={`${condMeta?.nameRu || cond.type}${cond.expiryRound ? ` (до раунда ${cond.expiryRound})` : ' (Бессрочно)'} • Кликните для снятия`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold group-hover/cond:bg-rose-400 transition-colors flex-shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[160px] leading-tight">
              {condMeta?.nameRu || cond.type}
            </span>
            {cond.level !== undefined && (
              <span className="font-mono text-[9px] font-bold flex-shrink-0 whitespace-nowrap">
                ({cond.level})
              </span>
            )}
            {durationLabel && (
              <span className="font-mono text-[9px] font-bold px-1 rounded bg-black/50 text-gold-light border border-gold/30 flex-shrink-0 whitespace-nowrap inline-flex items-center gap-1">
                <Clock className="h-2.5 w-2.5 inline" />
                <span>{durationLabel}</span>
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveCondition(cond.type);
              }}
              title="Снять состояние"
              className="ml-0.5 p-0.5 rounded-full hover:bg-rose-600 hover:text-white text-gray-400 opacity-70 group-hover/cond:opacity-100 transition-all flex items-center justify-center cursor-pointer"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
