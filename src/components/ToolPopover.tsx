import { useShallow } from 'zustand/react/shallow';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { useT } from '../i18n/context';
import { AIIcon } from './AIIcon';

export const ToolPopover: React.FC = () => {
  const t = useT();
  const {  toolPopover, closeToolPopover  } = useStore(useShallow(state => ({ toolPopover: state.toolPopover, closeToolPopover: state.closeToolPopover })));

  useEffect(() => {
    if (!toolPopover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeToolPopover();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toolPopover, closeToolPopover]);

  if (!toolPopover) return null;

  const container = document.getElementById('main-view-container') || document.body;
  const isInsideMainView = container.id === 'main-view-container';

  return createPortal(
    <div
      className={`${isInsideMainView ? 'absolute' : 'fixed'} inset-0 z-[200] flex items-center justify-center`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeToolPopover();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeToolPopover} />
      <div
        className="relative w-[420px] max-h-[70vh] rounded-2xl border border-[#2A2A2A] bg-[#0E0E0E] shadow-2xl overflow-hidden animate-pop-center"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.05] border border-white/[0.06] overflow-hidden">
              {(() => {
                if (toolPopover.id === 'default-ai' && toolPopover.selected && toolPopover.selected !== 'None') {
                  const selectedTool = toolPopover.tools.find(t => t.name === toolPopover.selected);
                  if (selectedTool && selectedTool.id) {
                    const logoMap: Record<string, string> = {
                      chatgpt: 'openai'};
                    const logoFile = logoMap[selectedTool.id] ?? selectedTool.id;
                    const logoSrc = `/images/Ai monochrome/${logoFile}.svg`;
                    return (
                      <img
                        src={logoSrc}
                        alt={selectedTool.name}
                        className="w-4 h-4 object-contain"
                        style={{ filter: 'brightness(0) invert(1) opacity(0.75)' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    );
                  }
                }
                return <span className="material-symbols-outlined text-[16px] text-white/70">{toolPopover.icon}</span>;
              })()}
            </div>
            <h2 className="text-[14px] font-semibold text-white tracking-tight">{toolPopover.title}</h2>
          </div>
          <button
            onClick={closeToolPopover}
            className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
            title={t('common.close')}
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        <div className="p-3 overflow-y-auto max-h-[calc(70vh-64px)] custom-scrollbar">
          <div className="grid grid-cols-2 gap-1.5">
            {toolPopover.tools.map((tool) => {
              const isSelected = toolPopover.selected === tool.name;
              return (
                <button
                  key={tool.name}
                  onClick={() => {
                    if (toolPopover.onSelect) toolPopover.onSelect(tool.name);
                    closeToolPopover();
                  }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left group ${isSelected ? 'bg-[#F4A460]/10 border border-[#F4A460]/30' : 'hover:bg-[#1A1A1A] active:bg-[#222] border border-transparent'}`}
                >
                  {(() => {
                    // Map AI id → svg filename (only overrides needed)
                    const logoMap: Record<string, string> = {
                      chatgpt: 'openai'};
                    const logoFile = logoMap[tool.id ?? ''] ?? tool.id;
                    const logoSrc = `/images/Ai monochrome/${logoFile}.svg`;
                    // AIs that have a local SVG logo
                    const hasLogo = [
                      'chatgpt','gemini','claude','perplexity','grok',
                      'deepseek','kimi',
                      'mistral','huggingchat'].includes(tool.id ?? '');

                    return hasLogo ? (
                      <div
                        className="w-8 h-8 rounded-lg shrink-0 border border-white/10 flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden"
                        style={{ backgroundColor: 'var(--accent-muted)' }}
                      >
                        <AIIcon id={tool.id ?? ''} className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      </div>
                    ) : tool.color ? (
                      <div
                        className="w-8 h-8 rounded-lg shrink-0 border border-white/10 flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: 'var(--accent-muted)' }}
                      >
                        <span className="material-symbols-outlined text-[17px]" style={{ color: 'var(--accent)' }}>
                          {tool.icon}
                        </span>
                      </div>
                    ) : (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#F4A460]/20' : 'bg-white/[0.04] group-hover:bg-white/[0.08]'}`}>
                        <span className={`material-symbols-outlined text-[16px] transition-colors ${isSelected ? 'text-[#F4A460]' : 'text-white/60 group-hover:text-white/90'}`}>{tool.icon}</span>
                      </div>
                    );
                  })()}

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-[12.5px] font-medium transition-colors truncate ${isSelected ? 'text-[#F4A460]' : 'text-white/90 group-hover:text-white'}`}>{tool.name}</span>
                    {tool.desc && <span className="text-[10.5px] text-white/40 truncate">{tool.desc}</span>}
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px] text-[#F4A460] shrink-0">check</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    container
  );
};

export default ToolPopover;
