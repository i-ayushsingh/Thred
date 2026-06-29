import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { useStore } from '../store';
import { useT } from '../i18n/context';

// ─── "Learn First" pill data ────────────────────────────────────────────────

const dailyDrivers = [
  { keys: ['Ctrl', 'K'], desc: 'Command Palette' },
  { keys: ['Ctrl', 'D'], desc: 'Home View' },
  { keys: ['Ctrl', 'L'], desc: 'Vault View' },
  { keys: ['Ctrl', 'M'], desc: 'Bookmarks (Sidebar)' },
  { keys: ['Ctrl', 'H'], desc: 'History View' },
  { keys: ['Alt', '1–9'], desc: 'Switch AI' }];

const powerUserEssentials = [
  { keys: ['Ctrl', '\\'], desc: 'Split View' },
  { keys: ['Ctrl', 'Shift', 'S'], desc: 'Content Capture' },
  { keys: ['Ctrl', 'Shift', 'X'], desc: 'Workspace Capture' },
  { keys: ['Ctrl', 'B'], desc: 'Toggle Both Sidebars' }];

// ─── Full categorized shortcut list ─────────────────────────────────────────

const shortcutGroups = [
  {
    title: 'Core Navigation & Daily Use',
    icon: 'home',
    items: [
      { keys: ['Ctrl', 'K'], desc: 'Open Command Palette' },
      { keys: ['Ctrl', 'D'], desc: 'Open Home View' },
      { keys: ['Ctrl', 'L'], desc: 'Open Vault View' },
      { keys: ['Ctrl', 'M'], desc: 'Open Bookmarks (Left Sidebar)' },
      { keys: ['Ctrl', 'H'], desc: 'Open History View' },
      { keys: ['Ctrl', 'J'], desc: 'Open Downloads View' },
      { keys: ['Ctrl', ','], desc: 'Open Settings' },
      { keys: ['Ctrl', '/'], desc: 'Open Shortcuts Reference' },
      { keys: ['Ctrl', 'Shift', 'M'], desc: 'Minimize Window' },
      { keys: ['Escape'], desc: 'Dismiss active overlay' }]},
  {
    title: 'AI Navigation',
    icon: 'auto_awesome',
    items: [
      { keys: ['Alt', '1–9'], desc: 'Switch to AI 1–9' }]},
  {
    title: 'Browser & Webview Controls',
    icon: 'language',
    items: [
      { keys: ['Alt'], desc: 'Open Thred Menu' },
      { keys: ['Alt', 'Left'], desc: 'Navigate Back' },
      { keys: ['Alt', 'Right'], desc: 'Navigate Forward' },
      { keys: ['Ctrl', 'R'], desc: 'Refresh / Reload Webview' },
      { keys: ['Ctrl', 'Shift', 'R'], desc: 'Hard Refresh Active AI / Reset Order' },
      { keys: ['Ctrl', '='], desc: 'Zoom In' },
      { keys: ['Ctrl', '-'], desc: 'Zoom Out' },
      { keys: ['Ctrl', '0'], desc: 'Reset Zoom' }]},
  {
    title: 'Workspace & Capture',
    icon: 'screenshot_monitor',
    items: [
      { keys: ['Ctrl', '\\'], desc: 'Toggle Split View Menu' },
      { keys: ['Ctrl', 'B'], desc: 'Toggle Both Sidebars' },
      { keys: ['Ctrl', '['], desc: 'Toggle Left Sidebar' },
      { keys: ['Ctrl', ']'], desc: 'Toggle Right Sidebar' },
      { keys: ['Ctrl', 'S'], desc: 'Save Selected Text to Vault' },
      { keys: ['Ctrl', 'Shift', 'D'], desc: 'Bookmark Active Chat' },
      { keys: ['Ctrl', 'Shift', 'S'], desc: 'Content Capture' },
      { keys: ['Ctrl', 'Shift', 'X'], desc: 'Workspace Capture' }]},
  {
    title: 'Essential Tools',
    icon: 'star',
    items: [
      { keys: ['Ctrl', 'Alt', 'J'], desc: 'Open Notes' },
      { keys: ['Ctrl', 'Alt', 'Z'], desc: 'Open Todo' },
      { keys: ['Ctrl', 'Alt', 'H'], desc: 'Open Time' },
      { keys: ['Ctrl', 'Alt', 'D'], desc: 'Open Calendar' },
      { keys: ['Ctrl', 'Alt', '='], desc: 'Open Calculator' },
      { keys: ['Ctrl', 'Alt', 'V'], desc: 'Open Converter' }]},
  {
    title: 'Productivity Tools',
    icon: 'bolt',
    items: [
      { keys: ['Ctrl', 'Alt', 'W'], desc: 'Open Whiteboard' },
      { keys: ['Ctrl', 'Alt', 'P'], desc: 'Open Pomodoro' },
      { keys: ['Ctrl', 'Alt', 'N'], desc: 'Open Sticky Scratchpad' }]},
  {
    title: 'Organization & Knowledge',
    icon: 'folder_open',
    items: [
      { keys: ['Ctrl', 'H'], desc: 'Open History' },
      { keys: ['Ctrl', 'Shift', 'B'], desc: 'Open Bookmarks Popover' },
      { keys: ['Ctrl', 'Shift', 'I'], desc: 'Report Bug / Open Feedback' }]}];

