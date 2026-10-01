# Extension Surfaces: Size, Behavior, Focus

Facts from developer.chrome.com (`action`, `sidePanel`, `commands`, `chrome_url_overrides` docs). Re-check those pages if a project targets an older Chrome than listed.

## Popup

- Chrome auto-sizes the popup to its content, clamped to **25×25 min, 800×600 max**. Anything taller scrolls inside the popup. Set the width explicitly or the popup shrinks to the widest child:

```css
html, body { margin: 0; }
body { width: 360px; min-height: 240px; max-height: 600px; }
.app { display: flex; flex-direction: column; max-height: 600px; }
.app > main { flex: 1; overflow-y: auto; }
```

- **Closes on blur** (click outside, switching tabs, opening an active tab, `window.close()`). Component state is lost each time. Persist drafts and UI state (selected tab, filters, scroll target) to `chrome.storage.session` (per browser session) or `chrome.storage.local`, and restore before first paint to avoid a flash of defaults.
- **Startup cost is visible on every click.** Render from cached storage first, fetch after paint, lazy-load heavy views. Avoid a loading screen as the first frame.
- **Focus**: the popup document receives focus when opened. If the popup has a primary input (search, quick add), give it `autofocus` or focus it in the mount effect so keyboard users opened via shortcut can type immediately. Don't auto-focus a destructive button.
- **Esc** closes the popup. Inline menus/dialogs in the popup still need a visible close control.
- `chrome.action.openPopup()` opens it programmatically (generally available from Chrome 127). `chrome.action.setPopup({ popup: '' })` disables it so `action.onClicked` fires instead.
- Inspect via right-click the action → Inspect; the popup stays open while its DevTools window is open, which hides blur bugs. Retest without DevTools.

## Side panel

- Extension cannot set the width; the user drags it. Chrome enforces a minimum (reported as 320 px, later 360 px; not stated in the docs). Design fluid: test at 320 px and ~600 px.
- Full window height; use a column flex layout with `height: 100vh`, sticky header, `overflow-y: auto` on the body.
- Users choose left or right placement; `chrome.sidePanel.getLayout()` (Chrome 140+) returns `{ side: 'left' | 'right' }` if edge-aligned elements should mirror.
- A **global** panel (from `side_panel.default_path` or `setOptions({ path })` without `tabId`) persists across tab switches, so the page must react to the active tab changing (`chrome.tabs.onActivated` / `onUpdated`) rather than reading the tab once on load. A **tab-specific** panel (`setOptions({ tabId, path, enabled })`) is a separate instance per tab and hides when the user switches away.
- Open behavior:

```ts
// service worker: toolbar icon toggles the panel (no popup)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// open on a user gesture: action click, command, context menu, or a click relayed from a page
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'open-panel' && sender.tab?.id !== undefined) {
    chrome.sidePanel.open({ tabId: sender.tab.id }); // call synchronously, before any await, to keep the gesture
  }
});
```

- `chrome.sidePanel.close({ tabId | windowId })` (Chrome 141+) closes it; `onOpened` (141+) and `onClosed` (142+) let the service worker track visibility instead of heartbeat messages.
- Requires the `"sidePanel"` permission (manifest changes: extension-manifest skill).

## Options page

- `options_ui.open_in_tab: false` embeds it in a box on `chrome://extensions` (narrow, with some behavior differences); `true` or `options_page` opens a full tab. Prefer a full tab once there are more than a handful of settings.
- Content column `max-width: 720px`, centered, 24 px padding, settings grouped with `<fieldset>`/`<legend>` or headed sections. Save on change with a quiet "Saved" status (`aria-live="polite"`) instead of a Save button, unless changes are expensive.
- Open from popup/side panel with `chrome.runtime.openOptionsPage()`.

## New tab override

- Loads on every new tab: no spinners, no remote-blocking render, paint from storage.
- The address bar takes keyboard focus first on a new tab; don't depend on the page having focus or on autofocusing an input.
- Provide a way back to the default experience (link or setting) and keep the page title meaningful; users see it in the tab strip.

## DevTools panel

- Created with `chrome.devtools.panels.create`; resizable and docked in different positions, so build a responsive layout down to ~300 px wide.
- Match DevTools theme via `chrome.devtools.panels.themeName` (`'default'` or `'dark'`) rather than `prefers-color-scheme`, which follows the OS.

## Keyboard shortcuts (`commands`)

- Declare in the manifest `commands`; at most **four** suggested shortcuts, each including `Ctrl` or `Alt` (not `Ctrl+Alt`; `Ctrl` becomes `Command` on macOS, use `MacCtrl` for the Control key). OS and Chrome shortcuts always win, and users remap at `chrome://extensions/shortcuts`.
- `_execute_action` opens the popup (or fires `action.onClicked`); it never reaches `commands.onCommand`.
- No reserved command opens the side panel: declare a normal command and call `chrome.sidePanel.open()` in `chrome.commands.onCommand` (a command counts as a user gesture).
- Show the real binding in UI with `chrome.commands.getAll()` (empty `shortcut` = unassigned) and offer a button that runs `chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })`; a plain link to `chrome://` URLs doesn't navigate.
- In-page shortcuts in content-script UI must not steal common page keys; scope listeners to your shadow root or require a modifier.
