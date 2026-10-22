
import clsx from 'clsx';
import { RotateCcw, Sparkles, X } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { ParsedSpell } from '../../../types/database';
import { cleanRussianText } from '../../../utils/textUtils';
import { useTranslation } from '../../../i18n';
import {
  SPELL_SCHOOL_RU,
  translateSpellCastingTime,
  translateSpellRange,
  translateSpellDuration,
} from './statblockUtils';

export interface StatblockSpellsProps {
  combatant: Combatant;
  spellSlotsData: Record<number, { max: number; used: number }> | null;
  onInspectSpell: (spellName: string) => void;
  onToggleSpellSlot: (level: number, slotIndex: number) => void;
  onRestoreAllSpellSlots: () => void;
}

export interface SpellDetailsModalProps {
  spell: ParsedSpell | null;
  onClose: () => void;
}

export function SpellDetailsModal({ spell, onClose }: SpellDetailsModalProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';

  if (!spell) return null;

  const spellTitle = isEn
    ? (spell.name_en || spell.name_ru)
    : cleanRussianText(spell.name_ru || spell.name_en);

  const schoolName = isEn
    ? (spell.school || spell.school_ru || 'Magic')
    : (spell.school_ru || SPELL_SCHOOL_RU[spell.school?.toLowerCase() || ''] || spell.school || 'Магия');

  const levelText = isEn
    ? (spell.level === 0 ? `Cantrip, ${schoolName}` : `Level ${spell.level}, ${schoolName}`)
    : (spell.level === 0 ? `Заговор, ${schoolName}` : `${spell.level} круг, ${schoolName}`);

  const castingTimeText = isEn
    ? spell.casting_time
    : cleanRussianText(translateSpellCastingTime(spell.casting_time));

  const rangeText = isEn
    ? spell.range
    : cleanRussianText(translateSpellRange(spell.range));

  const componentsText = isEn
    ? [
        spell.components_v ? 'V' : null,
        spell.components_s ? 'S' : null,
        spell.components_m ? 'M' : null,
      ].filter(Boolean).join(', ') || 'V, S'
    : [
        spell.components_v ? 'В' : null,
        spell.components_s ? 'С' : null,
        spell.components_m ? 'М' : null,
      ].filter(Boolean).join(', ') || 'В, С';

  const materialsText = spell.materials_ru ? ` (${spell.materials_ru})` : '';

  const durationText = isEn
    ? spell.duration
    : cleanRussianText(translateSpellDuration(spell.duration));

  const descriptionText = isEn
    ? (spell.description_en || spell.description_ru || '')
    : cleanRussianText(spell.description_ru || spell.description_en || '');

  const higherLevelsText = cleanRussianText(spell.higher_levels_ru || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-[rgba(18,22,30,0.92)] backdrop-blur-xl border border-gold/60 rounded-glass-lg p-5 shadow-glass space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{spellTitle}</span>
              {isEn && spell.name_ru && spell.name_ru !== spell.name_en && (
                <span className="text-xs text-gray-400 font-normal italic">
                  ({cleanRussianText(spell.name_ru)})
                </span>
              )}
              {!isEn && spell.name_en && (
                <span className="text-xs text-gray-400 font-normal italic">
                  ({spell.name_en})
                </span>
              )}
            </h3>
            <p className="text-xs text-purple-300 font-medium mt-0.5">
              {levelText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-gray-400 hover:text-white rounded-glass-sm hover:bg-white/10 transition-colors cursor-pointer"
            title={isEn ? "Close spell details" : "Закрыть описание заклинания"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spell Metadata Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs bg-black/40 p-3 rounded-glass-sm border border-white/10">
          <div>
            <span className="text-gray-400 text-xs block">{isEn ? 'Casting Time:' : 'Время накладывания:'}</span>
            <span className="font-bold text-gray-200">
              {castingTimeText}
            </span>
          </div>
          <div>
            <span className="text-gray-400 text-xs block">{isEn ? 'Range:' : 'Дистанция:'}</span>
            <span className="font-bold text-gray-200">
              {rangeText}
            </span>
          </div>
          <div>
            <span className="text-gray-400 text-xs block">{isEn ? 'Components:' : 'Компоненты:'}</span>
            <span className="font-bold text-gray-200">
              {componentsText}{materialsText}
            </span>
          </div>
          <div>
            <span className="text-gray-400 text-xs block">{isEn ? 'Duration:' : 'Длительность:'}</span>
            <span className="font-bold text-gray-200 flex items-center gap-1">
              {spell.concentration && (
                <span className="text-blue-400 text-xs font-semibold">{isEn ? 'Conc., ' : 'Конц., '}</span>
              )}
              {durationText}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="text-xs text-gray-300 leading-relaxed font-sans space-y-2 whitespace-pre-wrap">
          <p>{descriptionText}</p>
          {higherLevelsText && (
            <div className="p-2.5 rounded-glass-sm bg-black/40 border border-gold/30 text-xs text-gold-light">
              <strong className="font-bold">{isEn ? 'At Higher Levels: ' : 'На более высоких кругах: '}</strong>
              <span>{higherLevelsText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatblockSpells({
  combatant,
  spellSlotsData,
  onInspectSpell,
  onToggleSpellSlot,
  onRestoreAllSpellSlots,
}: StatblockSpellsProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';
  const sb = combatant.statblock;

  return (
    <>
      {/* Creature Spells Section */}
      {sb?.spells && sb.spells.length > 0 && (
        <div className="rounded-glass-lg bg-purple-950/25 backdrop-blur-md border border-purple-500/30 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-purple-500/20 text-xs font-bold uppercase tracking-wider text-purple-200">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>{isEn ? 'CREATURE SPELLS' : 'ЗАКЛИНАНИЯ СУЩЕСТВА'}</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sb.spells.map((sItem: any, idx: number) => {
              const spName = typeof sItem === 'string'
                ? sItem
                : isEn
                ? (sItem.name_en || sItem.name || sItem.name_ru || 'Spell')
                : (sItem.name_ru || sItem.name || 'Заклинание');
              const displaySpellName = isEn ? spName : cleanRussianText(spName);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onInspectSpell(spName)}
                  className="min-h-[32px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-glass-sm bg-purple-950/60 border border-purple-500/50 hover:border-gold hover:text-gold text-purple-200 text-xs font-semibold transition-all shadow-sm cursor-pointer select-none active:scale-95"
                  title={isEn ? `Spell: ${displaySpellName} • Click to view details` : `Заклинание: ${displaySpellName} • Кликните для просмотра описания`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>{displaySpellName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Spell Slots Section with Glowing Crystals */}
      {spellSlotsData && Object.keys(spellSlotsData).length > 0 && (
        <div className="rounded-glass-lg bg-purple-950/30 backdrop-blur-md border border-purple-500/40 p-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-purple-500/20 text-xs">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-purple-100">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>{isEn ? 'SPELL SLOTS' : 'ЯЧЕЙКИ ЗАКЛИНАНИЙ'}</span>
              <Sparkles className="h-4 w-4 text-purple-400" />
            </span>
            <button
              type="button"
              onClick={onRestoreAllSpellSlots}
              title={isEn ? "Restore all spell slots (Long Rest)" : "Восстановить все ячейки заклинаний (Долгий отдых)"}
              className="min-h-[32px] text-xs font-mono tabular-nums font-bold px-2.5 py-1 rounded-glass-sm bg-purple-900/60 hover:bg-purple-800 border border-purple-400/60 text-purple-100 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{isEn ? "Reset" : "Сброс"}</span>
            </button>
          </div>

          <div className="space-y-2">
            {Object.entries(spellSlotsData).map(([lvlStr, slotData]) => {
              const lvlNum = Number(lvlStr);
              const remaining = slotData.max - slotData.used;
              return (
                <div
                  key={lvlNum}
                  className="flex items-center justify-between gap-2 p-2 rounded-glass-sm bg-black/40 border border-purple-500/20 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-xs text-purple-300 whitespace-nowrap">
                      {isEn ? `Level ${lvlNum}` : `${lvlNum} круг`}
                    </span>
                    <span className="font-mono tabular-nums text-xs text-gray-400">
                      ({remaining}/{slotData.max})
                    </span>
                  </div>

                  {/* Glowing Crystal / Mana Orbs */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.from({ length: slotData.max }).map((_, slotIdx) => {
                      const isUsed = slotIdx < slotData.used;
                      return (
                        <button
                          key={slotIdx}
                          type="button"
                          onClick={() => onToggleSpellSlot(lvlNum, slotIdx)}
                          title={
                            isUsed
                              ? (isEn
                                  ? `Level ${lvlNum} slot expended (click to restore)`
                                  : `Ячейка ${lvlNum} круга израсходована (клик, чтобы восстановить)`)
                              : (isEn
                                  ? `Level ${lvlNum} slot ready (click to expend)`
                                  : `Ячейка ${lvlNum} круга готова (клик, чтобы потратить)`)
                          }
                          className={clsx(
                            "w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 select-none",
                            isUsed
                              ? "bg-black/60 border border-white/10 text-gray-600 scale-90 opacity-60 hover:opacity-90 hover:border-gray-500"
                              : "bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-400 border border-cyan-200 text-white shadow-[0_0_12px_rgba(168,85,247,0.7)] scale-100 hover:scale-110"
                          )}
                        >
                          {isUsed ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                          ) : (
                            <Sparkles className="h-3 w-3 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
