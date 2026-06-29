import React, { useEffect, useState } from 'react';
import { useT } from '../i18n/context';
import { EditPopoverBase } from './EditPopoverBase';

export type EditVaultItemKind = 'prompt' | 'code' | 'response' | 'note';

interface EditVaultItemBaseProps {
  open: boolean;
  kind: EditVaultItemKind;
  onClose: () => void;
  isEdit?: boolean;
}

interface TextItemProps extends EditVaultItemBaseProps {
  initialTitle: string;
  initialText: string;
  aiName: string;
  aiColor: string;
  aiIcon?: string;
  onSave: (data: { title: string; text: string }) => void;
}

interface NoteItemProps extends EditVaultItemBaseProps {
  initialTitle: string;
  initialText: string;
  initialSubtab: 'notes' | 'todo' | 'long-term-todo' | 'scratchpad' | 'focus';
  initialPriority?: 'low' | 'medium' | 'high';
  onSave: (data: {
    title: string;
    text: string;
    subtab: 'notes' | 'todo' | 'long-term-todo' | 'scratchpad' | 'focus';
    priority?: 'low' | 'medium' | 'high';
  }) => void;
}

type EditVaultItemPopoverProps = TextItemProps | NoteItemProps;

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

const KIND_CONFIG: Record<EditVaultItemKind, {
  accent: string;
  focusBorder: string;
  icon: string;
  titleKey: string;
  titleLabel: string;
  textLabel: string;
  titlePlaceholder: string;
  textPlaceholder: string;
  monoFont?: boolean;
}> = {
  prompt: {
    accent: 'use-aiColor',
    focusBorder: '',
    icon: 'edit',
    titleKey: 'modal.editPrompt.title',
    titleLabel: 'modal.editPrompt.titleLabel',
    textLabel: 'modal.editPrompt.promptLabel',
    titlePlaceholder: 'Prompt title',
    textPlaceholder: 'Write your prompt here...'},
  code: {
    accent: 'var(--color-info)',
    focusBorder: '1px solid rgba(96,165,250,0.4)',
    icon: 'code',
    titleKey: 'modal.editCode.titleEdit',
    titleLabel: 'modal.editCode.titleLabel',
    textLabel: 'modal.editCode.contentLabel',
    titlePlaceholder: 'Snippet title',
    textPlaceholder: 'Paste or write your code here...',
    monoFont: true},
  response: {
    accent: 'var(--color-warning)',
    focusBorder: '1px solid rgba(251,191,36,0.4)',
    icon: 'forum',
    titleKey: 'modal.editResponse.titleEdit',
    titleLabel: 'modal.editResponse.titleLabel',
    textLabel: 'modal.editResponse.contentLabel',
    titlePlaceholder: 'Response title',
    textPlaceholder: 'Paste or write the response here...'},
  note: {
    accent: 'var(--accent)',
    focusBorder: '1px solid rgba(255,255,255,0.3)',
    icon: 'sticky_note_2',
    titleKey: 'modal.editNote.titleEdit',
    titleLabel: 'modal.editNote.titleLabel',
    textLabel: 'modal.editNote.content',
    titlePlaceholder: 'Note title',
    textPlaceholder: 'Write your content here...'}};

