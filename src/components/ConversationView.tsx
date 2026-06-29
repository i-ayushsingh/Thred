import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { AI_LIST, normalizeAiId } from '../shared/ai-list';
import { Bookmark } from '../electron';
import { AIIcon } from './AIIcon';
import { BookmarkPopover } from './BookmarkPopover';
import { useT } from '../i18n/context';

type SortMode = 'pinned' | 'recent' | 'name';
type FilterTab = 'all' | 'pinned' | 'sidebar' | string;

const UNIQUE_AI_IDS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok', 'deepseek', 'mistral', 'kimi'];

export const ConversationView: React.FC = () => {
  const t = useT();
  const {  navigateToBookmark, setCommandPaletteOpen, refreshSidebarBookmarks  } = useStore(useShallow(state => ({ navigateToBookmark: state.navigateToBookmark, setCommandPaletteOpen: state.setCommandPaletteOpen, refreshSidebarBookmarks: state.refreshSidebarBookmarks })));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editBookmark, setEditBookmark] = useState<Bookmark | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const b = await window.electron.bookmarksGetAll();
      setBookmarks(b);
    } catch (e) {
      console.error('[ConversationView] Failed to load bookmarks:', e);
    }
  };

  useEffect(() => { refresh(); }, []);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    await Promise.all(Array.from(selectedIds).map(id => window.electron.bookmarksRemove(id)));
    await refresh();
    undefined;
    clearSelection();
  };

  const handleBulkUnpin = async () => {
    await Promise.all(Array.from(selectedIds).map(id => window.electron.bookmarksTogglePin(id)));
    await refresh();
    undefined;
    clearSelection();
  };

  const filteredBookmarks = useMemo(() => {
    let items = bookmarks;
    if (activeTab === 'pinned') {
      items = items.filter((b) => b.pinned);
    } else if (activeTab === 'sidebar') {
      items = items.filter((b: any) => b.sidebar);
    } else if (activeTab !== 'all') {
      const targetId = normalizeAiId(activeTab);
      items = items.filter((b) => normalizeAiId(b.aiId) === targetId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => {
      const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [bookmarks, activeTab, searchQuery]);

  const getTabCount = (tab: FilterTab) => {
    if (tab === 'all') return bookmarks.length;
    if (tab === 'pinned') return bookmarks.filter((b) => b.pinned).length;
    if (tab === 'sidebar') return bookmarks.filter((b: any) => b.sidebar).length;
    const targetId = normalizeAiId(tab);
    return bookmarks.filter((b) => normalizeAiId(b.aiId) === targetId).length;
  };

  const allTabs: FilterTab[] = ['sidebar', 'pinned', 'all', ...UNIQUE_AI_IDS];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (filteredBookmarks.length === 0) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev === null ? 0 : Math.min(prev + 1, filteredBookmarks.length - 1);
          requestAnimationFrame(() => {
            const cards = gridRef.current?.querySelectorAll('[data-bm-idx]');
            (cards?.[next] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
          return next;
        });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev === null ? filteredBookmarks.length - 1 : Math.max(prev - 1, 0);
          requestAnimationFrame(() => {
            const cards = gridRef.current?.querySelectorAll('[data-bm-idx]');
            (cards?.[next] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
          return next;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (focusedIndex !== null && filteredBookmarks[focusedIndex]) {
          e.preventDefault();
          const bm = filteredBookmarks[focusedIndex];
          const tid = normalizeAiId(bm.aiId);
          navigateToBookmark(tid, bm.url);
          undefined;
        }
      } else if (e.key === 'Escape') {
        if (selectedIds.size > 0) {
          clearSelection();
        } else {
          setFocusedIndex(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredBookmarks, focusedIndex, selectedIds.size, navigateToBookmark, clearSelection]);

  return (
    <div className="flex-1 w-full h-full animate-fade-in relative z-10 overflow-hidden bg-background">
      {editBookmark && (
        <BookmarkPopover
          aiId=""
          currentUrl=""
          editBookmark={editBookmark}
          onClose={() => { setEditBookmark(null); refresh(); }}
          position={{ right: '16', top: '80' }}
        />
      )}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 70% 10%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, color-mix(in srgb, var(--accent) 1.5%, transparent) 30%, transparent 60%)'
        }}
      />
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        <div className="flex items-center justify-between px-12 py-6 shrink-0 border-b border-transparent">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white tracking-wide">{t('conversation.bookmarks.title')}</h1>
            <p className="text-[13px] font-medium text-white/50 tracking-wide">
              {bookmarks.length} saved {bookmarks.length === 1 ? 'chat' : 'chats'}.
            </p>
          </div>
          <div className="flex-1 max-w-xs relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg group-hover:text-white/60 transition-colors">search</span>
            <input
              type="text"
              readOnly
              onFocus={() => setCommandPaletteOpen(true)}
              placeholder={t('conversation.search.placeholder')}
              className="w-full bg-surface border border-white/[0.04] text-white text-sm rounded-[14px] pl-11 pr-12 py-2.5 focus:outline-none focus:[border-color:color-mix(in_srgb,var(--accent)_40%,transparent)] focus:bg-[#161618] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.03),_0_2px_8px_rgba(0,0,0,0.2)] placeholder:text-white/30 cursor-pointer"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] text-white/40 font-mono">⌘K</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-12 pb-12">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-1.5 flex-wrap">
              {allTabs.map((tab) => {
                const count = getTabCount(tab);
                if (count === 0 && tab !== 'all' && tab !== 'pinned' && tab !== 'sidebar') return null;
                const isActive = activeTab === tab;
                const isSpecial = tab === 'pinned' || tab === 'sidebar' || tab === 'all';
                const ai = !isSpecial ? AI_LIST.find((a) => a.id === normalizeAiId(tab)) : null;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      isActive
                        ? 'bg-white/10 text-white border border-white/[0.08]'
                        : 'bg-transparent text-white/40 border border-transparent hover:bg-white/5 hover:text-white/60'
                    }`}
                  >
                    {ai && <AIIcon id={ai.id} className="w-3 h-3" style={{ color: isActive ? 'var(--accent)' : undefined }} />}
                    {tab === 'sidebar' ? 'Sidebar' : tab === 'pinned' ? 'Pinned' : tab === 'all' ? 'All' : ai?.name || tab}
                    <span className="text-[9px] text-white/25">{count}</span>
                  </button>
                );
              })}
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1A1A1C] border border-white/[0.06] rounded-[12px]">
                <span className="text-[11px] font-bold text-white/90">{selectedIds.size} selected</span>
                <button onClick={clearSelection} className="text-[10px] text-white/40 hover:text-white/70 transition-colors">Clear</button>
                <div className="flex-1" />
                <button onClick={handleBulkUnpin} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 transition-all flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">push_pin</span>Unpin
                </button>
                <button onClick={handleBulkDelete} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] transition-all flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">delete</span>Delete
                </button>
                <button onClick={clearSelection} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/50 transition-all">Cancel</button>
              </div>
            )}

            {filteredBookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-white/20 text-[24px]">bookmark_add</span>
                </div>
                <p className="text-[13px] text-white/40 font-semibold">
                  {searchQuery || activeTab !== 'all' ? t('conversation.bookmarks.noMatching') : t('conversation.bookmarks.noBookmarks')}
                </p>
                <p className="text-[11px] text-white/25 mt-1">
                  {searchQuery || activeTab !== 'all' ? t('conversation.bookmarks.tryDifferent') : t('conversation.bookmarks.useIcon')}
                </p>
              </div>
            ) : (
              <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3" role="grid" aria-label="Bookmark list">
                {filteredBookmarks.map((bm, idx) => {
                  const targetAiId = normalizeAiId(bm.aiId);
                  const ai = AI_LIST.find((a) => a.id === targetAiId);
                  const domain = (() => { try { return new URL(bm.url).hostname.replace(/^www\./, ''); } catch { return bm.url; } })();
                  const isSelected = selectedIds.has(bm.id);
                  const isHovered = hoveredId === bm.id;
                  const isFocused = focusedIndex === idx;
                  return (
                    <div
                      key={bm.id}
                      data-bm-idx={idx}
                      role="gridcell"
                      tabIndex={isFocused ? 0 : -1}
                      aria-selected={isSelected}
                      aria-label={`${bm.name} - ${domain}`}
                      className={`relative bg-[#161618] border border-white/[0.06] rounded-[14px] p-3 flex items-center justify-between gap-3 cursor-pointer transition-all outline-none hover:border-white/[0.12] ${isFocused ? 'ring-1 ring-white/30' : ''} ${shakingId === bm.id ? 'animate-shake' : ''}`}
                      onClick={() => {
                        if (selectedIds.size > 0) {
                          toggleSelect(bm.id, { stopPropagation: () => {} } as React.MouseEvent);
                        } else {
                          navigateToBookmark(targetAiId, bm.url);
                          undefined;
                        }
                      }}
                      onMouseEnter={() => setHoveredId(bm.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Left: Icon, Name and Domain */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${bm.pinned ? 'border-[var(--accent)]/40' : 'border-white/[0.04]'} bg-[#1A1A1C] overflow-hidden`}>
                            {ai ? (
                              <AIIcon id={ai.id} className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            ) : (
                              <span className="material-symbols-outlined text-[12px] text-white/30">bookmark</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[12px] font-semibold text-white/90 truncate" title={bm.name}>{bm.name}</h4>
                          <div className="text-[10px] text-white/35 truncate mt-0.5" title={domain}>{domain}</div>
                        </div>
                      </div>

                      {/* Right: Actions and Selection */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Hover actions */}
                        <div className={`flex items-center gap-1 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const result = await window.electron.bookmarksTogglePin(bm.id);
                              if (result && (result as any).limitReached) {
                                setShakingId(bm.id);
                                setTimeout(() => setShakingId(null), 500);
                                return;
                              }
                              await refresh();
                            }}
                            aria-label={bm.pinned ? "Unpin bookmark" : "Pin bookmark"}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${bm.pinned ? 'text-[var(--accent)]' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
                          >
                            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: bm.pinned ? '"FILL" 1' : '"FILL" 0' }}>push_pin</span>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const result = await window.electron.bookmarksToggleSidebar(bm.id);
                              if (result && (result as any).limitReached) {
                                setShakingId(bm.id);
                                setTimeout(() => setShakingId(null), 500);
                                return;
                              }
                              await refresh();
                              refreshSidebarBookmarks();
                            }}
                            aria-label={(bm as any).sidebar ? "Remove from sidebar" : "Add to sidebar"}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${(bm as any).sidebar ? 'text-[var(--accent)]' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
                          >
                            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: (bm as any).sidebar ? '"FILL" 1' : '"FILL" 0' }}>web_asset</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditBookmark(bm); }}
                            aria-label="Edit bookmark"
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await window.electron.bookmarksRemove(bm.id);
                              await refresh();
                              undefined;
                            }}
                            aria-label="Delete bookmark"
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-[#EF4444] hover:bg-white/5 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                          </button>
                        </div>

                        {/* Selection check indicator */}
                        <button
                          onClick={(e) => toggleSelect(bm.id, e)}
                          aria-checked={isSelected}
                          role="checkbox"
                          className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[var(--accent)] border-[var(--accent)]'
                              : 'border-white/15 hover:border-white/30'
                          }`}
                        >
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1 4L3 6L7 2" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationView;
