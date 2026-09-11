# E2E Testing with Puppeteer

## Setup

```bash
npm install -D puppeteer @types/puppeteer
# Build extension before E2E
npm run build
```

## Launch Chrome with Extension

```ts
import puppeteer, { Browser } from "puppeteer";
import path from "path";

const EXT_PATH = path.resolve(__dirname, "../../dist");

async function launchWithExtension(): Promise<Browser> {
  return puppeteer.launch({
    headless: false, // REQUIRED — extensions blocked in headless
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
    defaultViewport: null,
  });
}
```

## Wait for Extension Load + Get ID

```ts
async function getExtensionId(browser: Browser): Promise<string> {
  // Give extension time to register service worker
  await new Promise((r) => setTimeout(r, 1000));

  const targets = await browser.targets();
  const sw = targets.find(
    (t) =>
      t.type() === "service_worker" && t.url().includes("chrome-extension://"),
  );
  if (!sw) throw new Error("Extension service worker not found");

  const [, , extId] = sw.url().split("/");
  return extId;
}
```

## Test Popup Interactions

```ts
it("popup renders action button", async () => {
  const extId = await getExtensionId(browser);
  const popupUrl = `chrome-extension://${extId}/popup.html`;

  const page = await browser.newPage();
  await page.goto(popupUrl, { waitUntil: "networkidle0" });

  const btn = await page.waitForSelector("#action-btn", { timeout: 3000 });
  expect(btn).not.toBeNull();

  await btn!.click();
  const result = await page.$eval("#result", (el) => el.textContent);
  expect(result).toBe("Done");

  await page.close();
});
```

## Test Content Script Effects

```ts
it("content script injects banner on target page", async () => {
  const page = await browser.newPage();
  await page.goto("https://example.com", { waitUntil: "networkidle0" });

  // Wait for content script to inject
  const banner = await page.waitForSelector("#ext-banner", { timeout: 5000 });
  expect(banner).not.toBeNull();

  const text = await page.$eval("#ext-banner", (el) => el.textContent);
  expect(text).toContain("Extension Active");

  await page.close();
});
```

## Test Service Worker via Targets API

```ts
it("service worker responds to runtime message", async () => {
  const extId = await getExtensionId(browser);

  // Open extension background page (MV3: use devtools protocol)
  const targets = await browser.targets();
  const swTarget = targets.find((t) => t.url().includes(extId));
  const worker = await swTarget?.worker();

  // Evaluate in SW context
  const response = await worker?.evaluate(() => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "PING" }, resolve);
    });
  });

  expect(response).toEqual({ type: "PONG" });
});
```

## Screenshot Capture

```ts
async function capturePopup(browser: Browser, extId: string, filename: string) {
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 600 });
  await page.goto(`chrome-extension://${extId}/popup.html`, {
    waitUntil: "networkidle0",
  });
  await page.screenshot({
    path: `screenshots/${filename}.png`,
    fullPage: true,
  });
  await page.close();
}
```

## Jest E2E Config

```ts
// jest.e2e.config.ts
export default {
  preset: "ts-jest",
  testEnvironment: "node", // node, not jsdom for E2E
  testMatch: ["**/*.e2e.test.ts"],
  testTimeout: 30000,
  globalSetup: "./e2e/setup.ts",
  globalTeardown: "./e2e/teardown.ts",
};

// e2e/setup.ts
export default async () => {
  (global as any).__BROWSER__ = await launchWithExtension();
};

// e2e/teardown.ts
export default async () => {
  await (global as any).__BROWSER__?.close();
};
```
