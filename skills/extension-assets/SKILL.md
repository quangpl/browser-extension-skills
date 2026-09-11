---
name: extension-assets
description: "Generate and manage all Chrome extension assets: icons (16–128px), CWS listing images, promotional tiles, and public/ folder setup. Supports ImageMagick, Gemini API, and manual prompt templates."
---

# Extension Assets (Icon & Image Generator)

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

Generate all required icons and assets for a Chrome extension and CWS listing. Do NOT just explain — execute the workflow.

## Assets Checklist

### Extension Icons (required)

| File          | Size    | Usage                               |
| ------------- | ------- | ----------------------------------- |
| `icon16.png`  | 16x16   | Favicon, context menus              |
| `icon32.png`  | 32x32   | Windows taskbar                     |
| `icon48.png`  | 48x48   | Extensions management page          |
| `icon128.png` | 128x128 | Installation dialog, CWS store icon |

### Action Icons (toolbar)

| File           | Size  |
| -------------- | ----- |
| `action16.png` | 16x16 |
| `action24.png` | 24x24 |
| `action32.png` | 32x32 |

### CWS Listing Assets

| Asset              | Size                | Required?              |
| ------------------ | ------------------- | ---------------------- |
| Screenshots        | 1280x800 or 640x400 | Yes (1–5)              |
| Small promo tile   | 440x280             | For featured placement |
| Large promo tile   | 920x680             | Optional               |
| Marquee promo tile | 1400x560            | Optional               |

## Workflow (Execute This)

### Step 1: Generate or locate source icon

Ask user: "Do you have a source logo? (SVG or PNG, min 512x512)"

**If no source — generate SVG directly:**
Create a clean, professional SVG icon. Design should be:

- Simple geometric shapes (recognizable at 16x16)
- Flat design, no gradients (clean at all sizes)
- Natural, hand-crafted look (NOT AI-generated style)
- 2-3 colors max, bold contrast

Save as `icon.svg` in project root.

### Step 2: Convert SVG → PNG (Node.js script)

```bash
npm install -D sharp
node scripts/generate-icons.js
```

See `references/icon-converter-script.md` for the full Node.js script using **sharp**.

**Fallback (ImageMagick):**

```bash
for size in 16 32 48 128; do
  convert -background none -resize ${size}x${size} icon.svg "public/icons/icon${size}.png"
done
```

### Step 3: Generate placeholder CWS assets

```bash
# Screenshot placeholder (1280x800)
convert -size 1280x800 xc:"#f8f9fa" \
  -font DejaVu-Sans -pointsize 48 -fill "#6c757d" \
  -gravity center -annotate 0 "Screenshot Placeholder\n1280x800" \
  public/store/screenshot1.png

# Small promo tile (440x280)
convert -size 440x280 xc:"#4285f4" \
  -font DejaVu-Sans -pointsize 32 -fill white \
  -gravity center -annotate 0 "Extension Name\nChrome Web Store" \
  public/store/promo-small.png
```

### Step 4: Gemini API generation (optional)

Check for API key:

```bash
if [ -n "${GEMINI_API_KEY:-}" ]; then
  echo "GEMINI_API_KEY is set"
else
  echo "GEMINI_API_KEY is not set"
fi
```

If set, use `ai-multimodal` skill or call Gemini API directly. See `references/image-generation-prompts.md` for prompt templates.

If not set, output prompts from `references/image-generation-prompts.md` for user to generate manually.

### Step 5: Set up public/ folder

Follow structure in `references/public-folder-setup.md`. Verify manifest.json icon paths match.

### Step 6: Validate assets

```bash
# Check all required icons exist and are correct size
for size in 16 32 48 128; do
  identify public/icons/icon${size}.png | grep "${size}x${size}" \
    && echo "icon${size}.png OK" || echo "icon${size}.png MISSING/WRONG SIZE"
done
```

## Output Format

```
## Assets Generation Report: <extension-name>

### Generated Icons
- icon16.png ✓ | icon32.png ✓ | icon48.png ✓ | icon128.png ✓
- action16.png ✓ | action24.png ✓ | action32.png ✓

### CWS Listing Assets
- screenshot1.png (1280x800) ✓
- promo-small.png (440x280) ✓

### Pending (manual generation needed)
- Large promo tile (920x680) — prompt provided below
- Screenshots with real extension UI

### Prompts for Manual Generation
<see references/image-generation-prompts.md>
```

## References

- `references/icon-requirements.md` — Icon specs, manifest config, design guidelines
- `references/icon-converter-script.md` — Node.js script (sharp) to convert SVG → multi-size PNG
- `references/store-listing-assets.md` — CWS listing requirements and best practices
- `references/image-generation-prompts.md` — AI prompt templates, Gemini API setup
- `references/public-folder-setup.md` — public/ folder structure and manifest paths
- [Chrome Extension Icons](https://developer.chrome.com/docs/extensions/reference/api/action#icon)
- [CWS Best Listing](https://developer.chrome.com/docs/webstore/best-listing)

## Related Skills

- `extension-create` — Scaffold new extension with public/ folder
- `extension-manifest` — Generate/validate manifest.json icon paths
- `extension-publish` — Store submission checklist
