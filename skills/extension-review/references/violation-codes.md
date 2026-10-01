# Chrome Web Store Violation Codes

Source of truth: https://developer.chrome.com/docs/webstore/troubleshooting (policy text: https://developer.chrome.com/docs/webstore/program-policies). CWS names each violation with a color + element ID. Several IDs share one policy section and the page does not distinguish them; cite the group (e.g. "Red Nickel / Red Potassium / Red Silicon") when unsure which one applies. If a rejection email cites an ID not listed here, fetch the troubleshooting page again.

"Report severity" is this skill's default for a confirmed finding: CRITICAL = rejection or removal is near-certain and usually needs a redesign; HIGH = rejection is likely until fixed; MEDIUM = reviewer discretion.

## Code and security

| ID | Policy section | Typical triggers | Scanner checks | Report severity |
|---|---|---|---|---|
| Blue Argon | Additional requirements for MV3 (no remotely hosted code) | `<script src>` outside the package; `eval()`/`new Function`/string timers on remotely fetched strings; an interpreter running commands fetched as data | `remote-code.*` | CRITICAL |
| Red Titanium | Obfuscation (Code Readability) | base64-encoded or character-encoded (`\x`/`\u`) code or strings; javascript-obfuscator output. Minification (whitespace removal, short names, file concatenation) is allowed | `obfuscation.*` | CRITICAL (HIGH for single encoded strings) |
| Grey Silicon | Cryptocurrency mining | mining on user machines or providing mining functionality | `crypto-mining.signature` | CRITICAL |
| Blue Titanium | Enforcement circumvention | manipulating store state/listings or update distribution to evade enforcement | — | CRITICAL |

Blue Argon exemptions (policy text): remote logic is allowed only through the `chrome.debugger` and `chrome.userScripts` APIs used for their documented purpose; code in sandboxed pages/iframes isolated from extension APIs may load remote code but must still be disclosed and follow user-data policies. Fetching remote config/feature flags, images, or account data is fine as long as all logic ships in the package.

## Functionality and listing quality

| ID | Policy section | Typical triggers | Scanner checks | Report severity |
|---|---|---|---|---|
| Yellow Magnesium | Functionality not working | files named in the manifest missing from the package or wrong case; feature broken at review time (e.g. server down); behavior differs from the listing; unclear error states (account required, offline) | `manifest.missing-file`, `manifest.icons` (SVG/WebP), `manifest.invalid-json` | HIGH |
| Yellow Zinc | Missing or insufficient metadata | missing icon, title, screenshot, or description; title/description/screenshots not meaningful or misleading | `manifest.icons`, `manifest.name`, `manifest.description` | HIGH |
| Yellow Potassium | Minimum functionality | package with only a manifest; no discernible value; listed feature not provided by the extension itself; click-bait metadata | — (judgement) | HIGH |
| Yellow Lithium | Redirection | only functionality is launching another app, theme, or website (popup/new tab that just shows a site or a promo page) | — (judgement) | HIGH |
| Yellow Argon | Keyword stuffing | excessive, irrelevant, or inappropriate keywords in metadata, mostly the description; long lists of sites the extension works on | `listing.keyword-stuffing` | MEDIUM |
| Yellow Nickel | Spam | duplicate extensions from you/affiliates; manipulated reviews, ratings, or installs; disruptive notifications; sending messages on the user's behalf without consent | — (judgement) | MEDIUM |

## Deception, purpose, and overrides

| ID | Policy section | Typical triggers | Scanner checks | Report severity |
|---|---|---|---|---|
| Red Nickel, Red Potassium, Red Silicon | Deceptive behavior | not providing, or providing different functionality than, the metadata describes; undisclosed actions; impersonating or copying another entity; implying endorsement | — (judgement) | HIGH |
| Red Magnesium, Red Copper, Red Lithium, Red Argon | Single purpose | two or more unrelated purposes; unrelated functionality behind the action icon; new-tab search that ignores the user's search provider or skips `chrome.search`. Replacing an override page, replacing the default search provider via override settings, or injecting ads each counts as a whole purpose (no other features allowed, except compliant search-first extensions) | — (judgement) | HIGH |
| Blue Nickel, Blue Potassium | Circumvents the Overrides API | changing the New Tab page or omnibox search without `chrome_url_overrides` / `chrome_settings_overrides` | — (judgement) | HIGH |
| Red Zinc | Deceptive installation | unclear disclosures in marketing before the listing; misleading CTAs or forms that imply an outcome other than installing; resizing the listing window to hide metadata | — (out of package) | HIGH |
| Grey Titanium | Affiliate ads | affiliate links, codes, or cookies not disclosed in the description and UI; added without a related user action or user benefit | `affiliate.link` | MEDIUM |

