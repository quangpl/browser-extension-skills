# Packaging, CWS API v2, and CI

## Contents
- Package the zip
- CWS API v2 credentials
- Upload and publish commands
- GitHub Actions workflow
- Rollout, staged publish, verified uploads, rollback

## Package the zip

| Framework | Command | Output |
|---|---|---|
| WXT | `wxt zip` (Firefox: `wxt zip -b firefox`, also emits a sources zip) | `.output/<name>-<version>-chrome.zip` |
| Plasmo | `plasmo package` (or `plasmo build --zip`) | `build/chrome-mv3-prod.zip` |
| Vite / CRXJS / vanilla | `cd dist && zip -r ../extension-<version>.zip . -x '*.map' '.DS_Store'` | `extension-<version>.zip` |

- `manifest.json` must be at the zip root (zip the build dir's contents, not the dir).
- Exclude source maps unless intentionally shipped, `.env*`, tests, and `store/` art. Minified code is allowed; obfuscated code is not, and readable code reviews faster.
- Version source: WXT/Plasmo take `version` from `package.json`; vanilla from `manifest.json`. Bump it before zipping.

## CWS API v2 credentials

Every v2 call needs a **publisher ID** (Dashboard → Publisher/Account settings) and the **extension ID**. Items must already exist (first upload is manual). Docs: https://developer.chrome.com/docs/webstore/using-api

**Default for CI — service account** (no expiring user tokens), used by `wxt submit`:
1. Google Cloud Console → enable "Chrome Web Store API".
2. Create a service account (no IAM roles needed) and a JSON key.
3. Developer Dashboard → Account → add the service account email.
4. Secrets: `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`, `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` (the key's `private_key`).
Docs: https://developer.chrome.com/docs/webstore/service-accounts

**OAuth client + refresh token**, used by `chrome-webstore-upload-cli`:
1. Enable the API, configure the OAuth consent screen, create an OAuth client (Desktop app).
2. Generate the refresh token: `npx chrome-webstore-upload-keys` (guide: https://github.com/fregante/chrome-webstore-upload-keys).
3. Secrets: `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`, `PUBLISHER_ID`, `EXTENSION_ID`.
4. If the consent screen is External and in "Testing", the refresh token expires after 7 days — publish the consent screen to "In production" (or use Internal for Workspace accounts).

## Upload and publish commands

These commands change what users receive. Run them only after the user confirms; offer `--dry-run` (WXT) first.

**WXT** (`publish-browser-extension` ≥ 5 under the hood):
```sh
wxt submit init                       # interactive; writes .env.submit (gitignore it); pick API v2
wxt submit --dry-run --chrome-zip .output/*-chrome.zip
wxt submit --chrome-zip .output/*-chrome.zip
```
Env/flags (`CHROME_*` env = `--chrome-*` flag): `CHROME_API_VERSION=v2`, `CHROME_EXTENSION_ID`, `CHROME_PUBLISHER_ID`, service-account vars above. Useful: `CHROME_PUBLISH_TYPE=STAGED_PUBLISH`, `CHROME_DEPLOY_PERCENTAGE`, `CHROME_SKIP_SUBMIT_REVIEW=true` (upload only), `CHROME_CANCEL_PENDING=true`. Without `CHROME_API_VERSION=v2` it calls the retired v1.1 API — set it.

**chrome-webstore-upload-cli** (v4+, API v2; credentials via env vars):
```sh
npx chrome-webstore-upload-cli upload --source build/chrome-mv3-prod.zip
npx chrome-webstore-upload-cli publish                     # submit for review → publish
npx chrome-webstore-upload-cli publish --deploy-percentage 10
npx chrome-webstore-upload-cli                             # no command = upload + publish
```
Older guides passing `--client-id/--client-secret/--refresh-token` flags or omitting `PUBLISHER_ID` are for the v1.1 era.

**Raw API** (for custom tooling; `TOKEN` from the OAuth refresh or service-account flow):
```sh
B=https://chromewebstore.googleapis.com
curl -H "Authorization: Bearer $TOKEN" -X POST -T ext.zip "$B/upload/v2/publishers/$PUB/items/$EXT:upload"
curl -H "Authorization: Bearer $TOKEN" "$B/v2/publishers/$PUB/items/$EXT:fetchStatus"
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -X POST \
  -d '{"publishType":"STAGED_PUBLISH","deployInfos":[{"deployPercentage":10}]}' \
  "$B/v2/publishers/$PUB/items/$EXT:publish"
```
Other methods: `:setPublishedDeployPercentage`, `:cancelSubmission`. `publish` also accepts `skipReview` (only for updates that qualify, otherwise a validation error) and `blockOnWarnings`. Reference: https://developer.chrome.com/docs/webstore/api/reference/rest

## GitHub Actions workflow

Write to `.github/workflows/release.yml`. Manual trigger by default so a merge never publishes by accident; switch to tag pushes only if the user asks.

```yaml
name: Release
on:
  workflow_dispatch:
    inputs:
      dry_run: { type: boolean, default: true }
jobs:
  submit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run --if-present test
      - run: pnpm wxt zip
      - run: pnpm wxt submit --chrome-zip .output/*-chrome.zip ${{ inputs.dry_run && '--dry-run' || '' }}
        env:
          CHROME_API_VERSION: v2
          CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
          CHROME_PUBLISHER_ID: ${{ secrets.CHROME_PUBLISHER_ID }}
          CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL: ${{ secrets.CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL }}
          CHROME_SERVICE_ACCOUNT_PRIVATE_KEY: ${{ secrets.CHROME_SERVICE_ACCOUNT_PRIVATE_KEY }}
```

Non-WXT: replace the last two steps with the build/package command and
`npx chrome-webstore-upload-cli upload --source <zip>` (+ `publish` when not a dry run), passing `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`, `PUBLISHER_ID`, `EXTENSION_ID` as env. Plasmo's `PlasmoHQ/bpp` action calls the retired v1.1 API; replace it with this.

## Rollout, staged publish, verified uploads, rollback

- **Percentage rollout:** updates to items with > 10,000 seven-day active users. Set on publish (`deployPercentage`) or later via `:setPublishedDeployPercentage` / dashboard Package tab; increasing it needs no review. One partial rollout at a time; publishing a new version stops the previous rollout. After a warning or takedown the next version must go to 100%.
- **Staged / deferred publish:** `STAGED_PUBLISH` (API) or untick "publish automatically" in the dashboard. After approval you have 30 days to publish, then it reverts to draft.
- **Beta channel:** a separate item named with "BETA"/"DEVELOPMENT BUILD" and a description stating it is for testing (otherwise both risk Repetitive Content takedown); Private visibility uses the account's trusted testers or Google Groups.
- **Verified CRX uploads** (Package tab → opt in, provide RSA public key): every later upload must be a `.crx` signed with your private key.
  ```sh
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out privatekey.pem
  openssl rsa -in privatekey.pem -pubout          # paste into dashboard
  google-chrome --pack-extension=./dist --pack-extension-key=privatekey.pem
  ```
  API uploads of a CRX need headers `X-Goog-Upload-Protocol: raw` and `X-Goog-Upload-File-Name: <name>.crx`. Keep the key out of the repo and out of the Google account; losing it means a support request to replace it.
- **Rollback:** a bad release can be rolled back to the previous version from the dashboard; see https://developer.chrome.com/docs/webstore/update
