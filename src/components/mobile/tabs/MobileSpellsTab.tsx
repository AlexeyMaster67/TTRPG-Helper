import { useState } from 'react';
import {
  Sparkles,
  Flame,
  Moon,
  Sun,
  Plus,
  Trash2,
  Check,
  X,
  BookOpen,
} from 'lucide-react';
import { PartyMember, PreparedSpell } from '../../../types/party';
import { usePartyStore } from '../../../store/partyStore';
import { audioService } from '../../../services/audioService';
import { calculateSpellSlots } from '../../../utils/characterCalculations';
import { dbService } from '../../../services/dbService';
import { ParsedSpell } from '../../../types/database';

interface MobileSpellsTabProps {
  member: PartyMember;
}

export function MobileSpellsTab({ member }: MobileSpellsTabProps) {
  const { updateMember, showToast } = usePartyStore();

  const [isAddSpellOpen, setIsAddSpellOpen] = useState(false);
  const [newSpellName, setNewSpellName] = useState('');
  const [newSpellLevel, setNewSpellLevel] = useState<number>(1);
  const [newSpellSchool, setNewSpellSchool] = useState('Воплощение');
  const [selectedSpellDetails, setSelectedSpellDetails] = useState<ParsedSpell | null>(null);

  const pb = member.proficiencyBonus || 2;
  const spellAbility = member.spellcastingAbility || 'cha';
  const abilityScore = member.stats?.[spellAbility] ?? 10;
  const spellMod = Math.floor((abilityScore - 10) / 2);
  const spellSaveDc = member.spellSaveDc || 8 + pb + spellMod;
  const spellAttackBonus = member.spellAttackBonus || pb + spellMod;

  const spellSlots = member.spellSlots || {};
  const preparedSpells = member.preparedSpells || [];

  // Toggle individual slot pill: tap-to-spend / tap-to-restore
  const handleToggleSlot = (level: number, slotIndex: number) => {
    const lvlSlot = spellSlots[level] || { max: 0, used: 0 };
    const isCurrentlyUsed = slotIndex < lvlSlot.used;
    const newUsed = isCurrentlyUsed
      ? Math.max(0, lvlSlot.used - 1)
      : Math.min(lvlSlot.max, lvlSlot.used + 1);

    audioService.playMagicCast();

    updateMember(member.id, {
      spellSlots: {
        ...spellSlots,
        [level]: { ...lvlSlot, used: newUsed },
      },
    });

    const actionText = isCurrentlyUsed ? 'восстановлена' : 'потрачена';
    showToast(`Ячейка ${level}-го круга ${actionText} (${lvlSlot.max - newUsed}/${lvlSlot.max} свободно).`);
  };

  // Adjust max slots for a given spell level
  const handleAdjustMaxSlots = (level: number, delta: number) => {
    const lvlSlot = spellSlots[level] || { max: 0, used: 0 };
    const newMax = Math.max(0, lvlSlot.max + delta);
    const newUsed = Math.min(newMax, lvlSlot.used);

    updateMember(member.id, {
      spellSlots: {
        ...spellSlots,
        [level]: { max: newMax, used: newUsed },
      },
    });
  };

  // Quick auto-populate standard spellcaster slots if empty
  const handleInitSpellSlots = (type: 'full' | 'half' | 'pact') => {
    const standardSlots = calculateSpellSlots(type, member.level || 1);
    updateMember(member.id, { spellSlots: standardSlots });
    audioService.playMagicCast();
    showToast(`Ячейки заклинаний инициализированы (${type === 'full' ? 'Полный заклинатель' : type === 'half' ? 'Полузаклинатель' : 'Договор колдуна'}).`);
  };

  // Short Rest
  const handleShortRest = () => {
    audioService.playMagicCast();

    // Reset short rest resources
    const updatedResources = (member.resources || []).map((r) =>
      r.resetOn === 'short' ? { ...r, current: r.max } : r
    );

    // If pact slots, restore them
    const normalizedClass = (member.characterClass || '').toLowerCase();
    const isWarlock = normalizedClass.includes('колдун') || normalizedClass.includes('warlock');

    let updatedSlots = { ...spellSlots };
    if (isWarlock) {
      Object.keys(updatedSlots).forEach((lvlStr) => {
        const lvl = parseInt(lvlStr, 10);
        if (updatedSlots[lvl]) {
          updatedSlots[lvl] = { ...updatedSlots[lvl], used: 0 };
        }
      });
    }

    updateMember(member.id, {
      resources: updatedResources,
      spellSlots: updatedSlots,
    });

    showToast('Короткий отдых завершен. Ресурсы короткого отдыха обновлены.');
  };

  // Long Rest
  const handleLongRest = () => {
    audioService.playCriticalHit();

    // Restore all HP
    const maxHp = member.maxHp || 10;

    // Reset all spell slots used to 0
    const restoredSlots: Record<number, { max: number; used: number }> = {};
    Object.keys(spellSlots).forEach((lvlStr) => {
      const lvl = parseInt(lvlStr, 10);
      restoredSlots[lvl] = { ...spellSlots[lvl], used: 0 };
    });

    // Recover hit dice (at least half max)
    const hitDiceMax = member.hitDiceMax || member.level || 1;
    const hitDiceCurrent = member.hitDiceCurrent !== undefined ? member.hitDiceCurrent : hitDiceMax;
    const recoveredDice = Math.max(1, Math.floor(hitDiceMax / 2));
    const nextHitDice = Math.min(hitDiceMax, hitDiceCurrent + recoveredDice);

    // Reset resources
    const updatedResources = (member.resources || []).map((r) => ({
      ...r,
      current: r.max,
    }));

    // Lower exhaustion by 1
    const currentExhaustion = member.exhaustion || 0;
    const nextExhaustion = Math.max(0, currentExhaustion - 1);

    updateMember(member.id, {
      currentHp: maxHp,
      tempHp: 0,
      hitDiceCurrent: nextHitDice,
      spellSlots: restoredSlots,
      resources: updatedResources,
      exhaustion: nextExhaustion,
    });

    showToast('Долгий отдых завершен! ХП, ячейки заклинаний и ресурсы полностью восстановлены.');
  };

  // Toggle prepared state
  const handleTogglePrepared = (index: number) => {
    const list = [...preparedSpells];
    if (list[index]) {
      list[index] = { ...list[index], prepared: !list[index].prepared };
      updateMember(member.id, { preparedSpells: list });
    }
  };

  const handleAddSpell = () => {
    if (!newSpellName.trim()) return;

    const newSpell: PreparedSpell = {
      id: `spell-${Date.now()}`,
      name: newSpellName.trim(),
      level: newSpellLevel,
      school: newSpellSchool,
      prepared: true,
    };

    updateMember(member.id, {
      preparedSpells: [...preparedSpells, newSpell],
    });

    setNewSpellName('');
    setIsAddSpellOpen(false);
    showToast(`Заклинание "${newSpell.name}" добавлено.`);
  };

  const handleDeleteSpell = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const list = [...preparedSpells];
    list.splice(index, 1);
    updateMember(member.id, { preparedSpells: list });
  };

  const handleInspectSpell = async (spell: PreparedSpell) => {
    try {
      const results = await dbService.searchSpells(spell.name, undefined, undefined, 3);
      if (results && results.length > 0) {
        setSelectedSpellDetails(results[0]);
      } else {
        setSelectedSpellDetails({
          id: `spell-${spell.name}`,
          name_ru: spell.name,
          name_en: spell.nameEn || spell.name,
          level: spell.level,
          school: spell.school || 'Универсальное',
          school_ru: spell.school || 'Универсальное',
          casting_time: '1 действие',
          range: '60 фт.',
          duration: 'Мгновенная',
          description_ru: 'Подробное описание заклинания доступно в справочнике правил D&D 2024.',
        } as any);
      }
    } catch {
      // Fallback
    }
  };

  // Active spell levels present in slots (1 to 9)
  const activeSlotLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
    (lvl) => spellSlots[lvl] && spellSlots[lvl].max > 0
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Spellcasting Header Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider">
              Параметры заклинателя
            </h3>
          </div>
          <span className="text-xs uppercase font-mono font-semibold text-indigo-400">
            {spellAbility.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-stone-800/80 border border-stone-700/80 rounded-xl p-2.5">
            <div className="text-[11px] text-stone-400 font-medium mb-0.5">
              Сл спасброска
            </div>
            <div className="text-2xl font-black font-mono text-indigo-300">
              {spellSaveDc}
            </div>
          </div>

          <div className="bg-stone-800/80 border border-stone-700/80 rounded-xl p-2.5">
            <div className="text-[11px] text-stone-400 font-medium mb-0.5">
              Бонус атаки
            </div>
            <div className="text-2xl font-black font-mono text-indigo-300">
              {spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus}
            </div>
          </div>

          <div className="bg-stone-800/80 border border-stone-700/80 rounded-xl p-2.5">
            <div className="text-[11px] text-stone-400 font-medium mb-0.5">
              Модификатор
            </div>
            <div className="text-2xl font-black font-mono text-stone-200">
              {spellMod >= 0 ? `+${spellMod}` : spellMod}
            </div>
          </div>
        </div>

        {/* Rest Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-800">
          <button
            onClick={handleShortRest}
            className="min-h-[44px] rounded-xl bg-stone-800 hover:bg-stone-750 active:scale-95 border border-stone-700 text-stone-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation"
          >
            <Moon className="w-4 h-4 text-cyan-400" />
            <span>Короткий отдых</span>
          </button>

          <button
            onClick={handleLongRest}
            className="min-h-[44px] rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 active:scale-95 border border-indigo-700/60 text-indigo-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation"
          >
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Долгий отдых</span>
          </button>
        </div>
      </div>

      {/* Interactive Spell Slots Pills Section */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider">
              Ячейки заклинаний
            </h3>
          </div>

          <span className="text-[11px] text-stone-400">
            Нажмите на ячейку, чтобы потратить
          </span>
        </div>

        {activeSlotLevels.length === 0 ? (
          <div className="p-4 bg-stone-850 rounded-xl border border-stone-800 text-center space-y-3">
            <p className="text-xs text-stone-400">
              У персонажа не настроены ячейки заклинаний. Вы можете инициализировать их автоматически:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleInitSpellSlots('full')}
                className="min-h-[44px] px-2 rounded-lg bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 text-xs font-semibold active:scale-95 transition-all"
              >
                Полный маг
              </button>
              <button
                onClick={() => handleInitSpellSlots('half')}
                className="min-h-[44px] px-2 rounded-lg bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 text-xs font-semibold active:scale-95 transition-all"
              >
                Полумаг
              </button>
              <button
                onClick={() => handleInitSpellSlots('pact')}
                className="min-h-[44px] px-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 text-xs font-semibold active:scale-95 transition-all"
              >
                Колдун
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSlotLevels.map((lvl) => {
              const slot = spellSlots[lvl] || { max: 0, used: 0 };
              const available = Math.max(0, slot.max - slot.used);

              return (
                <div
                  key={lvl}
                  className="bg-stone-850 border border-stone-800 rounded-xl p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-200">
                        {lvl}-й круг
                      </span>
                      <span className="text-xs font-mono text-stone-400">
                        ({available} из {slot.max} доступно)
                      </span>
                    </div>

                    {/* Quick Slot Max Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAdjustMaxSlots(lvl, -1)}
                        className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center text-xs active:scale-95"
                        aria-label="Уменьшить макс ячеек"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleAdjustMaxSlots(lvl, 1)}
                        className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center text-xs active:scale-95"
                        aria-label="Увеличить макс ячеек"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Interactive Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {Array.from({ length: slot.max }).map((_, slotIdx) => {
                      const isSpent = slotIdx < slot.used;

                      return (
                        <button
                          key={slotIdx}
                          onClick={() => handleToggleSlot(lvl, slotIdx)}
                          className={`min-w-[48px] min-h-[44px] px-3 rounded-xl border font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation active:scale-95 ${
                            isSpent
                              ? 'bg-stone-900 border-stone-800 text-stone-600 shadow-inner'
                              : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-950/50'
                          }`}
                          aria-label={`Ячейка ${slotIdx + 1} (${isSpent ? 'потрачена' : 'активна'})`}
                        >
                          <span
                            className={`w-3 h-3 rounded-full transition-all ${
                              isSpent ? 'bg-stone-700' : 'bg-white ring-2 ring-indigo-300'
                            }`}
                          />
                          <span>{isSpent ? 'Потрачен' : `Слот ${slotIdx + 1}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prepared Spells List Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider">
            Подготовленные заклинания ({preparedSpells.length})
          </h3>
        </div>

        <button
          onClick={() => setIsAddSpellOpen(true)}
          className="min-h-[44px] px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить</span>
        </button>
      </div>

      {/* Spells List */}
      <div className="space-y-2">
        {preparedSpells.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 text-center text-stone-400 text-sm">
            Список заклинаний пуст. Нажмите «Добавить», чтобы занести заговор или заклинание.
          </div>
        ) : (
          preparedSpells.map((spell, idx) => (
            <div
              key={spell.id || idx}
              onClick={() => handleInspectSpell(spell)}
              className="bg-stone-900 hover:bg-stone-850 active:scale-[0.99] border border-stone-800 rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all touch-manipulation"
            >
              <div className="flex items-center gap-3">
                {/* Prepared checkbox toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePrepared(idx);
                  }}
                  className={`min-w-[44px] min-h-[44px] rounded-lg border flex items-center justify-center transition-all ${
                    spell.prepared !== false
                      ? 'bg-indigo-600 border-indigo-400 text-white'
                      : 'bg-stone-800 border-stone-700 text-stone-500'
                  }`}
                  aria-label="Переключить подготовку заклинания"
                >
                  <Check className="w-4 h-4" />
                </button>

                <div>
                  <h4 className="font-bold text-stone-100 text-sm">
                    {spell.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                    <span className="text-indigo-400 font-medium">
                      {spell.level === 0 ? 'Заговор' : `${spell.level}-й круг`}
                    </span>
                    {spell.school && <span>• {spell.school}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleDeleteSpell(idx, e)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:text-red-400 hover:bg-stone-800 active:scale-95 transition-colors"
                  aria-label="Удалить заклинание"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Spell Modal */}
      {isAddSpellOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-stone-900 border-t sm:border border-stone-700 sm:rounded-2xl rounded-t-2xl shadow-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-bold text-stone-100 text-base">
                Добавить заклинание
              </h3>
              <button
                onClick={() => setIsAddSpellOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">
                  Название заклинания
                </label>
                <input
                  type="text"
                  value={newSpellName}
                  onChange={(e) => setNewSpellName(e.target.value)}
                  placeholder="Например: Огненный шар, Щит"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">
                    Круг (0 = заговор)
                  </label>
                  <select
                    value={newSpellLevel}
                    onChange={(e) => setNewSpellLevel(parseInt(e.target.value, 10))}
                    className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={0}>0 (Заговор)</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}-й круг
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">
                    Школа магии
                  </label>
                  <input
                    type="text"
                    value={newSpellSchool}
                    onChange={(e) => setNewSpellSchool(e.target.value)}
                    placeholder="Воплощение"
                    className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleAddSpell}
                className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm shadow-md transition-all touch-manipulation mt-2"
              >
                Сохранить заклинание
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spell Details Modal */}
      {selectedSpellDetails && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-stone-900 border-t sm:border border-stone-700 sm:rounded-2xl rounded-t-2xl shadow-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-stone-800 pb-2">
              <div>
                <h3 className="font-bold text-stone-100 text-lg">
                  {selectedSpellDetails.name_ru}
                </h3>
                <div className="text-xs text-indigo-400 font-mono">
                  {selectedSpellDetails.name_en} • {selectedSpellDetails.level === 0 ? 'Заговор' : `${selectedSpellDetails.level} круг`}, {selectedSpellDetails.school_ru || selectedSpellDetails.school}
                </div>
              </div>
              <button
                onClick={() => setSelectedSpellDetails(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-stone-800 p-2 rounded-lg">
                <span className="text-stone-400">Время накладывания: </span>
                <span className="text-stone-200 font-semibold">{selectedSpellDetails.casting_time}</span>
              </div>
              <div className="bg-stone-800 p-2 rounded-lg">
                <span className="text-stone-400">Дистанция: </span>
                <span className="text-stone-200 font-semibold">{selectedSpellDetails.range}</span>
              </div>
              <div className="bg-stone-800 p-2 rounded-lg">
                <span className="text-stone-400">Длительность: </span>
                <span className="text-stone-200 font-semibold">{selectedSpellDetails.duration}</span>
              </div>
              <div className="bg-stone-800 p-2 rounded-lg">
                <span className="text-stone-400">Компоненты: </span>
                <span className="text-stone-200 font-semibold">
                  {[
                    selectedSpellDetails.components_v ? 'В' : null,
                    selectedSpellDetails.components_s ? 'С' : null,
                    selectedSpellDetails.components_m ? 'М' : null,
                  ].filter(Boolean).join(', ') || 'В, С'}
                </span>
              </div>
            </div>

            <div className="text-xs text-stone-300 leading-relaxed pt-2 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {selectedSpellDetails.description_ru}
            </div>

            <button
              onClick={() => setSelectedSpellDetails(null)}
              className="w-full min-h-[44px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
