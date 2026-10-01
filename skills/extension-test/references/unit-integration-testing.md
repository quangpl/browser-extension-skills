# Unit & Integration Testing

## Contents
- Vitest setup (WXT, other projects)
- Repos already on Jest
- Make background code testable
- Storage, messaging, and alarm tests
- Popup / options component tests

## Vitest setup

WXT project — the plugin installs the in-memory `browser`/`chrome` fake, applies `wxt.config.ts` Vite config, aliases (`@/`, `~/`), auto-imports, and `import.meta.env.BROWSER` etc. Import the fake in tests from `wxt/testing/fake-browser`.

```ts
// vitest.config.ts
import { configDefaults, defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  // e2e/ excluded: Vitest's default include also matches Playwright's *.spec.ts
  test: { restoreMocks: true, exclude: [...configDefaults.exclude, 'e2e/**'] },
});
```

Any other project (Vite/CRXJS, Plasmo, vanilla): `npm i -D vitest @webext-core/fake-browser @types/chrome`, then

```ts
// vitest.config.ts
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['@webext-core/fake-browser/auto'], // sets globalThis.chrome and .browser
    restoreMocks: true,
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  // mirror tsconfig "paths" here, e.g. Plasmo's "~": resolve: { alias: { '~': '/src' } }
});
```

In tests import `{ fakeBrowser } from '@webext-core/fake-browser'`; it is the same object as the global `chrome`. Scripts: `"test": "vitest run"`.

## Repos already on Jest

Keep Jest; don't migrate runners as a side effect. Replace hand-written or `jest-chrome` mocks with the fake when touching those tests:

```js
// jest.config.js
module.exports = { setupFiles: ['@webext-core/fake-browser/auto'] };
```

`@webext-core/fake-browser` 2.x is ESM-only. CommonJS Jest setups need `@webext-core/fake-browser@^1.5` (ships CJS) or Jest's ESM mode. Swap `vi.fn`/`vi.spyOn` for `jest.fn`/`jest.spyOn` in the examples below.

## Make background code testable

`fakeBrowser.reset()` also removes listeners registered at import time. Export the handler and a register function; the service worker entry just calls it:

```ts
// src/background/handlers.ts
export async function handleMessage(msg: Message): Promise<Response> { /* … */ }

export function registerListeners() {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    handleMessage(msg).then(sendResponse);
    return true; // keep the channel open for the async response
  });
  chrome.alarms.onAlarm.addListener(onAlarm);
  chrome.runtime.onInstalled.addListener(onInstalled);
}
```

Alternative when the entry can't be changed: `vi.resetModules()` then `await import('../background')` after `reset()`.

## Storage, messaging, and alarm tests

```ts
// src/background/handlers.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { registerListeners } from './handlers';

describe('background', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    registerListeners();
  });

  it('SAVE_ITEM persists the item and acknowledges', async () => {
    // fake sendMessage delivers to onMessage listeners in the same context
    const res = await chrome.runtime.sendMessage({ type: 'SAVE_ITEM', item: { id: 'x' } });

    expect(res).toEqual({ ok: true });
    expect(await chrome.storage.local.get('items')).toEqual({ items: [{ id: 'x' }] });
  });

  it('sync alarm marks state as synced', async () => {
    await fakeBrowser.alarms.onAlarm.trigger({ name: 'sync', scheduledTime: Date.now() });
    expect((await chrome.storage.local.get('synced')).synced).toBe(true);
  });

  it('migrates settings on update', async () => {
    await chrome.storage.sync.set({ theme: 'dark' }); // seed state through the real API surface
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'update', previousVersion: '1.0.0' });
    expect(await chrome.storage.sync.get('settings')).toEqual({ settings: { theme: 'dark' } });
  });
});
```

Assert on resulting state (storage contents, responses, tabs) rather than on which API was called; the tests then survive refactors such as switching `local` ↔ `session` wrappers.

## Popup / options component tests

```bash
npm i -D jsdom @testing-library/react @testing-library/user-event   # or the Vue/Svelte/Solid Testing Library
```

Put `// @vitest-environment jsdom` at the top of UI test files (keeps background tests in the faster `node` environment), or set `test.environment: 'jsdom'` if most tests are UI.

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import App from './App';

beforeEach(() => fakeBrowser.reset());

it('toggle persists the enabled flag', async () => {
  await chrome.storage.local.set({ enabled: false });
  render(<App />);

  await userEvent.click(await screen.findByRole('switch', { name: /enable/i }));

  await expect.poll(async () => (await chrome.storage.local.get('enabled')).enabled).toBe(true);
});
```

