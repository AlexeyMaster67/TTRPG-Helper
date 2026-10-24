import {
  WBMetaData,
  WBAstNode,
  WBAstInlineNode,
  WBHeadingNode,
  WBParagraphNode,
  WBListNode,
  WBListItemNode,
  WBTableNode,
  WBCodeBlockNode,
  WBBlockquoteNode,
  WBSecretBlockNode,
  WBPageInsertNode,
  WBHrNode,
  WBTextNode,
  WBEntityLinkType,
} from '../types/wbmd';

const STOP_WORDS = new Set([
  'and', 'an', 'a', 'the', 'in', 'on', 'at', 'with', 'then', 'entered',
  'first', 'to', 'from', 'by', 'is', 'has', 'was', 'were',
  'и', 'в', 'на', 'с', 'к', 'по', 'за', 'под', 'из', 'применяет', 'сидит', 'находится'
]);

/**
 * Parses YAML frontmatter from raw markdown document.
 */
export function parseFrontmatter(rawMarkdown: string): { meta: WBMetaData; body: string } {
  if (!rawMarkdown) {
    return { meta: { title: 'Untitled', tags: [] }, body: '' };
  }

  const trimmed = rawMarkdown.replace(/^\uFEFF/, ''); // Strip BOM
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = trimmed.match(frontmatterRegex);

  if (!match) {
    const headingMatch = trimmed.match(/^#\s+(.+)$/m);
    const fallbackTitle = headingMatch ? headingMatch[1].trim() : 'Untitled Note';
    return {
      meta: { title: fallbackTitle, tags: [] },
      body: trimmed,
    };
  }

  const rawYaml = match[1];
  const body = match[2];
  const meta: WBMetaData = { title: 'Untitled Note', tags: [] };

  const lines = rawYaml.split(/\r?\n/);
  let currentKey: string | null = null;
  let inCustomFields = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Strip comments outside quotes
    let strippedLine = line;
    let inQuote = false;
    let quoteChar = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if ((ch === '"' || ch === "'") && (c === 0 || line[c - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = ch;
        } else if (ch === quoteChar) {
          inQuote = false;
        }
      } else if (ch === '#' && !inQuote) {
        strippedLine = line.substring(0, c).trimEnd();
        break;
      }
    }

    if (!strippedLine.trim()) continue;

    // Check custom_fields indentation
    if (inCustomFields) {
      const fieldMatch = strippedLine.match(/^\s+["']?([^"':]+)["']?\s*:\s*(.+)$/);
      if (fieldMatch) {
        if (!meta.custom_fields) meta.custom_fields = {};
        const fieldKey = fieldMatch[1].trim();
        meta.custom_fields[fieldKey] = parseYamlValue(fieldMatch[2].trim());
        continue;
      } else if (!strippedLine.startsWith(' ') && !strippedLine.startsWith('\t')) {
        inCustomFields = false;
      }
    }

    const kvMatch = strippedLine.match(/^([a-zA-Z0-9_\-]+)\s*:\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1].trim();
      const valStr = kvMatch[2].trim();

      if (currentKey === 'custom_fields') {
        inCustomFields = true;
        if (!meta.custom_fields) meta.custom_fields = {};
        continue;
      }

      // Check if it's an array started on same line like [a, b]
      if (valStr.startsWith('[') && valStr.endsWith(']')) {
        const inner = valStr.slice(1, -1).trim();
        meta[currentKey] = inner
          ? inner.split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
          : [];
      } else if (valStr === '' && i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
        // Multi-line list
        const items: string[] = [];
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
          i++;
          const itemVal = lines[i].trim().slice(2).trim();
          items.push(itemVal.replace(/^['"]|['"]$/g, ''));
        }
        meta[currentKey] = items;
      } else {
        meta[currentKey] = parseYamlValue(valStr);
      }
    }
  }

  if (!meta.title || meta.title === 'Untitled Note') {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      meta.title = headingMatch[1].trim();
    }
  }

  if (!meta.tags) {
    meta.tags = [];
  }

  return { meta, body };
}

