import React, { useState, useEffect } from 'react';
import {
  Coins,
  Gem,
  Sparkles,
  Swords,
  Check,
  RefreshCw,
  X,
  PlusCircle,
  Users,
  Backpack,
  Layers,
  Dices,
  BookOpen,
  UserCheck,
} from 'lucide-react';
import { GeneratedLoot, LootMagicItem, LootMode } from '../../types/loot';
import { lootService } from '../../services/lootService';
import { usePartyStore } from '../../store/partyStore';
import { useCombatStore } from '../../store/combatStore';
import { DMG_MAGIC_TABLES_META, DmgMagicTableId } from '../../data/dmgMagicTables';
import { localizeRarity, localizeItemType } from '../../utils/textUtils';

interface LootGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LootGeneratorModal: React.FC<LootGeneratorModalProps> = ({ isOpen, onClose }) => {
  const partyMembers = usePartyStore((s) => s.members);
  const updateMember = usePartyStore((s) => s.updateMember);
  const addTreasury = usePartyStore((s) => s.addTreasury);
  const combatants = useCombatStore((s) => s.combatants);

  const [mode, setMode] = useState<LootMode>('individual');
  const [selectedCr, setSelectedCr] = useState<number>(3);
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('Any');
  const [selectedMagicTable, setSelectedMagicTable] = useState<DmgMagicTableId>('F');
  const [playerCount, setPlayerCount] = useState<number>(Math.max(1, partyMembers.length || 4));

