import { WBNote, WBFolder, WBMetaData } from '../types/wbmd';
import { parseFrontmatter, serializeFrontmatter, extractTags, extractWikilinks } from '../utils/wbMarkdownParser';
import { useSettingsStore } from '../store/settingsStore';

// Sample default starter campaign templates (Russian)
export const STARTER_CAMPAIGN_FILES: { path: string; content: string }[] = [
  {
    path: '00_Кодекс/Памятка_Мастера.md',
    content: `---
title: "Памятка Мастера"
type: lore
tags: [правила, памятка, мастер]
---

# 📜 Памятка Мастера Кампании

Добро пожаловать в **WBmd (Worldbuilding Markdown)** — вашу персональную базу знаний для кампании в **TTRPGHelper**!

## ✨ Быстрый старт
- Связывайте заметки с помощью **[[Викиссылок]]**: например [[Порт Найанзару]] или [[Элдрин Шепчущий|Наш эльф]].
- Добавляйте интерактивные ссылки на существ из бестиария: @monster:Goblin Boss или @monster:Adult Red Dragon. При наведении покажется статблок, а по клику можно сразу отправить их в инициативу!
- Бросайте кубики прямо из текста: dice:1d20+5 или dice:2d6+3.
- Скрывайте секреты мастера от игроков:
  - Инлайн-спойлер: ||Секретная кнопка под троном|| (раскрывается по клику).
  - Блок секретов:
:::secret [Секреты Подземелья]
На глубине 15 метров скрыт алтарь Векны. Ловушка DC 16.
:::

## 📺 Экран Игроков
Нажмите кнопку **«Транслировать»** вверху заметки, и TTRPGHelper автоматически удалит все блоки \`:::secret\` и спойлеры \`||...||\`, отправив игрокам только чистый публичный текст и арты!
`,
  },
  {
    path: '01_Персонажи/Элдрин_Шепчущий.md',
    content: `---
title: "Элдрин Шепчущий"
type: npc
tags: [эльф, маг, информатор, арфисты]
status: alive
location: "[[Порт Найанзару]]"
faction: "[[Арфисты]]"
cr: 6
custom_fields:
  "Мировоззрение": "Хаотично-добрый"
  "Секретный пароль": "Полуночный ворон"
---

# Элдрин Шепчущий

Таинственный связной фракции [[Арфисты]], обитающий в таверне на окраине [[Порт Найанзару]].

## Внешность и характер
Высокий эльф в потертом бархатном плаще цвета морской волны. Говорит тихо, взвешивая каждое слово. Постоянно перебирает пальцами серебряную монетку.

## Снаряжение и магия
Элдрин владеет сильной иллюзорной магией. В бою предпочитает держаться на дистанции.
При опасности призывает верного защитника: @monster:Mage.

## Секреты для Мастера
:::secret [Истинная цель Элдрина]
Элдрин тайно ищет древний артефакт в локации [[Гробница Девяти Богов]].
Он знает, что за ним следят шпионы [[Жентарим]].
Бросок на распознавание лжи: dice:1d20+7 против пассивного восприятия партии.
:::
`,
  },
  {
    path: '02_Локации/Порт_Найанзару.md',
    content: `---
title: "Порт Найанзару"
type: location
tags: [город, побережье, торговля]
status: flourishing
custom_fields:
  "Регион": "Чулт"
  "Правители": "Семь Торговых Князей"
  "Опасность": "Средняя"
---

# Порт Найанзару

Сияющий жемчуг побережья, крупный портовый город и ворота в неизведанные джунгли.

## Основные районы
- **Великий Рынок**: место, где можно купить любые экзотические товары, зелья и карты.
- **Гавань**: причалы для сотен кораблей со всего Фаэруна.
- **Арена Гладиаторов**: еженедельные состязания с дикими зверями.

## Ключевые персоны
- [[Элдрин Шепчущий]] — информатор в Нижнем городе.
- Представители фракций [[Арфисты]] и [[Жентарим]].

## Случайное событие в городе
Бросьте dice:1d6:
1. Побег динозавра из загона! @monster:Velociraptor на улицах.
2. Карманник крадет кошель у игрока (DC 14).
3. Шествие жрецов в честь бога солнца.
4-6. Спокойный день на базаре.
`,
  },
  {
    path: '03_Фракции/Арфисты.md',
    content: `---
title: "Арфисты"
type: faction
tags: [фракция, добро, шпионы, тайный_орден]
status: active
custom_fields:
  "Лидер": "Высшие Арфисты"
  "Штаб": "Берег Мечей"
  "Отношение к партии": "Дружелюбное"
---

# Арфисты (The Harpers)

Древний тайный орден магов и следопытов, защищающий баланс и борющийся против тирании во всех её проявлениях.

## Агенты в регионе
- [[Элдрин Шепчущий]] — главный резидент в [[Порт Найанзару]].

## Символика
Серебряная арфа в кольце полумесяца.
`,
  },
  {
    path: '04_Квесты/Тайна_Гробницы.md',
    content: `---
title: "Тайна Гробницы"
type: quest
tags: [квест, основная_линия, нежить]
status: active
custom_fields:
  "Квестодатель": "[[Элдрин Шепчущий]]"
  "Награда": "2500 gp и древний свиток"
  "Сложность": "Высокая"
---

# Тайна Гробницы

[[Элдрин Шепчущий]] нанял отряд для расследования аномалии в джунглях к югу от [[Порт Найанзару]].

## Цели задания
- [ ] Отыскать вход в заброшенную гробницу
- [ ] Обезвредить древние ловушки
- [ ] Найти источник проклятия

## Возможные противники
- В коридорах бродят @monster:Ghoul и @monster:Skeleton.
`,
  },
  {
    path: '05_Дневники_Сессий/Сессия_01.md',
    content: `---
title: "Сессия 01: Прибытие в порт"
type: session
tags: [сессия, отчет, начало]
created: "2026-10-24"
---

# Сессия 01: Прибытие в порт

Корабль искателей приключений бросил якорь в бухте [[Порт Найанзару]].

## Хроника событий
1. Знакомство в таверне с загадочным эльфом [[Элдрин Шепчущий]].
2. Получено первое задание: [[Тайна Гробницы]].
3. Стычка с бандитами из картеля, бросок инициативы прошел успешно.

## Заметки на следующую игру
- Подготовить карту джунглей для перехода к руинам.
- Проверить запасы провизии и лечебных зелий у партии.
`,
  },
];

