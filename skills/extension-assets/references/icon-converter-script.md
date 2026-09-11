# SVG → PNG Icon Converter (Node.js + sharp)

## Install

```bash
npm install -D sharp
```

## Script: scripts/generate-icons.js

```javascript
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SOURCE = process.argv[2] || "icon.svg";
const OUTPUT_DIR = process.argv[3] || "public/icons";

// Extension icons
const EXTENSION_SIZES = [16, 32, 48, 128];
// Action (toolbar) icons
const ACTION_SIZES = [16, 24, 32];

async function generateIcons() {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const sourceBuffer = fs.readFileSync(SOURCE);

  // Generate extension icons
  for (const size of EXTENSION_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon${size}.png`);
    await sharp(sourceBuffer)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${outputPath} (${size}x${size})`);
  }

  // Generate action icons
  for (const size of ACTION_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `action${size}.png`);
    await sharp(sourceBuffer)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${outputPath} (${size}x${size})`);
  }

  console.log("\nAll icons generated successfully.");
}

generateIcons().catch(console.error);
```

## Usage

```bash
# Default: icon.svg → public/icons/
node scripts/generate-icons.js

# Custom source and output
node scripts/generate-icons.js logo.svg dist/icons
```

## Output

```
public/icons/
├── icon16.png      # 16x16
├── icon32.png      # 32x32
├── icon48.png      # 48x48
├── icon128.png     # 128x128
├── action16.png    # 16x16 (toolbar)
├── action24.png    # 24x24 (toolbar)
└── action32.png    # 32x32 (toolbar)
```

## SVG Design Tips for Extensions

When generating SVG icons directly:

- **Simple shapes**: Circles, rounded squares, single recognizable symbol
- **Bold at 16px**: Must be readable at smallest size — avoid thin lines
- **2-3 colors max**: Primary color + accent, or primary + white
- **No text**: Text is illegible at 16x16
- **Flat design**: No shadows, gradients, or 3D effects
- **Transparent background**: Use `fill="none"` for outer container
- **128x128 viewBox**: Design at largest size, it scales down cleanly

### Example SVG Template

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="24" fill="#4F46E5"/>
  <path d="M40 64L56 80L88 48" stroke="white" stroke-width="10"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

## Add to package.json

```json
{
  "scripts": {
    "icons": "node scripts/generate-icons.js"
  }
}
```
