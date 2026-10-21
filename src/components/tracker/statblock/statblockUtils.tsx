import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  cleanRussianText,
  localizeCreatureType as localizeTypeUtils,
} from '../../../utils/textUtils';
import { CreatureSize } from '../../../types/dnd5e';

export function formatMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export const COMMON_SPELLS_REGEX = new RegExp(
  '«([^»]+)»|"([^"]+)"|\\b(магический доспех|огненный шар|щит|лечение ран|туманный шаг|удержание личности|невидимость|паутина|волшебная стрела|тьма|луч холода|доспехи агатиса|рассеивание магии|контрзаклинание|исцеление|палящий луч|раскат грома|ослепление/глухота|переносящая дверь|перст смерти|конус холода|телепортация|зеркальный образ|газообразная форма|усыпление|порыв ветра|подобие|святилище|ведьмин снаряд|благословение|порча|сглаз|приказ|внушение|духовные стражи|духовное оружие|лечащее слово|направляющий снаряд|возрождение|огненный снаряд|свет|фокусы|чудотворство|мистический заряд|пляшущие огоньки|леденящее прикосновение|защита от оружия|брызги кислоты|стена огня|стена льда|ледяной шторм|метеоритный дождь|солнечный луч|остановка времени)\\b',
  'gi'
);

export const CREATURE_SIZE_RU: Record<string, string> = {
  Tiny: 'Крошечный',
  Small: 'Маленький',
  Medium: 'Средний',
  Large: 'Большой',
  Huge: 'Огромный',
  Gargantuan: 'Громадный',
};

export const ALIGNMENT_RU: Record<string, string> = {
  'lawful good': 'Законно-добрый',
  'neutral good': 'Нейтрально-добрый',
  'chaotic good': 'Хаотично-добрый',
  'lawful neutral': 'Законно-нейтральный',
  'neutral': 'Нейтральный',
  'true neutral': 'Истинно-нейтральный',
  'chaotic neutral': 'Хаотично-нейтральный',
  'lawful evil': 'Законно-злой',
  'neutral evil': 'Нейтрально-злой',
  'chaotic evil': 'Хаотично-злой',
  'unaligned': 'Без мировоззрения',
  'any alignment': 'Любое мировоззрение',
};

export const SPELL_SCHOOL_RU: Record<string, string> = {
  abjuration: 'Ограждение',
  conjuration: 'Вызов',
  divination: 'Прорицание',
  enchantment: 'Очарование',
  evocation: 'Воплощение',
  illusion: 'Иллюзия',
  necromancy: 'Некромантия',
  transmutation: 'Преобразование',
};

export function formatSpeedRu(speed?: string): string {
  if (!speed) return '30 фт.';
  return speed
    .replace(/\bft\.?\b/gi, 'фт.')
    .replace(/\bfly\b/gi, 'полет')
    .replace(/\bswim\b/gi, 'плавание')
    .replace(/\bclimb\b/gi, 'лазание')
    .replace(/\bburrow\b/gi, 'копание')
    .replace(/\bhover\b/gi, 'парение');
}

export function localizeCreatureType(type?: string): string {
  if (!type) return 'Существо';
  return localizeTypeUtils(type);
}

export function localizeAlignment(alignment?: string): string {
  if (!alignment) return '';
  const lower = alignment.toLowerCase().trim();
  return ALIGNMENT_RU[lower] || cleanRussianText(alignment);
}

export function localizeSize(size?: string): string {
  if (!size) return 'Средний';
  return CREATURE_SIZE_RU[size] || cleanRussianText(size);
}

export function localizeSenses(senses?: string): string {
  if (!senses) return '';
  return cleanRussianText(senses)
    .replace(/darkvision/gi, 'темное зрение')
    .replace(/blindsight/gi, 'слепое зрение')
    .replace(/truesight/gi, 'истинное зрение')
    .replace(/tremorsense/gi, 'чувство вибрации')
    .replace(/passive Perception/gi, 'пассивная Внимательность')
    .replace(/\bft\.?\b/gi, 'фт.');
}

export function localizeLanguages(languages?: string): string {
  if (!languages) return '';
  return cleanRussianText(languages)
    .replace(/\bCommon\b/gi, 'общий')
    .replace(/\bDraconic\b/gi, 'драконий')
    .replace(/\bElvish\b/gi, 'эльфийский')
    .replace(/\bDwarvish\b/gi, 'дварфский')
    .replace(/\bGiant\b/gi, 'великаний')
    .replace(/\bGnomish\b/gi, 'гномий')
    .replace(/\bGoblin\b/gi, 'гоблинский')
    .replace(/\bHalfling\b/gi, 'полуросликов')
    .replace(/\bOrc\b/gi, 'орочий')
    .replace(/\bAbyssal\b/gi, 'бездны')
    .replace(/\bCelestial\b/gi, 'небесный')
    .replace(/\bInfernal\b/gi, 'инфернальный')
    .replace(/\bPrimordial\b/gi, 'первородный')
    .replace(/\bSylvan\b/gi, 'сильван')
    .replace(/\bUndercommon\b/gi, 'подземный')
    .replace(/\btelepathy\b/gi, 'телепатия')
    .replace(/\bft\.?\b/gi, 'фт.');
}

