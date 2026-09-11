# MV2 → MV3 Breaking Changes

## 1. Background Pages → Service Workers

```json
// MV2
"background": { "scripts": ["background.js"], "persistent": false }

// MV3
"background": { "service_worker": "background.js" }
```

No DOM, no `window`, no `document`. Service worker terminates when idle.

## 2. browser_action / page_action → action

```json
// MV2
"browser_action": { "default_icon": "icon.png", "default_popup": "popup.html" }
"page_action": { "default_icon": "icon.png" }

// MV3
"action": { "default_icon": "icon.png", "default_popup": "popup.html" }
```

```js
// MV2
chrome.browserAction.onClicked.addListener(...)
chrome.pageAction.show(tabId)

// MV3
chrome.action.onClicked.addListener(...)
chrome.action.show(tabId)
```

## 3. webRequest Blocking → declarativeNetRequest

```js
// MV2
chrome.webRequest.onBeforeRequest.addListener(
  (details) => ({ cancel: true }),
  { urls: ["*://ads.example.com/*"] },
  ["blocking"],
);

// MV3
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 1,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: "*://ads.example.com/*",
        resourceTypes: ["main_frame"],
      },
    },
  ],
});
```

## 4. executeScript String → Function/Files

```js
// MV2
chrome.tabs.executeScript(tabId, {
  code: 'document.body.style.backgroundColor = "red"',
});

// MV3
chrome.scripting.executeScript({
  target: { tabId },
  func: () => {
    document.body.style.backgroundColor = "red";
  },
});
// or with file
chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
```

Add `scripting` to permissions in MV3.

## 5. Remote Code → Local Bundling

```html
<!-- MV2: allowed -->
<script src="https://cdn.example.com/library.js"></script>

<!-- MV3: NOT allowed, bundle locally -->
<script src="library.js"></script>
```

No CDN scripts, no `eval()`, no `new Function(string)`, no `setTimeout(string)`.

## 6. tabs.executeScript → scripting.executeScript

```js
// MV2
chrome.tabs.executeScript(tabId, { file: "content.js" }, callback);
chrome.tabs.insertCSS(tabId, { file: "style.css" });

// MV3
await chrome.scripting.executeScript({
  target: { tabId },
  files: ["content.js"],
});
await chrome.scripting.insertCSS({ target: { tabId }, files: ["style.css"] });
```

## 7. content_security_policy: String → Object

```json
// MV2
"content_security_policy": "script-src 'self'; object-src 'self'"

// MV3
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'",
  "sandbox": "sandbox allow-scripts; script-src 'self'"
}
```

## 8. web_accessible_resources: string[] → object[]

```json
// MV2
"web_accessible_resources": ["images/*.png", "fonts/*.woff2"]

// MV3
"web_accessible_resources": [
  {
    "resources": ["images/*.png", "fonts/*.woff2"],
    "matches": ["https://example.com/*"]
  },
  {
    "resources": ["icons/*.png"],
    "matches": ["<all_urls>"]
  }
]
```

## 9. Host Permissions Moved

```json
// MV2
"permissions": ["tabs", "storage", "https://api.example.com/*", "<all_urls>"]

// MV3
"permissions": ["tabs", "storage"],
"host_permissions": ["https://api.example.com/*", "<all_urls>"]
```

## 10. chrome.extension.getURL → chrome.runtime.getURL

```js
// MV2
const url = chrome.extension.getURL("images/icon.png");

// MV3
const url = chrome.runtime.getURL("images/icon.png");
```

`chrome.extension.getURL` still works but is deprecated. Migrate proactively.
