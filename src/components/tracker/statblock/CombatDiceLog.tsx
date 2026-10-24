import clsx from 'clsx';
import { Dices, Shield, Zap } from 'lucide-react';
import { DiceRollLogEntry } from '../../../types/combat';
import { MASTERY_SPECS } from '../../ui/MasteryBadge';
import { cleanRussianText } from '../../../utils/textUtils';
import { useTranslation } from '../../../i18n';

export interface CombatDiceLogProps {
  diceLog: DiceRollLogEntry[];
  onClearLog: () => void;
  onToggleConcentration?: (targetId: string) => void;
  onAddCondition?: (targetId: string, condition: any) => void;
}

export function CombatDiceLog({
  diceLog,
  onClearLog,
  onToggleConcentration,
  onAddCondition,
}: CombatDiceLogProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';

  return (
    <div className="h-44 border-t border-[rgba(255,255,255,0.08)] bg-black/50 backdrop-blur-md flex flex-col flex-shrink-0 shadow-glass">
      <div className="px-3 py-2 border-b border-white/10 bg-card/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Dices className="h-4 w-4 text-gold" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
            {isEn ? 'COMBAT DICE LOG' : 'ЖУРНАЛ БРОСКОВ'}
          </span>
        </div>
        {diceLog.length > 0 && (
          <button
            type="button"
            onClick={onClearLog}
            title={isEn ? 'Clear log' : 'Очистить журнал'}
            className="min-h-[28px] px-2.5 py-0.5 rounded-glass-sm text-xs text-gray-400 hover:text-red-400 font-mono font-semibold transition-colors uppercase hover:bg-white/5 cursor-pointer"
          >
            {isEn ? 'Clear' : 'Очистить'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-2">
        {diceLog.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-xs text-gray-400 italic">
            {isEn ? 'Click an attack or action to roll hit and damage' : 'Нажмите на атаку или действие для броска попадания и урона'}
          </div>
        ) : (
          diceLog.map((entry) => (
            <div
              key={entry.id}
              className="p-2 rounded-glass-sm bg-card/85 border border-white/10 text-xs flex flex-col gap-1 overflow-hidden shadow-sm"
            >
              <div className="flex items-center justify-between gap-1.5 text-gray-400 text-xs min-w-0">
                <span className="font-semibold text-gray-200 truncate min-w-0" title={cleanRussianText(entry.combatantName)}>
                  {cleanRussianText(entry.combatantName)}
                </span>
                <span className="text-gray-400 truncate flex-shrink-0 text-right font-mono tabular-nums" title={`${entry.actionName} • ${entry.timestamp}`}>
                  {entry.actionName} • {entry.timestamp}
                </span>
              </div>

              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 font-mono tabular-nums min-w-0 text-xs">
                {/* Attack roll */}
                {entry.attackRoll && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-gray-400">{isEn ? 'Attack:' : 'Атака:'}</span>
                    <span
                      className={clsx(
                        'font-bold tabular-nums',
                        entry.attackRoll.isNat20 && 'text-emerald-400',
                        entry.attackRoll.isNat1 && 'text-red-400',
                        !entry.attackRoll.isNat20 && !entry.attackRoll.isNat1 && 'text-gold-light'
                      )}
                    >
                      {entry.attackRoll.total}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      (d20: {entry.attackRoll.d20}
                      {entry.attackRoll.modifier >= 0 ? `+${entry.attackRoll.modifier}` : entry.attackRoll.modifier})
                    </span>
                    {entry.attackRoll.isNat20 && (
                      <span className="text-xs px-1.5 py-0.2 rounded-glass-sm bg-emerald-950 text-emerald-300 font-bold border border-emerald-600 whitespace-nowrap">
                        {isEn ? 'CRIT!' : 'КРИТ!'}
                      </span>
                    )}
                    {entry.attackRoll.isNat1 && (
                      <span className="text-xs px-1.5 py-0.2 rounded-glass-sm bg-red-950 text-red-300 font-bold border border-red-600 whitespace-nowrap">
                        {isEn ? 'FUMBLE!' : 'ПРОВАЛ!'}
                      </span>
                    )}
                  </div>
                )}

                {/* Damage roll */}
                {entry.damageRoll && (
                  <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">{isEn ? 'Damage:' : 'Урон:'}</span>
                    <span className="font-bold text-red-300 tabular-nums flex-shrink-0">
                      {entry.damageRoll.total}
                    </span>
                    <span
                      className="text-xs text-gray-500 truncate max-w-[140px]"
                      title={entry.damageRoll.details}
                    >
                      ({entry.damageRoll.details})
                    </span>
                  </div>
                )}

                {/* Weapon mastery trigger */}
                {entry.weaponMastery && (
                  <span className="text-xs text-amber font-sans flex-shrink-0 whitespace-nowrap">
                    [{isEn ? (MASTERY_SPECS[entry.weaponMastery]?.nameEn || entry.weaponMastery) : (MASTERY_SPECS[entry.weaponMastery]?.nameRu || entry.weaponMastery)}]
                  </span>
                )}
              </div>

              {/* Target info if targeted strike */}
              {entry.targetName && (
                <div className="flex items-center flex-wrap gap-1.5 text-xs mt-0.5 min-w-0">
                  <span className="text-gray-400 flex-shrink-0">{isEn ? 'Target:' : 'Цель:'}</span>
                  <strong
                    className="text-gray-100 truncate max-w-[140px]"
                    title={cleanRussianText(entry.targetName)}
                  >
                    {cleanRussianText(entry.targetName)}
                  </strong>
                  {entry.isHit !== undefined && (
                    <span
                      className={clsx(
                        'px-1.5 py-0.2 rounded-glass-sm font-bold text-xs flex-shrink-0 whitespace-nowrap',
                        entry.isHit
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                          : 'bg-red-950 text-red-300 border border-red-600'
                      )}
                    >
                      {entry.isHit ? (isEn ? 'HIT' : 'ПОПАДАНИЕ') : (isEn ? 'MISS' : 'ПРОМАХ')}
                    </span>
                  )}
                  {entry.effectiveDamage !== undefined && entry.effectiveDamage > 0 && (
                    <span className="font-mono tabular-nums font-bold text-red-300 flex-shrink-0 whitespace-nowrap">
                      (-{entry.effectiveDamage} {isEn ? 'HP' : 'ОЗ'})
                    </span>
                  )}
                </div>
              )}

              {/* Additional note or mastery log */}
              {entry.note && (
                <div className="text-xs text-gray-400 italic break-words [overflow-wrap:anywhere]">
                  {entry.note}
                </div>
              )}

              {/* Interactive Concentration Prompt Button */}
              {entry.concentrationPrompt && onToggleConcentration && (
                <div className="min-h-[32px] mt-1 flex items-center justify-between gap-1.5 bg-amber-950/40 border border-amber-500/40 rounded-glass-sm px-2.5 py-1 text-xs min-w-0">
                  <span className="text-amber-300 font-medium truncate min-w-0 flex items-center gap-1" title={isEn ? `Concentration: DC ${entry.concentrationPrompt.dc}` : `Концентрация: СЛ ${entry.concentrationPrompt.dc}`}>
                    <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{isEn ? 'Concentration:' : 'Концентрация:'} <strong>{isEn ? 'DC' : 'СЛ'} {entry.concentrationPrompt.dc}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleConcentration(entry.concentrationPrompt!.targetId)}
                    className="min-h-[28px] bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/40 px-2 py-0.5 rounded-glass-sm text-xs font-semibold transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
                  >
                    {isEn ? 'Break' : 'Сбить'}
                  </button>
                </div>
              )}

              {/* Interactive Topple Prone Prompt Button */}
              {entry.topplePrompt && onAddCondition && (
                <div className="min-h-[32px] mt-1 flex items-center justify-between gap-1.5 bg-purple-950/40 border border-purple-500/40 rounded-glass-sm px-2.5 py-1 text-xs min-w-0">
                  <span className="text-purple-300 font-medium truncate min-w-0 flex items-center gap-1" title={isEn ? `Topple: DC ${entry.topplePrompt.dc} CON` : `Опрокидывание: СЛ ${entry.topplePrompt.dc} ТЕЛ`}>
                    <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{isEn ? 'Topple:' : 'Опрокидывание:'} <strong>{isEn ? 'DC' : 'СЛ'} {entry.topplePrompt.dc} {isEn ? 'CON' : 'ТЕЛ'}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddCondition(entry.topplePrompt!.targetId, { type: 'Prone' })}
                    className="min-h-[28px] bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded-glass-sm text-xs font-semibold transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
                  >
                    {isEn ? 'Knock Prone' : 'Сбить с ног'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
