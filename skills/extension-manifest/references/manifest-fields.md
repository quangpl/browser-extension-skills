# Manifest Fields and Validation (MV3)

Canonical reference: https://developer.chrome.com/docs/extensions/reference/manifest. Only constraints that commonly break loading, review, or updates are listed.

## Contents
- Identity fields
- Entry points
- Permissions-related fields
- Distribution fields
- Validation checklist
- Load errors and fixes

## Identity fields

| Field | Constraint |
|---|---|
| `manifest_version` | `3` |
| `name` | required, ≤ 75 chars; `__MSG_key__` with `default_locale` for i18n |
| `short_name` | ≤ 12 chars, used where space is tight |
| `version` | 1–4 dot-separated integers 0–65535, no leading zeros, not all zero (`1.2.0`). Semver suffixes like `-beta` are invalid; put them in `version_name`. Each CWS upload needs a higher `version`. |
| `description` | ≤ 132 chars, plain text; shown in `chrome://extensions` and CWS |
| `icons` | PNG; 128 required for CWS, also 16, 32, 48 |
| `default_locale` | required when `_locales/` exists; forbidden without it |

## Entry points

- `action`: `default_popup`, `default_title`, `default_icon`. Omit `default_popup` to receive `chrome.action.onClicked`.
- `background`: `{ "service_worker": "background.js", "type": "module" }`. One file; `type: "module"` enables static `import`. Firefox MV3 uses `background.scripts` instead; WXT emits the right key per browser.
- `content_scripts[]`: `matches` (required), `exclude_matches`, `js`, `css`, `run_at` (`document_idle` default, `document_start`, `document_end`), `all_frames`, `match_origin_as_fallback` (about:/data:/blob: frames), `world` (`"ISOLATED"` default or `"MAIN"`; MAIN has no extension APIs).
- `side_panel`: `{ "default_path": "sidepanel.html" }` with the `sidePanel` permission.
- `options_ui`: `{ "page": "options.html", "open_in_tab": false }` (embedded) or `options_page` for a full tab.
- `chrome_url_overrides`: one of `newtab`, `history`, `bookmarks`.
- `devtools_page`, `omnibox: { "keyword": "x" }`, `sandbox: { "pages": [...] }`.
- `commands`: at most 4 commands with `suggested_key`; `_execute_action` opens the popup/fires `onClicked`.

## Permissions-related fields

- `permissions` / `optional_permissions`: API permission strings only.
- `host_permissions` / `optional_host_permissions`: match patterns only. URLs inside `permissions` are an MV2 leftover; Chrome warns and ignores or rejects them.
- `web_accessible_resources`: array of objects.

  ```json
  [{ "resources": ["images/*", "inject.js"], "matches": ["https://*.example.com/*"], "use_dynamic_url": true }]
  ```

  Each entry needs `resources` plus `matches` or `extension_ids`. `matches` uses only the origin; a path other than `/*` is an "Invalid match pattern" error. `use_dynamic_url: true` exposes resources only through a per-session dynamic ID (`chrome.runtime.getURL()` returns it), which stops sites fingerprinting the extension by probing static URLs.
- `content_security_policy`: object `{ "extension_pages": "...", "sandbox": "..." }`. `extension_pages` cannot be looser than `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';` — remote script hosts and `'unsafe-eval'` fail at install. Relax only `sandbox` for pages that need eval.
- `externally_connectable`: `{ "matches": ["https://app.example.com/*"], "ids": ["<extension-id>"] }` lets those web pages/extensions message the extension. Omitted = all extensions, no web pages.
- `declarative_net_request.rule_resources[]`: `{ "id", "enabled", "path" }` per static ruleset.

## Distribution fields

- `minimum_chrome_version`: string (`"120"`). Older Chrome shows "Not compatible" in CWS; existing users on older Chrome silently stop receiving updates, so raise it only when an API you use requires it (sidePanel 114, userScripts 120, offscreen 109).
- `key`: base64 public key that pins the extension ID for unpacked builds (needed for stable OAuth redirect URIs, `externally_connectable`, server allowlists). Get it from CWS Developer Dashboard → Package → View public key (upload once without publishing), remove newlines, paste. Add it to dev builds only (WXT: `manifest: ({ command }) => (command === 'serve' ? { key } : {})`) and keep it out of CWS uploads, which may reject it; the store assigns the same ID. Never commit the `.pem` private key.
- `incognito`: `"spanning"` (default), `"split"`, or `"not_allowed"`.
- `oauth2`: `{ "client_id": "...", "scopes": [...] }` for `chrome.identity.getAuthToken`.
- `homepage_url`, `version_name`, `author`.

## Validation checklist

```
- [ ] JSON parses (no comments/trailing commas in manifest.json; WXT/Plasmo configs are TS/JSON)
- [ ] version is 1–4 integers; higher than the published version
- [ ] Every path (icons, popup, service worker, content scripts, rules, WAR) exists in the BUILT output
- [ ] No MV2 keys: browser_action, page_action, background.page/persistent, string CSP, string[] WAR
- [ ] Every permission maps to code (run scripts/audit-permissions.mjs); host patterns as narrow as the features allow
- [ ] content_scripts.matches and host_permissions narrowed together (both trigger host warnings)
- [ ] web_accessible_resources minimal; use_dynamic_url for resources injected into pages
- [ ] minimum_chrome_version matches the newest API used
- [ ] No remote code: no CDN <script>, no eval, no fetched JS executed
```

## Load errors and fixes

Load the build at `chrome://extensions` (Developer mode → Load unpacked) and read the error dialog plus the "Errors" button.

| Symptom | Cause | Fix |
|---|---|---|
| Manifest not valid JSON | comments/trailing commas | fix JSON, or move config to wxt.config / package.json |
| `background.scripts` / `browser_action` / `page_action` rejected | MV2 keys | `background.service_worker`, `action` |
| Insecure CSP value | remote host or `unsafe-eval` in `extension_pages` | bundle the code; move eval into a `sandbox` page |
| Invalid `web_accessible_resources` | string array or path in `matches` | object form; origin-only patterns ending `/*` |
| Permission unknown / pattern malformed | typo, URL in `permissions`, missing path | correct the name; move URL to `host_permissions` with `/*` |
| Could not load icon / file | path missing in build output | fix path relative to the build root |
| Service worker registration failed | top-level exception, wrong path, or `import` without `"type": "module"` | open the service worker console from the extension card; fix the error or path |
