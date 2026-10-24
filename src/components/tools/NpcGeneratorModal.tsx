import { useState } from 'react';
import {
  User,
  RefreshCw,
  Plus,
  Copy,
  Check,
  X,
  Shield,
  Heart,
  Swords,
} from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { useSettingsStore } from '../../store/settingsStore';

export interface LocalizedOption {
  id: string;
  ru: string;
  en: string;
}

export interface GeneratedNpc {
  nameRu: string;
  nameEn: string;
  raceRu: string;
  raceEn: string;
  raceId: string;
  occupationRu: string;
  occupationEn: string;
  occupationId: string;
  personalityRu: string;
  personalityEn: string;
  secretRu: string;
  secretEn: string;
  mannerismRu: string;
  mannerismEn: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  ac: number;
  hp: number;
  speedRu: string;
  speedEn: string;
  attackNameRu: string;
  attackNameEn: string;
  attackBonus: number;
  damageDice: string;
}

export const NPC_RACES: LocalizedOption[] = [
  { id: 'human', ru: 'Человек', en: 'Human' },
  { id: 'wood_elf', ru: 'Лесной эльф', en: 'Wood Elf' },
  { id: 'high_elf', ru: 'Высший эльф', en: 'High Elf' },
  { id: 'mountain_dwarf', ru: 'Горный дварф', en: 'Mountain Dwarf' },
  { id: 'hill_dwarf', ru: 'Холмовой дварф', en: 'Hill Dwarf' },
  { id: 'lightfoot_halfling', ru: 'Легконогий полурослик', en: 'Lightfoot Halfling' },
  { id: 'rock_gnome', ru: 'Скальный гном', en: 'Rock Gnome' },
  { id: 'tiefling', ru: 'Тифлинг', en: 'Tiefling' },
  { id: 'dragonborn', ru: 'Драконорождённый', en: 'Dragonborn' },
  { id: 'half_orc', ru: 'Полуорк', en: 'Half-Orc' },
];

export const NPC_OCCUPATIONS: LocalizedOption[] = [
  { id: 'innkeeper', ru: 'Трактирщик', en: 'Innkeeper' },
  { id: 'gate_guard', ru: 'Стражник ворот', en: 'Gate Guard' },
  { id: 'blacksmith', ru: 'Кузнец', en: 'Blacksmith' },
  { id: 'alchemist', ru: 'Алхимик', en: 'Alchemist' },
  { id: 'pickpocket', ru: 'Карманник', en: 'Pickpocket' },
  { id: 'mercenary', ru: 'Наёмник', en: 'Mercenary' },
  { id: 'priest', ru: 'Жрец местного храма', en: 'Temple Priest' },
  { id: 'merchant', ru: 'Странствующий купец', en: 'Traveling Merchant' },
  { id: 'town_crier', ru: 'Городской глашатай', en: 'Town Crier' },
  { id: 'fisherman', ru: 'Рыбак', en: 'Fisherman' },
  { id: 'librarian', ru: 'Библиотекарь', en: 'Librarian' },
  { id: 'smuggler', ru: 'Контрабандист', en: 'Smuggler' },
  { id: 'trapper', ru: 'Егерь', en: 'Trapper' },
  { id: 'healer', ru: 'Лекарь', en: 'Healer' },
  { id: 'weaver', ru: 'Ткач', en: 'Weaver' },
];

export const NPC_PERSONALITIES: { ru: string; en: string }[] = [
  {
    ru: 'Вечно подозрительный, прищуривается при разговоре',
    en: 'Always suspicious, constantly squints while talking',
  },
  {
    ru: 'Невероятно щедрый и добродушный, угощает всех элем',
    en: 'Incredibly generous and good-natured, offers ale to everyone',
  },
  {
    ru: 'Говорит быстро и постоянно перебивает собеседника',
    en: 'Speaks rapidly and frequently interrupts others',
  },
  {
    ru: 'Хладнокровный и немногословный, отвечает односложно',
    en: 'Cold-blooded and reserved, answers in monosyllables',
  },
  {
    ru: 'Хвастается былыми подвигами, приукрашивая правду',
    en: 'Boasts of past deeds, embellishing the truth',
  },
  {
    ru: 'Нервный, постоянно оглядывается по сторонам',
    en: 'Jumpy and nervous, constantly glancing around',
  },
  {
    ru: 'Философски относится к любым бедам: «Такова воля богов»',
    en: 'Philosophical about hardship: "Such is the will of the gods"',
  },
  {
    ru: 'Жадный до каждой медной монеты, торгуется до последнего',
    en: 'Penny-pincher down to every copper, haggles aggressively',
  },
  {
    ru: 'Искренне восхищается искателями приключений',
    en: 'Genuinely looks up to and admires adventurers',
  },
  {
    ru: 'Мрачный фаталист, уверенный в скором конце света',
    en: 'Grim fatalist, utterly convinced the world is ending soon',
  },
];