// Sample default starter campaign templates (English)
export const STARTER_CAMPAIGN_FILES_EN: { path: string; content: string }[] = [
  {
    path: '00_Codex/GM_CheatSheet.md',
    content: `---
title: "GM Cheat Sheet"
type: lore
tags: [rules, cheatsheet, gm]
---

# 📜 Campaign GM Cheat Sheet

Welcome to **WBmd (Worldbuilding Markdown)** — your offline virtual tabletop campaign notebook in **TTRPGHelper**!

## ✨ Quick Start
- Link notes with **[[Wikilinks]]**: for example [[Port Nyanzaru]] or [[Eldrin Whisperwind|Our contact]].
- Embed live creature statblocks from bestiary: @monster:Goblin Boss or @monster:Adult Red Dragon. Hovering previews the statblock, and clicking summons them directly into combat initiative!
- Roll dice right from the text: dice:1d20+5 or dice:2d6+3.
- Hide GM secrets from players:
  - Inline spoiler: ||Secret trapdoor under the throne|| (click to reveal).
  - Secret block:
:::secret [Dungeon Secrets]
At a depth of 50 feet lies an altar of Vecna. Trap DC 16.
:::

## 📺 Player Display
Click **"To Players"** at the top of any note, and TTRPGHelper will automatically strip out all \`:::secret\` blocks and \`||...||\` spoilers, sending a clean, spoiler-free handout to the player screen!
`,
  },
  {
    path: '01_Characters/Eldrin_Whisperwind.md',
    content: `---
title: "Eldrin Whisperwind"
type: npc
tags: [elf, mage, informant, harpers]
status: alive
location: "[[Port Nyanzaru]]"
faction: "[[The Harpers]]"
cr: 6
custom_fields:
  "Alignment": "Chaotic Good"
  "Secret Password": "Midnight Raven"
---

# Eldrin Whisperwind

Mysterious contact for [[The Harpers]], dwelling in a waterfront tavern of [[Port Nyanzaru]].

## Appearance & Mannerisms
A tall elf in a weathered sea-green velvet cloak. Speaks in measured whispers and constantly rolls a silver coin across his knuckles.

## Magic & Combat
Eldrin specializes in potent illusion and abjuration magic. If cornered, he calls upon a devoted bodyguard: @monster:Mage.

## GM Secrets
:::secret [Eldrin's Secret Objective]
Eldrin secretly seeks an ancient relic in [[Tomb of the Nine Gods]].
He knows [[Zhentarim]] spies are shadowing him.
Insight check against him: dice:1d20+7 vs party passive perception.
:::
`,
  },
  {
    path: '02_Locations/Port_Nyanzaru.md',
    content: `---
title: "Port Nyanzaru"
type: location
tags: [city, coast, trade]
status: flourishing
custom_fields:
  "Region": "Chult"
  "Rulers": "Seven Merchant Princes"
  "Danger Level": "Medium"
---

# Port Nyanzaru

The glistening jewel of the coast, a bustling seaport and gateway to the uncharted jungle.

## Key Districts
- **Grand Souk**: Open-air bazaar packed with rare herbs, potions, and beast tamers.
- **Harbor Basin**: Deepwater anchorage for galleons from all across the realms.
- **Gladiator Arena**: Weekly combats against captured dinosaurs and beasts.

## Notable Persons
- [[Eldrin Whisperwind]] — informant in the Old City.
- Representatives of [[The Harpers]].

## Random City Events
Roll dice:1d6:
1. Escaped dinosaur rampages near the docks! (@monster:Velociraptor).
2. Cutpurse attempts to snatch a player's pouch (Sleight of Hand DC 14).
3. Festival procession honoring the sun deity.
4-6. Typical peaceful day at the market.
`,
  },
  {
    path: '03_Factions/The_Harpers.md',
    content: `---
title: "The Harpers"
type: faction
tags: [faction, good, spies, secret_order]
status: active
custom_fields:
  "Leader": "High Harpers"
  "Headquarters": "Sword Coast"
  "Disposition": "Friendly"
---

# The Harpers

An ancient secret society of spellcasters and rangers dedicated to preserving balance and resisting tyranny across the realms.

## Local Agents
- [[Eldrin Whisperwind]] — primary operative in [[Port Nyanzaru]].

## Symbol
A silver harp enclosed within the horns of a crescent moon.
`,
  },
  {
    path: '04_Quests/Mystery_of_the_Tomb.md',
    content: `---
title: "Mystery of the Tomb"
type: quest
tags: [quest, main_quest, undead]
status: active
custom_fields:
  "Questgiver": "[[Eldrin Whisperwind]]"
  "Reward": "2500 gp and ancient scroll"
  "Difficulty": "High"
---

# Mystery of the Tomb

[[Eldrin Whisperwind]] has hired the party to investigate an arcane anomaly deep in the jungle south of [[Port Nyanzaru]].

## Objectives
- [ ] Locate the overgrown entrance to the lost tomb
- [ ] Disarm ancient warding traps
- [ ] Uncover the origin of the death curse

## Notable Foes
- Corridors are stalked by @monster:Ghoul and @monster:Skeleton.
`,
  },
  {
    path: '05_Session_Journals/Session_01.md',
    content: `---
title: "Session 01: Arrival at Port"
type: session
tags: [session, log, prologue]
created: "2026-10-24"
---

# Session 01: Arrival at Port

The adventuring party dropped anchor in the sapphire waters of [[Port Nyanzaru]].

## Event Log
1. Met with the enigmatic informant [[Eldrin Whisperwind]] at the harbor tavern.
2. Accepted first expedition mission: [[Mystery of the Tomb]].
3. Ambushed by dockside thugs; successfully rolled initiative and repelled them.

## GM Notes for Next Session
- Prepare regional wilderness travel map towards the interior ruins.
`,
  },
];