## User data

| ID | Policy section | Typical triggers | Scanner checks | Report severity |
|---|---|---|---|---|
| Purple Potassium | Excessive permissions | requested but unused permission; a permission broader than the feature needs (see misunderstood permissions below) | `permissions.*` | HIGH (MEDIUM for broad hosts that are justified) |
| Purple Lithium | Disclosure (privacy policy) | collects user data without a privacy policy; policy not in the dashboard's designated field (e.g. pasted into the description); dead, inaccessible, or wrong URL; policy silent on collection, use, handling, sharing | `privacy.policy-required` | HIGH |
| Purple Nickel | Prominent disclosure | data use not prominently disclosed; no consent before collection. Disclosure in the listing is sufficient; data not disclosed there needs in-product notice + consent first, consistent with the single purpose | — (judgement) | HIGH |
| Purple Copper | Secure transmission | user data sent over HTTP or to an insecure domain; user data in request headers or query parameters, even over HTTPS | `insecure-http.*` | HIGH |
| Purple Magnesium | Other requirements | collecting web browsing activity not needed for a user-facing feature; user data disclosed publicly | — (judgement) | HIGH |

Commonly misunderstood permissions (from the Purple Potassium section):
- `activeTab`: temporary access after the user invokes the extension. Not needed with broad/specific host permissions, for `action` API methods, `tabs.sendMessage`, or basic `tabs.query` for the current tab.
- `tabs`: only unlocks `url`, `pendingUrl`, `title`, `favIconUrl` on Tab objects. Not needed for `chrome.tabs` methods or when broad host access is present.
- `cookies`: needed for `chrome.cookies` in extension contexts; not for `document.cookie` or the Cookie Store API.
- `storage`: needed for `chrome.storage`; not for `localStorage`, `sessionStorage`, or IndexedDB.

## Prohibited and content policies

Usually a product decision rather than a code fix; when it is the primary purpose, Google recommends unpublishing.

| ID | Policy section | Typical triggers | Report severity |
|---|---|---|---|
| Blue Zinc, Blue Copper, Blue Lithium, Blue Magnesium | Prohibited products | access to paywalled or login-restricted content; YouTube video download; downloading content in violation of IP rights | CRITICAL |
| Grey Zinc | Illegal activities | promoting or facilitating illegal activities | CRITICAL |
| Grey Copper | Online gambling | gambling or prediction markets in or via the extension; directing users to them; skill games with cash prizes | CRITICAL |
| Grey Lithium | Pornographic content | sexually explicit material, or directing users to / enhancing porn sites | CRITICAL |
| Grey Magnesium | Hate content | hate speech or directing users to it | CRITICAL |
| Grey Potassium | Violent content | violent or bullying content or links to it | CRITICAL |
| Grey Nickel | Not family safe | content not suitable for all ages without the mature-content flag | MEDIUM |

## Not a violation code, but blocks submission

- Manifest V2 packages: CWS no longer accepts MV2 (https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline). Scanner check `manifest.version`; report CRITICAL.
- Manifest limits: `name` ≤ 75 chars, `description` ≤ 132 chars; icons must be raster (128×128 required, 48×48 recommended, 16×16 favicon), SVG/WebP unsupported (https://developer.chrome.com/docs/extensions/reference/manifest/icons).

## After a rejection

Fix every cited issue (and the rest of this report), then resubmit from the Developer Dashboard. If the reason is unclear, use the developer support form (https://support.google.com/chrome_webstore/contact/one_stop_support); if you believe the reviewer is wrong, use **Appeal** on the item page with a concrete explanation (e.g. where each permission is used).
