# Store Listing Copy

Sources: https://developer.chrome.com/docs/webstore/best-listing, https://developer.chrome.com/docs/webstore/cws-dashboard-listing, https://developer.chrome.com/docs/webstore/images

## Fields and limits

| Field | Where it lives | Limit / rule |
|---|---|---|
| Name (title) | manifest `name` (`__MSG_*__` for locales) | ≤ 75 chars; aim for ~30–45 so it isn't truncated in cards |
| Summary | manifest `description` | ≤ 132 chars, plain text; shown on home, category, and search results |
| Description | Dashboard → Store listing | Overview paragraph + short feature list; plain text (no Markdown/HTML rendering) |
| Category, language | Dashboard → Store listing | One primary category; language enables search in that language |
| Store icon | 128×128 PNG in the zip | 96×96 artwork + 16 px transparent padding |
| Screenshots | Dashboard | 1–5, 1280×800 (or 640×400), full bleed, square corners |
| Small promo tile | Dashboard | 440×280 PNG/JPEG, required |
| Marquee | Dashboard | 1400×560, optional, needed to be featured in marquee |
| Promo video | Dashboard | YouTube URL, optional |
| Homepage / support URL, official URL | Dashboard | Official URL requires a Search Console-verified site |

Images are produced by the extension-assets skill (if installed) into `store/`; this file covers copy only.

## Writing the copy

Name: core function, short and distinctive; brand first or `Brand: function`. No keyword lists, superlatives, or competitor names.

Summary (manifest `description`): what it does + for whom + differentiator in one sentence. No "best", "fastest", "#1".

Description template:
```
<One-paragraph overview: the problem and what the extension does about it, 2–3 sentences.>

Features:
• <Feature> — <concrete outcome>
• <Feature> — <concrete outcome>
• <Feature> — <concrete outcome>

How it works: <1–2 sentences: where it appears (popup, side panel, on-page) and what the user does.>

Privacy: <what data is processed, whether it leaves the device — must match the Privacy tab and policy.>

<Optional: pricing/free tier, support link, changelog highlights.>
```

Rules from the Listing Requirements and Keyword Spam policies (https://developer.chrome.com/docs/webstore/program-policies/policies):
- A blank description, missing icon, or missing screenshots is an automatic rejection.
- Describe only features present in the submitted build; reviewers test them, and metadata must match behavior and the Privacy tab.
- No lists of sites/brands/keywords or regional locations without real added value; never repeat a keyword more than 5 times.
- No unattributed or anonymous user testimonials.

Keywords: there is no keyword field. Put the primary search term in the name or summary and once early in the description; secondary terms go in feature bullets. Research by typing candidate terms into the CWS search box and reading the top competitors' summaries.

Ranking signals CWS documents: ratings and usage (installs vs uninstalls over time), clear purpose, quality onboarding. Ask for ratings after a successful action, never on install, and never incentivize reviews.

## Category

Pick the single most specific category matching the single purpose (descriptions: https://developer.chrome.com/docs/webstore/best-practices). Store groups: Productivity (Communication, Developer Tools, Education, Tools, Workflow & Planning), Lifestyle (Art & Design, Entertainment, Games, Household, Just for Fun, News & Weather, Shopping, Social Media & Networking, Travel, Well-being), Make Chrome Yours (Accessibility, Functionality & UI, Privacy & Security). "Tools" is the fallback when nothing else fits. If the dashboard list differs, the dashboard wins.

## Localization

- Localized listings require `_locales/<code>/messages.json` in the package plus `default_locale` in the manifest; each locale then gets its own description, screenshots, and video in the dashboard. Promo tiles are not localizable.
- Keep the described feature set identical across locales; the dashboard warns on inconsistent metadata.
- Localize only locales the UI actually supports.

## Output file

Write one file per locale, `store/listing.<locale>.md`:
```
# Listing (<locale>)
Name: …            (n/75)
Summary: …         (n/132)
Category: …
Language: …

## Description
…

## Assets
- [ ] store/screenshot-1.png … (1280×800)
- [ ] store/promo-small-440x280.png
- [ ] Marquee (optional)
- Homepage URL: …   Support URL: …
```
Include character counts so the user can paste without re-checking, and update manifest `name`/`description` (or the `_locales` messages) to match.
