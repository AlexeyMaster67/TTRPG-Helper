import React, { useRef } from 'react';
import { useWBStore } from '../../store/wbStore';
import { wbBroadcastBridge } from '../../services/wbBroadcastBridge';
import { usePartyStore } from '../../store/partyStore';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Table as TableIcon,
  Code,
  Dices,
  Skull,
  Link as LinkIcon,
  ShieldAlert,
  Send,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const WBEditor: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeNoteContent = useWBStore((s) => s.activeNoteContent);
  const activeNoteId = useWBStore((s) => s.activeNoteId);
  const notes = useWBStore((s) => s.notes);
  const isDirty = useWBStore((s) => s.isDirty);
  const isSaving = useWBStore((s) => s.isSaving);
  const updateActiveContent = useWBStore((s) => s.updateActiveContent);

  const activeNote = activeNoteId ? notes[activeNoteId] : null;

  // Insert helper
  const insertText = (prefix: string, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selection = current.substring(start, end) || defaultText;

    const before = current.substring(0, start);
    const after = current.substring(end);

    const replacement = `${prefix}${selection}${suffix}`;
    const nextContent = `${before}${replacement}${after}`;

    updateActiveContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selection.length
      );
    }, 10);
  };

  const handleBroadcast = () => {
    if (!activeNote) return;
    const result = wbBroadcastBridge.broadcastNoteToPlayerDisplay(activeNote);
    if (result.success) {
      usePartyStore
        .getState()
        .showToast(
          `📺 "${result.title}" отправлено на экран игроков! (Секретов скрыто: ${result.removedSecretsCount})`
        );
    }
  };

  const wordCount = activeNoteContent ? activeNoteContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = activeNoteContent ? activeNoteContent.length : 0;

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      {/* Top Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/80 text-zinc-300 select-none overflow-x-auto gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertText('**', '**', 'жирный текст')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Жирный шрифт (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('*', '*', 'курсив')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Курсив (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('# ', '\n', 'Заголовок 1')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Заголовок H1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('## ', '\n', 'Заголовок 2')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Заголовок H2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('- ', '\n', 'Элемент списка')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Маркированный список"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('| Колонка 1 | Колонка 2 |\n|---|---|\n| Значение 1 | Значение 2 |\n')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Вставить таблицу"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('```\n', '\n```', 'код')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Блок кода"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-750 mx-1" />

          {/* TTRPG Specialized Inserts */}
          <button
            type="button"
            onClick={() => insertText('[[', ']]', 'Имя Заметки')}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800/80 hover:bg-amber-500/20 text-amber-300 border border-zinc-700/60 hover:border-amber-500/50 transition-colors"
            title="Вставить викиссылку [[...]]"
          >
            <LinkIcon className="w-3 h-3 text-amber-400" />
            <span>Ссылка</span>
          </button>

          <button
            type="button"
            onClick={() => insertText('dice:1d20+')}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800/80 hover:bg-amber-500/20 text-amber-300 border border-zinc-700/60 hover:border-amber-500/50 transition-colors"
            title="Вставить интерактивный кубик dice:..."
          >
            <Dices className="w-3 h-3 text-amber-400" />
            <span>Кубик</span>
          </button>

          <button
            type="button"
            onClick={() => insertText('@monster:', '', 'Goblin')}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800/80 hover:bg-red-500/20 text-red-300 border border-zinc-700/60 hover:border-red-500/50 transition-colors"
            title="Вставить ссылку на монстра @monster:..."
          >
            <Skull className="w-3 h-3 text-red-400" />
            <span>Монстр</span>
          </button>

          <button
            type="button"
            onClick={() => insertText(':::secret [Секрет Мастера]\n', '\n:::\n', 'Секретная информация...')}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800/80 hover:bg-amber-500/20 text-amber-300 border border-zinc-700/60 hover:border-amber-500/50 transition-colors"
            title="Вставить секретный блок мастера"
          >
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span>Секрет</span>
          </button>
        </div>

        {/* Broadcast to Players Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBroadcast}
            disabled={!activeNote}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Транслировать заметку на экран игроков (секреты мастера будут удалены автоматически)"
          >
            <Send className="w-3 h-3" />
            <span className="hidden sm:inline">Игрокам</span>
          </button>
        </div>
      </div>

      {/* Editor Textarea */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={activeNoteContent}
          onChange={(e) => updateActiveContent(e.target.value)}
          placeholder="# Начните писать заметку..."
          className="w-full h-full p-4 bg-zinc-950 text-zinc-100 font-mono text-xs md:text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 border-none selection:bg-amber-500/30"
          spellCheck={false}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-t border-zinc-800 text-[11px] font-mono text-zinc-400 select-none">
        <div className="flex items-center gap-3">
          <span>Слов: {wordCount}</span>
          <span>Символов: {charCount}</span>
        </div>
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="flex items-center gap-1 text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Сохранение...
            </span>
          ) : isDirty ? (
            <span className="text-zinc-500">Не сохранено</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              Сохранено
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
