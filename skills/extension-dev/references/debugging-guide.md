# Debugging Guide

Chrome extensions run across multiple isolated contexts. Each requires a different DevTools entry point.

---

## Context → DevTools Access

### Service Worker (background)

1. Open `chrome://extensions`
2. Find your extension card
3. Click **"inspect"** or **"Service Worker"** link
4. A standalone DevTools window opens for the background context

> Tip: Service workers can go idle. Set a breakpoint before the worker suspends or use `chrome.alarms` to keep it alive during debugging.

### Content Script

1. Open the target web page
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Click the dropdown showing `top` (page context)
5. Select your extension from the list
6. `console.log` calls from the content script appear here

Alternatively: **Sources** tab → **Content scripts** section in sidebar.

### Popup

1. Click your extension icon to open the popup
2. Right-click inside the popup → **Inspect**
3. DevTools opens attached to the popup window
4. Note: popup closes when it loses focus — pin it by clicking into DevTools first

### Options Page

1. Open `chrome://extensions`
2. Click **"Details"** on your extension
3. Click **"Extension options"** link — or navigate to the options page URL
4. F12 opens DevTools for that page normally

### Side Panel

1. Open the side panel via your extension's action or `chrome.sidePanel.open`
2. Press F12 while side panel is focused — DevTools attaches
3. Or: right-click anywhere in side panel → **Inspect**

---

## Storage Inspection

1. Open DevTools for any extension context (popup, options, or background)
2. Go to **Application** tab
3. Under **Storage** → **Extension Storage** → select `local`, `sync`, or `session`
4. View and edit key/value pairs directly

---

## Network Debugging

Content scripts share the page's network context — visible in the page's **Network** tab.

Service worker network calls appear in the **background DevTools Network** tab (inspect from `chrome://extensions`).

For `declarativeNetRequest` rule testing:

- `chrome://extensions` → Details → **"Test matched rules"** tool

---

## Common Errors and Quick Fixes

| Error                                                          | Cause                            | Fix                                                                           |
| -------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `Cannot read properties of undefined (reading 'tabs')`         | Missing `tabs` permission        | Add `"tabs"` to `manifest.json` permissions                                   |
| `Extension context invalidated`                                | Extension reloaded mid-operation | Catch the error, retry after reconnect                                        |
| `Could not establish connection. Receiving end does not exist` | Content script not injected      | Verify `matches` in manifest content_scripts or use `scripting.executeScript` |
| `Service worker registration failed`                           | Syntax error in background.ts    | Check background DevTools console                                             |
| `Unchecked runtime.lastError`                                  | No listener on the other end     | Add `.then()`/`sendResponse` listener or check `chrome.runtime.lastError`     |
| Popup closes immediately                                       | JS error crashes it              | Inspect popup before clicking — set DevTools to pause on exceptions           |
| Badge not showing                                              | `action` not in manifest         | Add `"action": {}` to manifest                                                |
| `Invalid manifest` on load                                     | JSON syntax error                | Validate manifest.json syntax                                                 |

---

## console.log Strategy Across Contexts

Add a context prefix to every log to identify origin at a glance:

```ts
// background.ts
const log = (...args: unknown[]) => console.log("[BG]", ...args);

// content.ts
const log = (...args: unknown[]) => console.log("[CS]", ...args);

// popup/main.tsx
const log = (...args: unknown[]) => console.log("[POPUP]", ...args);
```

---

## Useful Chrome DevTools Tips

- **Preserve log**: In Console settings, enable "Preserve log" so logs survive page navigation
- **Pause on exceptions**: Sources tab → pause icon → "Pause on caught exceptions"
- **Snippets**: Sources → Snippets → write reusable debug scripts that run in any context
- **chrome://extensions error badge**: Red "Errors" button on extension card shows manifest/SW errors
- **chrome://inspect/#service-workers**: Lists all active service workers with inspect links
- **Event listener breakpoints**: Sources → Event Listener Breakpoints → Extension to catch message events

---

## Hot Reload vs Manual Reload

| Change type                          | Reload needed                                  |
| ------------------------------------ | ---------------------------------------------- |
| Popup / options / side panel HTML+JS | Usually auto-reloaded by WXT/CRXJS HMR         |
| Content script                       | Page refresh required                          |
| Service worker / manifest            | Full extension reload at `chrome://extensions` |
| Icons / static assets                | Full extension reload                          |

**Manual reload shortcut:** `chrome://extensions` → click the reload icon (circular arrow) on your extension card.
