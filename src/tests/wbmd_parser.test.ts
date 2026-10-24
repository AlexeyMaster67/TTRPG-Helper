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
import {
  WBHeadingNode,
  WBParagraphNode,
  WBListNode,
  WBTableNode,
  WBCodeBlockNode,
  WBBlockquoteNode,
  WBSecretBlockNode,
  WBPageInsertNode,
  WBWikilinkNode,
  WBEntityLinkNode,
  WBDiceChipNode,
  WBSpoilerNode,
  WBBoldNode,
  WBItalicNode,
  WBInlineCodeNode,
  WBTagNode,
} from '../types/wbmd';

describe('WBmd Markdown & AST Parser', () => {
  describe('parseFrontmatter', () => {
    it('parses full YAML frontmatter with primitives, arrays, and custom fields', () => {
      const raw = `---
title: "Элдрин Шепчущий"
type: npc
avatar: "портрет_элдрина.jpg"
tags: [эльф, маг, информатор, арфисты]
status: alive
location: "[[Порт Найанзару]]"
faction: "[[Арфисты]]"
cr: 6
custom_fields:
  "Мировоззрение": "Хаотично-добрый"
  "Секретный пароль": "Полуночный ворон"
  hp: 120
  is_boss: false
---

# Описание

Элдрин сидит в углу таверны.`;

      const { meta, body } = parseFrontmatter(raw);

      expect(meta.title).toBe('Элдрин Шепчущий');
      expect(meta.type).toBe('npc');
      expect(meta.avatar).toBe('портрет_элдрина.jpg');
      expect(meta.tags).toEqual(['эльф', 'маг', 'информатор', 'арфисты']);
      expect(meta.status).toBe('alive');
      expect(meta.location).toBe('[[Порт Найанзару]]');
      expect(meta.faction).toBe('[[Арфисты]]');
      expect(meta.cr).toBe(6);
      expect(meta.custom_fields).toEqual({
        'Мировоззрение': 'Хаотично-добрый',
        'Секретный пароль': 'Полуночный ворон',
        hp: 120,
        is_boss: false,
      });

      expect(body).toContain('# Описание');
      expect(body).toContain('Элдрин сидит в углу таверны.');
    });

    it('parses multi-line list tags and aliases', () => {
      const raw = `---
title: Castle Ravenloft
tags:
  - gothic
  - vampire
  - dungeon
aliases:
  - Ravenloft
  - The Castle
---
Dark clouds gather over the spires.`;

      const { meta, body } = parseFrontmatter(raw);
      expect(meta.title).toBe('Castle Ravenloft');
      expect(meta.tags).toEqual(['gothic', 'vampire', 'dungeon']);
      expect(meta.aliases).toEqual(['Ravenloft', 'The Castle']);
      expect(body).toBe('Dark clouds gather over the spires.');
    });

    it('falls back to first # Heading when frontmatter title is omitted', () => {
      const raw = `---
type: location
tags: [city]
---

# Port Nyanzaru

The shimmering jewel of Chult.`;

      const { meta, body } = parseFrontmatter(raw);
      expect(meta.title).toBe('Port Nyanzaru');
      expect(meta.type).toBe('location');
      expect(body).toContain('# Port Nyanzaru');
    });

    it('handles markdown without frontmatter gracefully', () => {
      const raw = `# Tomb of Annihilation\n\nA dangerous adventure in the jungle.`;
      const { meta, body } = parseFrontmatter(raw);
      expect(meta.title).toBe('Tomb of Annihilation');
      expect(meta.tags).toEqual([]);
      expect(body).toBe(raw);
    });

    it('ignores YAML comments outside quotes', () => {
      const raw = `---
title: "Secret Hideout" # The players should not see this
type: location # Type of place
cr: 4 # Challenge
---
Note body.`;

      const { meta } = parseFrontmatter(raw);
      expect(meta.title).toBe('Secret Hideout');
      expect(meta.type).toBe('location');
      expect(meta.cr).toBe(4);
    });
  });

  describe('serializeFrontmatter', () => {
    it('serializes metadata and body back to a clean YAML frontmatter format', () => {
      const meta = {
        title: 'Captain Vallen',
        type: 'npc' as const,
        tags: ['pirate', 'ally'],
        cr: 5,
        status: 'alive',
        custom_fields: {
          Ship: 'The Wavecrest',
          Crew: 30,
        },
      };
      const body = 'Vallen stands at the helm.';

      const output = serializeFrontmatter(meta, body);
      expect(output).toContain('---');
      expect(output).toContain('title: "Captain Vallen"');
      expect(output).toContain('type: npc');
      expect(output).toContain('- pirate');
      expect(output).toContain('- ally');
      expect(output).toContain('cr: 5');
      expect(output).toContain('Ship: "The Wavecrest"');
      expect(output).toContain('Crew: 30');
      expect(output).toContain('Vallen stands at the helm.');

      // Roundtrip test
      const roundtrip = parseFrontmatter(output);
      expect(roundtrip.meta.title).toBe('Captain Vallen');
      expect(roundtrip.meta.tags).toEqual(['pirate', 'ally']);
      expect(roundtrip.meta.cr).toBe(5);
      expect(roundtrip.meta.custom_fields).toEqual({
        Ship: 'The Wavecrest',
        Crew: 30,
      });
      expect(roundtrip.body.trim()).toBe('Vallen stands at the helm.');
    });
  });

  describe('extractWikilinks', () => {
    it('extracts all variants of wikilinks and skips embedded images', () => {
      const text = `
Welcome to [[Port Nyanzaru]]!
You can also visit [[Port Nyanzaru|The Merchant City]] or read [[Rules#Resting]].
Section with alias: [[Combat#Initiative|Rolling for Combat]].
Look at this map: ![[chult_map.png]] and ![[port.jpg]].
And another link: [[Eldrin]].
`;

      const links = extractWikilinks(text);

      expect(links).toHaveLength(5);

      expect(links[0]).toEqual({
        raw: '[[Port Nyanzaru]]',
        target: 'Port Nyanzaru',
        heading: undefined,
        alias: undefined,
      });

      expect(links[1]).toEqual({
        raw: '[[Port Nyanzaru|The Merchant City]]',
        target: 'Port Nyanzaru',
        heading: undefined,
        alias: 'The Merchant City',
      });

      expect(links[2]).toEqual({
        raw: '[[Rules#Resting]]',
        target: 'Rules',
        heading: 'Resting',
        alias: undefined,
      });

      expect(links[3]).toEqual({
        raw: '[[Combat#Initiative|Rolling for Combat]]',
        target: 'Combat',
        heading: 'Initiative',
        alias: 'Rolling for Combat',
      });
    });
  });

  describe('extractEntityLinks', () => {
    it('extracts monsters, spells, items, characters, and maps', () => {
      const text = `
The room is guarded by @monster:Goblin Boss and an @monster:"Adult Red Dragon".
The wizard prepares @spell:Misty Step and @spell:Fireball.
Found loot: @item:Bag of Holding and @item:"Vorpal Sword".
Party member @char:Торин entered first, then @char:Eldrin.
The encounter happens in @map:Sunken Crypt.
`;

      const entities = extractEntityLinks(text);

      expect(entities).toContainEqual({
        raw: '@monster:Goblin Boss',
        type: 'monster',
        id: 'Goblin Boss',
      });
      expect(entities).toContainEqual({
        raw: '@monster:"Adult Red Dragon"',
        type: 'monster',
        id: 'Adult Red Dragon',
      });
      expect(entities).toContainEqual({
        raw: '@spell:Misty Step',
        type: 'spell',
        id: 'Misty Step',
      });
      expect(entities).toContainEqual({
        raw: '@spell:Fireball',
        type: 'spell',
        id: 'Fireball',
      });
      expect(entities).toContainEqual({
        raw: '@item:Bag of Holding',
        type: 'item',
        id: 'Bag of Holding',
      });
      expect(entities).toContainEqual({
        raw: '@item:"Vorpal Sword"',
        type: 'item',
        id: 'Vorpal Sword',
      });
      expect(entities).toContainEqual({
        raw: '@char:Торин',
        type: 'char',
        id: 'Торин',
      });
      expect(entities).toContainEqual({
        raw: '@char:Eldrin',
        type: 'char',
        id: 'Eldrin',
      });
      expect(entities).toContainEqual({
        raw: '@map:Sunken Crypt',
        type: 'map',
        id: 'Sunken Crypt',
      });
    });

    it('does not capture sentence continuation as part of unquoted entity id', () => {
      const text = 'They fought @monster:Goblin Boss in the hallway.';
      const entities = extractEntityLinks(text);
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe('Goblin Boss');
    });
  });

  describe('extractTags', () => {
    it('extracts hashtags and nested tags, ignoring markdown headings and hex colors', () => {
      const text = `
# Main Heading
This is an entry about #npc/noble and #quest/active.
Also tagged as #chult and #город/торговый.
Code should be ignored: \`#not_a_tag\` and
\`\`\`css
body { color: #ff0000; background: #1a2b3c; }
\`\`\`
Markdown heading ## Subheading
Number #1 is not a tag.
Duplicate #chult tag.
`;

      const tags = extractTags(text);

      expect(tags).toContain('npc/noble');
      expect(tags).toContain('quest/active');
      expect(tags).toContain('chult');
      expect(tags).toContain('город/торговый');

      // Headings, hex colors, and numbers should not be present
      expect(tags).not.toContain('Main');
      expect(tags).not.toContain('Main Heading');
      expect(tags).not.toContain('Subheading');
      expect(tags).not.toContain('ff0000');
      expect(tags).not.toContain('1a2b3c');
      expect(tags).not.toContain('1');
      expect(tags).not.toContain('not_a_tag');

      // Unique count
      expect(tags.length).toBe(4);
    });
  });

  describe('sanitizeForPlayerBroadcast', () => {
    it('removes multiline secret blocks and inline spoilers for safe broadcast', () => {
      const text = `
# The Ancient Temple

Welcome travelers to the Sunken Hall.

:::secret [GM Trap Details]
DC 15 Dexterity saving throw or 3d6 poison dart damage.
The secret switch is behind the third statue.
:::

There is a golden chest in the center. ||It is locked with a DC 18 lock||.
Inside you find some gold and a ||gm:cursed ring of doom||.

:::gm-secret
The boss arrives in 2 rounds.
:::

Enjoy your exploration!
`;

      const { sanitizedBody, removedSecretsCount } = sanitizeForPlayerBroadcast(text);

      expect(removedSecretsCount).toBe(4); // 2 secret blocks + 2 spoilers

      expect(sanitizedBody).toContain('# The Ancient Temple');
      expect(sanitizedBody).toContain('Welcome travelers to the Sunken Hall.');
      expect(sanitizedBody).toContain('There is a golden chest in the center.');
      expect(sanitizedBody).toContain('Enjoy your exploration!');

      // GM secrets must be completely absent
      expect(sanitizedBody).not.toContain('DC 15 Dexterity saving throw');
      expect(sanitizedBody).not.toContain('poison dart damage');
      expect(sanitizedBody).not.toContain('DC 18 lock');
      expect(sanitizedBody).not.toContain('cursed ring of doom');
      expect(sanitizedBody).not.toContain('The boss arrives');
    });
  });

  describe('parseMarkdownToAST', () => {
    it('parses headings with levels and slugs', () => {
      const md = `# World of Toril\n## Sword Coast\n### Neverwinter City`;
      const ast = parseMarkdownToAST(md);

      expect(ast).toHaveLength(3);
      const h1 = ast[0] as WBHeadingNode;
      expect(h1.type).toBe('heading');
      expect(h1.level).toBe(1);
      expect(h1.text).toBe('World of Toril');
      expect(h1.id).toBe('world-of-toril');

      const h2 = ast[1] as WBHeadingNode;
      expect(h2.level).toBe(2);
      expect(h2.text).toBe('Sword Coast');
      expect(h2.id).toBe('sword-coast');
    });

    it('parses paragraphs with inline wikilinks, entity links, dice chips, and spoilers', () => {
      const md = `Visit [[Port Nyanzaru]] to meet @monster:Goblin Boss. Roll dice:1d20+5 to hit. Watch out for ||trapped floor||!`;
      const ast = parseMarkdownToAST(md);

      expect(ast).toHaveLength(1);
      const para = ast[0] as WBParagraphNode;
      expect(para.type).toBe('paragraph');

      const types = para.children.map((c) => c.type);
      expect(types).toContain('wikilink');
      expect(types).toContain('entitylink');
      expect(types).toContain('dicechip');
      expect(types).toContain('spoiler');

      const wikilink = para.children.find((c) => c.type === 'wikilink') as WBWikilinkNode;
      expect(wikilink.target).toBe('Port Nyanzaru');

      const entity = para.children.find((c) => c.type === 'entitylink') as WBEntityLinkNode;
      expect(entity.entityType).toBe('monster');
      expect(entity.id).toBe('Goblin Boss');

      const dice = para.children.find((c) => c.type === 'dicechip') as WBDiceChipNode;
      expect(dice.formula).toBe('1d20+5');

      const spoiler = para.children.find((c) => c.type === 'spoiler') as WBSpoilerNode;
      expect(spoiler.text).toBe('trapped floor');
      expect(spoiler.isGMSecret).toBe(true);
    });

    it('parses formatted dice chips [dice: 2d6+3 "Fire Damage"] and emoji 🎲 1d20', () => {
      const md = `Cast fireball: [dice: 8d6 "Fire Damage"] or quick 🎲 1d20.`;
      const ast = parseMarkdownToAST(md);
      const para = ast[0] as WBParagraphNode;

      const diceChips = para.children.filter((c) => c.type === 'dicechip') as WBDiceChipNode[];
      expect(diceChips).toHaveLength(2);
      expect(diceChips[0].formula).toBe('8d6');
      expect(diceChips[0].label).toBe('Fire Damage');

      expect(diceChips[1].formula).toBe('1d20');
    });

    it('parses fenced code blocks with language', () => {
      const md = "```typescript\nconst x: number = 42;\n```";
      const ast = parseMarkdownToAST(md);

      expect(ast).toHaveLength(1);
      const codeNode = ast[0] as WBCodeBlockNode;
      expect(codeNode.type).toBe('codeblock');
      expect(codeNode.language).toBe('typescript');
      expect(codeNode.code).toBe('const x: number = 42;');
    });

    it('parses blockquotes and parses their contents', () => {
      const md = `> Beware the ides of March.\n> A wise man once said [[Prophecy]].`;
      const ast = parseMarkdownToAST(md);

      expect(ast).toHaveLength(1);
      const bq = ast[0] as WBBlockquoteNode;
      expect(bq.type).toBe('blockquote');
      expect(bq.text).toContain('Beware the ides of March.');
      expect(bq.children).toBeDefined();
    });

    it('parses markdown tables with headers, alignments, and cells', () => {
      const md = `
| NPC Name | Location | CR |
|:---|:---:|---:|
| Eldrin | Port Nyanzaru | 6 |
| Vallen | Wavecrest | 5 |
`;
      const ast = parseMarkdownToAST(md);

      expect(ast).toHaveLength(1);
      const table = ast[0] as WBTableNode;
      expect(table.type).toBe('table');
      expect(table.headers).toEqual(['NPC Name', 'Location', 'CR']);
      expect(table.alignments).toEqual(['left', 'center', 'right']);
      expect(table.rows).toEqual([
        ['Eldrin', 'Port Nyanzaru', '6'],
        ['Vallen', 'Wavecrest', '5'],
      ]);
    });

    it('parses ordered and unordered lists with task items', () => {
      const md = `
- [x] Find the missing key
- [ ] Open the heavy vault
- Regular note item
`;
      const ast = parseMarkdownToAST(md);

      expect(ast).toHaveLength(1);
      const list = ast[0] as WBListNode;
      expect(list.type).toBe('list');
      expect(list.ordered).toBe(false);
      expect(list.items).toHaveLength(3);
      expect(list.items[0].checked).toBe(true);
      expect(list.items[0].text).toBe('Find the missing key');
      expect(list.items[1].checked).toBe(false);
      expect(list.items[1].text).toBe('Open the heavy vault');
      expect(list.items[2].checked).toBeUndefined();
    });

    it('parses GM secret blocks with custom title and children AST', () => {
      const md = `
:::secret [Trapped Floor]
Stepping on tile 3 triggers a dart @monster:Trap.
Roll dice:1d20 to evade.
:::
`;
      const ast = parseMarkdownToAST(md);

      expect(ast).toHaveLength(1);
      const secret = ast[0] as WBSecretBlockNode;
      expect(secret.type).toBe('secretblock');
      expect(secret.title).toBe('Trapped Floor');
      expect(secret.content).toContain('Stepping on tile 3 triggers a dart');
      expect(secret.children).toBeDefined();
      expect(secret.children!.length).toBeGreaterThan(0);
    });

    it('parses page inserts with attributes (borderless, centered, title)', () => {
      const md = `{{insert: Combat_Reference | title="Combat Rules" | borderless | centered}}`;
      const ast = parseMarkdownToAST(md);

      expect(ast).toHaveLength(1);
      const insert = ast[0] as WBPageInsertNode;
      expect(insert.type).toBe('pageinsert');
      expect(insert.target).toBe('Combat_Reference');
      expect(insert.title).toBe('Combat Rules');
      expect(insert.borderless).toBe(true);
      expect(insert.centered).toBe(true);
    });

    it('parses inline formatting: bold, italic, strikethrough, inline code, and tags', () => {
      const md = `This is **bold text**, *italic text*, ~~deleted~~, and \`const a = 1\`, tagged with #lore.`;
      const ast = parseMarkdownToAST(md);

      expect(ast).toHaveLength(1);
      const para = ast[0] as WBParagraphNode;

      const bold = para.children.find((c) => c.type === 'bold') as WBBoldNode;
      expect(bold).toBeDefined();
      expect(bold.content).toBe('bold text');

      const italic = para.children.find((c) => c.type === 'italic') as WBItalicNode;
      expect(italic).toBeDefined();
      expect(italic.content).toBe('italic text');

      const code = para.children.find((c) => c.type === 'inline_code') as WBInlineCodeNode;
      expect(code).toBeDefined();
      expect(code.content).toBe('const a = 1');

      const tag = para.children.find((c) => c.type === 'tag') as WBTagNode;
      expect(tag).toBeDefined();
      expect(tag.tag).toBe('lore');
    });
  });
});
