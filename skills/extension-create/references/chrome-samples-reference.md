# Chrome Extension Samples Reference

Official repo: https://github.com/GoogleChrome/chrome-extensions-samples

---

## Repository Structure

```
chrome-extensions-samples/
├── api-samples/         # One sample per Chrome API
│   ├── action/
│   ├── alarms/
│   ├── bookmarks/
│   ├── contextMenus/
│   ├── storage/
│   ├── tabs/
│   └── ...
└── functional-samples/  # Complete, real-world extensions
    ├── cookbook.sidepanel-global/
    ├── cookbook.sidepanel-navigate/
    ├── cookbook.offscreen-dom/
    ├── sample.page-redder/
    ├── sample.tab-manager/
    └── ...
```

---

## Top 10 Most Useful Samples

| Use Case             | Sample Path                                       | What it shows                    |
| -------------------- | ------------------------------------------------- | -------------------------------- |
| Side panel (global)  | `functional-samples/cookbook.sidepanel-global/`   | Open sidepanel on all pages      |
| Side panel (per-tab) | `functional-samples/cookbook.sidepanel-navigate/` | Different panel per page         |
| Content script DOM   | `api-samples/scripting/`                          | `chrome.scripting.executeScript` |
| Storage sync         | `api-samples/storage/`                            | `chrome.storage.sync` read/write |
| Context menus        | `api-samples/contextMenus/`                       | Right-click menu items           |
| Tab management       | `functional-samples/sample.tab-manager/`          | Full tab manager extension       |
| Page modification    | `functional-samples/sample.page-redder/`          | Content script + action          |
| Offscreen DOM        | `functional-samples/cookbook.offscreen-dom/`      | DOM access from SW               |
| Alarms/background    | `api-samples/alarms/`                             | Periodic background tasks        |
| Message passing      | `api-samples/runtime.sendMessage/`                | Popup ↔ background ↔ content     |

---

## Using a Sample as WXT Starting Point

1. Browse to the relevant sample on GitHub
2. Copy the core logic (not the manifest — WXT generates that)
3. Place logic in the appropriate WXT entrypoint:

   | Sample file          | WXT entrypoint              |
   | -------------------- | --------------------------- |
   | `background.js`      | `entrypoints/background.ts` |
   | `content.js`         | `entrypoints/content.ts`    |
   | `popup.html/.js`     | `entrypoints/popup/`        |
   | `sidepanel.html/.js` | `entrypoints/sidepanel/`    |

4. Replace `chrome.*` with `browser.*` (WXT cross-browser wrapper)
5. Replace manifest permissions with `wxt.config.ts` manifest block

---

## Key API Categories (api-samples/)

| Category                 | APIs covered                       |
| ------------------------ | ---------------------------------- |
| `action/`                | badge, icon, popup, title          |
| `alarms/`                | create, clear, onAlarm             |
| `bookmarks/`             | create, search, remove, onCreated  |
| `contextMenus/`          | create, remove, onClicked          |
| `cookies/`               | get, set, remove                   |
| `declarativeNetRequest/` | block/redirect/modify requests     |
| `identity/`              | OAuth2, getAuthToken               |
| `notifications/`         | create, update, onClicked          |
| `offscreen/`             | DOM, clipboard, audio              |
| `scripting/`             | executeScript, insertCSS           |
| `storage/`               | local, sync, session, onChanged    |
| `tabs/`                  | query, create, update, group       |
| `webNavigation/`         | onCompleted, onHistoryStateUpdated |

---

## Browsing Tips

- Filter by API: `api-samples/<api-name>/`
- Filter by pattern: `functional-samples/cookbook.*` = focused recipes
- Filter by full app: `functional-samples/sample.*` = complete extensions
- All samples are MV3-compatible

---

## Docs

- Chrome API reference: https://developer.chrome.com/docs/extensions/reference/api
- Samples README: https://github.com/GoogleChrome/chrome-extensions-samples#readme
