---
name: extension-dev
description: "Detect Chrome extension framework/stack, find proper docs, implement features, and debug across service worker, content script, and popup contexts."
---

# Extension Dev

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

Detect the stack, find docs, implement the feature, debug. Do NOT just explain — execute the workflow.

## Workflow (Execute This)

### Step 1: Detect framework and UI stack

Run detection (see `references/framework-detection.md`):

```bash
ls wxt.config.ts crxjs.config.ts vite.config.ts manifest.json 2>/dev/null
cat package.json | grep -E '"wxt|crxjs|crxjs|react|vue|svelte"'
```

| File found                          | Framework |
| ----------------------------------- | --------- |
| `wxt.config.ts`                     | WXT       |
| `package.json` has `crxjs`          | CRXJS     |
| `vite.config` has `@crxjs`          | CRXJS     |
| `manifest.json` in root, none above | Vanilla   |

### Step 2: Fetch framework docs and style guides

Use `docs-seeker` skill or web search to find proper docs for the detected stack.

**Extension framework docs:**

- WXT: https://wxt.dev/ | CRXJS: https://docs.crxjs.com/ | CRXJS: Vite plugin docs
- Chrome APIs: https://developer.chrome.com/docs/extensions/reference/api
- Permissions: https://developer.chrome.com/docs/extensions/reference/permissions-list

**UI framework docs** (fetch based on detected framework):

| Framework | Docs                      | Style Guide                     |
| --------- | ------------------------- | ------------------------------- |
| React     | https://react.dev         | https://react.dev/learn         |
| Next.js   | https://nextjs.org/docs   | https://nextjs.org/docs/app     |
| Vue       | https://vuejs.org/guide   | https://vuejs.org/style-guide   |
| Svelte    | https://svelte.dev/docs   | https://svelte.dev/docs         |
| SolidJS   | https://solidjs.com/docs  | https://solidjs.com/guides      |
| Angular   | https://angular.dev/guide | https://angular.dev/style-guide |

**Code style guides** (always follow):

- TypeScript: https://google.github.io/styleguide/tsguide.html
- JavaScript: https://google.github.io/styleguide/jsguide.html

### Step 3: Implement the feature

Follow framework conventions:

- **WXT**: add entrypoints in `entrypoints/`, configure `wxt.config.ts`
- **CRXJS**: add pages/tabs/contents, use CSUI for content UI
- **CRXJS**: standard Vite + manifest-based setup
- **Vanilla**: edit `manifest.json`, add JS files directly

For Chrome API usage, check `references/chrome-api-quick-reference.md`.
For messaging between contexts, check `references/message-passing-patterns.md`.

### Step 4: Debug

See `references/debugging-guide.md` for context-specific DevTools access.

Quick map:

| Context              | How to inspect                                     |
| -------------------- | -------------------------------------------------- |
| Service worker       | `chrome://extensions` → "inspect" link             |
| Content script       | Page DevTools → Console → select extension context |
| Popup                | Right-click popup → Inspect                        |
| Options / Side panel | Open page → F12                                    |

### Step 5: Hot reload setup

| Framework | Command    | Notes                            |
| --------- | ---------- | -------------------------------- |
| WXT       | `pnpm dev` | Full HMR, auto-reloads extension |
| CRXJS     | `pnpm dev` | HMR for popup/content            |
| CRXJS     | `vite dev` | Vite HMR                         |
| Vanilla   | Manual     | Reload at `chrome://extensions`  |

---

## Chrome API Quick Reference (Top 20)

| API                            | Purpose                               | Permission              |
| ------------------------------ | ------------------------------------- | ----------------------- |
| `chrome.tabs`                  | Query, create, update tabs            | `tabs`                  |
| `chrome.windows`               | Manage browser windows                | `windows`               |
| `chrome.storage.local`         | Persist data locally                  | `storage`               |
| `chrome.storage.sync`          | Sync data across devices              | `storage`               |
| `chrome.storage.session`       | Session-only data                     | `storage`               |
| `chrome.action`                | Toolbar icon, popup, badge            | —                       |
| `chrome.contextMenus`          | Right-click menu items                | `contextMenus`          |
| `chrome.sidePanel`             | Side panel UI                         | `sidePanel`             |
| `chrome.notifications`         | Desktop notifications                 | `notifications`         |
| `chrome.scripting`             | Inject scripts/CSS into pages         | `scripting`             |
| `chrome.runtime`               | Messaging, lifecycle, manifest        | —                       |
| `chrome.webRequest`            | Intercept/modify network requests     | `webRequest`            |
| `chrome.declarativeNetRequest` | Block/redirect requests declaratively | `declarativeNetRequest` |
| `chrome.webNavigation`         | Track page navigation events          | `webNavigation`         |
| `chrome.identity`              | OAuth2, Google Sign-In                | `identity`              |
| `chrome.alarms`                | Schedule periodic tasks               | `alarms`                |
| `chrome.commands`              | Keyboard shortcuts                    | `commands`              |
| `chrome.cookies`               | Read/write cookies                    | `cookies`               |
| `chrome.history`               | Browser history access                | `history`               |
| `chrome.bookmarks`             | Read/write bookmarks                  | `bookmarks`             |

---

## Message Passing (Quick Pattern)

**One-time (popup → service worker):**

```ts
// sender
const response = await chrome.runtime.sendMessage({ type: "GET_DATA" });

// receiver (background)
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === "GET_DATA") {
    reply({ data: "..." });
    return true;
  }
});
```

**Content script → service worker:** same pattern, `return true` for async.
**Tab-targeted (background → content):**

```ts
chrome.tabs.sendMessage(tabId, { type: "ACTION" });
```

Full patterns in `references/message-passing-patterns.md`.

---

## References

- `references/framework-detection.md` — detect WXT/CRXJS/CRXJS/vanilla, dev commands
- `references/framework-styleguides.md` — UI framework docs, style guides, extension framework docs
- `references/chrome-api-quick-reference.md` — 30+ APIs with permissions and doc links
- `references/message-passing-patterns.md` — all messaging patterns with TypeScript examples
- `references/debugging-guide.md` — DevTools per context, common errors, tips

## Related Skills

- `extension-create` — scaffold new extension with WXT
- `extension-manifest` — generate/validate manifest.json
- `extension-test` — write and run extension tests
- `extension-analyze` — analyze existing extension codebase
