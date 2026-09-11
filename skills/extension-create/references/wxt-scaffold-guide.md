# WXT Scaffold Guide

## Init Command

```bash
# Interactive (prompts for name, framework, package manager)
npx wxt@latest init

# Non-interactive
npx wxt@latest init <project-name> --template react
npx wxt@latest init <project-name> --template vue
npx wxt@latest init <project-name> --template svelte
npx wxt@latest init <project-name> --template solid
npx wxt@latest init <project-name> --template vanilla
```

Flags:

- `--template` / `-t` — framework template
- `--pm` — package manager: `npm` | `pnpm` | `yarn` | `bun`

Example:

```bash
npx wxt@latest init my-extension --template react --pm pnpm
```

---

## Project Structure

```
my-extension/
├── entrypoints/          # All extension entry files (auto-detected by WXT)
│   ├── background.ts
│   ├── content.ts
│   └── popup/
│       ├── index.html
│       └── main.tsx
├── public/               # Static assets copied as-is
│   └── icon/
├── wxt.config.ts         # Main config
├── package.json
└── tsconfig.json
```

WXT scans `entrypoints/` and builds the manifest automatically — no manual manifest.json needed.

---

## wxt.config.ts Options

```ts
import { defineConfig } from "wxt";

export default defineConfig({
  // Target browser
  browser: "chrome", // 'chrome' | 'firefox' | 'safari'
  extensionApi: "chrome", // API type hints

  // Framework module
  modules: ["@wxt-dev/module-react"], // '@wxt-dev/module-vue', etc.

  // Manifest overrides
  manifest: {
    name: "__MSG_extName__",
    permissions: ["storage", "tabs"],
    host_permissions: ["https://*.example.com/*"],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },

  // Vite config passthrough
  vite: () => ({
    plugins: [],
  }),

  // Output directory (default: .output)
  outDir: ".output",
});
```

---

## Dev Commands

```bash
pnpm dev           # Chrome dev build with HMR
pnpm dev:firefox   # Firefox dev build
pnpm build         # Production build
pnpm build:firefox # Firefox production
pnpm zip           # Zip for Chrome Web Store
pnpm zip:firefox   # Zip for Firefox Add-ons
pnpm compile       # Type-check only (no build)
```

Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3-dev`

---

## Auto-imports

WXT auto-imports from:

- `wxt/browser` → `browser` (cross-browser compat wrapper over `chrome`)
- `wxt/client` → `defineContentScript`, `defineBackground`, etc.
- React/Vue/etc. framework utilities (via module)

No explicit imports needed for these in entrypoint files.

---

## TypeScript Setup

WXT generates `.wxt/` with:

- `tsconfig.json` — extends root, adds WXT types
- `wxt.d.ts` — type declarations
- `types.d.ts` — auto-import types

Run `pnpm wxt prepare` to regenerate if types are missing.

---

## Docs

- https://wxt.dev/guide/introduction.html
- https://wxt.dev/api/config
