import { Shield, Swords, Skull } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { useTranslation } from '../../../i18n';

export interface TargetSelectorProps {
  availableTargets: Combatant[];
  attacker: Combatant;
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  target?: Combatant;
  isAoEMode: boolean;
  onToggleAoEMode: (isAoE: boolean) => void;
  selectedAoETargetIds: string[];
  onSelectAoETargetIds: (ids: string[]) => void;
  cover?: 'none' | 'half' | 'threeQuarters' | 'total';
  onCoverChange?: (cover: 'none' | 'half' | 'threeQuarters' | 'total') => void;
}

export function TargetSelector({
  availableTargets,
  attacker,
  selectedTargetId,
  onSelectTarget,
  target,
  isAoEMode,
  onToggleAoEMode,
  selectedAoETargetIds,
  onSelectAoETargetIds,
  cover = 'none',
  onCoverChange,
}: TargetSelectorProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';

  const getName = (c?: Combatant | null): string => {
    if (!c) return '';
    return (isEn ? (c.name || c.nameRu) : (c.nameRu || c.name)) || '';
  };

  return (
    <div className="space-y-2 bg-card p-3.5 rounded-sm border border-border-subtle">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-blue-400" />
          {isEn ? '1. Select Attack Target:' : '1. Выбор цели атаки:'}
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-200">
          <input
            type="checkbox"
            checked={isAoEMode}
            onChange={(e) => onToggleAoEMode(e.target.checked)}
            className="rounded border-border-subtle text-gold focus:ring-0 bg-surface"
          />
          <span>{isEn ? 'Multi-target / AoE' : 'Несколько целей / AoE'}</span>
        </label>
      </div>

      {!isAoEMode ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <select
              value={selectedTargetId}
              onChange={(e) => onSelectTarget(e.target.value)}
              className="flex-1 min-w-0 max-w-full bg-surface border border-border-subtle text-xs rounded-sm px-3 py-2 text-gray-100 focus:border-gold outline-none"
            >
              {availableTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.isPlayer ? (isEn ? '[Player] ' : '[Игрок] ') : (isEn ? '[Monster] ' : '[Монстр] ')}
                  {getName(t)} — {isEn ? `AC: ${t.ac} | HP: ${t.hp}/${t.maxHp}` : `КД: ${t.ac} | ОЗ: ${t.hp}/${t.maxHp}`}
                </option>
              ))}
            </select>
            {target && (
              <div className="text-[11px] font-mono px-3 py-1.5 bg-surface border border-border-subtle rounded-sm text-gray-300 shrink-0">
                {isEn ? 'Target AC:' : 'КД цели:'}{' '}
                <strong className="text-gold font-bold text-sm">{target.ac}</strong>
              </div>
            )}
          </div>

          {onCoverChange && target && (
            <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/40 text-xs">
              <span className="text-[11px] text-gray-400">
                {isEn ? 'Cover:' : 'Укрытие:'}
              </span>
              <select
                value={cover}
                onChange={(e) => onCoverChange(e.target.value as any)}
                className="bg-surface border border-border-subtle text-xs rounded-sm px-2.5 py-1 text-gray-100 focus:border-gold outline-none"
              >
                <option value="none">{isEn ? 'No Cover (+0 AC)' : 'Без укрытия (+0 КД)'}</option>
                <option value="half">{isEn ? 'Half Cover (+2 AC)' : 'Половинное укрытие (+2 КД)'}</option>
                <option value="threeQuarters">{isEn ? 'Three-Quarters Cover (+5 AC)' : 'Укрытие на 3/4 (+5 КД)'}</option>
                <option value="total">{isEn ? 'Total Cover' : 'Полное укрытие'}</option>
              </select>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
            <span className="text-[10px] text-gray-500 mr-1">
              {isEn ? 'Quick Select:' : 'Быстрый выбор:'}
            </span>
            <button
              type="button"
              onClick={() =>
                onSelectAoETargetIds(
                  availableTargets
                    .filter((t) => (attacker.isPlayer ? !t.isPlayer : t.isPlayer))
                    .map((t) => t.id)
                )
              }
              className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white hover:border-gold/40 transition-colors inline-flex items-center gap-1"
            >
              <Swords className="h-3 w-3" />
              <span>{isEn ? 'All Enemies' : 'Все враги'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onSelectAoETargetIds(availableTargets.filter((t) => t.isPlayer).map((t) => t.id))
              }
              className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white hover:border-gold/40 transition-colors inline-flex items-center gap-1"
            >
              <Shield className="h-3 w-3" />
              <span>{isEn ? 'All Players' : 'Все игроки'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onSelectAoETargetIds(availableTargets.filter((t) => !t.isPlayer).map((t) => t.id))
              }
              className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white hover:border-gold/40 transition-colors inline-flex items-center gap-1"
            >
              <Skull className="h-3 w-3" />
              <span>{isEn ? 'All Monsters' : 'Все монстры'}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectAoETargetIds(availableTargets.map((t) => t.id))}
              className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white hover:border-gold/40 transition-colors"
            >
              {isEn ? `All (${availableTargets.length})` : `Все (${availableTargets.length})`}
            </button>
            <button
              type="button"
              onClick={() => onSelectAoETargetIds([])}
              className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white transition-colors text-red-400 hover:text-red-300"
            >
              {isEn ? 'Reset' : 'Сбросить'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-surface rounded-sm border border-border-subtle">
            {availableTargets.map((t) => {
              const isChecked = selectedAoETargetIds.includes(t.id);
              return (
                <label
                  key={t.id}
                  className={`flex items-center justify-between gap-2 p-1.5 rounded text-xs cursor-pointer border transition-all ${
                    isChecked
                      ? 'bg-gold/10 border-gold/40 text-gold-light'
                      : 'border-transparent text-gray-400 hover:bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectAoETargetIds([...selectedAoETargetIds, t.id]);
                        } else {
                          onSelectAoETargetIds(
                            selectedAoETargetIds.filter((id) => id !== t.id)
                          );
                        }
                      }}
                      className="rounded border-border-subtle text-gold focus:ring-0 bg-canvas"
                    />
                    <span className="truncate flex items-center gap-1.5">
                      {t.isPlayer ? (
                        <Shield className="h-3 w-3 text-blue-400 shrink-0 inline" />
                      ) : (
                        <Skull className="h-3 w-3 text-red-400 shrink-0 inline" />
                      )}
                      <span>{getName(t)}</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 shrink-0">
                    {isEn ? `AC ${t.ac} | ${t.hp}/${t.maxHp} HP` : `КД ${t.ac} | ${t.hp}/${t.maxHp} ОЗ`}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