export function localizeDefenses(defenses?: string): string {
  if (!defenses) return '';
  return cleanRussianText(defenses)
    .replace(/bludgeoning/gi, 'дробящий')
    .replace(/piercing/gi, 'колющий')
    .replace(/slashing/gi, 'рубящий')
    .replace(/fire/gi, 'огонь')
    .replace(/cold/gi, 'холод')
    .replace(/lightning/gi, 'электричество')
    .replace(/thunder/gi, 'звук')
    .replace(/poison/gi, 'яд')
    .replace(/acid/gi, 'кислота')
    .replace(/psychic/gi, 'психический')
    .replace(/necrotic/gi, 'некротический')
    .replace(/radiant/gi, 'излучение')
    .replace(/force/gi, 'силовое поле')
    .replace(/from nonmagical attacks/gi, 'от немагических атак');
}

export function localizeConditionImmunities(conds?: string): string {
  if (!conds) return '';
  return cleanRussianText(conds)
    .replace(/blinded/gi, 'ослепление')
    .replace(/charmed/gi, 'очарование')
    .replace(/deafened/gi, 'глухота')
    .replace(/frightened/gi, 'испуг')
    .replace(/grappled/gi, 'захват')
    .replace(/incapacitated/gi, 'недееспособность')
    .replace(/invisible/gi, 'невидимость')
    .replace(/paralyzed/gi, 'паралич')
    .replace(/petrified/gi, 'окаменение')
    .replace(/poisoned/gi, 'отравление')
    .replace(/prone/gi, 'сбивание с ног')
    .replace(/restrained/gi, 'опутывание')
    .replace(/stunned/gi, 'оглушение')
    .replace(/unconscious/gi, 'бессознательность')
    .replace(/exhaustion/gi, 'истощение');
}

export function translateSpellCastingTime(val?: string): string {
  if (!val) return '1 действие';
  return val
    .replace(/1 bonus action/gi, '1 бонусное действие')
    .replace(/1 action/gi, '1 действие')
    .replace(/1 reaction/gi, '1 реакция')
    .replace(/minute/gi, 'минута')
    .replace(/hour/gi, 'час');
}

export function translateSpellRange(val?: string): string {
  if (!val) return 'На себя';
  return val
    .replace(/Self/gi, 'На себя')
    .replace(/Touch/gi, 'Касание')
    .replace(/Sight/gi, 'В пределах видимости')
    .replace(/Unlimited/gi, 'Неограниченная')
    .replace(/feet|ft\.?/gi, 'фт.');
}

export function translateSpellDuration(val?: string): string {
  if (!val) return 'Мгновенная';
  return val
    .replace(/Instantaneous/gi, 'Мгновенная')
    .replace(/Concentration, up to/gi, 'Концентрация, до')
    .replace(/Concentration/gi, 'Концентрация')
    .replace(/1 round/gi, '1 раунд')
    .replace(/1 minute/gi, '1 минута')
    .replace(/10 minutes/gi, '10 минут')
    .replace(/1 hour/gi, '1 час')
    .replace(/8 hours/gi, '8 часов')
    .replace(/24 hours/gi, '24 часа')
    .replace(/Until dispelled/gi, 'Пока не рассеется');
}

export const SIZE_OPTIONS = [
  { id: 'Medium' as CreatureSize, label: '1×1', nameRu: 'Средний (1×1)' },
  { id: 'Large' as CreatureSize, label: '2×2', nameRu: 'Большой (2×2)' },
  { id: 'Huge' as CreatureSize, label: '3×3', nameRu: 'Огромный (3×3)' },
  { id: 'Gargantuan' as CreatureSize, label: '4×4', nameRu: 'Громадный (4×4)' },
] as const;

export function renderTextWithSpellBadges(
  text: string,
  onSpellClick: (spellName: string) => void
): React.ReactNode {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  COMMON_SPELLS_REGEX.lastIndex = 0;
  while ((match = COMMON_SPELLS_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const rawName = match[1] || match[2] || match[3] || fullMatch;
    const cleanSpellName = rawName.trim();

    parts.push(
      <button
        key={`spell-${match.index}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSpellClick(cleanSpellName);
        }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-glass-sm bg-purple-950/70 hover:bg-purple-900 border border-purple-500/60 hover:border-gold text-purple-200 hover:text-gold-light text-xs font-semibold transition-all shadow-sm cursor-pointer align-baseline"
        title={`Заклинание: ${cleanSpellName} • Кликните для просмотра описания`}
      >
        <Sparkles className="w-3 h-3 text-purple-400 shrink-0 inline" />
        <span>«{cleanSpellName}»</span>
      </button>
    );

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
