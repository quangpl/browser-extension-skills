# Scan Checklist — Detection Patterns

Run these grep/search patterns against the extension source code.

## 1. Remote Code Execution (Blue Argon) — CRITICAL

```bash
# External script tags
grep -rn '<script.*src=.*http' src/ --include="*.html"
# eval usage
grep -rn 'eval(' src/ --include="*.ts" --include="*.js" --include="*.tsx"
# Function constructor
grep -rn 'new Function(' src/ --include="*.ts" --include="*.js"
# Dynamic import from URL
grep -rn "import(.*http" src/ --include="*.ts" --include="*.js"
# fetch + eval pattern
grep -rn "fetch.*then.*eval\|fetch.*\.text().*Function" src/
```

**Pass if**: Zero matches.

## 2. Code Obfuscation (Red Titanium) — CRITICAL

```bash
# Base64 encoded strings (long ones, >100 chars)
grep -rn "atob\|btoa" src/ --include="*.ts" --include="*.js"
# String.fromCharCode patterns
grep -rn "String\.fromCharCode" src/ --include="*.ts" --include="*.js"
# Hex-encoded strings
grep -rn '\\x[0-9a-f]\{2\}\\x[0-9a-f]\{2\}' src/
```

**Pass if**: Zero matches or justified usage (e.g., atob for JWT decoding — note in report).

## 3. Excessive Permissions (Purple Potassium) — HIGH

```bash
# List all declared permissions
cat manifest.json | jq '.permissions, .host_permissions, .optional_permissions'
# Check for <all_urls>
grep -n '<all_urls>\|*://*/*' manifest.json
# Check for broad host permissions
grep -n '"http" | "https"' manifest.json
```

**Then**: For each permission, grep source code for its API usage. Flag unused permissions.

| Permission   | Verify usage of                        |
| ------------ | -------------------------------------- |
| `tabs`       | `chrome.tabs.query` (URL/title access) |
| `history`    | `chrome.history.*`                     |
| `bookmarks`  | `chrome.bookmarks.*`                   |
| `cookies`    | `chrome.cookies.*`                     |
| `webRequest` | `chrome.webRequest.*`                  |
| `downloads`  | `chrome.downloads.*`                   |

## 4. Missing Privacy Policy (Purple Lithium) — HIGH

Check if extension collects any user data:

```bash
# Storage of user data
grep -rn "chrome\.storage\|localStorage\|indexedDB" src/
# Network requests (might send data)
grep -rn "fetch(\|XMLHttpRequest\|axios\|\.post(" src/
# Identity/auth
grep -rn "chrome\.identity\|chrome\.cookies" src/
```

**If any match**: Privacy policy is REQUIRED. Check manifest for `"privacy_policy"` field.

## 5. Missing Metadata (Yellow Zinc) — HIGH

```bash
# Check manifest has required fields
cat manifest.json | jq '{name, description, icons, version}'
# Check icon files exist
for size in 16 48 128; do ls icons/icon${size}.png 2>/dev/null || echo "MISSING: icon${size}.png"; done
```

**Also verify**: Description is meaningful (not generic), icons are non-placeholder.

## 6. Single Purpose (Red Magnesium) — HIGH

Read manifest `description` and all entrypoints. Flag if:

- Multiple unrelated features (e.g., ad blocker + weather widget)
- New tab override doing unrelated things
- Content scripts on `<all_urls>` without clear single purpose

## 7. Insecure Data Transmission (Purple Copper) — HIGH

```bash
# HTTP URLs (not HTTPS)
grep -rn "http://" src/ --include="*.ts" --include="*.js" | grep -v "localhost\|127\.0\.0\.1"
# Sensitive data in URL params
grep -rn "password=\|token=\|key=\|secret=" src/ | grep -v ".env\|config"
```

## 8. Keyword Stuffing (Yellow Argon) — MEDIUM

Check manifest `description` and `name` for:

- Repeated keywords
- List of competitor names
- Unrelated buzzwords

## 9. Minimum Functionality (Yellow Potassium) — MEDIUM

Flag if:

- Only `manifest.json` and icons exist (no JS/TS)
- Extension only opens an external URL
- Popup just shows a link to a website

## 10. Crypto Mining (Grey Silicon) — CRITICAL

```bash
grep -rn "coinhive\|cryptonight\|mineralt\|webminer\|coin-hive" src/
grep -rn "WebAssembly.*mining\|hashrate\|nonce.*increment" src/
```

## 11. Copyright Circumvention (Blue Zinc) — CRITICAL

```bash
# Video/audio download patterns
grep -rn "youtube.*download\|download.*video\|saveAs.*blob" src/
grep -rn "paywall\|bypass.*subscription\|unlock.*premium" src/
```

## 12. Data Collection Without Consent (Purple Nickel) — HIGH

```bash
# Browsing history collection
grep -rn "chrome\.history\|chrome\.webNavigation" src/
# Tab URL tracking
grep -rn "chrome\.tabs\.onUpdated\|tab\.url" src/
```

If found, verify: Is consent dialog shown before collection?
