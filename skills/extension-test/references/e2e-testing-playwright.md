# E2E Testing with Playwright

## Contents
- Setup
- Fixtures: context, service worker, extension ID
- Popup and other extension pages
- Content scripts
- Service worker state and termination
- CI

## Setup

```bash
npm i -D @playwright/test
npx playwright install chromium        # CI: npx playwright install --with-deps chromium
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,                     // each test launches its own browser with the extension
  retries: process.env.CI ? 1 : 0,
  use: { trace: 'on-first-retry' },
});
```

Build before running (`wxt build` / `plasmo build` / `vite build`); add it to the script: `"test:e2e": "npm run build && playwright test"`.

## Fixtures: context, service worker, extension ID

Extensions load only in a persistent context. `channel: 'chromium'` selects Playwright's full Chromium, which loads extensions in headless mode; the default headless-shell binary and branded Chrome/Edge (side-loading flags removed) do not.

```ts
// e2e/fixtures.ts
import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test';
import path from 'node:path';

const pathToExtension = path.resolve('.output/chrome-mv3'); // Plasmo: build/chrome-mv3-prod, Vite/CRXJS: dist

export const test = base.extend<{ context: BrowserContext; serviceWorker: Worker; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {   // '' = fresh temp profile
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    sw ??= await context.waitForEvent('serviceworker');
    await use(sw);
  },
  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },
});
export const expect = test.expect;
```

Tests import `test`/`expect` from `./fixtures`; the built-in `page` fixture then comes from this context.

## Popup and other extension pages

```ts
import { test, expect } from './fixtures';

test('popup toggles the feature', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.getByRole('switch', { name: /enable/i }).click();
  await expect(page.getByText('Enabled')).toBeVisible();
});
```

Same pattern for `options.html`, `sidepanel.html`, `newtab.html` (WXT names pages after the entrypoint; check the build's `manifest.json`). A popup opened as a tab sees its own tab as active; if it acts on "the current tab", support `popup.html?tab=<id>` and pass the target tab's ID (get it via `serviceWorker.evaluate(() => chrome.tabs.query({ url: 'https://example.test/*' }))`).

## Content scripts

Serve fixture pages with routing instead of depending on live sites; the content script still matches the URL:

```ts
test('content script injects banner', async ({ context, page }) => {
  await context.route('https://example.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><h1>Fixture</h1>' }));
  await page.goto('https://example.test/article');
  await expect(page.locator('#ext-banner')).toHaveText('Extension Active');
});
```

The `matches` patterns must cover the fixture URL. Content scripts never run on `chrome://` pages or the Chrome Web Store. Shadow-DOM UIs (WXT `createShadowRootUi`) are reachable with normal locators since Playwright pierces open shadow roots.

## Service worker state and termination

Seed or read state by evaluating in the worker (prefer asserting on UI; use this for setup and invisible effects):

```ts
await serviceWorker.evaluate(() => chrome.storage.local.set({ onboarded: true }));
expect(await serviceWorker.evaluate(() => chrome.storage.local.get('onboarded'))).toEqual({ onboarded: true });
```

MV3 workers stop after ~30 s idle. Playwright keeps the same `Worker` handle across restarts (in-flight `evaluate` calls during the stop throw "Service worker restarted"). Force a stop to catch state kept in globals:

```ts
export async function stopServiceWorker(context: BrowserContext, extensionId: string) {
  const cdp = await context.browser()!.newBrowserCDPSession();
  const { targetInfos } = await cdp.send('Target.getTargets');
  const sw = targetInfos.find(
    (t) => t.type === 'service_worker' && t.url.startsWith(`chrome-extension://${extensionId}/`),
  );
  if (sw) await cdp.send('Target.closeTarget', { targetId: sw.targetId });
  await cdp.detach();
}

test('popup works after the worker restarts', async ({ page, context, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('count')).toHaveText('1');

  await stopServiceWorker(context, extensionId);

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('count')).toHaveText('2'); // fails if the count lived in a global
});
```

Fixed extension ID (e.g. a backend allow-lists `chrome-extension://<id>`): add the manifest `key` for test builds; see developer.chrome.com/docs/extensions/reference/manifest/key.

## CI

- Headless is the default; no `xvfb` needed with `channel: 'chromium'`.
- Cache `~/.cache/ms-playwright`; upload `test-results/` (traces) on failure.
- Don't set `channel: 'chrome'` or `'msedge'` and don't point `executablePath` at installed Chrome; the extension won't load.
