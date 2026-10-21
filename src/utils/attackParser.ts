import { DamageType, WeaponMasteryProperty } from '../types/dnd5e';
import { Combatant } from '../types/combat';
import { DAMAGE_NAMES_RU } from './textUtils';

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type SaveOutcome = 'half' | 'none';

export const ABILITY_LABELS: Record<AbilityKey, { ru: string; shortRu: string; en: string }> = {
  str: { ru: 'Сила', shortRu: 'СИЛ', en: 'STR' },
  dex: { ru: 'Ловкость', shortRu: 'ЛОВ', en: 'DEX' },
  con: { ru: 'Телосложение', shortRu: 'ТЕЛ', en: 'CON' },
  int: { ru: 'Интеллект', shortRu: 'ИНТ', en: 'INT' },
  wis: { ru: 'Мудрость', shortRu: 'МУД', en: 'WIS' },
  cha: { ru: 'Харизма', shortRu: 'ХАР', en: 'CHA' },
};

export interface SaveActionDetails {
  isSave: boolean;
  saveAbility: AbilityKey;
  dc: number;
  saveOutcome: SaveOutcome;
  damageFormula: string;
  damageType: DamageType;
  isAoE: boolean;
}

export interface ActionDetails {
  attackBonus: number | null;
  damageFormula: string | null;
  damageType: DamageType | string | null;
  weaponMastery: WeaponMasteryProperty | null;
}

/**
 * Formats and normalizes a damage dice formula with bonus.
 * Avoids duplicate additions (e.g. "1d6+1" with bonus 1 will NOT become "1d6+1+1", but cleanly "1d6 + 1").
 * Combines multiple modifiers cleanly (e.g. "1d6+1+1" -> "1d6 + 2").
 */
export function formatDamageFormula(
  damageDice?: string | null,
  damageBonus?: number | string | null
): string | null {
  if (!damageDice) return null;
  const raw = String(damageDice).trim();
  if (!raw) return null;

  // Clean up any double additions that might already be in raw e.g. "1d6+1+1"
  // Find dice part (e.g. 1d6) and any following modifiers (+1, -2, etc.)
  const multiMatch = raw.match(/^(\d*d\d+)((?:\s*[+-]\s*\d+)+)$/i);
  if (multiMatch) {
    const diceBase = multiMatch[1].toLowerCase();
    const modsStr = multiMatch[2];
    const modRegex = /([+-])\s*(\d+)/g;
    let match: RegExpExecArray | null;
    let totalMod = 0;
    while ((match = modRegex.exec(modsStr)) !== null) {
      const sign = match[1] === '-' ? -1 : 1;
      totalMod += sign * parseInt(match[2], 10);
    }

    if (totalMod === 0) {
      return diceBase;
    }
    return `${diceBase} ${totalMod > 0 ? '+' : '-'} ${Math.abs(totalMod)}`;
  }

  // If raw is just dice without '+' or '-', e.g. "1d6" or "2d8":
  const bonusNum = damageBonus !== undefined && damageBonus !== null && damageBonus !== ''
    ? Number(damageBonus)
    : null;

  if (bonusNum !== null && !isNaN(bonusNum) && bonusNum !== 0) {
    return `${raw} ${bonusNum > 0 ? '+' : '-'} ${Math.abs(bonusNum)}`;
  }

  return raw;
}

/**
 * Extracts attack roll bonus, damage formula, damage type and weapon mastery from an action object or text.
 */
