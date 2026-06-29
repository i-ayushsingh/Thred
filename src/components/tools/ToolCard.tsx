import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../../i18n/context';
import { useDraggable } from '../../utils/shared-hooks';
import { useStore } from '../../store';

export interface ToolCardProps {
  toolId: string;
  title: string;
  icon: React.ReactNode;
  width: number;
  height: number | string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  index?: number;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  toolId,
  title,
  icon,
  width,
  height,
  children,
  headerActions,
  onClose,
  onMinimize,
  isMinimized,
  index = 0}) => {
  const t = useT();
  const headerShown = true;

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (position === null) {
      const SPACING = 24;
      const toolWidth = width || 360;
      const toolHeight = typeof height === 'number' ? height : 450;
      
      const maxCols = Math.max(1, Math.floor(window.innerWidth / (toolWidth + SPACING)));
      const col = index % maxCols;
      const row = Math.floor(index / maxCols);

      const startX = SPACING + col * (toolWidth + SPACING);
      const startY = SPACING + row * (toolHeight + SPACING);

      setPosition({ x: startX, y: startY });
    }
  }, [position, index, width, height]);

  const { handleMouseDown } = useDraggable({
    position,
    setPosition,
    bounds: {
      left: 0,
      top: 0
    }
  });

  const container = document.getElementById('main-view-container') || document.body;
  const isInsideMainView = container.id === 'main-view-container';
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMinimized) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (cardRef.current && !cardRef.current.contains(target)) {
        if (target.closest('.right-sidebar-btn') || target.closest('[id^="sidebar-"]') || target.closest('.sidebar-popcard')) return;
        const toolCount = useStore.getState().toolWindows.filter((tw: any) => !tw.minimized).length;
        if (toolCount > 1) return;
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isMinimized, onClose]);

  if (!position) return null; // Wait for initial position calculation

  return createPortal(
    <div
      ref={cardRef}
      data-tool-card={toolId}
      className={`${isInsideMainView ? 'absolute' : 'fixed'} z-[90] animate-pop-center flex flex-col overflow-hidden ${isMinimized ? 'hidden' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: '#161618',
        border: '1px solid var(--border-primary)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)'}}
    >
      {/* Header (Drag Handle) */}
      <div
        className="flex items-center justify-between shrink-0 cursor-move"
        onMouseDown={handleMouseDown}
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-primary)',
          minHeight: '44px',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          {icon}
          <span className="text-[13px] font-bold text-white">{title}</span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          {headerActions}
          <button
            onClick={onMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title={t('common.minimize')}
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-red-400/20 transition-all cursor-pointer"
            title={t('common.close')}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {children}
      </div>
    </div>,
    container
  );
};
