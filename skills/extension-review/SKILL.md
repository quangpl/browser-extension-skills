---
name: extension-review
description: "Scan extension source code for Chrome Web Store rejection risks. Generates report with issues, root causes, and fixes. Use when: review, pre-submit, rejection, CWS compliance, store review."
---

# Extension Review (Pre-Submission Scanner)

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

Scan extension source code and predict Chrome Web Store rejection risks. Generate a clear report.

Reference: https://developer.chrome.com/docs/webstore/troubleshooting

## Workflow (Execute This)

### Step 1: Ask report format

Ask user: **Markdown or HTML report?** (default: Markdown)

### Step 2: Locate and scan extension

```bash
# Find extension root
ls manifest.json wxt.config.ts crxjs.config.ts package.json 2>/dev/null
```

### Step 3: Run all checks

Execute these scans in order (see `references/scan-checklist.md` for grep patterns):

| #   | Check                                              | Violation Code   | Severity |
| --- | -------------------------------------------------- | ---------------- | -------- |
| 1   | Remote code execution (eval, external scripts)     | Blue Argon       | CRITICAL |
| 2   | Code obfuscation (base64, char encoding)           | Red Titanium     | CRITICAL |
| 3   | Excessive/unused permissions                       | Purple Potassium | HIGH     |
| 4   | Missing privacy policy                             | Purple Lithium   | HIGH     |
| 5   | Missing metadata (icons, description, screenshots) | Yellow Zinc      | HIGH     |
| 6   | Single purpose violation                           | Red Magnesium    | HIGH     |
| 7   | Deceptive behavior (description ≠ functionality)   | Red Nickel       | HIGH     |
| 8   | Insecure data transmission (HTTP)                  | Purple Copper    | HIGH     |
| 9   | Keyword stuffing in manifest                       | Yellow Argon     | MEDIUM   |
| 10  | Minimum functionality check                        | Yellow Potassium | MEDIUM   |
| 11  | Undisclosed affiliate links                        | Grey Titanium    | MEDIUM   |
| 12  | Cryptocurrency mining code                         | Grey Silicon     | CRITICAL |
| 13  | Copyright circumvention (download helpers)         | Blue Zinc        | CRITICAL |
| 14  | Notification spam patterns                         | Yellow Nickel    | MEDIUM   |
| 15  | Data collection without consent                    | Purple Nickel    | HIGH     |

### Step 4: Generate report

Output report using template in `references/report-template.md`.

**Report structure per issue:**

```
## Issue: [Name]
- **Severity**: CRITICAL / HIGH / MEDIUM
- **Violation Code**: [Chrome code, e.g. Blue Argon]
- **Root Cause**: [What in your code triggers this]
- **File(s)**: [Exact file paths and line numbers]
- **Solution**: [Step-by-step fix]
```

**Report summary:**

```
| Severity | Count |
|----------|-------|
| CRITICAL | X     |
| HIGH     | X     |
| MEDIUM   | X     |
| PASS     | X     |

Verdict: LIKELY APPROVED / NEEDS FIXES / WILL BE REJECTED
```

### Step 5: Save report

- Markdown: save as `extension-review-report.md` in project root
- HTML: save as `extension-review-report.html` with simple, readable styling

## References

- `references/scan-checklist.md` — Grep patterns and detection logic for all 15 checks
- `references/violation-codes.md` — All Chrome Web Store violation codes with descriptions
- `references/report-template.md` — Markdown and HTML report templates

## Related Skills

- `extension-analyze` — Deeper security audit (code quality, XSS, CSP)
- `extension-publish` — Full publishing workflow after review passes
- `extension-manifest` — Fix manifest issues found in review
