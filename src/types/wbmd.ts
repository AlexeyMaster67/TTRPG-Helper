/**
 * Types and interfaces for the WBmd (Worldbuilding Markdown) module of TTRPGHelper.
 */

export type WBEntityType =
  | 'npc'
  | 'location'
  | 'faction'
  | 'quest'
  | 'item'
  | 'session'
  | 'lore'
  | 'custom';

export interface WBMetaData {
  title: string;
  type?: WBEntityType;
  avatar?: string;
  tags?: string[];
  aliases?: string[];
  created?: string;
  updated?: string;
  location?: string;
  faction?: string;
  status?: string;
  cr?: number | string;
  custom_fields?: Record<string, string | number | boolean>;
  [key: string]: any;
}

export interface WBNote {
  id: string; // Relative path from vault root, e.g. "01_NPC/Eldrin.md"
  fileName: string; // "Eldrin.md"
  title: string; // Title from frontmatter or heading/filename
  path: string; // Full filesystem path or virtual key
  content: string; // Full raw markdown with frontmatter
  body: string; // Document body without frontmatter
  meta: WBMetaData; // Parsed frontmatter metadata
  outlinks: string[]; // List of target note IDs/names referenced
  backlinks: string[]; // List of note IDs referencing this note
  tags: string[]; // All unique tags (from frontmatter tags and inline #tags)
  modifiedTime: number; // Last modified timestamp
}

export interface WBFolder {
  name: string;
  path: string;
  children: (WBNote | WBFolder)[];
}

export interface WBGraphNode {
  id: string;
  title: string;
  type: WBEntityType;
  path?: string;
  tags?: string[];
  linkCount?: number;
  val?: number; // Visual weight / radius
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface WBGraphEdge {
  source: string; // Source note ID
  target: string; // Target note ID
  label?: string; // Relationship or context label
  relationType?: string; // 'allied' | 'located_in' | 'member_of' | 'generic'
}

export interface WBMapPin {
  id: string;
  noteId: string; // Target note ID / path
  mapId?: string; // Tactical map or image ID pinned to
  title: string;
  x: number; // Coordinate (percentage 0-100 or pixels)
  y: number;
  icon?: string;
  color?: string;
  description?: string;
}

// --------------------------------------------------------------------------
// AST & Token Node Definitions
// --------------------------------------------------------------------------

export type WBEntityLinkType = 'monster' | 'spell' | 'item' | 'char' | 'map';

export interface WBTextNode {
  type: 'text';
  content: string;
}

export interface WBBoldNode {
  type: 'bold';
  content: string;
  children?: WBAstInlineNode[];
}

export interface WBItalicNode {
  type: 'italic';
  content: string;
  children?: WBAstInlineNode[];
}

export interface WBStrikethroughNode {
  type: 'strikethrough';
  content: string;
  children?: WBAstInlineNode[];
}

export interface WBInlineCodeNode {
  type: 'inline_code';
  content: string;
}

export interface WBWikilinkNode {
  type: 'wikilink';
  raw: string;
  target: string;
  alias?: string;
  heading?: string;
}

export interface WBEntityLinkNode {
  type: 'entitylink';
  raw: string;
  entityType: WBEntityLinkType;
  id: string;
}

export interface WBDiceChipNode {
  type: 'dicechip';
  raw: string;
  formula: string;
  label?: string;
}

export interface WBSpoilerNode {
  type: 'spoiler';
  raw: string;
  text: string;
  isGMSecret?: boolean;
}

export interface WBTagNode {
  type: 'tag';
  tag: string;
}

export interface WBImageNode {
  type: 'image';
  raw: string;
  url: string;
  alt?: string;
  title?: string;
}

export interface WBLinkNode {
  type: 'link';
  raw: string;
  url: string;
  text: string;
}

export type WBAstInlineNode =
  | WBTextNode
  | WBBoldNode
  | WBItalicNode
  | WBStrikethroughNode
  | WBInlineCodeNode
  | WBWikilinkNode
  | WBEntityLinkNode
  | WBDiceChipNode
  | WBSpoilerNode
  | WBTagNode
  | WBImageNode
  | WBLinkNode;

export interface WBHeadingNode {
  type: 'heading';
  level: number; // 1 to 6
  text: string;
  id?: string;
  children?: WBAstInlineNode[];
}

export interface WBParagraphNode {
  type: 'paragraph';
  children: WBAstInlineNode[];
}

export interface WBListItemNode {
  text: string;
  checked?: boolean; // For task lists [ ] or [x]
  children: WBAstInlineNode[];
}

export interface WBListNode {
  type: 'list';
  ordered: boolean;
  items: WBListItemNode[];
}

export interface WBTableNode {
  type: 'table';
  headers: string[];
  alignments?: ('left' | 'center' | 'right')[];
  rows: string[][];
  headerNodes?: WBAstInlineNode[][];
  rowNodes?: WBAstInlineNode[][][];
}

export interface WBCodeBlockNode {
  type: 'codeblock';
  language?: string;
  code: string;
}

export interface WBBlockquoteNode {
  type: 'blockquote';
  text: string;
  children?: WBAstNode[];
}

export interface WBSecretBlockNode {
  type: 'secretblock';
  raw: string;
  title?: string;
  content: string;
  children?: WBAstNode[];
}

export interface WBPageInsertNode {
  type: 'pageinsert';
  raw: string;
  target: string;
  title?: string;
  borderless?: boolean;
  hidden?: boolean;
  centered?: boolean;
}

export interface WBHrNode {
  type: 'hr';
}

export type WBAstNode =
  | WBHeadingNode
  | WBParagraphNode
  | WBListNode
  | WBTableNode
  | WBCodeBlockNode
  | WBBlockquoteNode
  | WBSecretBlockNode
  | WBPageInsertNode
  | WBHrNode
  | WBAstInlineNode;

export type WBParsedToken = WBAstNode;
