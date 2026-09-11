# CI/CD Automation

## chrome-webstore-upload Setup

### Install

```bash
npm install --save-dev chrome-webstore-upload-cli
# or global
npm install -g chrome-webstore-upload-cli
```

### Get API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable **Chrome Web Store API**
3. Create OAuth 2.0 Client ID (Desktop app type)
4. Download `client_id` and `client_secret`
5. Get refresh token (one-time):

```bash
npx chrome-webstore-upload-cli get-refresh-token \
  --client-id $CLIENT_ID \
  --client-secret $CLIENT_SECRET
```

6. Store all three as CI secrets: `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`

---

## GitHub Actions Workflow

```yaml
# .github/workflows/publish.yml
name: Publish to Chrome Web Store

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build extension
        run: npm run build

      - name: Package extension
        run: |
          cd dist
          zip -r ../extension.zip . --exclude "*.map"

      - name: Upload to Chrome Web Store
        run: |
          npx chrome-webstore-upload-cli upload \
            --source extension.zip \
            --extension-id ${{ secrets.CWS_EXTENSION_ID }} \
            --client-id ${{ secrets.CWS_CLIENT_ID }} \
            --client-secret ${{ secrets.CWS_CLIENT_SECRET }} \
            --refresh-token ${{ secrets.CWS_REFRESH_TOKEN }}

      - name: Publish to users
        run: |
          npx chrome-webstore-upload-cli publish \
            --extension-id ${{ secrets.CWS_EXTENSION_ID }} \
            --client-id ${{ secrets.CWS_CLIENT_ID }} \
            --client-secret ${{ secrets.CWS_CLIENT_SECRET }} \
            --refresh-token ${{ secrets.CWS_REFRESH_TOKEN }}
```

---

## Versioning Automation

Auto-bump version from git tag:

```bash
# scripts/bump-version.sh
TAG=${GITHUB_REF#refs/tags/v}   # e.g., "1.2.3"
jq --arg v "$TAG" '.version = $v' manifest.json > tmp.json
mv tmp.json manifest.json
```

Add to workflow before build step:

```yaml
- name: Bump version from tag
  run: bash scripts/bump-version.sh
```

---

## Staging vs Production Tracks

Chrome Web Store has no staging track — use separate extension IDs:

| Track      | Extension ID      | Visibility |
| ---------- | ----------------- | ---------- |
| Staging    | `$STAGING_EXT_ID` | Unlisted   |
| Production | `$PROD_EXT_ID`    | Public     |

Workflow strategy:

```yaml
on:
  push:
    branches: [main] # → upload to staging (unlisted)
    tags: ["v*"] # → upload + publish to production
```

Use `--trusted-testers` flag or `unlisted` visibility for staging builds.

---

## Rollout Control

Publish to percentage of users (via API, not CLI):

```bash
curl -X POST \
  "https://www.googleapis.com/chromewebstore/v1.1/items/$EXT_ID/publish" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target": "trustedTesters"}'
# target: "default" = all users, "trustedTesters" = testers only
```
