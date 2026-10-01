# Background page → service worker

## Contents
- Lifetime rules
- Listener registration
- State: globals → storage
- Timers → alarms
- DOM work → offscreen document
- Migrating existing localStorage data
- getBackgroundPage → messaging
- Modules and imports

Sources: [Migrate to a service worker](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers), [Service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [chrome.offscreen](https://developer.chrome.com/docs/extensions/reference/api/offscreen).

## Lifetime rules

Chrome stops the extension service worker when:
- it has been idle for 30 s (receiving an event or calling an extension API resets the timer);
- a single event or API call takes longer than 5 min;
- a `fetch()` response takes longer than 30 s to arrive.

Things that extend lifetime: extension API calls and events, messages on an open WebSocket, messages over a `runtime.connect` port, messages from an offscreen document, an active `chrome.debugger` session, a `connectNative` port. Prompting APIs (`permissions.request`, `identity.launchWebAuthFlow`, `desktopCapture.chooseDesktopMedia`, `management.uninstall`) may exceed 5 min.

Drop MV2-era keep-alive hacks (30-second alarm pings, reconnecting ports, offscreen pings). Persist state instead and let the worker restart. If the code relies on newer lifetime behavior, set `minimum_chrome_version` accordingly.

## Listener registration

Register listeners synchronously at the top level. When Chrome wakes the worker for an event, it runs the script once and dispatches only to listeners that exist by the end of that first run.

```ts
// MV2 pattern that breaks in MV3: listener added after async work
chrome.storage.local.get("config", ({ config }) => {
  if (config.enabled) chrome.tabs.onUpdated.addListener(onTabUpdated);
});

// MV3: always register, check config inside
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  const { config } = await chrome.storage.local.get("config");
  if (config?.enabled) onTabUpdated(tabId, info, tab);
});
```

One-time setup (context menus, default settings, alarms) goes in `runtime.onInstalled`, which also fires on extension and Chrome updates. Setup that is lost on browser restart (DNR session rules, `storage.session` defaults) also needs `runtime.onStartup`.

`runtime.onMessage` handlers that reply asynchronously call `sendResponse` and `return true`. Returning a promise (async listener) works only from Chrome 148; in older Chrome an `async` listener closes the channel before replying.

## State: globals → storage

| MV2 background state | MV3 home |
|---|---|
| In-memory cache, session tokens, per-tab bookkeeping | `chrome.storage.session` (memory-backed, cleared on browser restart; not exposed to content scripts by default) |
| Settings, user data | `chrome.storage.local` (or `sync` for small settings) |
| Large/structured data, blobs | IndexedDB (available in the worker) |
| `localStorage` / `sessionStorage` | Not available in the worker; use the above |

```ts
// MV2: let pending = [];  — lost when the worker stops
async function addPending(item: Item) {
  const { pending = [] } = await chrome.storage.session.get("pending");
  await chrome.storage.session.set({ pending: [...pending, item] });
}
```

Read state at the start of each event handler instead of caching it at startup, or cache with a lazily initialized promise that is re-created after restart.

## Timers → alarms

`setTimeout`/`setInterval` die with the worker. Short in-handler delays (a few seconds) are fine; anything periodic or longer uses alarms.

```ts
async function ensureAlarms() {
  if (!(await chrome.alarms.get("sync"))) await chrome.alarms.create("sync", { periodInMinutes: 5 });
}
chrome.runtime.onInstalled.addListener(ensureAlarms);
chrome.runtime.onStartup.addListener(ensureAlarms);
chrome.alarms.onAlarm.addListener((a) => { if (a.name === "sync") void syncData(); });
```

- Needs the `"alarms"` permission. Minimum `periodInMinutes`/`delayInMinutes` is 0.5 (30 s); smaller values are not honored and log a warning.
- Alarms are cleared on extension update (so the MV3 release starts with none) and may be cleared on browser restart. Create them in `runtime.onInstalled`, and in `runtime.onStartup` re-create any that `chrome.alarms.get()` doesn't return.

## DOM work → offscreen document

The worker has no `document`, `window`, `DOMParser`, `Audio`, canvas-on-DOM, or `navigator.clipboard` write access. Move that code to an offscreen document. Only `chrome.runtime` is available inside it; talk to it via messages.

```ts
// service worker
const OFFSCREEN = "offscreen.html";

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN)],
  });
  if (contexts.length) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN,
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: "Parse fetched HTML",
  });
}

export async function parseTitle(html: string): Promise<string> {
  await ensureOffscreen();
  return chrome.runtime.sendMessage({ target: "offscreen", type: "parse-title", html });
}
```

```ts
// offscreen.ts (loaded by offscreen.html)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== "offscreen" || msg.type !== "parse-title") return;
  const doc = new DOMParser().parseFromString(msg.html, "text/html");
  sendResponse(doc.title);
});
```

- Requires `"offscreen"` permission; one offscreen document per extension at a time; close it with `chrome.offscreen.closeDocument()` when done.
- Reasons include `AUDIO_PLAYBACK`, `BLOBS`, `CLIPBOARD`, `DOM_PARSER`, `DOM_SCRAPING`, `IFRAME_SCRIPTING`, `LOCAL_STORAGE`, `USER_MEDIA`, `DISPLAY_MEDIA`, `WEB_RTC`, `WORKERS`, `BATTERY_STATUS`, `MATCH_MEDIA`, `GEOLOCATION`, `TESTING`. There is no WebSocket reason: open WebSockets directly in the worker (they extend its lifetime).

## Migrating existing localStorage data

Users updating from MV2 have data in the old background page's `localStorage`. The worker cannot read it, but an offscreen document on the same origin can.

```ts
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "update") return;
  const { migrated } = await chrome.storage.local.get("migrated");
  if (migrated) return;
  await chrome.offscreen.createDocument({
    url: "migrate.html",
    reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
    justification: "Move MV2 localStorage data to chrome.storage",
  });
  const data: Record<string, string> = await chrome.runtime.sendMessage({ type: "dump-local-storage" });
  await chrome.storage.local.set({ ...data, migrated: true });
  await chrome.offscreen.closeDocument();
});
// migrate.ts replies with Object.fromEntries(Object.entries(localStorage)), parsing JSON values as needed.
```

## getBackgroundPage → messaging

Popup/options code that called `chrome.extension.getBackgroundPage().someFn()` or read its globals now sends `chrome.runtime.sendMessage({ type: "get-status" })` and the worker replies from a top-level `onMessage` listener. Shared state is read from `chrome.storage` directly by either side; for live updates the popup listens to `chrome.storage.onChanged` instead of polling the worker.

## Modules and imports

- `"background": { "service_worker": "bg.js", "type": "module" }` enables static `import`. Dynamic `import()` is not supported in extension service workers; bundle instead.
- Classic workers use `importScripts("a.js")` at the top level only.
- Multiple MV2 `background.scripts` files: concatenate via the bundler or `importScripts` them in order.
