import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store';
import { Note } from '../../store';
import { ToolCard } from './ToolCard';
import { useT } from '../../i18n/context';

const Notes: React.FC = () => {
    const {  
        toolWindows,
        notes,
        activeNoteId,
        loadNotes,
        saveNote,
        deleteNote,
        setActiveNoteId,
        minimizeToolWindow,
        closeToolWindow,
        setActiveTab,
        setVaultTab,
        setNotebookSubTab
    } = useStore(useShallow(state => ({ 
        toolWindows: state.toolWindows, 
        notes: state.notes, 
        activeNoteId: state.activeNoteId, 
        loadNotes: state.loadNotes, 
        saveNote: state.saveNote, 
        deleteNote: state.deleteNote, 
        setActiveNoteId: state.setActiveNoteId, 
        minimizeToolWindow: state.minimizeToolWindow, 
        closeToolWindow: state.closeToolWindow,
        setActiveTab: state.setActiveTab,
        setVaultTab: state.setVaultTab,
        setNotebookSubTab: state.setNotebookSubTab
    })));

    const tw = toolWindows.find(t => t.id === 'notes');
    if (!tw) return null;

    return <NotesInner
        minimized={tw.minimized}
        notes={notes}
        activeNoteId={activeNoteId}
        loadNotes={loadNotes}
        saveNote={saveNote}
        deleteNote={deleteNote}
        setActiveNoteId={setActiveNoteId}
        minimizeToolWindow={minimizeToolWindow}
        closeToolWindow={closeToolWindow}
        setActiveTab={setActiveTab}
        setVaultTab={setVaultTab}
        setNotebookSubTab={setNotebookSubTab}
        index={toolWindows.filter(t => !t.minimized).findIndex(t => t.id === 'notes')}
    />;
};

interface InnerProps {
    minimized: boolean;
    notes: Note[];
    activeNoteId: string | null;
    loadNotes: () => Promise<void>;
    saveNote: (note: Note) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    setActiveNoteId: (id: string | null) => void;
    minimizeToolWindow: (id: string) => void;
    closeToolWindow: (id: string) => void;
    setActiveTab: (tab: 'home' | 'settings' | 'vault' | 'history' | 'conversation' | 'report' | 'downloads') => void;
    setVaultTab: (tab: string) => void;
    setNotebookSubTab: (tab: 'notes' | 'todo' | 'scratchpad' | 'calendar' | 'calculator' | 'focus') => void;
    index: number;
}

const convertMarkdownToHtml = (md: string) => {
    if (!md) return '';
    if (md.includes('<p>') || md.includes('<div>') || md.includes('<b>') || md.includes('<i>') || md.includes('<u>') || md.includes('<br')) {
        return md;
    }
    return md
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
        .replace(/\n/g, '<br />');
};

