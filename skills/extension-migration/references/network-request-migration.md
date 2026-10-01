# Blocking webRequest → declarativeNetRequest (DNR)

## Contents
- Approach
- Permissions
- Choosing a ruleset type
- Rule limits
- Use-case mapping
- Rule examples
- What DNR cannot do
- Debugging

Sources: [Replace blocking web request listeners](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests), [chrome.declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest).

## Approach

Rewrite by use case, not call by call: list each blocking listener, write down what decision it makes and on which inputs, then express that decision as rules. Non-blocking `webRequest` listeners (logging, metrics, observing headers) keep working in MV3 with the `"webRequest"` permission and host permissions; only the `"blocking"` option and `webRequestBlocking` are gone (except for policy-installed extensions).

## Permissions

| Permission | Use when |
|---|---|
| `declarativeNetRequest` | Default. `block`, `allow`, `allowAllRequests`, `upgradeScheme` work without host permissions; shows an install warning |
| `declarativeNetRequestWithHostAccess` | Extension already has host permissions and you want no extra warning; every rule needs host access |
| `declarativeNetRequestFeedback` | Debugging matched rules in unpacked builds (`getMatchedRules`, `onRuleMatchedDebug`) |

`redirect` and `modifyHeaders` rules additionally need host permissions for the request URL and its initiator. Redirects to extension files need those files in `web_accessible_resources`.

## Choosing a ruleset type

| Type | Lives | Use for |
|---|---|---|
| Static (`declarative_net_request.rule_resources` JSON files) | Shipped in the package; enabled set survives restarts but resets on update | Fixed or large filter lists; toggle whole rulesets with `updateEnabledRulesets`, single rules with `updateStaticRules` |
| Dynamic (`updateDynamicRules`) | Persist across restarts and updates | User-configured block/allow lists, settings-driven rules |
| Session (`updateSessionRules`) | Cleared on browser restart and extension update | Temporary or per-tab rules (only session rules accept `tabIds`) |

```json
"declarative_net_request": {
  "rule_resources": [
    { "id": "ads", "enabled": true, "path": "rules/ads.json" },
    { "id": "strict", "enabled": false, "path": "rules/strict.json" }
  ]
}
```

Static rule errors are reported only when loading unpacked; packed builds silently ignore invalid rules.

## Rule limits

| Limit | Value | Constant |
|---|---|---|
| Static rulesets declared | 100 | `MAX_NUMBER_OF_STATIC_RULESETS` |
| Static rulesets enabled at once | 50 | `MAX_NUMBER_OF_ENABLED_STATIC_RULESETS` |
| Guaranteed enabled static rules | 30,000 (more from a shared global pool; check `getAvailableStaticRuleCount()`) | `GUARANTEED_MINIMUM_STATIC_RULES` |
| Disabled individual static rules | 5,000 | — |
| Dynamic rules (safe) | 30,000 | `MAX_NUMBER_OF_DYNAMIC_RULES` |
| Dynamic rules (unsafe, counted within the 30,000) | 5,000 | `MAX_NUMBER_OF_UNSAFE_DYNAMIC_RULES` |
| Session rules | 5,000 | `MAX_NUMBER_OF_SESSION_RULES` |
| Regex rules per type (static / dynamic) | 1,000 each; each compiled regex < 2 KB | `MAX_NUMBER_OF_REGEX_RULES` |

Safe rules are `block`, `allow`, `allowAllRequests`, `upgradeScheme`; `redirect` and `modifyHeaders` are unsafe. Read limits from the constants at runtime rather than hard-coding them. Validate regexes with `chrome.declarativeNetRequest.isRegexSupported()`.

## Use-case mapping

| MV2 blocking listener | DNR rule |
|---|---|
| `onBeforeRequest` → `{ cancel: true }` | `action: { type: "block" }` |
| `onBeforeRequest` → `{ redirectUrl }` | `redirect` with `url`, `extensionPath`, `regexSubstitution`, or `transform` |
| http → https upgrade | `upgradeScheme` |
| User allowlist / "pause on this site" | `allow` (single requests) or `allowAllRequests` on `main_frame`/`sub_frame` at higher priority than block rules |
| `onBeforeSendHeaders` editing `requestHeaders` | `modifyHeaders` with `requestHeaders: [{ header, operation: "set" \| "remove" \| "append", value }]` |
| `onHeadersReceived` editing `responseHeaders` (CSP, CORS, `X-Frame-Options`) | `modifyHeaders` with `responseHeaders` |
| Decision based on response headers | `condition.responseHeaders` / `excludedResponseHeaders` |
| Per-tab behavior | Session rules with `condition.tabIds` |
| Logic based on settings | Regenerate dynamic rules whenever settings change (`storage.onChanged`) |
| Large filter list (EasyList-style) | Convert at build time to static JSON rulesets, split into multiple rulesets |

`append` on request headers is limited to an allowlist (e.g. `accept`, `accept-language`, `cookie`, `user-agent`, `x-forwarded-for`); use `set` otherwise.

## Rule examples

```ts
const RULES: chrome.declarativeNetRequest.Rule[] = [
  { id: 1, priority: 1, action: { type: "block" },
    condition: { requestDomains: ["ads.example.com"], resourceTypes: ["script", "image", "xmlhttprequest"] } },
  { id: 2, priority: 1, action: { type: "redirect", redirect: { regexSubstitution: "https://new.example.com/\\1" } },
    condition: { regexFilter: "^https://old\\.example\\.com/(.*)", resourceTypes: ["main_frame"] } },
  { id: 3, priority: 1, action: { type: "modifyHeaders",
      requestHeaders: [{ header: "x-client", operation: "set", value: "my-ext" }] },
    condition: { urlFilter: "||api.example.com/", resourceTypes: ["xmlhttprequest"] } },
  { id: 10, priority: 2, action: { type: "allowAllRequests" },
    condition: { requestDomains: ["trusted.example.com"], resourceTypes: ["main_frame", "sub_frame"] } },
];

// Replace the whole dynamic set atomically to avoid duplicate-ID errors
const old = await chrome.declarativeNetRequest.getDynamicRules();
await chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: old.map((r) => r.id),
  addRules: RULES,
});
```

- Without `resourceTypes`/`excludedResourceTypes`, a rule matches every type except `main_frame`. Set them explicitly to match MV2 behavior.
- `||example.com/` anchors to the domain and its subdomains; bare `example.com` also matches query strings containing it. Prefer `requestDomains` for host matching.
- Same priority ties resolve `allow`/`allowAllRequests` > `block` > `upgradeScheme` > `redirect`.

## What DNR cannot do

Record each of these as an unresolved behavior difference with the chosen workaround:
- Read or change request/response bodies.
- Make async decisions per request (lookups against a server, prompting the user mid-request). Workaround: precompute rules and update them when data changes.
- Run arbitrary logic over full URL + headers + tab state together beyond what conditions express.
- Block requests handled by a page's own service worker or served from `CacheStorage`.
- Guarantee more than 30,000 enabled static rules; extra rules depend on the global pool shared with other extensions.

## Debugging

- Load unpacked with `declarativeNetRequestFeedback`, then log matches:
  `chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((i) => console.log(i.rule, i.request.url));`
- `chrome.declarativeNetRequest.testMatchOutcome({ url, type: "script", initiator })` checks a URL against the current rules (unpacked only).
- `setExtensionActionOptions({ displayActionCountAsBadgeText: true })` shows per-tab match counts on the action badge.
- Compare against the MV2 build: list the URLs it blocked/redirected and confirm the same outcome per URL.
