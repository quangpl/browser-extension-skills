# Best Practices Checklist

Chrome extension best practices for performance, UX, accessibility, privacy, and CWS compliance.

---

## 1. Performance

- [ ] Service worker is event-driven — no persistent background page
- [ ] Service worker terminates when idle (no `setInterval` keepalives)
- [ ] Content scripts loaded only on matching URLs (narrow `matches` pattern)
- [ ] Content scripts use `run_at: document_idle` unless earlier injection required
- [ ] Heavy processing offloaded to `OffscreenDocument` or Web Workers
- [ ] Popup loads in < 500ms (lazy-load non-critical resources)
- [ ] No synchronous `XMLHttpRequest` calls

**Bundle size targets:**

| Component           | Target              |
| ------------------- | ------------------- |
| Popup JS            | < 200 KB            |
| Background SW       | < 100 KB            |
| Content script      | < 50 KB             |
| Total extension zip | < 10 MB (CWS limit) |

```bash
# Check bundle sizes
du -sh .output/**/* 2>/dev/null || du -sh dist/**/*
```

---

## 2. UX & Permissions

- [ ] Request permissions at point of use (optional permissions API)
- [ ] Explain why permission is needed before requesting
- [ ] Gracefully handle permission denial
- [ ] Popup UI is responsive (min 300px, max 800px wide)
- [ ] Loading states shown for async operations
- [ ] Error messages are user-friendly (not stack traces)
- [ ] Extension icon reflects active/inactive state

```ts
// Point-of-use permission request pattern
await chrome.permissions.request({ permissions: ["tabs"] });
```

---

## 3. Accessibility

- [ ] All interactive elements keyboard-navigable (Tab order logical)
- [ ] Focus visible on all focusable elements (`outline` not removed)
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Screen reader tested (NVDA/VoiceOver)
- [ ] No content conveyed by color alone
- [ ] Font size ≥ 12px

---

## 4. Privacy

- [ ] Minimal data collection (only what's needed for functionality)
- [ ] No data sent to third parties without user consent
- [ ] Data retention policy implemented (clear old data)
- [ ] Privacy policy URL in CWS listing and manifest (if collecting data)
- [ ] No fingerprinting (canvas, font, audio API abuse)
- [ ] User data deletable on uninstall (`chrome.runtime.onInstalled` cleanup)

---

## 5. Code Quality

- [ ] TypeScript used (strict mode preferred)
- [ ] `eslint` with `@typescript-eslint` configured
- [ ] No `console.log` in production builds (use debug flag)
- [ ] Error tracking configured (Sentry or similar)
- [ ] All async operations have error handling (`try/catch` or `.catch()`)
- [ ] No `any` types in TypeScript (use `unknown` + type guards)
- [ ] Unit tests for business logic (≥ 80% coverage target)

```ts
// Error tracking setup
import * as Sentry from "@sentry/browser";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: chrome.runtime.getManifest().version,
});
```

---

## 6. CWS Compliance

- [ ] Extension has a single, clearly defined purpose
- [ ] Store description matches actual functionality
- [ ] No keyword stuffing in title or description
- [ ] Screenshots accurate (no mockups showing fake data)
- [ ] Promotional images meet CWS size requirements (440×280, 920×680, 1280×800)
- [ ] Privacy practices form completed in Developer Dashboard
- [ ] Required permissions justified in listing

---

## 7. Manifest Quality

- [ ] `version` follows semver (e.g., `1.0.0`)
- [ ] `description` ≤ 132 characters
- [ ] Icons provided: 16, 32, 48, 128px
- [ ] `default_locale` set if using `_locales/`
- [ ] No unused entries in `permissions` array
- [ ] `minimum_chrome_version` set if using recent APIs

---

## 8. Update & Maintenance

- [ ] `update_url` set for self-hosted extensions (CWS handles auto-update)
- [ ] Migration logic for storage schema changes on version update
- [ ] Changelog maintained for users
- [ ] Deprecated API usage tracked against Chrome release notes
