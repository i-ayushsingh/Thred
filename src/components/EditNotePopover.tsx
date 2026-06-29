import React, { useEffect, useState } from 'react';
import { useT } from '../i18n/context';
import { EditPopoverBase } from './EditPopoverBase';

export interface EditNotePopoverProps {
  open: boolean;
  initialTitle: string;
  initialText: string;
  initialSubtab: 'notes' | 'todo' | 'long-term-todo' | 'scratchpad';
  initialPriority?: 'low' | 'medium' | 'high';
  onClose: () => void;
  onSave: (data: {
    title: string;
    text: string;
    subtab: 'notes' | 'todo' | 'long-term-todo' | 'scratchpad';
    priority?: 'low' | 'medium' | 'high';
  }) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '10px',
  padding: '8px 12px',
  fontSize: '13px',
  color: '#f0f0f0',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box'};

const labelStyle: React.CSSProperties = {
  fontSize: '10.5px',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.38)',
  marginBottom: '6px',
  display: 'block'};

const ACCENT = 'var(--accent)';

export const EditNotePopover: React.FC<EditNotePopoverProps> = ({
  open,
  initialTitle,
  initialText,
  initialSubtab,
  initialPriority,
  onClose,
  onSave}) => {
  const t = useT();
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [subtab, setSubtab] = useState<'notes' | 'todo' | 'long-term-todo' | 'scratchpad'>(initialSubtab);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(initialPriority || 'medium');
  const [titleFocused, setTitleFocused] = useState(false);
  const [textFocused, setTextFocused] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setText(initialText);
      setSubtab(initialSubtab);
      setPriority(initialPriority || 'medium');
    }
  }, [open, initialTitle, initialText, initialSubtab, initialPriority]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), text: text.trim(), subtab, priority });
  };

  const priorityColors = {
    low:    { bg: 'rgba(160,160,160,0.12)', border: 'rgba(160,160,160,0.25)', text: 'rgba(255,255,255,0.5)',  dot: '#9CA3AF' },
    medium: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',   text: '#FBBF24',                dot: '#FBBF24' },
    high:   { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#F87171',                dot: '#F87171' }};

  const labelMap = {
    notes: t('modal.editNote.categoryNote') || 'Note',
    todo: t('modal.editNote.categoryToday') || 'Today',
    'long-term-todo': t('modal.editNote.categoryTasks') || 'Tasks',
    scratchpad: t('modal.editNote.categoryScratchpad') || 'Scratchpad'};

  return (
    <EditPopoverBase
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title={t('modal.editNote.titleEdit') || 'Edit Note'}
      subtitle={t('modal.editNote.subtitle') || 'Update your note content and categorization'}
      icon="sticky_note_2"
      saveDisabled={!title.trim()}
      accentColor={ACCENT}
    >
      {/* Title */}
      <div>
        <label style={labelStyle}>{t('modal.editNote.titleLabel') || 'Title'}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          style={{
            ...inputStyle,
            border: titleFocused ? `1px solid rgba(255,255,255,0.3)` : inputStyle.border}}
        />
      </div>

      {/* Category segmented control */}
      <div>
        <label style={labelStyle}>{t('modal.editNote.category') || 'Category'}</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {(['notes', 'todo', 'long-term-todo', 'scratchpad'] as const).map((tab) => {
            const isSelected = subtab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSubtab(tab)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: isSelected ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                  border: isSelected ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.42)'}}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority */}
      {(subtab === 'todo' || subtab === 'long-term-todo') && (
        <div>
          <label style={labelStyle}>{t('modal.editNote.priority') || 'Priority'}</label>
          <div style={{ display: 'flex', gap: '8px', userSelect: 'none' }}>
            {(['low', 'medium', 'high'] as const).map((p) => {
              const isSelected = priority === p;
              const colors = priorityColors[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: isSelected ? colors.bg : 'rgba(255,255,255,0.04)',
                    border: isSelected ? `1px solid ${colors.border}` : '1px solid rgba(255,255,255,0.08)',
                    color: isSelected ? colors.text : 'rgba(255,255,255,0.4)',
                    textTransform: 'capitalize'}}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.dot }} />
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        <label style={labelStyle}>{t('modal.editNote.content') || 'Content'}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your content here..."
          rows={7}
          onFocus={() => setTextFocused(true)}
          onBlur={() => setTextFocused(false)}
          style={{
            ...inputStyle,
            lineHeight: '1.6',
            resize: 'none',
            padding: '10px 12px',
            border: textFocused ? `1px solid rgba(255,255,255,0.3)` : inputStyle.border}}
        />
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: '4px', display: 'block' }}>
          {text.length} characters
        </span>
      </div>
    </EditPopoverBase>
  );
};

export default EditNotePopover;