export function getStarterFiles(forcedLang?: 'en' | 'ru'): { path: string; content: string }[] {
  const currentLang = forcedLang || (typeof useSettingsStore !== 'undefined' ? useSettingsStore.getState?.()?.language : 'ru');
  if (currentLang === 'en') {
    return STARTER_CAMPAIGN_FILES_EN;
  }
  return STARTER_CAMPAIGN_FILES;
}

class WBStorageService {
  private inMemoryFiles: Map<string, string> = new Map();
  private isTauriAvailable(): boolean {
    return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
  }

  constructor() {
    // Populate in-memory fallback with starter notes by default
    for (const item of getStarterFiles()) {
      this.inMemoryFiles.set(item.path, item.content);
    }
  }

  /**
   * Opens directory selection dialog in desktop Tauri or prompts virtual vault name in browser
   */
  async openVaultDialog(): Promise<string | null> {
    if (this.isTauriAvailable()) {
      try {
        const tauri = (window as any).__TAURI__;
        if (tauri?.dialog?.open) {
          const selected = await tauri.dialog.open({
            directory: true,
            multiple: false,
            title: 'Выберите папку для Хранилища Worldbuilding (WBmd)',
          });
          if (selected && typeof selected === 'string') {
            return selected;
          }
        }
      } catch (err) {
        console.warn('[WBStorage] Native dialog failed or cancelled, using fallback:', err);
      }
    }

    // Web fallback
    const defaultName = 'TTRPG_Campaign_Vault';
    return defaultName;
  }

