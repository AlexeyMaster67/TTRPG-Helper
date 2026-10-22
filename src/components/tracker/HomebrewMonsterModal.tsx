import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  Shield,
  Heart,
  Zap,
  Sparkles,
  Swords,
  Image as ImageIcon,
  Footprints,
  AlertTriangle,
} from 'lucide-react';
import { CreatureSize, CREATURE_SIZE_SCALE } from '../../types/dnd5e';
import { MonsterAction, ParsedMonster } from '../../types/database';
import { useCombatStore } from '../../store/combatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { homebrewService, getProficiencyBonusByCr } from '../../services/homebrewService';

interface HomebrewMonsterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (monster: ParsedMonster) => void;
  initialData?: Partial<ParsedMonster>;
}

const CREATURE_TYPES = [
  'гуманоид',
  'нежить',
  'чудовище',
  'дракон',
  'зверь',
  'исчадие',
  'аберрация',
  'элементаль',
  'великан',
  'фея',
  'конструкт',
  'небожитель',
  'слизь',
  'растение',
];

const SIZE_OPTIONS: { id: CreatureSize; labelRu: string; gridDesc: string }[] = [
  { id: 'Tiny', labelRu: 'Крошечный', gridDesc: '0.5×0.5 клетки' },
  { id: 'Small', labelRu: 'Маленький', gridDesc: '1×1 клетка' },
  { id: 'Medium', labelRu: 'Средний', gridDesc: '1×1 клетка' },
  { id: 'Large', labelRu: 'Большой', gridDesc: '2×2 клетки' },
  { id: 'Huge', labelRu: 'Огромный', gridDesc: '3×3 клетки' },
  { id: 'Gargantuan', labelRu: 'Громадный', gridDesc: '4×4 клетки' },
];

const CR_OPTIONS = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23',
  '24', '25', '26', '27', '28', '29', '30'
];

const DAMAGE_TYPES: { id: string; labelRu: string }[] = [
  { id: 'Slashing', labelRu: 'Рубящий' },
  { id: 'Piercing', labelRu: 'Колющий' },
  { id: 'Bludgeoning', labelRu: 'Дробящий' },
  { id: 'Fire', labelRu: 'Огонь' },
  { id: 'Cold', labelRu: 'Холод' },
  { id: 'Lightning', labelRu: 'Электричество' },
  { id: 'Poison', labelRu: 'Яд' },
  { id: 'Acid', labelRu: 'Кислота' },
  { id: 'Psychic', labelRu: 'Психический' },
  { id: 'Necrotic', labelRu: 'Некротический' },
  { id: 'Radiant', labelRu: 'Излучение' },
  { id: 'Force', labelRu: 'Силовое поле' },
  { id: 'Thunder', labelRu: 'Звук' },
];

function calcMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// Estimate average HP from formula e.g. 10d10+40 or 3d8+6
function estimateHpFromFormula(formula: string): number | null {
  const clean = formula.trim().replace(/\s+/g, '');
  const match = clean.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/i);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const die = parseInt(match[2], 10);
  const sign = match[3] === '-' ? -1 : 1;
  const bonus = match[4] ? parseInt(match[4], 10) * sign : 0;
  const avgPerDie = (die + 1) / 2;
  return Math.floor(count * avgPerDie + bonus);
}

