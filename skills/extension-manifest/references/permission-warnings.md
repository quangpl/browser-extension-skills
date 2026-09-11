# Permission Warnings

## Warning Text Users See at Install

Chrome shows these warnings during installation. Scary warnings cause abandonment.

| Permission                | Warning Shown to User                           |
| ------------------------- | ----------------------------------------------- |
| `<all_urls>` or `*://*/*` | "Read and change all your data on all websites" |
| `https://*.example.com/*` | "Read and change your data on example.com"      |
| `tabs`                    | "Read your browsing history"                    |
| `history`                 | "Read and change your browsing history"         |
| `bookmarks`               | "Read and change your bookmarks"                |
| `cookies` + host_perm     | "Read and change your data on [sites]"          |
| `clipboardRead`           | "Read data you copy and paste"                  |
| `geolocation`             | "Detect your physical location"                 |
| `management`              | "Manage your apps, extensions, and themes"      |
| `notifications`           | No warning shown                                |
| `storage`                 | No warning shown                                |
| `alarms`                  | No warning shown                                |
| `activeTab`               | No warning shown                                |
| `scripting` (alone)       | No warning shown                                |
| `contextMenus`            | No warning shown                                |
| `identity`                | No warning shown                                |
| `sidePanel`               | No warning shown                                |

## High-Risk Permissions (Avoid or Justify)

### "Read and change all your data on all websites"

Triggered by:

- `"<all_urls>"` in host_permissions
- `"*://*/*"` in host_permissions
- `"http://*/*"` + `"https://*/*"` combined

Alternatives:

- Use `activeTab` for on-click interactions
- Use specific host patterns: `"https://specific-site.com/*"`
- Move to `optional_host_permissions`, request at runtime

### "Read your browsing history"

Triggered by: `"tabs"` permission

Alternatives:

- Remove `"tabs"` if you only need tab id/index (not URL/title)
- Use `"activeTab"` if you only need current tab's URL on click
- Filter usage: call `chrome.tabs.query` without reading `.url` property

### "Read and change your browsing history"

Triggered by: `"history"` permission

Avoid unless core feature. Move to optional_permissions.

### "Read data you copy and paste"

Triggered by: `"clipboardRead"`

Use `navigator.clipboard.readText()` with user gesture instead (no permission needed in content scripts with activeTab).

## Chrome Web Store Review Implications

Permissions that trigger manual review or increased scrutiny:

- `<all_urls>` / broad host permissions → justify in store listing
- `webRequest` → must document network request interception
- `management` → rarely approved, strong justification needed
- `clipboardRead` → must demonstrate clear user benefit
- `history` → must be core feature, not ancillary

Store listing best practices:

- Match permission justification to actual feature description
- Broad permissions with no apparent use case = rejection or removal
- Privacy policy required if collecting user data

## How to Minimize Warning Count

1. Replace `<all_urls>` with specific domains where possible
2. Use `activeTab` instead of host_permissions for toolbar-click actions
3. Move permissions to `optional_permissions` — they show no install-time warning
4. Avoid `"tabs"` if you never read `.url` or `.title`
5. Use `declarativeNetRequest` instead of `webRequest` (fewer warnings, no host_perm needed for static rules)
6. Request `clipboardRead` optionally, only when user pastes into your UI

## Warning Count Impact on Installs

Extensions with 0 install-time warnings convert significantly better. Target:

- 0 host permission warnings (use activeTab)
- 0 browsing history warnings (avoid `tabs` if possible)
- Move everything else to optional
