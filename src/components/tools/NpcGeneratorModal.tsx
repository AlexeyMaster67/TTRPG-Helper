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

interface GeneratedNpc {
  name: string;
  race: string;
  occupation: string;
  personality: string;
  secret: string;
  mannerism: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  ac: number;
  hp: number;
  speed: string;
  attackName: string;
  attackBonus: number;
  damageDice: string;
}

const RACES = [
  'Человек',
  'Лесной эльф',
  'Высший эльф',
  'Горный дварф',
  'Холмовой дварф',
  'Легконогий полурослик',
  'Скальный гном',
  'Тифлинг',
  'Драконорождённый',
  'Полуорк',
];

const OCCUPATIONS = [
  'Трактирщик',
  'Стражник ворот',
  'Кузнец',
  'Алхимик',
  'Карманник',
  'Наёмник',
  'Жрец местного храма',
  'Странствующий купец',
  'Городской глашатай',
  'Рыбак',
  'Библиотекарь',
  'Контрабандист',
  'Егерь',
  'Лекарь',
  'Ткач',
];

const PERSONALITIES = [
  'Вечно подозрительный, прищуривается при разговоре',
  'Невероятно щедрый и добродушный, угощает всех элем',
  'Говорит быстро и постоянно перебивает собеседника',
  'Хладнокровный и немногословный, отвечает односложно',
  'Хвастается былыми подвигами, приукрашивая правду',
  'Нервный, постоянно оглядывается по сторонам',
  'Философски относится к любым бедам: «Такова воля богов»',
  'Жадный до каждой медной монеты, торгуется до последнего',
  'Искренне восхищается искателями приключений',
  'Мрачный фаталист, уверенный в скором конце света',
];

const SECRETS = [
  'Тайно работает осведомителем местной гильдии воров',
  'Задолжал крупную сумму жестокому ростовщику',
  'Хранит под половицей старинный проклятый амулет',
  'Сбежавший дворянин, скрывающийся под чужим именем',
  'Знает тайный проход в городскую канализацию под таверной',
  'Видел прошлой ночью подозрительных культистов у руин',
  'Отравил своего бывшего партнёра из-за золота',
  'Ищет пропавшего брата, ушедшего в подземелье',
  'Является тайным культистом, но мечтает порвать с сектой',
  'Прячет в подвале раненого дезертира',
];

const MANNERISMS = [
  'Хриплый прокуренный бас',
  'Говорит полушёпотом, словно выдаёт великую тайну',
  'Часто покашливает в кулак перед тем, как ответить',
  'Потирает шрам на подбородке во время раздумий',
  'Постоянно крутит в пальцах медную монетку',
  'Улыбается не к месту широкой и жутковатой улыбкой',
  'Заикается на сложных словах',
  'Часто отвлекается и переспрашивает: «А? Что вы сказали?»',
];

const FIRST_NAMES = [
  'Варрин', 'Элдрин', 'Торин', 'Балин', 'Мило', 'Брандон', 'Родерик',
  'Аларик', 'Корвус', 'Освальд', 'Герард', 'Фабиан', 'Дастин', 'Берен',
  'Лира', 'Мирабель', 'Элиза', 'Сильвия', 'Бринн', 'Каэла', 'Талия',
  'Морвенна', 'Астрид', 'Изольда', 'Гвендолин', 'Фрея', 'Юдифь',
];

