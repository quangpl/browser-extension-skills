# Verifying an MV3 migration

Use this at workflow step 7. Record results as the "verification evidence" section of the final message.

## Load and smoke test

1. Build; confirm the output directory contains `manifest.json` with `"manifest_version": 3`.
2. `chrome://extensions` → Developer mode → Load unpacked → select the output directory. Manifest errors appear on the card; fix and reload.
3. Service worker: click "service worker" (Inspect views) to open its console. The card's Errors button collects runtime errors from all contexts.
4. Open each extension page (popup, options, side panel) and its DevTools; look for CSP violations (remote scripts, `eval`) and missing-API errors.

## Per-feature matrix

Build one row per feature found in the inventory grep. Exercise each feature twice: once fresh, once after clicking "Stop" next to the service worker on `chrome://extensions` (or waiting 30 s idle).

| Feature | MV2 behavior | MV3 result (fresh) | MV3 result (after worker stop) | Notes |
|---|---|---|---|---|
| Popup actions | | | | |
| Content script injection / messaging | | | | |
| Context menus | | | | |
| Network blocking / redirects / headers | | | | |
| Alarms / periodic sync | | | | |
| Storage read/write, settings | | | | |
| Keyboard shortcuts (`_execute_action`) | | | | |

Typical failures and their cause:
- Works fresh, fails after stop → listener registered late, or state kept in a global.
- `Could not establish connection. Receiving end does not exist.` → message sent to a tab without the content script, or the worker listener isn't top-level.
- `Cannot access contents of the page` → missing host permission / `activeTab` for `scripting`.
- Network rule silently ignored → invalid static rule (visible only unpacked), wrong `resourceTypes`, or missing host permission for `redirect`/`modifyHeaders`.
- `document is not defined` / `window is not defined` in the worker → move to offscreen document.

## Upgrade path (existing users)

Fresh installs hide the most common regression: data loss on update.

1. Chrome no longer runs the MV2 build, so simulate the old state: load the MV3 build unpacked, then from the popup's DevTools (same origin as the old background page) seed `localStorage` and `chrome.storage` with representative MV2 data.
2. Click Reload on the card; `runtime.onInstalled` fires with `reason: "update"`. (Firefox, which still runs MV2, can test a true MV2 → MV3 upgrade for cross-browser code.)
3. Confirm settings, auth tokens, and user lists survived; confirm the `localStorage` migration ran once; confirm alarms were recreated (alarms are cleared on update) and dynamic DNR rules still exist.
4. Verify the permission set: new host permissions or permissions with new warnings disable the updated extension in Chrome until the user approves. Compare the MV2 and MV3 warning lists; avoid adding anything not strictly needed.

## Cross-browser builds

If the extension also ships to Firefox or Safari:
- Load the same build in Firefox via `about:debugging` → This Firefox → Load Temporary Add-on; Firefox uses `background.scripts`.
- With WXT: `wxt build -b firefox` (MV2 by default) and `wxt build -b firefox --mv3` to test both.
- Firefox MV3 needs `browser_specific_settings.gecko.id` for AMO signing.

## Before release

- Bump `version`.
- Re-run the inventory grep; remaining hits should be intentional (content-script DOM use, non-blocking `webRequest`).
- Check the bundle for remotely hosted code: search built files for `https://` script URLs, `eval(`, `new Function(`.
- Note user-visible changes (e.g. page-action icon now always visible but disabled, changed rule behavior) for the release notes and CWS listing.
- Publishing is a separate, irreversible step: hand off to the publish workflow (extension-publish skill if installed) and get the user's go-ahead before uploading. An MV2 build cannot be republished to CWS as a rollback, so fix forward.