const NotesInner: React.FC<InnerProps> = ({
    minimized,
    notes,
    activeNoteId,
    loadNotes,
    saveNote,
    deleteNote,
    setActiveNoteId,
    minimizeToolWindow,
    closeToolWindow,
    setActiveTab,
    setVaultTab,
    setNotebookSubTab,
    index
}) => {
    const t = useT();
    const [search, setSearch] = useState('');
    const [title, setTitle] = useState('');
    const [charsCount, setCharsCount] = useState(0);
        const [isPinned, setIsPinned] = useState(false);
    const [selectedColor, setSelectedColor] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    
    const searchInputRef = useRef<HTMLInputElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastLoadedNoteIdRef = useRef<string | null>(null);

    // Load notes on mount
    useEffect(() => {
        loadNotes();
    }, []);

        // Load active note into editor
    useEffect(() => {
        if (activeNoteId) {
            const note = notes.find(n => n.id === activeNoteId);
            if (note) {
                setTitle(note.title);
                const htmlContent = convertMarkdownToHtml(note.content || '');
                if (lastLoadedNoteIdRef.current !== activeNoteId) {
                    if (editorRef.current) {
                        editorRef.current.innerHTML = htmlContent;
                    }
                    setCharsCount((editorRef.current?.innerText || '').length);
                    lastLoadedNoteIdRef.current = activeNoteId;
                }
                setSelectedColor(note.color || '');
                setIsPinned(!!note.isPinned);
            }
        } else {
            setTitle('');
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
            setCharsCount(0);
            lastLoadedNoteIdRef.current = null;
            setSelectedColor('');
            setIsPinned(false);
        }
    }, [activeNoteId, notes]);

    // Focus search input on ⌘K / Ctrl+K
    useEffect(() => {
        const handleGlobalK = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleGlobalK);
        return () => window.removeEventListener('keydown', handleGlobalK);
    }, []);

        // Auto-save with debounce
    const autoSave = useCallback((newTitle: string, htmlContent: string, col: string, pinnedVal: boolean) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (activeNoteId) {
                const existing = notes.find(n => n.id === activeNoteId);
                if (existing) {
                    saveNote({
                        ...existing,
                        title: newTitle,
                        content: htmlContent,
                        color: col || undefined,
                        isPinned: pinnedVal,
                        tags: existing.tags || [],
                        updatedAt: new Date().toISOString()
                    });
                }
            }
        }, 500);
    }, [activeNoteId, notes, saveNote]);

    const getEditorHtml = () => {
        return editorRef.current ? editorRef.current.innerHTML : '';
    };

        const currentPinnedCount = notes.filter(n => n.isPinned && n.id !== activeNoteId).length;
    const isPinDisabled = !isPinned && currentPinnedCount >= 5;

    const handleInput = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            const text = editorRef.current.innerText || '';
            setCharsCount(text.length);
            autoSave(title, html, selectedColor, isPinned);
        }
    };

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
            const cb = target as HTMLInputElement;
            if (cb.checked) {
                cb.setAttribute('checked', 'true');
            } else {
                cb.removeAttribute('checked');
            }
            handleInput();
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setTitle(v);
        autoSave(v, getEditorHtml(), selectedColor, isPinned);
    };

    const handleTogglePin = () => {
        const newVal = !isPinned;
        if (newVal && currentPinnedCount >= 5) {
            // Do not allow pinning more than 5 notes
            return;
        }
        setIsPinned(newVal);
        autoSave(title, getEditorHtml(), selectedColor, newVal);
    };

    const handleNewNote = () => {
        const newNote: Note = {
            id: 'note-' + Math.random().toString(36).substring(7),
            title: '',
            content: '',
            isPinned: false,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        saveNote(newNote);
        setActiveNoteId(newNote.id);
        setTimeout(() => titleRef.current?.focus(), 100);
    };

    const handleDelete = (id: string) => {
        if (confirmDelete === id) {
            deleteNote(id);
            setConfirmDelete(null);
        } else {
            setConfirmDelete(id);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return t('tools.notes.justNow') || 'Just now';
        if (diffMins < 60) return (t('tools.notes.minutesAgo') || '{n}m ago').replace('{n}', String(diffMins));
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return (t('tools.notes.hoursAgo') || '{n}h ago').replace('{n}', String(diffHours));
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // Sort notes: pinned first, then sorted by updatedAt desc
    const sortedNotes = [...notes].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

        const filteredNotes = sortedNotes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
    );

    const sidebarNotes = filteredNotes.slice(0, 6);

    const activeNote = activeNoteId ? notes.find(n => n.id === activeNoteId) : null;

    const handleFormat = (command: string, value: string = '') => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        handleInput();
    };

    const handleChecklist = () => {
        editorRef.current?.focus();
        const checkboxHtml = `
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <input type="checkbox" style="width: 14px; height: 14px; margin-right: 6px; cursor: pointer; accent-color: var(--accent);" onclick="this.setAttribute('checked', this.checked ? 'true' : '')" />
                <span>&nbsp;</span>
            </div>
        `;
        document.execCommand('insertHTML', false, checkboxHtml);
        handleInput();
    };

    const handleLink = () => {
        const url = prompt(t('tools.notes.enterLink') || 'Enter link URL:');
        if (url) {
            editorRef.current?.focus();
            document.execCommand('createLink', false, url);
            handleInput();
        }
    };

    return (
        <ToolCard
            toolId="notes"
            title={t('tools.notes.title') || "Notes"}
            icon={<span className="material-symbols-outlined text-[17px]" style={{ color: 'var(--accent)' }}>sticky_note_2</span>}
            width={580}
            height={520}
            isMinimized={minimized}
            onClose={() => closeToolWindow('notes')}
            onMinimize={() => minimizeToolWindow('notes')}
            index={index}
            headerActions={
                <button
                    onClick={handleNewNote}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-(--accent) hover:bg-(--accent)/10 transition-all cursor-pointer"
                    title={t('tools.notes.newNoteTitle') || "New Note"}
                >
                    <span className="material-symbols-outlined text-[16px] font-semibold">add</span>
                </button>
            }
        >
            <div className="flex flex-1 min-h-0">
                {/* Left Panel - Note List */}
                <div
                    className="flex flex-col overflow-hidden shrink-0 bg-(--bg-primary)/10"
                    style={{ width: '210px', borderRight: '1px solid var(--border-primary)' }}
                >
                    {/* Search */}
                    <div className="p-3 shrink-0">
                        <div className="relative flex items-center">
                            <span className="material-symbols-outlined absolute left-2.5 text-white/30 text-[15px] pointer-events-none select-none">search</span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={t('tools.notes.searchPlaceholder') || "Search..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-[#111113]/80 border border-white/6 hover:border-white/10 focus:border-white/15 focus:bg-[#111113] rounded-lg pl-8 pr-8 py-1 text-[11px] text-white placeholder:text-white/20 outline-none transition-all"
                            />
                            <div className="absolute right-2 text-[9px] font-mono text-white/20 px-1 py-0.5 rounded bg-white/2 border border-white/5 pointer-events-none select-none">
                                ⌘K
                            </div>
                        </div>
                    </div>

                                        {/* Note List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1 space-y-1">
                        {sidebarNotes.map((note) => {
                            const isActive = note.id === activeNoteId;
                            // Strip HTML tags for list item preview (if any)
                            const cleanPreview = (note.content || '').replace(/<[^>]*>/g, '');
                            return (
                                <div
                                    key={note.id}
                                    onClick={() => setActiveNoteId(note.id)}
                                    className={`p-2.5 rounded-lg border transition-all cursor-pointer group relative ${
                                        isActive 
                                            ? 'bg-white/4 border-[var(--accent)]' 
                                            : 'bg-transparent border-transparent hover:bg-white/2'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-1.5 mb-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {isActive && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 shadow-[0_0_6px_var(--accent)]" />
                                            )}
                                            <h4 className="text-[11px] font-bold text-white truncate leading-tight">
                                                {note.title || (t('tools.notes.untitledNote') || 'Untitled Note')}
                                            </h4>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {note.isPinned && (
                                                <span className="material-symbols-outlined text-[10px] text-[var(--accent)]">push_pin</span>
                                            )}
                                            {confirmDelete === note.id ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(note.id);
                                                    }}
                                                    className="w-4 h-4 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded"
                                                    title="Confirm delete"
                                                >
                                                    <span className="material-symbols-outlined text-[11px]">done</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(note.id);
                                                    }}
                                                    className="w-4 h-4 flex items-center justify-center text-white/0 group-hover:text-white/30 hover:text-red-400 hover:bg-white/5 rounded transition-all"
                                                    title="Delete note"
                                                >
                                                    <span className="material-symbols-outlined text-[11px]">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[9.5px] text-white/35">
                                        <span className="truncate pr-2">
                                            {cleanPreview || (t('tools.notes.noContent') || 'No content')}
                                        </span>
                                        <span className="font-mono shrink-0">
                                            {formatDate(note.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {sidebarNotes.length === 0 && (
                            <div className="text-center py-6 text-[10px] text-white/20 select-none">
                                {t('tools.notes.noNotesFound') || "No notes found"}
                            </div>
                        )}
                    </div>

                    {/* Bottom Metadata bar */}
                    <div 
                        onClick={() => {
                            setActiveTab('vault');
                            setVaultTab('Notebook');
                            setNotebookSubTab('notes');
                        }}
                        className="mt-auto border-t border-white/8 px-3 py-2.5 flex items-center justify-between text-white/50 hover:text-white cursor-pointer hover:bg-white/2 transition-all select-none"
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[15px]">description</span>
                            <span className="text-[11px] font-medium">All Notes</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-white/30">{notes.length}</span>
                            <span className="material-symbols-outlined text-[14px] text-white/30">chevron_right</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Editor */}
                <div className="flex-1 flex flex-col overflow-hidden bg-(--bg-secondary)/10">
                    {activeNote ? (
                        <div className="flex-1 m-3 border border-white/6 bg-[#111113] rounded-xl flex flex-col overflow-hidden shadow-2xl">
                            {/* Editor Header */}
                            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 shrink-0">
                                <input
                                    ref={titleRef}
                                    type="text"
                                    value={title}
                                    onChange={handleTitleChange}
                                    placeholder={t('tools.notes.noteTitlePlaceholder') || "Untitled Note"}
                                    className="bg-transparent border-0 outline-none text-[15px] font-bold text-white placeholder:text-white/20 flex-1 p-0 ring-0 focus:ring-0"
                                />
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Pin toggle */}
                                    <button
                                        onClick={handleTogglePin}
                                        disabled={isPinDisabled}
                                        className={`w-6 h-6 flex items-center justify-center rounded transition-all ${
                                            isPinDisabled 
                                                ? 'opacity-20 cursor-not-allowed text-white/40' 
                                                : isPinned 
                                                    ? 'text-(--accent) hover:bg-(--accent)/10 cursor-pointer' 
                                                    : 'text-white/40 hover:text-white hover:bg-white/5 cursor-pointer'
                                        }`}
                                        title={isPinDisabled ? "Max 5 pinned notes reached" : "Pin Note"}
                                    >
                                        <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: isPinned ? "'FILL' 1" : "'FILL' 0" }}>push_pin</span>
                                    </button>
                                </div>
                            </div>

                            {/* Rich Text contentEditable Editor */}
                            <div
                                ref={editorRef}
                                contentEditable
                                onInput={handleInput}
                                onClick={handleEditorClick}
                                className="flex-1 bg-transparent border-0 outline-none text-[12px] text-white/80 p-4 leading-relaxed overflow-y-auto custom-scrollbar select-text"
                                style={{ 
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                }}
                                data-placeholder={t('tools.notes.writePlaceholder') || "Write your content here..."}
                            />

                            {/* Toolbar */}
                            <div className="px-4 py-2 border-t border-white/5 bg-white/1 flex items-center justify-between shrink-0 select-none relative">
                                <div className="flex items-center gap-1 text-white/50">
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleFormat('bold')}
                                        className="w-6 h-6 flex items-center justify-center rounded font-bold hover:text-white hover:bg-white/5 cursor-pointer text-[12px]"
                                        title="Bold"
                                    >
                                        B
                                    </button>
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleFormat('italic')}
                                        className="w-6 h-6 flex items-center justify-center rounded italic hover:text-white hover:bg-white/5 cursor-pointer text-[12px]"
                                        title="Italic"
                                    >
                                        I
                                    </button>
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleFormat('underline')}
                                        className="w-6 h-6 flex items-center justify-center rounded underline hover:text-white hover:bg-white/5 cursor-pointer text-[12px]"
                                        title="Underline"
                                    >
                                        U
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-white/25 font-mono">
                                        {charsCount} {t('tools.notes.chars') || 'chars'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 m-3 border border-white/6 bg-[#111113] rounded-xl flex flex-col items-center justify-center text-white/20 gap-2 select-none">
                            <span className="material-symbols-outlined text-[28px]">note_stack</span>
                            <span className="text-[10.5px] font-medium">{t('tools.notes.selectNote') || "Select or create a note"}</span>
                        </div>
                    )}
                </div>
            </div>
        </ToolCard>
    );
};

export default Notes;