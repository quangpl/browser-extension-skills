# Store Listing Optimization

## Title

- Max **45 characters** (including spaces)
- Pattern: `<Action verb> + <Benefit>`
- Good: `Block Ads & Trackers — Fast Browse`
- Bad: `Ad Blocker Pro Ultimate Best Free 2024`
- No keyword stuffing — violations trigger rejection
- Brand name at end if space allows: `Grammarly: Writing Assistant`

## Description

### Structure

```
[First 150 chars — shown in search results]
Hook: state the problem you solve clearly.

[Body]
• Key feature 1 — concrete benefit
• Key feature 2 — concrete benefit
• Key feature 3 — concrete benefit

[How it works — 2-3 sentences]

[Privacy/trust statement]

[CTA: e.g., "Install free — no account required"]
```

### First 150 Characters

- Shown in search snippets before "more" cutoff
- Must convey value proposition independently
- Avoid filler ("Welcome to...", "This extension...")
- Include primary use case + differentiator

### Length

- Min 200 chars required
- 500–1000 chars optimal for most extensions
- Use bullet points (`•`) for scannability
- Avoid markdown (not rendered in store)

## Screenshots

- **1280×800** or **640×400** (exact dimensions required)
- Show extension in action — not marketing splash screens
- Annotate with text overlays to highlight features
- Order: most compelling feature first
- Consistent visual style across all screenshots
- Include before/after if applicable
- No browser chrome required but adds context

## Category Selection

Choose the most **specific** applicable category:

| Category               | Use when                               |
| ---------------------- | -------------------------------------- |
| Productivity           | Task management, focus, workflow tools |
| Developer Tools        | Code, debugging, web inspection        |
| Accessibility          | Screen readers, contrast, input aids   |
| Shopping               | Price compare, coupons, wishlists      |
| News & Weather         | Content aggregation, feeds             |
| Social & Communication | Messaging, social media enhancements   |
| Entertainment          | Media players, streaming tools         |
| Search Tools           | Search enhancers, finders              |

## Keyword Strategy

- Keywords not a separate field — embedded in title + description
- Use terms users search for, not technical jargon
- Research: Chrome Web Store search autocomplete, competitor listings
- Primary keyword: in title and first sentence of description
- Secondary keywords: in bullet features naturally
- Avoid repetition — Google penalizes stuffing

## Rating & Review Acquisition

- Prompt users at moment of value (task completed, not on install)
- Use `chrome.runtime.openOptionsPage()` + in-app prompt — no forced popups
- Respond to all negative reviews publicly, offer fixes
- Never incentivize or fake reviews (ToS violation)
- Fix reported bugs quickly — improves rating trajectory

## Localization

- Translate `_locales/` folder for target markets
- `manifest.json` supports `__MSG_name__` pattern
- Localized listings rank better in regional searches
- Priority languages: `es`, `pt`, `de`, `fr`, `ja`, `zh_CN`
- Use `chrome.i18n.getMessage()` in code

```
_locales/
├── en/messages.json
├── es/messages.json
└── fr/messages.json
```

## Promotional Tile (440×280)

- Required to appear in featured sections
- Brand + one-line value prop
- High contrast, readable at small size
- No screenshots — use illustrated or branded graphics
