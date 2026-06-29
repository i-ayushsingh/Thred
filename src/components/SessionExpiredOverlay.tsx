import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { useStore } from '../store';
import { useT } from '../i18n/context';
import { AI_LIST } from '../shared/ai-list';

export const SessionExpiredOverlay: React.FC = () => {
  const t = useT();
  const {  sessionExpiredOpen,
    setSessionExpiredOpen,
    activeAI,
    setActiveAI  } = useStore(useShallow(state => ({ sessionExpiredOpen: state.sessionExpiredOpen, setSessionExpiredOpen: state.setSessionExpiredOpen, activeAI: state.activeAI, setActiveAI: state.setActiveAI})));

  if (!sessionExpiredOpen) return null;

  const currentAI = AI_LIST.find((ai) => ai.id === activeAI) || {
    name: 'Workspace',
    color: '#FF6B35',
    icon: 'psychology'
  };

  const handleSignInAgain = () => {
    // Reload the active webview, selected by its stable data-ai-id.
    const activeWebview = activeAI
      ? (document.querySelector(`webview[data-ai-id="${activeAI}"]`) as any)
      : null;
    if (activeWebview && typeof activeWebview.reload === 'function') {
      activeWebview.reload();
      undefined;
    } else {
      undefined;
    }
    setSessionExpiredOpen(false);
  };

  const handleClearSession = () => {
    // Clear session and return home
    setActiveAI(null);
    setSessionExpiredOpen(false);
    undefined;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-scale-in">
      <div
        className="w-full max-w-sm glass-panel rounded-xl border border-white/10 shadow-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow behind icon */}
        <div
          className="absolute w-36 h-36 rounded-full blur-[40px] opacity-15 pointer-events-none -top-12 z-0"
          style={{ backgroundColor: currentAI.color }}
        />

        {/* Warning Icon */}
        <div
          className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border mb-4 z-10"
          style={{ borderColor: `${currentAI.color}30` }}
        >
          <span
            className="material-symbols-outlined text-4xl"
            style={{ color: currentAI.color }}
          >
            lock_reset
          </span>
        </div>

        {/* Text */}
        <div className="z-10 mb-6">
          <h2 className="text-lg font-bold text-on-surface font-sans mb-1.5">{t('sessionExpired.title')}</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto font-sans opacity-85">
            Your {currentAI.name} session has expired or requires authentication. Please sign in again to resume your work.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 w-full z-10">
          <button
            onClick={handleSignInAgain}
            className="w-full py-2.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-98 cursor-pointer shadow-md"
            style={{ backgroundColor: currentAI.color }}
          >
            {t('sessionExpired.signInAgain')}
          </button>

          <button
            onClick={handleClearSession}
            className="w-full py-2.5 rounded-lg text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors bg-white/5 border border-white/10 active:scale-98 cursor-pointer"
          >
            {t('sessionExpired.returnHome')}
          </button>
        </div>
      </div>
    </div>
  );
};
export default SessionExpiredOverlay;
