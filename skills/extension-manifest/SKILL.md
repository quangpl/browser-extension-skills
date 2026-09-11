---
name: extension-manifest
description: "Generate and validate manifest.json with optimal permissions for Chrome MV3 extensions. Analyzes code to determine minimum permissions. Use when: manifest, permissions, manifest.json."
---

# Extension Manifest & Permissions Generator

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

Generate the best `manifest.json` based on current extension implementation. Analyze code to determine minimum permissions following Chrome docs and best practices.

## Workflow

1. **Detect** framework: check for `wxt.config.ts`, `crxjs.config.ts`, or raw `manifest.json`
2. **Scan** the extension codebase for Chrome API usage
3. **Map** each API call to its required permission (see `references/api-permission-map.md`)
4. **Generate** manifest.json with minimum required permissions
5. **Validate** against Chrome docs and CWS policies
6. **Report** permission warnings users will see

> **CRXJS projects**: Manifest is auto-generated from code and `package.json`. Override via `crxjs.config.ts`. See https://docs.crxjs.com/

## Docs References

- Manifest reference: https://developer.chrome.com/docs/extensions/reference/manifest
- Permissions list: https://developer.chrome.com/docs/extensions/reference/permissions-list

## Quick Manifest Template

```json
{
  "manifest_version": 3,
  "name": "Extension Name",
  "version": "1.0.0",
  "description": "Brief description. Max 132 chars for CWS.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/icon16.png" }
  },
  "permissions": [],
  "host_permissions": [],
  "background": { "service_worker": "background.js", "type": "module" }
}
```

## Permission Analysis Steps

1. **Grep codebase** for `chrome.` API calls
2. **Map** each to permission using `references/api-permission-map.md`
3. **Prefer** `activeTab` over `tabs` + host_permissions when possible
4. **Use** optional permissions for non-essential features
5. **Check** warning text in `references/permission-warnings.md`

## Common Mistakes

| Error                                   | Fix                                                    |
| --------------------------------------- | ------------------------------------------------------ |
| `host_permissions` inside `permissions` | Move URLs to separate `host_permissions` array         |
| Using `<all_urls>`                      | Narrow to specific domain patterns                     |
| Missing `activeTab`                     | Add when only needing current tab on user click        |
| `tabs` permission overuse               | Only needed for tab URL/title; use `activeTab` instead |
| `content_security_policy` as string     | Must be object: `{ "extension_pages": "..." }`         |
| `web_accessible_resources` as string[]  | Use object with `resources` + `matches`                |

## Key MV3 Rules

1. `host_permissions` is separate from `permissions`
2. Service workers replace background pages (no DOM, no `window`)
3. `content_security_policy` is an object, not string
4. Remote code execution banned (no eval, no CDN scripts)
5. `web_accessible_resources` requires `matches` array
6. Use `chrome.scripting.executeScript()` not `tabs.executeScript()`

## References

- `references/manifest-fields-reference.md` - All manifest fields with types and examples
- `references/manifest-templates.md` - Ready-to-use templates (popup, content script, sidepanel, devtools)
- `references/manifest-validation-checklist.md` - Pre-submission validation
- `references/api-permission-map.md` - Chrome API → permission mapping
- `references/permission-warnings.md` - User-facing warning text per permission
- `references/permission-strategies.md` - Optional permissions, activeTab, escalation patterns

## Related Skills

- `extension-create` - Full project scaffolding
- `extension-analyze` - Security audit and best practices