export const NPC_SECRETS: { ru: string; en: string }[] = [
  {
    ru: 'Тайно работает осведомителем местной гильдии воров',
    en: 'Secretly works as an informant for the local thieves guild',
  },
  {
    ru: 'Задолжал крупную сумму жестокому ростовщику',
    en: 'Owes a staggering debt to a ruthless moneylender',
  },
  {
    ru: 'Хранит под половицей старинный проклятый амулет',
    en: 'Hides an ancient cursed amulet beneath the floorboards',
  },
  {
    ru: 'Сбежавший дворянин, скрывающийся под чужим именем',
    en: 'A runaway noble living under a false alias',
  },
  {
    ru: 'Знает тайный проход в городскую канализацию под таверной',
    en: 'Knows a hidden passageway to the city sewers under the cellar',
  },
  {
    ru: 'Видел прошлой ночью подозрительных культистов у руин',
    en: 'Spotted suspicious cultists near the ruined chapel last night',
  },
  {
    ru: 'Отравил своего бывшего партнёра из-за золота',
    en: 'Poisoned a former business partner over a stash of gold',
  },
  {
    ru: 'Ищет пропавшего брата, ушедшего в подземелье',
    en: 'Searching desperately for a brother lost in the dungeon depths',
  },
  {
    ru: 'Является тайным культистом, но мечтает порвать с сектой',
    en: 'Secret cult initiate yearning to break free from the sect',
  },
  {
    ru: 'Прячет в подвале раненого дезертира',
    en: 'Harboring an injured army deserter in the basement',
  },
];

export const NPC_MANNERISMS: { ru: string; en: string }[] = [
  {
    ru: 'Хриплый прокуренный бас',
    en: 'Gruff, raspy gravelly voice',
  },
  {
    ru: 'Говорит полушёпотом, словно выдаёт великую тайну',
    en: 'Speaks in a conspiratorial half-whisper as if sharing secrets',
  },
  {
    ru: 'Часто покашливает в кулак перед тем, как ответить',
    en: 'Clears throat into a fist before answering any question',
  },
  {
    ru: 'Потирает шрам на подбородке во время раздумий',
    en: 'Absentmindedly rubs a scar on the chin while thinking',
  },
  {
    ru: 'Постоянно крутит в пальцах медную монетку',
    en: 'Constantly flips a copper coin through nimble fingers',
  },
  {
    ru: 'Улыбается не к месту широкой и жутковатой улыбкой',
    en: 'Smiles with an unsettlingly wide, misplaced grin',
  },
  {
    ru: 'Заикается на сложных словах',
    en: 'Stutters whenever reaching multisyllable words',
  },
  {
    ru: 'Часто отвлекается и переспрашивает: «А? Что вы сказали?»',
    en: 'Easily distracted, asks: "Eh? What did you just say?"',
  },
];

export const FIRST_NAMES_RU = [
  'Варрин', 'Элдрин', 'Торин', 'Балин', 'Мило', 'Брандон', 'Родерик',
  'Аларик', 'Корвус', 'Освальд', 'Герард', 'Фабиан', 'Дастин', 'Берен',
  'Лира', 'Мирабель', 'Элиза', 'Сильвия', 'Бринн', 'Каэла', 'Талия',
  'Морвенна', 'Астрид', 'Изольда', 'Гвендолин', 'Фрея', 'Юдифь',
];

