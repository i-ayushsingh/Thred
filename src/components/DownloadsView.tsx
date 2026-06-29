import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AIIcon } from './AIIcon';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useT } from '../i18n/context';

type SubfolderType = 'Images' | 'Videos' | 'Documents' | 'Code' | 'Audio';

interface ContextMenuState {
  x: number;
  y: number;
  item: DownloadItem;
}

interface DownloadItem {
  id: string;
  name: string;
  size: string;
  rawSize: number;
  extension: string;
  provider: string;
  aiId: string;
  category: 'Images' | 'Videos' | 'Documents' | 'Code' | 'Audio';
  timestamp: string;
  rawTimestamp: number;
  dateGroup: string;
  path: string;
  previewUrl?: string;
  duration?: string;
}

// ---- Helper for displaying local image files ----
const DownloadImage: React.FC<{ path: string; className?: string }> = ({ path, className }) => {
  const mediaUrl = `media://local/${path.replace(/\\/g, '/')}`;
  return (
    <img
      src={mediaUrl}
      alt="Download Preview"
      className={className}
      draggable={false}
    />
  );
};

// ---- Helper for displaying local video thumbnails ----
const VideoThumbnail: React.FC<{ path: string; className?: string }> = ({ path, className }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const mediaUrl = `media://local/${path.replace(/\\/g, '/')}`;
    
    const video = document.createElement('video');
    video.src = mediaUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    const handleSeeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          if (!cancelled) setThumbnailUrl(dataUrl);
        } catch (_) { /* ignored */ }
      }
    };
    
    video.addEventListener('seeked', handleSeeked, { once: true });
    
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = 0.5;
    }, { once: true });

    return () => {
      cancelled = true;
      video.removeAttribute('src');
      video.load();
    };
  }, [path]);

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt="Video Thumbnail"
        className={className}
        draggable={false}
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/[0.01]">
      <span className="material-symbols-outlined text-[36px] text-white/20 animate-pulse">play_circle</span>
    </div>
  );
};

