## Contents
1. DOM XSS sinks
2. Privileged message handlers (content script → service worker)
3. External messaging (`externally_connectable`, `onMessageExternal`)
4. `window.postMessage` bridges in content scripts
5. Secrets shipped in the bundle
6. Dynamic and remotely hosted code
7. Manifest CSP
8. Storage exposure
9. `web_accessible_resources`
10. Network: HTTP and open fetch proxies
11. Dependencies

Each entry: **Detect** (candidate regex for `grep -rnE`), **Confirm** (what makes it a real finding), **Discard** (common false positives), default **Severity**, **Fix**. Adjust severity to the actual data and permissions involved.

## 1. DOM XSS sinks
- **Detect:** `innerHTML|outerHTML|insertAdjacentHTML|document\.write|dangerouslySetInnerHTML|v-html|\{@html|createContextualFragment|\.html\(`
- **Confirm:** the value traces back to page DOM, a message from a content script, a URL, a fetched response, or storage written from any of those.
- **Discard:** string literals, values passed through DOMPurify (or the Sanitizer API) immediately before the sink, framework text bindings (`{value}` in JSX/Vue/Svelte escape by default).
- **Severity:** high in extension pages/service-worker-driven UI (script runs with extension privileges if CSP is bypassed or via `href`); medium in a content script's own UI (page-origin XSS).
- **Fix:** `textContent` / `createElement`, framework bindings, or `DOMPurify.sanitize()` when HTML is genuinely needed. Also check `href`/`src` assignments for `javascript:` URLs — allow only `https:`.

## 2. Privileged message handlers
`runtime.onMessage` only receives messages from the extension's own contexts, so `sender.id !== chrome.runtime.id` checks are not the protection that matters. The risk is a content script (possibly running in a compromised renderer) asking the service worker to do something privileged.
- **Detect:** `onMessage\.addListener|onConnect\.addListener|defineExtensionMessaging|sendToBackground|@plasmohq/messaging`
- **Confirm:** a handler reachable from content scripts passes message fields into `fetch(url)`, `tabs.create/update({url})`, `scripting.executeScript`, `cookies.*`, `downloads.*`, `storage` writes of security-relevant keys, or returns secrets/other-origin data.
- **Discard:** handlers that only accept a fixed action enum with typed, validated params and return non-sensitive data.
- **Severity:** high (critical if it yields arbitrary-URL fetch with cookies/host permissions, script execution, or token disclosure).
- **Fix:** allowlist actions; validate params (schema or explicit checks); constrain URLs to known origins; when the action is tab-specific, check `sender.tab` / `sender.origin` against expected hosts; never send tokens or other-origin data back to content scripts.

```ts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'lookup' || typeof msg.query !== 'string') return;
  if (sender.origin !== 'https://app.example.com') return; // tab-scoped action
  const url = new URL('https://api.example.com/search');
  url.searchParams.set('q', msg.query.slice(0, 200));
  fetch(url).then((r) => r.json()).then(sendResponse);
  return true;
});
```

## 3. External messaging
Facts: without `externally_connectable`, every other extension can message yours and no web page can; `ids: ["*"]` re-allows all extensions; `matches` lists the web pages that may connect.
- **Detect:** `onMessageExternal|onConnectExternal` in code; `externally_connectable` in the manifest.
- **Confirm:** an external listener performs privileged work without checking `sender.id` (extensions) or `sender.origin`/`sender.url` (pages) against an allowlist; or `matches` covers origins the extension does not control (e.g. `https://*/*`, user-content hosts).
- **Discard:** listeners that only return public data.
- **Severity:** high; critical if any website can trigger it.
- **Fix:** narrowest `matches`/`ids`; exact-match check of `sender.origin` in the listener; validate payloads as in §2.

