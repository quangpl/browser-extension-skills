# Provider Quickstarts

## Contents
- Stripe (gateway, or MoR via Managed Payments) · Paddle Billing · Polar · Dodo Payments · Creem
- ExtensionPay (no backend) · Lemon Squeezy (existing integrations)

Server snippets assume Express with `express.raw({ type: 'application/json' })` on the webhook route; signature checks fail on a re-parsed JSON body. Each provider's llms.txt (listed below) has the current call shapes — check them before shipping.

## Stripe

`npm i stripe` · https://docs.stripe.com · llms.txt https://docs.stripe.com/llms.txt

```ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // sk_test_… while building
const session = await stripe.checkout.sessions.create({
  mode: 'subscription', // 'payment' for one-time
  line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
  client_reference_id: user.id,
  subscription_data: { metadata: { userId: user.id } },
  success_url: 'https://yourapp.com/upgraded?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yourapp.com/pricing',
  managed_payments: { enabled: true }, // MoR mode; omit for a plain gateway
});
// return session.url to the extension
const event = stripe.webhooks.constructEvent(req.body, req.header('stripe-signature')!, process.env.STRIPE_WEBHOOK_SECRET!);
// checkout.session.completed, customer.subscription.updated|deleted, invoice.payment_failed
```

- Managed Payments: activate in Dashboard, accept its terms, eligible tax code per product, API version `2025-03-31.basil`+, Checkout/Payment Links only.
- Local webhooks: `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe` prints the `whsec_` secret.
- Manage/cancel link: Customer Portal (`stripe.billingPortal.sessions.create`).

## Paddle Billing

`npm i @paddle/paddle-node-sdk` · https://developer.paddle.com · llms.txt https://developer.paddle.com/llms.txt

```ts
import { Paddle, Environment, EventName } from '@paddle/paddle-node-sdk';
const paddle = new Paddle(process.env.PADDLE_API_KEY!, { environment: Environment.sandbox });
const txn = await paddle.transactions.create({
  items: [{ priceId: process.env.PADDLE_PRICE_ID!, quantity: 1 }],
  customData: { userId: user.id },
});
// txn.checkout?.url = approved default payment link + ?_ptxn=…
const event = await paddle.webhooks.unmarshal(req.body.toString(), process.env.PADDLE_WEBHOOK_SECRET!, req.header('paddle-signature') ?? '');
if (event.eventType === EventName.SubscriptionCanceled) { /* revoke */ }
```

- Checkout is Paddle.js on a page on your approved domain (the default payment link, set under Checkout settings — without it `checkout.url` is absent). Paddle.js can't load in MV3 extension pages; open the URL in a tab.
- No built-in license keys in Paddle Billing; derive entitlements from transaction/subscription webhooks.

## Polar

`npm i @polar-sh/sdk` · https://polar.sh/docs · llms.txt https://polar.sh/docs/llms.txt

```ts
import { Polar } from '@polar-sh/sdk';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN!, server: 'sandbox' });
const checkout = await polar.checkouts.create({ products: [process.env.POLAR_PRODUCT_ID!], externalCustomerId: user.id });
// checkout.url
const event = validateEvent(req.body, req.headers, process.env.POLAR_WEBHOOK_SECRET!); // WebhookVerificationError → 403
```

License keys from the extension (public endpoint, no token):

```ts
const res = await fetch('https://api.polar.sh/v1/customer-portal/license-keys/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key, organization_id: POLAR_ORG_ID, activation_id }), // activation_id only if activation limits are on
});
const lk = await res.json(); // lk.status === 'granted'
```

Server-side, use `/v1/license-keys/validate` with a token. Sandbox API: `https://sandbox-api.polar.sh/v1`.

## Dodo Payments

`npm i dodopayments` · https://docs.dodopayments.com · llms.txt https://docs.dodopayments.com/llms.txt

```ts
import DodoPayments from 'dodopayments';
const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY!,
  environment: 'test_mode', // default is live_mode
});
const session = await dodo.checkoutSessions.create({
  product_cart: [{ product_id: process.env.DODO_PRODUCT_ID!, quantity: 1 }],
  metadata: { userId: user.id },
  return_url: 'https://yourapp.com/upgraded',
});
// session.checkout_url — single use, expires; create one per attempt
const h = (k: string) => req.header(k) ?? '';
const event = dodo.webhooks.unwrap(req.body.toString(), {
  headers: { 'webhook-id': h('webhook-id'), 'webhook-signature': h('webhook-signature'), 'webhook-timestamp': h('webhook-timestamp') },
});
```

- Webhooks follow the Standard Webhooks spec (`standardwebhooks` package also verifies them).
- License keys: `/licenses/activate`, `/licenses/validate`, `/licenses/deactivate` are public (no API key), so the extension can call them.

## Creem

`npm i creem` · https://docs.creem.io · llms.txt https://docs.creem.io/llms.txt

```ts
import { Creem } from 'creem';
import { createHmac, timingSafeEqual } from 'node:crypto';
const creem = new Creem({ apiKey: process.env.CREEM_API_KEY! }); // test-mode key while building
const checkout = await creem.checkouts.create({ productId: process.env.CREEM_PRODUCT_ID!, successUrl: 'https://yourapp.com/upgraded', metadata: { userId: user.id } });
// checkout.checkoutUrl
const expected = createHmac('sha256', process.env.CREEM_WEBHOOK_SECRET!).update(req.body).digest('hex');
const got = req.header('creem-signature') ?? '';
const ok = got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
```

`creem.licenses.activate/validate/deactivate` require the API key, so proxy them through your server. Sandbox API: `https://test-api.creem.io`.

## ExtensionPay (no backend)

`npm i extpay` · https://github.com/Glench/ExtPay

```ts
// service worker, top level, once
import ExtPay from 'extpay';
ExtPay('your-extensionpay-id').startBackground();
// popup / options (getUser can throw on network errors)
const extpay = ExtPay('your-extensionpay-id');
const user = await extpay.getUser();
if (!user.paid) await extpay.openPaymentPage();
```

- Needs only `storage`. `extpay.onPaid` also needs a content script on `https://extensionpay.com/*`, which adds an install warning — prefer re-checking `getUser()` when the popup opens.
- In service worker callbacks call `ExtPay(id)` again instead of reusing a top-level instance.
- Trials: `openTrialPage()` + `user.trialStartedAt`. Subscriptions: `user.subscriptionStatus`; `openPaymentPage()` doubles as the manage/cancel page.
- Checkout runs on the developer's Stripe account; test with Stripe test cards.

## Lemon Squeezy (existing integrations)

https://docs.lemonsqueezy.com — don't start new integrations here.

- Webhooks: `X-Signature` = hex HMAC-SHA256 of the raw body with the signing secret; compare with `timingSafeEqual`.
- License API (no API key): `POST https://api.lemonsqueezy.com/v1/licenses/validate` with form fields `license_key`, optional `instance_id`; `activate`/`deactivate` siblings exist.
