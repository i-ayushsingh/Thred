// ============================================================
// Shared vault schema — single source of truth for all vault types
// Used by both main process (validation) and renderer (UI)
// ============================================================

// All valid kind values
export type VaultItemKind = 'prompt' | 'code' | 'response' | 'note' | 'todo'
  | 'scratchpad' | 'whiteboard' | 'screenshot' | 'calendar' | 'calculation'
  | 'context' | 'artifact' | 'skill'; // "Upcoming" phantom categories kept for compat

// ---- Base fields shared by every vault item ----
export interface VaultItemBase {
  id: string;
  kind: VaultItemKind;
  category?: string;
  title: string;
  desc?: string;
  fullText?: string;
  color?: string;
  icon?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  tags?: string[];
  aiId?: string;
  aiName?: string;
  aiIcon?: string;
  aiColor?: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
  notebookSubtab?: 'notes' | 'todo' | 'scratchpad' | 'long-term-todo' | 'focus';
}

// ---- Per-kind items (discriminated union on `kind`) ----

export interface PromptItem extends VaultItemBase {
  kind: 'prompt';
}

export interface CodeItem extends VaultItemBase {
  kind: 'code';
  language?: string;
}

export interface ResponseItem extends VaultItemBase {
  kind: 'response';
  fromAI?: string;
}

export interface NoteItem extends VaultItemBase {
  kind: 'note';
}

