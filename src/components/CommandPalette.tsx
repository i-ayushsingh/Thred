import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n/context';
import { AIIcon } from './AIIcon';

interface CommandAction {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  shortcut?: string;
  color?: string;
  execute: () => void;
}

export const CommandPalette: React.FC = () => {
  const t = useT();
  const {  activeAI,
    setActiveAI,
    setActiveTab,
    setCommandPaletteOpen,
    aiList,
    reorderMode,
    setReorderMode,
    setShortcutsOpen,
    setSessionExpiredOpen,
    setVaultTab,
    setConversationTab,
    toggleSidebarMinimized,
    toggleRightSidebarMinimized,
    sidebarMinimized,
    rightSidebarMinimized  } = useStore(useShallow(state => ({ activeAI: state.activeAI, setActiveAI: state.setActiveAI, setActiveTab: state.setActiveTab, setCommandPaletteOpen: state.setCommandPaletteOpen, aiList: state.aiList, reorderMode: state.reorderMode, setReorderMode: state.setReorderMode, setShortcutsOpen: state.setShortcutsOpen, setSessionExpiredOpen: state.setSessionExpiredOpen, setVaultTab: state.setVaultTab, setConversationTab: state.setConversationTab, toggleSidebarMinimized: state.toggleSidebarMinimized, toggleRightSidebarMinimized: state.toggleRightSidebarMinimized, sidebarMinimized: state.sidebarMinimized, rightSidebarMinimized: state.rightSidebarMinimized })));

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build actions list
  const actions: CommandAction[] = [
    // ─── Navigation ───
    {
      id: 'home',
      name: t('commandPalette.actions.goHome.title'),
      subtitle: t('commandPalette.actions.goHome.subtitle'),
      icon: 'home',
      shortcut: 'Ctrl+D',
      execute: () => {
        setActiveAI(null);
        setActiveTab('home');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'vault',
      name: t('commandPalette.actions.openVault.title'),
      subtitle: t('commandPalette.actions.openVault.subtitle'),
      icon: 'folder_open',
      shortcut: 'Ctrl+L',
      execute: () => {
        setActiveAI(null);
        setActiveTab('vault');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'vault-prompts',
      name: 'Vault → Prompts',
      subtitle: 'Browse and manage saved prompt templates',
      icon: 'snippet_folder',
      execute: () => {
        setActiveAI(null);
        setActiveTab('vault');
        setVaultTab('Prompts');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'vault-responses',
      name: 'Vault → Responses',
      subtitle: 'Browse saved AI responses',
      icon: 'question_answer',
      execute: () => {
        setActiveAI(null);
        setActiveTab('vault');
        setVaultTab('Responses');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'vault-codebook',
      name: 'Vault → Codebook',
      subtitle: 'Browse saved code snippets',
      icon: 'code',
      execute: () => {
        setActiveAI(null);
        setActiveTab('vault');
        setVaultTab('Codebook');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'vault-notebook',
      name: 'Vault → Notebook',
      subtitle: 'Browse notebook entries',
      icon: 'note',
      execute: () => {
        setActiveAI(null);
        setActiveTab('vault');
        setVaultTab('Notebook');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'vault-screenshots',
      name: 'Vault → Screenshots',
      subtitle: 'Browse captured screenshots',
      icon: 'photo_library',
      execute: () => {
        setActiveAI(null);
        setActiveTab('vault');
        setVaultTab('Screenshots');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'conversation',
      name: 'Open Conversation',
      subtitle: 'View conversation history and bookmarks',
      icon: 'forum',
      shortcut: 'Ctrl+M',
      execute: () => {
        setActiveAI(null);
        setActiveTab('conversation');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'downloads',
      name: 'Open Downloads',
      subtitle: 'View and manage downloaded files',
      icon: 'download',
      execute: () => {
        setActiveAI(null);
        setActiveTab('downloads');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'history',
      name: 'Open History',
      subtitle: 'View AI browsing and chat history',
      icon: 'history',
      shortcut: 'Ctrl+H',
      execute: () => {
        setActiveAI(null);
        setActiveTab('history');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'settings',
      name: t('commandPalette.actions.openSettings.title'),
      subtitle: 'Configure launch options, sidebar state, and check for updates',
      icon: 'settings',
      shortcut: 'Ctrl+,',
      execute: () => {
        setActiveAI(null);
        setActiveTab('settings');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'report',
      name: 'Report a Bug',
      subtitle: 'Submit a bug report or feedback',
      icon: 'bug_report',
      shortcut: 'Ctrl+Shift+I',
      execute: () => {
        setActiveAI(null);
        setActiveTab('report');
        setCommandPaletteOpen(false);
      }
    },

    // ─── AI Switchers ───
    ...aiList.map((ai) => ({
      id: `switch-${ai.id}`,
      name: `Switch to ${ai.name}`,
      subtitle: `Open isolated ${ai.name} chat session`,
      icon: ai.icon,
      color: '#F4A460',
      shortcut: ai.shortcut,
      execute: () => {
        setActiveAI(ai.id);
        setCommandPaletteOpen(false);
      }
    })),

    // ─── Contextual (active AI) ───
    ...(activeAI ? [
      {
        id: 'reload',
        name: t('commandPalette.actions.reloadSession.title'),
        subtitle: 'Refresh the current active model view',
        icon: 'refresh',
        shortcut: 'Ctrl+R',
        execute: () => {
          const activeWrapper = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any;
          if (activeWrapper && typeof activeWrapper.reload === 'function') {
            activeWrapper.reload();
          }
          setCommandPaletteOpen(false);
        }
      },
      {
        id: 'go-home-url',
        name: 'Reset to Home Page',
        subtitle: `Navigate ${aiList.find(a => a.id === activeAI)?.name || 'AI'} back to its home URL`,
        icon: 'home',
        execute: () => {
          const ai = aiList.find(a => a.id === activeAI);
          const w = document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any;
          if (w && ai) w.src = ai.url;
          setCommandPaletteOpen(false);
        }
      }
    ] : []),

    // ─── View Controls ───
    {
      id: 'toggle-sidebar-left',
      name: sidebarMinimized ? 'Show Left Sidebar' : 'Hide Left Sidebar',
      subtitle: sidebarMinimized ? 'Expand the AI sidebar' : 'Collapse the AI sidebar',
      icon: sidebarMinimized ? 'menu_open' : 'menu',
      shortcut: 'Ctrl+[',
      execute: () => {
        toggleSidebarMinimized();
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'toggle-sidebar-right',
      name: rightSidebarMinimized ? 'Show Right Sidebar' : 'Hide Right Sidebar',
      subtitle: rightSidebarMinimized ? 'Expand the tools sidebar' : 'Collapse the tools sidebar',
      icon: rightSidebarMinimized ? 'keyboard_tab' : 'keyboard_tab_key',
      shortcut: 'Ctrl+]',
      execute: () => {
        toggleRightSidebarMinimized();
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'toggle-both-sidebars',
      name: 'Toggle Both Sidebars',
      subtitle: sidebarMinimized && rightSidebarMinimized ? 'Show both sidebars' : 'Hide both sidebars',
      icon: 'side_navigation',
      shortcut: 'Ctrl+B',
      execute: () => {
        if (!sidebarMinimized || !rightSidebarMinimized) {
          if (!sidebarMinimized) toggleSidebarMinimized();
          if (!rightSidebarMinimized) toggleRightSidebarMinimized();
        } else {
          toggleSidebarMinimized();
          toggleRightSidebarMinimized();
        }
        setCommandPaletteOpen(false);
      }
    },

    // ─── Misc ───
    {
      id: 'toggle-reorder',
      name: reorderMode ? 'Disable Sidebar Reordering' : 'Enable Sidebar Reordering',
      subtitle: reorderMode ? 'Lock AI sidebar items positions' : 'Rearrange AI sidebar order using arrows',
      icon: 'reorder',
      execute: () => {
        setReorderMode(!reorderMode);
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'show-shortcuts',
      name: t('commandPalette.actions.showShortcuts.title'),
      subtitle: 'View comprehensive keyboard shortcut reference panel',
      icon: 'help',
      shortcut: 'Ctrl+/',
      execute: () => {
        setShortcutsOpen(true);
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'close',
      name: t('commandPalette.actions.closePalette.title'),
      subtitle: 'Dismiss this search overlay',
      icon: 'close',
      shortcut: 'ESC',
      execute: () => {
        setCommandPaletteOpen(false);
      }
    }
  ];

  // Filter actions based on search query
  const filteredActions = actions.filter((action) =>
    action.name.toLowerCase().includes(search.toLowerCase()) ||
    action.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Handle keyboard events inside palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].execute();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredActions, selectedIndex, setCommandPaletteOpen]);

  // Keep selected item visible in scroll view
  useEffect(() => {
    const activeEl = listRef.current?.children[selectedIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm select-none"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-[520px] glass-panel rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b transition-all duration-200 ${isFocused ? 'border-primary/40 bg-white/[0.01] shadow-[0_1px_8px_rgba(192,193,255,0.03)]' : 'border-white/10'
          }`}>
          <span className={`material-symbols-outlined text-on-surface-variant/60 transition-colors ${isFocused ? 'text-primary/70' : ''
            }`}>search</span>
          <input
            ref={inputRef}
            type="text"
            placeholder={t('commandPalette.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="bg-transparent border-0 outline-0 text-xs text-on-surface placeholder:text-on-surface-variant/40 flex-1 ring-0 focus:ring-0 focus:outline-none focus:border-none p-0 font-sans"
          />
          <span className="text-[9px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-on-surface-variant">
            ESC
          </span>
        </div>

        {/* Action Items List */}
        <div
          ref={listRef}
          className="max-h-[320px] overflow-y-auto custom-scrollbar py-1"
        >
          {filteredActions.length > 0 ? (
            filteredActions.map((action, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={action.id}
                  onClick={() => action.execute()}
                  className={`px-4 py-2 flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-white/10 text-on-surface font-semibold' : 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-[70%]">
                    {action.id.startsWith('switch-') ? (
                      <AIIcon
                        id={action.id.replace('switch-', '')}
                        className="w-[18px] h-[18px] shrink-0"
                        style={{ color: 'var(--accent)' }}
                      />
                    ) : (
                      <span
                        className="material-symbols-outlined text-lg shrink-0"
                        style={action.color ? { color: action.color } : undefined}
                      >
                        {action.icon}
                      </span>
                    )}
                    <div className="flex flex-col text-left truncate">
                      <span className="text-xs font-semibold leading-tight">{action.name}</span>
                      <span className="text-[10px] opacity-60 leading-tight truncate mt-0.5">{action.subtitle}</span>
                    </div>
                  </div>
                  {action.shortcut && (
                    <span className="text-[9px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded opacity-60 shrink-0">
                      {action.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-xs text-on-surface-variant/40 font-mono">
              {t('commandPalette.search.noResults')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
