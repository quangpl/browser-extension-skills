# Icon Design and Wiring

## Contents
- Sizes and where Chrome uses them
- Designing the source mark (SVG template)
- Wiring per framework (WXT, Plasmo, vanilla)
- Toolbar (action) icons and dynamic state
- Icons used by content scripts
- Verify the build output

## Sizes and where Chrome uses them

| Size | Used for |
|---|---|
| 16 | Favicon of extension pages, context menus, toolbar at 1x |
| 32 | Windows, toolbar at 2x |
| 48 | `chrome://extensions` management page |
| 128 | Install dialog and the Chrome Web Store (CWS) store icon |

- Format: PNG with alpha. Chrome rejects SVG and WebP for manifest icons; unpacked extensions must use PNG for action icons.
- Chrome picks the closest provided size; extra sizes (24, 96) are allowed but optional.
- 128px store icon: square artwork 96×96 with 16px transparent padding per side; circles ≈112px diameter; no border around the canvas; must read on light and dark backgrounds (add a subtle light outer glow to a mostly dark icon). `generate-icons.mjs` applies the padding to sizes ≥128 by default.
- Small sizes get no padding — every pixel counts at 16px.

Source: https://developer.chrome.com/docs/extensions/reference/manifest/icons, https://developer.chrome.com/docs/webstore/images#icons

## Designing the source mark

When the repo has no usable logo, author an SVG mark from the extension's name and purpose:

- One symbol for the core action (check, bookmark, shield, bolt, tab) or the name's initial; one silhouette, recognizable at 16px.
- Flat fills, 2–3 colors, strong contrast; strokes ≥ 10 units on a 128 viewBox so they survive at 16px (≈1.25px).
- No words. A single bold letter is the only text that stays legible.
- Front-facing, no perspective, no large drop shadows (the store UI adds its own).
- Full-bleed artwork on the 128 viewBox; the script adds CWS padding where needed.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#4F46E5"/>
  <path d="M36 66l20 20 36-40" fill="none" stroke="#fff" stroke-width="14"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Save it next to other design sources (e.g. `assets/icon.svg`), not inside the shipped folder, so it isn't bundled.

## Wiring per framework

### WXT (default)
WXT auto-discovers `public/icon/<size>.png` (also `public/icon-<size>.png`, `public/icons/<size>.png`) and fills `manifest.icons`. Nothing to add to `wxt.config.ts`.

```
public/icon/16.png  32.png  48.png  128.png
```

Alternative: `@wxt-dev/auto-icons` module generates sizes from `<srcDir>/assets/icon.png` at build time (SVG supported) and greys the icon in dev. Use it when the project already has it; otherwise the script's output is enough. Docs: https://wxt.dev/guide/essentials/config/manifest.html#icons

### Plasmo
Plasmo reads one high-resolution `assets/icon.png` (alternatives: `icon512.png`, `icon-1024x1024.png`, …) and generates the smaller sizes, greyscaled in dev. Provide 512 or 1024px PNG. Docs: https://docs.plasmo.com/framework/icon

### Vanilla / Vite / CRXJS
Paths are relative to the folder containing `manifest.json` (for Vite, files in `public/` are copied to the output root).

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Toolbar (action) icons and dynamic state

If `action.default_icon` is omitted, Chrome uses `manifest.icons` — the default for most extensions. Add a separate set only when the toolbar glyph should differ (e.g. a simplified monochrome mark):

```json
{ "action": { "default_icon": { "16": "icons/action16.png", "24": "icons/action24.png", "32": "icons/action32.png" } } }
```

Generate with `--sizes 16,24,32 --out <dir>` from the simplified source, then rename to match. For state changes (enabled/disabled, recording), swap at runtime instead of shipping many manifests:

```ts
await chrome.action.setIcon({
  path: { 16: '/icons/off16.png', 32: '/icons/off32.png' },
  tabId, // omit for all tabs
});
```

Prefer `chrome.action.setBadgeText` / `setBadgeBackgroundColor` for counts. In WXT, files in `public/` are served from the root (`/icon/16.png`).

## Icons used by content scripts

An `<img>` injected into a web page needs the file listed in `web_accessible_resources`, scoped to the sites that need it:

```json
{ "web_accessible_resources": [{ "resources": ["icons/icon48.png"], "matches": ["https://*.example.com/*"] }] }
```

Load it with `chrome.runtime.getURL('icons/icon48.png')`. Avoid `<all_urls>` matches; they let any site fingerprint the extension.

## Verify the build output

1. Build (`npm run build` / `wxt build` / `plasmo build`).
2. Open the built `manifest.json` (WXT: `.output/chrome-mv3/`, Plasmo: `build/chrome-mv3-prod/`) and confirm every icon path exists in that folder.
3. Load unpacked and check the toolbar, `chrome://extensions` card, and any context menu at 100% and 200% zoom, light and dark browser theme.
4. Optional size win: `pngquant --quality=80-95 --ext .png --force <dir>/*.png` (icons are usually already small; skip if it degrades the 16px edge).