function parseYamlValue(val: string): any {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~' || val === '') return null;
  if (!isNaN(Number(val)) && !val.includes(' ') && val.length > 0) return Number(val);
  // Strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}

/**
 * Serializes metadata and body back to standard YAML Frontmatter Markdown.
 */
export function serializeFrontmatter(meta: WBMetaData, body: string): string {
  const lines: string[] = ['---'];

  if (meta.title) {
    lines.push(`title: "${meta.title}"`);
  }
  if (meta.type) {
    lines.push(`type: ${meta.type}`);
  }
  if (meta.avatar) {
    lines.push(`avatar: "${meta.avatar}"`);
  }

  // Tags
  if (meta.tags && meta.tags.length > 0) {
    lines.push('tags:');
    for (const tag of meta.tags) {
      lines.push(`  - ${tag}`);
    }
  }

  if (meta.aliases && meta.aliases.length > 0) {
    lines.push('aliases:');
    for (const a of meta.aliases) {
      lines.push(`  - ${a}`);
    }
  }

  if (meta.status !== undefined && meta.status !== null) {
    lines.push(`status: ${meta.status}`);
  }
  if (meta.cr !== undefined && meta.cr !== null) {
    lines.push(`cr: ${meta.cr}`);
  }
  if (meta.location) {
    lines.push(`location: ${meta.location.includes(' ') ? `"${meta.location}"` : meta.location}`);
  }
  if (meta.faction) {
    lines.push(`faction: ${meta.faction.includes(' ') ? `"${meta.faction}"` : meta.faction}`);
  }

  // Custom fields
  if (meta.custom_fields && Object.keys(meta.custom_fields).length > 0) {
    lines.push('custom_fields:');
    for (const [ck, cv] of Object.entries(meta.custom_fields)) {
      const val = typeof cv === 'string' ? `"${cv}"` : cv;
      lines.push(`  ${ck}: ${val}`);
    }
  }

  // Any other custom properties
  const handledKeys = ['title', 'type', 'avatar', 'tags', 'aliases', 'status', 'cr', 'location', 'faction', 'custom_fields'];
  for (const [k, v] of Object.entries(meta)) {
    if (handledKeys.includes(k)) continue;
    if (v !== undefined && v !== null) {
      lines.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(body.trimStart());

  return lines.join('\n');
}

/**
 * Extracts all [[Wikilinks]] from markdown text, ignoring embedded images ![[...]].
 */
export function extractWikilinks(text: string): { raw: string; target: string; alias?: string; heading?: string }[] {
  const results: { raw: string; target: string; alias?: string; heading?: string }[] = [];
  const regex = /(?<!\!)\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?(?:\|([^\]\n]+))?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    results.push({
      raw: match[0],
      target: match[1].trim(),
      heading: match[2]?.trim(),
      alias: match[3]?.trim(),
    });
  }

  return results;
}

/**
 * Extracts all @entity references (e.g. @monster:Goblin Boss, @spell:"Misty Step").
 */
export function extractEntityLinks(
  text: string
): { raw: string; type: WBEntityLinkType; id: string }[] {
  const results: { raw: string; type: WBEntityLinkType; id: string }[] = [];
  const typeRegex = /@(monster|spell|item|char|map):/g;
  let match: RegExpExecArray | null;

  while ((match = typeRegex.exec(text)) !== null) {
    const type = match[1] as WBEntityLinkType;
    const valueStartIndex = match.index + match[0].length;
    const remaining = text.slice(valueStartIndex);

    if (remaining.startsWith('"')) {
      const closingQuote = remaining.indexOf('"', 1);
      if (closingQuote !== -1) {
        const id = remaining.slice(1, closingQuote);
        results.push({
          raw: `@${type}:"${id}"`,
          type,
          id,
        });
        typeRegex.lastIndex = valueStartIndex + closingQuote + 1;
        continue;
      }
    }

    // Unquoted: scan words
    const wordsMatch = remaining.match(/^[^\n.,;!?()[\]{}]+/);
    if (wordsMatch) {
      const fullChunk = wordsMatch[0];
      const tokens = fullChunk.split(/\s+/).filter(Boolean);
      const chosenWords: string[] = [];

      for (let w = 0; w < tokens.length; w++) {
        const word = tokens[w];
        const lower = word.toLowerCase();
        if (w > 0 && STOP_WORDS.has(lower)) {
          break;
        }
        chosenWords.push(word);
      }

      if (chosenWords.length > 0) {
        const id = chosenWords.join(' ');
        results.push({
          raw: `@${type}:${id}`,
          type,
          id,
        });
        typeRegex.lastIndex = valueStartIndex + id.length;
      }
    }
  }

  return results;
}

/**
 * Extracts hashtags from body (#city, #npc/noble), ignoring headings, code blocks and hex colors.
 */
export function extractTags(text: string): string[] {
  let cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');

  const tags = new Set<string>();
  const lines = cleanText.split(/\r?\n/);

  for (const line of lines) {
    if (/^\s*#{1,6}\s+/.test(line)) continue;

    const regex = /(?:^|\s)#([a-zA-Z0-9_\-\/А-Яа-яЁё]+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const tag = match[1].trim();

      if (/^[a-fA-F0-9]{3}$/.test(tag) || /^[a-fA-F0-9]{6}$/.test(tag) || /^[a-fA-F0-9]{8}$/.test(tag)) {
        continue;
      }
      if (/^\d+$/.test(tag)) {
        continue;
      }

      tags.add(tag);
    }
  }

  return Array.from(tags);
}

/**
 * Sanitizes markdown content for broadcast to player displays.
 * Strips all `:::secret ... :::` and `:::gm-secret ... :::` blocks, redacts `||spoilers||`.
 */
export function sanitizeForPlayerBroadcast(markdown: string): {
  sanitizedBody: string;
  removedSecretsCount: number;
} {
  let count = 0;

  const secretBlockRegex = /:::(?:secret(?:\s+\[.*?\])?|gm-secret)[\s\S]*?:::/gi;
  let sanitized = markdown.replace(secretBlockRegex, () => {
    count++;
    return '';
  });

  const spoilerRegex = /\|\|(?:gm:)?([\s\S]*?)\|\|/g;
  sanitized = sanitized.replace(spoilerRegex, (_m, _inner) => {
    count++;
    return '*(Засекречено)*';
  });

  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();

  return {
    sanitizedBody: sanitized,
    removedSecretsCount: count,
  };
}

/**
 * Parses inline string into inline AST tokens.
 */
export function parseInlineTokens(text: string): WBAstInlineNode[] {
  if (!text) return [];

  const tokens: WBAstInlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // 1. Spoilers: ||spoiler|| or ||gm:spoiler||
    const spoilerMatch = remaining.match(/^\|\|(?:gm:)?([\s\S]+?)\|\|/);
    if (spoilerMatch) {
      tokens.push({
        type: 'spoiler',
        raw: spoilerMatch[0],
        text: spoilerMatch[1],
        isGMSecret: true,
      });
      remaining = remaining.slice(spoilerMatch[0].length);
      continue;
    }

    // 2. Wikilinks: [[Target#Heading|Alias]] (negative lookbehind not starting with !)
    const wikilinkMatch = remaining.match(/^\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?(?:\|([^\]\n]+))?\]\]/);
    if (wikilinkMatch) {
      tokens.push({
        type: 'wikilink',
        raw: wikilinkMatch[0],
        target: wikilinkMatch[1].trim(),
        heading: wikilinkMatch[2]?.trim(),
        alias: wikilinkMatch[3]?.trim(),
      });
      remaining = remaining.slice(wikilinkMatch[0].length);
      continue;
    }

    // 3. Formatted dice chips: [dice: 8d6 "Fire Damage"]
    const formattedDiceMatch = remaining.match(/^\[dice:\s*([0-9]+d[0-9]+(?:[\+\-][0-9]+)?(?:[a-zA-Z0-9]+)?)(?:\s+["'](.*?)["'])?\]/i);
    if (formattedDiceMatch) {
      tokens.push({
        type: 'dicechip',
        raw: formattedDiceMatch[0],
        formula: formattedDiceMatch[1],
        label: formattedDiceMatch[2] || formattedDiceMatch[1],
      });
      remaining = remaining.slice(formattedDiceMatch[0].length);
      continue;
    }

    // 4. Emoji or prefix dice: 🎲 1d20 or dice:1d20+5
    const diceMatch = remaining.match(/^(?:🎲\s*|dice:)([0-9]+d[0-9]+(?:[\+\-][0-9]+)?(?:[a-zA-Z0-9]+)?)/i);
    if (diceMatch) {
      tokens.push({
        type: 'dicechip',
        raw: diceMatch[0],
        formula: diceMatch[1],
        label: diceMatch[1],
      });
      remaining = remaining.slice(diceMatch[0].length);
      continue;
    }

    // 5. Entity Links: @monster:"...", @spell:Misty Step, etc.
    const entityMatch = remaining.match(/^@(monster|spell|item|char|map):/);
    if (entityMatch) {
      const type = entityMatch[1] as WBEntityLinkType;
      const afterPrefix = remaining.slice(entityMatch[0].length);

      if (afterPrefix.startsWith('"')) {
        const closeQuote = afterPrefix.indexOf('"', 1);
        if (closeQuote !== -1) {
          const id = afterPrefix.slice(1, closeQuote);
          const raw = `@${type}:"${id}"`;
          tokens.push({ type: 'entitylink', raw, entityType: type, id });
          remaining = remaining.slice(raw.length);
          continue;
        }
      }

      const wordsMatch = afterPrefix.match(/^[^\n.,;!?()[\]{}]+/);
      if (wordsMatch) {
        const fullChunk = wordsMatch[0];
        const wordTokens = fullChunk.split(/\s+/).filter(Boolean);
        const chosenWords: string[] = [];

        for (let w = 0; w < wordTokens.length; w++) {
          const word = wordTokens[w];
          const lower = word.toLowerCase();
          if (w > 0 && STOP_WORDS.has(lower)) {
            break;
          }
          chosenWords.push(word);
        }

        if (chosenWords.length > 0) {
          const id = chosenWords.join(' ');
          const raw = `@${type}:${id}`;
          tokens.push({ type: 'entitylink', raw, entityType: type, id });
          remaining = remaining.slice(raw.length);
          continue;
        }
      }
    }

    // 6. Images: ![alt](url) or ![[image.png]]
    const wikiImgMatch = remaining.match(/^!\[\[([^\]\n]+)\]\]/);
    if (wikiImgMatch) {
      tokens.push({
        type: 'image',
        raw: wikiImgMatch[0],
        url: wikiImgMatch[1].trim(),
        alt: wikiImgMatch[1].trim(),
      });
      remaining = remaining.slice(wikiImgMatch[0].length);
      continue;
    }

    const mdImgMatch = remaining.match(/^!\[(.*?)\]\((.*?)\)/);
    if (mdImgMatch) {
      tokens.push({
        type: 'image',
        raw: mdImgMatch[0],
        alt: mdImgMatch[1],
        url: mdImgMatch[2],
      });
      remaining = remaining.slice(mdImgMatch[0].length);
      continue;
    }

    // 7. Links: [text](url)
    const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      tokens.push({
        type: 'link',
        raw: linkMatch[0],
        text: linkMatch[1],
        url: linkMatch[2],
      });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // 8. Inline code: `code`
    const codeMatch = remaining.match(/^`([^`\n]+)`/);
    if (codeMatch) {
      tokens.push({
        type: 'inline_code',
        content: codeMatch[1],
      });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 9. Bold: **bold** or __bold__
    const boldMatch = remaining.match(/^(\*\*|__)([\s\S]+?)\1/);
    if (boldMatch) {
      tokens.push({
        type: 'bold',
        content: boldMatch[2],
        children: parseInlineTokens(boldMatch[2]),
      });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 10. Italic: *italic* or _italic_
    const italicMatch = remaining.match(/^(\*|_)([\s\S]+?)\1/);
    if (italicMatch) {
      tokens.push({
        type: 'italic',
        content: italicMatch[2],
        children: parseInlineTokens(italicMatch[2]),
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 11. Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~([\s\S]+?)~~/);
    if (strikeMatch) {
      tokens.push({
        type: 'strikethrough',
        content: strikeMatch[1],
        children: parseInlineTokens(strikeMatch[1]),
      });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // 12. Tags: #tag
    const tagMatch = remaining.match(/^#([a-zA-Z0-9_\-\/А-Яа-яЁё]+)(?=[.,;!?\s)]|$)/);
    if (tagMatch && !/^\d+$/.test(tagMatch[1])) {
      tokens.push({
        type: 'tag',
        tag: tagMatch[1],
      });
      remaining = remaining.slice(tagMatch[0].length);
      continue;
    }

    // Fallback: take characters up to next special syntax token
    const nextSpecial = remaining.search(/(\|\||\[\[|\[dice:|🎲|@(monster|spell|item|char|map):|dice:|!\[|\[|`|\*\*|__|\*|_|~~|#[a-zA-Z0-9_])/);
    if (nextSpecial === -1) {
      tokens.push({ type: 'text', content: remaining });
      remaining = '';
    } else if (nextSpecial === 0) {
      tokens.push({ type: 'text', content: remaining[0] });
      remaining = remaining.slice(1);
    } else {
      tokens.push({ type: 'text', content: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    }
  }

  // Merge consecutive text tokens
  const merged: WBAstInlineNode[] = [];
  for (const token of tokens) {
    if (token.type === 'text' && merged.length > 0 && merged[merged.length - 1].type === 'text') {
      (merged[merged.length - 1] as WBTextNode).content += token.content;
    } else {
      merged.push(token);
    }
  }

  return merged;
}

/**
 * Parses markdown body into a structured AST.
 */
export function parseMarkdownToAST(body: string): WBAstNode[] {
  if (!body) return [];

  const nodes: WBAstNode[] = [];
  const lines = body.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Secret block: :::secret [Title] ... ::: or :::gm-secret ... :::
    if (line.trim().startsWith(':::secret') || line.trim().startsWith(':::gm-secret')) {
      const titleMatch = line.match(/^:::(?:secret\s+\[(.*?)\]|gm-secret)/);
      const title = titleMatch?.[1] || 'Секрет Мастера';
      const secretLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(':::')) {
        secretLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::
      nodes.push({
        type: 'secretblock',
        raw: `:::secret\n${secretLines.join('\n')}\n:::`,
        title,
        content: secretLines.join('\n'),
        children: parseMarkdownToAST(secretLines.join('\n')),
      } as WBSecretBlockNode);
      continue;
    }

    // 2. Page insert: {{insert: Target | title="..." | borderless | hidden | centered}}
    const insertMatch = line.trim().match(/^\{\{insert:\s*([^}|]+)(.*?)\}\}$/i);
    if (insertMatch) {
      const target = insertMatch[1].trim();
      const optionsStr = insertMatch[2] || '';
      const customTitleMatch = optionsStr.match(/title=["'](.*?)["']/);
      nodes.push({
        type: 'pageinsert',
        raw: line.trim(),
        target,
        title: customTitleMatch ? customTitleMatch[1] : undefined,
        borderless: optionsStr.includes('borderless'),
        hidden: optionsStr.includes('hidden'),
        centered: optionsStr.includes('centered'),
      } as WBPageInsertNode);
      i++;
      continue;
    }

    // 3. Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      nodes.push({ type: 'hr' } as WBHrNode);
      i++;
      continue;
    }

    // 4. Code Block: ```lang ... ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push({
        type: 'codeblock',
        language: lang,
        code: codeLines.join('\n'),
      } as WBCodeBlockNode);
      continue;
    }

    // 5. Headings: # Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      nodes.push({
        type: 'heading',
        level,
        text,
        id: text.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, ''),
        children: parseInlineTokens(text),
      } as WBHeadingNode);
      i++;
      continue;
    }

    // 6. Blockquote: > text
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      nodes.push({
        type: 'blockquote',
        text: quoteLines.join('\n'),
        children: parseMarkdownToAST(quoteLines.join('\n')),
      } as WBBlockquoteNode);
      continue;
    }

    // 7. Table: | a | b |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const rawHeaders = tableLines[0].slice(1, -1).split('|').map((s) => s.trim());
        const alignments = tableLines[1]
          .slice(1, -1)
          .split('|')
          .map((s) => {
            const trimmedCol = s.trim();
            if (trimmedCol.startsWith(':') && trimmedCol.endsWith(':')) return 'center' as const;
            if (trimmedCol.endsWith(':')) return 'right' as const;
            return 'left' as const;
          });

        const rows: string[][] = [];
        for (let r = 2; r < tableLines.length; r++) {
          rows.push(tableLines[r].slice(1, -1).split('|').map((s) => s.trim()));
        }

        nodes.push({
          type: 'table',
          headers: rawHeaders,
          alignments,
          rows,
          headerNodes: rawHeaders.map((h) => parseInlineTokens(h)),
          rowNodes: rows.map((row) => row.map((cell) => parseInlineTokens(cell))),
        } as WBTableNode);
        continue;
      }
    }

    // 8. Lists (ordered or unordered, task lists)
    const isUnordered = /^(\s*)[*+-]\s+(.+)$/.test(line);
    const isOrdered = /^(\s*)\d+\.\s+(.+)$/.test(line);

    if (isUnordered || isOrdered) {
      const ordered = isOrdered;
      const items: WBListItemNode[] = [];

      while (i < lines.length) {
        const current = lines[i];
        const matchItem = ordered
          ? current.match(/^(\s*)\d+\.\s+(.+)$/)
          : current.match(/^(\s*)[*+-]\s+(.+)$/);

        if (!matchItem) break;

        let itemText = matchItem[2];
        let checked: boolean | undefined = undefined;

        // Task list check
        const taskMatch = itemText.match(/^\[([ xX])\]\s+(.+)$/);
        if (taskMatch) {
          checked = taskMatch[1].toLowerCase() === 'x';
          itemText = taskMatch[2];
        }

        items.push({
          text: itemText,
          checked,
          children: parseInlineTokens(itemText),
        });
        i++;
      }

      nodes.push({
        type: 'list',
        ordered,
        items,
      } as WBListNode);
      continue;
    }

    // 9. Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // 10. Paragraph (accumulate consecutive non-empty lines)
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith(':::') &&
      !lines[i].trim().startsWith('|') &&
      !/^(\s*)[*+-]\s+/.test(lines[i]) &&
      !/^(\s*)\d+\.\s+/.test(lines[i]) &&
      !/^\{\{insert:/.test(lines[i].trim())
    ) {
      pLines.push(lines[i]);
      i++;
    }

    const pText = pLines.join('\n');
    nodes.push({
      type: 'paragraph',
      children: parseInlineTokens(pText),
    } as WBParagraphNode);
  }

  return nodes;
}
