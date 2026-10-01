# E2E Escape Hatch: Puppeteer

Use Puppeteer instead of Playwright when a test needs: the real action popup (opened by clicking the toolbar action, with the page as the active tab), installing/uninstalling the extension mid-test, or evaluating inside a content script's isolated world. Puppeteer downloads Chrome for Testing (side-loading still allowed) and its default `headless: true` is new headless, which loads extensions.

```bash
npm i -D puppeteer
```

## Load the extension and get its service worker

```ts
import puppeteer, { type Browser, type WebWorker } from 'puppeteer';
import path from 'node:path';

const EXT_PATH = path.resolve('.output/chrome-mv3'); // Plasmo: build/chrome-mv3-prod, Vite/CRXJS: dist

export async function launch(): Promise<{ browser: Browser; extensionId: string; worker: WebWorker }> {
  const browser = await puppeteer.launch({ enableExtensions: true, pipe: true });
  const extensionId = await browser.installExtension(EXT_PATH);
  const target = await browser.waitForTarget(
    (t) => t.type() === 'service_worker' && t.url().startsWith(`chrome-extension://${extensionId}/`),
  );
  return { browser, extensionId, worker: (await target.worker())! };
}
```

`enableExtensions: [EXT_PATH]` loads at launch instead; then read the ID from the worker URL. `browser.uninstallExtension(id)` and `browser.extensions()` (a `Map` of id → extension with `name`, `version`) cover install/uninstall flows.

## Real popup

```ts
const page = await browser.newPage();
await page.goto('https://example.com');
await page.triggerExtensionAction((await browser.extensions()).get(extensionId)!);

const popup = await (await browser.waitForTarget(
  (t) => t.type() === 'page' && t.url().startsWith(`chrome-extension://${extensionId}/popup.html`),
)).asPage();
await popup.locator('button#save').click();
```

Alternative from the worker: `await worker.evaluate('chrome.action.openPopup()')`.

## Content script isolated world

```ts
let realm;
for (const r of page.extensionRealms()) {
  if ((await r.extension())?.id === extensionId) { realm = r; break; }
}
const injected = await realm!.evaluate(() => (globalThis as any).__myExtState);
```

## Service worker termination

```ts
await worker.close();   // stops the worker; the next event restarts it
// trigger the feature again and assert it still works (state must come from chrome.storage, not globals)
```

## Runner

Any runner works; with Vitest use `environment: 'node'`, `fileParallelism: false`, a generous `testTimeout` (browser launch), and `browser.close()` in `afterEach`/`afterAll`. Repos with an existing Jest + Puppeteer suite can keep it — replace `--load-extension`/`headless: false` launch code with `enableExtensions`.