  /**
   * Recursively reads directory or in-memory map to load notes and folders
   */
  async loadVaultFiles(vaultPath: string): Promise<{ notes: WBNote[]; folders: WBFolder[] }> {
    const notes: WBNote[] = [];
    const folderMap = new Map<string, WBFolder>();

    if (this.isTauriAvailable() && vaultPath && !vaultPath.startsWith('virtual:')) {
      try {
        const fs = await import('@tauri-apps/plugin-fs');
        const scanDir = async (dirPath: string, relPath = ''): Promise<void> => {
          const entries = await fs.readDir(dirPath);
          for (const entry of entries) {
            const entryRel = relPath ? `${relPath}/${entry.name}` : entry.name;
            const fullPath = `${dirPath}/${entry.name}`;

            if (entry.isDirectory) {
              if (entry.name.startsWith('.') && entry.name !== '.wbmd') continue;
              if (!folderMap.has(entryRel)) {
                folderMap.set(entryRel, { name: entry.name, path: entryRel, children: [] });
              }
              await scanDir(fullPath, entryRel);
            } else if (entry.isFile && entry.name.toLowerCase().endsWith('.md')) {
              try {
                const rawContent = await fs.readTextFile(fullPath);
                const note = this.parseRawNote(entryRel, entry.name, fullPath, rawContent);
                notes.push(note);
              } catch (readErr) {
                console.warn(`[WBStorage] Error reading file ${fullPath}:`, readErr);
              }
            }
          }
        };

        await scanDir(vaultPath);

        // If vault is completely empty, initialize starter files
        if (notes.length === 0) {
          await this.initDefaultStarterVault(vaultPath);
          return this.loadVaultFiles(vaultPath);
        }

        const folders = Array.from(folderMap.values());
        return { notes, folders };
      } catch (tauriErr) {
        console.warn('[WBStorage] Tauri FS read error, falling back to in-memory store:', tauriErr);
      }
    }

    // Web / In-Memory / LocalStorage fallback
    this.loadFromLocalStorage(vaultPath);

    for (const [relPath, content] of this.inMemoryFiles.entries()) {
      if (relPath.toLowerCase().endsWith('.md')) {
        const parts = relPath.split('/');
        const fileName = parts[parts.length - 1];
        if (parts.length > 1) {
          const folderRel = parts.slice(0, -1).join('/');
          const folderName = parts[parts.length - 2];
          if (!folderMap.has(folderRel)) {
            folderMap.set(folderRel, { name: folderName, path: folderRel, children: [] });
          }
        }
        const note = this.parseRawNote(relPath, fileName, `${vaultPath}/${relPath}`, content);
        notes.push(note);
      }
    }

    return { notes, folders: Array.from(folderMap.values()) };
  }

  /**
   * Saves a single note's content to disk or fallback storage
   */
  async saveNote(note: WBNote): Promise<void> {
    const fullContent = serializeFrontmatter(note.meta, note.body);
    note.content = fullContent;
    note.modifiedTime = Date.now();

    if (this.isTauriAvailable() && note.path && !note.path.startsWith('virtual:')) {
      try {
        const fs = await import('@tauri-apps/plugin-fs');
        await fs.writeTextFile(note.path, fullContent);
        return;
      } catch (err) {
        console.warn(`[WBStorage] Tauri write failed for ${note.path}, saving to memory:`, err);
      }
    }

    // In-memory + LocalStorage fallback
    this.inMemoryFiles.set(note.id, fullContent);
    this.saveToLocalStorage();
  }

  /**
   * Creates a new markdown note
   */
  async createNote(
    vaultPath: string,
    folderRel: string,
    title: string,
    initialContent?: string,
    type: WBMetaData['type'] = 'custom'
  ): Promise<WBNote> {
    const safeTitle = title.trim() || 'Новая_заметка';
    const fileName = safeTitle.endsWith('.md') ? safeTitle : `${safeTitle}.md`;
    const relPath = folderRel ? `${folderRel}/${fileName}` : fileName;
    const fullPath = `${vaultPath}/${relPath}`;

    const defaultBody = initialContent || `# ${safeTitle.replace(/\.md$/, '')}\n\nНачните описание здесь...`;
    const meta: WBMetaData = {
      title: safeTitle.replace(/\.md$/, ''),
      type,
      tags: [],
      created: new Date().toISOString().split('T')[0],
    };

    const fullContent = serializeFrontmatter(meta, defaultBody);
    const note = this.parseRawNote(relPath, fileName, fullPath, fullContent);

    await this.saveNote(note);
    return note;
  }

