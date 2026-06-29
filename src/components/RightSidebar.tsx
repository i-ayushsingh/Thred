import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { useT } from '../i18n/context';
import { AI_LIST } from '../shared/ai-list';
import { AIIcon } from './AIIcon';

const IconSpan: React.FC<{ name: string }> = ({ name }) => (
  <div className="w-4 h-4 flex items-center justify-center">
    <span className="material-symbols-outlined" style={{ fontSize: '16px', lineHeight: 1 }}>{name}</span>
  </div>
);

// Shared popcard styling so every hover card has identical width, padding, gaps,
// background, header, and footer rhythm.
const POPCARD_CLASS =
  'fixed z-[250] sidebar-popcard w-[260px] bg-[#0E0E0E] border border-white/[0.08] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-2.5 flex flex-col gap-2 select-none animate-fade-in';
const POPCARD_HEADER_CLASS = 'px-2 py-1 border-b border-white/[0.04] mb-1';
const POPCARD_HEADER_TEXT = 'text-[10px] font-bold text-white/50 uppercase tracking-wider font-sans';
const popcardStyle = (c: { top: number; left: number }): React.CSSProperties => ({
  top: `${c.top}px`,
  left: `${c.left}px`,
  transform: 'translate(-100%, -50%)',
  cursor: 'default'});

