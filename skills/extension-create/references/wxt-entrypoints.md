# WXT Entrypoints

WXT auto-detects entrypoints by file name in `entrypoints/`. No manual manifest editing needed.

---

## Background Service Worker

```
entrypoints/background.ts
```

```ts
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
  });
});
```

Generates: `"background": { "service_worker": "background.js", "type": "module" }`

---

## Content Script

```
entrypoints/content.ts          # matches all pages by default
entrypoints/content/index.ts    # same, folder form
entrypoints/overlay.content.ts  # named: "overlay"
```

```ts
export default defineContentScript({
  matches: ["https://*.example.com/*"],
  runAt: "document_idle", // 'document_start' | 'document_end' | 'document_idle'
  main() {
    console.log("Content script running");
  },
});
```

Generates: `content_scripts` array in manifest.

---

## Popup

```
entrypoints/popup/index.html
entrypoints/popup/main.tsx
entrypoints/popup/App.tsx
```

`index.html` must include `<script type="module" src="./main.tsx"></script>`.

Generates: `"action": { "default_popup": "popup.html" }`

---

## Options Page

```
entrypoints/options/index.html
entrypoints/options/main.tsx
```

Generates: `"options_ui": { "page": "options.html", "open_in_tab": true }`

To open in-popup instead:

```ts
// wxt.config.ts manifest override
manifest: {
  options_ui: {
    open_in_tab: false;
  }
}
```

---

## Side Panel

```
entrypoints/sidepanel/index.html
entrypoints/sidepanel/main.tsx
```

Generates: `"side_panel": { "default_path": "sidepanel.html" }`

Requires `permissions: ['sidePanel']` in wxt.config.ts manifest.

Open programmatically:

```ts
browser.sidePanel.open({ windowId });
```

---

## Unlisted Pages (not in manifest)

```
entrypoints/welcome/index.html   # accessible but not linked from manifest
```

Access at: `chrome-extension://<id>/welcome.html`

---

## CSS Entrypoints (content script CSS)

```
entrypoints/content.css          # injected with content script
```

Or import inside content script:

```ts
import "./styles.css";
```

---

## Entrypoint Naming Rules

| File pattern           | Type                          |
| ---------------------- | ----------------------------- |
| `background.ts`        | Service worker                |
| `*.content.ts`         | Content script                |
| `content.ts`           | Content script (default name) |
| `popup/index.html`     | Popup                         |
| `options/index.html`   | Options page                  |
| `sidepanel/index.html` | Side panel                    |
| `devtools/index.html`  | DevTools panel                |
| `*.html` (other)       | Unlisted page                 |

---

## Manifest Generation

WXT reads each entrypoint's `defineXxx()` call metadata and generates `manifest.json` at build time. To inspect:

```bash
pnpm build
cat .output/chrome-mv3/manifest.json
```

---

## Docs

- https://wxt.dev/guide/entrypoints/
