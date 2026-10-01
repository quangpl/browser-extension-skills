# Privacy Practices Tab

The dashboard Privacy tab must be complete before the first publish (the API cannot fill it). Answers are shown to users on the listing and must agree with the code, the description, and the privacy policy; a contradiction is itself grounds for removal.
Sources: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy, https://developer.chrome.com/docs/webstore/program-policies/user-data-faq, https://developer.chrome.com/docs/webstore/program-policies/limited-use

## Derive answers from the code

Collect before writing:
- `permissions`, `optional_permissions`, `host_permissions`, `content_scripts[].matches` from the built manifest (WXT/Plasmo generate it — read `.output/chrome-mv3/manifest.json` or `build/chrome-mv3-prod/manifest.json`).
- Every network destination: `fetch`/XHR/WebSocket URLs, analytics/error SDKs, auth providers, payment providers.
- What is read from pages (DOM text, form fields, URLs) and what is stored (`chrome.storage.*`, IndexedDB) or sent off-device.

If a permission has no code path using it, remove it from the manifest and rebuild instead of justifying it.

## Single purpose

One or two sentences naming the narrow purpose every feature serves. Example: "Saves highlighted text from any web page into a personal reading list that syncs to the user's account." Several unrelated features under one name signals a split, not a rewording.

## Permission justifications

One field per permission the dashboard lists. Pattern: **what user-facing feature → what the permission does for it → scope limit**.

| Permission | Example justification |
|---|---|
| `activeTab` | When the user clicks the toolbar button, reads the current page's selected text to save it. No access until clicked. |
| `storage` | Stores the user's reading list and settings locally in chrome.storage. |
| `contextMenus` | Adds a "Save to reading list" item to the right-click menu. |
| `sidePanel` | Shows the reading list in Chrome's side panel next to the page. |
| `alarms` | Schedules a sync of saved items every 30 minutes. |
| `tabs` | Reads tab URLs/titles to list which open tabs are already saved. (If only the active tab on click is needed, use `activeTab` instead.) |
| `scripting` | Injects the highlight script into the active tab after the user clicks the button. |
| Host `https://api.example.com/*` | Sends saved items to the extension's own sync API. |
| Host `<all_urls>` / `*://*/*` | Required because highlighting must work on any site the user reads; the content script only reacts to user selection. |

Broad host access and sensitive permissions lengthen review; when a narrower option exists (`activeTab`, optional host permissions requested at runtime), switch to it before submitting.

## Remote code

Answer "No, I am not using remote code" unless the extension executes JavaScript/Wasm fetched at runtime (MV3 forbids remotely hosted code; remote JSON config or data is not remote code). If the answer is yes, the build needs fixing before submission.

## Data usage disclosure

Tick each category the extension **collects or transmits** (including data only processed locally — the FAQ says local handling still counts as handling):

| Dashboard category | Typical trigger in code |
|---|---|
| Personally identifiable information | Email/name from sign-in, `chrome.identity` profile |
| Health information | Health/medical content features |
| Financial and payment information | Checkout, card/bank data, transaction history |
| Authentication information | Passwords, tokens, auth cookies read or stored |
| Personal communications | Reading/sending email, chat, messages |
| Location | IP-based geolocation, `navigator.geolocation` |
| Web history | Visited URLs/titles, `history` permission |
| User activity | Clicks, keystrokes, scroll, mouse tracking, analytics events |
| Website content | Page text, images, form contents read by content scripts |

Then the three certifications (all must be true to submit):
1. Data is not sold or transferred to third parties outside the approved use cases.
2. Data is not used or transferred for purposes unrelated to the single purpose.
3. Data is not used or transferred to determine creditworthiness or for lending.

Limited Use also forbids using data for personalized ads and allows web-browsing data only for a prominently described user-facing feature. Sending data to an analytics vendor is a transfer that must fit these rules and be disclosed.

## Privacy policy

Required when any user data is handled. Host it at a stable public HTTPS URL (own domain, GitHub Pages) and enter it in the Privacy tab. Draft outline (write to `store/privacy-policy.md` if the user has none):
1. Who publishes the extension and how to contact them.
2. Data collected, per category above, and why.
3. Where it is stored and for how long; how users delete it.
4. Third parties that receive it (named) and why.
5. Statement that use complies with the Chrome Web Store User Data Policy, including Limited Use.
6. Security: transport over HTTPS; storage protections.
7. Effective date and how changes are announced.

Sensitive or unexpected collection also needs an in-product disclosure and consent before collection, not only the policy.

## Output file

Write `store/privacy-practices.md` with sections matching the dashboard (Single purpose, Permission justifications — one block per permission in manifest order, Remote code, Data usage — ticked categories with the code location that triggers each, Certifications, Privacy policy URL) so each block can be pasted directly.
