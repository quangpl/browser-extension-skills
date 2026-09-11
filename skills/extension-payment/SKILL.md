---
name: extension-payment
description: "Integrate payment gateways into Chrome extensions. Stripe, Paddle, Lemon Squeezy, Polar, PayPal, and more. Licensing, subscriptions, freemium. Use when: payment, monetize, subscribe, billing, premium."
---

# Extension Payment Integration

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

Integrate payment/subscription into a Chrome extension. Ask user for provider, then fetch docs and implement.

## Workflow (Execute This)

### Step 1: Ask user for payment requirements

Ask the user to confirm:

1. **Payment model**: One-time purchase / Subscription / Freemium / Credits-based
2. **Provider category**: Payment Gateway or Merchant of Record (MoR)?
3. **Preferred provider** (or let us recommend)
4. **Required info**: API keys, product/price IDs, webhook URL

> **Recommend MoR** for solo/indie developers — handles tax, compliance, billing portal. No need to register as a business in every country.

### Step 2: Provider selection guide

| Category    | Provider      | Best For                       | Docs                                        |
| ----------- | ------------- | ------------------------------ | ------------------------------------------- |
| **MoR**     | Paddle        | SaaS subscriptions, global tax | https://developer.paddle.com                |
| **MoR**     | Lemon Squeezy | Indie/solo devs, simple setup  | https://docs.lemonsqueezy.com               |
| **MoR**     | Polar         | Open source monetization       | https://docs.polar.sh                       |
| **MoR**     | Creem         | Extension-focused MoR          | https://docs.creem.io                       |
| **MoR**     | Dodo Payments | Simple digital products        | https://docs.dodopayments.com               |
| **MoR**     | FastSpring    | Enterprise digital commerce    | https://developer.fastspring.com            |
| **MoR**     | Gumroad       | Creators, digital products     | https://help.gumroad.com                    |
| **Gateway** | Stripe        | Full control, most flexible    | https://docs.stripe.com                     |
| **Gateway** | PayPal        | Wide user base, easy checkout  | https://developer.paypal.com/docs           |
| **Gateway** | Razorpay      | India-focused payments         | https://razorpay.com/docs                   |
| **Gateway** | Square        | POS + online                   | https://developer.squareup.com/docs         |
| **Gateway** | Adyen         | Enterprise, multi-currency     | https://docs.adyen.com                      |
| **Gateway** | Braintree     | PayPal-owned, cards + PayPal   | https://developer.paypal.com/braintree/docs |
| **Gateway** | Authorize.Net | US legacy, reliable            | https://developer.authorize.net             |

**llms.txt for AI-assisted docs** (use `docs-seeker` skill):

- Stripe: `https://docs.stripe.com/llms.txt`
- Polar: `https://docs.polar.sh/llms-full.txt`

### Step 3: Fetch provider docs

Use `docs-seeker` skill to fetch the provider's latest API docs. For Stripe/Polar, use llms.txt endpoints.

### Step 4: Implement the integration

See `references/integration-architecture.md` for the full pattern.

**Key architecture** (extensions cannot run backend code):

```
Extension (popup/options) → Your Backend API → Payment Provider
         ↕                        ↕
   chrome.storage          License/subscription DB
```

### Step 5: Show user the post-integration workflow

After integration, show the user this flow:

```
User clicks "Upgrade" in extension
  → Opens payment page (provider-hosted or custom)
  → Completes payment
  → Webhook hits your backend
  → Backend validates + stores license
  → Extension checks license via API
  → Premium features unlocked
```

## References

- `references/integration-architecture.md` — Backend setup, license validation, webhook handling
- `references/mor-vs-gateway.md` — MoR vs Gateway decision guide, tax/compliance
- `references/extension-licensing-patterns.md` — License key, account-based, feature flags
- `references/provider-quickstarts.md` — Quick setup for top 5 providers

## Related Skills

- `extension-publish` — Store submission and listing
- `extension-analyze` — Security audit (API key exposure check)
- `extension-dev` — Feature development workflow
