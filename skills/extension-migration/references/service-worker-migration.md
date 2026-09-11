# Service Worker Migration Guide

## Core Constraint: No DOM, No Window

Service workers run in a separate context. Remove all DOM API usage.

```js
// MV2 background.js - INVALID in MV3
document.getElementById("foo"); // ❌ no document
window.myGlobalVar = {}; // ❌ no window
new XMLHttpRequest(); // ❌ use fetch
```

## localStorage → chrome.storage.local

```js
// MV2
localStorage.setItem("key", value);
const val = localStorage.getItem("key");

// MV3
await chrome.storage.local.set({ key: value });
const { key } = await chrome.storage.local.get("key");
```

## XMLHttpRequest → fetch

```js
// MV2
const xhr = new XMLHttpRequest();
xhr.open("GET", url);
xhr.onload = () => console.log(xhr.responseText);
xhr.send();

// MV3
const response = await fetch(url);
const data = await response.text();
```

## setInterval / setTimeout → chrome.alarms

Service workers terminate when idle; timers do not survive.

```js
// MV2
setInterval(() => syncData(), 5 * 60 * 1000);

// MV3
chrome.alarms.create("syncData", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncData") syncData();
});
```

> Note: `chrome.alarms` minimum period is 30 seconds (Chrome 120+).

## Handling Idle Termination: State Persistence

SW can terminate at any time. Persist all state.

```js
// MV2 - in-memory state (lost on terminate in MV3)
let pendingRequests = [];

// MV3 - persist to storage
async function addPendingRequest(req) {
  const { pendingRequests = [] } =
    await chrome.storage.local.get("pendingRequests");
  pendingRequests.push(req);
  await chrome.storage.local.set({ pendingRequests });
}
```

## Event Listener Registration

Must be top-level and synchronous — not inside callbacks or async blocks.

```js
// ❌ WRONG - listener may not register if SW restarts
chrome.storage.local.get("config", (config) => {
  if (config.enabled) {
    chrome.tabs.onUpdated.addListener(handler); // too late
  }
});

// ✓ CORRECT - top-level, synchronous
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const { config } = await chrome.storage.local.get("config");
  if (config.enabled) handler(tabId, changeInfo, tab);
});
```

## IndexedDB in Service Workers

IndexedDB works; wrap in Promise for async/await.

```js
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("myDB", 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const db = await openDB();
```

## WebSocket / Persistent Connections

Service workers cannot hold persistent connections. Use offscreen documents or relay via content scripts.

```js
// MV3 - use offscreen document for long-lived WebSocket
chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: ["WEBSOCKET"],
  justification: "Maintain WebSocket connection",
});
// communicate via chrome.runtime.sendMessage
```

## Keeping Service Worker Alive (Workaround)

For critical operations, use alarms to re-register or reconnect.

```js
// Heartbeat to prevent premature termination during long operations
chrome.alarms.create("keepAlive", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    /* no-op, just keep alive */
  }
});
```

## Complete Migration Pattern

```js
// MV3 service_worker (background.js)

// 1. All event listeners at top level
chrome.runtime.onInstalled.addListener(onInstalled);
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.runtime.onMessage.addListener(onMessage);

// 2. Async handlers persist state via storage, use alarms for periodic work
async function onInstalled() {
  await chrome.storage.local.set({ initialized: true });
}
async function onAlarm(alarm) {
  if (alarm.name === "sync") {
    const data = await (await fetch("https://api.example.com/data")).json();
    await chrome.storage.local.set({ data });
  }
}
```