export function HomebrewMonsterModal({
  isOpen,
  onClose,
  onCreated,
  initialData,
}: HomebrewMonsterModalProps) {
  const isEn = useSettingsStore((s) => s.language === 'en');
  const addCombatant = useCombatStore((s) => s.addCombatant);

  // Form State
  const [nameRu, setNameRu] = useState(initialData?.name_ru || '');
  const [nameEn, setNameEn] = useState(initialData?.name_en || '');
  const [size, setSize] = useState<CreatureSize>((initialData?.size as CreatureSize) || 'Medium');
  const [creatureType, setCreatureType] = useState(initialData?.creature_type_ru || 'чудовище');
  const [alignment, setAlignment] = useState(initialData?.alignment || 'нейтральный');
  const [cr, setCr] = useState(initialData?.cr || '1');

  const [ac, setAc] = useState(initialData?.ac ?? 12);
  const [hpAverage, setHpAverage] = useState(initialData?.hp_average ?? 22);
  const [hpFormula, setHpFormula] = useState(initialData?.hp_formula || '4d8 + 4');
  const [speed, setSpeed] = useState(initialData?.speed || '30 фт.');
  const [tokenUrl, setTokenUrl] = useState((initialData as any)?.token_url || (initialData as any)?.avatarUrl || '');

  // Ability scores
  const [str, setStr] = useState(initialData?.str ?? 10);
  const [dex, setDex] = useState(initialData?.dex ?? 10);
  const [con, setCon] = useState(initialData?.con ?? 10);
  const [intellect, setIntellect] = useState(initialData?.intellect ?? 10);
  const [wis, setWis] = useState(initialData?.wis ?? 10);
  const [cha, setCha] = useState(initialData?.cha ?? 10);

  // Actions
  const [actions, setActions] = useState<MonsterAction[]>(
    initialData?.actions && initialData.actions.length > 0
      ? initialData.actions
      : [
          {
            name: 'Удар когтями',
            attack_bonus: 4,
            damage_dice: '1d8 + 2',
            damage_bonus: 2,
            damage_type: 'Slashing',
            desc: 'Рукопашная атака: досягаемость 5 фт. Попадание: рубящий урон.',
          },
        ]
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Re-synchronize state whenever modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setNameRu(initialData?.name_ru || '');
      setNameEn(initialData?.name_en || '');
      setSize((initialData?.size as CreatureSize) || 'Medium');
      setCreatureType(initialData?.creature_type_ru || initialData?.creature_type || 'чудовище');
      setAlignment(initialData?.alignment || 'нейтральный');
      setCr(initialData?.cr || '1');
      setAc(initialData?.ac ?? 12);
      setHpAverage(initialData?.hp_average ?? 22);
      setHpFormula(initialData?.hp_formula || '4d8 + 4');
      setSpeed(initialData?.speed || '30 фт.');
      setTokenUrl((initialData as any)?.token_url || (initialData as any)?.avatarUrl || '');
      setStr(initialData?.str ?? 10);
      setDex(initialData?.dex ?? 10);
      setCon(initialData?.con ?? 10);
      setIntellect(initialData?.intellect ?? 10);
      setWis(initialData?.wis ?? 10);
      setCha(initialData?.cha ?? 10);
      setActions(
        initialData?.actions && initialData.actions.length > 0
          ? initialData.actions.map((a) => ({ ...a }))
          : [
              {
                name: 'Удар когтями',
                attack_bonus: 4,
                damage_dice: '1d8 + 2',
                damage_bonus: 2,
                damage_type: 'Slashing',
                desc: 'Рукопашная атака: досягаемость 5 фт. Попадание: рубящий урон.',
              },
            ]
      );
      setErrorMessage(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Auto-calculated modifiers
  const strMod = calcMod(str);
  const dexMod = calcMod(dex);
  const conMod = calcMod(con);
  const intMod = calcMod(intellect);
  const wisMod = calcMod(wis);
  const chaMod = calcMod(cha);
  const pb = getProficiencyBonusByCr(cr);

  const handleHpFormulaChange = (val: string) => {
    setHpFormula(val);
    const est = estimateHpFromFormula(val);
    if (est !== null && est > 0) {
      setHpAverage(est);
    }
  };

  const handleAddAction = () => {
    const defaultBonus = pb + Math.max(strMod, dexMod);
    const defaultDice = '1d8 + ' + Math.max(1, Math.max(strMod, dexMod));
    setActions((prev) => [
      ...prev,
      {
        name: `Новая атака #${prev.length + 1}`,
        attack_bonus: defaultBonus,
        damage_dice: defaultDice,
        damage_bonus: Math.max(strMod, dexMod),
        damage_type: 'Slashing',
        desc: `Рукопашная атака: +${defaultBonus} к попаданию, досягаемость 5 фт. Попадание: (${defaultDice}) урона.`,
      },
    ]);
  };

  const handleUpdateAction = (index: number, updates: Partial<MonsterAction>) => {
    setActions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const constructMonster = (): ParsedMonster => {
    const cleanRu = nameRu.trim() || 'Безымянное существо';
    const cleanEn = nameEn.trim() || cleanRu;
    const sizeRuMap: Record<CreatureSize, string> = {
      Tiny: 'Крошечный',
      Small: 'Маленький',
      Medium: 'Средний',
      Large: 'Большой',
      Huge: 'Огромный',
      Gargantuan: 'Громадный',
    };

    // Generate new custom ID if no ID or if this was cloned/not starting with custom-
    const monsterId =
      initialData?.id && initialData.id.startsWith('custom-')
        ? initialData.id
        : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const finalMonster: ParsedMonster = {
      id: monsterId,
      name_ru: cleanRu,
      name_en: cleanEn,
      size,
      size_ru: sizeRuMap[size] || 'Средний',
      creature_type: creatureType,
      creature_type_ru: creatureType,
      alignment,
      ac: Number(ac) || 10,
      hp_average: Number(hpAverage) || 10,
      hp_formula: hpFormula.trim() || `${Number(hpAverage) || 10}`,
      speed: speed.trim() || '30 фт.',
      init_bonus: dexMod,
      passive_init: 10 + dexMod,
      cr: String(cr),
      pb,
      str,
      dex,
      con,
      intellect,
      wis,
      cha,
      saves: initialData?.saves ? { ...initialData.saves } : {},
      skills: initialData?.skills ? { ...initialData.skills } : {},
      damage_vulnerabilities: initialData?.damage_vulnerabilities || '',
      damage_resistances: initialData?.damage_resistances || '',
      damage_immunities: initialData?.damage_immunities || '',
      condition_immunities: initialData?.condition_immunities || '',
      senses: initialData?.senses || 'Пасс. Внимание ' + (10 + wisMod),
      languages: initialData?.languages || 'Общий',
      traits: initialData?.traits ? initialData.traits.map((t) => ({ ...t })) : [],
      actions: actions.map((a) => ({
        ...a,
        attack_bonus: Number(a.attack_bonus) || 0,
        damage_dice: a.damage_dice || '1d8',
      })),
      bonus_actions: initialData?.bonus_actions ? initialData.bonus_actions.map((b) => ({ ...b })) : [],
      reactions: initialData?.reactions ? initialData.reactions.map((r) => ({ ...r })) : [],
      legendary_actions: initialData?.legendary_actions ? initialData.legendary_actions.map((l) => ({ ...l })) : [],
      spells: initialData?.spells ? [...initialData.spells] : [],
      source: 'Кастомный (Homebrew)',
      is_srd: false,
      is_custom: true,
      token_url: tokenUrl.trim() || undefined,
    };

    return finalMonster;
  };

  const handleSaveToBestiary = async () => {
    if (!nameRu.trim() && !nameEn.trim()) {
      setErrorMessage('Пожалуйста, введите название существа!');
      return;
    }
    setErrorMessage(null);

    const monster = constructMonster();
    await homebrewService.saveCustomMonster(monster);
    if (onCreated) onCreated(monster);
    onClose();
  };

  const handleAddToCombatNow = async () => {
    if (!nameRu.trim() && !nameEn.trim()) {
      setErrorMessage('Пожалуйста, введите название существа!');
      return;
    }
    setErrorMessage(null);

    const monster = constructMonster();
    await homebrewService.saveCustomMonster(monster);

    // Roll initiative
    const d20 = Math.floor(Math.random() * 20) + 1;
    const rolledInit = d20 + dexMod;

    addCombatant({
      name: monster.name_ru || monster.name_en,
      nameRu: monster.name_ru || monster.name_en,
      cr: monster.cr,
      creatureType: monster.creature_type_ru || monster.creature_type,
      size: monster.size as CreatureSize,
      tokenScale: CREATURE_SIZE_SCALE[monster.size as CreatureSize] || 1.0,
      tokenUrl: monster.token_url,
      avatarUrl: monster.token_url,
      hp: monster.hp_average,
      maxHp: monster.hp_average,
      ac: monster.ac,
      initiative: rolledInit,
      initBonus: dexMod,
      speed: monster.speed,
      color: '#C5A059',
      statblock: monster,
    });

    if (onCreated) onCreated(monster);
    onClose();
  };

  // Render via React Portal to document.body so that parent container styles
  // (e.g. backdrop-filter on the sidebar) do not trap position: fixed
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-[rgba(18,22,30,0.96)] backdrop-blur-xl border border-[rgba(255,255,255,0.12)] rounded-glass-xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.08)] bg-gradient-to-r from-[rgba(245,185,32,0.12)] via-[rgba(255,255,255,0.02)] to-transparent flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-glass flex items-center justify-center bg-[#f5b920]/15 border border-[#f5b920]/30 text-[#f5b920] flex-shrink-0 shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-sm sm:text-base text-gray-100 tracking-wide truncate">
                  {isEn ? "Create Custom Creature" : "Создание существа"}
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f5b920]/15 text-[#fce79f] border border-[#f5b920]/30 font-mono flex-shrink-0">
                  D&D 2024
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">
                {isEn ? "Fill in the combat statblock to save to bestiary or deploy to combat" : "Заполните боевой профиль для сохранения в бестиарий или немедленного добавления в бой"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-glass hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
            title={isEn ? "Close" : "Закрыть"}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 font-sans text-xs text-gray-200">
          {errorMessage && (
            <div className="p-3 rounded-glass bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Names, Size, Type, CR */}
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-glass-lg p-3.5 space-y-3 shadow-sm">
            <span className="text-[11px] font-bold text-[#fce79f] uppercase tracking-wider block font-sans">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[#f5b920] inline" />
                <span>{isEn ? "Basic Information" : "Основная информация"}</span>
              </span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-300 block mb-1">
                  {isEn ? "Name (Russian)" : "Название на русском"} <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  value={nameRu}
                  onChange={(e) => setNameRu(e.target.value)}
                  placeholder={isEn ? "e.g. Shadow Stalker" : "Например: Теневой ловец"}
                  className="w-full h-8 px-3 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-gray-100 text-xs focus:outline-none focus:border-[#f5b920] focus:ring-1 focus:ring-[#f5b920] transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-300 block mb-1">
                  {isEn ? "Name (English, optional):" : "Название на английском (необязательно):"}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Например: Shadow Stalker"
                  className="w-full h-8 px-3 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-gray-100 text-xs focus:outline-none focus:border-[#f5b920] focus:ring-1 focus:ring-[#f5b920] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Size */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  {isEn ? "Size:" : "Размер:"}
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as CreatureSize)}
                  className="w-full h-8 px-2.5 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-gray-200 text-xs focus:outline-none focus:border-[#f5b920] cursor-pointer"
                >
                  {SIZE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-[#12161e] text-gray-200">
                      {opt.labelRu} ({opt.gridDesc})
                    </option>
                  ))}
                </select>
              </div>

              {/* Creature Type */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  {isEn ? "Creature Type:" : "Тип существа:"}
                </label>
                <select
                  value={creatureType}
                  onChange={(e) => setCreatureType(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-gray-200 text-xs focus:outline-none focus:border-[#f5b920] cursor-pointer"
                >
                  {CREATURE_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-[#12161e] text-gray-200">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* CR */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  {isEn ? "Challenge Rating (CR):" : "Класс опасности (КО):"}
                </label>
                <select
                  value={cr}
                  onChange={(e) => setCr(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-[#fce79f] font-mono font-bold text-xs focus:outline-none focus:border-[#f5b920] cursor-pointer"
                >
                  {CR_OPTIONS.map((c) => (
                    <option key={c} value={c} className="bg-[#12161e] text-gray-200">
                      КО {c} (БМ +{getProficiencyBonusByCr(c)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Alignment */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  {isEn ? "Alignment:" : "Мировоззрение:"}
                </label>
                <input
                  type="text"
                  value={alignment}
                  onChange={(e) => setAlignment(e.target.value)}
                  placeholder="нейтральный"
                  className="w-full h-8 px-2.5 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-gray-200 text-xs focus:outline-none focus:border-[#f5b920]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: AC, HP, Speed, Token URL */}
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-glass-lg p-3.5 space-y-3 shadow-sm">
            <span className="text-[11px] font-bold text-[#fce79f] uppercase tracking-wider block font-sans">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-[#f5b920] inline" />
                <span>{isEn ? "Combat Stats & Token" : "Боевые параметры и токен"}</span>
              </span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* AC */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1 mb-1">
                  <Shield className="h-3 w-3 text-[#f5b920]" />
                  <span>{isEn ? "Armor Class (AC):" : "Класс доспеха (КД):"}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={ac}
                  onChange={(e) => setAc(parseInt(e.target.value, 10) || 10)}
                  className="w-full h-8 px-2.5 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-white font-mono font-bold text-xs focus:outline-none focus:border-[#f5b920]"
                />
              </div>

              {/* HP Average */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1 mb-1">
                  <Heart className="h-3 w-3 text-rose-500" />
                  <span>{isEn ? "Hit Points (HP):" : "Хиты (ОЗ):"}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={hpAverage}
                  onChange={(e) => setHpAverage(parseInt(e.target.value, 10) || 10)}
                  className="w-full h-8 px-2.5 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-[#f5b920]"
                />
              </div>

              {/* HP Dice Formula */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  {isEn ? "Hit Dice:" : "Кость хитов:"}
                </label>
                <input
                  type="text"
                  value={hpFormula}
                  onChange={(e) => handleHpFormulaChange(e.target.value)}
                  placeholder="10d10 + 40"
                  className="w-full h-8 px-2.5 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-amber-300 font-mono text-xs focus:outline-none focus:border-[#f5b920]"
                />
              </div>

              {/* Speed */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1 mb-1">
                  <Footprints className="h-3 w-3 text-sky-400" />
                  <span>{isEn ? "Speed:" : "Скорость:"}</span>
                </label>
                <input
                  type="text"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  placeholder={isEn ? "30 ft., fly 60 ft." : "30 фт., полёт 60 фт."}
                  className="w-full h-8 px-2.5 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-sky-300 text-xs focus:outline-none focus:border-[#f5b920]"
                />
              </div>
            </div>

            {/* Token URL input with preview */}
            <div className="pt-1 flex items-center gap-3">
              <div className="w-11 h-11 rounded-glass border border-[rgba(255,255,255,0.15)] overflow-hidden bg-black/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                {tokenUrl ? (
                  <img
                    src={tokenUrl}
                    alt="Токен"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  {isEn ? "Token Image URL / Avatar:" : "Ссылка на изображение токена / аватара:"}
                </label>
                <input
                  type="text"
                  value={tokenUrl}
                  onChange={(e) => setTokenUrl(e.target.value)}
                  placeholder="https://example.com/token.png или data:image/..."
                  className="w-full h-8 px-3 rounded-glass bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] text-gray-200 text-xs focus:outline-none focus:border-[#f5b920]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Ability Scores */}
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-glass-lg p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#fce79f] uppercase tracking-wider font-sans">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-[#f5b920] inline" />
                  <span>{isEn ? "Ability Scores & Modifiers" : "Характеристики и модификаторы"}</span>
                </span>
              </span>
              <span className="text-[11px] font-mono text-gray-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                {isEn ? "Initiative:" : "Инициатива:"} <span className="text-[#f5b920] font-bold">{formatMod(dexMod)}</span> • БМ: <span className="text-[#f5b920] font-bold">+{pb}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-1">
              {[
                { label: isEn ? 'STR' : 'СИЛ', score: str, mod: strMod, set: setStr },
                { label: isEn ? 'DEX' : 'ЛОВ', score: dex, mod: dexMod, set: setDex },
                { label: isEn ? 'CON' : 'ТЕЛ', score: con, mod: conMod, set: setCon },
                { label: isEn ? 'INT' : 'ИНТ', score: intellect, mod: intMod, set: setIntellect },
                { label: isEn ? 'WIS' : 'МДР', score: wis, mod: wisMod, set: setWis },
                { label: isEn ? 'CHA' : 'ХАР', score: cha, mod: chaMod, set: setCha },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 rounded-glass p-2 flex flex-col items-center gap-1 transition-colors"
                >
                  <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                    {s.label}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={s.score}
                    onChange={(e) => s.set(parseInt(e.target.value, 10) || 10)}
                    className="w-12 h-6 text-center bg-transparent border-b border-[rgba(255,255,255,0.15)] font-mono font-bold text-sm text-white focus:outline-none focus:border-[#f5b920]"
                  />
                  <span className="text-[11px] font-mono font-bold text-[#fce79f] bg-[#f5b920]/15 px-2 py-0.5 rounded-full">
                    {formatMod(s.mod)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Actions list */}
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-glass-lg p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#fce79f] uppercase tracking-wider font-sans flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5 text-[#f5b920]" />
                <span>{isEn ? `Actions & Attacks (${actions.length})` : `Действия и Атаки (${actions.length})`}</span>
              </span>
              <button
                type="button"
                onClick={handleAddAction}
                className="min-h-[32px] px-3 py-1 rounded-glass bg-[#f5b920]/10 hover:bg-[#f5b920]/20 border border-[#f5b920]/30 text-[#fce79f] text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isEn ? "Add Attack" : "Добавить атаку"}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {actions.length === 0 ? (
                <div className="text-gray-500 text-xs italic text-center py-4 bg-black/20 rounded-glass border border-dashed border-white/10">
                  {isEn ? "No actions added yet. Click \"Add Attack\" to create one." : "Действия пока не добавлены. Нажмите «Добавить атаку», чтобы создать новую."}
                </div>
              ) : (
                actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-glass-lg bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.08)] space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={act.name}
                          onChange={(e) => handleUpdateAction(idx, { name: e.target.value })}
                          placeholder={isEn ? "Attack name (e.g. Longsword Strike)" : "Название атаки (например: Удар мечом)"}
                          className="w-full h-7 px-2.5 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] rounded-glass text-xs font-bold text-gray-100 focus:outline-none focus:border-[#f5b920]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAction(idx)}
                        className="text-gray-500 hover:text-rose-400 p-1.5 rounded-glass hover:bg-rose-500/10 transition-colors"
                        title={isEn ? "Remove action" : "Удалить действие"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Attack Bonus */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">
                          {isEn ? "Attack Bonus:" : "Бонус атаки:"}
                        </label>
                        <input
                          type="number"
                          value={act.attack_bonus ?? 0}
                          onChange={(e) =>
                            handleUpdateAction(idx, {
                              attack_bonus: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-full h-7 px-2 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] rounded-glass text-xs font-mono font-bold text-[#f5b920] focus:outline-none focus:border-[#f5b920]"
                        />
                      </div>

                      {/* Damage Dice */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">
                          {isEn ? "Damage Dice:" : "Кость урона:"}
                        </label>
                        <input
                          type="text"
                          value={act.damage_dice || '1d8'}
                          onChange={(e) =>
                            handleUpdateAction(idx, { damage_dice: e.target.value })
                          }
                          placeholder="2d8 + 4"
                          className="w-full h-7 px-2 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] rounded-glass text-xs font-mono text-emerald-400 focus:outline-none focus:border-[#f5b920]"
                        />
                      </div>

                      {/* Damage Type */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">
                          {isEn ? "Damage Type:" : "Тип урона:"}
                        </label>
                        <select
                          value={act.damage_type || 'Slashing'}
                          onChange={(e) =>
                            handleUpdateAction(idx, { damage_type: e.target.value })
                          }
                          className="w-full h-7 px-2 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] rounded-glass text-xs text-gray-200 focus:outline-none focus:border-[#f5b920] cursor-pointer"
                        >
                          {DAMAGE_TYPES.map((d) => (
                            <option key={d.id} value={d.id} className="bg-[#12161e] text-gray-200">
                              {d.labelRu}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <input
                        type="text"
                        value={act.desc || ''}
                        onChange={(e) => handleUpdateAction(idx, { desc: e.target.value })}
                        placeholder={isEn ? "Action description (reach, targets, additional effects...)" : "Описание действия (досягаемость, цели, доп. эффекты...)"}
                        className="w-full h-7 px-2.5 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.12)] rounded-glass text-[11px] text-gray-300 focus:outline-none focus:border-[#f5b920]"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="p-3.5 sm:p-4 bg-[rgba(14,18,25,0.85)] border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-3 flex-shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[34px] px-4 py-1.5 rounded-glass bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
          >
            {isEn ? "Cancel" : "Отмена"}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveToBestiary}
              className="min-h-[34px] px-4 py-1.5 rounded-glass bg-white/5 hover:bg-white/10 border border-[rgba(255,255,255,0.12)] hover:border-[#f5b920]/40 text-gray-200 hover:text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <span>{isEn ? "Save to Bestiary" : "Сохранить в бестиарий"}</span>
            </button>

            <button
              type="button"
              onClick={handleAddToCombatNow}
              className="min-h-[34px] px-4 py-1.5 rounded-glass bg-gradient-to-r from-[#f5b920] to-[#e5a812] hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-gold-glow flex items-center gap-1.5 active:scale-95"
            >
              <Zap className="h-3.5 w-3.5 text-black flex-shrink-0 fill-black" />
              <span>{isEn ? "Add to Combat Now" : "Добавить в бой сейчас"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
