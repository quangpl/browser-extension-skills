# Merchant of Record (MoR) vs Payment Gateway

## Decision Matrix

| Factor               | MoR                           | Payment Gateway                         |
| -------------------- | ----------------------------- | --------------------------------------- |
| **Tax handling**     | Provider handles all taxes    | You handle tax calculation + remittance |
| **Compliance**       | Provider is the legal seller  | You are the legal seller                |
| **Invoicing**        | Provider generates invoices   | You must generate invoices              |
| **Refunds**          | Provider handles              | You handle                              |
| **Chargebacks**      | Provider absorbs risk         | You absorb risk                         |
| **Pricing control**  | Some limits on pricing models | Full control                            |
| **Revenue share**    | Higher fees (5-10%)           | Lower fees (2.9% + 30c)                 |
| **Setup complexity** | Minutes                       | Hours to days                           |
| **Business entity**  | Not required in every country | May need local entities                 |
| **Best for**         | Solo devs, small teams        | Established businesses                  |

## When to Choose MoR

- Solo developer or small team
- Selling globally (don't want to handle VAT/GST/sales tax)
- Want simplest possible setup
- Don't have a business entity in target markets
- Extension is your side project

**Top MoR for extensions:**

1. **Lemon Squeezy** — Simplest setup, good for indie devs
2. **Paddle** — Most mature, best for SaaS subscriptions
3. **Polar** — Open source friendly, has llms.txt
4. **Creem** — Built specifically for extension developers

## When to Choose Payment Gateway

- Already have a business entity
- Need full pricing control
- Want lower transaction fees at scale
- Need custom billing logic
- Already using Stripe/PayPal for other products

**Top gateways for extensions:**

1. **Stripe** — Most flexible, best docs, has llms.txt
2. **PayPal** — Widest user reach, familiar checkout
3. **Razorpay** — Best for Indian market

## Cost Comparison

| Provider      | Type    | Fees        | Notes                         |
| ------------- | ------- | ----------- | ----------------------------- |
| Stripe        | Gateway | 2.9% + 30c  | + tax service extra           |
| PayPal        | Gateway | 2.99% + 49c | Higher for international      |
| Paddle        | MoR     | 5% + 50c    | Includes all taxes            |
| Lemon Squeezy | MoR     | 5% + 50c    | Includes all taxes            |
| Polar         | MoR     | 4%          | Open source discount possible |
| Creem         | MoR     | Varies      | Extension-focused pricing     |
| Gumroad       | MoR     | 10%         | Highest fees, simplest UX     |

## Tax Implications

**With MoR**: Provider is the "seller of record." They collect and remit:

- US sales tax (all states)
- EU VAT (all 27 countries)
- UK VAT, India GST, etc.
- You receive net revenue after taxes

**With Gateway**: You must:

- Register for tax collection (Stripe Tax helps)
- Calculate correct tax per jurisdiction
- File and remit taxes quarterly/annually
- Keep records for audits

## Hybrid Approach

Some extensions use both:

- **MoR for individual users** (handled automatically)
- **Custom Stripe for enterprise/team plans** (more control, lower fees at volume)
