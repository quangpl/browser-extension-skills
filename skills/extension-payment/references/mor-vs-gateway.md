# Merchant of Record vs Payment Gateway

## The difference that matters

A **Merchant of Record (MoR)** is the legal seller: it charges the customer, collects and remits VAT/GST/sales tax, handles disputes and refunds, and pays you out. A **gateway** (plain Stripe, PayPal, Braintree, Adyen) only processes the card; you are the seller and own tax registration, filing, invoices, and chargebacks.

Pick an MoR unless the developer already has a business set up for tax in its markets, needs custom billing an MoR won't support (marketplaces/Connect, invoice items, non-digital goods), or volume makes MoR fees material. MoRs cost more per transaction than gateways; compare current pricing pages rather than quoting rates.

Browser extensions are digital software, which every MoR below supports.

## Provider capabilities (verified against official docs)

| Provider | Type | Built-in license keys | License validation from the extension without a secret | Test environment | Docs |
|---|---|---|---|---|---|
| Stripe Managed Payments | MoR (Stripe Checkout / Payment Links only) | No | — | Sandboxes / test keys | https://docs.stripe.com/payments/managed-payments |
| Stripe | Gateway (+ Stripe Tax for calculation) | No | — | Sandboxes / test keys | https://docs.stripe.com |
| Paddle Billing | MoR | No (build from webhooks) | — | `Environment.sandbox` | https://developer.paddle.com |
| Polar | MoR | Yes (benefit) | Yes: `/v1/customer-portal/license-keys/validate` | `sandbox-api.polar.sh` | https://polar.sh/docs |
| Dodo Payments | MoR | Yes (entitlement) | Yes: `/licenses/validate`, `/licenses/activate` are public | `test_mode` | https://docs.dodopayments.com |
| Creem | MoR | Yes | No: needs `x-api-key`, so validate on your server | `test-api.creem.io` | https://docs.creem.io |
| Lemon Squeezy | MoR | Yes | Yes: `/v1/licenses/validate` | Test mode | https://docs.lemonsqueezy.com |
| ExtensionPay | Hosted service on your Stripe account | No (paid flag per user) | `extpay.getUser()` | Test mode in dashboard | https://extensionpay.com |

Notes:
- **Stripe Managed Payments** requires activating it in the Dashboard, accepting its terms, an eligible business location (the list covers US, CA, much of Europe, AU, HK, JP, SG and is growing), eligible product tax codes, and API version `2025-03-31.basil` or later. It doesn't support Connect, Elements/embedded components, or subscriptions created outside Checkout/Payment Links. Check https://docs.stripe.com/payments/managed-payments/eligibility before recommending it.
- **Lemon Squeezy** was acquired by Stripe; its team now steers users toward Stripe Managed Payments and promises a migration path (https://www.lemonsqueezy.com/blog/2026-update). Keep existing integrations working; don't start new ones on it.
- **ExtensionPay** checks paid status client-side through its API. Fine for low-value unlocks; anything that costs you money per use still needs your own server check.
- Public license-validation endpoints let a no-backend extension verify keys, but the result still lives in client code — a determined user can patch it out. Use them when that risk is acceptable.

## Other providers (not verified here — link only)

PayPal https://developer.paypal.com · Braintree https://developer.paypal.com/braintree/docs · Razorpay https://razorpay.com/docs · Adyen https://docs.adyen.com · Square https://developer.squareup.com/docs · FastSpring https://developer.fastspring.com · Gumroad https://gumroad.com/help

Fetch their current docs before integrating; the checkout-in-a-tab + webhook + entitlement pattern still applies.

## Hybrid

Some products use an MoR for self-serve individual plans and a direct Stripe gateway (with invoices) for team/enterprise contracts. Keep a single entitlement table on the server so the extension doesn't care which provider granted access.
