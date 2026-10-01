# Image Generation Prompts

Use these when a raster image model is available in the environment (an image-generation tool in the harness, or an image API such as Gemini or OpenAI when its key is set — check the provider's current docs for the model name and endpoint). Without one, put the filled-in prompts in the final message so the user can run them anywhere.

Generated art is a starting point: models render text badly, ignore exact pixel sizes, and add gradients/shadows. Always:
1. Generate square (1:1) at the model's native size for icons, the closest wide ratio for tiles.
2. Prefer re-drawing the result as a clean SVG mark when it's an icon (crisp at 16px, editable). Otherwise run the PNG through `generate-icons.mjs` (needs ≥ 512px).
3. Crop/resize tiles to the exact CWS size with sharp (`fit: 'cover'`), then view the result.

Fill `[BRACKETS]` from the repo: name from the manifest/package.json, purpose from the description, colors from the UI theme (CSS variables, Tailwind config).

## Extension icon

```
Flat vector app icon for a browser extension named "[NAME]" that [ONE-LINE PURPOSE].
A single bold, front-facing [SYMBOL] centered on a rounded-square [PRIMARY COLOR] background,
symbol in [CONTRAST COLOR]. Thick shapes, no thin lines, no text, no gradients,
no drop shadow, no perspective. Must stay recognizable at 16x16 pixels. Square 1:1, plain background.
```

Example fill: `"TabSaver" that saves and restores tab sessions … a bookmark ribbon … #2563EB … white`.

## Monochrome toolbar variant (optional)

```
Same symbol as the [NAME] icon, single solid [COLOR] silhouette on a transparent/plain background,
no container shape, maximum stroke weight, pixel-grid friendly, readable at 16x16. Square 1:1.
```

## Small promo tile (440x280) and marquee (1400x560)

CWS asks for brand art with little or no text, saturated full-bleed color, clear edges.

```
Promotional banner artwork for the browser extension "[NAME]" ([ONE-LINE PURPOSE]).
Saturated [PRIMARY COLOR] to [SECONDARY COLOR] background filling the entire frame,
the [SYMBOL] mark large and slightly off-center, simple abstract shapes hinting at [CORE FEATURE].
No text, no UI screenshots, no browser chrome, no white or light-gray areas, crisp edges.
Aspect ratio [11:7 for 440x280 | 5:2 for 1400x560].
```

## Screenshot backgrounds

Don't generate screenshots of the extension UI — CWS screenshots must show the real experience. Image models are fine for a neutral backdrop behind a real capture:

```
Soft abstract background in [PRIMARY COLOR] tones, subtle shapes, low contrast, no text, no objects,
16:10 aspect ratio, suitable as a backdrop behind a product screenshot.
```

## Consistency

- Reuse the same 1–2 brand colors (hex) and the same symbol across icon, tiles, and screenshot captions.
- Keep a `store/prompts.md` with the exact prompts used so assets can be regenerated consistently.