// Flat list for search (each item carries its category)
const allShortcuts = shortcutGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, category: group.title, categoryIcon: group.icon }))
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Highlight matching substring in text */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[var(--accent)]/25 text-[var(--accent)] rounded px-0.5 font-bold not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

/** Check if a shortcut matches the search query */
const matchesQuery = (
  item: { keys: string[]; desc: string },
  q: string
): boolean => {
  if (!q) return true;
  const lower = q.toLowerCase().trim();
  // Match description
  if (item.desc.toLowerCase().includes(lower)) return true;
  // Match key combo — normalise both sides
  const keysStr = item.keys.join(' ').toLowerCase();
  const keysNoSpaces = item.keys.join('').toLowerCase();
  const qNorm = lower.replace(/[+\s]/g, '');
  if (keysStr.includes(lower) || keysNoSpaces.includes(qNorm)) return true;
  // Also match individual key tokens
  return item.keys.some((k) => k.toLowerCase().includes(lower));
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const KeyBadge: React.FC<{ k: string; small?: boolean; highlight?: boolean }> = ({ k, small, highlight }) => (
  <kbd
    className={`glass-key text-center font-mono font-semibold rounded shadow-sm transition-colors ${
      highlight ? 'text-[var(--accent)] border-[var(--accent)]/30' : 'text-on-surface'
    } ${
      small
        ? 'px-1.5 py-0.5 text-[8.5px] min-w-[18px]'
        : 'px-2 py-0.5 text-[10px] min-w-[22px]'
    }`}
  >
    {k}
  </kbd>
);

const LearnCard: React.FC<{ keys: string[]; desc: string }> = ({ keys, desc }) => (
  <div className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-[var(--accent)]/40 hover:bg-white/[0.06] transition-all group">
    <div className="flex gap-1 flex-wrap justify-center">
      {keys.map((k, i) => (
        <KeyBadge key={i} k={k} small />
      ))}
    </div>
    <span className="text-[9px] font-medium text-white/45 group-hover:text-white/70 text-center leading-tight transition-colors font-sans">
      {desc}
    </span>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

export const ShortcutsReferenceOverlay: React.FC = () => {
  const t = useT();
  const {  shortcutsOpen, setShortcutsOpen  } = useStore(useShallow(state => ({ shortcutsOpen: state.shortcutsOpen, setShortcutsOpen: state.setShortcutsOpen })));
  const [query, setQuery] = React.useState('');
  const [capturing, setCapturing] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus search on open, clear on close
  React.useEffect(() => {
    if (shortcutsOpen) {
      setQuery('');
      setCapturing(false);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [shortcutsOpen]);

  if (!shortcutsOpen) return null;

  /** Intercept key events on the search input.
   *  - Modifier combos (Ctrl/Alt + key) and F-keys get captured as text.
   *  - Regular printable characters type normally.
   *  - Escape clears query or closes the overlay. */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const modifierOnly = ['Control', 'Alt', 'Meta', 'Shift'].includes(e.key);

    // Track when a modifier is held (for the visual ring)
    if (modifierOnly) {
      if (e.ctrlKey || e.altKey || e.metaKey) setCapturing(true);
      return;
    }

    // Escape: clear query or close overlay
    if (e.key === 'Escape') {
      e.stopPropagation();
      setCapturing(false);
      if (query) { setQuery(''); } else { setShortcutsOpen(false); }
      return;
    }

    // Capture modifier combos (Ctrl / Alt / Meta + something)
    if (e.ctrlKey || e.altKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setCapturing(false);

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      let key = e.key;
      if (key === ' ')           key = 'Space';
      else if (key === 'ArrowLeft')  key = 'Left';
      else if (key === 'ArrowRight') key = 'Right';
      else if (key === 'ArrowUp')    key = 'Up';
      else if (key === 'ArrowDown')  key = 'Down';
      else if (key === 'Backspace')  key = 'Backspace';
      else if (key === 'Delete')     key = 'Delete';
      else if (key.length === 1)     key = key.toUpperCase();

      parts.push(key);
      setQuery(parts.join(' '));
      return;
    }

    // Capture bare F-keys (F1–F12)
    if (/^F\d{1,2}$/.test(e.key)) {
      e.preventDefault();
      setCapturing(false);
      setQuery(e.key);
      return;
    }

    // Everything else → type normally into the input
    setCapturing(false);
  };

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  // Filter flat list
  const searchResults = isSearching
    ? allShortcuts.filter((item) => matchesQuery(item, trimmed))
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-scale-in"
      onClick={() => setShortcutsOpen(false)}
    >
      <div
        className="w-full max-w-xl glass-panel rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100vh - 32px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--accent)] text-[18px]">keyboard</span>
            <h2 className="text-sm font-bold text-on-surface font-sans">{t('shortcuts.header.title')}</h2>
          </div>
          <button
            onClick={() => setShortcutsOpen(false)}
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* ── Search bar ── */}
        <div className="px-5 py-3 border-b border-white/[0.06] shrink-0">
          <div className="relative flex items-center">
            <span
              className={`material-symbols-outlined absolute left-3 text-[16px] pointer-events-none select-none transition-colors ${
                capturing ? 'text-[var(--accent)]' : 'text-white/30'
              }`}
            >
              {capturing ? 'keyboard_command_key' : 'search'}
            </span>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onKeyUp={(e) => {
                // Release capturing state when all modifiers are lifted
                if (!e.ctrlKey && !e.altKey && !e.metaKey) setCapturing(false);
              }}
              onBlur={() => setCapturing(false)}
              placeholder={t('shortcuts.search.placeholder')}
              className={`w-full bg-white/[0.04] border rounded-lg pl-9 pr-8 py-2 text-xs font-sans outline-none transition-all ${
                capturing
                  ? 'border-[var(--accent)]/50 bg-[var(--accent)]/[0.04] text-[var(--accent)] placeholder-[var(--accent)]/30'
                  : 'border-white/[0.08] text-white/80 placeholder-white/25 focus:border-[var(--accent)]/40 focus:bg-white/[0.06]'
              }`}
              spellCheck={false}
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 text-white/25 hover:text-white/60 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
          {isSearching && (
            <p className="text-[9.5px] text-white/25 font-sans mt-1.5 px-0.5">
              {searchResults.length === 0
                ? t('shortcuts.search.noResults')
                : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} found`}
            </p>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex flex-col overflow-y-auto custom-scrollbar">

          {/* ── SEARCH RESULTS VIEW ── */}
          {isSearching ? (
            <div className="flex flex-col p-5">
              {searchResults.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <span className="material-symbols-outlined text-[32px] text-white/10">search_off</span>
                  <p className="text-[11px] text-white/30 font-sans text-center leading-relaxed">
                    No shortcuts found for <span className="text-white/50 font-semibold">"{trimmed}"</span>
                    <br />
                    Try searching a feature name or key like <span className="text-white/50">Ctrl Alt J</span>
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
                    >
                      {/* Left: category + description */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="material-symbols-outlined text-[10px] text-white/20">{item.categoryIcon}</span>
                          <span className="text-[8.5px] text-white/25 font-sans uppercase tracking-wider font-semibold truncate">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-[11.5px] text-white/80 font-sans font-medium leading-tight">
                          <Highlight text={item.desc} query={trimmed} />
                        </span>
                      </div>
                      {/* Right: key badges */}
                      <div className="flex gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <KeyBadge
                            key={kIdx}
                            k={k}
                            small
                            highlight={k.toLowerCase().includes(trimmed.toLowerCase())}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── NORMAL VIEW ── */
            <div className="flex flex-col gap-5 p-5">

              {/* ── LEARN FIRST ── */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px] text-[var(--accent)]">auto_awesome</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] font-sans">
                    {t('shortcuts.learnFirst.title')}
                  </span>
                  <span className="ml-auto text-[9px] text-white/25 font-sans italic">{t('shortcuts.learnFirst.mostImportant')}</span>
                </div>

                {/* Daily Drivers */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 px-0.5">
                    <div className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/35 font-sans">{t('shortcuts.learnFirst.dailyDrivers')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {dailyDrivers.map((item) => (
                      <LearnCard key={item.desc} keys={item.keys} desc={item.desc} />
                    ))}
                  </div>
                </div>

                {/* Power User */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 px-0.5">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/35 font-sans">{t('shortcuts.learnFirst.powerUser')}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {powerUserEssentials.map((item) => (
                      <LearnCard key={item.desc} keys={item.keys} desc={item.desc} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-white/[0.07]" />

              {/* ── ALL SHORTCUTS — 13 categories (2-column grid) ── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {shortcutGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 pb-0.5 border-b border-white/[0.05]">
                      <span className="material-symbols-outlined text-[12px] text-white/30">{group.icon}</span>
                      <h3 className="text-[9.5px] uppercase font-bold tracking-widest text-white/40 font-sans">
                        {t(`shortcuts.groups.${group.title === 'Core Navigation & Daily Use' ? 'coreNavigation' : group.title === 'AI Navigation' ? 'aiNavigation' : group.title === 'Browser & Webview Controls' ? 'browserControls' : group.title === 'Workspace & Capture' ? 'workspaceCapture' : group.title === 'Essential Tools' ? 'essentialTools' : group.title === 'Productivity Tools' ? 'productivityTools' : group.title === 'Organization & Knowledge' ? 'organization' : group.title === 'Security & Privacy' ? 'security' : group.title === 'Profile & Personal Data' ? 'profile' : group.title === 'Appearance & Customization' ? 'appearance' : group.title === 'Layout Controls' ? 'layout' : group.title === 'Support & Feedback' ? 'support' : 'application'}`)}
                      </h3>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-white/[0.03] transition-colors gap-2"
                        >
                          <span className="text-[10.5px] text-white/60 font-sans font-medium truncate leading-tight">
                            {item.desc}
                          </span>
                          <div className="flex gap-0.5 shrink-0">
                            {item.keys.map((k, kIdx) => (
                              <KeyBadge key={kIdx} k={k} small />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="bg-black/20 px-5 py-2.5 border-t border-white/[0.07] flex items-center justify-center gap-1.5 text-[9.5px] text-white/30 font-sans shrink-0">
          <span>{t('shortcuts.footer.press')}</span>
          <KeyBadge k="Ctrl" small />
          <span>+</span>
          <KeyBadge k="/" small />
          <span>{t('shortcuts.footer.toToggle')}</span>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsReferenceOverlay;
