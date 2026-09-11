# MV2 → MV3 Migration Checklist

## Phase 1: Update Manifest Version

- [ ] Set `"manifest_version": 3`
- [ ] Run extension; note all console errors
- [ ] Snapshot broken behavior for regression testing

**Test:** Extension loads without manifest parse errors.

---

## Phase 2: Convert Background to Service Worker

- [ ] Change `"background": { "scripts": [...] }` → `"background": { "service_worker": "bg.js" }`
- [ ] Remove `"persistent": true/false` key
- [ ] Replace `localStorage` → `chrome.storage.local`
- [ ] Replace `XMLHttpRequest` → `fetch`
- [ ] Move all event listeners to top-level (not inside callbacks)
- [ ] Replace `window.*` globals with `chrome.storage` or scoped variables
- [ ] Remove any `document.*` usage

**Test:** Background service worker registers, logs appear in SW DevTools.

---

## Phase 3: Replace Deprecated APIs

- [ ] `chrome.extension.getURL` → `chrome.runtime.getURL`
- [ ] `chrome.tabs.executeScript` → `chrome.scripting.executeScript`
- [ ] `chrome.tabs.insertCSS` → `chrome.scripting.insertCSS`
- [ ] `chrome.browserAction.*` → `chrome.action.*`
- [ ] `chrome.pageAction.*` → `chrome.action.*`
- [ ] Add `"scripting"` to permissions if using `chrome.scripting`

**Test:** All extension actions (popup, context menu, etc.) work correctly.

---

## Phase 4: Update Permissions Format

- [ ] Extract URL patterns from `permissions` → `host_permissions`
- [ ] Remove `"webRequestBlocking"` from permissions
- [ ] Add `"declarativeNetRequest"` if replacing webRequest
- [ ] Verify `"activeTab"` still works for on-click injection

**Test:** Extension requests correct permissions on install; no permission errors.

---

## Phase 5: Migrate web_accessible_resources

- [ ] Convert `"web_accessible_resources": ["file.js"]` → object array format
- [ ] Add `"matches"` to each resource group (use `"<all_urls>"` if truly universal)
- [ ] Restrict `matches` to only required origins

```json
"web_accessible_resources": [{
  "resources": ["images/*.png"],
  "matches": ["https://example.com/*"]
}]
```

**Test:** Content scripts can access `chrome.runtime.getURL()` resources.

---

## Phase 6: Replace webRequest with declarativeNetRequest

- [ ] Audit all `webRequest` listeners and document their logic
- [ ] Map each listener to a DNR rule type (block/allow/redirect/modifyHeaders)
- [ ] Create static rules JSON file for known, fixed rules
- [ ] Convert dynamic blocking logic to `updateDynamicRules` calls
- [ ] Remove `"webRequest"` and `"webRequestBlocking"` from permissions

**Test:** Network blocking/modification behavior matches MV2 behavior.

---

## Phase 7: Update CSP Format

- [ ] Convert string CSP → object format
- [ ] Apply `extension_pages` key for extension HTML pages
- [ ] Apply `sandbox` key for sandboxed pages (if used)
- [ ] Remove any `'unsafe-eval'` (not allowed in MV3)
- [ ] Remove any external script sources from CSP

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

**Test:** No CSP violations in DevTools console.

---

## Phase 8: Remove Remote Code Loading

- [ ] Audit all `<script src="...">` in HTML pages
- [ ] Download and bundle all CDN libraries locally
- [ ] Remove `eval()`, `new Function(string)`, `setTimeout(string)` usages
- [ ] Replace dynamic `import()` from remote URLs with local imports

**Test:** Extension loads all scripts locally; no external script requests.

---

## Phase 9: Test All Functionality

- [ ] Test on Chrome stable + Chrome beta
- [ ] Test popup UI
- [ ] Test content script injection
- [ ] Test background/service worker operations
- [ ] Test network request modifications (if applicable)
- [ ] Test alarm-based periodic tasks
- [ ] Test storage read/write
- [ ] Test extension update scenario (existing users migrating)
- [ ] Test on slow network / offline conditions
- [ ] Verify no regressions vs MV2 version

---

## Phase 10: Submit to Chrome Web Store

- [ ] Bump `version` in manifest
- [ ] Update store listing description if MV3 changes user-facing behavior
- [ ] Package extension (`zip` without `.git`, `node_modules`)
- [ ] Upload to Chrome Web Store Developer Dashboard
- [ ] Submit for review with MV3 migration notes

---

## Rollback Strategy

If critical bugs found post-publish:

1. Keep MV2 version in separate git branch (`mv2-stable`)
2. Revert via Chrome Web Store rollback (if available) or publish MV2 as hotfix
3. Set `minimum_chrome_version` in MV3 manifest to prevent rollout on unsupported versions

Quick smoke test: Load unpacked → check extensions page for errors → inspect SW console → verify content scripts → test popup → check network rules.
