# Common Extension Vulnerabilities

Extension-specific vulnerabilities with detection patterns and fixes.

---

## 1. XSS via innerHTML / document.write

**Severity:** High
**Description:** Inserting untrusted page data into DOM via sink functions allows attacker-controlled pages to execute scripts in extension context.

```bash
# Detect
grep -rn "innerHTML\s*=\|outerHTML\s*=\|document\.write\|insertAdjacentHTML" src/ --include="*.ts" --include="*.js"
```

**Fix:** Use `textContent` for text, or sanitize with DOMPurify: `element.innerHTML = DOMPurify.sanitize(pageData)`.

---

## 2. Message Handler Without Sender Validation

**Severity:** High
**Description:** Unvalidated `onMessage` handlers allow any extension or web page to trigger privileged operations.

```bash
# Detect — find handlers lacking sender check
grep -rn "onMessage\.addListener" src/ --include="*.ts" --include="*.js" -A 3 | grep -v "sender\."
```

**Fix:** Always check `sender.id` and message type.

```ts
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (!["ACTION_A", "ACTION_B"].includes(msg.type)) return false;
});
```

---

## 3. Overly Broad Host Permissions

**Severity:** Medium
**Description:** `<all_urls>` or `*://*/*` grants content script access to all sites including banking, email, and sensitive pages.

```bash
# Detect
jq '.host_permissions[]' manifest.json | grep -E "<all_urls>|\*://\*/|https?://\*"
```

**Fix:** Use specific domains (`"host_permissions": ["https://api.example.com/*"]`) or `activeTab` for user-initiated actions.

---

## 4. API Keys in Source Code

**Severity:** Critical
**Description:** Hardcoded API keys are exposed to anyone who installs or downloads the extension package.

```bash
# Detect
grep -rn -i "api[_-]?key\s*[=:]\|secret\s*[=:]\|apiSecret\|client_secret\|bearer\s" src/ --include="*.ts" --include="*.js" | grep -v "\.test\.\|spec\.\|// "
```

**Fix:** Store keys server-side and proxy API calls. For user-provided keys, store in `chrome.storage.local` (never sync).

---

## 5. eval() or Function() Constructor

**Severity:** Critical
**Description:** Dynamic code execution violates CSP, enables code injection, and is banned in MV3 extension pages.

```bash
# Detect
grep -rn "\beval\s*(\|new Function\s*(\|setTimeout\s*(.*string\|setInterval\s*(.*string" src/ --include="*.ts" --include="*.js"
```

**Fix:** Refactor to static code. Use lookup tables: `const actions = { open: openTab }; actions[key]?.();`

---

## 6. Remote Code Loading (Banned in MV3)

**Severity:** Critical
**Description:** Fetching and executing remote scripts is prohibited in MV3. Violates CWS policy and Chrome's security model.

```bash
# Detect
grep -rn "importScripts\s*('http\|fetch.*\.js\b\|chrome\.scripting\.executeScript.*url" src/ --include="*.ts" --include="*.js"
```

**Fix:** Bundle all code. Use `declarativeNetRequest` for URL blocking instead of remote filter lists fetched at runtime.

---

## 7. Insecure HTTP API Calls

**Severity:** High
**Description:** HTTP calls expose user data to MITM attacks and are blocked by Chrome's mixed content policies in many contexts.

```bash
# Detect
grep -rn "fetch\s*('http://\|axios.*http://\|XMLHttpRequest.*http://" src/ --include="*.ts" --include="*.js"
```

**Fix:** Use `https://` for all external calls. If testing locally, use `localhost` exceptions only in dev builds.

---

## 8. Sensitive Data in chrome.storage.sync

**Severity:** Medium
**Description:** `chrome.storage.sync` is synced to Google servers and other devices. Inappropriate for tokens, passwords, or private user data.

```bash
# Detect
grep -rn "storage\.sync\.set" src/ --include="*.ts" --include="*.js" -A 2 | grep -i "token\|password\|secret\|key\|auth"
```

**Fix:** Use `chrome.storage.local` for sensitive data. Use `chrome.storage.session` for ephemeral secrets (cleared on browser close).

---

## 9. CSS Injection Attacks

**Severity:** Medium
**Description:** Content scripts injecting CSS from page-sourced values can leak page data via timing attacks or break page layouts.

```bash
# Detect
grep -rn "style\s*=.*page\|cssText\s*=\|insertRule.*variable" src/ --include="*.ts" --include="*.js"
```

**Fix:** Never use page data in CSS values. Use static class names and predefined styles only.

## 10. Clickjacking in Extension Pages

**Severity:** Medium
**Detect:** `grep -rn "frame-ancestors" src/`
**Fix:** Add `frame-ancestors 'none'` in `content_security_policy.extension_pages` in manifest.
