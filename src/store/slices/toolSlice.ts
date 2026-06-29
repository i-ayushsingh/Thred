import { StateCreator } from 'zustand';
import { AppState, Note, Todo } from '../types';
import { VaultItem, TodoItem } from '../../shared/vault-schema';

export const createToolSlice: StateCreator<AppState, [], [], Partial<AppState>> = (set, get) => ({
  toolWindows: [],
  notes: [],
  activeNoteId: null,
  todos: { permanent: [], temporary: [] },
  scratchpadContent: '',
  scratchpadPosition: null,
  scratchpadSize: null,
  whiteboardContent: null,
  whiteboardPosition: null,
  whiteboardSize: null,
  activeDownloads: [],
  todoTab: 'temporary',

  openToolWindow: (id) => {
    const state = get();
    const existing = state.toolWindows.find((tw) => tw.id === id);
    if (existing) {
      if (existing.minimized) {
        set({ toolWindows: state.toolWindows.map((tw) => tw.id === id ? { ...tw, minimized: false } : tw) });
        return;
      }
      set({ toolWindows: state.toolWindows.filter((tw) => tw.id !== id) });
      return;
    }
    const MAX_TOOLS = 4;
    const activeCount = state.toolWindows.filter((tw) => !tw.minimized).length;
    if (activeCount >= MAX_TOOLS) {
      const oldest = state.toolWindows[0];
      set({ toolWindows: [...state.toolWindows.filter((tw) => tw.id !== oldest.id), { id, minimized: false, maximized: false }] });
      return;
    }
    set({ toolWindows: [...state.toolWindows, { id, minimized: false, maximized: false }] });
  },

  closeToolWindow: (id) => {
    set((state) => ({
      toolWindows: state.toolWindows.filter((tw) => tw.id !== id)
    }));
  },

  setTodoTab: (tab) => set({ todoTab: tab }),

  loadNotes: async () => {
    try {
      const items = get().vaultItems;
      const notes = items
        .filter((i) => i.kind === 'note')
        .map((i) => ({
          id: i.id,
          title: i.title,
          content: i.fullText || '',
          color: i.color || '',
          isPinned: !!i.isPinned,
          tags: i.tags || [],
          createdAt: i.createdAt || new Date().toISOString(),
          updatedAt: i.updatedAt || new Date().toISOString(),
        }));
      const activeExists = notes.some(n => n.id === get().activeNoteId);
      set({ notes, activeNoteId: activeExists ? get().activeNoteId : null });
    } catch (_) { /* ignored */ }
  },

  saveNote: async (note) => {
    try {
      const cleanContent = (note.content || '').replace(/<[^>]*>/g, '');
      const vaultItem: VaultItem = {
        id: note.id,
        kind: 'note',
        category: 'Notebooks',
        notebookSubtab: 'notes',
        title: note.title || 'Untitled Note',
        fullText: note.content || '',
        desc: cleanContent ? (cleanContent.length > 80 ? cleanContent.slice(0, 80) + '...' : cleanContent) : '',
        color: note.color || '',
        icon: 'sticky_note_2',
        isFavorite: false,
        isPinned: !!note.isPinned,
        tags: note.tags || [],
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
      await get().addVaultItem(vaultItem);
    } catch (_) { /* ignored */ }
  },

  deleteNote: async (id) => {
    try {
      await get().deleteVaultItem(id, 'Notebooks');
      set((state) => ({
        activeNoteId: state.activeNoteId === id ? null : state.activeNoteId
      }));
    } catch (_) { /* ignored */ }
  },

  setActiveNoteId: (id) => set({ activeNoteId: id }),

  loadTodos: async () => {
    try {
      const items = get().vaultItems;
      const temporary = items
        .filter((i) => i.kind === 'todo' && i.notebookSubtab === 'todo')
        .map((i) => {
          const t = i as TodoItem;
          return {
            id: t.id,
            text: t.title,
            completed: !!t.completed,
            type: 'temporary' as const,
            createdAt: t.createdAt || new Date().toISOString(),
            completedAt: t.completedAt,
            priority: t.priority,
          };
        });
      const permanent = items
        .filter((i) => i.kind === 'todo' && i.notebookSubtab === 'long-term-todo')
        .map((i) => {
          const t = i as TodoItem;
          return {
            id: t.id,
            text: t.title,
            completed: !!t.completed,
            type: 'permanent' as const,
            createdAt: t.createdAt || new Date().toISOString(),
            completedAt: t.completedAt,
            priority: t.priority,
          };
        });
      set({ todos: { temporary, permanent } });
    } catch (_) { /* ignored */ }
  },

  addTodo: async (todo) => {
    try {
      const id = 'todo-' + Math.random().toString(36).substring(7);
      const now = new Date().toISOString();
      const vaultItem: VaultItem = {
        id,
        kind: 'todo',
        category: 'Notebooks',
        notebookSubtab: todo.type === 'permanent' ? 'long-term-todo' : 'todo',
        title: todo.text || 'Untitled Task',
        desc: 'Pending',
        fullText: '',
        completed: false,
        priority: todo.priority || 'medium',
        icon: todo.type === 'permanent' ? 'list_alt' : 'checklist',
        isFavorite: false,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      };
      await get().addVaultItem(vaultItem);
    } catch (_) { /* ignored */ }
  },

  toggleTodo: async (id) => {
    try {
      const items = get().vaultItems;
      const existing = items.find((i) => i.id === id);
      if (existing) {
        const t = existing as TodoItem;
        const nextCompleted = !t.completed;
        const now = new Date().toISOString();
        const updated = {
          ...existing,
          completed: nextCompleted,
          completedAt: nextCompleted ? now : undefined,
          desc: nextCompleted ? 'Completed' : 'Pending',
          updatedAt: now,
        };
        await get().addVaultItem(updated);
      }
    } catch (_) { /* ignored */ }
  },

  deleteTodo: async (id) => {
    try {
      await get().deleteVaultItem(id, 'Notebooks');
    } catch (_) { /* ignored */ }
  },

  cleanupTodos: async () => {
    try {
      const items = get().vaultItems;
      const toDelete = items.filter((i: any) =>
        i.category === 'Notebooks' &&
        i.notebookSubtab === 'todo' &&
        i.completed
      );

      for (const item of toDelete) {
        await get().deleteVaultItem(item.id, 'Notebooks');
      }
    } catch (_) { /* ignored */ }
  },

  minimizeToolWindow: (id) => {
    set((state) => ({
      toolWindows: state.toolWindows.map(tw =>
        tw.id === id ? { ...tw, minimized: !tw.minimized } : tw
      ),
    }));
  },

  setToolWindowMaximized: (id, maximized) => set((state) => ({
    toolWindows: state.toolWindows.map(tw =>
      tw.id === id ? { ...tw, maximized: maximized } : tw
    ),
  })),

  setScratchpadContent: (content) => set({ scratchpadContent: content }),
  setScratchpadPosition: (pos) => set({ scratchpadPosition: pos }),
  setScratchpadSize: (size) => set({ scratchpadSize: size }),
  clearScratchpad: () => set({ scratchpadContent: '', scratchpadPosition: null, scratchpadSize: null }),

  setWhiteboardContent: (content) => set({ whiteboardContent: content }),
  setWhiteboardPosition: (pos) => set({ whiteboardPosition: pos }),
  setWhiteboardSize: (size) => set({ whiteboardSize: size }),
  clearWhiteboard: () => set({ whiteboardContent: null, whiteboardPosition: null, whiteboardSize: null }),

  addActiveDownload: (download) => set((state) => {
    if (state.activeDownloads.some(d => d.filename === download.filename)) return {};
    return {
      activeDownloads: [...state.activeDownloads, {
        id: download.id,
        filename: download.filename,
        receivedBytes: 0,
        totalBytes: download.totalBytes,
        aiId: download.aiId,
        subfolder: download.subfolder,
        timestamp: download.timestamp
      }]
    };
  }),

  updateActiveDownloadProgress: (filename, receivedBytes, totalBytes) => set((state) => ({
    activeDownloads: state.activeDownloads.map(d =>
      d.filename === filename ? { ...d, receivedBytes, totalBytes } : d
    )
  })),

  removeActiveDownload: (filename) => set((state) => ({
    activeDownloads: state.activeDownloads.filter(d => d.filename !== filename)
  })),
});
