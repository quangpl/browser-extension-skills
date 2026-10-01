# Integration Architecture

## Contents
- Flow
- Backend contract
- Webhook handling
- Extension: identity, checkout, entitlement helper
- Detecting a completed checkout

## Flow

```
popup/options ──POST /api/v1/checkout──▶ your API ──create session──▶ provider
      │                                                         │
      └─ chrome.tabs.create(url) ─▶ hosted checkout ── pays ────┤
                                                                ▼
popup/service worker ◀─GET /api/v1/entitlement── your API ◀─signed webhook─┘
        │
 chrome.storage.local (UI cache + offline grace)
```

The webhook, not the success redirect, is the source of truth: redirects can be skipped, replayed, or forged.

## Backend contract

| Endpoint | Auth | Returns |
|---|---|---|
| `POST /api/v1/checkout` `{ priceId }` | user session | `{ url }` — server creates the provider checkout session with your user ID in metadata |
| `POST /api/v1/webhooks/:provider` | provider signature on raw body | 2xx after persist; idempotent by event ID |
| `GET /api/v1/entitlement` | user session | `{ plan, status, features, currentPeriodEnd }` (type below) |
| `POST /api/v1/portal` (subscriptions) | user session | `{ url }` — provider customer portal |
| `POST /api/v1/license/activate`, `POST /api/v1/license/validate` (license keys only) | user session or key | entitlement shape above |

Allow-list priceIds server-side so the client cannot pick arbitrary prices. The server enforces every paid feature call itself, whatever the client cache says. CORS: allow your extension origin `chrome-extension://<id>` (pin the ID with a manifest `key` in development). Implementing the server, auth, storage, and rate limiting is extension-backend's job when that skill is available.

## Webhook handling

- Verify the signature against the raw body with the provider's SDK helper; reject on failure.
- Store processed event IDs; skip duplicates — providers retry and may deliver out of order. When order matters, re-fetch the subscription from the provider API instead of trusting the payload sequence.
- Map provider customer/subscription IDs to your user once (from checkout metadata) and keep that mapping.
- Write one entitlement record per user regardless of provider; the extension reads only that.

## Extension: identity, checkout, entitlement helper

Identity default: `chrome.identity.getAuthToken` (Chrome with a signed-in Google account; needs `identity` permission + `oauth2` in the manifest). It resolves to `{ token, grantedScopes }`, not a string. The backend exchanges the Google token for its own session. For non-Google sign-in or other Chromium browsers use `chrome.identity.launchWebAuthFlow`.

```ts
// src/lib/billing.ts
const API = 'https://api.yourapp.com'; // or inject via your build's env mechanism

export async function apiFetch(path: string, init: RequestInit = {}, interactive = false) {
  const { token } = await chrome.identity.getAuthToken({ interactive });
  if (!token) throw new Error('not signed in');
  return fetch(`${API}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
}

export async function startCheckout(priceId: string) {
  const res = await apiFetch('/api/v1/checkout', { method: 'POST', body: JSON.stringify({ priceId }) }, true);
  const { url } = await res.json();
  await chrome.storage.local.set({ checkoutPendingAt: Date.now() });
  await chrome.tabs.create({ url });
}

export type Entitlement = {
  plan: 'free' | 'pro';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  features: string[];
  currentPeriodEnd: string | null; // ISO date
};
type Cached = Entitlement & { checkedAt: number };
const FREE: Entitlement = { plan: 'free', status: 'none', features: [], currentPeriodEnd: null };
const REFRESH_MS = 12 * 60 * 60 * 1000; // also refresh on startup and right after checkout
const GRACE_MS = 3 * 24 * 60 * 60 * 1000; // offline tolerance since the last successful check

export async function getEntitlement(force = false): Promise<Entitlement> {
  const { entitlement } = (await chrome.storage.local.get('entitlement')) as { entitlement?: Cached };
  const age = entitlement ? Date.now() - entitlement.checkedAt : Infinity;
  if (!force && age < REFRESH_MS) return entitlement!;
  try {
    const res = await apiFetch('/api/v1/entitlement');
    if (res.status === 401 || res.status === 403) { await chrome.storage.local.remove('entitlement'); return FREE; }
    if (!res.ok) throw new Error(String(res.status));
    const fresh: Cached = { ...((await res.json()) as Entitlement), checkedAt: Date.now() };
    await chrome.storage.local.set({ entitlement: fresh });
    return fresh;
  } catch {
    return entitlement && age < GRACE_MS ? entitlement : FREE; // network failure: honor recent grant
  }
}

export const hasFeature = async (f: string) => (await getEntitlement()).features.includes(f);
```

Gate every pro code path through `hasFeature`/`getEntitlement`; scattered `isPro` flags drift. Refresh every 12 h via a `chrome.alarms` schedule (service workers are terminated when idle, so in-memory timers don't survive), on `chrome.runtime.onStartup`, and right after checkout completes (below); popup open just reads the cache. Past the 3-day grace with no successful check, fall back to free.

## Detecting a completed checkout

1. **Default:** when the popup opens and `checkoutPendingAt` is recent, call `getEntitlement(true)` and clear the flag once it reports pro.
2. **Instant unlock (optional):** let your success page message the extension. Manifest: `"externally_connectable": { "matches": ["https://yourapp.com/*"] }`. Success page: `chrome.runtime.sendMessage(EXTENSION_ID, { type: 'checkout-complete' })`. Service worker:

```ts
chrome.runtime.onMessageExternal.addListener((msg, sender) => {
  if (sender.origin === 'https://yourapp.com' && msg?.type === 'checkout-complete') {
    void getEntitlement(true); // a hint only — the server decides
  }
});
```

The message never grants access itself; it only triggers a re-check, so a forged message is harmless.
