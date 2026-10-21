import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Shield,
  Zap,
  Trash2,
  Plus,
  Radio,
  EyeOff,
  Lock,
  Moon,
  ShieldAlert,
  ShieldCheck,
  ZapOff,
} from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { useCombatStore } from '../../../store/combatStore';
import {
  ActiveEffectModifier,
  DND_2024_EFFECT_PRESETS,
  createEffectFromPreset,
  calculateEffectiveStats,
} from '../../../engine/effectStackEngine';
import { cleanRussianText } from '../../../utils/textUtils';

export interface CombatantEffectsModalProps {
  combatant: Combatant;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ICONS: Record<string, React.ElementType> = {
  Shield,
  Sparkles,
  Zap,
  ShieldAlert,
  ShieldCheck,
  ZapOff,
  EyeOff,
  Lock,
  Moon,
};

const AURA_COLORS = [
  { label: 'Синий', color: '#3B82F6' },
  { label: 'Золотой', color: '#F59E0B' },
  { label: 'Изумрудный', color: '#10B981' },
  { label: 'Фиолетовый', color: '#8B5CF6' },
  { label: 'Красный', color: '#EF4444' },
  { label: 'Бирюзовый', color: '#06B6D4' },
];

export function CombatantEffectsModal({ combatant, isOpen, onClose }: CombatantEffectsModalProps) {
  const activeEffects = useCombatStore((s) => s.activeEffects[combatant.id]) || [];
  const { addEffectToCombatant, removeEffectFromCombatant, clearCombatantEffects } = useCombatStore();

  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  // Custom effect form state
  const [customName, setCustomName] = useState('');
  const [customDurationType, setCustomDurationType] = useState<'rounds' | 'permanent'>('rounds');
  const [customDurationRounds, setCustomDurationRounds] = useState(10);
  const [customAcBonus, setCustomAcBonus] = useState<number>(0);
  const [customSpeedBonus, setCustomSpeedBonus] = useState<number>(0);
  const [customAttackBonus, setCustomAttackBonus] = useState('');
  const [customSaveBonus, setCustomSaveBonus] = useState('');
  const [customAdvantage, setCustomAdvantage] = useState(false);
  const [customDisadvantage, setCustomDisadvantage] = useState(false);

  // Custom aura state
  const [auraEnabled, setAuraEnabled] = useState(false);
  const [auraRadiusFeet, setAuraRadiusFeet] = useState(10);
  const [auraColor, setAuraColor] = useState('#3B82F6');

  if (!isOpen) return null;

  const effectiveStats = calculateEffectiveStats(
    { ac: combatant.ac, speed: combatant.speed },
    activeEffects
  );

  const handleApplyPreset = (presetId: string) => {
    const effect = createEffectFromPreset(presetId);
    addEffectToCombatant(combatant.id, effect);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim() || 'Пользовательский эффект';
    const effect: ActiveEffectModifier = {
      id: `effect_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      iconTag: auraEnabled ? 'Radio' : customAcBonus !== 0 ? 'Shield' : 'Sparkles',
      description: `Пользовательский эффект (${customDurationType === 'permanent' ? 'Постоянно' : `${customDurationRounds} р.`})`,
      durationRounds: customDurationType === 'permanent' ? 'permanent' : Math.max(1, customDurationRounds),
      modifiers: {
        acBonus: customAcBonus !== 0 ? customAcBonus : undefined,
        speedBonus: customSpeedBonus !== 0 ? customSpeedBonus : undefined,
        attackBonus: customAttackBonus.trim() || undefined,
        saveBonus: customSaveBonus.trim() || undefined,
        advantageAttacks: customAdvantage || undefined,
        disadvantageAttacks: customDisadvantage || undefined,
      },
      aura: auraEnabled
        ? {
            enabled: true,
            radiusFeet: Math.max(5, auraRadiusFeet),
            color: auraColor,
            opacity: 0.22,
            pulsing: true,
          }
        : undefined,
    };

    addEffectToCombatant(combatant.id, effect);
    // Reset form
    setCustomName('');
    setCustomAcBonus(0);
    setCustomSpeedBonus(0);
    setCustomAttackBonus('');
    setCustomSaveBonus('');
    setCustomAdvantage(false);
    setCustomDisadvantage(false);
    setAuraEnabled(false);
  };

  const displayName = cleanRussianText(combatant.nameRu || combatant.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[88vh] flex flex-col bg-[#0f141c] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden ring-1 ring-gold/30 text-xs text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#151c27] border-b border-slate-700/80 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <div>
              <h2 className="font-bold text-sm text-gold-light truncate">
                Эффекты и ауры: {displayName}
              </h2>
              <div className="text-[11px] text-gray-400 flex items-center gap-3">
                <span>
                  Базовый КД: <strong className="text-white font-mono">{combatant.ac}</strong>
                </span>
                <span>
                  Эффективный КД:{' '}
                  <strong
                    className={
                      effectiveStats.acBonus > 0
                        ? 'text-emerald-400 font-mono'
                        : effectiveStats.acBonus < 0
                        ? 'text-red-400 font-mono'
                        : 'text-white font-mono'
                    }
                  >
                    {effectiveStats.effectiveAc}
                  </strong>
                  {effectiveStats.acBonus !== 0 && (
                    <span className="ml-1 text-[10px] text-gray-400 font-mono">
                      ({effectiveStats.acBonus > 0 ? `+${effectiveStats.acBonus}` : effectiveStats.acBonus})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. Active Effects List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[11px] text-gray-300">
                Активные эффекты ({activeEffects.length})
              </span>
              {activeEffects.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearCombatantEffects(combatant.id)}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Снять все</span>
                </button>
              )}
            </div>

            {activeEffects.length === 0 ? (
              <div className="p-3 bg-[#131822] border border-slate-800 rounded-lg text-center text-gray-400 text-[11px]">
                На комбатанта не наложено временных модификаторов или аур
              </div>
            ) : (
              <div className="space-y-1.5">
                {activeEffects.map((eff) => {
                  const Icon = PRESET_ICONS[eff.iconTag || ''] || Sparkles;
                  return (
                    <div
                      key={eff.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#141b26] border border-slate-700/80 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded bg-purple-950/70 border border-purple-700/60 text-purple-300 flex-shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-200 truncate">{eff.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-gray-300 border border-slate-700">
                              {eff.durationRounds === 'permanent'
                                ? 'Постоянно'
                                : `${eff.durationRounds} р.`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5 flex-wrap">
                            {eff.modifiers?.acBonus && (
                              <span className="text-emerald-400 font-mono font-bold">
                                {eff.modifiers.acBonus > 0 ? `+${eff.modifiers.acBonus}` : eff.modifiers.acBonus} КД
                              </span>
                            )}
                            {eff.modifiers?.speedBonus && (
                              <span className="text-cyan-400 font-mono">
                                {eff.modifiers.speedBonus > 0 ? `+${eff.modifiers.speedBonus}` : eff.modifiers.speedBonus} фт. скор.
                              </span>
                            )}
                            {eff.modifiers?.attackBonus && (
                              <span className="text-amber-300 font-mono">
                                {eff.modifiers.attackBonus} атака
                              </span>
                            )}
                            {eff.modifiers?.saveBonus && (
                              <span className="text-blue-300 font-mono">
                                {eff.modifiers.saveBonus} спас
                              </span>
                            )}
                            {eff.modifiers?.advantageAttacks && (
                              <span className="text-emerald-300 font-sans">Преимущество</span>
                            )}
                            {eff.modifiers?.disadvantageAttacks && (
                              <span className="text-rose-300 font-sans">Помеха</span>
                            )}
                            {eff.aura?.enabled && (
                              <span
                                className="px-1 py-0.2 rounded font-mono font-bold text-[9px] border"
                                style={{
                                  backgroundColor: `${eff.aura.color}22`,
                                  borderColor: eff.aura.color,
                                  color: eff.aura.color,
                                }}
                              >
                                Аура {eff.aura.radiusFeet} фт.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeEffectFromCombatant(combatant.id, eff.id)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-300 hover:bg-red-950/60 transition-colors flex-shrink-0"
                        title="Удалить эффект"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tab Selector: Presets / Custom Effect */}
          <div className="flex border-b border-slate-700/80 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`pb-2 px-3 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'presets'
                  ? 'border-gold text-gold-light'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Пресеты D&D 2024
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`pb-2 px-3 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'custom'
                  ? 'border-gold text-gold-light'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Создать свой эффект
            </button>
          </div>

          {/* 2. Presets Grid */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DND_2024_EFFECT_PRESETS.map((p) => {
                const Icon = PRESET_ICONS[p.iconTag || ''] || Sparkles;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    className="p-2.5 rounded-lg bg-[#141b26] border border-slate-700/80 hover:border-gold/60 text-left transition-all hover:bg-[#192230] group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className="h-3.5 w-3.5 text-gold group-hover:scale-110 transition-transform flex-shrink-0" />
                        <span className="font-bold text-gray-100 truncate group-hover:text-gold-light">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700 flex-shrink-0">
                        {p.durationRounds === 'permanent' ? 'Постоянно' : `${p.durationRounds} р.`}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug line-clamp-2">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. Custom Effect Form */}
          {activeTab === 'custom' && (
            <form onSubmit={handleCreateCustom} className="space-y-3 bg-[#131924] p-3 rounded-lg border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1">
                    Название эффекта
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Например: Каменная кожа"
                    className="w-full bg-[#0b0e14] border border-slate-700 rounded px-2.5 py-1 text-xs text-gray-100 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1">
                    Длительность
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={customDurationType}
                      onChange={(e) => setCustomDurationType(e.target.value as any)}
                      className="bg-[#0b0e14] border border-slate-700 rounded px-1.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-gold"
                    >
                      <option value="rounds">Раунды</option>
                      <option value="permanent">Постоянно</option>
                    </select>
                    {customDurationType === 'rounds' && (
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={customDurationRounds}
                        onChange={(e) => setCustomDurationRounds(Math.max(1, Number(e.target.value) || 1))}
                        className="w-14 bg-[#0b0e14] border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-xs text-gray-100 focus:outline-none focus:border-gold"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Modifiers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1">
                    Бонус к КД
                  </label>
                  <input
                    type="number"
                    value={customAcBonus}
                    onChange={(e) => setCustomAcBonus(Number(e.target.value) || 0)}
                    placeholder="+2"
                    className="w-full bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 font-mono text-center text-xs text-gray-100 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1">
                    Скорость (фт.)
                  </label>
                  <input
                    type="number"
                    step="5"
                    value={customSpeedBonus}
                    onChange={(e) => setCustomSpeedBonus(Number(e.target.value) || 0)}
                    placeholder="+10"
                    className="w-full bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 font-mono text-center text-xs text-gray-100 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1">
                    Бонус атаки
                  </label>
                  <input
                    type="text"
                    value={customAttackBonus}
                    onChange={(e) => setCustomAttackBonus(e.target.value)}
                    placeholder="+1d4 или +2"
                    className="w-full bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 font-mono text-center text-xs text-gray-100 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1">
                    Бонус спасброска
                  </label>
                  <input
                    type="text"
                    value={customSaveBonus}
                    onChange={(e) => setCustomSaveBonus(e.target.value)}
                    placeholder="+1d4 или +3"
                    className="w-full bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 font-mono text-center text-xs text-gray-100 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Advantage / Disadvantage Checkboxes */}
              <div className="flex items-center gap-4 text-xs pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customAdvantage}
                    onChange={(e) => setCustomAdvantage(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-gold focus:ring-0"
                  />
                  <span>Преимущество на атаки</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customDisadvantage}
                    onChange={(e) => setCustomDisadvantage(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-red-500 focus:ring-0"
                  />
                  <span>Помеха на атаки</span>
                </label>
              </div>

              {/* Aura Options Section */}
              <div className="pt-2 border-t border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={auraEnabled}
                      onChange={(e) => setAuraEnabled(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-gold focus:ring-0"
                    />
                    <Radio className="h-3.5 w-3.5 text-blue-400" />
                    <span>Включить ауру вокруг токена на карте</span>
                  </label>
                </div>

                {auraEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in duration-100">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">
                        Радиус ауры (футы)
                      </label>
                      <div className="flex items-center gap-1">
                        {[10, 20, 30, 60].map((ft) => (
                          <button
                            key={ft}
                            type="button"
                            onClick={() => setAuraRadiusFeet(ft)}
                            className={`flex-1 py-1 rounded text-[11px] font-mono border ${
                              auraRadiusFeet === ft
                                ? 'bg-gold text-slate-950 font-bold border-gold'
                                : 'bg-[#0b0e14] border-slate-700 text-gray-300'
                            }`}
                          >
                            {ft} фт.
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Цвет ауры</label>
                      <div className="flex items-center gap-1">
                        {AURA_COLORS.map((item) => (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => setAuraColor(item.color)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${
                              auraColor === item.color
                                ? 'scale-110 border-white ring-2 ring-gold/40'
                                : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: item.color }}
                            title={item.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Применить эффект</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
