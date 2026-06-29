import { create } from 'zustand';
import { AI_LIST, AIConfig } from '../shared/ai-list';
import { TemplateConfig, PreferencesConfig, ScreenshotMetadata, ToolWindow } from '../electron';
import { VaultItem, TodoItem } from '../shared/vault-schema';
import { playSuccessSound, playErrorSound } from '../utils/audio';

export interface AIHistoryEntry {
  id: string;
  aiId: string;
  type: 'open' | 'chat_access' | 'chat_create';
  timestamp: number;
  url?: string;
  title: string;
  chatId?: string;
  splitWithAiId?: string;
  splitWithUrl?: string;
}

export type { TemplateConfig, PreferencesConfig, ScreenshotMetadata, ToolWindow };

// Adapter types used by the Notes and Todo tool windows.
// The store translates between these and the vault schema types.
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  isPinned?: boolean;
  tags?: string[];
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  type: 'permanent' | 'temporary';
  createdAt: string;
  completedAt?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}


// Zustand Store State
export interface AppState {
  // Hydration state
  isHydrated: boolean;
  onboardingComplete: boolean;

  // Navigation & Screens
  activeAI: string | null;
  activeTab: 'home' | 'settings' | 'vault' | 'history' | 'conversation' | 'report' | 'downloads';
  settingsTab: string;
  vaultTab: string;
  notebookSubTab: 'notes' | 'todo' | 'scratchpad' | 'calendar' | 'calculator' | 'focus';
  conversationTab: string;
  tabHistory: Array<{ activeTab: string; settingsTab: string; vaultTab: string; conversationTab: string }>;
  tabHistoryIndex: number;
  reorderMode: boolean;
  aiList: AIConfig[];
  loadedAIs: string[];
  pendingBookmarkUrls: Record<string, string>; // Maps aiId to url
  sidebarRefreshKey: number;


  // Split View
  splitAI: string | null;

  // Overlays
  commandPaletteOpen: boolean;
  shortcutsOpen: boolean;
  sessionExpiredOpen: boolean;

  updateBannerDismissed: boolean;

  // Data (now loaded from ThredConfig / files via IPC)
  templates: TemplateConfig[];
  preferences: PreferencesConfig;
  screenshots: ScreenshotMetadata[];
  vaultItems: VaultItem[]; // Unified array for all vault items
  todoTab: 'temporary' | 'permanent';

  openedAIs: Record<string, boolean>; // Replaces thred_opened_<aiId>
  aiHistory: AIHistoryEntry[];


  // Actions
  hydrate: () => Promise<void>; // New hydration action
  setActiveAI: (id: string | null, options?: { silent?: boolean }) => void;
  preloadTopServices: () => void;
  setActiveTab: (tab: 'home' | 'settings' | 'vault' | 'history' | 'conversation' | 'report' | 'downloads') => void;
  setSettingsTab: (tab: string) => void;
  setVaultTab: (tab: string) => void;
  setNotebookSubTab: (tab: 'notes' | 'todo' | 'scratchpad' | 'calendar' | 'calculator' | 'focus') => void;
  setTodoTab: (tab: 'temporary' | 'permanent') => void;
  setConversationTab: (tab: string) => void;
  tabBack: () => void;
  tabForward: () => void;
  setReorderMode: (active: boolean) => void;
  setAiList: (list: AIConfig[]) => void;
  reorderAI: (index: number, direction: 'up' | 'down') => void;
  moveAI: (fromIndex: number, toIndex: number) => void;
  resetAIOrder: () => void;
  setSplitAI: (id: string | null) => void;
  navigateToBookmark: (aiId: string, url: string) => void;
  setPendingBookmarkUrls: (urls: Record<string, string>) => void;
  clearPendingBookmarkUrl: (aiId: string) => void;
  refreshSidebarBookmarks: () => void;


  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSessionExpiredOpen: (open: boolean) => void;

  setUpdateBannerDismissed: (dismissed: boolean) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarMinimized: boolean;
  toggleSidebarMinimized: () => void;
  rightSidebarMinimized: boolean;
  toggleRightSidebarMinimized: () => void;



