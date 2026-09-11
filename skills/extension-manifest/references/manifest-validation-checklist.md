# Manifest Validation Checklist

## Pre-Submission Checklist

### Required Fields

- [ ] `manifest_version` is `3` (not 2)
- [ ] `name` present, max 45 chars
- [ ] `version` present, valid semver dot-notation
- [ ] `description` present, max 132 chars, no keyword stuffing

### Icons

- [ ] `128x128` icon present (required for CWS)
- [ ] `48x48` icon present
- [ ] `16x16` icon present
- [ ] All icon files exist at declared paths
- [ ] Icons are PNG format

### Permissions

- [ ] Only permissions actually used in code are declared
- [ ] URL patterns in `host_permissions`, not `permissions`
- [ ] Use `activeTab` instead of `tabs` where possible
- [ ] `"<all_urls>"` / broad host permissions have written justification ready
- [ ] Optional permissions declared in `optional_permissions` if not always needed

### Background Service Worker

- [ ] Uses `service_worker` key, not `scripts` or `page`
- [ ] Service worker is event-driven (no persistent state assumption)
- [ ] No `XMLHttpRequest` in service worker (use `fetch`)
- [ ] Alarms used for scheduled tasks instead of `setInterval`

### Content Scripts

- [ ] `matches` patterns are as specific as possible
- [ ] No remote script injection
- [ ] CSS/JS files exist at declared paths
- [ ] `run_at` set to least-privileged timing needed

### Security

- [ ] No `eval()`, `new Function()`, or `innerHTML` with untrusted data
- [ ] No remotely hosted code (scripts loaded from CDN)
- [ ] `content_security_policy` not relaxed beyond defaults unless justified
- [ ] `web_accessible_resources` restricted to minimum required `matches`

---

## Common Validation Errors

| Error Message                                      | Cause                        | Fix                                               |
| -------------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| `'background.scripts' requires manifest_version 2` | MV2 field used               | Use `background.service_worker`                   |
| `'browser_action' requires manifest_version 2`     | MV2 field used               | Use `action`                                      |
| `Could not load manifest`                          | JSON syntax error            | Validate JSON (no trailing commas)                |
| `Required value is missing: version`               | No version field             | Add `"version": "1.0.0"`                          |
| `Invalid value for 'web_accessible_resources'`     | Array of strings (MV2 style) | Use array of objects with `resources` + `matches` |
| `'content_security_policy' must be an object`      | String value (MV2 style)     | Wrap in `{ "extension_pages": "..." }`            |
| `Permission 'host' is unknown`                     | URL in `permissions`         | Move to `host_permissions`                        |
| `Invalid host permission`                          | Bad URL pattern              | Check pattern syntax (must include path)          |

---

## Chrome Web Store Rejection Reasons

### Policy: Single Purpose

- Extension must have one narrow, easy-to-understand purpose
- Fix: Remove unrelated features; split into separate extensions if needed

### Policy: Permissions Justification

- Broad permissions (`tabs`, `<all_urls>`, `webRequest`) need written justification
- Prepare justification text: "This extension requires X because Y"
- `tabs`: only if you need URLs/titles of all tabs
- `<all_urls>`: only if feature must work on every site

### Policy: Remote Code Execution

- No loading scripts from external URLs
- No `eval()` with remote data
- Fix: Bundle all code; use `chrome.scripting.executeScript()` with local files

### Policy: Deceptive Behavior

- `name` and `description` must accurately reflect functionality
- No keyword stuffing in `description`
- Icons must not mimic other extensions or system UI

### Policy: Data Collection

- If collecting user data, privacy policy URL required in CWS dashboard
- Disclose data use in listing

---

## Host Permission Pattern Reference

```
https://*.example.com/*     - all subdomains of example.com
https://example.com/*       - only example.com (no subdomains)
https://*/path/*            - any host, specific path
<all_urls>                  - every URL (requires justification)
*://*/*                     - http and https, all hosts
```

**Pattern rules:**

- Must include scheme (`https://`, `http://`, or `*://`)
- Must include path (at minimum `/*`)
- `*.` matches any subdomain but not bare domain
