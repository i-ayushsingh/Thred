import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n/context';

export const QuickActionsRow: React.FC = () => {
  const t = useT();
  const {  setPendingVaultItem, setVaultSaveModalOpen, openToolWindow, setTodoTab  } = useStore(useShallow(state => ({ setPendingVaultItem: state.setPendingVaultItem, setVaultSaveModalOpen: state.setVaultSaveModalOpen, openToolWindow: state.openToolWindow, setTodoTab: state.setTodoTab })));

  const actions = [
    {
      id: 'prompt',
      label: t('home.quickActions.newPrompt'),
      icon: 'auto_awesome',
      onClick: () => {
        setPendingVaultItem({ type: 'prompt', content: '' });
        setVaultSaveModalOpen(true);
      }
    },
    {
      id: 'note',
      label: t('home.quickActions.newNote'),
      icon: 'note_add',
      onClick: () => openToolWindow('notes')
    },
    {
      id: 'whiteboard',
      label: t('home.quickActions.whiteboard'),
      icon: 'draw',
      onClick: () => openToolWindow('whiteboard')
    },
    {
      id: 'scratchpad',
      label: t('home.quickActions.scratchpad'),
      icon: 'edit_note',
      onClick: () => openToolWindow('scratchpad')
    },
    {
      id: 'tasks',
      label: t('home.quickActions.tasks') || 'Tasks',
      icon: 'check_circle',
      onClick: () => {
        openToolWindow('todos');
        setTodoTab('permanent');
      }
    }
  ];

  return (
    <div className="flex flex-col gap-2 w-full animate-fade-in select-none">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">
        <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--accent)' }}>
          explore
        </span>
        <span>{t('home.quickActions.title')}</span>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {actions.map(act => (
          <button
            key={act.id}
            onClick={act.onClick}
            className="flex items-center gap-3 px-4 py-3 bg-[#121214] border border-white/[0.04] hover:border-white/10 hover:bg-[#161618] shadow-[0_2px_8px_rgba(0,0,0,0.15)] rounded-xl cursor-pointer group transition-all duration-200 select-none hover:-translate-y-[1px]"
          >
            <div className="w-8 h-8 rounded-lg bg-[#161618] border border-white/[0.04] flex items-center justify-center shrink-0 shadow-inner">
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ color: 'var(--accent)' }}
              >
                {act.icon}
              </span>
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[12px] font-bold text-white/80 group-hover:text-white transition-colors truncate w-full">
                {act.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsRow;
