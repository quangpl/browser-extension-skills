# Manifest and API changes (MV2 → MV3)

## Contents
- Manifest diff
- content_security_policy
- web_accessible_resources
- Action (browser/page action)
- Script and CSS injection
- chrome.extension.* and other removed APIs
- Remote code

Sources: [Update the manifest](https://developer.chrome.com/docs/extensions/develop/migrate/manifest), [Update your code](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls), [Improve security](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security).

## Manifest diff

```jsonc
// MV2
{
  "manifest_version": 2,
  "background": { "scripts": ["bg.js"], "persistent": false },
  "browser_action": { "default_icon": "icon.png", "default_popup": "popup.html" },
  "permissions": ["tabs", "storage", "webRequest", "webRequestBlocking", "https://api.example.com/*"],
  "optional_permissions": ["https://*/*"],
  "content_security_policy": "script-src 'self'; object-src 'self'",
  "web_accessible_resources": ["images/*.png"]
}

// MV3
{
  "manifest_version": 3,
  "background": { "service_worker": "bg.js", "type": "module" },
  "action": { "default_icon": "icon.png", "default_popup": "popup.html" },
  "permissions": ["tabs", "storage", "declarativeNetRequest"],
  "host_permissions": ["https://api.example.com/*"],
  "optional_host_permissions": ["https://*/*"],
  "content_security_policy": { "extension_pages": "script-src 'self'; object-src 'self'" },
  "web_accessible_resources": [{ "resources": ["images/*.png"], "matches": ["https://example.com/*"] }]
}
```

- Drop `"persistent"`. Add `"type": "module"` only if the worker uses `import`; otherwise use `importScripts()`.
- Match patterns move from `permissions`/`optional_permissions` to `host_permissions`/`optional_host_permissions`. `activeTab` stays in `permissions`.
- Cross-browser: add `"scripts": ["bg.js"]` next to `service_worker` so Firefox loads it as an event page.

## content_security_policy

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  "sandbox": "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self';"
}
```

- `extension_pages` `script-src`, `object-src`, `worker-src` accept only `'self'`, `'none'`, `'wasm-unsafe-eval'` (plus localhost sources for unpacked builds). Remote hosts and `'unsafe-eval'` make the manifest fail to load.
- Add `'wasm-unsafe-eval'` if the extension compiles WebAssembly.
- `sandbox` has no new restrictions; it applies only to pages listed under `"sandbox": { "pages": [...] }`.

## web_accessible_resources

```json
"web_accessible_resources": [
  { "resources": ["inject/*.js", "fonts/*.woff2"], "matches": ["https://app.example.com/*"] },
  { "resources": ["icons/*.png"], "matches": ["<all_urls>"], "use_dynamic_url": true },
  { "resources": ["shared.html"], "extension_ids": ["abcdefghijklmnopabcdefghijklmnop"] }
]
```

- `matches` uses origins only; any path other than `/*` is an "Invalid match pattern" error.
- Each entry needs `matches` and/or `extension_ids`. Narrow `matches` to the sites that actually load the file.
- `use_dynamic_url: true` serves the file from a per-session URL so pages cannot fingerprint the extension; fetch it via `chrome.runtime.getURL()`.
- DNR redirect targets inside the extension must be web accessible.

## Action (browser/page action)

```ts
// MV2
chrome.browserAction.setBadgeText({ text: "3" });
chrome.pageAction.show(tabId);

// MV3
await chrome.action.setBadgeText({ text: "3" });
await chrome.action.enable(tabId); // pageAction.show → enable; hide → disable
```

Page-action behavior (icon active only on matching pages): disable by default and enable via declarativeContent.

```ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable();
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({ pageUrl: { hostSuffix: "example.com" } })],
      actions: [new chrome.declarativeContent.ShowAction()],
    }]);
  });
});
```

Requires `"declarativeContent"` permission. Keyboard shortcut `_execute_browser_action`/`_execute_page_action` becomes `_execute_action` in `commands`.

## Script and CSS injection

```ts
// MV2
chrome.tabs.executeScript(tabId, { code: `document.title = "${title}"` });
chrome.tabs.insertCSS(tabId, { file: "style.css" });

// MV3 — pass a function plus serializable args instead of a code string
await chrome.scripting.executeScript({
  target: { tabId },
  func: (t: string) => { document.title = t; },
  args: [title],
});
await chrome.scripting.insertCSS({ target: { tabId }, files: ["style.css"] });
```

- Needs `"scripting"` and host permission or `activeTab`.
- `func` is serialized: it cannot close over variables from the service worker; pass them via `args`.
- `target` supports `frameIds`, `allFrames`, `documentIds`; `world: "MAIN"` runs in the page's JS context.
- Content scripts registered at runtime: `chrome.scripting.registerContentScripts` (persists across restarts by default).
- User-supplied script text (userscript managers) belongs in `chrome.userScripts`, not `executeScript`.

## chrome.extension.* and other removed APIs

| MV2 | MV3 |
|---|---|
| `extension.getURL()` | `runtime.getURL()` |
| `extension.getBackgroundPage()`, `runtime.getBackgroundPage()` | messaging (`runtime.sendMessage`/`connect`) |
| `extension.getExtensionTabs()` | `extension.getViews()` (never returns the service worker) |
| `extension.connect()` / `onConnect` / `onConnectExternal` | `runtime.connect()` / `onConnect` / `onConnectExternal` |
| `extension.sendMessage()`, `sendRequest()`, `tabs.sendRequest()` | `runtime.sendMessage()` / `tabs.sendMessage()` |
| `extension.onMessage`, `onRequest` / `onRequestExternal` | `runtime.onMessage` / `onMessageExternal` |
| `extension.sendNativeMessage()`, `connectNative()` | `runtime.sendNativeMessage()`, `connectNative()` |
| `extension.lastError` | promise rejection (`try/catch`) or `runtime.lastError` in callbacks |
| `tabs.getSelected()`, `tabs.getAllInWindow()` | `tabs.query({ active: true, currentWindow: true })` / `tabs.query({ windowId })` |
| `tabs.onActiveChanged`, `onSelectionChanged` / `onHighlightChanged` | `tabs.onActivated` / `onHighlighted` |
| `Tab.selected` | `Tab.highlighted` |
| `runtime.onSuspend` (cleanup) | persist state as you go; not reliable in a service worker |

## Remote code

Everything executable ships in the package: JS, Wasm, and code injected via `scripting`. Not allowed: `<script src="https://…">`, `import("https://…")`, `eval`, `new Function`, string `setTimeout`, injecting fetched code.

Replacements, in order of preference:
1. Install the library from npm and bundle it, or vendor the file into the package. Check for libraries that lazy-load chunks from a CDN (Firebase, some analytics/editor SDKs); configure the bundler to include those chunks or switch libraries.
2. Remote data is fine: fetch JSON config or feature flags and branch on it in bundled code.
3. Move logic to a server API the extension calls.
4. Code that truly needs `eval` (template engines, user formulas) runs in a sandboxed extension page (`"sandbox": { "pages": ["sandbox.html"] }`) embedded as an iframe and talked to via `postMessage`. Sandboxed pages have no `chrome.*` access.

Analytics: replace hosted gtag.js with the GA4 Measurement Protocol via `fetch`.
