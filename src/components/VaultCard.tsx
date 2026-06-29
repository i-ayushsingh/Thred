import React from 'react';
import { VaultItem, isTodo, isNote, isCalendarEvent, getCategoryIcon, getCategoryColor } from '../shared/vault-schema';
import { formatRelativeTime } from '../utils/shared-hooks';

interface VaultCardProps {
  item: VaultItem;
  variant: 'list' | 'grid';
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onCopy?: (e: React.MouseEvent) => void;

  onToggleFavorite?: (e: React.MouseEvent) => void;
  onToggleTodo?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onSelect?: (e: React.MouseEvent) => void;
  isSelectable?: boolean;
  isMarkedSelected?: boolean;
  isSelected?: boolean;
  showAiInfo?: boolean;
  showSubtabBadge?: boolean;
  showCheckbox?: boolean;
  showDateBadge?: boolean;
  customFooter?: React.ReactNode;
}

export const VaultCard: React.FC<VaultCardProps> = ({
  item,
  variant,
  onClick,
  onEdit,
  onDelete,
  onCopy,

  onToggleFavorite,
  onToggleTodo,
  onDragStart,
  onDragEnd,
  onSelect,
  isSelectable = false,
  isMarkedSelected = false,
  isSelected = false,
  showAiInfo = false,
  showSubtabBadge = false,
  showCheckbox = false,
  showDateBadge = false,
  customFooter}) => {
  const kindColor = item.color || getCategoryColor(item.kind);
  const kindIcon = item.icon || getCategoryIcon(item.kind);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(e);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(e);
  };


  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(e);
  };

  const handleToggleTodo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTodo?.(e);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(e);
  };

  const baseClasses = `
    transition-all duration-200 cursor-pointer group/card min-h-0 overflow-hidden
    ${isSelected
      ? 'border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_4%,transparent)]'
      : 'border-white/[0.04] hover:border-white/[0.08]'}
  `;

  const listClasses = `
    flex-1 bg-surface border rounded-[10px] px-3 flex items-center gap-2.5
  `;

  const gridClasses = `
    bg-surface border rounded-[10px] p-2.5 flex flex-col gap-1.5
  `;

  const isFavorite = item.isFavorite;


  const AiInfo = () => (
    item.aiIcon && (
      <span className="material-symbols-outlined text-[12px]" style={{ color: item.aiColor || kindColor }}>
        {item.aiIcon}
      </span>
    )
  );

  const SubtabBadge = () => {
    if (!showSubtabBadge || !isNote(item)) return null;
    const sub = item.notebookSubtab || 'notes';
    const tagStyle = {
      notes: { label: 'Note', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
      todo: { label: 'To-do', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
      'long-term-todo': { label: 'Long Term', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
      scratchpad: { label: 'Scratchpad', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
      focus: { label: 'Focus', color: '#F4A460', bg: 'rgba(244,164,96,0.1)' }}[sub];
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
        style={{ color: tagStyle.color, backgroundColor: tagStyle.bg }}
      >
        <div className="w-1 h-1 rounded-full bg-current" />
        {tagStyle.label}
      </span>
    );
  };

  const PriorityBadge = () => {
    if (!isTodo(item)) return null;
    const priority = item.priority || 'medium';
    const style = {
      high: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
      low: { color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
      medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }}[priority];
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 capitalize"
        style={{ color: style.color, backgroundColor: style.bg }}
      >
        <div className="w-1 h-1 rounded-full bg-current" />
        {priority}
      </span>
    );
  };

  const TodoCheckbox = () => {
    const completed = isTodo(item) && item.completed;
    return (
      <button
        onClick={handleToggleTodo}
        className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center shrink-0 hover:border-(--accent) transition-colors cursor-pointer"
        title={completed ? 'Mark pending' : 'Mark completed'}
      >
        {completed && <div className="w-2 h-2 rounded-full bg-(--accent)" />}
      </button>
    );
  };

  const DateBadge = () => {
    if (!showDateBadge || !isCalendarEvent(item)) return null;
    return (
      <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1.5 flex items-center gap-1">
        <span className="material-symbols-outlined text-[12px]">calendar_month</span>
        {formatRelativeTime(item.dateKey)}
      </div>
    );
  };

  const SelectionCircle = () => {
    if (!isSelectable) return null;
    return (
      <button
        onClick={handleSelect}
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          isMarkedSelected
            ? 'border-(--accent) bg-(--accent)'
            : 'border-white/30 hover:border-(--accent)'
        }`}
      >
        {isMarkedSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </button>
    );
  };

  const IconAndColor = () => (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
      style={{ backgroundColor: kindColor, color: kindColor }}
    />
  );

  const IconBadge = () => (
    <div className="w-8 h-8 rounded-[10px] bg-[#1A1A1C] border border-white/4 flex items-center justify-center">
      <span className="material-symbols-outlined text-(--accent) text-[16px]">{kindIcon}</span>
    </div>
  );

  const TitleRow = () => (
    <div className="flex items-center gap-1.5 min-w-0">
      {showCheckbox && TodoCheckbox()}
      {IconAndColor()}
      <span className={`material-symbols-outlined text-[12px] leading-none shrink-0 ${isFavorite ? 'text-(--accent)' : 'text-white/20'}`}>
        {isFavorite ? 'star' : 'star_outline'}
      </span>

      <h4 className={`text-[13px] font-bold text-white/90 truncate leading-tight ${isTodo(item) && item.completed ? 'line-through text-white/30' : ''}`}>
        {item.title}
      </h4>
    </div>
  );

  const Description = () => (
    <p className="text-[11px] text-white/40 line-clamp-2 leading-snug">
      {item.desc || item.fullText?.slice(0, 100) || 'No content yet.'}
    </p>
  );

  const Footer = () => (
    <div className="flex items-center justify-between pt-0.5">
      <div className="flex items-center gap-1 text-[10.5px] text-white/50">
        <SubtabBadge />
        <PriorityBadge />
        {showAiInfo && (
          <>
            <AiInfo />
            <span className="font-semibold">{item.aiName || 'Thred'}</span>
          </>
        )}
      </div>
      <span className="text-[11px] text-white/40 font-mono shrink-0 w-14 text-right">
        {formatRelativeTime(item.updatedAt || item.createdAt)}
      </span>
    </div>
  );

  const ListView = () => (
    <div
      onClick={onClick}
      draggable={!isSelectable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`${baseClasses} ${listClasses}`}
    >
      <SelectionCircle />
      {IconAndColor()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`material-symbols-outlined text-[12px] leading-none ${isFavorite ? 'text-(--accent)' : 'text-white/20'}`}>
            {isFavorite ? 'star' : 'star_outline'}
          </span>

          <h4 className="text-[13px] font-bold text-white/90 truncate leading-tight">{item.title}</h4>
        </div>
        <Description />
      </div>
      {showAiInfo && (
        <div className="flex items-center gap-1 text-[11px] text-white/50 shrink-0">
          <AiInfo />
          <span className="font-semibold">{item.aiName || 'Thred'}</span>
        </div>
      )}
      <span className="text-[11px] text-white/40 font-mono shrink-0 w-14 text-right">
        {formatRelativeTime(item.updatedAt || item.createdAt)}
      </span>
      {onCopy && (
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(e); }}
          className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-colors shrink-0 mr-1.5"
          title="Copy contents"
        >
          <span className="material-symbols-outlined text-[14px] leading-none">content_copy</span>
        </button>
      )}
      <button
        onClick={handleDelete}
        className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[#EF4444] hover:bg-white/5 transition-colors shrink-0"
        title="Delete item"
      >
        <span className="material-symbols-outlined text-[14px] leading-none">delete</span>
      </button>
    </div>
  );

  const GridView = () => (
    <div
      onClick={onClick}
      draggable={!isSelectable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`${baseClasses} ${gridClasses}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <SelectionCircle />
          {IconAndColor()}
          <span className={`material-symbols-outlined text-[12px] leading-none shrink-0 ${isFavorite ? 'text-(--accent)' : 'text-white/20'}`}>
            {isFavorite ? 'star' : 'star_outline'}
          </span>
          <h4 className="text-[12.5px] font-bold text-white/90 truncate leading-tight">{item.title}</h4>
        </div>
        <div className="flex items-center gap-1 shrink-0 -mr-0.5 -mt-0.5">
          {onCopy && (
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(e); }}
              className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-colors"
              title="Copy contents"
            >
              <span className="material-symbols-outlined text-[13px] leading-none">content_copy</span>
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[#EF4444] hover:bg-white/5 transition-colors"
            title="Delete"
          >
            <span className="material-symbols-outlined text-[13px] leading-none">delete</span>
          </button>
        </div>
      </div>
      <Description />
      {customFooter || Footer()}
    </div>
  );

  if (variant === 'list') {
    return <ListView />;
  }
  return <GridView />;
};

export default VaultCard;