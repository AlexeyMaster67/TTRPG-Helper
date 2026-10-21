import { useState, useMemo } from 'react';
import { usePartyStore } from '../../store/partyStore';
import { useTokenForgeStore } from '../../store/tokenForgeStore';
import { SPECIES_2024_DATA, Species2024, SpeciesLineage } from '../../data/species2024Data';
import { CLASSES_2024_DATA, Class2024 } from '../../data/classes2024Data';
import { BACKGROUNDS_2024_DATA, Background2024 } from '../../data/backgrounds2024Data';
import { ARMOR_2024_DATA, WEAPONS_2024_DATA } from '../../data/equipment2024Data';
import {
  CharacterStats,
  DND_SKILLS_RU,
  CharacterWeapon,
  EquipmentItem,
  PartyMember,
} from '../../types/party';
import {
  calculateAbilityModifier,
  formatModifier,
  calculateProficiencyBonus,
  calculatePointBuy,
  calculateArmorClass,
  calculateHitPoints,
  calculatePassivePerception,
  calculateSpellSlots,
  calculateSpellSaveDc,
  calculateSpellAttackBonus,
} from '../../utils/characterCalculations';
import { rollDie } from '../../engine/rolls';
import {
  User,
  Shield,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Dices,
  Info,
  FileDown,
} from 'lucide-react';
import { downloadTtrpghFile } from '../../services/ttrpghFormat';

const STAT_NAMES_RU: Record<keyof CharacterStats, string> = {
  str: 'СИЛА (STR)',
  dex: 'ЛОВКОСТЬ (DEX)',
  con: 'ТЕЛОСЛОЖЕНИЕ (CON)',
  int: 'ИНТЕЛЛЕКТ (INT)',
  wis: 'МУДРОСТЬ (WIS)',
  cha: 'ХАРИЗМА (CHA)',
};

