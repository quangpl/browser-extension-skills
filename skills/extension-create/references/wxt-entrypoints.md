# WXT Entrypoints and Starter Patterns

## Contents
- Feature → entrypoint map
- File naming
- Background (service worker)
- Content script
- HTML pages: popup, options, side panel, others
- Starter snippets by extension type

Docs: https://wxt.dev/guide/essentials/entrypoints (content-script UI: https://wxt.dev/guide/essentials/content-scripts).

## Feature → entrypoint map

| Extension type / feature | Entrypoints | Typical permissions |
|---|---|---|
| Act on the current tab from a toolbar popup | `popup/` | `activeTab` (+ `scripting` to inject) |
| Modify or read specific sites automatically | `content.ts` (or `<name>.content.ts`) | none extra; `matches` become host access |
| Persistent assistant UI beside pages | `sidepanel/` + `background.ts` | `sidePanel` (added by WXT) |
| Tab / window manager | `popup/` + `background.ts` | `tabs` (only if reading other tabs' URL/title), `tabGroups` |
| Right-click actions | `background.ts` | `contextMenus`, `activeTab` |
| Keyboard shortcut | `background.ts` + `manifest.commands` | none |
| Settings | `options/` | `storage` |
| Periodic work / sync | `background.ts` | `alarms`, `storage` |
| New tab replacement | `newtab/` | none |
| DevTools panel | `devtools/` (+ unlisted panel page) | none |

Store state with `storage` (WXT's typed wrapper over `chrome.storage`), not service-worker globals: the service worker is terminated when idle.

## File naming

An entrypoint is a file or a folder with an `index.*`, exactly one level inside `entrypoints/`. Related files (components, CSS) go inside the entrypoint's folder.

| Path | Becomes |
|---|---|
| `background.ts` / `background/index.ts` | service worker |
| `content.ts`, `<name>.content.ts`, `<name>.content/index.ts` | content script |
| `popup.html` / `popup/index.html` | `action.default_popup` |
| `options.html` / `options/index.html` | `options_ui` |
| `sidepanel.html`, `<name>.sidepanel.html` (or folders) | `side_panel` |
| `newtab`, `history`, `bookmarks` (`.html` or folder) | `chrome_url_overrides` |
| `devtools.html` / `devtools/index.html` | `devtools_page` |
| `sandbox.html`, `<name>.sandbox.html` | sandboxed page |
| any other `*.html` | unlisted page at `browser.runtime.getURL('/<name>.html')` |
| any other `*.ts` (with `defineUnlistedScript`) | unlisted script at `/<name>.js` |
| any other `*.css` | unlisted CSS |

## Background (service worker)

```ts
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') browser.runtime.openOptionsPage();
  });
});
```

Object form accepts `type: 'module'`, `include` / `exclude` (browser lists), and `main()`. `main` cannot be async; register listeners synchronously so they survive service-worker restarts.

## Content script

```ts
export default defineContentScript({
  matches: ['https://*.example.com/*'],
  runAt: 'document_idle',            // default; or document_start / document_end
  // allFrames, world: 'MAIN', excludeMatches, cssInjectionMode, registration: 'runtime'
  main(ctx) {
    const badge = document.createElement('div');
    badge.textContent = 'Hello from the extension';
    document.body.append(badge);
    ctx.onInvalidated(() => badge.remove()); // runs when the extension reloads/updates
  },
});
```

CSS: `import './style.css'` inside a `<name>.content/` folder entrypoint and WXT adds it to the manifest. For framework UI injected into pages, use `createShadowRootUi` with `cssInjectionMode: 'ui'` so page styles don't leak in.

## HTML pages

Popup, options, side panel and override pages are an `index.html` plus a script:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Tab Sorter</title> <!-- popup: becomes action.default_title -->
    <!-- options: <meta name="manifest.open_in_tab" content="true" /> (default false = embedded) -->
    <!-- side panel: <meta name="manifest.open_at_install" content="true" /> (Firefox sidebar) -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```
For other React pages, copy the template's `popup/main.tsx` (`ReactDOM.createRoot(...).render(<App />)`).

## Starter snippets by extension type

Read the current tab from a popup (`activeTab` is granted when the popup opens):

```ts
async function readActiveTabTitle() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const [injection] = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.title,        // runs in the page; needs `scripting`
  });
  return injection?.result;
}
```

Side panel opened from the toolbar icon (no popup entrypoint; add `manifest: { action: {} }` so the icon exists):

```ts
export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});
```

Context menu on selected text:

```ts
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({ id: 'search', title: 'Search "%s"', contexts: ['selection'] });
  });
  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== 'search' || !info.selectionText) return;
    browser.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(info.selectionText)}` });
  });
});
```

Keyboard shortcut (`wxt.config.ts` `manifest.commands`, handled in the service worker):

```ts
manifest: { commands: { 'save-page': { suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' }, description: 'Save page' } } }
// background: browser.commands.onCommand.addListener((name, tab) => { if (name === 'save-page') … });
```

Typed persistent setting shared by popup, options and service worker:

```ts
// utils/settings.ts (auto-imported everywhere)
export const enabled = storage.defineItem<boolean>('sync:enabled', { fallback: true });
// await enabled.getValue(); await enabled.setValue(false); enabled.watch((v) => …);
```
