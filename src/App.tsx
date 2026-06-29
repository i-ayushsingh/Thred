import { useShallow } from 'zustand/react/shallow';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useT } from './i18n/context';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import VaultView from './components/VaultView';
import ConversationView from './components/ConversationView';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import OnboardingScreen from './components/OnboardingScreen';
import ReportView from './components/ReportView';
import DownloadsView from './components/DownloadsView';
import WebviewContainer from './components/WebviewContainer';
import CommandPalette from './components/CommandPalette';
import ShortcutsReferenceOverlay from './components/ShortcutsReferenceOverlay';
import SessionExpiredOverlay from './components/SessionExpiredOverlay';

import ScreenshotPreviewModal from './components/ScreenshotPreviewModal';
import { AIIcon } from './components/AIIcon';
import WindowControls from './components/WindowControls';
import RightSidebar from './components/RightSidebar';
import ToolPopover from './components/ToolPopover';
import Notes from './components/tools/Notes';
import TodoTool from './components/tools/TodoTool';
import TimeTool from './components/tools/TimeTool';
import CalendarTool from './components/tools/CalendarTool';
import CalculatorTool from './components/tools/CalculatorTool';
import ConverterTool from './components/tools/ConverterTool';
import StickyScratchpad from './components/tools/StickyScratchpad';
import Whiteboard from './components/tools/Whiteboard';
import PomodoroTool from './components/tools/PomodoroTool';
import { useStore } from './store';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import BookmarkPopover from './components/BookmarkPopover';
import ConfirmDialogProvider from './components/ConfirmDialog';

import { VaultContextSaveModal } from './components/VaultContextSaveModal';




