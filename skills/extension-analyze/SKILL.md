---
name: extension-analyze
description: "Audit Chrome extensions for security issues, best practice violations, performance problems, and CWS compliance. Scans manifest, code, CSP, message handlers, storage, and dependencies."
---

# Extension Analyze (Security & Compliance Auditor)

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

Audit an existing Chrome extension. Do NOT just explain — execute the workflow.

## Workflow (Execute This)

### Step 1: Locate extension root and detect framework

Ask user for path if not provided. Detect framework:

```bash
ls wxt.config.ts crxjs.config.ts vite.config.ts manifest.json 2>/dev/null
```

- **CRXJS**: manifest auto-generated; check `package.json` and `crxjs.config.ts` instead
- **WXT**: check `wxt.config.ts` manifest section
- **Vanilla/CRXJS**: check `manifest.json` directly

### Step 2: Scan manifest.json (or equivalent config)

```bash
# Check MV version, permissions, host_permissions, CSP, web_accessible_resources
cat <ext>/manifest.json | jq '{manifest_version, permissions, host_permissions, content_security_policy, web_accessible_resources}'
```

### Step 3: Quick grep scans

```bash
# XSS vectors
grep -rn "innerHTML\|outerHTML\|document\.write\|insertAdjacentHTML" <ext>/src --include="*.ts" --include="*.js"

# Unsafe patterns
grep -rn "eval(\|new Function(\|setTimeout.*string\|setInterval.*string" <ext>/src

# Hardcoded secrets
grep -rn "api_key\|apiKey\|secret\|password\|token" <ext>/src --include="*.ts" --include="*.js" | grep -v "\.test\." | grep -v "node_modules"

# HTTP (non-HTTPS) calls
grep -rn "http://" <ext>/src --include="*.ts" --include="*.js"

# Message handler sender validation
grep -rn "onMessage\|addListener" <ext>/src | grep -v "node_modules"

# Remote code loading
grep -rn "importScripts\|fetch.*\.js\|eval\|chrome\.scripting\.executeScript" <ext>/src
```

### Step 4: Check CSP configuration

- MV3 default CSP: `script-src 'self'; object-src 'self'`
- Flag any `unsafe-inline`, `unsafe-eval`, or `http:` sources
- Verify no remote script sources

### Step 5: Dependency audit

```bash
cd <ext> && npm audit --json | jq '.vulnerabilities | to_entries[] | {pkg: .key, severity: .value.severity}'
```

### Step 6: Generate report

Output findings grouped by severity. See **Output Format** below.

---

## Severity Levels

| Level        | Criteria                                                               |
| ------------ | ---------------------------------------------------------------------- |
| **Critical** | RCE, data exfiltration, remote code loading, eval with untrusted input |
| **High**     | XSS, missing sender validation, API keys in source, HTTP API calls     |
| **Medium**   | Overly broad permissions, unsafe-inline CSP, sync storage secrets      |
| **Low**      | Missing error handling, no TypeScript, console.log in production       |

---

## Top 10 Issues Found in Most Extensions

1. `innerHTML` with page-sourced data (XSS) — **High**
2. `onMessage` without sender origin check — **High**
3. `<all_urls>` host permission when not needed — **Medium**
4. `unsafe-inline` or `unsafe-eval` in CSP — **Medium/Critical**
5. API keys hardcoded in source — **Critical**
6. `eval()` or `new Function()` usage — **Critical**
7. `chrome.storage.sync` storing sensitive data — **Medium**
8. HTTP endpoints instead of HTTPS — **High**
9. Remote script loading (MV3 violation) — **Critical**
10. Missing `web_accessible_resources` restrictions — **Medium**

---

## Output Format

```
## Extension Audit Report: <name> v<version>
Date: <date> | MV: <2|3>

### Summary
Critical: X | High: X | Medium: X | Low: X

### Findings

#### [CRITICAL] API Key Exposed in Source
File: src/background.ts:42
Pattern: `const API_KEY = "sk-..."`
Fix: Move to environment variable or user-provided settings
Reference: references/common-vulnerabilities.md#4

...

### Passed Checks
- CSP: No unsafe-inline/eval ✓
- HTTPS: All API calls use HTTPS ✓
```

---

## References

- `references/security-checklist.md` — Full security audit checklist
- `references/best-practices-checklist.md` — Performance, UX, accessibility, CWS
- `references/common-vulnerabilities.md` — Vulnerability patterns with grep/fix
- `references/cws-compliance-checklist.md` — Chrome Web Store policy compliance
- [Chrome Permissions List](https://developer.chrome.com/docs/extensions/reference/permissions-list)
- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/develop)

## Related Skills

- `extension-manifest` — Generate/validate manifest.json
- `extension-create` — Scaffold new extension
- `extension-publish` — Store submission checklist
