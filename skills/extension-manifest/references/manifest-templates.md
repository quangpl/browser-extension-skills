# Manifest Templates (MV3)

## 1. Simple Popup Extension

Toolbar button opens a popup. No content script, no background logic.

```json
{
  "manifest_version": 3,
  "name": "Simple Popup",
  "version": "1.0.0",
  "description": "Click the toolbar button to open a popup.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Open Popup"
  },
  "permissions": ["storage"]
}
```

---

## 2. Content Script Extension

Injects JS/CSS into matching pages. Communicates with background via messages.

```json
{
  "manifest_version": 3,
  "name": "Content Script Extension",
  "version": "1.0.0",
  "description": "Modifies pages on example.com.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://*.example.com/*"],
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],
  "background": { "service_worker": "background.js", "type": "module" },
  "web_accessible_resources": [
    {
      "resources": ["images/*"],
      "matches": ["https://*.example.com/*"]
    }
  ]
}
```

---

## 3. Side Panel Extension

Opens a persistent side panel alongside the browser.

```json
{
  "manifest_version": 3,
  "name": "Side Panel Extension",
  "version": "1.0.0",
  "description": "Provides a persistent side panel for enhanced browsing.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "permissions": ["sidePanel", "storage", "activeTab"],
  "action": { "default_title": "Open Side Panel" },
  "side_panel": { "default_path": "sidepanel.html" },
  "background": { "service_worker": "background.js", "type": "module" }
}
```

Background registers the side panel:

```js
// background.js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

---

## 4. DevTools Extension

Adds a custom panel to Chrome DevTools.

```json
{
  "manifest_version": 3,
  "name": "DevTools Extension",
  "version": "1.0.0",
  "description": "Adds a custom panel to Chrome DevTools.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "devtools_page": "devtools.html",
  "permissions": ["storage"]
}
```

```html
<!-- devtools.html -->
<script src="devtools.js"></script>
```

```js
// devtools.js
chrome.devtools.panels.create("My Panel", "icons/icon16.png", "panel.html");
```

---

## 5. Extension with Optional Permissions

Requests sensitive permissions only when user explicitly needs them.

```json
{
  "manifest_version": 3,
  "name": "Optional Permissions Extension",
  "version": "1.0.0",
  "description": "Requests extra permissions only when needed.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": { "default_popup": "popup.html" },
  "permissions": ["storage"],
  "optional_permissions": ["tabs", "bookmarks"],
  "optional_host_permissions": ["https://*/*"]
}
```

```js
// Request at runtime (must be triggered by user gesture)
async function requestOptionalPermissions() {
  const granted = await chrome.permissions.request({
    permissions: ["tabs"],
    origins: ["https://*/*"],
  });
  return granted;
}
```
