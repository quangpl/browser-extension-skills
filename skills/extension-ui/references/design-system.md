# Design System: Tokens, Tailwind, Components, Dark Mode

## Contents

- Tokens (plain CSS, works with or without Tailwind)
- Theme override (System / Light / Dark)
- Tailwind CSS v4
- shadcn/ui (React)
- daisyUI 5 (if the repo already uses it)
- Icons and fonts

One token file shared by popup, side panel, options and (prefixed) content-script UI keeps every surface visually identical. Reuse an existing token file if the repo has one.

## Tokens (plain CSS, works with or without Tailwind)

```css
/* src/styles/tokens.css */
:root, :host {
  color-scheme: light dark; /* follows the OS; also themes native scrollbars, inputs, selects */
  --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --text-xs: 12px; --text-sm: 13px; --text-md: 14px; --text-lg: 16px;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px;
  --radius-sm: 6px; --radius-md: 8px; --control-h: 32px;

  /* light-dark(light, dark) picks by the computed color-scheme */
  --bg: light-dark(#ffffff, #1f1f1f);      --surface: light-dark(#f6f7f9, #2a2a2a);
  --border: light-dark(#e3e5e8, #3c3c3c);  --fg: light-dark(#1f2328, #e8eaed);
  --fg-muted: light-dark(#5f6368, #9aa0a6); --accent: light-dark(#1a73e8, #8ab4f8);
  --accent-fg: light-dark(#ffffff, #202124);
  --danger: light-dark(#c5221f, #f28b82);  --warning: light-dark(#b06000, #fdd663);
  --success: light-dark(#137333, #81c995);
}
:root.light, :host(.light) { color-scheme: light; } /* manual override */
:root.dark, :host(.dark) { color-scheme: dark; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 400 var(--text-sm)/1.4 var(--font); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; } /* outline survives forced-colors mode; box-shadow doesn't */
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
```

These pairs meet WCAG AA (4.5:1) for every text token on `--bg` in both schemes; `--accent` text on `--surface` in light mode is 4.2:1, so use `--fg` for small text on gray surfaces. Re-check after swapping in a brand accent, especially its dark variant. For content-script UI, rename to `--myext-*`.

## Theme override (System / Light / Dark)

`chrome.storage` is async, so reading it before paint causes a flash. Mirror the choice into `localStorage` (synchronous, per extension origin, available in extension pages but not the service worker):

```ts
// src/theme.ts; import first in every extension page entry
type Theme = 'system' | 'light' | 'dark';
const apply = (t: Theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', t === 'dark');
  root.classList.toggle('light', t === 'light');
};
apply((localStorage.getItem('theme') as Theme) ?? 'system');
chrome.storage.sync.get('theme').then(({ theme }) => theme && apply(theme as Theme));
chrome.storage.onChanged.addListener((c) => c.theme && apply(c.theme.newValue as Theme)); // keeps open surfaces in sync

export async function setTheme(t: Theme) {
  localStorage.setItem('theme', t);
  apply(t);
  await chrome.storage.sync.set({ theme: t });
}
```

## Tailwind CSS v4

```bash
npm i -D tailwindcss @tailwindcss/vite
```

```ts
// wxt.config.ts (Vite-based: same plugin in vite.config.ts for CRXJS)
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ vite: () => ({ plugins: [tailwindcss()] }) });
```

```css
/* src/styles/app.css */
@import "tailwindcss";
@import "./tokens.css";
@custom-variant dark (&:where(.dark, .dark *)); /* only if offering the manual override */
@theme inline {
  --color-bg: var(--bg); --color-surface: var(--surface); --color-border: var(--border);
  --color-fg: var(--fg); --color-muted: var(--fg-muted); --color-accent: var(--accent);
  --font-sans: var(--font);
}
```

No `tailwind.config.js` or `tailwindcss init` in v4; configuration lives in CSS. Plasmo still uses PostCSS: install `@tailwindcss/postcss` and add it to `postcss.config.js`. Because tokens already switch on `prefers-color-scheme`, most components need no `dark:` variants at all.

## shadcn/ui (React)

```bash
npx shadcn@latest init        # in an existing project; answers path alias + CSS file
npx shadcn@latest add button input switch tabs tooltip
```

- Needs a `@/*` path alias. WXT already aliases `@` to the src dir; make sure `components.json` aliases point there.
- Components size for web pages (36–40 px controls). For popup/side panel, set the default `size` variant to `h-8 text-[13px] px-3` in `components/ui/button.tsx` rather than overriding per use.
- Map shadcn's `--background`, `--foreground`, `--primary`, `--border`, `--ring` to the tokens above instead of keeping two palettes.
- In content-script UI, pass the shadow container to every Portal (`container` prop).

## daisyUI 5 (if the repo already uses it)

```css
@import "tailwindcss";
@plugin "daisyui" { themes: light --default, dark --prefersdark; }
```

Theme override: set `data-theme="light|dark"` on `<html>` instead of the class. daisyUI defaults are roomy; use `btn-sm`/`input-sm` in popups.

## Icons and fonts

- Icons: an SVG icon package already in the repo (lucide-react, @heroicons, etc.) at 16 px with `aria-hidden="true"`; avoid icon fonts and CDN sprites.
- Fonts: system stack by default. A brand font ships as a bundled `woff2` (Latin subset, 1–2 weights) imported from the CSS, never a Google Fonts `<link>`.
