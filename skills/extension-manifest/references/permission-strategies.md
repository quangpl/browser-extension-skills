# Permission Strategies

## Principle of Least Privilege

Start with zero permissions. Add only what each feature requires.

Checklist:

- [ ] Every permission maps to a specific feature
- [ ] No permission declared "just in case"
- [ ] Host permissions scoped to minimum required domains
- [ ] Non-launch permissions moved to optional
- [ ] `activeTab` used instead of host_permissions where possible

## activeTab Pattern (Preferred)

Grants temporary access to the active tab when user invokes extension. No install warning.

```json
// manifest.json
{
  "permissions": ["activeTab", "scripting"],
  "action": { "default_title": "Run on this page" }
}
```

```js
// background.js - triggered by toolbar click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      /* runs in page context */
    },
  });
});
```

Works for: toolbar clicks, context menu clicks, keyboard shortcuts.
Does NOT work for: automatic execution, background tab access.

## Optional Permissions Pattern

Declare in manifest, request at runtime when user enables a feature.

```json
{ "permissions": ["storage"], "optional_permissions": ["bookmarks", "history"] }
```

```js
// Request on demand
const granted = await chrome.permissions.request({
  permissions: ["bookmarks"],
});

// Check before use
const has = await chrome.permissions.contains({ permissions: ["bookmarks"] });
if (!has) return;

// Remove when feature disabled
await chrome.permissions.remove({ permissions: ["bookmarks"] });
```

## Host Permissions: Scoping Strategy

```
Most permissive (avoid):  "<all_urls>"
                          "*://*/*"

Scoped to protocol:       "https://*/*"

Scoped to domain:         "https://*.example.com/*"
                          "https://example.com/*"

Least permissive:         "https://example.com/api/*"
```

Decision tree:

1. Does the extension work on any site the user visits? → `activeTab` first
2. Specific sites only? → list exact domains
3. User-configurable sites? → `optional_host_permissions` + runtime request
4. Truly all sites required? → `"*://*/*"`, justify in store listing

## Permission Escalation Flow

```
Install → minimal permissions (no warnings)
    ↓ user enables feature
Request optional permission at runtime
    ↓ granted
Feature unlocked → remove on disable (good UX)
```

```js
// Map features to required permissions
const FEATURE_PERMISSIONS = {
  "sync-bookmarks": { permissions: ["bookmarks"] },
  "block-trackers": {
    permissions: ["declarativeNetRequestWithHostAccess"],
    origins: ["*://*/*"],
  },
};

async function enableFeature(name) {
  const config = FEATURE_PERMISSIONS[name];
  if (!config) return false;
  const has = await chrome.permissions.contains(config);
  if (has) return true;
  return chrome.permissions.request(config); // must be in user gesture
}
```

## declarativeNetRequest vs webRequest

Prefer `declarativeNetRequest` (MV3 standard):

```json
// manifest.json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{ "id": "rules", "enabled": true, "path": "rules.json" }]
  }
}
```

Use `webRequest` only when you need to:

- Read request/response body content
- Make dynamic decisions based on response data
- Modify headers dynamically based on complex logic

`webRequest` requires host_permissions; `declarativeNetRequest` static rules do not.

## Manifest Audit Checklist

Before publishing:

1. Remove any permission not used in code (search codebase for `chrome.X`)
2. Replace `<all_urls>` with specific domains if possible
3. Move any permission used in <5% of sessions to optional
4. Test extension works at install with zero optional permissions granted
5. Verify each permission maps to store listing feature description
