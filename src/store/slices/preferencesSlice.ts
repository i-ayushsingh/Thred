import { StateCreator } from 'zustand';
import { AppState, AIHistoryEntry } from '../types';
import { AI_LIST, AIConfig } from '../../shared/ai-list';
import { TemplateConfig, PreferencesConfig, ScreenshotMetadata } from '../../electron';

const DEFAULT_TEMPLATES: TemplateConfig[] = [
  {
    id: 'temp-1',
    title: 'System Architect Pro',
    icon: 'architecture',
    color: '#61dbb4',
    description: 'Generates comprehensive technical design documents, including component diagrams, data flow, and API interface specifications from brief requirements.',
    models: ['GPT-4', 'Claude 3'],
    category: 'Coding'
  },
  {
    id: 'temp-2',
    title: 'Creative Copywriting Assistant',
    icon: 'draw',
    color: '#ffb783',
    description: 'A multi-step prompt chain that brainstorms 10 angles, drafts 3 variations, and refines tone for marketing ad copy and social media posts.',
    models: ['Claude 3'],
    category: 'Creative'
  },
  {
    id: 'temp-3',
    title: 'Python Debugger',
    icon: 'bug_report',
    color: '#ffb4ab',
    description: 'Analyzes stack traces and Python scripts, identifies root causes, explains the issue step-by-step, and provides refactored, corrected code blocks.',
    models: ['GPT-4', 'Llama 3'],
    category: 'Coding'
  },
  {
    id: 'temp-4',
    title: 'Market Research Synthesis',
    icon: 'donut_small',
    color: '#c0c1ff',
    description: 'Takes raw competitor data or scraped articles and synthesizes them into a structured SWOT analysis and executive summary.',
    models: ['Claude 3'],
    category: 'Analysis'
  }
];

const DEFAULT_PREFS: PreferencesConfig = {
  autoUpdate: true,
  showTipsAndUpdates: true,
  dailySummary: true,
};

