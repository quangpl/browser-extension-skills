---
name: extension-test
description: Set up and run unit, integration, and E2E tests for Chrome extensions. Covers Jest mocks for chrome.* APIs and Puppeteer E2E with real Chrome.
---

# Extension Testing

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

## Testing Layer Architecture

```
Unit Tests (Jest)          → Test isolated logic, chrome.* API mocks
Integration Tests (Jest)   → Test service interactions, message passing
E2E Tests (Puppeteer)      → Test in real Chrome with extension loaded
```

**Critical constraint**: Extensions CANNOT run in headless mode. E2E requires `headless: false` or Chrome's `--headless=new` (Chrome 112+).

---

## Layer 1: Unit + Integration (Jest)

### Install

```bash
npm install -D jest @types/jest ts-jest jest-chrome
# For React popup:
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

### jest.config.ts

```ts
export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["./jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

### jest.setup.ts (minimal)

```ts
import chrome from "jest-chrome";
Object.assign(global, { chrome });
```

Full mock setup → [chrome-api-mocks.md](references/chrome-api-mocks.md)
Unit/integration patterns → [unit-integration-testing.md](references/unit-integration-testing.md)

---

## Layer 2: E2E (Puppeteer)

### Install

```bash
npm install -D puppeteer
```

### Launch extension in Chrome

```ts
import puppeteer from "puppeteer";
import path from "path";

const browser = await puppeteer.launch({
  headless: false, // extensions require non-headless
  args: [
    `--disable-extensions-except=${path.resolve("dist")}`,
    `--load-extension=${path.resolve("dist")}`,
  ],
});
```

### Get extension ID

```ts
const targets = await browser.targets();
const extTarget = targets.find((t) => t.type() === "service_worker");
const extUrl = extTarget?.url() ?? "";
const [, , extId] = extUrl.split("/");
```

Full E2E patterns → [e2e-testing-puppeteer.md](references/e2e-testing-puppeteer.md)

---

## Chrome API Mocking Strategy

| API                          | Approach                            |
| ---------------------------- | ----------------------------------- |
| `chrome.storage`             | Mock with in-memory store           |
| `chrome.runtime.sendMessage` | jest.fn() + mock response           |
| `chrome.tabs`                | jest.fn() with createMockTab helper |
| `chrome.action`              | jest.fn() stubs                     |
| `chrome.alarms`              | jest.fn() stubs                     |

All mocks → [chrome-api-mocks.md](references/chrome-api-mocks.md)

---

## package.json Scripts

```json
{
  "scripts": {
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e --runInBand",
    "test": "npm run test:unit && npm run test:integration"
  }
}
```

> Run E2E separately (`--runInBand`) — Puppeteer tests must run serially.

---

## Reference Files

- [unit-integration-testing.md](references/unit-integration-testing.md) — Jest patterns, mocking, component tests
- [e2e-testing-puppeteer.md](references/e2e-testing-puppeteer.md) — Puppeteer setup, popup/content/SW tests
- [chrome-api-mocks.md](references/chrome-api-mocks.md) — Full chrome.* mock templates
