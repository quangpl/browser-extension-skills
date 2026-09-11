# Extension Icon Requirements

## Required Sizes

| Size    | File          | Where Chrome Uses It                               |
| ------- | ------------- | -------------------------------------------------- |
| 16x16   | `icon16.png`  | Favicon in address bar, context menus              |
| 32x32   | `icon32.png`  | Windows taskbar, @2x display fallback              |
| 48x48   | `icon48.png`  | Extensions management page (`chrome://extensions`) |
| 128x128 | `icon128.png` | Installation dialog, Chrome Web Store listing      |

## Action (Toolbar) Icons

| Size  | Usage                   |
| ----- | ----------------------- |
| 16x16 | Default toolbar display |
| 24x24 | @1.5x displays          |
| 32x32 | @2x (Retina) displays   |

Chrome auto-selects best size. Provide all three for sharp display on all screens.

## Format Requirements

- Format: PNG with transparent background
- Color mode: RGBA (32-bit)
- No JPG, WebP, or ICO for extension icons
- Avoid anti-aliased edges on transparency — use clean alpha channel

## manifest.json Configuration

```json
{
  "icons": {
    "16": "public/icons/icon16.png",
    "32": "public/icons/icon32.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "public/icons/action16.png",
      "24": "public/icons/action24.png",
      "32": "public/icons/action32.png"
    }
  }
}
```

## Generation: ImageMagick

```bash
# Single resize from PNG source
convert -resize 16x16 source-512.png icon16.png

# Batch from SVG (preserves transparency)
SOURCE="logo.svg"
for size in 16 32 48 128; do
  convert -background none -resize ${size}x${size} "$SOURCE" "icon${size}.png"
done

# From SVG with padding (10% margin)
convert -background none -density 300 logo.svg \
  -resize 115x115 -gravity center -extent 128x128 icon128.png
```

## Generation: sharp (Node.js)

```js
import sharp from "sharp";

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  await sharp("logo.svg")
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon${size}.png`);
}
```

Install: `npm install sharp`

## SVG to Multi-Size Pipeline

```bash
# Generate all extension + action icon sizes in one pass
for size in 16 24 32 48 128; do
  convert -background none -resize ${size}x${size} logo.svg icon${size}.png
done
```

## Design Guidelines

- **Simple**: Recognizable at 16x16 — avoid fine detail, thin lines, small text
- **Distinct**: Unique silhouette visible against light and dark Chrome themes
- **On-brand**: Match extension color/style with CWS listing assets
- **No text** at 16x16 or 32x32 sizes — unreadable
- **Safe zone**: Keep key elements within inner 75% of canvas
- **Test dark mode**: Chrome toolbar can be dark; use icon with visible contrast

## Validation

```bash
# Verify dimensions and format
for size in 16 32 48 128; do
  identify -format "%f: %wx%h %[channels]\n" icon${size}.png
done
# Expected output: icon16.png: 16x16 rgba
```
