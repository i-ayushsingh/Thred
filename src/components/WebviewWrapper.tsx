import React, { useEffect, useRef, useState } from 'react';
import { AIConfig } from '../shared/ai-list';
import { useStore } from '../store';
import { useT } from '../i18n/context';
import { AIIcon } from './AIIcon';
import { useShallow } from 'zustand/react/shallow';

interface ParsedURL {
  isChat: boolean;
  chatId: string | null;
}

function parseAiUrl(aiId: string, urlString: string): ParsedURL {
  try {
    const url = new URL(urlString);
    const path = url.pathname;
    
    if (aiId === 'chatgpt') {
      const match = path.match(/^\/c\/([a-zA-Z0-9-]+)/);
      if (match) return { isChat: true, chatId: match[1] };
    } else if (aiId === 'claude') {
      const match = path.match(/^\/chat\/([a-zA-Z0-9-]+)/);
      if (match) return { isChat: true, chatId: match[1] };
    } else if (aiId === 'gemini') {
      const match = path.match(/^\/app\/([a-f0-9]+)/) || path.match(/^\/app\/([a-zA-Z0-9-_]+)/);
      if (match && match[1] !== 'new') return { isChat: true, chatId: match[1] };
    } else if (aiId === 'perplexity') {
      const match = path.match(/^\/search\/([a-zA-Z0-9-_]+)/);
      if (match) return { isChat: true, chatId: match[1] };
    } else if (aiId === 'deepseek') {
      const match = path.match(/^\/a\/chat\/s\/([a-zA-Z0-9-_]+)/) || path.match(/^\/chat\/([a-zA-Z0-9-_]+)/);
      if (match) return { isChat: true, chatId: match[1] };
    } else if (aiId === 'grok') {
      const match = path.match(/^\/chat\/([a-zA-Z0-9-_]+)/) || path.match(/^\/share\/([a-zA-Z0-9-_]+)/);
      if (match) return { isChat: true, chatId: match[1] };
    } else if (aiId === 'kimi') {
      const match = path.match(/^\/chat\/([a-zA-Z0-9-_]+)/);
      if (match) return { isChat: true, chatId: match[1] };
    } else if (aiId === 'mistral') {
      const match = path.match(/^\/chat\/([a-zA-Z0-9-_]+)/);
      if (match) return { isChat: true, chatId: match[1] };
    } else if (aiId === 'huggingchat') {
      const match = path.match(/^\/chat\/conversation\/([a-zA-Z0-9-_]+)/) || path.match(/^\/chat\/r\/([a-zA-Z0-9-_]+)/);
      if (match) return { isChat: true, chatId: match[1] };
    }

    // Generic fallback:
    const genericMatch = path.match(/\/(?:c|chat|chats|search|app|conversation|r)\/([a-zA-Z0-9-_]{4})/);
    if (genericMatch) {
      return { isChat: true, chatId: genericMatch[1] };
    }
  } catch (e) {
    // Malformed URL — fall through to the non-chat result.
  }
  return { isChat: false, chatId: null };
}

interface WebviewWrapperProps {

  ai: AIConfig;
  isActive: boolean;
  className?: string;
  isSplitMode?: boolean;
}