export interface TodoItem extends VaultItemBase {
  kind: 'todo';
  completed?: boolean;
  completedAt?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface ScratchpadItem extends VaultItemBase {
  kind: 'scratchpad';
}

export interface WhiteboardItem extends VaultItemBase {
  kind: 'whiteboard';
  elements?: unknown[];
  zoom?: number;
  pan?: { x: number; y: number };
}

export interface ScreenshotItem extends VaultItemBase {
  kind: 'screenshot';
  screenshotType?: 'content' | 'workspace';
  filePath?: string;
  filename?: string;
}

export interface CalendarEventItem extends VaultItemBase {
  kind: 'calendar';
  dateKey?: string;
  completed?: boolean;
}

export interface CalculationItem extends VaultItemBase {
  kind: 'calculation';
  expression?: string;
  result?: string;
}

// "Upcoming" phantom categories — kept for backward compat
export interface ContextItem extends VaultItemBase { kind: 'context'; }
export interface ArtifactItem extends VaultItemBase { kind: 'artifact'; }
export interface SkillItem extends VaultItemBase { kind: 'skill'; }

// ---- The discriminated union ----

export type VaultItem =
  | PromptItem
  | CodeItem
  | ResponseItem
  | NoteItem
  | TodoItem
  | ScratchpadItem
  | WhiteboardItem
  | ScreenshotItem
  | CalendarEventItem
  | CalculationItem
  | ContextItem
  | ArtifactItem
  | SkillItem;

// ---- Category → kind mapping (for the filesystem layout) ----

export const CATEGORY_KIND_MAP: Record<string, VaultItemKind> = {
  'Prompts':       'prompt',
  'Codebook':      'code',
  'Responses':     'response',
  'Notes':         'note',
  'To-do':         'todo',
  'Scratchpad':    'scratchpad',
  'Whiteboard':    'whiteboard',
  'Screenshots':   'screenshot',
  'Calendar':      'calendar',
  'Calculations':  'calculation',
  'Contexts':      'context',
  'Artifacts':     'artifact',
  'Skills':        'skill',
};

// Reverse: kind → primary category
export const KIND_CATEGORY_MAP: Record<VaultItemKind, string> = {
  'prompt':      'Prompts',
  'code':        'Codebook',
  'response':    'Responses',
  'note':        'Notes',
  'todo':        'To-do',
  'scratchpad':  'Scratchpad',
  'whiteboard':  'Whiteboard',
  'screenshot':  'Screenshots',
  'calendar':    'Calendar',
  'calculation': 'Calculations',
  'context':     'Contexts',
  'artifact':    'Artifacts',
  'skill':       'Skills',
};

// ---- All vault categories (filesystem order) ----
export const VAULT_CATEGORIES = [
  'Prompts', 'Codebook', 'Responses', 'Whiteboard',
  'Notebooks',
  'Notes', 'To-do', 'Scratchpad', 'Calendar', 'Calculations',
  'Content Capture', 'Workspace Capture',
  'Bookmark',
] as const;


// ---- Tab definitions ----
export interface VaultTabDef {
  id: string;
  labelKey: string;
  icon: string;
  kinds: VaultItemKind[];
}

export const VAULT_TABS: VaultTabDef[] = [
  { id: 'Prompts',    labelKey: 'vault.tabs.prompts',    icon: 'auto_awesome',       kinds: ['prompt'] },
  { id: 'Notebook',   labelKey: 'vault.tabs.notebook',   icon: 'edit_note',          kinds: ['note', 'todo', 'scratchpad', 'calendar', 'calculation'] },
  { id: 'Codebook',   labelKey: 'vault.tabs.codebook',   icon: 'code',               kinds: ['code'] },
  { id: 'Responses',  labelKey: 'vault.tabs.responses',  icon: 'chat_bubble_outline', kinds: ['response'] },
  { id: 'Screenshots',labelKey: 'vault.tabs.screenshots',icon: 'photo_camera',       kinds: ['screenshot'] },
  { id: 'Whiteboard', labelKey: 'vault.tabs.whiteboard', icon: 'draw',               kinds: ['whiteboard'] },
];

// ---- Runtime validation (main process) ----
const VALID_KINDS = new Set<string>([
  'prompt', 'code', 'response', 'note', 'todo',
  'scratchpad', 'whiteboard', 'screenshot', 'calendar', 'calculation',
  'context', 'artifact', 'skill',
]);

export function isValidVaultItem(raw: unknown): raw is VaultItem {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.kind === 'string' && VALID_KINDS.has(obj.kind);
}


// ---- Helpers ----

export function isNote(item: VaultItem): item is NoteItem { return item.kind === 'note'; }
export function isTodo(item: VaultItem): item is TodoItem { return item.kind === 'todo'; }
export function isCalendarEvent(item: VaultItem): item is CalendarEventItem { return item.kind === 'calendar'; }

export const CATEGORY_ICONS: Record<string, string> = {
  Prompts: 'auto_awesome',
  Notebooks: 'menu_book',
  Contexts: 'subject',
  Artifacts: 'description',
  Skills: 'psychology',
  Codebook: 'code',
  Responses: 'forum',
  Notes: 'sticky_note_2',
  Whiteboard: 'draw'
};

export const CATEGORY_COLORS: Record<string, string> = {
  Prompts: 'var(--accent)',
  Notebooks: '#3B82F6',
  Contexts: '#A855F7',
  Artifacts: '#10B981',
  Skills: '#EC4899',
  Codebook: '#22D3EE',
  Responses: '#F97316',
  Notes: '#EAB308',
  Whiteboard: '#F4A460'
};


export function getCategoryIcon(kind: string): string {
  const kindToCategory: Record<string, string> = {
    prompt: 'Prompts',
    code: 'Codebook',
    response: 'Responses',
    whiteboard: 'Whiteboard',
    note: 'Notes',
    screenshot: 'Screenshots',
    context: 'Contexts',
    artifact: 'Artifacts',
    skill: 'Skills',
    calendar: 'Calendar',
    calculation: 'Calculation',
  };
  return CATEGORY_ICONS[kindToCategory[kind] || kind] || CATEGORY_ICONS.Prompts;
}

export function getCategoryColor(kind: string): string {
  const kindToCategory: Record<string, string> = {
    prompt: 'Prompts',
    code: 'Codebook',
    response: 'Responses',
    whiteboard: 'Whiteboard',
    note: 'Notes',
    screenshot: 'Screenshots',
    context: 'Contexts',
    artifact: 'Artifacts',
    skill: 'Skills',
    calendar: 'Calendar',
    calculation: 'Calculation',
  };
  return CATEGORY_COLORS[kindToCategory[kind] || kind] || CATEGORY_COLORS.Prompts;
}
