import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { AI_LIST } from '../shared/ai-list';
import { ScreenshotMetadata } from '../electron';
import { VaultItem, VaultItemKind, TodoItem, VAULT_TABS, VAULT_TABS as _VAULT_TABS_UNUSED } from '../shared/vault-schema';
import { VaultCard } from './VaultCard';
import { 
  WhiteboardElement, 
  RectangleElement, 
  CircleElement, 
  LineElement, 
  TextElement, 
  PathElement 
} from './tools/whiteboard-types';
import { EditVaultItemPopover } from './EditVaultItemPopover';
import { useT } from '../i18n/context';
import { useConfirm } from './ConfirmDialog';
import { AIIcon } from './AIIcon';


// ---- Types ----
// VaultItem is now imported from shared/vault-schema.ts
// Local VaultItem removed — F5 single canonical schema

interface WhiteboardPreviewProps {
  elements?: unknown[];
}

const WhiteboardPreview: React.FC<WhiteboardPreviewProps> = ({ elements }) => {
  const typedElements = (elements || []) as (RectangleElement | CircleElement | LineElement | TextElement | PathElement)[];

  const svgContent = useMemo(() => {
    if (typedElements.length === 0) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10 select-none">
          <span className="material-symbols-outlined text-xl mb-1">draw</span>
          <span className="text-[8.5px] uppercase font-bold tracking-wider">Empty Canvas</span>
        </div>
      );
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    typedElements.forEach((el) => {
      let elMinX = el.x;
      let elMinY = el.y;
      let elMaxX = el.x;
      let elMaxY = el.y;

      switch (el.type) {
        case 'rectangle': {
          const rect = el as RectangleElement;
          elMaxX = el.x + (rect.width || 0);
          elMaxY = el.y + (rect.height || 0);
          break;
        }
        case 'circle': {
          const circle = el as CircleElement;
          elMaxX = el.x + (circle.radius || 0) * 2;
          elMaxY = el.y + (circle.radius || 0) * 2;
          break;
        }
        case 'line': {
          const line = el as LineElement;
          elMinX = el.x + Math.min(0, line.x2 || 0);
          elMinY = el.y + Math.min(0, line.y2 || 0);
          elMaxX = el.x + Math.max(0, line.x2 || 0);
          elMaxY = el.y + Math.max(0, line.y2 || 0);
          break;
        }
        case 'text': {
          const textEl = el as TextElement;
          elMaxX = el.x + (textEl.width || 100);
          elMaxY = el.y + (textEl.height || 50);
          break;
        }
        case 'path': {
          const path = el as PathElement;
          if (path.points && path.points.length > 0) {
            let pMinX = path.points[0].x;
            let pMinY = path.points[0].y;
            let pMaxX = path.points[0].x;
            let pMaxY = path.points[0].y;
            path.points.forEach((p) => {
              pMinX = Math.min(pMinX, p.x);
              pMinY = Math.min(pMinY, p.y);
              pMaxX = Math.max(pMaxX, p.x);
              pMaxY = Math.max(pMaxY, p.y);
            });
            elMinX = el.x + pMinX;
            elMinY = el.y + pMinY;
            elMaxX = el.x + pMaxX;
            elMaxY = el.y + pMaxY;
          }
          break;
        }
      }

      minX = Math.min(minX, elMinX);
      minY = Math.min(minY, elMinY);
      maxX = Math.max(maxX, elMaxX);
      maxY = Math.max(maxY, elMaxY);
    });

    const padding = 15;
    let viewBoxWidth = maxX - minX;
    let viewBoxHeight = maxY - minY;

    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
      minX = 0;
      minY = 0;
      viewBoxWidth = 400;
      viewBoxHeight = 250;
    }

    if (viewBoxWidth <= 0) viewBoxWidth = 100;
    if (viewBoxHeight <= 0) viewBoxHeight = 100;

    const viewBox = `${minX - padding} ${minY - padding} ${viewBoxWidth + padding * 2} ${viewBoxHeight + padding * 2}`;

    return (
      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="max-h-full max-w-full p-2 select-none pointer-events-none"
      >
        {typedElements.map((el) => {
          const rotation = el.rotation || 0;
          return (
            <g key={el.id} transform={`translate(${el.x}, ${el.y}) rotate(${(rotation * 180) / Math.PI})`}>
              {(() => {
                switch (el.type) {
                  case 'rectangle': {
                    const rect = el as RectangleElement;
                    return (
                      <rect
                        x={0}
                        y={0}
                        width={rect.width}
                        height={rect.height}
                        rx={rect.cornerRadius || 0}
                        ry={rect.cornerRadius || 0}
                        stroke={el.color || '#F4A460'}
                        strokeWidth={rect.strokeWidth || 2}
                        fill={rect.fillColor || 'none'}
                      />
                    );
                  }
                  case 'circle': {
                    const circle = el as CircleElement;
                    return (
                      <circle
                        cx={circle.radius}
                        cy={circle.radius}
                        r={circle.radius}
                        stroke={el.color || '#F4A460'}
                        strokeWidth={circle.strokeWidth || 2}
                        fill={circle.fillColor || 'none'}
                      />
                    );
                  }
                  case 'line': {
                    const line = el as LineElement;
                    return (
                      <g>
                        <line
                          x1={0}
                          y1={0}
                          x2={line.x2}
                          y2={line.y2}
                          stroke={el.color || '#F4A460'}
                          strokeWidth={line.strokeWidth || 2}
                        />
                        {line.hasArrow && (
                          (() => {
                            const angle = Math.atan2(line.y2, line.x2);
                            const headlen = 10;
                            const x1 = line.x2 - headlen * Math.cos(angle - Math.PI / 6);
                            const y1 = line.y2 - headlen * Math.sin(angle - Math.PI / 6);
                            const x2 = line.x2 - headlen * Math.cos(angle + Math.PI / 6);
                            const y2 = line.y2 - headlen * Math.sin(angle + Math.PI / 6);
                            return (
                              <path
                                d={`M ${x1} ${y1} L ${line.x2} ${line.y2} L ${x2} ${y2}`}
                                stroke={el.color || '#F4A460'}
                                strokeWidth={line.strokeWidth || 2}
                                fill="none"
                              />
                            );
                          })()
                        )}
                      </g>
                    );
                  }
                  case 'text': {
                    const textEl = el as TextElement;
                    return (
                      <text
                        x={0}
                        y={0}
                        fill={el.color || '#F4A460'}
                        fontSize={textEl.fontSize || 16}
                        fontFamily={textEl.fontFamily || 'Arial'}
                        dominantBaseline="text-before-edge"
                        textAnchor={textEl.textAlign === 'center' ? 'middle' : textEl.textAlign === 'right' ? 'end' : 'start'}
                      >
                        {textEl.text}
                      </text>
                    );
                  }
                  case 'path': {
                    const path = el as PathElement;
                    const d = path.points && path.points.length > 1
                      ? `M ${path.points[0].x} ${path.points[0].y} ` + path.points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
                      : '';
                    return (
                      <path
                        d={d}
                        stroke={el.color || '#F4A460'}
                        strokeWidth={path.strokeWidth || 2}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  }
                  default:
                    return null;
                }
              })()}
            </g>
          );
        })}
      </svg>
    );
  }, [typedElements]);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-1.5 select-none pointer-events-none">
      {svgContent}
    </div>
  );
};

interface ScreenshotView extends ScreenshotMetadata {
  title: string;
  sourceName: string;
  sourceIcon: string;
  sourceColor: string;
  capture: string;
  date: string;
  time: string;
}



// ---- Helpers ----
import { CATEGORY_ICONS, CATEGORY_COLORS, getCategoryIcon } from '../shared/vault-schema';
import { formatRelativeTime } from '../utils/shared-hooks';

