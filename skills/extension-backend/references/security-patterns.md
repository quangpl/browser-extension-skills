# Security Patterns: Auth, Webhooks, Proxy, Validation

## Contents
- Google token verification (access token and ID token)
- Auth guard
- API-key proxy endpoint
- Stripe webhook (raw body, signature, idempotency)
- DTO validation and NoSQL injection

## Google token verification

`chrome.identity.getAuthToken` returns a Google **access token** (opaque, not a JWT). Verify it with Google's tokeninfo endpoint and check `aud` equals the extension's OAuth client ID; otherwise any token minted for another app would be accepted. Cache results until expiry so every request doesn't round-trip to Google.

```typescript
// auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface AuthUser { sub: string; email?: string }

@Injectable()
export class AuthService {
  private readonly google = new OAuth2Client();
  private readonly cache = new Map<string, { user: AuthUser; exp: number }>();

  constructor(private readonly config: ConfigService) {}

  async verifyAccessToken(token: string): Promise<AuthUser> {
    const hit = this.cache.get(token);
    if (hit && hit.exp > Date.now()) return hit.user;

    const info = await this.google.getTokenInfo(token).catch(() => null); // oauth2.googleapis.com/tokeninfo
    if (!info?.sub || info.aud !== this.config.getOrThrow<string>('GOOGLE_CLIENT_ID')) {
      throw new UnauthorizedException('Invalid token', { errorCode: 'TOKEN_INVALID' });
    }
    const user = { sub: info.sub, email: info.email };
    if (this.cache.size > 10_000) this.cache.clear();
    this.cache.set(token, { user, exp: info.expiry_date });
    return user;
  }

  /** For launchWebAuthFlow with response_type=id_token (a JWT). */
  async verifyIdToken(idToken: string): Promise<AuthUser> {
    const ticket = await this.google
      .verifyIdToken({ idToken, audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID') })
      .catch(() => null);
    const p = ticket?.getPayload();
    if (!p?.sub) throw new UnauthorizedException('Invalid token', { errorCode: 'TOKEN_INVALID' });
    return { sub: p.sub, email: p.email };
  }
}
```

Key users by `sub` (stable forever); emails can change. For non-Google providers via `launchWebAuthFlow`, exchange the authorization code server-side (PKCE, client secret stays on the server) and issue your own short-lived session JWT with `@nestjs/jwt`.

## Auth guard

```typescript
// auth/auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AuthUser } from './auth.service.js';

export type AuthedRequest = Request & { user: AuthUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Missing token', { errorCode: 'TOKEN_MISSING' });
    req.user = await this.auth.verifyAccessToken(token);
    return true;
  }
}
```

Use with `@UseGuards(AuthGuard)` on controllers; read `req.user.sub` via `@Req() req: AuthedRequest`.

## API-key proxy endpoint

The usual reason an extension needs a backend: anything in the bundle is public, so the third-party key lives here.

```typescript
@UseGuards(AuthGuard)
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Post('ai/complete')
async complete(@Req() req: AuthedRequest, @Body() dto: CompleteDto) {
  await this.quota.consume(req.user.sub);                 // per-user daily cap in Mongo; 429 when exceeded
  const res = await fetch('https://api.provider.example/v1/complete', {   // fixed upstream URL
    method: 'POST',
    headers: { Authorization: `Bearer ${this.config.getOrThrow('PROVIDER_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: dto.prompt, max_tokens: 512 }),       // server picks model/limits
  });
  if (!res.ok) throw new BadGatewayException('Upstream failed', { errorCode: 'UPSTREAM_FAILED' });
  return res.json();
}
```

Never accept an arbitrary URL, model, or header from the client: that turns the proxy into an open relay billed to you. The global ThrottlerGuard runs before route guards, so it limits by IP; enforce per-user cost limits with the quota counter.

## Stripe webhook

```typescript
// webhook/webhook.controller.ts — POST /api/v1/webhooks/stripe; needs `rawBody: true` in NestFactory.create; re-serialized JSON fails the signature check
import { BadRequestException, Controller, Headers, HttpCode, Post, Req, type RawBodyRequest } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import Stripe from 'stripe';

@SkipThrottle()
@Controller('webhooks')
export class WebhookController {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  constructor(private readonly webhooks: WebhookService) {}
  @Post('stripe')
  @HttpCode(200)
  async stripeEvent(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(req.rawBody!, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch {
      throw new BadRequestException('Invalid signature');
    }
    await this.webhooks.handleOnce(event.id, event.type, () => this.webhooks.apply(event));
    return { received: true };
  }
}
```

- Idempotency: providers retry and may deliver out of order. `handleOnce` inserts `event.id` into a collection with a unique index on `eventId`; a duplicate-key error (code 11000) means "already processed", so return 200 without re-applying.
- Link payments to users by passing the user's `sub` as `client_reference_id` / metadata when `POST /api/v1/checkout` creates the provider session (it returns `{ url }`); derive license state from the subscription object's current `status`, mapped onto `active | trialing | past_due | canceled`, not from the event type alone.
- Local test: `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`, then `stripe trigger checkout.session.completed`; use the `whsec_` secret printed by `stripe listen`.
- Other providers (Paddle, Lemon Squeezy, Polar): add `@Post('<provider>')` on the same controller with their SDK's raw-body signature verifier.

## DTO validation and NoSQL injection

```typescript
import { IsString, MaxLength } from 'class-validator';

export class CompleteDto {
  @IsString() @MaxLength(8_000) prompt: string;
}
```

Mongoose does not sanitize filters by default. A body like `{ "email": { "$ne": null } }` matches every document unless the DTO forces a string (`@IsString()` + `whitelist`) or `mongoose.set('sanitizeFilter', true)` is on. Keep both.
