# Chrome API Quick Reference

Base URL for all API docs: `https://developer.chrome.com/docs/extensions/reference/api/`

---

## Tab Management

| API                       | Description                             | Permission | Docs                                                                          |
| ------------------------- | --------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `chrome.tabs.query`       | Find tabs by URL, window, active state  | `tabs`     | [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)       |
| `chrome.tabs.create`      | Open new tab                            | `tabs`     | [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)       |
| `chrome.tabs.update`      | Navigate or pin a tab                   | `tabs`     | [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)       |
| `chrome.tabs.remove`      | Close tab(s)                            | `tabs`     | [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)       |
| `chrome.tabs.sendMessage` | Send message to content script in a tab | `tabs`     | [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)       |
| `chrome.windows.create`   | Open new browser window                 | `windows`  | [windows](https://developer.chrome.com/docs/extensions/reference/api/windows) |
| `chrome.windows.getAll`   | List all open windows                   | `windows`  | [windows](https://developer.chrome.com/docs/extensions/reference/api/windows) |

---

## Storage

| API                      | Description                             | Permission | Notes              |
| ------------------------ | --------------------------------------- | ---------- | ------------------ |
| `chrome.storage.local`   | Device-local persistent storage (~10MB) | `storage`  | Fast, no sync      |
| `chrome.storage.sync`    | Synced across user's devices (~100KB)   | `storage`  | Quota limits apply |
| `chrome.storage.session` | Session-only, cleared on browser close  | `storage`  | Fastest, MV3 only  |

**Pattern:**

```ts
await chrome.storage.local.set({ key: value });
const { key } = await chrome.storage.local.get('key');
chrome.storage.onChanged.addListener((changes, area) => { ... });
```

---

## UI

| API                           | Description               | Permission      | Docs                                                                                      |
| ----------------------------- | ------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `chrome.action.setIcon`       | Change toolbar icon       | —               | [action](https://developer.chrome.com/docs/extensions/reference/api/action)               |
| `chrome.action.setBadgeText`  | Show badge on icon        | —               | [action](https://developer.chrome.com/docs/extensions/reference/api/action)               |
| `chrome.action.setPopup`      | Change popup HTML         | —               | [action](https://developer.chrome.com/docs/extensions/reference/api/action)               |
| `chrome.contextMenus.create`  | Add right-click menu item | `contextMenus`  | [contextMenus](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)   |
| `chrome.sidePanel.open`       | Open side panel for a tab | `sidePanel`     | [sidePanel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)         |
| `chrome.notifications.create` | Show desktop notification | `notifications` | [notifications](https://developer.chrome.com/docs/extensions/reference/api/notifications) |

---

## Scripting

| API                              | Description           | Permission  | Docs                                                                              |
| -------------------------------- | --------------------- | ----------- | --------------------------------------------------------------------------------- |
| `chrome.scripting.executeScript` | Inject JS into a tab  | `scripting` | [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting) |
| `chrome.scripting.insertCSS`     | Inject CSS into a tab | `scripting` | [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting) |
| `chrome.scripting.removeCSS`     | Remove injected CSS   | `scripting` | [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting) |

**Pattern:**

```ts
await chrome.scripting.executeScript({
  target: { tabId },
  func: () => document.title,
});
```

---

## Network

| API                                               | Description                              | Permission              | Docs                                                                                                      |
| ------------------------------------------------- | ---------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `chrome.webRequest.onBeforeRequest`               | Intercept requests (observe only in MV3) | `webRequest`            | [webRequest](https://developer.chrome.com/docs/extensions/reference/api/webRequest)                       |
| `chrome.declarativeNetRequest.updateDynamicRules` | Block/redirect requests declaratively    | `declarativeNetRequest` | [declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest) |
| `chrome.webNavigation.onCompleted`                | Fire when page finishes loading          | `webNavigation`         | [webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)                 |

---

## Runtime & Messaging

| API                          | Description                   | Permission | Docs                                                                          |
| ---------------------------- | ----------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `chrome.runtime.sendMessage` | One-time message to extension | —          | [runtime](https://developer.chrome.com/docs/extensions/reference/api/runtime) |
| `chrome.runtime.onMessage`   | Receive one-time messages     | —          | [runtime](https://developer.chrome.com/docs/extensions/reference/api/runtime) |
| `chrome.runtime.connect`     | Open long-lived port          | —          | [runtime](https://developer.chrome.com/docs/extensions/reference/api/runtime) |
| `chrome.runtime.getManifest` | Read manifest.json at runtime | —          | [runtime](https://developer.chrome.com/docs/extensions/reference/api/runtime) |
| `chrome.runtime.id`          | Extension's ID string         | —          | —                                                                             |

---

## Identity & Auth

| API                                 | Description               | Permission | Docs                                                                            |
| ----------------------------------- | ------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `chrome.identity.getAuthToken`      | Get OAuth2 token (Google) | `identity` | [identity](https://developer.chrome.com/docs/extensions/reference/api/identity) |
| `chrome.identity.launchWebAuthFlow` | Generic OAuth2 flow       | `identity` | [identity](https://developer.chrome.com/docs/extensions/reference/api/identity) |

---

## System / Scheduling

| API                               | Description                     | Permission  | Docs                                                                              |
| --------------------------------- | ------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `chrome.alarms.create`            | Schedule repeating/delayed task | `alarms`    | [alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms)       |
| `chrome.alarms.onAlarm`           | Fires when alarm triggers       | `alarms`    | [alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms)       |
| `chrome.commands.onCommand`       | Listen for keyboard shortcuts   | `commands`  | [commands](https://developer.chrome.com/docs/extensions/reference/api/commands)   |
| `chrome.cookies.get`              | Read a specific cookie          | `cookies`   | [cookies](https://developer.chrome.com/docs/extensions/reference/api/cookies)     |
| `chrome.history.search`           | Search browser history          | `history`   | [history](https://developer.chrome.com/docs/extensions/reference/api/history)     |
| `chrome.bookmarks.create`         | Create a bookmark               | `bookmarks` | [bookmarks](https://developer.chrome.com/docs/extensions/reference/api/bookmarks) |
| `chrome.offscreen.createDocument` | Background DOM access (MV3)     | `offscreen` | [offscreen](https://developer.chrome.com/docs/extensions/reference/api/offscreen) |

---

## Permissions Reference

Full list: https://developer.chrome.com/docs/extensions/reference/permissions-list

**Declare in manifest:**

```json
{
  "permissions": ["storage", "tabs", "scripting"],
  "host_permissions": ["https://*.example.com/*"]
}
```

**Optional permissions (request at runtime):**

```ts
await chrome.permissions.request({ permissions: ["bookmarks"] });
```