  // Template CRUD
  addTemplate: (template: Omit<TemplateConfig, 'id'>) => Promise<void>;
  updateTemplate: (id: string, template: Partial<TemplateConfig>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // Vault Item CRUD
  pendingVaultItem: { type: 'code' | 'response' | 'prompt' | null, content: string, language?: string } | null;
  isVaultSaveModalOpen: boolean;
  lastAIContext: 'prompt' | 'code' | 'response' | null;
  setPendingVaultItem: (item: { type: 'code' | 'response' | 'prompt' | null, content: string, language?: string } | null) => void;
  setLastAIContext: (ctx: 'prompt' | 'code' | 'response' | null) => void;
  setVaultSaveModalOpen: (open: boolean) => void;
  loadVaultItems: () => Promise<void>;
  addVaultItem: (item: VaultItem) => Promise<void>;
  deleteVaultItem: (id: string, category: string) => Promise<void>;

  // Screenshot Actions
  loadScreenshots: () => Promise<void>;
  addScreenshot: (type: 'content' | 'workspace', pngBuffer: Uint8Array, aiId: string) => Promise<void>;
  deleteScreenshot: (id: string) => Promise<void>;

  // Preferences actions
  updatePreferences: (prefs: Partial<PreferencesConfig>) => Promise<void>;

  // Profile data
  userName: string;
  appVersion: string;
  setUserName: (name: string) => Promise<void>;
  completeOnboarding: (name: string) => Promise<void>;

  // Per-AI opened state
  setAIOpened: (aiId: string, opened: boolean) => Promise<void>;

  // Disabled AIs (greyed out in sidebar, webview closed, no preload)
  disabledAIs: string[];
  toggleAIDisabled: (id: string) => Promise<void>;

  // Centered tool popover
  toolPopover: { id: string; title: string; tools: { id?: string; name: string; icon: string; desc?: string; color?: string }[]; icon: string; selected?: string; onSelect?: (name: string) => void } | null;
  openToolPopover: (popover: { id: string; title: string; tools: { id?: string; name: string; icon: string; desc?: string; color?: string }[]; icon: string; selected?: string; onSelect?: (name: string) => void }) => void;
  closeToolPopover: () => void;

  // Per-AI zoom (factor 0.5 – 2.0)
  zoomLevels: Record<string, number>;
  setZoom: (aiId: string, factor: number) => void;
  applyZoomShortcut: (action: 'in' | 'out' | 'reset') => void;



  // AI History
  loadAIHistory: () => Promise<void>;
  logAIHistory: (entry: Omit<AIHistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  updateAIHistoryTitle: (chatId: string, title: string) => Promise<void>;
  clearAIHistory: () => Promise<void>;


  // Tool Windows (floating tool cards)
  toolWindows: ToolWindow[];
  openToolWindow: (id: string) => void;
  closeToolWindow: (id: string) => void;
  // Notes data for the Notes tool
  notes: Note[];
  activeNoteId: string | null;
  loadNotes: () => Promise<void>;
  saveNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setActiveNoteId: (id: string | null) => void;

  // Todos data for the Todo tool
  todos: { permanent: Todo[], temporary: Todo[] };
  loadTodos: () => Promise<void>;
  addTodo: (todo: { text: string; type: 'permanent' | 'temporary'; dueDate?: string; priority?: 'low' | 'medium' | 'high' }) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  cleanupTodos: () => Promise<void>;

  minimizeToolWindow: (id: string) => void;
  setToolWindowMaximized: (id: string, maximized: boolean) => void;

  // Scratchpad
  scratchpadContent: string;
  scratchpadPosition: { x: number, y: number } | null;
  scratchpadSize: { width: number, height: number } | null;
  setScratchpadContent: (content: string) => void;
  setScratchpadPosition: (pos: { x: number, y: number } | null) => void;
  setScratchpadSize: (size: { width: number, height: number } | null) => void;
  clearScratchpad: () => void;

  // Whiteboard
  whiteboardContent: {
    id?: string;
    title: string;
    elements: any[];
    zoom: number;
    pan: { x: number; y: number };
  } | null;
  whiteboardPosition: { x: number, y: number } | null;
  whiteboardSize: { width: number, height: number } | null;
  setWhiteboardContent: (content: any) => void;
  setWhiteboardPosition: (pos: { x: number, y: number } | null) => void;
  setWhiteboardSize: (size: { width: number, height: number } | null) => void;
  clearWhiteboard: () => void;

  // Active Downloads
  activeDownloads: Array<{
    id: string;
    filename: string;
    receivedBytes: number;
    totalBytes: number;
    aiId: string;
    subfolder: string;
    timestamp: number;
  }>;
  addActiveDownload: (download: any) => void;
  updateActiveDownloadProgress: (filename: string, receivedBytes: number, totalBytes: number) => void;
  removeActiveDownload: (filename: string) => void;
}

