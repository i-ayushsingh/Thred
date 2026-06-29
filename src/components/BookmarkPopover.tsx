import React, { useState, useEffect, useRef } from 'react';
import { Bookmark } from '../electron';
import { AI_LIST } from '../shared/ai-list';
import { AIIcon } from './AIIcon';
import { useT } from '../i18n/context';

const AI_URL_MAP: Record<string, string> = {
  'chatgpt.com': 'chatgpt',
  'claude.ai': 'claude',
  'gemini.google.com': 'gemini',
  'perplexity.ai': 'perplexity',
  'grok.com': 'grok',
  'chat.deepseek.com': 'deepseek',
  'kimi.com': 'kimi',
  'chat.mistral.ai': 'mistral',
  'huggingface.co': 'huggingchat'};

function resolveAIId(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, id] of Object.entries(AI_URL_MAP)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return id;
    }
  } catch {
    // Ignore URL parsing errors
  }
  return '';
}

function getAiName(aiId: string): string {
  const ai = AI_LIST.find((a) => a.id === aiId);
  return ai?.name || aiId;
}

interface BookmarkPopoverProps {
  aiId: string;
  currentUrl: string;
  onClose: () => void;
  editBookmark?: Bookmark | null;
  position?: { right?: string; top?: string };
}

export const BookmarkPopover: React.FC<BookmarkPopoverProps> = ({ aiId, currentUrl, onClose, editBookmark, position }) => {
  const t = useT();
  const [name, setName] = useState('');
  const [existingBookmark, setExistingBookmark] = useState<Bookmark | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (editBookmark) {
          setExistingBookmark(editBookmark);
          setName(editBookmark.name);
          return;
        }
        const existing = await window.electron.bookmarksGetByUrl(currentUrl);
        if (existing) {
          setExistingBookmark(existing);
          setName(existing.name);
        } else {
          const resolvedAiId = resolveAIId(currentUrl);
          const lookupId = aiId || resolvedAiId;
          let pageTitle = '';
          if (lookupId) {
            pageTitle = await window.electron.bookmarksGetPageTitle(lookupId);
          }
          setName(pageTitle || '');
          setExistingBookmark(null);
        }
      } catch {
        // Ignore
      }
    })();
  }, [currentUrl, editBookmark]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const resolvedAiId = resolveAIId(currentUrl);
      await window.electron.bookmarksAdd({
        name: name.trim(),
        url: currentUrl,
        aiId: resolvedAiId || aiId || 'chatgpt',
        category: 'General'});
      undefined;
      onClose();
    } catch {
      undefined;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) return;
    const targetId = editBookmark?.id || existingBookmark?.id;
    if (!targetId) return;
    setSaving(true);
    try {
      await window.electron.bookmarksUpdate(targetId, { name: name.trim() });
      undefined;
      onClose();
    } catch {
      undefined;
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    const targetId = existingBookmark?.id || editBookmark?.id;
    if (!targetId) return;
    setSaving(true);
    try {
      await window.electron.bookmarksRemove(targetId);
      undefined;
      setExistingBookmark(null);
      setName('');
    } catch {
      undefined;
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!editBookmark;
  const isExisting = !!existingBookmark && !editBookmark;
  const posStyle = position || { right: '16', top: '48' };
  const resolvedAiId = resolveAIId(currentUrl) || aiId || (editBookmark?.aiId) || (existingBookmark?.aiId) || 'chatgpt';
  const targetAiId = resolvedAiId;

  const handlePrimary = () => {
    if (isEdit || isExisting) handleUpdate();
    else handleSave();
  };

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div
        className="w-80 rounded-2xl border border-white/[0.08] bg-[#1A1A1C] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] origin-top-right animate-pop-top-right text-left"
        style={{ position: 'absolute', right: `${posStyle.right}px`, top: `${posStyle.top}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-semibold text-white">
            {isEdit || isExisting ? 'Edit bookmark' : t('modal.bookmark.bookmarkThisChat')}
          </span>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">{t('modal.bookmark.name')}</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePrimary();
              }}
              placeholder="My chat"
              className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-[color-mix(in_srgb,var(--accent)_50%,transparent)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0D0D0D] border border-white/[0.06]">
            <div className="w-6 h-6 rounded-md bg-[#1A1A1C] border border-white/[0.06] flex items-center justify-center">
              <AIIcon id={targetAiId} className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-[12px] font-medium text-white/70">{getAiName(resolvedAiId)}</span>
          </div>
        </div>

        {currentUrl && !isEdit && !isExisting && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-[#0D0D0D] border border-white/[0.06]">
            <div className="text-[10px] text-white/25 truncate">{currentUrl}</div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          {(isEdit || isExisting) && (
            <button
              onClick={handleRemove}
              disabled={saving}
              className="px-3 py-2 rounded-xl border border-white/[0.08] text-[12px] font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {t('modal.bookmark.remove')}
            </button>
          )}
          <button
            onClick={handlePrimary}
            disabled={saving || !name.trim()}
            className="flex-1 px-3 py-2 rounded-xl text-[12px] font-semibold text-black disabled:opacity-50 transition-all"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {saving ? t('modal.bookmark.saving') : (isEdit || isExisting) ? t('modal.bookmark.update') : t('modal.bookmark.saveBookmark')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookmarkPopover;
