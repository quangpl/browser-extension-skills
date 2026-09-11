# Manifest Fields Reference (MV3)

## Required

| Field              | Type   | Description                | Example          |
| ------------------ | ------ | -------------------------- | ---------------- |
| `manifest_version` | number | Must be `3`                | `3`              |
| `name`             | string | Display name, max 45 chars | `"My Extension"` |
| `version`          | string | Semver dot-notation        | `"1.0.0"`        |

## Recommended

### `description`

- string, max 132 chars for CWS listing
- `"Blocks ads on all websites"`

### `icons`

- object, keys are pixel sizes as strings
- Include 16, 48, 128 for CWS; 32 for Windows taskbar

```json
{
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

### `action`

- Controls toolbar button; replaces MV2 `browser_action` and `page_action`

```json
{
  "default_popup": "popup.html",
  "default_title": "Click to open",
  "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png" }
}
```

### `permissions`

- array of strings; API permissions only (no URLs)
- `["storage", "activeTab", "scripting", "contextMenus"]`

### `host_permissions`

- array of URL match patterns; separated from `permissions` in MV3
- `["https://*.example.com/*", "https://api.service.com/v1/*"]`

### `background`

- Service worker; replaces MV2 background page/scripts

```json
{ "service_worker": "background.js", "type": "module" }
```

- `type: "module"` enables ES module imports

### `content_scripts`

- array of injection rules

```json
[
  {
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle",
    "all_frames": false,
    "exclude_matches": ["https://example.com/admin/*"]
  }
]
```

- `run_at` values: `document_start`, `document_end`, `document_idle` (default)

## Optional

### `options_page`

- string path; full-page options UI
- `"options.html"`

### `options_ui`

- object; embedded options in chrome://extensions

```json
{ "page": "options.html", "open_in_tab": false }
```

### `side_panel`

- object; requires `sidePanel` permission

```json
{ "default_path": "sidepanel.html" }
```

### `web_accessible_resources`

- array of objects; expose extension files to web pages

```json
[
  {
    "resources": ["images/*", "fonts/*.woff2"],
    "matches": ["https://*.example.com/*"]
  }
]
```

### `commands`

- keyboard shortcuts

```json
{
  "_execute_action": {
    "suggested_key": { "default": "Ctrl+Shift+Y" },
    "description": "Open popup"
  },
  "toggle-feature": {
    "suggested_key": { "default": "Ctrl+Shift+F" },
    "description": "Toggle"
  }
}
```

### `content_security_policy`

- object in MV3 (was string in MV2)

```json
{
  "extension_pages": "script-src 'self'; object-src 'self'",
  "sandbox": "sandbox allow-scripts; script-src 'self' 'unsafe-eval'"
}
```

### `externally_connectable`

- which websites/extensions can send messages

```json
{ "matches": ["https://*.example.com/*"] }
```

### `declarative_net_request`

- static rulesets for request blocking/modification

```json
{
  "rule_resources": [
    { "id": "ruleset1", "enabled": true, "path": "rules.json" }
  ]
}
```

### `devtools_page`

- string path to DevTools panel entry
- `"devtools.html"`

### `minimum_chrome_version`

- string; minimum Chrome version required
- `"116"`

### `offline_enabled`

- boolean; allow offline use
- `true`

### `short_name`

- string, max 12 chars; used when space is limited
- `"MyExt"`

### `default_locale`

- string; required if using `_locales/`
- `"en"`

### `homepage_url`

- string; extension homepage
- `"https://example.com/extension"`
