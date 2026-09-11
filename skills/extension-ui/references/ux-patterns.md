# UX Patterns for Chrome Extensions

## Core Principle

Popup should be **useful in < 2 seconds**. Users open extensions with intent — deliver value immediately.

---

## First Impression

- Show primary action or status on open — no loading screens if avoidable
- Use `chrome.storage` to cache last state and render immediately
- Defer API calls until after first paint
- Primary CTA should be above the fold, no scrolling required

---

## Progressive Disclosure

Show essentials first, details on demand:

- Level 1: Status + primary action (always visible)
- Level 2: Secondary actions (visible but not dominant)
- Level 3: Settings / advanced (behind icon or link)

Avoid cramming everything into popup — link to options page for complex config.

---

## Empty States

Do NOT show "No items found." — be helpful and actionable:

```
"No bookmarks yet.
Browse any page and click the + button to save it."
[Browse now →]
```

Rules:

- Explain what will appear here
- Give a clear first action
- Include visual (icon or illustration if space allows)

---

## Loading States

Use skeleton UI, not spinners, for content that loads quickly (< 1s):

```tsx
// Skeleton for a list item
<div className="animate-pulse flex gap-2 p-2">
  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
  <div className="flex-1 space-y-1.5">
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
  </div>
</div>
```

Use spinner only for actions (button submit, explicit user-triggered requests).

---

## Error States

Always provide: what went wrong + what to do next.

```
"Couldn't connect to the server.
Check your connection and try again."
[Retry]  [Open Settings]
```

Rules:

- Friendly language, no stack traces to user
- Offer a clear recovery action
- For auth errors → link to login/reconnect
- For permission errors → explain what permission is needed and why

---

## Onboarding

Keep to 1-3 steps max. Always skippable.

```
Step 1/3: Pin the extension for quick access
[Show me how]  [Skip]
```

Rules:

- One action per step
- Show visual context (screenshot or animation)
- Store completion in `chrome.storage.sync` (persists across devices)
- Don't block use — onboarding should feel optional, not gated

---

## Settings Layout

- **Inline settings**: toggles and simple prefs directly in popup footer or sidepanel
- **Options page**: for 5+ settings, grouped configs, advanced options
- Link from popup: small gear icon → `chrome.runtime.openOptionsPage()`

Group settings logically:

```
Appearance: [Dark mode toggle] [Compact mode toggle]
Behavior:   [Auto-open on startup] [Show notifications]
Account:    [Connected as user@email.com] [Sign out]
```

---

## Status Indicators

**Badge on extension icon** (most prominent):

```js
chrome.action.setBadgeText({ text: "3" }); // count
chrome.action.setBadgeText({ text: "●" }); // dot indicator
chrome.action.setBadgeBackgroundColor({ color: "#d93025" }); // red for error
```

**Status bar in popup** (compact, 32-40px footer):

```tsx
<footer className="flex items-center gap-2 px-3 py-2 border-t text-xs text-gray-500">
  <span className="w-2 h-2 rounded-full bg-green-500" />
  Connected · Last synced 2m ago
</footer>
```

---

## Permission Requests

Never cold-ask for permissions. Explain context first:

```
"To save your reading list across devices,
My Extension needs access to Chrome Storage."
[Enable sync →]  [Skip for now]
```

Rules: request at point of need, one at a time, use `chrome.permissions.request()`, provide value even if declined.

## Notifications & Shortcuts

- **Notifications**: Sparse, valuable, actionable. Let users control frequency.
- **Keyboard shortcuts**: Register via `commands` in manifest. Show in UI with link to `chrome://extensions/shortcuts`.
