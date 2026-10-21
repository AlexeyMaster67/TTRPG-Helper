import { useState } from 'react';
import clsx from 'clsx';
import { WeaponMasteryProperty } from '../../types/dnd5e';

export interface MasteryDefinition {
  code: string;
  nameEn: string;
  nameRu: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  triggerRu: string;
  mechanicRu: string;
}

export const MASTERY_SPECS: Record<string, MasteryDefinition> = {
  Slow: {
    code: 'ЗАМ',
    nameEn: 'Slow',
    nameRu: 'Замедление',
    badgeBg: 'bg-blue-950/40',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-300',
    triggerRu: 'Попадание атакой',
    mechanicRu: 'Снижает скорость цели на 10 футов до начала вашего следующего хода (не суммируется).',
  },
  Topple: {
    code: 'ОПР',
    nameEn: 'Topple',
    nameRu: 'Опрокидывание',
    badgeBg: 'bg-amber-950/40',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-300',
    triggerRu: 'Попадание атакой',
    mechanicRu: 'Спасбросок ТЕЛ (Сл = 8 + мод. атаки + БМ) или цель сбивается с ног.',
  },
  Vex: {
    code: 'ДОС',
    nameEn: 'Vex',
    nameRu: 'Досаждение',
    badgeBg: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-300',
    triggerRu: 'Попадание атакой',
    mechanicRu: 'Преимущество на следующий бросок атаки по этой цели до конца вашего следующего хода.',
  },
  Sap: {
    code: 'ОСЛ',
    nameEn: 'Sap',
    nameRu: 'Ослабление',
    badgeBg: 'bg-purple-950/40',
    borderColor: 'border-purple-500/40',
    textColor: 'text-purple-300',
    triggerRu: 'Попадание атакой',
    mechanicRu: 'Цель совершает свой следующий бросок атаки до начала вашего следующего хода с помехой.',
  },
  Nick: {
    code: 'БЫС',
    nameEn: 'Nick',
    nameRu: 'Быстрый удар',
    badgeBg: 'bg-pink-950/40',
    borderColor: 'border-pink-500/40',
    textColor: 'text-pink-300',
    triggerRu: 'Атака лёгким оружием',
    mechanicRu: 'Дополнительная атака от свойства «Лёгкое» совершается в рамках действия «Атака», а не бонусного действия.',
  },
  Push: {
    code: 'ТОЛ',
    nameEn: 'Push',
    nameRu: 'Толчок',
    badgeBg: 'bg-indigo-950/40',
    borderColor: 'border-indigo-500/40',
    textColor: 'text-indigo-300',
    triggerRu: 'Попадание атакой',
    mechanicRu: 'Отталкивает цель размера Большой или меньше на 10 футов по прямой линии от вас.',
  },
  Graze: {
    code: 'ЗАД',
    nameEn: 'Graze',
    nameRu: 'Задевание',
    badgeBg: 'bg-gray-800/40',
    borderColor: 'border-gray-500/40',
    textColor: 'text-gray-300',
    triggerRu: 'Промах атакой',
    mechanicRu: 'Цель всё равно получает урон, равный модификатору характеристики, использованной для атаки.',
  },
  Cleave: {
    code: 'РАС',
    nameEn: 'Cleave',
    nameRu: 'Рассечение',
    badgeBg: 'bg-red-950/40',
    borderColor: 'border-red-500/40',
    textColor: 'text-red-300',
    triggerRu: 'Попадание в ближнем бою',
    mechanicRu: '1 раз за ход совершается доп. атака по соседнему существу в пределах 5 футов и досягаемости оружия.',
  },
};

export interface MasteryBadgeProps {
  property: WeaponMasteryProperty | string;
  className?: string;
  showFullName?: boolean;
}

export function MasteryBadge({
  property,
  className,
  showFullName = false,
}: MasteryBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Normalize lookup key (supports English name, Russian name, or code)
  const normalized = Object.keys(MASTERY_SPECS).find((k) => {
    const spec = MASTERY_SPECS[k];
    const target = property.toLowerCase();
    return (
      k.toLowerCase() === target ||
      spec.code.toLowerCase() === target ||
      spec.nameRu.toLowerCase() === target ||
      spec.nameEn.toLowerCase() === target
    );
  });

  const spec = normalized ? MASTERY_SPECS[normalized] : null;

  if (!spec) {
    return (
      <span className="border border-white/10 bg-surface px-1.5 py-0.5 text-[11px] font-mono text-gray-400 rounded-sm">
        {property}
      </span>
    );
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span
        className={clsx(
          'inline-flex items-center gap-1 border font-mono font-bold rounded-sm select-none cursor-help px-1.5 py-0.5 text-[11px] leading-none transition-all duration-150',
          spec.badgeBg,
          spec.borderColor,
          spec.textColor,
          'hover:brightness-125',
          className
        )}
      >
        <span>{spec.code}</span>
        {showFullName && (
          <span className="font-sans font-normal text-gray-300 ml-0.5">
            ({spec.nameRu})
          </span>
        )}
      </span>

      {/* Floating Micro-Popover Tooltip */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-1.5 z-50 w-60 rounded border border-border-subtle bg-surface p-2.5 shadow-xl backdrop-blur text-xs">
          <div className="flex items-center justify-between mb-1 pb-1 border-b border-border-subtle">
            <span className={clsx('font-bold font-mono', spec.textColor)}>
              {spec.code} • {spec.nameRu}
            </span>
            <span className="text-[10px] text-gold-light/80 font-bold uppercase">
              Свойство D&D 2024
            </span>
          </div>
          <div className="text-[10px] text-gold-light mb-1">
            Условие: <span className="text-gray-300">{spec.triggerRu}</span>
          </div>
          <div className="text-[11px] text-gray-300 leading-snug">
            {spec.mechanicRu}
          </div>
        </div>
      )}
    </div>
  );
}
