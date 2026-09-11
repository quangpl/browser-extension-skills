---
name: extension-ui
description: "Build polished Chrome extension UIs (popup/sidepanel/options). Analyze existing UI, suggest improvements, set up design systems, enforce a11y and UX best practices."
---

# Extension UI

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

Build professional, polished Chrome extension interfaces. Do NOT just explain — execute the workflow.

## Workflow (Execute This)

### Step 1: Detect context

1. Check framework: `package.json` → React / Vue / Svelte / Vanilla
2. Check existing UI files: popup, sidepanel, options, content scripts
3. Check if Tailwind / shadcn / DaisyUI already configured
4. Identify extension type: popup-only, sidepanel, full options page

### Step 2: Analyze existing UI

If UI files exist:

- Read component files for layout, spacing, color usage
- Check for dark mode support (`prefers-color-scheme` or `class="dark"`)
- Check accessibility: semantic HTML, aria-labels, focus management
- Check for Chrome design language alignment

Report findings: what's good, what needs improvement, priority fixes.

### Step 3: Recommend UI stack

| Framework       | Recommended Stack                             |
| --------------- | --------------------------------------------- |
| React           | shadcn/ui + Tailwind (best component quality) |
| React (minimal) | Tailwind only + custom compact theme          |
| Vue             | DaisyUI + Tailwind                            |
| Svelte          | Tailwind + svelte-headlessui                  |
| Vanilla         | Custom CSS with CSS variables                 |

### Step 4: Implement improvements

Apply fixes in priority order:

1. Dark mode support (critical — many users use dark mode)
2. Proper sizing constraints (see `references/extension-ui-constraints.md`)
3. Typography and spacing for small surfaces
4. Accessibility fixes (keyboard nav, aria, focus)
5. Loading/error/empty states
6. Animations (subtle, fast, purposeful)

---

## Extension UI Constraints (Summary)

| Surface           | Size           | Key Constraints                    |
| ----------------- | -------------- | ---------------------------------- |
| Popup             | max 800x600px  | Closes on outside click, no resize |
| Sidepanel         | 320-400px wide | Full height, persistent            |
| Options page      | Full tab       | Standard web page                  |
| Content script UI | Injected       | CSS isolation via shadow DOM       |

Full details: `references/extension-ui-constraints.md`

---

## Dark Mode (Required)

Always implement dark mode. Extensions live in both light/dark browser themes.

```css
/* CSS variables approach */
:root {
  --bg: #ffffff;
  --text: #111827;
  --border: #e5e7eb;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1f2937;
    --text: #f9fafb;
    --border: #374151;
  }
}
```

Store user preference override in `chrome.storage.sync`.

---

## Typography for Small Surfaces

- Base font: system font stack — no custom fonts (bundle size + render speed)
- Popup base size: 13-14px (readable without overflow)
- Line height: 1.4-1.5 (tighter than web default)
- Font weights: 400 (body), 500 (label), 600 (heading)

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

---

## Color Palette (Chrome-aligned)

- Primary: `#1a73e8` (Google Blue) or brand color
- Surface: `#ffffff` / `#1f2937` dark
- Border: `#dadce0` / `#374151` dark
- Text primary: `#202124` / `#f9fafb` dark
- Text secondary: `#5f6368` / `#9ca3af` dark
- Success: `#34a853`, Error: `#d93025`, Warning: `#fbbc04`

---

## Animations

- Duration: 100-200ms (popup feels instant)
- Easing: `ease-out` for entrances, `ease-in` for exits
- Avoid layout-triggering animations (`transform`, `opacity` only)
- Always respect `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
  }
}
```

---

## Accessibility Checklist (Quick)

- [ ] Tab order logical, all interactive elements reachable
- [ ] Icon-only buttons have `aria-label`
- [ ] Color contrast 4.5:1 minimum
- [ ] Focus visible (not just `:focus-visible` removed)
- [ ] Semantic HTML (`button` not `div`, `nav` for nav)

Full checklist: `references/accessibility-checklist.md`

---

## References

- `references/extension-ui-constraints.md` — Size limits, layout patterns per surface
- `references/design-system-setup.md` — shadcn/ui, DaisyUI, Tailwind setup
- `references/ux-patterns.md` — Loading, error, empty states, onboarding
- `references/accessibility-checklist.md` — Full a11y requirements and testing

## Related Skills

- `extension-create` — Scaffold new extension with framework choice
- `extension-analyze` — Analyze existing extension codebase
- `extension-assets` — Icons, images, asset optimization
