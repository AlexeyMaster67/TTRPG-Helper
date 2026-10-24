import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  serializeFrontmatter,
  extractWikilinks,
  extractEntityLinks,
  extractTags,
  sanitizeForPlayerBroadcast,
  parseMarkdownToAST,
} from '../utils/wbMarkdownParser';
import { wbIndexEngine } from '../services/wbIndexEngine';
import { wbStorageService } from '../services/wbStorageService';
import { WBNote } from '../types/wbmd';

describe('WBmd (Worldbuilding Markdown) Core Engine Tests', () => {
  describe('Frontmatter Parser & Serializer', () => {
    it('parses YAML frontmatter correctly with tags, custom fields, and types', () => {
      const raw = `---
title: "Элдрин Шепчущий"
type: npc
avatar: "portrait.jpg"
tags: [эльф, маг, информатор]
cr: 6
custom_fields:
  "Мировоззрение": "Хаотично-добрый"
  "Пароль": "Полуночный ворон"
---

# Заголовок заметки
Тело документа...`;

      const { meta, body } = parseFrontmatter(raw);

      expect(meta.title).toBe('Элдрин Шепчущий');
      expect(meta.type).toBe('npc');
      expect(meta.avatar).toBe('portrait.jpg');
      expect(meta.tags).toEqual(['эльф', 'маг', 'информатор']);
      expect(meta.cr).toBe(6);
      expect(meta.custom_fields).toBeDefined();
      expect(meta.custom_fields!['Мировоззрение']).toBe('Хаотично-добрый');
      expect(meta.custom_fields!['Пароль']).toBe('Полуночный ворон');
      expect(body).toContain('# Заголовок заметки');
      expect(body).toContain('Тело документа...');
    });

    it('infers title from first markdown heading if title is missing in frontmatter', () => {
      const raw = `---
type: location
---

# Порт Найанзару
Описание города...`;

      const { meta, body } = parseFrontmatter(raw);
      expect(meta.title).toBe('Порт Найанзару');
      expect(meta.type).toBe('location');
      expect(body).toContain('Описание города...');
    });

    it('serializes metadata and body back to standard YAML markdown', () => {
      const meta = {
        title: 'Замок Клыка',
        type: 'location' as const,
        tags: ['замок', 'руины'],
        custom_fields: {
          'Регион': 'Северные горы',
        },
      };
      const body = 'Описание заброшенного замка...';

      const serialized = serializeFrontmatter(meta, body);
      expect(serialized).toContain('title: "Замок Клыка"');
      expect(serialized).toContain('type: location');
      expect(serialized).toContain('- замок');
      expect(serialized).toContain('- руины');
      expect(serialized).toContain('custom_fields:');
      expect(serialized).toContain('Регион: "Северные горы"');
      expect(serialized).toContain('Описание заброшенного замка...');

      // Re-parse should return same meta
      const reParsed = parseFrontmatter(serialized);
      expect(reParsed.meta.title).toBe('Замок Клыка');
      expect(reParsed.meta.type).toBe('location');
      expect(reParsed.meta.tags).toEqual(['замок', 'руины']);
    });
  });

  describe('Wikilinks & TTRPG Entity Link Extraction', () => {
    it('extracts all variants of [[Wikilinks]]', () => {
      const text = `
Здесь упоминается [[Порт Найанзару]], а также [[Элдрин Шепчущий|Наш связной]].
А также ссылка на секцию [[Правила#Отдых]] и с алиасом [[Правила#Бой|Боевые действия]].
`;
      const links = extractWikilinks(text);

      expect(links.length).toBe(4);
      expect(links[0].target).toBe('Порт Найанзару');
      expect(links[0].alias).toBeUndefined();

      expect(links[1].target).toBe('Элдрин Шепчущий');
      expect(links[1].alias).toBe('Наш связной');

      expect(links[2].target).toBe('Правила');
      expect(links[2].heading).toBe('Отдых');

      expect(links[3].target).toBe('Правила');
      expect(links[3].heading).toBe('Бой');
      expect(links[3].alias).toBe('Боевые действия');
    });

    it('extracts TTRPG entity links (@monster, @spell, @item, @char, @map)', () => {
      const text = `
В комнате сидит @monster:Goblin Boss и применяет заклинание @spell:Shield.
У него есть артефакт @item:Sunblade.
С ним сражается @char:Торин на карте @map:Подземелье.
`;
      const entities = extractEntityLinks(text);

      expect(entities.length).toBe(5);
      expect(entities[0]).toEqual({ raw: '@monster:Goblin Boss', type: 'monster', id: 'Goblin Boss' });
      expect(entities[1]).toEqual({ raw: '@spell:Shield', type: 'spell', id: 'Shield' });
      expect(entities[2]).toEqual({ raw: '@item:Sunblade', type: 'item', id: 'Sunblade' });
      expect(entities[3]).toEqual({ raw: '@char:Торин', type: 'char', id: 'Торин' });
      expect(entities[4]).toEqual({ raw: '@map:Подземелье', type: 'map', id: 'Подземелье' });
    });

    it('extracts hashtags while ignoring markdown headers', () => {
      const text = `
# Заголовок первого уровня
Текст с тегами #city и #trade, а также вложенным #region/north.
## Заголовок второго уровня
Еще один #dnd2024 тег.
`;
      const tags = extractTags(text);
      expect(tags).toContain('city');
      expect(tags).toContain('trade');
      expect(tags).toContain('region/north');
      expect(tags).toContain('dnd2024');
      expect(tags).not.toContain('Заголовок');
    });
  });

  describe('Player Broadcast Sanitization', () => {
    it('completely strips :::secret blocks and redacts ||spoilers||', () => {
      const raw = `
# Зал Дракона
Отряд входит в тронный зал.

:::secret [Заметки Мастера]
Под троном ловушка DC 16. Сундук содержит яд.
Тайный пароль: "Кобра".
:::

Король сидит на троне, но он ||на самом деле вампир||.
На стене висит карта.
`;

      const { sanitizedBody, removedSecretsCount } = sanitizeForPlayerBroadcast(raw);

      expect(removedSecretsCount).toBe(2);
      expect(sanitizedBody).not.toContain(':::secret');
      expect(sanitizedBody).not.toContain('Под троном ловушка');
      expect(sanitizedBody).not.toContain('вампир');
      expect(sanitizedBody).toContain('Зал Дракона');
      expect(sanitizedBody).toContain('Король сидит на троне, но он *(Засекречено)*.');
      expect(sanitizedBody).toContain('На стене висит карта.');
    });
  });

  describe('AST Parser', () => {
    it('parses markdown with headings, dice chips, and spoilers into AST', () => {
      const text = `# Заголовок\n\nБросьте dice:1d20+5 чтобы найти ||тайную дверь||.`;
      const ast = parseMarkdownToAST(text);

      expect(ast.length).toBe(2);
      expect(ast[0].type).toBe('heading');
      expect(ast[1].type).toBe('paragraph');

      const paragraph = ast[1] as any;
      const diceToken = paragraph.children.find((c: any) => c.type === 'dicechip');
      const spoilerToken = paragraph.children.find((c: any) => c.type === 'spoiler');

      expect(diceToken).toBeDefined();
      expect(diceToken.formula).toBe('1d20+5');

      expect(spoilerToken).toBeDefined();
      expect(spoilerToken.text).toBe('тайную дверь');
    });
  });

  describe('WBIndexEngine & Graph', () => {
    it('builds cross-link graph, calculates backlinks, and maps tags', () => {
      const noteA: WBNote = {
        id: '01_NPC/Eldrin.md',
        fileName: 'Eldrin.md',
        title: 'Элдрин',
        path: '/vault/01_NPC/Eldrin.md',
        content: '',
        body: 'Живет в [[Порт Найанзару]]. Член [[Арфисты]].',
        meta: { title: 'Элдрин', type: 'npc', tags: ['эльф', 'маг'] },
        outlinks: ['Порт Найанзару', 'Арфисты'],
        backlinks: [],
        tags: ['эльф', 'маг'],
        modifiedTime: Date.now(),
      };

      const noteB: WBNote = {
        id: '02_Locations/Port.md',
        fileName: 'Port.md',
        title: 'Порт Найанзару',
        path: '/vault/02_Locations/Port.md',
        content: '',
        body: 'Город торговли. Сюда часто заходит [[Элдрин]].',
        meta: { title: 'Порт Найанзару', type: 'location', tags: ['город'] },
        outlinks: ['Элдрин'],
        backlinks: [],
        tags: ['город'],
        modifiedTime: Date.now(),
      };

      const index = wbIndexEngine.buildVaultIndex([noteA, noteB]);

      expect(index.graphNodes.length).toBe(2);
      expect(index.graphEdges.length).toBeGreaterThan(0);

      // Backlinks
      expect(index.backlinksMap['Порт Найанзару']).toContain('01_NPC/Eldrin.md');
      expect(index.backlinksMap['Элдрин']).toContain('02_Locations/Port.md');

      // Tags map
      expect(index.tagsMap['эльф']).toContain('01_NPC/Eldrin.md');
      expect(index.tagsMap['город']).toContain('02_Locations/Port.md');
    });

    it('refactors links across all notes when renaming a note', () => {
      const notes: WBNote[] = [
        {
          id: 'note1.md',
          fileName: 'note1.md',
          title: 'Старое Имя',
          path: '/vault/note1.md',
          content: '---\ntitle: Старое Имя\n---\nТекст',
          body: 'Текст',
          meta: { title: 'Старое Имя' },
          outlinks: [],
          backlinks: [],
          tags: [],
          modifiedTime: Date.now(),
        },
        {
          id: 'note2.md',
          fileName: 'note2.md',
          title: 'Вторая Заметка',
          path: '/vault/note2.md',
          content: '---\ntitle: Вторая\n---\nСмотри [[Старое Имя]] и [[Старое Имя|Алиас]].',
          body: 'Смотри [[Старое Имя]] и [[Старое Имя|Алиас]].',
          meta: { title: 'Вторая' },
          outlinks: ['Старое Имя'],
          backlinks: [],
          tags: [],
          modifiedTime: Date.now(),
        },
      ];

      const { updatedNotes, modifiedCount } = wbIndexEngine.refactorLinksOnRename(
        'Старое Имя',
        'Новое Имя',
        notes
      );

      expect(modifiedCount).toBe(1);
      const note2Updated = updatedNotes.find((n) => n.id === 'note2.md')!;
      expect(note2Updated.content).toContain('[[Новое Имя]]');
      expect(note2Updated.content).toContain('[[Новое Имя|Алиас]]');
      expect(note2Updated.content).not.toContain('[[Старое Имя]]');
    });

    it('searches notes by title, tag, or content correctly', () => {
      const notes: WBNote[] = [
        {
          id: '1.md',
          fileName: '1.md',
          title: 'Гоблинский лес',
          path: '1.md',
          content: '',
          body: 'Густые заросли, полно ловушек.',
          meta: { title: 'Гоблинский лес', tags: ['лес', 'опасно'] },
          outlinks: [],
          backlinks: [],
          tags: ['лес', 'опасно'],
          modifiedTime: Date.now(),
        },
        {
          id: '2.md',
          fileName: '2.md',
          title: 'Башня Мага',
          path: '2.md',
          content: '',
          body: 'Высокая башня из белого камня.',
          meta: { title: 'Башня Мага', tags: ['башня', 'магия'] },
          outlinks: [],
          backlinks: [],
          tags: ['башня', 'магия'],
          modifiedTime: Date.now(),
        },
      ];

      const searchResult = wbIndexEngine.searchNotes('гоблин', notes);
      expect(searchResult.length).toBe(1);
      expect(searchResult[0].title).toBe('Гоблинский лес');

      const tagFilterResult = wbIndexEngine.searchNotes('', notes, ['магия']);
      expect(tagFilterResult.length).toBe(1);
      expect(tagFilterResult[0].title).toBe('Башня Мага');
    });
  });

  describe('Storage Service Fallback', () => {
    it('loads starter campaign notes in fallback mode', async () => {
      const { notes, folders } = await wbStorageService.loadVaultFiles('virtual:test_vault');
      expect(notes.length).toBeGreaterThan(0);
      expect(notes.some((n) => n.title.includes('Элдрин'))).toBe(true);
      expect(notes.some((n) => n.title.includes('Порт Найанзару'))).toBe(true);
      expect(folders.length).toBeGreaterThan(0);
    });
  });
});
