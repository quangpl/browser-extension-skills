---
name: extension-test
description: "Sets up and writes unit, integration, and E2E tests for Chrome MV3 extensions: Vitest with a fake chrome API, Playwright loading the built extension. Use when adding or fixing tests, mocking chrome.* APIs, testing popup, content scripts, or messaging, or running extension tests in CI. Not for implementing features (use extension-dev)."
license: MIT
metadata:
  author: quangpl
  version: "2.0.0"
---

# Extension Testing

Add the smallest set of tests that proves the changed behavior, using the runner the repo already has.

## Defaults

| Layer | Default | Escape hatch |
|---|---|---|
| Unit / integration | Vitest + in-memory extension APIs: WXT projects use `WxtVitest()`; others use `@webext-core/fake-browser/auto` as a setup file | Repo already on Jest: keep Jest, swap mocks to the same fake-browser setup file |
| Popup / options UI components | Vitest + `jsdom` + Testing Library for the repo's UI framework | — |
| E2E (built extension in a real browser) | `@playwright/test` with `chromium.launchPersistentContext` and the bundled Chromium (`channel: 'chromium'`) | Puppeteer when you need its extension APIs: `browser.installExtension()`, `page.triggerExtensionAction()` (real popup), content-script realm evaluation, `worker.close()` |

Why: `jest-chrome` and `sinon-chrome` are unmaintained (last releases 2022 and 2019); `fake-browser` behaves like the real APIs (storage persists, `sendMessage` fires `onMessage`), so tests assert outcomes instead of mock calls. WXT's docs recommend Playwright for extension E2E.

## Workflow

Copy and track:

```
- [ ] 1. Detect: framework (wxt.config.*, package.json "plasmo", vite.config + @crxjs), runner (vitest/jest/playwright in devDependencies, existing *.test.* / e2e/), package manager (lockfile)
- [ ] 2. Choose layer: pure logic, storage, messaging → unit/integration; real browser behavior (content script on a page, popup rendering against the real service worker, SW restart) → E2E
- [ ] 3. Add minimal config only if missing (see references)
- [ ] 4. Write tests for the changed behavior: happy path, one failure/edge case, regression case for a bug fix
- [ ] 5. Run the narrowest command (e.g. `npx vitest run src/foo.test.ts`, `npx playwright test e2e/popup.spec.ts`)
- [ ] 6. On failure: decide test bug vs. product bug from the output; fix the test, or fix/report the product bug; re-run until green
- [ ] 7. Run the full affected suite once at the end
```

Calibrate scope: a bug fix gets one regression test; a new feature gets tests for its contract; build a broad suite only when the user asks for coverage. For E2E, build first (`wxt build`, `plasmo build`, `vite build`) — tests load the build output, not the sources.

## Key gotchas

- **Branded Google Chrome ignores side-loading flags.** `--load-extension` was removed in Chrome 137 and `--disable-extensions-except` in Chrome 139 for official Chrome builds; Microsoft Edge removed them too. Run E2E on Chromium or Chrome for Testing: Playwright's bundled Chromium, or Puppeteer's default Chrome for Testing. Don't set `channel: 'chrome'`.
- **Headless works.** Extensions load in new headless mode: Playwright needs `channel: 'chromium'` (the default headless-shell binary does not load extensions); Puppeteer's default `headless: true` is new headless. No `xvfb` needed in CI.
- **Point E2E at the build output**: WXT `.output/chrome-mv3`, Plasmo `build/chrome-mv3-prod`, Vite/CRXJS `dist`. The folder must contain `manifest.json`.
- **Extension ID**: read it from the service worker URL (`chrome-extension://<id>/...`). For a stable ID across machines (e.g. server allow-lists), add a manifest `key`.
- **Popup opened as a tab** (`chrome-extension://<id>/popup.html`) is not a real popup: no popup size, and `tabs.query({active: true})` returns the popup's own tab. Let the popup accept `?tab=<id>` in tests, or use Puppeteer's real-popup path.
- **Service worker restarts**: MV3 workers stop after ~30 s idle and lose in-memory state. Add a terminate-then-retry E2E test for any feature that keeps state in globals.
- **fake-browser limits**: unimplemented APIs (`runtime.getManifest`, `tabs.sendMessage`, `scripting`, `sidePanel`, …) throw `MockNotImplementedError` — stub them with `vi.spyOn`. Events other than `runtime.onMessage` and storage/tabs changes need `.trigger(...)`.
- **`fakeBrowser.reset()` in `beforeEach` also drops listeners registered at import time.** Register listeners in an exported function and call it after the reset, or re-import the module after `vi.resetModules()`.
- **WXT `#imports`**: mock the real module path (`vi.mock('wxt/utils/inject-script', …)`), not `#imports`; find it in `.wxt/types/imports-module.d.ts` (run `wxt prepare` if missing).
- Content scripts don't run on `chrome://` pages or the Chrome Web Store; E2E content-script tests need an `http(s)` page — serve a local fixture page rather than hitting the internet.
- Run Playwright E2E with `workers: 1`: every test launches its own browser with a persistent context.

## Output

- Test config (only what was missing), test files next to the code (`*.test.ts`) or in `e2e/` (`*.spec.ts`), and `package.json` scripts (`test`, `test:e2e`) if absent.
- Final message: what is covered, the exact command run and its pass/fail result, and anything not covered (e.g. real popup sizing, Firefox) with the reason.

## References

- [unit-integration-testing.md](references/unit-integration-testing.md) — read when setting up Vitest/Jest or writing unit, integration, or popup component tests.
- [chrome-api-mocks.md](references/chrome-api-mocks.md) — read when a test needs an API fake-browser doesn't implement, event triggering, error paths, or test data helpers.
- [e2e-testing-playwright.md](references/e2e-testing-playwright.md) — read when writing E2E tests: fixtures, extension ID, popup and extension pages, content scripts, service worker evaluation and termination, CI.
- [e2e-puppeteer.md](references/e2e-puppeteer.md) — read when a test needs the real toolbar popup, runtime install/uninstall, content-script isolated-world evaluation, or the repo already has a Puppeteer suite.
