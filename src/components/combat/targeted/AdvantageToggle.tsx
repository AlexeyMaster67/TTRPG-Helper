import { RollMode } from '../../../types/dnd5e';
import { useTranslation } from '../../../i18n';

export interface AdvantageToggleProps {
  advMode: RollMode;
  onAdvModeChange: (mode: RollMode) => void;
}

export function AdvantageToggle({
  advMode,
  onAdvModeChange,
}: AdvantageToggleProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-gray-400">
        {isEn ? 'Roll Modifier:' : 'Модификатор броска:'}
      </span>
      <div className="flex items-center gap-2 text-xs">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="advMode"
            checked={advMode === 'normal'}
            onChange={() => onAdvModeChange('normal')}
            className="text-gold focus:ring-0 bg-surface"
          />
          <span>{isEn ? 'Normal (1d20)' : 'Обычный (1d20)'}</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer text-emerald-400">
          <input
            type="radio"
            name="advMode"
            checked={advMode === 'advantage'}
            onChange={() => onAdvModeChange('advantage')}
            className="text-emerald-500 focus:ring-0 bg-surface"
          />
          <span>{isEn ? 'Advantage (2d20kh1)' : 'Преимущество (2d20kh1)'}</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer text-red-400">
          <input
            type="radio"
            name="advMode"
            checked={advMode === 'disadvantage'}
            onChange={() => onAdvModeChange('disadvantage')}
            className="text-red-500 focus:ring-0 bg-surface"
          />
          <span>{isEn ? 'Disadvantage (2d20kl1)' : 'Помеха (2d20kl1)'}</span>
        </label>
      </div>
    </div>
  );
}
