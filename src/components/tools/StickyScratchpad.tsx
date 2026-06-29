import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { useT } from '../../i18n/context';
import { useDraggable } from '../../utils/shared-hooks';
interface InnerProps {
    onClose: () => void;
    addVaultItem: (item: any) => Promise<void>;
    content: string;
    setContent: (content: string) => void;
    pos: { x: number, y: number } | null;
    setPos: (pos: { x: number, y: number } | null) => void;
    size: { width: number, height: number } | null;
    setSize: (size: { width: number, height: number } | null) => void;
    clearScratchpad: () => void;
}

const ScratchpadInner: React.FC<InnerProps> = ({ 
    onClose, 
    addVaultItem, 
    content,
    setContent,
    pos,
    setPos,
    size,
    setSize,
    clearScratchpad
}) => {
    const t = useT();
    const [isDragging, setIsDragging] = useState(false);
    const [resizeEdge, setResizeEdge] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    
    // Initial default positions
    const currentPos = pos || { x: window.innerWidth - 320, y: 100 };
    const currentSize = size || { width: 280, height: 350 };

    const windowRef = useRef<HTMLDivElement>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus on open
    useEffect(() => {
        const t = setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);
        return () => clearTimeout(t);
    }, []);

    const { handleMouseDown } = useDraggable({
        position: currentPos,
        setPosition: setPos,
        bounds: { left: -currentSize.width + 50, right: window.innerWidth - 50, top: 0, bottom: window.innerHeight - 50 }
    });

    const handleResizeMouseDown = useCallback((e: React.MouseEvent, edge: string) => {
        e.preventDefault();
        e.stopPropagation();
        setResizeEdge(edge);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizeEdge) {
                const minW = 200;
                const minH = 120;
                let newX = currentPos.x;
                let newY = currentPos.y;
                let newW = currentSize.width;
                let newH = currentSize.height;

                if (resizeEdge.includes('right')) {
                    newW = Math.max(minW, e.clientX - currentPos.x);
                }
                if (resizeEdge.includes('left')) {
                    const dx = currentPos.x - e.clientX;
                    newW = Math.max(minW, currentSize.width + dx);
                    if (newW > minW) newX = e.clientX;
                }
                if (resizeEdge.includes('bottom')) {
                    newH = Math.max(minH, e.clientY - currentPos.y);
                }
                if (resizeEdge.includes('top')) {
                    const dy = currentPos.y - e.clientY;
                    newH = Math.max(minH, currentSize.height + dy);
                    if (newH > minH) newY = e.clientY;
                }

                setPos({ x: newX, y: newY });
                setSize({ width: newW, height: newH });
            }
        };

        const handleMouseUp = () => {
            setResizeEdge(null);
        };

        if (resizeEdge) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizeEdge, currentPos, currentSize, setPos, setSize]);

    const handleDiscard = useCallback(() => {
        clearScratchpad();
        onClose();
    }, [clearScratchpad, onClose]);

    const handleSaveToVault = useCallback(async () => {
        if (!content.trim()) {
            undefined;
            return;
        }

        const lines = content.trim().split('\n');
        const title = lines[0].slice(0, 50) || t('tools.scratchpad.scratchpadNote');
        const now = new Date().toISOString();

        const vaultItem = {
            id: 'scratch-' + Math.random().toString(36).substring(7),
            category: 'Notebooks',
            notebookSubtab: 'scratchpad',
            title: title,
            fullText: content,
            desc: content.length > 80 ? content.slice(0, 80) + '...' : content,
            icon: 'edit_note',
            color: '#F59E0B',
            createdAt: now,
            updatedAt: now,
            isFavorite: false,
            isPinned: false};

        try {
            await addVaultItem(vaultItem);
            undefined;
            setIsSaved(true);
            if (showConfirm) {
                handleDiscard();
            } else {
                setShowConfirm(false);
            }
        } catch (err) {
            undefined;
        }
    }, [content, addVaultItem, showConfirm, handleDiscard]);

    const handleCloseAttempt = useCallback(() => {
        if (content.trim() && !isSaved) {
            setShowConfirm(true);
        } else {
            handleDiscard();
        }
    }, [content, isSaved, handleDiscard]);

    // Handle content change to reset saved state
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (isSaved) setIsSaved(false);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCloseAttempt();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveToVault();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSaveToVault();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSaveToVault, handleCloseAttempt]);

    const container = document.getElementById('main-view-container') || document.body;

    return createPortal(
        <div
            ref={windowRef}
            className="fixed z-[300] flex flex-col bg-[#0E0E0E] border border-white/10 rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.8)] animate-pop-center"
            style={{
                left: currentPos.x,
                top: currentPos.y,
                width: currentSize.width,
                height: currentSize.height}}
            onMouseDown={handleMouseDown}
        >
            {/* Header / Drag Handle */}
            <div className="drag-handle flex items-center justify-between px-4 py-3 border-b border-white/5 cursor-move select-none shrink-0">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#F4A460]">edit_note</span>
                    <span className="text-[13px] font-bold text-white/90">{t('tools.scratchpad.title')}</span>
                    {content.trim() && <div className="w-1.5 h-1.5 rounded-full bg-[#F4A460] animate-pulse ml-1" title={t('tools.scratchpad.unsavedContent')} />}
                </div>
                <div className="flex items-center gap-1 no-drag">
                    <button
                        onClick={handleSaveToVault}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F4A460]/10 hover:bg-[#F4A460]/20 text-[#F4A460] transition-all cursor-pointer border border-[#F4A460]/20"
                        title={t('tools.scratchpad.saveToVaultTitle')}
                    >
                        <span className="material-symbols-outlined text-[14px]">archive</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('tools.scratchpad.saveToVault')}</span>
                    </button>
                    <button
                        onClick={handleCloseAttempt}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        title={t('tools.scratchpad.closeTitle')}
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative flex flex-col p-1">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleContentChange}
                    placeholder={t('tools.scratchpad.placeholder')}
                    className="flex-1 bg-transparent border-0 outline-none p-4 text-[13px] text-white/90 placeholder:text-white/20 resize-none ring-0 focus:ring-0 leading-relaxed custom-scrollbar"
                />
            </div>

            {/* Footer / Info */}
            <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-3">
                    <span className="text-[9px] text-white/20 font-mono uppercase tracking-widest">{content.length} {t('tools.scratchpad.chars')}</span>
                    <span className="text-[9px] text-white/20 font-mono uppercase tracking-widest">
                        {content.trim() ? content.trim().split(/\s+/).length : 0} {t('tools.scratchpad.words')}
                    </span>
                </div>
                <span className="text-[9px] text-white/20 italic">{t('tools.scratchpad.temporary')}</span>
            </div>

            {/* Resize Handles - 8 directions */}
            {/* Corners */}
            <div className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-[5]" onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')} />
            <div className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-[5]" onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')} />
            <div className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-[5]" onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')} />
            <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-[5] flex items-end justify-end p-0.5 group">
                <div className="w-1.5 h-1.5 border-r border-b border-white/20 group-hover:border-white/50 transition-colors" />
            </div>
            {/* Edges */}
            <div className="absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize z-[5]" onMouseDown={(e) => handleResizeMouseDown(e, 'top')} />
            <div className="absolute bottom-0 left-3 right-3 h-1.5 cursor-ns-resize z-[5]" onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')} />
            <div className="absolute top-3 bottom-3 left-0 w-1.5 cursor-ew-resize z-[5]" onMouseDown={(e) => handleResizeMouseDown(e, 'left')} />
            <div className="absolute top-3 bottom-3 right-0 w-1.5 cursor-ew-resize z-[5]" onMouseDown={(e) => handleResizeMouseDown(e, 'right')} />

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="absolute inset-0 z-[10] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onMouseDown={e => e.stopPropagation()}>
                    <div className="w-full max-w-[280px] bg-[#161616] border border-white/10 rounded-2xl p-5 shadow-2xl animate-pop-center text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-red-400 text-2xl">delete_forever</span>
                        </div>
                        <h3 className="text-white font-bold text-[15px] mb-2">{t('tools.scratchpad.discardTitle')}</h3>
                        <p className="text-white/40 text-[11px] leading-relaxed mb-6">
                            {t('tools.scratchpad.discardDesc')}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleDiscard}
                                className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[12px] font-bold transition-all cursor-pointer border border-red-500/20"
                            >
                                {t('tools.scratchpad.discardContent')}
                            </button>
                            <button
                                onClick={handleSaveToVault}
                                className="w-full py-2.5 rounded-xl bg-[#F4A460] hover:bg-[#F4A460]/90 text-black text-[12px] font-bold transition-all cursor-pointer"
                            >
                                {t('tools.scratchpad.saveToVault')}
                            </button>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-[12px] font-medium transition-all cursor-pointer"
                            >
                                {t('tools.scratchpad.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        container
    );
};

