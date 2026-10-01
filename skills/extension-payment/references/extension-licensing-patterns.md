# Extension Licensing Patterns

## Choosing a model

| Model | Use when | Enforcement point |
|---|---|---|
| Account-based (default) | You run a backend and users sign in | Server entitlement record |
| License key | Buyers shouldn't need an account; provider issues keys (Polar, Dodo, Creem, Lemon Squeezy) | Provider validate endpoint, ideally via your server |
| Freemium usage limit | Free tier is useful but capped | Server counter if usage costs you money; local counter otherwise |
| Trial | Full access for N days, then pay | Provider-native trial on the subscription |

All models feed the same `getEntitlement()` helper so feature gates don't care where access came from.

## License key

Flow: purchase → provider emails key → user pastes it in the options page → `POST /api/v1/license/activate` once (server stores an activation/instance ID tied to this install) → `POST /api/v1/license/validate` on startup and on the normal entitlement refresh schedule. Both return the `GET /api/v1/entitlement` shape; activate also returns `activationId`.

```ts
// options page; validateLicense posts to /api/v1/license/activate|validate, or a public provider endpoint when there is no backend
async function activateKey(key: string) {
  const { activationId } = await validateLicense(key.trim(), { activate: true });
  await chrome.storage.local.set({ license: { key: key.trim(), activationId } });
  await getEntitlement(true);
}
```

- Activation limits (e.g. 3 devices) are the realistic anti-sharing control; offer a "deactivate this device" button so users can move seats themselves.
- Store keys in `chrome.storage.local`, not `storage.sync` (sync quota is small and keys would roam to every signed-in profile, consuming activations).
- Public validate endpoints (Polar, Dodo, Lemon Squeezy) make a no-backend build possible; anything decided in client code can be patched out, so keep high-value features behind your server.

## Freemium usage limits

```ts
const FREE_DAILY_LIMIT = 10;

export async function tryConsume(): Promise<boolean> {
  if ((await getEntitlement()).plan === 'pro') return true;
  const today = new Date().toISOString().slice(0, 10);
  const { usage } = (await chrome.storage.local.get('usage')) as { usage?: { day: string; count: number } };
  const count = usage?.day === today ? usage.count : 0;
  if (count >= FREE_DAILY_LIMIT) return false;
  await chrome.storage.local.set({ usage: { day: today, count: count + 1 } });
  return true;
}
```

A local counter resets on reinstall or storage clearing — acceptable for features that cost you nothing. When each use hits a paid API (LLM calls, OCR, sync), count on the server per user and return `402`/`429` with an upgrade hint.

## Trials

Prefer the provider's trial (Stripe `subscription_data.trial_period_days`, provider trial settings, ExtensionPay `openTrialPage()`): the server sees the trial state and converts it automatically. A local install-date trial restarts on reinstall; use it only for no-backend extensions where that leak is acceptable, and record the date in `chrome.runtime.onInstalled` when `reason === 'install'`.

## Gating UX

- Show locked features with what they unlock, not just a disabled button; trigger the upgrade prompt at the moment of need (limit hit, pro action clicked).
- Always provide **Restore purchase / Sign in** (re-runs `getEntitlement(true)`) and **Manage subscription** (provider customer portal URL from your API, or `openPaymentPage()` with ExtensionPay).
- After upgrade, unlock without requiring a reload; after cancellation, keep access until the paid period ends (`currentPeriodEnd`).
- Never block the extension's basic, advertised functionality behind payment unless the CWS listing says so.
