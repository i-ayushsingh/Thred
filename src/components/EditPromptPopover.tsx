import React, { useEffect, useState } from 'react';
import { useT } from '../i18n/context';
import { EditPopoverBase } from './EditPopoverBase';

export interface EditPromptPopoverProps {
  open: boolean;
  initialTitle: string;
  initialText: string;
  aiName: string;
  aiColor: string;
  aiIcon: string;
  onClose: () => void;
  onSave: (data: { title: string; text: string }) => void;
  isEdit?: boolean;
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

export const EditPromptPopover: React.FC<EditPromptPopoverProps> = ({
  open,
  initialTitle,
  initialText,
  aiName,
  aiColor,
  onClose,
  onSave,
  isEdit = true}) => {
  const t = useT();
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [titleFocused, setTitleFocused] = useState(false);
  const [textFocused, setTextFocused] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setText(initialText);
    }
  }, [open, initialTitle, initialText]);

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
    if (!title.trim() || !text.trim()) return;
    onSave({ title: title.trim(), text: text.trim() });
  };

  const accent = aiColor || 'var(--accent)';
  const focusBorder = `1px solid ${accent}55`;

  return (
    <EditPopoverBase
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title={isEdit ? (t('modal.editPrompt.title') || 'Edit Prompt') : 'Add Prompt'}
      subtitle={aiName}
      icon="edit"
      saveDisabled={!title.trim() || !text.trim()}
      accentColor={accent}
    >
      {/* Title */}
      <div>
        <label style={labelStyle}>{t('modal.editPrompt.titleLabel') || 'Prompt Title'}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Prompt title"
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          style={{
            ...inputStyle,
            border: titleFocused ? focusBorder : inputStyle.border}}
        />
      </div>

      {/* Prompt text */}
      <div>
        <label style={labelStyle}>{t('modal.editPrompt.promptLabel') || 'Prompt Content'}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your prompt here..."
          rows={7}
          onFocus={() => setTextFocused(true)}
          onBlur={() => setTextFocused(false)}
          style={{
            ...inputStyle,
            lineHeight: '1.6',
            resize: 'none',
            padding: '10px 12px',
            border: textFocused ? focusBorder : inputStyle.border}}
        />
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: '4px', display: 'block' }}>
          {text.length} characters
        </span>
      </div>

    </EditPopoverBase>
  );
};

export default EditPromptPopover;
