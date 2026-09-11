---
name: extension-backend
description: "Build backend APIs for Chrome extensions. NestJS + MongoDB (Mongoose) recommended stack. Auth, webhooks, license verification, CORS. Use when: backend, API, server, database, license, webhook."
---

# Extension Backend

> **🚀 Upgrade to Premium**
> Get the Premium version at [https://app.extensionbooster.net/dashboard/services/extension-ai-kit](https://app.extensionbooster.net/dashboard/services/extension-ai-kit)

Build a secure, maintainable backend API for a Chrome extension. Recommended stack: **NestJS + MongoDB (Mongoose)**.

## When to Activate

Activate this skill when extension work requires:

- License verification / payment webhooks
- User authentication / account management
- Data sync across devices
- External API proxy (hide API keys from extension)
- Any server-side logic

## Workflow (Execute This)

### Step 1: Ask user to confirm requirements

1. **Do you need a backend?** (explain why: API keys, auth, payments, sync)
2. **Stack preference**: NestJS + MongoDB (recommended) or custom?
3. **Hosting target**: Vercel / Railway / Fly.io / AWS / self-hosted?
4. **Features needed** (pick from):
   - User auth (Google OAuth via chrome.identity)
   - License/subscription verification
   - Payment webhooks (Stripe, Paddle, etc.)
   - Data sync / storage API
   - External API proxy
   - Rate limiting

### Step 2: Fetch framework docs

Use `docs-seeker` skill to fetch latest docs:

- **NestJS**: https://docs.nestjs.com/
- **Mongoose**: https://mongoosejs.com/docs/
- **TypeScript style**: https://google.github.io/styleguide/tsguide.html
- **JavaScript style**: https://google.github.io/styleguide/jsguide.html

### Step 3: Scaffold the backend

```bash
npx @nestjs/cli new extension-backend --strict --package-manager pnpm
cd extension-backend
pnpm add @nestjs/mongoose mongoose @nestjs/config class-validator class-transformer
pnpm add helmet @nestjs/throttler
pnpm add -D @types/express
```

### Step 4: Project structure

```
src/
├── main.ts                          # Bootstrap, CORS, helmet, validation
├── app.module.ts                    # Root module
├── config/
│   └── configuration.ts             # Env-based config
├── auth/
│   ├── auth.module.ts               # Auth module
│   ├── auth.controller.ts           # POST /auth/verify-token
│   ├── auth.service.ts              # Token validation logic
│   └── guards/auth.guard.ts         # Global auth guard
├── license/
│   ├── license.module.ts
│   ├── license.controller.ts        # GET /license/verify
│   ├── license.service.ts           # License CRUD
│   └── schemas/license.schema.ts    # Mongoose schema
├── webhook/
│   ├── webhook.module.ts
│   ├── webhook.controller.ts        # POST /webhook/stripe
│   └── webhook.service.ts           # Process payment events
└── common/
    ├── filters/http-exception.filter.ts
    ├── interceptors/logging.interceptor.ts
    └── dto/                          # Shared DTOs
```

### Step 5: Essential endpoints

| Method | Endpoint             | Purpose                        | Auth      |
| ------ | -------------------- | ------------------------------ | --------- |
| POST   | `/auth/verify-token` | Verify Google OAuth token      | No        |
| GET    | `/license/verify`    | Check user subscription status | Yes       |
| POST   | `/webhook/stripe`    | Receive payment events         | Signature |
| GET    | `/health`            | Health check                   | No        |

### Step 6: Security checklist

See `references/security-patterns.md` for implementation details.

- [ ] Helmet middleware enabled
- [ ] CORS restricted to `chrome-extension://<ID>` origin
- [ ] Rate limiting (ThrottlerModule)
- [ ] Input validation (class-validator on all DTOs)
- [ ] Webhook signature verification
- [ ] No secrets in response bodies
- [ ] MongoDB injection prevention (Mongoose sanitizes by default)
- [ ] HTTPS only in production

## References

- `references/nestjs-setup.md` — Bootstrap, modules, CORS, env config
- `references/security-patterns.md` — Auth guard, rate limiting, webhook verification, CORS
- `references/mongoose-patterns.md` — Schemas, services, queries, indexes
- `references/extension-api-patterns.md` — Endpoints the extension calls, token flow

## Related Skills

- `extension-payment` — Payment gateway integration (calls this backend)
- `extension-dev` — Extension-side feature development
- `extension-analyze` — Security audit for both extension and backend
