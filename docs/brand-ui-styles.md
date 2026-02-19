# SolPoint Brand UI — Style System

This document describes the SolPoint design system: colors, radii, surfaces, typography, and utilities. Use it to replicate the branded UI in another repo.

---

## 1. Stack & Setup

- **CSS**: Tailwind CSS v4 (`@tailwindcss/postcss`), single entry `globals.css` with `@import "tailwindcss"`.
- **Theme**: Design tokens are defined in `@theme inline { ... }` inside `globals.css` (Tailwind v4 theme-in-CSS).
- **Utilities**: `cn()` from `clsx` + `tailwind-merge` for conditional/merged class names.
- **Fonts**: Google Fonts — Space Grotesk (display), JetBrains Mono (mono), Inter (optional). Root has `className="dark"`, `ThemeProvider` with `defaultTheme="dark"`, `enableSystem={false}`.

---

## 2. Design Tokens (CSS Variables)

Copy the block below into your global CSS (inside `@theme inline { }` for Tailwind v4, or `:root` if you use plain CSS).

### 2.1 Base & Foreground

| Token | Value | Usage |
|-------|--------|--------|
| `--color-background` | `#0a0f14` | Page background |
| `--color-foreground` | `#e8eaed` | Default text on background |

### 2.2 Brand (Solana-inspired)

| Token | Value | Usage |
|-------|--------|--------|
| `--color-primary` | `#14f195` | Primary actions, links, focus, success |
| `--color-primary-hover` | `#0fd080` | Primary button hover |
| `--color-secondary` | `#9945ff` | Secondary actions |
| `--color-secondary-hover` | `#7c35d9` | Secondary hover |
| `--color-accent` | `#00d1ff` | Accent / info |

### 2.3 Surfaces

| Token | Value | Usage |
|-------|--------|--------|
| `--color-surface` | `#111820` | Cards, panels, inputs |
| `--color-surface-hover` | `#1a2530` | Hover state for list items, nav |
| `--color-surface-border` | `#243040` | Borders, dividers |
| `--color-surface-elevated` | `#182028` | Elevated cards, modals |

### 2.4 Filter / Tags (special UI)

| Token | Value | Usage |
|-------|--------|--------|
| `--color-filter-border` | `#00F68B` | Active filter tag border, checkbox/radio |
| `--color-filter-bg` | `#072721` | Active filter tag background |

### 2.5 Text

| Token | Value | Usage |
|-------|--------|--------|
| `--color-text-primary` | `#ffffff` | Headings, primary text |
| `--color-text-secondary` | `#9ca3af` | Secondary text |
| `--color-text-muted` | `#6b7280` | Placeholders, hints |

### 2.6 Status

| Token | Value |
|-------|--------|
| `--color-success` | `#14f195` |
| `--color-warning` | `#fbbf24` |
| `--color-error` | `#ef4444` |
| `--color-info` | `#00d1ff` |

### 2.7 Map / Markers

| Token | Value |
|-------|--------|
| `--color-marker-vip` | `#fbbf24` |
| `--color-marker-user` | `#ef4444` |
| `--color-marker-hub` | `#3b82f6` |
| `--color-marker-event` | `#14f195` |

### 2.8 Gradients (as values)

| Token | Value |
|-------|--------|
| `--gradient-primary` | `linear-gradient(to right, #00F58D 0%, #00F58D 50%, #A73EFF 100%)` |
| `--gradient-glow` | `radial-gradient(circle at center, rgba(0, 245, 141, 0.15) 0%, transparent 70%)` |

### 2.9 Typography

