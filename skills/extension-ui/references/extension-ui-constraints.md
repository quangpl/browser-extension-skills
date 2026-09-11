# Extension UI Constraints

## Popup

- **Size**: max 800x600px; Chrome enforces hard limits
- **Behavior**: closes when user clicks outside — no persistent state in DOM
- **No resize**: fixed size set by CSS on `body` or root element
- **Startup time matters**: keep bundle small, lazy-load heavy components

```css
/* popup.css — set explicit size */
body {
  width: 360px;
  min-height: 480px;
  max-height: 580px;
  overflow: hidden;
}
```

**Layout pattern**: vertical stack — header (40px) + scrollable content + footer (48px)

**Font sizes**: 13-14px base, 11-12px secondary, 16-18px headings

**Spacing**: 8px / 12px / 16px increments (compact, not web-spacious)

**Performance**: avoid heavy JS on open; use `chrome.storage` not API calls for initial render

---

## Sidepanel

- **Width**: 320-400px (browser sets minimum ~320px, max varies by OS)
- **Height**: full browser window height, dynamic
- **Persistent**: stays open while user browses — maintain state
- **Scrollable**: content should scroll, use `overflow-y: auto` on content area

```css
/* sidepanel root */
html,
body {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
.panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
```

**Layout pattern**: sticky header + scrollable content area + optional sticky footer

**Font sizes**: 13-14px base (more space than popup, don't go bigger than web)

**Spacing**: 12px / 16px increments (slightly more spacious than popup)

---

## Options Page

- **Size**: full browser tab — standard web page constraints
- **Max content width**: 680-800px centered (don't go full 100% width)
- **Behavior**: standard page navigation, can use `chrome.tabs.create`

```css
.options-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}
```

**Layout pattern**: sidebar nav + main content (desktop), stacked (mobile if needed)

**Font sizes**: 14-16px base — normal web sizing

**Sections**: group settings logically, use `<fieldset>` + `<legend>` for form groups

---

## Content Script UI (Injected)

- **CSS isolation**: ALWAYS use Shadow DOM — host page styles will break your UI

```js
const host = document.createElement("div");
const shadow = host.attachShadow({ mode: "closed" });
// Inject your styles and components into shadow root
```

- **Z-index**: use high values (99999+) to stay above host page elements
- **Positioning**: `position: fixed` for overlays, `position: absolute` for inline
- **Font**: inherit nothing — set explicitly inside shadow DOM
- **Avoid**: `!important` wars with host page CSS (shadow DOM prevents this)

**Common patterns**: floating action button, tooltip overlay, sidebar drawer, modal overlay

---

## DevTools Panel

- **Size**: fills DevTools panel area — resizable by user
- **Behavior**: like a mini web app, persists while DevTools open
- **Layout**: standard responsive layout, similar to options page

---

## New Tab Override

- **Size**: full browser window (100vw × 100vh)
- **Behavior**: replaces new tab — must load fast (users notice slow new tab)
- **Layout**: centered content, full-bleed backgrounds work well

---

## Performance Rules (All Surfaces)

| Rule                                         | Why                              |
| -------------------------------------------- | -------------------------------- |
| No heavy animations in popup                 | Visible on open, janky if slow   |
| Minimize DOM nodes                           | Faster render, lower memory      |
| Use `chrome.storage` for instant data        | Avoid async wait on first render |
| Lazy-load non-critical components            | Faster initial render            |
| Prefer CSS transitions over JS animations    | GPU-composited, smoother         |
| Avoid layout thrash (batch DOM reads/writes) | Prevents jank                    |