export function parseActionDetails(action: any): ActionDetails {
  if (!action) {
    return { attackBonus: null, damageFormula: null, damageType: null, weaponMastery: null };
  }

  let attackBonus: number | null = action.attack_bonus ?? null;
  let damageFormula: string | null = formatDamageFormula(
    action.damage_dice,
    action.damage_bonus
  );
  let damageType: DamageType | string | null = action.damage_type ? action.damage_type.toLowerCase() : null;
  let weaponMastery: WeaponMasteryProperty | null = action.weapon_mastery || null;

  const desc: string = action.desc || '';

  // Parse +X to hit
  if (attackBonus === null) {
    const hitMatch = desc.match(/(?:\+|Attack Roll:\s*\+|к попаданию:\s*\+)(\d+)/i);
    if (hitMatch) {
      attackBonus = parseInt(hitMatch[1], 10);
    }
  }

  // Parse damage dice like (1d8 + 3) or 2d6
  if (!damageFormula) {
    const diceMatch = desc.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
    if (diceMatch) {
      damageFormula = formatDamageFormula(diceMatch[1]);
    }
  }

  // Parse damage type from desc if not specified
  if (!damageType) {
    const damageKeywords: Record<DamageType, string[]> = {
      acid: ['acid', 'кислот'],
      bludgeoning: ['bludgeoning', 'дробящ'],
      cold: ['cold', 'холод'],
      fire: ['fire', 'огонь', 'огн'],
      force: ['force', 'силов'],
      lightning: ['lightning', 'электричеств', 'молни'],
      necrotic: ['necrotic', 'некротическ'],
      piercing: ['piercing', 'колющ'],
      poison: ['poison', 'яд'],
      psychic: ['psychic', 'психическ'],
      radiant: ['radiant', 'излучен', 'лучист'],
      slashing: ['slashing', 'рубящ'],
      thunder: ['thunder', 'звук', 'гром'],
    };
    const lowerDesc = desc.toLowerCase();
    for (const [t, keywords] of Object.entries(damageKeywords) as [DamageType, string[]][]) {
      if (keywords.some((k) => lowerDesc.includes(k))) {
        damageType = t;
        break;
      }
    }
  }

  // Check weapon mastery mention in 2024 rules
  if (!weaponMastery) {
    const masteries: WeaponMasteryProperty[] = [
      'Slow',
      'Topple',
      'Vex',
      'Sap',
      'Nick',
      'Push',
      'Graze',
      'Cleave',
    ];
    for (const m of masteries) {
      if (new RegExp(`\\b${m}\\b`, 'i').test(desc) || new RegExp(`\\b${m}\\b`, 'i').test(action.name || '')) {
        weaponMastery = m;
        break;
      }
    }
  }

  return { attackBonus, damageFormula, damageType, weaponMastery };
}

/**
 * Detects if an action or spell requires a Saving Throw and extracts DC, ability, damage, and outcome.
 */
export function parseSaveDetails(action: any): SaveActionDetails {
  if (!action) {
    return {
      isSave: false,
      saveAbility: 'dex',
      dc: 15,
      saveOutcome: 'half',
      damageFormula: '8d6',
      damageType: 'fire',
      isAoE: false,
    };
  }

  const name = action.name || '';
  const desc = action.desc || '';
  const fullText = `${name} ${desc}`;

  // Check for saving throw indicators
  const isSave = /(?:DC\s*\d+|СЛ\s*\d+|saving\s+throw|спасбросок|спасброск)/i.test(fullText);

  // Parse DC: "DC 15", "СЛ 14", "DC 18"
  let dc = 15;
  const dcMatch = fullText.match(/(?:DC|СЛ)\s*(\d+)/i);
  if (dcMatch) {
    dc = parseInt(dcMatch[1], 10);
  }

  // Parse Ability
  let saveAbility: AbilityKey = 'dex';
  if (/(?:Strength|Сила|Силы|Силе|Силу|СИЛ)\b/i.test(fullText)) {
    saveAbility = 'str';
  } else if (/(?:Dexterity|Ловкость|Ловкости|Ловкостью|ЛОВ)\b/i.test(fullText)) {
    saveAbility = 'dex';
  } else if (/(?:Constitution|Телосложение|Телосложения|Телосложением|ТЕЛ)\b/i.test(fullText)) {
    saveAbility = 'con';
  } else if (/(?:Intelligence|Интеллект|Интеллекта|Интеллектом|ИНТ)\b/i.test(fullText)) {
    saveAbility = 'int';
  } else if (/(?:Wisdom|Мудрость|Мудрости|Мудростью|МУД|МДР)\b/i.test(fullText)) {
    saveAbility = 'wis';
  } else if (/(?:Charisma|Харизма|Харизмы|Харизмой|ХАР)\b/i.test(fullText)) {
    saveAbility = 'cha';
  }

  // Parse Save Outcome rule: "half" (default for damage saves) vs "none"
  let saveOutcome: SaveOutcome = 'half';
  const hasHalfMention = /(?:half as much|половин|half on a successful|половину этого урона|half damage|половину урона)/i.test(fullText);
  const hasNoneMention = /(?:takes no damage|не получает урона|no damage on a successful|нет урона при успехе|or take\b|или получает\b)/i.test(fullText);

  if (hasHalfMention) {
    saveOutcome = 'half';
  } else if (hasNoneMention) {
    saveOutcome = 'none';
  }

  // Parse AoE indicator
  const isAoE = /(?:area|cone|sphere|radius|line|cube|cylinder|each creature|all creatures|каждое существо|все существа|в этой области|конус|сфера|линия|радиус|куб|цилиндр)/i.test(fullText);

  // Parse damage formula and type
  const actionParsed = parseActionDetails(action);
  const damageFormula = actionParsed.damageFormula || '8d6';
  const damageType = (actionParsed.damageType?.toLowerCase() || 'fire') as DamageType;

  return {
    isSave,
    saveAbility,
    dc,
    saveOutcome,
    damageFormula,
    damageType,
    isAoE,
  };
}

