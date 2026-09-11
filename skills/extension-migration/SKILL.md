---
name: extension-migration
description: "Migrate Chrome extensions from MV2 to MV3. Service workers, declarativeNetRequest, API replacements. Use when: migrate, mv2, mv3, manifest v2."
---

# Extension Migration (MV2 → MV3)

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

Official migration guide: https://developer.chrome.com/docs/extensions/develop/migrate

> **Consider framework adoption**: When migrating MV2→MV3, consider adopting [WXT](https://wxt.dev/) or [CRXJS](https://docs.crxjs.com/) for built-in MV3 support, auto-manifest generation, and modern tooling.

## Workflow Overview

1. Audit existing MV2 extension (APIs, permissions, background scripts)
2. Update `manifest_version` to 3
3. Convert background page → service worker
4. Replace deprecated APIs (see Quick Reference below)
5. Update permissions, CSP, web_accessible_resources format
6. Migrate webRequest → declarativeNetRequest (if blocking)
7. Bundle any remote code locally
8. Test all functionality across Chrome versions
9. Submit to Chrome Web Store

## Key Breaking Changes

| Area               | MV2                              | MV3                                     |
| ------------------ | -------------------------------- | --------------------------------------- |
| Background         | `background.scripts/page`        | `background.service_worker`             |
| Browser action     | `browser_action` / `page_action` | `action`                                |
| Network blocking   | `webRequest` (blocking)          | `declarativeNetRequest`                 |
| Script injection   | `tabs.executeScript(string)`     | `scripting.executeScript({func/files})` |
| Remote code        | CDN scripts allowed              | Must bundle locally                     |
| CSP                | String value                     | Object `{extension_pages: "..."}`       |
| Web accessible     | `string[]`                       | `object[]` with `matches` field         |
| Host permissions   | In `permissions` array           | Separate `host_permissions` array       |
| URL helper         | `chrome.extension.getURL`        | `chrome.runtime.getURL`                 |
| Persistent storage | `localStorage`                   | `chrome.storage.local`                  |

## Migration Priority Checklist

- [ ] `manifest_version: 3` set
- [ ] Background converted to service worker
- [ ] `localStorage`/`sessionStorage` → `chrome.storage.*`
- [ ] `XMLHttpRequest` → `fetch`
- [ ] `setInterval`/`setTimeout` → `chrome.alarms`
- [ ] `browser_action`/`page_action` → `action`
- [ ] `tabs.executeScript` → `scripting.executeScript`
- [ ] `chrome.extension.getURL` → `chrome.runtime.getURL`
- [ ] `permissions` host entries → `host_permissions`
- [ ] `web_accessible_resources` updated to object format
- [ ] `content_security_policy` updated to object format
- [ ] No remote code (CDN scripts, `eval`, string `Function()`)
- [ ] `webRequest` blocking → `declarativeNetRequest` (if used)

## Quick Reference: MV2 → MV3 API Map

```
chrome.extension.getURL()        → chrome.runtime.getURL()
chrome.extension.getBackgroundPage() → chrome.runtime.getBackgroundPage() [deprecated, use messaging]
chrome.tabs.executeScript()      → chrome.scripting.executeScript()
chrome.tabs.insertCSS()          → chrome.scripting.insertCSS()
chrome.browserAction.*           → chrome.action.*
chrome.pageAction.*              → chrome.action.*
webRequest (blocking)            → declarativeNetRequest
localStorage                     → chrome.storage.local
XMLHttpRequest                   → fetch()
setInterval (background)         → chrome.alarms
document/window (background)     → NOT available in service worker
```

## Manifest Diff

```json
// MV2
{
  "manifest_version": 2,
  "background": { "scripts": ["bg.js"], "persistent": false },
  "browser_action": { "default_icon": "icon.png" },
  "permissions": ["webRequest", "webRequestBlocking", "https://example.com/*"],
  "content_security_policy": "script-src 'self'; object-src 'self'",
  "web_accessible_resources": ["images/*.png"]
}

// MV3
{
  "manifest_version": 3,
  "background": { "service_worker": "bg.js" },
  "action": { "default_icon": "icon.png" },
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["https://example.com/*"],
  "content_security_policy": { "extension_pages": "script-src 'self'; object-src 'self'" },
  "web_accessible_resources": [{ "resources": ["images/*.png"], "matches": ["<all_urls>"] }]
}
```

## Reference Files

- [Breaking Changes](references/breaking-changes.md) — all changes with before/after code
- [Service Worker Migration](references/service-worker-migration.md) — background → SW guide
- [Network Request Migration](references/network-request-migration.md) — webRequest → declarativeNetRequest
- [Migration Checklist](references/migration-checklist.md) — step-by-step checklist with testing

## Related Skills

- `extension-manifest` - MV3 manifest generation
- `extension-testing` - Testing after migration
- `extension-security` - Security audit post-migration
