import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { useWBStore } from '../../store/wbStore';
import { wbIndexEngine } from '../../services/wbIndexEngine';
import { WBNote, WBEntityType } from '../../types/wbmd';
import {
  Folder,
  FolderOpen,
  FileText,
  User,
  MapPin,
  Shield,
  Scroll,
  Plus,
  FolderPlus,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  HardDrive,
} from 'lucide-react';

export const WBFileTree: React.FC = () => {
  const { t } = useTranslation();
  const vaultName = useWBStore((s) => s.vaultName);
  const notes = useWBStore((s) => s.notes);
  const activeNoteId = useWBStore((s) => s.activeNoteId);
  const selectNote = useWBStore((s) => s.selectNote);
  const openVaultDialog = useWBStore((s) => s.openVaultDialog);
  const createNote = useWBStore((s) => s.createNote);
  const createFolder = useWBStore((s) => s.createFolder);
  const deleteNote = useWBStore((s) => s.deleteNote);
  const renameNote = useWBStore((s) => s.renameNote);
  const searchQuery = useWBStore((s) => s.searchQuery);
  const setSearchQuery = useWBStore((s) => s.setSearchQuery);
  const activeTagFilter = useWBStore((s) => s.activeTagFilter);
  const setActiveTagFilter = useWBStore((s) => s.setActiveTagFilter);

  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [contextMenuNoteId, setContextMenuNoteId] = useState<string | null>(null);

  // In-app modal dialog state to replace native browser window.prompt / window.confirm (never show tauri.localhost)
  const [modalDialog, setModalDialog] = useState<
    | null
    | { type: 'newNote'; folder: string; inputValue: string }
    | { type: 'newFolder'; inputValue: string }
    | { type: 'rename'; note: WBNote; inputValue: string }
    | { type: 'delete'; note: WBNote }
  >(null);

  const allNotesList = Object.values(notes);
  const filteredNotes = wbIndexEngine.searchNotes(
    searchQuery,
    allNotesList,
    activeTagFilter ? [activeTagFilter] : undefined
  );

  // Group notes by folder
  const folderGroups: Record<string, WBNote[]> = { '': [] };
  for (const note of filteredNotes) {
    const parts = note.id.split('/');
    if (parts.length > 1) {
      const folder = parts.slice(0, -1).join('/');
      if (!folderGroups[folder]) folderGroups[folder] = [];
      folderGroups[folder].push(note);
    } else {
      folderGroups[''].push(note);
    }
  }

  const toggleFolder = (folder: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleOpenNewNoteModal = (folder = '') => {
    setModalDialog({
      type: 'newNote',
      folder,
      inputValue: t('wb.newNoteDefault'),
    });
  };

  const handleOpenNewFolderModal = () => {
    setModalDialog({
      type: 'newFolder',
      inputValue: '',
    });
  };

  const handleOpenRenameModal = (note: WBNote) => {
    setContextMenuNoteId(null);
    setModalDialog({
      type: 'rename',
      note,
      inputValue: note.title,
    });
  };

  const handleOpenDeleteModal = (note: WBNote) => {
    setContextMenuNoteId(null);
    setModalDialog({
      type: 'delete',
      note,
    });
  };

  const handleModalConfirm = async () => {
    if (!modalDialog) return;

    if (modalDialog.type === 'newNote') {
      const val = modalDialog.inputValue.trim();
      if (val) {
        await createNote(modalDialog.folder, val);
      }
    } else if (modalDialog.type === 'newFolder') {
      const val = modalDialog.inputValue.trim();
      if (val) {
        await createFolder(val);
      }
    } else if (modalDialog.type === 'rename') {
      const val = modalDialog.inputValue.trim();
      if (val && val !== modalDialog.note.title) {
        await renameNote(modalDialog.note.id, val);
      }
    } else if (modalDialog.type === 'delete') {
      await deleteNote(modalDialog.note.id);
    }

    setModalDialog(null);
  };

  const getNodeIcon = (type?: WBEntityType) => {
    switch (type) {
      case 'npc':
        return <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'location':
        return <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'faction':
        return <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'quest':
        return <Scroll className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'item':
        return <Shield className="w-3.5 h-3.5 text-emerald-300 shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-zinc-200 select-none w-64">
      {/* Vault Title and Switcher */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
        <div className="flex items-center gap-2 overflow-hidden" title={vaultName}>
          <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold text-xs truncate text-zinc-100">{vaultName}</span>
        </div>
        <button
          type="button"
          onClick={openVaultDialog}
          className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          title={t('wb.changeVaultTitle')}
        >
          {t('wb.changeVault')}
        </button>
      </div>

      {/* Action Bar & Search */}
      <div className="p-2 border-b border-zinc-800/80 space-y-2 bg-zinc-900/90">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('wb.searchPlaceholder')}
            className="w-full bg-zinc-950/80 text-xs pl-8 pr-7 py-1.5 rounded-md border border-zinc-750 text-zinc-200 focus:outline-none focus:border-amber-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active Tag Filter */}
        {activeTagFilter && (
          <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
            <span className="truncate">{t('wb.tagFilter', { tag: activeTagFilter })}</span>
            <button
              type="button"
              onClick={() => setActiveTagFilter(null)}
              className="text-amber-400 hover:text-amber-200 ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Quick Add Buttons */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => handleOpenNewNoteModal('')}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('wb.newNote')}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenNewFolderModal}
            className="flex items-center justify-center p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700 cursor-pointer"
            title={t('wb.newFolder')}
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Files Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {Object.entries(folderGroups).map(([folder, notesInFolder]) => {
          if (folder === '' && notesInFolder.length === 0) return null;
          const isCollapsed = collapsedFolders[folder];

          return (
            <div key={folder || 'root'} className="space-y-0.5">
              {folder && (
                <div
                  onClick={() => toggleFolder(folder)}
                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-zinc-800/60 cursor-pointer text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}
                    {isCollapsed ? (
                      <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                    ) : (
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className="truncate">{folder}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNewNoteModal(folder);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-amber-400 p-0.5 transition-opacity"
                    title={t('wb.createInFolder', { folder })}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}

              {(!folder || !isCollapsed) && (
                <div className={folder ? 'pl-4 space-y-0.5 border-l border-zinc-800 ml-3' : 'space-y-0.5'}>
                  {notesInFolder.map((note) => {
                    const isActive = note.id === activeNoteId;

                    return (
                      <div
                        key={note.id}
                        onClick={() => selectNote(note.id)}
                        className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors group ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-200 font-medium border border-amber-500/40 shadow-sm'
                            : 'hover:bg-zinc-800/70 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {getNodeIcon(note.meta.type)}
                          <span className="truncate">{note.title}</span>
                        </div>

                        {/* Actions */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenuNoteId(contextMenuNoteId === note.id ? null : note.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-zinc-100 transition-opacity"
                          >
                            <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                          </button>

                          {contextMenuNoteId === note.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-32 bg-zinc-950 border border-zinc-700 rounded-md shadow-xl z-50 py-1 text-xs text-zinc-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenRenameModal(note)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-800 hover:text-zinc-100 text-left cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 text-amber-400" />
                                {t('wb.rename')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(note)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-800 text-red-400 hover:text-red-300 text-left cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                                {t('wb.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="p-4 text-center text-xs text-zinc-500">
            {t('wb.noNotesFound')}
          </div>
        )}
      </div>

      {/* In-app Modal Dialog (replaces native window.prompt and window.confirm, zero tauri.localhost) */}
      {modalDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl max-w-sm w-full p-4 text-zinc-100 flex flex-col gap-3 select-none">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h4 className="font-bold text-sm text-gold-light">
                {modalDialog.type === 'newNote' && t('wb.newNote')}
                {modalDialog.type === 'newFolder' && t('wb.newFolder')}
                {modalDialog.type === 'rename' && t('wb.rename')}
                {modalDialog.type === 'delete' && t('wb.delete')}
              </h4>
              <button
                type="button"
                onClick={() => setModalDialog(null)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalDialog.type === 'delete' ? (
              <div className="text-xs text-zinc-300 leading-relaxed py-1">
                {t('wb.deleteConfirm', { title: modalDialog.note.title })}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 py-1">
                <label className="text-[11px] text-zinc-400 font-medium">
                  {modalDialog.type === 'newNote' && t('wb.newNotePrompt')}
                  {modalDialog.type === 'newFolder' && t('wb.newFolderPrompt')}
                  {modalDialog.type === 'rename' && t('wb.renamePrompt')}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={modalDialog.inputValue}
                  onChange={(e) =>
                    setModalDialog({ ...modalDialog, inputValue: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleModalConfirm();
                    if (e.key === 'Escape') setModalDialog(null);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-gold"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setModalDialog(null)}
                className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleModalConfirm}
                className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  modalDialog.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-gold hover:bg-amber-400 text-black'
                }`}
              >
                {modalDialog.type === 'delete'
                  ? t('common.delete')
                  : modalDialog.type === 'rename'
                  ? t('wb.rename')
                  : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
