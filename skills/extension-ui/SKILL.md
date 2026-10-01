---
name: extension-ui
description: "Designs and polishes Chrome extension UI: popup, side panel, options page, new tab, content-script overlays (Shadow DOM). Use when asked to build, restyle, fix layout of, add dark mode to, or make an extension UI look better. Not for feature logic or Chrome API wiring (use extension-dev) or icons (use extension-assets)."
license: MIT
metadata:
  author: quangpl
  version: "2.0.0"
---

# Extension UI

Build and polish the visible surfaces of a browser extension so they look deliberate, fit the browser's hard size limits, and stay usable in light/dark mode and by keyboard.

## Stack default

Match what the repo already uses; adding a second UI library to an existing extension is the most common way to bloat bundles and fork the visual language.

| Repo has | Use |
|---|---|
| A component library / design tokens already | Extend it. Add tokens, don't replace them |
| React, no UI library | Tailwind CSS v4 + shadcn/ui (copy-in components, Radix a11y) |
| Vue / Svelte / Solid, no UI library | Tailwind CSS v4 + hand-written components from the tokens below |
| No framework | Plain CSS with custom properties (tokens below), no build-time CSS framework |

Setup commands and token files: [design-system.md](references/design-system.md).

## Surface limits

| Surface | Hard facts that shape the design |
|---|---|
| Popup | Auto-sizes to content, clamped to 25×25–800×600 px. Set an explicit `body` width. Closes on blur, so the DOM is disposable: persist state to `chrome.storage` |
| Side panel | Width is set by the user (drag), not by the extension; Chrome enforces a minimum of roughly 320–360 px. Full window height, stays open across tabs. Can appear on the left or right |
| Options / new tab | Full tab. Constrain content width; new tab must paint instantly |
| Content-script UI | Lives inside someone else's page. Isolate with a Shadow DOM (or iframe); page CSS, `rem`, fonts and z-index all leak |

Per-surface layout, side panel APIs, focus, and commands: [surfaces.md](references/surfaces.md). Injected UI: [content-script-ui.md](references/content-script-ui.md).

## Design defaults

Frontier models drift toward generic SaaS dashboards. Use these concrete defaults unless the repo's design system says otherwise:

- **Width**: popup `360px` (range 320–400). Side panel fluid from 320 px up; test at 320 and 600.
- **Spacing**: 4 px scale: 4 / 8 / 12 / 16 / 24. Popup/side panel outer padding 12; gap between sections 16; inside a row 8.
- **Type** (system font stack, `system-ui`): 12 px meta, 13 px body in popup, 14 px body in side panel/options, 15–16 px/600 surface title. Line height 1.4. Two weights max (400, 600).
- **Controls**: 32 px tall in popup/side panel, 36 px on options; icon buttons 32×32 with 16 px icons; radius 6 (controls) / 8 (containers); 1 px borders, no shadows except overlays.
- **Color**: one accent (brand or `#1a73e8`), neutral grays, semantic red/amber/green only for status. Define light and dark tokens together; never ship light-only.
- **Structure**: header 40–44 px (16–20 px icon + name + one trailing action such as settings), scrollable body, optional sticky footer for the primary action. One primary button per view.
- **Avoid**: gradients and hero banners in a 360 px popup, cards nested in cards, emoji as icons, centered body text, more than one accent, placeholder lorem.
- **Motion**: 120–180 ms opacity/transform only, disabled under `prefers-reduced-motion`.

### States to always render

Every view that loads or depends on access ships all of these, each with one recovery action:

| State | Extension-specific trigger | Show |
|---|---|---|
| Loading | Waiting on storage/service worker/network | Skeleton in the final layout (delay ~150 ms to avoid flashing); render cached `chrome.storage` data first |
| Empty | No data yet | What will appear here + the first action |
| Error | Network/API/messaging failure | Plain cause + Retry; details in console, not UI |
| Permission needed | Host or optional permission not granted | Why it is needed + button that calls `chrome.permissions.request` |
| Unsupported page | Active tab is `chrome://`, the Chrome Web Store, or another page content scripts can't access | Explain and disable page actions instead of failing silently |
| Signed out / offline | When the extension has accounts or remote data | Sign-in or cached read-only view |

