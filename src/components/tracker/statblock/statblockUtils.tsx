import React from 'react';
import { Sparkles } from 'lucide-react';
import { useSettingsStore } from '../../../store/settingsStore';
import {
  localizeCreatureType as localizeTypeUtils,
  localizeSenses as textUtilsLocalizeSenses,
  localizeLanguages as textUtilsLocalizeLanguages,
  localizeDefenses as textUtilsLocalizeDefenses,
  localizeConditionImmunities as textUtilsLocalizeConditionImmunities,
  localizeSize as textUtilsLocalizeSize,
  localizeAlignment as textUtilsLocalizeAlignment,
  formatSpeed as textUtilsFormatSpeed,
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

export function formatSpeedRu(speed?: string, lang?: 'en' | 'ru'): string {
  return textUtilsFormatSpeed(speed, lang);
}

export function localizeCreatureType(type?: string, lang?: 'en' | 'ru'): string {
  return localizeTypeUtils(type, lang);
}

export function localizeAlignment(alignment?: string, lang?: 'en' | 'ru'): string {
  return textUtilsLocalizeAlignment(alignment, lang);
}

export function localizeSize(size?: string, lang?: 'en' | 'ru'): string {
  return textUtilsLocalizeSize(size, lang);
}

export function localizeSenses(senses?: string, lang?: 'en' | 'ru'): string {
  return textUtilsLocalizeSenses(senses, lang);
}

export function localizeLanguages(languages?: string, lang?: 'en' | 'ru'): string {
  return textUtilsLocalizeLanguages(languages, lang);
}

export function localizeDefenses(defenses?: string, lang?: 'en' | 'ru'): string {
  return textUtilsLocalizeDefenses(defenses, lang);
}

export function localizeConditionImmunities(conds?: string, lang?: 'en' | 'ru'): string {
  return textUtilsLocalizeConditionImmunities(conds, lang);
}

const SIZE_WORDS_TO_EN: Record<string, string> = {
  крошечный: 'Tiny',
  крошечная: 'Tiny',
  крошечное: 'Tiny',
  маленький: 'Small',
  маленькая: 'Small',
  маленькое: 'Small',
  средний: 'Medium',
  средняя: 'Medium',
  среднее: 'Medium',
  большой: 'Large',
  большая: 'Large',
  большое: 'Large',
  огромный: 'Huge',
  огромная: 'Huge',
  огромное: 'Huge',
  громадный: 'Gargantuan',
  громадная: 'Gargantuan',
  громадное: 'Gargantuan',
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge',
  gargantuan: 'Gargantuan',
};

const FEMININE_TYPES_RU = new Set([
  'нежить',
  'фея',
  'бестия',
  'аберрация',
  'слизь',
]);

const NEUTER_TYPES_RU = new Set([
  'чудовище',
  'растение',
  'исчадие',
  'животное',
  'насекомое',
]);

function getGenderedRuSize(sizeKey: string, typeNameRu: string): string {
  const normSize = SIZE_WORDS_TO_EN[sizeKey.toLowerCase()] || 'Medium';
  const firstWordType = typeNameRu.trim().toLowerCase().split(/[\s(]/)[0];

  const isFem = FEMININE_TYPES_RU.has(firstWordType);
  const isNeut = NEUTER_TYPES_RU.has(firstWordType);

  if (isFem) {
    switch (normSize) {
      case 'Tiny': return 'Крошечная';
      case 'Small': return 'Маленькая';
      case 'Medium': return 'Средняя';
      case 'Large': return 'Большая';
      case 'Huge': return 'Огромная';
      case 'Gargantuan': return 'Громадная';
    }
  }

  if (isNeut) {
    switch (normSize) {
      case 'Tiny': return 'Крошечное';
      case 'Small': return 'Маленькое';
      case 'Medium': return 'Среднее';
      case 'Large': return 'Большое';
      case 'Huge': return 'Огромное';
      case 'Gargantuan': return 'Громадное';
    }
  }

  switch (normSize) {
    case 'Tiny': return 'Крошечный';
    case 'Small': return 'Маленький';
    case 'Medium': return 'Средний';
    case 'Large': return 'Большой';
    case 'Huge': return 'Огромный';
    case 'Gargantuan': return 'Громадный';
    default: return 'Средний';
  }
}

const KNOWN_ALIGNMENT_PATTERNS = [
  /законно[- ]добр/i,
  /нейтрально[- ]добр/i,
  /хаотично[- ]добр/i,
  /законно[- ]нейтральн/i,
  /истинно[- ]нейтральн/i,
  /\bнейтральн/i,
  /хаотично[- ]нейтральн/i,
  /законно[- ]зл/i,
  /нейтрально[- ]зл/i,
  /хаотично[- ]зл/i,
  /без мировоззрения/i,
  /любое мировоззрение/i,
  /любое недоброе/i,
  /любое незлое/i,
  /любое хаотичное/i,
  /любое законное/i,
  /lawful\s+good/i,
  /neutral\s+good/i,
  /chaotic\s+good/i,
  /lawful\s+neutral/i,
  /true\s+neutral/i,
  /\bneutral\b/i,
  /chaotic\s+neutral/i,
  /lawful\s+evil/i,
  /neutral\s+evil/i,
  /chaotic\s+evil/i,
  /unaligned/i,
  /any\s+alignment/i,
  /any\s+non-good/i,
  /any\s+non-evil/i,
  /any\s+non-lawful/i,
  /any\s+chaotic/i,
];

function isAlignmentString(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  return KNOWN_ALIGNMENT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function formatCreatureSubtitle(
  combatant: { isPlayer?: boolean; creatureType?: string; size?: string; statblock?: any },
  lang: 'en' | 'ru' = 'en'
): string {
  if (combatant.isPlayer) {
    return lang === 'en' ? 'Player Character' : 'Персонаж игрока';
  }

  const sb = combatant.statblock;
  let rawType = combatant.creatureType || sb?.creature_type_ru || sb?.creature_type || sb?.type || '';
  let explicitSize = combatant.size || sb?.size || '';
  let explicitAlignment = sb?.alignment || '';

  // Handle alignment containing comma-separated redundant translations (e.g. "законно-злой, lawful evil")
  if (explicitAlignment.includes(',')) {
    const alignParts = explicitAlignment.split(',').map((p: string) => p.trim()).filter(Boolean);
    const found = alignParts.find((p: string) => isAlignmentString(p));
    if (found) {
      explicitAlignment = found;
    }
  }

  let detectedAlignment = '';
  let detectedSize = '';

  // Parse rawType which might look like "Средняя нежить, законно-злой" or "Medium undead, lawful evil"
  const rawParts = rawType.split(',').map((p: string) => p.trim()).filter(Boolean);
  const remainingTypeParts: string[] = [];

  for (const part of rawParts) {
    if (isAlignmentString(part)) {
      if (!detectedAlignment) {
        detectedAlignment = part;
      }
    } else {
      remainingTypeParts.push(part);
    }
  }

  let cleanedType = remainingTypeParts.join(', ').trim();

  // Check if first word of cleanedType is a size word
  if (cleanedType) {
    const words = cleanedType.split(/\s+/);
    const firstWordClean = words[0]?.toLowerCase().replace(/[.,;:]/g, '');
    if (firstWordClean && SIZE_WORDS_TO_EN[firstWordClean]) {
      detectedSize = SIZE_WORDS_TO_EN[firstWordClean];
      cleanedType = words.slice(1).join(' ').trim();
    }
  }

  const finalAlignmentRaw = explicitAlignment || detectedAlignment || '';
  const finalSizeKey = explicitSize || detectedSize || 'Medium';

  if (lang === 'en') {
    const sizeEn = textUtilsLocalizeSize(finalSizeKey, 'en');
    const typeEn = cleanedType
      ? localizeTypeUtils(cleanedType, 'en').toLowerCase()
      : 'creature';
    const alignEn = finalAlignmentRaw
      ? textUtilsLocalizeAlignment(finalAlignmentRaw, 'en').toLowerCase()
      : '';

    return `${sizeEn} ${typeEn}${alignEn ? `, ${alignEn}` : ''}`;
  }

  // Russian formatting
  const typeRu = cleanedType
    ? localizeTypeUtils(cleanedType, 'ru').toLowerCase()
    : 'существо';
  const sizeRu = getGenderedRuSize(finalSizeKey, typeRu);
  const alignRu = finalAlignmentRaw
    ? textUtilsLocalizeAlignment(finalAlignmentRaw, 'ru').toLowerCase()
    : '';

  return `${sizeRu} ${typeRu}${alignRu ? `, ${alignRu}` : ''}`;
}

export function translateSpellCastingTime(val?: string, lang?: 'en' | 'ru'): string {
  if (!val) return lang === 'en' ? '1 action' : '1 действие';
  if (lang === 'en') {
    return val
      .replace(/1 бонусное действие/gi, '1 bonus action')
      .replace(/1 действие/gi, '1 action')
      .replace(/1 реакция/gi, '1 reaction')
      .replace(/минута/gi, 'minute')
      .replace(/час/gi, 'hour');
  }
  return val
    .replace(/1 bonus action/gi, '1 бонусное действие')
    .replace(/1 action/gi, '1 действие')
    .replace(/1 reaction/gi, '1 реакция')
    .replace(/minute/gi, 'минута')
    .replace(/hour/gi, 'час');
}

export function translateSpellRange(val?: string, lang?: 'en' | 'ru'): string {
  if (!val) return lang === 'en' ? 'Self' : 'На себя';
  if (lang === 'en') {
    return val
      .replace(/На себя/gi, 'Self')
      .replace(/Касание/gi, 'Touch')
      .replace(/В пределах видимости/gi, 'Sight')
      .replace(/Неограниченная/gi, 'Unlimited')
      .replace(/фт\.?/gi, 'ft.');
  }
  return val
    .replace(/Self/gi, 'На себя')
    .replace(/Touch/gi, 'Касание')
    .replace(/Sight/gi, 'В пределах видимости')
    .replace(/Unlimited/gi, 'Неограниченная')
    .replace(/feet|ft\.?/gi, 'фт.');
}

export function translateSpellDuration(val?: string, lang?: 'en' | 'ru'): string {
  if (!val) return lang === 'en' ? 'Instantaneous' : 'Мгновенная';
  if (lang === 'en') {
    return val
      .replace(/Мгновенная/gi, 'Instantaneous')
      .replace(/Концентрация, до/gi, 'Concentration, up to')
      .replace(/Концентрация/gi, 'Concentration')
      .replace(/1 раунд/gi, '1 round')
      .replace(/1 минута/gi, '1 minute')
      .replace(/10 минут/gi, '10 minutes')
      .replace(/1 час/gi, '1 hour')
      .replace(/8 часов/gi, '8 hours')
      .replace(/24 часа/gi, '24 hours')
      .replace(/Пока не рассеется/gi, 'Until dispelled');
  }
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
  onSpellClick: (spellName: string) => void,
  forcedLanguage?: 'ru' | 'en'
): React.ReactNode {
  if (!text) return null;

  const currentLang = forcedLanguage || useSettingsStore.getState().language;
  const isEn = currentLang === 'en';

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
        title={isEn ? `Spell: ${cleanSpellName} • Click to view details` : `Заклинание: ${cleanSpellName} • Кликните для просмотра описания`}
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
