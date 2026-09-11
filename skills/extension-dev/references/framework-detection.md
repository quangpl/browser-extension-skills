# Framework Detection

## Step 1: Check for config files

```bash
ls wxt.config.ts wxt.config.js crxjs.config.ts vite.config.ts vite.config.js manifest.json 2>/dev/null
```

## Decision Tree

```
wxt.config.ts exists?          → WXT
package.json has "crxjs"?     → CRXJS
vite.config has "@crxjs"?      → CRXJS
manifest.json in root?         → Vanilla (no build tool)
```

## Step 2: Detect UI framework

```bash
cat package.json | grep -E '"react"|"vue"|"svelte"|"solid"'
```

| Dependency | UI Framework |
| ---------- | ------------ |
| `react`    | React        |
| `vue`      | Vue          |
| `svelte`   | Svelte       |
| `solid-js` | Solid        |
| none       | Vanilla JS   |

---

## WXT

**Detection:** `wxt.config.ts` or `wxt.config.js` in project root.

**Docs:** https://wxt.dev/guide/essentials/

**Structure:**

```
entrypoints/       ← popup, background, content scripts
wxt.config.ts      ← permissions, manifest overrides, modules
public/            ← static assets
.output/           ← build output
```

**Dev commands:**

```bash
pnpm dev           # Chrome dev mode, HMR enabled
pnpm dev:firefox   # Firefox dev mode
pnpm build         # Production build
pnpm zip           # Store-ready .zip
```

---

## CRXJS

**Detection:** `package.json` contains `"crxjs"` in dependencies or scripts.

**Docs:** https://docs.crxjs.com/

**Structure:**

```
popup.tsx          ← popup entrypoint
background.ts      ← service worker
contents/          ← content scripts
tabs/              ← full-page tab UIs
options.tsx        ← options page
```

**Dev commands:**

```bash
pnpm dev           # Dev mode
pnpm build         # Production build
pnpm package       # Store zip
```

---

## CRXJS (Vite plugin)

**Detection:** `vite.config.ts` imports `@crxjs/vite-plugin`.

```ts
// vite.config.ts signature
import { crx } from "@crxjs/vite-plugin";
```

**Docs:** https://crxjs.dev/vite-plugin

**Structure:**

```
src/               ← source files
manifest.json      ← manifest in root (CRXJS reads it)
vite.config.ts     ← plugin config
dist/              ← build output
```

**Dev commands:**

```bash
pnpm dev           # Vite dev server, HMR
pnpm build         # dist/ folder
```

---

## Vanilla (no build tool)

**Detection:** `manifest.json` in project root, no framework config files.

**Docs:** https://developer.chrome.com/docs/extensions/get-started

**Structure:**

```
manifest.json      ← extension manifest
popup.html         ← popup
popup.js           ← popup logic
background.js      ← service worker
content.js         ← content script
icons/             ← extension icons
```

**Dev commands:**

- No build step. Load unpacked directly.
- Edit → `chrome://extensions` → reload extension button.

---

## Load Extension / Docs Links

Load unpacked from `chrome://extensions` → Enable Developer mode → Load unpacked:

- WXT: `.output/chrome-mv3-dev` | CRXJS: `build/chrome-mv3-dev` | CRXJS: `dist/` | Vanilla: root

| Framework         | Docs                                         |
| ----------------- | -------------------------------------------- |
| WXT               | https://wxt.dev                              |
| CRXJS             | https://docs.crxjs.com                       |
| CRXJS             | https://crxjs.dev                            |
| Chrome Extensions | https://developer.chrome.com/docs/extensions |
