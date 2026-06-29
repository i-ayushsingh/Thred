import { create } from 'zustand';
import { AppState } from './types';
import { createAppSlice } from './slices/appSlice';
import { createVaultSlice } from './slices/vaultSlice';
import { createPreferencesSlice } from './slices/preferencesSlice';
import { createToolSlice } from './slices/toolSlice';

// Re-export all type declarations so store consumers do not break.
export * from './types';

// Central store merging all feature slices.
export const useStore = create<AppState>()((...a) => ({
  ...createAppSlice(...a),
  ...createVaultSlice(...a),
  ...createPreferencesSlice(...a),
  ...createToolSlice(...a),
}) as AppState);