function formatDateTime(ms: number): { date: string; time: string } {
  const d = new Date(ms);
  return {
    date: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CONVERTER_ICONS: Record<string, string> = {
  Length: 'straighten',
  Weight: 'scale',
  Temperature: 'thermostat',
  Volume: 'water_drop',
  Currency: 'payments',
  Speed: 'speed'};

const formatCalendarDate = (dateKey: string) => {
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

function getAIInfo(aiId: string | undefined) {
  if (!aiId) return null;
  return AI_LIST.find(a => a.id === aiId) || null;
}

function newId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Reusable card container ----
const GlassCard: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-surface border border-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),_0_4px_12px_rgba(0,0,0,0.2)] rounded-[16px] flex flex-col transition-all duration-300 ${onClick ? 'cursor-pointer hover:bg-[#161618] hover:border-white/[0.06] group' : ''} ${className}`}
  >
    {children}
  </div>
);

// ---- Screenshot preview (loads base64 from main process) ----
const ScreenshotImage: React.FC<{ path: string }> = ({ path }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    window.electron.readScreenshot(path).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [path]);

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt="Screenshot"
        className="absolute inset-0 w-full h-full object-cover object-top"
        draggable={false}
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center text-white/30">
      <span className="material-symbols-outlined text-[28px] animate-pulse">image</span>
    </div>
  );
};

// ---- Main component ----
export const VaultView: React.FC = () => {
  const t = useT();
  const { confirm } = useConfirm();
  const {  screenshots,
    deleteScreenshot,
    vaultTab,
    setVaultTab,
    notebookSubTab,
    setNotebookSubTab,
    vaultItems,
    addVaultItem,
    deleteVaultItem,
    activeAI,
    toggleTodo,
    setWhiteboardContent,
    openToolWindow,
    toolWindows,
    setCommandPaletteOpen  } = useStore(useShallow(state => ({ screenshots: state.screenshots, deleteScreenshot: state.deleteScreenshot, vaultTab: state.vaultTab, setVaultTab: state.setVaultTab, notebookSubTab: state.notebookSubTab, setNotebookSubTab: state.setNotebookSubTab, vaultItems: state.vaultItems, addVaultItem: state.addVaultItem, deleteVaultItem: state.deleteVaultItem, activeAI: state.activeAI, toggleTodo: state.toggleTodo, setWhiteboardContent: state.setWhiteboardContent, openToolWindow: state.openToolWindow, toolWindows: state.toolWindows, setCommandPaletteOpen: state.setCommandPaletteOpen })));

  const [searchQuery, setSearchQuery] = useState('');
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [promptsView, setPromptsView] = useState<'grid' | 'list'>('grid');
  const [promptsPage, setPromptsPage] = useState(1);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [editingResponse, setEditingResponse] = useState(false);
  const [todoInnerTab, setTodoInnerTab] = useState<'today' | 'tasks'>('today');
  const [notebookFilter, setNotebookFilter] = useState<'all' | 'favorites'>('all');
  const [activeItemFilter, setActiveItemFilter] = useState<'all' | 'favorites'>('all');
  const [selectedNote, setSelectedNote] = useState<VaultItem | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const PROMPTS_PER_PAGE = 8;

  const calendarEvents = useMemo(() => {
    let items = vaultItems.filter((i): i is import('../shared/vault-schema').CalendarEventItem => i.kind === 'calendar')
      .map(i => ({ id: i.id, dateKey: i.dateKey || '', text: i.title, completed: !!i.completed }));
    if (notebookFilter === 'favorites') items = items.filter(i => vaultItems.find(v => v.id === i.id)?.isFavorite);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.text.toLowerCase().includes(q));
    }
    return items;
  }, [vaultItems, notebookFilter, searchQuery]);

  const calculatorHistory = useMemo(() => {
    let items = vaultItems.filter((i): i is import('../shared/vault-schema').CalculationItem => i.kind === 'calculation')
      .map(i => ({ expression: i.expression || '', result: i.result || '', timestamp: i.updatedAt || '', id: i.id }));
    if (notebookFilter === 'favorites') items = items.filter(i => vaultItems.find(v => v.id === i.id)?.isFavorite);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.expression.toLowerCase().includes(q) || i.result.toLowerCase().includes(q));
    }
    return items;
  }, [vaultItems, notebookFilter, searchQuery]);

  const handleDeleteCalendarEvent = async (id: string) => {
    await deleteVaultItem(id, 'Calendar');
  };


  const handleDeleteCalculatorItem = async (index: number) => {
    const item = calculatorHistory[index];
    if (!item) return;
    if (item.id) await deleteVaultItem(item.id, 'Calculations');
  };

  // ---- Derived data ----
  const prompts = useMemo(
    () => (vaultItems as VaultItem[])
      .filter((i) => i.kind === 'prompt')
      .sort((a, b) => {
        const aT = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bT = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bT - aT;
      }),
    [vaultItems]
  );

  const notebook = useMemo(
    () => (vaultItems as VaultItem[])
      .filter((i) => ['note', 'todo', 'scratchpad', 'calendar', 'calculation'].includes(i.kind))
      .sort((a, b) => {
        const aT = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bT = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bT - aT;
      }),
    [vaultItems]
  );

  const codebook = useMemo(
    () => (vaultItems as VaultItem[])
      .filter((i) => i.kind === 'code')
      .sort((a, b) => {
        const aT = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bT = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bT - aT;
      }),
    [vaultItems]
  );

  const responses = useMemo(
    () => (vaultItems as VaultItem[])
      .filter((i) => i.kind === 'response')
      .sort((a, b) => {
        const aT = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bT = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bT - aT;
      }),
    [vaultItems]
  );

  const whiteboards = useMemo(
    () => (vaultItems as VaultItem[])
      .filter((i) => i.kind === 'whiteboard')
      .sort((a, b) => {
        const aT = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bT = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bT - aT;
      }),
    [vaultItems]
  );

  const screenshotViews: ScreenshotView[] = useMemo(
    () => (screenshots as ScreenshotMetadata[]).map((s) => {
      const ai = getAIInfo(s.aiId);
      const { date, time } = formatDateTime(s.timestamp);
      const captureLabel = s.type === 'content' ? 'Visible Capture' : s.type === 'workspace' ? 'Workspace' : 'Full Page';
      const fileName = s.path.split(/[\\/]/).pop() || 'Screenshot';
      return {
        ...s,
        title: fileName.replace(/\.png$/i, ''),
        sourceName: ai?.name || 'Thred',
        sourceIcon: ai?.icon || 'smart_toy',
        sourceColor: ai?.color || '#F4A460',
        capture: captureLabel,
        date,
        time
      };
    }),
    [screenshots]
  );

  // Keep selection in sync with current prompts list
  useEffect(() => {
    if (prompts.length > 0) {
      if (!selectedPromptId || !prompts.find((p) => p.id === selectedPromptId)) {
        setSelectedPromptId(prompts[0].id);
      }
    } else {
      setSelectedPromptId(null);
    }
  }, [prompts, selectedPromptId]);

  // Reset prompts pagination when search changes
  useEffect(() => {
    setPromptsPage(1);
  }, [searchQuery, vaultTab]);

  // ---- Handlers ----
  const tabs = ['Prompts', 'Notebook', 'Codebook', 'Responses', 'Screenshots', 'Whiteboard'];

  const handleCreateNew = async (kind: string) => {
    setNewMenuOpen(false);
    const now = new Date().toISOString();
    const ai = getAIInfo(activeAI || undefined);
    const id = newId();
    let item: VaultItem;
    switch (kind) {
      case 'Prompt':
        item = {
          id, kind: 'prompt', category: 'Prompts',
          title: 'Untitled Prompt',
          desc: '',
          fullText: '',
          color: CATEGORY_COLORS.Prompts,
          icon: CATEGORY_ICONS.Prompts,
          isFavorite: false,
          isPinned: false,
          aiId: ai?.id,
          aiName: ai?.name,
          aiIcon: ai?.icon,
          aiColor: ai?.color,
          createdAt: now,
          updatedAt: now
        };
        break;
      case 'Context':
        item = {
          id, kind: 'context', category: 'Contexts',
          title: 'Untitled Context',
          desc: '',
          fullText: '',
          color: CATEGORY_COLORS.Contexts,
          icon: CATEGORY_ICONS.Contexts,
          isFavorite: false,
          isPinned: false,
          aiId: ai?.id,
          aiName: ai?.name,
          aiIcon: ai?.icon,
          aiColor: ai?.color,
          createdAt: now,
          updatedAt: now
        };
        break;
      case 'Artifact':
        item = {
          id, kind: 'artifact', category: 'Artifacts',
          title: 'Untitled Artifact',
          desc: '',
          fullText: '',
          color: CATEGORY_COLORS.Artifacts,
          icon: CATEGORY_ICONS.Artifacts,
          isFavorite: false,
          isPinned: false,
          aiId: ai?.id,
          aiName: ai?.name,
          aiIcon: ai?.icon,
          aiColor: ai?.color,
          createdAt: now,
          updatedAt: now
        };
        break;
      case 'Skill':
        item = {
          id, kind: 'skill', category: 'Skills',
          title: 'Untitled Skill',
          desc: '',
          fullText: '',
          color: CATEGORY_COLORS.Skills,
          icon: CATEGORY_ICONS.Skills,
          isFavorite: false,
          isPinned: false,
          aiId: ai?.id,
          aiName: ai?.name,
          aiIcon: ai?.icon,
          aiColor: ai?.color,
          createdAt: now,
          updatedAt: now
        };
        break;
      case 'Note': {
        const actualSubtab = (
          notebookSubTab === 'todo'
            ? (todoInnerTab === 'today' ? 'todo' : 'long-term-todo')
            : (notebookSubTab === 'calendar' || notebookSubTab === 'calculator')
              ? 'notes'
              : notebookSubTab
        ) as 'notes' | 'todo' | 'long-term-todo' | 'scratchpad' | 'focus';
        const noteTitles = {
          notes: 'Untitled Note',
          todo: 'Untitled To-do',
          'long-term-todo': 'Untitled Task',
          scratchpad: 'Untitled Scratchpad',
          focus: 'Untitled Focus Note'
        };
        item = {
          id, kind: 'note', category: 'Notebooks',
          notebookSubtab: actualSubtab,
          title: noteTitles[actualSubtab],
          desc: '',
          fullText: '',
          color: CATEGORY_COLORS.Notebooks,
          icon: CATEGORY_ICONS.Notebooks,
          isFavorite: false,
          isPinned: false,
          aiId: ai?.id,
          aiName: ai?.name,
          aiIcon: ai?.icon,
          aiColor: ai?.color,
          createdAt: now,
          updatedAt: now
        };
        break;
      }
      case 'Codebook':
        item = {
          id, kind: 'code', category: 'Codebook',
          title: 'Untitled Code Snippet',
          desc: '',
          fullText: '',
          color: CATEGORY_COLORS.Codebook,
          icon: CATEGORY_ICONS.Codebook,
          isFavorite: false,
          isPinned: false,
          aiId: ai?.id,
          aiName: ai?.name,
          aiIcon: ai?.icon,
          aiColor: ai?.color,
          createdAt: now,
          updatedAt: now
        };
        break;
      case 'Response':
        item = {
          id, kind: 'response', category: 'Responses',
          title: 'Untitled Response',
          desc: '',
          fullText: '',
          color: CATEGORY_COLORS.Responses,
          icon: CATEGORY_ICONS.Responses,
          isFavorite: false,
          isPinned: false,
          aiId: ai?.id,
          aiName: ai?.name,
          aiIcon: ai?.icon,
          aiColor: ai?.color,
          createdAt: now,
          updatedAt: now
        };
        break;
      default:
        return;
    }
    await addVaultItem(item);
    setVaultTab(kind === 'Note' ? 'Notebook' : kind === 'Codebook' ? 'Codebook' : `${kind}s`);
    if (kind === 'Prompt') {
      setSelectedPromptId(id);
      setEditingPrompt(true);
    }
    if (kind === 'Note') {
      setSelectedNote(item);
      setEditingNote(true);
    }
    undefined;
  };

  const handleSavePromptEdit = async (data: { title: string; text: string }) => {
    const now = new Date().toISOString();
    const ai = getAIInfo(activeAI || undefined);
    if (!selectedPromptId) {
      const id = newId();
      const newItem: VaultItem = {
        id,
        kind: 'prompt',
        category: 'Prompts',
        title: data.title,
        fullText: data.text,
        desc: data.text.length > 80 ? data.text.slice(0, 80) + '...' : data.text,
        color: CATEGORY_COLORS.Prompts,
        icon: CATEGORY_ICONS.Prompts,
        isFavorite: false,
        isPinned: false,
        aiId: ai?.id,
        aiName: ai?.name,
        aiIcon: ai?.icon,
        aiColor: ai?.color,
        createdAt: now,
        updatedAt: now
      };
      await addVaultItem(newItem);
      setSelectedPromptId(id);
      setEditingPrompt(false);
      undefined;
      return;
    }
    const existing = prompts.find((p) => p.id === selectedPromptId);
    if (!existing) return;
    const updated: VaultItem = {
      ...existing,
      title: data.title,
      fullText: data.text,
      desc: data.text.length > 80 ? data.text.slice(0, 80) + '...' : data.text,
      updatedAt: now
    };
    await addVaultItem(updated);
    setEditingPrompt(false);
    undefined;
  };

  const handleSaveCodeEdit = async (data: { title: string; text: string }) => {
    const now = new Date().toISOString();
    const ai = getAIInfo(activeAI || undefined);
    if (!selectedCodeId) {
      const id = newId();
      const newItem: VaultItem = {
        id,
        kind: 'code',
        category: 'Codebook',
        title: data.title,
        fullText: data.text,
        desc: data.text.length > 80 ? data.text.slice(0, 80) + '...' : data.text,
        color: CATEGORY_COLORS.Codebook,
        icon: CATEGORY_ICONS.Codebook,
        isFavorite: false,
        isPinned: false,
        aiId: ai?.id,
        aiName: ai?.name,
        aiIcon: ai?.icon,
        aiColor: ai?.color,
        createdAt: now,
        updatedAt: now
      };
      await addVaultItem(newItem);
      setEditingCode(false);
      setSelectedCodeId(null);
      undefined;
      return;
    }
    const existing = codebook.find((c) => c.id === selectedCodeId);
    if (!existing) return;
    const updated: VaultItem = {
      ...existing,
      title: data.title,
      fullText: data.text,
      desc: data.text.length > 80 ? data.text.slice(0, 80) + '...' : data.text,
      updatedAt: now
    };
    await addVaultItem(updated);
    setEditingCode(false);
    setSelectedCodeId(null);
    undefined;
  };

  const handleSaveResponseEdit = async (data: { title: string; text: string }) => {
    const now = new Date().toISOString();
    const ai = getAIInfo(activeAI || undefined);
    if (!selectedResponseId) {
      const id = newId();
      const newItem: VaultItem = {
        id,
        kind: 'response',
        category: 'Responses',
        title: data.title,
        fullText: data.text,
        desc: data.text.length > 80 ? data.text.slice(0, 80) + '...' : data.text,
        color: CATEGORY_COLORS.Responses,
        icon: CATEGORY_ICONS.Responses,
        isFavorite: false,
        isPinned: false,
        aiId: ai?.id,
        aiName: ai?.name,
        aiIcon: ai?.icon,
        aiColor: ai?.color,
        createdAt: now,
        updatedAt: now
      };
      await addVaultItem(newItem);
      setEditingResponse(false);
      setSelectedResponseId(null);
      undefined;
      return;
    }
    const existing = responses.find((r) => r.id === selectedResponseId);
    if (!existing) return;
    const updated: VaultItem = {
      ...existing,
      title: data.title,
      fullText: data.text,
      desc: data.text.length > 80 ? data.text.slice(0, 80) + '...' : data.text,
      updatedAt: now
    };
    await addVaultItem(updated);
    setEditingResponse(false);
    setSelectedResponseId(null);
    undefined;
  };

  const handleSaveNoteEdit = async (data: { title: string; text: string; subtab: 'notes' | 'todo' | 'long-term-todo' | 'scratchpad' | 'focus'; priority?: 'low' | 'medium' | 'high' }) => {
    if (!selectedNote) return;
    const existing = notebook.find((n) => n.id === selectedNote.id);
    if (!existing) return;
    const now = new Date().toISOString();
    const updated = {
      ...existing,
      title: data.title,
      fullText: data.text,
      notebookSubtab: data.subtab,
      priority: data.priority || 'medium',
      desc: data.text.length > 80 ? data.text.slice(0, 80) + '...' : data.text,
      updatedAt: now
    } as VaultItem;
    await addVaultItem(updated);
    setEditingNote(false);
    setSelectedNote(null);
    undefined;
  };

  const handleDeletePrompt = async (id: string) => {
    await deleteVaultItem(id, 'Prompts');
    if (selectedPromptId === id) setSelectedPromptId(null);
    undefined;
  };

  const handleDeleteScreenshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteScreenshot(id);
    undefined;
  };

  const handleCopyScreenshot = async (shot: any) => {
    try {
      const dataUrl = await window.electron.readScreenshot(shot.path);
      if (dataUrl) {
        const base64 = dataUrl.split('base64,')[1];
        await window.electron.copyImageToClipboard(base64);
      }
    } catch (err) {
      console.error('Failed to copy screenshot:', err);
    }
  };



  const handleToggleFavorite = async (id: string) => {
    const item = vaultItems.find((x) => x.id === id);
    if (!item) return;
    if (!item.isFavorite) {
      const favoritesCount = vaultItems.filter(x => x.isFavorite).length;
      if (favoritesCount >= 4) {
        await confirm({
          title: 'Favorite Limit Reached',
          message: 'You can only have up to 4 favorites. Please unfavorite another item first.',
          confirmLabel: 'OK',
          cancelLabel: 'Cancel',
          variant: 'warning'
        });
        return;
      }
    }
    await addVaultItem({ ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() });
  };

  const handleCopyPrompt = (p: VaultItem) => {
    if (p.fullText) {
      navigator.clipboard.writeText(p.fullText);
      undefined;
    }
  };

  // ---- Filtered prompts for current page + search ----
  const searchedPrompts = useMemo(() => {
    let filtered = prompts;
    if (activeItemFilter === 'favorites') filtered = filtered.filter(p => p.isFavorite);

    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.desc || '').toLowerCase().includes(q) ||
        (p.fullText || '').toLowerCase().includes(q)
    );
  }, [prompts, searchQuery, activeItemFilter]);

  const searchedNotebook = useMemo(() => {
    let filteredNotebook = notebook;

    // Apply filter (all/favorites/pinned)
    if (notebookFilter === 'favorites') filteredNotebook = filteredNotebook.filter(n => n.isFavorite);


    // Filter by active sub-tab (notes, todo, scratchpad) and inner tab for todo
    filteredNotebook = filteredNotebook.filter((n) => {
      const sub = n.notebookSubtab || 'notes';
      if (notebookSubTab === 'todo') {
        const expectedSub = todoInnerTab === 'today' ? 'todo' : 'long-term-todo';
        return sub === expectedSub;
      }
      return sub === notebookSubTab;
    });

    if (!searchQuery.trim()) return filteredNotebook;
    const q = searchQuery.toLowerCase();
    return filteredNotebook.filter(
      (n) => n.title.toLowerCase().includes(q) || (n.fullText || '').toLowerCase().includes(q) || (n.desc || '').toLowerCase().includes(q)
    );
  }, [notebook, notebookSubTab, todoInnerTab, notebookFilter, searchQuery]);

  const { todayItems, previousItems } = useMemo(() => {
    if (notebookSubTab !== 'todo' || todoInnerTab !== 'today') {
      return { todayItems: searchedNotebook, previousItems: [] };
    }
    const todayString = new Date().toDateString();
    const todayItemsList: VaultItem[] = [];
    const previousItemsList: VaultItem[] = [];
    for (const item of searchedNotebook) {
      const itemDateStr = item.createdAt ? new Date(item.createdAt).toDateString() : todayString;
      if (itemDateStr === todayString) {
        todayItemsList.push(item);
      } else {
        previousItemsList.push(item);
      }
    }
    return { todayItems: todayItemsList, previousItems: previousItemsList };
  }, [searchedNotebook, notebookSubTab, todoInnerTab]);

  const searchedScreenshots = useMemo(() => {
    if (!searchQuery.trim()) return screenshotViews;
    const q = searchQuery.toLowerCase();
    return screenshotViews.filter((s) => s.title.toLowerCase().includes(q) || s.sourceName.toLowerCase().includes(q));
  }, [screenshotViews, searchQuery]);

  const searchedCodebook = useMemo(() => {
    let filtered = codebook;
    if (activeItemFilter === 'favorites') filtered = filtered.filter(c => c.isFavorite);

    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      (c) => c.title.toLowerCase().includes(q) || (c.fullText || '').toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q)
    );
  }, [codebook, searchQuery, activeItemFilter]);

  const searchedResponses = useMemo(() => {
    let filtered = responses;
    if (activeItemFilter === 'favorites') filtered = filtered.filter(r => r.isFavorite);

    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      (r) => r.title.toLowerCase().includes(q) || (r.fullText || '').toLowerCase().includes(q) || (r.desc || '').toLowerCase().includes(q)
    );
  }, [responses, searchQuery, activeItemFilter]);

  const searchedWhiteboard = useMemo(() => {
    if (!searchQuery.trim()) return whiteboards;
    const q = searchQuery.toLowerCase();
    return whiteboards.filter(
      (w) => w.title.toLowerCase().includes(q) || (w.desc || '').toLowerCase().includes(q)
    );
  }, [whiteboards, searchQuery]);

  const pagedPrompts = searchedPrompts.slice((promptsPage - 1) * PROMPTS_PER_PAGE, promptsPage * PROMPTS_PER_PAGE);
  const promptPageCount = Math.max(1, Math.ceil(searchedPrompts.length / PROMPTS_PER_PAGE));

  const currentEditPrompt = selectedPromptId ? prompts.find((p) => p.id === selectedPromptId) || null : null;
  const currentEditCode = selectedCodeId ? codebook.find((c) => c.id === selectedCodeId) || null : null;
  const currentEditResponse = selectedResponseId ? responses.find((r) => r.id === selectedResponseId) || null : null;

  const activeVaultItems = vaultTab === 'Codebook' ? codebook : vaultTab === 'Responses' ? responses : prompts;
  const searchedActiveItems = vaultTab === 'Codebook' ? searchedCodebook : vaultTab === 'Responses' ? searchedResponses : searchedPrompts;
  const pagedActiveItems = searchedActiveItems.slice((promptsPage - 1) * PROMPTS_PER_PAGE, promptsPage * PROMPTS_PER_PAGE);
  const activeItemPageCount = Math.max(1, Math.ceil(searchedActiveItems.length / PROMPTS_PER_PAGE));
  const currentEditActiveItem = vaultTab === 'Codebook' ? currentEditCode : vaultTab === 'Responses' ? currentEditResponse : currentEditPrompt;
  const selectedActiveItemId = vaultTab === 'Codebook' ? selectedCodeId : vaultTab === 'Responses' ? selectedResponseId : selectedPromptId;
  const setSelectedActiveItemId = (id: string | null) => {
    if (vaultTab === 'Codebook') setSelectedCodeId(id);
    else if (vaultTab === 'Responses') setSelectedResponseId(id);
    else setSelectedPromptId(id);
  };
  const handleDeleteActiveItem = async (id: string) => {
    await deleteVaultItem(id, vaultTab as any);
    if (selectedActiveItemId === id) setSelectedActiveItemId(null);
    undefined;
  };

  const renderNotebookCard = (n: VaultItem) => {
    return (
      <GlassCard
        key={n.id}
        className="p-4 justify-between min-h-[140px] hover:border-white/[0.08] transition-all cursor-pointer group/card"
        onClick={() => {
          setSelectedNote(n);
          setEditingNote(true);
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-8 h-8 rounded-[10px] bg-[#1A1A1C] border border-white/[0.04] flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--accent)] text-[16px]">{n.icon || CATEGORY_ICONS.Notebooks}</span>
          </div>
          <span className="text-[10px] text-white/40 font-mono">{formatRelativeTime(n.updatedAt || n.createdAt)}</span>
        </div>
        <div className="flex flex-col flex-1 justify-between min-h-[96px]">
          <div>
            <div className="flex items-center gap-2 mb-1.5 min-w-0">
              {((n.notebookSubtab === 'todo' || n.notebookSubtab === 'long-term-todo') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTodo(n.id);
                  }}
                  className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center shrink-0 hover:border-[var(--accent)] transition-colors cursor-pointer"
                  title={(n as TodoItem).completed === true ? "Mark pending" : "Mark completed"}
                >
                  {(n as TodoItem).completed === true && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                </button>
              ))}
              <h4 className={`text-[13px] font-bold text-white/90 truncate group-hover/card:text-white transition-colors flex-1 ${(n as TodoItem).completed === true ? 'line-through text-white/30' : ''}`}>
                {n.title}
              </h4>
            </div>
            <p className="text-[11px] text-white/40 line-clamp-2 leading-snug mb-2">{n.desc || n.fullText?.slice(0, 100) || 'No content yet.'}</p>

            {/* Timing details for todo items */}
            {(n.notebookSubtab === 'todo' || n.notebookSubtab === 'long-term-todo') && (
              <div className="flex flex-col gap-0.5 mb-3 text-[9.5px] text-white/30 font-mono bg-white/[0.01] border border-white/[0.02] p-1.5 rounded-md select-text">
                {typeof n.createdAt === 'string' && (
                  <div>Created: {(() => {
                    const { date, time } = formatDateTime(new Date(n.createdAt).getTime());
                    return `${date} ${time}`;
                  })()}</div>
                )}
                {(n as TodoItem).completed === true && typeof (n as TodoItem).completedAt === 'string' && (
                  <div className="text-[var(--accent)]/85">Completed: {(() => {
                    const { date, time } = formatDateTime(new Date((n as TodoItem).completedAt!).getTime());
                    return `${date} ${time}`;
                  })()}</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto">
            {(() => {
              const sub = (n.notebookSubtab || 'notes') as 'notes' | 'todo' | 'long-term-todo' | 'scratchpad';
              const tagStyle = {
                notes: { label: 'Note', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                todo: { label: 'To-do', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                'long-term-todo': { label: 'Long Term', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
                scratchpad: { label: 'Scratchpad', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }}[sub];
              return (
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                    style={{ color: tagStyle.color, backgroundColor: tagStyle.bg }}
                  >
                    <div className="w-1 h-1 rounded-full bg-current"></div>
                    {tagStyle.label}
                  </span>
                  {(sub === 'todo' || sub === 'long-term-todo') && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 capitalize"
                      style={{
                        color: ((n as TodoItem).priority === 'high') ? '#EF4444' : ((n as TodoItem).priority === 'low') ? '#9CA3AF' : '#F59E0B',
                        backgroundColor: ((n as TodoItem).priority === 'high') ? 'rgba(239,68,68,0.1)' : ((n as TodoItem).priority === 'low') ? 'rgba(156,163,175,0.1)' : 'rgba(245,158,11,0.1)'
                      }}
                    >
                      <div className="w-1 h-1 rounded-full bg-current"></div>
                      {((n as TodoItem).priority || 'medium')}
                    </span>
                  )}
                </div>
              );
            })()}
            <div className="flex items-center gap-1.5">

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(n.id);
                }}
                className={`text-white/30 hover:text-[#F59E0B] transition-colors cursor-pointer ${n.isFavorite ? 'text-[#F59E0B]' : ''}`}
                title={n.isFavorite ? "Unfavorite" : "Favorite"}
              >
                <span className="material-symbols-outlined text-[14px]">{n.isFavorite ? 'star' : 'star'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPrompt(n);
                }}
                className="text-white/30 hover:text-[var(--accent)] transition-colors cursor-pointer"
                title="Copy note contents"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNote(n);
                  setEditingNote(true);
                }}
                className="text-white/30 hover:text-[var(--accent)] transition-colors cursor-pointer"
                title="Edit"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteVaultItem(n.id, 'Notebooks');
                }}
                className="text-white/30 hover:text-[#EF4444] transition-colors cursor-pointer"
                title="Delete"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  };

  const renderEmptyState = (label: string, icon: string) => (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface border border-white/[0.04] flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[var(--accent)] text-[26px] opacity-80">{icon}</span>
      </div>
      <h3 className="text-[14px] font-bold text-white mb-1">No {label} yet</h3>
      <p className="text-[12px] text-white/50 max-w-sm">
        Use the <span className="text-[var(--accent)] font-semibold">New</span> button above to create your first {label.toLowerCase()}.
      </p>
    </div>
  );

  // ---- U8: Per-tab keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
      const isMeta = e.metaKey || e.ctrlKey;

      // ? — show shortcuts (always active)
      if (e.key === '?' && !isInput && !isMeta) {
        e.preventDefault();
        undefined;
        return;
      }

      // Don't intercept when typing in inputs
      if (isInput || isMeta) return;

      // 1-7 — switch tabs
      const tabIndex = parseInt(e.key, 10);
      if (tabIndex >= 1 && tabIndex <= tabs.length && !isInput) {
        e.preventDefault();
        setVaultTab(tabs[tabIndex - 1]);
        return;
      }

      // / — focus search
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('#vault-search-input') as HTMLInputElement | null;
        searchInput?.focus();
        return;
      }

      // n — new item
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (vaultTab === 'Prompts') handleCreateNew('Prompt');
        else if (vaultTab === 'Codebook') handleCreateNew('Code');
        else if (vaultTab === 'Responses') handleCreateNew('Response');
        else if (vaultTab === 'Notebook') handleCreateNew('Note');
        return;
      }

      // j/k — navigate items
      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault();
        const items = searchedActiveItems;
        if (items.length === 0) return;
        const currentIdx = items.findIndex(i => i.id === selectedActiveItemId);
        const nextIdx = e.key === 'j'
          ? Math.min(currentIdx + 1, items.length - 1)
          : Math.max(currentIdx - 1, 0);
        const nextItem = items[nextIdx];
        if (nextItem) setSelectedActiveItemId(nextItem.id);
        return;
      }

      // Space — toggle preview pane (for Prompts/Codebook/Responses)
      if (e.key === ' ') {
        e.preventDefault();
        if (vaultTab === 'Prompts') {
          if (selectedPromptId) { setSelectedPromptId(null); setEditingPrompt(false); }
          else if (searchedPrompts.length > 0) { setSelectedPromptId(searchedPrompts[0].id); }
        } else if (vaultTab === 'Codebook') {
          if (selectedCodeId) { setSelectedCodeId(null); setEditingCode(false); }
          else if (searchedCodebook.length > 0) { setSelectedCodeId(searchedCodebook[0].id); }
        } else if (vaultTab === 'Responses') {
          if (selectedResponseId) { setSelectedResponseId(null); setEditingResponse(false); }
          else if (searchedResponses.length > 0) { setSelectedResponseId(searchedResponses[0].id); }
        }
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vaultTab, searchedActiveItems, selectedActiveItemId, searchedPrompts, searchedCodebook, searchedResponses, selectedPromptId, selectedCodeId, selectedResponseId, tabs, setVaultTab, handleCreateNew, setSelectedActiveItemId]);

  // ---- U9: Drag-and-drop handlers ----
  const handleCardDragStart = (e: React.DragEvent, itemId: string) => {
    e.stopPropagation();
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleCardDragEnd = () => {
    setDraggedItemId(null);
  };

  const TAB_KIND_MAP: Record<string, VaultItemKind> = {
    Prompts: 'prompt',
    Notebook: 'note',
    Codebook: 'code',
    Responses: 'response',
    Screenshots: 'screenshot',
    Whiteboard: 'whiteboard'};

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTabDrop = async (targetTab: string, e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!itemId) return;
    const item = vaultItems.find(i => i.id === itemId);
    if (!item) return;
    const targetKind = TAB_KIND_MAP[targetTab];
    if (!targetKind || item.kind === targetKind) { setDraggedItemId(null); return; }

    const updatedItem = { ...item, kind: targetKind, category: targetTab, updatedAt: new Date().toISOString() };
    await addVaultItem(updatedItem);
    setDraggedItemId(null);
    undefined;
  };

  // ---- U10: Multi-select with bulk actions ----
  const selectionMode = selectedItemIds.size > 0;

  const handleToggleSelect = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const items = vaultTab === 'Codebook' ? searchedCodebook : vaultTab === 'Responses' ? searchedResponses : vaultTab === 'Prompts' ? searchedPrompts : [];
    setSelectedItemIds(new Set(items.map(i => i.id)));
  };

  const handleDeselectAll = () => setSelectedItemIds(new Set());

  const handleBulkDelete = async () => {
    const promises = Array.from(selectedItemIds).map(async (id) => {
      const item = vaultItems.find(i => i.id === id);
      if (item) await deleteVaultItem(id, item.category || vaultTab);
    });
    await Promise.all(promises);
    undefined;
    setSelectedItemIds(new Set());
  };



  const handleBulkFavorite = async () => {
    const selectedItems = Array.from(selectedItemIds).map(id => vaultItems.find(i => i.id === id)).filter(Boolean) as VaultItem[];
    const currentlyFavorite = vaultItems.filter(x => x.isFavorite);
    const toFavoriteCount = selectedItems.filter(x => !x.isFavorite).length;
    const toUnfavoriteCount = selectedItems.filter(x => x.isFavorite).length;
    const nextFavoriteCount = currentlyFavorite.length + toFavoriteCount - toUnfavoriteCount;
    if (nextFavoriteCount > 4) {
      await confirm({
        title: 'Favorite Limit Reached',
        message: 'You can only have up to 4 favorites. Please select fewer items to favorite or unfavorite others first.',
        confirmLabel: 'OK',
        cancelLabel: 'Cancel',
        variant: 'warning'
      });
      return;
    }

    const promises = Array.from(selectedItemIds).map(async (id) => {
      const item = vaultItems.find(i => i.id === id);
      if (item) await addVaultItem({ ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() });
    });
    await Promise.all(promises);
    undefined;
    setSelectedItemIds(new Set());
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-background select-none text-on-surface font-sans relative z-0 animate-fade-in">



      {/* Background depth radial gradient */}
      <div className="absolute inset-0 pointer-events-none z-[-1]" style={{ background: 'radial-gradient(circle at 70% 10%, color-mix(in srgb, var(--accent) 3%, transparent) 0%, rgba(10,10,10,0) 60%)' }}></div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative px-12 pb-6 pt-3">
        {/* Header Section */}
        <div className="flex flex-col gap-4 mt-3 shrink-0 max-w-6xl w-full mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-bold text-white tracking-tight font-sans">{t('vault.header.title')}</h1>
              <p className="text-sm text-white/50 font-sans">{t('vault.header.subtitle')}</p>
            </div>

            {/* Search Bar (Center/Right alignment) */}
            <div className="flex-1 max-w-md mx-8 mt-1 relative group">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-lg group-hover:text-white/50 transition-colors">search</span>
              <input
                id="vault-search-input"
                type="text"
                readOnly
                onFocus={() => setCommandPaletteOpen(true)}
                placeholder={vaultTab === 'Prompts' ? 'Search prompts...' : vaultTab === 'Screenshots' ? 'Search screenshots...' : vaultTab === 'Notebook' ? 'Search notebook...' : vaultTab === 'Codebook' ? 'Search code snippets...' : vaultTab === 'Responses' ? 'Search responses...' : vaultTab === 'Whiteboard' ? 'Search whiteboards...' : 'Search anything in Vault...'}
                className="w-full bg-surface border border-white/[0.04] hover:border-white/10 focus:border-[color-mix(in_srgb,var(--accent)_50%,transparent)] rounded-[16px] py-2.5 pl-10 pr-12 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.02),_0_4px_16px_rgba(0,0,0,0.2)] focus:shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_15%,transparent)] cursor-pointer"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-5 rounded bg-white/5 border border-white/10 text-[10px] text-white/40 font-mono">⌘K</div>
            </div>

          </div>


          {/* Category Navigation Tabs */}
          <div className="flex items-center gap-6 mt-4 border-b border-white/[0.04] pb-[1px]">
            {(() => {
              const tabCounts: Record<string, number> = {
                Prompts: prompts.length,
                Notebook: notebook.length,
                Codebook: vaultItems.filter(i => i.kind === 'code').length,
                Responses: vaultItems.filter(i => i.kind === 'response').length,
                Screenshots: screenshotViews.length,
                Whiteboard: vaultItems.filter(i => i.kind === 'whiteboard').length};
              return tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setVaultTab(tab); setActiveItemFilter('all'); setNotebookFilter('all'); }}
                  onDragOver={handleTabDragOver}
                  onDrop={(e) => handleTabDrop(tab, e)}
                  className={`pb-3 text-sm font-medium transition-all relative cursor-pointer flex items-center gap-1.5 ${vaultTab === tab ? 'text-[var(--accent)]' : 'text-white/40 hover:text-white/70'
                    }`}
                >
                  {tab}
                  {tabCounts[tab] > 0 && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${vaultTab === tab
                        ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]'
                        : 'bg-white/[0.06] text-white/30'
                      }`}>
                      {tabCounts[tab]}
                    </span>
                  )}
                  {vaultTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent)] rounded-t-full shadow-[0_-2px_10px_color-mix(in_srgb,var(--accent)_50%,transparent)]" />
                  )}
                </button>
              ));
            })()}
            {vaultTab === 'Prompts' && (
              <button
                onClick={() => {
                  setSelectedPromptId(null);
                  setEditingPrompt(true);
                }}
                className="ml-auto flex items-center gap-1.5 pb-3 text-sm font-medium text-[var(--accent)] hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                New Prompt
              </button>
            )}
            {vaultTab === 'Codebook' && (
              <button
                onClick={() => {
                  setSelectedCodeId(null);
                  setEditingCode(true);
                }}
                className="ml-auto flex items-center gap-1.5 pb-3 text-sm font-medium text-[#22D3EE] hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                New Code
              </button>
            )}
            {vaultTab === 'Responses' && (
              <button
                onClick={() => {
                  setSelectedResponseId(null);
                  setEditingResponse(true);
                }}
                className="ml-auto flex items-center gap-1.5 pb-3 text-sm font-medium text-[#F97316] hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                New Response
              </button>
            )}
            {vaultTab === 'Notebook' && (
              <button
                onClick={() => {
                  setSelectedNote(null);
                  setEditingNote(true);
                }}
                className="ml-auto flex items-center gap-1.5 pb-3 text-sm font-medium text-[var(--accent)] hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                New Note
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto mt-4 flex flex-col gap-6">
          {/* U10: Bulk Actions Bar */}
          {selectionMode && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1A1A1C] border border-white/[0.06] rounded-[12px] animate-fade-in shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-white/90">{selectedItemIds.size} selected</span>
                <button onClick={handleDeselectAll} className="text-[10px] text-white/40 hover:text-white/70 transition-colors cursor-pointer">Clear</button>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button onClick={handleSelectAll} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 transition-all cursor-pointer">Select All</button>

                <button onClick={handleBulkFavorite} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 transition-all cursor-pointer flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">star</span>Favorite
                </button>
                <button onClick={handleBulkDelete} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] transition-all cursor-pointer flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">delete</span>Delete
                </button>
                <button onClick={handleDeselectAll} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/50 transition-all cursor-pointer">Cancel</button>
              </div>
            </div>
          )}
          {vaultTab === 'Screenshots' ? (
            <section className="mb-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[#1A1A1C] border border-white/[0.04] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--accent)] text-[18px]">screenshot_monitor</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">{t('vault.screenshots.title')}</h2>
                    <p className="text-[11px] text-white/50 font-mono">{searchedScreenshots.length} items</p>
                  </div>
                </div>

              </div>

              {searchedScreenshots.length === 0 ? (
                renderEmptyState('Screenshots', 'screenshot_monitor')
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 content-start">
                  {searchedScreenshots.map((shot) => (
                    <div key={shot.id} className="bg-surface border border-white/[0.04] hover:border-white/[0.08] rounded-[12px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.03),_0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-300 group cursor-pointer flex flex-col">
                      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/[0.04]">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/[0.04] text-[10px] font-bold text-white/80">
                            <AIIcon id={shot.aiId} className="w-3 h-3" style={{ color: shot.sourceColor }} />
                            {shot.sourceName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/[0.04] text-[10px] font-semibold text-white/60">
                            {shot.capture}
                          </span>
                        </div>
                        <button className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] transition-colors">
                          <span className="material-symbols-outlined text-[14px]">push_pin</span>
                        </button>
                      </div>

                      <div className="relative h-[120px] bg-background border-b border-white/[0.04] overflow-hidden">
                        <ScreenshotImage path={shot.path} />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="px-2.5 py-2 flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-white/90 truncate pr-2">{shot.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyScreenshot(shot); }}
                            className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[var(--accent)] hover:bg-white/5 transition-colors shrink-0"
                            title="Copy screenshot"
                          >
                            <span className="material-symbols-outlined text-[15px]">content_copy</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteScreenshot(shot.id, e)}
                            className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-[#EF4444] hover:bg-white/5 transition-colors shrink-0"
                            title="Delete screenshot"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>

                      <div className="px-2.5 pb-2 flex items-center justify-between text-[10px] text-white/40 font-mono">
                        <span>{shot.date} • {shot.time}</span>
                        <span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}


            </section>
          ) : vaultTab === 'Whiteboard' ? (
            <section className="mb-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.04] text-[12px] font-semibold text-white/90">
                    <span className="material-symbols-outlined text-[14px]">list</span>
                    All
                    <span className="text-white/40 font-mono text-[10px]">{searchedWhiteboard.length}</span>
                  </button>
                </div>
                <p className="text-[11px] text-white/50 font-mono">{searchedWhiteboard.length} whiteboards</p>
              </div>
              {searchedWhiteboard.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                  <span className="material-symbols-outlined text-4xl text-white/10 mb-3">draw</span>
                  <p className="text-white/30 text-sm">{t('vault.whiteboard.empty')}</p>
                  <p className="text-white/20 text-xs mt-1">{t('vault.whiteboard.emptyHint')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchedWhiteboard.map((w) => (
                    <div key={w.id} className="p-3 rounded-xl bg-[#161618] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer group relative flex flex-col overflow-hidden min-h-0"
                      onClick={() => {
                        setWhiteboardContent({
                          id: w.id,
                          title: w.title,
                          elements: w.elements || [],
                          zoom: w.zoom || 1,
                          pan: w.pan || { x: 0, y: 0 }
                        });
                        const tw = toolWindows.find(t => t.id === 'whiteboard');
                        if (!tw) {
                          openToolWindow('whiteboard');
                        } else if (tw.minimized) {
                          useStore.setState({
                            toolWindows: toolWindows.map(t => t.id === 'whiteboard' ? { ...t, minimized: false } : t)
                          });
                        }
                      }}>
                      {/* Bounding box wrapper representing preview canvas thumbnail */}
                      <div className="h-28 w-full bg-[#111113]/90 border border-white/[0.04] rounded-lg overflow-hidden flex items-center justify-center relative mb-2.5 group-hover:border-white/10 transition-colors">
                        <WhiteboardPreview elements={w.elements || []} />
                        
                        {/* Hover Overlay Delete Button */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirm({
                              title: 'Delete Whiteboard',
                              message: `Are you sure you want to delete "${w.title}"? This cannot be undone.`,
                              confirmLabel: 'Delete',
                              cancelLabel: 'Cancel',
                              variant: 'danger'});
                            if (ok) {
                              await deleteVaultItem(w.id, 'Whiteboard');
                              undefined;
                            }
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded bg-[#161618]/90 border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-[#EF4444] hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100 z-10"
                          title="Delete whiteboard"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                      </div>

                      {/* Details Area */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-white/90 truncate leading-tight">{w.title}</div>
                        <div className="text-[11px] text-white/35 truncate mt-0.5">{w.desc || 'Whiteboard canvas'}</div>
                        
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/[0.02]">
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 text-[#F4A460] bg-[#F4A460]/10">
                            <div className="w-1 h-1 rounded-full bg-current" />
                            {(w.elements?.length || 0)} elements
                          </span>
                          <span className="text-[10px] text-white/30 font-mono shrink-0">
                            {new Date(w.updatedAt || w.createdAt || '').toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : ['Prompts', 'Codebook', 'Responses'].includes(vaultTab) ? (
            <section className="mb-4 flex-1 flex flex-col min-h-0">
              {/* Sub-toolbar */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveItemFilter('all')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors ${activeItemFilter === 'all'
                        ? 'bg-white/[0.06] border-white/[0.04] text-white/90'
                        : 'bg-transparent border-transparent text-white/60 hover:text-white/80 hover:bg-white/[0.04]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">list</span>
                    All {vaultTab}
                    <span className="text-white/40 font-mono text-[10px]">{searchedActiveItems.length}</span>
                  </button>
                  <button
                    onClick={() => setActiveItemFilter('favorites')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors ${activeItemFilter === 'favorites'
                        ? 'bg-white/[0.06] border-white/[0.04] text-white/90'
                        : 'bg-transparent border-transparent text-white/60 hover:text-white/80 hover:bg-white/[0.04]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    Favorites
                    <span className="text-white/30 font-mono text-[10px]">{activeVaultItems.filter((p) => p.isFavorite).length}</span>
                  </button>

                </div>

              </div>

              {/* Two-column: list/grid + preview */}
              {searchedActiveItems.length === 0 ? (
                renderEmptyState(vaultTab, 'auto_awesome')
              ) : (
                <div className="flex-1 flex gap-3 min-h-0">
                  {/* Items area */}
                  {promptsView === 'list' ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                        {pagedActiveItems.map((p) => (
                          <VaultCard
                            key={p.id}
                            item={p}
                            variant="list"
                            onClick={() => selectionMode ? handleToggleSelect(p.id) : setSelectedActiveItemId(p.id)}
                            isSelected={selectedActiveItemId === p.id}
                            onDelete={(e) => { e.stopPropagation(); handleDeleteActiveItem(p.id); }}
                            onCopy={(e) => { e.stopPropagation(); handleCopyPrompt(p); }}
                            onDragStart={(e) => handleCardDragStart(e, p.id)}
                            onDragEnd={handleCardDragEnd}
                            onSelect={() => handleToggleSelect(p.id)}
                            isSelectable={vaultTab === 'Prompts' || vaultTab === 'Codebook' || vaultTab === 'Responses'}
                            isMarkedSelected={selectedItemIds.has(p.id)}
                            showAiInfo
                          />
                        ))}
                      </div>

                      {/* Pagination */}
                      {activeItemPageCount > 1 && (
                        <div className="flex items-center justify-center gap-1 mt-2 shrink-0">
                          <button
                            onClick={() => setPromptsPage(Math.max(1, promptsPage - 1))}
                            disabled={promptsPage === 1}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                          </button>
                          {Array.from({ length: activeItemPageCount }, (_, i) => i + 1).map((n) => (
                            <button
                              key={n}
                              onClick={() => setPromptsPage(n)}
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10.5px] font-bold transition-colors ${promptsPage === n ? 'text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                              {n}
                            </button>
                          ))}
                          <button
                            onClick={() => setPromptsPage(Math.min(activeItemPageCount, promptsPage + 1))}
                            disabled={promptsPage === activeItemPageCount}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex-1 grid grid-cols-2 grid-rows-4 gap-2 min-h-0">
                        {pagedActiveItems.map((p) => (
                          <VaultCard
                            key={p.id}
                            item={p}
                            variant="grid"
                            onClick={() => selectionMode ? handleToggleSelect(p.id) : setSelectedActiveItemId(p.id)}
                            isSelected={selectedActiveItemId === p.id}
                            onDelete={(e) => { e.stopPropagation(); handleDeleteActiveItem(p.id); }}
                            onCopy={(e) => { e.stopPropagation(); handleCopyPrompt(p); }}
                            onDragStart={(e) => handleCardDragStart(e, p.id)}
                            onDragEnd={handleCardDragEnd}
                            onSelect={() => handleToggleSelect(p.id)}
                            isSelectable={vaultTab === 'Prompts' || vaultTab === 'Codebook' || vaultTab === 'Responses'}
                            isMarkedSelected={selectedItemIds.has(p.id)}
                            showAiInfo
                          />
                        ))}
                      </div>

                      {activeItemPageCount > 1 && (
                        <div className="flex items-center justify-center gap-1 mt-2 shrink-0">
                          <button
                            onClick={() => setPromptsPage(Math.max(1, promptsPage - 1))}
                            disabled={promptsPage === 1}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                          </button>
                          {Array.from({ length: activeItemPageCount }, (_, i) => i + 1).map((n) => (
                            <button
                              key={n}
                              onClick={() => setPromptsPage(n)}
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10.5px] font-bold transition-colors ${promptsPage === n ? 'text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                              {n}
                            </button>
                          ))}
                          <button
                            onClick={() => setPromptsPage(Math.min(activeItemPageCount, promptsPage + 1))}
                            disabled={promptsPage === activeItemPageCount}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Preview pane */}
                  {currentEditActiveItem && (() => {
                    const selected = currentEditActiveItem;
                    return (
                      <div className="w-[280px] shrink-0 bg-surface border border-white/[0.04] rounded-[16px] flex flex-col overflow-hidden">
                        {/* Preview header */}
                        <div className="px-3 py-2.5 border-b border-white/[0.04]">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                                style={{ backgroundColor: selected.color || CATEGORY_COLORS.Prompts, color: selected.color || CATEGORY_COLORS.Prompts }}
                              />
                              <h3 className="text-[12.5px] font-bold text-white truncate">{selected.title}</h3>
                            </div>
                            <button className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 shrink-0">
                              <span className="material-symbols-outlined text-[14px]">more_horiz</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-white/50">
                            {selected.aiIcon && (
                              <span className="material-symbols-outlined text-[12px]" style={{ color: selected.aiColor || '#F4A460' }}>{selected.aiIcon}</span>
                            )}
                            <span className="font-semibold">{selected.aiName || 'Thred'}</span>
                            <span className="text-white/20">•</span>
                            <span className="text-white/40 font-mono">{formatRelativeTime(selected.updatedAt || selected.createdAt)}</span>
                          </div>
                        </div>

                        {/* Preview body */}
                        <div className="flex-1 flex flex-col px-3 py-2.5 min-h-0">
                          <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold mb-1.5 shrink-0">{selected.kind === 'code' ? 'Code' : selected.kind === 'response' ? 'Response' : 'Prompt'}</div>
                          <div className="flex-1 bg-[#1A1A1C] border border-white/[0.04] rounded-lg p-3 overflow-y-auto custom-scrollbar min-h-0">
                            <p className="text-[12px] text-white/85 leading-relaxed whitespace-pre-wrap">
                              {selected.fullText || t('vault.prompts.noContent')}
                            </p>
                          </div>
                        </div>

                        {/* Preview actions */}
                        <div className="px-3 py-2.5 border-t border-white/[0.04] flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyPrompt(selected)}
                            disabled={!selected.fullText}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[#E8954F] text-[11px] font-bold text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[13px]">content_copy</span>
                            Copy {selected.kind === 'code' ? 'Code' : selected.kind === 'response' ? 'Response' : 'Prompt'}
                          </button>
                          <button
                            onClick={() => handleToggleFavorite(selected.id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors border ${selected.isFavorite
                                ? 'bg-[color-mix(in_srgb,#F59E0B_15%,transparent)] border-[color-mix(in_srgb,#F59E0B_30%,transparent)] text-[#F59E0B]'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-[#F59E0B] border-white/[0.04]'
                              }`}
                            title={selected.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <span className="material-symbols-outlined text-[14px]">{selected.isFavorite ? 'star' : 'star_outline'}</span>
                          </button>
                          <button
                            onClick={() => setEditingPrompt(true)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors border border-white/[0.04]"
                            title="Edit prompt"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </section>
          ) : vaultTab === 'Notebook' ? (
            <section className="mb-4 flex-1 flex flex-col min-h-0 animate-fade-in">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setNotebookFilter('all')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors ${notebookFilter === 'all'
                        ? 'bg-white/[0.06] border-white/[0.04] text-white/90'
                        : 'bg-transparent border-transparent text-white/60 hover:text-white/80 hover:bg-white/[0.04]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">list</span>
                    All
                    <span className="text-white/40 font-mono text-[10px]">{notebook.length}</span>
                  </button>
                  <button
                    onClick={() => setNotebookFilter('favorites')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors ${notebookFilter === 'favorites'
                        ? 'bg-white/[0.06] border-white/[0.04] text-white/90'
                        : 'bg-transparent border-transparent text-white/60 hover:text-white/80 hover:bg-white/[0.04]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    Favorites
                    <span className="text-white/30 font-mono text-[10px]">{notebook.filter(n => n.isFavorite).length}</span>
                  </button>

                </div>
                <div className="flex items-center gap-1.5">
                  {notebookSubTab === 'calendar' && (
                    <span className="text-[11px] text-white/40 font-mono">{calendarEvents.length} events</span>
                  )}
                  {notebookSubTab === 'calculator' && (
                    <span className="text-[11px] text-white/40 font-mono">{calculatorHistory.length} calculations</span>
                  )}
                  {notebookSubTab !== 'calendar' && notebookSubTab !== 'calculator' && (
                    <span className="text-[11px] text-white/40 font-mono">{searchedNotebook.length} items</span>
                  )}
                </div>
              </div>

              {/* Notebook Sub-tabs Navigation */}
              <div className="flex items-center gap-1.5 mb-5 bg-[#141416]/50 border border-white/[0.04] p-1 rounded-xl shrink-0 w-fit">
                {([
                  { id: 'notes', label: t('vault.notebook.notes'), icon: 'sticky_note_2' },
                  { id: 'todo', label: t('vault.notebook.todo'), icon: 'checklist' },
                  { id: 'scratchpad', label: t('vault.notebook.scratchpad'), icon: 'edit_note' },
                  { id: 'focus', label: 'Focus', icon: 'hourglass_empty' },
                  { id: 'calendar', label: t('vault.more.calendarBookmarks'), icon: 'calendar_month' },
                  { id: 'calculator', label: t('vault.more.calculations'), icon: 'calculate' }] as const).map((tab) => {
                  const isSelected = notebookSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setNotebookSubTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isSelected
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                        }`}
                    >
                      <span className="material-symbols-outlined text-[14px] leading-none">{tab.icon}</span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Todo Inner Navigation Switcher */}
              {notebookSubTab === 'todo' && (
                <div className="flex items-center gap-1.5 mb-5 bg-[#141416]/30 border border-white/[0.02] p-0.5 rounded-lg shrink-0 w-fit ml-1">
                  {([
                    { id: 'today', label: 'Today', icon: 'today' },
                    { id: 'tasks', label: 'Tasks', icon: 'task' }] as const).map((subtab) => {
                    const isSelected = todoInnerTab === subtab.id;
                    return (
                      <button
                        key={subtab.id}
                        onClick={() => setTodoInnerTab(subtab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${isSelected
                            ? 'bg-white/5 text-white shadow-sm'
                            : 'text-white/40 hover:text-white/60 hover:bg-white/[0.01]'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[12px] leading-none">{subtab.icon}</span>
                        {subtab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {notebookSubTab === 'calendar' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start overflow-y-auto custom-scrollbar pr-1 pb-4">
                  {calendarEvents.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center text-center py-16">
                      <span className="material-symbols-outlined text-4xl text-white/10 mb-3">calendar_today</span>
                      <p className="text-white/30 text-sm">{t('vault.more.calendar.empty')}</p>
                      <p className="text-white/20 text-xs mt-1">Open the Calendar tool and add tasks or reminders on dates</p>
                    </div>
                  ) : (
                    calendarEvents
                      .slice()
                      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
                      .map((event) => (
                        <GlassCard key={event.id} className="p-4 justify-between min-h-[100px] border-white/5 hover:border-white/10 transition-all group">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                                {formatCalendarDate(event.dateKey)}
                              </div>
                              <div className={`text-[13px] font-semibold text-white/95 leading-snug ${event.completed ? 'line-through opacity-45' : ''}`}>
                                {event.text}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteCalendarEvent(event.id)}
                              className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-[#EF4444] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                              title="Delete bookmark"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-white/[0.03]">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1.5 select-none ${event.completed ? 'text-green-400 bg-green-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                              <span className="relative flex h-1.5 w-1.5">
                                {!event.completed && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${event.completed ? 'bg-green-400' : 'bg-amber-400'}`}></span>
                              </span>
                              {event.completed ? t('vault.more.completed') : t('vault.more.pending')}
                            </span>
                          </div>
                        </GlassCard>
                      ))
                  )}
                </div>
              ) : notebookSubTab === 'calculator' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start overflow-y-auto custom-scrollbar pr-1 pb-4">
                  {calculatorHistory.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center text-center py-16">
                      <span className="material-symbols-outlined text-4xl text-white/10 mb-3">calculate</span>
                      <p className="text-white/30 text-sm">{t('vault.more.calculation.empty')}</p>
                      <p className="text-white/20 text-xs mt-1">Open the Calculator tool and perform equations</p>
                    </div>
                  ) : (
                    calculatorHistory.map((item, idx) => (
                      <GlassCard key={idx} className="p-4 justify-between min-h-[100px] border-white/5 hover:border-white/10 transition-all group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">calculate</span>
                              Calculation
                            </div>
                            <div className="text-[11.5px] font-bold text-white/50 truncate font-mono leading-none mb-1.5" title={item.expression}>
                              {item.expression}
                            </div>
                            <div className="text-[15px] font-bold text-[var(--accent)] font-mono leading-none">
                              = {item.result}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteCalculatorItem(idx)}
                            className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-[#EF4444] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                            title="Delete calculation"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                        <div className="flex justify-end mt-3 pt-1.5 border-t border-white/[0.03]">
                          <span className="text-[10px] font-semibold text-white/20 font-mono">{item.timestamp}</span>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </div>
              ) : searchedNotebook.length === 0 ? (
                renderEmptyState(
                  notebookSubTab === 'todo'
                    ? (todoInnerTab === 'today' ? 'Today tasks' : 'Long-term tasks')
                    : notebookSubTab === 'scratchpad'
                      ? 'Scratchpad entries'
                      : notebookSubTab === 'focus'
                        ? 'Focus entries'
                        : 'Notes',
                  notebookSubTab === 'todo'
                    ? (todoInnerTab === 'today' ? 'today' : 'task')
                    : notebookSubTab === 'scratchpad'
                      ? 'edit_note'
                      : notebookSubTab === 'focus'
                        ? 'hourglass_empty'
                        : 'sticky_note_2'
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start overflow-y-auto custom-scrollbar pr-1 pb-4">
                  {notebookSubTab === 'todo' && todoInnerTab === 'today' ? (
                    <>
                      {todayItems.length > 0 && (
                        <>
                          <div className="col-span-full text-[10px] font-bold text-white/30 uppercase tracking-wider px-1 mb-1">
                            Today
                          </div>
                          {todayItems.map((n) => renderNotebookCard(n))}
                        </>
                      )}
                      {previousItems.length > 0 && (
                        <>
                          <div className="col-span-full text-[10px] font-bold text-white/30 uppercase tracking-wider px-1 mt-4 mb-1">
                            Previously Completed
                          </div>
                          {previousItems.map((n) => renderNotebookCard(n))}
                        </>
                      )}
                    </>
                  ) : (
                    searchedNotebook.map((n) => renderNotebookCard(n))
                  )}
                </div>
              )}
            </section>
          ) : vaultTab === 'Codebook' ? (
            <section className="mb-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{t('vault.codebook.title')}</h2>
                  <p className="text-[11px] text-white/50 font-mono">{searchedCodebook.length} snippets</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.04]">
                    <button className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
                      <span className="material-symbols-outlined text-[14px]">grid_view</span>
                    </button>
                  </div>
                </div>
              </div>

              {searchedCodebook.length === 0 ? (
                renderEmptyState('Codebook snippets', 'code')
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start">
                  {searchedCodebook.map((c) => (
                    <VaultCard
                      key={c.id}
                      item={c}
                      variant="grid"
                      onClick={() => selectionMode ? handleToggleSelect(c.id) : (() => { setSelectedCodeId(c.id); setEditingCode(true); })()}
                      onDelete={(e) => { e.stopPropagation(); deleteVaultItem(c.id, 'Codebook'); }}
                      onCopy={(e) => { e.stopPropagation(); handleCopyPrompt(c); }}
                      onDragStart={(e) => handleCardDragStart(e, c.id)}
                      onDragEnd={handleCardDragEnd}
                      onSelect={() => handleToggleSelect(c.id)}
                      isSelectable
                      isMarkedSelected={selectedItemIds.has(c.id)}
                      customFooter={
                        <div className="flex items-center justify-between mt-auto pt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 text-[#22D3EE] bg-[#22D3EE]/10">
                            <div className="w-1 h-1 rounded-full bg-current" />
                            Code
                          </span>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          ) : vaultTab === 'Responses' ? (
            <section className="mb-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{t('vault.responses.title')}</h2>
                  <p className="text-[11px] text-white/50 font-mono">{searchedResponses.length} responses</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.04]">
                    <button className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
                      <span className="material-symbols-outlined text-[14px]">grid_view</span>
                    </button>
                  </div>
                </div>
              </div>

              {searchedResponses.length === 0 ? (
                renderEmptyState('Responses', 'forum')
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start">
                  {searchedResponses.map((r) => (
                    <VaultCard
                      key={r.id}
                      item={r}
                      variant="grid"
                      onClick={() => selectionMode ? handleToggleSelect(r.id) : (() => { setSelectedResponseId(r.id); setEditingResponse(true); })()}
                      onDelete={(e) => { e.stopPropagation(); deleteVaultItem(r.id, 'Responses'); }}
                      onCopy={(e) => { e.stopPropagation(); handleCopyPrompt(r); }}
                      onDragStart={(e) => handleCardDragStart(e, r.id)}
                      onDragEnd={handleCardDragEnd}
                      onSelect={() => handleToggleSelect(r.id)}
                      isSelectable
                      isMarkedSelected={selectedItemIds.has(r.id)}
                      customFooter={
                        <div className="flex items-center justify-between mt-auto pt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 text-[#F97316] bg-[#F97316]/10">
                            <div className="w-1 h-1 rounded-full bg-current" />
                            Response
                          </span>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}

        </div>
      </div>

      {editingPrompt && (
        <EditVaultItemPopover
          kind="prompt"
          open={editingPrompt}
          initialTitle={currentEditPrompt?.title || ''}
          initialText={currentEditPrompt?.fullText || ''}
          aiName={currentEditPrompt?.aiName || 'Thred'}
          aiColor={currentEditPrompt?.aiColor || '#F4A460'}
          aiIcon={currentEditPrompt?.aiIcon || 'auto_awesome'}
          onClose={() => setEditingPrompt(false)}
          onSave={handleSavePromptEdit}
          isEdit={!!selectedPromptId}
        />
      )}

      {editingNote && selectedNote && (
        <EditVaultItemPopover
          kind="note"
          open={editingNote}
          initialTitle={selectedNote.title}
          initialText={selectedNote.fullText || ''}
          initialSubtab={(selectedNote.notebookSubtab || 'notes') as any}
          initialPriority={((selectedNote as TodoItem).priority || 'medium') as any}
          onClose={() => {
            setEditingNote(false);
            setSelectedNote(null);
          }}
          onSave={handleSaveNoteEdit}
        />
      )}

      {editingCode && (
        <EditVaultItemPopover
          kind="code"
          open={editingCode}
          initialTitle={currentEditCode?.title || ''}
          initialText={currentEditCode?.fullText || ''}
          aiName={currentEditCode?.aiName || 'Thred'}
          aiColor={currentEditCode?.aiColor || '#22D3EE'}
          aiIcon={currentEditCode?.aiIcon || 'code'}
          onClose={() => {
            setEditingCode(false);
            setSelectedCodeId(null);
          }}
          onSave={handleSaveCodeEdit}
          isEdit={!!selectedCodeId}
        />
      )}

      {editingResponse && (
        <EditVaultItemPopover
          kind="response"
          open={editingResponse}
          initialTitle={currentEditResponse?.title || ''}
          initialText={currentEditResponse?.fullText || ''}
          aiName={currentEditResponse?.aiName || 'Thred'}
          aiColor={currentEditResponse?.aiColor || '#F97316'}
          aiIcon={currentEditResponse?.aiIcon || 'forum'}
          onClose={() => {
            setEditingResponse(false);
            setSelectedResponseId(null);
          }}
          onSave={handleSaveResponseEdit}
          isEdit={!!selectedResponseId}
        />
      )}

    </div>
  );
};

export default VaultView;