const StickyScratchpad: React.FC = () => {
    const {  
        toolWindows,
        closeToolWindow,
        addVaultItem,
        scratchpadContent,
        scratchpadPosition,
        scratchpadSize,
        setScratchpadContent,
        setScratchpadPosition,
        setScratchpadSize,
        clearScratchpad 
     } = useStore(useShallow(state => ({ toolWindows: state.toolWindows, closeToolWindow: state.closeToolWindow, addVaultItem: state.addVaultItem, scratchpadContent: state.scratchpadContent, scratchpadPosition: state.scratchpadPosition, scratchpadSize: state.scratchpadSize, setScratchpadContent: state.setScratchpadContent, setScratchpadPosition: state.setScratchpadPosition, setScratchpadSize: state.setScratchpadSize, clearScratchpad: state.clearScratchpad })));

    const tw = toolWindows.find(w => w.id === 'scratchpad');
    if (!tw || tw.minimized) return null;

    return <ScratchpadInner
        onClose={() => closeToolWindow('scratchpad')}
        addVaultItem={addVaultItem}
        content={scratchpadContent}
        setContent={setScratchpadContent}
        pos={scratchpadPosition}
        setPos={setScratchpadPosition}
        size={scratchpadSize}
        setSize={setScratchpadSize}
        clearScratchpad={clearScratchpad}
    />;
};

export default StickyScratchpad;
