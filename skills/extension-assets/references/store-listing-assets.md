# Chrome Web Store Listing Images

## Contents
- Required and optional images
- Screenshots: capture and compose
- Promo tiles
- Localized images
- Checklist

Listing copy, category, and privacy fields belong to the publishing workflow, not here.

## Required and optional images

| Image | Size | Format | Required |
|---|---|---|---|
| Store icon | 128×128 (96×96 artwork + 16px transparent padding) | PNG | Yes — the manifest 128 icon |
| Screenshot | 1280×800 (preferred) or 640×400 | PNG or JPEG | At least 1, up to 5 |
| Small promo tile | 440×280 | PNG or JPEG | Yes |
| Marquee promo tile | 1400×560 | PNG or JPEG | No — needed to be eligible for marquee featuring |

CWS lists no other promo sizes; templates for a 920×680 "large tile" are obsolete.

Sources: https://developer.chrome.com/docs/webstore/images, https://developer.chrome.com/docs/webstore/cws-dashboard-listing#graphic-assets

## Screenshots: capture and compose

CWS asks that screenshots demonstrate the actual user experience: square corners, no padding (full bleed), exact pixel size. Use real captures; if the UI isn't built yet, deliver the capture plan instead of placeholder art that would misrepresent the extension.

Default: capture with Playwright using the built extension, then compose with sharp.

```ts
// capture-screens.ts — run after `npm run build`; EXT = built folder containing manifest.json
import { chromium } from 'playwright';
import path from 'node:path';

const EXT = path.resolve('.output/chrome-mv3');
const ctx = await chromium.launchPersistentContext('', {
  channel: 'chromium', // allows extensions in headless mode
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
let [sw] = ctx.serviceWorkers();
sw ??= await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;

const page = await ctx.newPage();
await page.goto('https://example.com'); // a realistic page where the extension acts
await page.screenshot({ path: 'store/raw-page.png' });

const popup = await ctx.newPage();
await popup.setViewportSize({ width: 380, height: 560 }); // match the popup's real size
await popup.goto(`chrome-extension://${id}/popup.html`);
await popup.screenshot({ path: 'store/raw-popup.png' });
await ctx.close();
```

Compose a 1280×800 frame: page capture as background, popup placed near the top-right where the toolbar popup would open, optional caption band.

```ts
import sharp from 'sharp';
await sharp('store/raw-page.png')
  .resize(1280, 800, { fit: 'cover' })
  .composite([{ input: 'store/raw-popup.png', top: 16, left: 1280 - 380 - 24 }])
  .flatten({ background: '#ffffff' })
  .png()
  .toFile('store/screenshot-1.png');
```

Rules of thumb:
- One feature per screenshot; the first one carries the main value proposition.
- Use seeded demo data — no real names, emails, tokens, or private URLs.
- Short caption text is fine on screenshots (unlike promo tiles); keep it ≥ 24px so it survives the store's downscaling.
- Same browser theme and accent color across the set.

## Promo tiles

CWS guidance for promotional images:
- Communicate the brand, not a screenshot. Avoid text (the extension name at most).
- Fill the whole region with saturated color; avoid large white/light-gray areas — the tile sits on a light gray page.
- Well-defined edges; still readable at half size.
- Export opaque (no transparency).
- Google brand references must follow https://developer.chrome.com/docs/webstore/branding.

Fast default: compose from the icon source with sharp — brand-color background plus the mark, centered or offset.

```ts
import sharp from 'sharp';
const tile = async (w: number, h: number, out: string) => {
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
       <defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#4F46E5"/><stop offset="1" stop-color="#7C3AED"/></linearGradient></defs>
       <rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  const mark = await sharp('assets/icon.svg', { density: 600 }).resize(Math.round(h * 0.55)).png().toBuffer();
  await sharp(bg).composite([{ input: mark, gravity: 'center' }]).flatten().png().toFile(out);
};
await tile(440, 280, 'store/promo-small-440x280.png');
await tile(1400, 560, 'store/promo-marquee-1400x560.png');
```

For richer art, use the prompts in the image-generation reference, then crop/resize to the exact size with `sharp(...).resize(w, h, { fit: 'cover' })`.

## Localized images

Screenshots and promo tiles can be uploaded per locale in the CWS dashboard (Store listing → language selector). Produce `store/<locale>/screenshot-N.png` only for locales the extension UI actually supports (`_locales/`).

## Checklist

- [ ] `store/` is outside the packaged folder (WXT `public/` and Plasmo `assets/` are bundled — keep store art in a top-level `store/`).
- [ ] Store icon: 128 PNG with 96px artwork, readable on light and dark.
- [ ] 1–5 screenshots, exactly 1280×800 (or 640×400), real UI, no personal data.
- [ ] Small promo tile 440×280, opaque, little or no text.
- [ ] Marquee 1400×560 if the developer wants featuring eligibility.
- [ ] Verify sizes: `node -e "import('sharp').then(async ({default:s})=>{for (const f of process.argv.slice(1)) {const m=await s(f).metadata(); console.log(f, m.width+'x'+m.height, m.hasAlpha?'alpha':'opaque')}})" store/*.png`
