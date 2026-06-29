import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { useT } from '../i18n/context';

export interface ScreenshotPreviewModalProps {
  open: boolean;
  base64: string | null;
  width: number;
  height: number;
  aiId: string;
  type: 'content' | 'workspace';
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_META: Record<'content' | 'workspace', { icon: string }> = {
  content: {
    icon: 'screenshot_monitor'},
  workspace: {
    icon: 'space_dashboard'}};

export const ScreenshotPreviewModal: React.FC<ScreenshotPreviewModalProps> = ({
  open,
  base64,
  width,
  height,
  aiId,
  type,
  onClose,
  onSaved}) => {
  const {  addScreenshot  } = useStore(useShallow(state => ({ addScreenshot: state.addScreenshot })));
  const t = useT();
  const [busy, setBusy] = useState<'save' | 'copy' | null>(null);
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[type];

  const title = type === 'content' ? t('modal.screenshot.contentCapture') : t('modal.screenshot.workspaceCapture');
  const subtitle = type === 'content' ? t('modal.screenshot.contentCaptureDesc') : t('modal.screenshot.workspaceCaptureDesc');

  useEffect(() => {
    if (!open) {
      setBusy(null);
      setCopied(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !base64) return null;

  const dataUrl = `data:image/png;base64,${base64}`;
  const aspect = height > 0 ? width / height : 16 / 9;

  const handleSave = async () => {
    if (busy || !base64) return;
    setBusy('save');
    try {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      await addScreenshot(type, bytes, aiId);
      undefined;

      onSaved();
      onClose();
    } catch (err) {

      undefined;
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    if (busy || !base64) return;
    setBusy('copy');
    try {
      const ok = await window.electron.copyImageToClipboard(base64);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (_) { /* ignored */ } finally {
      setBusy(null);
    }
  };

  const handleDiscard = () => {
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => !busy && onClose()} />
      <div
        className="relative w-[min(960px,92vw)] max-h-[88vh] rounded-2xl border border-white/[0.06] bg-[#0E0E0E] shadow-2xl overflow-hidden animate-pop-center flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.05] border border-white/[0.06]">
              <span className="material-symbols-outlined text-[16px] text-white/70">{meta.icon}</span>
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-white tracking-tight">{title}</h2>
              <div className="flex items-center gap-1.5 text-[10.5px] text-white/40 mt-0.5 font-medium">
                <span>{width} × {height}px</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>AI: {aiId}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => !busy && onClose()}
            disabled={!!busy}
            className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto custom-scrollbar p-4 flex items-center justify-center bg-background">
          <div
            className="relative rounded-lg overflow-hidden border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            style={{ width: '100%', maxWidth: `${Math.min(width, 880)}px`, aspectRatio: `${aspect}` }}
          >
            <img
              src={dataUrl}
              alt="Captured screenshot"
              className="w-full h-full object-contain bg-black"
              draggable={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
          <div className="text-[10.5px] text-white/40 font-medium">
            {subtitle}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              disabled={!!busy}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[13px]">delete</span>
              {t('modal.screenshot.discard')}
            </button>
            <button
              onClick={handleCopy}
              disabled={!!busy}
              className={`px-3.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${copied ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.06] text-white'}`}
            >
              <span className="material-symbols-outlined text-[13px]">
                {busy === 'copy' ? 'progress_activity' : copied ? 'check' : 'content_paste'}
              </span>
              {copied ? 'Copied!' : t('modal.screenshot.copyToClipboard')}
            </button>
            <button
              onClick={handleSave}
              disabled={!!busy}
              className="px-3.5 py-1.5 rounded-lg bg-[#F4A460] hover:bg-[#E8954F] disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-bold text-black transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[13px]">
                {busy === 'save' ? 'progress_activity' : 'save'}
              </span>
              {t('modal.screenshot.save')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ScreenshotPreviewModal;

