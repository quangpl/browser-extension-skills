# Message Passing Patterns

Chrome extensions have isolated contexts. Use these patterns to communicate between them.

---

## One-Time Messages

### Popup / options page → Service worker

```ts
// sender (popup)
const response = await chrome.runtime.sendMessage({ type: "FETCH_DATA", url });
console.log(response.data);

// receiver (background service worker)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FETCH_DATA") {
    fetch(msg.url)
      .then((r) => r.json())
      .then((data) => sendResponse({ data }));
    return true; // REQUIRED: keeps channel open for async response
  }
});
```

### Service worker → Content script (tab-targeted)

```ts
// sender (background)
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const response = await chrome.tabs.sendMessage(tab.id!, { type: "GET_DOM" });

// receiver (content script)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_DOM") {
    sendResponse({ title: document.title });
  }
});
```

### Content script → Service worker

```ts
// sender (content script)
const response = await chrome.runtime.sendMessage({ type: "SAVE", payload });

// receiver (background) — same pattern as above
```

---

## Long-Lived Connections (Ports)

Use when you need streaming or persistent back-and-forth communication.

```ts
// initiator (popup)
const port = chrome.runtime.connect({ name: "stream-channel" });
port.postMessage({ type: "START" });
port.onMessage.addListener((msg) => console.log("received", msg));
port.onDisconnect.addListener(() => console.log("port closed"));

// receiver (background)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "stream-channel") {
    port.onMessage.addListener((msg) => {
      port.postMessage({ type: "CHUNK", data: "..." });
    });
  }
});
```

---

## TypeScript Typed Message Protocol

Define message types once, reuse everywhere:

```ts
// types/messages.ts
export type ExtMessage =
  | { type: "GET_TABS" }
  | { type: "SAVE_NOTE"; content: string }
  | { type: "OPEN_PANEL"; tabId: number };

export type ExtResponse =
  | { type: "GET_TABS"; tabs: chrome.tabs.Tab[] }
  | { type: "SAVE_NOTE"; success: boolean }
  | { type: "OPEN_PANEL"; success: boolean };

// usage
chrome.runtime
  .sendMessage<ExtMessage, ExtResponse>({ type: "GET_TABS" })
  .then((res) => res.tabs); // typed!
```

---

## External Messaging (Web → Extension)

Add `externally_connectable.matches` in manifest, then use `chrome.runtime.onMessageExternal` in background. Always validate `sender.origin`.

---

## Async Response Pattern

**Critical:** Return `true` from `onMessage` listener to keep the message channel open for async responses. Without it, the channel closes immediately.

```ts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // SYNC: no return true needed
  if (msg.type === "PING") {
    sendResponse("pong");
    return;
  }

  // ASYNC: must return true
  if (msg.type === "ASYNC_OP") {
    doAsyncWork().then((result) => sendResponse(result));
    return true; // ← keeps channel open
  }
});
```

---

## Common Gotchas

| Issue                                                    | Cause                                  | Fix                                         |
| -------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| `Could not establish connection`                         | Content script not injected yet        | Check `activeTab` permission + inject order |
| `The message port closed before a response was received` | Forgot `return true` for async         | Add `return true` in listener               |
| `Extension context invalidated`                          | Extension reloaded while port was open | Wrap in try/catch, reconnect                |
| No response from background                              | Service worker went idle               | Use `chrome.runtime.sendMessage` (wakes it) |
| Content script messaging fails                           | Wrong `tabId`                          | Use `chrome.tabs.query` to get correct id   |

---

## Storage as Messaging Alternative

For non-real-time sync, use `chrome.storage.onChanged` as a pub/sub mechanism instead of message passing.