/**
 * Calculates a combatant's saving throw modifier for a given ability.
 * Supports:
 * - Monster statblock explicit saves (`statblock.saves`)
 * - Player party sheet saves & proficiencies (`partyMember.savingThrowProficiencies`)
 * - Fallback to ability score modifier
 */
export function getCombatantSaveModifier(
  combatant: Combatant,
  ability: AbilityKey,
  partyMember?: any
): { modifier: number; isProficient: boolean; statScore: number } {
  const sb = combatant?.statblock;

  // 1. Check explicit saves in statblock
  if (sb?.saves && typeof sb.saves === 'object') {
    const keyMap: Record<AbilityKey, string[]> = {
      str: ['STR', 'str', 'СИЛ', 'сил', 'сила', 'Сила', 'Strength'],
      dex: ['DEX', 'dex', 'ЛОВ', 'лов', 'ловкость', 'Ловкость', 'Dexterity'],
      con: ['CON', 'con', 'ТЕЛ', 'тел', 'телосложение', 'Телосложение', 'Constitution'],
      int: ['INT', 'int', 'ИНТ', 'инт', 'интеллект', 'Интеллект', 'intellect', 'Intelligence'],
      wis: ['WIS', 'wis', 'МУД', 'муд', 'МДР', 'мдр', 'мудрость', 'Мудрость', 'Wisdom'],
      cha: ['CHA', 'cha', 'ХАР', 'хар', 'харизма', 'Харизма', 'Charisma'],
    };

    for (const k of keyMap[ability]) {
      if (sb.saves[k] !== undefined && sb.saves[k] !== null) {
        const val = Number(sb.saves[k]);
        if (!isNaN(val)) {
          const score =
            ability === 'str' ? sb.str :
            ability === 'dex' ? sb.dex :
            ability === 'con' ? sb.con :
            ability === 'int' ? (sb.intellect ?? (sb as any).int) :
            ability === 'wis' ? sb.wis :
            sb.cha;
          return { modifier: val, isProficient: true, statScore: score ?? 10 };
        }
      }
    }
  }

  // 2. Check player party member if available
  if (partyMember) {
    const statKey = ability === 'int' ? 'int' : ability;
    const score = partyMember.stats?.[statKey] ?? 10;
    const baseMod = Math.floor((score - 10) / 2);
    const profs: string[] = partyMember.savingThrowProficiencies || [];
    const isProf = profs.some((p) => p.toLowerCase() === ability.toLowerCase());
    const pb = partyMember.proficiencyBonus || 2;
    return {
      modifier: isProf ? baseMod + pb : baseMod,
      isProficient: isProf,
      statScore: score,
    };
  }

  // 3. Fallback: Ability score modifier
  const score =
    ability === 'str' ? sb?.str :
    ability === 'dex' ? sb?.dex :
    ability === 'con' ? sb?.con :
    ability === 'int' ? (sb?.intellect ?? (sb as any)?.int) :
    ability === 'wis' ? sb?.wis :
    sb?.cha;

  const validScore = typeof score === 'number' && !isNaN(score) ? score : 10;
  const mod = Math.floor((validScore - 10) / 2);
  return { modifier: mod, isProficient: false, statScore: validScore };
}

