# Thred — Features

**Every AI. One workspace.**

Thred is a unified desktop workspace that brings 9 AI models into a single application with productivity tools, a personal vault, bookmarks, screenshots, and more.

---

## Table of Contents

- [AI Models](#ai-models)
- [Left Sidebar](#left-sidebar)
- [Right Sidebar](#right-sidebar)
- [Home View](#home-view)
- [Command Palette](#command-palette)
- [Vault](#vault)
- [Productivity Tools](#productivity-tools)
- [Bookmarks](#bookmarks)
- [Downloads](#downloads)
- [History](#history)
- [Screenshots](#screenshots)
- [Settings](#settings)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Onboarding](#onboarding)

---

## AI Models

9 built-in AI providers, each running in an isolated webview:

| # | AI | Shortcut | URL |
|---|------|----------|-----|
| 1 | ChatGPT | `Alt+1` | chatgpt.com |
| 2 | Gemini | `Alt+2` | gemini.google.com |
| 3 | Claude | `Alt+3` | claude.ai |
| 4 | Perplexity | `Alt+4` | perplexity.ai |
| 5 | Grok | `Alt+5` | grok.com |
| 6 | DeepSeek | `Alt+6` | chat.deepseek.com |
| 7 | Kimi | `Alt+7` | kimi.ai |
| 8 | Le Mistral | `Alt+8` | chat.mistral.ai |
| 9 | HuggingChat | `Alt+9` | huggingface.co/chat |

- Drag-and-drop reorder in the sidebar
- Per-AI zoom levels (50%–200%), persisted across sessions
- Split view for side-by-side comparison (`Ctrl+\`)

---

## Left Sidebar

Located on the far left (52px wide). Contains navigation, AI models, and bookmarks.

### Logo Menu

Click the Thred logo to open a dropdown menu:

- **Navigation:** Home (`Ctrl+D`), Vault (`Ctrl+L`), Bookmarks (`Ctrl+M`)
- **Zoom Controls:** In/Out/Reset for the active AI webview (50%–200%)
- **Support:** Documentation, Changelog, What's New, Report Bug (`Ctrl+Shift+I`)
- **System:** Restart (`Ctrl+Shift+Q`), Quit (`Ctrl+Q`)

### Navigation Buttons

- **Home** — Opens the Home View
- **Vault** — Opens the Vault View
- **Search** — Opens Command Palette (`Ctrl+K`)

### AI Model List

- Shows all 9 AI icons
- Click to switch the active AI
- Hover to see name, shortcut badge, and reorder arrows
- Drag-and-drop to reorder

### Pinned Bookmarks

Up to 5 bookmarked conversations appear as favicon icons below the AI list. Click to navigate directly to that chat.

### Footer Controls

- **Bookmarks** — Opens Conversation/Bookmarks View
- **Downloads** — Opens Downloads View
- **History** — Opens History View
- **Settings** — Opens Settings View

### Sidebar Toggle

- `Ctrl+[` — Toggle left sidebar
- `Ctrl+]` — Toggle right sidebar
- `Ctrl+B` — Toggle both sidebars

---

## Right Sidebar

Located on the far right (39px wide). Contains tools, vault shortcuts, and system buttons.

### Keyboard Shortcuts Button

Click to open the full Shortcuts Reference overlay.

### Essential Tools (6)

| Tool | Shortcut | Description |
|------|----------|-------------|
| Notes | `Ctrl+Alt+J` | Rich text editor with checklists |
| Todo | `Ctrl+Alt+Z` | Today tasks and long-term tasks |
| Time | `Ctrl+Alt+H` | World clock, stopwatch, timer |
| Calendar | `Ctrl+Alt+D` | Month view with events |
| Calculator | `Ctrl+Alt+=` | Standard and scientific modes |
| Converter | `Ctrl+Alt+V` | Unit and currency conversion |

### Productivity Tools (3)

| Tool | Shortcut | Description |
|------|----------|-------------|
| Whiteboard | `Ctrl+Alt+W` | Drawing canvas with shapes |
| Pomodoro | `Ctrl+Alt+P` | Focus sessions with breaks |
| Scratchpad | `Ctrl+Alt+N` | Quick temporary notepad |

### Vault Quick-Access Popovers

Hover/click these buttons to see a preview flyout:

- **Prompts** — Favorite prompts with copy
- **Responses** — Recent saved responses
- **Codebook** — Saved code snippets
- **Screenshots** — Recent screenshots with copy
- **Downloads** — Last 5 downloads
- **History** — Recent AI session entries
- **Bookmarks** — Saved bookmarked chats

Each has a "View All" button to navigate to the full view.

### System Buttons

- **Report Bug** — Opens the Report View
- **Restart Thred** — Restarts the app
- **Quit Thred** — Quits the app

---

## Home View

Access: `Ctrl+D` or click Home in the left sidebar.

### Personalized Greeting

Time-aware greeting using your display name:
- Late Night (< 5am), Morning (5am–12pm), Afternoon (12pm–5pm), Evening (5pm–10pm), Night (10pm+)

### Search Bar

Read-only input that opens Command Palette on focus. Shows `Ctrl+K` badge.

### Quick Actions

One-click buttons for common actions: New Prompt, New Note, Whiteboard, Scratchpad, Tasks.

### Continue Section

Shows recent AI chat sessions to resume. Displays an empty state for new users with a button to open an AI.

### Pinned Bookmarks

Grid of up to 6 pinned bookmarks. Each shows the AI icon, name, and date. Click to navigate.

---

## Command Palette

Access: `Ctrl+K` or click any search bar.

A full-screen search overlay for finding anything in Thred:

### Navigation Actions

- Go Home (`Ctrl+D`), Open Vault (`Ctrl+L`), Open Bookmarks (`Ctrl+M`)
- Open Downloads, Open History (`Ctrl+H`), Open Settings (`Ctrl+,`)
- Report Bug (`Ctrl+Shift+I`)

### Vault Shortcuts

- Vault > Prompts, Responses, Codebook, Notebook, Screenshots

### AI Switching

- "Switch to [AI Name]" for each AI with its `Alt+number` shortcut

### Contextual Actions (when AI is active)

- Reload Session (`Ctrl+R`)
- Reset to Home Page

### View Controls

- Show/Hide Left Sidebar (`Ctrl+[`)
- Show/Hide Right Sidebar (`Ctrl+]`)
- Toggle Both Sidebars (`Ctrl+B`)

### Navigation

- Arrow keys to navigate, Enter to execute, Escape to close

---

## Vault

Access: `Ctrl+L` or click Vault in the left sidebar.

A knowledge hub for saving and organizing everything. 6 tabs:

### Prompts Tab

Save and reuse AI prompt templates.
- Grid/list view with pagination (8 per page)
- Copy, Edit, Delete, Toggle Favorite per card
- Drag-and-drop to re-categorize

### Notebook Tab

Contains sub-tabs for different content types:
- **Notes** — Rich text notes with checklists
- **Todo** — Today tasks and long-term tasks with priorities
- **Scratchpad** — Quick temporary content
- **Focus** — Pomodoro session notes

### Codebook Tab

Save and manage code snippets. Same layout as Prompts.

### Responses Tab

Save AI responses for later reference. Same layout as Prompts.

### Screenshots Tab

Grid of captured screenshots with preview images.
- Copy to clipboard, Delete
- Filter by AI source

### Whiteboard Tab

Saved whiteboard canvases with SVG previews.
- Click to open in the Whiteboard tool

### Vault Features

- **Search** across all items
- **Favorites** system (max 4 favorites)
- **Multi-select** with bulk delete and bulk favorite
- **Drag-and-drop** between tabs to re-categorize
- **Per-tab shortcuts:** `1-6` switch tabs, `/` search, `n` new, `j/k` navigate, `Space` preview

---

## Productivity Tools

All tools open as floating, draggable, resizable windows.

### Notes (`Ctrl+Alt+J`)

- Rich text editor (contentEditable) with Bold/Italic/Underline
- Checklist and link insertion
- Note list with search
- Pin up to 5 notes
- Auto-save with 500ms debounce
- Character count

### Todo (`Ctrl+Alt+Z`)

- Two tabs: **Today** (temporary) and **Tasks** (permanent)
- Priority levels: Low, Medium, High (color-coded)
- Quick add with priority selector
- Toggle completion, delete
- Today todos auto-cleanup completed items from previous days

### Time (`Ctrl+Alt+H`)

Three tabs:
- **World Clock** — Local time + up to 5 world timezones
- **Stopwatch** — Drift-free with lap recording and delta times
- **Timer** — Custom MM:SS input, focus presets (25/5/15 min), progress bar, audio chime on completion

### Calendar (`Ctrl+Alt+D`)

- Full month grid with navigation
- Per-day event creation, completion, deletion
- Holiday indicators (US holidays)
- Event dots on calendar cells
- Agenda view for selected date

### Calculator (`Ctrl+Alt+=`)

- **Standard mode** — Basic arithmetic
- **Scientific mode** — sin, cos, tan, ln, log, sqrt, factorial, pi, e, parentheses
- **DEG/RAD toggle** for trig functions
- **History drawer** — Last 10 calculations
- Safe evaluation (no eval)

### Converter (`Ctrl+Alt+V`)

6 categories:
- **Length** — m, km, cm, mm, miles, yards, feet, inches
- **Weight** — kg, g, mg, pounds, ounces, tonnes
- **Temperature** — Celsius, Fahrenheit, Kelvin
- **Volume** — liters, ml, gallons, quarts, cups, fl oz
- **Currency** — USD, EUR, GBP, INR, JPY, CAD, AUD (live rates)
- **Speed** — m/s, km/h, mph, knots

Swap button, common presets, conversion history.

### Whiteboard (`Ctrl+Alt+W`)

- 8 tools: Select, Pen, Eraser, Rectangle, Circle, Line, Text, Pan
- Zoom (`Ctrl+scroll`, 10%–500%), pan
- Undo/Redo (`Ctrl+Z` / `Ctrl+Shift+Z`, 50 levels)
- Live shape preview with dimension labels
- Inline text editing
- Save to Vault with title
- New canvas with confirmation

### Pomodoro (`Ctrl+Alt+P`)

Multi-step workflow:
1. **Setup** — Task name, project, category, priority, duration
2. **Focus** — SVG circular progress timer, pause/resume/stop
3. **Break** — 5/10/15 min options
4. **Summary** — Session notes (completed/progress/next steps), save to Vault

Quick start presets: 25 min, 50 min, 90 min. Statistics: streak, weekly consistency, session counts.

### Scratchpad (`Ctrl+Alt+N`)

- Simple textarea for quick notes
- Character and word count
- Save to Vault option
- Unsaved content indicator
- Confirmation on close if unsaved

---

## Bookmarks

Access: `Ctrl+M` or click Bookmarks in the sidebar.

### Bookmark Active Chat

`Ctrl+Shift+D` — Opens a popover to save the current AI chat URL with a name.

### Bookmark Management

- **Filter tabs:** Sidebar, Pinned, All, per-AI
- **Search** by name or URL
- **Pin** bookmarks (shown on Home View)
- **Add to Sidebar** (shown in left sidebar, up to 5)
- **Edit** name inline
- **Delete** single or bulk
- **Multi-select** with bulk actions

### Limits

- Pinned bookmarks: max 8
- Sidebar bookmarks: max 5

---

## Downloads

Access: `Ctrl+J` or click Downloads in the sidebar.

### Dashboard

4 stat cards: Total Files, Total Size, AI Sources, Last Download.

### Filtering

- **AI Filter Rail** — Filter by AI provider
- **Category Tabs** — All, Images, Videos, Documents, Code, Audio
- **Date Filters** — All Time, Today, This Week, This Month
- **Sort** — Newest, Oldest, Largest, Smallest, A-Z
- **View Modes** — List / Grid (media always uses grid)

### Active Downloads

Real-time progress bars with speed, ETA, percentage. Cancel button per download.

### Media Preview

Click any media file to open a preview modal:
- Images: Full viewer
- Videos: HTML5 player with controls
- Audio: HTML5 player with controls

### Context Menu

Right-click for: Open, Show in Folder, Copy Path, Rename, Move to Subfolder, Delete.

### Bulk Selection

Multi-select with checkboxes. Bulk copy paths, bulk delete. `Ctrl+A` to select all.

---

## History

Access: `Ctrl+H` or click History in the sidebar.

### AI Filters

Filter pills for each AI provider to show only relevant history.

### Time Groups

Entries grouped: Today, Yesterday, This Week.

### History Cards

Each shows: AI icon, title, type badge, hostname, relative timestamp. Click to re-navigate.

### Clear History

"Clear History" button with confirmation dialog.

---

## Screenshots

### Capture

- **Content Capture** (`Ctrl+Shift+S`) — Captures active AI webview
- **Workspace Capture** (`Ctrl+Shift+X`) — Captures full Thred window

### Preview Modal

After capture, shows full preview with:
- Dimensions (width × height px) and AI source
- **Discard** — Delete the capture
- **Copy to Clipboard** — Copy the image (`Ctrl+C`)
- **Save to Vault** — Save permanently (`Ctrl+S`)

### Storage

Stored as PNG files with metadata (type, aiId, timestamp). Viewable in Vault > Screenshots tab.

---

## Settings

Access: `Ctrl+,` or click Settings in the sidebar.

### System

- **Display Name** — Edit your name (used in greetings). Inline edit with Save/Cancel.
- **Data Location** — View/change the Thred data folder path.

### Keyboard Shortcuts

Button to open the full Shortcuts Reference overlay.

### About

- Version display
- Check for Updates
- Release Notes (external link)
- Report Bug

### Social Links

5 cards: Instagram, X/Twitter, LinkedIn, Product Hunt, GitHub.

---

## Keyboard Shortcuts

### Core Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command Palette |
| `Ctrl+D` | Home |
| `Ctrl+L` | Vault |
| `Ctrl+M` | Bookmarks |
| `Ctrl+H` | History |
| `Ctrl+J` | Downloads |
| `Ctrl+,` | Settings |
| `Ctrl+/` | Shortcuts Reference |
| `Escape` | Dismiss overlay |

### AI Navigation

| Shortcut | Action |
|----------|--------|
| `Alt+1` – `Alt+9` | Switch to AI |

### Browser Controls

| Shortcut | Action |
|----------|--------|
| `Alt+Left` | Navigate Back |
| `Alt+Right` | Navigate Forward |
| `Ctrl+R` | Reload |
| `Ctrl+Shift+R` | Hard Refresh |
| `Ctrl+=` | Zoom In |
| `Ctrl+-` | Zoom Out |
| `Ctrl+0` | Reset Zoom |

### Workspace

| Shortcut | Action |
|----------|--------|
| `Ctrl+\` | Split View |
| `Ctrl+B` | Toggle Both Sidebars |
| `Ctrl+[` | Toggle Left Sidebar |
| `Ctrl+]` | Toggle Right Sidebar |
| `Ctrl+S` | Save to Vault |
| `Ctrl+Shift+D` | Bookmark Chat |
| `Ctrl+Shift+S` | Content Capture |
| `Ctrl+Shift+X` | Workspace Capture |

### Tools

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+J` | Notes |
| `Ctrl+Alt+Z` | Todo |
| `Ctrl+Alt+H` | Time |
| `Ctrl+Alt+D` | Calendar |
| `Ctrl+Alt+=` | Calculator |
| `Ctrl+Alt+V` | Converter |
| `Ctrl+Alt+W` | Whiteboard |
| `Ctrl+Alt+P` | Pomodoro |
| `Ctrl+Alt+N` | Scratchpad |

### System

| Shortcut | Action |
|----------|--------|
| `Ctrl+Q` | Quit |
| `Ctrl+Shift+Q` | Restart |
| `Ctrl+Shift+I` | Report Bug |
| `Ctrl+Shift+M` | Minimize Window |

---

## Onboarding

5-step guided setup on first launch:

1. **Welcome** — Logo, "Every AI. One workspace.", version badge
2. **Name** — "What should we call you?" text input
3. **Your AIs** — Visual grid of all 9 AI models with shortcut badges
4. **Your Workspace** — Highlights Right Sidebar, Vault, and Command Palette
5. **Finishing** — "Welcome, {name}!" with loading animation

- Enter key advances through all stages
- Name can be changed later in Settings
- Onboarding flag persisted to config file

---

## Tech Stack

- **Electron** + **Electron Forge** — Desktop packaging
- **React 19** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS v4** — Styling
- **Vite** — Build tool
- **Zustand** — State management
- **electron-store** — Settings persistence