  // d100 Die State (supports direct input and rolling)
  const [d100Value, setD100Value] = useState<number>(50);
  const [d100InputText, setD100InputText] = useState<string>('50');
  const [isRollingDie, setIsRollingDie] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lootResult, setLootResult] = useState<GeneratedLoot | null>(null);
  const [addedToTreasury, setAddedToTreasury] = useState<boolean>(false);
  const [assignedItemNotice, setAssignedItemNotice] = useState<string | null>(null);

  useEffect(() => {
    setD100InputText(String(d100Value));
  }, [d100Value]);

  if (!isOpen) return null;

  const enemyCombatants = combatants.filter((c) => !c.isPlayer);

  // Handle rolling the d100 percentile tens die (10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
  const handleRollD100 = () => {
    setIsRollingDie(true);
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      const tens = (Math.floor(Math.random() * 10) + 1) * 10;
      setD100Value(tens);
      setD100InputText(String(tens));
      if (counter > 8) {
        clearInterval(interval);
        setIsRollingDie(false);
      }
    }, 40);
  };

  // Handle manual input of d100 number (10, 20, 30 ... 100)
  const handleD100InputChange = (val: string) => {
    setD100InputText(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(10, Math.min(100, parsed));
      setD100Value(clamped);
    }
  };

  const setD100Preset = (num: number) => {
    setD100Value(num);
    setD100InputText(String(num));
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setAddedToTreasury(false);
    setAssignedItemNotice(null);
    try {
      let result: GeneratedLoot;
      if (mode === 'individual') {
        result = await lootService.generateIndividualLoot(selectedCr, playerCount, d100Value);
      } else if (mode === 'hoard') {
        result = await lootService.generateHoardLoot(selectedTier, selectedCategory, playerCount, d100Value);
      } else if (mode === 'magic_table') {
        result = await lootService.generateFromMagicTable(selectedMagicTable, d100Value, playerCount);
      } else {
        const enemies = enemyCombatants.map((e) => ({
          name: e.name,
          maxHp: e.maxHp,
          type: 'enemy',
        }));
        result = await lootService.generateLootFromCombat(enemies, playerCount, d100Value);
      }
      setLootResult(result);
    } catch (e) {
      console.error('Error generating loot:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositToTreasury = () => {
    if (!lootResult || addedToTreasury) return;
    const rem = lootResult.partySplit.remainder;
    addTreasury(rem.gp, rem.sp, rem.cp);
    setAddedToTreasury(true);
  };

  const handleGiveItemToPlayer = (item: LootMagicItem, memberId: string) => {
    const member = partyMembers.find((m) => m.id === memberId);
    if (!member) return;

    const currentNotes = member.notes ? `${member.notes}\n• [Инвентарь]: ${item.name}` : `• [Инвентарь]: ${item.name}`;
    updateMember(member.id, { notes: currentNotes });
    setAssignedItemNotice(`Предмет "${item.name}" добавлен в заметки ${member.name}!`);
    setTimeout(() => setAssignedItemNotice(null), 3000);
  };

  const getRarityBadgeColor = (rarity?: string) => {
    switch (rarity?.toLowerCase()) {
      case 'uncommon':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-emerald-950/30';
      case 'rare':
        return 'bg-sky-950/80 text-sky-300 border-sky-700/60 shadow-sky-950/30';
      case 'very rare':
      case 'very_rare':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/60 shadow-purple-950/30';
      case 'legendary':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/80 shadow-amber-950/40';
      case 'artifact':
        return 'bg-rose-950/90 text-rose-300 border-rose-500/80 shadow-rose-950/50';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto select-none font-sans">
      <div className="bg-[rgba(18,22,30,0.9)] backdrop-blur-2xl border border-[rgba(255,255,255,0.08)] rounded-glass-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[rgba(14,18,25,0.7)] gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-glass bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,185,32,0.2)] shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Генератор сокровищ и кубик d100</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                  D&D 2024 / DMG
                </span>
              </h2>
              <p className="text-xs text-gray-400 break-words leading-relaxed">
                Кубик d100, официальные таблицы сокровищниц, распределение по отряду и прямой экспорт
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-glass text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TOP: Dedicated d100 Loot Die Control Hub */}
          <div className="bg-[rgba(24,29,40,0.65)] border border-amber-500/30 rounded-glass-xl p-4 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Big Die Display */}
              <div
                className={`relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-glass-lg bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-900/40 flex items-center justify-center transition-transform ${
                  isRollingDie ? 'scale-110 rotate-12 animate-pulse' : ''
                }`}
              >
                <div className="w-full h-full bg-[#0c0e14] rounded-[12px] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-amber-500/80 tracking-widest uppercase">d100</span>
                  <span className="text-xl font-black text-amber-300 font-mono tracking-tighter">
                    {d100Value}
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Кубик десятков d100</h3>
                  <span className="text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
                    Грани: 10, 20, 30 ... 100
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Каждая грань определяет строку в таблицах добычи DMG или ранг предмета
                </p>
              </div>
            </div>

            {/* Die Input & Roll Actions */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto min-w-0">
              {/* Direct numeric input */}
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 focus-within:border-amber-500/80 shadow-inner shrink-0">
                <span className="text-xs text-zinc-500 font-mono mr-2">d100:</span>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="10"
                  value={d100InputText}
                  onChange={(e) => handleD100InputChange(e.target.value)}
                  className="w-14 bg-transparent text-sm font-bold font-mono text-amber-300 focus:outline-none text-center"
                  placeholder="50"
                />
              </div>

              {/* Quick Presets: The 10 faces of the d100 tens die */}
              <div className="flex flex-wrap items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 max-w-full">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setD100Preset(preset)}
                    className={`px-1.5 py-1 min-w-[26px] text-center rounded-lg text-xs font-mono font-bold leading-tight transition-colors shrink-0 ${
                      d100Value === preset
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Roll button */}
              <button
                type="button"
                onClick={handleRollD100}
                disabled={isRollingDie}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm shrink-0"
              >
                <Dices className={`w-4 h-4 ${isRollingDie ? 'animate-spin' : ''}`} />
                Бросить
              </button>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMode('individual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                    mode === 'individual'
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  Индивидуальная (КО)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('hoard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                    mode === 'hoard'
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Gem className="w-3.5 h-3.5" />
                  Сокровищница (Тиры 1–4)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('magic_table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                    mode === 'magic_table'
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Таблицы магии DMG (A–I)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('combat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                    mode === 'combat'
                      ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  Добыча из боя ({enemyCombatants.length} врагов)
                </button>
              </div>

              {/* Party Player Count */}
              <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-400">Героев в отряде:</span>
                <button
                  type="button"
                  onClick={() => setPlayerCount((c) => Math.max(1, c - 1))}
                  className="w-5 h-5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="font-bold text-amber-300 min-w-[16px] text-center font-mono">
                  {playerCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPlayerCount((c) => Math.min(12, c + 1))}
                  className="w-5 h-5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Mode-Specific Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/60">
              {mode === 'individual' && (
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Класс опасности (КО / CR):</label>
                  <select
                    value={selectedCr}
                    onChange={(e) => setSelectedCr(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="0.25">КО 1/4 (Гоблины, скелеты, крысы)</option>
                    <option value="1">КО 1 (Лютоволк, шпион, гарпия)</option>
                    <option value="2">КО 2 (Огр, разбойник-капитан, пегас)</option>
                    <option value="3">КО 3 (Рыцарь, мумия, василиск)</option>
                    <option value="4">КО 4 (Эттин, ламия, призрак)</option>
                    <option value="5">КО 5 (Тролль, гладиатор, элементаль)</option>
                    <option value="8">КО 8 (Молодой зелёный дракон)</option>
                    <option value="10">КО 10 (Аболет, дева, каменный голем)</option>
                    <option value="12">КО 12 (Архимаг, военачальник)</option>
                    <option value="15">КО 15 (Пурпурный червь, мумия-лорд)</option>
                    <option value="17">КО 17+ (Взрослый красный дракон, лич)</option>
                  </select>
                </div>
              )}

              {mode === 'hoard' && (
                <>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Тир сокровищницы:</label>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="1">Тир 1 (КО 0–4) — Начальный уровень (Самоцветы 10/50 зм, искусство 25 зм, Таблицы A–G)</option>
                      <option value="2">Тир 2 (КО 5–10) — Герои королевства (Самоцветы 50/100 зм, искусство 250 зм, Таблицы A–H)</option>
                      <option value="3">Тир 3 (КО 11–16) — Защитники мира (Самоцветы 500 зм, искусство 750 зм, Таблицы C–H)</option>
                      <option value="4">Тир 4 (КО 17+) — Легенды мультивселенной (Самоцветы 1000 зм, искусство 750 зм, Таблица I)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Категория магии (приоритет):</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Any">Любая категория (по правилам DMG)</option>
                      <option value="Weapon">Оружие</option>
                      <option value="Armor">Доспехи и щиты</option>
                      <option value="Potion">Зелья</option>
                      <option value="Scroll">Свитки</option>
                      <option value="Wondrous Item">Чудесные предметы</option>
                      <option value="Ring">Кольца</option>
                      <option value="Wand">Волшебные палочки</option>
                      <option value="Rod">Жезлы</option>
                      <option value="Staff">Посохи</option>
                    </select>
                  </div>
                </>
              )}

              {mode === 'magic_table' && (
                <div className="md:col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Официальная таблица предметов DMG:</label>
                  <select
                    value={selectedMagicTable}
                    onChange={(e) => setSelectedMagicTable(e.target.value as DmgMagicTableId)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
                  >
                    {Object.values(DMG_MAGIC_TABLES_META).map((meta) => (
                      <option key={meta.id} value={meta.id}>
                        {meta.nameRu} — {meta.tierHint}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-400 mt-1 italic">
                    {DMG_MAGIC_TABLES_META[selectedMagicTable]?.descriptionRu}
                  </p>
                </div>
              )}


              {mode === 'combat' && (
                <div className="md:col-span-2 flex items-center gap-2.5 text-xs text-zinc-400 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <Swords className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>
                    Добыча рассчитывается от силы {enemyCombatants.length} противников в бою. Бросок d100 ({d100Value})
                    определяет удачу обыска: от скудных остатков (d100 &lt; 30) до скрытых тайников командира с самоцветами
                    (d100 &gt; 90).
                  </span>
                </div>
              )}

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full bg-gold hover:bg-gold-light text-[#12181c] font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-gold-glow transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Сгенерировать добычу по d100 ({d100Value})
                </button>
              </div>
            </div>
          </div>

          {/* Assigned notice banner */}
          {assignedItemNotice && (
            <div className="p-3 rounded-xl bg-sky-950/60 border border-sky-700/60 text-sky-200 text-xs flex items-center gap-2 animate-in fade-in">
              <UserCheck className="w-4 h-4 text-sky-400" />
              <span>{assignedItemNotice}</span>
            </div>
          )}

          {/* Result Display */}
          {lootResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Table Bracket readout badge */}
              {lootResult.bracketInfo && (
                <div className="px-4 py-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold shrink-0">🎯 Результат d100 ({lootResult.d100Roll ?? d100Value}):</span>
                    <span className="break-words">{lootResult.bracketInfo}</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 shrink-0">{lootResult.tierOrCr}</span>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Total Value */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between min-w-0">
                  <div className="text-xs text-zinc-400 flex items-center justify-between">
                    <span>Общая ценность</span>
                    <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-400 tracking-tight">
                    ~{lootResult.totalGpEquivalent} <span className="text-sm font-semibold">зм</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Режим: {lootResult.tierOrCr}
                  </div>
                </div>

                {/* Coins details */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 md:col-span-2 flex flex-col justify-between min-w-0">
                  <div className="text-xs text-zinc-400 flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span>Выпавшие монеты</span>
                    <span className="text-[11px] text-zinc-500">
                      Все номиналы D&D 2024
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lootResult.coins.pp > 0 && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 font-mono text-sm flex items-center gap-1.5 shadow-inner shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm shrink-0" />
                        <span className="font-bold">{lootResult.coins.pp}</span>
                        <span className="text-xs text-zinc-400">пм</span>
                      </div>
                    )}
                    {lootResult.coins.gp > 0 && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-300 font-mono text-sm flex items-center gap-1.5 shadow-inner shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm shrink-0" />
                        <span className="font-bold">{lootResult.coins.gp}</span>
                        <span className="text-xs text-amber-500/80">зм</span>
                      </div>
                    )}
                    {lootResult.coins.ep > 0 && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-700/40 text-emerald-300 font-mono text-sm flex items-center gap-1.5 shadow-inner shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm shrink-0" />
                        <span className="font-bold">{lootResult.coins.ep}</span>
                        <span className="text-xs text-emerald-500/80">эм</span>
                      </div>
                    )}
                    {lootResult.coins.sp > 0 && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono text-sm flex items-center gap-1.5 shadow-inner shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block shadow-sm shrink-0" />
                        <span className="font-bold">{lootResult.coins.sp}</span>
                        <span className="text-xs text-slate-400">см</span>
                      </div>
                    )}
                    {lootResult.coins.cp > 0 && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-orange-950/30 border border-orange-800/40 text-orange-300 font-mono text-sm flex items-center gap-1.5 shadow-inner shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-700 inline-block shadow-sm shrink-0" />
                        <span className="font-bold">{lootResult.coins.cp}</span>
                        <span className="text-xs text-orange-400/80">мм</span>
                      </div>
                    )}
                    {lootResult.coins.gp === 0 &&
                      lootResult.coins.sp === 0 &&
                      lootResult.coins.cp === 0 &&
                      lootResult.coins.pp === 0 &&
                      lootResult.coins.ep === 0 && (
                        <span className="text-xs text-zinc-500 italic">Монет не выпало</span>
                      )}
                  </div>
                </div>
              </div>

              {/* Party Share Banner */}
              {lootResult.totalGpEquivalent > 0 && (
                <div className="bg-emerald-950/25 border border-emerald-800/40 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 min-w-0">
                  <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                    <div className="text-xs font-medium text-zinc-200 min-w-0 break-words leading-relaxed">
                      <span className="text-emerald-400 font-semibold mr-1.5">
                        Делёж на {lootResult.partySplit.playerCount} участников:
                      </span>
                      <span className="break-words leading-relaxed">{lootResult.partySplit.summaryRu}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDepositToTreasury}
                    disabled={addedToTreasury}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shrink-0 w-full sm:w-auto justify-center ${
                      addedToTreasury
                        ? 'bg-emerald-950 border border-emerald-700/60 text-emerald-300 opacity-90'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                    }`}
                  >
                    {addedToTreasury ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        Внесено в казну
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" />
                        Пополнить казну отряда
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Items & Valuables Sections */}
              {lootResult.magicItems.length === 0 &&
              lootResult.valuables.length === 0 &&
              lootResult.trinkets.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/60 text-center text-xs text-zinc-500 italic">
                  Магических артефактов и самоцветов при этом броске d100 не выпало.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Magic Items */}
                  {lootResult.magicItems.length > 0 && (
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3 min-w-0">
                      <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                        Магические предметы ({lootResult.magicItems.length})
                      </h3>

                      <div className="space-y-2.5">
                        {lootResult.magicItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 transition-colors space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-bold text-zinc-100 block break-words leading-snug">{item.name}</span>
                                {item.name_en && (
                                  <span className="text-[11px] text-zinc-500 italic font-mono block break-words leading-tight mt-0.5">{item.name_en}</span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap leading-tight ${getRarityBadgeColor(
                                  item.rarity
                                )}`}
                              >
                                {localizeRarity(item.rarity)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                              {item.type && (
                                <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 break-words max-w-full leading-tight">
                                  {localizeItemType(item.type)}
                                </span>
                              )}
                              {item.attunement && (
                                <span className="bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-600/30 whitespace-nowrap leading-tight">
                                  Требует настройки
                                </span>
                              )}
                              {item.cost_gp && (
                                <span className="text-amber-400 font-bold ml-auto shrink-0 whitespace-nowrap leading-tight">
                                  {item.cost_gp} зм
                                </span>
                              )}
                            </div>

                            {item.tableSource && (
                              <div className="text-[10px] text-zinc-500 italic bg-zinc-900/60 p-1.5 rounded border border-zinc-800/60 break-words leading-tight">
                                Источник: {item.tableSource}
                              </div>
                            )}

                            {item.desc && (
                              <p
                                className="text-xs text-zinc-300 leading-relaxed mt-1 break-words line-clamp-2 hover:line-clamp-none cursor-pointer transition-all"
                                title="Нажмите, чтобы развернуть/свернуть описание"
                              >
                                {item.desc}
                              </p>
                            )}

                            {/* Give Item to Player Dropdown */}
                            {partyMembers.length > 0 && (
                              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 min-w-0">
                                <span className="text-[11px] text-zinc-400 flex items-center gap-1 shrink-0">
                                  <Users className="w-3 h-3 text-zinc-400" />
                                  Передать герою:
                                </span>
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleGiveItemToPlayer(item, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  defaultValue=""
                                  className="w-full sm:w-auto max-w-full sm:max-w-[220px] min-w-0 truncate bg-zinc-900 border border-zinc-700/80 text-[11px] text-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500"
                                >
                                  <option value="" disabled>
                                    Выбрать персонажа...
                                  </option>
                                  {partyMembers.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.characterClass || 'Игрок'})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valuables (Gems, Art & Trinkets) */}
                  {(lootResult.valuables.length > 0 || lootResult.trinkets.length > 0) && (
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-4 min-w-0">
                      {lootResult.valuables.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                            <Gem className="w-4 h-4 text-cyan-400 shrink-0" />
                            Драгоценные камни и искусство ({lootResult.valuables.length})
                          </h3>

                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {lootResult.valuables.map((val, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs gap-2 min-w-0"
                              >
                                <span className="text-zinc-300 flex items-center gap-2 min-w-0 break-words flex-1">
                                  {val.category === 'gem' ? (
                                    <Gem className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  ) : (
                                    <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  )}
                                  <span className="break-words leading-tight">{val.name}</span>
                                </span>
                                <span className="font-mono font-bold text-amber-400 shrink-0 ml-auto whitespace-nowrap">
                                  {val.valueGp} зм
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trinkets */}
                      {lootResult.trinkets.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <Backpack className="w-4 h-4 text-amber-600 shrink-0" />
                            Безделушки в карманах ({lootResult.trinkets.length})
                          </h3>
                          <div className="space-y-1">
                            {lootResult.trinkets.map((t, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/60 text-xs text-zinc-400 italic break-words leading-relaxed"
                              >
                                • {t}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-2 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
