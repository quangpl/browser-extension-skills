# Design System Setup for Extensions

## React + shadcn/ui (Recommended for React)

Best component quality, accessible by default, Tailwind-based.

```bash
# 1. Add Tailwind (if not present)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 2. Init shadcn/ui
npx shadcn@latest init
# Choose: Default style, CSS variables for colors, yes to Tailwind

# 3. Add components as needed
npx shadcn@latest add button input badge toggle card
```

Override `globals.css`: `--radius: 0.375rem`. Shadcn uses `class="dark"` — toggle on load:

```tsx
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.classList.toggle("dark", prefersDark);
```

---

## React + Tailwind Only (Minimal)

Lean setup, full control, no third-party component opinions.

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**tailwind.config.js** for extension:

```js
export default {
  darkMode: "media", // or 'class' for user toggle
  content: ["./src/**/*.{tsx,ts,jsx,js}", "./entrypoints/**/*.{tsx,ts,html}"],
  theme: {
    extend: {
      colors: {
        primary: "#1a73e8",
        surface: { DEFAULT: "#ffffff", dark: "#1f2937" },
      },
      fontSize: { xs: "11px", sm: "13px", base: "14px" },
      spacing: { 1.5: "6px", 2.5: "10px" },
    },
  },
};
```

---

## Vue + DaisyUI

```bash
npm install -D tailwindcss daisyui@latest postcss autoprefixer
npx tailwindcss init -p
```

**tailwind.config.js**:

```js
import daisyui from "daisyui";
export default {
  plugins: [daisyui],
  daisyui: { themes: ["light", "dark"], darkTheme: "dark" },
  content: ["./src/**/*.{vue,ts,js}", "./entrypoints/**/*.{html,ts}"],
};
```

DaisyUI auto-handles dark mode via `data-theme="dark"` on `<html>`.

---

## Svelte + Tailwind

Same install as React + Tailwind. Content paths: `['./src/**/*.{svelte,ts,js}', './entrypoints/**/*.{html,ts}']`

---

## Dark Mode: System Preference + User Override

```ts
// darkMode.ts — works for any framework
const STORAGE_KEY = "theme-preference";

export async function initDarkMode() {
  const { [STORAGE_KEY]: stored } = await chrome.storage.sync.get(STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = stored === "dark" || (stored !== "light" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

export async function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  await chrome.storage.sync.set({ [STORAGE_KEY]: isDark ? "dark" : "light" });
}
```

---

## Extension CSS Reset

```css
/* extension-reset.css — add to popup/sidepanel root */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
button {
  cursor: pointer;
  border: none;
  background: none;
  font: inherit;
}
a {
  color: inherit;
}
```

---

## Common Compact Components (Tailwind Classes)

```tsx
// Button
<button className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
  Action
</button>
// Input: w-full px-2.5 py-1.5 text-sm border rounded-md + dark variants
// Badge: inline-flex px-2 py-0.5 text-xs font-medium rounded-full
// Card: rounded-lg border bg-white dark:bg-gray-800 p-3
```

Use system font stack (no custom fonts): `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
