# Payment Integration Architecture for Extensions

## Core Constraint

Chrome extensions run client-side only. **Never** handle payments directly in extension code. Always use a backend API.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Extension UI   │────→│  Your Backend    │────→│ Payment Provider │
│  (popup/options) │     │  (API server)    │     │  (Stripe/Paddle) │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        ↕                        ↕                        │
  chrome.storage          Database (users,          Webhook callback
  (cache license)          licenses, subs)                │
                                 ←─────────────────────────┘
```

## Backend Requirements

Minimal backend (Node.js/Express, Cloudflare Workers, Vercel Functions):

1. **POST /create-checkout** — Create payment session, return URL
2. **POST /webhook** — Receive payment confirmation from provider
3. **GET /verify-license** — Extension calls to check subscription status
4. **Auth** — Extension sends user token (chrome.identity or custom)

## Extension-Side Implementation

### 1. User Authentication

```typescript
// Use chrome.identity for Google OAuth (simplest)
async function getAuthToken(): Promise<string> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      resolve(token);
    });
  });
}
```

### 2. Initiate Checkout

```typescript
// In popup or options page
async function startCheckout(plan: string) {
  const token = await getAuthToken();
  const res = await fetch("https://your-api.com/create-checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  });
  const { checkoutUrl } = await res.json();
  chrome.tabs.create({ url: checkoutUrl }); // Open provider checkout
}
```

### 3. Verify License (on extension start)

```typescript
async function checkLicense(): Promise<boolean> {
  // Check cache first
  const cached = await chrome.storage.local.get("license");
  if (cached.license?.expiresAt > Date.now()) return cached.license.active;

  // Verify with backend
  const token = await getAuthToken();
  const res = await fetch("https://your-api.com/verify-license", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const license = await res.json();

  // Cache for 1 hour
  await chrome.storage.local.set({
    license: { ...license, expiresAt: Date.now() + 3600000 },
  });
  return license.active;
}
```

### 4. Feature Gating

```typescript
const isPremium = await checkLicense();
if (isPremium) {
  enablePremiumFeatures();
} else {
  showUpgradePrompt();
}
```

## Webhook Handling (Backend)

```typescript
// Express example - Stripe webhook
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed":
      activateLicense(event.data.object.customer_email);
      break;
    case "customer.subscription.deleted":
      deactivateLicense(event.data.object.customer_email);
      break;
  }
  res.sendStatus(200);
});
```

## Security Checklist

- [ ] API keys NEVER in extension source code (backend only)
- [ ] Webhook signature validation on every request
- [ ] License checks cached but with expiry (1-24 hours)
- [ ] Use HTTPS for all API calls
- [ ] Rate limit the verify-license endpoint
- [ ] Don't trust client-side license state (always backend-verified)
