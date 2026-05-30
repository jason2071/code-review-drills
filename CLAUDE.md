# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static, dependency-free Thai-language SPA for practicing code review: spotting bugs and judging whether AI-suggested fixes are correct or bogus. No build, no dependencies, no tests, no server.

Files:
- `index.html` — skeleton markup + `<link>`/`<script>` tags
- `styles.css` — all CSS
- `data.js` — the `DATA` array (all drill content)
- `app.js` — `escapeHtml`, `fmt`, and the renderer

Load order matters: `data.js` before `app.js` (app.js reads the global `DATA`).

## Run / develop

Open `index.html` directly in a browser. No build step. Edit a file, refresh. Fonts load from Google Fonts CDN (needs network on first load).

## Architecture

All content is the `DATA` array in `data.js`. `app.js` is a small renderer that builds the sidebar nav and renders one category at a time into `#main`.

### `DATA` shape
```
{ group, cat, title, desc, problems: [ {type, title, code, answer, ai?} ] }
```
- `group` — sidebar section header ("Backend" / "Frontend"). Nav groups are derived via `new Set(DATA.map(d=>d.group))`.
- `cat` — unique slug, used as nav `data-cat` and the key passed to `render(cat)`.
- `title` — `"Lang · Topic"`; sidebar strips the `"... · "` prefix, breadcrumb/heading show the full string.
- `problems[].type` drives the tag and behavior:
  - `find` → 🔍 หาบั๊ก
  - `judge` → 🤖 ตัดสิน AI — **must** include an `ai` field (the AI's claimed answer the user judges)
  - `concept` → 💡 ออกแบบ/อธิบาย

### Rendering rules (important when editing content)
- `code` and `ai` are injected with `textContent` — NOT through `fmt`. They are escaped automatically; write raw code. Use literal `\t` in the template string for indentation (Go drills rely on this).
- `answer` is rendered through `fmt()`, a tiny markdown subset:
  - `**bold**`, `` `code` ``
  - `[REAL]` → badge "จริง", `[FAKE]` → badge "มั่ว" (used in `judge` answers to mark which AI claims are real vs bogus)
  - `\n\n` → paragraph break, `\n` → `<br>`
  - Fenced ``` blocks inside `answer` are plain text inside `<p>`, not real code highlighting.
- `render()` rebuilds `#main` innerHTML on every nav click; `toggle(id)` shows/hides each answer (active-recall: analyze first, then reveal).

## Adding a drill

Add an object to a `problems` array (or a new top-level category object to `DATA`). A new `cat` slug auto-creates a sidebar button under its `group` with a problem count — no other wiring needed.

## Conventions

- UI copy and explanations are in **Thai**; code samples stay in their language (Go, SQL, TS, React, CSS, Playwright).
- Keep the single-file structure — do not split into modules or add a bundler unless asked.