export const EditVaultItemPopover: React.FC<EditVaultItemPopoverProps> = (props) => {
  const t = useT();
  const { open, kind, onClose, isEdit = true } = props;
  const config = KIND_CONFIG[kind];

  const [title, setTitle] = useState(props.initialTitle);
  const [text, setText] = useState(props.initialText);
  const [titleFocused, setTitleFocused] = useState(false);
  const [textFocused, setTextFocused] = useState(false);

  const isTextItem = kind !== 'note';
  const textProps = isTextItem ? (props as TextItemProps) : null;
  const noteProps = !isTextItem ? (props as NoteItemProps) : null;

  const [subtab, setSubtab] = useState<'notes' | 'todo' | 'long-term-todo' | 'scratchpad' | 'focus'>(noteProps?.initialSubtab || 'notes');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(noteProps?.initialPriority || 'medium');

  useEffect(() => {
    if (open) {
      setTitle(props.initialTitle);
      setText(props.initialText);
      if (noteProps) {
        setSubtab(noteProps.initialSubtab);
        setPriority(noteProps.initialPriority || 'medium');
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const accent = kind === 'prompt' && textProps ? (textProps.aiColor || 'var(--accent)') : config.accent;
  const focusBorder = kind === 'prompt' ? `1px solid ${accent}55` : config.focusBorder;

  const handleSave = () => {
    if (!title.trim()) return;
    if (isTextItem) {
      if (!text.trim()) return;
      (props as TextItemProps).onSave({ title: title.trim(), text: text.trim() });
    } else {
      (props as NoteItemProps).onSave({ title: title.trim(), text: text.trim(), subtab, priority });
    }
  };

  const priorityColors = {
    low:    { bg: 'rgba(160,160,160,0.12)', border: 'rgba(160,160,160,0.25)', text: 'rgba(255,255,255,0.5)',  dot: '#9CA3AF' },
    medium: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',   text: '#FBBF24',                dot: '#FBBF24' },
    high:   { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#F87171',                dot: '#F87171' }};

  const noteLabelMap = {
    notes: t('modal.editNote.categoryNote') || 'Note',
    todo: t('modal.editNote.categoryToday') || 'Today',
    'long-term-todo': t('modal.editNote.categoryTasks') || 'Tasks',
    scratchpad: t('modal.editNote.categoryScratchpad') || 'Scratchpad',
    focus: 'Focus'};

  const titleDisplay = isEdit
    ? (t(config.titleKey as any) || (kind === 'prompt' ? 'Edit Prompt' : kind === 'code' ? 'Edit Code Snippet' : kind === 'response' ? 'Edit Saved Response' : 'Edit Note'))
    : (kind === 'prompt' ? 'Add Prompt' : kind === 'code' ? 'Add Code Snippet' : kind === 'response' ? 'Add Saved Response' : 'Add Note');

  const saveDisabled = isTextItem ? (!title.trim() || !text.trim()) : !title.trim();

  return (
    <EditPopoverBase
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title={titleDisplay}
      subtitle={isTextItem ? textProps!.aiName : (t('modal.editNote.subtitle') || 'Update your note content and categorization')}
      icon={config.icon}
      saveDisabled={saveDisabled}
      accentColor={accent}
    >
      {/* Title */}
      <div>
        <label style={labelStyle}>{t(config.titleLabel as any) || 'Title'}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={config.titlePlaceholder}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          style={{
            ...inputStyle,
            border: titleFocused ? focusBorder : inputStyle.border}}
        />
      </div>

      {/* Note: Category segmented control */}
      {kind === 'note' && (
        <div>
          <label style={labelStyle}>{t('modal.editNote.category') || 'Category'}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            {(['notes', 'todo', 'long-term-todo', 'scratchpad', 'focus'] as const).map((tab) => {
              const isSelected = subtab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSubtab(tab)}
                  style={{
                    padding: '8px 2px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: isSelected ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                    border: isSelected ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
                    color: isSelected ? '#fff' : 'rgba(255,255,255,0.42)'}}
                >
                  {noteLabelMap[tab]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Note: Priority selector */}
      {kind === 'note' && (subtab === 'todo' || subtab === 'long-term-todo') && (
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

      {/* Text content */}
      <div>
        <label style={labelStyle}>{t(config.textLabel as any) || 'Content'}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={config.textPlaceholder}
          rows={7}
          onFocus={() => setTextFocused(true)}
          onBlur={() => setTextFocused(false)}
          style={{
            ...inputStyle,
            lineHeight: '1.6',
            resize: 'none',
            padding: '10px 12px',
            fontFamily: config.monoFont ? 'monospace' : undefined,
            border: textFocused ? focusBorder : inputStyle.border}}
        />
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: '4px', display: 'block' }}>
          {text.length} characters
        </span>
      </div>

    </EditPopoverBase>
  );
};

export default EditVaultItemPopover;
