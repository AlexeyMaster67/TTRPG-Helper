import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
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
  nameKey: 'templateNpcName' | 'templateLocationName' | 'templateFactionName' | 'templateQuestName' | 'templateSessionName';
  descKey: 'templateNpcDesc' | 'templateLocationDesc' | 'templateFactionDesc' | 'templateQuestDesc' | 'templateSessionDesc';
  type: WBEntityType;
  icon: React.ComponentType<{ className?: string }>;
  folderRu: string;
  folderEn: string;
  content: (title: string, lang: string) => string;
}

const TEMPLATES: TemplateDef[] = [
  {
    id: 'npc',
    nameKey: 'templateNpcName',
    descKey: 'templateNpcDesc',
    type: 'npc',
    icon: User,
    folderRu: '01_Персонажи',
    folderEn: '01_Characters',
    content: (title, lang) =>
      lang === 'en'
        ? `---
title: "${title}"
type: npc
tags: [npc, ally]
status: alive
cr: 3
custom_fields:
  "Alignment": "Neutral Good"
  "Occupation": "Information Broker"
---

# ${title}

Brief introduction and the party's first impression of this character.

## Appearance & Mannerisms
- **Attire**: 
- **Voice & Habits**: 
- **Distinguishing Features**: 

## Faction Ties
- Loyal to Faction: 
- Disposition towards party: Neutral.

## GM Secrets
:::secret [True Intentions]
Secret character motives or hidden danger...
Insight check: dice:1d20+4 against DC 14.
:::
`
        : `---
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
    nameKey: 'templateLocationName',
    descKey: 'templateLocationDesc',
    type: 'location',
    icon: MapPin,
    folderRu: '02_Локации',
    folderEn: '02_Locations',
    content: (title, lang) =>
      lang === 'en'
        ? `---
title: "${title}"
type: location
tags: [settlement, location, exploration]
status: active
custom_fields:
  "Region": "Sword Coast"
  "Ruler": "Lord Mayor"
  "Danger Level": "Low"
---

# ${title}

Description of atmosphere, sights, sounds, and architecture.

## Points of Interest
1. **Town Square**: Bustling trade hub and town crier announcements.
2. **The Tavern**: Meeting place for rumors and adventurers.
3. **Temple / Tower**: Religious or arcane sanctuary.

## Rumors Table
Roll dice:1d6:
1. Clattering bones heard under the crypt (@monster:Skeleton).
2. Merchant caravan delayed by goblins.
3. Herbalist pays well for marsh roots.
4-6. Idle town gossip.
`
        : `---
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
    nameKey: 'templateFactionName',
    descKey: 'templateFactionDesc',
    type: 'faction',
    icon: Shield,
    folderRu: '03_Фракции',
    folderEn: '03_Factions',
    content: (title, lang) =>
      lang === 'en'
        ? `---
title: "${title}"
type: faction
tags: [faction, organization]
status: active
custom_fields:
  "Leader": "Shadow Council"
  "Headquarters": "Upper City"
  "Disposition": "Neutral"
---

# ${title}

Origins, history, and political influence in the region.

## Goals & Tenets
- **Primary Goal**: 
- **Methods**: 

## Key Figures
- Order Grandmaster: 
- Contact for party: 
`
        : `---
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
    nameKey: 'templateQuestName',
    descKey: 'templateQuestDesc',
    type: 'quest',
    icon: Scroll,
    folderRu: '04_Квесты',
    folderEn: '04_Quests',
    content: (title, lang) =>
      lang === 'en'
        ? `---
title: "${title}"
type: quest
tags: [quest, investigation]
status: active
custom_fields:
  "Questgiver": "Townsfolk"
  "Reward": "500 gp and treasure map"
---

# ${title}

Adventure hook and party motivation to undertake the quest.

## Quest Objectives
- [ ] Interview witnesses at the tavern
- [ ] Track the bandit hideout in the woods
- [ ] Defeat the bandit captain (@monster:Bandit Captain)

## GM Notes
:::secret [Plot Twist]
The questgiver orchestrates the heist themselves...
:::
`
        : `---
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
    nameKey: 'templateSessionName',
    descKey: 'templateSessionDesc',
    type: 'session',
    icon: BookOpen,
    folderRu: '05_Дневники_Сессий',
    folderEn: '05_Session_Journals',
    content: (title, lang) =>
      lang === 'en'
        ? `---
title: "${title}"
type: session
tags: [session, log]
created: "${new Date().toISOString().split('T')[0]}"
---

# ${title}

## Summary
Key decisions and triumphs achieved by the heroes during this session.

## Chronology of Events
1. Tavern scene: 
2. Mountain ambush: 
3. Secret cache discovered: 

## Acquired Loot & Rewards
- Gold: 0 gp
- Items: 

## GM Notes for Next Session
- Prepare dungeon battlemap for the boss encounter.
`
        : `---
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
  const { t, language } = useTranslation();
  const createNote = useWBStore((s) => s.createNote);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDef>(TEMPLATES[0]);
  const [noteTitle, setNoteTitle] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    const templateName = t(`wb.${selectedTemplate.nameKey}`);
    const title = noteTitle.trim() || templateName;
    const folder = language === 'en' ? selectedTemplate.folderEn : selectedTemplate.folderRu;
    const content = selectedTemplate.content(title, language);
    await createNote(folder, title, selectedTemplate.type, content);
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
            <span>{t('wb.templateModalTitle')}</span>
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
              {t('wb.templateNoteTitleLabel')}
            </label>
            <input
              type="text"
              placeholder={`${t('wb.templateNoteTitleLabel')} ${t(`wb.${selectedTemplate.nameKey}`)}`}
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-750 text-zinc-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              {t('wb.templateTypeLabel')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = selectedTemplate.id === tmpl.id;
                const name = t(`wb.${tmpl.nameKey}`);
                const desc = t(`wb.${tmpl.descKey}`);

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
                        {name}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {desc}
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
            {t('wb.cancel')}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('wb.createNoteButton')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
