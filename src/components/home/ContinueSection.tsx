import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n/context';
import AIIcon from '../AIIcon';
import { formatRelativeTime } from '../../utils/shared-hooks';
import EmptyStateCard from './EmptyStateCard';

export const ContinueSection: React.FC = () => {
  const t = useT();
  const {  aiHistory, navigateToBookmark, setActiveTab, setActiveAI  } = useStore(useShallow(state => ({ aiHistory: state.aiHistory, navigateToBookmark: state.navigateToBookmark, setActiveTab: state.setActiveTab, setActiveAI: state.setActiveAI })));

  // Filter and deduplicate recent chat history events
  const recentChats = React.useMemo(() => {
    const unique: typeof aiHistory = [];
    const seen = new Set<string>();

    for (const entry of aiHistory) {
      if ((entry.type === 'chat_access' || entry.type === 'chat_create') && entry.url) {
        const key = entry.chatId || entry.url;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(entry);
        }
      }
    }
    return unique.slice(0, 6); // Top 6 most recent unique chats
  }, [aiHistory]);

  return (
    <div className="flex flex-col w-full select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--accent)' }}>
            history
          </span>
          <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">{t('home.continue.title')}</h3>
        </div>
        {recentChats.length > 0 && (
          <button
            onClick={() => {
              setActiveTab('history');
            }}
            className="text-[10px] font-bold text-white/30 hover:text-white/70 uppercase tracking-widest transition-colors focus:outline-none"
          >
            {t('home.continue.viewAll')}
          </button>
        )}
      </div>

      <div className="bg-[#131315]/80 border border-white/[0.05] shadow-[0_4px_12px_rgba(0,0,0,0.25)] rounded-2xl p-4 flex-1 flex flex-col justify-start">
        {recentChats.length === 0 ? (
          <EmptyStateCard
            icon="history"
            title="No conversations yet"
            description="Start a chat with any AI to see your recent sessions here."
            actionText="Open an AI"
            onAction={() => setActiveAI('chatgpt')}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recentChats.map(chat => {
              return (
                <div
                  key={chat.id}
                  onClick={() => navigateToBookmark(chat.aiId, chat.url || '')}
                  className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/10 shadow-sm transition-all rounded-xl p-2.5 flex items-center justify-center gap-2.5 cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-center shrink-0 shadow-inner">
                    <AIIcon id={chat.aiId} className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0 text-center">
                    <h4 className="text-[11px] font-bold text-white/90 truncate">{chat.title || 'Untitled Chat'}</h4>
                    <span className="text-[9px] text-white/40 block mt-0.5 truncate">
                      {formatRelativeTime(chat.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContinueSection;
