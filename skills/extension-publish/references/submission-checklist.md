# Submission Checklist

## Manifest (`manifest.json`)

- [ ] `"manifest_version": 3`
- [ ] `name` ≤ 45 chars
- [ ] `version` follows semver (`1.0.0`)
- [ ] `description` ≤ 132 chars
- [ ] Only required permissions listed
- [ ] No `eval`, `new Function()`, or inline script injection
- [ ] `content_security_policy` restrictive (no `unsafe-eval`, no remote scripts)
- [ ] `host_permissions` scoped to minimum required domains
- [ ] `web_accessible_resources` limited to necessary files

## Required Assets

### Icons (PNG, no transparency issues)

| Size    | Use                        |
| ------- | -------------------------- |
| 16×16   | Favicon, extension list    |
| 32×32   | Windows taskbar            |
| 48×48   | Extensions management page |
| 128×128 | Chrome Web Store listing   |

### Screenshots

- Min 1, max 5
- Dimensions: **1280×800** or **640×400** (exact)
- Format: PNG or JPEG
- Show real UI — no placeholder or stock images
- Annotate key features

### Promotional Images (optional but recommended)

| Size     | Use                |
| -------- | ------------------ |
| 440×280  | Small tile         |
| 920×680  | Large tile         |
| 1400×560 | Marquee (featured) |

## Privacy Policy

- Required if extension collects **any** user data
- Must be hosted at a publicly accessible URL
- Must describe: what data, why collected, how stored, how shared
- Include data retention and deletion policy
- Add URL in Developer Dashboard submission form

## Permission Justifications

Required for these permissions in submission form:

- `tabs` — explain why tab info needed
- `history` — explain usage
- `bookmarks` — explain usage
- `cookies` — explain scope and purpose
- `<all_urls>` / broad host permissions — justify need
- `webRequest` / `declarativeNetRequest` — explain filtering purpose
- Any permission accessing user data

## Single Purpose Compliance

- Define one clear primary purpose
- All features must serve that purpose
- Remove unrelated functionality
- Document purpose in description and permission justifications

## Data Handling Disclosure

In Developer Dashboard under "Privacy practices":

- [ ] Declare what user data is collected
- [ ] Specify data use (functionality, analytics, advertising)
- [ ] Confirm data is not sold to third parties
- [ ] Confirm no deceptive data use
- [ ] List any third-party services receiving data

## Build Verification

- [ ] Pack extension: `zip -r extension.zip . --exclude "*.git*" "node_modules/*" "*.map"`
- [ ] Load unpacked in Chrome to verify zip works
- [ ] Test all features in incognito mode
- [ ] Test on fresh Chrome profile (no existing extension state)
- [ ] Verify all external URLs/APIs are reachable
- [ ] Check console for errors on all extension pages
- [ ] Confirm version number incremented from last submission
