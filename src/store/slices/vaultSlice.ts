import { StateCreator } from 'zustand';
import { AppState } from '../types';
import { VaultItem } from '../../shared/vault-schema';

export const createVaultSlice: StateCreator<AppState, [], [], Partial<AppState>> = (set, get) => ({
  vaultItems: [],
  pendingVaultItem: null,
  lastAIContext: null,
  isVaultSaveModalOpen: false,

  setPendingVaultItem: (item) => set({ pendingVaultItem: item }),
  setLastAIContext: (ctx) => set({ lastAIContext: ctx }),
  setVaultSaveModalOpen: (open) => set({ isVaultSaveModalOpen: open }),

  loadVaultItems: async () => {
    const items = await window.electron.vaultGetAll();
    set({ vaultItems: items });
  },

  addVaultItem: async (item) => {
    if (item.isFavorite) {
      const favorites = get().vaultItems.filter(i => i.isFavorite && i.id !== item.id);
      if (favorites.length >= 4) {
        item.isFavorite = false;
      }
    }
    await window.electron.vaultSave(item);
    await get().loadVaultItems();
    if (item.kind === 'note' || item.kind === 'todo' || item.kind === 'scratchpad') {
      await get().loadNotes();
      await get().loadTodos();
    }
  },

  deleteVaultItem: async (id, category) => {
    await window.electron.vaultDelete(id, category);
    await get().loadVaultItems();
    if (['Notebooks', 'Notes', 'To-do', 'Scratchpad'].includes(category)) {
      await get().loadNotes();
      await get().loadTodos();
    }
  },
});
