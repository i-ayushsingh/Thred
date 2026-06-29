import { useShallow } from 'zustand/react/shallow';
import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { AI_LIST } from '../shared/ai-list';
import { AIIcon } from './AIIcon';
import { useT } from '../i18n/context';
import { formatRelativeTime } from '../utils/shared-hooks';
import { useConfirm } from './ConfirmDialog';

function getStartOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const GlassCard: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-surface border border-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),_0_4px_12px_rgba(0,0,0,0.2)] rounded-[16px] flex flex-col transition-all duration-300 ${onClick ? 'cursor-pointer hover:bg-[#161618] hover:border-white/[0.06] group' : ''} ${className}`}
  >
    {children}
  </div>
);

export const HistoryView: React.FC = () => {
  const t = useT();
  const { confirm } = useConfirm();
  const {  
    aiHistory, 
    clearAIHistory, 
    setActiveTab, 
    setActiveAI, 
    setSplitAI, 
    setPendingBookmarkUrls, 
    navigateToBookmark,
    setCommandPaletteOpen
   } = useStore(useShallow(state => ({
    aiHistory: state.aiHistory,
    clearAIHistory: state.clearAIHistory,
    setActiveTab: state.setActiveTab,
    setActiveAI: state.setActiveAI,
    setSplitAI: state.setSplitAI,
    setPendingBookmarkUrls: state.setPendingBookmarkUrls,
    navigateToBookmark: state.navigateToBookmark,
    setCommandPaletteOpen: state.setCommandPaletteOpen
   })));
  const [activeFilter, setActiveFilter] = useState('All AIs');

  const AI_FILTERS = useMemo(() => {
    const base = ['All AIs'];
    return [...base, ...AI_LIST.slice(0, 5).map((a) => a.name)];
  }, []);

  const filteredHistory = useMemo(() => {
    let items = aiHistory || [];
    // Keep only chat sessions, exclude opened/changed events
    items = items.filter((h) => h.type === 'chat_create' || h.type === 'chat_access');
    if (activeFilter !== 'All AIs') {
      const ai = AI_LIST.find((a) => a.name === activeFilter);
      if (ai) {
        items = items.filter((h) => h.aiId === ai.id);
      }
    }
    return items;
  }, [aiHistory, activeFilter]);

  const todayItems = useMemo(() => {
    const startOfToday = getStartOfDay(Date.now());
    return filteredHistory
      .filter((e) => e.timestamp >= startOfToday)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredHistory]);

  const yesterdayItems = useMemo(() => {
    const startOfToday = getStartOfDay(Date.now());
    const startOfYesterday = startOfToday - 86_400_000;
    return filteredHistory
      .filter((e) => e.timestamp >= startOfYesterday && e.timestamp < startOfToday)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredHistory]);

  const weekItems = useMemo(() => {
    const startOfWeek = getStartOfDay(Date.now()) - 7 * 86_400_000;
    const startOfYesterday = getStartOfDay(Date.now()) - 86_400_000;
    return filteredHistory
      .filter((e) => e.timestamp >= startOfWeek && e.timestamp < startOfYesterday)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredHistory]);

  const handleHistoryClick = (item: any) => {
    const ai = AI_LIST.find((a) => a.id === item.aiId);
    if (ai) {
      if (item.splitWithAiId && item.splitWithUrl) {
        setPendingBookmarkUrls({
          [item.splitWithAiId]: item.splitWithUrl,
          [item.aiId]: item.url || ai.url
        });
        setActiveAI(item.splitWithAiId);
        setSplitAI(item.aiId);
      } else if (item.splitWithAiId) {
        setActiveAI(item.splitWithAiId);
        setSplitAI(item.aiId);
      } else if (item.url) {
        navigateToBookmark(ai.id, item.url);
      } else {
        setActiveAI(ai.id);
      }
      setActiveTab('home');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-2 relative select-none bg-background z-0 animate-fade-in">
      {/* Background depth radial gradient */}
      <div className="absolute inset-0 pointer-events-none z-[-1]" style={{ background: 'radial-gradient(circle at 70% 10%, var(--accent-muted) 0%, rgba(10,10,10,0) 60%)' }}></div>

      {/* Top Header Bar (Search) */}
      <header className="relative w-full flex items-center justify-between z-10 shrink-0 select-none h-8">
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-full max-w-[440px] px-4">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center justify-between w-full bg-surface border border-white/[0.04] hover:bg-[#1A1A1C] transition-colors px-4 py-2 rounded-[12px] text-left cursor-default focus:outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.02),_0_4px_12px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center gap-3 text-white/30">
              <span className="material-symbols-outlined text-[16px]">search</span>
              <span className="text-[12px] font-sans tracking-wide">{t('profile.search.placeholder') || 'Search or jump to AI...'}</span>
            </div>
            <div className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded flex items-center justify-center shadow-sm">
              <span className="font-mono text-[9px] text-white/40 font-semibold">⌘K</span>
            </div>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar w-full px-12 pt-10 pb-24 z-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-8 w-full">

          {/* Header */}
          <div className="flex flex-col gap-1 items-start w-full animate-fade-in mt-1">
            <h1 className="font-bold text-2xl tracking-tight text-white font-sans drop-shadow-md">{t('conversation.tabs.history') || 'History'}</h1>
            <p className="text-[13px] font-medium text-white/50 font-sans">{t('conversation.history.desc') || 'Your chat session and navigation history across all models'}</p>
          </div>

          <div className="flex flex-col gap-10 w-full pb-12">
            <div className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--bg-primary)_95%,transparent)] backdrop-blur py-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {AI_FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeFilter === f
                        ? 'bg-white/10 text-white border border-white/[0.08]'
                        : 'bg-transparent text-white/40 border border-transparent hover:bg-white/5 hover:text-white/70'
                        }`}
                    >
                      {f === 'All AIs' ? t('conversation.history.allAIs') : f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-[11px] font-bold tracking-wide shrink-0">
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Clear AI History',
                        message: 'Are you sure you want to clear your AI history? This cannot be undone.',
                        confirmLabel: 'Clear History',
                        cancelLabel: 'Cancel',
                        variant: 'danger'
                      });
                      if (ok) {
                        await clearAIHistory();
                      }
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                    Clear History
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              {[
                { label: t('conversation.history.today'), data: todayItems },
                { label: t('conversation.history.yesterday'), data: yesterdayItems },
                { label: t('conversation.history.thisWeek'), data: weekItems }
              ].map(section => (
                <div key={section.label}>
                  <h3 className="text-sm font-bold text-white mb-3">{section.label}</h3>
                  {section.data.length === 0 ? (
                    <GlassCard className="p-6 text-center text-[12px] text-white/40">
                      {t('conversation.history.noSessions')}
                    </GlassCard>
                  ) : (
                    <GlassCard className="overflow-hidden">
                      <div className="flex flex-col divide-y divide-white/[0.04]">
                        {section.data.map(item => {
                          const ai = AI_LIST.find((a) => a.id === item.aiId);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleHistoryClick(item)}
                              className="group flex items-center p-4 hover:bg-[#161618] transition-colors cursor-pointer gap-4"
                            >
                              <div className="w-8 h-8 shrink-0 rounded-lg bg-[#1A1A1C] border border-white/[0.04] flex items-center justify-center shadow-inner animate-pulse-glow">
                                {ai ? (
                                  <AIIcon id={ai.id} className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                ) : (
                                  <span className="material-symbols-outlined text-[14px] text-white/40">smart_toy</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-5 lg:col-span-4">
                                  <h4 className="text-[13px] font-bold text-white/90 group-hover:text-white truncate" title={item.title}>{item.title}</h4>
                                </div>
                                <div className="col-span-4 lg:col-span-5 flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${item.type === 'chat_create' || item.type === 'chat_access'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-white/5 text-white/40 border border-white/10'
                                    }`}>
                                    {item.type === 'chat_create' || item.type === 'chat_access' ? 'Chat' : 'Opened'}
                                  </span>
                                  {item.url && (
                                    <span className="text-[11px] text-white/30 truncate max-w-[120px] lg:max-w-[200px] font-mono">
                                      {(() => {
                                        try {
                                          return new URL(item.url).hostname.replace('www.', '');
                                        } catch {
                                          return item.url;
                                        }
                                      })()}
                                    </span>
                                  )}
                                </div>
                                <div className="col-span-3 flex items-center justify-end gap-6 text-[11px] font-mono text-white/30">
                                  <span>{formatRelativeTime(item.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </GlassCard>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          height: 0px;
          display: none;
        }
        .custom-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default HistoryView;
