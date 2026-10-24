import { create } from 'zustand';
import { WBNote, WBFolder, WBMetaData, WBEntityType, WBMapPin } from '../types/wbmd';
import { wbStorageService } from '../services/wbStorageService';
import { wbIndexEngine, WBVaultIndex } from '../services/wbIndexEngine';
import { parseFrontmatter, serializeFrontmatter } from '../utils/wbMarkdownParser';

interface WBState {
  vaultPath: string | null;
  vaultName: string;
  notes: Record<string, WBNote>;
  folders: WBFolder[];
  activeNoteId: string | null;
  activeNoteContent: string;
  activeNoteMeta: WBMetaData;
  activeNoteBody: string;
  isDirty: boolean;
  isSaving: boolean;
  searchQuery: string;
  activeTagFilter: string | null;
  editorMode: 'split' | 'edit' | 'preview';
  viewMode: 'workspace' | 'graph' | 'pinboard';
  graphIndex: WBVaultIndex | null;
  mapPins: WBMapPin[];
  activeMapImage: string | null;

  // Actions
  initVault: (targetPath?: string) => Promise<void>;
  openVaultDialog: () => Promise<void>;
  selectNote: (noteId: string) => void;
  updateActiveContent: (newContent: string) => void;
  updateActiveMeta: (updatedMeta: Partial<WBMetaData>) => void;
  saveActiveNote: () => Promise<void>;
  createNote: (
    folderRel?: string,
    title?: string,
    type?: WBEntityType,
    initialContent?: string
  ) => Promise<string>;
  deleteNote: (noteId: string) => Promise<void>;
  renameNote: (noteId: string, newTitle: string) => Promise<void>;
  createFolder: (folderRel: string) => Promise<void>;
  setEditorMode: (mode: 'split' | 'edit' | 'preview') => void;
  setViewMode: (mode: 'workspace' | 'graph' | 'pinboard') => void;
  setSearchQuery: (query: string) => void;
  setActiveTagFilter: (tag: string | null) => void;
  addMapPin: (pin: WBMapPin) => void;
  removeMapPin: (pinId: string) => void;
  setActiveMapImage: (url: string | null) => void;
  restoreRussianStarterNotes: () => Promise<void>;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export const useWBStore = create<WBState>((set, get) => ({
  vaultPath: null,
  vaultName: 'TTRPG Campaign Vault',
  notes: {},
  folders: [],
  activeNoteId: null,
  activeNoteContent: '',
  activeNoteMeta: { title: 'Untitled' },
  activeNoteBody: '',
  isDirty: false,
  isSaving: false,
  searchQuery: '',
  activeTagFilter: null,
  editorMode: 'split',
  viewMode: 'workspace',
  graphIndex: null,
  mapPins: [],
  activeMapImage: null,

  initVault: async (targetPath?: string) => {
    const path = targetPath || get().vaultPath || 'virtual:default';
    const vaultName = path.includes('/') || path.includes('\\')
      ? path.split(/[/\\]/).filter(Boolean).pop() || 'TTRPG Campaign Vault'
      : path.replace('virtual:', '');

    try {
      const { notes, folders } = await wbStorageService.loadVaultFiles(path);
      const notesMap: Record<string, WBNote> = {};
      for (const n of notes) {
        notesMap[n.id] = n;
      }

      const graphIndex = wbIndexEngine.buildVaultIndex(notes);

      // Select first note if none selected or if active note no longer exists
      let activeId = get().activeNoteId;
      if (!activeId || !notesMap[activeId]) {
        activeId = notes.length > 0 ? notes[0].id : null;
      }

      const activeNote = activeId ? notesMap[activeId] : null;

      set({
        vaultPath: path,
        vaultName,
        notes: notesMap,
        folders,
        activeNoteId: activeId,
        activeNoteContent: activeNote?.content || '',
        activeNoteMeta: activeNote?.meta || { title: 'Untitled' },
        activeNoteBody: activeNote?.body || '',
        graphIndex,
        isDirty: false,
      });
    } catch (err) {
      console.error('[WBStore] Failed to initialize vault:', err);
    }
  },

  openVaultDialog: async () => {
    const selected = await wbStorageService.openVaultDialog();
    if (selected) {
      await get().initVault(selected);
    }
  },

  selectNote: (noteId: string) => {
    const state = get();
    if (state.activeNoteId === noteId) return;

    // If current note is dirty, save it immediately
    if (state.isDirty && state.activeNoteId) {
      state.saveActiveNote();
    }

    const note = state.notes[noteId];
    if (note) {
      set({
        activeNoteId: noteId,
        activeNoteContent: note.content,
        activeNoteMeta: note.meta,
        activeNoteBody: note.body,
        isDirty: false,
      });
    }
  },

  updateActiveContent: (newContent: string) => {
    const { activeNoteId } = get();
    if (!activeNoteId) return;

    const { meta, body } = parseFrontmatter(newContent);

    set({
      activeNoteContent: newContent,
      activeNoteMeta: meta,
      activeNoteBody: body,
      isDirty: true,
    });

    // Auto-save debounce (450ms)
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      get().saveActiveNote();
    }, 450);
  },

  updateActiveMeta: (updatedMeta: Partial<WBMetaData>) => {
    const { activeNoteMeta, activeNoteBody } = get();
    const newMeta: WBMetaData = {
      ...activeNoteMeta,
      ...updatedMeta,
    };
    const newContent = serializeFrontmatter(newMeta, activeNoteBody);
    get().updateActiveContent(newContent);
  },

  saveActiveNote: async () => {
    const { activeNoteId, notes, activeNoteContent, activeNoteMeta, activeNoteBody } = get();
    if (!activeNoteId || !notes[activeNoteId]) return;

    set({ isSaving: true });
    try {
      const currentNote = notes[activeNoteId];
      const updatedNote: WBNote = {
        ...currentNote,
        content: activeNoteContent,
        meta: activeNoteMeta,
        body: activeNoteBody,
        title: activeNoteMeta.title || currentNote.title,
        modifiedTime: Date.now(),
      };

      await wbStorageService.saveNote(updatedNote);

      const newNotesMap = {
        ...notes,
        [activeNoteId]: updatedNote,
      };

      const updatedIndex = wbIndexEngine.buildVaultIndex(Object.values(newNotesMap));

      set({
        notes: newNotesMap,
        graphIndex: updatedIndex,
        isDirty: false,
        isSaving: false,
      });
    } catch (err) {
      console.error('[WBStore] Error saving active note:', err);
      set({ isSaving: false });
    }
  },

  createNote: async (
    folderRel = '',
    title = 'Новая Заметка',
    type: WBEntityType = 'custom',
    initialContent?: string
  ): Promise<string> => {
    const { vaultPath, notes } = get();
    const targetVault = vaultPath || 'virtual:default';

    const newNote = await wbStorageService.createNote(
      targetVault,
      folderRel,
      title,
      initialContent,
      type
    );

    const newNotesMap = {
      ...notes,
      [newNote.id]: newNote,
    };

    const updatedIndex = wbIndexEngine.buildVaultIndex(Object.values(newNotesMap));

    set({
      notes: newNotesMap,
      activeNoteId: newNote.id,
      activeNoteContent: newNote.content,
      activeNoteMeta: newNote.meta,
      activeNoteBody: newNote.body,
      graphIndex: updatedIndex,
      isDirty: false,
    });

    return newNote.id;
  },

  deleteNote: async (noteId: string) => {
    const { notes, activeNoteId } = get();
    const target = notes[noteId];
    if (!target) return;

    await wbStorageService.deleteNote(target);

    const newNotesMap = { ...notes };
    delete newNotesMap[noteId];

    const remainingNotes = Object.values(newNotesMap);
    const updatedIndex = wbIndexEngine.buildVaultIndex(remainingNotes);

    const nextActiveId = activeNoteId === noteId
      ? (remainingNotes.length > 0 ? remainingNotes[0].id : null)
      : activeNoteId;

    const nextActiveNote = nextActiveId ? newNotesMap[nextActiveId] : null;

    set({
      notes: newNotesMap,
      activeNoteId: nextActiveId,
      activeNoteContent: nextActiveNote?.content || '',
      activeNoteMeta: nextActiveNote?.meta || { title: 'Untitled' },
      activeNoteBody: nextActiveNote?.body || '',
      graphIndex: updatedIndex,
      isDirty: false,
    });
  },

  renameNote: async (noteId: string, newTitle: string) => {
    const { notes } = get();
    const current = notes[noteId];
    if (!current || !newTitle.trim()) return;

    const oldTitle = current.title;
    const cleanTitle = newTitle.trim();

    // 1. Refactor links in all notes
    const { updatedNotes } = wbIndexEngine.refactorLinksOnRename(
      oldTitle,
      cleanTitle,
      Object.values(notes)
    );

    // 2. Update current note title & meta
    const updatedMap: Record<string, WBNote> = {};
    for (const n of updatedNotes) {
      if (n.id === noteId) {
        const newMeta = { ...n.meta, title: cleanTitle };
        n.title = cleanTitle;
        n.meta = newMeta;
        n.content = serializeFrontmatter(newMeta, n.body);
      }
      updatedMap[n.id] = n;
      await wbStorageService.saveNote(n);
    }

    const updatedIndex = wbIndexEngine.buildVaultIndex(Object.values(updatedMap));

    const activeNote = updatedMap[noteId];
    set({
      notes: updatedMap,
      activeNoteContent: activeNote.content,
      activeNoteMeta: activeNote.meta,
      activeNoteBody: activeNote.body,
      graphIndex: updatedIndex,
      isDirty: false,
    });
  },

  createFolder: async (folderRel: string) => {
    const { vaultPath, folders } = get();
    const targetVault = vaultPath || 'virtual:default';
    await wbStorageService.createFolder(targetVault, folderRel);

    const folderName = folderRel.split('/').pop() || folderRel;
    if (!folders.some((f) => f.path === folderRel)) {
      set({
        folders: [...folders, { name: folderName, path: folderRel, children: [] }],
      });
    }
  },

  setEditorMode: (mode) => set({ editorMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTagFilter: (tag) => set({ activeTagFilter: tag }),

  addMapPin: (pin) => set((s) => ({ mapPins: [...s.mapPins, pin] })),
  removeMapPin: (pinId) => set((s) => ({ mapPins: s.mapPins.filter((p) => p.id !== pinId) })),
  setActiveMapImage: (url) => set({ activeMapImage: url }),
  restoreRussianStarterNotes: async () => {
    wbStorageService.restoreRussianStarterNotes();
    await get().initVault('virtual:default');
  },
}));
