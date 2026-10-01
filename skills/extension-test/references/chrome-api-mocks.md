# Chrome API Fakes and Stubs

## Contents
- What the in-memory fake covers
- Stubbing everything else
- Triggering events
- Error paths
- Test data helpers
- Resetting state
- Legacy: jest-chrome / hand-written mocks

## What the in-memory fake covers

`@webext-core/fake-browser` (also re-exported as `wxt/testing/fake-browser`) behaves like the real API for:

| API | Behavior | Manual step |
|---|---|---|
| `storage` (`local`, `sync`, `session`, `managed`) | Separate in-memory areas; `onChanged` and `{area}.onChanged` fire on writes | — |
| `runtime` | `sendMessage` delivers to `onMessage` listeners in the same context and resolves with their response; `getURL`; `id` is a fixed string | Other events: `.trigger()` |
| `tabs`, `windows` | Fully implemented; methods fire the matching `tabs.*` / `windows.*` events | — |
| `alarms` | create/get/getAll/clear | `onAlarm.trigger()` |
| `action` | Badge text/colors and title, per tab/window | `onClicked.trigger(tab)` |
| `notifications` | `create`, `clear`, `getAll` | All events |
| `webNavigation` | Events only (`getFrame`/`getAllFrames` not implemented) | All events |

Anything else throws `MockNotImplementedError` naming the missing member. Common ones: `runtime.getManifest`, `runtime.connect`, `tabs.sendMessage`, `scripting.*`, `sidePanel.*`, `declarativeNetRequest.*`, `contextMenus.*`, `permissions.*`, `identity.*`, `offscreen.*`, `cookies.*`.

## Stubbing everything else

Spy on the fake object (the same object as the global `chrome`/`browser`). With `restoreMocks: true` in the Vitest config, spies are restored after each test.

```ts
import { vi } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';

vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({
  manifest_version: 3, name: 'Test', version: '1.2.3',
} as chrome.runtime.Manifest);

const exec = vi.spyOn(fakeBrowser.scripting, 'executeScript').mockResolvedValue([]);
// … run code under test …
expect(exec).toHaveBeenCalledWith({ target: { tabId: 1 }, files: ['content.js'] });

// content script reply via tabs.sendMessage
vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockResolvedValue({ ok: true });

// optional permission granted / denied
vi.spyOn(fakeBrowser.permissions, 'request').mockResolvedValue(false);
```

When a module captured `chrome.x.y` at import time, spy before importing it (`vi.resetModules()` + dynamic `import()`).

## Triggering events

`trigger(...)` takes the arguments Chrome would pass to listeners; awaiting it waits for all listeners to finish.

```ts
await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' });
await fakeBrowser.alarms.onAlarm.trigger({ name: 'refresh', scheduledTime: Date.now(), periodInMinutes: 5 });
await fakeBrowser.action.onClicked.trigger(await chrome.tabs.create({ url: 'https://example.com' }));
await fakeBrowser.webNavigation.onCompleted.trigger({ tabId: 1, url: 'https://example.com', frameId: 0 } as any);
```

Events of non-implemented APIs (e.g. `contextMenus.onClicked`) don't exist on the fake; capture the listener instead:

```ts
const addListener = vi.spyOn(fakeBrowser.contextMenus.onClicked, 'addListener').mockImplementation(() => {});
registerListeners();
const onClicked = addListener.mock.calls[0][0];
await onClicked({ menuItemId: 'save', editable: false, pageUrl: 'https://example.com' }, tab);
```

## Error paths

Real failures are rejected promises; test that the code handles them, not only the happy path.

```ts
// No receiver: the fake rejects ("No listeners available"); real Chrome rejects with
// "Could not establish connection. Receiving end does not exist."
fakeBrowser.runtime.onMessage.removeAllListeners();
await expect(sendToBackground({ type: 'PING' })).rejects.toThrow();

// Quota or tab gone
vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValueOnce(new Error('QUOTA_BYTES_PER_ITEM quota exceeded'));
vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockRejectedValueOnce(new Error('No tab with id: 42.'));
```

## Test data helpers

Prefer creating data through the fake so events fire and IDs are consistent:

```ts
const tab = await chrome.tabs.create({ url: 'https://example.com', active: true });

export function sender(overrides: Partial<chrome.runtime.MessageSender> = {}): chrome.runtime.MessageSender {
  return { id: chrome.runtime.id, tab, frameId: 0, url: tab.url, origin: 'https://example.com', ...overrides };
}
```

Use `sender({ tab: undefined, url: chrome.runtime.getURL('popup.html') })` for messages from extension pages, and a sender with a foreign `id` to test that handlers reject other extensions.

## Resetting state

- `fakeBrowser.reset()` in `beforeEach`: clears all in-memory state and listeners.
- `fakeBrowser.storage.resetState()`: one API only.
- `fakeBrowser.runtime.onMessage.removeAllListeners()`: one event only.

## Legacy: jest-chrome / hand-written mocks

`jest-chrome` (last release 0.8.0, 2022) stubs every function as `jest.fn()` with no implementation and the callback API shape; tests end up asserting mock calls. When editing such a suite, either keep its style for consistency in a small change or move the touched file to the fake. Its correct setup is `Object.assign(global, require('jest-chrome'))` and `import { chrome } from 'jest-chrome'` (named export, no default). Events there expose `callListeners(...)` instead of `trigger(...)`.
