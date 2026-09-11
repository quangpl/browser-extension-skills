# Chrome API Mocks

## Option A: jest-chrome (recommended)

```bash
npm install -D jest-chrome
```

```ts
// jest.setup.ts
import chrome from "jest-chrome";
Object.assign(global, { chrome });
```

`jest-chrome` auto-stubs all `chrome.*` APIs as `jest.fn()` with proper typings.

---

## Option B: Manual Mocks

```ts
// jest.setup.ts — full manual mock template
const mockStore: Record<string, unknown> = {};

const chrome = {
  storage: {
    local: buildStorageMock(mockStore, "local"),
    sync: buildStorageMock(mockStore, "sync"),
    session: buildStorageMock(mockStore, "session"),
    onChanged: { addListener: jest.fn(), removeListener: jest.fn() },
  },
  runtime: {
    id: "test-extension-id",
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
    },
    getManifest: jest.fn(() => ({ version: "1.0.0", name: "Test Extension" })),
    getURL: jest.fn(
      (path: string) => `chrome-extension://test-extension-id/${path}`,
    ),
    lastError: undefined as chrome.runtime.LastError | undefined,
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
    sendMessage: jest.fn(),
    onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
    onActivated: { addListener: jest.fn(), removeListener: jest.fn() },
  },
  action: {
    setIcon: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setTitle: jest.fn(),
    onClicked: { addListener: jest.fn() },
  },
  alarms: {
    create: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    clear: jest.fn(),
    clearAll: jest.fn(),
    onAlarm: { addListener: jest.fn(), removeListener: jest.fn() },
  },
  scripting: {
    executeScript: jest.fn(),
    insertCSS: jest.fn(),
  },
};

Object.assign(global, { chrome });
```

## Storage Mock Builder

```ts
function buildStorageMock(store: Record<string, unknown>, area: string) {
  return {
    get: jest.fn(
      (
        keys: string | string[] | null,
        cb: (r: Record<string, unknown>) => void,
      ) => {
        if (keys === null) return cb({ ...store });
        const k = Array.isArray(keys) ? keys : [keys];
        const result: Record<string, unknown> = {};
        k.forEach((key) => {
          if (key in store) result[key] = store[key];
        });
        cb(result);
      },
    ),
    set: jest.fn((data: Record<string, unknown>, cb?: () => void) => {
      Object.assign(store, data);
      cb?.();
    }),
    remove: jest.fn((keys: string | string[], cb?: () => void) => {
      (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete store[k]);
      cb?.();
    }),
    clear: jest.fn((cb?: () => void) => {
      Object.keys(store).forEach((k) => delete store[k]);
      cb?.();
    }),
  };
}
```

## Helpers

```ts
// createMockTab
export function createMockTab(
  overrides: Partial<chrome.tabs.Tab> = {},
): chrome.tabs.Tab {
  return {
    id: 1,
    index: 0,
    windowId: 1,
    highlighted: false,
    active: true,
    pinned: false,
    incognito: false,
    url: "https://example.com",
    title: "Example",
    status: "complete",
    ...overrides,
  };
}

// createMockSender
export function createMockSender(
  overrides: Partial<chrome.runtime.MessageSender> = {},
): chrome.runtime.MessageSender {
  return {
    tab: createMockTab(),
    frameId: 0,
    url: "https://example.com",
    ...overrides,
  };
}
```

## Reset Between Tests

```ts
beforeEach(() => {
  jest.clearAllMocks();
  // If using manual store mock, clear it:
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
});
```