const WebviewWrapper: React.FC<WebviewWrapperProps> = ({ ai, isActive, className = '', isSplitMode = false }) => {
  const t = useT();
  const webviewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const hasLoadedOnce = useRef(false);
  const {  preferences, zoomLevels, openedAIs, setAIOpened, pendingBookmarkUrls, clearPendingBookmarkUrl, logAIHistory, updateAIHistoryTitle  } = useStore(useShallow(state => ({ preferences: state.preferences, zoomLevels: state.zoomLevels, openedAIs: state.openedAIs, setAIOpened: state.setAIOpened, pendingBookmarkUrls: state.pendingBookmarkUrls, clearPendingBookmarkUrl: state.clearPendingBookmarkUrl, logAIHistory: state.logAIHistory, updateAIHistoryTitle: state.updateAIHistoryTitle })));

  const initialUrlRef = useRef<string>('');
  if (!initialUrlRef.current) {
    if (pendingBookmarkUrls[ai.id]) {
      initialUrlRef.current = pendingBookmarkUrls[ai.id];
    } else {
      const opened = openedAIs[ai.id] === true;
      if (!opened) {
        initialUrlRef.current = ai.loginUrl || ai.url;
        setAIOpened(ai.id, true); // Mark as opened
      } else {
        initialUrlRef.current = ai.url;
      }
    }
  }

  // --- Bookmark URL navigation ---
  // When the user clicks a bookmark, the store sets pendingBookmarkUrls.
  // We pick it up here once the webview is active and ready, load the URL, then clear it.
  useEffect(() => {
    const targetUrl = pendingBookmarkUrls[ai.id];
    if (!targetUrl) return;
    const webview = webviewRef.current;
    if (!webview) return;

    // Guard against callbacks firing after cleanup / unmount. Every timer is
    // tracked and cleared on cleanup, and doLoad bails if the effect is stale.
    let cancelled = false;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    let safetyTimeout: ReturnType<typeof setTimeout> | undefined;

    const doLoad = () => {
      if (cancelled) return;
      try {
        webview.loadURL(targetUrl);
      } catch (_) { /* ignored */ }
      clearPendingBookmarkUrl(ai.id);
    };

    // Check if the webview is already loaded (has completed at least one page load)
    // by checking if getURL() returns a real URL (not empty or about:blank)
    let currentUrl = '';
    try { currentUrl = typeof webview.getURL === 'function' ? webview.getURL() : ''; } catch (_) { /* ignored */ }

    if (currentUrl && currentUrl !== '' && !currentUrl.startsWith('about:')) {
      // Webview is already loaded — we can navigate immediately
      // Use a short delay to ensure any pending React state updates have flushed
      loadTimer = setTimeout(doLoad, 50);

      return () => {
        cancelled = true;
        if (loadTimer) clearTimeout(loadTimer);
      };
    } else {
      // Webview is freshly mounting — wait for its initial page to finish loading,
      // then override with the bookmark URL
      const handleInitialLoad = () => {
        webview.removeEventListener('did-stop-loading', handleInitialLoad);
        // Wait a tick so the webview is fully settled before we redirect
        loadTimer = setTimeout(doLoad, 100);
      };
      webview.addEventListener('did-stop-loading', handleInitialLoad);

      // Safety: if the event never fires (e.g. load error), clean up after 5s
      safetyTimeout = setTimeout(() => {
        webview.removeEventListener('did-stop-loading', handleInitialLoad);
        doLoad();
      }, 5000);

      return () => {
        cancelled = true;
        if (loadTimer) clearTimeout(loadTimer);
        if (safetyTimeout) clearTimeout(safetyTimeout);
        webview.removeEventListener('did-stop-loading', handleInitialLoad);
      };
    }
  }, [pendingBookmarkUrls, ai.id, clearPendingBookmarkUrl]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    // Explicitly set DOM attribute for custom element compatibility
    webview.setAttribute('allowpopups', 'true');

    const handleStartLoading = () => {
      if (!hasLoadedOnce.current) {
        setIsLoading(true);
        setIsError(false);
      }
    };

    const handleStopLoading = () => {
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        // Small timeout to give it a premium, smooth transition fade
        setTimeout(() => {
          setIsLoading(false);
        }, 600);
      }
    };

    const handleFailLoad = (e: any) => {
      // Ignore cancellations or code -3 (which happens on redirections sometimes)
      if (e.errorCode !== -3 && e.errorCode !== -2) {
        if (!hasLoadedOnce.current) {
          setIsError(true);
          setIsLoading(false);
          undefined;
        }
      }
    };

    const handleDomReady = () => {
      if (!webview) return;
      webview.executeJavaScript(`
        try {
          localStorage.setItem('theme', 'dark');
          localStorage.setItem('darkMode', 'true');
          localStorage.setItem('color-theme', 'dark');
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');

          const STYLE_ID = 'thred-forced-dark-mode';

          function isSiteDark() {
            const r = document.documentElement;
            const b = document.body;
            if (r.classList.contains('dark') || r.matches('[class*="dark"]') ||
                r.getAttribute('data-theme') === 'dark' ||
                r.getAttribute('data-color-mode') === 'dark' ||
                r.getAttribute('data-dark-mode') === 'true' ||
                r.getAttribute('data-bs-theme') === 'dark') return true;
            if (b.classList.contains('dark') || b.matches('[class*="dark"]') ||
                b.getAttribute('data-theme') === 'dark' ||
                b.getAttribute('data-bs-theme') === 'dark') return true;
            return false;
          }

          function isContentDark() {
            const bg = getComputedStyle(document.body).backgroundColor;
            const m = bg && bg.match(/\\\\d+/g);
            if (m && m.length >= 3) {
              const brightness = (parseInt(m[0]) * 299 + parseInt(m[1]) * 587 + parseInt(m[2]) * 114) / 1000;
              return brightness < 160;
            }
            return null;
          }

          function updateDarkMode() {
            const siteDark = isSiteDark();
            const contentDark = isContentDark();
            const isDark = siteDark || (contentDark === true && !siteDark);
            const style = document.getElementById(STYLE_ID);

            if (!isDark && !style) {
              const s = document.createElement('style');
              s.id = STYLE_ID;
              s.textContent = \`
                html { filter: invert(1) hue-rotate(180deg) !important; background: #121214 !important; }
                img, video, iframe, canvas, svg, picture { filter: invert(1) hue-rotate(180deg) !important; }
              \`;
              document.head.appendChild(s);
            } else if (isDark && style) {
              style.remove();
            }
          }

          setTimeout(updateDarkMode, 1500);
          setTimeout(updateDarkMode, 3000);

          const attrObs = new MutationObserver(updateDarkMode);
          attrObs.observe(document.documentElement, { attributes: true });
          attrObs.observe(document.body, { attributes: true });
          try { attrObs.observe(document.head, { childList: true }); } catch (_e) { /* ignore */ }

          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDarkMode);
        } catch (_e) { /* ignore */ }
      `).catch((err: any) => {
        // Injection can fail if the page navigated away mid-execute; surface
        // it at debug level rather than swallowing it entirely.
        // dark-mode injection failed
      });
    };



    const handleNavigation = () => {
      try {
        const currentUrl = webview.getURL();
        if (!currentUrl) return;
        const parsed = parseAiUrl(ai.id, currentUrl);
        if (parsed.isChat && parsed.chatId) {
          const storeState = useStore.getState();
          const isSplit = storeState.activeAI !== null && storeState.splitAI !== null;
          
          let title = webview.getTitle() || 'Chat';
          let otherAiId: string | undefined;
          let otherUrl: string | undefined;
          
          if (isSplit) {
            otherAiId = storeState.activeAI === ai.id ? storeState.splitAI! : storeState.activeAI!;
            const otherWebviewEl = document.querySelector(`webview[data-ai-id="${otherAiId}"]`) as any;
            if (otherWebviewEl) {
              try {
                const otherUrlString = otherWebviewEl.getURL();
                if (otherUrlString) {
                  const otherParsed = parseAiUrl(otherAiId, otherUrlString);
                  if (otherParsed.isChat) {
                    otherUrl = otherUrlString;
                    const otherTitle = otherWebviewEl.getTitle() || 'Chat';
                    if (storeState.activeAI === ai.id) {
                      title = `${title} vs ${otherTitle}`;
                    } else {
                      title = `${otherTitle} vs ${title}`;
                    }
                  }
                }
              } catch (_) { /* ignored */ }
            }
          }

          const history = storeState.aiHistory || [];
          const exists = history.some(item => item.chatId === parsed.chatId);
          if (!exists) {
            // New chat created
            void logAIHistory({
              aiId: ai.id,
              type: 'chat_create',
              title: title,
              url: currentUrl,
              chatId: parsed.chatId,
              splitWithAiId: otherAiId,
              splitWithUrl: otherUrl});
          } else {
            // Existing chat accessed
            const lastForAi = history.find(item => item.aiId === ai.id);
            if (!lastForAi || lastForAi.chatId !== parsed.chatId) {
              void logAIHistory({
                aiId: ai.id,
                type: 'chat_access',
                title: title,
                url: currentUrl,
                chatId: parsed.chatId,
                splitWithAiId: otherAiId,
                splitWithUrl: otherUrl});
            }
          }
        }
      } catch (_) { /* ignored */ }
    };

    const handleTitleUpdated = (e: any) => {
      try {
        const currentUrl = webview.getURL();
        if (!currentUrl) return;
        const parsed = parseAiUrl(ai.id, currentUrl);
        if (parsed.isChat && parsed.chatId && e.title) {
          const genericNames = ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok', 'deepseek', 'kimi', 'mistral', 'huggingface', 'huggingchat', 'new chat'];
          const lowerTitle = e.title.toLowerCase();
          const isGeneric = genericNames.some(name => lowerTitle === name || lowerTitle.includes('login') || lowerTitle.includes('sign in'));
          if (!isGeneric) {
            const storeState = useStore.getState();
            const isSplit = storeState.activeAI !== null && storeState.splitAI !== null;
            let finalTitle = e.title;

            if (isSplit) {
              const otherAiId = storeState.activeAI === ai.id ? storeState.splitAI! : storeState.activeAI!;
              const otherWebviewEl = document.querySelector(`webview[data-ai-id="${otherAiId}"]`) as any;
              if (otherWebviewEl) {
                try {
                  const otherUrlString = otherWebviewEl.getURL();
                  if (otherUrlString) {
                    const otherParsed = parseAiUrl(otherAiId, otherUrlString);
                    if (otherParsed.isChat) {
                      const otherTitle = otherWebviewEl.getTitle() || 'Chat';
                      if (storeState.activeAI === ai.id) {
                        finalTitle = `${e.title} vs ${otherTitle}`;
                      } else {
                        finalTitle = `${otherTitle} vs ${e.title}`;
                      }
                    }
                  }
                } catch (err) {
                  // Reading the split-partner webview can fail if it was torn
                  // down; keep the un-decorated title and log at debug level.
                  // Could not read split partner title
                }
              }
            }
            void updateAIHistoryTitle(parsed.chatId, finalTitle);
          }
        }
      } catch (_) { /* ignored */ }
    };

    // Attach event listeners
    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-fail-load', handleFailLoad);
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleNavigation);
    webview.addEventListener('did-navigate-in-page', handleNavigation);
    webview.addEventListener('page-title-updated', handleTitleUpdated);


    // Register the webview with the main process so it can receive zoom
    // commands and the AI's stored zoom is restored on attach.
    const handleRegisterZoom = () => {
      try {
        if (typeof webview.getWebContentsId === 'function' && window.electron?.registerWebview) {
          const wcId = webview.getWebContentsId();
          window.electron.registerWebview({ aiId: ai.id, webContentsId: wcId });
        }
      } catch {
        // Ignore
      }
    };
    webview.addEventListener('dom-ready', handleRegisterZoom);
    // Some webviews can also be queried after attach
    if (typeof (webview as any).getWebContentsId === 'function') {
      try { handleRegisterZoom(); } catch {
        // Ignore
      }
    }

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-fail-load', handleFailLoad);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('dom-ready', handleRegisterZoom);
      webview.removeEventListener('did-navigate', handleNavigation);
      webview.removeEventListener('did-navigate-in-page', handleNavigation);
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
    };
  }, [ai.name, ai.id, logAIHistory, updateAIHistoryTitle]);

  // Apply the AI's zoom factor whenever it changes (covers initial mount,
  // tab switching, and external updates from keyboard shortcuts).
  useEffect(() => {
    const factor = zoomLevels[ai.id];
    if (typeof factor !== 'number') return;
    const w = webviewRef.current;
    if (!w || typeof w.setZoomFactor !== 'function') return;
    try { w.setZoomFactor(factor); } catch {
      // Ignore
    }
  }, [zoomLevels, ai.id, isActive]);

  const handleReload = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${className || 'w-full h-full'} ${isActive ? 'flex' : 'hidden'} ${isSplitMode ? 'rounded-2xl shadow-2xl border border-white/10 ring-1 ring-black/50' : 'rounded-b-[16px]'}`}
    >
      <style>{`
        @keyframes customProgress {
          0% { width: 0%; left: 0%; }
          50% { width: 40%; left: 30%; }
          100% { width: 0%; left: 100%; }
        }
        .animate-progress-bar {
          animation: customProgress 2s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.9; box-shadow: 0 0 25px 0px var(--brand-color-alpha-20); }
          50% { opacity: 0.7; box-shadow: 0 0 45px 15px var(--brand-color-alpha-40); }
        }
        .animate-pulse-glow {
          animation: pulseGlow 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0e0e10] select-none pointer-events-none"
          style={{
            '--brand-color': ai.color,
            '--brand-color-alpha-20': `${ai.color}30`,
            '--brand-color-alpha-40': `${ai.color}50`
          } as React.CSSProperties}
        >
          {/* Animated Loading Bar (Top) */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden">
            <div
              className="absolute h-full rounded animate-progress-bar"
              style={{ backgroundColor: ai.color }}
            />
          </div>

          {/* Centered Loading State */}
          <div className="flex flex-col items-center gap-6">
            {/* Pulsing Glow Logo Container */}
            <div
              className="w-18 h-18 rounded-full bg-white/[0.03] border flex items-center justify-center animate-pulse-glow"
              style={{ borderColor: `${ai.color}25` }}
            >
              <AIIcon
                id={ai.id}
                className="w-9 h-9"
                style={{ color: ai.color }}
              />
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <span className="font-bold text-sm text-on-surface font-sans uppercase tracking-widest opacity-95">
                {t('webview.loading').replace('{name}', ai.name)}
              </span>
              <span className="text-[10px] text-on-surface-variant font-mono opacity-50">
                {t('webview.establishingSession')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {isError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0e0e10] p-8 text-center select-none border border-white/5">
          <div
            className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-red-500/20 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
          >
            <span className="material-symbols-outlined text-red-400 text-3xl">cloud_off</span>
          </div>
          <h2 className="text-lg font-bold text-on-surface mb-2 font-sans">{t('webview.connectionFailed')}</h2>
          <p className="text-xs text-on-surface-variant max-w-sm mb-6 leading-relaxed font-sans opacity-70">
            {t('webview.unableToConnect').replace('{name}', ai.name)}
          </p>
          <button
            onClick={handleReload}
            className="px-5 py-2.5 rounded-lg font-semibold text-xs font-sans flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
            style={{
              backgroundColor: `${ai.color}15`,
              color: ai.color,
              border: `1px solid ${ai.color}30`
            }}
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            {t('webview.tryAgain')}
          </button>
        </div>
      )}

      <webview
        ref={webviewRef}
        src={initialUrlRef.current}
        data-ai-id={ai.id}
        partition={`persist:${ai.id}`}
        allowpopups={"true" as any}
        preload={(window as any).electron?.preloadPath}
        webpreferences="contextIsolation=true,nodeIntegration=false"
        className="flex-1 w-full h-full bg-[#131315] rounded-b-[16px]"
      />
    </div>
  );
};


export default WebviewWrapper;
