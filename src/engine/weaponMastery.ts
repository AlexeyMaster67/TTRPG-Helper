import { WeaponMasteryProperty } from '../types/dnd5e';

export interface WeaponMasteryInfo {
  property: WeaponMasteryProperty;
  nameRu: string;
  nameEn: string;
  triggerRu: string;
  effectRu: string;
  effectEn: string;
}

export const WEAPON_MASTERY_2024: Record<WeaponMasteryProperty, WeaponMasteryInfo> = {
  Slow: {
    property: 'Slow',
    nameRu: 'Замедление (Slow)',
    nameEn: 'Slow',
    triggerRu: 'При попадании атакой',
    effectRu: 'Снижает скорость цели на 10 футов до начала вашего следующего хода (не суммируется).',
    effectEn: 'Hit reduces target speed by 10 ft until start of your next turn.',
  },
  Topple: {
    property: 'Topple',
    nameRu: 'Опрокидывание (Topple)',
    nameEn: 'Topple',
    triggerRu: 'При попадании атакой',
    effectRu:
      'Цель должна преуспеть в спасброске Телосложения (Сл = 8 + мод. атаки + БМ) или стать сбитой с ног (состояние «Сбитый с ног»).',
    effectEn:
      'Hit forces CON saving throw (DC 8 + ability mod + PB) or target is knocked Prone.',
  },
  Vex: {
    property: 'Vex',
    nameRu: 'Досаждение (Vex)',
    nameEn: 'Vex',
    triggerRu: 'При попадании и нанесении урона',
    effectRu:
      'Вы получаете преимущество на следующий бросок атаки по этой цели до конца вашего следующего хода.',
    effectEn:
      'Hit grants Advantage on your next attack roll against this target before end of your next turn.',
  },
  Sap: {
    property: 'Sap',
    nameRu: 'Ослабление (Sap)',
    nameEn: 'Sap',
    triggerRu: 'При попадании атакой',
    effectRu:
      'Цель совершает свой следующий бросок атаки до начала вашего следующего хода с помехой.',
    effectEn:
      'Hit imposes Disadvantage on target’s next attack roll before start of your next turn.',
  },
  Nick: {
    property: 'Nick',
    nameRu: 'Быстрый удар (Nick)',
    nameEn: 'Nick',
    triggerRu: 'При совершении атаки лёгким оружием',
    effectRu:
      'Дополнительная атака от свойства «Лёгкое» совершается в рамках действия «Атака», а не бонусного действия.',
    effectEn:
      'The extra attack from the Light property can be made as part of the Attack action instead of a Bonus Action.',
  },
  Push: {
    property: 'Push',
    nameRu: 'Толчок (Push)',
    nameEn: 'Push',
    triggerRu: 'При попадании атакой',
    effectRu:
      'Вы можете оттолкнуть цель размером не больше Большого на расстояние до 10 футов по прямой линии от вас.',
    effectEn:
      'You can push a Large or smaller target up to 10 ft straight away from you.',
  },
  Graze: {
    property: 'Graze',
    nameRu: 'Задевание (Graze)',
    nameEn: 'Graze',
    triggerRu: 'При промахе атакой',
    effectRu:
      'Если бросок атаки промахивается, цель всё равно получает урон, равный модификатору характеристики, использованной для атаки.',
    effectEn:
      'If attack roll misses, target takes damage equal to the ability modifier used for the attack.',
  },
  Cleave: {
    property: 'Cleave',
    nameRu: 'Рассечение (Cleave)',
    nameEn: 'Cleave',
    triggerRu: 'При попадании атакой в ближнем бою',
    effectRu:
      'Один раз за ход вы можете совершить дополнительную атаку по второму существу в пределах 5 футов от цели и в пределах вашей досягаемости.',
    effectEn:
      'Once per turn, make a melee attack roll against a second creature within 5 ft of the first and within your reach.',
  },
};

/**
 * Parses weapon mastery name string (case-insensitive) to valid enum property.
 */
export function parseWeaponMastery(name: string | null | undefined): WeaponMasteryProperty | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  for (const key of Object.keys(WEAPON_MASTERY_2024) as WeaponMasteryProperty[]) {
    if (key.toLowerCase() === normalized) {
      return key;
    }
  }
  return null;
}