/**
 * Checks whether defenses (array or string) contains the given damage type in English or Russian.
 */
export function checkHasDefense(defenses: any, type: string): boolean {
  if (!defenses || !type) return false;
  const targetType = type.toLowerCase();
  const keywords: string[] = [targetType];
  const ruType = DAMAGE_NAMES_RU[targetType]?.toLowerCase();
  if (ruType) keywords.push(ruType);
  if (targetType === 'thunder') keywords.push('звук', 'гром');
  if (targetType === 'lightning') keywords.push('молни', 'электричеств');
  if (targetType === 'fire') keywords.push('огн');
  if (targetType === 'cold') keywords.push('холод');
  if (targetType === 'acid') keywords.push('кислот');
  if (targetType === 'poison') keywords.push('яд');
  if (targetType === 'force') keywords.push('силов');
  if (targetType === 'radiant') keywords.push('лучист', 'излучен');
  if (targetType === 'necrotic') keywords.push('некротическ');
  if (targetType === 'psychic') keywords.push('психическ');
  if (targetType === 'slashing') keywords.push('рубящ');
  if (targetType === 'piercing') keywords.push('колющ');
  if (targetType === 'bludgeoning') keywords.push('дробящ');

  const checkText = (text: string) => {
    const lower = text.toLowerCase();
    return keywords.some((k) => lower.includes(k));
  };

  if (Array.isArray(defenses)) {
    return defenses.some((d) => typeof d === 'string' && checkText(d));
  }

  if (typeof defenses === 'string') {
    return checkText(defenses);
  }

  return false;
}

/**
 * Calculates effective damage taking into account target immunities, resistances, and vulnerabilities.
 */
export function computeDamageWithDefenses(
  rawDmg: number,
  damageType: string,
  target: Combatant
): {
  finalDmg: number;
  notice: string;
  modifierReason: 'immune' | 'resistant' | 'vulnerable' | 'normal';
} {
  const normType = damageType.toLowerCase();
  const ruDmgName = DAMAGE_NAMES_RU[normType] || normType;

  const hasImmunity =
    checkHasDefense(target.damageImmunities, normType) ||
    checkHasDefense(target.statblock?.damage_immunities, normType);

  const hasResistance =
    checkHasDefense(target.damageResistances, normType) ||
    checkHasDefense(target.statblock?.damage_resistances, normType);

  const hasVulnerability =
    checkHasDefense(target.damageVulnerabilities, normType) ||
    checkHasDefense(target.statblock?.damage_vulnerabilities, normType);

  if (hasImmunity) {
    return {
      finalDmg: 0,
      notice: `У цели ИММУНИТЕТ к урону (${ruDmgName})! Урон сведён к 0.`,
      modifierReason: 'immune',
    };
  }

  if (hasResistance) {
    const finalDmg = Math.floor(rawDmg / 2);
    return {
      finalDmg,
      notice: `У цели СОПРОТИВЛЕНИЕ к урону (${ruDmgName})! Урон уменьшен вдвое (${rawDmg} -> ${finalDmg}).`,
      modifierReason: 'resistant',
    };
  }

  if (hasVulnerability) {
    const finalDmg = rawDmg * 2;
    return {
      finalDmg,
      notice: `У цели УЯЗВИМОСТЬ к урону (${ruDmgName})! Урон удвоен (${rawDmg} -> ${finalDmg}).`,
      modifierReason: 'vulnerable',
    };
  }

  return {
    finalDmg: rawDmg,
    notice: '',
    modifierReason: 'normal',
  };
}

