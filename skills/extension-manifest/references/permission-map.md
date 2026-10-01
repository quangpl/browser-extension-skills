# API → Permission → Install Warning

Source of truth: https://developer.chrome.com/docs/extensions/reference/permissions-list (warning strings) and each API's reference page. Re-check there for APIs not listed here.

## Contents
- APIs that need no permission
- API permissions and their warnings
- Permissions that also need host access
- Host permission warnings
- Warning interactions and updates

## APIs that need no permission

`runtime` (except native messaging), `i18n`, `action`, `commands`, `windows`, `tabs` (create/update/remove/query/move/sendMessage, ids and status), `permissions`, `devtools.*` (needs `devtools_page`), `omnibox` (needs the `omnibox` manifest key), `dom`.

`tabs` objects expose `url`, `pendingUrl`, `title`, `favIconUrl` only when the extension has the `tabs` permission, host permission for that tab's URL, or `activeTab` for it.

## API permissions and their warnings

"—" = no install warning.

| Code uses | Declare | Install warning |
|---|---|---|
| `alarms` | `alarms` | — |
| `bookmarks` | `bookmarks` | Read and change your bookmarks |
| `browsingData` | `browsingData` | — |
| `contentSettings` | `contentSettings` | Change your settings that control websites' access to features such as cookies, JavaScript, plugins, geolocation, microphone, camera etc. |
| `contextMenus` (`browser.menus` in Firefox) | `contextMenus` | — |
| `cookies` | `cookies` + host permissions | host warning only |
| `debugger` | `debugger` | Access the page debugger backend; Read and change all your data on all websites |
| `declarativeContent` | `declarativeContent` | — |
| `declarativeNetRequest` | `declarativeNetRequest` | Block content on any page |
| `declarativeNetRequest` (no extra warning) | `declarativeNetRequestWithHostAccess` + host permissions | — (host warning only) |
| DNR debug (`getMatchedRules`, `onRuleMatchedDebug`) | `declarativeNetRequestFeedback` | Read your browsing history (unpacked only; ignored for CWS installs) |
| `desktopCapture` | `desktopCapture` | Capture content of your screen |
| `downloads` | `downloads` | Manage your downloads |
| `downloads.open()` / `downloads.setUiOptions()` | `downloads.open` / `downloads.ui` (plus `downloads`) | Manage your downloads |
| `_favicon/` URLs | `favicon` | Read the icons of the websites you visit |
| `navigator.geolocation` without prompt | `geolocation` | Detect your physical location |
| `gcm`, `instanceID` | `gcm` | — |
| `history` | `history` | Read and change your browsing history on all signed-in devices |
| `identity` (OAuth) | `identity` | — |
| `identity.getProfileUserInfo` email | `identity.email` | Know your email address |
| `idle` | `idle` | — |
| `management` (beyond self) | `management` | Manage your apps, extensions, and themes |
| `runtime.connectNative` / `sendNativeMessage` | `nativeMessaging` | Communicate with cooperating native applications |
| `notifications` | `notifications` | Display notifications |
| `offscreen` | `offscreen` | — |
| `pageCapture` | `pageCapture` | Read and change all your data on all websites |
| `power` | `power` | — |
| `privacy` | `privacy` | Change your privacy-related settings |
| `proxy` | `proxy` | Read and change all your data on all websites |
| `readingList` | `readingList` | Read and change entries in the reading list |
| `scripting` | `scripting` + host access | — |
| `search` | `search` | — |
| `sessions` | `sessions` | with `history`/`tabs`: their warning extended to "all your signed-in devices" |
| `sidePanel` | `sidePanel` | — |
| `storage` | `storage` | — |
| larger `storage.local`/IndexedDB/Cache/OPFS quota | `unlimitedStorage` | — |
| `system.cpu` / `system.memory` / `system.display` | same name | — |
| `system.storage` | `system.storage` | Identify and eject storage devices |
| `tabCapture` | `tabCapture` | Read and change all your data on all websites |
| `tabGroups` | `tabGroups` | View and manage your tab groups |
| privileged tab fields everywhere | `tabs` | Read your browsing history |
| `topSites` | `topSites` | Read a list of your most frequently visited websites |
| `tts` / `ttsEngine` | `tts` / `ttsEngine` | — / Read all text spoken using synthesized speech |
| `userScripts` | `userScripts` + host permissions | — (user must also enable a toggle, see strategies) |
| `webNavigation` | `webNavigation` | Read your browsing history |
| `webRequest` (observe) | `webRequest` + host permissions | host warning only |
| clipboard read (`navigator.clipboard.read*`, paste) | `clipboardRead` | Read data you copy and paste |
| clipboard write outside a user gesture | `clipboardWrite` | Modify data you copy and paste |

`webRequestBlocking` is MV3-only for policy-installed (enterprise) extensions; everyone else uses `declarativeNetRequest`.

## Permissions that also need host access

- `scripting.executeScript` / `insertCSS` / `removeCSS`: host permission for the tab, or `activeTab` after a gesture.
- `tabs.captureVisibleTab`: `<all_urls>` or `activeTab`.
- `cookies`, `webRequest`, `userScripts`: host permissions for the affected sites.
- `declarativeNetRequest`: `block`, `allow`, `allowAllRequests` work without host permissions; `redirect`, `upgradeScheme`, `modifyHeaders` need host access to the request URL (and initiator).
- `fetch()` from the service worker or extension pages to a third-party origin: host permission for that origin to bypass CORS (not needed when the server sends CORS headers allowing `chrome-extension://<id>`).
- Not needed: content scripts declared in the manifest (their `matches` act as the host grant), `chrome.debugger`.

## Host permission warnings

| Pattern (in `host_permissions` or `content_scripts.matches`) | Warning |
|---|---|
| `<all_urls>`, `*://*/*`, `https://*/*`, `http://*/*` | Read and change all your data on all websites |
| `https://example.com/*` or `https://*.example.com/*` | Read and change your data on example.com (or on all example.com sites) |
| Several hosts | Read and change your data on a number of websites (or the listed sites) |
| `optional_host_permissions` | none at install; prompt on `permissions.request` |

Match pattern rules (https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns): `<scheme>://<host>/<path>`; scheme `*` means http+https only; `*.example.com` covers subdomains and the bare domain; host wildcards must be leading (`*.`) and TLD wildcards (`google.*`) are unsupported; all ports match unless one is given; path is required for host permissions but ignored (`/*` by convention); `file:///*` also needs the user's "Allow access to file URLs" toggle. `<all_urls>` lengthens CWS review.

## Warning interactions and updates

- `tabs` adds no separate warning when `<all_urls>`-level host access is already requested.
- Adding a warning-triggering permission or new host pattern in an update disables the extension until the user accepts. Moving the new capability to `optional_*` avoids this.
- To see the exact dialog, pack the extension at `chrome://extensions` → Pack extension and drag the `.crx` in, or use the Extension Update Testing Tool (https://github.com/GoogleChromeLabs/extension-update-testing-tool) to preview update prompts.
