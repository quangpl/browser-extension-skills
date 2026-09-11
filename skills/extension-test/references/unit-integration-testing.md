# Unit & Integration Testing

## Jest Setup

```bash
npm install -D jest ts-jest @types/jest jest-chrome
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

```ts
// jest.config.ts
export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["./jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  testTimeout: 10000,
};
```

## Test Utility Functions

```ts
// src/utils/format.test.ts
import { truncateText } from "@/utils/format";

describe("truncateText", () => {
  it("truncates text exceeding limit", () => {
    expect(truncateText("Hello World", 5)).toBe("Hello...");
  });
  it("returns text unchanged when within limit", () => {
    expect(truncateText("Hi", 10)).toBe("Hi");
  });
});
```

## Test Storage Service

```ts
// src/services/storage.test.ts
import { StorageService } from "@/services/storage";

beforeEach(() => {
  chrome.storage.local.get.mockImplementation((keys, cb) => cb({}));
  chrome.storage.local.set.mockImplementation((data, cb) => cb?.());
});

it("saves and retrieves settings", async () => {
  const svc = new StorageService();
  await svc.save({ theme: "dark" });

  expect(chrome.storage.local.set).toHaveBeenCalledWith(
    { theme: "dark" },
    expect.any(Function),
  );
});
```

## Test Message Passing

```ts
// src/services/messenger.test.ts
import { sendToBackground } from "@/services/messenger";

it("sends message and returns response", async () => {
  chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
    cb({ success: true, data: "result" });
  });

  const res = await sendToBackground({
    type: "FETCH_DATA",
    url: "https://example.com",
  });
  expect(res).toEqual({ success: true, data: "result" });
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
    { type: "FETCH_DATA", url: "https://example.com" },
    expect.any(Function),
  );
});
```

## Test React Popup Component

```tsx
// src/popup/App.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import App from "@/popup/App";

it("shows toggle and changes state on click", async () => {
  chrome.storage.local.get.mockImplementation((_, cb) =>
    cb({ enabled: false }),
  );

  render(<App />);
  const toggle = await screen.findByRole("switch");
  expect(toggle).toHaveAttribute("aria-checked", "false");

  fireEvent.click(toggle);
  expect(chrome.storage.local.set).toHaveBeenCalledWith(
    { enabled: true },
    expect.any(Function),
  );
});
```

## Integration: Service Worker + Storage

```ts
// src/background/handler.integration.test.ts
import { handleMessage } from "@/background/handler";

const mockStore: Record<string, unknown> = {};

beforeEach(() => {
  chrome.storage.local.get.mockImplementation((keys, cb) => {
    const result: Record<string, unknown> = {};
    (Array.isArray(keys) ? keys : [keys]).forEach((k) => {
      if (k in mockStore) result[k] = mockStore[k];
    });
    cb(result);
  });
  chrome.storage.local.set.mockImplementation((data, cb) => {
    Object.assign(mockStore, data);
    cb?.();
  });
});

it("processes SAVE_ITEM message and persists to storage", async () => {
  const sender = { tab: { id: 1 } } as chrome.runtime.MessageSender;
  const sendResponse = jest.fn();

  await handleMessage(
    { type: "SAVE_ITEM", item: { id: "x", val: 42 } },
    sender,
    sendResponse,
  );

  expect(mockStore["items"]).toContainEqual({ id: "x", val: 42 });
  expect(sendResponse).toHaveBeenCalledWith({ success: true });
});
```

## Integration: onMessage Listener

```ts
it("service worker listener routes messages correctly", () => {
  const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];

  const res = listener(
    { type: "GET_VERSION" },
    { tab: { id: 1 } } as chrome.runtime.MessageSender,
    jest.fn(),
  );
  // returning true = async response
  expect(res).toBe(true);
});
```
