# API → Permission Map

## Core APIs

| API                                 | Required Permission        | Notes                                                   |
| ----------------------------------- | -------------------------- | ------------------------------------------------------- |
| `chrome.tabs.query`                 | `"tabs"`                   | Only for URL/title/favIconUrl access; tab id/index free |
| `chrome.tabs.create/update/remove`  | none                       | Basic tab management is free                            |
| `chrome.tabs.captureVisibleTab`     | `"activeTab"` or host_perm |                                                         |
| `chrome.storage.local/sync/session` | `"storage"`                |                                                         |
| `chrome.alarms.*`                   | `"alarms"`                 |                                                         |
| `chrome.notifications.*`            | `"notifications"`          |                                                         |
| `chrome.contextMenus.*`             | `"contextMenus"`           |                                                         |
| `chrome.downloads.*`                | `"downloads"`              |                                                         |
| `chrome.identity.*`                 | `"identity"`               | OAuth flows                                             |
| `chrome.clipboardWrite`             | `"clipboardWrite"`         | document.execCommand write                              |
| `chrome.clipboardRead`              | `"clipboardRead"`          | High-risk, avoid if possible                            |

## Scripting & Content

| API                                       | Required Permission              | Notes                       |
| ----------------------------------------- | -------------------------------- | --------------------------- |
| `chrome.scripting.executeScript`          | `"scripting"` + host_permissions | Or `activeTab` for on-click |
| `chrome.scripting.insertCSS`              | `"scripting"` + host_permissions | Or `activeTab`              |
| `chrome.scripting.registerContentScripts` | `"scripting"`                    |                             |
| Content scripts (manifest)                | host_permissions in `matches`    | Declared in manifest        |

## Navigation & Requests

| API                                           | Required Permission                       | Notes                       |
| --------------------------------------------- | ----------------------------------------- | --------------------------- |
| `chrome.webNavigation.*`                      | `"webNavigation"`                         | Read-only navigation events |
| `chrome.webRequest.onBeforeRequest` (observe) | `"webRequest"` + host_permissions         |                             |
| `chrome.webRequest` (blocking)                | `"webRequestBlocking"` + host_permissions | MV2 only                    |
| `chrome.declarativeNetRequest.*`              | `"declarativeNetRequest"`                 | Preferred MV3 approach      |
| `chrome.declarativeNetRequest` (dynamic)      | `"declarativeNetRequestWithHostAccess"`   | For runtime rule changes    |

## Data & History

| API                     | Required Permission            | Notes                  |
| ----------------------- | ------------------------------ | ---------------------- |
| `chrome.history.*`      | `"history"`                    | High-risk warning      |
| `chrome.bookmarks.*`    | `"bookmarks"`                  |                        |
| `chrome.cookies.*`      | `"cookies"` + host_permissions |                        |
| `chrome.topSites.*`     | `"topSites"`                   | Read top visited sites |
| `chrome.browsingData.*` | `"browsingData"`               | Clear browsing data    |

## UI & Extension

| API                  | Required Permission | Notes                          |
| -------------------- | ------------------- | ------------------------------ |
| `chrome.sidePanel.*` | `"sidePanel"`       | MV3 side panel                 |
| `chrome.action.*`    | none                | Toolbar button, basic use free |
| `chrome.commands.*`  | none                | Keyboard shortcuts free        |
| `chrome.windows.*`   | none                | Basic window management free   |

## System & Device

| API                                | Required Permission                                     | Notes                        |
| ---------------------------------- | ------------------------------------------------------- | ---------------------------- |
| `chrome.system.cpu/memory/storage` | `"system.cpu"` / `"system.memory"` / `"system.storage"` |                              |
| `chrome.tts.*`                     | `"tts"`                                                 | Text to speech               |
| `chrome.power.*`                   | `"power"`                                               | Prevent screen lock          |
| `chrome.idle.*`                    | `"idle"`                                                | Detect idle state            |
| `chrome.management.*`              | `"management"`                                          | High-risk: manage extensions |

## Host Permissions Patterns

```
"<all_urls>"           → all http/https/ftp + more (triggers max warning)
"*://*/*"              → all http + https
"https://*/*"          → https only
"https://*.example.com/*"  → specific domain + subdomains
"https://example.com/*"    → specific domain only
```

## Permissions Requiring No Declaration

Free to use without manifest entry:

- `chrome.runtime.*` (messaging, lifecycle)
- `chrome.extension.*` (basic)
- `chrome.tabs` (tab id, index, status — NOT url/title)
- `chrome.windows` (basic)
- `chrome.i18n.*`
