import React, { useMemo } from 'react';
import {
  WBAstNode,
  WBAstInlineNode,
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
  WBTagNode,
  WBImageNode,
  WBLinkNode,
  WBInlineCodeNode,
  WBBoldNode,
  WBItalicNode,
  WBStrikethroughNode,
  WBTextNode,
} from '../../types/wbmd';
import { parseMarkdownToAST } from '../../utils/wbMarkdownParser';
import { useWBStore } from '../../store/wbStore';
import { WBDiceChip } from './WBDiceChip';
import { WBMonsterBadge } from './WBMonsterBadge';
import { WBSpoiler } from './WBSpoiler';
import { WBSecretBlock } from './WBSecretBlock';
import { Wand2, Shield, User, Map, Link as LinkIcon, CornerDownRight } from 'lucide-react';

interface WBPreviewProps {
  content?: string;
  className?: string;
}

export const WBPreview: React.FC<WBPreviewProps> = ({ content, className = '' }) => {
  const storeBody = useWBStore((s) => s.activeNoteBody);
  const notes = useWBStore((s) => s.notes);
  const selectNote = useWBStore((s) => s.selectNote);
  const setActiveTagFilter = useWBStore((s) => s.setActiveTagFilter);

  const rawText = content !== undefined ? content : storeBody;

  const ast = useMemo(() => {
    return parseMarkdownToAST(rawText);
  }, [rawText]);

  // Resolves note target for wikilinks
  const findNoteByTarget = (target: string): string | null => {
    const cleanTarget = target.trim().toLowerCase();
    for (const [id, note] of Object.entries(notes)) {
      if (
        id.toLowerCase() === cleanTarget ||
        note.title.toLowerCase() === cleanTarget ||
        note.fileName.replace(/\.md$/i, '').toLowerCase() === cleanTarget
      ) {
        return id;
      }
    }
    return null;
  };

  const renderInline = (node: WBAstInlineNode, index: number): React.ReactNode => {
    switch (node.type) {
      case 'text':
        return <span key={index}>{(node as WBTextNode).content}</span>;

      case 'bold':
        return (
          <strong key={index} className="font-bold text-zinc-100">
            {(node as WBBoldNode).children
              ? (node as WBBoldNode).children!.map((child, ci) => renderInline(child, ci))
              : (node as WBBoldNode).content}
          </strong>
        );

      case 'italic':
        return (
          <em key={index} className="italic text-zinc-300">
            {(node as WBItalicNode).children
              ? (node as WBItalicNode).children!.map((child, ci) => renderInline(child, ci))
              : (node as WBItalicNode).content}
          </em>
        );

      case 'strikethrough':
        return (
          <s key={index} className="line-through text-zinc-500">
            {(node as WBStrikethroughNode).children
              ? (node as WBStrikethroughNode).children!.map((child, ci) => renderInline(child, ci))
              : (node as WBStrikethroughNode).content}
          </s>
        );

      case 'inline_code':
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800 text-amber-300 font-mono text-xs border border-zinc-700/60"
          >
            {(node as WBInlineCodeNode).content}
          </code>
        );

      case 'wikilink': {
        const linkNode = node as WBWikilinkNode;
        const resolvedId = findNoteByTarget(linkNode.target);
        const displayText = linkNode.alias || linkNode.target;

        if (resolvedId) {
          return (
            <button
              key={index}
              type="button"
              onClick={() => selectNote(resolvedId)}
              className="inline-flex items-center gap-1 font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2 hover:bg-amber-500/10 px-1 py-0.5 rounded transition-colors cursor-pointer"
              title={`Перейти к заметке: ${linkNode.target}`}
            >
              <LinkIcon className="w-3 h-3 text-amber-500/80 inline" />
              <span>{displayText}</span>
            </button>
          );
        } else {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 font-medium text-red-400/80 line-through decoration-dotted px-1 py-0.5 rounded bg-red-950/20"
              title={`Заметка "${linkNode.target}" пока не создана`}
            >
              <span>{displayText}</span>
              <span className="text-[10px] text-red-500">?</span>
            </span>
          );
        }
      }

      case 'entitylink': {
        const entNode = node as WBEntityLinkNode;
        if (entNode.entityType === 'monster') {
          return <WBMonsterBadge key={index} id={entNode.id} />;
        } else if (entNode.entityType === 'spell') {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded text-xs font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-500/30"
            >
              <Wand2 className="w-3 h-3 text-indigo-400" />
              {entNode.id}
            </span>
          );
        } else if (entNode.entityType === 'item') {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
            >
              <Shield className="w-3 h-3 text-emerald-400" />
              {entNode.id}
            </span>
          );
        } else if (entNode.entityType === 'char') {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded text-xs font-semibold bg-purple-950/40 text-purple-300 border border-purple-500/30"
            >
              <User className="w-3 h-3 text-purple-400" />
              {entNode.id}
            </span>
          );
        } else if (entNode.entityType === 'map') {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded text-xs font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30"
            >
              <Map className="w-3 h-3 text-cyan-400" />
              {entNode.id}
            </span>
          );
        }
        return <span key={index}>{entNode.raw}</span>;
      }

      case 'dicechip': {
        const diceNode = node as WBDiceChipNode;
        return <WBDiceChip key={index} formula={diceNode.formula} label={diceNode.label} />;
      }

      case 'spoiler': {
        const spNode = node as WBSpoilerNode;
        return <WBSpoiler key={index} text={spNode.text} />;
      }

      case 'tag': {
        const tagNode = node as WBTagNode;
        return (
          <button
            key={index}
            type="button"
            onClick={() => setActiveTagFilter(tagNode.tag)}
            className="inline-block px-1.5 py-0.5 mx-0.5 text-[11px] font-mono rounded bg-zinc-800 text-zinc-300 hover:text-amber-300 hover:bg-zinc-700 transition-colors border border-zinc-700/50"
            title={`Фильтровать по тегу #${tagNode.tag}`}
          >
            #{tagNode.tag}
          </button>
        );
      }

      case 'image': {
        const imgNode = node as WBImageNode;
        return (
          <img
            key={index}
            src={imgNode.url}
            alt={imgNode.alt || 'Изображение'}
            className="my-3 max-w-full max-h-96 rounded-lg border border-zinc-700 shadow-md object-contain"
          />
        );
      }

      case 'link': {
        const lNode = node as WBLinkNode;
        return (
          <a
            key={index}
            href={lNode.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1"
          >
            {lNode.text}
          </a>
        );
      }

      default:
        return null;
    }
  };

  const renderBlockNode = (node: WBAstNode, index: number): React.ReactNode => {
    switch (node.type) {
      case 'heading': {
        const hNode = node as WBHeadingNode;
        const HeadingTag = `h${Math.min(6, Math.max(1, hNode.level))}` as keyof JSX.IntrinsicElements;
        const styles = [
          'font-display font-bold text-zinc-100 my-4 tracking-tight',
          hNode.level === 1 ? 'text-2xl border-b border-zinc-800 pb-2 text-amber-300' : '',
          hNode.level === 2 ? 'text-xl border-b border-zinc-800/60 pb-1 text-zinc-100' : '',
          hNode.level === 3 ? 'text-lg text-zinc-200' : '',
          hNode.level >= 4 ? 'text-base text-zinc-300 font-semibold' : '',
        ].join(' ');

        return (
          <HeadingTag key={index} id={hNode.id} className={styles}>
            {hNode.children ? hNode.children.map((c, ci) => renderInline(c, ci)) : hNode.text}
          </HeadingTag>
        );
      }

      case 'paragraph': {
        const pNode = node as WBParagraphNode;
        return (
          <p key={index} className="my-2.5 leading-relaxed text-zinc-300 text-sm">
            {pNode.children.map((c, ci) => renderInline(c, ci))}
          </p>
        );
      }

      case 'secretblock': {
        const sNode = node as WBSecretBlockNode;
        return (
          <WBSecretBlock key={index} title={sNode.title}>
            {sNode.children && sNode.children.length > 0
              ? sNode.children.map((c, ci) => renderBlockNode(c, ci))
              : sNode.content}
          </WBSecretBlock>
        );
      }

      case 'pageinsert': {
        const insNode = node as WBPageInsertNode;
        const resolvedId = findNoteByTarget(insNode.target);
        const targetNote = resolvedId ? notes[resolvedId] : null;

        return (
          <div
            key={index}
            className={`my-3 p-3 rounded-lg border ${
              insNode.borderless
                ? 'border-transparent bg-transparent'
                : 'border-zinc-800 bg-zinc-900/60 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mb-2 border-b border-zinc-800 pb-1">
              <CornerDownRight className="w-3.5 h-3.5 text-amber-500" />
              <span>{insNode.title || `Вставка: ${insNode.target}`}</span>
            </div>
            {targetNote ? (
              <WBPreview content={targetNote.body} />
            ) : (
              <p className="text-xs text-zinc-500 italic">Заметка "{insNode.target}" не найдена.</p>
            )}
          </div>
        );
      }

      case 'list': {
        const lNode = node as WBListNode;
        if (lNode.ordered) {
          return (
            <ol key={index} className="list-decimal list-inside my-2 space-y-1 text-sm text-zinc-300">
              {lNode.items.map((it, ii) => (
                <li key={ii}>{it.children.map((c, ci) => renderInline(c, ci))}</li>
              ))}
            </ol>
          );
        }
        return (
          <ul key={index} className="list-disc list-inside my-2 space-y-1 text-sm text-zinc-300">
            {lNode.items.map((it, ii) => (
              <li key={ii} className={it.checked !== undefined ? 'list-none flex items-center gap-2' : ''}>
                {it.checked !== undefined && (
                  <input
                    type="checkbox"
                    readOnly
                    checked={it.checked}
                    className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 cursor-default"
                  />
                )}
                <span>{it.children.map((c, ci) => renderInline(c, ci))}</span>
              </li>
            ))}
          </ul>
        );
      }

      case 'table': {
        const tNode = node as WBTableNode;
        return (
          <div key={index} className="my-3 overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300 divide-y divide-zinc-800">
              <thead className="bg-zinc-900 font-semibold text-zinc-200">
                <tr>
                  {tNode.headers.map((h, hi) => (
                    <th key={hi} className="px-3 py-2">
                      {tNode.headerNodes?.[hi]?.map((c, ci) => renderInline(c, ci)) || h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 bg-zinc-950/40">
                {tNode.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-zinc-900/40 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 whitespace-nowrap">
                        {tNode.rowNodes?.[ri]?.[ci]?.map((c, cii) => renderInline(c, cii)) || cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'codeblock': {
        const cNode = node as WBCodeBlockNode;
        return (
          <pre
            key={index}
            className="my-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-amber-200 overflow-x-auto"
          >
            <code>{cNode.code}</code>
          </pre>
        );
      }

      case 'blockquote': {
        const bNode = node as WBBlockquoteNode;
        return (
          <blockquote
            key={index}
            className="my-3 pl-4 border-l-2 border-amber-500/60 text-zinc-400 italic text-sm"
          >
            {bNode.children && bNode.children.length > 0
              ? bNode.children.map((c, ci) => renderBlockNode(c, ci))
              : bNode.text}
          </blockquote>
        );
      }

      case 'hr':
        return <hr key={index} className="my-4 border-zinc-800" />;

      default:
        return null;
    }
  };

  return (
    <div className={`wbmd-preview text-zinc-200 font-sans selection:bg-amber-500/30 ${className}`}>
      {ast.map((node, i) => renderBlockNode(node, i))}
    </div>
  );
};