const COUNT_WORDS_MAP: Record<string, number> = {
  '1': 1, 'один': 1, 'одну': 1, 'одним': 1, 'one': 1,
  '2': 2, 'два': 2, 'две': 2, 'двумя': 2, 'two': 2,
  '3': 3, 'три': 3, 'тремя': 3, 'three': 3,
  '4': 4, 'четыре': 4, 'четырьмя': 4, 'four': 4,
  '5': 5, 'пять': 5, 'five': 5,
};

/**
 * Parses Multiattack action description and returns an array of weapon/attack actions to execute in series.
 * Supports D&D 2024 and 5e wording:
 * - "Вампир совершает две атаки Ударом когтями и применяет Укус" -> [Grave Strike, Grave Strike, Bite]
 * - "Совершает 2 атаки Посохом ветра или 2 разряда Ветряного удара" -> [Посох ветра, Посох ветра]
 * - "Совершает три атаки: одну Укусом и две Когтями" -> [Bite, Claws, Claws]
 * - "Совершает две атаки оружием" -> [PrimaryAttack, PrimaryAttack]
 */
export function parseMultiattackPlan(multiattackAction: any, allActions: any[]): any[] {
  if (!multiattackAction) return [];

  // Filter out the multiattack action itself
  const candidateActions = allActions.filter(
    (a) => !/мультиатака|multiattack/i.test(a.name)
  );

  if (candidateActions.length === 0) return [];

  const desc = (multiattackAction.desc || '').toLowerCase();

  // Try matching individual actions mentioned by name or keyword in description
  const matchedPlan: any[] = [];

  for (const act of candidateActions) {
    const rawName = (act.name || '').replace(/\(.*?\)/g, '').trim().toLowerCase();
    const cleanTokens = rawName.split(/\s+/).filter((t: string) => t.length > 2);

    let foundIndex = -1;
    for (const token of cleanTokens) {
      const idx = desc.indexOf(token);
      if (idx !== -1) {
        foundIndex = idx;
        break;
      }
    }

    if (foundIndex !== -1) {
      // Look back up to 40 characters for count word
      const prefix = desc.substring(Math.max(0, foundIndex - 40), foundIndex);
      let count = 1;

      for (const [word, val] of Object.entries(COUNT_WORDS_MAP)) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(prefix)) {
          count = val;
          break;
        }
      }

      for (let i = 0; i < count; i++) {
        matchedPlan.push(act);
      }
    }
  }

  if (matchedPlan.length > 0) {
    return matchedPlan;
  }

  // If specific named attacks were not identified, look for a general attack count
  // e.g. "совершает две атаки", "makes 3 attacks", "совершает 2 рукопашные атаки"
  let generalCount: number | null = null;
  const generalRegex = /(?:совершает|makes|делает|делайет|проводит)\s+(?:до\s+)?(одну|один|две|два|три|четыре|пять|\d+)\s+(?:рукопашные|дальнобойные)?\s*(?:атаки|атак|attacks)/i;
  const match = desc.match(generalRegex);

  if (match && match[1]) {
    generalCount = COUNT_WORDS_MAP[match[1].toLowerCase()] ?? parseInt(match[1], 10);
  } else {
    // Check if any digit + "атак" appears
    const simpleMatch = desc.match(/(\d+)\s+(?:атаки|атак|attacks)/i);
    if (simpleMatch && simpleMatch[1]) {
      generalCount = parseInt(simpleMatch[1], 10);
    }
  }

  const primaryAttack = candidateActions[0];

  if (generalCount && !isNaN(generalCount) && generalCount > 0) {
    const plan: any[] = [];
    for (let i = 0; i < generalCount; i++) {
      plan.push(candidateActions[i % candidateActions.length] || primaryAttack);
    }
    return plan;
  }

  // Fallback: if multiple attacks exist, return them; otherwise 2 attacks of primary action
  if (candidateActions.length > 1) {
    return [candidateActions[0], candidateActions[1]];
  }

  return [primaryAttack, primaryAttack];
}