const LAST_NAMES = [
  'Чернодрев', 'Ясноглаз', 'Железнорук', 'Камнелом', 'Быстроног',
  'Седоус', 'Ветрокрыл', 'Горнощит', 'Янтарь', 'Холодносерд',
  'Златогрив', 'Топорист', 'Дубокорыч', 'Тиховей', 'Стрелок',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollStat(): number {
  // 3d6 average roll skewed 9-14
  return 8 + Math.floor(Math.random() * 7);
}

function generateRandomNpc(): GeneratedNpc {
  const name = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
  const race = randomChoice(RACES);
  const occupation = randomChoice(OCCUPATIONS);
  const personality = randomChoice(PERSONALITIES);
  const secret = randomChoice(SECRETS);
  const mannerism = randomChoice(MANNERISMS);

  const str = rollStat();
  const dex = rollStat();
  const con = rollStat();
  const int = rollStat();
  const wis = rollStat();
  const cha = rollStat();

  const ac = 10 + Math.floor((dex - 10) / 2);
  const hp = 8 + Math.floor((con - 10) / 2) * 2;

  return {
    name,
    race,
    occupation,
    personality,
    secret,
    mannerism,
    str,
    dex,
    con,
    int,
    wis,
    cha,
    ac: Math.max(10, ac),
    hp: Math.max(4, hp),
    speed: '30 фт.',
    attackName: 'Кинжал / Дубинка',
    attackBonus: Math.max(1, 2 + Math.floor((Math.max(str, dex) - 10) / 2)),
    damageDice: '1d4 + 1',
  };
}

interface NpcGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NpcGeneratorModal({ isOpen, onClose }: NpcGeneratorModalProps) {
  const addCombatant = useCombatStore((s) => s.addCombatant);
  const [npc, setNpc] = useState<GeneratedNpc>(generateRandomNpc);
  const [copied, setCopied] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setNpc(generateRandomNpc());
    setAddedNotice(false);
  };

  const handleAddToCombat = () => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const dexMod = Math.floor((npc.dex - 10) / 2);

    addCombatant({
      name: `${npc.name} (${npc.occupation})`,
      nameRu: `${npc.name} (${npc.occupation})`,
      cr: '1/8',
      isPlayer: false,
      hp: npc.hp,
      maxHp: npc.hp,
      ac: npc.ac,
      initiative: d20 + dexMod,
      initBonus: dexMod,
      speed: npc.speed,
      color: '#4B7BEC',
      tokenScale: 1.0,
      statblock: {
        id: `npc-${Date.now()}`,
        name_ru: npc.name,
        name_en: npc.name,
        size: 'Medium',
        size_ru: 'Средний',
        creature_type: 'гуманоид',
        creature_type_ru: 'гуманоид',
        alignment: 'нейтральный',
        ac: npc.ac,
        hp_average: npc.hp,
        hp_formula: `${npc.hp}`,
        speed: npc.speed,
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
        senses: 'Пасс. Внимание ' + (10 + Math.floor((npc.wis - 10) / 2)),
        languages: 'Общий',
        traits: [
          { name: 'Профессия', desc: npc.occupation },
          { name: 'Черта характера', desc: npc.personality },
          { name: 'Тайна', desc: npc.secret },
        ],
        actions: [
          {
            name: npc.attackName,
            attack_bonus: npc.attackBonus,
            damage_dice: npc.damageDice,
            damage_type: 'Дробящий',
            desc: `Рукопашная атака: +${npc.attackBonus} к попаданию, досягаемость 5 фт. Попадание: ${npc.damageDice} урона.`,
          },
        ],
        bonus_actions: [],
        reactions: [],
        legendary_actions: [],
        spells: [],
        source: 'Случайный NPC',
        is_srd: false,
        is_custom: true,
      },
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  const handleCopyText = async () => {
    const text = [
      `👤 ${npc.name} — ${npc.race}, ${npc.occupation}`,
      `Характер: ${npc.personality}`,
      `Манера речи: ${npc.mannerism}`,
      `Тайна: ${npc.secret}`,
      `Параметры: КД ${npc.ac}, ОЗ ${npc.hp}, Скорость ${npc.speed}`,
      `СИЛ ${npc.str} | ЛОВ ${npc.dex} | ТЕЛ ${npc.con} | ИНТ ${npc.int} | МДР ${npc.wis} | ХАР ${npc.cha}`,
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
                Генератор случайных NPC «на лету»
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-medium">
                  Оффлайн
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">Мгновенный персонаж для внезапных встреч в таверне, городе или на тракте</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-glass text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans text-xs text-gray-200">
          {/* Main Persona Card */}
          <div className="p-4 rounded-glass-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gold-light font-sans">{npc.name}</h3>
                <p className="text-xs text-gray-300 font-medium">
                  <span className="text-white font-bold">{npc.race}</span> • {npc.occupation}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 font-mono font-bold text-xs border border-blue-500/30 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> КД {npc.ac}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 font-mono font-bold text-xs border border-rose-500/30 flex items-center gap-1">
                  <Heart className="h-3 w-3" /> {npc.hp} ОЗ
                </span>
              </div>
            </div>

            {/* Narrative traits */}
            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[110px]">Характер:</span>
                <span className="text-gray-200 flex-1">{npc.personality}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[110px]">Манера речи:</span>
                <span className="text-gray-200 flex-1">{npc.mannerism}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider min-w-[110px]">Тайна / Секрет:</span>
                <span className="text-amber-200/90 flex-1 font-medium italic">«{npc.secret}»</span>
              </div>
            </div>
          </div>

          {/* Ability Scores Grid */}
          <div className="p-3.5 rounded-glass-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] space-y-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Характеристики и модификаторы:
            </span>
            <div className="grid grid-cols-6 gap-2 text-center">
              {[
                { label: 'СИЛ', val: npc.str },
                { label: 'ЛОВ', val: npc.dex },
                { label: 'ТЕЛ', val: npc.con },
                { label: 'ИНТ', val: npc.int },
                { label: 'МДР', val: npc.wis },
                { label: 'ХАР', val: npc.cha },
              ].map((s) => (
                <div key={s.label} className="p-2 rounded bg-black/30 border border-white/5 flex flex-col items-center">
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
              <span>Оружие: <strong className="text-white">{npc.attackName}</strong> (+{npc.attackBonus} к попад., {npc.damageDice} урона)</span>
            </div>
            <span className="text-gray-400">Скорость: {npc.speed}</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-[rgba(14,18,25,0.85)] border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              className="min-h-[34px] px-3.5 py-1.5 rounded-glass bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#f5b920]" />
              <span>Другой NPC (Сгенерировать)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="min-h-[34px] px-3 py-1.5 rounded-glass bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleAddToCombat}
              className="min-h-[34px] px-4 py-1.5 rounded-glass bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{addedNotice ? '✓ Добавлен в бой!' : 'Добавить в бой как NPC'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