export const RightSidebar: React.FC = () => {
  const {
    openToolPopover,
    preferences,
    updatePreferences,
    setShortcutsOpen,
    aiList,
    setActiveTab,
    setConversationTab,
    setVaultTab,
    openToolWindow,
    toolWindows,
    setActiveAI,
    navigateToBookmark,
    templates,
    vaultItems,
    screenshots,
    activeDownloads,
    aiHistory} = useStore(useShallow(state => ({ openToolPopover: state.openToolPopover, preferences: state.preferences, updatePreferences: state.updatePreferences, setShortcutsOpen: state.setShortcutsOpen, aiList: state.aiList, setActiveTab: state.setActiveTab, setConversationTab: state.setConversationTab, setVaultTab: state.setVaultTab, openToolWindow: state.openToolWindow, toolWindows: state.toolWindows, setActiveAI: state.setActiveAI, navigateToBookmark: state.navigateToBookmark, templates: state.templates, vaultItems: state.vaultItems, screenshots: state.screenshots, activeDownloads: state.activeDownloads, aiHistory: state.aiHistory })));

  const t = useT();

  const [activeHoverCard, setActiveHoverCard] = React.useState<'bookmark' | 'prompts' | 'responses' | 'codebook' | 'screenshots' | 'downloads' | 'history' | null>(null);
  const [cardCoords, setCardCoords] = React.useState<{ top: number; left: number } | null>(null);

  const bookmarkBtnRef = React.useRef<HTMLButtonElement>(null);
  const promptsBtnRef = React.useRef<HTMLButtonElement>(null);
  const responsesBtnRef = React.useRef<HTMLButtonElement>(null);
  const codebookBtnRef = React.useRef<HTMLButtonElement>(null);
  const screenshotsBtnRef = React.useRef<HTMLButtonElement>(null);
  const downloadsBtnRef = React.useRef<HTMLButtonElement>(null);
  const historyBtnRef = React.useRef<HTMLButtonElement>(null);

  const [bookmarks, setBookmarks] = React.useState<any[]>([]);
  const [recentDownloads, setRecentDownloads] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (activeHoverCard === 'bookmark') {
      window.electron.bookmarksGetAll().then(setBookmarks).catch(() => {
        // Ignore
      });
    }
    if (activeHoverCard === 'downloads') {
      window.electron.downloadsGetAll().then((downloads) => {
        setRecentDownloads(downloads.slice(0, 5));
      }).catch(() => {
        // Ignore
      });
    }
  }, [activeHoverCard]);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeHoverCard && !target.closest('.right-sidebar-btn') && !target.closest('.sidebar-popcard')) {
        setActiveHoverCard(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeHoverCard]);

  const handleClick = (cardType: 'bookmark' | 'prompts' | 'responses' | 'codebook' | 'screenshots' | 'downloads' | 'history', btnRef: React.RefObject<HTMLButtonElement | null>) => {
    if (activeHoverCard === cardType) {
      setActiveHoverCard(null);
    } else {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setCardCoords({
          top: rect.top + rect.height / 2,
          left: rect.left - 8
        });
      }
      setActiveHoverCard(cardType);
    }
  };

  const handleCopyText = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const handleCopyScreenshot = async (shot: any) => {
    try {
      const dataUrl = await window.electron.readScreenshot(shot.path);
      if (dataUrl) {
        const base64 = dataUrl.split('base64,')[1];
        await window.electron.copyImageToClipboard(base64);
      }
    } catch (err) {
      console.error('Failed to copy screenshot:', err);
    }
  };

  const handleCopyDownload = async (item: any) => {
    try {
      await window.electron.copyFileToClipboard(item.path);
    } catch (err) {
      console.error('Failed to copy download:', err);
    }
  };

  const launch = (id: string, title: string, icon: string, tools: { name: string; icon: string; desc?: string }[]) => {
    openToolPopover({ id, title, icon, tools });
  };


  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      className="my-2 mr-2 w-[39px] rounded-[16px] flex flex-col items-center py-3 gap-1 bg-background border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),_0_4px_12px_rgba(0,0,0,0.25)]"
      style={{ height: 'calc(100vh - 16px)' }}
    >

      {/* Keyboard Shortcuts */}
      <button
        onClick={() => setShortcutsOpen(true)}
        className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
        title="Keyboard Shortcuts"
      >
        <IconSpan name="keyboard" />
      </button>

      {/* Divider */}
      <div className="w-5 h-px bg-white/10 my-0.5" />

      {/* Essential Tools — individual buttons */}
      <button
        id="sidebar-notes-btn"
        onClick={() => openToolWindow('notes')}
        className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${toolWindows.some(tw => tw.id === 'notes' && !tw.minimized)
            ? 'text-white bg-white/[0.08]'
            : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
        title={t('rightSidebar.essentialTools.notes')}
      >
        <IconSpan name="sticky_note_2" />
      </button>

      <button
        id="sidebar-todo-btn"
        onClick={() => openToolWindow('todos')}
        className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${toolWindows.some(tw => tw.id === 'todos' && !tw.minimized)
            ? 'text-white bg-white/[0.08]'
            : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
        title={t('rightSidebar.essentialTools.todo')}
      >
        <IconSpan name="checklist" />
      </button>

      <button
        id="sidebar-time-btn"
        onClick={() => openToolWindow('time')}
        className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${toolWindows.some(tw => tw.id === 'time' && !tw.minimized)
            ? 'text-white bg-white/[0.08]'
            : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
        title={t('rightSidebar.essentialTools.time')}
      >
        <IconSpan name="timer" />
      </button>

      <button
        id="sidebar-calendar-btn"
        onClick={() => openToolWindow('calendar')}
        className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${toolWindows.some(tw => tw.id === 'calendar' && !tw.minimized)
            ? 'text-white bg-white/[0.08]'
            : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
        title={t('rightSidebar.essentialTools.calendar')}
      >
        <IconSpan name="event" />
      </button>

      <button
        id="sidebar-calculator-btn"
        onClick={() => openToolWindow('calculator')}
        className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${toolWindows.some(tw => tw.id === 'calculator' && !tw.minimized)
            ? 'text-white bg-white/[0.08]'
            : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
        title={t('rightSidebar.essentialTools.calculator')}
      >
        <IconSpan name="calculate" />
      </button>

      <button
        id="sidebar-converter-btn"
        onClick={() => openToolWindow('converter')}
        className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${toolWindows.some(tw => tw.id === 'converter' && !tw.minimized)
            ? 'text-white bg-white/[0.08]'
            : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
        title={t('rightSidebar.essentialTools.converter')}
      >
        <IconSpan name="swap_horiz" />
      </button>

      {/* Divider */}
      <div className="w-5 h-px bg-white/10 my-0.5" />

      {/* Whiteboard */}
      <button
        id="sidebar-whiteboard-btn"
        onClick={() => openToolWindow('whiteboard')}
        className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
        title="Whiteboard"
      >
        <IconSpan name="shapes" />
      </button>

      {/* Pomodoro */}
      <button
        id="sidebar-pomodoro-btn"
        onClick={() => openToolWindow('pomodoro')}
        className={`no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${toolWindows.some(tw => tw.id === 'pomodoro' && !tw.minimized)
            ? 'text-white bg-white/[0.08]'
            : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
        title="Focus Session"
      >
        <IconSpan name="hourglass_top" />
      </button>

      {/* Sticky Scratchpad */}
      <button
        id="sidebar-scratchpad-btn"
        onClick={() => openToolWindow('scratchpad')}
        className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
        title="Sticky Scratchpad"
      >
        <IconSpan name="edit_note" />
      </button>





      {/* Divider */}
      <div className="w-5 h-px bg-white/10 my-0.5" />

      {/* Vault Shortcuts */}
      {/* Prompts */}
      <div className="relative">
        <button
          ref={promptsBtnRef}
          onClick={() => handleClick('prompts', promptsBtnRef)}
          className={`no-drag right-sidebar-btn w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
            activeHoverCard === 'prompts' ? 'text-white bg-white/[0.08]' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Prompts"
        >
          <IconSpan name="record_voice_over" />
        </button>

        {activeHoverCard === 'prompts' && cardCoords && createPortal(
          <div
            className={POPCARD_CLASS}
            style={popcardStyle(cardCoords)}
          >
            <div className={POPCARD_HEADER_CLASS}>
              <span className={POPCARD_HEADER_TEXT}>{t('rightSidebar.essentialTools.notes')}</span>
            </div>
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
              {vaultItems.filter((i: any) => i.category === 'Prompts' && i.isFavorite).length === 0 ? (
                <span className="text-[10px] text-white/40 px-2 py-1 font-medium font-sans">No favorite prompts</span>
              ) : (
                vaultItems.filter((i: any) => i.category === 'Prompts' && i.isFavorite).slice(0, 4).map((p) => (
                  <div key={p.id} className="group flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[15px] text-white/50 shrink-0">record_voice_over</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white/80 truncate leading-snug font-sans">{p.title || 'Untitled'}</span>
                        <span className="text-[9.5px] text-white/45 truncate leading-snug font-sans">{p.fullText?.slice(0, 40)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyText(p.fullText || ''); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-all shrink-0"
                      title="Copy contents"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => { setActiveTab('vault'); setVaultTab('Prompts'); setActiveHoverCard(null); }}
              className="w-full mt-1 py-1.5 bg-[#1A1A1C] hover:bg-white/10 border border-white/[0.04] shadow-sm rounded-lg text-[10px] font-bold tracking-wide text-white/80 transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
            >
              View All Prompts
              <span className="material-symbols-outlined text-[12px] text-white/40">arrow_forward</span>
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Responses */}
      <div className="relative">
        <button
          ref={responsesBtnRef}
          onClick={() => handleClick('responses', responsesBtnRef)}
          className={`no-drag right-sidebar-btn w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
            activeHoverCard === 'responses' ? 'text-white bg-white/[0.08]' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Responses"
        >
          <IconSpan name="reply" />
        </button>

        {activeHoverCard === 'responses' && cardCoords && createPortal(
          <div
            className={POPCARD_CLASS}
            style={popcardStyle(cardCoords)}
          >
            <div className={POPCARD_HEADER_CLASS}>
              <span className={POPCARD_HEADER_TEXT}>Responses</span>
            </div>
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
              {vaultItems.filter((i: any) => i.category === 'Responses').length === 0 ? (
                <span className="text-[10px] text-white/40 px-2 py-1 font-medium font-sans">No responses yet</span>
              ) : (
                vaultItems.filter((i: any) => i.category === 'Responses').slice(0, 8).map((r: any) => (
                  <div key={r.id} className="group flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[15px] text-white/50 shrink-0">reply</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white/80 truncate leading-snug font-sans">{r.title || r.name || 'Untitled'}</span>
                        <span className="text-[9.5px] text-white/45 truncate leading-snug font-sans">{r.fullText?.slice(0, 40)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyText(r.fullText || ''); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-all shrink-0"
                      title="Copy contents"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => { setActiveTab('vault'); setVaultTab('Responses'); setActiveHoverCard(null); }}
              className="w-full mt-1 py-1.5 bg-[#1A1A1C] hover:bg-white/10 border border-white/[0.04] shadow-sm rounded-lg text-[10px] font-bold tracking-wide text-white/80 transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
            >
              View All Responses
              <span className="material-symbols-outlined text-[12px] text-white/40">arrow_forward</span>
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Codebook */}
      <div className="relative">
        <button
          ref={codebookBtnRef}
          onClick={() => handleClick('codebook', codebookBtnRef)}
          className={`no-drag right-sidebar-btn w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
            activeHoverCard === 'codebook' ? 'text-white bg-white/[0.08]' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Codebook"
        >
          <IconSpan name="code_blocks" />
        </button>

        {activeHoverCard === 'codebook' && cardCoords && createPortal(
          <div
            className={POPCARD_CLASS}
            style={popcardStyle(cardCoords)}
          >
            <div className={POPCARD_HEADER_CLASS}>
              <span className={POPCARD_HEADER_TEXT}>Codebook</span>
            </div>
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
              {vaultItems.filter((i: any) => i.category === 'Codebook').length === 0 ? (
                <span className="text-[10px] text-white/40 px-2 py-1 font-medium font-sans">No code snippets yet</span>
              ) : (
                vaultItems.filter((i: any) => i.category === 'Codebook').slice(0, 8).map((c: any) => (
                  <div key={c.id} className="group flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[15px] text-white/50 shrink-0">code_blocks</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white/80 truncate leading-snug font-sans">{c.title || c.name || 'Untitled'}</span>
                        <span className="text-[9.5px] text-white/45 truncate leading-snug font-sans">{c.fullText?.slice(0, 40)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyText(c.fullText || ''); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-all shrink-0"
                      title="Copy contents"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => { setActiveTab('vault'); setVaultTab('Codebook'); setActiveHoverCard(null); }}
              className="w-full mt-1 py-1.5 bg-[#1A1A1C] hover:bg-white/10 border border-white/[0.04] shadow-sm rounded-lg text-[10px] font-bold tracking-wide text-white/80 transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
            >
              View All Codebook
              <span className="material-symbols-outlined text-[12px] text-white/40">arrow_forward</span>
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Screenshots */}
      <div className="relative">
        <button
          ref={screenshotsBtnRef}
          onClick={() => handleClick('screenshots', screenshotsBtnRef)}
          className={`no-drag right-sidebar-btn w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
            activeHoverCard === 'screenshots' ? 'text-white bg-white/[0.08]' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Screenshots"
        >
          <IconSpan name="photo_library" />
        </button>

        {activeHoverCard === 'screenshots' && cardCoords && createPortal(
          <div
            className={POPCARD_CLASS}
            style={popcardStyle(cardCoords)}
          >
            <div className={POPCARD_HEADER_CLASS}>
              <span className={POPCARD_HEADER_TEXT}>Screenshots</span>
            </div>
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
              {screenshots.length === 0 ? (
                <span className="text-[10px] text-white/40 px-2 py-1 font-medium font-sans">No screenshots yet</span>
              ) : (
                screenshots.slice(0, 6).map((s: any) => (
                  <div key={s.id || s.path} className="group flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[15px] text-white/50 shrink-0">photo_library</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white/80 truncate leading-snug font-sans">{s.title || s.name || 'Screenshot'}</span>
                        <span className="text-[9.5px] text-white/45 truncate leading-snug font-sans">{s.timestamp || ''}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyScreenshot(s); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-all shrink-0"
                      title="Copy screenshot"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => { setActiveTab('vault'); setVaultTab('Screenshots'); setActiveHoverCard(null); }}
              className="w-full mt-1 py-1.5 bg-[#1A1A1C] hover:bg-white/10 border border-white/[0.04] shadow-sm rounded-lg text-[10px] font-bold tracking-wide text-white/80 transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
            >
              View All Screenshots
              <span className="material-symbols-outlined text-[12px] text-white/40">arrow_forward</span>
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Downloads */}
      <div className="relative">
        <button
          id="sidebar-downloads-btn"
          ref={downloadsBtnRef}
          onClick={() => handleClick('downloads', downloadsBtnRef)}
          className={`no-drag right-sidebar-btn w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
            activeHoverCard === 'downloads' ? 'text-white bg-white/[0.08]' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Downloads"
        >
          <IconSpan name="download" />
        </button>

        {activeHoverCard === 'downloads' && cardCoords && createPortal(
          <div
            className={POPCARD_CLASS}
            style={popcardStyle(cardCoords)}
          >
            <div className={POPCARD_HEADER_CLASS}>
              <span className={POPCARD_HEADER_TEXT}>Recent Downloads</span>
            </div>
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
              {recentDownloads.length === 0 ? (
                <span className="text-[10px] text-white/40 px-2 py-1 font-medium font-sans">No recent downloads</span>
              ) : (
                recentDownloads.map((dl: any) => (
                  <div key={dl.id} className="group flex items-center justify-between gap-2.5 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="material-symbols-outlined text-[15px] shrink-0 text-white/50">
                        download
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white/80 truncate leading-snug font-sans">{dl.filename}</span>
                        <span className="text-[8.5px] text-white/30 font-medium font-sans mt-0.5">{new Date(dl.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyDownload(dl); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-all shrink-0"
                      title="Copy file/contents"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => {
                setActiveTab('downloads');
                setActiveHoverCard(null);
              }}
              className="w-full mt-1 py-1.5 bg-[#1A1A1C] hover:bg-white/10 border border-white/[0.04] shadow-sm rounded-lg text-[10px] font-bold tracking-wide text-white/80 transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
            >
              View All Downloads
              <span className="material-symbols-outlined text-[12px] text-white/40">arrow_forward</span>
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* History */}
      <div className="relative">
        <button
          id="sidebar-history-btn"
          ref={historyBtnRef}
          onClick={() => handleClick('history', historyBtnRef)}
          className={`no-drag right-sidebar-btn w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
            activeHoverCard === 'history' ? 'text-white bg-white/[0.08]' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="History"
        >
          <IconSpan name="history" />
        </button>

        {activeHoverCard === 'history' && cardCoords && createPortal(
          <div
            className={POPCARD_CLASS}
            style={popcardStyle(cardCoords)}
          >
            <div className={POPCARD_HEADER_CLASS}>
              <span className={POPCARD_HEADER_TEXT}>Recent History</span>
            </div>
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
              {aiHistory.length === 0 ? (
                <span className="text-[10px] text-white/40 px-2 py-1 font-medium font-sans">No recent history</span>
              ) : (
                aiHistory.slice(0, 5).map((entry) => {
                  const ai = AI_LIST.find((a) => a.id === entry.aiId);
                  return (
                    <button
                      key={entry.id}
                      onClick={() => {
                        if (entry.url) {
                          navigateToBookmark(entry.aiId, entry.url);
                        } else {
                          setActiveAI(entry.aiId);
                        }
                        setActiveHoverCard(null);
                      }}
                      className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer border-none"
                    >
                      <span className="material-symbols-outlined text-[15px] text-white/50 shrink-0">history</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white/80 truncate leading-snug font-sans">{entry.title}</span>
                        <span className="text-[8.5px] text-white/30 font-medium font-sans mt-0.5">{formatTime(entry.timestamp)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <button
              onClick={() => {
                setActiveTab('history');
                setActiveHoverCard(null);
              }}
              className="w-full mt-1 py-1.5 bg-[#1A1A1C] hover:bg-white/10 border border-white/[0.04] shadow-sm rounded-lg text-[10px] font-bold tracking-wide text-white/80 transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
            >
              View All History
              <span className="material-symbols-outlined text-[12px] text-white/40">arrow_forward</span>
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Bookmark */}
      <div className="relative">
        <button
          id="sidebar-bookmark-btn"
          ref={bookmarkBtnRef}
          onClick={() => handleClick('bookmark', bookmarkBtnRef)}
          className={`no-drag right-sidebar-btn w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
            activeHoverCard === 'bookmark' ? 'text-white bg-white/[0.08]' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
          title={t('rightSidebar.bookmarks.viewAll')}
        >
          <IconSpan name="bookmark" />
        </button>

        {activeHoverCard === 'bookmark' && cardCoords && createPortal(
          <div
            className={POPCARD_CLASS}
            style={popcardStyle(cardCoords)}
          >
            <div className={POPCARD_HEADER_CLASS}>
              <span className={POPCARD_HEADER_TEXT}>{t('rightSidebar.bookmarks.title')}</span>
            </div>
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
              {bookmarks.length === 0 ? (
                <span className="text-[10px] text-white/40 px-2 py-1 font-medium font-sans">{t('rightSidebar.bookmarks.noBookmarks')}</span>
              ) : (
                bookmarks.slice(0, 5).map((b) => {
                  const ai = AI_LIST.find((a) => a.id === b.aiId);
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        navigateToBookmark(b.aiId, b.url);
                        setActiveHoverCard(null);
                      }}
                      className="flex items-center justify-between w-full p-1.5 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer border-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5" style={{ color: ai?.color }}>
                          bookmark
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-white/80 truncate leading-snug font-sans">{b.name}</span>
                          <span className="text-[9.5px] text-white/45 truncate leading-snug font-sans">{ai?.name || b.aiId}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <button
              onClick={() => {
                setActiveTab('conversation');
                setConversationTab('Bookmarks');
                setActiveHoverCard(null);
              }}
              className="w-full mt-1 py-1.5 bg-[#1A1A1C] hover:bg-white/10 border border-white/[0.04] shadow-sm rounded-lg text-[10px] font-bold tracking-wide text-white/80 transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
            >
              {t('rightSidebar.bookmarks.viewAll')}
              <span className="material-symbols-outlined text-[12px] text-white/40">arrow_forward</span>
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Divider */}
      <div className="w-5 h-px bg-white/10 my-0.5" />


      {/* Divider */}
      <div className="w-5 h-px bg-white/10 mt-auto mb-0.5 shrink-0" />

      {/* Report Bug */}
      <button
        id="sidebar-bug-btn"
        onClick={() => {
          setActiveTab('report');
        }}
        className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
        title="Report Bug"
      >
        <IconSpan name="bug_report" />
      </button>

      {/* Restart Thred */}
      <button
        onClick={() => {
          if (window.electron?.appRestart) window.electron.appRestart();
        }}
        className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
        title="Restart Thred"
      >
        <IconSpan name="restart_alt" />
      </button>

      {/* Quit Thred */}
      <button
        onClick={() => {
          if (window.electron?.appQuit) window.electron.appQuit();
        }}
        className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
        title="Quit Thred"
      >
        <IconSpan name="power_settings_new" />
      </button>

      {/* Version */}
      <div className="w-7 flex items-center justify-center">
        <span className="text-[8px] text-white/20 font-mono select-none">{t('rightSidebar.version')}</span>
      </div>
    </div>
  );
};

export default RightSidebar;