## 4. `window.postMessage` bridges
Any script on the page (including third-party ads and other extensions' main-world scripts) can post to `window` and read what you post.
- **Detect:** `addEventListener\(['"]message|onmessage\s*=|postMessage\(`
- **Confirm:** a content-script `message` listener acts on data without checking `event.source === window` and `event.origin`, or forwards it to the service worker; or the extension posts secrets with `targetOrigin` `'*'`.
- **Discard:** listeners in extension pages talking to their own sandboxed iframe with origin checks.
- **Severity:** high when it reaches a privileged handler (chains into §2); medium otherwise.
- **Fix:** check `event.source === window`, exact `event.origin`, a namespaced message type, and validate data; never post tokens to the page. Prefer `chrome.runtime` messaging or `externally_connectable` over page bridges.

## 5. Secrets in the bundle
Everything in the package — including values inlined from `.env` at build time (`import.meta.env.*`, `process.env.*`, `WXT_*`, `PLASMO_PUBLIC_*`) — is public.
- **Detect:** `sk-[A-Za-z0-9]|sk_live_|AKIA[0-9A-Z]{16}|ghp_|xox[bp]-|-----BEGIN|client_secret|api[_-]?key|secret|bearer ` in source and in `.env*` files referenced by the build; also scan built output if present.
- **Confirm:** a server-side secret (LLM/provider keys, Stripe secret keys, OAuth client secrets, DB URLs, admin tokens).
- **Discard:** publishable keys meant for clients (Firebase web config, Stripe `pk_*`, OAuth client IDs, Sentry DSN), placeholders, test fixtures.
- **Severity:** critical for live server secrets.
- **Fix:** move the call behind a backend proxy with per-user auth; rotate the leaked key. User-supplied keys stay in `chrome.storage.local`, never `sync`.

## 6. Dynamic and remotely hosted code
MV3 extension pages and the service worker cannot run remote scripts or evaluate strings (blocked by the CSP floor). What remains exploitable:
- **Detect:** `eval\(|new Function|setTimeout\(\s*['"\x60]|importScripts\(|executeScript|world:\s*['"]MAIN|userScripts|<script[^>]+src=["']https?:`
- **Confirm:** code fetched at runtime then executed (via `scripting.executeScript` with a fetched string turned into `func`, `userScripts.register` with remote code, injection of `<script src>` into the page, or `eval` in a MAIN-world/sandboxed context with untrusted input); remote config that switches behavior to unreviewed logic.
- **Discard:** bundler/runtime helpers in `node_modules` that are never reached, `executeScript({ files: [...] })` with packaged files, `func` with static functions.
- **Severity:** critical (also a CWS policy violation — leave policy wording to a CWS review).
- **Fix:** bundle all logic; ship data (JSON rules, DNR rulesets) instead of code; put unavoidable eval in a sandboxed page with no extension API access.

## 7. Manifest CSP
- Default `extension_pages`: `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';` — cannot be relaxed (Chrome refuses to install with `'unsafe-eval'`, remote hosts, etc.). Do not report "unsafe-eval in extension_pages" as a live risk; Chrome rejects it.
- Real findings: `sandbox` CSP that allows remote `script-src`; a sandboxed page that receives `postMessage` data and treats it as code; `connect-src`/`frame-src` wide open where data exfil matters (low).
- Inline handlers (`onclick=` in extension HTML) are a functional bug (blocked by CSP), not a vulnerability — report as low.

## 8. Storage exposure
`storage.local`, `storage.sync`, and `storage.managed` are readable from content scripts by default; `storage.session` is in memory, limited to trusted contexts by default, and cleared on browser restart or extension reload/update/disable. Access is changed with `chrome.storage.<area>.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' | 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })`.
- **Detect:** `storage\.(local|sync|session)\.set|setAccessLevel|localStorage\.setItem` near `token|auth|password|session|cookie|key`.
- **Confirm:** auth tokens/credentials in `sync` (synced to the user's Google account and every signed-in browser), or in `local`/`sync` while content scripts exist and access level was not restricted; `session.setAccessLevel('TRUSTED_AND_UNTRUSTED_CONTEXTS')` with secrets inside; secrets in `localStorage` of a content script (page-origin storage).
- **Severity:** medium (high for long-lived refresh tokens exposed to content scripts).
- **Fix:** short-lived tokens in `storage.session`; long-lived ones in `local` with `setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })` called at service-worker startup; never `sync` or page `localStorage`.

## 9. `web_accessible_resources`
Nothing is web-accessible by default; each exposed file lets sites fingerprint the extension, and exposed HTML pages can be framed (clickjacking) or receive attacker-controlled URL params.
- **Confirm:** `resources` with broad globs (`*`, `**/*`, `*.js`) or exposed HTML pages, combined with `matches` of `<all_urls>`/`*://*/*` when only a few sites need them.
- **Severity:** low for fingerprinting; medium for framed pages that perform actions on click or read URL params into sinks.
- **Fix:** list exact files; narrow `matches`; set `"use_dynamic_url": true` (per-session URL, defeats static fingerprinting); add `frame-ancestors` restrictions or confirmation steps for exposed action pages.

## 10. Network
- **Detect:** `http://` (excluding `localhost`/`127.0.0.1` and XML namespaces), `fetch\(` with variable URLs.
- **Confirm:** production requests over HTTP; service-worker `fetch` whose URL comes from a message or page data (open proxy riding the extension's host permissions and cookies).
- **Severity:** high for HTTP carrying user data or auth; high for open proxies.
- **Fix:** HTTPS only; build URLs from fixed origins and validated params.

## 11. Dependencies
- Run `npm audit --omit=dev` / `pnpm audit --prod` / `yarn npm audit --environment production` per the lockfile. Report only advisories reachable in shipped code; dev-only build tooling is low unless it can inject code into the bundle.
