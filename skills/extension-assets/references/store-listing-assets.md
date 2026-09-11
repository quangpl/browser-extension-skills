# Chrome Web Store Listing Assets

## Required Assets

### Store Icon

- Size: 128x128 PNG
- Same file as `icon128.png` in manifest
- Displayed in search results and listing page

### Screenshots (required: 1–5)

| Dimension | Notes                       |
| --------- | --------------------------- |
| 1280x800  | Recommended (full HD 16:10) |
| 640x400   | Alternative (half size)     |

- Format: PNG or JPG
- No rounded corners — CWS adds them automatically
- No device frames — show real UI, CWS may add frame
- Must show extension in action, not just marketing copy

## Promotional Images

| Asset              | Size     | Purpose                                    |
| ------------------ | -------- | ------------------------------------------ |
| Small promo tile   | 440x280  | Required for featured/collection placement |
| Large promo tile   | 920x680  | Used in marquee/spotlight                  |
| Marquee promo tile | 1400x560 | Homepage banner (invite-only)              |

All promo images:

- Format: PNG or JPG
- No alpha/transparency
- Include extension name and tagline
- Consistent branding with extension icon

## Text Requirements

### Short Description

- Max: 132 characters
- Shown in search results
- Front-load the value proposition

### Full Description

- Max: 16,000 characters
- First 150 characters appear in search results — make them count
- Use line breaks and sections for readability
- Include keywords naturally

## Screenshot Best Practices

1. **Show features in action** — real use case, not empty state
2. **Consistent UI** — same browser theme across all screenshots
3. **Clean data** — no personal info, test data only
4. **Highlight key features** — each screenshot = one feature
5. **Add captions** — text overlays explaining what's shown
6. **Order matters** — first screenshot is most prominent

## Category Selection Guide

| Category               | Best for                            |
| ---------------------- | ----------------------------------- |
| Productivity           | Tab management, notes, focus tools  |
| Developer Tools        | DevTools, API testers, code helpers |
| Shopping               | Price compare, coupon finders       |
| News & Weather         | Feed readers, aggregators           |
| Social & Communication | Chat enhancers, email tools         |
| Accessibility          | Screen readers, font tools          |

## Generation: Placeholder Assets

```bash
# Screenshot placeholder
convert -size 1280x800 xc:"#f8f9fa" \
  -font DejaVu-Sans -pointsize 40 -fill "#495057" \
  -gravity center -annotate 0 "Screenshot 1\nShow your feature here\n1280x800" \
  screenshot1.png

# Small promo tile
convert -size 440x280 gradient:"#4285f4-#0d47a1" \
  -font DejaVu-Sans-Bold -pointsize 36 -fill white \
  -gravity center -annotate 0 "Extension Name\nYour tagline here" \
  promo-small.png

# Large promo tile
convert -size 920x680 gradient:"#4285f4-#0d47a1" \
  -font DejaVu-Sans-Bold -pointsize 48 -fill white \
  -gravity center -annotate 0 "Extension Name\nYour tagline here" \
  promo-large.png
```

## Localization

- Upload separate screenshots per locale in CWS Developer Dashboard
- Localize promo tile text (create variants per language)
- `_locales/` folder handles UI strings — store assets localized manually via dashboard
- Priority locales: en, es, pt, de, fr, ja, ko, zh-CN

## Validation Checklist

- [ ] 128x128 store icon uploaded
- [ ] At least 1 screenshot (1280x800 or 640x400)
- [ ] Short description ≤ 132 chars
- [ ] First 150 chars of full description are compelling
- [ ] Small promo tile (440x280) if seeking featured placement
- [ ] No personal data visible in screenshots