  /**
   * Deletes a note
   */
  async deleteNote(note: WBNote): Promise<void> {
    if (this.isTauriAvailable() && note.path && !note.path.startsWith('virtual:')) {
      try {
        const fs = await import('@tauri-apps/plugin-fs');
        await fs.remove(note.path);
      } catch (err) {
        console.warn(`[WBStorage] Failed to delete file ${note.path}:`, err);
      }
    }
    this.inMemoryFiles.delete(note.id);
    this.saveToLocalStorage();
  }

  /**
   * Creates a new folder inside vault
   */
  async createFolder(vaultPath: string, folderRel: string): Promise<void> {
    if (this.isTauriAvailable() && vaultPath && !vaultPath.startsWith('virtual:')) {
      try {
        const fs = await import('@tauri-apps/plugin-fs');
        await fs.mkdir(`${vaultPath}/${folderRel}`, { recursive: true });
        return;
      } catch (err) {
        console.warn('[WBStorage] Failed to mkdir in Tauri:', err);
      }
    }
    // Web fallback dummy note to maintain folder presence
    this.inMemoryFiles.set(`${folderRel}/.keep.md`, '---\ntitle: Keep\n---\n');
    this.saveToLocalStorage();
  }

  /**
   * Initializes default starter campaign files into target vault directory
   */
  async initDefaultStarterVault(vaultPath: string): Promise<void> {
    const starterFiles = getStarterFiles();
    if (this.isTauriAvailable() && vaultPath && !vaultPath.startsWith('virtual:')) {
      try {
        const fs = await import('@tauri-apps/plugin-fs');
        for (const file of starterFiles) {
          const fullPath = `${vaultPath}/${file.path}`;
          const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
          await fs.mkdir(dir, { recursive: true });
          await fs.writeTextFile(fullPath, file.content);
        }
        return;
      } catch (err) {
        console.warn('[WBStorage] Failed to initialize starter files via Tauri:', err);
      }
    }

    for (const file of starterFiles) {
      this.inMemoryFiles.set(file.path, file.content);
    }
    this.saveToLocalStorage();
  }

  private parseRawNote(id: string, fileName: string, path: string, content: string): WBNote {
    const { meta, body } = parseFrontmatter(content);
    const inlineTags = extractTags(body);
    const frontmatterTags = meta.tags || [];
    const allTags = Array.from(new Set([...frontmatterTags, ...inlineTags]));
    const wikilinks = extractWikilinks(body);
    const outlinks = Array.from(new Set(wikilinks.map((w) => w.target)));

    return {
      id,
      fileName,
      title: meta.title || fileName.replace(/\.md$/, ''),
      path,
      content,
      body,
      meta: {
        ...meta,
        tags: allTags,
      },
      outlinks,
      backlinks: [],
      tags: allTags,
      modifiedTime: Date.now(),
    };
  }

  public restoreRussianStarterNotes() {
    for (const item of STARTER_CAMPAIGN_FILES) {
      this.inMemoryFiles.set(item.path, item.content);
    }
    for (const item of STARTER_CAMPAIGN_FILES_EN) {
      this.inMemoryFiles.delete(item.path);
    }
    this.saveToLocalStorage();
  }

  private loadFromLocalStorage(vaultPath: string) {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(`wbmd_vault_${vaultPath}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        const keys = Object.keys(parsed);
        const hasEnStarter = keys.some((k) => k.startsWith('00_Codex/'));
        const hasRuStarter = keys.some((k) => k.startsWith('00_Кодекс/'));
        let currentLang = 'ru';
        try {
          currentLang = useSettingsStore.getState().language;
        } catch {}

        if (currentLang === 'ru' && hasEnStarter && !hasRuStarter) {
          this.restoreRussianStarterNotes();
          return;
        }

        for (const [k, v] of Object.entries(parsed)) {
          this.inMemoryFiles.set(k, v);
        }
      }
    } catch (e) {
      console.warn('[WBStorage] Error reading localStorage:', e);
    }
  }

  private saveToLocalStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const obj: Record<string, string> = {};
      for (const [k, v] of this.inMemoryFiles.entries()) {
        obj[k] = v;
      }
      localStorage.setItem('wbmd_vault_current', JSON.stringify(obj));
    } catch (e) {
      console.warn('[WBStorage] Error saving to localStorage:', e);
    }
  }
}

export const wbStorageService = new WBStorageService();
