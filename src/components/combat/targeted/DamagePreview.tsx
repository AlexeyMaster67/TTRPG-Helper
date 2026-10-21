import { AlertTriangle } from 'lucide-react';

export interface MultiattackStepLog {
  actionName: string;
  d20Log: string;
  isHit: boolean;
  isCrit: boolean;
  damage: number;
  damageType: string;
  notes: string;
}

export interface DamagePreviewProps {
  hasCalculated: boolean;
  isHit: boolean;
  finalCalculatedDamage: number;
  hitOutcomeText: string;
  damageDetailText?: string;
  defenseNoticeText?: string;
  concentrationCheckDc: number | null;
  multiattackLogs?: MultiattackStepLog[];
}

export function DamagePreview({
  hasCalculated,
  isHit,
  finalCalculatedDamage,
  hitOutcomeText,
  damageDetailText,
  defenseNoticeText,
  concentrationCheckDc,
  multiattackLogs = [],
}: DamagePreviewProps) {
  if (!hasCalculated) return null;

  return (
    <div
      className={`p-4 rounded-sm border space-y-2.5 animate-in fade-in ${
        isHit
          ? 'bg-gold/5 border-gold/40 text-gold-light'
          : 'bg-red-950/20 border-red-900/40 text-red-300'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-2 break-words min-w-0 flex-1 leading-snug">
          {hitOutcomeText}
        </h3>
        {isHit && (
          <span className="text-base sm:text-lg font-mono font-black text-gold px-2.5 py-0.5 rounded bg-surface border border-gold/30 shrink-0">
            {finalCalculatedDamage} урона
          </span>
        )}
      </div>

      {damageDetailText && (
        <p className="text-xs text-gray-300 font-mono break-words leading-relaxed">{damageDetailText}</p>
      )}

      {defenseNoticeText && (
        <p className="text-xs text-yellow-300 font-semibold break-words leading-relaxed">{defenseNoticeText}</p>
      )}

      {/* Concentration Check Warning */}
      {concentrationCheckDc !== null && (
        <div className="flex items-center gap-2 p-2 rounded bg-purple-950/40 border border-purple-800 text-xs text-purple-200 break-words leading-relaxed">
          <AlertTriangle className="h-4 w-4 text-purple-400 flex-shrink-0" />
          <span>
            Цель удерживает <strong>концентрацию</strong>! Необходим спасбросок Телосложения{' '}
            <strong className="text-purple-300 underline font-mono font-bold">
              Сл. {concentrationCheckDc}
            </strong>
            .
          </span>
        </div>
      )}

      {/* Multiattack / AoE Breakdown */}
      {multiattackLogs.length > 0 && (
        <div className="mt-2 space-y-1.5 bg-surface/60 p-2.5 rounded border border-border-subtle text-[11px] font-mono">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">
            Разбор целей и результатов:
          </div>
          {multiattackLogs.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border-subtle/40 pb-1.5 last:border-none last:pb-0">
              <span className="text-gray-200 break-words min-w-0 flex-1">
                #{i + 1} <strong>{l.actionName}</strong>: {l.d20Log}
              </span>
              <span className={`shrink-0 font-bold ${l.damage > 0 ? 'text-gold' : l.isHit ? 'text-emerald-400' : 'text-gray-400'}`}>
                {l.damage > 0 ? `${l.damage} ур. (${l.notes})` : l.notes || '0 ур.'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
