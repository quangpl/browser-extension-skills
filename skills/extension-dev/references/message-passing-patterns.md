# Message Passing Patterns

## Contents

- Typed protocol (define once)
- Receiver in the service worker (works on every Chrome version)
- Promise-returning listeners (Chrome 148+)
- Service worker or popup → content script
- Long-lived ports
- Page (MAIN world) ↔ content script
- Web page or other extension → extension
- Errors

If the repo already has a messaging layer (`@webext-core/messaging`, `webext-bridge`, `trpc-chrome`, `@plasmohq/messaging`, or a local typed helper), add a handler there instead of using the raw APIs below. For a new layer in a WXT project, `@webext-core/messaging` is the lightweight typed default.

Docs: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

## Typed protocol (define once)

```ts
// messages.ts
export type Request =
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_NOTE'; content: string }
  | { type: 'FETCH_PRICE'; itemId: string };

export type ResponseMap = {
  GET_SETTINGS: { theme: 'light' | 'dark' };
  SAVE_NOTE: { ok: true };
  FETCH_PRICE: { price: number };
};

export function send<T extends Request>(msg: T): Promise<ResponseMap[T['type']]> {
  return chrome.runtime.sendMessage(msg);
}
```

## Receiver in the service worker (works on every Chrome version)

Register at the top level of the service worker. Return literal `true` only for messages you answer asynchronously; return nothing for messages you don't handle so another listener can answer.

```ts
chrome.runtime.onMessage.addListener((msg: Request, _sender, sendResponse) => {
  switch (msg.type) {
    case 'GET_SETTINGS':
      chrome.storage.sync.get('theme').then(({ theme = 'light' }) => sendResponse({ theme }));
      return true; // keep the channel open until sendResponse runs
    case 'FETCH_PRICE':
      fetch(`https://api.example.com/price/${encodeURIComponent(msg.itemId)}`)
        .then((r) => r.json())
        .then((data) => sendResponse({ price: data.price }))
        .catch((err) => sendResponse({ error: String(err) }));
      return true;
  }
});
```

## Promise-returning listeners (Chrome 148+)

From Chrome 148 a listener may return a Promise (or be `async`); the resolved value becomes the response, and a rejection with an `Error` rejects the sender's `sendMessage()` (error propagation from Chrome 146). Both changes roll out gradually and stay disabled in extensions that declare a `devtools_page`. Use this form only when the manifest sets `minimum_chrome_version` ≥ 148 and there is no `devtools_page`; otherwise use `return true` + `sendResponse`, which keeps working everywhere.

```ts
chrome.runtime.onMessage.addListener((msg: Request) => {
  if (msg.type !== 'GET_SETTINGS') return; // not ours: return undefined, not a promise
  return chrome.storage.sync.get('theme').then(({ theme = 'light' }) => ({ theme }));
});
```

Avoid `async` listener functions: they always return a promise, so on older Chrome the channel closes immediately (sender gets `undefined`), and on 148+ an `async` listener that doesn't handle the message still answers `null` and wins the race against the real handler.

## Service worker or popup → content script

```ts
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (tab?.id === undefined) return;
try {
  const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, { frameId: 0 });
} catch {
  // "Receiving end does not exist": no content script in this tab (opened before install/reload,
  // restricted page, or matches mismatch). Inject on demand, then resend once.
  // Use the built file path (WXT: 'content-scripts/<name>.js').
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, { frameId: 0 });
}
```

Without `frameId`, every frame's content script receives the message and the first response wins.

## Long-lived ports

Use for streaming or many back-and-forth messages. Each message on a port resets the service-worker idle timer; opening the port alone does not.

```ts
// popup or content script
const port = chrome.runtime.connect({ name: 'stream' });
port.onMessage.addListener((m) => render(m));
port.onDisconnect.addListener(() => {
  // service worker restarted or extension reloaded; reconnect if still needed
});
port.postMessage({ type: 'START' });

// service worker (top level)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'stream') return;
  port.onMessage.addListener((m) => port.postMessage({ type: 'CHUNK', data: '…' }));
});
```

## Page (MAIN world) ↔ content script

Content scripts can't see page JS globals; a MAIN-world script can, but has no extension APIs. Bridge with `window.postMessage` and treat everything from the page as untrusted.

```ts
// content script (ISOLATED)
window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.source !== 'my-ext-main') return;
  chrome.runtime.sendMessage({ type: 'PAGE_DATA', payload: sanitize(e.data.payload) });
});
```

## Web page or other extension → extension

Declare `externally_connectable.matches` (specific origins, never `<all_urls>`), listen with `runtime.onMessageExternal`, and check `sender.origin` / `sender.id` against an allowlist before acting. Pages call `chrome.runtime.sendMessage(EXTENSION_ID, msg)`.

## Errors

| Message | Cause | Fix |
|---|---|---|
| `Could not establish connection. Receiving end does not exist.` | No listener in the target: content script not injected in that tab, or service worker threw at startup | Inject with `scripting.executeScript`, check `matches`, check the service-worker console for startup errors |
| `The message port closed before a response was received.` | Async work without `return true` (or an `async` listener on Chrome < 148) | Return `true` and call `sendResponse` |
| Sender gets `undefined`/`null` | Another listener answered first, or an `async` listener returned nothing | Return `undefined` synchronously for messages you don't handle |
| `Extension context invalidated.` | Content script outlived an extension reload/update | Check `chrome.runtime?.id` before calling, remove listeners; WXT: `ctx.isInvalid` |
| Message never arrives in popup | Popup is closed (it only exists while open) | Persist to storage and read it when the popup opens |

For low-frequency state sync (settings, auth status), write to `chrome.storage` and react in `storage.onChanged` instead of broadcasting messages.
