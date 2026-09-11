# Provider Quickstarts

## Stripe (Gateway)

**Docs**: https://docs.stripe.com | **llms.txt**: https://docs.stripe.com/llms.txt

```bash
npm install stripe                    # Backend
```

**Backend setup:**

```typescript
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
app.post("/create-checkout", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription", // or 'payment' for one-time
    line_items: [{ price: "price_xxx", quantity: 1 }],
    success_url: "https://yourapp.com/success",
    cancel_url: "https://yourapp.com/cancel",
    customer_email: req.user.email,
  });
  res.json({ checkoutUrl: session.url });
});
```

**Env vars**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`

---

## Lemon Squeezy (MoR)

**Docs**: https://docs.lemonsqueezy.com

**Setup:**

1. Create store at lemonsqueezy.com
2. Create product + variant (set price)
3. Get checkout link or use API

**Backend (verify license):**

```typescript
// Webhook: lemonsqueezy sends order/subscription events
app.post("/webhook/lemonsqueezy", (req, res) => {
  const event = req.body;
  if (event.meta.event_name === "order_created") {
    activateLicense(event.data.attributes.user_email);
  }
  res.sendStatus(200);
});
```

**Extension (open checkout):**

```typescript
// Direct checkout URL (simplest)
chrome.tabs.create({
  url: "https://yourstore.lemonsqueezy.com/checkout/buy/xxx",
});
```

**Env vars**: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`

---

## Paddle (MoR)

**Docs**: https://developer.paddle.com

**Setup:**

1. Create Paddle account → get vendor ID
2. Create product + price in dashboard
3. Use Paddle.js overlay checkout (no redirect needed)

**Extension (popup checkout):**

```html
<!-- In options page or popup (must be extension page, not content script) -->
<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
<script>
  Paddle.Initialize({ token: "YOUR_CLIENT_TOKEN" });
  function checkout() {
    Paddle.Checkout.open({ items: [{ priceId: "pri_xxx", quantity: 1 }] });
  }
</script>
```

**Env vars**: `PADDLE_API_KEY`, `PADDLE_CLIENT_TOKEN`, `PADDLE_WEBHOOK_SECRET`

---

## Polar (MoR)

**Docs**: https://docs.polar.sh | **llms.txt**: https://docs.polar.sh/llms-full.txt

**Setup:**

1. Create Polar account, link GitHub (optional)
2. Create product + benefit (license key or custom)
3. Use Polar checkout or API

**Backend:**

```typescript
// Verify license via Polar API
const res = await fetch("https://api.polar.sh/v1/licenses/validate", {
  method: "POST",
  headers: { Authorization: `Bearer ${POLAR_ACCESS_TOKEN}` },
  body: JSON.stringify({ key: licenseKey }),
});
const { valid } = await res.json();
```

**Env vars**: `POLAR_ACCESS_TOKEN`, `POLAR_ORGANIZATION_ID`

---

## Creem (MoR - Extension-Focused)

**Docs**: https://docs.creem.io

Built specifically for browser extension monetization:

1. Create Creem account
2. Configure product and pricing
3. Integrate SDK or use checkout links
4. Webhook for license activation

**Env vars**: `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`

---

## Common Setup Checklist (All Providers)

1. [ ] Create account with provider
2. [ ] Create product/price in dashboard
3. [ ] Set up backend API (create-checkout, webhook, verify-license)
4. [ ] Configure webhook URL in provider dashboard
5. [ ] Add checkout button in extension UI (popup/options)
6. [ ] Implement license verification in extension
7. [ ] Cache license in chrome.storage.local
8. [ ] Test: purchase → webhook → license active → feature unlocked
9. [ ] Test: subscription cancel → webhook → license deactivated
10. [ ] Never expose API keys in extension source code
