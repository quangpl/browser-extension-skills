---
name: extension-create
description: "Scaffolds a new Chrome/browser extension project (Manifest V3, WXT by default) with first entrypoints, build, and load-unpacked check. Use when the user wants to create, scaffold, start, bootstrap, or init a new extension. Not for adding features to an existing extension (use extension-dev)."
license: MIT
metadata:
  author: quangpl
  version: "2.0.0"
---

# Extension Create

Turn a request like "make me an extension that…" into a building, loadable MV3 project with the right entrypoints. If the working directory already holds an extension (`wxt.config.ts`, `package.json` depending on `plasmo`/`@crxjs/vite-plugin`, or a `manifest.json`), this is feature work, which belongs to extension-dev.

## Defaults

| Decision | Default | Escape hatch |
|---|---|---|
| Scaffolder | **WXT** (`wxt init`) for every UI framework | Plasmo, CRXJS or no-build vanilla only when the user asks or the project already uses one; see [other-scaffolders.md](references/other-scaffolders.md) |
| Language | TypeScript | JS only if asked (rename files) |
| Package manager | pnpm if installed, else npm | whatever the user names |
| UI framework | React when the extension has UI and none was named; `vanilla` when there is no UI (content script / service worker only) | Vue, Svelte, Solid when named |
| Target | Chrome MV3 | Firefox/Edge/Safari builds come free with WXT (`-b firefox`) |
| Permissions | the minimum for the features; `activeTab` over host permissions | detailed audit: extension-manifest |

Why WXT: it is actively maintained (frequent releases, Vite-based, file-based entrypoints that generate the manifest, cross-browser builds). Plasmo has had no release or commit on its main branch since May 2025, so new projects should not start on it unless the user insists.

## Derive inputs instead of asking

Read the user's request and fill these in yourself:

- **Name**: kebab-case from the purpose (`tab-sorter`, `price-watch`). Becomes the folder, `package.json` `name`, and manifest name (set a human `manifest.name` in `wxt.config.ts`).
- **Purpose**: one sentence, used as the manifest description.
- **Entrypoints**: map features to entrypoints with the table in [wxt-entrypoints.md](references/wxt-entrypoints.md) (e.g. "highlight words on pages" → content script; "summarize the current tab" → popup + service worker).
- **Framework / package manager**: from the defaults above.

Ask only if the extension's purpose is unknown (e.g. "create an extension" with nothing else): one batched question covering purpose and any framework preference. Everything else uses the defaults; mention the choices in the final message so the user can redirect.

## Workflow

Copy this checklist and work through it:

```
- [ ] 1. Scaffold with WXT (non-interactive)
- [ ] 2. Set identity: package.json name/description/version, manifest name + permissions
- [ ] 3. Shape entrypoints: keep/delete template ones, add the needed ones
- [ ] 4. Install, type-check, build
- [ ] 5. Load unpacked and check for errors; fix and repeat
- [ ] 6. Report
```

1. **Scaffold.** From the parent directory:
   ```bash
   pnpm dlx wxt@latest init <name> -t <react|vue|svelte|solid|vanilla> --pm pnpm
   # npm: npx wxt@latest init <name> -t react --pm npm
   ```
   With `-t` and `--pm` it runs without prompts. It downloads the template only; it does not install. Template contents, cleanup, and `wxt.config.ts` shape: [wxt-scaffold-guide.md](references/wxt-scaffold-guide.md) (read when editing config or something in the generated project surprises you).
2. **Identity.** The templates ship `name: "wxt-<framework>-starter"`, `description: "manifest.json description"`, `version: "0.0.0"`. Replace all three; Chrome rejects an all-zero version, so start at `0.1.0`. Put a readable `name`, `description`, and the minimal `permissions` / `host_permissions` in `wxt.config.ts` `manifest`.
3. **Entrypoints.** Templates include `popup/`, `content.ts` (matching `*://*.google.com/*`) and `background.ts`. Delete what the extension does not need (an unused content script adds a scary host-permission warning), retarget `matches`, then add entrypoints and starter logic from [wxt-entrypoints.md](references/wxt-entrypoints.md). When porting logic from an official Chrome sample, use [chrome-samples-reference.md](references/chrome-samples-reference.md) to find the canonical one.
4. **Build.**
   ```bash
   cd <name> && pnpm install   # postinstall runs `wxt prepare` (generates .wxt/ types)
   pnpm compile                # tsc --noEmit
   pnpm build                  # → .output/chrome-mv3/
   ```
   Fix type and build errors before moving on. Inspect `.output/chrome-mv3/manifest.json` and confirm entrypoints and permissions are what you intended.
5. **Load and verify (feedback loop).**
   - `pnpm dev` builds `.output/chrome-mv3-dev/` with HMR and opens a fresh Chrome profile with the extension installed. In headless or remote environments, disable the auto-open (see the scaffold guide) and load manually.
   - Manual load: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `.output/chrome-mv3` (or `-dev`).
   - Check: no red **Errors** button on the card; click **Service worker** to open its DevTools console and confirm no exceptions; open the popup/side panel and right-click → Inspect; for content scripts, check the page's DevTools console on a matching URL.
   - On any error: fix the source, rebuild (dev mode reloads automatically; otherwise click the reload icon on the card), and re-check until clean.
   - If you cannot drive a browser, run `pnpm build` + manifest inspection as your evidence and give the user the manual load steps above. For automated loading use Playwright's bundled Chromium; branded Chrome ignores `--load-extension`.

## Gotchas

- Code in `background.ts` and content scripts must live inside `main()` / the `defineBackground` callback; WXT imports these files in Node at build time, so top-level `browser.*` or DOM access breaks the build.
- Put helpers in an entrypoint folder (`entrypoints/popup/App.tsx`) or outside `entrypoints/`; loose files directly in `entrypoints/` are treated as entrypoints.
- Use `browser.*` (auto-imported from `wxt/browser`, it is `chrome` on Chromium with promise APIs and `@types/chrome` typings). Imports for WXT utilities come from `#imports`; the old `wxt/client` / `wxt/sandbox` paths and the `extensionApi` config were removed in WXT 0.20.
- `action.onClicked` never fires while a popup is set. To open a side panel from the toolbar icon, remove the popup entrypoint and call `browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` in the service worker.

## Output

Leave a project at `<cwd>/<name>/` that installs and builds cleanly. The final message states:

- project path and the scaffolder/template used (with one line on why if not WXT)
- entrypoints created and permissions declared
- commands: `pnpm dev`, `pnpm build`, `pnpm zip`, and the folder to load unpacked
- verification evidence: build/compile output summary and what you checked in Chrome (or that manual loading is still needed)
- natural next steps by sibling skill: UI polish (extension-ui), features (extension-dev), icons (extension-assets), publishing (extension-publish)

## References

- [wxt-scaffold-guide.md](references/wxt-scaffold-guide.md): `wxt init` flags, generated layout, `wxt.config.ts` manifest config, scripts, dev browser startup. Read when configuring the project.
- [wxt-entrypoints.md](references/wxt-entrypoints.md): feature → entrypoint map, file naming, `define*` options, starter code per extension type. Read when creating entrypoints.
- [other-scaffolders.md](references/other-scaffolders.md): Plasmo, CRXJS, and no-build vanilla setups. Read only when the user picks one of them.
- [chrome-samples-reference.md](references/chrome-samples-reference.md): canonical GoogleChrome and WXT sample paths per pattern and how to port them. Read when you want a reference implementation.
