---
name: extension-migration
description: "Migrates browser extensions from Manifest V2 to MV3: background page to service worker, webRequestBlocking to declarativeNetRequest, CSP and API rewrites. Use when asked to migrate to MV3, upgrade manifest_version 2, or fix an MV2 extension disabled in Chrome. Not for feature work in an MV3 extension (use extension-dev)."
license: MIT
metadata:
  author: quangpl
  version: "2.0.0"
---

# Extension Migration (MV2 → MV3)

Converts an existing MV2 extension into a working MV3 extension with equivalent behavior, and reports every behavior that could not be preserved.

## Platform status

- **Chrome**: MV2 extensions no longer run (disabled for all users from Chrome 138; the `ExtensionManifestV2Availability` enterprise policy is gone from Chrome 139). The Chrome Web Store (CWS) has removed all MV2 items, so an MV2 build can neither be published nor rolled back to. Source: [MV2 support timeline](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline).
- **Firefox**: supports both MV2 and MV3, keeps blocking `webRequest` in MV3, and Mozilla has [no plans to deprecate MV2](https://blog.mozilla.org/addons/2024/03/13/manifest-v3-manifest-v2-march-2024-update/). Firefox MV3 runs `background.scripts` (event page), not `service_worker`.
- **Safari**: accepts MV2 and MV3 and both `chrome.*`/`browser.*`; iOS requires `"persistent": false` in MV2 ([Apple: browser compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility)).

So the migration target is Chrome/Edge MV3; keep Firefox/Safari builds working rather than breaking them.

## Defaults

| Situation | Default |
|---|---|
| Project has a bundler (Vite, webpack, Rollup, esbuild, WXT, Plasmo) | Migrate in place; keep the build system |
| Plain files, no build step | Migrate in place first; move onto WXT only if the user asks for tooling or multi-browser builds ([WXT migration guide](https://wxt.dev/guide/resources/migrate.html)). WXT builds MV2 for Firefox/Safari and MV3 elsewhere by default; pass `--mv3` to force MV3 |
| Needs Firefox too | `"background": { "service_worker": "bg.js", "scripts": ["bg.js"] }` — Chrome uses `service_worker`, Firefox uses `scripts` |
| Blocking `webRequest` logic | Rewrite as declarativeNetRequest rules; non-blocking (observational) `webRequest` listeners stay valid in MV3 |
| Callback-style APIs | Convert to promises while touching the code; don't mix callback and promise on one call |

Do the migration directly; ask only if a lost capability forces a product decision (e.g. a feature that needs per-request JS logic DNR cannot express). Confirm before publishing to CWS.

## Workflow

Copy and tick:

```
- [ ] 1. Inventory MV2 usage (grep below); list every hit by feature
- [ ] 2. Manifest: version 3, background, action, host_permissions, CSP object, web_accessible_resources objects
- [ ] 3. Background page → service worker (top-level listeners, storage instead of globals, alarms, offscreen for DOM)
- [ ] 4. Blocking webRequest → declarativeNetRequest rules
- [ ] 5. Remote code → bundled; eval/new Function removed or moved to a sandboxed page
- [ ] 6. Remaining API renames (tabs.executeScript, extension.*, getBackgroundPage, …)
- [ ] 7. Build, load unpacked, exercise every feature from the inventory
- [ ] 8. Fix errors, re-run inventory grep; repeat 7–8 until clean
```

Step 1 inventory (run at the repo root; adjust paths for `src/`):

```bash
grep -rnIE --exclude-dir={node_modules,dist,build,.output,.git} \
  'manifest_version|"persistent"|"background"|browser_action|page_action|browserAction|pageAction|webRequestBlocking|"blocking"|onBeforeRequest|onBeforeSendHeaders|onHeadersReceived|tabs\.(executeScript|insertCSS|removeCSS|getSelected|getAllInWindow|sendRequest)|extension\.(getURL|getBackgroundPage|getExtensionTabs|getViews|sendMessage|sendRequest|onRequest|onMessage|connect|lastError)|runtime\.getBackgroundPage|localStorage|sessionStorage|XMLHttpRequest|setInterval|setTimeout|document\.|window\.|DOMParser|Audio\(|eval\(|new Function|content_security_policy|web_accessible_resources|<script[^>]+src="https?:' .
```

Hits for `document.`/`window.`/timers only matter in background code; content scripts and extension pages keep them.

Step 7 verification loop:
1. Build (`npm run build` or the project's script; plain projects need none).
2. `chrome://extensions` → Developer mode → Load unpacked (or Reload). Fix any manifest error shown on the card.
3. Open the service worker's "Inspect views" console; trigger each inventoried feature (popup, content script, context menu, network rules, alarms, messaging).
4. Click "Stop" on the service worker in `chrome://extensions`, then trigger features again — this catches state lost on termination and late listener registration.
5. Check the Errors button on the card. Repeat until no errors and every feature matches MV2 behavior.

## API replacements

| MV2 | MV3 | Notes |
|---|---|---|
| `background.scripts` / `background.page` | `background.service_worker` (+ `"type": "module"` for ESM) | Terminates after ~30 s idle |
| `chrome.extension.getBackgroundPage()`, `chrome.runtime.getBackgroundPage()` | `chrome.runtime.sendMessage` / `connect` | No shared window; state goes through messages or `chrome.storage` |
| DOM, `Audio`, `DOMParser`, clipboard in background | `chrome.offscreen.createDocument` | One offscreen document at a time |
| `setInterval`/`setTimeout` for periodic work | `chrome.alarms` | Minimum period 30 s; short in-handler timeouts are fine |
| `XMLHttpRequest` | `fetch()` | Not available in service workers |
| `localStorage` in background | `chrome.storage.local` (persistent) / `chrome.storage.session` (in-memory) | Migrate existing user data, see service worker reference |
| `webRequest` + `webRequestBlocking` | `declarativeNetRequest` | Blocking stays only for policy-installed extensions |
| `tabs.executeScript` / `insertCSS` / `removeCSS` | `scripting.executeScript` / `insertCSS` / `removeCSS` | Needs `"scripting"` + host permission or `activeTab`; no `code` strings |
| `browser_action`, `page_action`, `browserAction.*`, `pageAction.*` | `action`, `chrome.action.*` | No `show()`/`hide()`: use `action.enable/disable(tabId)` or declarativeContent |
| `chrome.extension.getURL` | `chrome.runtime.getURL` | |
| Remote `<script src>`, `eval`, `new Function`, `setTimeout(string)` | Bundled code; sandboxed page for eval | CWS rejects remotely hosted code |
| CSP string | `{ "extension_pages": …, "sandbox": … }` | `extension_pages` allows only `'self'`, `'none'`, `'wasm-unsafe-eval'` |
| `web_accessible_resources: [string]` | `[{ resources, matches \| extension_ids, use_dynamic_url? }]` | |
| Hosts inside `permissions` | `host_permissions` | Granted at install, revocable by users |

## Gotchas

- Register every `chrome.*` event listener synchronously at the top level of the service worker. Listeners added inside callbacks or after `await` are missed when the worker wakes for that event.
- Global variables reset whenever the worker stops. Anything that must survive goes in `chrome.storage.session` (cleared on browser restart) or `chrome.storage.local`.
- Do not keep the worker alive with alarm or port pings; design for restart. Open WebSockets and active extension API calls already extend its lifetime.
- `chrome.runtime.onSuspend` and `window.onunload` cleanup logic will not run reliably; persist as you go.
- DNR evaluates rules without running your code. Logic based on request bodies, async lookups, or per-request user prompts has no direct equivalent — record it as a behavior difference.
- An MV3 update cannot read the old background page's `localStorage` from the service worker; use an offscreen document once on update.
- Firefox-origin code using `browser.*` works natively in Chrome 148+; for older Chrome keep `chrome.*` or use WXT's `browser`.

## Output contract

Edit the project files in place. The final message contains:

1. **Migration summary table**: `| API / key (MV2) | Replacement (MV3) | File(s) |` — one row per changed item.
2. **Unresolved behavior differences**: what no longer works identically (e.g. dynamic blocking logic, page-action visibility, lost timers) and the chosen workaround or decision needed.
3. **Verification evidence**: build output, load-unpacked result, features exercised (including after stopping the service worker), and any remaining console errors or untested features.

## References

- [manifest-and-api-changes.md](references/manifest-and-api-changes.md) — read when rewriting `manifest.json`, CSP, web_accessible_resources, action, scripting, `chrome.extension.*` calls, or removing remote code.
- [service-worker-migration.md](references/service-worker-migration.md) — read when converting the background page: listeners, state, alarms, offscreen documents, `localStorage` data migration, messaging instead of `getBackgroundPage`.
- [network-request-migration.md](references/network-request-migration.md) — read when the extension blocks, redirects, or rewrites headers with `webRequest`; contains rule limits and use-case mapping.
- [verification.md](references/verification.md) — read at step 7 for the per-feature test matrix, upgrade-path testing, and release notes.

Official guide: [Migrate to Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate).