export const createPreferencesSlice: StateCreator<AppState, [], [], Partial<AppState>> = (set, get) => ({
  isHydrated: false,
  userName: '',
  appVersion: '',
  onboardingComplete: false,
  preferences: DEFAULT_PREFS,
  templates: [],
  systemSettings: {
    minimizeToTray: false,
    launchMinimizedToTray: false,
    launchAtStartup: false,
  },
  screenshots: [],
  openedAIs: {},
  aiHistory: [],
  disabledAIs: [],
  zoomLevels: {},

  hydrate: async () => {
    if (!(window.electron && window.electron.getConfig)) {

      return;
    }
    try {
      const config = await window.electron.getConfig();
      const rawScreenshots = await window.electron.getScreenshots();

      await get().loadSystemSettings();

      const hydratedTemplates = (config.templates && config.templates.length > 0)
        ? config.templates as TemplateConfig[]
        : DEFAULT_TEMPLATES;

      let hydratedAiListOrder = AI_LIST;
      if (config.aiListOrder && config.aiListOrder.length > 0) {
        const savedIds = new Set(config.aiListOrder as string[]);
        const newAIs = AI_LIST.filter((ai: AIConfig) => !savedIds.has(ai.id));
        const orderedAIs = (config.aiListOrder as string[])
          .map((id: string) => AI_LIST.find((ai: AIConfig) => ai.id === id))
          .filter(Boolean) as AIConfig[];
        hydratedAiListOrder = [...orderedAIs, ...newAIs];
      }

      const hydratedPreferences = { ...DEFAULT_PREFS, ...(config.preferences || {}) } as PreferencesConfig;

      set({
        isHydrated: true,
        userName: (config.username as string) || '',
        appVersion: (config.appVersion as string) || '',
        onboardingComplete: !!config.onboardingComplete,
        preferences: hydratedPreferences,
        templates: hydratedTemplates,
        aiList: hydratedAiListOrder,
        disabledAIs: (config.disabledAIs as string[]) || [],
        zoomLevels: (config.zoomLevels as Record<string, number>) || {},
        openedAIs: (config.openedAIs as Record<string, boolean>) || {},
        screenshots: rawScreenshots as ScreenshotMetadata[],
        sidebarCollapsed: config.sidebarCollapsed ?? false,
      });

      await get().loadVaultItems();
      await get().loadNotes();
      await get().loadTodos();
      await get().loadAIHistory();

      const currentVaultItems = get().vaultItems;
      if (currentVaultItems.length === 0) {
        if (hydratedTemplates.length > 0) {
          for (const temp of hydratedTemplates) {
            await window.electron.vaultSave({ ...temp, kind: 'prompt', category: 'Prompts', fullText: temp.description });
          }
          await get().loadVaultItems();
        }
      }

      get().preloadTopServices();
    } catch (err) {

      set({ isHydrated: true });
    }
  },



  addTemplate: async (template) => {
    const id = 'temp-' + Math.random().toString(36).substring(7);
    const newList = [...get().templates, { ...template, id }];
    set({ templates: newList });
    await window.electron.updateConfig({ templates: newList });
  },

  updateTemplate: async (id, template) => {
    const newList = get().templates.map((t) => t.id === id ? { ...t, ...template } : t);
    set({ templates: newList });
    await window.electron.updateConfig({ templates: newList });
  },

  deleteTemplate: async (id) => {
    const newList = get().templates.filter((t) => t.id !== id);
    set({ templates: newList });
    await window.electron.updateConfig({ templates: newList });
  },

  loadScreenshots: async () => {
    const screenshots = await window.electron.getScreenshots();
    set({ screenshots });
  },

  addScreenshot: async (type, pngBuffer, aiId) => {
    const metadata = await window.electron.saveScreenshot({ type, pngBuffer, aiId });
    if (metadata) {
      await get().loadScreenshots();
    }
  },

  deleteScreenshot: async (id) => {
    await window.electron.deleteScreenshot(id);
    await get().loadScreenshots();
  },

  updatePreferences: async (prefs) => {
    const newPrefs = { ...get().preferences, ...prefs };
    set({ preferences: newPrefs });
    await window.electron.updateConfig({ preferences: newPrefs });
  },

  loadSystemSettings: async () => {
    try {
      const settings = await window.electron.getSystemSettings();
      set({ systemSettings: settings });
    } catch (_) { /* ignored */ }
  },

  setUserName: async (name) => {
    set({ userName: name });
    await window.electron.updateConfig({ username: name });
  },

  completeOnboarding: async (name) => {
    set({ userName: name, onboardingComplete: true });
    await window.electron.updateConfig({ username: name, onboardingComplete: true });
  },

  setAIOpened: async (aiId, opened) => {
    const nextOpenedAIs = { ...get().openedAIs, [aiId]: opened };
    set({ openedAIs: nextOpenedAIs });
    await window.electron.updateConfig({ openedAIs: nextOpenedAIs });
  },

  toggleAIDisabled: async (id) => set((state) => {
    const isDisabled = state.disabledAIs.includes(id);
    const newDisabled = isDisabled
      ? state.disabledAIs.filter(aiId => aiId !== id)
      : [...state.disabledAIs, id];
    window.electron.updateConfig({ disabledAIs: newDisabled });
    return { disabledAIs: newDisabled };
  }),

  setZoom: (aiId, factor) => {
    if (!aiId) return;
    const clamped = Math.max(0.5, Math.min(2.0, +factor.toFixed(2)));
    set((state) => {
      const next = { ...state.zoomLevels, [aiId]: clamped };
      window.electron.updateConfig({ zoomLevels: next });
      return { zoomLevels: next };
    });
    if (window.electron?.setZoom) {
      window.electron.setZoom({ aiId, factor: clamped });
    }
  },

  applyZoomShortcut: (action) => {
    const { activeAI, zoomLevels, setZoom } = get();
    if (!activeAI) return;
    const current = zoomLevels[activeAI] ?? 1.0;
    let next = current;
    if (action === 'in') next = Math.min(2.0, +(current + 0.1).toFixed(2));
    else if (action === 'out') next = Math.max(0.5, +(current - 0.1).toFixed(2));
    else if (action === 'reset') next = 1.0;
    if (next === current) return;
    setZoom(activeAI, next);
  },

  loadAIHistory: async () => {
    try {
      const history = await window.electron.userdataGet('aiHistory');
      set({ aiHistory: Array.isArray(history) ? history : [] });
    } catch (_) { /* ignored */ }
  },

  logAIHistory: async (entry) => {
    try {
      const history = get().aiHistory || [];
      const newEntry: AIHistoryEntry = {
        ...entry,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
      };
      const updatedHistory = [newEntry, ...history].slice(0, 500);
      set({ aiHistory: updatedHistory });
      await window.electron.userdataSave('aiHistory', updatedHistory);
    } catch (_) { /* ignored */ }
  },

  updateAIHistoryTitle: async (chatId, title) => {
    try {
      const history = get().aiHistory || [];
      let updated = false;
      const updatedHistory = history.map(item => {
        if (item.chatId === chatId && item.title !== title) {
          updated = true;
          return { ...item, title };
        }
        return item;
      });
      if (updated) {
        set({ aiHistory: updatedHistory });
        await window.electron.userdataSave('aiHistory', updatedHistory);
      }
    } catch (_) { /* ignored */ }
  },

  clearAIHistory: async () => {
    try {
      set({ aiHistory: [] });
      await window.electron.userdataSave('aiHistory', []);
    } catch (_) { /* ignored */ }
  },
});
