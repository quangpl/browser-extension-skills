# Other Scaffolders (escape hatches)

Use one of these only when the user asks for it, or the surrounding repo/monorepo already standardizes on it. Otherwise scaffold with WXT. The rest of the workflow (identity, minimal permissions, build, load unpacked, check the service worker console) is the same; only commands and paths differ.

| Scaffolder | Pick when | Status |
|---|---|---|
| Plasmo | user explicitly wants Plasmo (CSUI, Plasmo Messaging/Storage, an existing Plasmo codebase) | no release or main-branch commit since v0.90.5 (May 2025); check https://github.com/PlasmoHQ/plasmo/releases before starting and tell the user it is unmaintained |
| CRXJS | user wants a plain Vite app with their own `vite.config.ts` and a hand-written manifest | active (`@crxjs/vite-plugin` 2.x) |
| No-build vanilla | tiny single-purpose extension, teaching, or "no dependencies" requested | Chrome loads the folder directly |

## Plasmo

Docs: https://docs.plasmo.com/framework

```bash
pnpm create plasmo            # interactive prompts (name, description); run in a TTY
pnpm create plasmo --with-src # put source under src/
```

| Feature | File (root or `src/`) |
|---|---|
| Popup | `popup.tsx` |
| Options page | `options.tsx` |
| Side panel | `sidepanel.tsx` |
| New tab | `newtab.tsx` |
| Service worker | `background.ts` |
| Content script | `content.ts` or `contents/<name>.ts(x)` |
| Extra extension pages | `tabs/<name>.tsx` |

- Manifest fields Plasmo cannot infer (permissions, host permissions, commands) go in the `manifest` key of `package.json`; name/description/version come from `package.json`.
- Content-script config: `export const config: PlasmoCSConfig = { matches: [...] }`.
- `pnpm dev` → load `build/chrome-mv3-dev`; `pnpm build` → `build/chrome-mv3-prod`; `pnpm package` → CWS zip.

## CRXJS (Vite plugin)

Docs: https://crxjs.dev (index: https://crxjs.dev/llms.txt)

```bash
npm create crxjs@latest   # interactive template picker; keep @latest so npm doesn't use a cached old version
```

- Starter layout: `manifest.config.ts` (typed `defineManifest`), `vite.config.ts` with the `crx()` plugin, `src/popup/`, `src/sidepanel/`, `src/content/main.ts`.
- Unlike WXT, the manifest is explicit: every entrypoint and permission is declared in `manifest.config.ts`.
- `npm run dev` / `npm run build` output to `dist/`; load `dist/` unpacked.

## No-build vanilla

```
<name>/
├── manifest.json
├── service-worker.js
├── popup.html
├── popup.js
└── icons/icon-128.png
```

```json
{
  "manifest_version": 3,
  "name": "Tab Sorter",
  "version": "0.1.0",
  "description": "Sort and group open tabs by domain.",
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "service-worker.js", "type": "module" },
  "permissions": ["storage"],
  "icons": { "128": "icons/icon-128.png" }
}
```

- Scripts in extension pages must be external files (`<script src="popup.js" type="module">`); MV3 CSP blocks inline scripts.
- Use `chrome.*` promise APIs directly. Load the folder itself unpacked; click reload on the card after edits.
- To start from an official Chrome sample instead, copy the closest one from https://github.com/GoogleChrome/chrome-extensions-samples (canonical paths per pattern are in this skill's samples reference).
