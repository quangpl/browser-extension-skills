# Accessibility Checklist for Chrome Extensions

## Keyboard Navigation

- [ ] All interactive elements reachable via Tab key
- [ ] Tab order matches visual reading order (top-left to bottom-right)
- [ ] Buttons activated with Enter and Space
- [ ] Links activated with Enter
- [ ] Escape closes modals, dropdowns, and popup (where applicable)
- [ ] Arrow keys navigate within menus, listboxes, and radio groups
- [ ] No keyboard traps (except intentional focus traps in modals)

**Focus trap for popup (optional but good for modal-like UX)**:

```ts
// Trap focus within popup container
const focusable = container.querySelectorAll<HTMLElement>(
  'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
);
// On Tab keydown: cycle within focusable elements
```

---

## Focus Management

- [ ] Auto-focus first interactive element when popup opens
- [ ] Focus returns to trigger element when modal closes
- [ ] Focus visible — never remove outline without replacement

```css
/* Replace default outline with custom, don't remove */
:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
  border-radius: 3px;
}
:focus:not(:focus-visible) {
  outline: none;
}
```

- [ ] Skip-to-content link for options page (full-page surfaces)

---

## Screen Reader Support

- [ ] Semantic HTML: `<button>` not `<div onClick>`, `<nav>`, `<main>`, `<header>`
- [ ] Icon-only buttons have `aria-label`

```tsx
<button aria-label="Close panel">
  <XIcon className="w-4 h-4" aria-hidden="true" />
</button>
```

- [ ] Images have `alt` text (decorative images: `alt=""`)
- [ ] Form inputs have associated `<label>` or `aria-label`
- [ ] Dynamic content updates announced via `aria-live`

```tsx
// Status announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>
```

- [ ] Loading states announced: `aria-busy="true"` on loading container
- [ ] Error messages linked to inputs via `aria-describedby`

```tsx
<input id="email" aria-describedby="email-error" aria-invalid={hasError} />
<p id="email-error" role="alert">{errorMessage}</p>
```

---

## Color Contrast

| Text type                         | Minimum ratio | Target |
| --------------------------------- | ------------- | ------ |
| Normal text (< 18px)              | 4.5:1         | 7:1    |
| Large text (>= 18px or 14px bold) | 3:1           | 4.5:1  |
| UI components / icons             | 3:1           | —      |
| Disabled elements                 | Exempt        | —      |

**Chrome-aligned palette passes AA**:

- `#202124` on `#ffffff`: 16.1:1
- `#5f6368` on `#ffffff`: 5.9:1 (passes AA, not AAA for small text)
- `#1a73e8` on `#ffffff`: 4.6:1

**Never convey information by color alone** — add icon or text label.

---

## Motion

- [ ] Respect `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] No auto-playing animations that last > 5 seconds without pause control
- [ ] Skeleton pulse animations exempt (subtle, non-distracting)

---

## Font Sizes

- [ ] Minimum 12px in popup (11px for secondary/meta text only)
- [ ] Minimum 14px in sidepanel and options page
- [ ] No text rendered smaller than 11px at any zoom level
- [ ] Line height minimum 1.4 for body text

---

## Touch Targets

- [ ] Minimum 32x32px for all interactive elements (Chrome extension runs on ChromeOS touch devices)
- [ ] Minimum 4px gap between adjacent touch targets

```css
/* Ensure minimum tap target */
.btn-icon {
  min-width: 32px;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

---

## Common Extension A11y Issues and Fixes

| Issue                                   | Fix                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `<div>` used as button                  | Replace with `<button>` or add `role="button" tabindex="0"` + keyboard handler |
| Icon buttons without label              | Add `aria-label="Description"`                                                 |
| Popup closes unexpectedly               | Don't close on Escape if user is typing in a field                             |
| No visible focus ring                   | Add `:focus-visible` styles                                                    |
| Status changes not announced            | Add `aria-live="polite"` region                                                |
| List without list semantics             | Use `<ul>/<li>` or `role="list"/"listitem"`                                    |
| Custom dropdown not keyboard-accessible | Use `<select>` or implement ARIA combobox pattern                              |

---

## Testing Tools

- **axe DevTools**: Chrome extension — right-click → Inspect → axe tab
- **Lighthouse**: DevTools → Lighthouse → Accessibility audit
- **Screen reader**: macOS VoiceOver (Cmd+F5), Windows NVDA (free)
- **Keyboard-only test**: unplug mouse, navigate entire UI with keyboard
- **Color contrast**: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) or DevTools color picker
