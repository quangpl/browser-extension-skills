---
name: extension-payment
description: "Adds monetization to Chrome/browser extensions: picks a provider (Stripe, Paddle, ExtensionPay, etc.), wires checkout, license checks, freemium limits, trials. Use when the user says payment, monetize, paywall, subscription, pro/premium tier, license key, or billing. Not for server endpoints or webhook infrastructure (use extension-backend)."
license: MIT
metadata:
  author: quangpl
  version: "2.0.0"
---

# Extension Payment

Add paid tiers to an extension: provider choice, checkout from the extension UI, server-verified entitlements, and feature gating. Build everything in test mode; going live is the user's call.

## Choose the setup (infer, don't interview)

Infer the payment model (one-time, subscription, freemium, trial, license key) and constraints from the request and the repo: existing provider SDKs in any `package.json` (`stripe`, `@paddle/paddle-node-sdk`, `@polar-sh/sdk`, `dodopayments`, `creem`, `extpay`, `@lemonsqueezy/*`), an existing backend, auth already in place, and the developer's country if stated.

| Situation | Default | Why |
|---|---|---|
| Provider already integrated | Keep it | Migrations cost more than they save |
| No backend and none wanted, low-stakes features | ExtensionPay (`extpay`) | Stripe-backed hosted service; no server to run |
| Solo/small team selling globally (the common case) | Stripe Checkout with Managed Payments if the business location is eligible; otherwise Paddle | Merchant of Record (MoR) handles VAT/sales tax, disputes, refunds |
| Selling license keys to anonymous users | Polar or Dodo Payments | Built-in keys with public validate endpoints |
| Registered business wanting lowest fees/full control | Stripe gateway + Stripe Tax | You are the seller; you own tax filing |
| Lemon Squeezy | Existing integrations only | Stripe acquired it; its team now points users to Stripe Managed Payments |

Tell the user the pick plus a one-line reason, then proceed. Ask once, batched, only if the choice materially changes the build and cannot be inferred (e.g. "Do you want to run a backend?" when nothing in the repo or request says). Continue independent work meanwhile.

Fees, payout countries, and eligibility change often — link the provider pricing page instead of quoting numbers. Tradeoffs and per-provider capabilities: [mor-vs-gateway.md](references/mor-vs-gateway.md).

## Workflow

```
- [ ] 1. Pick provider + model (table above); state the choice
- [ ] 2. Fetch current provider docs for the exact calls you will write
- [ ] 3. Backend contract: checkout, webhook, entitlement endpoints (or ExtensionPay)
- [ ] 4. Extension: upgrade button → hosted checkout tab → entitlement refresh
- [ ] 5. Gate features via one entitlement helper; add restore/manage-subscription entry
- [ ] 6. Test-mode loop until green (below)
- [ ] 7. Hand over: env vars to set, live-mode switch steps, listing disclosure
```

1. **Docs.** Provider APIs move fast; fetch the current docs before writing calls (prefer the provider's llms.txt or a docs MCP if available, otherwise web fetch). Verified llms.txt URLs, SDK calls, webhook verification, and sandbox switches per provider: [provider-quickstarts.md](references/provider-quickstarts.md) — read when writing provider code.
2. **Backend.** The extension never talks to the provider with secrets. Define `POST /api/v1/checkout` → `{ url }`, `POST /api/v1/webhooks/:provider`, `GET /api/v1/entitlement` → `{ plan, status, features, currentPeriodEnd }`, and (for subscriptions) a customer-portal endpoint. If the server doesn't exist yet, write the contract and the provider-specific handlers; scaffolding the server itself belongs to extension-backend when available. Request/response shapes and webhook rules: [integration-architecture.md](references/integration-architecture.md) — read when wiring extension ↔ backend.
3. **Extension.** Open the provider's hosted checkout in a tab with `chrome.tabs.create`. MV3 extension pages cannot load remote scripts, so overlay/embedded checkouts (Paddle.js, Stripe.js, Dodo overlay) run on your website, not in the popup. After payment, refresh the entitlement (success page → `externally_connectable` message as a hint, or re-check on popup open).
4. **Model.** Account-based entitlements by default; license keys, usage-limited freemium, and trials: [extension-licensing-patterns.md](references/extension-licensing-patterns.md) — read when the model is not plain account-based subscription or one-time purchase.

### Feedback loop (test mode)

Run the provider's local webhook forwarding (e.g. `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`) or a tunnel, then:

1. Build, load unpacked, click Upgrade → test checkout with the provider's test card.
2. Confirm the webhook arrived with a verified signature and the entitlement row changed.
3. Reopen the popup → pro features unlock without reinstalling.
4. Cancel/refund in the provider dashboard → webhook → entitlement revoked → features lock after the next refresh.
5. Go offline → cached entitlement holds within the grace window, then falls back to free.

Fix and repeat until all five pass. Inspect the service worker console (`chrome://extensions` → Inspect views) for fetch/CORS errors.

## Security invariants

- **Secret keys stay on the server.** Anything in the extension bundle is public; only publishable/client tokens may ship.
- **Entitlements come from the server.** A cached `isPro` in `chrome.storage` is editable by the user; treat it as a UI cache. Features that cost you money (AI calls, sync, storage) must be enforced server-side on every request.
- **Verify every webhook signature** on the raw request body, and process events idempotently by event ID; unsigned webhooks let anyone grant themselves a license.
- **Cache with a bounded offline grace**: refresh the entitlement every 12 h, on browser startup, and right after checkout completes; honor the last good entitlement for 3 days after the last successful check, then fall back to free. The server still enforces every paid feature call regardless of the cache.
- **Link purchases to your user ID** through checkout metadata/custom data, not by matching emails.
- **Live keys and real charges need the user's explicit go-ahead.** Default to test/sandbox keys in `.env.example`.

## Chrome Web Store payment rules

From the [CWS Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies) ("Accepting Payment From Users"):

- If users must pay for basic functionality, say so in the listing description.
- Describe what is sold honestly, post terms of sale including the refund policy, and identify yourself (not Google) as the seller.
- Card and other sensitive data must be handled per PCI and privacy rules — use the provider's hosted checkout instead of collecting card details in extension UI.
- Emails/IDs collected for billing count as user data in the privacy practices disclosure (listing work belongs to extension-publish when available).

CWS has no built-in payments; all billing is external.

## Output contract

Produce:
- Extension code: entitlement helper, upgrade/restore UI hooks, checkout launch, manifest changes (`identity` + `oauth2`, optional `externally_connectable`; API access via CORS for the extension origin rather than broad host permissions) with each addition justified.
- Backend handlers or a contract file for checkout, webhook, entitlement endpoints, plus `.env.example` with test-mode variable names.

Final message: provider chosen and why, files changed, test-loop results actually observed (or which steps could not run and why), env vars and dashboard steps the user must do, the live-mode switch as an explicit user decision, and the listing disclosure needed.

## References

- [mor-vs-gateway.md](references/mor-vs-gateway.md) — read when the user questions the provider choice or asks about tax/fees.
- [provider-quickstarts.md](references/provider-quickstarts.md) — read when writing SDK calls, webhook verification, or license validation for a specific provider.
- [integration-architecture.md](references/integration-architecture.md) — read when wiring the extension to the backend or defining endpoints.
- [extension-licensing-patterns.md](references/extension-licensing-patterns.md) — read for license keys, freemium limits, trials, and gating UI.