export function CharacterBuilderModal() {
  const { isCharacterBuilderOpen, closeCharacterBuilder, addMember, showToast } = usePartyStore();
  const { openForge, savedTokens } = useTokenForgeStore();

  const [step, setStep] = useState<number>(1);

  // Step 1: Basic Info
  const [name, setName] = useState<string>('');
  const [level, setLevel] = useState<number>(1);
  const [selectedClassId, setSelectedClassId] = useState<string>('fighter');
  const [selectedSubclassId, setSelectedSubclassId] = useState<string>('');

  // Step 2: Species
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('human');
  const [selectedLineageId, setSelectedLineageId] = useState<string>('');
  const [hexbloodAncestralSpeciesId, setHexbloodAncestralSpeciesId] = useState<string>('');

  // Step 3: Background & Bonuses
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string>('soldier');
  const [bonusPlusTwo, setBonusPlusTwo] = useState<keyof CharacterStats>('str');
  const [bonusPlusOne, setBonusPlusOne] = useState<keyof CharacterStats>('con');

  // Step 4: Ability Scores
  const [statMethod, setStatMethod] = useState<'point_buy' | 'standard_array' | 'roll_4d6' | 'manual'>('point_buy');
  const [baseStats, setBaseStats] = useState<CharacterStats>({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });

  // Step 5: Skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Step 6: Equipment
  const [selectedArmorId, setSelectedArmorId] = useState<string>('chain_mail');
  const [hasShield, setHasShield] = useState<boolean>(true);
  const [selectedWeaponIds, setSelectedWeaponIds] = useState<string[]>(['longsword']);

  // Step 7: Avatar
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Current selections data
  const currentClass: Class2024 = useMemo(
    () => CLASSES_2024_DATA.find((c) => c.id === selectedClassId) || CLASSES_2024_DATA[0],
    [selectedClassId]
  );

  const currentSpecies: Species2024 = useMemo(
    () => SPECIES_2024_DATA.find((s) => s.id === selectedSpeciesId) || SPECIES_2024_DATA[0],
    [selectedSpeciesId]
  );

  const currentLineage: SpeciesLineage | undefined = useMemo(() => {
    return currentSpecies.lineages?.find((l) => l.id === selectedLineageId);
  }, [currentSpecies, selectedLineageId]);

  const currentBackground: Background2024 = useMemo(
    () => BACKGROUNDS_2024_DATA.find((b) => b.id === selectedBackgroundId) || BACKGROUNDS_2024_DATA[0],
    [selectedBackgroundId]
  );

  // Compute final stats with background bonuses
  const finalStats: CharacterStats = useMemo(() => {
    const res: CharacterStats = { ...baseStats };
    res[bonusPlusTwo] = (res[bonusPlusTwo] || 10) + 2;
    res[bonusPlusOne] = (res[bonusPlusOne] || 10) + 1;
    return res;
  }, [baseStats, bonusPlusTwo, bonusPlusOne]);

  // Derived modifiers
  const pb = useMemo(() => calculateProficiencyBonus(level), [level]);
  const strMod = useMemo(() => calculateAbilityModifier(finalStats.str), [finalStats.str]);
  const dexMod = useMemo(() => calculateAbilityModifier(finalStats.dex), [finalStats.dex]);
  const conMod = useMemo(() => calculateAbilityModifier(finalStats.con), [finalStats.con]);
  const wisMod = useMemo(() => calculateAbilityModifier(finalStats.wis), [finalStats.wis]);

  // Selected armor data
  const currentArmor = useMemo(
    () => ARMOR_2024_DATA.find((a) => a.id === selectedArmorId) || ARMOR_2024_DATA[0],
    [selectedArmorId]
  );

  // Warforged AC bonus
  const isWarforged = currentSpecies.id === 'warforged';
  const isDwarf = currentSpecies.id === 'dwarf';
  const isBeasthide = currentSpecies.id === 'shifter' && selectedLineageId === 'beasthide';

  // Final AC
  const finalAc = useMemo(() => {
    return calculateArmorClass({
      armorType: currentArmor.category,
      baseArmorAc: currentArmor.baseAc,
      dexMod,
      hasShield,
      characterClass: currentClass.nameRu,
      conMod,
      wisMod,
      isWarforged,
      isBeasthideShifted: isBeasthide,
    });
  }, [currentArmor, dexMod, hasShield, currentClass, conMod, wisMod, isWarforged, isBeasthide]);

  // Final HP
  const finalHp = useMemo(() => {
    return calculateHitPoints({
      hitDieValue: currentClass.hitDieValue,
      level,
      conMod,
      isDwarf,
      rollMethod: 'average',
    });
  }, [currentClass.hitDieValue, level, conMod, isDwarf]);

  // Speed
  const effectiveSpeed = useMemo(() => {
    let spd = currentSpecies.speed;
    if (currentLineage?.speedBonus) {
      spd += currentLineage.speedBonus;
    }
    if (selectedSpeciesId === 'hexblood' && hexbloodAncestralSpeciesId) {
      const ancestor = SPECIES_2024_DATA.find((s) => s.id === hexbloodAncestralSpeciesId);
      if (ancestor && ancestor.speed > spd) {
        spd = ancestor.speed;
      }
    }
    return `${spd} фт.`;
  }, [currentSpecies, currentLineage, selectedSpeciesId, hexbloodAncestralSpeciesId]);

  // Darkvision
  const effectiveDarkvision = useMemo(() => {
    let dv = currentSpecies.darkvision;
    if (currentLineage?.darkvision && currentLineage.darkvision > dv) {
      dv = currentLineage.darkvision;
    }
    return dv;
  }, [currentSpecies, currentLineage]);

  // Passive perception
  const isPerceptionProficient = selectedSkills.includes('Perception') || currentSpecies.defaultSkills?.includes('Perception');
  const passivePerception = useMemo(() => {
    return calculatePassivePerception(wisMod, pb, isPerceptionProficient ? 'proficient' : undefined);
  }, [wisMod, pb, isPerceptionProficient]);

  // Spell slots
  const spellSlots = useMemo(() => {
    return calculateSpellSlots(currentClass.casterType, level);
  }, [currentClass.casterType, level]);

  // Spell stats
  const spellAbility = currentClass.spellcastingAbility || 'cha';
  const spellMod = calculateAbilityModifier(finalStats[spellAbility]);
  const spellAttackBonus = calculateSpellAttackBonus(pb, spellMod);
  const spellSaveDc = calculateSpellSaveDc(pb, spellMod);

  // Point Buy stats
  const pointBuyValidation = useMemo(() => {
    return calculatePointBuy(baseStats);
  }, [baseStats]);

  // Handlers for stats
  const handleStatChange = (key: keyof CharacterStats, delta: number) => {
    setBaseStats((prev) => {
      const current = prev[key];
      const next = Math.max(8, Math.min(15, current + delta));
      return { ...prev, [key]: next };
    });
  };

  const handleRoll4d6 = () => {
    const rollStat = () => {
      const rolls = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)];
      rolls.sort((a, b) => a - b);
      return rolls[1] + rolls[2] + rolls[3];
    };
    setBaseStats({
      str: rollStat(),
      dex: rollStat(),
      con: rollStat(),
      int: rollStat(),
      wis: rollStat(),
      cha: rollStat(),
    });
  };

  const handleApplyStandardArray = () => {
    setBaseStats({
      str: 15,
      dex: 14,
      con: 13,
      int: 12,
      wis: 10,
      cha: 8,
    });
  };

  // Toggle skills
  const handleToggleSkill = (skillKey: string) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skillKey)) {
        return prev.filter((s) => s !== skillKey);
      }
      return [...prev, skillKey];
    });
  };

  // Toggle weapons
  const handleToggleWeapon = (weaponId: string) => {
    setSelectedWeaponIds((prev) => {
      if (prev.includes(weaponId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== weaponId);
      }
      return [...prev, weaponId];
    });
  };

  // Step navigation validation
  const canProceed = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 3) return bonusPlusTwo !== bonusPlusOne;
    if (step === 4 && statMethod === 'point_buy') return pointBuyValidation.isValid;
    return true;
  };

  // Build current character member data
  const buildCurrentMember = (): Omit<PartyMember, 'id'> => {

    // Build skill proficiencies
    const skillProficiencies: Record<string, 'proficient'> = {};
    selectedSkills.forEach((sk) => {
      skillProficiencies[sk] = 'proficient';
    });
    currentSpecies.defaultSkills?.forEach((sk) => {
      skillProficiencies[sk] = 'proficient';
    });
    currentBackground.skills.forEach((sk) => {
      skillProficiencies[sk] = 'proficient';
    });

    // Build weapons
    const weaponsList: CharacterWeapon[] = selectedWeaponIds.map((wid, idx) => {
      const wData = WEAPONS_2024_DATA.find((w) => w.id === wid) || WEAPONS_2024_DATA[0];
      const isFinesse = wData.properties.some((p) => p.includes('Фехтовальное'));
      const isRanged = wData.properties.some((p) => p.includes('Боеприпас'));
      const attackStatMod = isRanged || (isFinesse && dexMod > strMod) ? dexMod : strMod;
      const totalAttackBonus = attackStatMod + pb;
      const damageBonus = attackStatMod >= 0 ? `+${attackStatMod}` : `${attackStatMod}`;

      return {
        id: `w-${Date.now()}-${idx}`,
        name: wData.nameRu,
        attackBonus: formatModifier(totalAttackBonus),
        damage: `${wData.damage}${damageBonus}`,
        damageType: wData.damageType,
        mastery: wData.mastery,
        notes: wData.properties.join(', '),
      };
    });

    // Build equipment
    const equipmentList: EquipmentItem[] = [
      {
        id: `eq-${Date.now()}-1`,
        name: currentArmor.nameRu,
        quantity: 1,
        notes: `КД ${currentArmor.baseAc}`,
      },
    ];

    if (hasShield) {
      equipmentList.push({
        id: `eq-${Date.now()}-2`,
        name: 'Щит',
        quantity: 1,
        notes: '+2 КД',
      });
    }

    // Build notes with traits
    const notesParts: string[] = [
      `Вид: ${currentSpecies.nameRu}${currentLineage ? ` (${currentLineage.nameRu})` : ''}`,
      `Предыстория: ${currentBackground.nameRu} (Черта: ${currentBackground.featNameRu})`,
      effectiveDarkvision > 0 ? `Тёмное зрение: ${effectiveDarkvision} фт.` : 'Без тёмного зрения',
      `Скорость: ${effectiveSpeed}`,
    ];

    if (currentSpecies.resistances && currentSpecies.resistances.length > 0) {
      notesParts.push(`Сопротивления: ${currentSpecies.resistances.join(', ')}`);
    }

    currentSpecies.traits.forEach((t) => {
      notesParts.push(`${t.nameRu}: ${t.descriptionRu}`);
    });

    return {
      name: name.trim(),
      characterClass: `${currentClass.nameRu}${selectedSubclassId ? ` (${currentClass.subclasses?.find((s) => s.id === selectedSubclassId)?.nameRu})` : ''}`,
      species: currentSpecies.nameRu,
      level,
      ac: finalAc,
      maxHp: finalHp,
      currentHp: finalHp,
      tempHp: 0,
      initBonus: dexMod,
      passivePerception,
      speed: effectiveSpeed,
      color: '#3B82F6',
      avatarUrl: avatarUrl || undefined,
      inspiration: currentSpecies.id === 'human',
      proficiencyBonus: pb,
      hitDiceMax: level,
      hitDiceCurrent: level,
      hitDiceType: currentClass.hitDie,
      exhaustion: 0,
      stats: finalStats,
      savingThrowProficiencies: currentClass.savingThrows,
      skillProficiencies,
      spellcastingAbility: currentClass.casterType !== 'none' ? spellAbility : undefined,
      spellAttackBonus: currentClass.casterType !== 'none' ? spellAttackBonus : undefined,
      spellSaveDc: currentClass.casterType !== 'none' ? spellSaveDc : undefined,
      spellSlots: currentClass.casterType !== 'none' ? spellSlots : undefined,
      weapons: weaponsList,
      equipment: equipmentList,
      notes: notesParts.join('\n\n'),
    };
  };

  const handleCreateCharacter = () => {
    const newMember = buildCurrentMember();
    addMember(newMember);
    showToast(`Персонаж ${name.trim()} успешно создан и добавлен в отряд.`);
    closeCharacterBuilder();
  };

  const handleExportDirectTtrpgh = () => {
    const newMember = buildCurrentMember();
    const fullMember: PartyMember = {
      ...newMember,
      id: `temp-${Date.now()}`,
    };
    downloadTtrpghFile(fullMember, avatarUrl || undefined);
    showToast(`Персонаж ${name.trim()} экспортирован в .ttrpgh!`);
  };

  if (!isCharacterBuilderOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-glass-xl border border-gold/50 bg-[#12161f] shadow-glass-panel overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2d3844] bg-[#161c26]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gold/15 text-gold border border-gold/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Конструктор персонажа D&D 2024
              </h2>
              <p className="text-[11px] text-gray-400">
                Шаг {step} из 7: {
                  step === 1 ? 'Имя, класс и уровень' :
                  step === 2 ? 'Вид персонажа (19 видов)' :
                  step === 3 ? 'Предыстория и бонусы' :
                  step === 4 ? 'Распределение характеристик' :
                  step === 5 ? 'Навыки и владения' :
                  step === 6 ? 'Снаряжение и расчёт параметров' :
                  'Аватарка и подтверждение'
                }
              </p>
            </div>
          </div>
          <button
            onClick={closeCharacterBuilder}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Закрыть конструктор"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#0f131a] border-b border-[#252f3a] text-xs font-mono overflow-x-auto no-scrollbar gap-2">
          {[
            { s: 1, label: '1. Класс' },
            { s: 2, label: '2. Вид' },
            { s: 3, label: '3. Предыстория' },
            { s: 4, label: '4. Характеристики' },
            { s: 5, label: '5. Навыки' },
            { s: 6, label: '6. Снаряжение' },
            { s: 7, label: '7. Финал' },
          ].map((item) => (
            <button
              key={item.s}
              onClick={() => {
                if (item.s < step || canProceed()) {
                  setStep(item.s);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                step === item.s
                  ? 'bg-gold/20 text-gold-light border border-gold/60 font-bold'
                  : item.s < step
                  ? 'text-emerald-400 hover:bg-emerald-950/30'
                  : 'text-gray-500 opacity-60'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                item.s < step ? 'bg-emerald-500 text-black font-bold' : step === item.s ? 'bg-gold text-black font-bold' : 'bg-gray-800 text-gray-400'
              }`}>
                {item.s < step ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : item.s}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Main Step Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* STEP 1: ИМЯ, КЛАСС, УРОВЕНЬ */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 block">
                    Имя персонажа <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например: Варис, Брунхильда, Сильван..."
                    className="w-full bg-[#171d26] border border-[#2d3844] focus:border-gold rounded-lg px-3 py-2 text-sm text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 block">Уровень (1–20)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLevel((l) => Math.max(1, l - 1))}
                      className="w-8 h-8 rounded-lg bg-[#1f2733] hover:bg-[#2a3545] text-white font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={level}
                      onChange={(e) => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
                      className="w-16 text-center font-mono font-bold bg-[#171d26] border border-[#2d3844] rounded-lg py-1.5 text-sm text-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setLevel((l) => Math.min(20, l + 1))}
                      className="w-8 h-8 rounded-lg bg-[#1f2733] hover:bg-[#2a3545] text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 12 Classes Grid */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-gray-300 block">
                  Выберите класс (12 классов D&D 2024)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {CLASSES_2024_DATA.map((cls) => {
                    const isSelected = cls.id === selectedClassId;
                    return (
                      <div
                        key={cls.id}
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setSelectedSubclassId('');
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gold/15 border-gold shadow-[0_0_12px_rgba(245,185,32,0.25)]'
                            : 'bg-[#161c25] border-[#293442] hover:border-gray-500'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{cls.nameRu}</span>
                            <span className="text-[10px] font-mono text-gold px-1.5 py-0.5 rounded bg-surface border border-border-subtle">
                              {cls.hitDie}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{cls.nameEn}</span>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-400 font-mono">
                          Спасы: {cls.savingThrows.map((s) => s.toUpperCase()).join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subclasses Selection if available */}
              {currentClass.subclasses && currentClass.subclasses.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#161c25] border border-[#2a3644] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">
                      Подкласс / Архетип (активен с 3 уровня)
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {level < 3 ? 'Предварительный выбор' : 'Определяет классовые черты'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentClass.subclasses.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubclassId(sub.id === selectedSubclassId ? '' : sub.id)}
                        className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                          sub.id === selectedSubclassId
                            ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                            : 'bg-[#12161e] border-border-subtle text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="font-bold">{sub.nameRu}</div>
                        <p className="text-[10px] text-gray-400 mt-1 leading-snug">{sub.descriptionRu}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ВЫБОР ВИДА (19 ВИДОВ) */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300">
                  Выберите вид персонажа (Каноничные 19 видов D&D 2024 и дополнений)
                </span>
                <span className="text-[11px] font-mono text-gold-light">
                  Выбран: {currentSpecies.nameRu} ({currentSpecies.nameEn})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 border border-border-subtle rounded-lg bg-[#10141a]">
                {SPECIES_2024_DATA.map((sp) => {
                  const isSelected = sp.id === selectedSpeciesId;
                  return (
                    <div
                      key={sp.id}
                      onClick={() => {
                        setSelectedSpeciesId(sp.id);
                        setSelectedLineageId(sp.lineages?.[0]?.id || '');
                      }}
                      className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-gold/15 border-gold shadow-[0_0_10px_rgba(245,185,32,0.25)]'
                          : 'bg-[#151a23] border-[#26313e] hover:border-gray-500'
                      }`}
                    >
                      <div className="text-xs font-bold text-white truncate">{sp.nameRu}</div>
                      <div className="text-[10px] text-gray-400 truncate">{sp.nameEn}</div>
                      <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-gray-400">
                        <span>{sp.speed} фт.</span>
                        {sp.darkvision > 0 && <span>ТЗ {sp.darkvision} фт.</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Species Details Box */}
              <div className="p-4 rounded-lg bg-[#161c25] border border-[#2b3746] space-y-3">
                <div className="flex items-start justify-between border-b border-border-subtle pb-2 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{currentSpecies.nameRu}</span>
                      <span className="text-xs text-gray-400 font-normal">({currentSpecies.nameEn})</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-gold/30 text-gold font-mono">
                        [{currentSpecies.source}]
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Тип: {currentSpecies.creatureType} • Размер: {currentSpecies.sizeRu} • Скорость: {currentSpecies.speed} фт.
                      {currentSpecies.darkvision > 0 ? ` • Тёмное зрение: ${currentSpecies.darkvision} фт.` : ''}
                    </p>
                  </div>
                </div>

                {/* Lineages / Subraces if available */}
                {currentSpecies.lineages && currentSpecies.lineages.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold-light block">
                      Родословная / Наследие {currentSpecies.nameRu}:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentSpecies.lineages.map((lin) => {
                        const isLinSelected = lin.id === selectedLineageId;
                        return (
                          <div
                            key={lin.id}
                            onClick={() => setSelectedLineageId(lin.id)}
                            className={`p-2 rounded border text-xs cursor-pointer transition-all ${
                              isLinSelected
                                ? 'bg-amber-500/15 border-gold text-gold-light'
                                : 'bg-[#12161f] border-border-subtle text-gray-300 hover:border-gray-500'
                            }`}
                          >
                            <div className="font-bold">{lin.nameRu}</div>
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{lin.descriptionRu}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Hexblood Ancestral Legacy Selector */}
                {selectedSpeciesId === 'hexblood' && (
                  <div className="p-3 rounded bg-purple-950/30 border border-purple-700/60 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                      <Info className="w-4 h-4" />
                      <span>Особое правило Ведьмовской крови: Наследие предков</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-snug">
                      Ведьмовская кровь перерождается из исходного вида, сохраняя скорость лазания, полёта или плавания и навыки предков. Выберите исходный вид (или сохраните 2 свободных навыка):
                    </p>
                    <select
                      value={hexbloodAncestralSpeciesId}
                      onChange={(e) => setHexbloodAncestralSpeciesId(e.target.value)}
                      className="w-full bg-[#12161f] border border-border-subtle rounded px-2.5 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="">Без исходного вида (2 навыка на выбор)</option>
                      {SPECIES_2024_DATA.filter((s) => s.id !== 'hexblood').map((s) => (
                        <option key={s.id} value={s.id}>
                          Предок: {s.nameRu} ({s.speed} фт.)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Traits List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    Видовые черты и особенности:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentSpecies.traits.map((tr, idx) => (
                      <div key={idx} className="p-2 rounded bg-[#11151c] border border-border-subtle text-xs">
                        <div className="font-bold text-gray-200">
                          {tr.nameRu} {tr.levelRequired ? `(с ${tr.levelRequired} ур.)` : ''}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{tr.descriptionRu}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ПРЕДЫСТОРИЯ И БОНУСЫ ХАРАКТЕРИСТИК */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">
                  Выберите предысторию персонажа
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {BACKGROUNDS_2024_DATA.map((bg) => {
                    const isSelected = bg.id === selectedBackgroundId;
                    return (
                      <div
                        key={bg.id}
                        onClick={() => setSelectedBackgroundId(bg.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-gold/15 border-gold shadow-[0_0_10px_rgba(245,185,32,0.25)]'
                            : 'bg-[#151a23] border-[#283341] hover:border-gray-500'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{bg.nameRu}</div>
                        <div className="text-[10px] text-gold-light mt-0.5 font-mono truncate">{bg.featNameRu}</div>
                        <div className="text-[10px] text-gray-400 mt-1 line-clamp-2">{bg.descriptionRu}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bonus distribution (+2 and +1) */}
              <div className="p-4 rounded-lg bg-[#161c25] border border-[#2b3746] space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Бонусы характеристик от предыстории (+2 и +1)
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    По правилам D&D 2024 персонаж получает бонус +2 к одной характеристике и +1 к другой.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gold-light block">Бонус +2 к характеристике:</label>
                    <select
                      value={bonusPlusTwo}
                      onChange={(e) => setBonusPlusTwo(e.target.value as keyof CharacterStats)}
                      className="w-full bg-[#11151c] border border-border-subtle rounded px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                    >
                      {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as Array<keyof CharacterStats>).map((st) => (
                        <option key={st} value={st}>
                          {STAT_NAMES_RU[st]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyan-400 block">Бонус +1 к характеристике:</label>
                    <select
                      value={bonusPlusOne}
                      onChange={(e) => setBonusPlusOne(e.target.value as keyof CharacterStats)}
                      className="w-full bg-[#11151c] border border-border-subtle rounded px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                    >
                      {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as Array<keyof CharacterStats>).map((st) => (
                        <option key={st} value={st} disabled={st === bonusPlusTwo}>
                          {STAT_NAMES_RU[st]} {st === bonusPlusTwo ? '(уже выбран +2)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {bonusPlusTwo === bonusPlusOne && (
                  <div className="text-xs text-red-400 font-bold bg-red-950/30 p-2 rounded border border-red-800">
                    Бонусы +2 и +1 не могут быть назначены на одну и ту же характеристику!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: РАСПРЕДЕЛЕНИЕ ХАРАКТЕРИСТИК */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Method Switcher */}
              <div className="flex items-center justify-between border-b border-[#2d3844] pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatMethod('point_buy')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      statMethod === 'point_buy'
                        ? 'bg-gold text-canvas shadow-gold-glow'
                        : 'bg-[#18202b] text-gray-300 hover:text-white'
                    }`}
                  >
                    Point Buy (27 очков)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatMethod('standard_array');
                      handleApplyStandardArray();
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      statMethod === 'standard_array'
                        ? 'bg-gold text-canvas shadow-gold-glow'
                        : 'bg-[#18202b] text-gray-300 hover:text-white'
                    }`}
                  >
                    Стандартный набор
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatMethod('roll_4d6');
                      handleRoll4d6();
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      statMethod === 'roll_4d6'
                        ? 'bg-gold text-canvas shadow-gold-glow'
                        : 'bg-[#18202b] text-gray-300 hover:text-white'
                    }`}
                  >
                    Бросок 4d6
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatMethod('manual')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      statMethod === 'manual'
                        ? 'bg-gold text-canvas shadow-gold-glow'
                        : 'bg-[#18202b] text-gray-300 hover:text-white'
                    }`}
                  >
                    Вручную
                  </button>
                </div>

                {statMethod === 'point_buy' && (
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-gray-400">Осталось очков:</span>
                    <span className={`px-2 py-0.5 rounded font-black ${
                      pointBuyValidation.remainingPoints === 0
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : pointBuyValidation.remainingPoints < 0
                        ? 'bg-red-950 text-red-300 border border-red-600'
                        : 'bg-gold/20 text-gold-light border border-gold/40'
                    }`}>
                      {pointBuyValidation.remainingPoints} / 27
                    </span>
                  </div>
                )}

                {statMethod === 'roll_4d6' && (
                  <button
                    type="button"
                    onClick={handleRoll4d6}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#202936] hover:bg-[#2c3748] text-xs font-bold text-gold"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Перебросить все</span>
                  </button>
                )}
              </div>

              {/* 6 Stats Controls Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as Array<keyof CharacterStats>).map((k) => {
                  const baseVal = baseStats[k];
                  const bonus = k === bonusPlusTwo ? 2 : k === bonusPlusOne ? 1 : 0;
                  const finalVal = baseVal + bonus;
                  const mod = calculateAbilityModifier(finalVal);

                  return (
                    <div
                      key={k}
                      className="p-3 rounded-lg bg-[#151b24] border border-[#2a3644] flex flex-col items-center justify-between shadow-sm space-y-2"
                    >
                      <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                        {k.toUpperCase()}
                      </span>

                      {/* Final Big Mod & Score */}
                      <div className="text-center my-0.5">
                        <div className="font-mono text-2xl font-black text-white">
                          {formatModifier(mod)}
                        </div>
                        <div className="text-xs font-mono font-bold text-gold-light">
                          Итог: {finalVal}
                        </div>
                        {bonus > 0 && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            (+{bonus} фон)
                          </span>
                        )}
                      </div>

                      {/* Interactive Point Buy / Stepper Buttons */}
                      {statMethod === 'point_buy' ? (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleStatChange(k, -1)}
                            disabled={baseVal <= 8}
                            className="w-6 h-6 rounded bg-[#202a37] hover:bg-surface text-gray-300 hover:text-white font-bold text-xs flex items-center justify-center disabled:opacity-30"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs font-bold text-gray-200 w-5 text-center">
                            {baseVal}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStatChange(k, 1)}
                            disabled={baseVal >= 15 || pointBuyValidation.remainingPoints <= 0}
                            className="w-6 h-6 rounded bg-[#202a37] hover:bg-surface text-gray-300 hover:text-white font-bold text-xs flex items-center justify-center disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={baseVal}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 10;
                            setBaseStats((prev) => ({ ...prev, [k]: val }));
                          }}
                          className="w-14 text-center font-mono font-bold bg-[#10141a] border border-border-subtle rounded py-1 text-xs text-white"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {statMethod === 'point_buy' && pointBuyValidation.errors.length > 0 && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-700 text-xs text-red-200">
                  {pointBuyValidation.errors.join(' ')}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: НАВЫКИ И ВЛАДЕНИЯ */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-bold text-gray-300 block">
                    Классовые и расовые навыки
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Доступно классовых навыков: {currentClass.skillCount}. Выбрано: {selectedSkills.length}.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-gold-light">
                  Бонус мастерства: +{pb}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {DND_SKILLS_RU.map((sk) => {
                  const isClassAvailable = currentClass.availableSkills.includes(sk.key);
                  const isFromSpecies = currentSpecies.defaultSkills?.includes(sk.key);
                  const isFromBackground = currentBackground.skills.includes(sk.key);
                  const isSelected = selectedSkills.includes(sk.key) || isFromSpecies || isFromBackground;
                  const isLocked = isFromSpecies || isFromBackground;

                  const statMod = calculateAbilityModifier(finalStats[sk.ability]);
                  const bonus = isSelected ? statMod + pb : statMod;

                  return (
                    <div
                      key={sk.key}
                      onClick={() => {
                        if (!isLocked) handleToggleSkill(sk.key);
                      }}
                      className={`p-2.5 rounded-md border flex items-center justify-between transition-all ${
                        isLocked
                          ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200 cursor-default'
                          : isSelected
                          ? 'bg-gold/15 border-gold text-gold-light cursor-pointer shadow-sm'
                          : isClassAvailable
                          ? 'bg-[#151a24] border-[#273240] hover:border-gray-500 cursor-pointer'
                          : 'bg-[#11151c] border-border-subtle opacity-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                          isSelected ? 'bg-gold border-gold text-black' : 'border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-bold text-white block truncate">{sk.nameRu}</span>
                          <span className="text-[9px] font-mono text-gray-400 uppercase">
                            {sk.ability} {isFromSpecies ? '(Вид)' : isFromBackground ? '(Предыстория)' : isClassAvailable ? '(Класс)' : ''}
                          </span>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-bold text-gray-200">
                        {formatModifier(bonus)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: СНАРЯЖЕНИЕ И АВТО-РАСЧЕТ */}
          {step === 6 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Live Preview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-[#161c25] border border-[#2b3746]">
                <div className="text-center p-2 rounded bg-[#10141b] border border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Класс Доспехов (КД)</span>
                  <span className="font-mono text-2xl font-black text-gold-light">{finalAc}</span>
                  <span className="text-[9px] text-gray-400 block">
                    {currentArmor.nameRu} {hasShield ? '+ Щит' : ''} {isWarforged ? '+ Кованый' : ''}
                  </span>
                </div>

                <div className="text-center p-2 rounded bg-[#10141b] border border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Хиты (ОЗ)</span>
                  <span className="font-mono text-2xl font-black text-emerald-400">{finalHp}</span>
                  <span className="text-[9px] text-gray-400 block">
                    Кость {currentClass.hitDie} {isDwarf ? '+ Дварф' : ''}
                  </span>
                </div>

                <div className="text-center p-2 rounded bg-[#10141b] border border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Скорость</span>
                  <span className="font-mono text-2xl font-black text-blue-300">{effectiveSpeed}</span>
                  <span className="text-[9px] text-gray-400 block">
                    Тёмное зрение: {effectiveDarkvision} фт.
                  </span>
                </div>

                <div className="text-center p-2 rounded bg-[#10141b] border border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Инициатива</span>
                  <span className="font-mono text-2xl font-black text-purple-300">{formatModifier(dexMod)}</span>
                  <span className="text-[9px] text-gray-400 block">
                    Пасс. Внимание: {passivePerception}
                  </span>
                </div>
              </div>

              {/* Armor & Shield Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 block">Доспех персонажа:</label>
                  <select
                    value={selectedArmorId}
                    onChange={(e) => setSelectedArmorId(e.target.value)}
                    className="w-full bg-[#161c25] border border-[#2c3846] rounded-md px-3 py-2 text-xs text-white outline-none"
                  >
                    {ARMOR_2024_DATA.map((arm) => (
                      <option key={arm.id} value={arm.id}>
                        {arm.nameRu} (КД {arm.baseAc}, {arm.category === 'none' ? 'без брони' : arm.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label
                    onClick={() => setHasShield(!hasShield)}
                    className="flex items-center gap-2 p-2 rounded-md bg-[#161c25] border border-[#2c3846] cursor-pointer hover:border-gold/50"
                  >
                    <input
                      type="checkbox"
                      checked={hasShield}
                      onChange={(e) => setHasShield(e.target.checked)}
                      className="rounded border-gray-600 text-gold"
                    />
                    <Shield className="w-4 h-4 text-gold" />
                    <span className="text-xs font-bold text-gray-200">Экипировать щит (+2 к КД)</span>
                  </label>
                </div>
              </div>

              {/* Weapons Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">
                  Стартовое оружие (выберите 1 или несколько):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WEAPONS_2024_DATA.map((wpn) => {
                    const isSelected = selectedWeaponIds.includes(wpn.id);
                    return (
                      <div
                        key={wpn.id}
                        onClick={() => handleToggleWeapon(wpn.id)}
                        className={`p-2.5 rounded border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-gold text-gold-light'
                            : 'bg-[#151a24] border-[#26313e] text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{wpn.nameRu}</span>
                          <span className="font-mono text-[10px] text-gray-400">{wpn.damage}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {wpn.damageType} {wpn.mastery ? `• ${wpn.mastery}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: АВАТАРКА И ТОКЕН ФОРЖ */}
          {step === 7 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-lg bg-[#161c25] border border-[#2b3746] space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Аватар и тактический круглый токен
                </h3>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-20 h-20 rounded-full border-2 border-gold/70 bg-[#0f131a] flex items-center justify-center overflow-hidden shadow-gold-glow shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Token" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-gray-600" />
                    )}
                  </div>

                  <div className="space-y-2 flex-1 min-w-[240px]">
                    <button
                      type="button"
                      onClick={() => openForge({ name: name.trim() || 'Герой' })}
                      className="px-4 py-2 rounded-md bg-gold hover:bg-gold-light text-canvas font-bold text-xs flex items-center gap-2 transition-all shadow-gold-glow cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Открыть Token Forge (создать круглый токен)</span>
                    </button>
                    <p className="text-[11px] text-gray-400">
                      Вы можете сгенерировать стильный токен с рунической или золотой рамкой прямо в генераторе токенов.
                    </p>
                  </div>
                </div>

                {/* Or paste custom URL */}
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400">Или укажите прямую ссылку на изображение аватарки:</label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://... или data:image/..."
                    className="w-full bg-[#11151c] border border-border-subtle rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-gold"
                  />
                </div>

                {/* Pick from saved tokens in Token Forge */}
                {savedTokens.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border-subtle">
                    <span className="text-[11px] font-bold text-gray-300 block">
                      Выбрать из библиотеки Token Forge ({savedTokens.length} токенов):
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                      {savedTokens.slice(0, 8).map((st) => (
                        <div
                          key={st.id}
                          onClick={() => setAvatarUrl(st.dataUrl)}
                          className={`w-12 h-12 rounded-full border-2 cursor-pointer shrink-0 transition-transform hover:scale-105 overflow-hidden ${
                            avatarUrl === st.dataUrl ? 'border-gold shadow-gold-glow' : 'border-border-subtle'
                          }`}
                          title={st.name}
                        >
                          <img src={st.dataUrl} alt={st.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Final Summary Card */}
              <div className="p-4 rounded-lg bg-[#141923] border border-gold/40 text-xs space-y-2">
                <div className="font-bold text-sm text-gold-light">
                  {name} • Уровень {level} {currentClass.nameRu} ({currentSpecies.nameRu})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-300 font-mono text-[11px]">
                  <div>КД: <strong>{finalAc}</strong></div>
                  <div>ОЗ: <strong>{finalHp}</strong></div>
                  <div>Скорость: <strong>{effectiveSpeed}</strong></div>
                  <div>Инициатива: <strong>{formatModifier(dexMod)}</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#2d3844] bg-[#161c26]">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 rounded-md bg-[#1e2531] hover:bg-[#283242] text-xs font-bold text-gray-300 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Назад</span>
          </button>

          {step < 7 ? (
            <button
              type="button"
              onClick={() => {
                if (canProceed()) setStep((s) => Math.min(7, s + 1));
              }}
              disabled={!canProceed()}
              className="px-5 py-2 rounded-md bg-gold hover:bg-gold-light text-canvas font-bold text-xs flex items-center gap-1.5 transition-all shadow-gold-glow disabled:opacity-40 cursor-pointer"
            >
              <span>Далее</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportDirectTtrpgh}
                className="px-4 py-2.5 rounded-md bg-[#1d2433] hover:bg-[#273247] text-emerald-300 border border-emerald-600/60 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Скачать файл .ttrpgh с внедренным Base64 токеном"
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>Скачать .ttrpgh</span>
              </button>

              <button
                type="button"
                onClick={handleCreateCharacter}
                className="px-6 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Создать персонажа</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
