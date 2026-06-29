# Contributing to Thred

Thanks for your interest in contributing. Here's everything you need to get started.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Submitting a PR](#submitting-a-pr)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Code Style](#code-style)
- [License](#license)

---

## Prerequisites

- **Node.js** 18 or later
- **Git**
- **Windows 10/11**
- **VS Code** recommended as your editor

---

## Getting Started

1. **Fork** the repository on GitHub

2. **Clone** your fork:
   ```bash
   git clone https://github.com/yourusername/thred.git
   cd thred
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run in development mode:**
   ```bash
   npm start
   ```

The app works out of the box — no `.env` setup or API keys required.

---

## Project Structure

```
src/
├── components/       → React UI components
│   ├── tools/        → Floating tool windows (Notes, Todo, etc.)
│   └── home/         → Home view sub-components
├── store/            → Zustand state management
│   └── slices/       → Store slices (app, preferences, tools, vault)
├── shared/           → Shared constants and types (AI list, IPC channels)
├── i18n/             → Internationalization translations
├── utils/            → Utility functions
├── main.ts           → Electron main process
├── preload.ts        → Electron preload bridge
├── injection-scripts.ts → Scripts injected into AI webviews
└── index.css         → Global styles

public/               → Static assets (icons, images)
docs/                 → Documentation
```

---

## Making Changes

1. **Create a new branch** — never commit to `main` directly:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Branch naming conventions:**
   - `feat/your-feature-name` — new features
   - `fix/bug-description` — bug fixes
   - `docs/what-you-updated` — documentation changes

3. **Keep changes focused** — one PR per feature or fix

4. **Test your changes** before submitting:
   ```bash
   npm run lint
   ```

---

## Submitting a PR

1. **Push** your branch to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```

2. **Open a PR** against the `main` branch

3. **Fill in the PR description:**
   - What does this PR do?
   - Screenshots if UI change
   - How to test it

4. **Keep the PR title clear and descriptive**

5. **Link to related issue** if there is one (e.g., `Closes #42`)

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/i-ayushsingh/thred/issues) with:

- **Thred version** (shown in Settings → About)
- **Operating system** and version
- **What happened** — describe the bug
- **What you expected** — what should have happened
- **Steps to reproduce** — how to trigger the bug
- **Screenshots** if relevant

---

## Suggesting Features

Open a GitHub Issue with the **feature request** label:

- Describe the **problem it solves**, not just the feature itself
- Check existing issues first to avoid duplicates
- Explain how it fits into the existing workflow

---

## Code Style

- Follow existing code patterns in the codebase
- Use TypeScript types properly — avoid `any` where possible
- Keep components focused and single responsibility
- No unnecessary `console.log` in production code
- Use the existing UI components (`Section`, `Row`, `Toggle`, `ActionButton` in Settings)
- Use the `useT()` hook for user-facing strings

---

## License

By contributing, you agree your code will be licensed under the [MIT License](LICENSE). All contributions become part of the Thred open source project.