export const AppContent: React.FC = () => {
  const { isHydrated, // New: Hydration state
    activeAI,
    activeTab,
    commandPaletteOpen,
    shortcutsOpen,
    sessionExpiredOpen,
    aiList,
    setActiveAI,
    setActiveTab,
    setCommandPaletteOpen,
    setShortcutsOpen,
    setConversationTab,
    setSettingsTab,
    sidebarMinimized,
    toggleSidebarMinimized,
    rightSidebarMinimized,
    toggleRightSidebarMinimized,
    splitAI,
    setSplitAI,
    tabBack,
    tabForward,
    tabHistoryIndex,
    tabHistory,
    todos,
    toggleTodo,
    openToolWindow,
    preferences,
    updatePreferences,
    openToolPopover,
    onboardingComplete,
    disabledAIs} = useStore(useShallow((state: any) => ({ isHydrated: state.isHydrated, activeAI: state.activeAI, activeTab: state.activeTab, commandPaletteOpen: state.commandPaletteOpen, shortcutsOpen: state.shortcutsOpen, sessionExpiredOpen: state.sessionExpiredOpen, aiList: state.aiList, setActiveAI: state.setActiveAI, setActiveTab: state.setActiveTab, setCommandPaletteOpen: state.setCommandPaletteOpen, setShortcutsOpen: state.setShortcutsOpen, setConversationTab: state.setConversationTab, setSettingsTab: state.setSettingsTab, sidebarMinimized: state.sidebarMinimized, toggleSidebarMinimized: state.toggleSidebarMinimized, rightSidebarMinimized: state.rightSidebarMinimized, toggleRightSidebarMinimized: state.toggleRightSidebarMinimized, splitAI: state.splitAI, setSplitAI: state.setSplitAI, tabBack: state.tabBack, tabForward: state.tabForward, tabHistoryIndex: state.tabHistoryIndex, tabHistory: state.tabHistory, todos: state.todos, toggleTodo: state.toggleTodo, openToolWindow: state.openToolWindow, preferences: state.preferences, updatePreferences: state.updatePreferences, openToolPopover: state.openToolPopover, onboardingComplete: state.onboardingComplete, disabledAIs: state.disabledAIs })));

  const t = useT();

  const [splitMenuOpen, setSplitMenuOpen] = React.useState(false);
  const [splitMenuPos, setSplitMenuPos] = React.useState<{ top: number; left: number } | null>(null);
  const splitButtonRef = React.useRef<HTMLButtonElement>(null);
  const [bookmarkOpen, setBookmarkOpen] = React.useState(false);
  const [currentWebviewUrl, setCurrentWebviewUrl] = React.useState('');
  const [isCurrentUrlBookmarked, setIsCurrentUrlBookmarked] = React.useState(false);

  // Refs mirroring values read inside the long-lived keyboard handler. Using
  // refs lets the handler read the latest values without re-subscribing on
  // every URL/split change (avoids stale closures while keeping deps stable).
  const splitAIRef = React.useRef(splitAI);
  const currentWebviewUrlRef = React.useRef(currentWebviewUrl);
  React.useEffect(() => { splitAIRef.current = splitAI; }, [splitAI]);
  React.useEffect(() => { currentWebviewUrlRef.current = currentWebviewUrl; }, [currentWebviewUrl]);

  // Single source of truth for incoming AI messages. A single IPC subscription
  // (set up on mount) dispatches through this ref, which is refreshed every
  // render so the handler always sees the latest props/closures. This replaces
  // what used to be two separate onAIMessage listeners — both fired for every
  // message and the second carried stale closures.
  const aiMessageHandlerRef = React.useRef<(payload: any) => void>(() => undefined);

  const [viewContainerRef] = useAutoAnimate();
  const [capturePreview, setCapturePreview] = React.useState<{
    open: boolean;
    base64: string | null;
    width: number;
    height: number;
    aiId: string;
    type: 'content' | 'workspace';
  }>({ open: false, base64: null, width: 0, height: 0, aiId: 'system', type: 'content' });

  const activeTask = React.useMemo(() => {
    return (todos?.permanent || []).find((t: any) => !t.completed);
  }, [todos]);

  // New: Hydrate store from file-based config on mount
  useEffect(() => {
    const doHydrate = async () => {
      try {
        await useStore.getState().hydrate();
      } catch (_) { /* ignored */ }
    };
    doHydrate();

    // Setup download notification handlers
    const unsubStarted = window.electron.onDownloadStarted((payload: any) => {
      undefined;
      useStore.getState().addActiveDownload(payload);
    });
    const unsubProgress = window.electron.onDownloadProgress((payload: any) => {
      useStore.getState().updateActiveDownloadProgress(payload.filename, payload.receivedBytes, payload.totalBytes);
    });
    const unsubComplete = window.electron.onDownloadComplete((payload: any) => {
      undefined;
      useStore.getState().removeActiveDownload(payload.filename);
    });
    const unsubFailed = window.electron.onDownloadFailed((payload: any) => {
      undefined;
      useStore.getState().removeActiveDownload(payload.filename);
    });

    return () => {
      unsubStarted();
      unsubProgress();
      unsubComplete();
      unsubFailed();
    };
  }, []);

  // Handle global AI messages — single IPC subscription, set up once on mount.
  // It delegates to aiMessageHandlerRef, which is kept current by the effect
  // below, so the handler never goes stale and messages aren't double-handled.
  useEffect(() => {
    if (!window.electron?.onAIMessage) return;
    const unsub = window.electron.onAIMessage((payload: any) => {
      aiMessageHandlerRef.current(payload);
    });
    return unsub;
  }, []);

  // Handle native window copy event
  useEffect(() => {
    const handleCopy = () => {
      const selection = window.getSelection();
      const text = selection?.toString();
      if (text) {
        useStore.getState().setPendingVaultItem({
          type: 'prompt',
          content: text});
      }
    };
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);


  // Track current webview URL and bookmark state
  useEffect(() => {
    if (!activeAI) return;
    const webview = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any;
    if (!webview) return;

    const updateUrl = async () => {
      try {
        const url = webview.getURL();
        if (url && url !== 'about:blank') {
          setCurrentWebviewUrl(url);
          const existing = await window.electron.bookmarksGetByUrl(url);
          setIsCurrentUrlBookmarked(existing !== null);
        }
      } catch {
        // Ignore
      }
    };

    webview.addEventListener('did-navigate', updateUrl);
    webview.addEventListener('did-navigate-in-page', updateUrl);
    // Try to get initial URL
    setTimeout(updateUrl, 500);

    return () => {
      webview.removeEventListener('did-navigate', updateUrl);
      webview.removeEventListener('did-navigate-in-page', updateUrl);
    };
  }, [activeAI]);



  // Close bookmark popover when split view mode is activated
  useEffect(() => {
    if (splitAI !== null) {
      setBookmarkOpen(false);
    }
  }, [splitAI]);

  const activeAIFull = aiList.find((ai: any) => ai.id === activeAI);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    let altPressedAlone = false;

    const handleKeyDown = async (e: KeyboardEvent | { key: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; preventDefault: () => void }) => {

      if (e.key === 'Alt') {
        altPressedAlone = true;
      } else {
        altPressedAlone = false;
      }

      // 1. Skip shortcut routing if user is typing in form fields
      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName.toLowerCase();
        const isEditable = activeEl.getAttribute('contenteditable') === 'true';
        if (tag === 'input' || tag === 'textarea' || isEditable) {
          // Allow ESC key to close modals/palette even when input is focused
          if (e.key === 'Escape') {
            if (commandPaletteOpen) {
              e.preventDefault();
              setCommandPaletteOpen(false);
            }
          }
          return;
        }
      }

      // 2. ESC key: dismiss modals/palette
      if (e.key === 'Escape') {
        e.preventDefault();
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (shortcutsOpen) {
          setShortcutsOpen(false);
        }
        return;
      }

      // 3. Ctrl/Cmd + K: Toggle Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
        return;
      }

      // 4. Ctrl/Cmd + /: Toggle Shortcuts Reference sheet
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(!shortcutsOpen);
        return;
      }

      // 4d. Ctrl/Cmd + S: Open Context-Aware Saving Modal
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const store = useStore.getState();
        // Helper to normalize line endings and trim whitespace for accurate match on Windows
        const normalize = (str: string) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

        // Capture active selection if missing or update it
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        
        if (text) {
           let ctx = store.lastAIContext || 'prompt';
           if (store.pendingVaultItem && normalize(store.pendingVaultItem.content) === normalize(text)) {
             ctx = store.pendingVaultItem.type || 'prompt';
           }
           store.setPendingVaultItem({ type: ctx, content: text });
           store.setVaultSaveModalOpen(true);
           return;
        }

        // Fallback: Read OS clipboard via Electron IPC to bypass user-gesture restrictions
        window.electron.readClipboardText().then((clipText) => {
          const trimmedClip = clipText.trim();
          if (trimmedClip) {
            let ctx = store.lastAIContext || 'prompt';
            if (store.pendingVaultItem && normalize(store.pendingVaultItem.content) === normalize(trimmedClip)) {
              ctx = store.pendingVaultItem.type || 'prompt';
            }
            store.setPendingVaultItem({ type: ctx, content: trimmedClip });
            store.setVaultSaveModalOpen(true);
          } else {
            undefined;
          }
        }).catch((err) => {
          if (store.pendingVaultItem) {
             store.setVaultSaveModalOpen(true);
          } else {
             undefined;
          }
        });
        return;
      }

      // 5. Ctrl/Cmd + ,: Open Settings Preferences
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setActiveTab('settings');

        return;
      }

      // 6. Ctrl/Cmd + D: Open Home
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveTab('home');

        return;
      }

      // 6a. Ctrl/Cmd + L: Open Vault
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setActiveTab('vault');
        setActiveAI(null);

        return;
      }

      // Ctrl/Cmd + Shift + M: Minimize Window
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        if (window.electron?.windowMinimize) {
          window.electron.windowMinimize();
        }
        return;
      }

      // 6b. Ctrl/Cmd + M: Open Bookmarks in Left Sidebar
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        document.getElementById('left-sidebar-bookmark-btn')?.click();
        return;
      }

      // --- Right Sidebar Shortcuts ---

      // 1. Productivity: Whiteboard (Ctrl + Alt + W)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        document.getElementById('sidebar-whiteboard-btn')?.click();
        return;
      }

      // 2. Productivity: Pomodoro (Ctrl + Alt + P)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        document.getElementById('sidebar-pomodoro-btn')?.click();
        return;
      }

      // 3. Productivity: Sticky Scratchpad (Ctrl + Alt + N)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        document.getElementById('sidebar-scratchpad-btn')?.click();
        return;
      }







      // --- Essential Tool Direct Shortcuts ---

      // Notes (Ctrl + Alt + J)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        openToolWindow('notes');
        return;
      }

      // Todo (Ctrl + Alt + Z)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        openToolWindow('todos');
        return;
      }

      // Time (Ctrl + Alt + H)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        openToolWindow('time');
        return;
      }

      // Calendar (Ctrl + Alt + D)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        openToolWindow('calendar');
        return;
      }

      // Calculator (Ctrl + Alt + =)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === '=') {
        e.preventDefault();
        openToolWindow('calculator');
        return;
      }

      // Converter (Ctrl + Alt + V)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        openToolWindow('converter');
        return;
      }


      // 9. Organization: History (Ctrl + H)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveTab('history');
        return;
      }

      // 10. Organization: Bookmarks Popover (Ctrl + Shift + B)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        document.getElementById('sidebar-bookmark-btn')?.click();
        return;
      }




      // 14. Support: Report Bug (Ctrl + Shift + I)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setActiveTab('report');
        return;
      }

      // Toggle Both Sidebars (Ctrl/Cmd + B)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (!sidebarMinimized || !rightSidebarMinimized) {
          if (!sidebarMinimized) toggleSidebarMinimized();
          if (!rightSidebarMinimized) toggleRightSidebarMinimized();
        } else {
          toggleSidebarMinimized();
          toggleRightSidebarMinimized();
        }

        return;
      }

      // Toggle Left Sidebar (Ctrl/Cmd + [)
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        toggleSidebarMinimized();

        return;
      }

      // Toggle Right Sidebar (Ctrl/Cmd + ])
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        toggleRightSidebarMinimized();

        return;
      }



      // Contextual Ctrl + Shift + R: Hard Refresh / New Chat (if AI open) OR Reset AI Order (otherwise)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ((e as KeyboardEvent).code === 'KeyR' || e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        if (activeAI && activeAIFull) {
          const webview = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any;
          if (webview) {
            webview.src = activeAIFull.url;
          }
        }
        return;
      }

      // Ctrl + J: Open Downloads View
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setActiveTab('downloads');
        undefined;

        return;
      }



      // 8. Ctrl/Cmd + R: Reload active AI view
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && ((e as KeyboardEvent).code === 'KeyR' || e.key.toLowerCase() === 'r')) {
        if (activeAI) {
          e.preventDefault();
          const activeWebview = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any;
          if (activeWebview) {
            activeWebview.reload();
            undefined;

          }
        }
        return;
      }

      // Alt + Left: Navigate Back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeAI) {
          const w = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any;
          if (w && w.canGoBack()) w.goBack();
        } else {
          tabBack();
        }
        return;
      }

      // Alt + Right: Navigate Forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeAI) {
          const w = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any;
          if (w && w.canGoForward()) w.goForward();
        } else {
          tabForward();
        }
        return;
      }

      // Ctrl + \: Toggle Split View Menu
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        if (splitButtonRef.current) {
          const rect = splitButtonRef.current.getBoundingClientRect();
          setSplitMenuPos({ top: rect.top, left: rect.right });
        }
        setSplitMenuOpen((prev) => !prev);
        return;
      }

      // Ctrl + Shift + D: Bookmark Chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        if (activeAI && splitAIRef.current === null && currentWebviewUrlRef.current) {
          e.preventDefault();
          setBookmarkOpen((prev) => !prev);
        }
        return;
      }

      // Ctrl + Shift + S: Content Capture (only when Alt is NOT pressed)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (window.electron?.captureContent) {
          const currentAI = activeAIFull?.id || 'system';
          const result = await window.electron.captureContent(currentAI);
          if (!result) {
            undefined;

            return;
          }
          setCapturePreview({
            open: true,
            base64: result.base64,
            width: result.width,
            height: result.height,
            aiId: currentAI,
            type: 'content'});
        }
        return;
      }

      // Ctrl + Shift + X: Workspace Capture
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        if (window.electron?.captureWorkspace) {
          const result = await window.electron.captureWorkspace();
          if (!result) {
            undefined;

            return;
          }
          const currentAI = activeAIFull?.id || 'system';
          setCapturePreview({
            open: true,
            base64: result.base64,
            width: result.width,
            height: result.height,
            aiId: currentAI,
            type: 'workspace'});
        }
        return;
      }

      // 8a. Zoom shortcuts: Ctrl/Cmd + = / + / - / 0
      // Active only when an AI is selected (mirrors the dropdown behavior).
      if (e.metaKey || e.ctrlKey) {
        if (activeAI && (e.key === '=' || e.key === '+')) {
          e.preventDefault();
          useStore.getState().applyZoomShortcut('in');
          return;
        }
        if (activeAI && (e.key === '-' || e.key === '_')) {
          e.preventDefault();
          useStore.getState().applyZoomShortcut('out');
          return;
        }
        if (activeAI && e.key === '0') {
          e.preventDefault();
          useStore.getState().applyZoomShortcut('reset');
          return;
        }
      }

      // 9. Alt + Number keys 1-9: Switch between configured AIs (up to 9)
      // Alt + '1' -> aiList[0], ..., Alt + '9' -> aiList[8]
      if (!e.metaKey && !e.ctrlKey && e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const targetAI = aiList[index];
        if (targetAI && !disabledAIs.includes(targetAI.id)) {
          setActiveAI(targetAI.id);
        }
      }

    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        if (altPressedAlone) {
          e.preventDefault();
          const logoBtn = document.getElementById('sidebar-logo-btn');
          if (logoBtn) {
            logoBtn.click();
          }
        }
        altPressedAlone = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let removeWebviewKeydownListener: (() => void) | null = null;
    if (window.electron && window.electron.onWebviewKeydown) {
      removeWebviewKeydownListener = window.electron.onWebviewKeydown((payload) => {
        handleKeyDown({
          ...payload,
          preventDefault: () => { /* no-op */ }
        });
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (removeWebviewKeydownListener) {
        removeWebviewKeydownListener();
      }
    };
  }, [
    activeAI,
    activeTab,
    commandPaletteOpen,
    shortcutsOpen,
    aiList,
    setActiveAI,
    setActiveTab,
    setCommandPaletteOpen,
    setShortcutsOpen,
    toggleSidebarMinimized,
    rightSidebarMinimized,
    toggleRightSidebarMinimized,
    
    preferences,
    updatePreferences,
    openToolPopover,
    openToolWindow,
    activeAIFull,
    disabledAIs
  ]);

  // Keep the AI-message handler ref current. This merges what were previously
  // two separate listeners: global context messages and injected-script
  // messages. Runs on every render so t/handleEnhance/handleDictionary and all
  // other closures are always fresh.
  aiMessageHandlerRef.current = (payload: any) => {
    switch (payload.type) {
      // --- Global context messages ---
      case 'THRED_LAST_CLICK_CONTEXT':
        useStore.getState().setLastAIContext(payload.context);
        break;
      case 'THRED_COPY_CONTEXT':
        useStore.getState().setPendingVaultItem({
          type: payload.context,
          content: payload.text});
        undefined;
        break;
      // --- Injected webview script messages ---
      case 'THRED_SAVE_PROMPT':
        undefined;
        break;
      case 'THRED_COPY':
        undefined;
        break;
      case 'SAVE_PROMPT_DONE':
        undefined;
        useStore.getState().loadVaultItems();
        break;
      case 'COPY_DONE':
        undefined;
        break;
    }
  };

  const splitAIFull = splitAI ? aiList.find((ai: any) => ai.id === splitAI) : null;

  const navBackAvailable = activeAI
    ? (() => { try { const w = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any; return w ? w.canGoBack() : false; } catch { return false; } })()
    : tabHistoryIndex > 0;
  const navForwardAvailable = activeAI
    ? (() => { try { const w = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any; return w ? w.canGoForward() : false; } catch { return false; } })()
    : tabHistoryIndex < tabHistory.length - 1;

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-white/50">
          <span className="material-symbols-outlined text-4xl animate-pulse">hourglass_empty</span>
          <span className="text-sm font-medium">{t('app.loading')}</span>
        </div>
      </div>
    );
  }

  if (!onboardingComplete) {
    return <OnboardingScreen />;
  }

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-background text-on-surface select-none font-sans relative">

      {/* Sidebar Rail */}
      <div className={`flex shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${sidebarMinimized ? 'w-0 -translate-x-full opacity-0' : 'w-[68px] translate-x-0 opacity-100'}`}>
        <Sidebar />
      </div>

      {/* Main Panel Frame */}
      <div
        id="main-view-container"
        className={`relative flex-grow flex flex-col overflow-hidden bg-background transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] my-2 mr-2 rounded-[16px] ${sidebarMinimized ? 'ml-2' : 'ml-0'}`}
        style={{
          boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)',
          borderTop: '1px solid rgba(255,255,255,0.09)'
        }}
      >
        {/* Universal Header Bar */}
        <div className="titlebar-drag w-full bg-[color-mix(in_srgb,var(--bg-primary)_80%,transparent)] shrink-0 border-b border-white/5 flex items-center gap-0.5 pl-2 pr-3 relative transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] h-8 opacity-100">

          {/* Nav buttons — webview nav when AI active, tab nav otherwise */}
          <button
            onClick={() => { if (!navBackAvailable) return; if (activeAI) { (document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any)?.goBack(); } else { tabBack(); } }}
            className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all ${navBackAvailable ? 'text-white/40 hover:text-white hover:bg-white/[0.06] cursor-pointer' : 'text-white/10 cursor-default'}`}
            title={navBackAvailable ? t('app.tooltip.goBack') : t('app.tooltip.noBackHistory')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back_ios</span>
          </button>
          <button
            onClick={() => { if (!navForwardAvailable) return; if (activeAI) { (document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any)?.goForward(); } else { tabForward(); } }}
            className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all ${navForwardAvailable ? 'text-white/40 hover:text-white hover:bg-white/[0.06] cursor-pointer' : 'text-white/10 cursor-default'}`}
            title={navForwardAvailable ? t('app.tooltip.goForward') : t('app.tooltip.noForwardHistory')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward_ios</span>
          </button>
          <button
            onClick={() => {
              if (!activeAI) return;
              const webview = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any;
              if (webview) webview.reload();
            }}
            className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
            title={t('app.tooltip.reload')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
          </button>

          {/* Home button: hard refresh the AI webview */}
          {activeAI !== null && (
            <button
              onClick={() => {
                if (!activeAI || !activeAIFull) return;
                const webview = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any;
                if (webview) {
                  webview.src = activeAIFull.url;
                }
              }}
              className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              title={t('app.tooltip.resetToHome')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
            </button>
          )}

          {/* Topbar Quick Access Task */}
          {activeTask && (
            <div className="no-drag flex items-center gap-1.5 px-2 py-0.5 ml-2 rounded-full bg-white/[0.04] border border-white/[0.04] max-w-[160px] md:max-w-[220px] h-5 text-white/60 select-none transition-all hover:bg-white/[0.06] hover:border-white/[0.08] hover:text-white/80">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTodo(activeTask.id);
                }}
                className="w-3 h-3 rounded-full border border-white/20 hover:border-[var(--accent)] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                title={t('app.tooltip.completeTask')}
              >
                {activeTask.completed && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
              </button>
              {activeTask.priority && (
                <div
                  className={`w-1 h-1 rounded-full shrink-0 ${
                    activeTask.priority === 'high'
                      ? 'bg-red-400/90'
                      : activeTask.priority === 'low'
                      ? 'bg-gray-500/60'
                      : 'bg-amber-400/80'
                  }`}
                  title={`Priority: ${activeTask.priority}`}
                />
              )}
              <span
                onClick={() => openToolWindow('todos')}
                className="text-[9px] font-semibold truncate cursor-pointer leading-none"
                title={`Task: ${activeTask.text} (Click to open Todos)`}
              >
                {activeTask.text}
              </span>
            </div>
          )}

          {/* Spacer - pushes right section to the right edge */}
          <div className="flex-1" />

          {/* Centered URL display (only when AI is active) */}
          {activeAI !== null && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none">
              {activeAIFull && (
                <div
                  className="text-[11px] font-medium text-white/40 flex items-center gap-1.5 no-drag pointer-events-auto cursor-pointer hover:text-white/70 transition-colors"
                  onClick={() => setCommandPaletteOpen(true)}
                  title={`Open Command Palette (${activeAIFull.name})`}
                >
                  <span className="material-symbols-outlined text-[12px] opacity-70">lock</span>
                  {activeAIFull.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')}
                </div>
              )}
              {splitAIFull && (
                <>
                  <div className="w-[1px] h-3 bg-white/10" />
                  <div
                    className="text-[11px] font-medium text-white/40 flex items-center gap-1.5 pointer-events-auto no-drag cursor-pointer hover:text-white/70 transition-colors"
                    onClick={() => setCommandPaletteOpen(true)}
                    title={`Open Command Palette (${splitAIFull.name})`}
                  >
                    <span className="material-symbols-outlined text-[12px] opacity-70">lock</span>
                    {splitAIFull.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Split View Button + Dropdown (only when AI is active) */}
            {activeAI !== null && (
              <div className="relative no-drag animate-scale-in flex items-center gap-0.5" data-split-menu>
                <button
                  ref={splitButtonRef}
                  onClick={() => {
                    if (splitButtonRef.current) {
                      const rect = splitButtonRef.current.getBoundingClientRect();
                      setSplitMenuPos({ top: rect.top, left: rect.right });
                    }
                    setSplitMenuOpen(!splitMenuOpen);
                  }}
                  className="no-drag relative w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                  title={splitAI ? t('app.tooltip.changeSplitAI') : t('app.tooltip.splitView')}
                >
                  <span className={`material-symbols-outlined ${splitAI ? 'text-[var(--accent)]' : ''}`} style={{ fontSize: '16px' }}>vertical_split</span>
                </button>

                {splitAI !== null && (
                  <button
                    onClick={() => { setSplitAI(null); setSplitMenuOpen(false); }}
                    className="no-drag w-5 h-5 flex items-center justify-center rounded-md text-white/30 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                    title={t('app.tooltip.closeSplitView')}
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                )}

                {splitMenuOpen && splitMenuPos && createPortal(
                  <React.Fragment>
                    <div key="backdrop" className="fixed inset-0" onClick={() => setSplitMenuOpen(false)} />
                    <div key="dropdown" className="fixed z-[100] w-[340px] rounded-3xl border border-[var(--border-primary)] bg-surface p-4 shadow-2xl origin-top-right animate-pop-top-right text-left"
                      style={{ top: splitMenuPos.top, left: splitMenuPos.left - 340, transformOrigin: 'top right' }}>
                      <div className="flex items-center justify-between mb-4 px-1">
                        <span className="text-[13px] font-medium text-white">{splitAI ? 'Change' : 'Add'} AI to split with {activeAIFull?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[var(--border-primary)] mb-5">
                        <span className="material-symbols-outlined text-[16px] text-white/40">search</span>
                        <span className="text-[13px] text-white/40">{t('app.split.searchPlaceholder')}</span>
                      </div>
                      <div className="mb-5">
                        <div className="text-[10px] font-semibold text-white/40 tracking-wider mb-2 px-1 uppercase">{t('app.split.popular')}</div>
                        <div className="flex flex-col gap-0.5">
                          {aiList.filter((ai: any) => ai.id !== activeAI && ai.id !== splitAI).slice(0, 4).map((ai: any) => (
                            <div
                              key={ai.id}
                              onClick={() => { setSplitAI(ai.id); setSplitMenuOpen(false); }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-[#1A1A1A] transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04]">
                                  <AIIcon id={ai.id} className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-medium text-white">{ai.name}</span>
                                  <span className="text-[11px] text-white/40">{( { 'chatgpt': 'Smart, fast and versatile', 'gemini': "Google's next-gen model", 'perplexity': 'Real-time answers', 'grok': "X's AI with real-time knowledge" } as any)[ai.id] || 'AI assistant model'}</span>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[16px] text-white/30 group-hover:text-white/70 transition-colors">chevron_right</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mb-5">
                        <div className="text-[10px] font-semibold text-white/40 tracking-wider mb-2 px-1 uppercase">{t('app.split.allModels')}</div>
                        <div className="flex flex-wrap items-center gap-2 px-1">
                          {aiList.filter((ai: any) => ai.id !== activeAI && ai.id !== splitAI).map((ai: any) => (
                            <div
                              key={ai.id}
                              onClick={() => { setSplitAI(ai.id); setSplitMenuOpen(false); }}
                              className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-white/[0.04] border border-[var(--border-primary)] hover:bg-[#2A2A2A] hover:scale-105 transition-all cursor-pointer"
                              title={ai.name}
                            >
                              <AIIcon id={ai.id} className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-white/40 tracking-wider mb-2 px-1 uppercase">{t('app.split.recentSplits')}</div>
                        <div className="flex flex-col gap-0.5">
                          {aiList.filter((ai: any) => ai.id !== activeAI && ai.id !== splitAI).slice(0, 2).map((ai: any) => (
                            <div
                              key={ai.id}
                              onClick={() => { setSplitAI(ai.id); setSplitMenuOpen(false); }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-[#1A1A1A] transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.04]">
                                  <AIIcon id={ai.id} className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                                </div>
                                <span className="text-[12px] font-medium text-white/80">{activeAIFull?.name} + {ai.name}</span>
                              </div>
                              <span className="material-symbols-outlined text-[14px] text-white/30 group-hover:text-white/70 transition-colors">open_in_new</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>,
                  document.body
                )}
              </div>
            )}

            {/* Bookmark */}
            {activeAI !== null && splitAI === null && currentWebviewUrl && (
              <>
                <button
                  onClick={() => setBookmarkOpen(!bookmarkOpen)}
                  className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${bookmarkOpen ? 'text-white bg-white/[0.08]' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'}`}
                  title={t('app.tooltip.bookmark')}
                >
                  <div className="relative w-4 h-4 flex items-center justify-center">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', lineHeight: 1 }}>{isCurrentUrlBookmarked ? 'bookmark' : 'bookmark_add'}</span>
                  </div>
                </button>
                {bookmarkOpen && (
                  <BookmarkPopover
                    aiId={activeAI}
                    currentUrl={currentWebviewUrl}
                    onClose={() => {
                      setBookmarkOpen(false);
                      // Re-check bookmark state after close
                      window.electron.bookmarksGetByUrl(currentWebviewUrl).then((b: any) => setIsCurrentUrlBookmarked(b !== null)).catch(() => {
                        // Ignore
                      });
                    }}
                    />
                )}
              </>
            )}

            {/* Content Capture */}
            {activeAI !== null && (
              <button
                    onClick={async () => {
                      if (!window.electron?.captureContent) return;
                      const currentAI = activeAIFull?.id || 'system';
                      const result = await window.electron.captureContent(currentAI);
                      if (!result) {
                        undefined;

                        return;
                      }
                      setCapturePreview({
                        open: true,
                        base64: result.base64,
                        width: result.width,
                        height: result.height,
                        aiId: currentAI,
                        type: 'content'});
                    }}
                    className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                    title={t('app.tooltip.contentCapture')}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', lineHeight: 1 }}>screenshot_monitor</span>
                    </div>
                  </button>
                )}

                {/* Workspace Capture */}
                <button
                  onClick={async () => {
                    if (!window.electron?.captureWorkspace) return;
                    const result = await window.electron.captureWorkspace();
                    if (!result) {
                      undefined;

                      return;
                    }
                    const currentAI = activeAIFull?.id || 'system';
                    setCapturePreview({
                      open: true,
                      base64: result.base64,
                      width: result.width,
                      height: result.height,
                      aiId: currentAI,
                      type: 'workspace'});
                  }}
                  className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                  title={t('app.tooltip.workspaceCapture')}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', lineHeight: 1 }}>space_dashboard</span>
                  </div>
                </button>



            <WindowControls />
          </div>
        </div>

        {/* Page container (Home, Settings, etc.) — hidden when an AI is active */}
        <div ref={viewContainerRef as any} className={`flex-1 w-full flex flex-col overflow-hidden${activeAI !== null ? ' hidden' : ''}`}>
          <div key={`${activeTab}`} className="flex-1 w-full flex flex-col overflow-hidden animate-fade-in" style={{ animationDuration: '300ms' }}>
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'vault' && <VaultView />}
            {activeTab === 'conversation' && <ConversationView />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'history' && <HistoryView />}
            {activeTab === 'report' && <ReportView />}
            {activeTab === 'downloads' && <DownloadsView />}
          </div>
        </div>

        {/* Webview container — sits below the header bar in normal flex flow.
            Hidden when no AI is active; takes remaining space when an AI is selected. */}
        <div key="webview-container" className={`flex-1 w-full flex flex-col overflow-hidden animate-fade-in${activeAI === null ? ' hidden' : ''}`} style={{ animationDuration: '300ms' }}>
          <WebviewContainer />
        </div>

      </div>

      {/* Right Sidebar */}
      <div className={`relative shrink-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${rightSidebarMinimized ? 'w-0 opacity-0 translate-x-[20px] pointer-events-none' : 'w-[47px] opacity-100 translate-x-0'}`}>
        <RightSidebar />
      </div>

      {/* Floating Dialogs and Overlay Modals */}
      {commandPaletteOpen && <CommandPalette />}
      {shortcutsOpen && <ShortcutsReferenceOverlay />}
      {sessionExpiredOpen && <SessionExpiredOverlay />}
      <ToolPopover />
      <VaultContextSaveModal />

      <ScreenshotPreviewModal
        open={capturePreview.open}
        base64={capturePreview.base64}
        width={capturePreview.width}
        height={capturePreview.height}
        aiId={capturePreview.aiId}
        type={capturePreview.type}
        onClose={() => setCapturePreview((prev) => ({ ...prev, open: false }))}
        onSaved={() => { /* store's addScreenshot already calls loadScreenshots + logActivity */ }}
      />

      {/* Tool Windows (floating tool cards) */}
      <Notes />
      <TodoTool />
      <TimeTool />
      <CalendarTool />
      <CalculatorTool />
      <ConverterTool />
      <StickyScratchpad />
      <Whiteboard />
      <PomodoroTool />

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ConfirmDialogProvider>
      <AppContent />
    </ConfirmDialogProvider>
  );
};

export default App;