Copy patterns and a11y specifics for these states: [states-and-a11y.md](references/states-and-a11y.md).

## Workflow

```
- [ ] 1. Inspect: framework (WXT/Plasmo/CRXJS/vanilla), entrypoints, existing CSS/tokens/component library, screenshots of current UI
- [ ] 2. Pick stack per the table above; reuse existing tokens/components
- [ ] 3. Implement layout + tokens (light+dark) + all states for each surface touched
- [ ] 4. Build and load unpacked; screenshot each surface in light and dark at its real size
- [ ] 5. Fix what the screenshots show (overflow, clipping, contrast, focus ring, empty/error look); repeat 4–5
- [ ] 6. Keyboard pass: Tab through, Esc behavior, focus on open
```

1. **Inspect first.** Read `package.json`, `wxt.config.*` / Plasmo `package.json#manifest` / `manifest.json`, and the surface entrypoints (`entrypoints/popup/`, `popup.tsx`, `sidepanel/`, `options/`, content scripts). Note existing tokens, Tailwind config or `@theme`, and component folders. If the user only asked for review, report prioritized findings (with file:line) before editing.
2. **Implement** in the existing file layout. Put tokens in one shared CSS file imported by every extension page so popup, side panel and options match.
3. **Verify visually.** Run the dev or build command (`wxt` / `plasmo dev` / `vite build`), load the output dir via `chrome://extensions` → Developer mode → Load unpacked. If the harness has a browser tool, open `chrome-extension://<id>/popup.html` (or `sidepanel.html`, `options.html`) in a tab with the viewport set to the surface size (e.g. 360×600, 320×800) and capture screenshots with `prefers-color-scheme` light and dark. A tab is not identical to the real popup (no auto-sizing), so also check the real popup once if possible. Without a browser tool, state that the UI was not visually verified and list what to check.
4. **Iterate** until screenshots show no overflow at the minimum width, no unreadable contrast, visible focus, and every state renders.

## Gotchas

- Popup height is content-driven: an async render that starts empty makes the popup open tiny and then jump. Give the root a `min-height` that matches the loaded layout.
- `window.close()` closes the popup, and so does anything that moves focus away (e.g. `chrome.tabs.create({ active: true })`), so write state before navigating.
- Fonts: bundle `woff2` files in the extension. MV3's default CSP restricts scripts, not fonts, but remote fonts fail offline, flash on every popup open, and send a third-party request on each view. Prefer the system stack.
- Each surface evaluates `prefers-color-scheme` independently; content-script UI should follow the user's preference, not guess from the host page colors. Set `color-scheme: light dark` so scrollbars and form controls match.
- The service worker has no DOM/`matchMedia`; theme-dependent action icons need a page (popup/offscreen) to report the scheme.

## Output

- Edited/added UI source files, one shared token stylesheet, and any config changes (Tailwind/PostCSS) in the repo's existing layout.
- Final message: surfaces changed, design decisions (width, tokens, stack) in one short list, verification evidence (screenshots taken or exact manual checks remaining), and any feature logic gaps to hand to extension-dev.

## References

- [surfaces.md](references/surfaces.md): read when sizing/structuring popup, side panel, options, new tab or DevTools panel, wiring `chrome.sidePanel` open/close behavior, focus on open, or `commands` shortcuts.
- [content-script-ui.md](references/content-script-ui.md): read when injecting any UI into web pages (WXT `createShadowRootUi`/`createIntegratedUi`/`createIframeUi`, Plasmo CSUI, vanilla Shadow DOM), or fixing style leakage, `rem` scaling, fonts or z-index on host pages.
- [design-system.md](references/design-system.md): read when setting up tokens, Tailwind v4, shadcn/ui or daisyUI, or a dark-mode toggle with a stored override.
- [states-and-a11y.md](references/states-and-a11y.md): read when writing loading/empty/error/permission states, onboarding, or doing the accessibility pass.
