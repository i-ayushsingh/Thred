import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useStore } from '../store';
import { useT } from '../i18n/context';
import AIIcon from './AIIcon';
import { useConfirm } from './ConfirmDialog';
import type { Bookmark } from '../electron';

export const Sidebar: React.FC = () => {
  const t = useT();
  const { confirm } = useConfirm();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreMenuTop, setMoreMenuTop] = useState(0);
  const [moreMenuLeft, setMoreMenuLeft] = useState(0);

  const [pinnedBookmarks, setPinnedBookmarks] = useState<Bookmark[]>([]);

  // Load pinned bookmarks on mount and whenever the user navigates away from the
  // bookmarks tab (so pins updated in ConversationView are reflected immediately)
  const loadPinnedBookmarks = async () => {
    try {
      const all = await window.electron.bookmarksGetAll();
      setPinnedBookmarks(all.filter((b: any) => b.sidebar).slice(0, 5));
    } catch { /* bookmarks not available yet */ }
  };

  useEffect(() => { loadPinnedBookmarks(); }, []);

  const [logoMenuOpen, setLogoMenuOpen] = useState(false);
  const [logoMenuPos, setLogoMenuPos] = useState<{ top: number; left: number } | null>(null);

  const [hoveredAI, setHoveredAI] = useState<{ id: string, name: string, top: number, index: number, isExtra: boolean } | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSidebarEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setSidebarVisible(true);
  };

  const handleSidebarLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setSidebarVisible(false), 300);
  };
  const [tooltipText, setTooltipText] = useState<string | null>(null);
  const [tooltipTop, setTooltipTop] = useState(0);
  const hideTooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  const logoMenuRef = useRef<HTMLDivElement>(null);
  const logoButtonRef = useRef<HTMLButtonElement>(null);
  const logoDropdownRef = useRef<HTMLDivElement>(null);

  const handleMouseEnterAI = (e: React.MouseEvent, id: string, name: string, index: number, isExtra: boolean) => {
    if (hideTooltipTimeout.current) clearTimeout(hideTooltipTimeout.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredAI({ id, name, top: rect.top + rect.height / 2, index, isExtra });
  };

  const handleMouseLeaveAI = () => {
    hideTooltipTimeout.current = setTimeout(() => {
      setHoveredAI(null);
    }, 150);
  };

  const handleTooltipEnter = (e: React.MouseEvent, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipText(text);
    setTooltipTop(rect.top + rect.height / 2);
  };

  const handleTooltipLeave = () => {
    setTooltipText(null);
  };

  const {  
    activeAI,
    activeTab,
    reorderMode,
    preferences,
    aiList,
    setActiveAI,
    setActiveTab,
    setShortcutsOpen,
    sidebarMinimized,
    toggleSidebarMinimized,
    reorderAI,
    moveAI,
    addScreenshot,
    zoomLevels,
    setZoom,
    appVersion,
    commandPaletteOpen,
    setCommandPaletteOpen,
    navigateToBookmark,
    sidebarRefreshKey,
    disabledAIs
   } = useStore(useShallow(state => ({ activeAI: state.activeAI, activeTab: state.activeTab, reorderMode: state.reorderMode, preferences: state.preferences, aiList: state.aiList, setActiveAI: state.setActiveAI, setActiveTab: state.setActiveTab, setShortcutsOpen: state.setShortcutsOpen, sidebarMinimized: state.sidebarMinimized, toggleSidebarMinimized: state.toggleSidebarMinimized, reorderAI: state.reorderAI, moveAI: state.moveAI, addScreenshot: state.addScreenshot, zoomLevels: state.zoomLevels, setZoom: state.setZoom, appVersion: state.appVersion, commandPaletteOpen: state.commandPaletteOpen, setCommandPaletteOpen: state.setCommandPaletteOpen, navigateToBookmark: state.navigateToBookmark, sidebarRefreshKey: state.sidebarRefreshKey, disabledAIs: state.disabledAIs })));


  const [listRef] = useAutoAnimate<HTMLDivElement>({ duration: 250 });
  const [extraListRef] = useAutoAnimate<HTMLDivElement>({ duration: 250 });

  // Sidebar-collapsed state is persisted via thred config; the dedicated
  // set-sidebar-collapsed IPC was removed, so there is nothing to push here.

  // Logo menu click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!logoMenuOpen) return;
      const target = e.target as Node;
      if (logoMenuRef.current?.contains(target)) return;
      if (logoDropdownRef.current?.contains(target)) return;
      setLogoMenuOpen(false);
    };
    if (logoMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [logoMenuOpen]);

  // Sync zoom when activeAI changes â€” already handled by store via zoomLevels[activeAI]

  const handleZoom = (e: React.MouseEvent, delta: number | null) => {
    e.stopPropagation();
    if (!activeAI) return;

    const current = zoomLevels[activeAI] ?? 1.0;
    let next = current;
    if (delta !== null) {
      next = current + delta / 100;
      if (next < 0.5) next = 0.5;
      if (next > 2.0) next = 2.0;
      next = +next.toFixed(2);
    } else {
      // Reset to 100%
      next = 1.0;
    }

    if (next === current) return;
    setZoom(activeAI, next);
  };

  const currentZoomPct = Math.round((zoomLevels[activeAI ?? ''] ?? 1.0) * 100);

  const handleSelectAI = (id: string, name: string, color: string) => {
    if (reorderMode) return;
    setActiveAI(id);
    undefined;
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoMenuOpen(false);
    setActiveTab('report');
  };

  const handleAction = (action: string) => {
    setLogoMenuOpen(false);
    const webview = activeAI
      ? (document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any)
      : null;

    switch (action) {
      case 'home':
        setActiveTab('home');
        break;
      case 'vault':
        setActiveTab('vault');
        setActiveAI(null);
        break;
      case 'conversation':
        setActiveTab('conversation');
        break;
      case 'reload': {
        if (webview && typeof webview.reload === 'function') webview.reload();
        const activeAIName = aiList.find(a => a.id === activeAI)?.name || 'AI';
        undefined;
        break;
      }
      case 'screenshot':
        if (webview && typeof webview.capturePage === 'function') {
          webview.capturePage().then(async (img: any) => {
            const png = img.toPNG();
            await addScreenshot('content', png, activeAI || 'system');
            undefined;
          });
        }
        break;
      case 'settings':
        setActiveTab('settings');
        break;
      case 'shortcuts':
        setShortcutsOpen(true);
        break;
      case 'quit':
        confirm({
          title: t('sidebar.confirm.quit') || 'Quit Thred?',
          message: 'Are you sure you want to quit? Any unsaved work may be lost.',
          confirmLabel: 'Quit',
          cancelLabel: 'Cancel',
          variant: 'danger'}).then((ok) => {
          if (ok) {
            if (window.electron && window.electron.windowClose) {
              window.electron.windowClose();
            } else {
              window.close();
            }
          }
        });
        break;
      case 'restart':
        confirm({
          title: t('sidebar.confirm.restart') || 'Restart Thred?',
          message: 'The app will restart. Any unsaved work may be lost.',
          confirmLabel: 'Restart',
          cancelLabel: 'Cancel',
          variant: 'warning'}).then((ok) => {
          if (ok && window.electron && window.electron.appRestart) {
            window.electron.appRestart();
          }
        });
        break;
      case 'documentation':
        window.open('https://thred.qzz.io/docs', '_blank');
        break;
      case 'changelog':
        window.open('https://github.com/i-ayushsingh/thred/releases', '_blank');
        break;
      case 'whats-new':
        window.open('https://github.com/i-ayushsingh/thred/releases', '_blank');
        break;
      case 'report':
        setActiveTab('report');
        break;
    }
  };

  const handleSelectTab = (tab: 'home' | 'vault' | 'settings' | 'history' | 'conversation' | 'downloads') => {
    setActiveTab(tab);
    undefined;
  };

  // Reload pinned bookmarks whenever the user leaves the bookmarks/conversation tab
  useEffect(() => {
    if (activeTab !== 'conversation') {
      loadPinnedBookmarks();
    }
  }, [activeTab]);

  // Reload sidebar bookmarks when refreshed from ConversationView
  useEffect(() => {
    if (sidebarRefreshKey > 0) loadPinnedBookmarks();
  }, [sidebarRefreshKey]);


  const visibleAIs = aiList;
  const mainAIs = visibleAIs.slice(0, 10);
  const extraAIs = visibleAIs.slice(10);

  return (
    <>
      {/* Sidebar container */}
      <div
        className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex relative shrink-0 z-50 my-2 ml-2 ${sidebarMinimized ? 'w-0 opacity-0 -translate-x-[60px] pointer-events-none' : 'w-[52px] opacity-100 translate-x-0'}`}
        style={{ height: 'calc(100vh - 16px)', marginRight: sidebarMinimized ? '0' : '8px' }}
      >
        {/* Inner container â€” same in both modes */}
        <div
          className={`relative w-full h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
        >
          {/* Glass panel that shrinks â€” IS the collapsing element */}
          <div
            className={`shrink-0 w-[52px] rounded-[16px] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden bg-background border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),_0_4px_12px_rgba(0,0,0,0.25)] ${sidebarMinimized ? 'pointer-events-none' : 'pointer-events-auto'
              }`}
            style={{ height: '100%' }}
          >
            {/* Animated sidebar panel */}
            <aside
              className={`flex flex-col justify-between py-2 select-none w-full h-full overflow-hidden`}
            >
              {/* â”€â”€ TOP GROUP: Logo + Nav + AI list â”€â”€ */}
              <div className="flex flex-col items-center w-full min-h-0 overflow-y-auto no-scrollbar shrink-1">

                {/* Part 1: Logo Button inside the sidebar panel */}
                <div className="relative z-[100] shrink-0" ref={logoMenuRef}>
                  <button
                    id="sidebar-logo-btn"
                    ref={logoButtonRef}
                    onClick={() => {
                      if (!logoMenuOpen && logoButtonRef.current) {
                        const rect = logoButtonRef.current.getBoundingClientRect();
                        setLogoMenuPos({ top: rect.top, left: rect.right + 12 });
                      }
                      setLogoMenuOpen(!logoMenuOpen);
                    }}
                    onMouseEnter={(e) => handleTooltipEnter(e, appVersion || 'v?.?.?')}
                    onMouseLeave={handleTooltipLeave}
                    className={`flex items-center justify-center w-[40px] h-[30px] rounded-[10px] cursor-pointer transition-all duration-150 text-white/60 hover:text-white hover:bg-white/[0.05] active:scale-98 ${logoMenuOpen ? 'bg-white/[0.06] text-white' : ''}`}
                  >
                    <img src="./icons/hidden_trimmed.png" alt="Thred" style={{ width: '24px', height: '24px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                  </button>

                  {createPortal(
                    <div
                      ref={logoDropdownRef}
                      className={`titlebar-no-drag select-none transition-all duration-200 origin-top-left ${logoMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                      style={{
                        position: 'fixed',
                        top: logoMenuPos?.top ?? 0,
                        left: logoMenuPos?.left ?? 0,
                        width: '280px',
                        backgroundColor: 'rgba(20, 20, 22, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderTop: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.3), 0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
                        padding: '6px',
                        transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
                        transformOrigin: 'top left'}}
                    >
                      {/* HEADER */}
                      <div
                        className="flex items-center justify-between"
                        style={{
                          height: '36px',
                          cursor: 'default',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          marginBottom: '4px',
                          padding: '0 10px'
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Thred Menu</span>
                        <span style={{ fontSize: '11px', color: 'var(--accent)' }}>{appVersion || 'v?.?.?'}</span>
                      </div>
                      {/* MENU ITEMS */}
                      <div
                        className="group flex items-center justify-between cursor-pointer transition-colors duration-150"
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                        onClick={() => handleAction('home')}
                      >
                        <span>{t('sidebar.menu.home')}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Ctrl+D</span>
                      </div>
                      <div
                        className="group flex items-center justify-between cursor-pointer transition-colors duration-150"
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                        onClick={() => handleAction('vault')}
                      >
                        <span>{t('sidebar.menu.vault')}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Ctrl+L</span>
                      </div>
                      <div
                        className="group flex items-center justify-between cursor-pointer transition-colors duration-150"
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                        onClick={() => handleAction('conversation')}
                      >
                        <span>{t('sidebar.menu.conversationHistory')}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Ctrl+M</span>
                      </div>

                      <div className="my-1 border-t border-white/[0.06]" />

                      {/* VIEW CONTROLS */}
                      <div
                        className={`flex items-center justify-between ${activeAI ? 'cursor-default' : 'opacity-40 cursor-not-allowed'}`}
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                      >
                        <span>Zoom</span>
                        <div className="flex items-center gap-1.5 no-drag">
                          <button
                            disabled={!activeAI}
                            onClick={(e) => handleZoom(e, -10)}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white transition-all border-none cursor-pointer"
                            title={t('sidebar.zoom.zoomOut')}
                          >
                            <span className="material-symbols-outlined text-xs">remove</span>
                          </button>
                          <span
                            onClick={(e) => { if (activeAI) handleZoom(e, null); }}
                            className={`text-[11px] font-bold font-mono min-w-[36px] text-center px-1 py-0.5 rounded transition-all select-none ${activeAI ? 'hover:bg-white/10 hover:text-white cursor-pointer text-white/50' : 'text-white/30'}`}
                            title={t('sidebar.zoom.reset')}
                          >
                            {activeAI ? `${currentZoomPct}%` : '100%'}
                          </span>
                          <button
                            disabled={!activeAI}
                            onClick={(e) => handleZoom(e, 10)}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white transition-all border-none cursor-pointer"
                            title={t('sidebar.zoom.zoomIn')}
                          >
                            <span className="material-symbols-outlined text-xs">add</span>
                          </button>
                          <button
                            disabled={!activeAI}
                            onClick={(e) => handleZoom(e, null)}
                            className="px-1.5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-[10px] font-bold text-white transition-all border-none cursor-pointer"
                            title={t('sidebar.zoom.reset')}
                          >
                            {t('sidebar.zoom.reset')}
                          </button>
                        </div>
                      </div>

                      <div className="my-1 border-t border-white/[0.06]" />

                      {/* SUPPORT & DOCUMENTATION */}
                      <div
                        className="group flex items-center justify-between cursor-pointer transition-colors duration-150"
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                        onClick={() => handleAction('documentation')}
                      >
                        <span>{t('sidebar.menu.documentation')}</span>
                      </div>
                      <div
                        className="group flex items-center justify-between cursor-pointer transition-colors duration-150"
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                        onClick={() => handleAction('changelog')}
                      >
                        <span>{t('sidebar.menu.changelog')}</span>
                      </div>
                      <div
                        className="group flex items-center justify-between cursor-pointer transition-colors duration-150"
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                        onClick={() => handleAction('whats-new')}
                      >
                        <span>{t('sidebar.menu.whatsNew')}</span>
                      </div>
                      <div
                        className="group flex items-center justify-between cursor-pointer transition-colors duration-150"
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                        onClick={() => handleAction('report')}
                      >
                        <span>{t('sidebar.menu.reportBug')}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Ctrl+Shift+I</span>
                      </div>

                      <div className="my-1 border-t border-white/[0.06]" />

                      {/* SYSTEM */}
                      <div
                        className="group flex items-center justify-between cursor-pointer transition-colors duration-150"
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                        onClick={() => handleAction('restart')}
                      >
                        <span>{t('sidebar.menu.restart')}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Ctrl+Shift+Q</span>
                      </div>
                      <div
                        className="group flex items-center justify-between cursor-pointer transition-colors duration-150"
                        style={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', color: 'rgba(248, 113, 113, 0.8)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(248, 113, 113, 0.8)'; }}
                        onClick={() => handleAction('quit')}
                      >
                        <span>{t('sidebar.menu.quit')}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Ctrl+Q</span>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                <div className="w-7 h-px bg-white/10 my-[5px] shrink-0" />

                {/* Main Navigation */}
                <div className="flex flex-col shrink-0 items-center gap-[4px] w-full">
                  <button
                    onClick={() => handleSelectTab('home')}
                    onMouseEnter={(e) => handleTooltipEnter(e, t('sidebar.tooltip.home'))}
                    onMouseLeave={handleTooltipLeave}
                    className={`w-[40px] h-[30px] flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 ${activeAI === null && activeTab === 'home'
                      ? 'bg-white/[0.06] text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>home</span>
                  </button>
                  <button
                    onClick={() => handleSelectTab('vault')}
                    onMouseEnter={(e) => handleTooltipEnter(e, t('sidebar.tooltip.vault'))}
                    onMouseLeave={handleTooltipLeave}
                    className={`w-[40px] h-[30px] flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 ${activeAI === null && activeTab === 'vault'
                      ? 'bg-white/[0.06] text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder</span>
                  </button>
                  <button
                    onClick={() => setCommandPaletteOpen(true)}
                    onMouseEnter={(e) => handleTooltipEnter(e, t('sidebar.tooltip.search'))}
                    onMouseLeave={handleTooltipLeave}
                    className={`w-[40px] h-[30px] flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 ${commandPaletteOpen
                      ? 'bg-white/[0.06] text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                  </button>
                </div>

                <div className="w-7 h-px bg-white/10 my-[5px] shrink-0" />

                {/* AI Models list */}
                <div
                  ref={listRef}
                  className={`shrink-0 flex flex-col gap-[4px] px-1 overflow-y-auto no-scrollbar items-center w-full`}
                  onScroll={() => setMoreMenuOpen(false)}
                >
                  {mainAIs.map((ai, index) => {
                    const isActive = activeAI === ai.id;
                    const isDisabled = disabledAIs.includes(ai.id);
                    return (
                      <div key={ai.id} className="group relative w-[40px] h-[30px] flex items-center justify-center shrink-0">
                        <button
                          draggable={!isDisabled}
                          onDragStart={(e) => {
                            if (isDisabled) return;
                            e.dataTransfer.setData('text/plain', index.toString());
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                            if (!isNaN(fromIndex) && fromIndex !== index) {
                              moveAI(fromIndex, index);
                            }
                          }}
                          onClick={() => {
                            if (isDisabled) return;
                            handleSelectAI(ai.id, ai.name, ai.color);
                          }}
                          onMouseEnter={(e) => { if (!isDisabled) handleMouseEnterAI(e, ai.id, ai.name, index, false); }}
                          onMouseLeave={handleMouseLeaveAI}
                          className={`w-full h-full flex items-center justify-center rounded-[10px] transition-all duration-150 ${isDisabled
                            ? 'opacity-30 cursor-default'
                            : `cursor-pointer ${isActive
                              ? 'bg-white/[0.06] text-white font-medium'
                              : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                            } active:scale-98`
                            }`}
                        >
                          <div className="shrink-0 flex items-center justify-center">
                            <AIIcon id={ai.id} className="w-[20px] h-[20px]" style={{ color: isDisabled ? 'rgba(255,255,255,0.3)' : 'var(--accent)' }} />
                          </div>
                        </button>
                      </div>
                    );
                  })}

                  {/* Plus AI Models trigger */}
                  {extraAIs.length > 0 && (
                    <div className="flex flex-col gap-1.5 items-center shrink-0">
                      <button
                        id="sidebar-more-btn"
                        onClick={(e) => {
                          if (!moreMenuOpen) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMoreMenuTop(rect.top + rect.height / 2);
                            setMoreMenuLeft(rect.right + 12);
                          }
                          setMoreMenuOpen(!moreMenuOpen);
                        }}
                        onMouseEnter={(e) => handleMouseEnterAI(e, 'more', 'More AI Models', -1, false)}
                        onMouseLeave={handleMouseLeaveAI}
                        className={`w-[40px] h-[30px] flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 text-white/60 hover:text-white hover:bg-white/[0.05] active:scale-98 shrink-0 ${moreMenuOpen ? 'bg-white/[0.06] text-white' : ''}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Divider below last AI */}
                <div className="w-7 h-px bg-white/10 my-[5px] shrink-0" />

                {/* Pinned Bookmarks */}
                {pinnedBookmarks.length > 0 && (
                  <div className="flex flex-col shrink-0 items-center gap-[4px] w-full px-1">
                    {pinnedBookmarks.map((bm) => (
                      <button
                        key={bm.id}
                        onClick={() => navigateToBookmark(bm.aiId, bm.url)}
                        onMouseEnter={(e) => handleTooltipEnter(e, bm.name)}
                        onMouseLeave={handleTooltipLeave}
                        className="w-[40px] h-[30px] flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 text-white/60 hover:text-white hover:bg-white/[0.05] active:scale-98 shrink-0"
                      >
                        {bm.favicon ? (
                          <img
                            src={bm.favicon}
                            alt=""
                            className="w-[18px] h-[18px] rounded-[4px] object-contain"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement)?.style && ((e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'); }}
                          />
                        ) : null}
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '16px', display: bm.favicon ? 'none' : 'block' }}
                        >bookmark</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* â”€â”€ BOTTOM GROUP: Footer + Profile â”€â”€ */}
              <div className="flex flex-col items-center w-full shrink-0">
                <div className="w-7 h-px bg-white/10 mb-[5px]" />

                {/* Footer Controls (Bookmarks, Downloads, History, Settings) */}
                <div className="px-1 flex flex-col shrink-0 items-center justify-center gap-[4px] w-full">
                  <button
                    id="left-sidebar-bookmark-btn"
                    onClick={() => handleSelectTab('conversation')}
                    onMouseEnter={(e) => handleTooltipEnter(e, t('conversation.bookmarks.title'))}
                    onMouseLeave={handleTooltipLeave}
                    className={`w-[40px] h-[30px] flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 ${activeAI === null && activeTab === 'conversation'
                      ? 'bg-white/[0.06] text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bookmark</span>
                  </button>
                  <button
                    onClick={() => handleSelectTab('downloads')}
                    onMouseEnter={(e) => handleTooltipEnter(e, t('sidebar.tooltip.downloads'))}
                    onMouseLeave={handleTooltipLeave}
                    className={`w-[40px] h-[30px] flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 ${activeAI === null && activeTab === 'downloads'
                      ? 'bg-white/[0.06] text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                  </button>
                  <button
                    onClick={() => handleSelectTab('history')}
                    onMouseEnter={(e) => handleTooltipEnter(e, t('sidebar.tooltip.history') || 'History')}
                    onMouseLeave={handleTooltipLeave}
                    className={`w-[40px] h-[30px] flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 ${activeAI === null && activeTab === 'history'
                      ? 'bg-white/[0.06] text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
                  </button>
                  <button
                    onClick={() => handleSelectTab('settings')}
                    onMouseEnter={(e) => handleTooltipEnter(e, t('sidebar.tooltip.settings'))}
                    onMouseLeave={handleTooltipLeave}
                    className={`w-[40px] h-[30px] flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 ${activeAI === null && activeTab === 'settings'
                      ? 'bg-white/[0.06] text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {moreMenuOpen && extraAIs.length > 0 && createPortal(
        <div
          className="fixed z-[9999]"
          style={{
            left: moreMenuLeft,
            top: moreMenuTop,
            transform: 'translateY(-50%)'}}
        >
          {/* Click away listener */}
          <div className="fixed inset-0" onClick={() => setMoreMenuOpen(false)} />

          {/* Popover content â€” matching sidebar aesthetic */}
          <div ref={extraListRef} className="relative rounded-[16px] flex flex-col gap-1 p-1 shadow-2xl animate-scale-in" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)',
            borderTop: '1px solid rgba(255,255,255,0.09)',
            transformOrigin: 'left center'
          }}>
            {extraAIs.map((ai, index) => {
              const isActive = activeAI === ai.id;
              const globalIndex = index + 10;
              return (
                <div key={ai.id} className="group relative w-[40px] h-[34px] flex items-center justify-center">
                  <button
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', globalIndex.toString());
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                      if (!isNaN(fromIndex) && fromIndex !== globalIndex) {
                        moveAI(fromIndex, globalIndex);
                      }
                    }}
                    onClick={() => {
                      handleSelectAI(ai.id, ai.name, ai.color);
                      setMoreMenuOpen(false);
                      setHoveredAI(null);
                    }}
                    onMouseEnter={(e) => handleMouseEnterAI(e, ai.id, ai.name, globalIndex, true)}
                    onMouseLeave={handleMouseLeaveAI}
                    className={`w-full h-full flex items-center justify-center rounded-[10px] cursor-pointer transition-all duration-150 group relative ${isActive
                      ? 'bg-white/[0.06] text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      } active:scale-98`}
                    title={undefined}
                  >
                    <div className="shrink-0 flex items-center justify-center">
                      <AIIcon id={ai.id} className="w-[20px] h-[20px]" style={{ color: 'var(--accent)' }} />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {hoveredAI && createPortal(
        <div
          className="fixed z-[10000]"
          style={{
            left: hoveredAI.isExtra ? moreMenuLeft + 38 : 60,
            top: hoveredAI.top,
            transform: 'translateY(-50%)'
          }}
          onMouseEnter={() => { if (hideTooltipTimeout.current) clearTimeout(hideTooltipTimeout.current); }}
          onMouseLeave={handleMouseLeaveAI}
        >
          <div className="px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl text-[11px] font-bold text-on-surface shadow-2xl flex items-center gap-3 animate-slide-right">
            <span>{hoveredAI.name}</span>
            {hoveredAI.index !== -1 && hoveredAI.index < aiList.length && (
              <span className="text-[8px] font-mono text-on-surface-variant/80 bg-white/5 px-1 py-0.5 rounded">
                Alt+{aiList[hoveredAI.index]?.shortcut ?? hoveredAI.index + 1}
              </span>
            )}
            {hoveredAI.index !== -1 && (
              <div className="flex flex-col items-center justify-center gap-0 border-l border-white/10 pl-2">
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); reorderAI(hoveredAI.index, 'up'); }} className="text-white/50 active:scale-90 flex items-center justify-center" onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = ''}>
                  <span className="material-symbols-outlined text-[16px] leading-none">expand_less</span>
                </button>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); reorderAI(hoveredAI.index, 'down'); }} className="text-white/50 active:scale-90 flex items-center justify-center" onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = ''}>
                  <span className="material-symbols-outlined text-[16px] leading-none">expand_more</span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {tooltipText && createPortal(
        <div
          className="fixed z-[10000]"
          style={{
            left: 60,
            top: tooltipTop,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl text-[11px] font-bold text-on-surface shadow-2xl animate-slide-right whitespace-nowrap">
            {tooltipText}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Sidebar;
