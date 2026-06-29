import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { useConfirm } from './ConfirmDialog';

export const VaultContextSaveModal: React.FC = () => {
  const {  isVaultSaveModalOpen, pendingVaultItem, setVaultSaveModalOpen, setPendingVaultItem, addVaultItem, vaultItems  } = useStore(useShallow(state => ({ isVaultSaveModalOpen: state.isVaultSaveModalOpen, pendingVaultItem: state.pendingVaultItem, setVaultSaveModalOpen: state.setVaultSaveModalOpen, setPendingVaultItem: state.setPendingVaultItem, addVaultItem: state.addVaultItem, vaultItems: state.vaultItems})));
  const { confirm } = useConfirm();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('');

  const [isFavorite, setIsFavorite] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVaultSaveModalOpen && pendingVaultItem) {
      setTitle(`Saved ${pendingVaultItem.type === 'code' ? 'Code' : pendingVaultItem.type === 'response' ? 'Response' : 'Prompt'} - ${new Date().toLocaleTimeString()}`);
      setContent(pendingVaultItem.content || '');
      setLanguage(pendingVaultItem.language || '');

      setIsFavorite(false);
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isVaultSaveModalOpen, pendingVaultItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVaultSaveModalOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        if (document.activeElement?.tagName.toLowerCase() !== 'textarea') {
          e.preventDefault();
          e.stopPropagation();
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isVaultSaveModalOpen, title, content, language, isFavorite]);

  if (!isVaultSaveModalOpen || !pendingVaultItem) return null;

  const handleClose = () => {
    setVaultSaveModalOpen(false);
    setPendingVaultItem(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      undefined;
      return;
    }

    const id = `vault-${Date.now()}`;

    let category = 'Prompts';
    let kind: import('../shared/vault-schema').VaultItemKind = 'prompt';
    if (pendingVaultItem.type === 'code') { category = 'Codebook'; kind = 'code'; }
    if (pendingVaultItem.type === 'response') { category = 'Responses'; kind = 'response'; }

    const item: any = {
      id,
      kind,
      title: title.trim(),
      content: content.trim(),
      fullText: content.trim(),
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      isFavorite};

    if (pendingVaultItem.type === 'code') {
      item.language = language.trim() || 'text';
      item.subType = 'code';
    } else if (pendingVaultItem.type === 'response') {
      item.subType = 'response';
    } else {
      item.subType = 'prompt';
    }

    await addVaultItem(item);
    undefined;
    handleClose();
  };

  const typeConfig = {
    code: { label: 'Codebook', icon: 'data_object', accent: '#8B5CF6' },
    response: { label: 'Response', icon: 'forum', accent: '#3B82F6' },
    prompt: { label: 'Prompt', icon: 'auto_awesome', accent: '#F4A460' }
  };
  const config = typeConfig[pendingVaultItem.type as keyof typeof typeConfig] || typeConfig.prompt;

  return (
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(12px)',
        animation: 'vaultModalOverlayIn 0.15s ease-out'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <style>{`
        @keyframes vaultModalOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes vaultModalSlideIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      <div
        ref={modalRef}
        style={{
          width: '480px',
          maxHeight: '80vh',
          background: 'linear-gradient(180deg, #1A1A1F 0%, #161619 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'vaultModalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        } as React.CSSProperties}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `color-mix(in srgb, ${config.accent} 15%, transparent)` }}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ color: config.accent }}>{config.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="m-0 text-[14px] font-semibold text-white/90 tracking-tight">Save to {config.label}</h2>
            <p className="m-0 text-[11px] text-white/30 mt-0.5">Add to your vault for later</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.04] mx-5" />

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>
          {/* Title */}
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">Title</label>
            <input
              ref={titleInputRef}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg text-[13px] text-white/90 px-3 py-2.5 outline-none transition-all duration-150 placeholder:text-white/20 focus:border-[color:var(--accent)] focus:bg-white/[0.06]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a name..."
            />
          </div>

          {/* Language row */}
          <div className="flex gap-3">
            {pendingVaultItem.type === 'code' && (
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">Language</label>
                <input
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg text-[13px] text-white/90 px-3 py-2.5 outline-none transition-all duration-150 placeholder:text-white/20 focus:border-[color:var(--accent)] focus:bg-white/[0.06]"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. typescript..."
                />
              </div>
            )}
          </div>

          {/* Toggle row */}
          <div className="flex items-center gap-2">

            <button
              onClick={async () => {
                if (!isFavorite) {
                  const favoritesCount = (vaultItems || []).filter(x => x.isFavorite).length;
                  if (favoritesCount >= 4) {
                    await confirm({
                      title: 'Favorite Limit Reached',
                      message: 'You can only have up to 4 favorites. Please unfavorite another item first.',
                      confirmLabel: 'OK',
                      cancelLabel: 'Cancel',
                      variant: 'warning'
                    });
                    return;
                  }
                }
                setIsFavorite(!isFavorite);
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 border ${
                isFavorite
                  ? 'bg-[color-mix(in_srgb,#F59E0B_12%,transparent)] border-[color-mix(in_srgb,#F59E0B_25%,transparent)] text-[#F59E0B]'
                  : 'bg-white/[0.03] border-white/[0.05] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{isFavorite ? 'star' : 'star_outline'}</span>
              Favorite
            </button>
          </div>

          {/* Content preview */}
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">Content</label>
            <textarea
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg text-[13px] text-white/80 px-3 py-2.5 outline-none transition-all duration-150 placeholder:text-white/20 focus:border-[color:var(--accent)] focus:bg-white/[0.06] resize-none leading-relaxed"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                height: '110px',
                fontFamily: pendingVaultItem.type === 'code' ? "'JetBrains Mono', 'Fira Code', monospace" : "inherit",
                fontSize: pendingVaultItem.type === 'code' ? '12px' : '13px'}}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="h-px bg-white/[0.04] mx-5" />
        <div className="px-5 py-3 flex justify-between items-center">
          <span className="text-[11px] text-white/25">
            Press <kbd className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-white/40 mx-0.5">Enter</kbd> to save
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-[#1A1A1F] transition-all duration-150 hover:brightness-110 active:scale-[0.97] flex items-center gap-1.5"
              style={{ background: config.accent }}
            >
              <span className="material-symbols-outlined text-[14px]">bookmark_add</span>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
