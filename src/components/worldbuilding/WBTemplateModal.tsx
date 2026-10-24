import React, { useState } from 'react';
import { useWBStore } from '../../store/wbStore';
import { WBEntityType } from '../../types/wbmd';
import {
  X,
  User,
  MapPin,
  Shield,
  Scroll,
  BookOpen,
  Sparkles,
} from 'lucide-react';

interface WBTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplateDef {
  id: string;
  name: string;
  desc: string;
  type: WBEntityType;
  icon: React.ComponentType<{ className?: string }>;
  folder: string;
  content: (title: string) => string;
}

const TEMPLATES: TemplateDef[] = [
  {
    id: 'npc',
    name: 'Персонаж / NPC',
    desc: 'Шаблон персонажа мастера, союзника или антагониста с секретами и статблоком.',
    type: 'npc',
    icon: User,
    folder: '01_Персонажи',
    content: (title) => `---
title: "${title}"
type: npc
tags: [npc, союзник]
status: alive
cr: 3
custom_fields:
  "Мировоззрение": "Нейтрально-добрый"
  "Род занятий": "Торговец информацией"
---

# ${title}

Краткое введение и первое впечатление партии о персонаже.

## Внешность и Манеры
- **Одежда**: 
- **Голос и привычки**: 
- **Отличительные черты**: 

## Связи и Фракция
- Лоялен к фракции: 
- Отношение к героям: Нейтральное.

## Секреты для Мастера
:::secret [Истинные намерения]
Тайный мотив персонажа или скрытая угроза...
Бросок на проницательность: dice:1d20+4 против DC 14.
:::
`,
  },
  {
    id: 'location',
    name: 'Поселение / Локация',
    desc: 'Город, замок, таверна или подземелье с районами и случайными событиями.',
    type: 'location',
    icon: MapPin,
    folder: '02_Локации',
    content: (title) => `---
title: "${title}"
type: location
tags: [город, локация, исследование]
status: active
custom_fields:
  "Регион": "Берег Мечей"
  "Правитель": "Лорд-наместник"
  "Уровень угрозы": "Низкий"
---

# ${title}

Описание общей атмосферы, запахов, звуков и архитектуры места.

## Ключевые Места
1. **Главная площадь**: Центр торговли и публичных объявлений.
2. **Таверна**: Место отдыха искателей приключений и слухов.
3. **Храм / Башня**: Религиозный или магический центр.

## Таблица Слухов
Бросьте dice:1d6:
1. В катакомбах под рынком слышен скрежет костей (@monster:Skeleton).
2. Караван купцов задерживается из-за гоблинов.
3. Местный алхимик платит за редкие травы с болот.
4-6. Обычные городские сплетни.
`,
  },
  {
    id: 'faction',
    name: 'Фракция / Гильдия',
    desc: 'Тайный орден, культ, торговый картель или воровская гильдия.',
    type: 'faction',
    icon: Shield,
    folder: '03_Фракции',
    content: (title) => `---
title: "${title}"
type: faction
tags: [фракция, организация]
status: active
custom_fields:
  "Лидер": "Теневой Совет"
  "Штаб-квартира": "Верхний Город"
  "Отношение к партии": "Нейтральное"
---

# ${title}

История зарождения и политическое влияние организации в регионе.

## Цели и Догматы
- **Главная цель**: 
- **Методы**: 

## Ключевые Личности
- Глава ордена: 
- Связной для партии: 
`,
  },
  {
    id: 'quest',
    name: 'Квест / Задание',
    desc: 'Сюжетная арка или побочный квест с целями, наградой и энкаунтерами.',
    type: 'quest',
    icon: Scroll,
    folder: '04_Квесты',
    content: (title) => `---
title: "${title}"
type: quest
tags: [квест, расследование]
status: active
custom_fields:
  "Квестодатель": "Горожанин"
  "Награда": "500 gp и карта сокровищ"
---

# ${title}

Завязка приключения и мотивация для отряда взяться за дело.

## Этапы Задания
- [ ] Опросить свидетелей в таверне
- [ ] Отыскать логово разбойников в лесу
- [ ] Победить главаря (@monster:Bandit Captain)

## Заметки Мастера
:::secret [Твист сюжета]
На самом деле квестодатель сам причастен к краже...
:::
`,
  },
  {
    id: 'session',
    name: 'Дневник Сессии',
    desc: 'Структура для записи хроники прошедшей сессии и планов на следующую.',
    type: 'session',
    icon: BookOpen,
    folder: '05_Дневники_Сессий',
    content: (title) => `---
title: "${title}"
type: session
tags: [сессия, отчет]
created: "${new Date().toISOString().split('T')[0]}"
---

# ${title}

## Краткое содержание
Ключевые события и решения, принятые игроками на этой встрече.

## Хронология Событий
1. Сцена в таверне: 
2. Битва на перевале: 
3. Обнаружение тайника: 

## Полученный Лут и Опыт
- Золото: 0 gp
- Предметы: 

## Планы Мастера на следующую игру
- Подготовить боевую карту для босса.
`,
  },
];

export const WBTemplateModal: React.FC<WBTemplateModalProps> = ({ isOpen, onClose }) => {
  const createNote = useWBStore((s) => s.createNote);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDef>(TEMPLATES[0]);
  const [noteTitle, setNoteTitle] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    const title = noteTitle.trim() || selectedTemplate.name;
    const content = selectedTemplate.content(title);
    await createNote(selectedTemplate.folder, title, selectedTemplate.type, content);
    setNoteTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-base">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Создать заметку по шаблону</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Название новой заметки:
            </label>
            <input
              type="text"
              placeholder={`Например: ${selectedTemplate.name}`}
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-750 text-zinc-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Выберите тип шаблона:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = selectedTemplate.id === tmpl.id;

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-zinc-400'}`} />
                      <span className={`font-semibold text-xs ${isSelected ? 'text-amber-200' : 'text-zinc-200'}`}>
                        {tmpl.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {tmpl.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Создать заметку</span>
          </button>
        </div>
      </div>
    </div>
  );
};
