# Debugging and Verification

Each extension context has its own console. Verify a change in the context where the code runs; a clean popup console says nothing about the service worker.

## Agent-driven verification

If a Chrome DevTools MCP server is connected (`chrome-devtools-mcp` started with `--categoryExtensions`), use it to install/reload the unpacked build, trigger the action, and read the service-worker, popup, and page consoles directly. Setup: https://developer.chrome.com/docs/extensions/ai/build_with_ai. Without it, a WXT dev server already launches a browser with the extension loaded; otherwise hand the user the exact steps below and what output to expect.

## Open DevTools per context

| Context | How |
|---|---|
| Service worker | `chrome://extensions` → Developer mode → extension card → "service worker" link. Also listed at `chrome://inspect/#service-workers`. |
| Content script | Page DevTools → Console → context dropdown (default `top`) → pick the extension. Sources → Content scripts for breakpoints. |
| Popup | Open the popup → right-click → Inspect. The popup stays open while its DevTools window is attached. |
| Side panel | Open the panel → right-click inside → Inspect. |
| Options / extension tab pages | Open the page → DevTools as usual. |
| Offscreen document | `chrome://extensions` card lists it under "Inspect views" while it exists. |

The red "Errors" button on the extension card collects manifest errors and uncaught errors from all contexts — check it after every reload.

## Reload matrix

| Changed | Needed |
|---|---|
| Popup / side panel / options code | Dev-server HMR, or close and reopen the page |
| Service worker | Reload the extension (WXT/Plasmo/CRXJS dev servers do this automatically) |
| Content script | Reload the extension, then refresh the target tab; scripts already in open tabs are orphaned |
| `manifest.json` / manifest config, permissions, icons | Reload the extension; some dev servers need a restart |

## Service-worker lifecycle bugs

- To reproduce termination, stop the worker from `chrome://serviceworker-internals` or wait 30 s idle, then trigger the feature. Bugs that only appear "after a while" are usually lost globals or listeners registered late.
- An open DevTools window for the service worker keeps it alive, hiding termination bugs. Close it when testing lifecycle behavior.
- `runtime.onInstalled` fires with `reason: 'update'` on every unpacked reload — use it to seed storage or inject content scripts into existing tabs.

## Storage

Any extension context's DevTools → Application → Storage → Extension storage → `local` / `sync` / `session` / `managed`: view, edit, and delete keys. From the service-worker console, `await chrome.storage.local.get(null)` dumps everything.

## Network

- Service-worker requests: Network tab of the service-worker DevTools.
- Content-script requests: the page's Network tab (they run with the page's origin and CORS).
- `declarativeNetRequest`: load unpacked (static-rule errors only show for unpacked builds), add `declarativeNetRequestFeedback` during development, then use `declarativeNetRequest.onRuleMatchedDebug`, `getMatchedRules()`, or `testMatchOutcome()` from the service-worker console. Remove the feedback permission before shipping — it carries a "Read your browsing history" warning.

## Common errors

| Error | Usual cause | Fix |
|---|---|---|
| `Cannot read properties of undefined (reading 'local')` on `chrome.storage` | `storage` permission missing, or calling from a page/MAIN-world script | Add the permission; move the call into an extension context |
| `chrome.tabs` / `chrome.scripting` undefined | Called from a content script | Message the service worker to do it |
| `Service worker registration failed. Status code: 15` | Uncaught error during the worker's first evaluation, or bad `background.service_worker` path | Read the Errors panel; fix the top-level exception or path |
| `Could not establish connection. Receiving end does not exist.` | No listener in the target: content script not injected in that tab (opened before install/reload, restricted page, `matches` mismatch) or the service worker threw at startup | Inject with `scripting.executeScript` and resend; check the service-worker console |
| `Extension context invalidated.` | Orphaned content script after reload | Refresh the tab; guard with `chrome.runtime?.id` |
| `Unchecked runtime.lastError: …` | Callback-style call failed and the callback never read `chrome.runtime.lastError` | Use the promise form and `try/catch`, or read `lastError` in the callback |
| `Refused to execute inline script` / `Refused to evaluate a string as JavaScript` | MV3 CSP: no inline scripts, `eval`, `new Function`, or remote scripts on extension pages | Move code to bundled files; run eval-dependent libraries in a sandbox page |
| `Cannot access contents of the page` / `Cannot access a chrome:// URL` | No host access for `scripting`, or a restricted page | Add `activeTab`/host permission; skip `chrome://` and Chrome Web Store pages |
| `This request exceeds the MAX_WRITE_OPERATIONS_PER_MINUTE quota` | Frequent `storage.sync` writes | Debounce writes or use `storage.local` |
| Popup closes or renders blank immediately | Exception during popup startup | Inspect the popup, enable "Pause on uncaught exceptions", reopen |
| `sidePanel.open()` or `permissions.request()` rejects about a user gesture | Called after an `await` or outside a click handler | Call synchronously inside the user-action handler |

Prefix logs per context (`[sw]`, `[cs]`, `[popup]`) when several consoles are open; remove noisy logs before finishing.
