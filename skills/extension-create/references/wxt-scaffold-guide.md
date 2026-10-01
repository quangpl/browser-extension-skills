# WXT Scaffold Guide

Current docs: https://wxt.dev (machine-readable index: https://wxt.dev/llms.txt). Fetch them when a flag or option here does not behave as described.

## `wxt init`

```bash
pnpm dlx wxt@latest init [directory] -t <template> --pm <pnpm|npm|yarn|bun>
npx wxt@latest init my-ext -t react --pm npm
bunx wxt@latest init my-ext -t svelte --pm bun
```

- Templates: `vanilla`, `react`, `vue`, `svelte`, `solid`. All TypeScript.
- With both `-t` and `--pm`, init runs without prompts. Without them it prompts, which hangs a non-interactive shell.
- Init only downloads the template. Run the install yourself.
- Other flags: `--debug`, `--level <silent|error|warn|info|debug|…>`.

## What the template contains

```
<name>/
├── entrypoints/
│   ├── background.ts        # defineBackground → MV3 service worker
│   ├── content.ts           # defineContentScript, matches *://*.google.com/*
│   └── popup/               # index.html + main.tsx + App.tsx + CSS (vanilla: main.ts)
├── assets/                  # imported assets (bundled)
├── public/icon/             # 16/32/48/96/128.png, auto-wired as manifest icons
├── wxt.config.ts            # only `modules: ['@wxt-dev/module-<framework>']`
├── package.json             # name "wxt-<framework>-starter", version "0.0.0"
└── tsconfig.json            # extends ./.wxt/tsconfig.json
```

Cleanup after init:

- `package.json`: set `name`, `description`, and `version` (`0.1.0`; Chrome refuses an all-zero version). The manifest `name` defaults to `package.json` `name`, and `version` / `version_name` always come from `package.json`.
- Delete `content.ts` if there is no content script; otherwise set real `matches`. In dev, WXT adds content-script matches to `host_permissions`, so a leftover google.com match shows up as a permission.
- Replace the template popup UI and `public/wxt.svg` / `assets/*.svg` placeholders. Real icons: extension-assets.

## `wxt.config.ts`

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'], // module-vue / module-svelte / module-solid; none for vanilla
  manifest: {
    name: 'Tab Sorter',
    description: 'Sort and group open tabs by domain.',
    permissions: ['storage', 'tabs'],
    host_permissions: ['https://*.example.com/*'], // only if needed; prefer activeTab
    // commands, omnibox, web_accessible_resources, etc. go here too
  },
});
```

- `manifest` can also be a function `({ browser, manifestVersion, mode, command }) => ({ … })` for per-browser or dev-only fields.
- Do not write `background`, `content_scripts`, `action.default_popup`, `side_panel`, or `options_ui` here; WXT derives them from `entrypoints/`.
- WXT adds some permissions itself (e.g. `sidePanel` when a side panel entrypoint exists). Check the built manifest rather than guessing.
- `srcDir: 'src'` moves `entrypoints/`, `assets/`, etc. under `src/` if the user prefers that layout.
- Vite config: `vite: () => ({ plugins: [] })`.

## Scripts in the template

| Script | Runs | Output |
|---|---|---|
| `pnpm dev` | `wxt` | `.output/chrome-mv3-dev/`, HMR, auto-opens browser |
| `pnpm dev:firefox` | `wxt -b firefox` | `.output/firefox-mv2-dev/` |
| `pnpm build` | `wxt build` | `.output/chrome-mv3/` |
| `pnpm zip` | `wxt zip` | `.output/<name>-<version>-chrome.zip` for CWS |
| `pnpm compile` | `tsc --noEmit` | type check only |
| `postinstall` | `wxt prepare` | regenerates `.wxt/` types and auto-imports |

Missing types for `defineBackground`, `browser`, etc. mean `.wxt/` is stale: run `pnpm wxt prepare`.

## Dev browser startup

`pnpm dev` uses `web-ext` (a template dev dependency) to launch Chrome with a fresh profile and the extension loaded, and prints `Load ".output/chrome-mv3-dev" as an unpacked extension manually` when it cannot. To stop it opening a browser (headless/CI/remote shells, or to test in your normal profile), create `web-ext.config.ts` in the project root (gitignored by convention):

```ts
import { defineWebExtConfig } from 'wxt';

export default defineWebExtConfig({ disabled: true });
```

Other options in the same file: `binaries: { chrome: '/path/to/chrome-beta' }`, `chromiumArgs: ['--user-data-dir=./.wxt/chrome-data']` to keep a persistent dev profile (logins, devtools extensions). Team-wide settings go under `webExt` in `wxt.config.ts`.

`pnpm dev` keeps running; start it in the background or as a service and stop it when done.

## Auto-imports

Available without imports in project files: `browser` (from `wxt/browser`), `defineBackground`, `defineContentScript`, `defineUnlistedScript`, `createShadowRootUi`, `storage`, and anything exported from `components/`, `composables/`, `hooks/`, `utils/`. Explicit imports use `#imports`:

```ts
import { defineContentScript, storage } from '#imports';
```

Legacy (WXT < 0.20, still in older tutorials): `extensionApi: 'chrome'` config, `webextension-polyfill`-based `browser`, and imports from `wxt/client`, `wxt/sandbox`, `wxt/storage`. Remove these when you see them.
