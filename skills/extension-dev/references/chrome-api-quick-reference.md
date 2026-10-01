# Chrome API Permissions and Context Availability

Only the non-obvious parts: which permission an API really needs, where it can run, and limits that bite. Full API docs: `https://developer.chrome.com/docs/extensions/reference/api/<name>`; permission list and warning text: https://developer.chrome.com/docs/extensions/reference/permissions-list.

## Permission gotchas

| API / need | What is actually required | Gotcha |
|---|---|---|
| `tabs.query/create/update/remove`, `tabs.sendMessage` | No permission | `"tabs"` only unlocks `url`, `pendingUrl`, `title`, `favIconUrl` on `Tab` (and the `url`/`title` query filters). It shows a "Read your browsing history" warning — prefer `activeTab` or host permissions for the specific sites. |
| Act on the current tab after a user click | `activeTab` | Temporary host access to that tab only, no install warning. Lost when the tab navigates elsewhere. |
| `scripting.executeScript` / `insertCSS` | `scripting` + host access (`activeTab` or `host_permissions`) | Without host access the call rejects ("Cannot access contents of the page"). `chrome://`, Chrome Web Store, and other extensions' pages are never scriptable. |
| `windows.*` | No permission | Same `Tab` field restriction as above for `windows.get(…, { populate: true })`. |
| `action.*` (badge, icon, popup) | `"action"` key in the manifest | Without the key, `chrome.action` is `undefined`. |
| `storage.*` | `storage` | Missing permission → `chrome.storage` is `undefined`. |
| `sidePanel.*` | `sidePanel` + `side_panel.default_path` (or `setOptions`) | `sidePanel.open()` only in response to a user action; `setPanelBehavior({ openPanelOnActionClick: true })` opens it from the toolbar icon. |
| `webRequest` | `webRequest` + host permissions | Observe only. Blocking (`webRequestBlocking`) is limited to policy-installed extensions; use `declarativeNetRequest`. `onAuthRequired` needs `webRequestAuthProvider`. |
| `declarativeNetRequest` | `declarativeNetRequest` ("Block content on any page" warning) or `declarativeNetRequestWithHostAccess` (no warning, host permissions needed for every action) | Block/upgrade/allow rules work without host permissions; `redirect` and `modifyHeaders` need host permissions for the request URL and initiator. |
| `cookies` | `cookies` + host permissions for the cookie's domain | Cookie permission alone returns nothing. |
| `identity.getAuthToken` | `identity` + `oauth2` manifest key | Google accounts in Chrome only. Other providers: `launchWebAuthFlow` with `https://<id>.chromiumapp.org/` redirect. |
| `offscreen.createDocument` | `offscreen` | Must pass at least one `reasons` value and a `justification`. |
| `alarms` | `alarms` | See limits below. |
| Anything optional | `optional_permissions` / `optional_host_permissions` + `permissions.request()` | `request()` needs a user gesture; call it from the click handler before any `await`. |

## Where each API works

| Context | Available | Not available |
|---|---|---|
| Service worker | All permitted `chrome.*` APIs, `fetch`, `IndexedDB`, Cache API | `window`, `document`, `DOMParser`, `localStorage`, `XMLHttpRequest`, `URL.createObjectURL`, audio/canvas playback |
| Extension pages (popup, side panel, options, tabs) | All permitted APIs + full DOM | Popup state dies when the popup closes |
| Offscreen document | DOM + `chrome.runtime` only | Every other extension API — message the service worker instead |
| Content script (ISOLATED world) | `runtime` messaging/`getURL`/`id`, `storage` (`session` only if access level is opened), `i18n`, `dom` | Everything else (`tabs`, `scripting`, `alarms`, …) — message the service worker |
| Content script (MAIN world) | Page JS globals | No extension APIs at all |

Content-script `fetch` runs with the page's origin: cross-origin requests hit CORS even with `host_permissions`. Route them through the service worker and send it an ID or enum, not an arbitrary URL.

## Storage areas

| Area | Limit | Lifetime / exposure |
|---|---|---|
| `storage.local` | 10 MB (`unlimitedStorage` removes it) | Until uninstall. Readable by content scripts by default. |
| `storage.sync` | 102,400 bytes total, 8,192 bytes per item, 512 items; write-rate quotas | Syncs when the user is signed in to Chrome sync; falls back to local behavior otherwise. Settings only, never secrets. |
| `storage.session` | 10 MB, in memory | Cleared on extension reload/update/disable and browser restart. Hidden from content scripts unless `setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })`. Use it for service-worker state and short-lived tokens. |

Values must be JSON-serializable (`Date`, `Map`, `Set`, class instances do not survive). `storage.onChanged` fires in every extension context and is a good pub/sub channel for settings.

```ts
await chrome.storage.session.set({ authToken });
const { authToken } = await chrome.storage.session.get('authToken');
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.theme) applyTheme(changes.theme.newValue);
});
```

## Service-worker timing limits

- Idle 30 s → terminated. Any extension event or extension API call resets the timer; so do WebSocket messages and messages on a long-lived port.
- A single event or API call running longer than 5 minutes, or a `fetch()` waiting more than 30 s for a response, also terminates it.
- `alarms`: minimum 30 s (`periodInMinutes`/`delayInMinutes` below `0.5` are clamped with a warning). Alarms can be cleared on browser restart — check `alarms.get()` in `runtime.onStartup` and re-create.
- Offscreen documents: one per extension at a time (check `runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })` before creating). `AUDIO_PLAYBACK` documents close after 30 s without audio.

## `chrome` vs `browser`

From Chrome 148 every API is also exposed as `browser.*` (same objects: `chrome.tabs === browser.tabs`); before that only `chrome.*` exists unless a polyfill or framework alias provides `browser`. Code that must run on older Chrome either uses `chrome.*` or sets `globalThis.browser ??= chrome` early. Both namespaces return promises when the callback is omitted.
