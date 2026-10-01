# Extension ↔ Backend Patterns

## Contents
- Flow
- Manifest and Google Cloud setup
- Service-worker API client (getAuthToken + 401 retry)
- launchWebAuthFlow (non-Google or non-Chrome)
- Content scripts call through the service worker
- Entitlement controller and cached check

## Flow

```
service worker ── chrome.identity.getAuthToken ──▶ Google ──▶ access token
service worker ── GET /api/v1/entitlement, Authorization: Bearer <token> ──▶ API
API ── tokeninfo (aud == extension client ID) ──▶ Google; then Mongo lookup by sub
API ──▶ { plan, status, features, currentPeriodEnd }
```

## Manifest and Google Cloud setup

```json
{
  "permissions": ["identity", "storage"],
  "host_permissions": ["https://api.example.com/*"],
  "oauth2": {
    "client_id": "1234-abc.apps.googleusercontent.com",
    "scopes": ["openid", "email"]
  },
  "key": "<public key from the CWS dashboard; pins the extension ID during unpacked dev>"
}
```

- `getAuthToken` needs a Google Cloud OAuth client of type **Chrome Extension** bound to the extension ID. Without `key`, the unpacked ID differs from the CWS ID and the token request fails.
- `host_permissions` for the API origin is what lets the service worker skip CORS. Adding it to an already-published extension can trigger a permission warning on update.
- WXT: put these under `manifest` in `wxt.config.ts`; use `browser.identity` if the project uses WXT's `browser` global.

## Service-worker API client

```typescript
// background/api.ts
const API = 'http://localhost:3000'; // API origin; swap per build (WXT: import.meta.env.WXT_API_BASE)

async function token(interactive: boolean): Promise<string> {
  const { token } = await chrome.identity.getAuthToken({ interactive }); // Chrome 105+: resolves { token, grantedScopes }
  if (!token) throw new Error('NO_TOKEN');
  return token;
}

export async function api<T>(path: string, init: RequestInit = {}, interactive = false): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await token(interactive);
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, ...init.headers },
    });
    if (res.status === 401 && attempt === 0) {
      await chrome.identity.removeCachedAuthToken({ token: t }); // stale/revoked token; fetch a fresh one
      continue;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), { status: res.status, code: body.errorCode });
    }
    return res.json() as Promise<T>;
  }
  throw new Error('UNAUTHORIZED');
}
```

- Call with `interactive: true` only from a user gesture (popup "Sign in" button → message the service worker); background calls use `false` and surface a "sign in" state on `NO_TOKEN`.
- `localhost` works in development once `http://localhost:3000/*` is in `host_permissions`; drop it from production builds.

## launchWebAuthFlow

Use it for non-Google providers and for Chromium browsers that lack `getAuthToken` (e.g. Microsoft Edge). It works for Google too, with a **Web application** OAuth client.

```typescript
const redirectUri = chrome.identity.getRedirectURL(); // https://<extension-id>.chromiumapp.org/
const url = new URL('https://provider.example/oauth/authorize');
url.search = new URLSearchParams({
  client_id: CLIENT_ID, response_type: 'code', redirect_uri: redirectUri,
  scope: 'openid email', state: crypto.randomUUID(),
  code_challenge: challenge, code_challenge_method: 'S256',
}).toString();

const result = await chrome.identity.launchWebAuthFlow({ url: url.href, interactive: true });
const code = new URL(result!).searchParams.get('code');
// POST { code, verifier, redirectUri } to /api/v1/auth/exchange; the server swaps it and returns a session token
```

Register the exact `https://<extension-id>.chromiumapp.org/` URL as a redirect URI with the provider; check `state` matches before using the code. Store the returned session token in `chrome.storage.session` (cleared on browser restart) or `chrome.storage.local` if sign-in must persist.

## Content scripts call through the service worker

Content-script `fetch` runs with the page's origin, hits the page's CORS rules, and exposes the bearer token to the page's context. Send a named message instead:

```typescript
// content script
const license = await chrome.runtime.sendMessage({ type: 'license:get' });

// service worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg?.type === 'license:get') {
    checkLicense().then(sendResponse, (e) => sendResponse({ error: String(e) }));
    return true; // async response
  }
});
```

Expose fixed actions only; never a "fetch this URL" message, which any page could abuse through the content script.

## Entitlement controller and cached check

```typescript
// license/entitlement.controller.ts — global prefix makes this GET /api/v1/entitlement
@UseGuards(AuthGuard)
@Controller('entitlement')
export class EntitlementController {
  constructor(private readonly licenses: LicenseService) {}
  @Get()
  get(@Req() req: AuthedRequest) {
    return this.licenses.entitlement(req.user.sub); // { plan, status, features, currentPeriodEnd }
  }
}
```

```typescript
// background/entitlement.ts
type Entitlement = { plan: 'free' | 'pro'; status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none'; features: string[]; currentPeriodEnd: string | null };
const REFRESH = 12 * 60 * 60 * 1000, GRACE = 3 * 24 * 60 * 60 * 1000; // grace counts from the last successful check

export async function checkEntitlement(force = false): Promise<Entitlement> {
  const { entitlement: c } = await chrome.storage.local.get('entitlement');
  if (!force && c && Date.now() - c.at < REFRESH) return c.value;
  try {
    const value = await api<Entitlement>('/api/v1/entitlement');
    await chrome.storage.local.set({ entitlement: { value, at: Date.now() } });
    return value;
  } catch (e) {
    if ((e as { status?: number }).status === 401) return { plan: 'free', status: 'none', features: [], currentPeriodEnd: null };
    if (c && Date.now() - c.at < GRACE) return c.value; // offline grace
    throw e;
  }
}
```

Call `checkEntitlement(true)` on `chrome.runtime.onStartup`, right after checkout completes, and from a 12 h `chrome.alarms` alarm. The cache is a UX optimization, not enforcement: anything gated purely in the extension can be patched out, so the server checks the entitlement on every paid feature call (e.g. the proxy endpoint).
