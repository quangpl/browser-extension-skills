# Network Request Migration: webRequest → declarativeNetRequest

## Core Concept

`webRequest` (blocking) → `declarativeNetRequest` (DNR)

DNR uses declarative rules evaluated by the browser — no JS callback per request.

## Permissions

```json
// MV2
"permissions": ["webRequest", "webRequestBlocking", "https://*/*"]

// MV3
"permissions": ["declarativeNetRequest"],
"host_permissions": ["https://*/*"]
// optional: "declarativeNetRequestFeedback" for rule match info
```

## Rule Format

```js
{
  "id": 1,                    // unique integer
  "priority": 1,              // higher = wins conflicts
  "action": { "type": "..." },
  "condition": {
    "urlFilter": "||ads.example.com",
    "resourceTypes": ["script", "image"],
    "initiatorDomains": ["mysite.com"]  // optional
  }
}
```

## Static Rules (manifest-declared)

```json
// manifest.json
"declarative_net_request": {
  "rule_resources": [{
    "id": "ruleset_1",
    "enabled": true,
    "path": "rules.json"
  }]
}
```

```json
// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||ads.example.com",
      "resourceTypes": ["script"]
    }
  }
]
```

## Dynamic Rules (runtime)

```js
// Block request
await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 1,
      priority: 1,
      action: { type: "block" },
      condition: { urlFilter: "*://ads.example.com/*" },
    },
  ],
});

// Remove rule
await chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1],
});
```

## Modifying Headers

```js
await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 2,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Origin", operation: "set", value: "https://example.com" },
        ],
        responseHeaders: [
          {
            header: "Access-Control-Allow-Origin",
            operation: "set",
            value: "*",
          },
        ],
      },
      condition: { urlFilter: "https://api.example.com/*" },
    },
  ],
});
```

## Redirect Rules

```js
// Static redirect
{ action: { type: "redirect", redirect: { url: "https://new.example.com/page" } } }

// Regex redirect
{
  action: {
    type: "redirect",
    redirect: { regexSubstitution: "https://new.example.com/\\1" }
  },
  condition: { regexFilter: "https://old.example.com/(.*)" }
}
```

## Allow Rules

```js
// Allowlist overrides block rules (higher priority)
{
  id: 10, priority: 2,
  action: { type: "allow" },
  condition: { urlFilter: "https://safe.example.com/*" }
}
```

## Rule Limits

| Limit                          | Value   |
| ------------------------------ | ------- |
| Max dynamic rules              | 30,000  |
| Max static rulesets            | 100     |
| Max enabled static rulesets    | 50      |
| Max static rules per extension | 300,000 |

## Migration Example: Block + Modify Headers

```js
// MV2 blocking → MV3 declarativeNetRequest
// Block: webRequest.onBeforeRequest → action: { type: "block" }
// Headers: webRequest.onHeadersReceived → action: { type: "modifyHeaders" }

chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 1,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: "||ads.example.com",
        resourceTypes: ["script", "image"],
      },
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          {
            header: "Access-Control-Allow-Origin",
            operation: "set",
            value: "*",
          },
        ],
      },
      condition: { urlFilter: "https://api.thirdparty.com/*" },
    },
  ],
});
```

> Use `declarativeNetRequestFeedback` + `onRuleMatchedDebug` for debugging only.
