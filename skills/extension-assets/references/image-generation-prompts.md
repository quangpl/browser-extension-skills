# Image Generation Prompts for Extension Assets

## Gemini API Setup

```bash
# Set API key
export GEMINI_API_KEY="your-key-here"

# Or add to ~/.zshrc / ~/.bashrc
echo 'export GEMINI_API_KEY="your-key-here"' >> ~/.zshrc
```

Get key: https://aistudio.google.com/app/apikey

## Gemini API: Generate Icon

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [{"prompt": "'"$ICON_PROMPT"'"}],
    "parameters": {"sampleCount": 1, "aspectRatio": "1:1"}
  }' | jq -r '.predictions[0].bytesBase64Encoded' | base64 -d > icon-source.png
```

Then resize with ImageMagick (see `icon-requirements.md`).

## Prompt Templates

### Extension Icon

```
Flat design app icon for a Chrome browser extension called "[NAME]".
[ONE SENTENCE: what it does].
Simple geometric shape, single bold symbol, vibrant [COLOR] on transparent background.
No text, no gradients, no shadows. Works at 16x16 pixels.
Style: modern flat icon, Material Design inspired.
```

**Example:**

```
Flat design app icon for a Chrome browser extension called "TabSaver".
It saves and restores browser tab sessions.
Simple bookmark ribbon symbol, vibrant blue (#4285F4) on transparent background.
No text, no gradients, no shadows. Works at 16x16 pixels.
Style: modern flat icon, Material Design inspired.
```

### Screenshot

```
Browser screenshot showing a Chrome extension popup over a realistic webpage.
The popup shows [DESCRIBE UI: e.g., "a clean list of saved tabs with restore button"].
Browser: Chrome, light theme, URL bar visible.
Clean professional UI, [BRAND COLOR] accent color.
No personal data. Resolution: 1280x800.
```

### Small Promo Tile (440x280)

```
Chrome Web Store promotional banner, 440x280 pixels.
Extension name "[NAME]" in bold white sans-serif, centered.
Tagline: "[TAGLINE]" below in smaller text.
Background: gradient from [COLOR1] to [COLOR2], left to right.
Extension icon (simple symbol) on the right side.
Clean, professional, no clutter.
```

### Large Promo Tile (920x680)

```
Chrome Web Store large promotional image, 920x680 pixels.
Left side: extension name "[NAME]" large bold white text, tagline below, CTA "Add to Chrome".
Right side: browser mockup showing extension in action — [DESCRIBE FEATURE].
Background: solid [COLOR] or subtle gradient.
Style: modern SaaS product landing page aesthetic.
```

## Alternative Tools

### DALL-E (OpenAI)

Use the same prompts above. Works well for icons and promo tiles.
Best model: `dall-e-3`, size `1024x1024` for icons.

### Midjourney

Append to any prompt: `--style flat --ar 1:1 --v 6` for icons.
For banners: `--ar 11:7` (440x280 ratio).

### Canva

1. New design → Custom size → enter exact pixels
2. Use "Apps" → "Text to Image" with prompts above
3. Export as PNG

## Brand Consistency Tips

- Pick **2 primary colors** — use across icon, promo tiles, screenshots
- Use **one font family** in all text overlays
- Keep icon symbol visible in all assets (watermark style in promo images)
- Maintain same corner radius on UI screenshots
- Recommended color combos for extensions:
  - Productivity: `#4285F4` (blue) + `#34A853` (green)
  - Developer: `#202124` (dark) + `#8AB4F8` (blue)
  - Shopping: `#EA4335` (red) + `#FBBC04` (yellow)
  - Privacy/Security: `#1E3A5F` (navy) + `#00BCD4` (teal)
