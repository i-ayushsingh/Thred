import { StateCreator } from 'zustand';
import { AppState } from '../types';
import { AI_LIST, AIConfig } from '../../shared/ai-list';

export const createAppSlice: StateCreator<AppState, [], [], Partial<AppState>> = (set, get) => ({
  activeAI: null,
  activeTab: 'home',
  settingsTab: 'models',
  vaultTab: 'Prompts',
  notebookSubTab: 'notes',
  conversationTab: 'History',
  tabHistory: [{ activeTab: 'home', settingsTab: 'models', vaultTab: 'Prompts', conversationTab: 'History' }],
  tabHistoryIndex: 0,
  reorderMode: false,
  aiList: AI_LIST,
  loadedAIs: [],
  splitAI: null,
  pendingBookmarkUrls: {},
  sidebarRefreshKey: 0,
  commandPaletteOpen: false,
  shortcutsOpen: false,
  sessionExpiredOpen: false,
  updateBannerDismissed: false,
  sidebarCollapsed: false,
  sidebarMinimized: false,
  rightSidebarMinimized: false,
  toolPopover: null,

  setActiveAI: (id, options) => {
    if (options?.silent) {
      set((state) => {
        if (id === null) return {};
        const newLoaded = !state.loadedAIs.includes(id)
          ? [...state.loadedAIs, id]
          : state.loadedAIs;
        return {
          loadedAIs: newLoaded
        };
      });
      return;
    }

    // Always set the active AI (don't use rememberLastAi)

    if (id) {
      setTimeout(async () => {
        try {
          const config = await window.electron.getConfig();
          const usage = (config.aiUsage || {}) as Record<string, number>;
          usage[id] = (usage[id] || 0) + 1;
          await window.electron.updateConfig({ aiUsage: usage });
        } catch (e) {
          console.error('[Thred Usage Track] Failed to save usage count:', e);
        }
      }, 0);
    }

    set((state) => {
      if (id === null) {
        return { activeAI: null, splitAI: null };
      }
      const newLoaded = !state.loadedAIs.includes(id)
        ? [...state.loadedAIs, id]
        : state.loadedAIs;
      return {
        activeAI: id,
        loadedAIs: newLoaded
      };
    });
    if (id) {
      void get().logAIHistory({
        aiId: id,
        type: 'open',
        title: `Opened ${AI_LIST.find((a: AIConfig) => a.id === id)?.name || id}`,
      });
    }
  },

  preloadTopServices: () => {
    setTimeout(async () => {
      try {
        const currentActive = get().activeAI;
        const list = get().aiList;
        const disabled = get().disabledAIs;

        // Preload only enabled AIs so webviews are ready
        const toPreload = list.filter((ai) => ai.id !== currentActive && !disabled.includes(ai.id));
        for (const item of toPreload) {
          get().setActiveAI(item.id, { silent: true });
        }
      } catch (err) {
        console.error('[Thred Preload] Failed to preload services:', err);
      }
    }, 2000);
  },

  navigateToBookmark: (aiId, url) => {
    const s = get();
    const targetId = aiId;
    // Switch to the AI (load it if needed)
    const newLoaded = !s.loadedAIs.includes(targetId)
      ? [...s.loadedAIs, targetId]
      : s.loadedAIs;
    // Navigate to home tab (preserving history)
    const newHistory = s.tabHistory.slice(0, s.tabHistoryIndex + 1);
    newHistory.push({ activeTab: 'home', settingsTab: s.settingsTab, vaultTab: s.vaultTab, conversationTab: s.conversationTab });
    set({
      activeAI: targetId,
      loadedAIs: newLoaded,
      activeTab: 'home',
      tabHistory: newHistory,
      tabHistoryIndex: s.tabHistoryIndex + 1,
      splitAI: null,
      pendingBookmarkUrls: { [targetId]: url },
    });
    void get().logAIHistory({
      aiId: targetId,
      type: 'open',
      title: `Opened ${AI_LIST.find((a: AIConfig) => a.id === targetId)?.name || targetId}`,
    });
  },

  setPendingBookmarkUrls: (urls) => set({ pendingBookmarkUrls: urls }),

  clearPendingBookmarkUrl: (aiId) => set((state) => {
    const next = { ...state.pendingBookmarkUrls };
    delete next[aiId];
    return { pendingBookmarkUrls: next };
  }),

  refreshSidebarBookmarks: () => set((state) => ({ sidebarRefreshKey: state.sidebarRefreshKey + 1 })),

  setActiveTab: (tab) => {
    const s = get();
    const newHistory = s.tabHistory.slice(0, s.tabHistoryIndex + 1);
    newHistory.push({ activeTab: tab, settingsTab: s.settingsTab, vaultTab: s.vaultTab, conversationTab: s.conversationTab });
    set({ activeTab: tab, activeAI: null, splitAI: null, tabHistory: newHistory, tabHistoryIndex: s.tabHistoryIndex + 1 });
  },
  setSettingsTab: (tab) => {
    const s = get();
    const newHistory = s.tabHistory.slice(0, s.tabHistoryIndex + 1);
    newHistory.push({ activeTab: s.activeTab, settingsTab: tab, vaultTab: s.vaultTab, conversationTab: s.conversationTab });
    set({ settingsTab: tab, tabHistory: newHistory, tabHistoryIndex: s.tabHistoryIndex + 1 });
  },
  setVaultTab: (tab) => {
    const s = get();
    const newHistory = s.tabHistory.slice(0, s.tabHistoryIndex + 1);
    newHistory.push({ activeTab: s.activeTab, settingsTab: s.settingsTab, vaultTab: tab, conversationTab: s.conversationTab });
    set({ vaultTab: tab, tabHistory: newHistory, tabHistoryIndex: s.tabHistoryIndex + 1 });
  },
  setNotebookSubTab: (tab) => {
    set({ notebookSubTab: tab });
  },
  setConversationTab: (tab) => {
    const s = get();
    const newHistory = s.tabHistory.slice(0, s.tabHistoryIndex + 1);
    newHistory.push({ activeTab: s.activeTab, settingsTab: s.settingsTab, vaultTab: s.vaultTab, conversationTab: tab });
    set({ conversationTab: tab, tabHistory: newHistory, tabHistoryIndex: s.tabHistoryIndex + 1 });
  },
  tabBack: () => {
    const s = get();
    if (s.tabHistoryIndex <= 0) return;
    const prev = s.tabHistory[s.tabHistoryIndex - 1];
    set({
      activeTab: prev.activeTab as any,
      settingsTab: prev.settingsTab,
      vaultTab: prev.vaultTab,
      conversationTab: prev.conversationTab,
      activeAI: null,
      splitAI: null,
      tabHistoryIndex: s.tabHistoryIndex - 1
    });
  },
  tabForward: () => {
    const s = get();
    if (s.tabHistoryIndex >= s.tabHistory.length - 1) return;
    const next = s.tabHistory[s.tabHistoryIndex + 1];
    set({
      activeTab: next.activeTab as any,
      settingsTab: next.settingsTab,
      vaultTab: next.vaultTab,
      conversationTab: next.conversationTab,
      activeAI: null,
      splitAI: null,
      tabHistoryIndex: s.tabHistoryIndex + 1
    });
  },

  setReorderMode: (active) => set({ reorderMode: active }),

  setAiList: async (list) => {
    set({ aiList: list });
    await window.electron.updateConfig({ aiListOrder: list.map(ai => ai.id) });
  },

  reorderAI: async (index, direction) => set((state) => {
    const list = [...state.aiList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return {};

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    window.electron.updateConfig({ aiListOrder: list.map(ai => ai.id) });
    return { aiList: list };
  }),

  moveAI: async (fromIndex, toIndex) => set((state) => {
    const list = [...state.aiList];
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return {};

    const [movedItem] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, movedItem);

    window.electron.updateConfig({ aiListOrder: list.map(ai => ai.id) });
    return { aiList: list };
  }),

  resetAIOrder: async () => {
    set({ aiList: AI_LIST });
    await window.electron.updateConfig({ aiListOrder: AI_LIST.map((ai: AIConfig) => ai.id) });
  },

  setSplitAI: (id) => {
    set((state) => {
      if (id === null) {
        return { splitAI: null };
      }
      const newLoaded = !state.loadedAIs.includes(id)
        ? [...state.loadedAIs, id]
        : state.loadedAIs;
      return {
        splitAI: id,
        loadedAIs: newLoaded
      };
    });
    if (id) {
      const state = get();
      const splitAiName = AI_LIST.find((a: AIConfig) => a.id === id)?.name || id;
      const activeAiName = state.activeAI ? (AI_LIST.find((a: AIConfig) => a.id === state.activeAI)?.name || state.activeAI) : '';
      const title = activeAiName
        ? `Opened ${splitAiName} with ${activeAiName} in split view`
        : `Opened ${splitAiName} in split view`;

      void get().logAIHistory({
        aiId: id,
        type: 'open',
        title: title,
        splitWithAiId: state.activeAI || undefined,
      });
    }
  },

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setSessionExpiredOpen: (open) => set({ sessionExpiredOpen: open }),

  setUpdateBannerDismissed: (dismissed) => set({ updateBannerDismissed: dismissed }),

  toggleSidebar: () => set((state) => {
    const nextCollapsed = !state.sidebarCollapsed;
    window.electron.updateConfig({ sidebarCollapsed: nextCollapsed });
    return { sidebarCollapsed: nextCollapsed };
  }),

  toggleSidebarMinimized: () => set((state) => ({ sidebarMinimized: !state.sidebarMinimized })),
  toggleRightSidebarMinimized: () => set((state) => ({ rightSidebarMinimized: !state.rightSidebarMinimized })),

  openToolPopover: (popover) => set({ toolPopover: popover }),
  closeToolPopover: () => set({ toolPopover: null }),
});
