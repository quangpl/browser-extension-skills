# Permission Strategies

## Contents
- Host access decision order
- activeTab
- Optional permissions at runtime
- declarativeNetRequest variants
- userScripts
- Side panel and offscreen
- CWS justifications

## Host access decision order

Pick the first option that supports the feature:

1. No host access: popup/options/side panel UI, `storage`, messaging, `fetch` to your own API that sends CORS headers.
2. `activeTab`: acts on the current tab after a click on the action, a context-menu item, a `commands` shortcut, or an omnibox suggestion. No warning; access ends when the tab navigates or closes.
3. Static `host_permissions` / `content_scripts.matches` for the specific sites the extension is about.
4. `optional_host_permissions` for user-chosen sites (`"https://*/*"` lets the code request any https origin at runtime), requested per site.
5. All hosts (`<all_urls>` or `*://*/*`) only when the feature must run automatically on every page (ad/tracker blockers, page-wide accessibility tools). Expect longer CWS review and prepare a justification.

## activeTab

```json
{ "permissions": ["activeTab", "scripting"], "action": { "default_title": "Run on this page" } }
```

```ts
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
});
```

Opening the popup also grants `activeTab` for the current tab. It does not cover background tabs, automatic injection on page load, or tabs the user did not invoke the extension on.

## Optional permissions at runtime

```json
{
  "permissions": ["storage"],
  "optional_permissions": ["bookmarks"],
  "optional_host_permissions": ["https://*/*"]
}
```

```ts
// Must run inside a user gesture handler (button click in popup/options/side panel).
async function enableBookmarkSync(): Promise<boolean> {
  return chrome.permissions.request({ permissions: ['bookmarks'] });
}

async function enableSite(origin: string): Promise<boolean> {
  return chrome.permissions.request({ origins: [`${origin}/*`] }); // e.g. https://example.com/*
}

// Check before use: users can revoke optional grants at any time from the extension's details page.
const canSync = await chrome.permissions.contains({ permissions: ['bookmarks'] });

chrome.permissions.onRemoved.addListener(({ permissions = [], origins = [] }) => {
  // Disable the dependent feature in UI/state.
});
```

- Chrome only prompts if the request adds warnings the user has not already accepted.
- Optional permissions do not disable the extension on update, so put capabilities added in later versions there.
- Cannot be optional: `debugger`, `declarativeNetRequest`, `devtools`, `geolocation`, `mdns`, `proxy`, `tts`, `ttsEngine`, `wallpaper`.
- Release unused grants with `chrome.permissions.remove()` when the user turns the feature off.

## declarativeNetRequest variants

| Need | Declare |
|---|---|
| Block/allow by static or dynamic rules with no host warnings to manage | `declarativeNetRequest` (warning: "Block content on any page"; `block`/`allow`/`allowAllRequests` need no host permissions) |
| Already has host permissions, wants no extra warning | `declarativeNetRequestWithHostAccess` (no warning; every rule needs host access to the request URL) |
| `redirect`, `upgradeScheme`, `modifyHeaders` rules | either variant plus host permissions for the affected URLs |
| Debug matched rules while unpacked | `declarativeNetRequestFeedback` (remove before publishing; it adds a history warning) |
| Static rulesets | `"declarative_net_request": { "rule_resources": [{ "id": "rules", "enabled": true, "path": "rules.json" }] }` |

Both variants support static, dynamic, and session rules; the choice is only about which warning appears and when host access is required. Use `webRequest` (observe-only plus host permissions) when you need to read request details; blocking `webRequest` is limited to policy-installed extensions in MV3.

## userScripts

For extensions that run user-provided code (userscript managers). Declare `"permissions": ["userScripts"]` plus `host_permissions` for target sites; set `"minimum_chrome_version": "120"` or higher.

The user must enable a toggle before the API works:
- Chrome 138+: "Allow User Scripts" toggle on the extension's details page (`chrome://extensions/?id=<id>`). When off, `chrome.userScripts` is undefined.
- Older Chrome: Developer mode on `chrome://extensions`. When off, accessing the API throws.

Detect availability with the check Chrome recommends for all versions, and show onboarding instructions when it fails:

```ts
function userScriptsAvailable(): boolean {
  try {
    chrome.userScripts.getScripts(); // throws when the permission or toggle is off
    return true;
  } catch {
    return false;
  }
}
```

Use `userScripts` only for code the user supplies; code shipped with the extension belongs in content scripts or `scripting`.

## Side panel and offscreen

- Side panel: `"permissions": ["sidePanel"]` and `"side_panel": { "default_path": "sidepanel.html" }` (Chrome 114+). Open on action click with `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` in the service worker. WXT adds the permission automatically when a `sidepanel` entrypoint exists.
- Offscreen document: `"permissions": ["offscreen"]` (Chrome 109+), no manifest key. Create with `chrome.offscreen.createDocument({ url, reasons, justification })`; only `chrome.runtime` messaging is available inside. Clipboard writes from an offscreen document also need `clipboardWrite`.

## CWS justifications

The CWS dashboard Privacy tab asks for a justification per permission and for host permissions. Write one sentence per entry tying it to a user-visible feature ("`tabs`: shows the titles of open tabs in the tab switcher"). Broad hosts without an evident feature are a common rejection reason; the extension-review skill covers policy checks in depth.