| Token | Value |
|-------|--------|
| `--font-display` | `"Space Grotesk", var(--font-sans)` |
| `--font-sans` | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--font-mono` | `"JetBrains Mono", monospace` |

### 2.10 Border Radius (Radii)

| Token | Value | Tailwind | Usage |
|-------|--------|----------|--------|
| `--radius-sm` | `0.375rem` (6px) | `rounded` / `rounded-md` | Small controls |
| `--radius-md` | `0.5rem` (8px) | `rounded-lg` | Buttons, inputs, tags |
| `--radius-lg` | `0.75rem` (12px) | `rounded-xl` base | Cards, modals, popups |
| `--radius-xl` | `1rem` (16px) | `rounded-xl` / `rounded-2xl` | Large cards, bottom sheet top |
| `--radius-full` | `9999px` | `rounded-full` | Pills, avatars, scrollbar thumb |

**Conventions in components:**

- Buttons, inputs, filter tags: `rounded-lg` (8px).
- Cards, modals, popovers: `rounded-xl` (12px).
- Badges, avatars: `rounded-full`.
- Bottom-sheet modal: `rounded-t-2xl rounded-b-none`.

---

## 3. Base Styles (body, scrollbar, selection, focus)

```css
* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
  min-height: 100vh;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--color-surface);
}
::-webkit-scrollbar-thumb {
  background: var(--color-surface-border);
  border-radius: var(--radius-full);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

/* Selection */
::selection {
  background: rgba(20, 241, 149, 0.3);
  color: var(--color-text-primary);
}
input::selection {
  background: #14f195 !important;
  color: #ffffff !important;
}

/* Focus */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## 4. Utility Classes (copy into your CSS)

### 4.1 Text gradient (brand headline)

```css
.text-gradient {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

Usage: `<h1 className="text-gradient">...</h1>` or inline with `bg-gradient-to-r from-[#00F58D] to-[#A73EFF] bg-clip-text text-transparent`.

### 4.2 Background gradient (full block)

```css
.bg-gradient-primary {
  background: var(--gradient-primary);
}
```

### 4.3 Glow (primary / secondary)

```css
.glow-primary {
  box-shadow: 0 0 40px rgba(20, 241, 149, 0.3);
}
.glow-secondary {
  box-shadow: 0 0 40px rgba(153, 69, 255, 0.3);
}
```

### 4.4 Animated background (page sections)

```css
.animated-bg {
  background:
    radial-gradient(ellipse at 20% 30%, rgba(153, 69, 255, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(20, 241, 149, 0.08) 0%, transparent 50%),
    var(--color-background);
}
```

Usage: `<main className="min-h-screen pt-16 animated-bg">`.

### 4.5 Grid pattern background (landing)

```css
.grid-pattern-bg {
  position: relative;
  background: var(--color-background);
}
.grid-pattern-bg::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0);
  background-size: 50px 50px, 50px 50px, 50px 50px;
  pointer-events: none;
  opacity: 0.4;
}
.grid-pattern-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 30%, rgba(153, 69, 255, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(20, 241, 149, 0.1) 0%, transparent 50%);
  pointer-events: none;
}
```

### 4.6 Glass (header, floating panels)

```css
.glass {
  background: rgba(17, 24, 32, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-surface-border);
}
```

### 4.7 Animations

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(20, 241, 149, 0.3); }
  50% { box-shadow: 0 0 40px rgba(20, 241, 149, 0.5); }
}
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.animate-float { animation: float 6s ease-in-out infinite; }
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
.animate-gradient { background-size: 200% 200%; animation: gradient-shift 8s ease infinite; }
```

---

## 5. Component Patterns (Tailwind class usage)

### 5.1 Buttons

- **Base**: `inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed`
- **Primary**: `bg-[var(--color-primary)] text-[var(--color-background)] hover:bg-[var(--color-primary-hover)] focus-visible:ring-[var(--color-primary)]`
- **Secondary**: `bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary-hover)] focus-visible:ring-[var(--color-secondary)]`
- **Outline**: `border border-[var(--color-surface-border)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] focus-visible:ring-[var(--color-primary)]`
- **Ghost**: `bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]`
- **Danger**: `bg-[var(--color-error)] text-white hover:bg-red-600 focus-visible:ring-[var(--color-error)]`
- **Sizes**: `sm` → `h-8 px-3 text-sm gap-1.5`; `md` → `h-10 px-4 text-sm gap-2`; `lg` → `h-12 px-6 text-base gap-2`

### 5.2 Cards

- **Default**: `bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-4`
- **Elevated**: `bg-[var(--color-surface-elevated)] shadow-xl shadow-black/20 rounded-xl p-4`
- **Bordered**: `bg-transparent border border-[var(--color-surface-border)] rounded-xl p-4`
- **Glass**: use `.glass` class + `rounded-xl p-4`
- **Title**: `text-lg font-semibold text-[var(--color-text-primary)]`
- **Description**: `text-sm text-[var(--color-text-secondary)]`

### 5.3 Inputs

- **Container**: `w-full h-10 px-3 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]`
- **Focus**: `focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]`
- **Error**: `border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]`
- **With icon**: add `pl-10` and absolute icon `left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]`

### 5.4 Badges

- **Base**: `inline-flex items-center font-medium rounded-full`
- **Default**: `bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]`
- **Primary**: `bg-[var(--color-primary)]/10 text-[var(--color-primary)]`
- **Secondary**: `bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]`
- **Success / Warning / Error**: same pattern with `/10` background and solid text color
- **Outline**: `bg-transparent border border-[var(--color-surface-border)] text-[var(--color-text-secondary)]`
- **Sizes**: `sm` → `px-2 py-0.5 text-xs`; `md` → `px-2.5 py-1 text-xs`

### 5.5 Filter tags

- **Base**: `px-2 py-1 sm:px-4 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border`
- **Active**: `border-[var(--color-filter-border)] bg-[var(--color-filter-bg)] text-[var(--color-text-primary)]`
- **Inactive**: `border-[var(--color-surface-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-filter-border)] hover:text-[var(--color-text-primary)]`

### 5.6 Modals

- **Overlay**: `bg-black/60 backdrop-blur-sm`
- **Content**: `bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl shadow-2xl shadow-black/40`
- **Bottom sheet**: `rounded-t-2xl rounded-b-none max-h-[85vh] mt-auto`
- **Close button**: `p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]`
- **Header**: `px-6 pt-6 pb-4 border-b border-[var(--color-surface-border)]`
- **Title**: `text-xl font-semibold text-[var(--color-text-primary)]`
- **Description**: `text-sm text-[var(--color-text-secondary)] mt-1`
- **Footer**: `px-6 py-4 flex items-center gap-3 border-t border-[var(--color-surface-border)]`

### 5.7 Avatars

- **Base**: `rounded-full overflow-hidden bg-[var(--color-surface-border)] flex items-center justify-center font-medium text-[var(--color-text-secondary)]`
- **VIP ring**: `ring-2 ring-[var(--color-marker-vip)]`
- **Verified badge**: `rounded-full bg-[var(--color-primary)] text-[var(--color-background)]`

### 5.8 Checkbox / Radio (custom)

- **Radio**: circle `rounded-full border-2`; checked: `border-[var(--color-filter-border)]` + inner dot `rounded-full bg-[var(--color-filter-border)]`
- **Checkbox**: square `rounded border-2`; checked: `border-[var(--color-filter-border)] bg-[var(--color-filter-bg)]` + checkmark `text-[var(--color-filter-border)]`

### 5.9 Nav links

- **Default**: `px-4 py-2 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]`
- **Active**: `text-[var(--color-text-primary)]` + underline `h-0.5 mt-0.5 bg-[var(--color-primary)] rounded-full`

### 5.10 Dropdown / popover

- **Panel**: `bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg shadow-lg overflow-hidden`
- **Item**: `px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]`

---

## 6. Reusable gradient patterns

- **Hero / section headline**: `bg-gradient-to-r from-[#00F58D] to-[#A73EFF] bg-clip-text text-transparent` (or `.text-gradient`).
- **Card/entity cover placeholder**: `bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20`.
- **Hub card image placeholder**: `from-[var(--color-info)]/30 to-[var(--color-secondary)]/30`.
- **Decorative line**: `h-px bg-gradient-to-r from-transparent via-[var(--color-surface-border)] to-transparent`.
- **Footer top line**: `h-[2px] bg-gradient-to-r from-[#4a1d5c] via-[#2d4a3a] to-[#1a4a2d]`.
- **Footer background**: `bg-[#1a1f26]` (slightly lighter than main background).
- **Social icon circle**: `rounded-full bg-[#2a2f36] hover:bg-[#3a3f46]`.

---

## 7. Map-specific (Leaflet / MapLibre)

- **Water (map background)**: `#18E3C5`
- **Land (MapCN/vector)**: `#452D9F`
- **Country borders**: `#A4E3B4`
- **Popup**: `background: var(--color-surface)`; `color: var(--color-foreground)`; `border-radius: var(--radius-lg)`; `box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5)`.

---

## 8. Summary checklist for a new repo

1. Add Tailwind v4 and `globals.css` with `@theme inline { ... }` containing all tokens above.
2. Apply base styles (body, scrollbar, selection, focus).
3. Add utility classes: `.text-gradient`, `.bg-gradient-primary`, `.glow-primary`, `.glow-secondary`, `.animated-bg`, `.grid-pattern-bg`, `.glass`, and keyframes + animation classes.
4. Use `cn()` (clsx + tailwind-merge) for component class names.
5. Load fonts: Space Grotesk, JetBrains Mono (and Inter if needed); set `className="dark"` on `<html>` and dark theme by default.
6. Use CSS variables everywhere: `var(--color-*)`, `var(--radius-*)`, `var(--font-*)`, `var(--gradient-*)`.
7. Stick to radius conventions: `rounded-lg` for controls, `rounded-xl` for cards/modals, `rounded-full` for pills/avatars.
8. Keep surfaces and borders consistent: `--color-surface`, `--color-surface-border`, `--color-surface-hover`, `--color-surface-elevated`.

This gives you a full SolPoint-style dark UI that you can drop into another project and extend with the same tokens and patterns.