interface MediaPreviewModalProps {
  item: DownloadItem;
  onClose: () => void;
  onDelete: () => void;
  onDeleteFile: () => void;
  onOpenFolder: () => void;
}

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  item,
  onClose,
  onDelete,
  onDeleteFile,
  onOpenFolder}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isVideo = item.category === 'Videos';
  const isAudio = item.category === 'Audio';
  const mediaUrl = `media://local/${item.path.replace(/\\/g, '/')}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="relative w-[min(800px,90vw)] max-h-[85vh] rounded-2xl border border-white/[0.06] bg-[#0E0E0E] shadow-2xl overflow-hidden animate-pop-center flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.05] border border-white/[0.06]">
              <AIIcon id={item.aiId.toLowerCase()} className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-white tracking-tight truncate max-w-[400px]">{item.name}</h2>
              <div className="flex items-center gap-1.5 text-[10.5px] text-white/40 mt-0.5 font-medium">
                <span>{item.extension}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>{item.provider}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
            title="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Media Display */}
        <div className="flex-1 overflow-auto custom-scrollbar p-6 flex items-center justify-center bg-black/40">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-w-full max-h-[55vh] rounded-lg border border-white/5 shadow-lg bg-black"
            />
          ) : isAudio ? (
            <div className="flex flex-col items-center gap-6 p-8 rounded-xl bg-white/[0.02] border border-white/[0.05] w-full max-w-[400px]">
              <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px] text-[var(--accent)] animate-pulse">audiotrack</span>
              </div>
              <audio
                src={mediaUrl}
                controls
                autoPlay
                className="w-full"
              />
            </div>
          ) : (
            <img
              src={mediaUrl}
              alt={item.name}
              className="max-w-full max-h-[55vh] object-contain rounded-lg border border-white/5 shadow-lg"
              draggable={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between gap-4 shrink-0 bg-black/20">
          <div className="text-[11px] text-white/40 font-mono">
            {item.timestamp} • {item.size}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onOpenFolder(); }}
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] text-[12px] font-semibold text-white transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">folder_open</span>
              Show in folder
            </button>
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[12px] font-semibold text-white/60 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">remove_circle_outline</span>
              Remove
            </button>
            <button
              onClick={() => { onDeleteFile(); onClose(); }}
              className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[12px] font-semibold text-red-400 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">delete_forever</span>
              Delete File
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[#E8954F] text-[12px] font-bold text-black transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

type Category = 'All' | 'Images' | 'Videos' | 'Documents' | 'Code' | 'Audio';

const PROVIDER_NAMES: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  grok: 'Grok',
  deepseek: 'DeepSeek',
  kimi: 'Kimi',
  mistral: 'Mistral',
  huggingchat: 'HuggingChat',
  unknown: 'Unknown'
};

function getProviderName(aiId: string): string {
  return PROVIDER_NAMES[aiId.toLowerCase()] || aiId;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getDateGroup(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date >= today) {
    return 'Today';
  } else if (date >= yesterday) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return date.toLocaleDateString([], { hour: '2-digit', minute: '2-digit' });
  }
}

interface ActiveDownload {
  id: string;
  filename: string;
  receivedBytes: number;
  totalBytes: number;
  aiId: string;
  subfolder: string;
  timestamp: number;
}

const ActiveDownloadRow: React.FC<{ dl: ActiveDownload; getIcon: (sf: string) => string; getColor: (sf: string, fn: string) => string; onCancel?: (id: string) => void }> = ({ dl, getIcon, getColor, onCancel }) => {
  const [speed, setSpeed] = useState(0);
  const prevRef = useRef({ bytes: dl.receivedBytes, time: Date.now() });

  useEffect(() => {
    const now = Date.now();
    const dt = (now - prevRef.current.time) / 1000;
    if (dt > 0.3) {
      const db = dl.receivedBytes - prevRef.current.bytes;
      setSpeed(db / dt);
      prevRef.current = { bytes: dl.receivedBytes, time: now };
    }
  }, [dl.receivedBytes]);

  const percent = dl.totalBytes > 0 ? Math.round((dl.receivedBytes / dl.totalBytes) * 100) : 0;
  const extIndex = dl.filename.lastIndexOf('.');
  const ext = extIndex !== -1 ? dl.filename.slice(extIndex + 1).toUpperCase() : '';

  const formatSpeed = (b: number) => {
    if (b < 1024) return `${Math.round(b)} B/s`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB/s`;
    return `${(b / 1048576).toFixed(1)} MB/s`;
  };

  const formatEta = () => {
    if (speed <= 0 || dl.totalBytes <= 0) return '';
    const remaining = dl.totalBytes - dl.receivedBytes;
    const secs = remaining / speed;
    if (secs < 60) return `${Math.round(secs)}s left`;
    if (secs < 3600) return `${Math.round(secs / 60)}m left`;
    return `${Math.round(secs / 3600)}h left`;
  };

  return (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-[16px] bg-black/40 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-[10px] bg-white/[0.03] flex items-center justify-center border border-white/5 shrink-0">
            <span className={`material-symbols-outlined text-[20px] ${getColor(dl.subfolder, dl.filename)}`}>
              {getIcon(dl.subfolder)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-[13px] font-bold text-white/90 truncate" title={dl.filename}>{dl.filename}</span>
            <div className="flex items-center gap-2 text-[10px] text-white/35 font-bold uppercase tracking-wider">
              <span>{getProviderName(dl.aiId)}</span>
              <span>·</span>
              <span>{ext || 'FILE'}</span>
              <span>·</span>
              <span>{formatBytes(dl.receivedBytes)} / {dl.totalBytes > 0 ? formatBytes(dl.totalBytes) : 'Unknown'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {speed > 0 && <span className="text-[10px] font-mono text-white/30">{formatSpeed(speed)}</span>}
          {speed > 0 && dl.totalBytes > 0 && <span className="text-[10px] font-mono text-white/25">{formatEta()}</span>}
          <span className="text-[12px] font-mono font-bold text-[var(--accent)]">{percent}%</span>
          {onCancel && (
            <button
              onClick={() => onCancel(dl.id)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Cancel download"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden border border-white/5 relative">
        <div 
          className="h-full rounded-full transition-all duration-300 ease-out" 
          style={{ 
            width: `${percent}%`,
            background: 'linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, white) 100%)',
            boxShadow: '0 0 8px var(--accent)'
          }}
        />
      </div>
    </div>
  );
};

export const DownloadsView: React.FC = () => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<DownloadItem | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'largest' | 'smallest' | 'az'>('newest');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [errorEntries, setErrorEntries] = useState<any[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [aiFilter, setAiFilter] = useState<string>('all');
  const editInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const currentViewMode = (activeCategory === 'Images' || activeCategory === 'Videos' || activeCategory === 'Audio') ? 'grid' : viewMode;

  const activeDownloads = useStore((state) => state.activeDownloads);
  const setCommandPaletteOpen = useStore((state) => state.setCommandPaletteOpen);
  const [parent] = useAutoAnimate();
  const t = useT();

  const categoryLabels: Record<string, string> = {
    'All': t('downloads.categories.all'),
    'Images': t('downloads.categories.images'),
    'Videos': t('downloads.categories.videos'),
    'Documents': t('downloads.categories.documents'),
    'Code': t('downloads.categories.code'),
    'Audio': t('downloads.categories.audio')};

  const filteredActiveDownloads = useMemo(() => {
    return activeDownloads.filter(dl => {
      const matchesSearch = dl.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || dl.subfolder === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeDownloads, searchQuery, activeCategory]);

  const loadDownloads = async () => {
    try {
      const raw = await window.electron.downloadsGetAll();
      const mapped = raw.map((entry: any) => {
        const extIndex = entry.filename.lastIndexOf('.');
        const ext = extIndex !== -1 ? entry.filename.slice(extIndex + 1).toUpperCase() : '';
        return {
          id: entry.id,
          name: entry.filename,
          size: formatBytes(entry.size),
          rawSize: entry.size,
          extension: ext,
          provider: getProviderName(entry.aiId),
          aiId: entry.aiId,
          category: entry.subfolder as any,
          timestamp: formatTimestamp(entry.timestamp),
          rawTimestamp: entry.timestamp,
          dateGroup: getDateGroup(entry.timestamp),
          path: entry.path,
          previewUrl: entry.previewUrl,
          duration: entry.duration
        };
      });
      setDownloads(mapped);
    } catch (_) { /* ignored */ }
  };

  const loadErrors = async () => {
    try {
      const errors = await window.electron.downloadsGetErrors();
      setErrorEntries(errors || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadDownloads();
    loadErrors();

    const unsub = window.electron.onDownloadComplete(() => {
      loadDownloads();
    });

    const unsubFailed = window.electron.onDownloadFailed(() => {
      loadErrors();
    });

    return () => {
      unsub();
      unsubFailed();
    };
  }, []);

  // D17: Filter persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('downloads-filter-state');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.activeCategory) setActiveCategory(state.activeCategory);
        if (state.sortBy) setSortBy(state.sortBy);
        if (state.dateFilter) setDateFilter(state.dateFilter);
        if (state.viewMode) setViewMode(state.viewMode);
        if (state.aiFilter) setAiFilter(state.aiFilter);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('downloads-filter-state', JSON.stringify({
        activeCategory, sortBy, dateFilter, viewMode, aiFilter
      }));
    } catch { /* ignore */ }
  }, [activeCategory, sortBy, dateFilter, viewMode, aiFilter]);

  const handleOpenFile = (path: string) => {
    window.electron.downloadsOpenFile(path);
  };

  const handleDeleteEntry = async (id: string, deleteFile?: boolean) => {
    const success = await window.electron.downloadsDeleteEntry(id, deleteFile);
    if (success) {
      loadDownloads();
    }
  };

  const handleCopyPath = async (filePath: string) => {
    try {
      await navigator.clipboard.writeText(filePath);
    } catch { /* ignore */ }
  };

  const handleCopyDownload = async (item: DownloadItem) => {
    try {
      await window.electron.copyFileToClipboard(item.path);
    } catch (_) { /* ignored */ }
  };

  const handleClearErrors = async () => {
    await window.electron.downloadsClearErrors();
    setErrorEntries([]);
    setShowErrors(false);
  };

  // D12: Bulk selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredDownloads.map(d => d.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    await Promise.all(Array.from(selectedIds).map(id => window.electron.downloadsDeleteEntry(id, false)));
    setSelectedIds(new Set());
    loadDownloads();
  };

  const handleBulkCopyPaths = async () => {
    const items = filteredDownloads.filter(d => selectedIds.has(d.id));
    const paths = items.map(d => d.path).join('\n');
    try { await navigator.clipboard.writeText(paths); } catch { /* ignore */ }
  };

  // D13: Inline rename
  const handleStartRename = (item: DownloadItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleCommitRename = async () => {
    if (!editingId || !editValue.trim()) { setEditingId(null); return; }
    const result = await window.electron.downloadsRename(editingId, editValue.trim());
    if (result) {
      setEditingId(null);
      setEditValue('');
      loadDownloads();
    }
  };

  // D14: Move to subfolder
  const handleMoveToSubfolder = async (id: string, targetSubfolder: string) => {
    await window.electron.downloadsMoveToSubfolder(id, targetSubfolder);
    setContextMenu(null);
    loadDownloads();
  };

  // D15: Reveal in OS
  const handleRevealInOS = async (filePath: string) => {
    await window.electron.downloadsRevealInOS(filePath);
    setContextMenu(null);
  };

  // D22: Cancel active download
  const handleCancelDownload = async (downloadId: string) => {
    await window.electron.downloadsCancel(downloadId);
  };

  // Context menu close on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const filteredDownloads = useMemo(() => {
    const now = Date.now();
    return downloads
      .filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesAI = aiFilter === 'all' || item.aiId === aiFilter;
        let matchesDate = true;
        if (dateFilter === 'today') {
          matchesDate = (now - item.rawTimestamp) < 86400000;
        } else if (dateFilter === 'week') {
          matchesDate = (now - item.rawTimestamp) < 604800000;
        } else if (dateFilter === 'month') {
          matchesDate = (now - item.rawTimestamp) < 2592000000;
        }
        return matchesSearch && matchesCategory && matchesDate && matchesAI;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'oldest': return a.rawTimestamp - b.rawTimestamp;
          case 'largest': return b.rawSize - a.rawSize;
          case 'smallest': return a.rawSize - b.rawSize;
          case 'az': return a.name.localeCompare(b.name);
          default: return b.rawTimestamp - a.rawTimestamp;
        }
      });
  }, [downloads, searchQuery, activeCategory, sortBy, dateFilter, aiFilter]);

  const stats = useMemo(() => {
    const totalBytes = filteredDownloads.reduce((sum, item) => sum + (item.rawSize || 0), 0);
    const lastItem = filteredDownloads[0];
    return {
      count: filteredDownloads.length,
      size: formatBytes(totalBytes),
      sources: new Set(filteredDownloads.map(item => item.provider)).size,
      last: lastItem ? lastItem.timestamp : 'N/A'
    };
  }, [filteredDownloads]);

  const uniqueAIIds = useMemo(() => {
    return [...new Set(downloads.map(d => d.aiId))].sort();
  }, [downloads]);

  const groupedDownloads = useMemo(() => {
    const groups: Record<string, Record<string, DownloadItem[]>> = {};
    
    filteredDownloads.forEach(item => {
      if (!groups[item.dateGroup]) groups[item.dateGroup] = {};
      if (!groups[item.dateGroup][item.provider]) groups[item.dateGroup][item.provider] = [];
      groups[item.dateGroup][item.provider].push(item);
    });
    
    return groups;
  }, [filteredDownloads]);

  // D18: Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingId) return;
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setContextMenu(null);
        return;
      }
      if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSelectedIds(new Set(filteredDownloads.map(d => d.id)));
        return;
      }
      if (!filteredDownloads.length) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        if (selectedIds.size === 0) {
          setSelectedIds(new Set([filteredDownloads[0].id]));
        } else {
          const lastSelected = Array.from(selectedIds).pop();
          const idx = filteredDownloads.findIndex(d => d.id === lastSelected);
          if (idx >= 0 && idx < filteredDownloads.length - 1) {
            setSelectedIds(new Set([filteredDownloads[idx + 1].id]));
          }
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        if (selectedIds.size === 0) return;
        const lastSelected = Array.from(selectedIds).pop();
        const idx = filteredDownloads.findIndex(d => d.id === lastSelected);
        if (idx > 0) {
          setSelectedIds(new Set([filteredDownloads[idx - 1].id]));
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (selectedIds.size === 1) {
          const id = Array.from(selectedIds)[0];
          const item = filteredDownloads.find(d => d.id === id);
          if (item) handleOpenFile(item.path);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          (async () => {
            await Promise.all(Array.from(selectedIds).map(id => window.electron.downloadsDeleteEntry(id, false)));
            setSelectedIds(new Set());
            loadDownloads();
          })();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filteredDownloads, selectedIds, editingId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const getFileIcon = (item: DownloadItem) => {
    switch (item.category) {
      case 'Images': return 'image';
      case 'Videos': return 'movie';
      case 'Documents': return 'description';
      case 'Code': return 'code';
      case 'Audio': return 'audiotrack';
      default: return 'insert_drive_file';
    }
  };

  const getIconColor = (item: DownloadItem) => {
    if (item.category === 'Code') {
      if (item.extension === 'TSX' || item.extension === 'TS') return 'text-blue-400';
      if (item.extension === 'PY') return 'text-yellow-400';
      if (item.extension === 'CSS') return 'text-blue-300';
      if (item.extension === 'JS') return 'text-yellow-300';
      return 'text-green-400';
    }
    if (item.category === 'Documents') {
      if (item.extension === 'PDF') return 'text-red-400';
      if (item.extension === 'MD') return 'text-slate-400';
      return 'text-blue-400';
    }
    return 'text-white/30';
  };

  const getActiveFileIcon = (subfolder: string) => {
    switch (subfolder) {
      case 'Images': return 'image';
      case 'Videos': return 'movie';
      case 'Documents': return 'description';
      case 'Code': return 'code';
      case 'Audio': return 'audiotrack';
      default: return 'insert_drive_file';
    }
  };

  const getActiveIconColor = (subfolder: string, filename: string) => {
    const extIndex = filename.lastIndexOf('.');
    const ext = extIndex !== -1 ? filename.slice(extIndex + 1).toUpperCase() : '';
    if (subfolder === 'Code') {
      if (ext === 'TSX' || ext === 'TS') return 'text-blue-400';
      if (ext === 'PY') return 'text-yellow-400';
      if (ext === 'CSS') return 'text-blue-300';
      if (ext === 'JS') return 'text-yellow-300';
      return 'text-green-400';
    }
    if (subfolder === 'Documents') {
      if (ext === 'PDF') return 'text-red-400';
      if (ext === 'MD') return 'text-slate-400';
      return 'text-blue-400';
    }
    return 'text-white/30';
  };

  return (
    <div className="flex-1 flex flex-col text-white bg-black relative font-sans overflow-hidden animate-fade-in">
      {/* Background Subtle Glow */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 50% -10%, rgba(244,164,96,0.04) 0%, rgba(0,0,0,0) 60%)' }}></div>

      <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative z-10 no-drag">
        <div className="max-w-[1000px] mx-auto px-8 pt-8 pb-24 flex flex-col gap-6 w-full">
          
          {/* Header & Stats */}
          <header className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-[480px] group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[var(--accent)] transition-colors text-[16px]">search</span>
              <input 
                type="text" 
                readOnly
                onFocus={() => setCommandPaletteOpen(true)}
                placeholder={t('downloads.search.placeholder')} 
                className="w-full h-10 pl-10 pr-4 bg-surface border border-white/5 rounded-[12px] text-[13px] focus:outline-none focus:border-[var(--accent)] transition-all placeholder:text-white/10 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-4 gap-4 w-full max-w-[800px] mx-auto">
              {[
                { label: t('downloads.stats.files'), value: stats.count, icon: 'description' },
                { label: t('downloads.stats.totalSize'), value: stats.size, icon: 'database' },
                { label: t('downloads.stats.aiSources'), value: stats.sources, icon: 'hub' },
                { label: t('downloads.stats.lastDownload'), value: stats.last, icon: 'schedule' }
              ].map((stat, i) => (
                <div key={i} className="p-3 rounded-[16px] bg-surface border border-white/5 flex items-center gap-3 hover:border-white/10 hover:bg-[#151515] transition-all cursor-default group">
                  <div className="w-9 h-9 rounded-[10px] bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover:bg-white/5 group-hover:border-white/10 transition-all">
                    <span className="material-symbols-outlined text-white/30 text-[16px] group-hover:text-white/50 transition-colors">{stat.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[16px] font-semibold tracking-tight leading-none mb-1">{stat.value}</div>
                    <div className="text-[9px] text-white/20 uppercase tracking-[0.15em] font-bold">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </header>

          {/* D11: AI Quick Filter Rail */}
          {uniqueAIIds.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-1 w-full max-w-[800px] mx-auto">
              <button
                onClick={() => setAiFilter('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                  aiFilter === 'all'
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'bg-white/[0.03] text-white/30 border border-white/5 hover:text-white/60 hover:bg-white/[0.06]'
                }`}
              >
                All AI
              </button>
              {uniqueAIIds.map(aiId => (
                <button
                  key={aiId}
                  onClick={() => setAiFilter(aiId === aiFilter ? 'all' : aiId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                    aiFilter === aiId
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                      : 'bg-white/[0.03] text-white/30 border border-white/5 hover:text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  <AIIcon id={aiId} className="w-3.5 h-3.5" />
                  {getProviderName(aiId)}
                </button>
              ))}
            </div>
          )}

          {/* D12: Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--accent)]/5 border border-[var(--accent)]/15 w-full max-w-[800px] mx-auto">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold text-[var(--accent)]">{selectedIds.size} selected</span>
                <button onClick={handleDeselectAll} className="text-[11px] text-white/40 hover:text-white/70 transition-colors font-semibold">Deselect all</button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleBulkCopyPaths} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  Copy paths
                </button>
                <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 hover:bg-red-500/10 transition-all">
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 py-4 border-b border-white/5 w-full max-w-[800px] mx-auto">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
              {['All', 'Images', 'Videos', 'Documents', 'Code', 'Audio'].map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat as Category)}
                  className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeCategory === cat 
                      ? '' 
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
                  }`}
                  style={activeCategory === cat ? {
                    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                    color: 'var(--accent)',
                    boxShadow: '0 0 20px rgba(244,164,96,0.1), 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent)'
                  } : undefined}>
                  {cat !== 'All' && (
                    <span className="material-symbols-outlined text-[14px] opacity-70">
                      {cat === 'Images' ? 'image' : cat === 'Videos' ? 'movie' : cat === 'Documents' ? 'description' : cat === 'Code' ? 'code' : 'audiotrack'}
                    </span>
                  )}
                  {categoryLabels[cat] || cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-white/5">
              {([
                { id: 'all', label: 'All Time', icon: 'schedule' },
                { id: 'today', label: 'Today', icon: 'today' },
                { id: 'week', label: 'This Week', icon: 'date_range' },
                { id: 'month', label: 'This Month', icon: 'calendar_month' }] as const).map((df) => (
                <button
                  key={df.id}
                  onClick={() => setDateFilter(df.id)}
                  className={`px-2.5 py-1.5 rounded-[8px] text-[10px] font-bold transition-all whitespace-nowrap ${
                    dateFilter === df.id
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/25 hover:text-white/50 hover:bg-white/[0.02]'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>

            {errorEntries.length > 0 && (
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-all"
              >
                <span className="material-symbols-outlined text-[12px]">error</span>
                {errorEntries.length} failed
              </button>
            )}

            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-white/5">
              {([
                { id: 'newest' as const, label: 'Newest' },
                { id: 'oldest' as const, label: 'Oldest' },
                { id: 'largest' as const, label: 'Largest' },
                { id: 'smallest' as const, label: 'Smallest' },
                { id: 'az' as const, label: 'A→Z' }]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                    sortBy === opt.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/25 hover:text-white/50 hover:bg-white/[0.02]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-[12px] bg-surface border border-white/5">
              <button 
                onClick={() => setViewMode('list')}
                className={`w-8 h-8 flex items-center justify-center rounded-[10px] transition-all ${viewMode === 'list' ? 'bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10' : 'text-white/20 hover:text-white hover:bg-white/[0.02]'}`}
              >
                <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 flex items-center justify-center rounded-[10px] transition-all ${viewMode === 'grid' ? 'bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10' : 'text-white/20 hover:text-white hover:bg-white/[0.02]'}`}
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
              </button>
            </div>
          </div>

          {/* List/Grid Content */}
          <div className="flex flex-col gap-10" ref={parent}>
            {/* Active Downloads Section */}
            {filteredActiveDownloads.length > 0 && (
              <section className="flex flex-col gap-4 p-5 rounded-[24px] bg-white/[0.02] border border-[var(--accent)]/15 shadow-2xl relative overflow-hidden">
                {/* Glow behind section */}
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 10% 10%, color-mix(in srgb, var(--accent) 5%, transparent) 0%, rgba(0,0,0,0) 60%)' }}></div>
                
                <div className="relative z-10 flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]"></span>
                    </span>
                    <h3 className="text-xs font-black text-white/85 uppercase tracking-[0.3em]">{t('downloads.downloadingNow')} ({filteredActiveDownloads.length})</h3>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col gap-3">
                  {filteredActiveDownloads.map((dl) => (
                    <ActiveDownloadRow key={dl.filename} dl={dl} getIcon={getActiveFileIcon} getColor={getActiveIconColor} onCancel={handleCancelDownload} />
                  ))}
                </div>
              </section>
            )}

            {/* Failed Downloads Error Log */}
            {showErrors && errorEntries.length > 0 && (
              <section className="flex flex-col gap-3 p-5 rounded-[24px] bg-red-500/[0.03] border border-red-500/10 relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-red-400">error</span>
                    <h3 className="text-xs font-black text-red-400/80 uppercase tracking-[0.3em]">Failed Downloads ({errorEntries.length})</h3>
                  </div>
                  <button
                    onClick={handleClearErrors}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    Clear All
                  </button>
                </div>
                {errorEntries.slice(0, 10).map((err) => (
                  <div key={err.id} className="flex items-center justify-between p-3 rounded-[12px] bg-black/20 border border-white/5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-[16px] text-red-400/60">broken_image</span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[12px] font-bold text-white/70 truncate">{err.filename}</span>
                        <span className="text-[10px] text-white/30">{err.reason}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-white/20 shrink-0">{formatTimestamp(err.timestamp)}</span>
                  </div>
                ))}
              </section>
            )}

            {Object.entries(groupedDownloads).map(([date, providers]) => (
              <section key={date}>
                <h3 className="text-[10px] font-black text-white/15 uppercase tracking-[0.4em] mb-6 px-1">{date}</h3>
                <div className="flex flex-col gap-8">
                  {Object.entries(providers).map(([provider, items]) => {
                    const groupId = `${date}-${provider}`;
                    const isExpanded = expandedGroups.includes(groupId) || items.length <= 2;
                    const displayItems = isExpanded ? items : items.slice(0, 2);

                    return (
                      <div key={provider} className="flex gap-8">
                        {/* Provider Sidebar Info */}
                        <div className="w-[140px] shrink-0 pt-1 sticky top-32 h-fit">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div className="w-8 h-8 rounded-[10px] bg-white/[0.03] flex items-center justify-center border border-white/5 shadow-inner">
                              <AIIcon id={provider.toLowerCase()} className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            </div>
                            <span className="text-[14px] font-bold text-white/90 tracking-tight">{provider}</span>
                          </div>
                          <span className="text-[11px] text-white/20 ml-[42px] block font-semibold">{items.length} files</span>
                        </div>

                        {/* Items Container */}
                        <div className="flex-1 flex flex-col gap-2.5">
                          {currentViewMode === 'grid' ? (
                            <div className="grid grid-cols-4 gap-3">
                              {items.map(item => {
                                if (item.category === 'Images' || item.category === 'Videos' || item.category === 'Audio') {
                                  const isImage = item.category === 'Images';
                                  const isVideo = item.category === 'Videos';
                                  return (
                                    <div 
                                      key={item.id} 
                                      onClick={(e) => {
                                        if ((e.metaKey || e.ctrlKey)) { e.preventDefault(); handleToggleSelect(item.id); return; }
                                        setPreviewItem(item);
                                      }}
                                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item }); }}
                                      className={`bg-surface border rounded-[12px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.03),_0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-300 group cursor-pointer flex flex-col relative ${
                                        selectedIds.has(item.id)
                                          ? 'border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/20'
                                          : 'border-white/[0.04] hover:border-white/[0.08]'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/[0.04] shrink-0">
                                        <div className="flex items-center gap-1.5">
                                          {/* Selection circle */}
                                          <div
                                            onClick={(e) => { e.stopPropagation(); handleToggleSelect(item.id); }}
                                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                                              selectedIds.has(item.id)
                                                ? 'border-[var(--accent)] bg-[var(--accent)]'
                                                : 'border-white/20 opacity-0 group-hover:opacity-100 hover:border-white/40'
                                            }`}
                                          >
                                            {selectedIds.has(item.id) && <span className="material-symbols-outlined text-[10px] text-black">check</span>}
                                          </div>
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/[0.04] text-[10px] font-bold text-white/80">
                                            <AIIcon id={item.aiId.toLowerCase()} className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                                            <span>{item.provider}</span>
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/[0.04] text-[10px] font-semibold text-white/60">
                                            {item.extension}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="relative h-[120px] bg-background border-b border-white/[0.04] overflow-hidden flex items-center justify-center">
                                        {isImage ? (
                                          <DownloadImage path={item.path} className="absolute inset-0 w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                                        ) : isVideo ? (
                                          <VideoThumbnail path={item.path} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                                        ) : (
                                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.02] border-b border-white/[0.04]">
                                            <span className="material-symbols-outlined text-[42px] text-[var(--accent)] opacity-80 group-hover:scale-110 transition-transform duration-300 animate-pulse">audiotrack</span>
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>

                                      <div className="px-2.5 py-2 flex items-center justify-between">
                                        <span className="text-[12px] font-semibold text-white/90 truncate pr-2" title={item.name}>{item.name}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenFile(item.path); }}
                                            className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-colors"
                                            title="Show in folder"
                                          >
                                            <span className="material-symbols-outlined text-[15px]">folder_open</span>
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleCopyPath(item.path); }}
                                            className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-colors"
                                            title="Copy file path"
                                          >
                                            <span className="material-symbols-outlined text-[15px]">link</span>
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleCopyDownload(item); }}
                                            className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-colors"
                                            title="Copy file/contents"
                                          >
                                            <span className="material-symbols-outlined text-[15px]">content_copy</span>
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteEntry(item.id); }}
                                            className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[#EF4444] hover:bg-white/5 transition-colors"
                                            title="Delete from list"
                                          >
                                            <span className="material-symbols-outlined text-[15px]">delete</span>
                                          </button>
                                        </div>
                                      </div>

                                      <div className="px-2.5 pb-2 flex items-center justify-between text-[10px] text-white/40 font-mono">
                                        <span>{item.timestamp}</span>
                                        <span>{item.size}</span>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div 
                                    key={item.id} 
                                    onClick={(e) => {
                                      if ((e.metaKey || e.ctrlKey)) { e.preventDefault(); handleToggleSelect(item.id); return; }
                                      handleOpenFile(item.path);
                                    }}
                                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item }); }}
                                    className={`group flex flex-col gap-2 p-2.5 rounded-[18px] border transition-all cursor-pointer shadow-sm relative ${
                                      selectedIds.has(item.id)
                                        ? 'bg-[var(--accent)]/5 border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/20'
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15 hover:-translate-y-0.5'
                                    }`}
                                  >
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleCopyDownload(item); }}
                                      className="absolute top-2 right-9 w-6 h-6 rounded-md bg-black/60 border border-white/10 flex items-center justify-center text-white/40 hover:text-[var(--accent)] hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                      title="Copy file/contents"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteEntry(item.id); }}
                                      className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                      title="Delete from list"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">delete</span>
                                    </button>
                                    {/* Selection circle */}
                                    <div
                                      onClick={(e) => { e.stopPropagation(); handleToggleSelect(item.id); }}
                                      className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
                                        selectedIds.has(item.id)
                                          ? 'border-[var(--accent)] bg-[var(--accent)]'
                                          : 'border-white/20 opacity-0 group-hover:opacity-100 hover:border-white/40'
                                      }`}
                                    >
                                      {selectedIds.has(item.id) && <span className="material-symbols-outlined text-[11px] text-black">check</span>}
                                    </div>
                                    <div className="aspect-square rounded-[12px] bg-surface border border-white/5 overflow-hidden relative shadow-inner">
                                      {item.previewUrl ? (
                                        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/[0.01]">
                                          <span className={`material-symbols-outlined text-[32px] opacity-40 ${getIconColor(item)}`}>{getFileIcon(item)}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 px-1 pb-0.5">
                                      <span className="text-[12px] font-bold text-white/95 truncate leading-tight" title={item.name}>{item.name}</span>
                                      <span className="text-[10px] text-white/35 font-bold uppercase tracking-wider">{item.size} • {item.extension}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <>
                              {displayItems.map(item => (
                                <div 
                                  key={item.id} 
                                  onClick={(e) => {
                                    if ((e.metaKey || e.ctrlKey)) { e.preventDefault(); handleToggleSelect(item.id); return; }
                                    (item.category === 'Images' || item.category === 'Videos' || item.category === 'Audio') ? setPreviewItem(item) : handleOpenFile(item.path);
                                  }}
                                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item }); }}
                                  className={`group flex items-center justify-between p-3 rounded-[16px] border transition-all cursor-pointer ${
                                    selectedIds.has(item.id)
                                      ? 'bg-[var(--accent)]/5 border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/20'
                                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    {/* Selection circle */}
                                    <div
                                      onClick={(e) => { e.stopPropagation(); handleToggleSelect(item.id); }}
                                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                                        selectedIds.has(item.id)
                                          ? 'border-[var(--accent)] bg-[var(--accent)]'
                                          : 'border-white/20 opacity-0 group-hover:opacity-100 hover:border-white/40'
                                      }`}
                                    >
                                      {selectedIds.has(item.id) && <span className="material-symbols-outlined text-[11px] text-black">check</span>}
                                    </div>
                                    <div className="w-11 h-11 rounded-[12px] bg-surface border border-white/5 flex items-center justify-center overflow-hidden relative shadow-inner">
                                      {item.category === 'Images' ? (
                                        <div className="w-full h-full relative">
                                          <DownloadImage path={item.path} className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
                                        </div>
                                      ) : item.category === 'Videos' ? (
                                        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                                          <VideoThumbnail path={item.path} className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
                                        </div>
                                      ) : item.previewUrl ? (
                                        <>
                                          <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
                                          {item.duration && (
                                            <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/5 text-[8px] font-black text-white/90 font-mono tracking-tighter">
                                              {item.duration}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <span className={`material-symbols-outlined text-[22px] opacity-40 ${getIconColor(item)}`}>{getFileIcon(item)}</span>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      {editingId === item.id ? (
                                        <input
                                          ref={editInputRef}
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onBlur={handleCommitRename}
                                          onKeyDown={(e) => { if (e.key === 'Enter') handleCommitRename(); if (e.key === 'Escape') setEditingId(null); }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-[13px] font-bold text-white/90 bg-white/5 border border-[var(--accent)]/30 rounded-md px-2 py-0.5 focus:outline-none"
                                        />
                                      ) : (
                                        <span className="text-[13px] font-bold text-white/90 group-hover:text-white transition-colors">{item.name}</span>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{item.extension}</span>
                                        <span className="text-[10px] text-white/10">•</span>
                                        <span className="text-[10px] text-white/25 font-bold uppercase tracking-wider">{item.size}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6 pr-1">
                                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest group-hover:text-white/40 transition-colors">{item.timestamp}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleStartRename(item); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-[10px] text-white/30 hover:text-[var(--accent)] hover:bg-white/[0.08] transition-all" 
                                        title="Rename"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenFile(item.path); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-[10px] text-white/30 hover:text-white hover:bg-white/[0.08] hover:shadow-lg transition-all" 
                                        title="Show in folder"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleCopyPath(item.path); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-[10px] text-white/30 hover:text-[var(--accent)] hover:bg-white/[0.08] transition-all" 
                                        title="Copy file path"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">link</span>
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleCopyDownload(item); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-[10px] text-white/30 hover:text-[var(--accent)] hover:bg-white/[0.08] transition-all" 
                                        title="Copy file/contents"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteEntry(item.id); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-[10px] text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all" 
                                        title="Delete from list"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {items.length > 2 && !isExpanded && (
                                <button 
                                  onClick={() => toggleGroup(groupId)}
                                  className="w-fit ml-0 mt-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-black text-white/20 hover:text-[var(--accent)] hover:bg-[var(--accent)] transition-all flex items-center gap-2 group"
                                >
                                  +{items.length - 2} more files
                                  <span className="material-symbols-outlined text-[14px] text-white/10 group-hover:text-[var(--accent)] transition-colors">expand_more</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {filteredDownloads.length === 0 && filteredActiveDownloads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/10 animate-fade-in">
                <div className="w-20 h-20 rounded-[24px] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[40px] text-white/10">download</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-[16px] font-bold text-white/50">No downloads yet</p>
                  <p className="text-[12px] text-white/25 font-medium max-w-[300px]">Files downloaded from AI chats will appear here. Start a conversation and download something to get started.</p>
                </div>
                {activeCategory !== 'All' || searchQuery || dateFilter !== 'all' || aiFilter !== 'all' ? (
                  <button 
                    onClick={() => { setSearchQuery(''); setActiveCategory('All'); setDateFilter('all'); setAiFilter('all'); }}
                    className="px-4 py-2 rounded-[10px] bg-white/[0.03] border border-white/5 text-[12px] font-bold text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {t('downloads.clearFilters')}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-white/20">
                    <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono">Ctrl+A</kbd> Select all</div>
                    <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono">Space</kbd> Open</div>
                    <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono">Del</kbd> Delete</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewItem && (
        <MediaPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onDelete={() => handleDeleteEntry(previewItem.id)}
          onDeleteFile={() => handleDeleteEntry(previewItem.id, true)}
          onOpenFolder={() => handleOpenFile(previewItem.path)}
        />
      )}

      {/* D14/D15: Context Menu */}
      {contextMenu && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setContextMenu(null)}>
          <div
            ref={contextMenuRef}
            className="absolute min-w-[200px] p-1.5 rounded-[14px] bg-[#1C1C1E] border border-white/10 shadow-2xl backdrop-blur-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { handleRevealInOS(contextMenu.item.path); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[12px] font-semibold text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              Reveal in Explorer
            </button>
            <button
              onClick={() => { handleCopyPath(contextMenu.item.path); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[12px] font-semibold text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">link</span>
              Copy file path
            </button>
            <button
              onClick={() => { handleCopyDownload(contextMenu.item); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[12px] font-semibold text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              Copy file/contents
            </button>
            <button
              onClick={() => { handleStartRename(contextMenu.item); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[12px] font-semibold text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Rename
            </button>
            <div className="h-px bg-white/5 my-1" />
            <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-white/20 font-bold">Move to</div>
            {(['Images', 'Videos', 'Documents', 'Code', 'Audio'] as SubfolderType[]).map(sf => (
              <button
                key={sf}
                onClick={() => handleMoveToSubfolder(contextMenu.item.id, sf)}
                disabled={contextMenu.item.category === sf}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                  contextMenu.item.category === sf
                    ? 'text-white/15 cursor-not-allowed'
                    : 'text-white/80 hover:bg-white/[0.08]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {sf === 'Images' ? 'image' : sf === 'Videos' ? 'movie' : sf === 'Documents' ? 'description' : sf === 'Code' ? 'code' : 'audiotrack'}
                </span>
                {sf}
              </button>
            ))}
            <div className="h-px bg-white/5 my-1" />
            <button
              onClick={() => { handleDeleteEntry(contextMenu.item.id); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[12px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Remove from list
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DownloadsView;
