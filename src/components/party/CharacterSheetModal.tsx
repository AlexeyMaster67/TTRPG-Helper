import { useState } from 'react';
import { usePartyStore } from '../../store/partyStore';
import { useCombatStore } from '../../store/combatStore';
import { useTranslation } from '../../i18n';
import { audioService } from '../../services/audioService';
import { rollDie, rollDiceFormula } from '../../engine/rolls';
import {
  DND_SKILLS_RU,
  CharacterStats,
  ClassResource,
  PreparedSpell,
  CharacterWeapon,
  EquipmentItem,
} from '../../types/party';
import {
  Shield,
  Zap,
  Sparkles,
  Swords,
  Backpack,
  Activity,
  Award,
  BookOpen,
  Plus,
  Trash2,
  X,
  ExternalLink,
  Flame,
  Dices,
  Moon,
  Check,
  FileDown,
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { ParsedSpell } from '../../types/database';
import { cleanRussianText, DAMAGE_TYPES_EN } from '../../utils/textUtils';
import { downloadTtrpghFile } from '../../services/ttrpghFormat';

function getMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function CharacterSheetModal() {
  const { language } = useTranslation();
  const isEn = language === 'en';

  const {
    members,
    activeSheetMemberId,
    closeCharacterSheet,
    updateMember,
    openShortRestModal,
    longRest,
    showToast,
  } = usePartyStore();

  const [activeTab, setActiveTab] = useState<
    'main' | 'spells' | 'skills' | 'resources' | 'inventory'
  >('main');

  // Spell viewer popup state
  const [selectedSpell, setSelectedSpell] = useState<ParsedSpell | null>(null);

  // New item/spell/resource inputs
  const [newSpellName, setNewSpellName] = useState('');
  const [newSpellLevel, setNewSpellLevel] = useState(1);
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceMax, setNewResourceMax] = useState(3);
  const [newResourceReset, setNewResourceReset] = useState<'short' | 'long'>('short');
  const [newWeaponName, setNewWeaponName] = useState('');
  const [newWeaponDamage, setNewWeaponDamage] = useState('1d8+3');
  const [newWeaponType, setNewWeaponType] = useState(isEn ? 'Slashing' : 'Рубящий');
  const [newEqName, setNewEqName] = useState('');
  const [newEqQty, setNewEqQty] = useState(1);

  const member = members.find((m) => m.id === activeSheetMemberId);

  if (!member || !activeSheetMemberId) return null;

  const stats: CharacterStats = member.stats || {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };

  const pb = member.proficiencyBonus || 2 + Math.floor(((member.level || 1) - 1) / 4);
  const currentHp = member.currentHp !== undefined ? member.currentHp : member.maxHp;
  const tempHp = member.tempHp || 0;
  const hitDiceCurrent = member.hitDiceCurrent ?? (member.hitDiceMax || member.level || 5);
  const hitDiceMax = member.hitDiceMax || member.level || 5;
  const hitDiceType = member.hitDiceType || 'd8';
  const exhaustion = member.exhaustion || 0;

  // Spellcasting defaults
  const spellAbility = member.spellcastingAbility || 'cha';
  const spellMod = getMod(stats[spellAbility] || 10);
  const defaultSpellAttack = member.spellAttackBonus ?? (spellMod + pb);
  const defaultSpellDc = member.spellSaveDc ?? (8 + pb + spellMod);

  // Clickable dice rolls connected to combatStore.addDiceLog
  const handleRollAbilityCheck = (label: string, mod: number) => {
    const d20 = rollDie(20);
    const total = d20 + mod;
    const isNat20 = d20 === 20;
    const isNat1 = d20 === 1;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    useCombatStore.getState().addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: member.name,
      actionName: isEn ? `Ability Check: ${label}` : `Проверка характеристики: ${label}`,
      attackRoll: {
        d20,
        modifier: mod,
        total,
        isNat20,
        isNat1,
      },
      note: `1d20(${d20}) ${mod >= 0 ? `+ ${mod}` : `- ${Math.abs(mod)}`} = ${total}${
        isNat20
          ? isEn ? ' [Critical Success]' : ' [Критический успех]'
          : isNat1
          ? isEn ? ' [Critical Failure]' : ' [Критический провал]'
          : ''
      }`,
    });

    audioService.playDiceRoll();
    if (isNat20) audioService.playCriticalHit();
    showToast(isEn ? `${member.name}: ${label} check = ${total}` : `${member.name}: Проверка ${label} = ${total}`);
  };

  const handleRollSavingThrow = (label: string, mod: number) => {
    const d20 = rollDie(20);
    const total = d20 + mod;
    const isNat20 = d20 === 20;
    const isNat1 = d20 === 1;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    useCombatStore.getState().addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: member.name,
      actionName: isEn ? `Saving Throw: ${label}` : `Спасбросок: ${label}`,
      attackRoll: {
        d20,
        modifier: mod,
        total,
        isNat20,
        isNat1,
      },
      note: `${isEn ? 'Saving throw' : 'Спасбросок'} 1d20(${d20}) ${mod >= 0 ? `+ ${mod}` : `- ${Math.abs(mod)}`} = ${total}${
        isNat20
          ? isEn ? ' [Critical Success]' : ' [Критический успех]'
          : isNat1
          ? isEn ? ' [Critical Failure]' : ' [Критический провал]'
          : ''
      }`,
    });

    audioService.playDiceRoll();
    if (isNat20) audioService.playCriticalHit();
    showToast(isEn ? `${member.name}: ${label} save = ${total}` : `${member.name}: Спасбросок ${label} = ${total}`);
  };

  const handleRollSkillCheck = (nameRu: string, abilityKey: string, bonus: number, nameEn?: string) => {
    const d20 = rollDie(20);
    const total = d20 + bonus;
    const isNat20 = d20 === 20;
    const isNat1 = d20 === 1;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const displayName = isEn ? (nameEn || nameRu) : nameRu;

    useCombatStore.getState().addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: member.name,
      actionName: isEn ? `Skill: ${displayName} (${abilityKey.toUpperCase()})` : `Навык: ${displayName} (${abilityKey.toUpperCase()})`,
      attackRoll: {
        d20,
        modifier: bonus,
        total,
        isNat20,
        isNat1,
      },
      note: `${isEn ? 'Skill check' : 'Проверка навыка'} 1d20(${d20}) ${bonus >= 0 ? `+ ${bonus}` : `- ${Math.abs(bonus)}`} = ${total}${
        isNat20
          ? isEn ? ' [Critical Success]' : ' [Критический успех]'
          : isNat1
          ? isEn ? ' [Critical Failure]' : ' [Критический провал]'
          : ''
      }`,
    });

    audioService.playDiceRoll();
    if (isNat20) audioService.playCriticalHit();
    showToast(isEn ? `${member.name}: ${displayName} = ${total}` : `${member.name}: Навык ${displayName} = ${total}`);
  };

  const handleRollWeaponAttack = (w: CharacterWeapon) => {
    const d20 = rollDie(20);
    const rawBonus = parseInt((w.attackBonus || '+0').replace('+', ''), 10) || 0;
    const atkTotal = d20 + rawBonus;
    const isNat20 = d20 === 20;
    const isNat1 = d20 === 1;

    const dmgResult = rollDiceFormula(w.damage || '1d8');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dmgTypeStr = isEn ? (DAMAGE_TYPES_EN[w.damageType || ''] || w.damageType || 'Damage') : (w.damageType || 'Урон');

    useCombatStore.getState().addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: member.name,
      actionName: isEn ? `Attack: ${w.name}` : `Атака: ${w.name}`,
      attackRoll: {
        d20,
        modifier: rawBonus,
        total: atkTotal,
        isNat20,
        isNat1,
      },
      damageRoll: {
        formula: w.damage || '1d8',
        total: dmgResult.total,
        damageType: dmgTypeStr,
        details: `${w.damage} = ${dmgResult.total}`,
      },
      weaponMastery: w.mastery,
      note: `${isEn ? 'Attack' : 'Атака'} ${atkTotal} (1d20+${rawBonus}), ${isEn ? 'Damage' : 'Урон'} ${dmgResult.total} [${dmgTypeStr}]${
        w.mastery ? ` (${isEn ? 'Mastery' : 'Мастерство'}: ${w.mastery})` : ''
      }`,
    });

    audioService.playDiceRoll();
    if (isNat20) audioService.playCriticalHit();
    showToast(isEn ? `${member.name}: ${w.name} -> Attack ${atkTotal}, Damage ${dmgResult.total}` : `${member.name}: ${w.name} -> Атака ${atkTotal}, Урон ${dmgResult.total}`);
  };

  const handleRollSpellOrCantrip = (spell: PreparedSpell) => {
    const isCantrip = spell.level === 0;
    const d20 = rollDie(20);
    const atkTotal = d20 + defaultSpellAttack;
    const isNat20 = d20 === 20;
    const isNat1 = d20 === 1;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    useCombatStore.getState().addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: member.name,
      actionName: isCantrip
        ? (isEn ? `Cantrip: ${spell.name}` : `Заговор: ${spell.name}`)
        : (isEn ? `Spell: ${spell.name}` : `Заклинание: ${spell.name}`),
      attackRoll: {
        d20,
        modifier: defaultSpellAttack,
        total: atkTotal,
        isNat20,
        isNat1,
      },
      note: isEn
        ? `Cast roll 1d20(${d20})+${defaultSpellAttack} = ${atkTotal}. Target Save DC: ${defaultSpellDc}`
        : `Бросок сотворения 1d20(${d20})+${defaultSpellAttack} = ${atkTotal}. Сл спасброска цели: ${defaultSpellDc}`,
    });

    audioService.playDiceRoll();
    if (isNat20) audioService.playCriticalHit();
    showToast(isEn ? `${member.name}: ${spell.name} -> Roll ${atkTotal} (DC ${defaultSpellDc})` : `${member.name}: ${spell.name} -> Бросок ${atkTotal} (Сл ${defaultSpellDc})`);
  };

  // Quick HP adjustments
  const handleAdjustHp = (delta: number) => {
    const nextHp = Math.max(0, Math.min(member.maxHp, currentHp + delta));
    updateMember(member.id, { currentHp: nextHp });
  };

  const handleAdjustHitDice = (delta: number) => {
    const nextDice = Math.max(0, Math.min(hitDiceMax, hitDiceCurrent + delta));
    updateMember(member.id, { hitDiceCurrent: nextDice });
  };

  const handleSetExhaustion = (lvl: number) => {
    updateMember(member.id, { exhaustion: lvl });
  };

  const handleToggleInspiration = () => {
    updateMember(member.id, { inspiration: !member.inspiration });
  };

  // Spell slots toggle
  const handleToggleSpellSlot = (level: number, slotIndex: number) => {
    const slots = member.spellSlots || {};
    const lvlSlot = slots[level] || { max: 0, used: 0 };
    // If clicking on an unused slot, increment used, otherwise decrement
    const isUsed = slotIndex < lvlSlot.used;
    const newUsed = isUsed ? Math.max(0, lvlSlot.used - 1) : Math.min(lvlSlot.max, lvlSlot.used + 1);

    updateMember(member.id, {
      spellSlots: {
        ...slots,
        [level]: { ...lvlSlot, used: newUsed },
      },
    });
  };

  // Adjust max slots for level
  const handleAdjustMaxSlots = (level: number, delta: number) => {
    const slots = member.spellSlots || {};
    const lvlSlot = slots[level] || { max: 0, used: 0 };
    const nextMax = Math.max(0, lvlSlot.max + delta);
    const nextUsed = Math.min(nextMax, lvlSlot.used);

    updateMember(member.id, {
      spellSlots: {
        ...slots,
        [level]: { max: nextMax, used: nextUsed },
      },
    });
  };

  // Skills toggle: undefined -> proficient -> expertise -> undefined
  const handleToggleSkill = (skillKey: string) => {
    const profs = { ...(member.skillProficiencies || {}) };
    const current = profs[skillKey];
    if (!current) {
      profs[skillKey] = 'proficient';
    } else if (current === 'proficient') {
      profs[skillKey] = 'expertise';
    } else {
      delete profs[skillKey];
    }
    updateMember(member.id, { skillProficiencies: profs });
  };

  // Saving throw toggle
  const handleToggleSave = (statKey: string) => {
    const saves = [...(member.savingThrowProficiencies || [])];
    const idx = saves.indexOf(statKey);
    if (idx >= 0) {
      saves.splice(idx, 1);
    } else {
      saves.push(statKey);
    }
    updateMember(member.id, { savingThrowProficiencies: saves });
  };

  // Resources counter adjustment
  const handleAdjustResource = (resId: string, delta: number) => {
    const resList = (member.resources || []).map((r) => {
      if (r.id !== resId) return r;
      return {
        ...r,
        current: Math.max(0, Math.min(r.max, r.current + delta)),
      };
    });
    updateMember(member.id, { resources: resList });
  };

  const handleAddResource = () => {
    if (!newResourceName.trim()) return;
    const newRes: ClassResource = {
      id: `res-${Date.now()}`,
      name: newResourceName.trim(),
      current: newResourceMax,
      max: newResourceMax,
      resetOn: newResourceReset,
    };
    updateMember(member.id, {
      resources: [...(member.resources || []), newRes],
    });
    setNewResourceName('');
  };

  const handleRemoveResource = (resId: string) => {
    updateMember(member.id, {
      resources: (member.resources || []).filter((r) => r.id !== resId),
    });
  };

  // Prepared Spells
  const handleAddSpell = () => {
    if (!newSpellName.trim()) return;
    const newSpell: PreparedSpell = {
      name: newSpellName.trim(),
      level: newSpellLevel,
      prepared: true,
    };
    updateMember(member.id, {
      preparedSpells: [...(member.preparedSpells || []), newSpell],
    });
    setNewSpellName('');
  };

  const handleRemoveSpell = (idx: number) => {
    const list = [...(member.preparedSpells || [])];
    list.splice(idx, 1);
    updateMember(member.id, { preparedSpells: list });
  };

  const handleToggleSpellPrepared = (idx: number) => {
    const list = [...(member.preparedSpells || [])];
    list[idx] = { ...list[idx], prepared: !list[idx].prepared };
    updateMember(member.id, { preparedSpells: list });
  };

  // Open Spell Details Modal
  const handleOpenSpellDetails = async (spellName: string) => {
    try {
      const results = await dbService.searchSpells(spellName, undefined, undefined, 5);
      if (results && results.length > 0) {
        // Match exact or closest
        const found =
          results.find(
            (s) =>
              s.name_ru?.toLowerCase() === spellName.toLowerCase() ||
              s.name_en?.toLowerCase() === spellName.toLowerCase()
          ) || results[0];
        setSelectedSpell(found);
      } else {
        // Fallback minimal spell
        setSelectedSpell({
          id: `spell-${spellName}`,
          name_ru: spellName,
          name_en: spellName,
          level: 1,
          school: 'Evocation',
          school_ru: 'Воплощение',
          casting_time: isEn ? '1 action' : '1 действие',
          range: isEn ? '60 ft.' : '60 фт.',
          duration: isEn ? 'Instantaneous' : 'Мгновенная',
          description_ru: isEn
            ? 'Spell details available in the D&D 2024 Player\'s Handbook.'
            : 'Информация о заклинании доступна в книге правил D&D 2024.',
        } as any);
      }
    } catch (e) {
      console.warn('Could not fetch spell info:', e);
    }
  };

  // Weapons
  const handleAddWeapon = () => {
    if (!newWeaponName.trim()) return;
    const weapon: CharacterWeapon = {
      id: `w-${Date.now()}`,
      name: newWeaponName.trim(),
      damage: newWeaponDamage.trim(),
      damageType: newWeaponType,
    };
    updateMember(member.id, {
      weapons: [...(member.weapons || []), weapon],
    });
    setNewWeaponName('');
  };

  const handleRemoveWeapon = (id: string) => {
    updateMember(member.id, {
      weapons: (member.weapons || []).filter((w) => w.id !== id),
    });
  };

  // Equipment
  const handleAddEquipment = () => {
    if (!newEqName.trim()) return;
    const item: EquipmentItem = {
      id: `eq-${Date.now()}`,
      name: newEqName.trim(),
      quantity: newEqQty,
    };
    updateMember(member.id, {
      equipment: [...(member.equipment || []), item],
    });
    setNewEqName('');
    setNewEqQty(1);
  };

  const handleRemoveEquipment = (id: string) => {
    updateMember(member.id, {
      equipment: (member.equipment || []).filter((e) => e.id !== id),
    });
  };

  // Attunement Slot toggle
  const handleToggleAttunementSlot = (slotIdx: number) => {
    const defaultName = isEn ? 'Empty Slot' : 'Пустой слот';
    const slots = [...(member.attunementSlots || [
      { id: '1', name: defaultName, attuned: false },
      { id: '2', name: defaultName, attuned: false },
      { id: '3', name: defaultName, attuned: false },
    ])];
    while (slots.length < 3) {
      slots.push({ id: `att-${slots.length + 1}`, name: defaultName, attuned: false });
    }
    slots[slotIdx] = { ...slots[slotIdx], attuned: !slots[slotIdx].attuned };
    updateMember(member.id, { attunementSlots: slots });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 select-none font-sans animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[rgba(18,22,30,0.92)] backdrop-blur-2xl border border-[rgba(255,255,255,0.08)] rounded-glass-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* ========================================================================= */}
        {/* TOP D&D BEYOND CHARACTER HEADER                                           */}
        {/* ========================================================================= */}
        <div className="bg-[rgba(14,18,25,0.7)] border-b border-[rgba(255,255,255,0.08)] p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            {/* Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-full border-2 border-gold/70 flex items-center justify-center text-sm font-black text-white shrink-0 shadow-gold-glow overflow-hidden bg-cover bg-center"
                style={{
                  backgroundColor: member.color || '#10B981',
                  backgroundImage: member.avatarUrl ? `url(${member.avatarUrl})` : undefined,
                }}
              >
                {!member.avatarUrl && member.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                    {member.name}
                  </h1>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gold/15 text-gold-light border border-gold/40">
                    {isEn ? 'Lvl' : 'Ур.'} {member.level || 5}
                  </span>
                </div>
                <p className="text-xs text-emerald-400 font-medium truncate">
                  {member.species || (isEn ? 'Human' : 'Человек')} • {member.characterClass || (isEn ? 'Adventurer' : 'Искатель приключений')}
                </p>
              </div>
            </div>

            {/* Quick Rest, Export & Close controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadTtrpghFile(member, member.avatarUrl);
                  showToast(isEn ? `Character ${member.name} exported to .ttrpgh!` : `Персонаж ${member.name} экспортирован в .ttrpgh!`);
                }}
                className="px-2.5 py-1 min-h-[30px] rounded-glass bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/70 text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                title={isEn ? 'Export character to open .ttrpgh format with embedded token' : 'Экспорт персонажа в открытый формат .ttrpgh с внедренным токеном'}
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">{isEn ? 'Export .ttrpgh' : 'Экспорт .ttrpgh'}</span>
              </button>

              <button
                type="button"
                onClick={() => openShortRestModal(member.id)}
                className="px-2.5 py-1 min-h-[30px] rounded-glass bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-600/70 text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                title={isEn ? 'Short Rest (1h): spend hit dice' : 'Короткий отдых: потратить кости хитов'}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{isEn ? '1h Rest' : 'Отдых 1ч'}</span>
              </button>

              <button
                type="button"
                onClick={longRest}
                className="px-2.5 py-1 min-h-[30px] rounded-glass bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-600/70 text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                title={isEn ? 'Long Rest (8h): fully recover HP and spell slots' : 'Долгий отдых (8ч): полное восстановление здоровья и ячеек'}
              >
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">{isEn ? '8h Rest' : 'Отдых 8ч'}</span>
              </button>

              <button
                type="button"
                onClick={closeCharacterSheet}
                className="p-1.5 rounded-glass text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={isEn ? 'Close sheet' : 'Закрыть лист'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* D&D Beyond Stats Bar: AC, PB, Speed, Inspiration, HP, Hit Dice, Exhaustion */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1 text-center">
            {/* 1. AC Shield */}
            <div className="bg-[#101419] p-2 rounded border border-[#2b3540] flex flex-col items-center justify-center relative">
              <span className="text-[9px] uppercase font-bold text-gray-400">{isEn ? 'AC (Armor)' : 'КД (Доспех)'}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-4 h-4 text-gold fill-gold/20" />
                <span className="font-mono text-base font-black text-white">{member.ac}</span>
              </div>
            </div>

            {/* 2. Proficiency Bonus */}
            <div className="bg-[#101419] p-2 rounded border border-[#2b3540] flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase font-bold text-gray-400">{isEn ? 'Proficiency' : 'Бонус мастерства'}</span>
              <span className="font-mono text-base font-black text-gold-light mt-0.5">+{pb}</span>
            </div>

            {/* 3. Speed */}
            <div className="bg-[#101419] p-2 rounded border border-[#2b3540] flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase font-bold text-gray-400">{isEn ? 'Speed' : 'Скорость'}</span>
              <span className="font-mono text-xs font-bold text-blue-300 mt-1 truncate">
                {member.speed || (isEn ? '30 ft.' : '30 фт.')}
              </span>
            </div>

            {/* 4. Inspiration */}
            <div
              onClick={handleToggleInspiration}
              className={`p-2 rounded border flex flex-col items-center justify-center cursor-pointer transition-all ${
                member.inspiration
                  ? 'bg-amber-500/20 border-gold shadow-[0_0_10px_rgba(197,160,89,0.3)]'
                  : 'bg-[#101419] border-[#2b3540] text-gray-500 hover:text-gray-300'
              }`}
              title={isEn ? 'Heroic Inspiration (click to toggle)' : 'Вдохновение героя (кликните для переключения)'}
            >
              <span className="text-[9px] uppercase font-bold text-gray-400">{isEn ? 'Inspiration' : 'Вдохновение'}</span>
              <div className="flex items-center gap-1 mt-0.5 font-bold text-xs">
                <Sparkles className={`w-3.5 h-3.5 ${member.inspiration ? 'text-gold fill-gold' : ''}`} />
                <span className={member.inspiration ? 'text-gold-bright' : 'text-gray-500'}>
                  {member.inspiration ? (isEn ? 'YES' : 'ДА') : (isEn ? 'NO' : 'НЕТ')}
                </span>
              </div>
            </div>

            {/* 5. Health Points */}
            <div className="bg-[#101419] p-2 rounded border border-[#2b3540] flex flex-col items-center justify-center col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between w-full text-[9px] uppercase font-bold text-gray-400 mb-0.5">
                <span>{isEn ? 'Hit Points (HP)' : 'Хиты (ОЗ)'}</span>
                {tempHp > 0 && <span className="text-cyan-400">+{tempHp}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustHp(-1)}
                  className="w-4 h-4 rounded bg-[#202730] hover:bg-red-900/60 text-gray-300 hover:text-red-200 text-xs font-bold leading-none flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-mono text-xs font-black text-emerald-400">
                  {currentHp} / {member.maxHp}
                </span>
                <button
                  type="button"
                  onClick={() => handleAdjustHp(1)}
                  className="w-4 h-4 rounded bg-[#202730] hover:bg-emerald-900/60 text-gray-300 hover:text-emerald-200 text-xs font-bold leading-none flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* 6. Hit Dice */}
            <div className="bg-[#101419] p-2 rounded border border-[#2b3540] flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase font-bold text-gray-400">{isEn ? 'Hit Dice' : 'Кости хитов'}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <button
                  type="button"
                  onClick={() => handleAdjustHitDice(-1)}
                  disabled={hitDiceCurrent <= 0}
                  className="w-4 h-4 rounded bg-[#202730] hover:bg-surface text-gray-400 hover:text-white text-xs font-bold disabled:opacity-30 leading-none flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-mono text-xs font-bold text-gold-light">
                  [{hitDiceType}] {hitDiceCurrent}/{hitDiceMax}
                </span>
                <button
                  type="button"
                  onClick={() => handleAdjustHitDice(1)}
                  disabled={hitDiceCurrent >= hitDiceMax}
                  className="w-4 h-4 rounded bg-[#202730] hover:bg-surface text-gray-400 hover:text-white text-xs font-bold disabled:opacity-30 leading-none flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* 7. Exhaustion tracker (0-6) */}
            <div className="bg-[#101419] p-2 rounded border border-[#2b3540] flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase font-bold text-gray-400">{isEn ? 'Exhaustion (0-6)' : 'Истощение (0-6)'}</span>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5, 6].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleSetExhaustion(exhaustion === lvl ? lvl - 1 : lvl)}
                    className={`w-3.5 h-3.5 rounded-full text-[8px] font-mono font-bold flex items-center justify-center transition-all ${
                      exhaustion >= lvl
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-[#1e2730] text-gray-500 hover:bg-[#2b3744]'
                    }`}
                    title={isEn ? `Exhaustion ${lvl}` : `Истощение ${lvl}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABS NAVIGATION                                                           */}
        {/* ========================================================================= */}
        <div className="flex items-center px-4 bg-[#14181f] border-b border-[#2d3844] gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={`px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'main'
                ? 'border-gold text-gold-light bg-[#1c222b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-gold" />
            <span>{isEn ? 'MAIN' : 'ОСНОВНОЕ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spells')}
            className={`px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'spells'
                ? 'border-gold text-gold-light bg-[#1c222b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>{isEn ? 'SPELLS' : 'ЗАКЛИНАНИЯ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'skills'
                ? 'border-gold text-gold-light bg-[#1c222b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isEn ? 'SKILLS & SAVES' : 'НАВЫКИ И СПАСБРОСКИ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'resources'
                ? 'border-gold text-gold-light bg-[#1c222b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEn ? 'FEATURES & RESOURCES' : 'СПОСОБНОСТИ И РЕСУРСЫ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'border-gold text-gold-light bg-[#1c222b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Backpack className="w-3.5 h-3.5 text-blue-400" />
            <span>{isEn ? 'INVENTORY' : 'ИНВЕНТАРЬ'}</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB CONTENTS                                                              */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: MAIN */}
          {activeTab === 'main' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 6 Core Ability Scores */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {isEn ? 'Core Ability Scores' : 'Основные характеристики'}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {[
                    { key: 'str', label: isEn ? 'STR' : 'СИЛА', score: stats.str },
                    { key: 'dex', label: isEn ? 'DEX' : 'ЛОВКОСТЬ', score: stats.dex },
                    { key: 'con', label: isEn ? 'CON' : 'ТЕЛОСЛОЖЕНИЕ', score: stats.con },
                    { key: 'int', label: isEn ? 'INT' : 'ИНТЕЛЛЕКТ', score: stats.int },
                    { key: 'wis', label: isEn ? 'WIS' : 'МУДРОСТЬ', score: stats.wis },
                    { key: 'cha', label: isEn ? 'CHA' : 'ХАРИЗМА', score: stats.cha },
                  ].map((s) => {
                    const mod = getMod(s.score);
                    return (
                      <div
                        key={s.key}
                        onClick={() => handleRollAbilityCheck(s.label, mod)}
                        className="bg-[#171c23] border border-[#2d3844] rounded p-2.5 flex flex-col items-center justify-between shadow-sm hover:border-gold hover:bg-gold/5 transition-all cursor-pointer group active:scale-95"
                        title={
                          isEn
                            ? `Click to roll ${s.label} check (1d20${formatMod(mod)})`
                            : `Кликните для проверки характеристики ${s.label} (1d20${formatMod(mod)})`
                        }
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold tracking-wider text-gray-400 group-hover:text-gold-light">
                            {s.label}
                          </span>
                          <Dices className="w-3 h-3 text-gold/30 group-hover:text-gold" />
                        </div>
                        <span className="font-mono text-xl font-black text-white my-1 group-hover:text-gold">
                          {formatMod(mod)}
                        </span>
                        <div className="bg-[#101419] px-2 py-0.5 rounded-full border border-border-subtle font-mono text-xs text-gray-300">
                          {s.score}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Passive Senses & Defenses */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-[#171c23] border border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    {isEn ? 'Passive Perception' : 'Пассивное Внимание'}
                  </span>
                  <span className="text-lg font-mono font-bold text-purple-300">
                    {member.passivePerception || 10 + getMod(stats.wis)}
                  </span>
                </div>

                <div className="p-3 rounded bg-[#171c23] border border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    {isEn ? 'Passive Investigation' : 'Пассивный Анализ'}
                  </span>
                  <span className="text-lg font-mono font-bold text-blue-300">
                    {10 + getMod(stats.int)}
                  </span>
                </div>

                <div className="p-3 rounded bg-[#171c23] border border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    {isEn ? 'Passive Insight' : 'Пассивная Проницательность'}
                  </span>
                  <span className="text-lg font-mono font-bold text-emerald-300">
                    {10 + getMod(stats.wis)}
                  </span>
                </div>
              </div>

              {/* Quick Actions / Weapons list */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                  <span>{isEn ? 'Prepared Attacks & Weapons' : 'Готовые атаки и оружие'}</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {isEn ? '(switch to "INVENTORY" tab to edit)' : '(перейдите во вкладку «ИНВЕНТАРЬ» для редактирования)'}
                  </span>
                </h3>
                <div className="space-y-2">
                  {(member.weapons || []).length > 0 ? (
                    (member.weapons || []).map((w) => (
                      <div
                        key={w.id}
                        onClick={() => handleRollWeaponAttack(w)}
                        className="p-2.5 rounded bg-[#171c23] border border-border-subtle hover:border-gold hover:bg-gold/5 transition-all flex items-center justify-between gap-2 cursor-pointer group active:scale-95"
                        title={
                          isEn
                            ? `Click to attack with ${w.name} (${w.attackBonus || '+0'}, damage ${w.damage || '1d8'})`
                            : `Кликните для атаки оружием ${w.name} (${w.attackBonus || '+0'}, урон ${w.damage || '1d8'})`
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Swords className="w-4 h-4 text-gold shrink-0 group-hover:scale-110 transition-transform" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white group-hover:text-gold-light">{w.name}</h4>
                              <Dices className="w-3 h-3 text-gold/40 group-hover:text-gold" />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {isEn ? (DAMAGE_TYPES_EN[w.damageType || ''] || w.damageType) : w.damageType}{' '}
                              {w.mastery ? `• ${isEn ? 'Mastery' : 'Мастерство'}: ${w.mastery}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-xs">
                          {w.attackBonus && (
                            <span className="px-2 py-0.5 rounded bg-red-950 text-red-200 border border-red-700 font-bold group-hover:border-red-500">
                              {w.attackBonus}
                            </span>
                          )}
                          {w.damage && (
                            <span className="px-2 py-0.5 rounded bg-surface border border-gold/40 text-gold-light font-bold group-hover:border-gold">
                              {w.damage}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 italic">{isEn ? 'No weapons equipped yet' : 'Оружие пока не экипировано'}</p>
                  )}
                </div>
              </div>

              {/* Character Notes */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  {isEn ? 'Features, Traits & Notes' : 'Черты, особенности и заметки'}
                </h3>
                <textarea
                  rows={3}
                  value={member.notes || ''}
                  onChange={(e) => updateMember(member.id, { notes: e.target.value })}
                  placeholder={
                    isEn
                      ? 'Character traits, fighting styles, languages, racial traits...'
                      : 'Черты характера, стили боя, языки, расовые особенности...'
                  }
                  className="w-full bg-[#171c23] border border-border-subtle rounded p-2.5 text-xs text-gray-200 outline-none focus:border-gold"
                />
              </div>
            </div>
          )}

          {/* TAB 2: SPELLS */}
          {activeTab === 'spells' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Spellcasting Header Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded bg-[#171c23] border border-[#2d3844]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                    {isEn ? 'Spellcasting Ability' : 'Базовая характеристика'}
                  </span>
                  <select
                    value={member.spellcastingAbility || 'cha'}
                    onChange={(e) =>
                      updateMember(member.id, {
                        spellcastingAbility: e.target.value as any,
                      })
                    }
                    className="bg-[#101419] border border-border-subtle rounded px-2 py-1 text-xs text-gold-light outline-none font-bold"
                  >
                    <option value="int">{isEn ? 'INTELLIGENCE (INT)' : 'ИНТЕЛЛЕКТ (INT)'}</option>
                    <option value="wis">{isEn ? 'WISDOM (WIS)' : 'МУДРОСТЬ (WIS)'}</option>
                    <option value="cha">{isEn ? 'CHARISMA (CHA)' : 'ХАРИЗМА (CHA)'}</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                    {isEn ? 'Spell Attack Bonus' : 'Бонус атаки заклинанием'}
                  </span>
                  <span className="font-mono text-base font-black text-purple-300">
                    {formatMod(defaultSpellAttack)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                    {isEn ? 'Spell Save DC' : 'Сложность спасброска (Сл)'}
                  </span>
                  <span className="font-mono text-base font-black text-gold-light">
                    {defaultSpellDc}
                  </span>
                </div>
              </div>

              {/* 1st to 9th Level Spell Slot Trackers */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                  {isEn
                    ? 'Spell Slots (Levels 1–9): Interactive Indicators'
                    : 'Ячейки заклинаний (1–9 круг): интерактивные индикаторы'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
                    const slotData = member.spellSlots?.[lvl] || { max: 0, used: 0 };
                    const hasSlots = slotData.max > 0;

                    return (
                      <div
                        key={lvl}
                        className={`p-3 rounded border transition-all ${
                          hasSlots
                            ? 'bg-[#171c23] border-[#2d3844]'
                            : 'bg-[#13161c] border-border-subtle/40 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-200">
                            {isEn ? `Level ${lvl} Spell Slots` : `${lvl} круг заклинаний`}
                          </span>

                          {/* Max slot adjustments */}
                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleAdjustMaxSlots(lvl, -1)}
                              className="w-4 h-4 rounded bg-[#101419] hover:bg-surface text-gray-400 hover:text-white flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="text-gray-300">
                              {slotData.max - slotData.used}/{slotData.max}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustMaxSlots(lvl, 1)}
                              className="w-4 h-4 rounded bg-[#101419] hover:bg-surface text-gray-400 hover:text-white flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Interactive Bubble Checkboxes */}
                        {slotData.max > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {Array.from({ length: slotData.max }).map((_, slotIdx) => {
                              const isUsed = slotIdx < slotData.used;
                              return (
                                <button
                                  key={slotIdx}
                                  type="button"
                                  onClick={() => handleToggleSpellSlot(lvl, slotIdx)}
                                  title={
                                    isUsed
                                      ? isEn
                                        ? `Level ${lvl} slot expended (click to recover)`
                                        : `Ячейка ${lvl} круга израсходована (клик, чтобы восстановить)`
                                      : isEn
                                      ? `Level ${lvl} slot ready (click to expend)`
                                      : `Ячейка ${lvl} круга готова (клик, чтобы потратить)`
                                  }
                                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                                    isUsed
                                      ? 'bg-gray-800/80 border-gray-600 text-gray-500 scale-90'
                                      : 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.4)] scale-100 hover:scale-105'
                                  }`}
                                >
                                  {isUsed ? (
                                    <span className="w-2 h-2 rounded-full border border-gray-500" />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-500 italic">
                            {isEn ? 'No slots at this level' : 'Нет ячеек этого круга'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prepared Spells List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {isEn ? 'Prepared Spells' : 'Подготовленные заклинания'}
                  </h3>
                </div>

                {/* Add Spell Quick Form */}
                <div className="flex items-center gap-2 mb-3 bg-[#171c23] p-2.5 rounded border border-border-subtle flex-wrap">
                  <input
                    type="text"
                    placeholder={
                      isEn
                        ? 'Spell name (e.g. Fireball)...'
                        : 'Название заклинания (например: Огненный шар)...'
                    }
                    value={newSpellName}
                    onChange={(e) => setNewSpellName(e.target.value)}
                    className="flex-1 min-w-[180px] bg-[#101419] border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                  />
                  <select
                    value={newSpellLevel}
                    onChange={(e) => setNewSpellLevel(parseInt(e.target.value, 10))}
                    className="bg-[#101419] border border-border-subtle rounded px-2 py-1 text-xs text-gold-light outline-none"
                  >
                    <option value={0}>{isEn ? 'Cantrip (0)' : 'Заговор (0)'}</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {isEn ? `Level ${lvl}` : `${lvl} круг`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSpell}
                    className="px-3 py-1 rounded bg-gold text-canvas font-bold text-xs hover:bg-gold-light flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Add' : 'Добавить'}</span>
                  </button>
                </div>

                {/* Spells Grid */}
                <div className="space-y-1.5">
                  {(member.preparedSpells || []).map((sp, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#171c23] border border-border-subtle hover:border-purple-500/50 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSpellPrepared(idx)}
                          className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] font-bold ${
                            sp.prepared
                              ? 'bg-purple-600 border-purple-400 text-white'
                              : 'bg-surface border-gray-600 text-transparent'
                          }`}
                          title={sp.prepared ? (isEn ? 'Prepared' : 'Подготовлено') : (isEn ? 'Not prepared' : 'Не подготовлено')}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>

                        <span
                          onClick={() => handleOpenSpellDetails(sp.name)}
                          className="text-xs font-semibold text-gray-200 hover:text-gold cursor-pointer truncate flex items-center gap-1.5"
                          title={isEn ? 'Click to view spell description' : 'Кликните для просмотра описания заклинания'}
                        >
                          <span>{sp.name}</span>
                          {sp.nameEn && (
                            <span className="text-[10px] text-gray-500 italic">({sp.nameEn})</span>
                          )}
                          <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRollSpellOrCantrip(sp)}
                          className="px-2 py-0.5 rounded bg-purple-950 hover:bg-purple-800 text-purple-200 border border-purple-700 font-mono text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                          title={
                            isEn
                              ? `Click to cast ${sp.level === 0 ? 'cantrip' : 'spell'} (attack 1d20+${defaultSpellAttack}, DC ${defaultSpellDc})`
                              : `Кликните для броска ${sp.level === 0 ? 'заговора' : 'заклинания'} (атака 1d20+${defaultSpellAttack}, Сл ${defaultSpellDc})`
                          }
                        >
                          <Dices className="w-3 h-3 text-purple-300" />
                          <span>{sp.level === 0 ? (isEn ? 'Cantrip' : 'Заговор') : isEn ? `Lvl ${sp.level}` : `${sp.level} ур.`}</span>
                        </button>
                        {sp.concentration && (
                          <span className="text-[10px] font-mono text-blue-400 border border-blue-800/60 px-1 rounded">
                            {isEn ? 'Conc.' : 'Конц.'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSpell(idx)}
                          className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                          title={isEn ? 'Remove spell' : 'Удалить заклинание'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SKILLS & SAVES */}
          {activeTab === 'skills' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 6 Ability Saving Throws */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {isEn ? 'Ability Saving Throws' : 'Спасброски характеристик'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { key: 'str', label: isEn ? 'STR' : 'СИЛА', score: stats.str },
                    { key: 'dex', label: isEn ? 'DEX' : 'ЛОВКОСТЬ', score: stats.dex },
                    { key: 'con', label: isEn ? 'CON' : 'ТЕЛОСЛОЖЕНИЕ', score: stats.con },
                    { key: 'int', label: isEn ? 'INT' : 'ИНТЕЛЛЕКТ', score: stats.int },
                    { key: 'wis', label: isEn ? 'WIS' : 'МУДРОСТЬ', score: stats.wis },
                    { key: 'cha', label: isEn ? 'CHA' : 'ХАРИЗМА', score: stats.cha },
                  ].map((s) => {
                    const isProf = (member.savingThrowProficiencies || []).includes(s.key);
                    const mod = getMod(s.score) + (isProf ? pb : 0);
                    return (
                      <div
                        key={s.key}
                        className={`p-2.5 rounded border transition-all flex items-center justify-between ${
                          isProf
                            ? 'bg-gold/15 border-gold shadow-sm'
                            : 'bg-[#171c23] border-border-subtle hover:border-gray-500'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSave(s.key)}
                          className="flex items-center gap-2 cursor-pointer text-left"
                          title={isEn ? 'Click indicator to toggle proficiency' : 'Кликните кружок для смены владения'}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isProf ? 'bg-gold border-gold' : 'border-gray-500'
                            }`}
                          >
                            {isProf && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                          <span className="text-xs font-bold text-gray-200">{s.label}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRollSavingThrow(s.label, mod)}
                          className="font-mono text-sm font-black text-gold-light hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 hover:bg-gold/20 border border-gold/30 cursor-pointer active:scale-95"
                          title={isEn ? `Roll ${s.label} saving throw (1d20${formatMod(mod)})` : `Бросить спасбросок ${s.label} (1d20${formatMod(mod)})`}
                        >
                          <Dices className="w-3 h-3 text-gold/60" />
                          <span>{formatMod(mod)}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* All 18 D&D Skills */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                  <span>{isEn ? 'All 18 D&D Skills' : 'Все 18 навыков D&D'}</span>
                  <span className="text-[10px] text-gray-500">
                    {isEn
                      ? 'Indicator: [ ] Normal, [P] Proficient (+PB), [E] Expertise (+2×PB)'
                      : 'Индикатор: [ ] обычный, [P] владение (+М), [E] компетентность (+2хМ)'}
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {DND_SKILLS_RU.map((sk) => {
                    const profState = member.skillProficiencies?.[sk.key];
                    const statScore = stats[sk.ability] || 10;
                    const baseMod = getMod(statScore);
                    const bonus =
                      profState === 'expertise'
                        ? baseMod + pb * 2
                        : profState === 'proficient'
                        ? baseMod + pb
                        : baseMod;
                    const skillDisplayName = isEn ? sk.key : sk.nameRu;

                    return (
                      <div
                        key={sk.key}
                        className={`p-2.5 rounded border flex items-center justify-between transition-all ${
                          profState === 'expertise'
                            ? 'bg-amber-500/20 border-gold shadow-sm'
                            : profState === 'proficient'
                            ? 'bg-emerald-950/40 border-emerald-600 shadow-sm'
                            : 'bg-[#171c23] border-border-subtle hover:border-gray-500'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSkill(sk.key)}
                          className="flex items-center gap-2 min-w-0 cursor-pointer text-left flex-1"
                          title={
                            isEn
                              ? 'Click indicator to toggle (Normal / Proficient / Expertise)'
                              : 'Кликните индикатор для смены статуса (обычный / владение / компетентность)'
                          }
                        >
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              profState === 'expertise'
                                ? 'bg-gold border-gold text-black'
                                : profState === 'proficient'
                                ? 'bg-emerald-500 border-emerald-500 text-black'
                                : 'border-gray-600 text-transparent'
                            }`}
                          >
                            {profState === 'expertise' ? 'E' : profState === 'proficient' ? 'P' : ''}
                          </div>

                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-200 block truncate">
                              {skillDisplayName}
                            </span>
                            <span className="text-[9px] uppercase font-mono text-gray-500">
                              {sk.ability}
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRollSkillCheck(sk.nameRu, sk.ability, bonus, sk.key)}
                          className={`font-mono text-xs font-black flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 hover:bg-gold/20 border border-gold/30 cursor-pointer active:scale-95 shrink-0 ${
                            profState === 'expertise'
                              ? 'text-gold-bright'
                              : profState === 'proficient'
                              ? 'text-emerald-400'
                              : 'text-gray-300'
                          }`}
                          title={
                            isEn
                              ? `Roll ${skillDisplayName} check (1d20${formatMod(bonus)})`
                              : `Бросить проверку навыка ${sk.nameRu} (1d20${formatMod(bonus)})`
                          }
                        >
                          <Dices className="w-3 h-3 text-gold/60" />
                          <span>{formatMod(bonus)}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FEATURES & RESOURCES */}
          {activeTab === 'resources' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Add New Resource */}
              <div className="flex items-center gap-2 bg-[#171c23] p-3 rounded border border-border-subtle flex-wrap">
                <input
                  type="text"
                  placeholder={
                    isEn
                      ? 'Resource name (e.g. Rage, Action Surge, Ki Points)...'
                      : 'Название ресурса (например: Ярость, Всплеск действий, Очки Ци)...'
                  }
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  className="flex-1 min-w-[200px] bg-[#101419] border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                />
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 text-[10px]">{isEn ? 'Max:' : 'Макс:'}</span>
                  <input
                    type="number"
                    min="1"
                    value={newResourceMax}
                    onChange={(e) => setNewResourceMax(parseInt(e.target.value, 10) || 1)}
                    className="w-14 bg-[#101419] border border-border-subtle rounded px-1.5 py-1 text-xs text-gold font-mono"
                  />
                </div>
                <select
                  value={newResourceReset}
                  onChange={(e) => setNewResourceReset(e.target.value as any)}
                  className="bg-[#101419] border border-border-subtle rounded px-2 py-1 text-xs text-gray-200 outline-none"
                >
                  <option value="short">{isEn ? 'Reset: Short Rest' : 'Сброс: Короткий отдых'}</option>
                  <option value="long">{isEn ? 'Reset: Long Rest' : 'Сброс: Долгий отдых'}</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="px-3 py-1 rounded bg-gold text-canvas font-bold text-xs hover:bg-gold-light flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Add' : 'Добавить'}</span>
                </button>
              </div>

              {/* Resource Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(member.resources || []).map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 rounded bg-[#171c23] border border-[#2d3844] flex flex-col justify-between gap-3 shadow-sm hover:border-gold/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white">{res.name}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border-subtle text-gray-400 mt-1 inline-block">
                          {isEn
                            ? `Recovery: ${res.resetOn === 'short' ? 'Short Rest' : 'Long Rest'}`
                            : `Восстановление: ${res.resetOn === 'short' ? 'Короткий отдых' : 'Долгий отдых'}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(res.id)}
                        className="text-gray-500 hover:text-red-400 p-0.5 cursor-pointer"
                        title={isEn ? 'Remove resource' : 'Удалить ресурс'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Counter Stepper */}
                    <div className="flex items-center justify-between bg-[#101419] p-2 rounded border border-border-subtle">
                      <span className="text-xs text-gray-400">{isEn ? 'Available charges:' : 'Доступно зарядов:'}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAdjustResource(res.id, -1)}
                          disabled={res.current <= 0}
                          className="w-6 h-6 rounded bg-[#202730] hover:bg-surface text-gray-300 hover:text-white font-bold text-sm flex items-center justify-center disabled:opacity-30 leading-none cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono text-base font-black text-gold-light px-1">
                          {res.current} / {res.max}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustResource(res.id, 1)}
                          disabled={res.current >= res.max}
                          className="w-6 h-6 rounded bg-[#202730] hover:bg-surface text-gray-300 hover:text-white font-bold text-sm flex items-center justify-center disabled:opacity-30 leading-none cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* 3 Attunement Diamonds */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <span>{isEn ? 'Magic Item Attunement (3 Slots)' : 'Настройка на магические предметы (3 слота)'}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[0, 1, 2].map((idx) => {
                    const defaultEmpty = isEn ? 'Empty Slot' : 'Пустой слот';
                    const slot = member.attunementSlots?.[idx] || {
                      id: String(idx),
                      name: defaultEmpty,
                      attuned: false,
                    };
                    const slotName =
                      slot.name === 'Пустой слот' || slot.name === 'Empty Slot'
                        ? defaultEmpty
                        : slot.name;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleAttunementSlot(idx)}
                        className={`p-3 rounded border flex items-center gap-3 cursor-pointer transition-all ${
                          slot.attuned
                            ? 'bg-amber-500/15 border-gold shadow-[0_0_12px_rgba(197,160,89,0.3)]'
                            : 'bg-[#171c23] border-border-subtle hover:border-gray-500'
                        }`}
                        title={isEn ? 'Click to toggle attunement' : 'Кликните для переключения настройки'}
                      >
                        <Sparkles
                          className={`h-4 w-4 shrink-0 ${
                            slot.attuned ? 'text-gold fill-gold' : 'text-gray-600'
                          }`}
                        />
                        <div className="min-w-0">
                          <h4
                            className={`text-xs font-bold truncate ${
                              slot.attuned ? 'text-gold-light' : 'text-gray-400'
                            }`}
                          >
                            {slotName}
                          </h4>
                          <span className="text-[10px] text-gray-500">
                            {slot.attuned ? (isEn ? 'Attuned' : 'Настроен') : (isEn ? 'Open Slot' : 'Свободный слот')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weapons Management */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {isEn ? 'Equipped Weapons' : 'Экипированное оружие'}
                </h3>
                <div className="flex items-center gap-2 mb-3 bg-[#171c23] p-2.5 rounded border border-border-subtle flex-wrap">
                  <input
                    type="text"
                    placeholder={
                      isEn
                        ? 'Weapon name (e.g. Warhammer)...'
                        : 'Название оружия (например: Боевой молот)...'
                    }
                    value={newWeaponName}
                    onChange={(e) => setNewWeaponName(e.target.value)}
                    className="flex-1 min-w-[160px] bg-[#101419] border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                  />
                  <input
                    type="text"
                    placeholder={isEn ? 'Damage: 1d8+3' : 'Урон: 1d8+3'}
                    value={newWeaponDamage}
                    onChange={(e) => setNewWeaponDamage(e.target.value)}
                    className="w-24 bg-[#101419] border border-border-subtle rounded px-2 py-1 text-xs text-gold font-mono"
                  />
                  <select
                    value={newWeaponType}
                    onChange={(e) => setNewWeaponType(e.target.value)}
                    className="bg-[#101419] border border-border-subtle rounded px-2 py-1 text-xs text-gray-200 outline-none"
                  >
                    <option value={isEn ? 'Slashing' : 'Рубящий'}>{isEn ? 'Slashing' : 'Рубящий'}</option>
                    <option value={isEn ? 'Piercing' : 'Колющий'}>{isEn ? 'Piercing' : 'Колющий'}</option>
                    <option value={isEn ? 'Bludgeoning' : 'Дробящий'}>{isEn ? 'Bludgeoning' : 'Дробящий'}</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddWeapon}
                    className="px-3 py-1 rounded bg-gold text-canvas font-bold text-xs hover:bg-gold-light flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Add' : 'Добавить'}</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(member.weapons || []).map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded bg-[#171c23] border border-border-subtle flex items-center justify-between gap-2"
                    >
                      <div
                        onClick={() => handleRollWeaponAttack(w)}
                        className="flex items-center gap-2 cursor-pointer group flex-1"
                        title={isEn ? `Click to attack with ${w.name}` : `Кликните для атаки оружием ${w.name}`}
                      >
                        <Swords className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white group-hover:text-gold-light">{w.name}</span>
                            <Dices className="w-3 h-3 text-gold/40 group-hover:text-gold" />
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {w.damage} ({isEn ? (DAMAGE_TYPES_EN[w.damageType || ''] || w.damageType) : w.damageType}){' '}
                            {w.mastery ? `• ${isEn ? 'Mastery' : 'Мастерство'}: ${w.mastery}` : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWeapon(w.id)}
                        className="text-gray-500 hover:text-red-400 p-1 cursor-pointer"
                        title={isEn ? 'Remove weapon' : 'Удалить оружие'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment & Gear */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {isEn ? 'Equipment & Gear' : 'Снаряжение и предметы'}
                </h3>
                <div className="flex items-center gap-2 mb-3 bg-[#171c23] p-2.5 rounded border border-border-subtle flex-wrap">
                  <input
                    type="text"
                    placeholder={isEn ? 'Item name...' : 'Название предмета...'}
                    value={newEqName}
                    onChange={(e) => setNewEqName(e.target.value)}
                    className="flex-1 min-w-[180px] bg-[#101419] border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                  />
                  <input
                    type="number"
                    min="1"
                    value={newEqQty}
                    onChange={(e) => setNewEqQty(parseInt(e.target.value, 10) || 1)}
                    className="w-16 bg-[#101419] border border-border-subtle rounded px-2 py-1 text-xs text-gray-200 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddEquipment}
                    className="px-3 py-1 rounded bg-gold text-canvas font-bold text-xs hover:bg-gold-light flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Add' : 'Добавить'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(member.equipment || []).map((eq) => (
                    <div
                      key={eq.id}
                      className="p-2 rounded bg-[#171c23] border border-border-subtle flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-gold-light font-bold">×{eq.quantity}</span>
                        <span className="truncate text-gray-200">{eq.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipment(eq.id)}
                        className="text-gray-500 hover:text-red-400 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* POPUP: SPELL DETAILS MODAL                                                */}
        {/* ========================================================================= */}
        {selectedSpell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg bg-[#141b21] border border-gold/60 rounded p-5 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-[#2e3b46] pb-2.5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>
                      {cleanRussianText(
                        isEn
                          ? selectedSpell.name_en || selectedSpell.name_ru
                          : selectedSpell.name_ru || selectedSpell.name_en
                      )}
                    </span>
                    {(isEn ? selectedSpell.name_ru : selectedSpell.name_en) && (
                      <span className="text-xs text-gray-400 font-normal italic">
                        ({isEn ? selectedSpell.name_ru : selectedSpell.name_en})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-purple-300 font-medium mt-0.5">
                    {selectedSpell.level === 0
                      ? isEn
                        ? `Cantrip, ${selectedSpell.school || selectedSpell.school_ru || 'Magic'}`
                        : `Заговор, ${selectedSpell.school_ru || selectedSpell.school || 'Магия'}`
                      : isEn
                      ? `Level ${selectedSpell.level}, ${selectedSpell.school || selectedSpell.school_ru || 'Magic'}`
                      : `${selectedSpell.level} круг, ${selectedSpell.school_ru || selectedSpell.school || 'Магия'}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSpell(null)}
                  className="text-gray-400 hover:text-white p-1 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Spell Meta Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-[#10151a] p-2.5 rounded border border-[#2e3b46]">
                <div>
                  <span className="text-gray-400 text-[10px] block">{isEn ? 'Casting Time:' : 'Время накладывания:'}</span>
                  <span className="font-bold text-gray-200">
                    {cleanRussianText(selectedSpell.casting_time || (isEn ? '1 action' : '1 действие'))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">{isEn ? 'Range:' : 'Дистанция:'}</span>
                  <span className="font-bold text-gray-200">
                    {cleanRussianText(selectedSpell.range || (isEn ? 'Self' : 'На себя'))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">{isEn ? 'Components:' : 'Компоненты:'}</span>
                  <span className="font-bold text-gray-200">
                    {[
                      selectedSpell.components_v ? (isEn ? 'V' : 'В') : null,
                      selectedSpell.components_s ? (isEn ? 'S' : 'С') : null,
                      selectedSpell.components_m ? (isEn ? 'M' : 'М') : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || (isEn ? 'V, S' : 'В, С')}
                    {selectedSpell.materials_ru ? ` (${selectedSpell.materials_ru})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">{isEn ? 'Duration:' : 'Длительность:'}</span>
                  <span className="font-bold text-gray-200 flex items-center gap-1">
                    {selectedSpell.concentration && (
                      <span className="text-blue-400 text-[10px]">{isEn ? 'Conc., ' : 'Конц., '}</span>
                    )}
                    {cleanRussianText(selectedSpell.duration || (isEn ? 'Instantaneous' : 'Мгновенная'))}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="text-xs text-gray-300 leading-relaxed font-sans space-y-2 whitespace-pre-wrap">
                <p>
                  {cleanRussianText(
                    isEn
                      ? selectedSpell.description_en || selectedSpell.description_ru || ''
                      : selectedSpell.description_ru || selectedSpell.description_en || ''
                  )}
                </p>
                {selectedSpell.higher_levels_ru && (
                  <div className="p-2 rounded bg-surface/80 border border-gold/30 text-[11px] text-gold-light">
                    <strong>{isEn ? 'At Higher Levels: ' : 'На более высоких кругах: '}</strong>
                    <span>{cleanRussianText(selectedSpell.higher_levels_ru)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
