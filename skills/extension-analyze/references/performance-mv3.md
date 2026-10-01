# Performance & MV3 Correctness Checks

Each item: what to look for → why it fails → fix. Report only items with evidence in the code; default severity in brackets.

## Service worker lifecycle
Chrome stops the service worker after 30 s without events or extension API calls, when one event/API call runs over 5 min, or when a `fetch()` response takes over 30 s. Events revive it; module-level state does not survive.
- **Listeners registered late** (inside `await`, `.then`, `onInstalled`, or after async setup) → events that wake the worker are missed. [high] Fix: register every `chrome.*.addListener` synchronously at top level (WXT: inside `defineBackground(() => { … })` main body, not after an await).
- **State in module variables** (`let cache = …`, `Map` of tabs, auth token in memory) treated as durable → silently reset after idle. [medium] Fix: persist to `chrome.storage.session`/`local`, rehydrate on wake.
- **Keepalive hacks** (`setInterval` pinging `runtime.getPlatformInfo`, self-messaging loops, ports reopened every 25 s) → battery/CPU cost, fragile. [medium] Fix: `chrome.alarms` (min period 30 s), offscreen document for DOM/audio work, WebSocket activity (resets the idle timer) for real-time links.
- **`setTimeout`/`setInterval` for scheduled work** longer than the idle window → never fires. [medium] Fix: `chrome.alarms`.
- **DOM APIs in the service worker** (`document`, `window`, `localStorage`, `XMLHttpRequest`, `DOMParser`) → runtime errors. [high] Fix: offscreen document (one per profile at a time; create with a `reason` and reuse it) or move to a content script/page.

## Content scripts
- **Broad static injection** (`matches: ["<all_urls>"]`, `all_frames: true`, `run_at: "document_start"`) when the feature targets a few sites or only runs on click → script and its bundle load into every frame of every page. [medium] Fix: narrow `matches`; inject on demand with `chrome.scripting.executeScript` + `activeTab`; use `registerContentScripts` for user-chosen sites.
- **Large content-script bundle** (UI framework + libraries shipped to every page) → parse cost on every navigation. [low/medium] Fix: lazy-load UI via `import()` of a web-accessible chunk only when opened, or render UI in a side panel/popup instead. Measure with the built output (`du -h` on `.output/chrome-mv3/content-scripts/*` for WXT, `build/chrome-mv3-prod/*` for Plasmo, `dist/` otherwise).
- **Unbounded `MutationObserver`** on `document` with `subtree: true` doing heavy work per mutation → page jank. [medium] Fix: observe the narrowest root, debounce/batch with `requestIdleCallback`, disconnect when done.
- **Polling the DOM** with `setInterval` → constant CPU. [low] Fix: observer or event listeners.
- **Leaking listeners on SPA navigation** (re-injected UI, duplicate listeners) → growth over time. [low] Fix: idempotent mount guard; WXT `ctx.onInvalidated` / `createShadowRootUi` lifecycle.
- **Global CSS injected into the page** → breaks host sites and is overridden by them. [low] Fix: Shadow DOM UI (WXT `createShadowRootUi`, Plasmo CSUI).

## Messaging & storage
- **Chatty messaging** (one `sendMessage` per item in a loop, large payloads) → serialization cost. [low] Fix: batch; use a long-lived port for streams.
- **Missing `return true`** in an `onMessage` listener that responds asynchronously (callback style) → sender gets `undefined`. [high, functional] Fix: `return true` or return a Promise (supported in current Chrome; check `minimum_chrome_version` if set).
- **Polling storage** instead of `chrome.storage.onChanged` → wasted wakeups. [low]
- **Quota risk:** `storage.sync` ~100 KB total, 8 KB per item; `storage.local` and `storage.session` 10 MB (local unlimited with `unlimitedStorage`). Writes past quota reject. [medium when writing unbounded lists/caches] Fix: cap/evict; large data in `local` or IndexedDB.
- **Unhandled promise rejections** on `chrome.*` calls (tab closed, permission missing) → noisy errors, broken flows. [low]

## MV3 API correctness
- **MV2 leftovers:** `chrome.extension.getBackgroundPage`, `chrome.browserAction`/`pageAction`, `background.scripts`/`persistent`, `webRequestBlocking` (policy-installed extensions only in MV3), `chrome.tabs.executeScript`/`insertCSS`. [high — will not work] Fix: `chrome.runtime` messaging, `chrome.action`, `background.service_worker`, `declarativeNetRequest`, `chrome.scripting`. For a full migration, a dedicated MV2→MV3 migration workflow fits better.
- **Unused permissions / host permissions** (declared but no matching API use) → bigger warning prompt and attack surface. [medium] Fix: remove or move to `optional_permissions` / `optional_host_permissions` requested at point of use.
- **`tabs` permission only to read `tab.url`** of the active tab after a click → `activeTab` suffices. [low]

## Pages (popup, side panel, options)
- **Slow popup open:** heavy synchronous work or network before first render; the popup is destroyed on blur, so in-flight work is lost. [medium] Fix: render from cached storage first, fetch in background via the service worker.
- **Bundling everything into every entrypoint** (shared vendor chunk not split) → slower popup. [low] Fix: check the build output per entrypoint.
