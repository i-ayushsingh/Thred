import React, { createContext, useContext, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmDialogState extends ConfirmOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: async () => false});

export const useConfirm = () => useContext(ConfirmContext);

// ──────────────────────────────────────────────────────────────────────────────
// Icon helper
// ──────────────────────────────────────────────────────────────────────────────

const VARIANT_CONFIG = {
  danger: {
    icon: 'delete_forever',
    iconColor: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
    confirmBg: '#EF4444',
    confirmHover: '#DC2626'},
  warning: {
    icon: 'warning',
    iconColor: '#EAB308',
    iconBg: 'rgba(234,179,8,0.12)',
    confirmBg: '#EAB308',
    confirmHover: '#CA8A04'},
  info: {
    icon: 'info',
    iconColor: 'var(--accent)',
    iconBg: 'var(--accent-muted)',
    confirmBg: 'var(--accent)',
    confirmHover: 'var(--accent-hover)'}};

// ──────────────────────────────────────────────────────────────────────────────
// Dialog UI
// ──────────────────────────────────────────────────────────────────────────────

const ConfirmDialogUI: React.FC<{
  state: ConfirmDialogState;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ state, onConfirm, onCancel }) => {
  const variant = state.variant || 'danger';
  const cfg = VARIANT_CONFIG[variant];

  // Keyboard: Enter = confirm, Escape = cancel
  React.useEffect(() => {
    if (!state.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [state.open, onConfirm, onCancel]);

  if (!state.open) return null;

  return createPortal(
    /* Backdrop */
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      {/* Modal card */}
      <div
        className="relative flex flex-col gap-5 animate-pop-center"
        style={{
          width: 360,
          background: 'rgba(18,18,20,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 20,
          padding: '28px 28px 24px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)'}}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon badge */}
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
          style={{ background: cfg.iconBg }}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: cfg.iconColor }}
          >
            {cfg.icon}
          </span>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1.5">
          {state.title && (
            <h2 className="text-[15px] font-bold text-white leading-snug">
              {state.title}
            </h2>
          )}
          <p className="text-[13px] text-white/60 leading-relaxed">
            {state.message}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06]" />

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {/* Cancel */}
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-[12px] text-[13px] font-semibold text-white/60 hover:text-white transition-all cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)'}}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
          >
            {state.cancelLabel || 'Cancel'}
          </button>

          {/* Confirm */}
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-[12px] text-[13px] font-bold text-white transition-all cursor-pointer"
            style={{
              background: cfg.confirmBg,
              boxShadow: `0 4px 16px ${cfg.iconColor}30`}}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = cfg.confirmHover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = cfg.confirmBg; }}
          >
            {state.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Provider — wrap App root with this once
// ──────────────────────────────────────────────────────────────────────────────

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmDialogState>({
    open: false,
    message: '',
    resolve: null});

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialogUI state={state} onConfirm={handleConfirm} onCancel={handleCancel} />
    </ConfirmContext.Provider>
  );
};

export default ConfirmDialogProvider;
