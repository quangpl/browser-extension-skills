# Chrome Web Store Compliance Checklist

CWS policy compliance for submission and maintenance.

---

## 1. Single Purpose Policy

**Rule:** Extension must have a single purpose that is narrow and easy to understand.

**Violations:**

- Multiple unrelated features bundled together (e.g., ad blocker + password manager)
- Features added post-approval that change the extension's purpose
- Core functionality changed via remote configuration

**Allowed:** Multiple features that serve one clearly stated purpose (e.g., "productivity for Gmail" can have compose, snooze, and template features).

```bash
# Check if description clearly states single purpose
jq '.description' manifest.json
# Must be ≤ 132 chars and describe one thing
```

- [ ] Extension name reflects single purpose
- [ ] Description states exactly what it does in first sentence
- [ ] All features serve the stated purpose

---

## 2. Permission Justification

CWS reviewers require justification for sensitive permissions.

**Permissions requiring written justification in listing:**

| Permission   | Why Required                          |
| ------------ | ------------------------------------- |
| `tabs`       | Document URL access, tab manipulation |
| `history`    | Browsing history access               |
| `bookmarks`  | Bookmark read/write                   |
| `cookies`    | Cookie access                         |
| `<all_urls>` | Access to all websites                |
| `webRequest` | Network request interception          |
| `management` | Extension management                  |
| `debugger`   | Chrome DevTools protocol              |

- [ ] Each sensitive permission justified in CWS "Permission Justification" field
- [ ] No permissions requested that aren't actively used
- [ ] Optional permissions used for nice-to-have features

---

## 3. Privacy Policy Requirements

**Required when extension:**

- Collects any user data (browsing history, form data, personal info)
- Transmits data to external servers
- Uses analytics (Google Analytics, Mixpanel, etc.)

- [ ] Privacy policy URL provided in CWS Developer Dashboard
- [ ] Privacy policy URL optionally in manifest `homepage_url`
- [ ] Policy describes: what data collected, why, how stored, who shared with
- [ ] Policy has effective date and contact information

---

## 4. Data Handling Disclosure

In CWS Developer Dashboard → Privacy practices tab:

- [ ] Certified whether extension collects user data
- [ ] Each data type usage disclosed (location, personal info, health, etc.)
- [ ] Data use purpose selected (functionality, analytics, advertising, etc.)
- [ ] Data sharing with third parties disclosed
- [ ] Data sale disclosure completed

---

## 5. Code Readability (No Obfuscation)

**Prohibited:**

- Obfuscated/minified code without source maps
- Base64-encoded executable logic
- Dynamic code assembly from string fragments
- Code that intentionally hides behavior from reviewers

**Allowed:**

- Minification (uglify/terser) with source maps submitted
- Bundling (webpack/rollup/esbuild) — standard practice

```bash
# Check if source maps submitted
ls .output/*.map dist/*.map 2>/dev/null
# CWS accepts zip with source maps for review
```

- [ ] Source maps included in submission zip (or submitted separately)
- [ ] No intentionally obfuscated business logic
- [ ] Bundle readable after source map application

---

## 6. Description Accuracy

- [ ] Title (≤ 45 chars) accurately describes extension — no keyword stuffing
- [ ] Short description (≤ 132 chars) matches actual functionality
- [ ] Long description doesn't contain unrelated keywords
- [ ] Screenshots show actual UI (no fake/enhanced mockups)
- [ ] Promotional images don't contain misleading claims
- [ ] Version notes accurate in "What's new" field

**Automatic rejection triggers:**

- "Best", "#1", "Free" in title (superlatives)
- Trademarked names without authorization (Chrome, Google, Gmail)
- Misleading category selection

---

## 7. No Deceptive Behavior

- [ ] Extension does not redirect searches without user consent
- [ ] Extension does not change homepage/new tab without user consent
- [ ] No affiliate injection without user awareness
- [ ] No hidden data collection beyond stated purpose
- [ ] No auto-update that adds new permissions silently
- [ ] Extension does not impersonate other extensions or websites

---

## 8. Automated Compliance Checks

```bash
# Check manifest description length
jq -r '.description | length' manifest.json   # should be ≤ 132

# Check for remote script loading (banned)
grep -rn "importScripts.*http\|eval\|new Function" src/ --include="*.js" --include="*.ts"

# Check web_accessible_resources doesn't expose JS
jq '.web_accessible_resources[]?.resources[]' manifest.json | grep "\.js$"

# Check version format
jq '.version' manifest.json   # must be A.B.C.D numeric only
```

- [ ] `update_url` removed for CWS-hosted extensions (CWS manages updates)
- [ ] Version number incremented for each update submission
- [ ] Breaking permission changes prompt re-review and user consent

**Review timeline:** Initial review 1–3 days; updates typically < 24 hours. Address all rejection issues before resubmitting; appeals via Developer Support.