export const FIRST_NAMES_EN = [
  'Varrin', 'Eldrin', 'Thorin', 'Balin', 'Milo', 'Brandon', 'Roderic',
  'Alaric', 'Corvus', 'Oswald', 'Gerard', 'Fabian', 'Dustin', 'Beren',
  'Lyra', 'Mirabelle', 'Eliza', 'Silvia', 'Brynn', 'Kaela', 'Thalia',
  'Morwenna', 'Astrid', 'Isolde', 'Gwendolyn', 'Freya', 'Judith',
];

export const LAST_NAMES_RU = [
  'Чернодрев', 'Ясноглаз', 'Железнорук', 'Камнелом', 'Быстроног',
  'Седоус', 'Ветрокрыл', 'Горнощит', 'Янтарь', 'Холодносерд',
  'Златогрив', 'Топорист', 'Дубокорыч', 'Тиховей', 'Стрелок',
];

export const LAST_NAMES_EN = [
  'Blackwood', 'Brighteye', 'Ironhand', 'Stonebreaker', 'Swiftfoot',
  'Greybeard', 'Windwing', 'Mountainshield', 'Amberfall', 'Coldheart',
  'Goldmane', 'Axebreaker', 'Oakhaven', 'Whisperwind', 'Truearrow',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollStat(): number {
  return 8 + Math.floor(Math.random() * 7);
}

export function generateRandomNpc(raceId?: string, occupationId?: string): GeneratedNpc {
  const chosenRace =
    raceId && raceId !== 'any'
      ? NPC_RACES.find((r) => r.id === raceId) ?? randomChoice(NPC_RACES)
      : randomChoice(NPC_RACES);

  const chosenOcc =
    occupationId && occupationId !== 'any'
      ? NPC_OCCUPATIONS.find((o) => o.id === occupationId) ?? randomChoice(NPC_OCCUPATIONS)
      : randomChoice(NPC_OCCUPATIONS);

  const firstIdx = Math.floor(Math.random() * FIRST_NAMES_RU.length);
  const lastIdx = Math.floor(Math.random() * LAST_NAMES_RU.length);

  const nameRu = `${FIRST_NAMES_RU[firstIdx]} ${LAST_NAMES_RU[lastIdx]}`;
  const nameEn = `${FIRST_NAMES_EN[firstIdx]} ${LAST_NAMES_EN[lastIdx]}`;

  const pers = randomChoice(NPC_PERSONALITIES);
  const sec = randomChoice(NPC_SECRETS);
  const man = randomChoice(NPC_MANNERISMS);

  const str = rollStat();
  const dex = rollStat();
  const con = rollStat();
  const int = rollStat();
  const wis = rollStat();
  const cha = rollStat();

  const ac = 10 + Math.floor((dex - 10) / 2);
  const hp = 8 + Math.floor((con - 10) / 2) * 2;

  return {
    nameRu,
    nameEn,
    raceRu: chosenRace.ru,
    raceEn: chosenRace.en,
    raceId: chosenRace.id,
    occupationRu: chosenOcc.ru,
    occupationEn: chosenOcc.en,
    occupationId: chosenOcc.id,
    personalityRu: pers.ru,
    personalityEn: pers.en,
    secretRu: sec.ru,
    secretEn: sec.en,
    mannerismRu: man.ru,
    mannerismEn: man.en,
    str,
    dex,
    con,
    int,
    wis,
    cha,
    ac: Math.max(10, ac),
    hp: Math.max(4, hp),
    speedRu: '30 фт.',
    speedEn: '30 ft.',
    attackNameRu: 'Кинжал / Дубинка',
    attackNameEn: 'Dagger / Club',
    attackBonus: Math.max(1, 2 + Math.floor((Math.max(str, dex) - 10) / 2)),
    damageDice: '1d4 + 1',
  };
}

interface NpcGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NpcGeneratorModal({ isOpen, onClose }: NpcGeneratorModalProps) {
  const language = useSettingsStore((s) => s.language);
  const isRu = language === 'ru';
  const addCombatant = useCombatStore((s) => s.addCombatant);

  const [selectedRace, setSelectedRace] = useState<string>('any');
  const [selectedOccupation, setSelectedOccupation] = useState<string>('any');
  const [npc, setNpc] = useState<GeneratedNpc>(() => generateRandomNpc());
  const [copied, setCopied] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = (raceId = selectedRace, occId = selectedOccupation) => {
    setNpc(generateRandomNpc(raceId, occId));
    setAddedNotice(false);
  };

  const handleRaceChange = (newRace: string) => {
    setSelectedRace(newRace);
    handleGenerate(newRace, selectedOccupation);
  };

  const handleOccupationChange = (newOcc: string) => {
    setSelectedOccupation(newOcc);
    handleGenerate(selectedRace, newOcc);
  };

  const handleAddToCombat = () => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const dexMod = Math.floor((npc.dex - 10) / 2);

    addCombatant({
      name: `${isRu ? npc.nameRu : npc.nameEn} (${isRu ? npc.occupationRu : npc.occupationEn})`,
      nameRu: `${npc.nameRu} (${npc.occupationRu})`,
      cr: '1/8',
      isPlayer: false,
      hp: npc.hp,
      maxHp: npc.hp,
      ac: npc.ac,
      initiative: d20 + dexMod,
      initBonus: dexMod,
      speed: isRu ? npc.speedRu : npc.speedEn,
      color: '#4B7BEC',
      tokenScale: 1.0,
      statblock: {
        id: `npc-${Date.now()}`,
        name_ru: npc.nameRu,
        name_en: npc.nameEn,
        size: 'Medium',
        size_ru: 'Средний',
        creature_type: 'humanoid',
        creature_type_ru: 'гуманоид',
        alignment: isRu ? 'нейтральный' : 'Neutral',
        ac: npc.ac,
        hp_average: npc.hp,
        hp_formula: `${npc.hp}`,
        speed: isRu ? npc.speedRu : npc.speedEn,
        init_bonus: dexMod,
        passive_init: 10 + dexMod,
        cr: '1/8',
        pb: 2,
        str: npc.str,
        dex: npc.dex,
        con: npc.con,
        intellect: npc.int,
        wis: npc.wis,
        cha: npc.cha,
        saves: {},
        skills: {},
        damage_vulnerabilities: '',
        damage_resistances: '',
        damage_immunities: '',
        condition_immunities: '',
        senses: isRu
          ? 'Пасс. Внимание ' + (10 + Math.floor((npc.wis - 10) / 2))
          : 'Passive Perception ' + (10 + Math.floor((npc.wis - 10) / 2)),
        languages: isRu ? 'Общий' : 'Common',
        traits: [
          { name: isRu ? 'Профессия' : 'Occupation', desc: isRu ? npc.occupationRu : npc.occupationEn },
          { name: isRu ? 'Черта характера' : 'Personality', desc: isRu ? npc.personalityRu : npc.personalityEn },
          { name: isRu ? 'Тайна' : 'Secret', desc: isRu ? npc.secretRu : npc.secretEn },
        ],
        actions: [
          {
            name: isRu ? npc.attackNameRu : npc.attackNameEn,
            attack_bonus: npc.attackBonus,
            damage_dice: npc.damageDice,
            damage_type: isRu ? 'Дробящий' : 'Bludgeoning',
            desc: isRu
              ? `Рукопашная атака: +${npc.attackBonus} к попаданию, досягаемость 5 фт. Попадание: ${npc.damageDice} урона.`
              : `Melee Weapon Attack: +${npc.attackBonus} to hit, reach 5 ft. Hit: ${npc.damageDice} damage.`,
          },
        ],
        bonus_actions: [],
        reactions: [],
        legendary_actions: [],
        spells: [],
        source: isRu ? 'Случайный NPC' : 'Random NPC',
        is_srd: false,
        is_custom: true,
      },
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  const handleCopyText = async () => {
    const text = isRu
      ? [
          `${npc.nameRu} — ${npc.raceRu}, ${npc.occupationRu}`,
          `Характер: ${npc.personalityRu}`,
          `Манера речи: ${npc.mannerismRu}`,
          `Тайна: ${npc.secretRu}`,
          `Параметры: КД ${npc.ac}, ОЗ ${npc.hp}, Скорость ${npc.speedRu}`,
          `СИЛ ${npc.str} | ЛОВ ${npc.dex} | ТЕЛ ${npc.con} | ИНТ ${npc.int} | МДР ${npc.wis} | ХАР ${npc.cha}`,
        ].join('\n')
      : [
          `${npc.nameEn} — ${npc.raceEn}, ${npc.occupationEn}`,
          `Personality: ${npc.personalityEn}`,
          `Mannerism: ${npc.mannerismEn}`,
          `Secret: ${npc.secretEn}`,
          `Stats: AC ${npc.ac}, HP ${npc.hp}, Speed ${npc.speedEn}`,
          `STR ${npc.str} | DEX ${npc.dex} | CON ${npc.con} | INT ${npc.int} | WIS ${npc.wis} | CHA ${npc.cha}`,
        ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const getMod = (val: number) => {
    const m = Math.floor((val - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  const name = isRu ? npc.nameRu : npc.nameEn;
  const race = isRu ? npc.raceRu : npc.raceEn;
  const occupation = isRu ? npc.occupationRu : npc.occupationEn;
  const personality = isRu ? npc.personalityRu : npc.personalityEn;
  const mannerism = isRu ? npc.mannerismRu : npc.mannerismEn;
  const secret = isRu ? npc.secretRu : npc.secretEn;
  const attackName = isRu ? npc.attackNameRu : npc.attackNameEn;
  const speed = isRu ? npc.speedRu : npc.speedEn;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[rgba(18,22,30,0.95)] border border-[rgba(255,255,255,0.12)] rounded-glass-xl shadow-glass-panel flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.08)] bg-gradient-to-r from-blue-950/40 via-transparent to-transparent flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-glass flex items-center justify-center bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-sm sm:text-base text-gray-100 flex items-center gap-2">
                {isRu ? 'Генератор случайных NPC «на лету»' : 'On-the-Fly NPC Generator'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-medium">
                  {isRu ? 'Оффлайн' : 'Offline'}
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                {isRu
                  ? 'Мгновенный персонаж для внезапных встреч в таверне, городе или на тракте'
                  : 'Instant character for spontaneous encounters in taverns, cities, or on the road'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={isRu ? 'Закрыть (Esc)' : 'Close (Esc)'}
            aria-label={isRu ? 'Закрыть (Esc)' : 'Close (Esc)'}
            className="p-1.5 rounded-glass text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans text-xs text-gray-200">
          {/* Selectors Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-glass-lg bg-black/30 border border-white/5">
            <div>
              <label
                htmlFor="npc-race-select"
                className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1"
              >
                {isRu ? 'Раса / Вид' : 'Race / Species'}
              </label>
              <select
                id="npc-race-select"
                value={selectedRace}
                onChange={(e) => handleRaceChange(e.target.value)}
                title={isRu ? 'Фильтр по расе NPC' : 'Filter by NPC race'}
                className="w-full px-2.5 py-1.5 rounded-glass-sm bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/60 transition-colors cursor-pointer"
              >
                <option value="any" className="bg-[#12161e] text-gray-300">
                  {isRu ? 'Любая раса' : 'Any Race'}
                </option>
                {NPC_RACES.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#12161e] text-white">
                    {isRu ? r.ru : r.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="npc-occupation-select"
                className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1"
              >
                {isRu ? 'Профессия' : 'Occupation'}
              </label>
              <select
                id="npc-occupation-select"
                value={selectedOccupation}
                onChange={(e) => handleOccupationChange(e.target.value)}
                title={isRu ? 'Фильтр по профессии NPC' : 'Filter by NPC occupation'}
                className="w-full px-2.5 py-1.5 rounded-glass-sm bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/60 transition-colors cursor-pointer"
              >
                <option value="any" className="bg-[#12161e] text-gray-300">
                  {isRu ? 'Любая профессия' : 'Any Occupation'}
                </option>
                {NPC_OCCUPATIONS.map((o) => (
                  <option key={o.id} value={o.id} className="bg-[#12161e] text-white">
                    {isRu ? o.ru : o.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Persona Card */}
          <div className="p-4 rounded-glass-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gold-light font-sans">{name}</h3>
                <p className="text-xs text-gray-300 font-medium">
                  <span className="text-white font-bold">{race}</span> • {occupation}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  title={isRu ? 'Класс доспеха' : 'Armor Class'}
                  className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 font-mono font-bold text-xs border border-blue-500/30 flex items-center gap-1"
                >
                  <Shield className="h-3 w-3" /> {isRu ? 'КД' : 'AC'} {npc.ac}
                </span>
                <span
                  title={isRu ? 'Очки здоровья' : 'Hit Points'}
                  className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 font-mono font-bold text-xs border border-rose-500/30 flex items-center gap-1"
                >
                  <Heart className="h-3 w-3" /> {npc.hp} {isRu ? 'ОЗ' : 'HP'}
                </span>
              </div>
            </div>

            {/* Narrative traits */}
            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[110px]">
                  {isRu ? 'Характер:' : 'Personality:'}
                </span>
                <span className="text-gray-200 flex-1">{personality}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[110px]">
                  {isRu ? 'Манера речи:' : 'Mannerism:'}
                </span>
                <span className="text-gray-200 flex-1">{mannerism}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider min-w-[110px]">
                  {isRu ? 'Тайна / Секрет:' : 'Secret / Hook:'}
                </span>
                <span className="text-amber-200/90 flex-1 font-medium italic">«{secret}»</span>
              </div>
            </div>
          </div>

          {/* Ability Scores Grid */}
          <div className="p-3.5 rounded-glass-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] space-y-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              {isRu ? 'Характеристики и модификаторы:' : 'Attributes & Modifiers:'}
            </span>
            <div className="grid grid-cols-6 gap-2 text-center">
              {[
                { label: isRu ? 'СИЛ' : 'STR', val: npc.str },
                { label: isRu ? 'ЛОВ' : 'DEX', val: npc.dex },
                { label: isRu ? 'ТЕЛ' : 'CON', val: npc.con },
                { label: isRu ? 'ИНТ' : 'INT', val: npc.int },
                { label: isRu ? 'МДР' : 'WIS', val: npc.wis },
                { label: isRu ? 'ХАР' : 'CHA', val: npc.cha },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-2 rounded bg-black/30 border border-white/5 flex flex-col items-center"
                >
                  <span className="text-[9px] uppercase font-bold text-gray-400">{s.label}</span>
                  <span className="font-mono text-sm font-bold text-white">{s.val}</span>
                  <span className="font-mono text-[10px] text-gold font-bold">{getMod(s.val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Attack note */}
          <div className="p-3 rounded-glass bg-black/30 border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-gray-400" />
              <span>
                {isRu ? 'Оружие: ' : 'Weapon: '}
                <strong className="text-white">{attackName}</strong>{' '}
                {isRu
                  ? `(+${npc.attackBonus} к попад., ${npc.damageDice} урона)`
                  : `(+${npc.attackBonus} to hit, ${npc.damageDice} damage)`}
              </span>
            </div>
            <span className="text-gray-400">
              {isRu ? 'Скорость: ' : 'Speed: '}
              {speed}
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-[rgba(14,18,25,0.85)] border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleGenerate()}
              title={
                isRu
                  ? 'Сгенерировать случайного NPC с учетом выбранных параметров'
                  : 'Generate a random NPC with selected criteria'
              }
              className="min-h-[34px] px-3.5 py-1.5 rounded-glass bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#f5b920]" />
              <span>{isRu ? 'Другой NPC (Сгенерировать)' : 'Generate Another NPC'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              title={isRu ? 'Скопировать параметры NPC в буфер обмена' : 'Copy NPC details to clipboard'}
              className="min-h-[34px] px-3 py-1.5 rounded-glass bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? (isRu ? 'Скопировано!' : 'Copied!') : (isRu ? 'Копировать' : 'Copy')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleAddToCombat}
              title={isRu ? 'Добавить этого персонажа в активный бой' : 'Add this NPC to active combat'}
              className="min-h-[34px] px-4 py-1.5 rounded-glass bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {addedNotice ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>
                {addedNotice
                  ? (isRu ? 'Добавлен в бой!' : 'Added to Combat!')
                  : (isRu ? 'Добавить в бой как NPC' : 'Add to Combat as NPC')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}