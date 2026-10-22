import { useTranslation } from '../../../i18n';

export interface HitOutcomeBannerProps {
  isHit: boolean;
  isCrit: boolean;
  hitOutcomeText: string;
}

export function HitOutcomeBanner({
  isHit,
  isCrit,
  hitOutcomeText,
}: HitOutcomeBannerProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';

  const badgeText = isCrit
    ? (isEn ? 'CRIT!' : 'КРИТ!')
    : isHit
    ? (isEn ? 'HIT!' : 'ПОПАДАНИЕ')
    : (isEn ? 'MISS!' : 'ПРОМАХ');

  return (
    <div
      className={`p-2 rounded text-xs font-mono font-medium border flex flex-wrap items-center justify-between gap-2 min-w-0 ${
        isCrit
          ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-200'
          : isHit
          ? 'bg-gold/10 border-gold/40 text-gold-light'
          : 'bg-red-950/30 border-red-900/50 text-red-300'
      }`}
    >
      <span className="break-words min-w-0 flex-1 leading-snug">{hitOutcomeText}</span>
      <span className="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface border border-border-subtle shrink-0">
        {badgeText}
      </span>
    </div>
  );
}
