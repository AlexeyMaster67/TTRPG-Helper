import { WBNote, WBFolder, WBMetaData } from '../types/wbmd';
import { parseFrontmatter, serializeFrontmatter, extractTags, extractWikilinks } from '../utils/wbMarkdownParser';

// Sample default starter campaign templates
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

class WBStorageService {
  private inMemoryFiles: Map<string, string> = new Map();
  private isTauriAvailable(): boolean {
    return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
  }

  constructor() {
    // Populate in-memory fallback with starter notes by default
    for (const item of STARTER_CAMPAIGN_FILES) {
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
    if (typeof window !== 'undefined' && window.prompt) {
      const customName = window.prompt('Название виртуального хранилища кампании:', defaultName);
      return customName ? customName.trim() : defaultName;
    }
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
    if (this.isTauriAvailable() && vaultPath && !vaultPath.startsWith('virtual:')) {
      try {
        const fs = await import('@tauri-apps/plugin-fs');
        for (const file of STARTER_CAMPAIGN_FILES) {
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

    for (const file of STARTER_CAMPAIGN_FILES) {
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

  private loadFromLocalStorage(vaultPath: string) {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(`wbmd_vault_${vaultPath}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
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
