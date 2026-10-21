
import { Shield } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { SKILL_NAMES_RU } from '../../../utils/textUtils';
import {
  localizeDefenses,
  localizeConditionImmunities,
  localizeSenses,
  localizeLanguages,
} from './statblockUtils';

export interface StatblockDefensesProps {
  combatant: Combatant;
}

export function StatblockDefenses({ combatant }: StatblockDefensesProps) {
  const sb = combatant.statblock;

  return (
    <>
      {sb?.skills && Object.keys(sb.skills).length > 0 && (
        <div className="flex items-start gap-1.5 min-w-0">
          <Shield className="h-3 w-3 text-gold flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
            <strong className="text-gray-200 font-bold">Навыки: </strong>
            <span className="font-mono tabular-nums text-gray-300 break-words [overflow-wrap:anywhere]">
              {Object.entries(sb.skills)
                .map(([sk, val]) => `${SKILL_NAMES_RU[sk.toLowerCase()] || sk} ${(val as number) >= 0 ? `+${val}` : val}`)
                .join(', ')}
            </span>
          </div>
        </div>
      )}

      {sb?.damage_vulnerabilities && (
        <div className="flex items-start gap-1.5 min-w-0">
          <Shield className="h-3 w-3 text-gold flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
            <strong className="text-gray-200 font-bold">Уязвимости к урону: </strong>
            <span className="text-gray-300 break-words [overflow-wrap:anywhere]">{localizeDefenses(sb.damage_vulnerabilities)}</span>
          </div>
        </div>
      )}

      {sb?.damage_resistances && (
        <div className="flex items-start gap-1.5 min-w-0">
          <Shield className="h-3 w-3 text-gold flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
            <strong className="text-gray-200 font-bold">Сопротивления к урону: </strong>
            <span className="text-gray-300 break-words [overflow-wrap:anywhere]">{localizeDefenses(sb.damage_resistances)}</span>
          </div>
        </div>
      )}

      {sb?.damage_immunities && (
        <div className="flex items-start gap-1.5 min-w-0">
          <Shield className="h-3 w-3 text-gold flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
            <strong className="text-gray-200 font-bold">Иммунитеты к урону: </strong>
            <span className="text-gray-300 break-words [overflow-wrap:anywhere]">{localizeDefenses(sb.damage_immunities)}</span>
          </div>
        </div>
      )}

      {sb?.condition_immunities && (
        <div className="flex items-start gap-1.5 min-w-0">
          <Shield className="h-3 w-3 text-gold flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
            <strong className="text-gray-200 font-bold">Иммунитеты к состояниям: </strong>
            <span className="text-gray-300 break-words [overflow-wrap:anywhere]">{localizeConditionImmunities(sb.condition_immunities)}</span>
          </div>
        </div>
      )}

      {sb?.senses && (
        <div className="flex items-start gap-1.5 min-w-0">
          <Shield className="h-3 w-3 text-gold flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
            <strong className="text-gray-200 font-bold">Чувства: </strong>
            <span className="text-gray-300 break-words [overflow-wrap:anywhere]">{localizeSenses(sb.senses)}</span>
          </div>
        </div>
      )}

      {sb?.languages && (
        <div className="flex items-start gap-1.5 min-w-0">
          <Shield className="h-3 w-3 text-gold flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
            <strong className="text-gray-200 font-bold">Языки: </strong>
            <span className="text-gray-300 break-words [overflow-wrap:anywhere]">{localizeLanguages(sb.languages)}</span>
          </div>
        </div>
      )}

      {combatant.cr && (
        <div className="flex items-start gap-1.5 min-w-0">
          <Shield className="h-3 w-3 text-gold flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
            <strong className="text-gray-200 font-bold">Опасность: </strong>
            <span className="font-mono tabular-nums text-gold-light font-bold">
              {combatant.cr} {(sb as any)?.xp ? `(${Number((sb as any).xp).toLocaleString()} опыта)` : ''}
            </span>
            {sb?.pb && (
              <span className="font-mono tabular-nums text-gray-400 text-xs ml-2 inline-block whitespace-nowrap">
                Бонус мастерства +{sb.pb}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
