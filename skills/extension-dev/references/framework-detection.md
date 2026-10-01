# Stack Conventions

Per-stack layout, idioms, commands, and load-unpacked paths. The repo's existing conventions (folder layout, lint config, naming, existing helpers) take precedence over anything here; this file covers what to do where the repo is silent.

Fetch current docs when an API detail matters: prefer the site's `llms.txt` (`https://wxt.dev/llms.txt`, `https://wxt.dev/llms-full.txt`) or a docs MCP server if one is configured; otherwise fetch the page directly.

## Also detect

- Package manager: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun, `package-lock.json` → npm. Use it for every command.
- UI framework: `react`, `vue`, `svelte`, `solid-js` in `package.json` dependencies, or a WXT module (`@wxt-dev/module-react`, etc.) in `wxt.config.ts`.
- Runtime floor: `minimum_chrome_version` in the manifest or manifest config. Chrome 148+ enables the `browser` namespace and promise-returning `onMessage` listeners.
- `devtools_page`: if declared, promise-returning `onMessage` listeners stay disabled, so keep `return true` + `sendResponse`.
- Existing messaging wrapper (`@webext-core/messaging`, `webext-bridge`, `trpc-chrome`, `@plasmohq/messaging`, or a local typed helper) and storage wrapper. Extend these instead of adding raw `chrome.runtime` calls next to them.

## WXT

Docs: https://wxt.dev (LLM-friendly: https://wxt.dev/llms.txt)

- Entrypoints live in `entrypoints/` (or `src/entrypoints/` when `srcDir: 'src'`). File name decides the type: `background.ts`, `popup/index.html`, `sidepanel/index.html`, `options/index.html`, `*.content.ts` or `<name>.content/index.ts`.
- Each entrypoint exports `defineBackground(() => …)`, `defineContentScript({ matches, main(ctx) {} })`, or `defineUnlistedScript`. WXT imports these files in Node at build time, so extension API calls belong inside `main`/the callback, never at module top level.
- `browser` from `wxt/browser` (auto-imported) is `globalThis.browser` when present, otherwise `chrome`. No polyfill: promise-returning `onMessage` still depends on the Chrome version.
- Storage: `storage.defineItem<T>('local:key', { fallback })` from `wxt/utils/storage` (auto-imported) — typed, with `watch()` and versioned migrations.
- Content scripts: use `ctx.addEventListener`, `ctx.setTimeout`, `ctx.isInvalid` so code stops after the extension reloads. UI goes through `createShadowRootUi(ctx, …)` with `cssInjectionMode: 'ui'`. MAIN-world code: `world: 'MAIN'` or `injectScript('/file.js')` from an isolated content script.
- Manifest fields go in `wxt.config.ts` → `manifest`. Some permissions are added automatically (e.g. `sidePanel` when a `sidepanel` entrypoint exists).
- Run `wxt prepare` (usually the `postinstall` script) after adding entrypoints or modules so `.wxt/` types and auto-imports regenerate.

| Task | Command |
|---|---|
| Dev (opens a browser with the extension, HMR + auto reload) | `pnpm dev` (`pnpm dev:firefox` for Firefox) |
| Production build | `pnpm build` → `.output/chrome-mv3/` |
| Store zip | `pnpm zip` |
| Load unpacked manually | `.output/chrome-mv3-dev/` (dev) or `.output/chrome-mv3/` (build) |

If the dev browser should use an existing profile or not launch at all, configure `webExt` in `wxt.config.ts` / `web-ext.config.ts` (`disabled: true` to load unpacked yourself).

## Plasmo

Docs: https://docs.plasmo.com

- File-based entrypoints at the root or `src/`: `popup.tsx`, `options.tsx`, `sidepanel.tsx`, `background.ts` (or `background/index.ts`), `contents/*.ts(x)`, `tabs/*.tsx`.
- Content script config: `export const config: PlasmoCSConfig = { matches, world }`. Content-script UI (CSUI): export a default React component from a `contents/*.tsx` file plus `getInlineAnchor`/`getStyle`.
- Messaging: `@plasmohq/messaging` handlers under `background/messages/<name>.ts`, called with `sendToBackground({ name, body })`. Storage: `@plasmohq/storage` (`useStorage` hook in UI).
- Manifest overrides live in `package.json` → `manifest`; env vars need the `PLASMO_PUBLIC_` prefix to reach the bundle.

| Task | Command |
|---|---|
| Dev | `pnpm dev` → load `build/chrome-mv3-dev/` |
| Production build | `pnpm build` → `build/chrome-mv3-prod/` |
| Store zip | `pnpm package` |
| Other targets | `plasmo build --target=firefox-mv2` |

## CRXJS (Vite plugin)

Docs: https://crxjs.dev

- Detected by `import { crx } from '@crxjs/vite-plugin'` in `vite.config.*`. The manifest is either `manifest.json` or `manifest.config.ts` (`defineManifest`), imported into the Vite config.
- Entrypoints are whatever the manifest references (`src/background.ts`, `src/content/main.ts`, HTML pages). Add new pages/scripts by referencing them in the manifest; CRXJS bundles them.
- Content-script imports are bundled for you; assets that the page must load still need `web_accessible_resources`.

| Task | Command |
|---|---|
| Dev (HMR; load `dist/` once, keep the dev server running) | `pnpm dev` |
| Production build | `pnpm build` → `dist/` |

## Vanilla (no bundler)

Docs: https://developer.chrome.com/docs/extensions/get-started

- `manifest.json` at the root drives everything; scripts are plain JS (ES modules only where declared, e.g. `"background": { "service_worker": "sw.js", "type": "module" }`).
- No bundler means no npm imports in content scripts unless vendored into the package — remote code is not allowed.
- Load unpacked from the project root; after edits, click reload on the extension card at `chrome://extensions`.
