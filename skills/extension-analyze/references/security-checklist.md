# Security Audit Checklist

Complete security checklist for Chrome extension audits.

---

## 1. Permission Audit

- [ ] No `<all_urls>` unless absolutely required — prefer specific host patterns
- [ ] Uses `activeTab` instead of broad host permissions where possible
- [ ] Each permission in `manifest.json` has a documented reason
- [ ] Optional permissions used for non-core features
- [ ] No deprecated permissions (`background`, `unlimited_storage`)
- [ ] MV3: No `webRequestBlocking` (replaced by `declarativeNetRequest`)

```bash
# List all permissions declared
jq '.permissions, .host_permissions, .optional_permissions' manifest.json
```

---

## 2. CSP Audit

- [ ] No `unsafe-inline` in `script-src`
- [ ] No `unsafe-eval` in `script-src`
- [ ] No remote domains in `script-src` or `object-src`
- [ ] No `http:` URLs in any CSP directive
- [ ] MV3 default enforced: `script-src 'self'; object-src 'self'`

```bash
# Check CSP in manifest
jq '.content_security_policy' manifest.json

# Grep for inline event handlers (violates CSP)
grep -rn "onclick=\|onload=\|onerror=" src/ --include="*.html"
```

---

## 3. Message Handler Audit

- [ ] Every `chrome.runtime.onMessage` listener validates `sender.id`
- [ ] External message handlers (`onMessageExternal`) validate allowed origins
- [ ] Message type/action field checked before processing
- [ ] No message payload passed directly to `eval()` or DOM sinks
- [ ] Content script messages treated as untrusted (page may be compromised)

```bash
grep -rn "onMessage\.addListener\|onMessageExternal" src/ --include="*.ts" --include="*.js"
```

**Required pattern:**

```ts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return; // validate sender
  if (msg.type !== "EXPECTED_TYPE") return; // validate type
  // safe to process
});
```

---

## 4. Storage Audit

- [ ] No passwords, tokens, or private keys in `chrome.storage.sync`
- [ ] No sensitive data in `chrome.storage.local` without encryption
- [ ] No PII stored longer than necessary
- [ ] Storage keys are namespaced (avoid collisions)
- [ ] Session data uses `chrome.storage.session` (cleared on browser close)

```bash
grep -rn "storage\.sync\.set\|storage\.local\.set" src/ --include="*.ts" --include="*.js"
```

---

## 5. Content Script Audit

- [ ] No `innerHTML`, `outerHTML`, `document.write` with page-sourced data
- [ ] Page data sanitized before DOM insertion (use `textContent` or DOMPurify)
- [ ] No `eval()` or `new Function()` with page data
- [ ] No `chrome.runtime.sendMessage` forwarding raw page content
- [ ] CSS injection uses scoped selectors to avoid page style conflicts

```bash
grep -rn "innerHTML\s*=" src/ --include="*.ts" --include="*.js"
grep -rn "document\.write\b" src/ --include="*.ts" --include="*.js"
```

---

## 6. External API Audit

- [ ] All fetch/XHR calls use `https://`
- [ ] No API keys hardcoded in source files
- [ ] API keys not exposed in `web_accessible_resources`
- [ ] Request/response validated before use
- [ ] Errors caught and not logged with sensitive data

```bash
grep -rn "http://" src/ --include="*.ts" --include="*.js"
grep -rn "api[_-]?key\s*=\|apiKey\s*=\|secret\s*=" src/ --include="*.ts" --include="*.js" -i
```

---

## 7. Web Accessible Resources Audit

- [ ] Only UI assets listed (icons, HTML pages) — no JS logic files
- [ ] `matches` restricted to specific origins, not `<all_urls>`
- [ ] No sensitive data files exposed
- [ ] MV3 format used: array of `{resources, matches}` objects

```bash
jq '.web_accessible_resources' manifest.json
```

---

## 8. Input Sanitization

- [ ] User inputs validated before use in DOM or storage
- [ ] URL inputs validated (prevent `javascript:` protocol)
- [ ] JSON parsed with try/catch
- [ ] Numeric inputs parsed and range-checked

---

## 9. Dependency Vulnerability Scan

```bash
npm audit --audit-level=moderate
# or
pnpm audit --audit-level=moderate
```

- [ ] No critical/high vulnerabilities in production dependencies
- [ ] `devDependencies` vulnerabilities reviewed (build chain attacks)
- [ ] Lock file committed (`package-lock.json` or `pnpm-lock.yaml`)
