# Thred v1.0.0 — Initial Release

**Every AI. One workspace.**

Thred is a unified desktop workspace that brings all your AI models into a single application. Switch between ChatGPT, Gemini, Claude, Perplexity, Grok, DeepSeek, Kimi, Le Mistral, and HuggingChat instantly — no tab juggling, no context switching.

---

## AI Models

- 9 built-in AI models: ChatGPT, Gemini, Claude, Perplexity, Grok, DeepSeek, Kimi, Le Mistral, HuggingChat
- Switch between models with `Alt+1` through `Alt+9`
- Drag-and-drop reorder in the sidebar
- Per-AI zoom levels (50%–200%)
- Split view for side-by-side AI comparison (`Ctrl+\`)

## Productivity Tools

Floating, draggable tool windows accessible from the right sidebar:

- **Notes** — Rich text editor with checklists, links, and auto-save
- **Todo** — Today tasks and long-term tasks with priority levels
- **Time** — World clock, stopwatch, and countdown timer
- **Calendar** — Month view with event management
- **Calculator** — Standard and scientific modes with history
- **Converter** — Length, weight, temperature, volume, currency, speed
- **Whiteboard** — Drawing canvas with shapes, text, and zoom
- **Pomodoro** — Focus sessions with break tracking and statistics
- **Scratchpad** — Quick temporary notepad

## Vault

Save and organize everything across 6 tabs:

- **Prompts** — Save and reuse AI prompt templates
- **Notebook** — Notes, todos, scratchpad, calendar events
- **Codebook** — Code snippet management
- **Responses** — Saved AI responses
- **Screenshots** — Captured screenshots with preview
- **Whiteboard** — Saved whiteboard canvases

Features: favorites, search, multi-select, drag-and-drop between tabs, per-tab keyboard shortcuts.

## Navigation

- **Left Sidebar** — AI models, bookmarks, navigation
- **Right Sidebar** — Tools, vault quick-access, bookmarks, history
- **Command Palette** (`Ctrl+K`) — Search anything: AIs, actions, shortcuts
- **Home View** — Personalized greeting, quick actions, continue section, pinned bookmarks
- **Bookmarks** — Save and organize AI conversations
- **Downloads** — File download manager with categorization
- **History** — AI session history with re-navigation

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `Ctrl+K` | Command Palette |
| `Ctrl+D` | Home |
| `Ctrl+L` | Vault |
| `Ctrl+M` | Bookmarks |
| `Ctrl+H` | History |
| `Ctrl+,` | Settings |
| `Ctrl+/` | Shortcuts Reference |
| `Alt+1–9` | Switch AI |
| `Ctrl+\` | Split View |
| `Ctrl+B` | Toggle Both Sidebars |
| `Ctrl+Shift+S` | Content Capture |
| `Ctrl+Shift+X` | Workspace Capture |
| `Ctrl+Shift+D` | Bookmark Active Chat |
| `Ctrl+S` | Save Selected Text to Vault |
| `Ctrl+Alt+J` | Notes |
| `Ctrl+Alt+Z` | Todo |
| `Ctrl+Alt+H` | Time |
| `Ctrl+Alt+D` | Calendar |
| `Ctrl+Alt+=` | Calculator |
| `Ctrl+Alt+V` | Converter |
| `Ctrl+Alt+W` | Whiteboard |
| `Ctrl+Alt+P` | Pomodoro |
| `Ctrl+Alt+N` | Scratchpad |

## Screenshots & Capture

- Content Capture (`Ctrl+Shift+S`) — captures active AI webview
- Workspace Capture (`Ctrl+Shift+X`) — captures full Thred window
- Screenshots saved to Vault with metadata

## Onboarding

5-step guided setup:
1. Welcome — branding and value proposition
2. Name — personalization
3. Your AIs — visual grid of all 9 AI models with shortcuts
4. Your Workspace — introduction to tools, vault, and command palette
5. Finishing — loading animation and completion

## System

- System tray with minimize-to-tray option
- Launch at startup option
- Custom data storage location
- Per-AI zoom persistence
- Sidebar collapse/expand
- Auto-update support

## Tech Stack

- **Electron** + **Electron Forge** for desktop packaging
- **React 19** for the UI
- **TypeScript** for type safety
- **Tailwind CSS v4** for styling
- **Vite** as the build tool
- **Zustand** for state management
- **electron-store** for settings persistence

---

*Thred v1.0.0 — First public release.*
