import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Bookmark } from '../electron';
import AIIcon from './AIIcon';
import { useT } from '../i18n/context';

// Personalized home components
import EmptyStateCard from './home/EmptyStateCard';
import QuickActionsRow from './home/QuickActionsRow';
import ContinueSection from './home/ContinueSection';

export const HomeView: React.FC = () => {
  const {  userName, aiList, setActiveAI, setActiveTab, vaultItems, navigateToBookmark, aiHistory, setCommandPaletteOpen  } = useStore(useShallow(state => ({ userName: state.userName, aiList: state.aiList, setActiveAI: state.setActiveAI, setActiveTab: state.setActiveTab, vaultItems: state.vaultItems, navigateToBookmark: state.navigateToBookmark, aiHistory: state.aiHistory, setCommandPaletteOpen: state.setCommandPaletteOpen })));
  const t = useT();

  const [pinnedBookmarks, setPinnedBookmarks] = useState<Bookmark[]>([]);
  const [installDate, setInstallDate] = useState<string | null>(null);

  // 1. Fetch config settings for install date
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await window.electron.getConfig();
        if (!cancelled && config?.installDate) {
          setInstallDate(config.installDate);
        }
      } catch {
        // Fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2. Fetch pinned bookmarks on mount
  useEffect(() => {
    (async () => {
      try {
        const all = await window.electron.bookmarksGetAll();
        setPinnedBookmarks(
          all
            .filter(b => b.pinned)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        );
      } catch {
        // Ignore
      }
    })();
  }, []);

  // 3. Calculate user cohort stage at render time
  const stage = useMemo(() => {
    const now = new Date();
    const installed = installDate ? new Date(installDate) : now;
    const days = Math.max(0, Math.floor((now.getTime() - installed.getTime()) / (1000 * 60 * 60 * 24)));
    const sessions = aiHistory.length;
    const vaultCount = vaultItems.length;

    if (days < 1 || sessions < 5 || vaultCount < 1) return 'empty';
    if (days < 14 || sessions < 30) return 'beginner';
    if (sessions < 200) return 'middle';
    return 'veteran';
  }, [installDate, aiHistory.length, vaultItems.length]);

  // 4. Time-aware greeting & custom username split renderer
  const greetingKey = (() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'greetingLateNight';
    if (hour < 12) return 'greetingMorning';
    if (hour < 17) return 'greetingAfternoon';
    if (hour < 22) return 'greetingEvening';
    return 'greetingNight';
  })();

  const renderGreeting = () => {
    const key = greetingKey;
    const text = t(`home.hero.${key}`).replace('{name}', userName);
    
    // Split the translation string around "{name}" to style the display name distinctly
    const parts = text.split('{name}');
    if (parts.length > 1) {
      return (
        <>
          {parts[0]}
          <span style={{ color: 'var(--accent)', textShadow: '0 0 15px color-mix(in srgb, var(--accent) 30%, transparent)' }}>
            {userName}
          </span>
          {parts[1]}
        </>
      );
    }

    return text;
  };

  // Determine visibility states for optional sections
  const showPinned = pinnedBookmarks.length > 0 || stage === 'empty' || stage === 'beginner';

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col text-on-surface w-full h-full relative select-none font-sans bg-background z-0 overflow-y-auto custom-scrollbar animate-fade-in">
      
      {/* Background depth radial gradient */}
      <div className="absolute inset-0 pointer-events-none z-[-1]" style={{ background: 'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 5%, transparent) 0%, rgba(10,10,10,0) 70%)' }}></div>

      <div className="flex-1 flex flex-col justify-start w-full max-w-[1000px] mx-auto px-10 py-10 gap-8 items-center">
        
        {/* Top Header Bar (Date Display) */}
        <header className="relative w-full flex items-center justify-end shrink-0 z-10">
          <div className="flex items-center gap-4 text-white/40 text-[11px] font-bold uppercase tracking-wider">
            <span>{todayFormatted}</span>
          </div>
        </header>

        {/* Chat Input — opens command palette */}
        <div className="flex flex-col items-center w-full max-w-3xl shrink-0 relative z-20 mt-8">
          <div className="w-full bg-[#131315]/80 border border-white/[0.05] backdrop-blur-[12px] rounded-2xl p-2 shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-colors duration-200 focus-within:border-white/10 relative">
            <div className="flex items-center bg-[#111111]/90 rounded-xl px-4 py-2.5 relative">
              <input
                type="text"
                onFocus={() => setCommandPaletteOpen(true)}
                className="flex-1 bg-transparent border-none text-on-surface placeholder:text-white/20 focus:ring-0 font-sans text-sm focus:outline-none cursor-text"
                placeholder={t('commandPalette.search.placeholder')}
                readOnly
              />
              <div className="flex items-center gap-1.5 text-white/40">
                <span className="text-[10px] font-mono font-bold text-white/20 border border-white/10 rounded px-1.5 py-0.5">Ctrl+K</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="w-full flex flex-col items-center gap-8">
            <>
              {/* Greeting */}
              <h1 className="font-extrabold tracking-tight text-white text-[32px] mb-4 text-center w-full max-w-3xl leading-tight">
                {renderGreeting()}
              </h1>

              {/* Quick Actions row */}
              <div className="w-full max-w-5xl">
                <QuickActionsRow />
              </div>

              {/* Continue & Pinned Bookmarks */}
              <div className="grid grid-cols-2 gap-6 items-stretch shrink-0 w-full max-w-5xl">
                {/* Left Col: Continue */}
                <ContinueSection />

                {/* Right Col: Pinned Bookmarks */}
                {showPinned && (
                    <div className="flex flex-col w-full select-none">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 uppercase tracking-widest">
                          <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--accent)' }}>push_pin</span>
                          <span>{t('home.pinned.title')}</span>
                        </div>
                        <button
                          onClick={() => setActiveTab('vault')}
                          className="text-[10px] font-bold text-white/30 hover:text-white/70 uppercase tracking-widest transition-colors focus:outline-none cursor-pointer"
                        >
                          {t('home.pinned.manage')}
                        </button>
                      </div>

                      <div className="bg-[#131315]/80 border border-white/[0.05] shadow-[0_4px_12px_rgba(0,0,0,0.25)] rounded-2xl p-5 flex-1 flex flex-col justify-start">
                        {pinnedBookmarks.length === 0 ? (
                          <EmptyStateCard
                            icon="push_pin"
                            title={t('home.pinned.empty')}
                            description={t('home.pinned.emptyCTA')}
                            actionText="Pin a conversation"
                            onAction={() => setActiveTab('vault')}
                          />
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {pinnedBookmarks.slice(0, 6).map(pin => {
                              const aiId = pin.aiId || 'chatgpt';
                              return (
                                <div
                                  key={pin.id}
                                  onClick={() => navigateToBookmark(pin.aiId || 'chatgpt', pin.url)}
                                  className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/10 shadow-sm transition-all rounded-xl p-3 flex items-center gap-3 cursor-pointer group"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                                    <AIIcon id={aiId} className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-bold text-white/90 truncate">{pin.name}</h4>
                                    <span className="text-[9px] text-white/40 block mt-0.5 truncate">
                                      {new Date(pin.createdAt || 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </>
          </div>
        </div>

      {/* Embedded custom scrollbar styles to hide standard chrome scroll bars */}
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

export default HomeView;
