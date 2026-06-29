import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/context';

export interface EditPopoverBaseProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  subtitle: string;
  icon: string;
  saveDisabled?: boolean;
  children: React.ReactNode;
  accentColor?: string; // e.g. var(--accent)
}

export const EditPopoverBase: React.FC<EditPopoverBaseProps> = ({
  open,
  onClose,
  onSave,
  title,
  subtitle,
  icon,
  saveDisabled,
  children,
  accentColor = 'var(--accent)'
}) => {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const container = document.getElementById('main-view-container') || document.body;
  const isInsideMainView = container.id === 'main-view-container';

  return createPortal(
    <div
      className={`${isInsideMainView ? 'absolute' : 'fixed'} inset-0 z-[200] flex items-center justify-center`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose} />

      {/* Modal card */}
      <div
        className="relative w-[560px] max-h-[82vh] rounded-2xl overflow-hidden animate-pop-center flex flex-col"
        style={{
          background: 'rgba(14, 14, 16, 0.97)',
          border: `1px solid rgba(255,255,255,0.09)`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)`,
          outline: `1px solid ${accentColor}22`}}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}35`}}
            >
              <span className="material-symbols-outlined text-[16px]" style={{ color: accentColor }}>{icon}</span>
            </div>
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight" style={{ color: '#f0f0f0' }}>{title}</h2>
              <span className="text-[10.5px] mt-0.5 block" style={{ color: 'rgba(255,255,255,0.38)' }}>{subtitle}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
            }}
            title="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Body — children are rendered with a forced dark context */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4"
          style={{ color: '#f0f0f0' }}
        >
          {children}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-end gap-2 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.45)', background: 'transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
            }}
          >
            {t('vault.edit.cancel') || 'Cancel'}
          </button>
          <button
            onClick={onSave}
            disabled={saveDisabled}
            className="px-3.5 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-bold text-black transition-opacity flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: accentColor }}
          >
            <span className="material-symbols-outlined text-[13px]">check</span>
            {t('vault.edit.save') || 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    container
  );
};

export default EditPopoverBase;
