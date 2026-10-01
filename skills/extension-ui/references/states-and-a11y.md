# UX States, Onboarding, Accessibility

## First frame

Popups and new tab pages are opened with intent and judged in the first ~100 ms.

1. Render the last known data from `chrome.storage` (cache it whenever it changes).
2. Show skeletons only for parts with no cache, after a ~150 ms delay, in the final layout dimensions.
3. Refresh in the background; update in place without moving the primary action.

## State copy

Short, specific, one recovery action. Keep technical details in the console.

| State | Example |
|---|---|
| Empty | "No saved pages yet. Click **Save page** on any site to add it." [Save this page] |
| Error | "Couldn't reach the server. Your saved items are still here." [Retry] |
| Permission needed | "To highlight terms on example.com, allow access to this site." [Allow access] |
| Unsupported page | "Extensions can't run on Chrome settings or Web Store pages. Open a regular website to use this." (page actions disabled, not hidden) |
| Signed out | "Sign in to sync across devices." [Sign in] plus whatever works signed out |

## Permission-denied handling

- Users can withhold or revoke host access at any time (site access: on click / on specific sites / on all sites), so check rather than assume: `await chrome.permissions.contains({ origins: [new URL(tab.url).origin + '/*'] })`.
- `activeTab` grants access to the current tab only after the user invokes the extension (action click, command, context menu); a side panel that stays open across tabs doesn't get it for new tabs.
- `chrome.permissions.request()` must run directly in a click handler (user gesture). The popup can close while the permission prompt is showing, so also react to `chrome.permissions.onAdded` in the service worker or on next open.
- Pages where content scripts never run: `chrome://`, `chrome-extension://` of other extensions, the Chrome Web Store, `view-source:`, and `file://` unless the user enabled "Allow access to file URLs" (`chrome.extension.isAllowedFileSchemeAccess()`). Detect from the URL or a failed `chrome.scripting.executeScript` and show the unsupported state.

## Onboarding

- On `chrome.runtime.onInstalled` with `reason === 'install'`, open a welcome tab (full page, not the popup) with at most three steps, all skippable.
- Pinning: `chrome.action.getUserSettings()` returns `{ isOnToolbar }`; show a pin hint only while it is `false`.
- Store completion in `chrome.storage.sync` so it doesn't repeat on other devices. Never gate the core feature behind onboarding.

## Status outside the UI

- Badge: `chrome.action.setBadgeText({ text, tabId? })` fits ~4 characters; use a count or a single symbol. Set both `setBadgeBackgroundColor` and `setBadgeTextColor` for contrast.
- `chrome.action.setTitle` doubles as the accessible name/tooltip of the toolbar button; keep it descriptive and current ("3 unread – MyExt").

## Localization

- Strings via `chrome.i18n.getMessage` / `_locales/*/messages.json`. Allow ~35% text expansion in a 360 px popup: wrap labels, never fixed-width buttons with truncated text.
- RTL locales: set `dir` from `chrome.i18n.getMessage('@@bidi_dir')` on `<html>` and use logical CSS properties (`margin-inline-start`, `padding-inline`).

## Accessibility pass (extension-specific)

- **Focus on open**: popup/side panel/injected panel focuses its primary input or heading; injected UI returns focus to the page's previously focused element on close.
- **Keyboard**: everything reachable by Tab in visual order; Esc closes injected overlays and in-panel menus; custom shortcuts discoverable (show the real binding from `chrome.commands.getAll()`).
- **Names**: icon-only buttons have `aria-label`; decorative icons `aria-hidden="true"`; the surface has one `<h1>` (visually hidden is fine) so screen readers announce what opened.
- **Async results**: a polite live region (`role="status"`) for "Saved", "Copied", sync results; `role="alert"` only for errors that block the task.
- **Contrast**: check both color schemes; dark mode is where muted text and accent-on-surface usually fail. Information never by color alone (status dot + label).
- **Targets**: 32×32 px minimum hit area in compact surfaces, even with 16 px icons.
- **Injected UI**: the shadow host is invisible to the page's landmark structure; give overlays `role="dialog"` + `aria-modal="true"` + `aria-labelledby` when they block the page, or `role="complementary"` with a label for drawers.

## Testing

- Open the surface as a tab (`chrome-extension://<id>/popup.html`), then DevTools → Lighthouse → Accessibility, or run axe-core in the page. For automated runs, the extension-test skill covers Playwright with a loaded extension.
- Keyboard-only run through each state (empty, error, permission needed) as well as the happy path.
- Screen reader smoke test: VoiceOver (macOS, Cmd+F5) or NVDA (Windows) announces the surface title and primary action on open.
