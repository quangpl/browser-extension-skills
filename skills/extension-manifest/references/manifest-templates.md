# Manifest Templates and Framework Config

## Contents
- Where the manifest lives
- WXT
- Plasmo
- Vanilla / CRXJS templates

## Where the manifest lives

| Project | Edit | Generated output to audit |
|---|---|---|
| WXT (`wxt.config.*`) | `manifest` in `wxt.config.ts` + entrypoint options (`defineContentScript({ matches })`, `<meta name="manifest.*">` in HTML entrypoints) | `.output/chrome-mv3/manifest.json` after `wxt build` |
| Plasmo (`plasmo` dependency) | `"manifest"` field in `package.json` + content script `export const config: PlasmoCSConfig` | `build/chrome-mv3-prod/manifest.json` after `plasmo build` |
| CRXJS / Vite | `manifest.json` or `manifest.config.ts` (`defineManifest`) | `dist/manifest.json` |
| Vanilla | `manifest.json` | same file |

Never hand-edit generated output; it is overwritten on the next build. Audit production builds: dev builds add reload permissions.

## WXT

Docs: https://wxt.dev/guide/essentials/config/manifest. WXT derives `name`/`version` from `package.json`, discovers icons in `public/` (`icon-16.png`, `icon/16.png`, …), and generates `action`, `background`, `content_scripts`, `side_panel`, `options_ui` from entrypoints. Write MV3 shapes; WXT converts for MV2/Firefox targets.

```ts
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: ({ browser }) => ({
    permissions: ['storage', 'activeTab', 'scripting'],
    optional_host_permissions: ['https://*/*'],
    ...(browser === 'chrome' && { minimum_chrome_version: '116' }),
  }),
});
```

- Content script hosts belong in the entrypoint: `export default defineContentScript({ matches: ['https://*.example.com/*'], main() {} })`.
- Dev mode adds `tabs` and `scripting` for hot reload; a `sidepanel` entrypoint adds `sidePanel`. Do not copy those into config unless the code needs them.
- Per-browser differences go in the function form (`browser`, `manifestVersion`, `mode`, `command`).
- `action: {}` without a popup entrypoint gives a click-only action for `activeTab` + `action.onClicked`.
- Hooks (`hooks: { 'build:manifestGenerated': (wxt, manifest) => {} }`) are the escape hatch for edits the config cannot express.

## Plasmo

Docs: https://docs.plasmo.com/framework/customization/manifest. Plasmo maps `package.json` `version`, `displayName` → `name`, `description`, `author`, `homepage` → `homepage_url`, and merges the `"manifest"` field on top of what it generates.

```json
{
  "displayName": "Example",
  "version": "1.2.0",
  "manifest": {
    "permissions": ["storage", "activeTab"],
    "host_permissions": ["https://api.example.com/*"]
  }
}
```

- Scaffolds often start with `"host_permissions": ["https://*/*"]`; narrow or remove it if no feature needs all sites.
- `$ENV_VAR` values are substituted at build time; fields whose variable is missing are dropped (useful for per-browser IDs).
- Content script hosts: `export const config: PlasmoCSConfig = { matches: ['https://*.example.com/*'] }`.

## Vanilla / CRXJS templates

Click-to-run on the current page (no install warnings):

```json
{
  "manifest_version": 3,
  "name": "Page Tool",
  "version": "1.0.0",
  "description": "Runs on the current page when you click the toolbar button.",
  "icons": { "16": "icons/16.png", "32": "icons/32.png", "48": "icons/48.png", "128": "icons/128.png" },
  "action": { "default_title": "Run on this page" },
  "background": { "service_worker": "background.js", "type": "module" },
  "permissions": ["activeTab", "scripting"]
}
```

Site-specific content script (warning: "Read and change your data on all example.com sites"):

```json
{
  "content_scripts": [{ "matches": ["https://*.example.com/*"], "js": ["content.js"], "run_at": "document_idle" }],
  "web_accessible_resources": [{ "resources": ["assets/*"], "matches": ["https://*.example.com/*"], "use_dynamic_url": true }],
  "permissions": ["storage"]
}
```

Side panel opened from the toolbar:

```json
{
  "action": { "default_title": "Open side panel" },
  "side_panel": { "default_path": "sidepanel.html" },
  "background": { "service_worker": "background.js", "type": "module" },
  "permissions": ["sidePanel", "storage"],
  "minimum_chrome_version": "114"
}
```

```ts
// background.ts
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

User-chosen sites (no host warning at install; request per site from a click handler):

```json
{
  "permissions": ["storage", "scripting"],
  "optional_host_permissions": ["https://*/*"]
}
```

Request blocker with static rules:

```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{ "id": "default", "enabled": true, "path": "rules/default.json" }]
  }
}
```
