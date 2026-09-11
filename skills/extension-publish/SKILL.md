---
name: extension-publish
description: Prepare, submit, and optimize Chrome Web Store listings. Covers workflow, checklist, rejection reasons, listing optimization, and CI/CD automation.
---

# extension-publishing

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

## Workflow

```
prepare → package → submit → review → publish
```

1. **Prepare**: assets, privacy policy, permission justifications, manifest
2. **Package**: `zip` source (exclude dev files), validate manifest
3. **Submit**: Chrome Web Store Developer Dashboard
4. **Review**: 1–3 days typical; up to 7 days for new publishers
5. **Publish**: auto or manual rollout

---

## Pre-Submission Checklist (Quick)

- [ ] Manifest v3 only (MV2 deprecated)
- [ ] `name`, `version`, `description` set in manifest
- [ ] Icons: 16×16, 48×48, 128×128 PNG
- [ ] Screenshots: min 1, 1280×800 or 640×400
- [ ] Single purpose clearly defined
- [ ] Only permissions actually used
- [ ] Privacy policy URL (required if collecting data)
- [ ] Permission justification field filled for sensitive perms
- [ ] No remote code execution (`eval`, remote scripts)
- [ ] All features functional in review build

Full checklist: [references/submission-checklist.md](references/submission-checklist.md)

---

## Top 10 Rejection Reasons

1. Single purpose violation — does too many unrelated things
2. Excessive/unnecessary permissions
3. Missing privacy policy (required when user data collected)
4. Missing permission justification in submission form
5. Description doesn't match functionality
6. Keyword spam in title/description
7. Remote code execution (`eval`, external scripts)
8. Improper user data handling or disclosure
9. Extension non-functional or crashes
10. Broken features / inaccessible links

Full details + fixes: [references/common-rejections.md](references/common-rejections.md)

---

## Listing Optimization Essentials

- **Title**: `<Action verb> + <Benefit>`, max 45 chars, no keyword stuffing
- **Description first 150 chars**: shown in search — make them count
- **Structure**: problem → solution → key benefits → CTA
- **Screenshots**: annotate features, show real UI, 1280×800
- **Category**: choose most specific fit

Full guide: [references/store-listing-optimization.md](references/store-listing-optimization.md)

---

## CI/CD with chrome-webstore-upload

### Install

```bash
npm install -g chrome-webstore-upload-cli
```

### Upload & Publish

```bash
# Upload new version
chrome-webstore-upload upload \
  --source extension.zip \
  --extension-id $EXT_ID \
  --client-id $CLIENT_ID \
  --client-secret $CLIENT_SECRET \
  --refresh-token $REFRESH_TOKEN

# Publish
chrome-webstore-upload publish \
  --extension-id $EXT_ID \
  --client-id $CLIENT_ID \
  --client-secret $CLIENT_SECRET \
  --refresh-token $REFRESH_TOKEN
```

### Required Env Vars

| Var             | Source              |
| --------------- | ------------------- |
| `EXT_ID`        | Dashboard URL       |
| `CLIENT_ID`     | GCP OAuth client    |
| `CLIENT_SECRET` | GCP OAuth client    |
| `REFRESH_TOKEN` | Run OAuth flow once |

Full GitHub Actions pipeline: [references/ci-cd-automation.md](references/ci-cd-automation.md)

### CRXJS Built-in Publishing

CRXJS has integrated browser store submission (https://docs.crxjs.com/):

```bash
crxjs build           # Build for production
crxjs package         # Create store-ready zip
```

---

## Reference Files

| File                                                                      | Content                                                          |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [submission-checklist.md](references/submission-checklist.md)             | Complete pre-submission checklist with assets, manifest, privacy |
| [store-listing-optimization.md](references/store-listing-optimization.md) | Title, description, screenshots, keywords, localization          |
| [common-rejections.md](references/common-rejections.md)                   | Top rejections with fixes, appeal process                        |
| [ci-cd-automation.md](references/ci-cd-automation.md)                     | GitHub Actions, versioning, build pipeline                       |
