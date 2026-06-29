
export interface ThredConfig {
  sidebarCollapsed: boolean;
  thredFolderPath: string;
  username: string;
  installDate?: string;
  preferences: Record<string, unknown>;
  templates: Array<unknown>;
  aiListOrder: string[];
  disabledAIs: string[];
  zoomLevels: Record<string, number>;
  openedAIs: Record<string, boolean>;
  onboardingComplete?: boolean;
  [key: string]: unknown;
}

export interface TemplateConfig {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  models: string[];
  category: string;
}

export interface PreferencesConfig {
  autoUpdate: boolean;
  showTipsAndUpdates: boolean;
  dailySummary?: boolean;
  tipsDismissed?: string[];
  showTooltips?: boolean;
  defaultHomeView?: string;
}

export interface ScreenshotMetadata {
  id: string;
  type: 'content' | 'workspace';
  path: string;
  filename: string;
  timestamp: number;
  aiId: string;
}

export interface Bookmark {
  id: string;
  name: string;
  url: string;
  aiId: string;
  category: string;
  createdAt: string;
  favicon?: string;
  pinned?: boolean;
  sidebar?: boolean;
}


export interface ToolWindow {
  id: string;
  minimized: boolean;
  maximized: boolean;
}

export interface ElectronAPI {
  readClipboardText: () => Promise<string>;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  appQuit: () => void;
  appRestart: () => void;
  getWindowIsMaximized: () => Promise<boolean>;
  saveFile: (data: Uint8Array | ArrayBuffer | any, defaultPath: string) => Promise<boolean>;
  captureContent: (aiId: string) => Promise<{ base64: string; width: number; height: number } | null>;
  captureWorkspace: () => Promise<{ base64: string; width: number; height: number } | null>;
  copyImageToClipboard: (base64: string) => Promise<boolean>;
  copyFileToClipboard: (filePath: string) => Promise<boolean>;
  registerWebview: (data: { aiId: string; webContentsId: number }) => void;
  setZoom: (data: { aiId: string; factor: number }) => void;
  onZoomApplied: (callback: (data: { aiId: string; factor: number; action: 'in' | 'out' | 'reset' }) => void) => (() => void);

  // New Thred Config IPCs
  getConfig: () => Promise<ThredConfig>;
  setConfig: (config: ThredConfig) => Promise<void>;
  updateConfig: (patch: Partial<ThredConfig>) => Promise<ThredConfig>;

  getThredFolderPath: () => Promise<string>;
  changeThredFolderPath: () => Promise<string | null>;

  // Vault Data IPCs (typed via shared/vault-schema.ts)
  vaultGetAll: () => Promise<import('./shared/vault-schema').VaultItem[]>;
  vaultSave: (item: import('./shared/vault-schema').VaultItem) => Promise<void>;
  vaultDelete: (id: string, category: string) => Promise<void>;
  vaultExportAll: () => Promise<string>;
  vaultImportAll: (jsonStr: string, mode: 'merge' | 'replace') => Promise<number>;
  toolsGet: (toolName: string) => Promise<any>;
  toolsSave: (payload: { toolName: string; data: any }) => Promise<void>;

  statsGet: () => Promise<any>;
  userdataGet: (featureName: string) => Promise<any>;
  userdataSave: (featureName: string, data: any) => Promise<void>;
  saveScreenshot: (payload: { type: 'content' | 'workspace'; pngBuffer: Uint8Array; aiId: string }) => Promise<ScreenshotMetadata>;
  getScreenshots: () => Promise<ScreenshotMetadata[]>;
  deleteScreenshot: (id: string) => Promise<void>;
  readScreenshot: (filePath: string) => Promise<string | null>;

  // Reports
  submitReport: (report: { aiModel: string; category: string; description: string }) => Promise<{ ok: boolean; id?: string; error?: string }>;



  // Bookmarks
  bookmarksGetAll: () => Promise<Bookmark[]>;
  bookmarksAdd: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => Promise<Bookmark>;
  bookmarksRemove: (id: string) => Promise<void>;
  bookmarksTogglePin: (id: string) => Promise<Bookmark | { limitReached: true } | null>;
  bookmarksToggleSidebar: (id: string) => Promise<Bookmark | { limitReached: true } | null>;
  bookmarksGetByUrl: (url: string) => Promise<Bookmark | null>;
  bookmarksGetPageTitle: (aiId: string) => Promise<string>;
  bookmarksUpdate: (id: string, updates: { name?: string; category?: string; favicon?: string }) => Promise<Bookmark | null>;
  bookmarksCheckDuplicate: (url: string) => Promise<Bookmark | null>;
  // AI Features
  onAIMessage: (callback: (payload: any) => void) => () => void;
  // Downloads
  downloadsGetAll: () => Promise<any[]>;
  downloadsOpenFile: (path: string) => Promise<void>;
  openExternalUrl: (url: string) => Promise<void>;
  downloadsDeleteEntry: (id: string, deleteFile?: boolean) => Promise<boolean>;
  downloadsGetErrors: () => Promise<any[]>;
  downloadsClearErrors: () => Promise<boolean>;
  downloadsRename: (id: string, newFilename: string) => Promise<{ filename: string; path: string } | false>;
  downloadsMoveToSubfolder: (id: string, targetSubfolder: string) => Promise<{ filename: string; path: string; subfolder: string } | false>;
  downloadsRevealInOS: (filePath: string) => Promise<boolean>;
  downloadsCancel: (downloadId: string) => Promise<boolean>;
  onDownloadStarted: (callback: (payload: any) => void) => () => void;
  onDownloadProgress: (callback: (payload: any) => void) => () => void;
  onDownloadComplete: (callback: (payload: any) => void) => () => void;
  onDownloadFailed: (callback: (payload: any) => void) => () => void;
  onWebviewKeydown: (callback: (event: any) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
