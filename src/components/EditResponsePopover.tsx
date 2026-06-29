import React, { useEffect, useState } from 'react';
import { useT } from '../i18n/context';
import { EditPopoverBase } from './EditPopoverBase';

export interface EditResponsePopoverProps {
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

export const EditResponsePopover: React.FC<EditResponsePopoverProps> = ({
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

  const accent = 'var(--color-warning)';
  const focusBorder = `1px solid rgba(251,191,36,0.4)`;

  return (
    <EditPopoverBase
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title={isEdit ? (t('modal.editResponse.titleEdit') || 'Edit Saved Response') : (t('modal.editResponse.titleAdd') || 'Add Saved Response')}
      subtitle={aiName}
      icon="forum"
      saveDisabled={!title.trim() || !text.trim()}
      accentColor={accent}
    >
      {/* Title */}
      <div>
        <label style={labelStyle}>{t('modal.editResponse.titleLabel') || 'Response Title'}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Response title"
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          style={{ ...inputStyle, border: titleFocused ? focusBorder : inputStyle.border }}
        />
      </div>

      {/* Content */}
      <div>
        <label style={labelStyle}>{t('modal.editResponse.contentLabel') || 'Response Content'}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or write the response here..."
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

export default EditResponsePopover;
